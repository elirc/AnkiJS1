// Compile the authored scenarios into the shipped pack, apply reviewed corrections to the
// adapted base cards, and record the content inventory.
//
// Usage: node scripts/build-reviewed-content.mjs [--inventory-only]
//   --inventory-only  rebuild the scenario pack, manifest, and reports without rewriting
//                     expanded-cards.json or content-corrections.json.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Bump this when existing installations must run the retirement/correction migration again.
const CURRICULUM_VERSION = 15;
const RETIRED_LIBRARY_PREFIXES = ['a3000000-', 'a4000000-'];
const TEACHING_MARKER = '<!-- recall:teaching:v1 -->';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = join(root, 'src/data');
const read = name => JSON.parse(readFileSync(join(data, name), 'utf8'));
const write = (name, value) => writeFileSync(join(data, name), JSON.stringify(value, null, 2) + '\n');
const hash = text => createHash('sha256').update(text).digest('hex');
const identity = key => {
  const h = hash(key);
  return `a2000000-${h.slice(0, 4)}-4${h.slice(4, 7)}-8${h.slice(7, 10)}-${h.slice(10, 22)}`;
};
const inventoryOnly = process.argv.includes('--inventory-only');
const source = read('reviewed-scenarios.json');
const baseline = read('section-expansion-baseline.json');
const decks = new Map(baseline.map(deck => [deck.id, deck]));
const overrides = new Map(read('reviewed-corrections.json').map(card => [card.id, card]));
const expanded = read('expanded-cards.json');
const corrections = read('content-corrections.json');

if (!inventoryOnly) {
  const foundOverrides = new Set();
  for (const pack of expanded) for (const card of pack.cards) {
    const override = overrides.get(card.id);
    if (override) foundOverrides.add(card.id);
    const credit = card.back.match(/\n\n---\nAdapted from [\s\S]+$/)?.[0] ?? '';
    const front = override?.front ?? card.front;
    const back = override ? override.back + credit : card.back.replace(/^<\/?code-tabs\b[^>]*>\s*$/gm, '').replace(/\n{3,}/g, '\n\n');
    if (front === card.front && back === card.back) continue;
    let revision = corrections.find(revision => revision.id === card.id);
    if (!revision) {
      revision = { id: card.id, previous: [], front, back };
      corrections.push(revision);
    }
    if (!revision.previous.some(previous => previous.front === card.front && previous.back === card.back))
      revision.previous.push({ front: card.front, back: card.back });
    revision.front = front; revision.back = back;
    card.front = front; card.back = back;
  }
  assert.equal(foundOverrides.size, overrides.size, 'Every correction must identify a retained base card');
  writeFileSync(join(data, 'expanded-cards.json'), JSON.stringify(expanded) + '\n');
  write('content-corrections.json', corrections);
}

const keys = new Set();
const fronts = new Set();
const packs = source.map(group => {
  const id = `a0000000-0000-4000-8000-${String(group.deck).padStart(12, '0')}`;
  assert(decks.has(id), `Unknown scenario deck ${id}`);
  return { id, cards: group.lessons.map(lesson => {
    assert(!keys.has(lesson.key), `Duplicate lesson key ${lesson.key}`);
    assert(!fronts.has(lesson.question), `Duplicate question ${lesson.key}`);
    keys.add(lesson.key); fronts.add(lesson.question);
    for (const field of ['question', 'answer', 'explanation', 'check']) {
      assert(typeof lesson[field] === 'string' && lesson[field].trim().length > 50, `${lesson.key}: incomplete ${field}`);
      assert(!/\[recall\]|____|TODO|lorem ipsum/.test(lesson[field]), `${lesson.key}: placeholder`);
      assert.equal((lesson[field].match(/```/g) ?? []).length % 2, 0, `${lesson.key}: broken fence`);
    }
    return {
      id: identity(lesson.key), front: lesson.question,
      back: `${TEACHING_MARKER}\n\n## The answer\n\n${lesson.answer}\n\n## Why it works\n\n${lesson.explanation}\n\n## Verify it\n\n${lesson.check}`,
      kind: 'scenario',
    };
  }) };
});
assert.equal(new Set(packs.map(pack => pack.id)).size, packs.length, 'Combine lessons for each deck');

// Exact original-content fingerprints protect personal rewrites of the archived retrieval drills.
const retired = {};
const retiredKinds = {};
let legacyBytes = 0;
for (const name of readdirSync(join(data, 'section-packs')).filter(name => /^retrieval-\d+\.json$/.test(name)).sort()) {
  legacyBytes += Buffer.byteLength(readFileSync(join(data, 'section-packs', name)));
  for (const pack of read(`section-packs/${name}`)) for (const card of pack.cards) {
    assert(!retired[card.id], `Duplicate legacy identity ${card.id}`);
    retired[card.id] = hash(JSON.stringify([card.front, card.back]));
    retiredKinds[card.kind] = (retiredKinds[card.kind] ?? 0) + 1;
  }
}
assert(Object.keys(retired).length > 0, 'Legacy fixtures required for reproducible retirement');
write('retired-retrieval-hashes.json', retired);
write('section-packs/reviewed-01.json', packs);

const scenarioCards = packs.reduce((sum, pack) => sum + pack.cards.length, 0);
const baseCards = baseline.reduce((sum, deck) => sum + deck.cardCount, 0);
const expandedCards = expanded.flatMap(pack => pack.cards);
const guidedLessons = expandedCards.filter(card => card.back.trimStart().startsWith(TEACHING_MARKER)).length;
const sections = baseline.map(deck => {
  const added = packs.find(pack => pack.id === deck.id)?.cards.length ?? 0;
  return { id: deck.id, name: deck.name, track: deck.track, before: deck.cardCount, added, after: deck.cardCount + added };
});
write('section-expansion-manifest.json', {
  version: CURRICULUM_VERSION, baseCards, addedCards: scenarioCards, totalCards: baseCards + scenarioCards,
  chunks: ['reviewed-01.json'], sections, kinds: { scenario: scenarioCards },
  retiredLibraryPrefixes: RETIRED_LIBRARY_PREFIXES,
  method: 'Authored scenarios compiled from reviewed-scenarios.json. Source-derived reference cards are retired.',
});

const report = read('content-report.json');
const baseAdaptedCards = report.baseAdaptedCards ?? report.adaptedCards;
const { libraryCards, librarySources, retrievalCards, ...retained } = report;
write('content-report.json', { ...retained, totalCards: baseCards + scenarioCards, baseCards,
  baseAdaptedCards, adaptedCards: baseAdaptedCards,
  originalCards: baseCards - baseAdaptedCards + scenarioCards,
  scenarioCards, guidedLessons, decks: baseline.length,
  retiredRetrievalCards: Object.keys(retired).length, retiredLibraryPrefixes: RETIRED_LIBRARY_PREFIXES,
  curriculumVersion: CURRICULUM_VERSION });
write('content-quality-report.json', {
  version: CURRICULUM_VERSION, baseCards, scenarioCards, activeCards: baseCards + scenarioCards, guidedLessons,
  retiredRetrievalCards: Object.keys(retired).length, retiredKinds, legacyPackBytes: legacyBytes,
  scenarioPackBytes: Buffer.byteLength(readFileSync(join(data, 'section-packs/reviewed-01.json'))),
  retiredLibraryPrefixes: RETIRED_LIBRARY_PREFIXES,
  rewrittenBaseCards: overrides.size,
  correctedBaseCards: corrections.filter(card => !RETIRED_LIBRARY_PREFIXES.some(prefix => card.id.startsWith(prefix))).length,
  scope: 'Every shipped card passes structural checks (identity, duplicates, fences, credits). Authored cards were reviewed by hand; adapted examples were not all executed.',
});
console.log(`Built ${scenarioCards} authored scenarios; ${baseCards + scenarioCards} active cards (curriculum v${CURRICULUM_VERSION}).`);
