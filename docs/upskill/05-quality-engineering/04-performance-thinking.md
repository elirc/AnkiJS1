# Performance Thinking

Measure first. Performance work without measurement often moves cost rather than reducing it.

## Domains In This Repo

| Domain | Likely hotspot | Anchors | How to measure |
| --- | --- | --- | --- |
| Render | Study queue live query reads all cards. | `src/features/study/StudyScreen.tsx:33-47` | React profiler, seeded large DB. |
| IndexedDB | Deck counts query per deck. | `src/features/home/HomeScreen.tsx:11-18`, `src/db/repos/deckRepo.ts:70-89` | fake data timing, Dexie debug. |
| Sync network | RPC per row chunks. | `src/db/sync/engine.ts:123-130` | log batch sizes/duration. |
| Bundle | Markdown/Supabase/Dexie included. | `package.json:19-32` | `npm run build` gzip output. |
| Startup | PWA precache size. | `vite.config.ts:8-58` | Lighthouse/build report. |
| Memory | Export builds full JSON blob. | `src/features/settings/SettingsScreen.tsx:22-31` | large dataset manual test. |

## How To Find Issues

- N+1: look for loops with awaited DB calls; `reviewRepo` uses `bulkGet` correctly (`src/db/repos/reviewRepo.ts:7-11`).
- Serial async work: check whether order is required before parallelizing.
- Expensive renders: inspect `useLiveQuery` dependencies (`src/features/study/StudyScreen.tsx:33-47`).
- Missing indexes: compare queries with Dexie schema indexes (`src/db/schema.ts:90-97`).
- Oversized bundle: build and inspect chunk warning.

Drill: seed 10k cards and predict which screen slows first.
