import { describe, expect, it } from 'vitest';
import { getSyncState } from './engine';

describe('getSyncState', () => {
  it('returns the same snapshot reference until the state changes', () => {
    // useSyncExternalStore treats a new reference as a store update; an
    // unstable snapshot here re-renders SyncBadge forever and unmounts the app.
    expect(getSyncState()).toBe(getSyncState());
  });

  it('exposes the idle state by default', () => {
    expect(getSyncState()).toEqual({ phase: 'idle', message: null });
  });
});
