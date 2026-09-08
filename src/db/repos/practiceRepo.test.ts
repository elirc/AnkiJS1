import { beforeEach, describe, expect, it, vi } from "vitest";
import { engineeringMissions } from "../../data/engineering-missions";
import { db, resetDatabaseForTests } from "../schema";
import { createDeck } from "./deckRepo";
import { createCard } from "./cardRepo";
import { exportData, importData } from "./dataRepo";
import { canCompleteMission, emptyPracticeEntry, listPracticeEntries, savePracticeEntry } from "./practiceRepo";

const mission = engineeringMissions[0];
const evidence = () => ({
  ...emptyPracticeEntry(mission.id),
  outcome: "Traced note capture through the repository into IndexedDB. See commit abc123.",
  verification: "Disabled the network, saved a note, and reloaded. The note remained.",
  tradeoff: "Local persistence works offline; automatic sync remains a separate concern.",
  checked: mission.checks.map((check) => check.id),
});

describe("engineering practice storage and backup", () => {
  beforeEach(resetDatabaseForTests);

  it("requires actual evidence and every mission check before completion", async () => {
    expect(canCompleteMission(emptyPracticeEntry(mission.id))).toBe(false);
    expect(canCompleteMission({ ...evidence(), verification: "  " })).toBe(false);
    expect(canCompleteMission({ ...evidence(), checked: [mission.checks[0].id] })).toBe(false);
    expect(canCompleteMission(evidence())).toBe(true);
    await expect(savePracticeEntry({ ...emptyPracticeEntry(mission.id), completed: true })).rejects.toThrow(/evidence/);
    expect(await listPracticeEntries()).toEqual([]);
  });

  it("saves drafts and completion without creating card reviews or sync work", async () => {
    await savePracticeEntry({ ...emptyPracticeEntry(mission.id), outcome: "Work in progress" });
    expect((await listPracticeEntries())[0].completed).toBe(false);
    await savePracticeEntry({ ...evidence(), completed: true });
    expect((await listPracticeEntries())[0]).toMatchObject({ completed: true, outcome: evidence().outcome });
    expect(await db.review_logs.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });

  it("round-trips the journal with the normal backup and preserves newer local edits", async () => {
    await savePracticeEntry({ ...evidence(), completed: true });
    const backup = await exportData();
    await resetDatabaseForTests();
    await importData(backup);
    expect(await listPracticeEntries()).toEqual(backup.practice);
    const reopened = await savePracticeEntry({ ...evidence(), outcome: "A newer work sample", completed: false });
    await importData(backup);
    expect(await listPracticeEntries()).toEqual([reopened]);
  });

  it("exports the latest queued edit even when backup starts while saves are pending", async () => {
    const first = savePracticeEntry({ ...evidence(), outcome: "First snapshot" });
    const last = savePracticeEntry({ ...evidence(), outcome: "Final snapshot" });
    const backup = await exportData();
    await Promise.all([first, last]);
    expect(backup.practice?.[0].outcome).toBe("Final snapshot");
  });

  it("accepts old backups without practice and does not erase an existing journal", async () => {
    const backup = await exportData();
    delete backup.practice;
    const local = await savePracticeEntry(evidence());
    await importData(backup);
    expect(await listPracticeEntries()).toEqual([local]);
  });

  it("rejects a malformed or duplicate journal before importing any valid decks", async () => {
    await createDeck("A valid deck");
    await savePracticeEntry(evidence());
    const backup = await exportData();
    await resetDatabaseForTests();
    await expect(importData({ ...backup, practice: [...backup.practice!, ...backup.practice!] })).rejects.toThrow(/Invalid practice/);
    await expect(importData({ ...backup, practice: [{ ...backup.practice![0], checked: [null] }] })).rejects.toThrow(/Invalid practice/);
    await expect(importData({ ...backup, practice: [{ ...backup.practice![0], outcome: "x".repeat(12001) }] })).rejects.toThrow(/Invalid practice/);
    expect(await db.decks.count()).toBe(0);
    expect(await listPracticeEntries()).toEqual([]);
  });

  it("rolls back every table when a later part of the backup transaction fails", async () => {
    const deck = await createDeck("Rollback fixture");
    await createCard({ deck_id: deck.id, front: "Question", back: "Answer" });
    await savePracticeEntry(evidence());
    const backup = await exportData();
    backup.preferences = { daily_goal: 10 };
    await resetDatabaseForTests();
    const put = db.sync_meta.put.bind(db.sync_meta);
    vi.spyOn(db.sync_meta, "put").mockImplementation((row) => {
      if (row.key === "daily_goal") throw new Error("Simulated late write failure");
      return put(row);
    });
    await expect(importData(backup)).rejects.toThrow(/late write failure/);
    expect(await listPracticeEntries()).toEqual([]);
    expect(await db.cards.count()).toBe(0);
    expect(await db.decks.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });

  it("keeps stable mission identities and distinct, actionable review criteria", () => {
    expect(new Set(engineeringMissions.map((item) => item.id)).size).toBe(engineeringMissions.length);
    for (const item of engineeringMissions) {
      expect(item.steps.length).toBeGreaterThanOrEqual(3);
      expect(new Set(item.checks.map((check) => check.id)).size).toBe(item.checks.length);
      expect(item.checks.length).toBeGreaterThanOrEqual(3);
    }
  });
});
