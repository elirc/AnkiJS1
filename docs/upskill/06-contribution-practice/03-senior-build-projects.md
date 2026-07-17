# Senior Build Projects

## Project 1: Sync Reliability Hardening
Problem: current sync has minimal integration coverage.  
Value: trust multi-device behavior.  
Files: `src/db/sync/engine.ts`, `src/db/sync/merge.ts`, `supabase/migrations/0001_init.sql`.  
Plan: injectable client, tests for push/pull/error/cursor, missing-deck buffer.  
Security: keep RLS assumptions. Performance: batch behavior metrics. Rollback: feature-flag new engine.

## Project 2: Backup Validation And Migration Framework
Value: safer import/export and future schema changes.  
Files: `src/db/repos/dataRepo.ts`, `src/db/schema.ts`.  
Plan: versioned validators, migration docs, invalid backup UX.  
Tests: row validators, old backup migration, partial import rejection.

## Project 3: Study Session Domain Extraction
Value: make study behavior easier to reason about and test.  
Files: `src/features/study/StudyScreen.tsx`, new hook/service.  
Architecture decisions: what remains UI vs domain.  
Tests: queue re-entry, undo, keyboard, session end.

## Project 4: PWA Offline Acceptance Harness
Value: prove cold-load/capture/study offline.  
Files: `vite.config.ts`, possible Playwright config.  
Plan: add browser E2E that toggles network.  
Risks: service worker test flake. Rollback: keep as manual checklist if flaky.

## Project 5: Security Review And Hardening Pass
Value: reduce XSS/import/auth risks.  
Files: `MarkdownView.tsx`, `dataRepo.ts`, `auth.ts`, SQL migration.  
Plan: threat model, tests, dependency audit, docs.  
Stretch: CSP guidance for static hosting.

## Project 6: Observability For Sync
Value: know when sync is broken.  
Files: `engine.ts`, `SyncBadge.tsx`, `SettingsScreen.tsx`.  
Plan: attempt history in `sync_meta`, categorized errors, manual retry UX.  
Rollback: history table optional, keep existing badge.
