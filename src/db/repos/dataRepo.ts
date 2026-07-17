import { db, type Card, type Deck, type Note, type ReviewLog } from '../schema';
import { mergeCard, mergeDeck, mergeNote, mergeReviewLog } from '../sync/merge';
import { enqueueOutbox } from '../sync/outbox';
import { nowISO } from '../../lib/dates';

export interface RecallBackup {
  version: 1;
  exported_at: string;
  decks: Deck[];
  cards: Card[];
  notes: Note[];
  review_logs: ReviewLog[];
}

function isBackup(value: unknown): value is RecallBackup {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    Array.isArray(record.decks) &&
    Array.isArray(record.cards) &&
    Array.isArray(record.notes) &&
    Array.isArray(record.review_logs)
  );
}

export async function exportData(): Promise<RecallBackup> {
  return {
    version: 1,
    exported_at: nowISO(),
    decks: await db.decks.toArray(),
    cards: await db.cards.toArray(),
    notes: await db.notes.toArray(),
    review_logs: await db.review_logs.toArray(),
  };
}

export async function importData(value: unknown): Promise<void> {
  if (!isBackup(value)) throw new Error('This file is not a Recall backup.');
  await db.transaction('rw', db.decks, db.cards, db.notes, db.review_logs, db.outbox, async () => {
    for (const deck of value.decks) {
      await db.decks.put(mergeDeck(await db.decks.get(deck.id), deck));
      await enqueueOutbox('decks', deck.id);
    }
    for (const note of value.notes) {
      await db.notes.put(mergeNote(await db.notes.get(note.id), note));
      await enqueueOutbox('notes', note.id);
    }
    for (const card of value.cards) {
      await db.cards.put(mergeCard(await db.cards.get(card.id), card));
      await enqueueOutbox('cards', card.id);
    }
    for (const log of value.review_logs) {
      await db.review_logs.put(mergeReviewLog(await db.review_logs.get(log.id), log));
      await enqueueOutbox('review_logs', log.id);
    }
  });
}

export async function eraseLocalData(): Promise<void> {
  await db.delete();
  await db.open();
}
