import { describe, expect, it } from "vitest";
import manifest from "./section-expansion-manifest.json";
import { curriculum, loadStarterCards, starterCardCount } from "./curriculum";

describe("expanded curriculum integrity", () => {
  it("ships the declared curriculum with stable IDs and self-contained offline answers", async () => {
    const packs = await loadStarterCards();
    const cards = [...packs.values()].flat();
    expect(starterCardCount).toBe(manifest.baseCards + manifest.addedCards);
    expect(cards.some(card => card.id.startsWith("a1000000-"))).toBe(false);
    const scenarios = cards.filter(card => card.id.startsWith("a2000000-"));
    expect(scenarios).toHaveLength(manifest.kinds.scenario);
    for (const card of scenarios) {
      expect(card.front).not.toMatch(/\[recall\]|____/);
      expect(card.back).toContain("## Why it works");
      expect(card.back).toContain("## Verify it");
    }
    expect(cards).toHaveLength(starterCardCount);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(
      new Set(cards.map((card) => card.front.replace(/\s+/g, " ").trim())).size,
    ).toBe(cards.length);
    for (const deck of curriculum)
      expect(packs.get(deck.id)).toHaveLength(deck.cardCount);
    for (const card of cards) {
      expect(card.id).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
      );
      expect(card.front.trim().length).toBeGreaterThan(15);
      expect(card.back.trim().length).toBeGreaterThan(25);
      expect((card.front.match(/```/g) ?? []).length % 2).toBe(0);
      expect((card.back.match(/```/g) ?? []).length % 2).toBe(0);
      expect(card.back).not.toMatch(/!\[.*?\]\(/);
      if (card.id.startsWith("c0000000"))
        expect(card.back).toContain("CC BY 4.0");
    }
  });
});
