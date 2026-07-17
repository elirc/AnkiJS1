# Systematic Debugging

Method: reproduce, narrow, hypothesize, test cheaply, fix root cause, verify regression coverage.

## Scenario: Captured Note Does Not Appear In Inbox
**Reproduction:** type note, click Save, go to Inbox.  
**First question:** is the bug UI state or repository write?  
**Narrowing path:** check `CaptureScreen.tsx:27-35`; inspect `noteRepo.ts:6-21`; run `CaptureScreen.test.tsx:13-24`.  
**Useful probes:** IndexedDB Application tab, temporary log in `captureNote`, `npm test -- CaptureScreen`.  
**Likely root causes:** blank body, transaction failure, `listInbox` filter mismatch.  
**Regression test:** note count and body appears in inbox.  
**Senior lesson:** prove persistence before debugging render.

## Scenario: New Cards Exceed Daily Limit
Check `newCardsStudiedToday` (`src/db/repos/reviewRepo.ts:4-11`) and queue slice (`src/srs/queue.ts:28-35`). Add fixed-date tests to avoid time-zone flake.

## Scenario: Sync Badge Stuck On Pending
Check outbox count (`src/db/sync/outbox.ts:36-37`), no-op guard (`src/db/sync/engine.ts:63-70`), and stored error (`src/db/sync/engine.ts:80-87`). Determine if user is signed out, offline, or Supabase env missing.

## Scenario: Card Text Edit Lost After Sync
Check field-group timestamps in `updateContent` (`src/db/repos/cardRepo.ts:35-43`), `mergeCard` (`src/db/sync/merge.ts:32-65`), and SQL upsert (`supabase/migrations/0001_init.sql:126-174`). Add merge test before changing sync.

## Scenario: Import Succeeds But App Breaks Later
Check shallow guard (`src/db/repos/dataRepo.ts:15-25`). Add deeper validation and tests for malformed rows.

Debugging self-grade:
- Basic: reproduces and checks console.
- Solid: narrows layer before editing.
- Strong: adds regression test and explains root invariant.
