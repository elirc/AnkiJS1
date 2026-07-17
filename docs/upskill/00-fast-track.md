# 00 Fast Track

Use this path when you want a weekend-sized win: run the app, understand the shape, trace capture/study, and make one safe docs-or-test-sized contribution.

## Install, Run, Test

Verified from `package.json:6-12`.

```bash
npm install
npm run dev
npm test
npm run build
npm run typecheck
```

Supabase is optional. The local-only guard is in `src/db/sync/supabaseClient.ts:5-19`, and README setup is in `README.md:5-31`.

## First Two Flows To Trace

1. **Capture note:** route `src/main.tsx:32`, UI save `src/features/capture/CaptureScreen.tsx:27-35`, repository write `src/db/repos/noteRepo.ts:6-21`, outbox enqueue `src/db/sync/outbox.ts:4-17`.
2. **Study review:** route `src/main.tsx:34-35`, queue build `src/features/study/StudyScreen.tsx:33-47`, scheduler call `src/features/study/StudyScreen.tsx:67-86`, atomic write `src/db/repos/cardRepo.ts:46-55`.

## First 10 Files To Open

| Order | File | Look for | Do not get distracted by |
| --- | --- | --- | --- |
| 1 | `package.json:6-35` | Scripts and stack. | Exact dependency patch versions. |
| 2 | `src/main.tsx:18-43` | Boot, PWA registration, routes. | React StrictMode details yet. |
| 3 | `src/App.tsx:7-69` | Navigation shell. | Icon styling. |
| 4 | `src/db/schema.ts:5-101` | Domain model and IndexedDB schema. | Future multi-user details. |
| 5 | `src/db/repos/noteRepo.ts:6-67` | Repository write pattern. | Sync internals. |
| 6 | `src/features/capture/CaptureScreen.tsx:9-62` | UI-to-repo flow. | Tailwind classes. |
| 7 | `src/srs/queue.ts:11-37` | Pure queue rules. | Test data builders. |
| 8 | `src/srs/scheduler.ts:78-124` | FSRS wrapper contract. | FSRS internals in dependency. |
| 9 | `src/features/study/StudyScreen.tsx:23-166` | Session state, rating, undo. | Keyboard shortcut polish. |
| 10 | `src/db/sync/engine.ts:45-193` | Push/pull loop and cursors. | Supabase SQL until after local flows. |

## Safe Change To Attempt

Add a unit test for `deckCounts` or `relativeAge`. Small blast radius, clear expected behavior, and it follows existing Vitest style (`src/db/repos/repos.test.ts:7-39`, `src/srs/queue.test.ts:42-96`).

## One Check To Run

```bash
npm test
```

Strong weekend outcome: you can explain why capture works offline and where sync becomes a side effect later.

## Teach-Back Exercise

In 5 minutes, explain: "A note goes from textarea to IndexedDB to sync outbox." Mention these anchors: `src/features/capture/CaptureScreen.tsx:27-35`, `src/db/repos/noteRepo.ts:6-21`, `src/db/sync/outbox.ts:4-17`.

Self-grade:
- Basic: names files.
- Solid: explains input/output and transaction boundary.
- Strong: identifies offline invariant and how sync is decoupled.

## Not Covered

This fast path does not cover conflict resolution, Supabase RLS, PWA install behavior, import/export merge semantics, or architecture critique.
