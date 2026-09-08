import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDatabaseForTests } from '../schema';
import { enqueueMany, enqueueOutbox, pendingOutboxCount, removeOutboxIfUnchanged } from './outbox';

describe('outbox', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('enqueues a single entry and counts it', async () => {
    await enqueueOutbox('cards', 'c1', 't1');
    expect(await pendingOutboxCount()).toBe(1);
  });

  it('coalesces repeated enqueues of the same row, refreshing queued_at', async () => {
    await enqueueOutbox('cards', 'c1', 't1');
    await enqueueOutbox('cards', 'c1', 't2');
    expect(await pendingOutboxCount()).toBe(1);
    const entry = await db.outbox.where('[table_name+row_id]').equals(['cards', 'c1']).first();
    expect(entry?.queued_at).toBe('t2');
  });

  it('enqueues many rows at once', async () => {
    await enqueueMany('cards', ['a', 'b', 'c'], 't');
    expect(await pendingOutboxCount()).toBe(3);
  });

  it('coalesces batch duplicates and preserves existing queue IDs and other tables', async () => {
    await enqueueOutbox('cards', 'a', 't1');
    await enqueueOutbox('notes', 'a', 't1');
    const original = await db.outbox.where('[table_name+row_id]').equals(['cards', 'a']).first();
    await enqueueMany('cards', ['a', 'a', 'b'], 't2');
    expect(await db.outbox.count()).toBe(3);
    const updated = await db.outbox.where('[table_name+row_id]').equals(['cards', 'a']).first();
    expect(updated).toMatchObject({ id: original!.id, queued_at: 't2' });
    expect((await db.outbox.where('[table_name+row_id]').equals(['notes', 'a']).first())?.queued_at).toBe('t1');
  });

  it('removes an entry only when queued_at is unchanged since capture', async () => {
    await enqueueOutbox('decks', 'd1', 't1');
    const captured = await db.outbox.where('[table_name+row_id]').equals(['decks', 'd1']).first();

    // A newer local write bumps queued_at; the stale snapshot must not be removed.
    await enqueueOutbox('decks', 'd1', 't2');
    await removeOutboxIfUnchanged([captured!]);
    expect(await pendingOutboxCount()).toBe(1);

    // Re-capturing the current entry lets it be removed after a successful push.
    const current = await db.outbox.where('[table_name+row_id]').equals(['decks', 'd1']).first();
    await removeOutboxIfUnchanged([current!]);
    expect(await pendingOutboxCount()).toBe(0);
  });
});
