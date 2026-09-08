import type { Card, Deck } from "../db/schema";
import { siblingKey } from "./siblings";

function byDueAsc(a: Card, b: Card): number {
  return new Date(a.due).getTime() - new Date(b.due).getTime();
}

function byCreatedAsc(a: Card, b: Card): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export function buildQueue(
  cards: Card[],
  deck: Deck,
  newStudiedToday: number,
  now: Date,
): Card[] {
  const active = cards.filter(
    (card) =>
      card.deck_id === deck.id && card.deleted_at === null && !card.suspended,
  );
  const nowMs = now.getTime();
  const dueLearning = active
    .filter(
      (card) =>
        (card.state === "learning" || card.state === "relearning") &&
        new Date(card.due).getTime() <= nowMs,
    )
    .sort(byDueAsc);
  const dueReviews = active
    .filter(
      (card) =>
        card.state === "review" && new Date(card.due).getTime() <= nowMs,
    )
    .sort(byDueAsc);
  const remainingNew = Math.max(0, deck.new_per_day - newStudiedToday);
  const practiced = new Set(cards.filter((card) => card.state !== "new" || card.reps > 0).map(siblingKey));
  const seen = new Set<string>();
  const newCards = active
    .filter((card) => card.state === "new")
    // Revisit an eligible familiar idea before moving to another new concept.
    .sort((a, b) => Number(practiced.has(siblingKey(b))) - Number(practiced.has(siblingKey(a))) || byCreatedAsc(a, b))
    .filter((card) => {
      const key = siblingKey(card);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, remainingNew);
  return [...dueLearning, ...dueReviews, ...newCards];
}

// Prioritize due work globally; alternate new cards between decks for variety.
export function interleaveQueues(
  queues: Card[][],
  remainingNew = Infinity,
): Card[] {
  const due = queues
    .flatMap((queue) => queue.filter((card) => card.state !== "new"))
    .sort(byDueAsc);
  const fresh = queues.map((queue) =>
    queue.filter((card) => card.state === "new"),
  );
  const mixed: Card[] = [];
  const seen = new Set<string>();
  const rounds = Math.max(0, ...fresh.map((queue) => queue.length));
  for (let index = 0; index < rounds; index++) {
    for (const queue of fresh)
      if (queue[index] && !seen.has(siblingKey(queue[index]))) {
        mixed.push(queue[index]);
        seen.add(siblingKey(queue[index]));
      }
  }
  return [...due, ...mixed.slice(0, Math.max(0, remainingNew))];
}
