"""Build the checked-in, offline curriculum from pinned, openly licensed sources.

Run with Python 3: python scripts/build-curriculum.py
Only downloads the declared source archive. It never runs downloaded code.
Generated card identities depend on source path/section, never on list position.
"""
from pathlib import Path
from collections import defaultdict, Counter
import hashlib
import html
import io
import json
import re
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "30-seconds/30-seconds-of-code"
REVISION = "f1b2d5a65c32432a877de94a749be40a396ebed2"
CACHE = ROOT / "artifacts/content-sources/30-seconds"

if not (CACHE / "provenance.json").exists():
    archive = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(
        f"https://codeload.github.com/{SOURCE}/zip/{REVISION}", timeout=120).read()))
    for entry in archive.namelist():
        relative = Path(*Path(entry).parts[1:])
        if entry.endswith(".md") or relative.as_posix() == "LICENSE":
            output = (CACHE / relative).resolve()
            if not output.is_relative_to(CACHE.resolve()):
                raise ValueError("Archive path escapes cache")
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(archive.read(entry))
    (CACHE / "provenance.json").write_text(json.dumps({"repo": SOURCE, "revision": REVISION}))
assert json.loads((CACHE / "provenance.json").read_text())["revision"] == REVISION
assert "Attribution 4.0 International" in (CACHE / "LICENSE").read_text(encoding="utf-8")

def stable_id(key, variant):
    h = hashlib.sha256(key.encode()).hexdigest()
    # Reserved curriculum prefix and a final variant digit also identify siblings.
    return f"c0000000-{h[:4]}-4{h[4:7]}-8{h[7:10]}-{h[10:21]}{variant}"

def clean(text):
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', text)
    text = re.sub(r'^https://codepen.io/\S+\s*$', '', text, flags=re.M)
    text = re.sub(r'\[([^\]]+)\]\(/([^)]*)\)', r'[\1](https://www.30secondsofcode.org/\2)', text)
    text = re.sub(r'@(?=\[)', '', text)
    text = text.replace('for (item of items)', 'for (const item of items)')
    return re.sub(r'\n{3,}', '\n\n', text).strip()

DECKS = {
    "js-array": ("JavaScript · arrays & collections", "Foundations", "braces", "violet", ["JavaScript", "Arrays", "Maps", "Sets"]),
    "js-object": ("JavaScript · objects & types", "Foundations", "braces", "amber", ["JavaScript", "Objects", "Types"]),
    "js-string": ("JavaScript · strings & regex", "Foundations", "braces", "green", ["JavaScript", "Strings", "Regex"]),
    "js-function": ("JavaScript · functions & async", "Foundations", "braces", "violet", ["JavaScript", "Closures", "Promises"]),
    "js-math": ("JavaScript · numbers & form values", "Foundations", "braces", "amber", ["JavaScript", "Numbers", "Form values"]),
    "js-date": ("JavaScript · dates & time", "Foundations", "braces", "green", ["JavaScript", "Dates", "Time"]),
    "js-browser": ("Browser APIs & DOM practice", "Frontend", "globe", "blue", ["DOM", "Browser", "Events"]),
    "js-core": ("JavaScript · language mechanics", "Foundations", "braces", "violet", ["JavaScript", "Syntax", "Runtime"]),
    "python": ("Python · practical fluency", "Backend", "braces", "amber", ["Python", "Collections", "Functions"]),
    "css": ("CSS · layout & interaction", "Frontend", "globe", "blue", ["CSS", "Layout", "Animation"]),
    "html": ("HTML · semantics & browser behavior", "Frontend", "globe", "green", ["HTML", "Accessibility", "Forms"]),
    "git": ("Git · everyday workflows", "Practice", "git", "amber", ["Git", "Branches", "History"]),
    "react": ("React · hooks & patterns", "Frontend", "react", "blue", ["React", "Hooks", "Components"]),
}

def deck_key(lang, tags):
    if lang != "js": return lang
    for tag, group in [("array", "array"), ("object", "object"), ("string", "string"), ("function", "function"), ("math", "math"), ("date", "date"), ("browser", "browser"), ("node", "function")]:
        if tag in tags: return "js-" + group
    return "js-core"

policy = json.loads((ROOT / "scripts/crud-content-policy.json").read_text(encoding="utf-8"))
excluded_stems = set(policy["excludedSourceStems"])

def allowed(card):
    stem = Path(card["source"]).stem
    if stem in excluded_stems: return False
    context = card["front"].split("\n")[2]
    return not any(context.endswith("— " + heading)
                   for heading in policy.get("excludedSections", {}).get(stem, []))

cards = []
seen = set()
excluded = Counter()
for path in sorted((CACHE / "content/snippets").rglob("*.md")):
    rel = path.relative_to(CACHE).as_posix()
    lang = path.relative_to(CACHE / "content/snippets").parts[0]
    if lang not in ["js", "python", "git", "css", "html", "react"] or "/s/" not in rel: continue
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"): continue
    _, meta, body = raw.split("---", 2)
    title_match = re.search(r'^title: (.+)$', meta, re.M)
    if not title_match: continue
    title = title_match[1].strip().strip('"')
    tags_match = re.search(r'^tags: \[(.+)\]', meta, re.M)
    tags = tags_match[1].split(",") if tags_match else []
    key = deck_key(lang, tags)
    # These articles contain misleading pruning/ordering examples or obsolete APIs.
    if path.stem in {"delete-branch", "count-grouped-elements", "uuid", "random-hex-color-code", "copy-to-clipboard", "deep-clone-structured-clone", "browser-os-detection", "compare-strings"}: continue
    sections = re.split(r'^#{2,4} (.+)\n', body, flags=re.M)
    units = [(title, body)] if len(sections) == 1 else list(zip(sections[1::2], sections[2::2]))
    occurrences = Counter()
    for heading, content in units:
        occurrences[heading] += 1
        content = clean(content)
        prose = re.sub(r'```.*?```', '', content, flags=re.S)
        if not (100 <= len(content) <= 2900) or len(prose.split()) > 290 or content.count("```") % 2:
            excluded["length or fences"] += 1; continue
        if re.search(r'\b(above|previous(?:ly)?|earlier|aforementioned|from before)\b|#src/|src/models/|\b(ReactDOM\.render|findDOMNode|componentWillMount|execCommand)\b', content, re.I):
            excluded["missing context or obsolete API"] += 1; continue
        if re.search(r'<(?:iframe|script|video|details|summary|div|p\b)', prose):
            excluded["embedded content"] += 1; continue
        if heading.lower() in {"conclusion", "summary", "demo", "browser support", "see also", "references", "example", "examples", "tooling", "project structure", "getting started", "installation"}: continue
        normalized = re.sub(r'\W+', '', content).lower()
        if normalized in seen: continue
        seen.add(normalized)
        context = title if heading == title else f"{title} — {heading}"
        source_key = f"{SOURCE}/{rel}#{heading}"
        if occurrences[heading] > 1: source_key += f" [{occurrences[heading]}]"
        source_url = f"https://github.com/{SOURCE}/blob/{REVISION}/{rel}"
        credit = f"\n\n---\nAdapted from [30 seconds of code]({source_url}) · [CC BY 4.0](/licenses/30-seconds.txt)."
        prompt = f"**Explain the approach**\n\n{context}\n\nHow would you do this, and what makes it work?"
        cards.append({"id": stable_id(source_key, 0), "front": prompt, "back": content + credit, "deck": key, "source": source_url, "kind": "explain"})
        candidates = []
        for code_lang, code in re.findall(r'```([^\n]*)\n(.*?)```', content, re.S)[:1]:
            if not (80 < len(code) < 1600 and 3 <= len(code.splitlines()) <= 34): continue
            lines = code.rstrip().splitlines()
            for i, line in enumerate(lines):
                stripped = line.strip()
                if 15 <= len(stripped) <= 135 and not re.match(r'(?://|#|/\*|\*|import\b|from\b|console\.|print\(|ReactDOM\.|<)', stripped) and re.search(r'[=.(]|return ', stripped):
                    candidates.append((len(re.findall(r'[.(=]', stripped)), code_lang, lines, i))
        if candidates:
            _, code_lang, lines, index = max(candidates, key=lambda x: x[0])
            missing = lines[index].strip()
            masked = lines[:]
            masked[index] = ' ' * (len(lines[index]) - len(lines[index].lstrip())) + "____"
            question = f"**Complete the code**\n\n{context}\n\nReplace `____` with one line. An equivalent working solution is fine.\n\n```{code_lang}\n" + '\n'.join(masked) + "\n```"
            answer = f"One solution:\n\n```{code_lang}\n{missing}\n```\n\n" + content + credit
            cards.append({"id": stable_id(source_key, 1), "front": question, "back": answer, "deck": key, "source": source_url, "kind": "complete"})

# Keep all smaller subject areas before sampling the larger JavaScript corpus.
# IDs remain stable even if selection/order changes in a later curriculum release.
unique = {}
for card in cards: unique.setdefault(re.sub(r'\s+', ' ', card['front']).strip(), card)
cards = list(unique.values())
cards.sort(key=lambda c: (c["deck"].startswith("js-"), hashlib.sha256(c["id"].encode()).hexdigest()))
authored_path = ROOT / "src/data/authored-expansion.json"
authored = json.loads(authored_path.read_text(encoding="utf-8")) if authored_path.exists() else []
beginner = json.loads((ROOT / "src/data/beginner-expansion.json").read_text(encoding="utf-8"))
practical = json.loads((ROOT / "src/data/practical-expansion.json").read_text(encoding="utf-8"))
dotnet = json.loads((ROOT / "src/data/dotnet-expansion.json").read_text(encoding="utf-8"))
authored.extend(beginner)
authored.extend(practical)
authored.extend(dotnet)
# Add original lessons without displacing cards from the pinned source corpus.
# Trimming this list as authored content grows would silently move deck boundaries.
grouped = defaultdict(list)
for card in cards: grouped[card.pop("deck")].append(card)
catalog = []
packs = []
for index, (key, (name, track, icon, color, topics)) in enumerate(DECKS.items(), 9):
    own = grouped[key]
    # Give each part a manageable library size; the part boundary is frozen in output.
    own.sort(key=lambda c: (c["source"], c["id"]))
    for part in range((len(own) + 119) // 120):
        # Filter AFTER assigning the original part boundary. Retained cards must
        # stay in the same deck with the same identity across upgrades.
        chunk = [card for card in own[part * 120:(part + 1) * 120] if allowed(card)]
        if not chunk: continue
        deck_id = f"a0000000-0000-4000-8000-{index * 100 + part:012}"
        display = name + (f" · {part + 1}" if len(own) > 120 else "")
        metadata = {"id": deck_id, "name": display, "track": track, "icon": icon, "color": color, "topics": topics,
                    "description": "Explain the idea, then put it into code. Short exercises for everyday engineering.",
                    "resource": {"label": "30 seconds of code · source & further reading", "url": f"https://github.com/{SOURCE}"}, "cardCount": len(chunk)}
        catalog.append(metadata)
        packs.append({"id": deck_id, "cards": chunk})
for deck in authored:
    catalog.append({k: v for k, v in deck.items() if k != "cards"} | {"cardCount": len(deck["cards"])})
    packs.append({"id": deck["id"], "cards": deck["cards"]})

excluded["outside practical CRUD scope"] = sum(not allowed(card) for card in cards)
cards = [card for card in cards if allowed(card)]
out = ROOT / "src/data"
(out / "expanded-catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding="utf-8")
(out / "expanded-cards.json").write_text(json.dumps(packs, ensure_ascii=False, separators=(',', ':')) + '\n', encoding="utf-8")
licenses = ROOT / "public/licenses"
licenses.mkdir(parents=True, exist_ok=True)
(licenses / "30-seconds.txt").write_text((CACHE / "LICENSE").read_text(encoding="utf-8"), encoding="utf-8")
total = 112 + sum(len(pack["cards"]) for pack in packs)
report = {"totalCards": total, "originalCards": 112 + sum(len(d["cards"]) for d in authored), "adaptedCards": len(cards),
          "beginnerCards": sum(len(d["cards"]) for d in beginner),
          "practicalCards": sum(len(d["cards"]) for d in practical),
          "dotnetCards": sum(len(d["cards"]) for d in dotnet),
          "dotnetLessons": len(json.loads((out / "dotnet-lessons.json").read_text(encoding="utf-8"))),
          "teachingLessons": sum(len(json.loads((out / name).read_text(encoding="utf-8")))
                                 for name in ("teaching-lessons.json", "practical-lessons.json", "dotnet-lessons.json")),
          "decks": len(catalog) + 7, "kinds": dict(Counter(c["kind"] for c in cards)), "source": SOURCE, "revision": REVISION,
          "license": "CC-BY-4.0", "excluded": dict(excluded)}
(out / "content-report.json").write_text(json.dumps(report, indent=2) + '\n', encoding="utf-8")
print(json.dumps(report, indent=2))

# Keep the shipped related-practice manifest and report consistent after a base
# rebuild. These commands read local data only and preserve stable identities.
if (out / "section-expansion-manifest.json").exists():
    import subprocess
    subprocess.run(["node", "scripts/export-retrieval-baseline.mjs"], cwd=ROOT, check=True)
    subprocess.run(["node", "scripts/build-reviewed-content.mjs"], cwd=ROOT, check=True)
    subprocess.run(["node", "scripts/check-reviewed-content.mjs"], cwd=ROOT, check=True)
