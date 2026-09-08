import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('../src/data/section-expansion-manifest.json', import.meta.url), 'utf8')) as {version: number; totalCards: number; chunks: string[]};

// Avoid continuous trace screenshots during the large IndexedDB migration.
test.use({trace: 'off'});

test('expanded library upgrades safely, restores its own backup, and studies offline', async ({ page, context }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  if (process.env.RECALL_STARTUP_DIAGNOSTICS) {
    page.on('console', message => { if (message.text().startsWith('recall-diag')) console.info(message.text()); });
    await page.addInitScript(() => {
      const transaction = IDBDatabase.prototype.transaction;
      (IDBDatabase.prototype as any).transaction = function (...args: any[]) {
        console.info('recall-diag transaction', String(args[0]), String(args[1]));
        const txn = (transaction as any).apply(this, args);
        txn.addEventListener('complete', () => console.info('recall-diag complete', String(args[0])));
        txn.addEventListener('abort', () => console.info('recall-diag abort', String(txn.error)));
        return txn;
      };
      for (const method of ['add', 'put'] as const) {
        const original = IDBObjectStore.prototype[method]; const counts: Record<string, number> = {};
        (IDBObjectStore.prototype as any)[method] = function (...args: any[]) {
          const count = counts[this.name] = (counts[this.name] ?? 0) + 1;
          const request = (original as any).apply(this, args);
          if (count === 1 || count % 1000 === 0) {
            const label = `${method} ${this.name} ${count}`;
            console.info('recall-diag queued', label);
            request.addEventListener('success', () => console.info('recall-diag written', label));
          }
          return request;
        };
      }
    });
  }
  await page.goto('/');
  await expect(page.getByRole('heading', {name: /A little better/})).toBeVisible({timeout: 180_000});
  console.info('Full library opened; preparing the v6 upgrade fixture.');
  const before = await page.evaluate(async (version) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('recall'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<any[]>((resolve, reject) => {
      const r = database.transaction('cards').objectStore('cards').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const base = rows.filter(c => !/^a[234]000000-/.test(c.id));
    const edited = {...base[0], front: 'My preserved explanation', reps: 9, state: 'review', due: '2030-01-01T00:00:00.000Z'};
    const deleted = {...base[1], deleted_at: new Date().toISOString()};
    const variant = rows.filter(c => c.id.startsWith('a2000000-') && c.deck_id === base[0].deck_id).sort((a,b) => a.created_at.localeCompare(b.created_at))[0];
    const txn = database.transaction(['cards', 'sync_meta'], 'readwrite');
    for (const card of rows.filter(c => c.deck_id === variant.deck_id))
      txn.objectStore('cards').put({...card, suspended: true});
    txn.objectStore('cards').put(edited); txn.objectStore('cards').put(deleted);
    txn.objectStore('cards').delete(IDBKeyRange.bound('a2000000-', 'a2000000-\uffff'));
    txn.objectStore('sync_meta').delete(`starter_curriculum_v${version}`);
    await new Promise<void>((resolve, reject) => { txn.oncomplete = () => resolve(); txn.onabort = () => reject(txn.error); });
    database.close();
    return {count: rows.length, edited: edited.id, deleted: deleted.id, variant: variant.id, variantFront: variant.front, deckId: variant.deck_id};
  }, manifest.version);
  expect(before.count).toBe(manifest.totalCards);
  console.info(`Installed ${before.count} cards; checking v6 upgrade.`);
  await page.reload();
  await expect(page.getByRole('heading', {name: /A little better/})).toBeVisible({timeout: 180_000});
  const after = await page.evaluate(async ({edited, deleted}) => {
    const request = indexedDB.open('recall');
    const database = await new Promise<IDBDatabase>(resolve => {request.onsuccess = () => resolve(request.result);});
    const txn = database.transaction('cards'); const store = txn.objectStore('cards');
    const get = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const [count, editedCard, deletedCard] = await Promise.all([get(store.count()), get(store.get(edited)), get(store.get(deleted))]);
    database.close();
    return {count, edited: editedCard, deleted: deletedCard};
  }, before);
  expect(after.count).toBe(manifest.totalCards);
  expect(after.edited.front).toBe('My preserved explanation');
  expect(after.edited.reps).toBe(9);
  expect(after.edited.due).toBe('2030-01-01T00:00:00.000Z');
  expect(after.deleted.deleted_at).toBeTruthy();
  console.info("Upgrade preserved edits, schedules, and tombstones; checking full backup.");
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
  console.info("Full-library backup restored; checking offline content and study.");
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
  await page.screenshot({path: `artifacts/${test.info().project.name}-reviewed-study.png`, fullPage: true});
  if (test.info().project.name === 'desktop') {
    const desktopViewport = page.viewportSize()!;
    await page.setViewportSize({width: 390, height: 844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: 'artifacts/mobile-reviewed-study.png', fullPage: true});
    await page.setViewportSize(desktopViewport);
  }
  await page.getByRole('button', {name: /Good/}).click();
  await expect(page.locator('.study-meta')).toContainText('1 reviewed');
  await page.getByRole('button', {name: 'Finish', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Session complete'})).toBeVisible();
  expect(errors).toEqual([]);
});
