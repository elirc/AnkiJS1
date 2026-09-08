// Read literal curriculum data without executing the application or source examples.
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const source = ts.createSourceFile('curriculum.ts', readFileSync('src/data/curriculum.ts', 'utf8'), ts.ScriptTarget.Latest, true);
function literal(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => [p.name.text, literal(p.initializer)]));
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'deckId') return `a0000000-0000-4000-8000-${String(literal(node.arguments[0])).padStart(12, '0')}`;
  throw new Error(`Unsupported curriculum expression: ${node.getText(source).slice(0, 80)}`);
}
let original;
for (const statement of source.statements) {
  if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations)
    if (declaration.name.getText(source) === 'originalCurriculum') original = literal(declaration.initializer);
}
if (!original) throw new Error('Original curriculum not found');
const packs = original.map(d => ({id: d.id, cards: d.cards.map(([front, back], i) => ({
  id: `b0000000-0000-4000-8000-${String(Number(d.id.slice(-12)) * 1000 + i + 1).padStart(12, '0')}`, front, back,
}))}));
packs.push(...JSON.parse(readFileSync('src/data/expanded-cards.json', 'utf8')));
mkdirSync('artifacts', {recursive: true});
writeFileSync('artifacts/retrieval-baseline.json', JSON.stringify(packs));
console.log(`Exported ${packs.reduce((n,p) => n + p.cards.length, 0)} baseline cards.`);
