# Mid-Level Feature Tickets

These cross layers and require design notes before code.

## Ticket 1: Atomic Note Conversion Repository Helper
Read `ConvertNoteDialog.tsx:32-43`, `cardRepo.ts:7-31`, `noteRepo.ts:49-61`. Design a repo function that creates card(s) and marks note converted in one transaction. Tests: partial failure and multiple cards. Rollback: keep old functions until UI switches.

## Ticket 2: Deep Backup Validation
Read `dataRepo.ts:15-57`, `schema.ts:5-78`. Add validators for ids, ISO dates, enums, arrays. Tests: invalid row rejected. Risk: strictness may reject old backups; include version plan.

## Ticket 3: Auth Adoption Tests And UX Polish
Read `auth.ts:55-94`, `SettingsScreen.tsx:53-65`. Add tests for local rows, foreign rows, enqueue count. Risk: auth client mocking.

## Ticket 4: Study Session Hook
Read `StudyScreen.tsx:23-166`. Extract queue/rating/undo orchestration into a hook. Tests: hook or screen behavior. Rollback: keep screen behavior identical.

## Ticket 5: Sync Missing-Deck Buffer
Read `engine.ts:166-193`. Buffer remote cards whose deck is missing, retry after decks pull. Tests: card eventually inserted. Risk: cursor advancement.

## Ticket 6: CI Workflow
Add GitHub Actions for `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Evidence: no repo-owned `.github` found. Risk: Node version mismatch.

## Ticket 7: Markdown URL Policy
Read `MarkdownView.tsx:5-17`. Decide allowed protocols for links/images. Tests: javascript URL blocked. Risk: react-markdown behavior specifics.

## Ticket 8: Sync Client Adapter For Tests
Read `supabaseClient.ts:5-28`, `engine.ts:63-193`. Introduce injectable client boundary for sync tests. Risk: over-abstraction.

## Ticket 9: Offline/PWA Manual Test Checklist
Read `vite.config.ts:8-58`, `README.md:27-35`. Add documented manual acceptance checklist. Risk: platform differences.

## Ticket 10: Deck Search Debounce
Read `DeckDetailScreen.tsx:14-22`. Add actual debounce or explain why current direct query is acceptable. Tests: delayed query behavior.

## Ticket 11: Export Large Dataset Strategy
Read `SettingsScreen.tsx:22-31`. Investigate streaming/chunk export or warn for size. Tests: not trivial; document performance measurement.

## Ticket 12: ESLint Boundary Rule
Add lint tooling and no-restricted-imports for UI -> `db/schema` values/Supabase. Risk: config churn; keep focused.
