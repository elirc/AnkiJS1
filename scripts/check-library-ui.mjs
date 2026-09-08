import { chromium, expect as baseExpect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = read('src/data/library-expansion-manifest.json');
const activeTotal = read('src/data/section-expansion-manifest.json').totalCards;
const entries = manifest.chunks.flatMap(name => read('src/data/section-packs/' + name))
  .flatMap(pack => pack.cards.map(card => ({ ...card, deckId: pack.id })));
const reference = entries.find(card => card.kind === 'reference' && card.source.includes('/global_objects/array/') && card.back.includes('```') && card.back.length < 2400);
const quiz = entries.find(card => card.kind === 'knowledge-check' && card.back.length < 2600 && !card.front.includes('```') && (card.back.match(/^## /gm) || []).length === 2);
const expect = baseExpect.configure({ timeout: 180_000 });
expect(reference).toBeTruthy(); expect(quiz).toBeTruthy();
const baseURL = process.env.RECALL_TEST_URL || 'http://127.0.0.1:5183';
const browser = await chromium.launch({ headless: true });
mkdirSync('artifacts', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  page.setDefaultTimeout(180_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /A little better/ })).toBeVisible();
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated', null, { timeout: 180_000 });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 180_000 });
  await context.setOffline(true);
  const cacheCount = await page.evaluate(async () => {
    const urls = new Set();
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys())
      if (/\/assets\/reviewed-library-.*\.js$/.test(new URL(request.url).pathname)) urls.add(request.url);
    return urls.size;
  });
  expect(cacheCount).toBe(manifest.chunks.length);
  for (const card of [reference, quiz]) {
    // Only this fresh, isolated test profile is changed.
    const count = await page.evaluate(async ({ id, deckId }) => {
      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('recall');
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const rows = await new Promise((resolve, reject) => {
        const request = database.transaction('cards').objectStore('cards').getAll();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction('cards', 'readwrite');
      for (const row of rows.filter(row => row.deck_id === deckId)) transaction.objectStore('cards').put({ ...row, suspended: row.id !== id });
      await new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onabort = () => reject(transaction.error); });
      database.close(); return rows.filter(row => !row.deleted_at).length;
    }, card);
    expect(count).toBe(activeTotal);
    await page.goto(`${baseURL}/study/${card.deckId}`);
    await expect(page.locator('.card-question')).toContainText(card.front.split('\n\n')[0].replace(/\*\*|`/g, ''));
    await page.getByRole('button', { name: 'Show answer', exact: true }).click();
    if (card.kind === 'knowledge-check') await page.getByLabel('Explanation style').selectOption('1');
    await expect(page.getByRole('heading', { name: card.kind === 'reference' ? 'Key idea' : 'Lesson context', exact: true })).toBeVisible();
    const license = await page.locator('a[href^="/licenses/library-"]').first().getAttribute('href');
    expect(await page.evaluate(async href => { const response = await fetch(href); return response.ok && (await response.text()).length > 500; }, license)).toBe(true);
    for (const [name, viewport] of [['desktop', { width: 1440, height: 1050 }], ['mobile', { width: 390, height: 844 }]]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.evaluate(() => document.querySelector('.study-actions').getBoundingClientRect().top >= document.querySelector('.review-card').getBoundingClientRect().bottom)).toBe(true);
      await page.screenshot({ path: `artifacts/library-${card.kind}-${name}.png`, fullPage: true });
    }
  }
  expect(errors).toEqual([]);
  console.log('PASS: full library installed; new reference and quiz cards study offline; source packs and licenses cached; desktop/mobile layouts do not overflow or overlap.');
} finally { await browser.close(); }
