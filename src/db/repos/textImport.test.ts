import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabaseForTests } from "../schema";
import { importCardText, parseCardText } from "./textImport";
describe("Anki text import", () => {
  beforeEach(resetDatabaseForTests);
  it("handles directives, escaped quotes, multiline fields, and optional tags", () => {
    const rows = parseCardText(
      '#separator:tab\n#html:false\n"What is \\"quoted\\"?"\t"First\nsecond"\ttag'.replace(
        /\\"/g,
        '""',
      ),
    );
    expect(rows).toEqual([
      { front: 'What is "quoted"?', back: "First\nsecond" },
    ]);
  });
  it("validates all rows before creating any cards or decks", async () => {
    await expect(
      importCardText("Valid\tAnswer\nInvalid", "Imported"),
    ).rejects.toThrow(/Row 2/);
    expect(await db.decks.count()).toBe(0);
    expect(await db.cards.count()).toBe(0);
  });
  it("imports cards into a new usable deck", async () => {
    expect(
      await importCardText("Question\tAnswer\nAnother\tSecond", "My notes"),
    ).toBe(2);
    expect(await db.cards.count()).toBe(2);
    expect((await db.decks.toArray())[0].name).toBe("My notes");
  });
  it("rejects HTML exports and unclosed quotes clearly", () => {
    expect(() => parseCardText("#html:true\nQ\t<b>A</b>")).toThrow(
      /HTML disabled/,
    );
    expect(() => parseCardText('"Q\tA')).toThrow(/closing quote/);
  });
});
