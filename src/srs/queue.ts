import type { Card, Deck } from "../db/schema";
import { siblingKey } from "./siblings";

function byDueAsc(a: Card, b: Card): number {
  return Date.parse(a.due) - Date.parse(b.due);
}

function byCreatedAsc(a: Card, b: Card): number {
  return Date.parse(a.created_at) - Date.parse(b.created_at);
}

export function buildQueue(
  cards: Card[],
  deck: Deck,
  newStudiedToday: number,
  now: Date,
): Card[] {
  return buildQueues(cards, [deck], new Map([[deck.id, newStudiedToday]]), now).get(deck.id) ?? [];
}

// One pass over the library serves every deck: grouping cards and computing the
// practiced-family set once instead of once per deck.
export function buildQueues(
  cards: Card[],
  decks: Deck[],
  newStudiedToday: Map<string, number>,
  now: Date,
): Map<string, Card[]> {
  const nowMs = now.getTime();
  const byDeck = new Map<string, Card[]>(decks.map((deck) => [deck.id, []]));
  for (const card of cards) {
    if (card.deleted_at !== null || card.suspended) continue;
    byDeck.get(card.deck_id)?.push(card);
  }
  let practiced: Set<string> | undefined;
  const queues = new Map<string, Card[]>();
  for (const deck of decks) {
    const dueLearning: Card[] = [];
    const dueReviews: Card[] = [];
    const fresh: Card[] = [];
    for (const card of byDeck.get(deck.id) ?? []) {
      if (card.state === "new") fresh.push(card);
      else if (Date.parse(card.due) <= nowMs)
        (card.state === "review" ? dueReviews : dueLearning).push(card);
    }
    dueLearning.sort(byDueAsc);
    dueReviews.sort(byDueAsc);
    const remainingNew = Math.max(0, deck.new_per_day - (newStudiedToday.get(deck.id) ?? 0));
    let newCards: Card[] = [];
    if (remainingNew > 0 && fresh.length > 0) {
      practiced ??= new Set(
        cards.filter((card) => card.state !== "new" || card.reps > 0).map(siblingKey),
      );
      const familiar = practiced;
      const keys = new Map(fresh.map((card) => [card.id, siblingKey(card)]));
      const seen = new Set<string>();
      newCards = fresh
        // Revisit an eligible familiar idea before moving to another new concept.
        .sort((a, b) =>
          Number(familiar.has(keys.get(b.id)!)) - Number(familiar.has(keys.get(a.id)!)) ||
          byCreatedAsc(a, b))
        .filter((card) => {
          const key = keys.get(card.id)!;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, remainingNew);
    }
    queues.set(deck.id, [...dueLearning, ...dueReviews, ...newCards]);
  }
  return queues;
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
