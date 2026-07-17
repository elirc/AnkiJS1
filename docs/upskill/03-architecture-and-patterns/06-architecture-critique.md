# Architecture Critique

## Strong Design Choices

1. **Local-first write path:** capture/study never need network (`src/db/repos/noteRepo.ts:6-21`, `src/db/repos/cardRepo.ts:46-55`).
2. **Repository boundary:** UI generally avoids raw Dexie/Supabase (`src/features/capture/CaptureScreen.tsx:7`, `src/features/study/StudyScreen.tsx:8-14`).
3. **Pure scheduling/queue helpers:** easy to unit test (`src/srs/queue.ts:11-37`, `src/srs/scheduler.test.ts:23-43`).
4. **Conflict split for cards:** content and SRS can merge independently (`src/db/sync/merge.ts:32-65`).
5. **Server RLS:** ownership is enforced in Postgres (`supabase/migrations/0001_init.sql:176-188`).

## Confirmed Risks

| Risk | Evidence | Priority | Suggested migration | Test strategy |
| --- | --- | --- | --- | --- |
| Import validation is shallow. | `src/db/repos/dataRepo.ts:15-25` | High | Add row validators and parse result type. | Invalid backup tests. |
| No auth adoption tests. | `src/db/sync/auth.ts:55-94`; no matching tests found. | Medium | Add fake-indexeddb auth unit tests. | Local rows, foreign rows, enqueue count. |
| Convert note is two transactions. | `src/features/inbox/ConvertNoteDialog.tsx:32-43` | Medium | Move create+mark into repo transaction helper. | Partial-failure test. |
| Pull skips missing-deck cards. | `src/db/sync/engine.ts:186-187` | Medium | Buffer/retry or pull decks again before cards. | MergeRows test with out-of-order card. |
| No CI workflow. | No repo-owned `.github` found. | Low | Add GitHub Actions for typecheck/test/build. | Verify workflow locally first. |

## Hypotheses To Investigate

- Study queue recomputation in UI may become a render/performance hotspot with many cards (`src/features/study/StudyScreen.tsx:33-47`).
- Markdown URL policy may need stricter link/image protocol filtering beyond `skipHtml` (`src/components/MarkdownView.tsx:13-16`).
- Sync RPC per row may be fine for v1 but could be slow at scale (`src/db/sync/engine.ts:123-130`).

## If I Owned This For 3 Months

1. Add deep backup validation and import tests.
2. Add sync/auth integration tests with a mocked Supabase boundary.
3. Extract a `studySession` hook/service to reduce UI orchestration.
4. Add CI and an ESLint no-restricted-imports rule for UI -> DB/Supabase.
5. Add observability around sync attempts, failures, and queue sizes.
6. Add schema migration strategy before v2 data changes.

Senior rubric:
- Basic critique names problems.
- Solid critique cites evidence and impact.
- Strong critique includes migration path, tests, rollback, and confidence.
