# Personal release notes

The current v13 curriculum contains 21,102 cards, including 72 authored scenarios and 828 guided lessons, plus 48 engineering practice missions. These overall card, guided-lesson, and mission counts are each 3x their v12 totals. Existing identities and review progress remain intact. See [the comprehensive expansion review](COMPREHENSIVE-EXPANSION.md) for provenance, checks, and limitations. The v8 verification and packaging notes below are historical, not validation of v13.

## Verification for this package

Prior practice-release checks on 2026-09-06 (the v8 expansion is checked separately below):

| Check | Result |
| --- | --- |
| TypeScript and production build | Passed, including service-worker generation. |
| Practice browser workflow | Both Chromium mobile and desktop profiles passed: completion, offline edits/reload, related search, evidence export, and backup restoration into a fresh profile. |
| Repository contract checks | Passed: all entity types, reordered input, preservation of newer edits and schedules, immutable review history, queue identity/coalescing, malformed input, and rollback of every table after a late failure. |
| Release archive | Passed: portable ZIP paths, required assets, integrity check, and SHA-256 sidecar. |
| Full Vitest suite | Blocked: worker startup repeatedly timed out before any tests executed. No full unit-suite pass is claimed. |

The package is prepared; full regression sign-off remains pending until `npm test` can run successfully. The normal unit tests and new regression cases remain in the repository for that check.

## Included

- 12 missions across independent delivery, reliability, and production ownership.
- Concrete assignments, review criteria, stretch challenges, and 15/30/60-minute session plans.
- An offline evidence journal with automatic draft saving, completion checks, and reopening.
- Markdown evidence export and journal support in normal JSON backup export/import.
- Bookmarkable related-deck searches.
- Batched backup restoration and sync-queue updates, preserving merge and rollback behavior.
- Related introductions spaced 1, 3, then 7 calendar days apart, with due reviews unchanged.
- JSON backup restoration up to 100 MB for the larger library.

Practice completion is self-reviewed work evidence. It does not change flashcard schedules or certify a job level.

## Curriculum v8 verification — 2026-09-07

| Check | Result |
| --- | --- |
| Content integrity | Passed for all 13,609 cards: unique IDs/prompts, valid Markdown, source credits, practical scope, 75 deck counts, and 42 bounded offline packs. |
| Runtime contracts | Passed: actual curriculum loading, family mapping, two answer views, 1/3/7-day spacing, local-day boundaries, undo, learning retries, due reviews, follow-up priority, and mixed-queue deduplication. |
| Interrupted installation | Passed: failure after a completed batch rolls back cards, decks, sync queue, and the curriculum version marker. |
| Production build | Passed: TypeScript, Vite, and service-worker generation. |
| Desktop browser | Passed: full-library install, v6 upgrade with edited cards/schedules/deletions retained, complete backup restoration, all 42 packs offline, and rating a new exercise. |
| Mobile browser | The same workflow passed in Chromium with the iPhone 13 viewport/profile, including no horizontal overflow. Physical iOS/Safari was not tested. |
| Archive | 58 files, 2,451,554 bytes, verified ZIP integrity and SHA-256 sidecar. |
| Full Vitest suite | Worker startup still times out before executing tests. The runtime and browser checks above passed independently; no full unit-suite pass is claimed. |

Large installations now write 500-card batches within one atomic transaction and show preparation/saving progress. JSON backup imports allow up to 100 MB. Browser verification ran with normal filesystem access and continuous tracing disabled after sandboxed, traced storage writes exceeded the startup timeout.

## Single-user operation

No account or backend is needed. Journal entries are stored in this browser and included in JSON backups; they are not included in optional Supabase sync. Export a JSON backup before replacing a deployed version or moving devices. Markdown evidence reports are for reading, not restoration.

The package now ships curriculum v8: 13,609 cards (4.86x v6), including 10,810 related retrieval variations. All 75 decks receive additional practice. The generated packs and family index are included for offline use. Original card IDs and progress remain unchanged; the v8 marker installs missing additions on upgrade. The unused external-source candidate bank is not shipped.

## Verify and package

Run from the repository root with Node 22.13+ or Node 24+:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The build produces `dist/`. Run `python scripts/package-release.py` to create a ZIP with portable paths, validate its required assets and integrity, and write a SHA-256 checksum in `release/`. The browser tests use the production preview and cover mobile and desktop. The practice browser test covers offline completion/reopening, persisted search, evidence download, JSON backup, and restoration into a fresh profile.

Serve `dist/` from an HTTPS static host using the included Netlify/Vercel configuration. Preserve the SPA fallback for deep links and the no-cache policy for `sw.js`. Publishing is a separate action.

## Recovery

Keep the previous deployed build and a separate JSON backup. Reverting the deployed files restores the previous app version; it does not automatically revert browser data. This release adds journal records to the existing metadata store without a database schema migration. Older app versions will not display those records, so retain the full backup and use this release to restore the journal.

After deployment, open the app online, verify the existing decks and progress, complete a short review, and check a saved mission. Reload once before testing offline behavior so the new service worker controls the page.
