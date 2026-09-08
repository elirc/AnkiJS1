# Comprehensive expansion

This expansion starts from the shipped v12 library: 7,034 cards, 276 guided lessons, and 16 engineering missions. The v13 totals are 21,102 cards, 828 guided lessons, and 48 missions, a threefold increase in each overall count. The generated `comprehensive-manifest.json` records totals and per-deck additions. Topic availability determines distribution; individual decks do not all have the same multiplier.

## Content and provenance

New reference cards use distinct, complete sections from pinned documentation. New guided cards combine explanations and worked examples from one source article. Their constituent sections are not also counted as separate new reference cards. The 32 new missions are original practical assignments with steps, evidence criteria, review questions, and stretch work.

The collection combines pinned MDN, .NET, and GitHub archives with the existing pinned freeCodeCamp, React, ASP.NET Core, and Entity Framework cache. Archives are read without extracting or executing their contents. License notices remain available offline; each adapted card identifies its source and applicable license.

The generator uses Markdown syntax trees and a YAML parser. It preserves code, removes site-only template wrappers, resolves supported documentation references, corrects React documentation URLs, and excludes incomplete includes, navigation-only fragments, unresolved directives, unstable API metadata, puzzle material, and repeated explanations. Guided pages retain their source section headings. Sampling also corrected imprecise JSX props-spread wording. Imported code is teaching material, not code the generator executes.

## Preservation and loading

New cards have source-derived `a4000000-` identities. Existing cards and mission IDs remain intact. The installer preserves personal edits, scheduling, review history, and deletion markers. New packs are bounded below 600 KB and use the existing lazy loader and offline cache. The larger mission list supports search and stage filtering.

## Verification scope

- `npm run content:check`: complete inventory, identities, prompts, answer formatting, source pins, credits, lesson composition, deck counts, and growth bounds.
- `npm run content:runtime`: actual loading and IndexedDB installation, upgrades, personal edits, review history, repeat startup, backup restoration, and rollback.
- `npm run typecheck` and `npm run build`: TypeScript and production/PWA compilation.
- `node scripts/check-comprehensive-ui.mjs`: fresh installation, offline study, mission search, persisted evidence, and desktop/390px/320px layouts against the production preview.

Structural checks cover the complete library. Semantic review is sampled; this is not a claim that every imported example has been independently executed or every statement manually re-authored. The final task report records tests that actually completed and runner limitations.

## Final verification (2026-09-08)

The complete content checks, TypeScript compilation, production/PWA build, and whitespace diff check passed. Playwright installed all 21,102 cards, verified all 62 new packs were cached, and exercised references, three-page guided lessons, mission filtering, and persistent mission evidence offline. Desktop, 390px, and 320px layout checks passed with no page errors; representative screenshots were visually inspected.

The standalone `npm run content:runtime` harness completed successfully: concurrent fresh installs, v10/v12 upgrades, v9 wording corrections, schedules and review history, personal edits and deletion markers, repeated-install idempotence, legacy retirement, backup restoration, and atomic rollback on an injected queue failure. Its v12 fixture represents a synced v12 library without pending entries for v13-only cards.

The last browser run measured 98,330 ms from navigation to the initial home screen and 6,686 ms for an offline return to the installed library. These are measurements on this host, not performance guarantees. Initial setup remains substantial. The small content-correction manifest is now imported before the database transaction, removing a module fetch from the saving phase.

Browser results are written to `artifacts/comprehensive-ui-results.json`; screenshots use the `artifacts/comprehensive-*.png` prefix. The production preview used `http://127.0.0.1:5184`, while the existing development origin remains `http://127.0.0.1:5182`. Browser storage is separate for each origin.

The Vitest suite could not start its worker on this host (both threads and forks were attempted). It did not execute tests and must not be reported as passing. The standalone database harness and real-browser checks provide separate integration coverage, not a substitute claim for that unit suite.

## Rebuilding

`npm run content:expand-all` refreshes the expansion from the pinned local archives and source cache. Generated packs and manifests are runtime inputs, so normal app builds do not download documentation. `npm run content:build` reconstructs the combined inventory. The parsed-source cache is invalidated when parsing rules, source snapshots, or retained baseline content change.
