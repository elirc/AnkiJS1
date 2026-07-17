# Annotation Drills

For each excerpt, write: inputs, outputs, dependencies, invariants, side effects, failure modes.

| Drill | Excerpt | Prompt |
| --- | --- | --- |
| 1 | `src/db/repos/noteRepo.ts:6-21` | Why must note and outbox be one transaction? |
| 2 | `src/db/repos/cardRepo.ts:46-55` | Mark every persisted row changed by review. |
| 3 | `src/db/repos/deckRepo.ts:47-60` | Explain cascade soft delete and outbox blast radius. |
| 4 | `src/srs/queue.ts:11-37` | Annotate filtering, ordering, and new-card limit. |
| 5 | `src/srs/scheduler.ts:49-76` | Identify adapter boundary to `ts-fsrs`. |
| 6 | `src/db/sync/merge.ts:32-65` | Split content group and SRS group fields. |
| 7 | `src/db/sync/engine.ts:104-136` | Explain push order, batching, and error behavior. |
| 8 | `src/db/sync/auth.ts:55-94` | Trace local-only adoption and account-mixing guard. |
| 9 | `src/features/study/StudyScreen.tsx:67-95` | Trace rating and undo state. |
| 10 | `src/features/settings/SettingsScreen.tsx:22-42` | Explain export/import user flow and risks. |

## Self-Grading Rubric

- Basic: identifies function purpose and inputs.
- Solid: names side effects and invariants.
- Strong: predicts a realistic bug and proposes a focused test.

## Example Annotation Shape

```text
Excerpt: src/db/repos/cardRepo.ts:46-55
Input: cardAfter, log
Output: none, but DB changes
Dependencies: Dexie tables, nowISO, enqueueOutbox
Invariant: card update and log insert must commit together
Side effects: writes cards, review_logs, outbox
Failure mode: writing card without log corrupts review history
Test: repos.test.ts:12-20
```
