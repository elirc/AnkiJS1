# Tooling And Build System

## Commands

| Command | Evidence | Purpose |
| --- | --- | --- |
| `npm run dev` | `package.json:7` | Vite dev server. |
| `npm run build` | `package.json:8` | TypeScript + production/PWA build. |
| `npm run preview` | `package.json:9` | Serve built output. |
| `npm test` | `package.json:10` | Vitest run. |
| `npm run test:watch` | `package.json:11` | Watch tests. |
| `npm run typecheck` | `package.json:12` | TypeScript only. |

## Build Pipeline

Vite loads Tailwind and PWA plugins (`vite.config.ts:1-8`). The PWA plugin generates manifest, icons, share target, precache, and service worker behavior (`vite.config.ts:8-58`). Vitest config lives in the same file (`vite.config.ts:62-66`).

## TypeScript Settings

Strict mode and `noUnused*` checks are enabled (`tsconfig.json:2-24`). `verbatimModuleSyntax` means type-only imports matter.

## Test Environment

Tests use jsdom and fake IndexedDB (`vite.config.ts:62-66`, `src/test/setup.ts:1-8`). This makes repository and UI tests run without a real browser IndexedDB.

## Drill

Run `npm run typecheck`. If it fails, categorize the failure:
- Type contract mismatch.
- Module syntax/import issue.
- Unused code.
- Runtime type gap exposed by static analysis.
