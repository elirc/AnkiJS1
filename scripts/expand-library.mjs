import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const write = (path, value) => writeFileSync(join(root, path), JSON.stringify(value, null, 2) + '\n');
const digest = text => createHash('sha256').update(text).digest('hex');
const normalize = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const sources = read('scripts/section-sources.json');
const baseline = read('src/data/section-expansion-baseline.json');
const priorPacks = [...read('artifacts/retrieval-baseline.json'), ...read('src/data/section-packs/reviewed-01.json')];
const existing = priorPacks.flatMap(pack => pack.cards);
const previousTotal = existing.length;
const priorLibrary = existsSync(join(root, 'src/data/library-expansion-manifest.json'))
  ? read('src/data/library-expansion-manifest.json') : null;
const previousLibraryCards = new Map((priorLibrary?.chunks ?? []).flatMap(name => read('src/data/section-packs/' + name))
  .flatMap(pack => pack.cards).map(card => [card.id, card]));
const target = Math.round(previousTotal * 1.45);
const seen = new Set(existing.map(card => normalize(card.front)));
const excluded = {};
const reject = reason => { excluded[reason] = (excluded[reason] || 0) + 1; return null; };
const sourceByRepo = new Map(sources.map(source => [source.repository, source]));
const contextCache = new Map();
const authors = { 'freeCodeCamp/freeCodeCamp': 'freeCodeCamp and contributors', 'mdn/content': 'MDN contributors',
  'reactjs/react.dev': 'Meta and React contributors', 'github/docs': 'GitHub and contributors' };
const topics = {
  2:['typescript','language','functions'],3:['react'],4:['distributed','api','systems'],
  5:['sql'],6:['http','security'],7:['testing','debug'],8:['git','devops'],
  900:['arrays'],901:['arrays'],902:['arrays'],903:['arrays'],1000:['objects'],1001:['objects'],
  1100:['strings'],1101:['strings'],1200:['functions'],1201:['functions'],1300:['numbers'],1301:['numbers'],
  1400:['dates'],1500:['browser'],1501:['browser'],1600:['language'],1601:['language'],1602:['language'],
  1700:['python'],1701:['python'],1800:['css'],1801:['css'],1900:['html'],2000:['git'],2001:['git'],
  2100:['react'],2101:['react'],3001:['sql'],3002:['distributed'],3003:['api','http'],3004:['security'],
  3005:['typescript'],3006:['testing'],3007:['observability'],3008:['systems'],3009:['devops'],
  4001:['language','numbers'],4002:['functions','language'],4003:['arrays','objects'],4004:['debug','functions'],
  4005:['html','css'],4006:['react'],4007:['sql'],4008:['git','systems'],4011:['crud','browser'],4010:['api','http','security'],
  5001:['typescript'],5002:['python'],5003:['debug'],5004:['testing'],5005:['html','css','browser'],
  5006:['api','http'],5007:['sql'],5008:['security'],5009:['devops'],5011:['crud','api'],
  6001:['cs-basics'],6002:['cs-models'],6003:['cs-linq'],6004:['cs-async'],6005:['cs-api'],6006:['cs-services'],
  6007:['cs-data'],6008:['cs-security'],6009:['cs-ui'],6010:['cs-testing'],6011:['cs-ops'],6012:['cs-crud'],
};

function lessonContext(card) {
  if (contextCache.has(card.source)) return contextCache.get(card.source);
  const parts = new URL(card.source).pathname.split('/').filter(Boolean);
  const repo = parts.slice(0, 2).join('/');
  const path = parts.slice(4).join('/');
  const raw = readFileSync(join(root, 'artifacts/content-sources', repo.replaceAll('/', '--'), path), 'utf8');
  const body = raw.split(/^# --description--\s*$/m)[1]?.split(/^# --/m)[0]?.trim() || '';
  contextCache.set(card.source, body);
  return body;
}

function adapt(card) {
  if (!['reference', 'knowledge-check'].includes(card.kind)) return reject('missing-line exercise');
  if (seen.has(normalize(card.front))) return reject('existing or duplicate question');
  const repo = card.source.split('/blob/')[0].replace('https://github.com/', '');
  const source = sourceByRepo.get(repo);
  if (!source || !card.source.includes(`/blob/${source.revision}/`)) return reject('unpinned source');
  const credit = `---\nAdapted from [${authors[repo] ?? 'Microsoft and contributors'}](${card.source}). [${card.license}](/licenses/library-${repo.replaceAll('/', '--')}.txt). Study prompt and formatting adapted for Recall; source license applies to this material.`;
  let front = card.front;
  let body;
  let answer = '';
  if (card.kind === 'knowledge-check') {
    if (!card.source.includes('/lecture-')) return reject('quiz without its own lesson');
    body = lessonContext(card);
    const letter = card.back.split('## The answer, explained\n\n')[1]?.match(/^\*\*([A-D])\.\*\*/)?.[1];
    answer = card.front.split(/(?=^\*\*[A-D]\.\*\* )/m)
      .find(choice => choice.startsWith(`**${letter}.** `))?.trim() || '';
    if (!/^\*\*[A-D]\.\*\*/.test(answer)) return reject('missing answer key');
  } else {
    const content = card.back.split('\n\n---\nAdapted from')[0];
    body = content.includes('## Read it together\n\n')
      ? content.split('## Read it together\n\n')[1]
      : content.split('## The explanation\n\n')[1];
    const title = front.split('\n\n')[0].replace(/^\*\*|\*\*$/g, '').replace(/\s*\{\/\*.*?\*\/\}/g, '').trim();
    front = `**${title}**\n\nExplain the key behavior described by this topic.`;
  }
  if (card.source.includes('/lecture-introduction-to-typescript/67d1d96532bc095aee051657.md')) {
    body = body.replace(/Most JavaScript runtime environments,[\s\S]*?(?=\n\n|$)/,
      'Browsers require JavaScript. Recent Node.js versions can strip supported TypeScript syntax without type checking. Run the type checker separately. [Node.js reference](https://nodejs.org/api/typescript.html).');
    if (card.sourceKey.endsWith('#question:1'))
      front = front.replace(front.split('\n\n')[0], 'In a TypeScript function parameter list, what does `array: string[]` declare?');
    if (card.sourceKey.endsWith('#question:2')) {
      front = 'What happens if TypeScript-only syntax, such as a type annotation, is sent directly to a web browser\'s JavaScript engine?\n\n**A.** The browser type-checks it before execution.\n\n**B.** The browser automatically removes every type annotation.\n\n**C.** The browser rejects the syntax; provide JavaScript instead.\n\n**D.** Type annotations become runtime input validation.';
      answer = '**C.** The browser rejects the syntax; provide JavaScript instead.';
    }
  }
  if (!body || body.length < 220 || body.length > 8500) return reject('lesson length');
  body = body.replace(/^(#{1,6} .+?)\s*\{\/\*.*?\*\/\}\s*$/gm, '$1');
  if (/[:;]\s*$/.test(body)) return reject('dangling example introduction');
  if (!body.includes('```') && /\b(?:(?:following|this) (?:\w+ )?example|following code|shown below|as follows)\b/i.test(body)) return reject('missing referenced example');
  if (/leetcode|two[ -]sum|fibonacci|factorial|anagram|palindrome|dynamic programming|breadth.first search|depth.first search|linked list|Dijkstra|knapsack|sudoku|union.find|bubble sort|heap sort|topological sort/i.test(front + '\n' + body)) return reject('outside practical scope');
  const prose = body.replace(/```[^\n]*\n[\s\S]*?```/g, '');
  if (prose.split(/\s+/).length < 40) return reject('insufficient explanation');
  if (/\[!INCLUDE|\[!code|<xref:|:::|\{\{|\}\}|<\/?(?:Sandpack|Recipe|Tabs|TabItem|iframe|video|img|details|summary)|--(?:description|answers|feedback)--/i.test(prose)) return reject('unresolved source markup');
  if (/\b(?:above|earlier|previous (?:example|section|lesson)|screenshot|diagram|illustration|this tutorial|this article|sample app|sample project)\b/i.test(prose)) return reject('external lesson context');
  if (/____|\[recall\]|\bTODO\b|^\s*(?:\/\/|#)?\s*\.\.\.\s*$/m.test(front + '\n' + body)) return reject('placeholder or incomplete example');
  if ((body.match(/```/g) || []).length % 2 || (front.match(/```/g) || []).length % 2) return reject('unbalanced fences');
  if (/!\[[^\]]*\]|<\/?(?:script|style)\b/i.test(prose)) return reject('external media or raw markup');
  if (/\{\/\*|<\/?[A-Za-z][^>]*>/.test(prose.replace(/`[^`]+`/g, ''))) return reject('unsupported document component');
  body = body.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
    if (/^(?:https?:|mailto:)/.test(href)) return match;
    if (href.startsWith('#') || /^[a-z]+:/i.test(href)) return label;
    const base = repo === 'freeCodeCamp/freeCodeCamp' ? 'https://www.freecodecamp.org' : card.source;
    return `[${label}](${new URL(href, base).href})`;
  });
  if (seen.has(normalize(front))) return reject('duplicate adapted question');
  const h = digest(card.sourceKey);
  const id = `a3000000-${h.slice(0,4)}-4${h.slice(4,7)}-8${h.slice(7,10)}-${h.slice(10,22)}`;
  const back = card.kind === 'knowledge-check'
    ? `<!-- recall:teaching:v1 -->\n\n## Answer\n\n${answer}\n\n## Lesson context\n\n${body}\n\n${credit}`
    : `<!-- recall:teaching:v1 -->\n\n## Key idea\n\n${body}\n\n${credit}`;
  seen.add(normalize(front));
  return { id, front, back, kind: card.kind, source: card.source, license: card.license,
    sourceKey: card.sourceKey, categories: card.categories };
}

const candidates = read('artifacts/section-candidates.json').map(adapt).filter(Boolean);
console.log('Eligible:', candidates.length, 'Target:', target, 'Excluded:', excluded);
if (process.argv.includes('--audit')) {
  const counts = {};
  for (const card of candidates) for (const tag of card.categories) counts[tag] = (counts[tag] || 0) + 1;
  console.log('Coverage:', counts);
  process.exit(0);
}
assert(candidates.length >= previousTotal, 'Insufficient eligible content for a genuine 2x expansion');
const available = new Map(candidates.map(card => [card.id, card]));
const packs = baseline.map(deck => ({ id: deck.id, cards: [] }));
const choices = baseline.map(deck => candidates.filter(card => topics[Number(deck.id.slice(-12))].some(tag => card.categories.includes(tag)))
  .sort((a, b) => a.sourceKey < b.sourceKey ? -1 : a.sourceKey > b.sourceKey ? 1 : 0));
const priorCount = new Map(baseline.map(deck => [deck.id, priorPacks.filter(pack => pack.id === deck.id).flatMap(pack => pack.cards).length]));
const wanted = Math.min(target, candidates.length);
let total = 0;
while (total < wanted) {
  const ordered = packs.map((pack, index) => ({ pack, index, ratio: pack.cards.length / priorCount.get(pack.id) }))
    .sort((a,b) => a.ratio - b.ratio || choices[a.index].length - choices[b.index].length || a.index - b.index);
  let added = false;
  for (const { pack, index } of ordered) {
    const card = choices[index].find(card => available.has(card.id));
    if (!card) continue;
    available.delete(card.id);
    const { categories, ...shipped } = card;
    pack.cards.push(shipped); total++; added = true; break;
  }
  if (!added) break;
}
assert(total >= previousTotal, 'Eligible subjects cannot provide a genuine 2x expansion');
const chunks = [];
let pending = [];
let bytes = 0;
function flush() {
  if (!pending.length) return;
  const name = `reviewed-library-${String(chunks.length + 1).padStart(2, '0')}.json`;
  write(`src/data/section-packs/${name}`, pending);
  chunks.push(name); pending = []; bytes = 0;
}
for (const pack of packs) {
  for (let offset = 0; offset < pack.cards.length; offset += 30) {
    const part = { id: pack.id, cards: pack.cards.slice(offset, offset + 30) };
    const size = Buffer.byteLength(JSON.stringify(part));
    if (bytes + size > 450_000) flush();
    pending.push(part); bytes += size;
  }
}
flush();
// This prefix is owned by this generator; never remove other content packs.
const outputDirectory = join(root, 'src/data/section-packs');
for (const name of readdirSync(outputDirectory))
  if (/^reviewed-library-\d+\.json$/.test(name) && !chunks.includes(name)) unlinkSync(join(outputDirectory, name));
const selected = packs.flatMap(pack => pack.cards);
const corrections = read('src/data/content-corrections.json');
for (const card of selected) {
  const previous = previousLibraryCards.get(card.id);
  if (!previous || (previous.front === card.front && previous.back === card.back)) continue;
  let revision = corrections.find(revision => revision.id === card.id);
  if (!revision) { revision = { id: card.id, previous: [], front: card.front, back: card.back }; corrections.push(revision); }
  if (!revision.previous.some(text => text.front === previous.front && text.back === previous.back))
    revision.previous.push({ front: previous.front, back: previous.back });
  revision.front = card.front; revision.back = card.back;
}
write('src/data/content-corrections.json', corrections);
const counts = key => Object.fromEntries([...new Set(selected.map(key))].sort().map(value => [value, selected.filter(card => key(card) === value).length]));
mkdirSync(join(root, 'public/licenses'), { recursive: true });
for (const repo of new Set(selected.map(card => card.source.split('/blob/')[0].replace('https://github.com/', '')))) {
  const source = sourceByRepo.get(repo);
  assert(source.licenses.length, `${repo}: source license required`);
  const license = source.licenses.map(path => `${repo} @ ${source.revision}\n${path}\n\n${readFileSync(join(root, 'artifacts/content-sources', repo.replaceAll('/', '--'), path), 'utf8')}`).join('\n\n--------------------\n\n');
  writeFileSync(join(root, `public/licenses/library-${repo.replaceAll('/', '--')}.txt`), license);
}
write('src/data/library-expansion-manifest.json', {
  version: 12, previousTotal, addedCards: total, totalCards: previousTotal + total,
  multiplier: (previousTotal + total) / previousTotal, chunks,
  sections: packs.map(pack => ({ id: pack.id, added: pack.cards.length })),
  kinds: counts(card => card.kind), sources: counts(card => card.source.split('/blob/')[0]), excluded,
  method: 'Pinned source lessons and knowledge checks. Complete context, explicit answer keys, no masked lines. Semantic sampling and structural checks; not every code example executed.',
});
console.log(`Added ${total} cards in ${chunks.length} bounded chunks; ${previousTotal + total} total (${((previousTotal + total) / previousTotal).toFixed(2)}x).`);
