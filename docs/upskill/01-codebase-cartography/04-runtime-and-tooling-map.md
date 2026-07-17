# Runtime And Tooling Map

## Tooling

| Tool | Evidence | Role |
| --- | --- | --- |
| npm | `package-lock.json`, `package.json:6-12` | Package manager and scripts. |
| Vite | `package.json:7-9`, `vite.config.ts:1-65` | Dev server and production bundler. |
| TypeScript strict | `tsconfig.json:2-24` | Static contracts. |
| Tailwind v4 plugin | `vite.config.ts:1-7`, `src/styles.css:1-33` | Styling. |
| Vitest/jsdom | `vite.config.ts:62-66`, `src/test/setup.ts:1-8` | Unit and UI tests. |
| vite-plugin-pwa | `vite.config.ts:8-58` | Service worker, manifest, share target. |

## Runtime Boundaries

- **Browser UI:** all React screens and components.
- **IndexedDB:** Dexie tables are local source of truth (`src/db/schema.ts:80-101`).
- **Service worker:** app shell precache; Supabase network requests are `NetworkOnly` (`vite.config.ts:13-19`).
- **Supabase:** optional remote sync target and auth provider (`src/db/sync/supabaseClient.ts:5-28`).
- **Postgres/RLS:** server-side ownership and LWW RPCs (`supabase/migrations/0001_init.sql:176-195`).

## Environment Variables

`.env.example` defines `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_VERSION`. The app boots without Supabase because `getSupabaseClient` returns `null` when either value is missing (`src/db/sync/supabaseClient.ts:5-19`).

## CI And Deployment

No repo-owned `.github`, Dockerfile, devcontainer, Makefile, or taskfile was found. Treat `npm test`, `npm run typecheck`, and `npm run build` as the local CI baseline until a workflow exists.

Drill: explain what can run while offline. Strong answer mentions React bundle/service worker, Dexie, repositories, SRS queue/rating, and outbox accumulation.
