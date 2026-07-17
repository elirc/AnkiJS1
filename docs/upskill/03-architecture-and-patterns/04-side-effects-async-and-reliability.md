# Side Effects, Async, And Reliability

## Side Effect Map

| Side effect | Trigger | Anchor | Reliability concern |
| --- | --- | --- | --- |
| IndexedDB write | Repository calls | `src/db/repos/*.ts` | Must be transactional with outbox when synced. |
| Sync event | Outbox enqueue | `src/db/sync/outbox.ts:14-17` | Event can be missed; outbox persists. |
| Supabase push | Sync loop | `src/db/sync/engine.ts:104-136` | Network failure leaves outbox. |
| Supabase pull | Sync loop | `src/db/sync/engine.ts:139-161` | Cursor correctness matters. |
| Magic link email | Settings sign-in | `src/db/sync/auth.ts:37-45` | External delivery not locally testable. |
| File download | Export JSON | `src/features/settings/SettingsScreen.tsx:22-31` | Large backups consume memory. |
| File import | Import JSON | `src/features/settings/SettingsScreen.tsx:33-42` | Bad shape can corrupt local DB if validation weak. |
| Service worker update | PWA register | `src/main.tsx:20-24`, `src/components/UpdateToast.tsx:3-21` | User must reload. |

## Reliability Concepts In This Repo

- **Idempotency:** outbox dedupes per table/row (`src/db/sync/outbox.ts:4-17`); review logs use ignore duplicates on push (`src/db/sync/engine.ts:119-122`).
- **Retries:** sync stores last error and backs off (`src/db/sync/engine.ts:80-87`).
- **Single-flight:** `running` prevents overlapping sync loops (`src/db/sync/engine.ts:55-60`).
- **Compensation:** undo restores card and removes local review log (`src/db/repos/cardRepo.ts:58-67`).
- **Failure visibility:** SyncBadge and settings read pending/error state (`src/components/SyncBadge.tsx:10-41`, `src/features/settings/SettingsScreen.tsx:17-20`).

## Risky Places To Investigate

- `ConvertNoteDialog` splits card creation and note conversion (`src/features/inbox/ConvertNoteDialog.tsx:32-43`).
- Pull skips a card if its deck is missing (`src/db/sync/engine.ts:186-187`).
- Server RPC calls are chunked but still parallel within chunks (`src/db/sync/engine.ts:128-130`).

Drill: design an idempotency test for pushing the same deck outbox entry twice.
