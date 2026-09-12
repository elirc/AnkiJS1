import type { Card, ReviewLog } from "../db/schema";

export function siblingKey(card: Pick<Card, "id" | "note_id">): string {
  if (card.note_id) return `note:${card.note_id}`;
  // Reserved prefixes identify paired adapted exercises and guided lessons.
  return /^(c|e|f)0000000-/.test(card.id) ? card.id.slice(0, -1) : card.id;
}

// Calendar days, rather than elapsed 24-hour periods, preserve local-day
// boundaries through daylight-saving transitions.
function calendarDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function relatedIntroductionGap(introduced: number): number {
  return introduced < 2 ? 1 : introduced < 3 ? 3 : 7;
}

export function newCardCandidates(
  cards: Card[],
  logs: ReviewLog[],
  now: Date,
): Card[] {
  const today = calendarDay(now);
  const byId = new Map(cards.map((card) => [card.id, card]));
  const families = new Map<string, { reviewedToday: boolean; introduced: Set<string>; lastIntroduction: number }>();
  for (const log of logs) {
    const day = calendarDay(new Date(log.reviewed_at));
    if (!Number.isFinite(day) || day > today) continue;
    // Stable bundled IDs still identify the family if an old card was removed.
    const key = siblingKey(byId.get(log.card_id) ?? { id: log.card_id, note_id: null });
    const history = families.get(key) ?? { reviewedToday: false, introduced: new Set<string>(), lastIntroduction: -Infinity };
    if (day === today) history.reviewedToday = true;
    if (log.state_before === "new") {
      history.introduced.add(log.card_id);
      history.lastIntroduction = Math.max(history.lastIntroduction, day);
    }
    families.set(key, history);
  }
  return cards.filter((card) => {
    // Due reviews and short learning retries always retain their FSRS schedule.
    if (card.state !== "new") return true;
    const history = families.get(siblingKey(card));
    if (!history) return true;
    return !history.reviewedToday &&
      today - history.lastIntroduction >= relatedIntroductionGap(history.introduced.size);
  });
}
