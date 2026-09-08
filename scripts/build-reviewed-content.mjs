// Compile authored scenarios; old generated packs remain reviewable but do not ship.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = join(root, 'src/data');
const read = name => JSON.parse(readFileSync(join(data, name), 'utf8'));
const write = (name, value) => writeFileSync(join(data, name), JSON.stringify(value, null, 2) + '\n');
const hash = text => createHash('sha256').update(text).digest('hex');
const identity = key => {
  const h = hash(key);
  return `a2000000-${h.slice(0, 4)}-4${h.slice(4, 7)}-8${h.slice(7, 10)}-${h.slice(10, 22)}`;
};
const source = read('reviewed-scenarios.json');
const baseline = read('section-expansion-baseline.json');
const decks = new Map(baseline.map(deck => [deck.id, deck]));
const keys = new Set();
const fronts = new Set();
const corrections = existsSync(join(data, 'content-corrections.json')) ? read('content-corrections.json') : [];
const overrides = new Map(read('reviewed-corrections.json').map(card => [card.id, card]));
const expanded = read('expanded-cards.json');
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
      back: `<!-- recall:teaching:v1 -->\n\n## The answer\n\n${lesson.answer}\n\n## Why it works\n\n${lesson.explanation}\n\n## Verify it\n\n${lesson.check}`,
      kind: 'scenario',
    };
  }) };
});
assert.equal(new Set(packs.map(pack => pack.id)).size, packs.length, 'Combine lessons for each deck');

// Exact original-content fingerprints protect personal rewrites during retirement.
const retired = {};
const kinds = {};
let legacyBytes = 0;
for (const name of readdirSync(join(data, 'section-packs')).filter(name => /^retrieval-\d+\.json$/.test(name)).sort()) {
  legacyBytes += Buffer.byteLength(readFileSync(join(data, 'section-packs', name)));
  for (const pack of read(`section-packs/${name}`)) for (const card of pack.cards) {
    assert(!retired[card.id], `Duplicate legacy identity ${card.id}`);
    retired[card.id] = hash(JSON.stringify([card.front, card.back]));
    kinds[card.kind] = (kinds[card.kind] ?? 0) + 1;
  }
}
assert(Object.keys(retired).length > 0, 'Legacy fixtures required for reproducible retirement');
write('retired-retrieval-hashes.json', retired);
write('section-packs/reviewed-01.json', packs);
const scenarioCards = packs.reduce((sum, pack) => sum + pack.cards.length, 0);
const library = existsSync(join(data, 'library-expansion-manifest.json')) ? read('library-expansion-manifest.json') : null;
const comprehensive = existsSync(join(data, 'comprehensive-manifest.json')) ? read('comprehensive-manifest.json') : null;
const libraryCards = (library?.addedCards ?? 0) + (comprehensive?.addedCards ?? 0);
const addedCards = scenarioCards + libraryCards;
const activeKinds = { scenario: scenarioCards };
for (const counts of [library?.kinds, comprehensive?.kinds])
  for (const [kind, count] of Object.entries(counts ?? {})) activeKinds[kind] = (activeKinds[kind] ?? 0) + count;
assert.equal(Object.values(activeKinds).reduce((sum, count) => sum + count, 0), addedCards);
const version = comprehensive?.version ?? library?.version ?? 10;
const baseCards = baseline.reduce((sum, deck) => sum + deck.cardCount, 0);
const sections = baseline.map(deck => {
  const added = (packs.find(pack => pack.id === deck.id)?.cards.length ?? 0)
    + (library?.sections.find(section => section.id === deck.id)?.added ?? 0)
    + (comprehensive?.sections.find(section => section.id === deck.id)?.added ?? 0);
  return { id: deck.id, name: deck.name, track: deck.track, before: deck.cardCount, added, after: deck.cardCount + added };
});
write('section-expansion-manifest.json', {
  version, baseCards, addedCards, totalCards: baseCards + addedCards,
  chunks: ['reviewed-01.json', ...(library?.chunks ?? []), ...(comprehensive?.chunks ?? [])], sections, kinds: activeKinds,
  method: 'Authored scenarios and pinned source lessons with complete context. No masked-line or phrase drills.',
});
const report = read('content-report.json');
const baseAdaptedCards = report.baseAdaptedCards ?? report.adaptedCards;
const librarySources = { ...library?.sources };
for (const source of comprehensive?.sources ?? []) {
  const key = `https://github.com/${source.repository}`;
  librarySources[key] = (librarySources[key] ?? 0) + source.cards;
}
write('content-report.json', { ...report, totalCards: baseCards + addedCards, baseCards,
  baseAdaptedCards, adaptedCards: baseAdaptedCards + libraryCards,
  originalCards: baseCards - baseAdaptedCards + scenarioCards,
  libraryCards, librarySources, guidedLessons: comprehensive?.totalGuidedLessons ?? 276,
  retrievalCards: 0, scenarioCards, retiredRetrievalCards: Object.keys(retired).length, curriculumVersion: version });
write('content-quality-report.json', {
  version, baseCards, scenarioCards, libraryCards, activeCards: baseCards + addedCards,
  guidedLessons: comprehensive?.totalGuidedLessons ?? 276,
  retiredRetrievalCards: Object.keys(retired).length, retiredKinds: kinds, legacyPackBytes: legacyBytes,
  scenarioPackBytes: Buffer.byteLength(readFileSync(join(data, 'section-packs/reviewed-01.json'))),
  rewrittenBaseCards: overrides.size, correctedBaseCards: corrections.filter(card => !card.id.startsWith('a3000000-')).length,
  correctedLibraryCards: corrections.filter(card => card.id.startsWith('a3000000-')).length,
  scope: 'All generated retrieval packs reviewed by construction rule and structural checks. Base library checked structurally; selected authored and adapted lessons reviewed semantically. Not a claim that every retained example has been executed.',
});
console.log(`Built ${scenarioCards} authored scenarios and ${libraryCards} source-backed additions; ${baseCards + addedCards} active cards.`);
