import { chromium, expect as baseExpect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = read('src/data/comprehensive-manifest.json');
const entries = manifest.chunks.flatMap(name => read('src/data/section-packs/' + name))
  .flatMap(pack => pack.cards.map(card => ({ ...card, deckId: pack.id })));
const reference = entries.find(card => card.kind === 'source-reference' && card.back.includes('```') && card.back.length < 3000);
const guided = entries.find(card => card.kind === 'guided-source' && card.back.length < 6500);
const expect = baseExpect.configure({ timeout: 240_000 });
expect(reference).toBeTruthy(); expect(guided).toBeTruthy();
const baseURL = process.env.RECALL_TEST_URL || 'http://127.0.0.1:5183';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage(); page.setDefaultTimeout(240_000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /A little better/ })).toBeVisible();
  const readyMs = await page.evaluate(() => Math.round(performance.now()));
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated', null, { timeout: 240_000 });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 240_000 });
  await context.setOffline(true);
  const cached = await page.evaluate(async () => {
    const urls = new Set();
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys())
      if (/\/assets\/reviewed-comprehensive-.*\.js$/.test(new URL(request.url).pathname)) urls.add(request.url);
    return urls.size;
  });
  expect(cached).toBe(manifest.chunks.length);
  for (const card of [reference, guided]) {
    const count = await page.evaluate(async ({ id, deckId }) => {
      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('recall'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const rows = await new Promise((resolve, reject) => {
        const request = database.transaction('cards').objectStore('cards').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction('cards', 'readwrite');
      for (const row of rows.filter(row => row.deck_id === deckId)) transaction.objectStore('cards').put({ ...row, suspended: row.id !== id });
      await new Promise((resolve,reject) => { transaction.oncomplete = resolve; transaction.onabort = () => reject(transaction.error); });
      database.close(); return rows.filter(row => !row.deleted_at).length;
    }, card);
    expect(count).toBe(manifest.totalCards);
    await page.goto(`${baseURL}/study/${card.deckId}`);
    await expect(page.locator('.card-question')).toContainText(card.front.split('\n\n')[0].replace(/\*\*/g, ''));
    await page.getByRole('button', { name: 'Show answer', exact: true }).click();
    if (card.kind === 'guided-source') {
      await expect(page.getByLabel('Explanation style').locator('option')).toHaveCount(3);
      await page.getByLabel('Explanation style').selectOption('1');
      await expect(page.getByRole('heading', { name: 'Worked example', exact: true })).toBeVisible();
    }
    for (const [name, viewport] of [['desktop',{width:1440,height:1050}],['mobile',{width:390,height:844}],['narrow',{width:320,height:720}]]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.evaluate(() => document.querySelector('.study-actions').getBoundingClientRect().top >= document.querySelector('.review-card').getBoundingClientRect().bottom)).toBe(true);
      await page.screenshot({ path: `artifacts/comprehensive-${card.kind}-${name}.png`, fullPage: true });
    }
    const license = await page.locator('a[href^="/licenses/library-"]').first().getAttribute('href');
    expect(await page.evaluate(async href => (await fetch(href)).ok, license)).toBe(true);
  }
  await page.goto(`${baseURL}/practice`);
  await expect(page.locator('.mission-card')).toHaveCount(48);
  await page.getByLabel('Search missions').fill('conflicting edits');
  await page.getByLabel('Mission stage').selectOption('Make it reliable');
  await expect(page.locator('.mission-card')).toHaveCount(1);
  await page.getByLabel('Mission stage').selectOption('Build independently');
  await expect(page.locator('.mission-card')).toHaveCount(0);
  await expect(page.getByText('No missions match.', { exact: true })).toBeVisible();
  await page.getByLabel('Search missions').fill('');
  await page.getByLabel('Mission stage').selectOption('all');
  await expect(page.locator('.mission-card')).toHaveCount(48);
  await page.getByLabel('Search missions').fill('  CONFLICTING EDITS  ');
  await page.getByLabel('Mission stage').selectOption('Make it reliable');
  await expect(page.locator('.mission-card')).toHaveCount(1);
  await page.locator('.mission-card').click();
  await page.getByLabel('What I changed').fill('Practice fixture: added a version predicate to the update transaction.');
  await expect(page.getByRole('status')).toContainText('Saved on this device');
  await page.reload();
  await expect(page.getByLabel('What I changed')).toHaveValue('Practice fixture: added a version predicate to the update transaction.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/comprehensive-mission-mobile.png', fullPage: true });
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: /A little better/ })).toBeVisible();
  const warmReadyMs = await page.evaluate(() => Math.round(performance.now()));
  expect(errors).toEqual([]);
  writeFileSync('artifacts/comprehensive-ui-results.json', JSON.stringify({ totalCards: manifest.totalCards, cachedPacks: cached, coldReadyMs: readyMs, warmOfflineReadyMs: warmReadyMs, pageErrors: errors, checkedAt: new Date().toISOString() }, null, 2));
  console.log(`PASS: ${manifest.totalCards} cards installed; ${cached} new packs cached; guided lessons, references, and saved mission evidence work offline; desktop/390px/320px layouts fit. Cold ready: ${readyMs} ms; repeat offline ready: ${warmReadyMs} ms on this host.`);
} finally { await browser.close(); }
