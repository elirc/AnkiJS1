# System Map

Recall is a single Vite app, not a monorepo. There is one browser runtime, optional Supabase integration, local IndexedDB persistence, and Vitest tests.

```text
Browser/PWA
  src/main.tsx        boot, routes, PWA registration
  src/App.tsx         layout/nav/sync badge
  src/features/*      screens and user workflows
  src/components/*    reusable UI
       |
       v
  src/db/repos/*      application data boundary
       |
       v
  Dexie IndexedDB     source of truth on device
       |
       v
  src/db/sync/*       optional Supabase push/pull
       |
       v
  supabase/migrations/0001_init.sql
```

## Ownership Map

| Area | Owns | Anchors |
| --- | --- | --- |
| UI routes | URL to screen mapping | `src/main.tsx:28-43` |
| Shell/nav | Header, tabs, layout | `src/App.tsx:7-69` |
| Capture/inbox | Note capture and triage UI | `src/features/capture/CaptureScreen.tsx:9-62`, `src/features/inbox/InboxScreen.tsx:13-88` |
| Study | Queue, reveal, rating, undo UI | `src/features/study/StudyScreen.tsx:23-166` |
| Data repos | Timestamping, transactions, outbox enqueue | `src/db/repos/cardRepo.ts:7-99`, `src/db/repos/noteRepo.ts:6-67` |
| Local schema | Dexie tables and indexes | `src/db/schema.ts:80-101` |
| SRS domain | FSRS conversion and pure queueing | `src/srs/scheduler.ts:49-124`, `src/srs/queue.ts:11-37` |
| Sync | Debounced push/pull and conflict merge | `src/db/sync/engine.ts:45-193`, `src/db/sync/merge.ts:10-65` |
| Auth | Magic links and local data adoption | `src/db/sync/auth.ts:25-94` |
| SQL | Server tables, RLS, guarded upserts | `supabase/migrations/0001_init.sql:1-195` |
| Tests | Unit and smoke coverage | `src/srs/queue.test.ts:42-96`, `src/db/repos/repos.test.ts:7-39` |

## Public Interfaces vs Internals

Public interfaces for contributors are routes (`src/main.tsx:30-40`), repository functions (`src/db/repos/*.ts`), backup JSON shape (`src/db/repos/dataRepo.ts:6-13`), and Supabase SQL schema (`supabase/migrations/0001_init.sql:1-195`).

Private internals include component state, Dexie table access inside repos/sync, FSRS conversion helpers, and outbox implementation. UI should not import Dexie tables directly; the intended boundary is visible because screens import repositories (`src/features/capture/CaptureScreen.tsx:7`, `src/features/study/StudyScreen.tsx:8-14`).

## Pause And Predict

Before editing a screen, ask:
- Does this change need a repository function, or can it stay as view state?
- Is the data shape local-only, synced, or purely derived?
- If offline, what must still work?

Self-grade:
- Basic: can name UI and DB files.
- Solid: can trace a write through repo and outbox.
- Strong: can explain why sync owns Supabase and UI does not.
