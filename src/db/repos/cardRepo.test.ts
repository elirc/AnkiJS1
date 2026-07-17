import { beforeEach, describe, expect, it } from 'vitest';
import { rate } from '../../srs/scheduler';
import { db, resetDatabaseForTests } from '../schema';
import { createDeck } from './deckRepo';
import {
  applyReview,
  createCard,
  deleteCard,
  getCard,
  listCards,
  searchCards,
  undoReview,
  updateContent,
} from './cardRepo';

describe('cardRepo', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('creates a new card with trimmed content in the new state', async () => {
    const deck = await createDeck('Deck');
    const card = await createCard({ deck_id: deck.id, front: '  Front  ', back: '  Back  ' });
    expect(card.front).toBe('Front');
    expect(card.back).toBe('Back');
    expect(card.state).toBe('new');
    expect(card.suspended).toBe(false);
    expect(await db.outbox.where('[table_name+row_id]').equals(['cards', card.id]).count()).toBe(1);
  });

  it('undoes a review, restoring the card and removing the log', async () => {
    const deck = await createDeck('Deck');
    const card = await createCard({ deck_id: deck.id, front: 'Q', back: 'A' });
    const result = rate(card, 3, new Date());
    await applyReview(result.card, result.log);
    expect(await db.review_logs.count()).toBe(1);

    await undoReview(card, result.log.id);
    expect(await db.review_logs.count()).toBe(0);
    const restored = await getCard(card.id);
    expect(restored?.state).toBe('new');
    expect(restored?.reps).toBe(0);
    // the queued review_log outbox entry is withdrawn on undo
    expect(await db.outbox.where('[table_name+row_id]').equals(['review_logs', result.log.id]).count()).toBe(0);
  });

  it('soft-deletes a card so reads skip it', async () => {
    const deck = await createDeck('Deck');
    const card = await createCard({ deck_id: deck.id, front: 'Q', back: 'A' });
    await deleteCard(card.id);
    expect(await getCard(card.id)).toBeUndefined();
    expect(await listCards()).toHaveLength(0);
    expect((await db.cards.get(card.id))?.deleted_at).not.toBeNull();
  });

  it('lists only cards for a deck, excluding deleted', async () => {
    const deckA = await createDeck('A');
    const deckB = await createDeck('B');
    await createCard({ deck_id: deckA.id, front: 'a1', back: 'x' });
    const gone = await createCard({ deck_id: deckA.id, front: 'a2', back: 'x' });
    await createCard({ deck_id: deckB.id, front: 'b1', back: 'x' });
    await deleteCard(gone.id);
    expect((await listCards(deckA.id)).map((c) => c.front)).toEqual(['a1']);
    expect(await listCards()).toHaveLength(2);
  });

  it('searches front and back case-insensitively', async () => {
    const deck = await createDeck('Deck');
    await createCard({ deck_id: deck.id, front: 'Photosynthesis', back: 'converts light' });
    await createCard({ deck_id: deck.id, front: 'Mitochondria', back: 'the powerhouse' });
    expect(await searchCards('PHOTO', deck.id)).toHaveLength(1);
    expect(await searchCards('powerhouse', deck.id)).toHaveLength(1);
    expect(await searchCards('nucleus', deck.id)).toHaveLength(0);
    expect(await searchCards('   ', deck.id)).toHaveLength(2); // blank query returns all
  });

  it('records content edits and dedupes outbox entries', async () => {
    const deck = await createDeck('Deck');
    const card = await createCard({ deck_id: deck.id, front: 'Q', back: 'A' });
    await db.outbox.clear();
    await updateContent(card.id, { front: 'Q1' });
    await updateContent(card.id, { back: 'A1' });
    expect((await getCard(card.id))?.front).toBe('Q1');
    expect((await getCard(card.id))?.back).toBe('A1');
    expect(await db.outbox.where('[table_name+row_id]').equals(['cards', card.id]).count()).toBe(1);
  });
});
