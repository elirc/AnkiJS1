# Pattern Catalog

## Pattern: Repository Write Boundary
**Problem it solves:** UI should not own timestamps, transactions, or outbox writes.  
**General shape:** screen calls repo; repo writes Dexie and enqueues.  
**Real example:** `src/db/repos/noteRepo.ts:6-21`  
**Second example:** `src/db/repos/cardRepo.ts:35-43`  
**Why this implementation works:** local state and sync intent are written together.  
**Failure modes:** calling Dexie from UI drops outbox; forgetting timestamp breaks merge.  
**Use it when:** data is persisted or synced.  
**Avoid it when:** state is purely visual.  
**Drill:** find one screen repo call and trace its transaction.

## Pattern: Local-First Outbox
**Problem it solves:** network should not block capture/study.  
**General shape:** persist row snapshot; sync later.  
**Real example:** `src/db/sync/outbox.ts:4-17`  
**Second example:** `src/db/sync/engine.ts:104-136`  
**Failure modes:** operation semantics lost if row snapshot is insufficient.  
**Use it when:** latest row state is enough.  
**Avoid it when:** every event must be replayed exactly.  
**Drill:** explain why review logs are different from mutable card rows.

## Pattern: Atomic Multi-Table Transaction
**Problem it solves:** related local writes stay consistent.  
**Real example:** `src/db/repos/cardRepo.ts:46-55`  
**Second example:** `src/db/repos/deckRepo.ts:47-60`  
**Failure modes:** missing table in transaction; async work outside transaction.  
**Use it when:** one visible action changes multiple tables.  
**Avoid it when:** writes are independent and partial success is acceptable.  
**Drill:** draw the `applyReview` transaction contents.

## Pattern: Pure Domain Function
**Problem it solves:** business rules are testable without React/Dexie.  
**Real example:** `src/srs/queue.ts:11-37`  
**Second example:** `src/db/sync/merge.ts:32-65`  
**Failure modes:** hidden date/global state makes tests flaky.  
**Use it when:** input/output can be explicit.  
**Avoid it when:** behavior is inherently side-effectful.  
**Drill:** add a queue test for future-due learning cards.

## Pattern: External Library Adapter
**Problem it solves:** isolates `ts-fsrs` API from the app.  
**Real example:** `src/srs/scheduler.ts:49-76`  
**Second example:** Supabase lazy client `src/db/sync/supabaseClient.ts:5-19`  
**Failure modes:** adapter leaks external types.  
**Use it when:** dependency API may change.  
**Avoid it when:** wrapper adds no boundary.  
**Drill:** identify app fields not present in FSRS card.

## Pattern: Field-Group Conflict Resolution
**Problem it solves:** card content edits and study reviews can merge.  
**Real example:** `src/db/sync/merge.ts:32-65`  
**Second example:** SQL guarded upsert `supabase/migrations/0001_init.sql:126-174`  
**Failure modes:** timestamp skew; missing field in group.  
**Use it when:** independent fields have separate owners.  
**Avoid it when:** fields must change atomically.  
**Drill:** make a table of content vs SRS fields.

## Pattern: Server-Side LWW Guard
**Problem it solves:** stale clients cannot blindly overwrite newer rows.  
**Real example:** `supabase/migrations/0001_init.sql:83-124`  
**Second example:** card group guard `supabase/migrations/0001_init.sql:126-174`  
**Failure modes:** equal timestamps not updating on server while client merge ties remote.  
**Use it when:** multiple clients sync same mutable rows.  
**Avoid it when:** server should be authoritative.  
**Drill:** explain the deck vs card guard difference.

## Pattern: Pull Cursor
**Problem it solves:** efficient incremental sync.  
**Real example:** `src/db/sync/engine.ts:143-160`  
**Second example:** server indexes `supabase/migrations/0001_init.sql:192-195`  
**Failure modes:** skipped rows if cursor advances before merge success.  
**Use it when:** server has monotonic update timestamp.  
**Avoid it when:** ordering is not stable.  
**Drill:** reason about two rows with identical server timestamps.

## Pattern: Lazy Optional Integration
**Problem it solves:** app boots without external credentials.  
**Real example:** `src/db/sync/supabaseClient.ts:5-19`  
**Second example:** sync no-op guard `src/db/sync/engine.ts:63-70`  
**Failure modes:** users think sync works when env missing.  
**Use it when:** integration is optional.  
**Avoid it when:** core product depends on service.  
**Drill:** list UI signals for local-only state.

## Pattern: React External Store Subscription
**Problem it solves:** non-React state drives React render safely.  
**Real example:** `src/components/SyncBadge.tsx:10-13`  
**Second example:** `src/features/settings/SettingsScreen.tsx:13-20`  
**Failure modes:** snapshot not immutable; missed emit.  
**Use it when:** state lives outside React.  
**Avoid it when:** regular props/state are enough.  
**Drill:** trace `setSyncState` to badge update.

## Pattern: UI Smoke Test
**Problem it solves:** verifies user-visible flow without full E2E.  
**Real example:** `src/features/capture/CaptureScreen.test.tsx:13-24`  
**Second example:** `src/features/study/StudyScreen.test.tsx:15-32`  
**Failure modes:** over-mocking hides integration bugs.  
**Use it when:** one screen flow is critical.  
**Avoid it when:** pure function test is cheaper and sufficient.  
**Drill:** write an inbox convert smoke test.

## Pattern: Shallow Import Guard
**Problem it solves:** prevents obvious invalid JSON imports.  
**Real example:** `src/db/repos/dataRepo.ts:15-25`  
**Second example:** none found.  
**Failure modes:** malformed rows pass.  
**Use it when:** bootstrapping feature quickly.  
**Avoid it when:** data comes from untrusted users.  
**Drill:** design deeper validation.

## Pattern: Soft Delete Tombstone
**Problem it solves:** deletes can sync across devices.  
**Real example:** `src/db/repos/deckRepo.ts:47-60`  
**Second example:** `src/db/repos/cardRepo.ts:69-78`  
**Failure modes:** UI forgets to filter tombstones.  
**Use it when:** sync needs delete propagation.  
**Avoid it when:** legal/privacy requires hard delete.  
**Drill:** find all list functions that filter `deleted_at`.

## Pattern: Sanitized Markdown Rendering
**Problem it solves:** markdown without raw HTML execution.  
**Real example:** `src/components/MarkdownView.tsx:5-17`  
**Second example:** editor previews use component (`src/features/cards/CardEditorScreen.tsx:123-132`).  
**Failure modes:** unsafe URL schemes in links/images require investigation.  
**Use it when:** user-authored markdown is displayed.  
**Avoid it when:** rich trusted HTML is required.  
**Drill:** test a markdown string with `<script>`.

## Pattern: Setup-Time PWA Configuration
**Problem it solves:** offline shell and share target are declared centrally.  
**Real example:** `vite.config.ts:8-58`  
**Second example:** update toast bridge `src/main.tsx:20-24`  
**Failure modes:** service worker cache hides changes in dev/prod.  
**Use it when:** browser install/offline features are static.  
**Avoid it when:** data caching needs runtime policy.  
**Drill:** explain why Supabase is NetworkOnly.
