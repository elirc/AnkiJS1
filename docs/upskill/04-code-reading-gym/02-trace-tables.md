# Trace Tables

## UI-To-Persistence Trace: Capture

| Step | File/line | Value shape | Owner | Transformation | Risk |
| --- | --- | --- | --- | --- | --- |
| Textarea | `src/features/capture/CaptureScreen.tsx:42-57` | string | UI | user input | whitespace/empty |
| Save | `src/features/capture/CaptureScreen.tsx:27-35` | string | UI | calls repo | duplicate click |
| Note row | `src/db/repos/noteRepo.ts:6-17` | `Note` | Repo | id/timestamps/status | blank body if direct call |
| Transaction | `src/db/repos/noteRepo.ts:18-20` | note + outbox | Dexie | durable write | transaction scope |

## Persistence Trace: Review

| Step | File/line | Value shape | Owner | Transformation | Risk |
| --- | --- | --- | --- | --- | --- |
| Card before | `src/features/study/StudyScreen.tsx:67-70` | `Card` | UI | selected current | stale state |
| Scheduler | `src/srs/scheduler.ts:83-109` | `Card`, `ReviewLog` | Domain | FSRS update | API drift |
| Transaction | `src/db/repos/cardRepo.ts:46-55` | card/log/outbox | Repo | durable write | atomicity |
| Test | `src/db/repos/repos.test.ts:12-20` | assertions | Test | verifies rows | no rollback test |

## Auth/Permission Trace: Pull

| Step | File/line | Value shape | Owner | Transformation | Risk |
| --- | --- | --- | --- | --- | --- |
| Session | `src/db/sync/engine.ts:63-70` | `Session` | Sync | guard/no-op | missing env |
| Filter | `src/db/sync/engine.ts:146-150` | uid | Supabase query | `eq('user_id', uid)` | client bug |
| RLS | `supabase/migrations/0001_init.sql:176-188` | row policy | DB | ownership enforce | SQL misconfig |
| Merge | `src/db/sync/engine.ts:171-193` | remote row | Dexie | local put | missing deck |

## Error Trace: Sync Failure

| Step | File/line | Value shape | Owner | Transformation | Risk |
| --- | --- | --- | --- | --- | --- |
| Failure | `src/db/sync/engine.ts:120-132` | Supabase error | Sync | throw | partial group push |
| Catch | `src/db/sync/engine.ts:80-87` | message | Sync | store last_error/backoff | silent if UI hidden |
| UI | `src/components/SyncBadge.tsx:18-41` | sync state | Component | badge label | mobile label hidden |
| Settings | `src/features/settings/SettingsScreen.tsx:107-113` | last error | Screen | text display | no retry history |
