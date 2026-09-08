import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
function proseOnly(markdown) {
  const lines = []; let fence = null;
  for (const line of markdown.split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
    } else if (marker && !(marker[1][0] === '`' && marker[2].includes('`'))) fence = marker[1];
    else lines.push(line);
  }
  assert.equal(fence, null, 'Unclosed answer code fence');
  return lines.join('\n');
}
const manifest = read('src/data/comprehensive-manifest.json');
const active = read('src/data/section-expansion-manifest.json');
const lessons = read('src/data/source-guided-lessons.json');
const cards = manifest.chunks.flatMap(name => {
  const raw = readFileSync('src/data/section-packs/' + name);
  assert(raw.length < 600_000, `Oversized chunk: ${name}`);
  return JSON.parse(raw).flatMap(pack => pack.cards.map(card => ({ ...card, deckId: pack.id })));
});
assert.equal(manifest.totalCards, active.totalCards);
assert.equal(cards.length, manifest.addedCards);
assert.equal(Object.values(active.kinds).reduce((sum, count) => sum + count, 0), active.addedCards);
assert.equal(manifest.sources.reduce((sum, source) => sum + source.cards, 0), manifest.addedCards);
assert(manifest.totalCards >= manifest.baseline.cards * 3 && manifest.totalCards <= manifest.baseline.cards * 5);
assert.equal(new Set(cards.map(card => card.sourceKey)).size, cards.length);
assert.equal(new Set(cards.map(card => card.front)).size, cards.length);
assert.equal(lessons.length, manifest.guidedLessons);
assert(manifest.totalGuidedLessons >= manifest.baseline.lessons * 3);
const sourceByRepo = new Map(manifest.sources.map(source => [source.repository, source]));
const cardById = new Map(cards.map(card => [card.id, card]));
const licenses = new Set();
for (const card of cards) {
  const digest = createHash('sha256').update(card.sourceKey).digest('hex');
  assert.equal(card.id, `a4000000-${digest.slice(0,4)}-4${digest.slice(4,7)}-8${digest.slice(7,10)}-${digest.slice(10,22)}`);
  const sourceURL = new URL(card.source);
  assert.equal(sourceURL.origin, 'https://github.com');
  const parts = sourceURL.pathname.split('/').filter(Boolean);
  assert.equal(parts[2], 'blob');
  const repo = parts.slice(0,2).join('/');
  assert.equal(parts[3], sourceByRepo.get(repo)?.revision, `Unpinned source: ${card.id}`);
  assert(card.sourceKey.startsWith(repo + '/' + parts.slice(4).join('/') + '#'), `Source identity mismatch: ${card.id}`);
  assert(card.back.includes(card.source));
  const license = `/licenses/library-${repo.replaceAll('/', '--')}.txt`;
  assert(card.back.includes(license)); licenses.add(license);
  assert(!/\{\{|\{%|<xref:|\[!INCLUDE|____|\[recall\]/i.test(proseOnly(card.back)));
  assert(!card.back.includes('{%'), `Unresolved site template: ${card.id}`);
  assert(!/\]\(xref:|https:\/\/github\.com\/(?:learn|reference)\//.test(card.back), `Nonportable link: ${card.id}`);
  assert(!/\{\/[^}]*\/\}/.test(card.front), `Unresolved heading anchor: ${card.id}`);
  assert.equal((card.back.match(/```/g) || []).length % 2, 0);
  assert(card.front.length > 30 && card.back.length > 200);
}
for (const license of licenses) assert(readFileSync('public' + license, 'utf8').length > 500);
const consumedSections = new Set();
for (const lesson of lessons) {
  const card = cardById.get(lesson.id);
  assert.equal(card?.kind, 'guided-source');
  assert.equal(lesson.sectionKeys.length, 3);
  for (const key of lesson.sectionKeys) {
    assert(!consumedSections.has(key), `Reused lesson section: ${key}`); consumedSections.add(key);
    assert(!cards.some(card => card.sourceKey === key), `Guided section also counted as a reference: ${key}`);
  }
  for (const heading of ['The concept', 'Worked example', 'Further detail']) assert(card.back.includes('## ' + heading));
}
for (const section of manifest.sections) assert.equal(cards.filter(card => card.deckId === section.id).length, section.added);
console.log(`PASS: ${cards.length} new cards, ${lessons.length} distinct three-part guided lessons, 3-5x growth, source pins, credits, identities, and bounded packs.`);
