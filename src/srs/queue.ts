import type { Card, Deck } from '../db/schema';

function byDueAsc(a: Card, b: Card): number {
  return new Date(a.due).getTime() - new Date(b.due).getTime();
}

function byCreatedAsc(a: Card, b: Card): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export function buildQueue(cards: Card[], deck: Deck, newStudiedToday: number, now: Date): Card[] {
  const active = cards.filter(
    (card) => card.deck_id === deck.id && card.deleted_at === null && !card.suspended,
  );
  const nowMs = now.getTime();
  const dueLearning = active
    .filter(
      (card) =>
        (card.state === 'learning' || card.state === 'relearning') &&
        new Date(card.due).getTime() <= nowMs,
    )
    .sort(byDueAsc);
  const dueReviews = active
    .filter((card) => card.state === 'review' && new Date(card.due).getTime() <= nowMs)
    .sort(byDueAsc);
  const remainingNew = Math.max(0, deck.new_per_day - newStudiedToday);
  const newCards = active
    .filter((card) => card.state === 'new')
    .sort(byCreatedAsc)
    .slice(0, remainingNew);
  return [...dueLearning, ...dueReviews, ...newCards];
}
