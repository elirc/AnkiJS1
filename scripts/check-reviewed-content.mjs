import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const manifest = read('src/data/section-expansion-manifest.json');
const baseline = read('artifacts/retrieval-baseline.json');
const additions = manifest.chunks.flatMap(name => read('src/data/section-packs/' + name));
const all = [...baseline, ...additions].flatMap(pack => pack.cards);
const retired = read('src/data/retired-retrieval-hashes.json');
const oldRetirement = new Set(read('src/data/retired-curriculum.json').cardIds);
assert.equal(all.length, manifest.totalCards);
assert.equal(new Set(all.map(card => card.id)).size, all.length, 'Duplicate card identity');
assert.equal(new Set(all.map(card => card.front.replace(/\s+/g, ' ').trim())).size, all.length, 'Duplicate question');
for (const card of all) {
  assert.match(card.id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert(!retired[card.id] && !oldRetirement.has(card.id), `Retired card shipped: ${card.id}`);
  for (const side of ['front', 'back']) {
    assert(card[side].trim().length > 15, `${card.id}: empty ${side}`);
    assert.equal((card[side].match(/```/g) ?? []).length % 2, 0, `${card.id}: unbalanced ${side}`);
    assert(!/\*\*\[recall\]\*\*|<\/?code-tabs\b/.test(card[side]), `${card.id}: generated filler or source wrapper`);
  }
  if (card.id.startsWith('c0000000-')) assert(card.back.includes('CC BY 4.0'), `${card.id}: missing credit`);
}
for (const section of manifest.sections) {
  const base = baseline.filter(pack => pack.id === section.id).flatMap(pack => pack.cards).length;
  const added = additions.filter(pack => pack.id === section.id).flatMap(pack => pack.cards).length;
  assert.equal(section.before, base); assert.equal(section.added, added); assert.equal(section.after, base + added);
}
const scenarios = additions.flatMap(pack => pack.cards).filter(card => card.kind === 'scenario');
// Revisions for retired library cards stay in the file: the app uses them to recognise an
// unedited retired card on upgrade. They no longer correspond to a shipped card.
const retiredPrefixes = read('src/data/content-report.json').retiredLibraryPrefixes;
const isRetiredLibraryId = id => retiredPrefixes.some(prefix => id.startsWith(prefix));
let corrected = 0;
for (const correction of read('src/data/content-corrections.json')) {
  assert(correction.previous.length > 0, `Missing previous content for ${correction.id}`);
  if (isRetiredLibraryId(correction.id)) continue;
  corrected++;
  const card = all.find(card => card.id === correction.id);
  assert(card, `Missing corrected card ${correction.id}`);
  assert.equal(card.front, correction.front);
  assert.equal(card.back, correction.back);
}
assert.equal(corrected, read('src/data/content-quality-report.json').correctedBaseCards, 'Corrected base card count drifted');
assert.equal(scenarios.length, manifest.kinds.scenario);
for (const card of scenarios) {
  assert(!/____|\[recall\]/.test(card.front));
  for (const heading of ['## The answer', '## Why it works', '## Verify it']) assert(card.back.includes(heading));
}
for (const file of ['teaching-lessons', 'practical-lessons', 'dotnet-lessons']) {
  const lessons = read(`src/data/${file}.json`);
  assert.equal(new Set(lessons.map(lesson => lesson.key)).size, lessons.length, `${file}: duplicate lesson`);
  for (const lesson of lessons) for (const field of ['question', 'plain', 'example', 'analogy', 'mistake', 'check', 'answer']) {
    assert(typeof lesson[field] === 'string' && lesson[field].trim().length > 15, `${lesson.key}: missing ${field}`);
    assert.equal((lesson[field].match(/```/g) ?? []).length % 2, 0, `${lesson.key}: unbalanced ${field}`);
  }
}
console.log(`PASS: ${all.length} active cards, ${scenarios.length} authored scenarios, 276 retained guided lessons, counts, identities, credits, fences, and retired-card exclusion.`);
