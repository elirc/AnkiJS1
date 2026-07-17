import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDatabaseForTests } from '../schema';
import { createDeck, deleteDeck } from './deckRepo';
import { applyReview, createCard, updateContent } from './cardRepo';
import { rate } from '../../srs/scheduler';

describe('repositories', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('writes card, review log, and outbox entries atomically on review', async () => {
    const deck = await createDeck('Core');
    const card = await createCard({ deck_id: deck.id, front: 'A', back: 'B' });
    await db.outbox.clear();
    const result = rate(card, 3, new Date('2026-07-04T12:00:00.000Z'));
    await applyReview(result.card, result.log);
    await expect(db.cards.get(card.id)).resolves.toMatchObject({ reps: result.card.reps });
    await expect(db.review_logs.get(result.log.id)).resolves.toMatchObject({ card_id: card.id });
    expect(await db.outbox.count()).toBe(2);
  });

  it('dedupes outbox entries for repeated card edits', async () => {
    const deck = await createDeck('Core');
    const card = await createCard({ deck_id: deck.id, front: 'A', back: 'B' });
    await db.outbox.clear();
    await updateContent(card.id, { front: 'A1' });
    await updateContent(card.id, { front: 'A2' });
    const entries = await db.outbox.where('[table_name+row_id]').equals(['cards', card.id]).toArray();
    expect(entries).toHaveLength(1);
  });

  it('soft-deletes cards when a deck is deleted', async () => {
    const deck = await createDeck('Core');
    const card = await createCard({ deck_id: deck.id, front: 'A', back: 'B' });
    await deleteDeck(deck.id);
    const deleted = await db.cards.get(card.id);
    expect(deleted?.deleted_at).not.toBeNull();
  });
});
