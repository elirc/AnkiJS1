# Interview Prep From This Repo

Use Recall as a portfolio of concrete examples for fullstack JavaScript/TypeScript roles at junior-to-mid level, with senior growth signals.

## Language And Runtime Questions

**Question:** Why can capture work offline?  
Junior answer: it saves to IndexedDB.  
Mid-level adds: UI calls `captureNote`, which writes note and outbox in a Dexie transaction (`src/db/repos/noteRepo.ts:6-21`).  
Senior includes: network is decoupled; the durable outbox, not the event, is the reliability boundary (`src/db/sync/outbox.ts:4-17`).

**Question:** When would you use `Promise.all`?  
Junior: for parallel async work.  
Mid-level: home deck counts are independent (`src/features/home/HomeScreen.tsx:14-18`), but sync table order is not (`src/db/sync/engine.ts:104-136`).  
Senior: parallelism changes load and ordering; measure and protect dependencies.

## React Questions

**Question:** What state belongs in React vs persistence?  
Junior: form input uses React state.  
Mid-level: draft/reveal/undo are UI state, card/log rows are persisted (`src/features/study/StudyScreen.tsx:26-30`, `src/db/repos/cardRepo.ts:46-55`).  
Senior: state placement encodes recovery behavior; memory-only undo is a product contract.

**Question:** How do you avoid stale UI with IndexedDB?  
Answer anchors: `useLiveQuery` in home/capture/study/settings (`src/features/home/HomeScreen.tsx:11-21`, `src/features/study/StudyScreen.tsx:33-47`).

## TypeScript Questions

**Question:** How do unions improve correctness here?  
Answer anchors: `CardState` and `NoteStatus` (`src/db/schema.ts:15`, `src/db/schema.ts:40`), rating `1 | 2 | 3 | 4` (`src/db/schema.ts:57`, `src/srs/scheduler.ts:85`).

**Question:** What is a sharp edge in current type safety?  
Answer: backup import guard is shallow (`src/db/repos/dataRepo.ts:15-25`).

## Fullstack/System Design Questions

**Question:** Design local-first sync for flashcards.  
Use this repo: local source of truth (`src/db/schema.ts:80-101`), outbox (`src/db/sync/outbox.ts:4-37`), push/pull (`src/db/sync/engine.ts:104-161`), merge (`src/db/sync/merge.ts:32-65`), RLS (`supabase/migrations/0001_init.sql:176-188`).  
Senior answer adds: idempotency, cursor safety, conflict semantics, observability, and rollback.

**Question:** How would you handle conflicts between editing card text and reviewing?  
Answer: split content and SRS timestamps (`src/db/schema.ts:34-35`, `src/db/sync/merge.ts:34-58`). Senior adds server-side guard (`supabase/migrations/0001_init.sql:126-174`).

## Debugging Questions

**Question:** Sync badge says pending forever. What do you check?  
Junior: network.  
Mid-level: env/session/offline guard (`src/db/sync/engine.ts:63-70`), outbox count (`src/db/sync/outbox.ts:36-37`), last error (`src/db/sync/engine.ts:80-83`).  
Senior: reproduce with logs, isolate push vs pull, add regression test around failing layer.

## Code Review Questions

**Prompt:** PR imports `db` into `CaptureScreen`.  
Expected: block because it bypasses repo timestamp/outbox boundary (`src/features/capture/CaptureScreen.tsx:7`, `src/db/repos/noteRepo.ts:6-21`).

## Behavioral Prompts

**Tell me about a time you improved reliability.**  
Use a contribution like "added deep backup validation" or "hardened sync cursor tests." Structure: situation, invariant, risk, change, tests, outcome.

**Tell me about reviewing a risky change.**  
Use service worker caching or sync LWW as example. Focus on blast radius and evidence.

## Practice Drill

Prepare a 2-minute explanation of `applyReview`:
- Junior: what it does.
- Mid-level: why transaction matters.
- Senior: what failure modes it prevents and what tests prove it (`src/db/repos/cardRepo.ts:46-55`, `src/db/repos/repos.test.ts:12-20`).
