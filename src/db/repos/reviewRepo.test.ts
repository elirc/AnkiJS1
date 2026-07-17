import { beforeEach, describe, expect, it } from 'vitest';
import { rate } from '../../srs/scheduler';
import { db, resetDatabaseForTests } from '../schema';
import { applyReview, createCard } from './cardRepo';
import { createDeck } from './deckRepo';
import { newCardsStudiedToday } from './reviewRepo';

describe('newCardsStudiedToday', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('counts today\'s reviews that started from the new state', async () => {
    const now = new Date();
    const deck = await createDeck('Deck');
    const card = await createCard({ deck_id: deck.id, front: 'Q', back: 'A' });
    const result = rate(card, 3, now);
    await applyReview(result.card, result.log);
    expect(await newCardsStudiedToday(deck.id, now)).toBe(1);
  });

  it('does not count reviews of cards that were already learning', async () => {
    const now = new Date();
    const deck = await createDeck('Deck');
    const card = await createCard({ deck_id: deck.id, front: 'Q', back: 'A' });
    await db.cards.update(card.id, { state: 'learning' });
    const learning = { ...card, state: 'learning' as const };
    const result = rate(learning, 3, now);
    await applyReview(result.card, result.log);
    expect(await newCardsStudiedToday(deck.id, now)).toBe(0);
  });

  it('scopes the count to the requested deck', async () => {
    const now = new Date();
    const deckA = await createDeck('A');
    const deckB = await createDeck('B');
    const cardA = await createCard({ deck_id: deckA.id, front: 'a', back: 'x' });
    const resultA = rate(cardA, 3, now);
    await applyReview(resultA.card, resultA.log);
    expect(await newCardsStudiedToday(deckA.id, now)).toBe(1);
    expect(await newCardsStudiedToday(deckB.id, now)).toBe(0);
  });

  it('ignores reviews logged on other days', async () => {
    const now = new Date();
    const deck = await createDeck('Deck');
    const card = await createCard({ deck_id: deck.id, front: 'Q', back: 'A' });
    const result = rate(card, 3, now);
    await applyReview(result.card, result.log);
    // Move the log a week into the past.
    await db.review_logs.update(result.log.id, {
      reviewed_at: new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString(),
    });
    expect(await newCardsStudiedToday(deck.id, now)).toBe(0);
  });
});
