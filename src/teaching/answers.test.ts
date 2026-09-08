import { describe, expect, it } from "vitest";
import {
  addExplanation,
  findTeachingLesson,
  getAnswerPages,
  parseAnswerPages,
  teachingLessons,
  teachingMarker,
} from "./answers";
import { curriculum, loadStarterCards } from "../data/curriculum";

describe("beginner explanations", () => {
  it("parses explicitly authored pages without splitting code samples or ordinary imported Markdown", () => {
    expect(parseAnswerPages("## A heading\n\nA normal answer.")).toBeNull();
    const pages = parseAnswerPages(
      `${teachingMarker}\n\n## Plain English\n\nAn explanation.\n\n\`\`\`md\n## This is code\n\`\`\`\n\n## An example\n\nA second explanation.`,
    )!;
    expect(pages.map((p) => p.title)).toEqual(["Plain English", "An example"]);
    expect(pages[0].body).toContain("## This is code");
  });

  it("keeps an edited answer intact when adding further teaching pages", () => {
    const back = "My exact answer.\n\n```js\nconst x = 2;\n```";
    const added = addExplanation(back);
    expect(parseAnswerPages(added)?.[0].body).toBe(back);
    expect(parseAnswerPages(addExplanation(added))).toHaveLength(3);
    expect(added.match(/recall:teaching:v1/g)).toHaveLength(1);
  });

  it("does not suggest retired algorithm teaching", () => {
    expect(findTeachingLesson("Explain Two Sum and binary search", "A puzzle")).toBeUndefined();
    expect(teachingLessons.some((lesson) =>
      ["pairs", "big-o", "binary-search", "recursion"].includes(lesson.key))).toBe(false);
  });

  it("keeps the actual missing code and attribution when adding background teaching", () => {
    const answer =
      "One solution:\n\n```js\nreturn items.filter(test);\n```\n\nA predicate decides what to keep.\n\nAn additional assumption stays in the full answer.";
    const credit =
      "Adapted from [30 seconds of code](https://example.test/source) · [CC BY 4.0](/licenses/30-seconds.txt).";
    const result = getAnswerPages(
      "Complete the Array.filter example",
      `${answer}\n\n---\n${credit}`,
    );
    expect(result.pages[0].body).toContain("return items.filter(test);");
    expect(result.pages.at(-1)?.body).toBe(answer);
    expect(result.credit).toBe(credit);
  });

  it("does not fabricate extra teaching for unrelated personal content or source URL keywords", () => {
    expect(getAnswerPages("My question", "My answer").pages).toEqual([
      { title: "The answer", body: "My answer" },
    ]);
    expect(
      findTeachingLesson(
        "My question",
        "See https://example.test/closures/map/variables",
      ),
    ).toBeUndefined();
    expect(
      findTeachingLesson(
        "How does Array.map transform an array?",
        "Call .map with a callback.",
      )?.key,
    ).toBe("map");
  });

  it("ships distinct, fully authored teaching and practice for 80 ideas in ten beginner decks", async () => {
    expect(teachingLessons).toHaveLength(80);
    expect(new Set(teachingLessons.map((l) => l.key)).size).toBe(80);
    for (const lesson of teachingLessons) {
      for (const field of [
        lesson.plain,
        lesson.analogy,
        lesson.example,
        lesson.mistake,
        lesson.answer,
      ]) {
        expect(field.trim().length, lesson.key).toBeGreaterThan(60);
        expect(field).not.toMatch(/TODO|Write an example|lorem ipsum/i);
      }
      expect(
        new Set([lesson.plain, lesson.analogy, lesson.example, lesson.mistake])
          .size,
      ).toBe(4);
    }
    const beginnerDecks = curriculum.filter((d) => d.track === "Start here");
    expect(beginnerDecks).toHaveLength(10);
    const packs = await loadStarterCards();
    const cards = beginnerDecks.flatMap((d) => packs.get(d.id)!);
    expect(cards).toHaveLength(160);
    for (const card of cards) {
      const pages = parseAnswerPages(card.back)!;
      expect(pages).toHaveLength(5);
      expect(pages[4].body).toContain("<!-- recall:solution -->");
    }
    const groups = new Map<string, number>();
    for (const card of cards)
      groups.set(
        card.id.slice(0, -1),
        (groups.get(card.id.slice(0, -1)) ?? 0) + 1,
      );
    expect(groups.size).toBe(80);
    expect([...groups.values()].every((count) => count === 2)).toBe(true);
  });

  it("keeps supporting lessons within the language and subject of the card", () => {
    expect(
      findTeachingLesson(
        "What styles can a select menu use?",
        "```css\nselect { color: green; }\n```",
      )?.key,
    ).toBe("css");
    expect(
      findTeachingLesson(
        "How do you count values in a JavaScript array?",
        "```js\nconst count = items.filter(test).length;\n```",
      )?.key,
    ).not.toBe("aggregation");
    expect(
      findTeachingLesson("Sort a Python list", "```python\nnumbers.sort()\n```")
        ?.key,
    ).not.toBe("sorting");
    expect(
      findTeachingLesson(
        "Change the message of the last commit",
        "```shell\ngit commit --amend\n```",
      )?.key,
    ).toBe("git-commit");
    expect(
      findTeachingLesson(
        "Why can NOT IN be surprising when a subquery returns NULL?",
        "SQL uses three-valued logic for NULL comparisons.",
      )?.key,
    ).toBe("sql-null");
  });
});
