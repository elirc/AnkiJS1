# Recall .NET Rebuild Plan

This folder is documentation only. It describes how to rebuild the existing Recall PWA in C# and .NET without changing the current React/TypeScript implementation.

Start here:

1. [recall-dotnet-rebuild-spec.md](recall-dotnet-rebuild-spec.md) - detailed product, architecture, data, sync, API, UI, security, and testing specification.
2. [implementation-plan.md](implementation-plan.md) - staged implementation plan, work breakdown, acceptance criteria, risks, and migration checklist.

The plan is grounded in the current app:

- Routes are currently declared in [`../src/main.tsx`](../src/main.tsx).
- Domain types are currently in [`../src/db/schema.ts`](../src/db/schema.ts).
- Local repository behavior is currently in [`../src/db/repos`](../src/db/repos).
- SRS queue and scheduling are currently in [`../src/srs`](../src/srs).
- Sync behavior is currently in [`../src/db/sync`](../src/db/sync).
- Server schema/RLS concepts are currently in [`../supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

No .NET project files are created here. This is a planning artifact for a future rebuild.
