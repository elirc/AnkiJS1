import { describe, expect, it } from 'vitest';
import type { Card } from '../db/schema';
import { newCardFields, previewIntervals, rate } from './scheduler';

function newLocalCard(now: Date): Card {
  const timestamp = now.toISOString();
  return {
    id: 'card-1',
    user_id: null,
    deck_id: 'deck-1',
    note_id: null,
    front: 'Front',
    back: 'Back',
    suspended: false,
    ...newCardFields(now),
    content_updated_at: timestamp,
    srs_updated_at: timestamp,
    created_at: timestamp,
    deleted_at: null,
  };
}

describe('scheduler', () => {
  it('moves a new card rated Good off new with a future due date', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const result = rate(newLocalCard(now), 3, now);
    expect(result.card.state).not.toBe('new');
    expect(new Date(result.card.due).getTime()).toBeGreaterThan(now.getTime());
  });

  it('keeps Again within minutes for a new card', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const result = rate(newLocalCard(now), 1, now);
    const diffMinutes = (new Date(result.card.due).getTime() - now.getTime()) / 60_000;
    expect(diffMinutes).toBeGreaterThanOrEqual(1);
    expect(diffMinutes).toBeLessThanOrEqual(10);
  });

  it('formats preview intervals below one day as minutes or hours', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const preview = previewIntervals(newLocalCard(now), now);
    expect(preview.again).toMatch(/m|h/);
  });

  it('produces a ratings log that mirrors the updated card', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const card = newLocalCard(now);
    const { card: after, log } = rate(card, 3, now);
    expect(log.card_id).toBe(card.id);
    expect(log.rating).toBe(3);
    expect(log.state_before).toBe('new');
    expect(log.due_before).toBe(card.due);
    expect(log.stability_after).toBe(after.stability);
    expect(log.scheduled_days_after).toBe(after.scheduled_days);
    expect(log.reviewed_at).toBe(now.toISOString());
  });

  it('increments reps and stamps srs_updated_at on review', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const card = newLocalCard(now);
    const { card: after } = rate(card, 3, now);
    expect(after.reps).toBe(card.reps + 1);
    expect(after.srs_updated_at).toBe(now.toISOString());
  });

  it('schedules Easy no sooner than Good for a new card', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const card = newLocalCard(now);
    const good = rate(card, 3, now).card.due;
    const easy = rate(card, 4, now).card.due;
    expect(new Date(easy).getTime()).toBeGreaterThanOrEqual(new Date(good).getTime());
  });

  it('exposes all four preview intervals', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    const preview = previewIntervals(newLocalCard(now), now);
    expect(Object.keys(preview).sort()).toEqual(['again', 'easy', 'good', 'hard']);
  });
});
