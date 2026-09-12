import { describe, expect, it } from "vitest";
import { curriculum, loadStarterCards } from "./curriculum";
import retirement from "./retired-curriculum.json";
import beginner from "./teaching-lessons.json";
import practical from "./practical-lessons.json";
import { sectionAdditionCount } from "./section-expansion";
import { parseAnswerPages } from "../teaching/answers";

describe("practical CRUD content", () => {
  it("excludes puzzle material and all retired identities while preserving useful web fundamentals", async () => {
    const packs = await loadStarterCards();
    const cards = [...packs.values()].flat();
    const ids = new Set(cards.map((c) => c.id));
    expect(retirement.cardIds.every((id) => !ids.has(id))).toBe(true);
    expect(new Set(retirement.cardIds).size).toBe(retirement.cardIds.length);
    expect(retirement.decks.every((d) => !packs.has(d.id))).toBe(true);
    expect(curriculum.map((d) => d.name).join(" ")).not.toMatch(/algorithm|leetcode|\bdsa\b/i);
    const puzzle = /leetcode|two[ -]sum|fibonacci|factorial|anagram|palindrome|dynamic programming|breadth.first search|depth.first search|linked list|Dijkstra|knapsack|sudoku|union.find|bubble sort|heap sort|topological sort/i;
    expect(cards.filter((c) => puzzle.test(c.front + "\n" + c.back)).map((c) => c.front)).toEqual([]);
    // Removing one early deck must not renumber every original card's saved review ID.
    expect(packs.get("a0000000-0000-4000-8000-000000000002")![0].id)
      .toBe("b0000000-0000-4000-8000-000000002001");
    for (const topic of [/parameterized/i, /pagination/i, /validation/i, /transaction/i, /React/, /ASP.NET/, /Array\.prototype\.filter/, /sort.*objects/i])
      expect(cards.some((card) => topic.test(card.front)), String(topic)).toBe(true);
  });

  it("teaches CRUD through worked scenarios and five complete explanation views", async () => {
    const lessons = [...beginner, ...practical].filter((l) => l.key.includes("crud-"));
    expect(lessons).toHaveLength(19);
    const cards = [...(await loadStarterCards()).values()].flat();
    for (const lesson of lessons) {
      for (const field of [lesson.plain, lesson.example, lesson.analogy, lesson.mistake, lesson.answer])
        expect(field.length, lesson.key).toBeGreaterThan(60);
      for (const prompt of [lesson.question, lesson.check]) {
        const found = cards.find((c) => c.front === prompt)!;
        expect(found, lesson.key).toBeDefined();
        expect(parseAnswerPages(found.back)).toHaveLength(5);
      }
    }
    for (const [name, authored] of [["Build your first CRUD", 16], ["Fix real CRUD", 20]] as const) {
      const deck = curriculum.find(d => d.name.includes(name))!;
      expect(deck.cardCount).toBe(authored + sectionAdditionCount(deck.id));
    }
  });
});
