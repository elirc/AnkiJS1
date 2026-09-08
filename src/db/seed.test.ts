import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabaseForTests } from "./schema";
import { initializeStudyData, curriculumVersionKey } from "./seed";
import {
  curriculum,
  originalCurriculum,
  loadStarterCards,
  starterCardCount,
} from "../data/curriculum";
import { applyReview } from "./repos/cardRepo";
import { newCardFields, rate } from "../srs/scheduler";
describe("starter curriculum", () => {
  beforeEach(resetDatabaseForTests);
  it("rolls back every batch and the version marker when saving the queue fails", async () => {
    const failure = vi.spyOn(db.outbox, "bulkPut").mockRejectedValue(new Error("simulated queue failure"));
    try {
      await expect(initializeStudyData()).rejects.toThrow("simulated queue failure");
      expect(await db.cards.count()).toBe(0);
      expect(await db.decks.count()).toBe(0);
      expect(await db.outbox.count()).toBe(0);
      expect(await db.sync_meta.get(curriculumVersionKey)).toBeUndefined();
    } finally { failure.mockRestore(); }
  }, 120_000);
  it("installs complete ready-to-study cards atomically with sync entries", async () => {
    await Promise.all([initializeStudyData(), initializeStudyData()]);
    expect(await db.decks.count()).toBe(curriculum.length);
    expect(await db.cards.count()).toBe(starterCardCount);
    expect(await db.outbox.count()).toBe(starterCardCount + curriculum.length);
    expect(
      (await db.cards.toArray()).every(
        (card) => card.front.trim() && card.back.trim() && card.state === "new",
      ),
    ).toBe(true);
  });
  it("preserves reviewed cards, edited decks, and intentional deletions on another boot", async () => {
    await initializeStudyData();
    const card = (await db.cards.toArray())[0];
    const result = rate(card, 4, new Date());
    await applyReview(result.card, result.log);
    await db.decks.update(curriculum[0].id, { name: "My renamed deck" });
    await db.decks.update(curriculum[1].id, {
      deleted_at: new Date().toISOString(),
    });
    await initializeStudyData();
    expect((await db.cards.get(card.id))?.reps).toBe(1);
    expect((await db.decks.get(curriculum[0].id))?.name).toBe(
      "My renamed deck",
    );
    expect((await db.decks.get(curriculum[1].id))?.deleted_at).not.toBeNull();
  });
  it("upgrades a v1 install while preserving edits, schedules, suspended cards, and tombstones", async () => {
    const content = await loadStarterCards();
    const timestamp = "2026-01-01T00:00:00.000Z";
    for (const deck of originalCurriculum) {
      await db.decks.add({
        id: deck.id,
        name: deck.name,
        new_per_day: 3,
        user_id: null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      });
      await db.cards.bulkAdd(
        content.get(deck.id)!.filter((card) => !/^a[1234]000000-/.test(card.id)).map((card) => ({
          ...card,
          deck_id: deck.id,
          note_id: null,
          user_id: null,
          suspended: false,
          ...newCardFields(new Date(timestamp)),
          created_at: timestamp,
          content_updated_at: timestamp,
          srs_updated_at: timestamp,
          deleted_at: null,
        })),
      );
    }
    await db.sync_meta.put({ key: "starter_curriculum_v1", value: timestamp });
    expect(await db.sync_meta.get(curriculumVersionKey)).toBeUndefined();
    const originalCards = await db.cards.toArray();
    const result = rate(originalCards[0], 4, new Date());
    result.card.front = "My own wording";
    result.card.suspended = true;
    await applyReview(result.card, result.log);
    const savedBeforeUpgrade = await db.cards.get(result.card.id);
    const deletedAt = new Date().toISOString();
    await db.cards.update(originalCards[1].id, { deleted_at: deletedAt });
    await db.decks.update(curriculum[1].id, {
      name: "My deleted deck",
      deleted_at: deletedAt,
    });
    await initializeStudyData();
    const skippedAdditions = curriculum[1].cardCount - originalCurriculum[1].cards.length;
    expect(await db.cards.count()).toBe(starterCardCount - skippedAdditions);
    expect(await db.cards.get(result.card.id)).toEqual(savedBeforeUpgrade);
    expect((await db.cards.get(originalCards[1].id))?.deleted_at).toBe(
      deletedAt,
    );
    expect((await db.decks.get(curriculum[1].id))?.name).toBe(
      "My deleted deck",
    );
    expect((await db.decks.get(curriculum[1].id))?.deleted_at).toBe(deletedAt);
    expect(await db.review_logs.count()).toBe(1);
  });

  it.each([
    { version: "v2", count: 2247, excluded: ["Start here", "Keep going", "C# & .NET"] },
    { version: "v3", count: 2407, excluded: ["Keep going", "C# & .NET"] },
    { version: "v4", count: 2607, excluded: ["C# & .NET"] },
  ])("upgrades $version without changing any existing card or review", async ({ version, count, excluded }) => {
    const content = await loadStarterCards();
    const baseline = curriculum.filter((d) => !excluded.includes(d.track));
    const timestamp = "2026-01-01T00:00:00.000Z";
    const schedule = newCardFields(new Date(timestamp));
    const baselineCards = baseline.flatMap((deck) =>
      content.get(deck.id)!.filter((card) => !/^a[1234]000000-/.test(card.id)).map((card) => ({
        ...card,
        deck_id: deck.id,
        note_id: null,
        user_id: null,
        suspended: false,
        ...schedule,
        created_at: timestamp,
        content_updated_at: timestamp,
        srs_updated_at: timestamp,
        deleted_at: null,
      })),
    );
    // Insert existing tracks directly so the test exercises adding later tracks
    // from an already populated library with edits and scheduled reviews.
    expect(baselineCards).toHaveLength(count);
    await db.decks.bulkAdd(
      baseline.map((deck) => ({
        id: deck.id,
        name: deck.name,
        new_per_day: 3,
        user_id: null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      })),
    );
    await db.cards.bulkAdd(baselineCards);
    await db.sync_meta.put({
      key: `starter_curriculum_${version}`,
      value: "2026-01-01T00:00:00.000Z",
    });
    const existing = baselineCards[0];
    await db.cards.update(existing.id, {
      back: "My edited answer",
      suspended: true,
    });
    const result = rate(baselineCards[1], 4, new Date());
    await applyReview(result.card, result.log);
    const before = await db.cards.toArray();
    const logs = await db.review_logs.toArray();
    await initializeStudyData();
    expect(await db.cards.count()).toBe(starterCardCount);
    const after = await db.cards.bulkGet(before.map((c) => c.id));
    // Compare every field without constructing a multi-megabyte assertion diff.
    expect(JSON.stringify(after) === JSON.stringify(before)).toBe(true);
    expect(await db.review_logs.toArray()).toEqual(logs);
    expect(await db.decks.count()).toBe(curriculum.length);
    expect(await db.sync_meta.get(curriculumVersionKey)).toBeDefined();
  }, 60_000);
});
