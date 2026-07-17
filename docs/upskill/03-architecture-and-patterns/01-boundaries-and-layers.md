# Boundaries And Layers

## Layer Map

| Layer | Owns | Must not own | Anchors |
| --- | --- | --- | --- |
| UI screens | Form state, navigation, display | Timestamps, outbox, SQL | `src/features/*` |
| Components | Reusable presentation | Product decisions | `src/components/Button.tsx:20-49` |
| Repositories | Local writes, transactions, timestamps | Remote API calls | `src/db/repos/*.ts` |
| SRS domain | Scheduling calculations | Dexie/Supabase I/O | `src/srs/scheduler.ts:78-124`, `src/srs/queue.ts:11-37` |
| Sync engine | Remote push/pull, cursors, merge writes | UI concerns | `src/db/sync/engine.ts:45-193` |
| SQL/RLS | Server storage and ownership | Local UX | `supabase/migrations/0001_init.sql:1-195` |

## Good Boundary Examples

- UI calls `captureNote` instead of `db.notes.add` (`src/features/capture/CaptureScreen.tsx:7`, `src/db/repos/noteRepo.ts:6-21`).
- Scheduler wrapper converts between app `Card` and `ts-fsrs` card (`src/srs/scheduler.ts:49-76`).
- Pull merge writes raw Dexie rows and does not call repositories, avoiding re-enqueue (`src/db/sync/engine.ts:171-193`).

## Boundary Leaks Or Risks To Investigate

- Feature tests import `db` directly for assertions (`src/features/capture/CaptureScreen.test.tsx:5`, `src/features/study/StudyScreen.test.tsx:7`). This is acceptable in tests but should not become production pattern.
- `StudyScreen` performs queue orchestration inside UI (`src/features/study/StudyScreen.tsx:33-47`). Fine for v1, but a session hook may be cleaner as complexity grows.
- `ConvertNoteDialog` creates cards and later marks notes converted in separate transactions (`src/features/inbox/ConvertNoteDialog.tsx:32-43`).

## Drill

Pick one UI action and answer: what layer owns validation, persistence, side effects, and user feedback?
