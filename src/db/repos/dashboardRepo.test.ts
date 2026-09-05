import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabaseForTests } from "../schema";
import { createDeck } from "./deckRepo";
import { createCard, applyReview } from "./cardRepo";
import { getDashboard, calculateProgress } from "./dashboardRepo";
import { rate } from "../../srs/scheduler";
describe("progress", () => {
  beforeEach(resetDatabaseForTests);
  it("counts reviews, daily limits, and a streak from stored outcomes", async () => {
    const now = new Date();
    const deck = await createDeck("Core");
    const card = await createCard({ deck_id: deck.id, front: "Q", back: "A" });
    await db.decks.update(deck.id, { new_per_day: 1 });
    const first = await getDashboard(now);
    expect(first.ready).toBe(1);
    expect(first.streak).toBe(0);
    const result = rate(card, 4, now);
    await applyReview(result.card, result.log);
    const next = await getDashboard(now);
    expect(next.todayCount).toBe(1);
    expect(next.streak).toBe(1);
    expect(next.newAvailable).toBe(0);
    expect(next.learned).toBe(1);
  });
  it("keeps yesterday’s streak until today has ended and excludes suspended cards", async () => {
    const now = new Date(2026, 8, 4, 12);
    const yesterday = new Date(2026, 8, 3, 12);
    const deck = await createDeck("Core");
    const card = await createCard({ deck_id: deck.id, front: "Q", back: "A" });
    const result = rate(card, 3, yesterday);
    const data = calculateProgress(
      [deck],
      [{ ...result.card, suspended: true }],
      [result.log],
      now,
    );
    expect(data.streak).toBe(1);
    expect(data.todayCount).toBe(0);
    expect(data.ready).toBe(0);
    expect(data.totalCards).toBe(0);
  });
});
