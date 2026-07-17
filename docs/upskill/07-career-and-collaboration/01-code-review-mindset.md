# Code Review Mindset

Review layers:
1. Does it work?
2. Is it correct under edge cases?
3. Will it stay correct?
4. Does it fit this codebase?
5. Is it kind to future maintainers?

## Repo-Specific Checklist

- Does UI write through repositories? (`src/db/repos/*.ts`)
- Are timestamps/outbox updated for synced rows?
- Are Dexie transactions used for multi-row invariants?
- Are queue/merge/scheduler rules tested as pure functions?
- Does sync respect push order and cursor safety?
- Does Supabase access enforce `user_id`/RLS?
- Does Markdown/import handle untrusted input?
- Are tests fixed-time and isolated?

## Good Review Comments

> I think this should stay behind `cardRepo.applyReview` because that function owns the card/log/outbox transaction (`src/db/repos/cardRepo.ts:46-55`). Could we add the new field there and cover it in the existing repo test?

> This looks correct for the happy path. The risk is import accepting malformed row shapes (`src/db/repos/dataRepo.ts:15-25`). Can we add one invalid backup test before merging?
