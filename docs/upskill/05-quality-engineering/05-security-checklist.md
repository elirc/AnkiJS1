# Security Checklist

| Risk | Current posture | Anchors | Pre-merge question |
| --- | --- | --- | --- |
| Authorization/IDOR | Supabase RLS and pull uid filter. | `supabase/migrations/0001_init.sql:176-188`, `src/db/sync/engine.ts:146-150` | Can another user read/write this row? |
| XSS | Markdown skips raw HTML. | `src/components/MarkdownView.tsx:13-16` | Are link/image URLs safe? |
| CSRF | No cookie-auth API routes in app. | N/A | Did we add server endpoints? |
| SQL injection | Supabase client/RPC, no raw SQL in app. | `src/db/sync/engine.ts:120-130` | Did SQL migration interpolate user input? |
| Command injection | No shelling out in app. | N/A | Did any feature add command execution? |
| Secrets | Env keys are Vite public anon keys. | `.env.example`, `src/db/sync/supabaseClient.ts:7-8` | Did a secret get committed? |
| File uploads | Import JSON only. | `src/features/settings/SettingsScreen.tsx:123-127` | Is file type/shape validated deeply? |
| Open redirects | Magic link redirects to origin. | `src/db/sync/auth.ts:40-43` | Is redirect controlled by user input? |
| Dependency risk | JS dependencies in lockfile. | `package-lock.json` | Any new package necessary? |
| Rate limiting | Not implemented client-side. | N/A | Does this feature spam Supabase/email? |

## What A Junior Might Miss

Client-side filters are not authorization. RLS is the security boundary.

## What A Senior Checks

Threat model per feature, testable authorization, least privilege, rollback plan, and safe handling of untrusted import/markdown content.
