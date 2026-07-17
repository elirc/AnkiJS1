# Writing Tests Here

## Test Recipes

1. **Happy path repo write:** copy structure from `src/db/repos/repos.test.ts:12-20`.
2. **Validation failure:** call `importData` with malformed object and expect throw (`src/db/repos/dataRepo.ts:15-39`).
3. **Permission/adoption failure:** seed rows with foreign `user_id`, call `adoptLocalData`, expect `auth_blocked` (`src/db/sync/auth.ts:55-69`).
4. **Async side effect:** enqueue outbox and assert dedupe (`src/db/sync/outbox.ts:4-17`, `src/db/repos/repos.test.ts:23-31`).
5. **Cache/query invalidation:** render a screen using `useLiveQuery`, write through repo, assert UI updates (`src/features/home/HomeScreen.tsx:11-21`).
6. **Migration/schema behavior:** after future Dexie version, seed old DB and assert upgrade.
7. **UI state:** follow `CaptureScreen` test shape (`src/features/capture/CaptureScreen.test.tsx:13-24`).
8. **Conflict merge:** add scenarios to `src/db/sync/merge.test.ts:31-72`.

## Commands

```bash
npm test
npm run test:watch
npm run typecheck
```

## Example New Test Plan

Feature: import rejects invalid backup.

1. Arrange: reset DB.
2. Act: `await expect(importData({ version: 1, decks: [] })).rejects...`
3. Assert: no rows inserted, helpful error.
4. Senior addition: test partially valid rows cannot corrupt DB.
