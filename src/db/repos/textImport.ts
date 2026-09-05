import { createDeck } from "./deckRepo";
import { createCard } from "./cardRepo";
import { db } from "../schema";

// Anki's plain-text export: tab-separated fields, quoted multiline fields, # directives.
export function parseCardText(text: string): { front: string; back: string }[] {
  const input = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  if (/^#html:true\s*$/im.test(input))
    throw new Error(
      "Export from Anki with HTML disabled. Recall imports plain text and Markdown.",
    );
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let start = true;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (start && row.length === 0 && char === "#") {
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }
    if (char === '"' && (start || quoted)) {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
      start = false;
      continue;
    }
    if (!quoted && (char === "\t" || char === "\n")) {
      row.push(field);
      field = "";
      start = true;
      if (char === "\n") {
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
      }
    } else {
      field += char;
      start = false;
    }
  }
  if (quoted) throw new Error("A quoted field is missing its closing quote.");
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (!rows.length)
    throw new Error(
      "No cards found. Use a question, a tab, and an answer on each row.",
    );
  const cards = rows.map((fields, index) => {
    if (fields.length < 2 || !fields[0].trim() || !fields[1].trim())
      throw new Error(
        `Row ${index + 1} needs a question and answer separated by a tab.`,
      );
    return { front: fields[0].trim(), back: fields[1].trim() };
  });
  if (cards.length > 10_000)
    throw new Error("Please import at most 10,000 cards at a time.");
  return cards;
}
export async function importCardText(
  text: string,
  name: string,
): Promise<number> {
  const cards = parseCardText(text);
  await db.transaction("rw", db.decks, db.cards, db.outbox, async () => {
    const deck = await createDeck(name);
    for (const card of cards) await createCard({ ...card, deck_id: deck.id });
  });
  return cards.length;
}
