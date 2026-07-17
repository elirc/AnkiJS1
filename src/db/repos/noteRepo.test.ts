import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDatabaseForTests } from '../schema';
import {
  archiveNote,
  captureNote,
  deleteNote,
  listInbox,
  markConverted,
  updateNoteBody,
} from './noteRepo';

describe('noteRepo', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('captures a trimmed note into the inbox', async () => {
    const note = await captureNote('  Learn FSRS  ');
    expect(note.body).toBe('Learn FSRS');
    expect(note.status).toBe('inbox');
    expect(note.card_ids).toEqual([]);
    expect(await listInbox()).toHaveLength(1);
    expect(await db.outbox.count()).toBe(1);
  });

  it('orders the inbox oldest first', async () => {
    const first = await captureNote('first');
    await db.notes.update(first.id, { created_at: '2026-07-01T00:00:00.000Z' });
    const second = await captureNote('second');
    await db.notes.update(second.id, { created_at: '2026-07-02T00:00:00.000Z' });
    expect((await listInbox()).map((note) => note.body)).toEqual(['first', 'second']);
  });

  it('updates the note body with trimming', async () => {
    const note = await captureNote('draft');
    await updateNoteBody(note.id, '  revised  ');
    expect((await db.notes.get(note.id))?.body).toBe('revised');
  });

  it('archives a note out of the inbox', async () => {
    const note = await captureNote('archive me');
    await archiveNote(note.id);
    expect(await listInbox()).toHaveLength(0);
    expect((await db.notes.get(note.id))?.status).toBe('archived');
  });

  it('soft-deletes a note out of the inbox', async () => {
    const note = await captureNote('delete me');
    await deleteNote(note.id);
    expect(await listInbox()).toHaveLength(0);
    expect((await db.notes.get(note.id))?.deleted_at).not.toBeNull();
  });

  it('marks a note converted and de-duplicates merged card ids', async () => {
    const note = await captureNote('convert me');
    await markConverted(note.id, ['a', 'b']);
    await markConverted(note.id, ['b', 'c']);
    const stored = await db.notes.get(note.id);
    expect(stored?.status).toBe('converted');
    expect(stored?.card_ids).toEqual(['a', 'b', 'c']);
    expect(await listInbox()).toHaveLength(0);
  });

  it('ignores markConverted for a missing note', async () => {
    await expect(markConverted('missing', ['a'])).resolves.toBeUndefined();
  });
});
