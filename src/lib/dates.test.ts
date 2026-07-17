import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  endOfLocalDay,
  formatDue,
  humanIntervalFromMs,
  isSameOrBefore,
  localDateStamp,
  nowISO,
  relativeAge,
  startOfLocalDay,
} from './dates';

afterEach(() => {
  vi.useRealTimers();
});

describe('nowISO', () => {
  it('serializes the provided date to ISO', () => {
    const date = new Date('2026-07-07T08:30:00.000Z');
    expect(nowISO(date)).toBe('2026-07-07T08:30:00.000Z');
  });

  it('defaults to the current time', () => {
    const before = Date.now();
    const parsed = new Date(nowISO()).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before - 1000);
    expect(parsed).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe('startOfLocalDay / endOfLocalDay', () => {
  it('returns local midnight for the start of the day', () => {
    const start = startOfLocalDay(new Date(2026, 6, 7, 14, 22, 33, 444));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
    expect(start.getDate()).toBe(7);
  });

  it('returns the next local midnight for the end of the day', () => {
    const end = endOfLocalDay(new Date(2026, 6, 7, 14, 22, 33, 444));
    expect(end.getHours()).toBe(0);
    expect(end.getDate()).toBe(8);
  });

  it('rolls over the month at end of day', () => {
    const end = endOfLocalDay(new Date(2026, 6, 31, 9, 0, 0));
    expect(end.getMonth()).toBe(7); // August
    expect(end.getDate()).toBe(1);
  });
});

describe('isSameOrBefore', () => {
  it('is true when the iso instant is at or before the reference', () => {
    expect(isSameOrBefore('2026-07-07T00:00:00.000Z', new Date('2026-07-07T00:00:00.000Z'))).toBe(true);
    expect(isSameOrBefore('2026-07-06T00:00:00.000Z', new Date('2026-07-07T00:00:00.000Z'))).toBe(true);
  });

  it('is false when the iso instant is after the reference', () => {
    expect(isSameOrBefore('2026-07-08T00:00:00.000Z', new Date('2026-07-07T00:00:00.000Z'))).toBe(false);
  });
});

describe('relativeAge', () => {
  const now = new Date('2026-07-07T12:00:00.000Z');

  it('returns "now" for very recent or future timestamps', () => {
    expect(relativeAge('2026-07-07T11:59:30.000Z', now)).toBe('now');
    expect(relativeAge('2026-07-07T12:05:00.000Z', now)).toBe('now'); // future clamps to 0
  });

  it('formats minutes, hours, days and months', () => {
    expect(relativeAge('2026-07-07T11:30:00.000Z', now)).toBe('30m');
    expect(relativeAge('2026-07-07T09:00:00.000Z', now)).toBe('3h');
    expect(relativeAge('2026-07-04T12:00:00.000Z', now)).toBe('3d');
    expect(relativeAge('2026-05-01T12:00:00.000Z', now)).toBe('2mo');
  });
});

describe('formatDue', () => {
  it('shows "Due" when the due date is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:00.000Z'));
    expect(formatDue('2026-07-06T12:00:00.000Z')).toBe('Due');
    expect(formatDue('2026-07-07T12:00:00.000Z')).toBe('Due');
  });

  it('shows a non-"Due" label for a future date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:00.000Z'));
    expect(formatDue('2026-08-01T12:00:00.000Z')).not.toBe('Due');
  });
});

describe('humanIntervalFromMs', () => {
  it('clamps sub-minute intervals to at least one minute', () => {
    expect(humanIntervalFromMs(0)).toBe('1m');
    expect(humanIntervalFromMs(30_000)).toBe('1m');
  });

  it('formats minutes, hours, days and months', () => {
    expect(humanIntervalFromMs(5 * 60_000)).toBe('5m');
    expect(humanIntervalFromMs(2 * 60 * 60_000)).toBe('2h');
    expect(humanIntervalFromMs(3 * 24 * 60 * 60_000)).toBe('3d');
    expect(humanIntervalFromMs(60 * 24 * 60 * 60_000)).toBe('2.0mo');
  });

  it('drops the decimal for ten months or more', () => {
    expect(humanIntervalFromMs(300 * 24 * 60 * 60_000)).toBe('10mo');
  });
});

describe('localDateStamp', () => {
  it('zero-pads month and day', () => {
    expect(localDateStamp(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateStamp(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
