# Language And Runtime Model

## Concept: Browser JavaScript Is Evented And Async

JavaScript in this app runs in the browser. User events, timers, promise continuations, Dexie calls, and network sync all interleave. Production risk comes from assuming sequential-looking code means the whole app is paused.

**Repo examples:**
- Capture save awaits local persistence, then re-focuses via timers (`src/features/capture/CaptureScreen.tsx:27-35`).
- Sync debounces with `setTimeout`, repeats with `setInterval`, and listens to browser events (`src/db/sync/engine.ts:38-53`).
- Study rating awaits one transaction before moving on (`src/features/study/StudyScreen.tsx:67-86`).

**Failure modes:**
- Double-clicks can trigger duplicate writes if UI does not disable or guard.
- Stale closures in event listeners can use old state (`src/features/study/StudyScreen.tsx:97-119` deserves care).
- Parallel `Promise.all` can overload remote APIs (`src/db/sync/engine.ts:128-130` chunks RPC calls).

**Drill:** In `StudyScreen`, mark which variables are render state, derived state, and persisted state. Then explain why `undo` lives in memory only (`src/features/study/StudyScreen.tsx:29`, `src/features/study/StudyScreen.tsx:87-95`).

Self-grade:
- Basic: says "async means await".
- Solid: identifies event/timer/promise boundaries.
- Strong: predicts stale state or double-submit risks and proposes tests.

## Concept: Serial vs Parallel Work

Serial work preserves order and reduces load; parallel work reduces latency when operations are independent.

**Repo examples:**
- Deck summary uses `Promise.all` because per-deck counts are independent (`src/features/home/HomeScreen.tsx:14-18`).
- Sync push preserves table order: decks, notes, cards, review logs (`src/db/sync/engine.ts:104-136`).
- Adoption loops each table and row inside one transaction (`src/db/sync/auth.ts:72-93`).

**Drill:** Explain why sync push should not push cards before decks even though `Promise.all` might be faster.

## Concept: Native Dates And ISO Strings

The app stores timestamps as ISO strings and converts to `Date` at logic boundaries.

**Repo examples:** date helpers in `src/lib/dates.ts:1-44`, queue comparisons in `src/srs/queue.ts:15-27`, review log daily count in `src/db/repos/reviewRepo.ts:4-11`.

**Failure modes:** local-day counts can surprise users near time zone changes; compare carefully when testing new-card limits.
