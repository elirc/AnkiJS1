# Good First Tickets

Each ticket follows existing patterns and keeps blast radius small.

## Ticket 1: Add Share Target Prefill Test
**Difficulty:** Easy. **Time:** 45m. **Skills:** UI test, URL params.  
**Story:** As a user, shared text should appear in Capture.  
**Acceptance:** test covers `?title=&text=&url=`.  
**Read:** `src/features/capture/CaptureScreen.tsx:9-24`, `src/features/capture/CaptureScreen.test.tsx:13-24`.  
**Files:** `src/features/capture/CaptureScreen.test.tsx`.  
**Plan:** render MemoryRouter with initial URL; assert textarea value.  
**Checks:** `npm test -- CaptureScreen`.  
**Review questions:** Does test prove order and newline behavior?

## Ticket 2: Add Import Validation Tests
Read `src/db/repos/dataRepo.ts:15-39`. Add tests for missing arrays and wrong version. Risk: no product behavior change.

## Ticket 3: Add Queue Test For Future Learning Card
Read `src/srs/queue.ts:15-27`, `src/srs/queue.test.ts:42-96`. Acceptance: future-due learning card excluded.

## Ticket 4: Add `relativeAge` Unit Tests
Read `src/lib/dates.ts:10-22`. Acceptance: now/minutes/hours/days/months with fixed `now`.

## Ticket 5: Improve Settings Import Error Copy
Read `src/features/settings/SettingsScreen.tsx:33-42`. Acceptance: error message remains concise and tested if possible.

## Ticket 6: Add Empty Deck Convert Test
Read `src/features/inbox/ConvertNoteDialog.tsx:52-58`. Acceptance: no deck state renders and create disabled.

## Ticket 7: Add `deckCounts` Test
Read `src/db/repos/deckRepo.ts:70-89`. Acceptance: due + new availability count with fixed date.

## Ticket 8: Add SyncBadge Pending State Test
Read `src/components/SyncBadge.tsx:10-41`, `src/db/sync/outbox.ts:36-37`. Acceptance: pending count appears.

## Ticket 9: Document Local-Only Mode In README
Read `README.md:5-35`, `src/db/sync/supabaseClient.ts:5-19`. Acceptance: no claims beyond code.

## Ticket 10: Add Markdown HTML Smoke Test
Read `src/components/MarkdownView.tsx:5-17`. Acceptance: raw HTML is not rendered as active HTML.

## Ticket 11: Add `deleteCard` Repository Test
Read `src/db/repos/cardRepo.ts:69-78`. Acceptance: tombstone and outbox entry set.

## Ticket 12: Add Adoption Block Test
Read `src/db/sync/auth.ts:55-69`. Acceptance: foreign `user_id` writes `auth_blocked`.

## Ticket 13: Add Keyboard Shortcut Study Test
Read `src/features/study/StudyScreen.tsx:97-119`. Acceptance: Enter reveals, `3` rates.

## Ticket 14: Add `last_deck_id` Dialog Test
Read `src/features/inbox/ConvertNoteDialog.tsx:26-36`. Acceptance: last deck is selected when present.

## Ticket 15: Add No-Deck Card Editor Empty State Test
Read `src/features/cards/CardEditorScreen.tsx:48-49`. Acceptance: empty state shown.

## Ticket 16: Add Command Cheatsheet Link To README
Read `docs/upskill/08-reference/command-cheatsheet.md`. Acceptance: root README links docs without clutter.

## General Ticket Template

```ts
// Illustrative fake code: adapt to the repo.
describe('behavior', () => {
  it('states expected result with fixed data', async () => {
    // arrange
    // act
    // assert
  });
});
```

What could go wrong: broad refactor, flaky time, direct DB use in production code, or testing implementation details.
