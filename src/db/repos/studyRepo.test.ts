import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabaseForTests } from "../schema";
import { createDeck, deckCounts } from "./deckRepo";
import { applyReview, createCard, undoReview } from "./cardRepo";
import { getDashboard } from "./dashboardRepo";
import {
  getStudyPreferences,
  loadStudy,
  saveStudyPreferences,
} from "./studyRepo";
import { rate } from "../../srs/scheduler";
import { siblingKey } from "../../srs/siblings";
import { exportData, importData } from "./dataRepo";

describe("sustainable spaced repetition", () => {
  beforeEach(resetDatabaseForTests);
  const now = new Date(2026, 8, 4, 12);
  async function library() {
    const decks = [];
    for (let d = 0; d < 4; d++) {
      const deck = await createDeck(`Topic ${d}`);
      decks.push(deck);
      for (let c = 0; c < 8; c++)
        await createCard({ deck_id: deck.id, front: `Q ${d} ${c}`, back: "A" });
    }
    return decks;
  }

  it("caps all decks together and reports the same ready count on the dashboard", async () => {
    const decks = await library();
    await saveStudyPreferences({ new_per_day: 5, request_retention: 0.9 });
    const initial = await loadStudy(undefined, now);
    expect(initial.queue).toHaveLength(5);
    expect(
      new Set(initial.queue.slice(0, 4).map((card) => card.deck_id)).size,
    ).toBe(4);
    expect((await getDashboard(now)).ready).toBe(5);
    for (let i = 0; i < 5; i++) {
      const next = (await loadStudy(undefined, now)).queue[0];
      const result = rate(next, 4, now);
      await applyReview(result.card, result.log);
    }
    expect((await loadStudy(undefined, now)).queue).toHaveLength(0);
    expect((await getDashboard(now)).ready).toBe(0);
    for (const deck of decks)
      expect((await deckCounts(deck.id, now)).new_available).toBe(0);
    const tomorrow = new Date(2026, 8, 5, 12);
    expect(
      (await loadStudy(undefined, tomorrow)).queue.filter(
        (card) => card.state === "new",
      ),
    ).toHaveLength(5);
  });

  it("review-only mode still includes due cards, but never future learning cards", async () => {
    const [deck] = await library();
    const cards = await db.cards.where("deck_id").equals(deck.id).toArray();
    const result = rate(cards[0], 1, now);
    await applyReview(result.card, result.log);
    await saveStudyPreferences({ new_per_day: 0, request_retention: 0.95 });
    expect((await loadStudy(undefined, now)).queue).toHaveLength(0);
    const atDue = new Date(result.card.due);
    expect(
      (await loadStudy(undefined, atDue)).queue.map((card) => card.id),
    ).toEqual([cards[0].id]);
    expect((await getDashboard(atDue)).ready).toBe(1);
  });

  it.each(["c", "e"])(
    "keeps %s siblings apart across decks, permits learning retries, and unburies tomorrow",
    async (prefix) => {
      const decks = await library();
      const template = (await db.cards.toArray())[0];
      await db.cards.clear();
      const a = {
        ...template,
        id: `${prefix}0000000-1234-4567-8901-123456789ab0`,
        deck_id: decks[0].id,
      };
      const b = {
        ...a,
        id: `${prefix}0000000-1234-4567-8901-123456789ab1`,
        deck_id: decks[1].id,
      };
      await db.cards.bulkAdd([a, b]);
      const initial = await loadStudy(undefined, now);
      expect(initial.queue).toHaveLength(1);
      expect((await getDashboard(now)).ready).toBe(1);
      const first = initial.queue[0];
      const result = rate(first, 1, now);
      await applyReview(result.card, result.log);
      // Even a later suspension cannot make its sibling appear on the same day.
      await db.cards.update(first.id, { suspended: true });
      expect((await loadStudy(undefined, now)).queue).toHaveLength(0);
      expect((await getDashboard(now)).ready).toBe(0);
      await db.cards.update(first.id, { suspended: false });
      expect(
        (await loadStudy(undefined, new Date(result.card.due))).queue.map(
          (card) => card.id,
        ),
      ).toEqual([first.id]);
      const tomorrow = (await loadStudy(undefined, new Date(2026, 8, 5, 12)))
        .queue;
      expect(tomorrow.filter((card) => card.state === "new")).toHaveLength(1);
      expect(siblingKey(a)).toBe(siblingKey(b));
    },
  );

  it("undo restores the new allowance and clears same-day sibling burial", async () => {
    await library();
    await saveStudyPreferences({ new_per_day: 1, request_retention: 0.9 });
    const before = (await loadStudy(undefined, now)).queue[0];
    const result = rate(before, 4, now);
    await applyReview(result.card, result.log);
    expect((await loadStudy(undefined, now)).remainingNew).toBe(0);
    await undoReview(before, result.log.id);
    expect((await loadStudy(undefined, now)).remainingNew).toBe(1);
  });

  it("persists scheduling preferences through export and import", async () => {
    await saveStudyPreferences({ new_per_day: 0, request_retention: 0.95 });
    const backup = await exportData();
    await resetDatabaseForTests();
    await importData(backup);
    expect(await getStudyPreferences()).toEqual({
      new_per_day: 0,
      request_retention: 0.95,
    });
    await db.sync_meta.put({
      key: "study_preferences",
      value: '{"new_per_day":-100,"request_retention":1}',
    });
    expect(await getStudyPreferences()).toEqual({
      new_per_day: 10,
      request_retention: 0.9,
    });
  });
});
