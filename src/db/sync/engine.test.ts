import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, resetDatabaseForTests, type ReviewLog } from '../schema';
import { getSyncState, pullPageSize, syncNow } from './engine';
import * as supabaseClient from './supabaseClient';

// A minimal PostgREST stand-in: it stores rows per table and answers the exact
// filter/order/limit chain that pullRemote builds, so the pagination logic runs
// against data instead of against a hand-written page sequence.
type Row = Record<string, unknown> & { id: string; server_updated_at: string };
const tables = new Map<string, Row[]>();
const requests: string[] = [];

function page(table: string, filter: { gt?: string; after?: [string, string] }, limit: number) {
  const rows = [...(tables.get(table) ?? [])].sort((a, b) =>
    a.server_updated_at.localeCompare(b.server_updated_at) || a.id.localeCompare(b.id));
  return rows.filter((row) => filter.after
    ? row.server_updated_at > filter.after[0]
      || (row.server_updated_at === filter.after[0] && row.id > filter.after[1])
    : row.server_updated_at > (filter.gt ?? '')).slice(0, limit);
}

function fakeClient() {
  return {
    from(table: string) {
      const filter: { gt?: string; after?: [string, string] } = {};
      const builder = {
        select: () => builder,
        eq: () => builder,
        gt: (_column: string, value: string) => { filter.gt = value; return builder; },
        or: (expression: string) => {
          const match = expression.match(/^server_updated_at\.gt\.(.+),and\(server_updated_at\.eq\.\1,id\.gt\.(.+)\)$/);
          if (!match) throw new Error(`Unexpected or() filter: ${expression}`);
          filter.after = [match[1], match[2]];
          return builder;
        },
        order: () => builder,
        limit: async (count: number) => {
          requests.push(`${table}:${filter.after ? `after ${filter.after[1]}` : `gt ${filter.gt}`}`);
          return { data: page(table, filter, count), error: null };
        },
        upsert: async () => ({ error: null }),
      };
      return builder;
    },
    rpc: async () => ({ error: null }),
  };
}

// Spy on the module namespace rather than vi.mock: the suite runs with isolate:false,
// so ./supabaseClient is already in the shared registry by the time this file loads
// and a vi.mock factory would never reach the engine's import of it.
beforeEach(() => {
  vi.spyOn(supabaseClient, 'getSupabaseClient').mockImplementation(
    () => fakeClient() as unknown as ReturnType<typeof supabaseClient.getSupabaseClient>,
  );
  vi.spyOn(supabaseClient, 'getSession').mockResolvedValue(
    { user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof supabaseClient.getSession>>,
  );
});

function remoteLog(index: number, stamp: string): Row {
  const log: ReviewLog = {
    id: `log-${String(index).padStart(4, '0')}`, user_id: 'user-1', card_id: 'card-1', rating: 3,
    state_before: 'new', due_before: '2026-01-01T00:00:00.000Z', stability_after: 1,
    difficulty_after: 5, scheduled_days_after: 1, reviewed_at: '2026-01-02T00:00:00.000Z',
  };
  return { ...log, server_updated_at: stamp };
}

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

describe('pullRemote pagination', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
    tables.clear();
    requests.length = 0;
  });

  it('pulls every row when more than one page shares a server_updated_at', async () => {
    // One batched upsert stamps all of its rows with the same server time.
    const stamp = '2026-03-01T10:00:00.000000+00:00';
    const total = pullPageSize + 137;
    tables.set('review_logs', Array.from({ length: total }, (_, index) => remoteLog(index, stamp)));
    await syncNow();
    expect(getSyncState()).toEqual({ phase: 'idle', message: null });
    expect(await db.review_logs.count()).toBe(total);
    expect((await db.sync_meta.get('cursor:review_logs'))?.value).toBe(stamp);
    expect((await db.sync_meta.get('cursor_id:review_logs'))?.value).toBe(`log-${String(total - 1).padStart(4, '0')}`);
    // Three requests: a full page, the remainder addressed by (timestamp, id), then an empty page is not needed.
    expect(requests.filter((request) => request.startsWith('review_logs:'))).toEqual([
      'review_logs:gt 1970-01-01T00:00:00.000Z',
      `review_logs:after log-${String(pullPageSize - 1).padStart(4, '0')}`,
    ]);
  });

  it('resumes after the saved cursor without re-reading or skipping rows', async () => {
    const stamp = '2026-03-01T10:00:00.000000+00:00';
    tables.set('review_logs', [remoteLog(0, stamp), remoteLog(1, stamp), remoteLog(2, '2026-03-02T00:00:00.000000+00:00')]);
    await db.sync_meta.bulkPut([
      { key: 'cursor:review_logs', value: stamp },
      { key: 'cursor_id:review_logs', value: 'log-0000' },
    ]);
    await syncNow();
    expect((await db.review_logs.toArray()).map((log) => log.id).sort()).toEqual(['log-0001', 'log-0002']);
    expect((await db.sync_meta.get('cursor_id:review_logs'))?.value).toBe('log-0002');
  });

  it('accepts a cursor saved by an older build that had no id component', async () => {
    const stamp = '2026-03-01T10:00:00.000000+00:00';
    tables.set('review_logs', [remoteLog(0, stamp), remoteLog(1, '2026-03-02T00:00:00.000000+00:00')]);
    await db.sync_meta.put({ key: 'cursor:review_logs', value: stamp });
    await syncNow();
    expect((await db.review_logs.toArray()).map((log) => log.id)).toEqual(['log-0001']);
    expect(requests.filter((request) => request.startsWith('review_logs:'))).toEqual([`review_logs:gt ${stamp}`]);
  });
});
