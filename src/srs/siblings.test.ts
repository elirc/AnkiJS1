import { describe, expect, it } from "vitest";
import type { Card, ReviewLog } from "../db/schema";
import { newCardFields } from "./scheduler";
import { newCardCandidates, siblingKey } from "./siblings";
import { buildQueue, buildQueues, interleaveQueues } from "./queue";

const stamp = new Date(2026, 2, 7, 12).toISOString();
function card(id: string, overrides: Partial<Card> = {}): Card {
  return { id, user_id: null, deck_id: "deck", note_id: "same-concept", front: "Q", back: "A", suspended: false,
    ...newCardFields(new Date(stamp)), created_at: stamp, content_updated_at: stamp, srs_updated_at: stamp, deleted_at: null, ...overrides };
}
function log(id: string, day: number, state: Card["state"] = "new"): ReviewLog {
  return { id: `${id}-${day}-${state}`, user_id: null, card_id: id, rating: 3, state_before: state, due_before: stamp,
    stability_after: 1, difficulty_after: 1, scheduled_days_after: 1, reviewed_at: new Date(2026, 2, day, 23, 55).toISOString() };
}
const cards = [card("one"), card("two"), card("three"), card("four")];
const eligible = (logs: ReviewLog[], day: number) => newCardCandidates(cards, logs, new Date(2026, 2, day, 0, 5));

describe("related retrieval spacing", () => {
  it("introduces variations after 1, 3, then 7 local days, including the DST boundary", () => {
    const logs = [log("one", 7)];
    expect(eligible(logs, 7)).toHaveLength(0);
    expect(eligible(logs, 8)).toHaveLength(4);
    logs.push(log("two", 8));
    expect(eligible(logs, 10)).toHaveLength(0);
    expect(eligible(logs, 11)).toHaveLength(4);
    logs.push(log("three", 11));
    expect(eligible(logs, 17)).toHaveLength(0);
    expect(eligible(logs, 18)).toHaveLength(4);
  });
  it("keeps learning retries and reviews available and does not count retries as introductions", () => {
    const logs = [log("one", 7), log("one", 7, "learning")];
    expect(eligible(logs, 8)).toHaveLength(4);
    const due = [card("due", {state: "review"}), card("retry", {state: "learning"})];
    expect(newCardCandidates([...cards, ...due], logs, new Date(2026, 2, 7, 23, 59))).toEqual(due);
  });
  it("undoing the last introduction restores eligibility and unrelated cards remain available", () => {
    const logs = [log("one", 7), log("two", 8)];
    expect(eligible(logs, 9)).toHaveLength(0);
    expect(eligible(logs.slice(0, 1), 9)).toHaveLength(4);
    const personal = card("personal", {note_id: null});
    expect(newCardCandidates([...cards, personal], logs, new Date(2026, 2, 9))).toEqual([personal]);
  });
  it("pairs adapted exercises and guided lessons by their reserved identity prefix", () => {
    const explain = card("c0000000-1234-4567-8901-123456789ab0", {note_id: null});
    const complete = card("c0000000-1234-4567-8901-123456789ab1", {note_id: null});
    expect(siblingKey(explain)).toBe(siblingKey(complete));
    expect(siblingKey(card("personal", {note_id: null}))).toBe("personal");
    expect(newCardCandidates([complete], [log(explain.id, 7)], new Date(2026, 2, 7))).toEqual([]);
  });
  it("builds every deck's queue in one pass with the same result as one deck at a time", () => {
    const decks = ["deck", "other"].map((id) => ({id, name: id, new_per_day: 2, user_id: null, created_at: stamp, updated_at: stamp, deleted_at: null}));
    const library = [...cards, card("five", {deck_id: "other", note_id: null}), card("six", {deck_id: "other", note_id: null, state: "review", reps: 2, due: stamp})];
    const combined = buildQueues(library, decks, new Map([["deck", 1], ["other", 0]]), new Date(stamp));
    for (const deck of decks)
      expect(combined.get(deck.id)).toEqual(buildQueue(library, deck, deck.id === "deck" ? 1 : 0, new Date(stamp)));
    expect(combined.get("other")!.map((c) => c.id)).toEqual(["six", "five"]);
  });
  it("revisits an eligible familiar idea ahead of an older unseen concept", () => {
    const deck = {id: "deck", name: "Deck", new_per_day: 10, user_id: null, created_at: stamp, updated_at: stamp, deleted_at: null};
    const unseen = card("unseen", {note_id: null, created_at: "2020-01-01T00:00:00Z"});
    const learned = card("learned", {state: "review", due: "2030-01-01T00:00:00Z"});
    expect(buildQueue([...cards, unseen, learned], deck, 0, new Date(stamp))[0].id).toBe("one");
  });
  it("keeps one new sibling in mixed queues even across decks", () => {
    const deck = {id: "deck", name: "Deck", new_per_day: 20, user_id: null, created_at: stamp, updated_at: stamp, deleted_at: null};
    expect(buildQueue(cards, deck, 0, new Date(stamp))).toHaveLength(1);
    expect(interleaveQueues([[cards[0]], [cards[1]]], 10)).toHaveLength(1);
  });
});
