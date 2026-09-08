# Content and implementation review

This document records the v10 quality pass. The current v12 expansion is documented in [Library expansion](LIBRARY-EXPANSION.md). The v10 install marker ensured that existing v9 installations received the completed correction pass; v12 retains those protections.

## Findings and corrections

1. **Generated drills had no defensible acceptance criterion.** The old generator hid arbitrary four-word spans, including `runtime validation before treating`, and implementation lines without a specified target behavior. A valid alternate answer could not reliably be judged against the back. Version 9 replaces that generated layer with authored scenarios. Historical packs stay checked in for audit and migration fixtures but are excluded from the runtime import glob.
2. **Quantity tests rewarded the defect.** The old integrity checks required four to five times the baseline card count. They could pass for thousands of weak variations. Checks now enforce stable identities, complete content, accurate deck counts, retained attribution, no retired cards, and the structure of the new scenarios.
3. **Editing bundled JSON did not correct existing installations.** Installation only adds absent IDs. The quality migration uses explicit shipped IDs plus SHA-256 fingerprints of the exact original question and answer. It hides untouched legacy drills, preserves personally edited versions, and leaves review logs and scheduling fields intact. Startup, backup imports, and cloud pulls use the existing retirement entry point. Card retirement and installation participate in the same transaction.
4. **The earlier loading change weakened offline behavior.** Excluding required curriculum assets from precache left offline installation and recovery without those assets. Required assets are precached again; the much larger archived retrieval packs are no longer emitted by the app build. Route lazy loading and the separate dashboard practice summary are retained.
5. **The rebuild path could restore rejected material.** The content builder now compiles authored scenario records with stable keys. The old retrieval command redirects to that builder, and the base-curriculum rebuild invokes the current builder and checker.

## New material

Fourteen older adapted cards were also rewritten, covering serialization with missing dependencies, unsafe HTML stripping, disclosures, tabs, accordion expanded state, empty carousels, tag entry, tooltips, and save errors. Source-site code-tab wrappers are removed throughout the retained library. Exact previous-content comparisons apply those corrections to existing installations without replacing personal wording or resetting scheduling.

72 scenarios cover JavaScript and TypeScript, React state and request races, API ownership and retries, SQL correctness and concurrency, browser persistence and offline behavior, testing, delivery, C# async behavior, EF Core, and beginner and follow-on CRUD work. Four new missions cover search races, first-use performance, conflicting edits, and technical content review. Existing mission IDs and evidence requirements remain stable.

The active library contains 2,799 retained base cards plus 72 scenarios. Its smaller total is intentional: removing repeated phrase drills improves the practice set and reduces download, parsing, storage, and sync work. `src/data/content-quality-report.json` records exact inventory and source byte counts; byte reductions are not a substitute for browser timing measurements.

## Review scope

All 42 generated retrieval packs were assessed through their construction rules and structural inventory. All active cards and all 276 guided lessons receive structural checks. Semantic review covered the original curriculum, the new scenarios, representative authored and adapted material, and the content generation, installation, retirement, scheduling, practice persistence, route-loading, and offline packaging paths.

This is not a claim that every retained third-party example has been executed or that every past implementation is defect-free. Existing source attribution is preserved. Model provenance was not used as a quality criterion.

## Technical references

- [React: synchronizing with effects](https://react.dev/learn/synchronizing-with-effects) supports stale-response cleanup and effect lifetime review.
- [MDN: fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch) distinguishes HTTP errors from rejected fetch promises.
- [PostgreSQL: transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html) documents concurrency behavior and conditional updates.
- [EF Core: DbContext lifetime](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/) explains context scope and unsupported concurrent operations.
- [EF Core: concurrency conflicts](https://learn.microsoft.com/en-us/ef/core/saving/concurrency) supports the stale-edit exercise.
- [EF Core: tracking](https://learn.microsoft.com/en-us/ef/core/querying/tracking) explains why editing an untracked object does not persist automatically.
- [C#: async return types](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types) supports the Task versus async-void exercise.
- [WAI-ARIA accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/), [tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), and [tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) patterns support the rewritten interaction exercises.
- [MDN: textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent) and [details](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details) support the text-display and native disclosure corrections.

Run `npm run content:build`, `npm run content:check`, the curriculum and retirement tests, and a production build after changing the material. Upgrade tests must cover edited content, reviewed content, moved cards, deleted cards, repeated startup, old backups, and transaction failure.

The local Vitest run timed out while starting its worker. The direct `npm run content:runtime` checks exercise real Dexie transactions without that worker, including the upgrade from v9, personal-edit preservation, backup restoration, and atomic rollback. Browser checks cover installation, preservation of edits and scheduling, scenario study, and responsive layouts. See the final validation results for any environment-specific limits; structural content checks do not prove every retained third-party example correct.
