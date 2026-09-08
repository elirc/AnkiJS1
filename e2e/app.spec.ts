import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const curriculum = JSON.parse(
  readFileSync(
    new URL("../src/data/expanded-catalog.json", import.meta.url),
    "utf8",
  ),
) as { id: string; cardCount: number; track: string }[];
const report = JSON.parse(
  readFileSync(
    new URL("../src/data/content-report.json", import.meta.url),
    "utf8",
  ),
);
const starterCardCount: number = report.totalCards;
const runtimeErrors = new WeakMap<Page, string[]>();

// A fresh browser installs the offline curriculum before any screen is ready.
// Keep that one-time setup separate from the shorter interaction assertions.
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little better/ }),
  ).toBeVisible({ timeout: 60_000 });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? [], "Unexpected browser errors").toEqual([]);
});

test("CRUD lessons replace puzzle decks and work offline", async ({ page, context }, testInfo) => {
  await page.goto("/decks");
  await page.getByLabel("Search decks").fill("algorithm");
  await expect(page.locator(".deck-card")).toHaveCount(0);
  await page.getByLabel("Search decks").fill("CRUD");
  await expect(page.locator(".deck-card")).toHaveCount(3);
  await page.goto("/study/a0000000-0000-4000-8000-000000005011?minutes=2");
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await expect(page.getByText("Explanation 1 of 5")).toBeVisible();
  await expect(page.locator(".explanation-body")).toContainText("idempotency");
  await page.getByRole("button", { name: "Next explanation" }).click();
  await expect(page.locator(".explanation-body")).toContainText("request key");
  await page.getByLabel("Explanation style").selectOption("4");
  await expect(page.locator(".practice-solution")).toHaveCount(0);
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.locator(".practice-solution")).toContainText("Reuse the same key");
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(page.getByText("2-minute session · 1 reviewed")).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await expect(page.getByText("Explanation 1 of 5")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-crud-study.png`, fullPage: true });
});

test("CRUD upgrade preserves personal content and saved review progress", async ({ page }) => {
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("recall");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const tx = database.transaction(["cards", "decks", "sync_meta"], "readwrite");
      const cards = tx.objectStore("cards");
      const decks = tx.objectStore("decks");
      const get = cards.get("b0000000-0000-4000-8000-000000002001");
      get.onsuccess = () => {
        const existing = get.result;
        cards.put({ ...existing, front: "My web app wording", reps: 3, state: "review", due: "2099-01-01T00:00:00.000Z" });
        const deckId = "a0000000-0000-4000-8000-000000000001";
        decks.put({ id: deckId, name: "Data structures & algorithms", user_id: null,
          new_per_day: 3, created_at: existing.created_at, updated_at: existing.content_updated_at, deleted_at: null });
        cards.put({ ...existing, id: "b0000000-0000-4000-8000-000000001004", deck_id: deckId, front: "LeetCode Two Sum" });
        cards.put({ ...existing, id: "10000000-0000-4000-8000-000000000001", deck_id: deckId, front: "My personal API checklist" });
      };
      tx.objectStore("sync_meta").delete("starter_curriculum_v6");
      tx.objectStore("sync_meta").put({ key: "starter_curriculum_v5", value: "2026-01-01T00:00:00.000Z" });
      tx.oncomplete = () => { database.close(); resolve(); };
      tx.onabort = () => { database.close(); reject(tx.error); };
    };
  }));
  await page.reload();
  await expect(page.getByRole("heading", { name: /A little better/ })).toBeVisible({ timeout: 60_000 });
  await page.goto("/decks/a0000000-0000-4000-8000-000000000001");
  await expect(page.getByRole("heading", { name: "My saved cards", exact: true })).toBeVisible();
  await expect(page.locator(".card-list-row")).toHaveCount(1);
  await expect(page.locator(".card-list-question")).toContainText("My personal API checklist");
  await page.goto("/decks/a0000000-0000-4000-8000-000000000002");
  await expect(page.locator(".card-list-question").filter({ hasText: "My web app wording" })).toBeVisible();
  const stored = await page.evaluate(() => new Promise<{ reps: number; due: string }>((resolve, reject) => {
    const request = indexedDB.open("recall");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const tx = database.transaction("cards", "readonly");
      const get = tx.objectStore("cards").get("b0000000-0000-4000-8000-000000002001");
      get.onsuccess = () => resolve({ reps: get.result.reps, due: get.result.due });
      get.onerror = () => reject(get.error);
      tx.oncomplete = () => database.close();
    };
  }));
  expect(stored).toEqual({ reps: 3, due: "2099-01-01T00:00:00.000Z" });
});

test("beginner explanations, practice checks, and review navigation", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: /New to coding\? Start here/ })
    .click({ timeout: 30_000 });
  await expect(page.locator(".deck-card")).toHaveCount(10);
  const beginner = curriculum.find((deck) => deck.track === "Start here")!;
  await page.goto(`/study/${beginner.id}?minutes=5`);
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await expect(page.getByText("Explanation 1 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Next explanation" }).click();
  await expect(
    page.getByRole("heading", { name: "A worked example", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("5-minute session · 0 reviewed")).toBeVisible();
  await page.getByRole("button", { name: "Next explanation" }).click();
  await expect(
    page.getByRole("heading", { name: "Picture it another way" }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-beginner-analogy.png`,
    fullPage: true,
  });
  await page.getByLabel("Explanation style").selectOption("4");
  await expect(page.locator(".practice-solution")).toHaveCount(0);
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.locator(".practice-solution")).toBeVisible();
  await page.getByRole("button", { name: "Back to first explanation" }).click();
  await expect(page.getByText("Explanation 1 of 5")).toBeVisible();
  await page.getByRole("button", { name: /Easy/ }).click();
  await expect(page.getByText("5-minute session · 1 reviewed")).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await expect(page.getByText("Explanation 1 of 5")).toBeVisible();
  await expect(page.getByText("5-minute session · 0 reviewed")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByLabel("Explanation style").selectOption("2");
  await expect(
    page.getByRole("heading", { name: "Picture it another way" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("practical decks are discoverable, bookmarkable, and teach offline", async ({ page, context }, testInfo) => {
  await page.getByRole("link", { name: /Ready for the next step/ }).click();
  await expect(page.getByRole("button", { name: "Keep going", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".deck-card")).toHaveCount(10);
  await page.reload();
  await expect(page.locator(".deck-card")).toHaveCount(10);
  await page.getByLabel("Search decks").fill("TypeScript");
  await expect(page.locator(".deck-card")).toHaveCount(1);
  await page.locator(".deck-card").click();
  await expect(page.locator(".card-list-row")).toHaveCount(20);
  await page.locator(".card-list-question").first().click();
  await expect(page.locator(".card-list-answer")).toContainText("Type inference");
  const deck = curriculum.find((item) => item.track === "Keep going")!;
  await page.goto(`/study/${deck.id}?minutes=2`);
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await expect(page.getByText("Explanation 1 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Next explanation" }).click();
  await expect(page.locator(".explanation-body")).toContainText("attempts");
  await page.getByLabel("Explanation style").selectOption("4");
  await expect(page.locator(".practice-solution")).toHaveCount(0);
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.locator(".practice-solution")).toContainText("inferred as boolean");
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-practical-lesson.png`, fullPage: true });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByLabel("Explanation style").selectOption("2");
  await expect(page.getByRole("heading", { name: "Picture it another way" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test(".NET learning path, scoped reviews, editing, and offline study", async ({ page, context }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("link", { name: /Your C# & .NET web development path/ }).click();
  await expect(page).toHaveURL(/\/dotnet$/);
  await expect(page.getByRole("heading", { name: /From your first line/ })).toBeVisible();
  await expect(page.locator(".dotnet-stage")).toHaveCount(3);
  await expect(page.locator(".deck-card")).toHaveCount(12);
  await expect(page.locator(".dotnet-facts")).toContainText("192");
  await page.getByRole("link", { name: /01 · C# from your first line/ }).click();
  await expect(page.locator(".card-list-row")).toHaveCount(16);
  await page.getByRole("link", { name: "C# & .NET path", exact: true }).click();
  await expect(page).toHaveURL(/\/dotnet$/);
  if (testInfo.project.name === "mobile") {
    const start = await page.getByRole("button", { name: "Study C# & .NET" }).boundingBox();
    const nav = await page.locator(".mobile-nav").boundingBox();
    expect(start!.y + start!.height).toBeLessThanOrEqual(nav!.y);
  }
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-dotnet-path.png`, fullPage: true });
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-dotnet-overview.png` });
  await page.getByRole("link", { name: "Search .NET decks" }).click();
  await expect(page.getByRole("button", { name: "C# & .NET", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".deck-card")).toHaveCount(12);
  await page.getByLabel("Search decks").fill("DbContext");
  await expect(page.locator(".deck-card")).toHaveCount(1);
  await page.getByRole("link", { name: /Follow the C# & .NET learning path/ }).click();
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 700 });
    const start = await page.getByRole("button", { name: "Study C# & .NET" }).boundingBox();
    const nav = await page.locator(".mobile-nav").boundingBox();
    expect(start!.y + start!.height).toBeLessThanOrEqual(nav!.y);
    await page.screenshot({ path: "artifacts/narrow-dotnet-overview.png" });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "2 min", exact: true }).click();
  await page.getByRole("button", { name: "Study C# & .NET" }).click();
  const sessionUrl = page.url();
  expect(new URL(sessionUrl).searchParams.get("track")).toBe("C# & .NET");
  await expect(page.getByRole("heading", { name: "C# & .NET web study" })).toBeVisible();
  await expect(page.locator(".review-card-header")).toContainText("01");
  const firstQuestion = await page.locator(".card-question").innerText();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await expect(page.getByText("Explanation 1 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Next explanation" }).click();
  await expect(page.getByRole("heading", { name: "A worked example", exact: true })).toBeVisible();
  expect((await page.getByRole("button", { name: "Next explanation" }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.getByLabel("Explanation style").selectOption("4");
  await expect(page.locator(".practice-solution")).toHaveCount(0);
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.locator(".practice-solution")).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-dotnet-lesson.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: /Easy/ }).click();
  await expect(page.getByText("2-minute session · 1 reviewed")).toBeVisible();
  await expect(page.locator(".review-card-header")).toContainText("01");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".card-question")).toHaveText(firstQuestion);
  await page.getByRole("button", { name: "Edit card", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Front", exact: true })).toHaveValue(firstQuestion);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(page.getByRole("heading", { name: "C# & .NET web study" })).toBeVisible();
  await page.getByRole("button", { name: "Suspend card" }).click();
  await expect(page.locator(".card-question")).not.toHaveText(firstQuestion);
  await expect(page.locator(".review-card-header")).toContainText("01");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("button", { name: "Back to .NET path" }).click();
  await expect(page).toHaveURL(/\/dotnet$/);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".deck-card")).toHaveCount(12);
  await page.getByRole("button", { name: "Study C# & .NET" }).click();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByLabel("Explanation style").selectOption("2");
  await expect(page.getByRole("heading", { name: "Picture it another way" })).toBeVisible();
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(page.getByText("5-minute session · 1 reviewed")).toBeVisible();
  expect(errors).toEqual([]);
});

test("expanded library, scheduling settings, and large-deck browsing", async ({
  page,
}) => {
  await page.goto("/decks");
  await expect(
    page.getByText(new RegExp(`${starterCardCount} cards`)),
  ).toBeVisible({ timeout: 30_000 });
  const large = curriculum.find((deck) => deck.cardCount > 60)!;
  await page.goto(`/decks/${large.id}`);
  await expect(page.locator(".card-list-row")).toHaveCount(30);
  await page.getByRole("button", { name: /Show 30 more/ }).click();
  await expect(page.locator(".card-list-row")).toHaveCount(60);
  await page.locator(".card-list-question").first().click();
  await expect(page.locator(".card-list-answer")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/settings");
  await page.getByLabel("New cards per day", { exact: true }).selectOption("5");
  await expect(page.getByRole("status")).toContainText(
    "Daily new-card limit saved",
  );
  await page.getByLabel("Target retention").selectOption("0.95");
  await expect(page.getByRole("status")).toContainText(
    "Retention target saved",
  );
  await page.reload();
  await expect(
    page.getByLabel("New cards per day", { exact: true }),
  ).toHaveValue("5");
  await expect(page.getByLabel("Target retention")).toHaveValue("0.95");
  await page.goto("/");
  await expect(page.locator(".hero-footnote")).toContainText(
    "0 due · 5 new today",
  );
  await page.goto("/settings");
  await page.getByLabel("New cards per day", { exact: true }).selectOption("0");
  await expect(page.getByRole("status")).toContainText(
    "Daily new-card limit saved",
  );
  await page.goto("/study");
  await expect(
    page.getByText(/daily new-card allowance is complete/),
  ).toBeVisible();
});

test("preloaded library, review, undo, and saved progress", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little better/ }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("link", { name: /JavaScript & TypeScript/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "2 min", exact: true }).click();
  await page.getByRole("button", { name: "Study now" }).click();
  await expect(page.getByText("2-minute session · 0 reviewed")).toBeVisible();
  const question = await page.locator(".card-question").innerText();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await expect(page.locator(".card-answer")).toBeVisible();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-review.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Easy/ }).click();
  await expect(page.getByText("2-minute session · 1 reviewed")).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".card-question")).toHaveText(question);
  await expect(page.getByText("2-minute session · 0 reviewed")).toBeVisible();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByRole("button", { name: /Easy/ }).click();
  await expect(page.getByText("2-minute session · 1 reviewed")).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Session complete" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(
    page.getByRole("img", { name: "1 of 20 reviews today" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "1 of 20 reviews today" }),
  ).toBeVisible();
  await page.goto("/decks");
  await expect(page.locator(".deck-card")).toHaveCount(report.decks);
  await page.getByRole("button", { name: "Backend", exact: true }).click();
  await expect(page.locator(".deck-card")).toHaveCount(
    3 + curriculum.filter((deck) => deck.track === "Backend").length,
  );
  await page.getByRole("textbox", { name: "Search decks" }).fill("database");
  await expect(page.locator(".deck-card")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("create, edit, search, and remove a personal card", async ({ page }) => {
  await page.goto("/decks");
  await page.getByRole("button", { name: "New deck", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Deck name" })
    .fill("My interview notes");
  await page.getByRole("button", { name: "Create deck", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My interview notes" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Front", exact: true })
    .fill("What is an invariant?");
  await page
    .getByRole("textbox", { name: "Back", exact: true })
    .fill("A property that stays true.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Edit card", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Back", exact: true })
    .fill("A property preserved across valid operations.");
  await page.getByRole("button", { name: "Add another explanation" }).click();
  const answerField = page.getByRole("textbox", { name: "Back", exact: true });
  await answerField.fill(
    (await answerField.inputValue()).replace(
      "Write an example or explain the idea in your own words.",
      "For example, a running total always equals the sum of the items counted so far.",
    ),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: /What is an invariant/ }).click();
  await expect(
    page.getByText("A property preserved across valid operations."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next explanation" }).click();
  await expect(
    page.getByText(
      "For example, a running total always equals the sum of the items counted so far.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete card", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete card", exact: true })
    .click();
  await expect(
    page.getByText("Your first card is a good place to start."),
  ).toBeVisible();
});

test("offline reload keeps the app and reviews working", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little better/ }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /A little better/ }),
  ).toBeVisible();
  // Confirm the network is unavailable; navigator.onLine may stay true under
  // protocol-level network emulation in some Chromium versions.
  expect(
    await page.evaluate(() =>
      fetch("/offline-network-probe", { cache: "no-store" }).then(
        () => false,
        () => true,
      ),
    ),
  ).toBe(true);
  // Attribution and the full content pack are available without a network, too.
  expect(
    await page.evaluate(async () => (await fetch("/content-credits.html")).ok),
  ).toBe(true);
  await page.getByRole("button", { name: "Study now" }).click();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(page.getByText("5-minute session · 1 reviewed")).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("button", { name: "Back to home" }).click();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "1 of 20 reviews today" }),
  ).toBeVisible();
});

test("backup download and text import are usable", async ({ page }) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: /Your study space/ }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  expect((await download).suggestedFilename()).toMatch(/recall-backup.*\.json/);
  await page.getByLabel("Import text cards", { exact: true }).setInputFiles({
    name: "Anki notes.tsv",
    mimeType: "text/tab-separated-values",
    buffer: Buffer.from(
      "A custom question\tA custom answer\nSecond question\tSecond answer",
    ),
  });
  await expect(page.getByRole("status")).toHaveText(/Imported 2 cards/);
  await page.goto("/decks");
  await page.getByRole("link", { name: /Anki notes/ }).click();
  await expect(
    page.getByText("A custom question", { exact: true }),
  ).toBeVisible();
});

test("the timer allows finishing the current card before ending", async ({
  page,
}) => {
  await page.goto("/study?minutes=2");
  await expect(page.getByRole("button", { name: "Show answer" })).toBeVisible();
  const question = await page.locator(".card-question").innerText();
  await page.clock.install();
  await page.clock.fastForward("02:01");
  await expect(page.getByText(/Time well spent/)).toBeVisible();
  await expect(page.locator(".card-question")).toHaveText(question);
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(
    page.getByRole("heading", { name: "Session complete" }),
  ).toBeVisible();
});

test("a narrow phone has no horizontal overflow and accessible study controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little better/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Study now" }).click();
  await page.getByRole("button", { name: "Show answer" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const label of ["Again", "Hard", "Good", "Easy"]) {
    const bounds = await page
      .getByRole("button", { name: new RegExp(label) })
      .boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
  }
  const next = page.getByRole("button", { name: "Next explanation" });
  await next.click();
  expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
