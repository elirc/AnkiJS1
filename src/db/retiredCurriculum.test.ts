import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabaseForTests, type Card, type Deck } from "./schema";
import { initializeStudyData, curriculumVersionKey } from "./seed";
import { retireLegacyCurriculum } from "./retiredCurriculum";
import { importData } from "./repos/dataRepo";
import { applyReview } from "./repos/cardRepo";
import { newCardFields, rate } from "../srs/scheduler";
import { loadStarterCards } from "../data/curriculum";
import retirement from "../data/retired-curriculum.json";

const timestamp = "2026-01-01T00:00:00.000Z";
const oldDeck: Deck = {
  id: "a0000000-0000-4000-8000-000000000001",
  name: "Data structures & algorithms", new_per_day: 3, user_id: null,
  created_at: timestamp, updated_at: timestamp, deleted_at: null,
};
function card(id: string, front = "Two Sum: how can you avoid a nested loop?"): Card {
  return {
    id, front, back: "The old saved answer", deck_id: oldDeck.id,
    note_id: null, user_id: null, suspended: false,
    ...newCardFields(new Date(timestamp)), created_at: timestamp,
    content_updated_at: timestamp, srs_updated_at: timestamp, deleted_at: null,
  };
}
const legacy = card("b0000000-0000-4000-8000-000000001004");
const personal = card("10000000-0000-4000-8000-000000000001", "My own API validation checklist");

describe("CRUD curriculum retirement", () => {
  beforeEach(resetDatabaseForTests);

  it("upgrades v5 while preserving personal cards, retained edits, scheduling, and review history", async () => {
    const content = await loadStarterCards();
    const jsDeckId = "a0000000-0000-4000-8000-000000000002";
    const retained = { ...card("b0000000-0000-4000-8000-000000002001"),
      ...content.get(jsDeckId)![0], deck_id: jsDeckId, back: "My edited answer" };
    await db.decks.bulkAdd([oldDeck, { ...oldDeck, id: jsDeckId, name: "My web dev deck" }]);
    await db.cards.bulkAdd([legacy, retained, personal]);
    const review = rate(retained, 4, new Date());
    await applyReview(review.card, review.log);
    const saved = await db.cards.get(retained.id);
    const oldReview = rate(legacy, 3, new Date());
    await applyReview(oldReview.card, oldReview.log);
    const logs = await db.review_logs.toArray();
    await db.sync_meta.put({ key: "starter_curriculum_v5", value: timestamp });
    await initializeStudyData();
    expect(await db.sync_meta.get(curriculumVersionKey)).toBeDefined();
    expect(await db.cards.get(retained.id)).toEqual(saved);
    expect(await db.cards.get(personal.id)).toEqual(personal);
    expect((await db.decks.get(oldDeck.id))?.name).toBe("My saved cards");
    expect((await db.decks.get(oldDeck.id))?.deleted_at).toBeNull();
    expect((await db.decks.get(jsDeckId))?.name).toBe("My web dev deck");
    expect((await db.cards.get(legacy.id))?.deleted_at).not.toBeNull();
    expect((await db.cards.get(legacy.id))?.reps).toBe(1);
    expect(await db.review_logs.toArray()).toEqual(logs);
    expect(await db.outbox.where("[table_name+row_id]").equals(["cards", legacy.id]).count()).toBe(1);
  }, 60_000);

  it("retires every declared old card even if moved, without touching unrelated IDs or existing tombstones", async () => {
    const unrelatedDeck = { ...oldDeck, id: "20000000-0000-4000-8000-000000000001", name: "Personal" };
    await db.decks.bulkAdd([oldDeck, unrelatedDeck]);
    await db.cards.bulkAdd(retirement.cardIds.map((id) => ({ ...card(id), deck_id: unrelatedDeck.id })));
    // Matching puzzle text is never used to delete a user's own card.
    await db.cards.add({ ...personal, front: legacy.front, deck_id: unrelatedDeck.id });
    await db.cards.update(retirement.cardIds[0], { deleted_at: timestamp });
    expect(await retireLegacyCurriculum()).toBe(true);
    expect(await db.cards.filter((c) => !c.deleted_at).primaryKeys()).toEqual([personal.id]);
    expect((await db.cards.get(retirement.cardIds[0]))?.deleted_at).toBe(timestamp);
    expect((await db.decks.get(oldDeck.id))?.deleted_at).not.toBeNull();
    expect((await db.decks.get(unrelatedDeck.id))?.deleted_at).toBeNull();
    const before = await db.outbox.toArray();
    expect(await retireLegacyCurriculum()).toBe(false);
    expect(await db.outbox.toArray()).toEqual(before);
  }, 60_000);

  it("applies retirement when restoring a pre-CRUD backup", async () => {
    const backup = { version: 1, exported_at: timestamp, decks: [oldDeck],
      cards: [legacy, personal], notes: [], review_logs: [] };
    await importData(backup);
    expect((await db.cards.get(legacy.id))?.deleted_at).not.toBeNull();
    expect((await db.cards.get(personal.id))?.deleted_at).toBeNull();
    expect((await db.decks.get(oldDeck.id))?.name).toBe("My saved cards");
    await importData(backup);
    expect((await db.cards.get(legacy.id))?.deleted_at).not.toBeNull();
    expect((await db.cards.get(personal.id))?.front).toBe(personal.front);
  });

  it("updates the old default numbers label while keeping custom deck names", async () => {
    const [first, second] = retirement.renamedDecks;
    await db.decks.bulkAdd([
      { ...oldDeck, id: first.id, name: first.previousName },
      { ...oldDeck, id: second.id, name: "My form values" },
    ]);
    await retireLegacyCurriculum();
    expect((await db.decks.get(first.id))?.name).toBe(first.name);
    expect((await db.decks.get(second.id))?.name).toBe("My form values");
  });

  it("keeps later imported personal cards visible in a deck previously retired as empty", async () => {
    await db.decks.add(oldDeck);
    await db.cards.add(legacy);
    await retireLegacyCurriculum();
    expect((await db.decks.get(oldDeck.id))?.deleted_at).not.toBeNull();
    await importData({ version: 1, exported_at: timestamp, decks: [oldDeck],
      cards: [personal], notes: [], review_logs: [] });
    expect((await db.decks.get(oldDeck.id))?.deleted_at).toBeNull();
    expect((await db.decks.get(oldDeck.id))?.name).toBe("My saved cards");
    expect((await db.cards.get(personal.id))?.deleted_at).toBeNull();
    expect((await db.cards.get(legacy.id))?.deleted_at).not.toBeNull();
  });

  it("does not undo an intentional deck deletion when importing an older personal card", async () => {
    const deletedAt = "2026-08-01T00:00:00.000Z";
    await db.decks.add({ ...oldDeck, deleted_at: deletedAt, updated_at: deletedAt });
    await importData({ version: 1, exported_at: timestamp, decks: [oldDeck],
      cards: [personal], notes: [], review_logs: [] });
    expect((await db.decks.get(oldDeck.id))?.deleted_at).toBe(deletedAt);
  });
});
