import { describe, expect, it } from 'vitest';
import type { Card, Deck } from '../db/schema';
import { buildQueue } from './queue';

const now = new Date('2026-07-04T12:00:00.000Z');

const deck: Deck = {
  id: 'deck-1',
  user_id: null,
  name: 'Deck',
  new_per_day: 2,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
  deleted_at: null,
};

function card(input: Partial<Card> & Pick<Card, 'id' | 'state'>): Card {
  return {
    id: input.id,
    user_id: null,
    deck_id: input.deck_id ?? deck.id,
    note_id: null,
    front: input.front ?? input.id,
    back: input.back ?? 'Back',
    suspended: input.suspended ?? false,
    due: input.due ?? now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: input.state,
    last_review: null,
    content_updated_at: input.content_updated_at ?? '2026-07-01T00:00:00.000Z',
    srs_updated_at: input.srs_updated_at ?? '2026-07-01T00:00:00.000Z',
    created_at: input.created_at ?? '2026-07-01T00:00:00.000Z',
    deleted_at: input.deleted_at ?? null,
  };
}

describe('buildQueue', () => {
  it('orders due learning, due review, then new cards', () => {
    const queue = buildQueue(
      [
        card({ id: 'new-a', state: 'new', created_at: '2026-07-01T00:00:00.000Z' }),
        card({ id: 'review', state: 'review', due: '2026-07-04T11:00:00.000Z' }),
        card({ id: 'learning', state: 'learning', due: '2026-07-04T10:00:00.000Z' }),
      ],
      deck,
      0,
      now,
    );
    expect(queue.map((item) => item.id)).toEqual(['learning', 'review', 'new-a']);
  });

  it('respects the new card daily limit', () => {
    const queue = buildQueue(
      [
        card({ id: 'new-a', state: 'new', created_at: '2026-07-01T00:00:00.000Z' }),
        card({ id: 'new-b', state: 'new', created_at: '2026-07-02T00:00:00.000Z' }),
        card({ id: 'new-c', state: 'new', created_at: '2026-07-03T00:00:00.000Z' }),
      ],
      deck,
      1,
      now,
    );
    expect(queue.map((item) => item.id)).toEqual(['new-a']);
  });

  it('excludes suspended and deleted cards', () => {
    const queue = buildQueue(
      [
        card({ id: 'ok', state: 'review' }),
        card({ id: 'suspended', state: 'review', suspended: true }),
        card({ id: 'deleted', state: 'review', deleted_at: '2026-07-04T00:00:00.000Z' }),
      ],
      deck,
      0,
      now,
    );
    expect(queue.map((item) => item.id)).toEqual(['ok']);
  });

  it('places due relearning cards before reviews', () => {
    const queue = buildQueue(
      [
        card({ id: 'review', state: 'review' }),
        card({ id: 'relearning', state: 'relearning', due: '2026-07-04T10:00:00.000Z' }),
      ],
      deck,
      0,
      now,
    );
    expect(queue.map((item) => item.id)).toEqual(['relearning', 'review']);
  });

  it('introduces no new cards once the daily limit is spent', () => {
    const queue = buildQueue(
      [card({ id: 'new-a', state: 'new' }), card({ id: 'new-b', state: 'new' })],
      deck,
      deck.new_per_day,
      now,
    );
    expect(queue).toHaveLength(0);
  });

  it('ignores cards belonging to a different deck', () => {
    const queue = buildQueue(
      [
        card({ id: 'mine', state: 'review' }),
        card({ id: 'theirs', state: 'review', deck_id: 'deck-2' }),
      ],
      deck,
      0,
      now,
    );
    expect(queue.map((item) => item.id)).toEqual(['mine']);
  });

  it('excludes reviews and learning cards that are not yet due', () => {
    const future = '2026-07-05T12:00:00.000Z';
    const queue = buildQueue(
      [
        card({ id: 'future-review', state: 'review', due: future }),
        card({ id: 'future-learning', state: 'learning', due: future }),
      ],
      deck,
      0,
      now,
    );
    expect(queue).toHaveLength(0);
  });

  it('orders new cards by creation time', () => {
    const queue = buildQueue(
      [
        card({ id: 'newer', state: 'new', created_at: '2026-07-03T00:00:00.000Z' }),
        card({ id: 'older', state: 'new', created_at: '2026-07-01T00:00:00.000Z' }),
      ],
      deck,
      0,
      now,
    );
    expect(queue.map((item) => item.id)).toEqual(['older', 'newer']);
  });
});
