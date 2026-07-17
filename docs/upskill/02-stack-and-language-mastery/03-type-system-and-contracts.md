# Type System And Contracts

## Concept: Types Define Contracts Between Layers

TypeScript interfaces in `src/db/schema.ts` are not just editor help; they define persistence and sync contracts. Changing them affects Dexie, import/export, Supabase SQL, merge logic, and tests.

**Repo anchors:**
- Domain types: `src/db/schema.ts:5-78`
- Dexie schema: `src/db/schema.ts:80-101`
- Supabase tables: `supabase/migrations/0001_init.sql:1-58`
- Backup type: `src/db/repos/dataRepo.ts:6-13`

## Useful Type Patterns Here

| Pattern | Anchor | Why it matters |
| --- | --- | --- |
| String union | `src/db/schema.ts:15`, `src/db/schema.ts:40` | Limits allowed states/statuses. |
| Repository input object | `src/db/repos/cardRepo.ts:7-11` | Avoids positional argument drift. |
| Return type as contract | `src/srs/scheduler.ts:83-87` | Exposes pure domain result. |
| Type guard | `src/db/repos/dataRepo.ts:15-25` | Narrows `unknown` import input. |
| External adapter type conversion | `src/srs/scheduler.ts:49-76` | Keeps library shape from leaking everywhere. |

## Sharp Edges

- `importData` type guard is shallow; it checks arrays but not row field shapes (`src/db/repos/dataRepo.ts:15-25`).
- `mergeCard` has a cast after stripping server fields (`src/db/sync/merge.ts:5-8`); safe only if remote rows match expected shape.
- UI imports schema types for props (`src/features/inbox/ConvertNoteDialog.tsx:6`), which is acceptable, but UI should not import `db`.

## Drill

Design a type-safe `BackupParseResult`:

```ts
// Illustrative fake code: not from this repo.
type BackupParseResult =
  | { ok: true; value: RecallBackup }
  | { ok: false; reason: string };
```

Self-grade:
- Basic: avoids `any`.
- Solid: validates all four arrays.
- Strong: validates row ids, timestamps, enum values, and migration version.
