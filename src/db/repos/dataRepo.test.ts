import { beforeEach, describe, expect, it } from "vitest";
import { rate } from "../../srs/scheduler";
import { db, resetDatabaseForTests } from "../schema";
import { applyReview, createCard } from "./cardRepo";
import { createDeck } from "./deckRepo";
import { captureNote } from "./noteRepo";
import { exportData, importData } from "./dataRepo";

async function seed() {
  const deck = await createDeck("Seeded");
  const card = await createCard({ deck_id: deck.id, front: "Q", back: "A" });
  await captureNote("a note");
  const result = rate(card, 3, new Date());
  await applyReview(result.card, result.log);
  return { deck, card };
}

describe("dataRepo export/import", () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it("exports a versioned backup of every table", async () => {
    await seed();
    const backup = await exportData();
    expect(backup.version).toBe(1);
    expect(backup.decks).toHaveLength(1);
    expect(backup.cards).toHaveLength(1);
    expect(backup.notes).toHaveLength(1);
    expect(backup.review_logs).toHaveLength(1);
    expect(typeof backup.exported_at).toBe("string");
  });

  it("round-trips data through export then import", async () => {
    const { deck, card } = await seed();
    const backup = await exportData();
    await resetDatabaseForTests();
    expect(await db.cards.count()).toBe(0);

    await importData(backup);
    expect(await db.decks.get(deck.id)).toMatchObject({ name: "Seeded" });
    expect(await db.cards.get(card.id)).toMatchObject({
      front: "Q",
      back: "A",
    });
    expect(await db.notes.count()).toBe(1);
    expect(await db.review_logs.count()).toBe(1);
  });

  it("merges rather than clobbers a locally-newer row on import", async () => {
    const { card } = await seed();
    const backup = await exportData();
    // Local edit after the backup was taken.
    await db.cards.update(card.id, {
      front: "Locally edited",
      content_updated_at: new Date(Date.now() + 60_000).toISOString(),
    });
    await importData(backup);
    expect((await db.cards.get(card.id))?.front).toBe("Locally edited");
  });

  it("rejects a file that is not a Recall backup", async () => {
    await expect(importData({ nope: true })).rejects.toThrow(
      /not a Recall backup/i,
    );
    await expect(importData(null)).rejects.toThrow();
  });

  it("rejects malformed records without partially importing valid rows", async () => {
    await seed();
    const backup = await exportData();
    await resetDatabaseForTests();
    backup.cards[0].due = "not a date";
    await expect(importData(backup)).rejects.toThrow(/Invalid card/);
    expect(await db.decks.count()).toBe(0);
    expect(await db.cards.count()).toBe(0);
  });

  it("removes a foreign account ID from imported rows and restores the daily goal", async () => {
    await seed();
    const backup = await exportData();
    await resetDatabaseForTests();
    backup.cards[0].user_id = "another-account";
    backup.decks[0].user_id = "another-account";
    backup.preferences = { daily_goal: 10 };
    await importData(backup);
    expect((await db.cards.toArray())[0].user_id).toBeNull();
    expect((await db.decks.toArray())[0].user_id).toBeNull();
    expect((await db.sync_meta.get("daily_goal"))?.value).toBe("10");
  });
});
