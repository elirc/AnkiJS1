import { describe, expect, it } from "vitest";
import lessons from "./dotnet-lessons.json";
import practicalLessons from "./practical-lessons.json";
import report from "./content-report.json";
import { loadStarterCards } from "./curriculum";
import { DOTNET_TRACK, dotnetDecks, dotnetStages, dotnetStudyUrl } from "./dotnet-path";
import { parseAnswerPages, teachingLessons } from "../teaching/answers";

describe("C# and .NET web curriculum", () => {
  it("ships an ordered 12-deck path with 96 complete lessons and independent practice", async () => {
    expect(dotnetDecks).toHaveLength(12);
    expect(dotnetStages.flatMap((stage) => stage.decks)).toEqual(dotnetDecks);
    expect(lessons).toHaveLength(96);
    expect(new Set([...teachingLessons, ...practicalLessons, ...lessons].map((lesson) => lesson.key)).size).toBe(report.teachingLessons);
    const packs = await loadStarterCards();
    const cards = dotnetDecks.flatMap((deck) => packs.get(deck.id)!.filter((card) => !/^a[1234]000000-/.test(card.id)));
    expect(cards).toHaveLength(192);
    expect(cards.length).toBe(report.dotnetCards);
    expect(lessons.length).toBe(report.dotnetLessons);
    dotnetDecks.forEach((deck, index) => {
      expect(deck.name).toMatch(new RegExp(`^${String(index + 1).padStart(2, "0")}`));
      expect(packs.get(deck.id)!.filter((card) => !/^a[1234]000000-/.test(card.id))).toHaveLength(16);
      expect(deck.resource.url).toMatch(/^https:\/\/learn.microsoft.com\//);
    });
    for (const lesson of lessons) {
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

  it("encodes the C# character safely in bookmarkable study links", () => {
    for (const minutes of [2, 5, 10] as const) {
      const url = new URL(dotnetStudyUrl(minutes), "http://localhost");
      expect(url.hash).toBe("");
      expect(url.searchParams.get("track")).toBe(DOTNET_TRACK);
      expect(url.searchParams.get("minutes")).toBe(String(minutes));
    }
  });
});
