import { createId } from '../../lib/ids';
import { nowISO } from '../../lib/dates';
import { db, type Note } from '../schema';
import { enqueueOutbox } from '../sync/outbox';

export async function captureNote(body: string): Promise<Note> {
  const timestamp = nowISO();
  const note: Note = {
    id: createId(),
    user_id: null,
    body: body.trim(),
    status: 'inbox',
    card_ids: [],
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };
  await db.transaction('rw', db.notes, db.outbox, async () => {
    await db.notes.add(note);
    await enqueueOutbox('notes', note.id, timestamp);
  });
  return note;
}

export async function updateNoteBody(id: string, body: string): Promise<void> {
  const timestamp = nowISO();
  await db.transaction('rw', db.notes, db.outbox, async () => {
    await db.notes.update(id, { body: body.trim(), updated_at: timestamp });
    await enqueueOutbox('notes', id, timestamp);
  });
}

export async function archiveNote(id: string): Promise<void> {
  const timestamp = nowISO();
  await db.transaction('rw', db.notes, db.outbox, async () => {
    await db.notes.update(id, { status: 'archived', updated_at: timestamp });
    await enqueueOutbox('notes', id, timestamp);
  });
}

export async function deleteNote(id: string): Promise<void> {
  const timestamp = nowISO();
  await db.transaction('rw', db.notes, db.outbox, async () => {
    await db.notes.update(id, { deleted_at: timestamp, updated_at: timestamp });
    await enqueueOutbox('notes', id, timestamp);
  });
}

export async function markConverted(id: string, cardIds: string[]): Promise<void> {
  const timestamp = nowISO();
  await db.transaction('rw', db.notes, db.outbox, async () => {
    const note = await db.notes.get(id);
    if (!note) return;
    const mergedCardIds = Array.from(new Set([...note.card_ids, ...cardIds]));
    await db.notes.update(id, {
      status: 'converted',
      card_ids: mergedCardIds,
      updated_at: timestamp,
    });
    await enqueueOutbox('notes', id, timestamp);
  });
}

export async function listInbox(): Promise<Note[]> {
  return (await db.notes.where('status').equals('inbox').toArray())
    .filter((note) => note.deleted_at === null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
