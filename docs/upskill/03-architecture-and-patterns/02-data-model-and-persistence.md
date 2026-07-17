# Data Model And Persistence

## Entities

| Entity | Local table | Server table | Key relationships |
| --- | --- | --- | --- |
| Deck | `src/db/schema.ts:5-14` | `supabase/migrations/0001_init.sql:1-10` | Cards reference `deck_id`. |
| Card | `src/db/schema.ts:17-39` | `supabase/migrations/0001_init.sql:12-34` | Optional `note_id`; SRS state fields. |
| Note | `src/db/schema.ts:42-50` | `supabase/migrations/0001_init.sql:36-46` | `card_ids` records conversion outputs. |
| ReviewLog | `src/db/schema.ts:53-63` | `supabase/migrations/0001_init.sql:48-58` | Append-only-ish review history. |
| Outbox | `src/db/schema.ts:65-70` | none | Local sync bookkeeping. |
| SyncMeta | `src/db/schema.ts:72-75` | none | Cursors, errors, settings. |

## Indexes

Dexie indexes are in `src/db/schema.ts:90-97`. Supabase pull indexes are in `supabase/migrations/0001_init.sql:192-195`.

## Transaction Boundaries

- Note capture: note + outbox (`src/db/repos/noteRepo.ts:18-20`).
- Card review: card + review log + two outbox entries (`src/db/repos/cardRepo.ts:50-54`).
- Deck delete: deck tombstone + card tombstones + outbox (`src/db/repos/deckRepo.ts:49-60`).
- Import: all tables merged and enqueued in one transaction (`src/db/repos/dataRepo.ts:38-57`).

## Consistency Expectations

- Deletes are soft deletes for synced tables.
- Card conflicts are split by content vs SRS timestamps (`src/db/schema.ts:34-35`, `src/db/sync/merge.ts:34-58`).
- Pull cursors use `server_updated_at`, not client `updated_at` (`src/db/sync/engine.ts:143-160`).

## How To Safely Change Schema

1. Update TypeScript types in `src/db/schema.ts`.
2. Add a Dexie version migration; do not edit version 1 destructively.
3. Update Supabase migration or create a new SQL migration.
4. Update merge/import/export logic.
5. Add tests for old data, new data, and sync conflict behavior.

Senior question: what data exists offline that the server has never seen yet?
