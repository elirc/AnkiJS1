# File Reading Order

## Junior Path

| Order | File | Why it matters | Look for |
| --- | --- | --- | --- |
| 1 | `README.md:1-35` | Project purpose and commands. | Local-only mode. |
| 2 | `package.json:6-35` | Stack and scripts. | `test`, `build`, `typecheck`. |
| 3 | `src/main.tsx:18-43` | App boot and routes. | Route names. |
| 4 | `src/App.tsx:7-69` | Navigation and layout. | Mobile vs desktop nav. |
| 5 | `src/features/home/HomeScreen.tsx:9-95` | Dashboard composition. | `useLiveQuery` and repo calls. |
| 6 | `src/features/capture/CaptureScreen.tsx:9-62` | Smallest complete feature. | Save flow and share params. |
| 7 | `src/db/repos/noteRepo.ts:6-67` | Repository pattern. | Timestamp + outbox. |
| 8 | `src/components/Button.tsx:20-49` | Shared UI pattern. | Variants and accessibility. |
| 9 | `src/components/MarkdownView.tsx:5-17` | Markdown rendering boundary. | `skipHtml`. |
| 10 | `src/features/capture/CaptureScreen.test.tsx:8-25` | UI smoke test style. | Arrange, act, assert. |

## Mid-Level Path

| File | Why it matters | Look for |
| --- | --- | --- |
| `src/db/schema.ts:5-101` | Data contracts and indexes. | Synced vs local-only tables. |
| `src/db/repos/cardRepo.ts:7-99` | Atomic review and undo writes. | Transaction boundaries. |
| `src/db/repos/deckRepo.ts:47-60` | Cascade soft delete. | Consistency and outbox. |
| `src/srs/queue.ts:11-37` | Pure business rule. | Ordering and new-card cap. |
| `src/srs/scheduler.ts:49-124` | External library adapter. | Conversion and rating mapping. |
| `src/features/study/StudyScreen.tsx:33-117` | Cross-layer UI flow. | Derived queue, async writes, keyboard. |
| `src/db/sync/merge.ts:32-65` | Conflict resolution. | Field-group LWW. |
| `src/db/sync/engine.ts:104-193` | Sync side effects. | Push order, cursors, merge writes. |
| `src/db/repos/dataRepo.ts:27-62` | Import/export. | Validation and merge semantics. |
| `src/db/repos/repos.test.ts:7-39` | Repository tests. | fake-indexeddb isolation. |

## Senior Path

| File | Why it matters | Senior question |
| --- | --- | --- |
| `supabase/migrations/0001_init.sql:1-195` | Server contract. | Are RLS and LWW guards sufficient? |
| `src/db/sync/auth.ts:55-94` | Account adoption. | How do we prevent user mixing? |
| `src/db/sync/engine.ts:63-87` | Error/backoff state. | How visible are sync failures? |
| `src/db/sync/outbox.ts:4-17` | Outbox invariant. | Is dedupe safe for every table? |
| `vite.config.ts:8-58` | PWA/offline contract. | What is cached, and what must not be cached? |
| `src/features/settings/SettingsScreen.tsx:22-42` | Backup/import UX. | Does validation defend against bad data? |
| `src/db/sync/merge.test.ts:31-72` | Conflict tests. | What conflicts remain untested? |
| `src/test/setup.ts:1-8` | Test environment. | Are browser APIs mocked enough? |

## What Not To Get Distracted By

Tailwind class density and icon choices are not the architecture. Learn them after you can trace data ownership.
