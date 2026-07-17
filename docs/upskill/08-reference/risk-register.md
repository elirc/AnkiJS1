# Risk Register

| Risk | Evidence | Impact | Likelihood | Suggested test | Suggested fix | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| Shallow import validation | `src/db/repos/dataRepo.ts:15-25` | Corrupt local data | Medium | invalid row import | deep validators | High |
| Missing auth adoption tests | `src/db/sync/auth.ts:55-94` | Account mixing regression | Medium | foreign user rows | unit tests | High |
| Note conversion not atomic | `ConvertNoteDialog.tsx:32-43` | Note/card mismatch | Low/Med | simulated failure | repo transaction helper | Medium |
| Missing-deck card skipped on pull | `src/db/sync/engine.ts:186-187` | Lost remote card until later pull | Medium | out-of-order pull | buffer/retry | Medium |
| Markdown URL policy unclear | `src/components/MarkdownView.tsx:13-16` | XSS/phishing | Medium | malicious URL test | URL allowlist | Medium |
| No CI | no repo-owned `.github` found | Regressions merge | Medium | N/A | add workflow | High |
| RPC per row sync | `src/db/sync/engine.ts:123-130` | slow large sync | Low now | batch timing | bulk RPC | Medium |
| Study queue in UI | `src/features/study/StudyScreen.tsx:33-47` | hard-to-test growth | Medium | session tests | extract hook | Medium |
| PWA offline untested | `vite.config.ts:8-58` | install/offline regression | Medium | Playwright/manual | E2E checklist | Medium |
| No deep schema migration plan | `src/db/schema.ts:90-97` | upgrade risk | Medium | old DB fixture | Dexie migration docs | High |
