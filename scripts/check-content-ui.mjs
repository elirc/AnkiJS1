import { chromium, expect as playwrightExpect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const packs = JSON.parse(readFileSync('src/data/section-packs/reviewed-01.json', 'utf8'));
const scenario = packs[0].cards[0];
const baseURL = process.env.RECALL_TEST_URL || 'http://127.0.0.1:5183';
const expect = playwrightExpect.configure({ timeout: 120_000 });
const browser = await chromium.launch({ headless: true });
mkdirSync('artifacts', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  page.setDefaultTimeout(120_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: /A little better/ })).toBeVisible({ timeout: 120_000 });
  // Only this test's isolated browser context is modified.
  await page.evaluate(async ({ deckId, cardId }) => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('recall');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise((resolve, reject) => {
      const request = database.transaction('cards').objectStore('cards').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('cards', 'readwrite');
    for (const card of rows.filter(card => card.deck_id === deckId))
      transaction.objectStore('cards').put({ ...card, suspended: card.id !== cardId });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, { deckId: packs[0].id, cardId: scenario.id });
  await page.goto(`${baseURL}/study/${packs[0].id}`);
  await expect(page.locator('.card-question')).toHaveText(scenario.front);
  await page.getByRole('button', { name: 'Show answer', exact: true }).click();
  await page.getByLabel('Explanation style').selectOption('1');
  await expect(page.getByRole('heading', { name: 'Why it works', exact: true })).toBeVisible();
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1050 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => {
      const card = document.querySelector('.review-card').getBoundingClientRect();
      const actions = document.querySelector('.study-actions').getBoundingClientRect();
      return actions.top >= card.bottom;
    })).toBe(true);
    await page.screenshot({ path: `artifacts/${name}-reviewed-study.png`, fullPage: true });
  }
  await page.goto(`${baseURL}/practice/measure-first-use`);
  await expect(page.getByRole('heading', { name: 'Measure and improve first-use loading', exact: true })).toBeVisible();
  await page.getByLabel('What I changed').fill('Isolated browser smoke-test draft.');
  await expect(page.getByRole('status')).toContainText('Saved');
  await page.reload();
  await expect(page.getByLabel('What I changed')).toHaveValue('Isolated browser smoke-test draft.');
  expect(errors).toEqual([]);
  console.log('PASS: scenario study, explanation navigation, desktop/mobile overflow checks, and new-mission draft persistence.');
} finally { await browser.close(); }
