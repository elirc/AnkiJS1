# Recall — Review & Improvement Notes

A full read-through of the app (SRS core, Dexie repositories, sync engine, and React
screens). Findings are grouped by priority. Each item cites `file:line` and, where useful,
a concrete failure scenario. Nothing here is blocking today — the app is well-structured,
local-first, and the domain layer is cleanly separated — but these are the highest-leverage
places to harden it.

The star of the codebase is the clean split between pure logic (`srs/`), data access
(`db/repos/`), and UI (`features/`). That separation is what made it possible to add ~80
new tests without touching product code. Keep defending that boundary.

---

## High priority (correctness)

### 1. Sync pull can silently skip rows that share a `server_updated_at` boundary
`src/db/sync/engine.ts:143-162`

`pullRemote` paginates with `.gt('server_updated_at', cursor).limit(500)` and advances the
cursor to `rows.at(-1).server_updated_at`, stopping when a page returns fewer than 500 rows.
Because the next query is *strictly greater than* the cursor, any rows sharing that exact
timestamp beyond the 500-row page are skipped forever.

This is not merely theoretical for `review_logs`: they are pushed in a **single batched
upsert** (`engine.ts:119-121`), and the server trigger sets `server_updated_at = now()`,
which is constant within one statement. So importing/pushing **more than 500 review logs at
once** stamps them all with an identical timestamp; a second device then pulls the first 500
and drops the remainder.

- **Repro:** import a backup with 600+ review logs on device A, sync, then sync device B →
  device B receives 500 logs.
- **Fix:** page by a composite `(server_updated_at, id)` cursor (keyset pagination), or fetch
  `>=` the boundary timestamp and de-dupe already-seen ids, or raise the page limit above any
  realistic single-statement batch. Keyset on `(server_updated_at, id)` is the robust option.

### 2. Import trusts the `user_id` embedded in the backup file
`src/db/repos/dataRepo.ts:38-58`

`importData` merges rows verbatim, keeping whatever `user_id` the file carried. On the next
sync, `pushOutbox` rewrites `user_id` to the current session's uid (`engine.ts:114`) and
pushes the rows as the signed-in user's own. Net effect: importing another account's backup
silently re-homes that data under your account. It can also seed a foreign `user_id` locally
that later trips the `auth_blocked` guard in `adoptLocalData` (`auth.ts:60-70`) on sign-in.

- **Fix:** normalize on import — set `user_id` to `null` (local-only) or to the current
  session uid, rather than preserving the file's value.

---

## Medium priority (robustness, security, a11y)

### 3. `Modal` is not an accessible dialog
`src/components/Modal.tsx`

The overlay has no `role="dialog"`, `aria-modal="true"`, focus trap, `Escape`-to-close, or
focus restoration on close. Keyboard and screen-reader users can tab out of the modal into
the page behind it, and closing does not return focus to the trigger.

- **Fix:** add `role="dialog" aria-modal="true"`, label it via `aria-labelledby` pointing at
  the title, trap focus while open, close on `Escape`, and restore focus to the opener.

### 4. Native `prompt`/`confirm` for core flows
`HomeScreen.tsx:25`, `DeckListScreen.tsx:17,54,64`, `DeckDetailScreen.tsx:36,97`,
`InboxScreen.tsx:73`, `SettingsScreen.tsx:62`

Deck create/rename/delete, card delete, and note delete all rely on `window.prompt` /
`window.confirm`. These block the main thread, cannot be styled, behave inconsistently inside
installed PWAs, and are effectively untestable (jsdom stubs them to no-ops, which is why
those paths have no UI tests). They also break the otherwise-polished visual language.

- **Fix:** route them through the existing `Modal` component (a small `useConfirm()` /
  `usePrompt()` hook would centralize this). This also unlocks UI tests for delete/rename.

### 5. N+1 count queries on the deck lists
`src/features/home/HomeScreen.tsx:11-20`, `src/features/decks/DeckListScreen.tsx:10-14`

Both screens call `deckCounts(deck.id)` per deck, and each `deckCounts` independently runs
`newCardsStudiedToday` — a day-range scan of `review_logs` plus a `bulkGet` of cards
(`deckRepo.ts:70-89`, `reviewRepo.ts:4-12`). For N decks that is N separate review-log scans
on every render/live-query update.

- **Fix:** compute counts in one pass — load the day's review logs once and all non-deleted
  cards once, then bucket by `deck_id`. This turns O(N) IndexedDB round-trips into O(1).

---

## Low priority (clarity, DX, polish)

### 6. Redundant condition in `deckCounts`
`src/db/repos/deckRepo.ts:79-84`

```ts
card.state !== 'new' &&
(card.state === 'learning' || card.state === 'relearning' || card.state === 'review')
```
The `!== 'new'` guard is implied by the explicit whitelist. Drop it for readability.

### 7. `StudyScreen` key handler re-subscribes every render
`src/features/study/StudyScreen.tsx:97-119`

The `useEffect` that binds `keydown` has no dependency array, so it removes and re-adds the
listener on every render. It's behaviorally correct (each render closes over fresh state),
but it's needless churn. Either give it the deps it actually reads, or move the handlers into
refs so the effect can run once.

### 8. `mergeReviewLog` treats logs as immutable — document the assumption
`src/db/sync/merge.ts:61-66`

Local review logs always win over remote. That is correct *if* logs are append-only, which
they are today. Worth a one-line comment so a future edit-able-log feature doesn't silently
lose remote corrections. (Covered now by a test in `merge.test.ts`.)

### 9. No linter / formatter / CI
There is no ESLint or Prettier config and no CI workflow. `tsconfig.json` already enables
`noUnusedLocals`/`noUnusedParameters`, so the jump to ESLint is small.

- **Suggestion:** add `eslint` (with `@typescript-eslint`, `eslint-plugin-react-hooks`) and a
  GitHub Actions job running `npm run typecheck && npm test && npm run build`. The
  react-hooks rule would have flagged item #7 automatically.

### 10. Consider a coverage gate
`vitest run --coverage` (v8 provider) with a modest threshold on `src/db` and `src/srs` would
lock in the domain-layer coverage this pass added.

---

## Test suite added in this pass

Existing tests: 16. Now: **96** (all green, `tsc --noEmit` clean).

| Area | File | What it locks down |
| --- | --- | --- |
| Date/format helpers | `src/lib/dates.test.ts` | local-day boundaries, relative age buckets, interval formatting, `formatDue` |
| ID generation | `src/lib/ids.test.ts` | UUID shape + uniqueness |
| Merge/CRDT rules | `src/db/sync/merge.test.ts` (extended) | deck/note last-writer-wins, review-log immutability, `stripServerFields`, no-local adoption |
| Outbox | `src/db/sync/outbox.test.ts` | coalescing, `enqueueMany`, safe conditional removal |
| Deck repo | `src/db/repos/deckRepo.test.ts` | name trimming/fallback, `new_per_day` clamping, due/new counts, soft-delete |
| Note repo | `src/db/repos/noteRepo.test.ts` | capture/edit/archive/delete, converted card-id de-dup, inbox ordering |
| Card repo | `src/db/repos/cardRepo.test.ts` | create/trim, undo review, soft-delete, search, outbox de-dup |
| Review repo | `src/db/repos/reviewRepo.test.ts` | "new studied today" counting, deck scoping, day boundaries |
| Backup | `src/db/repos/dataRepo.test.ts` | export shape, export→import round-trip, merge-on-import, invalid-file rejection |
| SRS queue | `src/srs/queue.test.ts` (extended) | daily-limit exhaustion, cross-deck isolation, not-yet-due exclusion, new-card ordering |
| SRS scheduler | `src/srs/scheduler.test.ts` (extended) | log/card consistency, reps + `srs_updated_at`, Easy ≥ Good, preview keys |
| Inbox UI | `src/features/inbox/InboxScreen.test.tsx` | empty state, list + archive, inline edit |
| Card editor UI | `src/features/cards/CardEditorScreen.test.tsx` | no-deck guard, create + navigate, edit existing |
| Home UI | `src/features/home/HomeScreen.test.tsx` | onboarding empty state, due summary, inbox banner |

### Notable coverage gaps that remain
- **Sync engine** (`engine.ts`) push/pull loops are untested — they need a mocked Supabase
  client. This is where bug #1 lives, so it's the highest-value place to add tests next.
- **Delete/rename flows** are untestable until the native `confirm`/`prompt` calls (#4) move
  into the `Modal`.
- **`adoptLocalData`** (`auth.ts`) — the local-data adoption and `auth_blocked` guard have no
  tests.
