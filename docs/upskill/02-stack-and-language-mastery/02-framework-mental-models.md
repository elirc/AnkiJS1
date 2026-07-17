# Framework Mental Models

## React: Render Is Not Persistence

React state is a view model. Durable state belongs in Dexie via repositories.

**Repo examples:**
- Capture keeps draft text in component state, but saving delegates to `captureNote` (`src/features/capture/CaptureScreen.tsx:17-35`).
- Study keeps reveal/undo/session counters locally, but ratings persist through `applyReview` (`src/features/study/StudyScreen.tsx:26-30`, `src/features/study/StudyScreen.tsx:67-86`).
- Settings uses `useSyncExternalStore` for auth and live queries for local meta (`src/features/settings/SettingsScreen.tsx:13-20`).

**Failure modes:**
- Putting DB writes directly in UI makes timestamps/outbox inconsistent.
- Effects that subscribe to events need cleanup (`src/features/study/StudyScreen.tsx:97-119`, `src/components/UpdateToast.tsx:5-9`).
- Derived data in render can become expensive as data grows (`src/features/study/StudyScreen.tsx:33-47`).

**Drill:** Find every `useLiveQuery` in `src/features`. For each, state what table data it depends on and what would re-render it.

## Dexie: Local Database As Source Of Truth

Dexie wraps IndexedDB. In this app, reads can be reactive with `useLiveQuery`, and writes happen through repositories.

**Repo examples:** schema tables and indexes (`src/db/schema.ts:80-101`), repository transaction pattern (`src/db/repos/cardRepo.ts:46-55`), test reset helper (`src/db/schema.ts:103-105`).

**Pitfall checklist:**
- Do not mutate timestamps in UI.
- Do not enqueue outbox during pull merges.
- Use transactions when two writes must stay consistent.

## Supabase: Optional Remote Boundary

Supabase is a sync target, not the primary runtime. The client is lazy and may be `null` (`src/db/sync/supabaseClient.ts:5-19`).

**Repo examples:** magic-link auth (`src/db/sync/auth.ts:37-45`), RLS policies (`supabase/migrations/0001_init.sql:176-188`), pull cursor query (`src/db/sync/engine.ts:146-153`).

**Drill:** Explain how app behavior changes when `.env` is empty.

## PWA: Offline Shell vs Offline Data

The service worker precaches app shell; IndexedDB stores app data. Supabase calls are explicitly not cached (`vite.config.ts:13-19`).

**Failure mode:** caching API calls would hide sync failures or replay stale remote data.
