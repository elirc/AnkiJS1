import { describe, expect, it } from "vitest";
import { curriculum, loadStarterCards } from "./curriculum";
import lessons from "./practical-lessons.json";
import report from "./content-report.json";
import { parseAnswerPages, teachingLessons } from "../teaching/answers";

describe("practical follow-on curriculum", () => {
  it("delivers a concept and application card with five usable teaching views for every lesson", async () => {
    expect(lessons).toHaveLength(100);
    expect(new Set([...teachingLessons, ...lessons].map((l) => l.key)).size)
      .toBe(report.teachingLessons - report.dotnetLessons);
    const decks = curriculum.filter((deck) => deck.track === "Keep going");
    expect(decks).toHaveLength(10);
    const packs = await loadStarterCards();
    const cards = decks.flatMap((deck) => packs.get(deck.id)!.filter((card) => !/^a[1234]000000-/.test(card.id)));
    expect(cards).toHaveLength(report.practicalCards);
    expect(cards).toHaveLength(200);
    for (const deck of decks) expect(packs.get(deck.id)!.filter((card) => !/^a[1234]000000-/.test(card.id))).toHaveLength(20);
    for (const lesson of lessons) {
      // Practice cards are reviewed separately from their related concept card.
      expect(lesson.check).not.toMatch(/\b(?:code|function|example) (?:above|below)\b/i);
      for (const field of [lesson.plain, lesson.example, lesson.analogy, lesson.mistake, lesson.answer]) {
        expect(field.length, lesson.key).toBeGreaterThan(60);
        expect(field).not.toMatch(/TODO|lorem ipsum|Write an example/);
      }
      const concept = cards.find((card) => card.front === lesson.question)!;
      const practice = cards.find((card) => card.front === lesson.check)!;
      expect(concept, lesson.key).toBeDefined();
      expect(practice, lesson.key).toBeDefined();
      expect(concept.id.slice(0, -1)).toBe(practice.id.slice(0, -1));
      for (const card of [concept, practice]) {
        const pages = parseAnswerPages(card.back)!;
        expect(pages, lesson.key).toHaveLength(5);
        expect(pages[1].body).toBe(lesson.example);
        expect(pages[2].body).toBe(lesson.analogy);
        expect(pages[3].body).toBe(lesson.mistake);
        expect(pages[4].body).toContain("<!-- recall:solution -->");
      }
      expect(parseAnswerPages(concept.back)![0].body).toBe(lesson.plain);
      expect(parseAnswerPages(practice.back)![0].body).toContain(lesson.answer);
    }
  });
});
