import { db, type OutboxEntry, type SyncTableName } from '../schema';
import { nowISO } from '../../lib/dates';

export async function enqueueOutbox(
  table_name: SyncTableName,
  row_id: string,
  queued_at = nowISO(),
): Promise<void> {
  const existing = await db.outbox.where('[table_name+row_id]').equals([table_name, row_id]).first();
  if (existing?.id !== undefined) {
    await db.outbox.update(existing.id, { queued_at });
    return;
  }
  await db.outbox.add({ table_name, row_id, queued_at });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('recall:outbox-enqueued'));
  }
}

export async function enqueueMany(table_name: SyncTableName, rowIds: string[], queued_at = nowISO()) {
  for (const row_id of rowIds) {
    await enqueueOutbox(table_name, row_id, queued_at);
  }
}

export async function removeOutboxIfUnchanged(entries: OutboxEntry[]): Promise<void> {
  for (const entry of entries) {
    if (entry.id === undefined) continue;
    const current = await db.outbox.get(entry.id);
    if (current?.queued_at === entry.queued_at) {
      await db.outbox.delete(entry.id);
    }
  }
}

export async function pendingOutboxCount(): Promise<number> {
  return db.outbox.count();
}
