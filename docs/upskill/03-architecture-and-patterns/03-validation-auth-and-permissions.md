# Validation, Auth, And Permissions

## Validation Layers

| Boundary | Current validation | Anchors | Risk |
| --- | --- | --- | --- |
| Capture save | Button disabled for blank body; repo trims. | `src/features/capture/CaptureScreen.tsx:27-35`, `src/db/repos/noteRepo.ts:13` | Programmatic calls can still pass blank string. |
| Card editor | Requires deck/front/back before save. | `src/features/cards/CardEditorScreen.tsx:37-46`, `src/features/cards/CardEditorScreen.tsx:134-141` | No max length. |
| Import JSON | Shallow backup shape guard. | `src/db/repos/dataRepo.ts:15-25` | Row fields not deeply validated. |
| Markdown | Raw HTML skipped. | `src/components/MarkdownView.tsx:13-16` | Link/image URL policies not restricted. |
| SQL enums | Server check constraints. | `supabase/migrations/0001_init.sql:27`, `supabase/migrations/0001_init.sql:39`, `supabase/migrations/0001_init.sql:52` | Local data can be malformed before sync. |

## Auth

Supabase client is optional (`src/db/sync/supabaseClient.ts:5-19`). Magic-link sign-in happens through `signInWithOtp` (`src/db/sync/auth.ts:37-45`). Local app state subscribes to auth changes (`src/db/sync/auth.ts:25-34`).

## Authorization

Server authorization is row-level: every synced table has RLS and a policy requiring `user_id = auth.uid()` (`supabase/migrations/0001_init.sql:176-188`). Pull also filters by `user_id` (`src/db/sync/engine.ts:146-150`).

## What A Junior Might Miss

- Local-only data has `user_id: null` and is valid until sign-in (`src/db/repos/cardRepo.ts:16`, `src/db/repos/noteRepo.ts:10`).
- UI validation is not enough for import or sync paths.
- IDOR prevention lives server-side in RLS, not just in client filters.

## What A Senior Checks

- Can a different signed-in user accidentally inherit local data? Adoption blocks mismatched existing user ids (`src/db/sync/auth.ts:55-69`).
- Are deletes protected by tombstones and RLS? SQL uses soft deletes and RLS.
- Are Markdown links/images safe enough for expected threat model? Investigate URL sanitization policy beyond `skipHtml`.

Drill: write a pre-merge checklist for a new "deck sharing" feature. Strong answer includes tenant/resource isolation and migration plan.
