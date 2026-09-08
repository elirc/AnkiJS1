import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const library = read('src/data/library-expansion-manifest.json');
const manifest = read('src/data/section-expansion-manifest.json');
const sources = read('scripts/section-sources.json');
const packs = library.chunks.flatMap(name => {
  const path = new URL('../src/data/section-packs/' + name, import.meta.url);
  assert(readFileSync(path).length < 600_000, `Oversized chunk ${name}`);
  return JSON.parse(readFileSync(path, 'utf8'));
});
const cards = packs.flatMap(pack => pack.cards);
assert.equal(cards.length, library.addedCards);
const comprehensive = existsSync(new URL('../src/data/comprehensive-manifest.json', import.meta.url)) ? read('src/data/comprehensive-manifest.json') : null;
assert.equal(library.totalCards + (comprehensive?.addedCards ?? 0), manifest.totalCards);
assert(library.totalCards >= 2 * library.previousTotal && library.totalCards <= 3 * library.previousTotal);
assert.equal(new Set(cards.map(card => card.sourceKey)).size, cards.length);
assert.equal(new Set(cards.map(card => card.front.replace(/\s+/g, ' ').trim())).size, cards.length);
const checkedLicenses = new Set();
for (const card of cards) {
  const parts = new URL(card.source).pathname.split('/').filter(Boolean);
  const repo = parts.slice(0,2).join('/');
  const source = sources.find(source => source.repository === repo);
  assert(source && source.revision === parts[3], `Unpinned source ${card.id}`);
  assert(source.files.includes(parts.slice(4).join('/')), `Unknown source file ${card.id}`);
  const hash = createHash('sha256').update(card.sourceKey).digest('hex');
  assert.equal(card.id, `a3000000-${hash.slice(0,4)}-4${hash.slice(4,7)}-8${hash.slice(7,10)}-${hash.slice(10,22)}`);
  assert(card.back.includes(card.source) && card.back.includes(card.license));
  const license = `/licenses/library-${repo.replaceAll('/', '--')}.txt`;
  assert(card.back.includes(license));
  if (!checkedLicenses.has(license)) {
    assert(readFileSync(new URL('../public' + license, import.meta.url), 'utf8').length > 500);
    checkedLicenses.add(license);
  }
  assert(!/____|\[recall\]|\{\/\*.*?\*\/\}/.test(card.front));
  assert(!card.back.includes('cannot run TypeScript natively'), `Outdated runtime claim ${card.id}`);
  if (card.kind === 'knowledge-check') {
    const answer = card.back.split('## Answer\n\n')[1].split('\n\n## Lesson context')[0];
    const choices = card.front.split(/(?=^\*\*[A-D]\.\*\* )/m).slice(1).map(choice => choice.trim());
    assert.equal(choices.length, 4, `Incomplete choices ${card.id}`);
    assert(choices.includes(answer.trim()), `Answer key mismatch ${card.id}`);
  } else assert.equal(card.kind, 'reference');
}
for (const section of library.sections)
  assert.equal(packs.filter(pack => pack.id === section.id).flatMap(pack => pack.cards).length, section.added);
console.log(`PASS: ${cards.length} source-backed additions, 2-3x growth, complete answer keys, pinned sources, licenses, bounded chunks, and section counts.`);
