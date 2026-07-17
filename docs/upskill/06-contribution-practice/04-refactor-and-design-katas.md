# Refactor And Design Katas

1. **Boundary leak:** find any production UI import from `db/schema` that is a value, not a type. Propose lint rule. Strong: minimal config and migration path.
2. **Outbox change:** design operation-based outbox for review logs. Strong: explains why row snapshot is insufficient for some domains.
3. **Split module:** extract study session logic from `StudyScreen.tsx:23-166`. Strong: preserves behavior with tests.
4. **Remove duplication:** compare deck summary code in home/list screens (`HomeScreen.tsx:11-18`, `DeckListScreen.tsx:10-13`). Strong: avoids premature abstraction.
5. **Improve type safety:** replace shallow backup guard. Strong: unknown input stays unknown until validated.
6. **Design migration:** add `tags` to cards. Strong: covers Dexie, SQL, import/export, merge, tests.
7. **Reduce N+1:** audit repo reads for loops. Strong: proves measured issue before changing.
8. **Write RFC:** propose sync reliability hardening. Strong: includes rollout/rollback and open questions.
9. **Review flawed PR:** use katas in `04-code-reading-gym/04-review-katas.md`.

Self-grade: Basic identifies target; Solid proposes tests; Strong reduces risk and avoids churn.
