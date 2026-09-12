import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('../src/data/section-expansion-manifest.json', import.meta.url), 'utf8')) as {version: number; totalCards: number; chunks: string[]};

// Avoid continuous trace screenshots during the IndexedDB migration.
test.use({trace: 'off'});

const homeReady = (page: import('@playwright/test').Page) =>
  expect(page.locator('main h1').first()).toBeVisible({timeout: 180_000});

test('library upgrades safely, restores its own backup, and studies offline', async ({ page, context }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await homeReady(page);
  const before = await page.evaluate(async (version) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('recall'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<any[]>((resolve, reject) => {
      const r = database.transaction('cards').objectStore('cards').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const base = rows.filter(c => !c.id.startsWith('a2000000-'));
    const edited = {...base[0], front: 'My preserved explanation', reps: 9, state: 'review', due: '2030-01-01T00:00:00.000Z'};
    const deleted = {...base[1], deleted_at: new Date().toISOString()};
    const variant = rows.filter(c => c.id.startsWith('a2000000-') && c.deck_id === base[0].deck_id).sort((a,b) => a.created_at.localeCompare(b.created_at))[0];
    // A retired source-derived card left behind by an older version must be hidden on upgrade.
    const stale = {...base[2], id: 'a3000000-0000-4000-8000-000000000001', front: 'Stale reference card', content_updated_at: '2026-01-01T00:00:00.000Z'};
    const txn = database.transaction(['cards', 'sync_meta'], 'readwrite');
    for (const card of rows.filter(c => c.deck_id === variant.deck_id))
      txn.objectStore('cards').put({...card, suspended: true});
    txn.objectStore('cards').put(edited); txn.objectStore('cards').put(deleted); txn.objectStore('cards').put(stale);
    txn.objectStore('cards').delete(IDBKeyRange.bound('a2000000-', 'a2000000-￿'));
    txn.objectStore('sync_meta').delete(`starter_curriculum_v${version}`);
    await new Promise<void>((resolve, reject) => { txn.oncomplete = () => resolve(); txn.onabort = () => reject(txn.error); });
    database.close();
    return {count: rows.length, edited: edited.id, deleted: deleted.id, stale: stale.id, variant: variant.id, variantFront: variant.front, deckId: variant.deck_id};
  }, manifest.version);
  expect(before.count).toBe(manifest.totalCards);
  await page.reload();
  await homeReady(page);
  const after = await page.evaluate(async ({edited, deleted, stale}) => {
    const request = indexedDB.open('recall');
    const database = await new Promise<IDBDatabase>(resolve => {request.onsuccess = () => resolve(request.result);});
    const txn = database.transaction('cards'); const store = txn.objectStore('cards');
    const get = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const [count, editedCard, deletedCard, staleCard] = await Promise.all([get(store.count()), get(store.get(edited)), get(store.get(deleted)), get(store.get(stale))]);
    database.close();
    return {count, edited: editedCard, deleted: deletedCard, stale: staleCard};
  }, before);
  expect(after.count).toBe(manifest.totalCards + 1);
  expect(after.edited.front).toBe('My preserved explanation');
  expect(after.edited.reps).toBe(9);
  expect(after.edited.due).toBe('2030-01-01T00:00:00.000Z');
  expect(after.deleted.deleted_at).toBeTruthy();
  expect(after.stale.deleted_at).toBeTruthy();
  await page.goto('/settings');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export backup'}).click();
  const backup = await downloadEvent;
  const backupPath = await backup.path();
  expect(backupPath).toBeTruthy();
  await page.getByLabel('Import backup', {exact: true}).setInputFiles(backupPath!);
  await expect(page.getByRole('status')).toHaveText(/Backup imported/, {timeout: 180_000});
  await page.evaluate(async () => {await navigator.serviceWorker.ready;});
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  const offlinePacks = await page.evaluate(async () => {
    const urls = new Set<string>();
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys())
      if (/\/assets\/reviewed-.*\.js$/.test(new URL(request.url).pathname)) urls.add(request.url);
    return {count: urls.size, available: (await Promise.all([...urls].map(async url => (await fetch(url)).ok))).every(Boolean)};
  });
  expect(offlinePacks.count).toBe(manifest.chunks.length);
  expect(offlinePacks.available).toBe(true);
  await page.goto(`/study/${before.deckId}`);
  await expect(page.locator('.card-question')).toHaveText(before.variantFront, {timeout: 90_000});
  await page.getByRole('button', {name: 'Show answer', exact: true}).click();
  await page.getByLabel('Explanation style').selectOption('1');
  await expect(page.getByRole('heading', {name: 'Why it works', exact: true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', {name: /Good/}).click();
  await expect(page.locator('.study-meta')).toContainText('1 reviewed');
  await page.getByRole('button', {name: 'Finish', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Session complete'})).toBeVisible();
  expect(errors).toEqual([]);
});
