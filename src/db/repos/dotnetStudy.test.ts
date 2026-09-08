import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabaseForTests } from "../schema";
import { createDeck } from "./deckRepo";
import { applyReview, createCard, undoReview } from "./cardRepo";
import { loadStudy, saveStudyPreferences } from "./studyRepo";
import { rate } from "../../srs/scheduler";
import { DOTNET_TRACK, dotnetDecks } from "../../data/dotnet-path";

describe("focused .NET study", () => {
  const now = new Date(2026, 8, 5, 12);
  beforeEach(resetDatabaseForTests);
  async function library() {
    const personal = await createDeck("My JavaScript");
    for (const deck of dotnetDecks.slice(0, 2)) {
      await db.decks.add({ ...personal, id: deck.id, name: deck.name, new_per_day: 3 });
      for (let index = 0; index < 4; index++) {
        const card = await createCard({ deck_id: deck.id, front: `Question ${index}`, back: "Answer" });
        await db.cards.update(card.id, { created_at: new Date(now.getTime() + index).toISOString() });
      }
    }
    const outside = await createCard({ deck_id: personal.id, front: "JavaScript", back: "Answer" });
    return outside;
  }

  it("limits scope, puts due reviews first, and keeps new deck order across days", async () => {
    const outside = await library();
    const second = (await db.cards.where("deck_id").equals(dotnetDecks[1].id).toArray())[0];
    await db.cards.update(second.id, { state: "review", due: new Date(now.getTime() - 1000).toISOString() });
    await db.cards.update(outside.id, { state: "review", due: new Date(now.getTime() - 2000).toISOString() });
    await saveStudyPreferences({ new_per_day: 5, request_retention: 0.9 });
    for (const date of [now, new Date(2026, 8, 6, 12)]) {
      const result = await loadStudy(undefined, date, DOTNET_TRACK);
      expect(result.decks.map((deck) => deck.id)).toEqual(dotnetDecks.slice(0, 2).map((deck) => deck.id));
      expect(result.queue[0].id).toBe(second.id);
      expect(result.queue.some((card) => card.id === outside.id)).toBe(false);
      expect(result.queue.slice(1).map((card) => card.deck_id)).toEqual([
        ...Array(3).fill(dotnetDecks[0].id), ...Array(2).fill(dotnetDecks[1].id),
      ]);
      expect(result.queue.slice(1, 4).map((card) => card.front)).toEqual(["Question 0", "Question 1", "Question 2"]);
    }
    await db.decks.update(dotnetDecks[0].id, { deleted_at: now.toISOString() });
    await db.cards.update(second.id, { suspended: true });
    const result = await loadStudy(undefined, now, DOTNET_TRACK);
    expect(result.decks).toHaveLength(1);
    expect(result.queue.every((card) => card.deck_id === dotnetDecks[1].id && card.state === "new")).toBe(true);
  });

  it("shares the global allowance with other subjects and restores it on undo", async () => {
    const outside = await library();
    await saveStudyPreferences({ new_per_day: 2, request_retention: 0.9 });
    const externalReview = rate(outside, 4, now);
    await applyReview(externalReview.card, externalReview.log);
    const before = await loadStudy(undefined, now, DOTNET_TRACK);
    expect(before.queue).toHaveLength(1);
    const card = before.queue[0];
    const result = rate(card, 1, now);
    await applyReview(result.card, result.log);
    expect((await loadStudy(undefined, now, DOTNET_TRACK)).queue).toHaveLength(0);
    const atDue = await loadStudy(undefined, new Date(result.card.due), DOTNET_TRACK);
    expect(atDue.queue.map((item) => item.id)).toEqual([card.id]);
    await undoReview(card, result.log.id);
    const restored = await loadStudy(undefined, now, DOTNET_TRACK);
    expect(restored.remainingNew).toBe(1);
    expect(restored.queue.map((item) => item.id)).toEqual([card.id]);
    expect((await loadStudy(undefined, now)).remainingNew).toBe(1);
  });

  it("never falls back to unrelated cards or next-due times when a path is empty", async () => {
    const deck = await createDeck("Other subject");
    const outside = await createCard({ deck_id: deck.id, front: "Outside", back: "Answer" });
    await db.cards.update(outside.id, { state: "review", due: new Date(now.getTime() + 1000).toISOString() });
    const result = await loadStudy(undefined, now, DOTNET_TRACK);
    expect(result.queue).toEqual([]);
    expect(result.decks).toEqual([]);
    expect(result.nextDue).toBeNull();
  });
});
