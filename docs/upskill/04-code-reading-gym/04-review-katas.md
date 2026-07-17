# Review Katas

## Kata 1: "Save Capture Directly To Dexie"
**Author intent:** simplify capture.  
**Fake diff summary:** `CaptureScreen` imports `db` and writes `notes.add`.  
**Files this resembles:** `src/features/capture/CaptureScreen.tsx:7`, `src/db/repos/noteRepo.ts:6-21`  
**Expected findings:** Blocking: bypasses outbox/timestamps. Important: breaks architecture boundary. Optional: naming.  
**Good comment:** > Could we keep this behind `captureNote`? That repo function owns the local-write invariant and outbox enqueue, so direct Dexie here would make offline sync silently drop notes.

## Kata 2: "Add Card Field Without Migration"
Blocking: changes `Card` type but not Dexie/SQL/merge/import tests. Anchors: `src/db/schema.ts:17-39`, `supabase/migrations/0001_init.sql:12-34`.

## Kata 3: "Cache Supabase Requests In Service Worker"
Blocking: stale remote data and hidden sync errors. Anchor: `vite.config.ts:13-19`.

## Kata 4: "Import JSON With `as RecallBackup`"
Blocking: unsafe untrusted input. Anchor: `src/db/repos/dataRepo.ts:15-25`.

## Kata 5: "Push Cards Before Decks"
Blocking: dependency order risk. Anchor: `src/db/sync/engine.ts:104-136`.

## Kata 6: "Use `Date.now()` Everywhere In Tests"
Important: flake risk; existing tests pin dates (`src/srs/scheduler.test.ts:24-41`).

## Kata 7: "Enable Markdown Raw HTML For Tables"
Blocking/security: GFM tables already supported; raw HTML unnecessary. Anchor: `src/components/MarkdownView.tsx:13-16`.

## Kata 8: "Make Undo Persist Forever"
Important/design: changes product contract; current undo is memory-only (`src/features/study/StudyScreen.tsx:29`, `src/features/study/StudyScreen.tsx:87-95`).

## Kata 9: "Delete Deck By Hard Deleting Cards"
Blocking: tombstones must sync. Anchor: `src/db/repos/deckRepo.ts:47-60`.

## Kata 10: "Hide Sync Errors Because They Are Annoying"
Important: failure visibility matters. Anchors: `src/db/sync/engine.ts:80-87`, `src/features/settings/SettingsScreen.tsx:107-113`.

Review rubric:
- Basic: spots obvious bug.
- Solid: cites invariant and file.
- Strong: offers minimal alternative and test.
