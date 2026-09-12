import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { engineeringMissions } from "../src/data/engineering-missions";

test("engineering practice persists offline, exports evidence, and restores from backup", async ({ page, context }, testInfo) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible({ timeout: 120_000 });
  await page.locator(".pathway-card", { hasText: "Engineering practice" }).click({ timeout: 120_000 });
  await expect(page.getByRole("heading", { name: "Engineering practice", exact: true, level: 1 })).toBeVisible();
  await expect(page.locator(".mission-card")).toHaveCount(engineeringMissions.length);
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await expect(page.locator(".practice-session-plan")).toContainText("10 min");
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-engineering-practice.png`, fullPage: true });
  await page.getByRole("link", { name: "Continue your next mission" }).click();
  await expect(page.getByRole("button", { name: "Complete mission" })).toBeDisabled();
  await page.getByLabel("What I changed").fill("Traced note capture to the repository and its IndexedDB transaction.");
  await page.getByLabel("How I verified it").fill("Saved a note while offline, reloaded, and verified its exact text.");
  await page.getByLabel("Tradeoff and next step").fill("Local persistence supports offline work. Next: verify failure recovery.");
  for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
  await page.getByRole("button", { name: "Complete mission" }).click();
  await expect(page.getByRole("button", { name: "Reopen mission" })).toBeEnabled();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("What I changed")).toHaveValue("Traced note capture to the repository and its IndexedDB transaction.");
  await expect(page.getByLabel("What I changed")).toBeDisabled();
  await page.getByRole("button", { name: "Reopen mission" }).click();
  await page.getByLabel("Tradeoff and next step").fill("Updated offline: add a failed-write test next.");
  await expect(page.getByRole("button", { name: "Complete mission" })).toBeEnabled();
  await page.getByRole("button", { name: "Complete mission" }).click();
  await expect(page.getByRole("button", { name: "Reopen mission" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-engineering-journal.png`, fullPage: true });

  await page.getByRole("link", { name: "Review related decks" }).click();
  await expect(page.getByLabel("Search decks")).toHaveValue("debugging");
  await page.reload();
  await expect(page.getByLabel("Search decks")).toHaveValue("debugging");
  expect(await page.locator(".deck-card").count()).toBeGreaterThan(0);
  await page.goto("/practice");
  await expect(page.locator(".practice-hero")).toContainText(`1 / ${engineeringMissions.length} completed with evidence`);
  const evidenceDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export evidence" }).click();
  const evidence = await evidenceDownload;
  expect(await readFile((await evidence.path())!, "utf8")).toContain("Updated offline: add a failed-write test next.");
  await page.goto("/settings");
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const backupPath = (await (await backupDownload).path())!;
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  expect(backup.practice).toHaveLength(1);
  expect(backup.practice[0].completed).toBe(true);

  // Restore through the actual import UI in a fresh browser context.
  const restored = await context.browser()!.newContext();
  try {
    const restoredPage = await restored.newPage();
    restoredPage.on("pageerror", (error) => errors.push(error.message));
    await restoredPage.goto(new URL("/settings", page.url()).href);
    await restoredPage.getByLabel("Import backup", { exact: true }).setInputFiles(backupPath, { timeout: 120_000 });
    await expect(restoredPage.getByRole("status")).toContainText("Backup imported", { timeout: 90_000 });
    await restoredPage.goto(new URL("/practice/trace-a-request", page.url()).href);
    await expect(restoredPage.getByLabel("Tradeoff and next step")).toHaveValue("Updated offline: add a failed-write test next.");
    await expect(restoredPage.getByRole("button", { name: "Reopen mission" })).toBeVisible();
  } finally {
    await restored.close();
  }
  expect(errors).toEqual([]);
});
