# Command Cheatsheet

| Command | Status | Purpose | Evidence |
| --- | --- | --- | --- |
| `npm install` | Inferred/standard | Install deps. | `package-lock.json` |
| `npm run dev` | Verified in prior build pass | Vite dev server. | `package.json:7` |
| `npm run build` | Verified in prior build pass | Typecheck + production build. | `package.json:8` |
| `npm run preview` | Inferred | Preview `dist`. | `package.json:9` |
| `npm test` | Verified in prior build pass | Vitest suite. | `package.json:10` |
| `npm run test:watch` | Inferred | Watch tests. | `package.json:11` |
| `npm run typecheck` | Verified in prior build pass | TypeScript check. | `package.json:12` |
| `supabase db push` | Inferred | Apply migrations if using CLI. | `supabase/migrations/0001_init.sql` |

No lint, formatting, Docker, codegen, or docs scripts are currently defined.
