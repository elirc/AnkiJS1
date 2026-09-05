import type { Card, ReviewLog } from "../db/schema";
import { localDateStamp } from "../lib/dates";

export function siblingKey(card: Card): string {
  if (card.note_id) return `note:${card.note_id}`;
  // Reserved prefixes identify paired adapted exercises and original beginner lessons.
  return /^(c|e)0000000-/.test(card.id) ? card.id.slice(0, -1) : card.id;
}

export function newCardCandidates(
  cards: Card[],
  logs: ReviewLog[],
  now: Date,
): Card[] {
  const today = localDateStamp(now);
  const reviewed = new Set(
    logs
      .filter((log) => localDateStamp(new Date(log.reviewed_at)) === today)
      .map((log) => log.card_id),
  );
  const buried = new Set(
    cards.filter((card) => reviewed.has(card.id)).map(siblingKey),
  );
  return cards.filter(
    (card) => card.state !== "new" || !buried.has(siblingKey(card)),
  );
}
