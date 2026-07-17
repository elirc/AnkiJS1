import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDatabaseForTests } from '../schema';
import { createCard } from './cardRepo';
import {
  createDeck,
  deckCounts,
  deleteDeck,
  getDeck,
  listDecks,
  renameDeck,
  setNewPerDay,
} from './deckRepo';

describe('deckRepo', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('creates a deck with trimmed name and default new_per_day', async () => {
    const deck = await createDeck('  Spanish  ');
    expect(deck.name).toBe('Spanish');
    expect(deck.new_per_day).toBe(10);
    expect(deck.deleted_at).toBeNull();
    expect(await db.outbox.count()).toBe(1);
  });

  it('falls back to "Untitled deck" for a blank name', async () => {
    expect((await createDeck('')).name).toBe('Untitled deck');
    expect((await createDeck('   ')).name).toBe('Untitled deck');
  });

  it('renames a deck and falls back for blank names', async () => {
    const deck = await createDeck('Old');
    await renameDeck(deck.id, 'New');
    expect((await getDeck(deck.id))?.name).toBe('New');
    await renameDeck(deck.id, '   ');
    expect((await getDeck(deck.id))?.name).toBe('Untitled deck');
  });

  it('clamps new_per_day to a non-negative integer', async () => {
    const deck = await createDeck('Deck');
    await setNewPerDay(deck.id, -5);
    expect((await getDeck(deck.id))?.new_per_day).toBe(0);
    await setNewPerDay(deck.id, 3.9);
    expect((await getDeck(deck.id))?.new_per_day).toBe(3);
  });

  it('hides deleted decks from getDeck and listDecks', async () => {
    const deck = await createDeck('Doomed');
    await deleteDeck(deck.id);
    expect(await getDeck(deck.id)).toBeUndefined();
    expect(await listDecks()).toHaveLength(0);
  });

  it('lists decks sorted by name', async () => {
    await createDeck('Charlie');
    await createDeck('alpha');
    await createDeck('Bravo');
    expect((await listDecks()).map((deck) => deck.name)).toEqual(['alpha', 'Bravo', 'Charlie']);
  });

  it('reports new availability capped by the daily limit', async () => {
    const deck = await createDeck('Counts');
    await setNewPerDay(deck.id, 2);
    await createCard({ deck_id: deck.id, front: 'a', back: '1' });
    await createCard({ deck_id: deck.id, front: 'b', back: '2' });
    await createCard({ deck_id: deck.id, front: 'c', back: '3' });
    const counts = await deckCounts(deck.id, new Date());
    expect(counts.total).toBe(3);
    expect(counts.new_available).toBe(2); // min(new_per_day=2, newCount=3)
    expect(counts.due).toBe(0);
  });

  it('counts due review cards but not suspended ones', async () => {
    const deck = await createDeck('Due');
    const due = await createCard({ deck_id: deck.id, front: 'due', back: '1' });
    const notYet = await createCard({ deck_id: deck.id, front: 'later', back: '2' });
    const suspended = await createCard({ deck_id: deck.id, front: 'susp', back: '3' });
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    await db.cards.update(due.id, { state: 'review', due: past });
    await db.cards.update(notYet.id, { state: 'review', due: future });
    await db.cards.update(suspended.id, { state: 'review', due: past, suspended: true });
    const counts = await deckCounts(deck.id, new Date());
    expect(counts.due).toBe(1);
  });

  it('returns zeroed counts for an unknown deck', async () => {
    expect(await deckCounts('missing', new Date())).toEqual({ due: 0, new_available: 0, total: 0 });
  });
});
