# Library expansion v12

The library grows from 2,871 to 7,034 cards across the same 75 decks: 4,163 additions, or 2.45x the previous total. The 72 authored scenarios and 16 engineering missions remain intact. Additions are attributed source material, not newly authored original lessons.

## Selection

The pinned candidate collection is defined in `scripts/section-sources.json`. `scripts/expand-library.mjs` selects topic-matched reference passages and knowledge checks. It excludes masked-line exercises, repeated questions, unsupported source components, dangling introductions to missing examples, external lesson dependencies, and material outside the practical curriculum. Multiple-choice answers retain their complete option text and the source lesson context, not keyword-selected paragraph fragments.

Source-backed identities use an independent `a3000000-` namespace derived from stable source keys. Twenty-two bounded chunks keep each content asset below 600 KB. `library-expansion-manifest.json` records source counts, section additions, exclusions, and the exact multiplier. The existing installer adds missing identities under a v12 marker; it does not overwrite saved wording or reset scheduling. This marker also upgrades draft v11 installations with the final TypeScript corrections.

## Attribution

Each adapted answer links to its pinned source and license. Full source license notices are shipped in `public/licenses` and included in offline precaching. MDN adaptations retain CC BY-SA 2.5 for prose, with the source's separate code licenses. Microsoft, React, and GitHub prose retains CC BY 4.0; applicable code notices remain attached. freeCodeCamp material retains BSD-3-Clause. Attribution does not imply endorsement.

## Verification scope

Structural checks cover every active card, identities, duplicate questions, complete multiple-choice keys, pinned source files, source notices, chunk limits, section counts, and exclusion of retired drills. Runtime checks cover fresh installation, full-library v10 upgrades, draft v11 corrections, personal edits, schedules, review history, repeated startup, old backups, and multi-batch failure rollback. Browser checks exercise new reference and knowledge-check cards offline, license availability, and desktop/mobile layouts.

Semantic sampling identified and excluded excerpts whose promised examples were absent, and removed document-only heading anchors. A TypeScript lesson was corrected against [Node.js documentation](https://nodejs.org/api/typescript.html) to distinguish browser execution, type stripping, and type checking. Exact previous-text comparisons apply those corrections to existing installations without overwriting personal edits.

This is not a claim that every retained third-party example was executed or that every source statement has been individually reviewed. This expansion is deliberately source-backed; executable example validation remains a separate task.
