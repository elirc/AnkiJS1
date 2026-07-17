# Writing PRs And RFCs

## PR Template

```md
## What changed
- 

## Why
- 

## How tested
- [ ] npm run typecheck
- [ ] npm test
- [ ] npm run build

## Risks
- 

## Follow-ups
- 
```

For UI work, include screenshots or describe mobile/desktop checks. For data/sync work, include migration and rollback notes.

## Commit Messages

Use concrete verbs: `Add import validation tests`, `Extract study session hook`, `Fix card merge tombstone handling`.

## When To Write An RFC

Write an RFC when changing schema, sync semantics, auth/account behavior, backup format, PWA caching, or public repository contracts.

## RFC Template

```md
# RFC: [Title]
## Problem
## Goals / Non-goals
## Current behavior with anchors
## Proposal
## Alternatives
## Migration plan
## Test plan
## Security and privacy
## Performance
## Rollout / rollback
## Open questions
```
