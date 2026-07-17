# Testing Strategy

## Current Test Layers

| Layer | Existing evidence | Belongs here |
| --- | --- | --- |
| Pure unit | `src/srs/queue.test.ts:42-96`, `src/srs/scheduler.test.ts:23-43`, `src/db/sync/merge.test.ts:31-72` | Queue ordering, FSRS adapter behavior, conflict merge. |
| Repository integration | `src/db/repos/repos.test.ts:7-39` | Dexie transactions, outbox, cascade delete. |
| UI smoke | `src/features/capture/CaptureScreen.test.tsx:13-24`, `src/features/study/StudyScreen.test.tsx:15-32` | Critical user flows with fake IndexedDB. |
| Type tests | `npm run typecheck` from `package.json:12` | Compile-time contracts. |
| E2E | None found | PWA install/share target/offline browser behavior. |
| Supabase integration | None found | RLS/RPC sync behavior. |

## What To Test

- Pure rules: queue, merge, date formatting, backup validation.
- Repositories: transaction atomicity and outbox dedupe.
- UI: capture, inbox conversion, study reveal/rate/undo, settings import failure.
- Sync: mocked Supabase client for push/pull success/failure.

## What Not To Test

- Tailwind class strings except accessibility-critical states.
- `ts-fsrs` internals; test wrapper behavior only.
- Supabase library behavior; test how this app calls it.

## Fixtures And Flake Prevention

Use fixed timestamps as existing SRS tests do (`src/srs/scheduler.test.ts:24-41`). Reset IndexedDB before repository/UI tests (`src/test/setup.ts:1-8`, `src/db/schema.ts:103-105`). Avoid real timers/network unless a test explicitly owns them.
