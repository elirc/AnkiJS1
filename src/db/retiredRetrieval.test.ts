import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabaseForTests, type Card } from "./schema";
import { newCardFields, rate } from "../srs/scheduler";
import { applyReview } from "./repos/cardRepo";
import { retireLegacyCurriculum } from "./retiredCurriculum";
import { initializeStudyData, curriculumVersionKey } from "./seed";
import { importData } from "./repos/dataRepo";
import legacyPacks from "../data/section-packs/retrieval-01.json";

const timestamp = "2026-01-01T00:00:00.000Z";
const deck = { id: legacyPacks[0].id, name: "My custom deck name", user_id: null,
  new_per_day: 3, created_at: timestamp, updated_at: timestamp, deleted_at: null };
const fixture = (index: number): Card => ({ ...legacyPacks[0].cards[index], deck_id: deck.id,
  user_id: null, note_id: null, suspended: false, ...newCardFields(new Date(timestamp)),
  created_at: timestamp, content_updated_at: timestamp, srs_updated_at: timestamp, deleted_at: null });

describe("quality retirement", () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(async () => {
    const { webcrypto } = await vi.importActual<{ webcrypto: Crypto }>("node:crypto");
    vi.stubGlobal("crypto", webcrypto);
    await resetDatabaseForTests();
  });

  it("retires untouched drills but preserves personal rewrites, schedules, history, and deletions", async () => {
    await db.decks.add(deck);
    const reviewed = fixture(0);
    const edited = { ...fixture(1), back: "My own explanation" };
    const moved = { ...fixture(2), deck_id: "personal-deck" };
    const deleted = { ...fixture(3), deleted_at: timestamp };
    const personal = { ...fixture(4), id: "10000000-0000-4000-8000-000000000099" };
    await db.cards.bulkAdd([reviewed, edited, moved, deleted, personal]);
    const review = rate(reviewed, 3, new Date());
    await applyReview(review.card, review.log);
    const logs = await db.review_logs.toArray();
    await initializeStudyData();
    const after = (await db.cards.get(reviewed.id))!;
    expect(after.deleted_at).toBeTruthy();
    expect(after.reps).toBe(review.card.reps);
    expect(after.due).toBe(review.card.due);
    expect(await db.cards.get(edited.id)).toEqual(edited);
    expect((await db.cards.get(moved.id))?.deleted_at).toBeTruthy();
    expect(await db.cards.get(deleted.id)).toEqual(deleted);
    expect(await db.cards.get(personal.id)).toEqual(personal);
    expect(await db.review_logs.toArray()).toEqual(logs);
    expect((await db.decks.get(deck.id))?.name).toBe(deck.name);
    expect(await db.sync_meta.get(curriculumVersionKey)).toBeDefined();
    const queue = await db.outbox.toArray();
    expect(await retireLegacyCurriculum()).toBe(false);
    expect(await db.outbox.toArray()).toEqual(queue);
  }, 120_000);

  it("reapplies retirement to an old backup without removing an edited drill", async () => {
    const old = fixture(0);
    const edited = { ...fixture(1), front: "My revised question" };
    const backup = { version: 1, exported_at: timestamp, decks: [deck], cards: [old, edited], notes: [], review_logs: [] };
    await importData(backup);
    expect((await db.cards.get(old.id))?.deleted_at).toBeTruthy();
    expect(await db.cards.get(edited.id)).toEqual(edited);
    await importData(backup);
    expect((await db.cards.get(old.id))?.deleted_at).toBeTruthy();
    expect(await db.cards.get(edited.id)).toEqual(edited);
  });

  it("rolls retirement and installation back together when queue persistence fails", async () => {
    await db.decks.add(deck);
    const old = fixture(0);
    await db.cards.add(old);
    const failure = vi.spyOn(db.outbox, "bulkPut").mockRejectedValue(new Error("queue failed"));
    try {
      await expect(initializeStudyData()).rejects.toThrow("queue failed");
      expect(await db.cards.toArray()).toEqual([old]);
      expect(await db.sync_meta.get(curriculumVersionKey)).toBeUndefined();
    } finally { failure.mockRestore(); }
  }, 120_000);
});
