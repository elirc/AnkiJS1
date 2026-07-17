# Observability And Operations

## Current Signals

| Signal | Anchor | What it tells you |
| --- | --- | --- |
| Sync phase | `src/db/sync/engine.ts:7-21`, `src/components/SyncBadge.tsx:10-41` | idle/pushing/pulling/error. |
| Last sync time | `src/db/sync/engine.ts:76` | last successful sync. |
| Last error | `src/db/sync/engine.ts:80-83`, `src/features/settings/SettingsScreen.tsx:107-113` | sync failure message. |
| Pending outbox | `src/db/sync/outbox.ts:36-37` | unsynced local changes. |
| PWA update available | `src/main.tsx:20-24`, `src/components/UpdateToast.tsx:3-21` | service worker waiting. |

## How Would I Know This Broke?

- Capture broken: note not in IndexedDB/inbox; capture test fails.
- Study broken: review log count does not increase; study smoke test fails.
- Sync broken: outbox grows, `last_error` set, remote rows absent.
- Import broken: settings message shows error or app crashes after import.
- PWA broken: build still passes but Lighthouse/install/share target manual test fails.

## Gaps

No structured logging, metrics, tracing, health checks, deployment pipeline, or alerting exist. For v1 local-first app, this is acceptable; for multi-device production, add sync attempt logs and error categorization.
