"""Build grounded retrieval variations from the existing, attributed curriculum.

Run node scripts/export-retrieval-baseline.mjs first. No network, new claims,
source-bank matching, or code execution. Each answer comes from its own lesson.
"""
from pathlib import Path
from collections import defaultdict, Counter
import hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data'
MARKER = '<!-- recall:teaching:v1 -->'
CODE = re.compile(r'```([^\n]*)\n(.*?)```', re.S)
PUZZLE = re.compile(r'leetcode|two[ -]sum|fibonacci|factorial|anagram|palindrome|dynamic programming|breadth.first search|depth.first search|linked list|Dijkstra|knapsack|sudoku|union.find|bubble sort|heap sort|topological sort', re.I)

def read(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def write(path, value): path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
def normal(text): return re.sub(r'\W+', '', text).lower()
def family(card): return card['id'][:-1] if re.match(r'^[ce]0000000-', card['id']) else card['id']
def credit_parts(back):
    parts = back.rsplit('\n\n---\nAdapted from ', 1)
    return parts[0], '\n\n---\nAdapted from ' + parts[1] if len(parts) == 2 else ''
def prefix(key):
    h = hashlib.sha256(key.encode()).hexdigest()
    return f'a1000000-{h[:4]}-4{h[4:7]}-8{h[7:10]}-{h[10:19]}'

def candidates(group):
    # Concept cards retain full explanations without the one-line solution prefix.
    primary = next((c for c in group if not c['front'].startswith('**Complete the code**') and c.get('kind') != 'complete'), group[0])
    anchor = primary['front'].replace('**Explain the approach**\n\n', '').replace('\n\nHow would you do this, and what makes it work?', '')
    contents = [credit_parts(c['back']) for c in group]
    contents.append(('\n\n'.join(m[0] for m in CODE.finditer(primary['front'])), ''))
    credit = next((c for _, c in contents if c), '')
    # Work from unique passages; concept/application answers often repeat them.
    blocks = []; seen_blocks = set()
    for body, _ in contents:
        body = body.replace(MARKER, '')
        segments = []; cursor = 0
        for match in CODE.finditer(body):
            segments.extend(re.split(r'\n\s*\n', body[cursor:match.start()]))
            segments.append(match[0]); cursor = match.end()
        segments.extend(re.split(r'\n\s*\n', body[cursor:]))
        for block in segments:
            block = block.strip()
            if block and normal(block) not in seen_blocks:
                blocks.append(block); seen_blocks.add(normal(block))
    result = []; seen = set()
    def add(kind, focus, prompt, answer, context):
        context_anchor = CODE.sub('', anchor).strip() if kind in ['code-recall', 'output-recall'] else anchor
        front = f'**{focus}**\n\n{context_anchor}\n\n---\n\n{prompt}'
        if normal(front) in seen or front.count('```') % 2 or context.count('```') % 2: return
        seen.add(normal(front))
        back = MARKER + '\n\n## Check your recall\n\n' + answer + '\n\n## In context\n\n' + context.strip() + credit
        if PUZZLE.search(front + back): raise ValueError('Excluded content in ' + primary['id'])
        result.append({'front': front, 'back': back, 'kind': kind})
    for block in blocks:
        match = CODE.fullmatch(block)
        if not match: continue
        language, code = match.groups(); lines = code.rstrip().splitlines()
        if not 2 <= len(lines) <= 45 or len(code) > 2800: continue
        # Hide one semantic line, preserving inputs, surrounding control flow,
        # and example calls. Bare punctuation/import lines are never exercises.
        eligible = [(i, line) for i, line in enumerate(lines) if 12 <= len(line.strip()) <= 180
                    and not re.match(r'\s*(//|#|/\*|\*|import |using |</|\}|\]|\))', line)
                    and re.search(r'\b(return|await|throw|if|SELECT|WHERE|JOIN|const|let|var)\b|[.=>(]', line)]
        for i, line in eligible:
            masked = lines[:]; masked[i] = ' ' * (len(line) - len(line.lstrip())) + '____'
            add('code-recall', 'Restore the implementation',
                'Restore the missing line. Match the surrounding behavior; equivalent working code is fine.\n\n```' + language + '\n' + '\n'.join(masked) + '\n```',
                'One working line:\n\n```' + language + '\n' + line.strip() + '\n```', block)
        # Only ask for outputs already explicitly documented in the source.
        for i, line in enumerate(lines):
            output = re.search(r'\s+//\s*(?:=>\s*)?(\[[^\n]+|\{[^\n]+|true\b.*|false\b.*|null\b.*|undefined\b.*|-?\d[^\n]*|[\"\'][^\n]+)$', line)
            if not output or not line[:output.start()].strip(): continue
            masked = lines[:]; masked[i] = line[:output.start()] + ' // result: ____'
            add('output-recall', 'Predict the documented result',
                'What belongs in the marked result? Trace the values before revealing.\n\n```' + language + '\n' + '\n'.join(masked) + '\n```',
                '`' + output[1].replace('`', '') + '`', block)
    for block in blocks:
        if block.startswith(('```', '#', '<!--', '---', 'One solution:', 'Adapted from ')): continue
        if not 70 <= len(block) <= 1800 or 'recall:solution' in block: continue
        # Prefer meaningful named concepts, then short causal/contrast clauses.
        spans = [(m.start(), m.end()) for m in re.finditer(r'`[^`\n]{3,100}`|\*\*[^*\n]{4,120}\*\*', block)]
        spans += [(m.start(1), m.end(1)) for m in re.finditer(r'\b(?:because|instead of|rather than|only when|so that|requires?|prevents?)\s+([^.!?\n]{10,130})', block, re.I)]
        # Each sentence supplies one bounded phrase, not arbitrary single words.
        for m in re.finditer(r'(?:^|(?<=[.!?])\s+)([^\n.!?]{35,240})(?:[.!?]|$)', block):
            words = list(re.finditer(r'\S+', m[1]))
            if len(words) >= 7:
                start = max(2, len(words) // 3); end = min(len(words), start + 4)
                spans.append((m.start(1) + words[start].start(), m.start(1) + words[end - 1].end()))
        for start, end in spans:
            answer = block[start:end]
            if '\n' in answer or not 3 <= len(answer) <= 140: continue
            # Never split inline markup or links when hiding a clause.
            if block[:start].count('`') % 2 or block[:end].count('`') % 2: continue
            if any(char in answer for char in ['[', ']', '(', ')']): continue
            if block[:start].count('**') % 2 or block[:end].count('**') % 2: continue
            masked = block[:start] + '**[recall]**' + block[end:]
            add('explanation-recall', 'Recall the missing idea',
                'Complete the missing idea in this explanation. Equivalent wording with the same meaning is fine.\n\n' + masked,
                answer, block)
    # Interleave prompt styles within each family instead of exhausting code lines.
    kinds = defaultdict(list)
    for card in result: kinds[card['kind']].append(card)
    result = []
    for i in range(max((len(v) for v in kinds.values()), default=0)):
        for kind in ['code-recall', 'explanation-recall', 'output-recall']:
            if i < len(kinds[kind]): result.append(kinds[kind][i])
    return result

def main():
    baseline = read(DATA / 'section-expansion-baseline.json')
    packs = read(ROOT / 'artifacts/retrieval-baseline.json')
    by_deck = {p['id']: p['cards'] for p in packs}
    selected = []; sections = []; index = {}; all_fronts = {normal(c['front']) for p in packs for c in p['cards']}
    for deck in baseline:
        cards = by_deck[deck['id']]
        assert len(cards) == deck['cardCount'], 'Regenerate the baseline after changing base cards'
        groups = defaultdict(list)
        for card in cards: groups[family(card)].append(card)
        pools = {key: candidates(group) for key, group in groups.items()}
        target = len(cards) * 4
        chosen = []; rounds = max((len(v) for v in pools.values()), default=0)
        # Fair allocation revisits every family before any gets another prompt.
        for n in range(rounds):
            for key, pool in pools.items():
                if len(chosen) == target: break
                if n >= len(pool): continue
                card = pool[n]
                if normal(card['front']) in all_fronts: continue
                all_fronts.add(normal(card['front']))
                # Identity derives from the exact prompt, never its list position.
                digest = hashlib.sha256(card['front'].encode()).hexdigest()
                family_hash = hashlib.sha256(key.encode()).hexdigest()
                card_id = f'a1000000-{family_hash[:4]}-4{family_hash[4:7]}-8{family_hash[7:10]}-{family_hash[10:15]}{digest[:7]}'
                index[card_id[:-7]] = key
                chosen.append({'id': card_id, **card})
        print(deck['name'], 'base', len(cards), 'available', sum(map(len, pools.values())), 'added', len(chosen), flush=True)
        selected.append({'id': deck['id'], 'cards': chosen})
        sections.append({'id': deck['id'], 'name': deck['name'], 'track': deck['track'], 'before': len(cards), 'added': len(chosen), 'after': len(cards) + len(chosen), 'multiplier': round(1 + len(chosen) / len(cards), 3)})
    total_base = sum(s['before'] for s in sections); added = sum(s['added'] for s in sections)
    assert 4 <= (total_base + added) / total_base <= 5, f'Insufficient distinct retrieval opportunities: {added}'
    out = DATA / 'section-packs'; out.mkdir(exist_ok=True)
    chunks = []; chunk = []; count = 0
    for pack in selected:
        for start in range(0, len(pack['cards']), 180):
            piece = {'id': pack['id'], 'cards': pack['cards'][start:start + 180]}
            if count + len(piece['cards']) > 350:
                chunks.append(chunk); chunk = []; count = 0
            chunk.append(piece); count += len(piece['cards'])
    if chunk: chunks.append(chunk)
    names = []
    for i, chunk in enumerate(chunks):
        name = f'retrieval-{i + 1:02}.json'; names.append(name); write(out / name, chunk)
        assert (out / name).stat().st_size < 4 * 1024 * 1024
    assert len({c['id'] for p in selected for c in p['cards']}) == added, 'Card identity collision'
    write(DATA / 'related-family-index.json', index)
    manifest = {'version': 8, 'baseCards': total_base, 'addedCards': added, 'totalCards': total_base + added, 'chunks': names, 'sections': sections,
                'kinds': dict(Counter(c['kind'] for p in selected for c in p['cards'])), 'families': len(set(index.values())),
                'method': 'Distinct retrieval variations grounded in the existing lessons; not additional independent topics.'}
    write(DATA / 'section-expansion-manifest.json', manifest)
    report = read(DATA / 'content-report.json'); report.update({'totalCards': total_base + added, 'baseCards': total_base, 'retrievalCards': added, 'curriculumVersion': 8})
    write(DATA / 'content-report.json', report)
    print(json.dumps({k: v for k, v in manifest.items() if k not in ['sections', 'chunks']}, indent=2))

if __name__ == '__main__':
    # Historical generator retained for audit; never regenerate retired drills.
    import subprocess
    subprocess.run(['node', 'scripts/build-reviewed-content.mjs'], cwd=ROOT, check=True)
