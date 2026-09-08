"""Check every shipped variation, its provenance, and its stable family mapping."""
from pathlib import Path
import subprocess, sys
if __name__ == '__main__':
 subprocess.run(['node', 'scripts/check-reviewed-content.mjs'], cwd=Path(__file__).resolve().parents[1], check=True)
 sys.exit(0)
from collections import Counter
import json, re
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'src/data'
def read(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def family(card): return card['id'][:-1] if re.match(r'^[ce]0000000-',card['id']) else card['id']
manifest=read(DATA/'section-expansion-manifest.json')
base=read(ROOT/'artifacts/retrieval-baseline.json')
index=read(DATA/'related-family-index.json')
base_cards=[c for p in base for c in p['cards']]
base_families={family(c) for c in base_cards}
credit_families={family(c) for c in base_cards if 'Adapted from ' in c['back']}
added=[]; counts=Counter()
for name in manifest['chunks']:
 path=DATA/'section-packs'/name
 assert path.stat().st_size < 4*1024*1024
 for pack in read(path):
  counts[pack['id']]+=len(pack['cards']); added.extend(pack['cards'])
assert len(added)==manifest['addedCards']
assert 4 <= manifest['totalCards']/len(base_cards) <= 5
assert manifest['totalCards']==len(added)+len(base_cards)
assert len({c['id'] for c in base_cards+added})==manifest['totalCards']
assert len({re.sub(r'\W+','',c['front']).lower() for c in base_cards+added})==manifest['totalCards']
for section in manifest['sections']:
 assert section['added']==counts[section['id']]
 assert section['after']==section['before']+section['added']
for card in added:
 assert re.fullmatch(r'[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}',card['id'])
 key=index[card['id'][:-7]]; assert key in base_families
 if key in credit_families: assert 'Adapted from ' in card['back'] and '/licenses/30-seconds.txt' in card['back']
 assert card['front'].count('```')%2==0, card['id']
 assert card['back'].count('```')%2==0, card['id']
 assert card['back'].startswith('<!-- recall:teaching:v1 -->')
 assert '**[recall]**' in card['front'] or '____' in card['front']
 assert not re.search(r'leetcode|two[ -]sum|fibonacci|factorial|anagram|palindrome|dynamic programming|breadth.first search|depth.first search|linked list|Dijkstra|knapsack|sudoku',card['front']+card['back'],re.I)
 for name in re.findall(r'/licenses/([^)]*)',card['back']): assert (ROOT/'public/licenses'/name).is_file()
print(f"PASS: {manifest['totalCards']:,} cards ({manifest['totalCards']/len(base_cards):.2f}x), {len(added):,} variations, {len(counts)} decks, {len(index)} families, {len(manifest['chunks'])} offline chunks.")
