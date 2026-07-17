import { describe, expect, it } from 'vitest';
import type { Card, Deck, Note, ReviewLog } from '../schema';
import { mergeCard, mergeDeck, mergeNote, mergeReviewLog, stripServerFields } from './merge';

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'deck-1',
    user_id: 'user-1',
    name: 'Local name',
    new_per_day: 10,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-04T10:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    user_id: 'user-1',
    body: 'Local body',
    status: 'inbox',
    card_ids: [],
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-04T10:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function makeLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: 'log-1',
    user_id: 'user-1',
    card_id: 'card-1',
    rating: 3,
    state_before: 'review',
    due_before: '2026-07-04T00:00:00.000Z',
    stability_after: 5,
    difficulty_after: 5,
    scheduled_days_after: 3,
    reviewed_at: '2026-07-04T10:00:00.000Z',
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    user_id: 'user-1',
    deck_id: 'deck-1',
    note_id: null,
    front: 'Local front',
    back: 'Local back',
    suspended: false,
    due: '2026-07-05T00:00:00.000Z',
    stability: 1,
    difficulty: 2,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    state: 'review',
    last_review: '2026-07-04T00:00:00.000Z',
    content_updated_at: '2026-07-04T10:00:00.000Z',
    srs_updated_at: '2026-07-04T10:00:00.000Z',
    created_at: '2026-07-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('mergeCard', () => {
  it('combines remote-newer content with local-newer SRS', () => {
    const local = makeCard({ srs_updated_at: '2026-07-04T12:00:00.000Z', due: '2026-08-01T00:00:00.000Z' });
    const remote = makeCard({
      front: 'Remote front',
      content_updated_at: '2026-07-04T13:00:00.000Z',
      srs_updated_at: '2026-07-04T09:00:00.000Z',
      due: '2026-07-06T00:00:00.000Z',
    });
    const merged = mergeCard(local, remote);
    expect(merged.front).toBe('Remote front');
    expect(merged.due).toBe('2026-08-01T00:00:00.000Z');
  });

  it('combines local-newer content with remote-newer SRS', () => {
    const local = makeCard({ front: 'Fresh local', content_updated_at: '2026-07-04T13:00:00.000Z' });
    const remote = makeCard({
      front: 'Stale remote',
      content_updated_at: '2026-07-04T09:00:00.000Z',
      srs_updated_at: '2026-07-04T14:00:00.000Z',
      reps: 5,
    });
    const merged = mergeCard(local, remote);
    expect(merged.front).toBe('Fresh local');
    expect(merged.reps).toBe(5);
  });

  it('keeps a newer tombstone', () => {
    const local = makeCard();
    const remote = makeCard({
      deleted_at: '2026-07-04T15:00:00.000Z',
      content_updated_at: '2026-07-04T15:00:00.000Z',
      srs_updated_at: '2026-07-04T15:00:00.000Z',
    });
    expect(mergeCard(local, remote).deleted_at).toBe('2026-07-04T15:00:00.000Z');
  });

  it('uses remote values on timestamp ties', () => {
    const local = makeCard({ front: 'Local' });
    const remote = makeCard({ front: 'Remote' });
    expect(mergeCard(local, remote).front).toBe('Remote');
  });

  it('keeps the earliest created_at across replicas', () => {
    const local = makeCard({ created_at: '2026-07-02T00:00:00.000Z' });
    const remote = makeCard({ created_at: '2026-07-01T00:00:00.000Z' });
    expect(mergeCard(local, remote).created_at).toBe('2026-07-01T00:00:00.000Z');
  });

  it('adopts the remote row when no local row exists', () => {
    const remote = makeCard({ front: 'Remote only' });
    expect(mergeCard(undefined, { ...remote, server_updated_at: '2026-07-04T10:00:00.000Z' }).front).toBe(
      'Remote only',
    );
  });
});

describe('stripServerFields', () => {
  it('removes server_updated_at and preserves the rest', () => {
    const stripped = stripServerFields({ ...makeDeck(), server_updated_at: '2026-07-05T00:00:00.000Z' });
    expect(stripped).not.toHaveProperty('server_updated_at');
    expect(stripped.name).toBe('Local name');
  });
});

describe('mergeDeck', () => {
  it('adopts the remote deck when there is no local row', () => {
    const remote = makeDeck({ name: 'Remote deck' });
    expect(mergeDeck(undefined, remote).name).toBe('Remote deck');
  });

  it('prefers the newer updated_at', () => {
    const local = makeDeck({ name: 'Local', updated_at: '2026-07-04T10:00:00.000Z' });
    const remote = makeDeck({ name: 'Remote', updated_at: '2026-07-04T12:00:00.000Z' });
    expect(mergeDeck(local, remote).name).toBe('Remote');
  });

  it('keeps the local deck when it is newer', () => {
    const local = makeDeck({ name: 'Local', updated_at: '2026-07-04T14:00:00.000Z' });
    const remote = makeDeck({ name: 'Remote', updated_at: '2026-07-04T12:00:00.000Z' });
    expect(mergeDeck(local, remote).name).toBe('Local');
  });

  it('uses the remote deck on a timestamp tie', () => {
    const local = makeDeck({ name: 'Local' });
    const remote = makeDeck({ name: 'Remote' });
    expect(mergeDeck(local, remote).name).toBe('Remote');
  });
});

describe('mergeNote', () => {
  it('adopts the remote note when there is no local row', () => {
    const remote = makeNote({ body: 'Remote body' });
    expect(mergeNote(undefined, remote).body).toBe('Remote body');
  });

  it('prefers the newer updated_at', () => {
    const local = makeNote({ body: 'Local', updated_at: '2026-07-04T10:00:00.000Z' });
    const remote = makeNote({ body: 'Remote', updated_at: '2026-07-04T12:00:00.000Z' });
    expect(mergeNote(local, remote).body).toBe('Remote');
  });

  it('keeps the local note when it is newer', () => {
    const local = makeNote({ body: 'Local', updated_at: '2026-07-04T14:00:00.000Z' });
    const remote = makeNote({ body: 'Remote', updated_at: '2026-07-04T12:00:00.000Z' });
    expect(mergeNote(local, remote).body).toBe('Local');
  });
});

describe('mergeReviewLog', () => {
  it('treats existing local review logs as immutable', () => {
    const local = makeLog({ rating: 1 });
    const remote = makeLog({ rating: 4 });
    expect(mergeReviewLog(local, remote).rating).toBe(1);
  });

  it('adopts the remote log when there is no local row', () => {
    const remote = makeLog({ rating: 4 });
    expect(mergeReviewLog(undefined, { ...remote, server_updated_at: '2026-07-05T00:00:00.000Z' }).rating).toBe(4);
  });
});
