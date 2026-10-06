# Key Flows

## Flow: Quick Capture

**Why this flow matters:** It proves the local-first invariant: user input becomes durable without network.

**Open these files first:**
- `src/main.tsx:32` - `/capture` route.
- `src/features/capture/CaptureScreen.tsx:9-62` - textarea, share params, save.
- `src/db/repos/noteRepo.ts:6-21` - local write and outbox enqueue.
- `src/db/sync/outbox.ts:4-17` - dedupe and sync trigger.

**Trace:**
| Step | Owner | File | What happens | Data shape | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | Router | `src/main.tsx:32` | Opens capture screen. | URL route | Wrong route breaks share target. |
| 2 | UI | `CaptureScreen.tsx:9-20` | Builds initial text from query params. | string | URL encoding edge cases. |
| 3 | UI | `CaptureScreen.tsx:27-35` | Saves note, clears textarea, toast. | body string | Empty trim loses whitespace intentionally. |
| 4 | Repo | `noteRepo.ts:6-21` | Creates `Note`, transaction writes note/outbox. | `Note` | Transaction must include outbox. |
| 5 | Sync | `outbox.ts:14-17` | Emits sync event. | `OutboxEntry` | Event is best-effort; outbox is durable. |

**Validation and authorization:** UI disables empty save (`src/features/capture/CaptureScreen.tsx:59-61`). No auth required; note starts `user_id: null` (`src/db/repos/noteRepo.ts:10`).

**Persistence and side effects:** Dexie transaction persists note and outbox (`src/db/repos/noteRepo.ts:18-20`). Sync is deferred.

**Tests that cover it:** `src/features/capture/CaptureScreen.test.tsx:13-24`.

**What juniors usually miss:** the toast count re-queries inbox after write (`src/features/capture/CaptureScreen.tsx:31-32`).

**What seniors notice:** local durability does not depend on the custom event; the outbox table is the reliable boundary.

**Drill:** add a test for share-target prefill.

**Self-grade:** Basic names UI/repo; Solid explains transaction; Strong explains offline and sync decoupling.

## Flow: Inbox Convert Note To Card

**Why this flow matters:** It turns loose capture into structured learning data and links provenance.

**Open these files first:**
- `src/features/inbox/InboxScreen.tsx:13-88`
- `src/features/inbox/ConvertNoteDialog.tsx:11-100`
- `src/db/repos/cardRepo.ts:7-31`
- `src/db/repos/noteRepo.ts:49-61`

**Trace:**
| Step | Owner | File | What happens | Data shape | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | UI | `InboxScreen.tsx:14-18` | Reads inbox and decks. | `Note[]`, `Deck[]` | Empty deck state blocks conversion. |
| 2 | UI | `ConvertNoteDialog.tsx:20-24` | Initializes front/back/deck. | form state | Last deck could be stale. |
| 3 | Repo | `cardRepo.ts:7-31` | Creates card with new FSRS fields. | `Card` | Must set `note_id`. |
| 4 | Repo | `noteRepo.ts:49-61` | Marks note converted and stores card ids. | `Note` | Multiple cards require merge not replace. |

**Validation and authorization:** dialog requires deck/front/back (`src/features/inbox/ConvertNoteDialog.tsx:23-24`). Local-only rows are allowed.

**Persistence and side effects:** card creation and note conversion are separate transactions, so investigate partial conversion after a failure between them.

**Tests that cover it:** No direct component test found; repos cover card creation patterns indirectly (`src/db/repos/repos.test.ts:12-39`).

**What juniors usually miss:** `Create and add another` leaves dialog open for splitting one note (`src/features/inbox/ConvertNoteDialog.tsx:91-97`).

**What seniors notice:** conversion is not atomic across card + note; likely acceptable locally but worth a test or transaction project.

**Drill:** write a fake bug report for partial conversion and propose a test.

**Self-grade:** Basic traces files; Solid identifies `note_id`; Strong discusses transaction boundary.

## Flow: Study Review And Undo

**Why this flow matters:** This is the core product loop and the highest-value offline path.

**Open these files first:**
- `src/features/study/StudyScreen.tsx:23-166`
- `src/srs/queue.ts:11-37`
- `src/srs/scheduler.ts:83-109`
- `src/db/repos/cardRepo.ts:46-67`

**Trace:**
| Step | Owner | File | What happens | Data shape | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | UI | `StudyScreen.tsx:33-47` | Reads decks/cards and builds queue. | `Card[]` | Queue recomputes from live DB. |
| 2 | Domain | `queue.ts:11-37` | Orders learning, review, new. | pure array | New limit must not refill incorrectly. |
| 3 | UI | `StudyScreen.tsx:67-86` | Rates current card. | rating 1-4 | Stale `current` if UI changes fast. |
| 4 | Domain | `scheduler.ts:83-109` | FSRS calculates card/log. | `Card`, `ReviewLog` | Library API changes. |
| 5 | Repo | `cardRepo.ts:46-55` | Atomic card/log/outbox write. | transaction | Must keep log and card consistent. |
| 6 | UI | `StudyScreen.tsx:87-95` | Undo restores card and deletes log. | memory snapshot | Single-level only. |

**Validation and authorization:** rating is constrained by type and button options (`src/features/study/RatingBar.tsx:3-36`). No remote auth needed for local study.

**Persistence and side effects:** `applyReview` is one Dexie transaction; sync happens later.

**Tests that cover it:** `src/features/study/StudyScreen.test.tsx:15-32`, `src/srs/scheduler.test.ts:23-43`, `src/db/repos/repos.test.ts:12-20`.

**What juniors usually miss:** session-local `sessionLearningIds` handles short due re-entry (`src/features/study/StudyScreen.tsx:30-47`, `src/features/study/StudyScreen.tsx:72-81`).

**What seniors notice:** keyboard handler depends on current render state and should be tested for stale closure regressions if refactored (`src/features/study/StudyScreen.tsx:97-119`).

**Drill:** create a trace table for rating `Again` on a new card.

**Self-grade:** Basic follows click to DB; Solid explains FSRS/log; Strong explains undo and sync implications.

## Flow: Optional Sync Push/Pull

**Why this flow matters:** It is the reliability boundary between local-first UX and multi-device consistency.

**Open these files first:**
- `src/db/sync/supabaseClient.ts:5-28`
- `src/db/sync/engine.ts:45-193`
- `src/db/sync/merge.ts:10-65`
- `supabase/migrations/0001_init.sql:83-195`

**Trace:**
| Step | Owner | File | What happens | Data shape | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | Client | `engine.ts:45-53` | Sync trigger setup. | events/timer | Too chatty if outbox floods. |
| 2 | Guard | `engine.ts:63-70` | No-op offline/signed-out/no client. | session | False local-only if env misconfigured. |
| 3 | Push | `engine.ts:104-136` | Groups outbox and pushes order. | row snapshots | RPC per row for guarded tables. |
| 4 | Pull | `engine.ts:139-161` | Pulls by cursor. | remote rows | Cursor bugs can skip rows. |
| 5 | Merge | `engine.ts:166-193` | Writes remote via merge, no outbox. | local rows | Missing deck buffers cards by skipping. |

**Validation and authorization:** Supabase RLS requires `user_id = auth.uid()` (`supabase/migrations/0001_init.sql:176-188`). Push maps local rows to uid (`src/db/sync/engine.ts:111-114`).

**Persistence and side effects:** `last_sync_ok_at`, `last_error`, and cursors live in `sync_meta` (`src/db/sync/engine.ts:76-83`, `src/db/sync/engine.ts:143-160`).

**Tests that cover it:** merge tests exist (`src/db/sync/merge.test.ts:31-72`); no integration test hits Supabase.

**What juniors usually miss:** pull writes directly to Dexie to avoid re-enqueue (`src/db/sync/engine.ts:171-193`).

**What seniors notice:** skipped card when deck missing is a possible risk (`src/db/sync/engine.ts:186-187`).

**Drill:** explain why server upserts are RPCs for cards/decks/notes but raw upsert for review logs.

**Self-grade:** Basic knows push/pull; Solid explains cursor and LWW; Strong identifies reliability gaps.

## Flow: Sign-In Adoption

**Why this flow matters:** It protects local-only work and prevents accidental account mixing.

**Open these files first:**
- `src/db/sync/auth.ts:25-94`
- `src/features/settings/SettingsScreen.tsx:53-104`
- `src/db/sync/supabaseClient.ts:5-28`

**Trace:**
| Step | Owner | File | What happens | Data shape | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | Auth | `auth.ts:25-34` | Restores session and subscribes changes. | `Session` | Race with app render. |
| 2 | Guard | `auth.ts:55-69` | Blocks if rows belong to other uid. | user ids | Needs user-facing recovery. |
| 3 | Adoption | `auth.ts:72-93` | Sets null `user_id` rows to uid and enqueues. | all synced rows | Large local DB cost. |
| 4 | Sync | `auth.ts:94` | Starts sync. | outbox | Remote conflicts go to merge. |

**Validation and authorization:** magic-link sign-in requires Supabase configured (`src/db/sync/auth.ts:37-45`). Server RLS enforces ownership.

**Persistence and side effects:** local adoption is one transaction across all synced tables (`src/db/sync/auth.ts:72-93`).

**Tests that cover it:** No direct tests found.

**What juniors usually miss:** signing out keeps local data; adoption is not deletion.

**What seniors notice:** blocking different-user state is stored in `sync_meta`, but erase flow deletes entire DB (`src/features/settings/SettingsScreen.tsx:53-65`).

**Drill:** design a test for "different user signs in on same browser."

**Self-grade:** Basic describes adoption; Solid explains account-mixing risk; Strong proposes rollback/testing strategy.

## Flow: Export And Import JSON

**Why this flow matters:** Backups are the safety valve for local-first apps.

**Open these files first:**
- `src/features/settings/SettingsScreen.tsx:22-42`
- `src/db/repos/dataRepo.ts:6-62`
- `src/db/sync/merge.ts:10-65`

**Trace:**
| Step | Owner | File | What happens | Data shape | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | UI | `SettingsScreen.tsx:22-31` | Creates JSON blob download. | `RecallBackup` | Large data memory. |
| 2 | UI | `SettingsScreen.tsx:33-42` | Parses uploaded JSON. | unknown | Parse errors handled. |
| 3 | Repo | `dataRepo.ts:15-25` | Validates top-level shape. | type guard | Shallow validation only. |
| 4 | Repo | `dataRepo.ts:38-57` | Merges rows and enqueues. | tables | Bad row fields can pass. |

**Validation and authorization:** import validates only version and array fields (`src/db/repos/dataRepo.ts:15-25`).

**Persistence and side effects:** import is one transaction and reuses merge functions.

**Tests that cover it:** `src/db/repos/dataRepo.test.ts:18-91` covers round-trip export, versioned backup shape, and import-merge; no component-level test drives the Settings upload UI itself.

**What juniors usually miss:** import is merge, not blind overwrite.

**What seniors notice:** schema validation should become deeper before accepting arbitrary backups.

**Drill:** write a validation failure test for a backup with non-array `cards`.

**Self-grade:** Basic follows file upload; Solid explains merge; Strong identifies validation gap and migration concern.
