import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { toString } from 'mdast-util-to-string';
import { parse as parseYaml } from 'yaml';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const identity = key => { const h = hash(key); return `a4000000-${h.slice(0,4)}-4${h.slice(4,7)}-8${h.slice(7,10)}-${h.slice(10,22)}`; };
const parser = unified().use(remarkParse);
const writer = unified().use(remarkStringify, { fences: true, bullet: '-', emphasis: '*', strong: '*' });
const markdown = children => writer.stringify({ type: 'root', children }).trim();
const sources = read('artifacts/comprehensive-sources.json');
const baselinePath = 'src/data/comprehensive-baseline.json';
const current = read('src/data/section-expansion-manifest.json');
const baseline = existsSync(baselinePath) ? read(baselinePath) : {
  version: current.version, cards: current.totalCards, lessons: 276, missions: 16,
  sections: current.sections.map(section => ({ id: section.id, name: section.name, cards: section.after })),
};
assert.equal(baseline.version, 12, 'Expansion baseline must be the shipped v12 curriculum');
const oldChunks = ['reviewed-01.json', ...read('src/data/library-expansion-manifest.json').chunks];
const prior = [...read('artifacts/retrieval-baseline.json'), ...oldChunks.flatMap(name => read('src/data/section-packs/' + name))].flatMap(pack => pack.cards);
assert.equal(prior.length, baseline.cards);
const seenFronts = new Set(prior.map(card => normalize(card.front)));
const seenBodies = new Set(prior.map(card => normalize(card.back.replace(/<!--.*?-->/gs, '').split('\n\n---\n')[0].replace(/^## .+$/gm, ''))));
const oldSourceKeys = new Set(prior.map(card => card.sourceKey).filter(Boolean));
const oldSections = new Set([...oldSourceKeys].map(key => {
  const [path, section] = key.split('#'); return path + '#' + normalize(section.replace(/^section:/, ''));
}));
for (const card of prior) {
  const content = card.back.split('\n\n---\n')[0];
  for (const page of content.split(/^## .+$/m).slice(1)) seenBodies.add(normalize(page));
}
const exclusions = {};
const reject = reason => { exclusions[reason] = (exclusions[reason] ?? 0) + 1; return null; };
const deckIds = (...ids) => ids.map(id => `a0000000-0000-4000-8000-${String(id).padStart(12, '0')}`);
function decksFor(repo, path) {
  if (repo === 'reactjs/react.dev') return deckIds(3,2100,2101,4006);
  if (repo === 'dotnet/EntityFramework.Docs') return deckIds(6007,6012,3001,4007,5007);
  if (repo === 'dotnet/AspNetCore.Docs') {
    if (/security/.test(path)) return deckIds(6008,3004,5008);
    if (/test/.test(path)) return deckIds(6010,3006,5004);
    if (/mvc|blazor|razor/.test(path)) return deckIds(6009,6012);
    return deckIds(6005,6006,6011,6012,5011);
  }
  if (repo === 'freeCodeCamp/freeCodeCamp') {
    if (/python|dictionaries-and-sets|loops-and-sequences|classes-and-objects/.test(path)) return deckIds(1700,1701,5002);
    if (/typescript/.test(path)) return deckIds(2,3005,5001);
    if (/sql|postgres|relational-database/.test(path)) return deckIds(5,3001,4007,5007);
    if (/react/.test(path)) return deckIds(3,2100,2101,4006);
    if (/testing|test-driven/.test(path)) return deckIds(7,3006,5004);
    return [];
  }
  if (repo === 'github/docs') return deckIds(...(/actions|codespaces|packages|deployment/.test(path) ? [8,3009,5009,4008] : [2000,2001,8,4008]));
  if (repo === 'dotnet/docs') {
    if (/visual-basic|fsharp|framework\/|migration|whats-new|breaking-change|install\/|tools\//.test(path)) return [];
    if (/linq/.test(path)) return deckIds(6003,6007);
    if (/async|await|task|cancel|parallel|thread/.test(path)) return deckIds(6004,3002,3008);
    if (/testing/.test(path)) return deckIds(6010,3006,5004,7);
    if (/diagnostic|logging|metric|tracing|observability/.test(path)) return deckIds(6011,3007,7,5003);
    if (/security|cryptography/.test(path)) return deckIds(6008,3004,5008);
    if (/serialization|json|http/.test(path)) return deckIds(6005,6012,3003,5006);
    if (/dependency-injection|configuration|extensions|hosting/.test(path)) return deckIds(6006,6011,3009);
    if (/collection|dictionary|enumerable/.test(path)) return deckIds(6003,6002);
    if (/class|record|interface|object|type|nullable|pattern/.test(path)) return deckIds(6002,6001);
    return deckIds(6001,6002);
  }
  if (/\/global_objects\/(array|typedarray|map|set)\//.test(path)) return deckIds(900,901,902,903,4003);
  if (/\/global_objects\/(object|weakmap|weakset|proxy|reflect)\//.test(path)) return deckIds(1000,1001,4003);
  if (/\/global_objects\/(string|regexp)\//.test(path)) return deckIds(1100,1101);
  if (/\/global_objects\/(date|temporal)\/|\/intl\/datetimeformat\//.test(path)) return deckIds(1400);
  if (/\/global_objects\/(number|math|bigint)\/|\/intl\/numberformat\//.test(path)) return deckIds(1300,1301,4001);
  if (/\/global_objects\/(promise|function)\/|\/functions\//.test(path)) return deckIds(1200,1201,4002);
  if (/\/javascript\//.test(path)) return deckIds(2,1600,1601,1602,4001,4002,4004);
  if (/\/css\//.test(path)) return deckIds(1800,1801,4005,5005);
  if (/\/html\//.test(path)) return deckIds(1900,4005,5005);
  if (/\/http\//.test(path)) return deckIds(6,3003,4010,5006);
  if (/\/security\//.test(path)) return deckIds(6,3004,5008);
  if (/\/performance\//.test(path)) return deckIds(3007,3008,7,5003);
  if (/\/api\/(indexeddb|idb|storage|formdata|htmlform|htmlinput)/.test(path)) return deckIds(4011,5011,1500,1501);
  if (/\/api\/(fetch|request|response|url|abort|websocket|server-sent)/.test(path)) return deckIds(4,3003,5006,4010,3002);
  if (/\/api\//.test(path)) return deckIds(1500,1501,5005);
  return [];
}

function clean(raw, repo, files, path) {
  if (repo === 'freeCodeCamp/freeCodeCamp') raw = raw.split(/^# --description--\s*$/m)[1]?.split(/^# --/m)[0] || '';
  if (repo === 'dotnet/docs') {
    // Resolve whole-file snippets only. Region/range snippets remain excluded.
    raw = raw.replace(/\[!code-([\w+-]+)\[[^\]]*\]\(([^)#?]+)\)\]/g, (match, lang, relative) => {
      const target = new URL(relative, 'https://source.invalid/' + path).pathname.slice(1);
      const code = files[target];
      return code && code.length < 6500 ? `\n\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n` : match;
    });
  }
  const ranges = [];
  const collect = node => { if (node.type === 'code') ranges.push([node.position.start.offset, node.position.end.offset]); else node.children?.forEach(collect); };
  const originalTree = parser.parse(raw);
  collect(originalTree); ranges.sort((a,b) => a[0]-b[0]);
  const cleanProse = prose => prose.replace(/\{\{(\w+)(?:\(([^{}]*)\))?\}\}/g, (match, macro, args) => {
    if (/^(?:jsxref|domxref|cssxref|htmlattrxref|glossary|httpheader|httpmethod|httpstatus|svgelement|svgattr|htmlelement|mathmlelement|webextapiref)$/i.test(macro)) {
      try { const values = JSON.parse(`[${args}]`); return '`' + String(values[1] || values[0]).replace(/`/g, '') + '`'; } catch { return match; }
    }
    const labels = { optional_inline: '(optional)', readonlyinline: '(read-only)', experimental_inline: '(experimental)', deprecated_inline: '(deprecated)', 'non-standard_inline': '(non-standard)', securecontext_header: '**Secure context required.**' };
    if (labels[macro.toLowerCase()]) return labels[macro.toLowerCase()];
    if (/^(?:\w*sidebar|apiref|jsref|cssref|htmlref|svgref|mathmlref)$/i.test(macro)) return '';
    return match;
  }).replace(/^\s*<\/?(?:Intro|Note|Pitfall|DeepDive|Recap|YouWillLearn)>\s*$/gm, '')
    .replace(/^\s*>?\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/gm, '')
    .replace(/\s*\{#[-\w]+\}/g, '');
  let result = '', offset = 0;
  for (const [start,end] of ranges) { result += cleanProse(raw.slice(offset,start)) + raw.slice(start,end); offset = end; }
  const text = result + cleanProse(raw.slice(offset));
  return { text, tree: text === raw ? originalTree : parser.parse(text) };
}
function prepareNodes(nodes, url, repo, definitions) {
  // Each section owns its nodes; only changed link syntax needs serialization.
  const clone = nodes;
  let invalid = false, changed = false;
  const visit = node => {
    if (node.type === 'image' || node.type === 'imageReference' || node.type === 'html') invalid = true;
    if (node.type === 'linkReference') {
      const definition = definitions.get(node.identifier);
      if (!definition) { invalid = true; return; }
      node.type = 'link'; node.url = definition.url; delete node.identifier; delete node.referenceType; changed = true;
    }
    if (node.type === 'link') {
      const originalURL = node.url;
      if (/^(?:javascript|data):/i.test(node.url)) invalid = true;
      else if (node.url.startsWith('/') && repo === 'mdn/content') node.url = 'https://developer.mozilla.org' + node.url;
      else if (node.url.startsWith('/') && repo === 'github/docs') node.url = 'https://docs.github.com' + node.url;
      else node.url = new URL(node.url, url).href;
      if (node.url !== originalURL) changed = true;
    }
    if (node.type === 'code') {
      node.meta = null;
      if (node.value.includes('```')) invalid = true;
    }
    node.children?.forEach(visit);
  };
  clone.forEach(visit);
  return invalid ? null : { nodes: clone, changed };
}
const skippedHeading = /^(?:specifications?|browser compatibility|see also|next steps|additional resources|related (?:content|articles)|feedback|revision history|version history|requirements|prerequisites|applies to|in this article|interactive example|live sample result|result|output)$/i;
const articles = [];
const cachePath = 'artifacts/comprehensive-parsed.json';
const parseSource = readFileSync('scripts/build-comprehensive-content.mjs', 'utf8').split('\nfunction lessonParts(article)')[0];
const cacheKey = hash(parseSource) + hash(JSON.stringify(sources.map(({repository,revision,archiveSha256}) => ({repository,revision,archiveSha256})))) + hash(JSON.stringify(prior));
const cached = existsSync(cachePath) ? read(cachePath) : null;
const reuseCache = cached?.key === cacheKey;
if (reuseCache) { articles.push(...cached.articles); Object.assign(exclusions, cached.exclusions); console.log('Reusing verified source parse cache.'); }
for (const source of reuseCache ? [] : sources) {
  let accepted = 0, processed = 0;
  for (const [path, raw] of Object.entries(source.files).sort(([a],[b]) => a.localeCompare(b))) {
    if (!path.endsWith('.md')) continue;
    if (++processed % 500 === 0) console.log(source.repository, processed, 'documents scanned:', path);
    const eligibleDecks = decksFor(source.repository, path);
    if (!eligibleDecks.length) continue;
    let body = raw, meta = {};
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (frontmatter) {
      try { meta = parseYaml(frontmatter[1]) || {}; } catch { reject('invalid frontmatter'); continue; }
      body = raw.slice(frontmatter[0].length);
    }
    if (/deprecated|experimental|non-standard/i.test(JSON.stringify(meta.status ?? ''))) { reject('unstable API'); continue; }
    const url = `https://github.com/${source.repository}/blob/${source.revision}/${path}`;
    const cleaned = clean(body, source.repository, source.files, path);
    const tree = cleaned.tree;
    const firstHeading = tree.children.find(node => node.type === 'heading' && node.depth === 1);
    const title = String(meta.title || (firstHeading && toString(firstHeading)) || '').trim();
    if (!title || /\{[{%]|deprecated|obsolete/i.test(title)) continue;
    const definitions = new Map(tree.children.filter(node => node.type === 'definition').map(node => [node.identifier, node]));
    const sections = []; let nodes = []; let headings = ['Overview'];
    function flush() {
      if (!nodes.length) return;
      const section = headings.join(' / ');
      if (skippedHeading.test(headings.at(-1))) { nodes = []; return; }
      const preparedResult = prepareNodes(nodes, url, source.repository, definitions); nodes = [];
      if (!preparedResult) return void reject('external media or unsupported markup');
      const prepared = preparedResult.nodes;
      const prose = prepared.filter(node => node.type !== 'code').map(node => toString(node)).join('\n\n');
      if (prose.split(/\s+/).length < 25) return void reject('incomplete or oversized section');
      const text = preparedResult.changed ? markdown(prepared)
        : cleaned.text.slice(prepared[0].position.start.offset, prepared.at(-1).position.end.offset).trim();
      if (text.length < 150 || text.length > 9000) return void reject('incomplete or oversized section');
    if (/\{\{|\}\}|\{%|%\}|\[!|:::|<xref:/i.test(prose) || /____|\bTODO\b/i.test(text)) return void reject('unresolved source directive');
      if (/leetcode|two[ -]sum|fibonacci|factorial|anagram|palindrome|dynamic programming|breadth.first search|depth.first search|linked list|Dijkstra|knapsack|sudoku|union.find|bubble sort|heap sort|topological sort/i.test(title + '\n' + text)) return void reject('outside practical scope');
      if (/\b(?:shown above|shown below|previous (?:example|section)|preceding (?:example|section)|the above|the following (?:image|diagram)|screenshot|this tutorial|this article)\b/i.test(prose)) return void reject('external context');
      if (/[:;]\s*$/.test(text) || (!prepared.some(n => n.type === 'code') && /\b(?:following (?:code|example)|code below|example below)\b/i.test(prose))) return void reject('missing example');
      if (/^\s*(?:\/\/|#)?\s*\.\.\.\s*$/m.test(text)) return void reject('incomplete snippet');
      if (prepared.some(node => node.type === 'code' && /^(?:bash|sh|shell|powershell|console)$/i.test(node.lang ?? '') && /rm\s+-rf\s+\/|format\s+[a-z]:|Remove-Item.*-Recurse.*\$|curl.+\|\s*(?:sh|bash)/i.test(node.value))) return void reject('unsafe shell example');
      const key = `${source.repository}/${path}#${section}`;
      const oldMatch = oldSections.has(`${source.repository}/${path}#${normalize(section)}`);
      const normalized = normalize(text);
      if (oldMatch || seenBodies.has(normalized)) return void reject('retained or repeated explanation');
      seenBodies.add(normalized);
      sections.push({ key, heading: section, nodes: prepared, body: text }); accepted++;
    }
    for (const node of tree.children) {
      if (node.type === 'heading') {
        flush();
        if (node.depth === 1) headings = ['Overview'];
        else { headings = headings.slice(0, node.depth - 2); headings.push(toString(node)); }
      } else if (node.type !== 'definition') nodes.push(node);
    }
    flush();
    if (sections.length) articles.push({ title, source: url, repo: source.repository, path, decks: eligibleDecks, sections });
  }
  console.log(source.repository, accepted, 'eligible sections');
}
if (!reuseCache) write(cachePath, { key: cacheKey, exclusions, articles: articles.map(article => ({ ...article,
  sections: article.sections.map(section => ({ ...section, nodes: section.nodes.some(node => node.type === 'code') ? [{ type: 'code' }] : [] })) })) });
function lessonParts(article) {
  const leaf = section => section.heading.split(' / ').at(-1);
  const explanation = article.sections.filter(section => section.body.length > 180 && section.body.length < 4000 && /^(overview|description|introduction|remarks|usage)$/i.test(leaf(section)))
    .sort((a,b) => Number(/^(remarks|usage)$/i.test(leaf(a))) - Number(/^(remarks|usage)$/i.test(leaf(b))))[0];
  const example = article.sections.filter(section => section.key !== explanation?.key && section.nodes.some(node => node.type === 'code') && section.body.length < 5000)
    .sort((a,b) => Number(!/example|testing|using/i.test(leaf(a))) - Number(!/example|testing|using/i.test(leaf(b))))[0];
  const detailRank = section => (/^(parameters|return value|values|exceptions|notes|limitations|caveats|security|accessibility)$/i.test(leaf(section)) ? 0 : 2)
    + Number(article.sections.indexOf(section) < article.sections.indexOf(example)) / 2;
  const boundary = article.sections.filter(section => section.key !== explanation?.key && section.key !== example?.key && section.body.length > 180 && section.body.length < 3500)
    .sort((a,b) => detailRank(a) - detailRank(b))[0];
  return example && explanation && boundary ? { example, explanation, boundary } : null;
}

function outsideFences(text) {
  const prose = []; let fence = null;
  for (const line of text.split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
    } else if (marker && !(marker[1][0] === '`' && marker[2].includes('`'))) fence = marker[1];
    else prose.push(line);
  }
  return prose.join('\n');
}

function portableSection(article, section) {
  const heading = section.heading.replace(/\s*\{\/[^}]*\/\}/g, '').trim();
  const leaf = heading.split(' / ').at(-1);
  if (!heading || skippedHeading.test(leaf) || /^what['\u2019]s next\??$/i.test(leaf) || /xref:|\{%|\{\{/.test(heading)) return null;
  let body = section.body;
  if (article.repo === 'github/docs') {
    body = body.replace(/\{%\s*(?:end)?raw\s*%\}/g, '');
    if (body.includes('{%')) return null;
  }
  if (/xref:/.test(body) || article.repo === 'reactjs/react.dev' || /^\s*`{3,}[^\n]*`{3,}/m.test(body)) {
    const tree = parser.parse(body); let invalid = false;
    const visit = node => {
      if (node.type === 'code') { node.meta = null; return; }
      if (node.type === 'link' && node.url.startsWith('xref:')) {
        const original = node.url;
        let uid;
        try { uid = decodeURIComponent(original.slice(5).split('?')[0]).replace(/\*$/, ''); } catch { invalid = true; return; }
        if (/^(System|Microsoft)\./.test(uid)) {
          node.type = 'inlineCode'; node.value = uid;
          delete node.children; delete node.url; delete node.title;
        } else {
          const roots = { 'dotnet/docs': 'docs', 'dotnet/AspNetCore.Docs': 'aspnetcore', 'dotnet/EntityFramework.Docs': 'entity-framework' };
          const snapshot = sources.find(source => source.repository === article.repo);
          const [path, fragment] = uid.split('#');
          const candidates = [roots[article.repo] + '/' + path + '.md', roots[article.repo] + '/' + path + '/index.md'];
          const target = candidates.find(path => snapshot?.files[path]);
          if (!target) { invalid = true; return; }
          node.url = `https://github.com/${article.repo}/blob/${snapshot.revision}/${target}${fragment ? '#' + fragment : ''}`;
          if (toString(node) === original) node.children = [{ type: 'text', value: uid }];
        }
      } else if (node.type === 'link' && article.repo === 'reactjs/react.dev') {
        const url = new URL(node.url);
        if (url.origin === 'https://github.com' && /^\/(learn|reference|community|blog)(\/|$)/.test(url.pathname)) node.url = 'https://react.dev' + url.pathname + url.search + url.hash;
      }
      node.children?.forEach(visit);
    };
    tree.children.forEach(visit);
    if (invalid) return null;
    body = markdown(tree.children);
  }
  if (/\{\{|\{%|<xref:|\]\(xref:|\[!INCLUDE/.test(outsideFences(body))) return null;
  if (section.key === 'freeCodeCamp/freeCodeCamp/curriculum/challenges/english/blocks/review-react-basics/67487e141bb6a7140a352e12.md#Passing props in React components') {
    body = body.replace('You can pass multiple props using the spread operator `(...)`, after converting them to an object.', "To pass several named props together, group them in an object and spread that object into the component's JSX attributes.")
      .replace('In this code, the spread operator `{...person}` converts the person object into individual props that are passed to the Child component.', 'Here, `<Child {...person} />` supplies `name`, `age`, and `city` as separate props.');
  }
  return { ...section, heading, body, nodes: section.nodes.some(node => node.type === 'code') ? [{ type: 'code' }] : [] };
}
const protectedExample = '```html\n<!-- keep this comment -->\n<div>{{jsxref("Object")}}</div>\n```';
// Keep commercial administration and historical migration notes out of the learning paths.
for (let index = articles.length - 1; index >= 0; index--) {
  const article = articles[index];
  if ((article.repo === 'github/docs' && !/^content\/(?:actions|codespaces|code-security|repositories|pull-requests|issues|discussions|packages|pages|rest|graphql|webhooks|apps|get-started|authentication|search-github)\//.test(article.path)) ||
      (article.repo === 'dotnet/docs' && /^docs\/(?:core\/(?:compatibility|unmanaged-api)|framework|desktop)\//.test(article.path)) ||
      (article.repo.startsWith('dotnet/') && /\/(?:includes|snippets)\//.test(article.path))) {
    exclusions['outside engineering curriculum'] = (exclusions['outside engineering curriculum'] ?? 0) + article.sections.length;
    articles.splice(index, 1);
  }
}
const finalBodies = new Set();
for (const card of prior) {
  const body = card.back.replace(/<!--.*?-->/gs, '').split('\n\n---\n')[0];
  finalBodies.add(normalize(body.replace(/^## .+$/gm, '')));
  for (const page of body.split(/^## .+$/m).slice(1)) finalBodies.add(normalize(page));
}
for (const article of articles) article.sections = article.sections.flatMap(section => {
  const portable = portableSection(article, section);
  if (!portable) { reject('nonportable or navigation-only section'); return []; }
  const normalized = normalize(portable.body);
  if (finalBodies.has(normalized)) { reject('duplicate after source normalization'); return []; }
  finalBodies.add(normalized); return [portable];
});
const testSection = { key: 'test', heading: 'Example', nodes: [{ type: 'code' }], body: '```yaml\nvalue: {% raw %}${{ github.ref }}{% endraw %}\n```' };
assert(portableSection({ repo: 'github/docs' }, testSection).body.includes('value: ${{ github.ref }}'));
assert(!portableSection({ repo: 'github/docs' }, testSection).body.includes('{%'));
assert(portableSection({ repo: 'dotnet/docs' }, { ...testSection, body: 'Call <xref:System.String.Trim> to trim text.' }).body.includes('`System.String.Trim`'));
assert(portableSection({ repo: 'reactjs/react.dev' }, { ...testSection, body: '[Events](https://github.com/learn/responding-to-events)' }).body.includes('https://react.dev/learn/responding-to-events'));
assert.equal(portableSection({ repo: 'reactjs/react.dev' }, { ...testSection, heading: "What's next? {/whats-next/}" }), null);
const duplicateHeadingLesson = lessonParts({ sections: [
  { key: 'intro', heading: 'Overview', body: 'Introduction. '.repeat(25), nodes: [] },
  { key: 'intro', heading: 'Overview', body: 'Another introduction. '.repeat(20), nodes: [{ type: 'code' }] },
  { key: 'example', heading: 'A code sample', body: 'Example. '.repeat(30), nodes: [{ type: 'code' }] },
  { key: 'details', heading: 'Limitations', body: 'Details. '.repeat(30), nodes: [] },
] });
assert(duplicateHeadingLesson);
assert.equal(new Set(Object.values(duplicateHeadingLesson).map(section => section.key)).size, 3);
assert.equal(clean(protectedExample, 'mdn/content', {}, 'test.md').text, protectedExample);
assert.equal(clean('{{APIRef("DOM")}}\nA paragraph.', 'mdn/content', {}, 'test.md').text.trim(), 'A paragraph.');
assert.equal(prepareNodes(parser.parse('[unsafe](javascript:alert)').children, 'https://example.com/', 'mdn/content', new Map()), null);
console.log('Total eligible sections:', articles.reduce((n,a) => n+a.sections.length,0), 'Complete guided articles:', articles.filter(lessonParts).length, 'Exclusions:', exclusions);
if (process.argv.includes('--audit')) {
  write('artifacts/comprehensive-audit.json', { articles: articles.length, sections: articles.reduce((n,a) => n+a.sections.length,0), exclusions,
    guided: articles.filter(lessonParts).length,
    decks: baseline.sections.map(deck => ({ name: deck.name, before: deck.cards, available: articles.filter(a => a.decks.includes(deck.id)).reduce((n,a) => n+a.sections.length,0) })) });
  process.exit(0);
}

const credit = article => {
  const authors = { 'mdn/content': 'MDN contributors', 'github/docs': 'GitHub and contributors', 'freeCodeCamp/freeCodeCamp': 'freeCodeCamp and contributors', 'reactjs/react.dev': 'Meta and React contributors' };
  const licenses = { 'mdn/content': 'CC BY-SA 2.5; code CC0 or MIT', 'freeCodeCamp/freeCodeCamp': 'BSD-3-Clause', 'reactjs/react.dev': 'CC BY 4.0' };
  return `---\nAdapted from [${authors[article.repo] || 'Microsoft and contributors'}](${article.source}). [${licenses[article.repo] || 'CC BY 4.0; code MIT'}](/licenses/library-${article.repo.replaceAll('/', '--')}.txt). Prompts, formatting, and selected wording adapted for Recall; source license applies to this material.`;
};
const candidates = [];
const guided = [];
const guidesNeeded = baseline.lessons * 2;
const lessonQueues = [...new Set(articles.map(article => article.decks[0]))].map(id => articles.filter(article => article.decks[0] === id));
const lessonOrder = [];
while (lessonQueues.some(queue => queue.length)) for (const queue of lessonQueues) if (queue.length) lessonOrder.push(queue.shift());
for (const article of lessonOrder) {
  const parts = lessonParts(article);
  if (guided.length < guidesNeeded && parts) {
    const { example, explanation, boundary } = parts;
    const key = `${article.repo}/${article.path}#guided-lesson`;
    const front = `**${article.title}**\n\nExplain the main idea, walk through the example, and connect the additional details.`;
    const back = `<!-- recall:teaching:v1 -->\n\n## The concept\n\n### ${explanation.heading}\n\n${explanation.body}\n\n## Worked example\n\n### ${example.heading}\n\n${example.body}\n\n## Further detail\n\n### ${boundary.heading}\n\n${boundary.body}\n\n${credit(article)}`;
    const card = { id: identity(key), front, back, kind: 'guided-source', sourceKey: key, source: article.source, decks: article.decks };
    if (!seenFronts.has(normalize(front))) {
      candidates.push(card); guided.push({ id: card.id, title: article.title, source: article.source, sectionKeys: [explanation.key, example.key, boundary.key] });
      seenFronts.add(normalize(front));
      const consumedKeys = new Set([example.key, explanation.key, boundary.key]);
      article.sections = article.sections.filter(section => !consumedKeys.has(section.key));
    }
  }
}
for (const article of articles) for (const section of article.sections) {
  const heading = section.heading;
  const question = /^(?:overview|description)$/i.test(heading) ? `Explain the key points of ${article.title}, including any stated conditions or limitations.`
    : /return value/i.test(heading) ? `What does ${article.title} return?`
    : /^parameters$/i.test(heading) ? `Which inputs does ${article.title} accept?`
    : /exceptions/i.test(heading) ? `Under what conditions does ${article.title} throw an exception?`
    : `Explain ${heading} in the context of ${article.title}.`;
  const front = `**${article.title} / ${heading}**\n\n${question}`;
  if (seenFronts.has(normalize(front))) continue;
  seenFronts.add(normalize(front));
  candidates.push({ id: identity(section.key), front, back: `<!-- recall:teaching:v1 -->\n\n## Explanation\n\n${section.body}\n\n${credit(article)}`,
    kind: 'source-reference', sourceKey: section.key, source: article.source, decks: article.decks });
}
assert.equal(guided.length, guidesNeeded, 'Not enough complete guided lessons; do not pad the count');
const target = baseline.cards * 2;
assert(candidates.length >= target, `Need ${target} distinct additions, found ${candidates.length}`);
const packs = baseline.sections.map(section => ({ id: section.id, cards: [] }));
const packById = new Map(packs.map(pack => [pack.id, pack]));
const originalCount = new Map(baseline.sections.map(section => [section.id, section.cards]));
const selected = candidates.filter(card => card.kind === 'guided-source');
const remaining = candidates.filter(card => card.kind !== 'guided-source');
const available = new Set(remaining.map(card => card.id));
const queues = packs.map(pack => ({ pack, cursor: 0, cards: remaining.filter(card => card.decks.includes(pack.id)) }));
const counts = new Map(packs.map(pack => [pack.id, 0]));
for (const card of selected) {
  const id = [...card.decks].sort((a,b) => counts.get(a)/originalCount.get(a) - counts.get(b)/originalCount.get(b))[0];
  card.decks = [id]; counts.set(id, counts.get(id) + 1);
}
while (selected.length < target) {
  queues.sort((a,b) => counts.get(a.pack.id)/originalCount.get(a.pack.id) - counts.get(b.pack.id)/originalCount.get(b.pack.id));
  let next;
  for (const queue of queues) {
    while (queue.cursor < queue.cards.length && !available.has(queue.cards[queue.cursor].id)) queue.cursor++;
    if (queue.cursor < queue.cards.length) { next = queue; break; }
  }
  if (!next) break;
  const card = next.cards[next.cursor++]; available.delete(card.id);
  selected.push({ ...card, decks: [next.pack.id] }); counts.set(next.pack.id, counts.get(next.pack.id) + 1);
}
for (const candidate of selected) {
  const eligible = candidate.decks.map(id => packById.get(id)).filter(Boolean)
    .sort((a,b) => a.cards.length/originalCount.get(a.id) - b.cards.length/originalCount.get(b.id));
  assert(eligible.length);
  const { decks, ...card } = candidate; eligible[0].cards.push(card);
}
const chunks = []; let pending = []; let size = 0;
function flush() {
  if (!pending.length) return;
  const name = `reviewed-comprehensive-${String(chunks.length+1).padStart(3,'0')}.json`;
  const json = JSON.stringify(pending, null, 2) + '\n';
  assert(Buffer.byteLength(json) < 600_000);
  writeFileSync('src/data/section-packs/' + name, json); chunks.push(name); pending = []; size = 0;
}
for (const pack of packs) for (const card of pack.cards) {
  const part = { id: pack.id, cards: [card] }; const bytes = Buffer.byteLength(JSON.stringify(part, null, 2)) + 10;
  if (size + bytes > 480_000) flush();
  const previous = pending.at(-1);
  if (previous?.id === pack.id) previous.cards.push(card); else pending.push(part);
  size += bytes;
}
flush();
const { readdirSync, unlinkSync } = await import('node:fs');
for (const name of readdirSync('src/data/section-packs'))
  if (/^reviewed-comprehensive-\d+\.json$/.test(name) && !chunks.includes(name)) unlinkSync('src/data/section-packs/' + name);
write(baselinePath, baseline);
write('src/data/source-guided-lessons.json', guided);
write('src/data/comprehensive-manifest.json', { version: 13, baseline, addedCards: selected.length, totalCards: baseline.cards + selected.length,
  guidedLessons: guided.length, totalGuidedLessons: baseline.lessons + guided.length, chunks,
  sections: packs.map(pack => ({ id: pack.id, added: pack.cards.length })),
  kinds: { 'guided-source': guided.length, 'source-reference': selected.length-guided.length },
  sources: sources.map(source => ({ repository: source.repository, revision: source.revision, archiveSha256: source.archiveSha256,
    cards: selected.filter(card => card.source.includes(`/${source.repository}/`)).length })), exclusions,
  reviewScope: 'Structured-source extraction, exact identities, deduplication, full answer sections, semantic sampling. Source code is not executed by this builder.' });
console.log(`Built ${selected.length} additional cards, including ${guided.length} new guided lessons, in ${chunks.length} chunks.`);
