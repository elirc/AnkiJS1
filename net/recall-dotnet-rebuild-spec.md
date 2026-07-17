# Recall .NET Rebuild Specification

## 1. Executive Summary

Recall is currently a local-first, offline-capable spaced-repetition PWA built with React, Vite, TypeScript, Dexie/IndexedDB, `ts-fsrs`, and optional Supabase sync. This document specifies a C#/.NET rebuild that preserves the same product behavior while moving the primary implementation to .NET.

The recommended rebuild target is:

- **Client:** Blazor WebAssembly PWA.
- **Server:** ASP.NET Core API hosted from the same origin as the PWA.
- **Shared contracts:** C# shared project for DTOs, validation contracts, and domain primitives.
- **Local storage:** IndexedDB through a small, explicit JS interop boundary. Browser IndexedDB still exists; .NET does not remove that browser constraint.
- **Server storage:** PostgreSQL through EF Core migrations, with server-side guarded upserts for sync conflict protection.
- **Auth:** ASP.NET Core Identity-style passwordless magic link with same-origin session cookies, or a swappable auth provider behind an auth service boundary.
- **SRS:** Native C# FSRS implementation or vetted NuGet package behind a `ISrsScheduler` adapter, with golden-master tests against the current TypeScript behavior.

The rebuild should not be a line-by-line port. It should preserve product invariants:

1. Capture and study work offline.
2. Local browser storage is the source of truth on the device.
3. Sync is a side effect that can fail without blocking local work.
4. UI never owns persistence timestamps or sync bookkeeping.
5. Review rating is atomic: card state, review log, and outbox intent are written together.
6. Conflict resolution preserves independent card content edits and SRS updates.

## 2. Current App Inventory

The .NET rebuild should preserve these existing surfaces:

| Current concern | Current location | .NET rebuild equivalent |
| --- | --- | --- |
| Routes | [`../src/main.tsx`](../src/main.tsx) | Blazor routeable components under `Recall.Client/Pages` |
| Shell/navigation | [`../src/App.tsx`](../src/App.tsx) | `MainLayout.razor`, `NavMenu.razor`, `SyncBadge.razor` |
| Domain types | [`../src/db/schema.ts`](../src/db/schema.ts) | `Recall.Domain/Models/*.cs` and `Recall.Contracts/*.cs` |
| Local DB schema | [`../src/db/schema.ts`](../src/db/schema.ts) | IndexedDB schema metadata and typed stores |
| Local repositories | [`../src/db/repos`](../src/db/repos) | `Recall.Client/Data/Repositories/*` |
| SRS scheduler | [`../src/srs/scheduler.ts`](../src/srs/scheduler.ts) | `Recall.Domain/Srs/FsrsScheduler.cs` |
| Study queue | [`../src/srs/queue.ts`](../src/srs/queue.ts) | `Recall.Domain/Srs/StudyQueueBuilder.cs` |
| Sync engine | [`../src/db/sync/engine.ts`](../src/db/sync/engine.ts) | `Recall.Client/Sync/SyncEngine.cs` plus server sync API |
| Merge logic | [`../src/db/sync/merge.ts`](../src/db/sync/merge.ts) | `Recall.Domain/Sync/MergePolicy.cs` |
| Supabase SQL | [`../supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) | EF Core migrations plus optional raw SQL guarded upsert functions |
| Tests | [`../src/**/*.test.ts`](../src) | xUnit/NUnit, bUnit, Playwright, Testcontainers |

## 3. Product Scope

### 3.1 Required User Modes

The rebuild must preserve the three core modes:

1. **Quick Capture**
   - One textarea.
   - Save button and Ctrl/Cmd+Enter.
   - Offline save to local IndexedDB.
   - Share target support through PWA manifest and query parsing.

2. **Triage and Author**
   - Inbox list.
   - Edit note body.
   - Archive/delete note.
   - Convert note to one or more cards.
   - Store `note_id` provenance on created cards.

3. **Study**
   - Build due queue from local cards.
   - Show front, reveal answer, rate Again/Hard/Good/Easy.
   - Rating works offline.
   - Review writes are queued for sync.
   - Single-level undo.

### 3.2 Required Sync/Auth Behavior

- Signed out: app runs local-only.
- Signed in: local rows with `UserId == null` are adopted by the signed-in account.
- Different-user local data: block sign-in flow until user erases local data or cancels.
- Push order: decks -> notes -> cards -> review logs.
- Pull order: decks -> notes -> cards -> review logs.
- Pull cursor: server-clocked `ServerUpdatedAt`, not client-clocked `UpdatedAt`.
- Card conflict resolution: content fields and SRS fields merge independently.
- Deletes are soft tombstones.

### 3.3 Non-Goals For First .NET Rebuild

- No shared decks.
- No collaborative editing.
- No native MAUI app.
- No Anki `.apkg` import.
- No image upload pipeline.
- No FSRS optimization training.

## 4. Recommended .NET Solution Structure

Use a hosted Blazor WebAssembly layout. Keep domain logic independent from Blazor and ASP.NET.

```text
Recall.sln
src/
  Recall.Client/
    Pages/
    Components/
    Data/
      IndexedDb/
      Repositories/
    Sync/
    Auth/
    Pwa/
    wwwroot/
      manifest.webmanifest
      service-worker.js
  Recall.Server/
    Program.cs
    Endpoints/
      AuthEndpoints.cs
      SyncEndpoints.cs
      ExportImportEndpoints.cs optional
    Persistence/
      RecallDbContext.cs
      Migrations/
    Services/
      Sync/
      Auth/
      Email/
      Time/
  Recall.Domain/
    Models/
    Srs/
    Sync/
    Validation/
  Recall.Contracts/
    Dtos/
    Sync/
    Backup/
tests/
  Recall.Domain.Tests/
  Recall.Client.Tests/
  Recall.Server.Tests/
  Recall.E2E.Tests/
```

### 4.1 Dependency Rules

```text
Recall.Client -> Recall.Contracts, Recall.Domain
Recall.Server -> Recall.Contracts, Recall.Domain
Recall.Server -> EF Core, ASP.NET Core Identity/email providers
Recall.Domain -> no Blazor, no ASP.NET Core, no EF Core, no JS interop
Recall.Contracts -> no framework dependencies beyond base .NET
```

The dependency rules matter. They keep queueing, merge, validation, and scheduling testable without a browser or server.

## 5. Technology Choices

### 5.1 Client

Use **Blazor WebAssembly PWA** for a C# client. This keeps most UI/application code in C#, but browser APIs still require JS interop.

Required browser interop:

- IndexedDB CRUD and indexes.
- PWA share target query parsing.
- Network status events.
- Service worker update events.
- File download/upload for export/import JSON.
- Optional local notification APIs later.

Do not hide interop in random components. Create explicit services:

```text
Recall.Client/Data/IndexedDb/IIndexedDbStore.cs
Recall.Client/Browser/INetworkStatus.cs
Recall.Client/Pwa/IServiceWorkerUpdateService.cs
Recall.Client/Files/IFileDownloadService.cs
```

### 5.2 Server

Use **ASP.NET Core** with minimal APIs or route groups. Minimal APIs are a good fit because the surface is small:

- Auth session endpoints.
- Magic link endpoints.
- Sync push/pull endpoints.
- Optional health endpoint.

### 5.3 Persistence

Client:

- IndexedDB remains the browser database.
- Define schema version and migrations explicitly.
- Store typed JSON records per table.

Server:

- PostgreSQL through EF Core.
- Use migrations.
- Use database-generated `ServerUpdatedAt`.
- Implement guarded upserts either with raw SQL functions or transactional EF/SQL `UPDATE ... WHERE`.

### 5.4 Auth

Recommended default:

- Same-origin hosted app.
- ASP.NET Core cookie auth.
- Passwordless magic link.
- HttpOnly secure cookies.
- Antiforgery token for mutating API requests if cookies are used.

Alternative:

- JWT bearer tokens stored using a hardened browser strategy. This is harder to secure well in a PWA and should be chosen only with a clear threat model.

### 5.5 Markdown

Use:

- `Markdig` for Markdown rendering.
- HTML disabled or sanitized.
- `Ganss.Xss` or equivalent if any HTML is allowed later.

For v1, keep raw HTML disabled. This matches the current `ReactMarkdown skipHtml` behavior in [`../src/components/MarkdownView.tsx`](../src/components/MarkdownView.tsx).

### 5.6 Styling

Options:

1. Keep Tailwind via build pipeline in Blazor.
2. Use CSS variables and hand-authored component CSS.

Recommendation: keep the same design tokens and use CSS variables plus scoped/component CSS first. Tailwind in Blazor is possible but adds Node tooling back into the .NET rebuild. If the goal is primarily C#/.NET, avoid requiring a JS build tool unless the team already wants it.

## 6. Domain Model

Use `DateTimeOffset` for all timestamps. Serialize as ISO 8601 UTC.

### 6.1 C# Domain Types

```csharp
public sealed record Deck
{
    public required Guid Id { get; init; }
    public Guid? UserId { get; init; }
    public required string Name { get; init; }
    public int NewPerDay { get; init; } = 10;
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
    public DateTimeOffset? DeletedAt { get; init; }
}

public enum CardState
{
    New,
    Learning,
    Review,
    Relearning
}

public sealed record Card
{
    public required Guid Id { get; init; }
    public Guid? UserId { get; init; }
    public required Guid DeckId { get; init; }
    public Guid? NoteId { get; init; }
    public required string Front { get; init; }
    public required string Back { get; init; }
    public bool Suspended { get; init; }

    public required DateTimeOffset Due { get; init; }
    public double Stability { get; init; }
    public double Difficulty { get; init; }
    public double ElapsedDays { get; init; }
    public double ScheduledDays { get; init; }
    public int Reps { get; init; }
    public int Lapses { get; init; }
    public CardState State { get; init; }
    public DateTimeOffset? LastReview { get; init; }

    public required DateTimeOffset ContentUpdatedAt { get; init; }
    public required DateTimeOffset SrsUpdatedAt { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? DeletedAt { get; init; }
}

public enum NoteStatus
{
    Inbox,
    Converted,
    Archived
}

public sealed record Note
{
    public required Guid Id { get; init; }
    public Guid? UserId { get; init; }
    public required string Body { get; init; }
    public NoteStatus Status { get; init; } = NoteStatus.Inbox;
    public IReadOnlyList<Guid> CardIds { get; init; } = [];
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
    public DateTimeOffset? DeletedAt { get; init; }
}

public sealed record ReviewLog
{
    public required Guid Id { get; init; }
    public Guid? UserId { get; init; }
    public required Guid CardId { get; init; }
    public required ReviewRating Rating { get; init; }
    public required CardState StateBefore { get; init; }
    public required DateTimeOffset DueBefore { get; init; }
    public double StabilityAfter { get; init; }
    public double DifficultyAfter { get; init; }
    public double ScheduledDaysAfter { get; init; }
    public required DateTimeOffset ReviewedAt { get; init; }
}

public enum ReviewRating
{
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4
}
```

### 6.2 Local-Only Tables

```csharp
public sealed record OutboxEntry
{
    public long? Id { get; init; }
    public required SyncTableName TableName { get; init; }
    public required Guid RowId { get; init; }
    public required DateTimeOffset QueuedAt { get; init; }
}

public enum SyncTableName
{
    Decks,
    Cards,
    Notes,
    ReviewLogs
}

public sealed record SyncMeta
{
    public required string Key { get; init; }
    public required string Value { get; init; }
}
```

### 6.3 Naming Policy

Use C# PascalCase internally. Serialize API JSON with camelCase.

If the .NET app must import backups from the existing TypeScript app, support the existing snake_case backup format as a compatibility input:

- `deck_id` -> `deckId`
- `user_id` -> `userId`
- `content_updated_at` -> `contentUpdatedAt`
- `srs_updated_at` -> `srsUpdatedAt`

Do not silently drop unknown fields during import. Preserve unknown fields only if a future migration format explicitly supports them.

## 7. Local IndexedDB Design

### 7.1 Stores

Match the current stores:

```text
decks
cards
notes
review_logs
outbox
sync_meta
```

### 7.2 Indexes

Required client indexes:

| Store | Index | Use |
| --- | --- | --- |
| decks | id | primary lookup |
| decks | updatedAt | sync/merge diagnostics |
| decks | deletedAt | filtering |
| cards | id | primary lookup |
| cards | deckId | deck detail/study |
| cards | due | due queue |
| cards | state | queue grouping |
| cards | noteId | provenance |
| cards | deletedAt | filtering |
| cards | deckId+state | study queue |
| notes | id | primary lookup |
| notes | status | inbox |
| notes | updatedAt | sync |
| notes | deletedAt | filtering |
| review_logs | id | primary lookup |
| review_logs | cardId | history |
| review_logs | reviewedAt | daily new count |
| outbox | id | auto increment |
| outbox | tableName+rowId | dedupe |
| sync_meta | key | metadata |

### 7.3 IndexedDB Interop Strategy

Preferred design:

- Write a small JS module that exposes schema-versioned operations.
- Keep all domain rules in C#.
- JS should not know about SRS, sync conflict policy, or UI behavior.

Interop surface:

```csharp
public interface IIndexedDbStore
{
    ValueTask<T?> GetAsync<T>(string store, string key);
    ValueTask<IReadOnlyList<T>> GetAllAsync<T>(string store);
    ValueTask<IReadOnlyList<T>> QueryIndexAsync<T>(string store, string index, object key);
    ValueTask PutAsync<T>(string store, T row);
    ValueTask BulkPutAsync<T>(string store, IReadOnlyList<T> rows);
    ValueTask DeleteAsync(string store, string key);
    ValueTask RunTransactionAsync(IReadOnlyList<string> stores, Func<IIndexedDbTransaction, ValueTask> work);
}
```

Implementation note: JavaScript IndexedDB transactions are callback/lifetime sensitive. The interop layer must ensure transaction operations happen within the same JS transaction lifetime. Do not implement a fake C# transaction that calls independent JS operations after the browser transaction closes.

Safer alternative:

- Expose coarse transaction operations from JS, such as `captureNote`, `applyReview`, and `deleteDeck`.
- This keeps transaction correctness in JS but moves too much business logic away from C#.

Recommendation:

- For v1, use a tested Blazor IndexedDB library only if it supports multi-store transactions reliably.
- If not, write a small, well-tested JS module with coarse transaction support and keep the domain logic in C# before passing rows to the transaction.

## 8. Repository Contracts

Repositories live in `Recall.Client/Data/Repositories`. They own timestamps, local transactions, and outbox enqueue. Components never mutate IndexedDB directly.

### 8.1 Deck Repository

```csharp
public interface IDeckRepository
{
    Task<Deck> CreateDeckAsync(string name, CancellationToken ct = default);
    Task<Deck?> GetDeckAsync(Guid id, CancellationToken ct = default);
    Task RenameDeckAsync(Guid id, string name, CancellationToken ct = default);
    Task SetNewPerDayAsync(Guid id, int value, CancellationToken ct = default);
    Task DeleteDeckAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Deck>> ListDecksAsync(CancellationToken ct = default);
    Task<DeckCounts> GetDeckCountsAsync(Guid id, DateTimeOffset now, CancellationToken ct = default);
}
```

Rules:

- `CreateDeckAsync` sets `UserId = null`, `NewPerDay = 10`, timestamps, and outbox.
- `DeleteDeckAsync` soft-deletes deck and all cards in one local transaction.
- Counts exclude deleted and suspended cards.

### 8.2 Card Repository

```csharp
public interface ICardRepository
{
    Task<Card> CreateCardAsync(CreateCardInput input, CancellationToken ct = default);
    Task<Card?> GetCardAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Card>> ListCardsAsync(Guid? deckId = null, CancellationToken ct = default);
    Task<IReadOnlyList<Card>> SearchCardsAsync(string query, Guid? deckId = null, CancellationToken ct = default);
    Task UpdateContentAsync(Guid id, CardContentPatch patch, CancellationToken ct = default);
    Task ApplyReviewAsync(Card cardAfter, ReviewLog log, CancellationToken ct = default);
    Task UndoReviewAsync(Card cardBefore, Guid logId, CancellationToken ct = default);
    Task DeleteCardAsync(Guid id, CancellationToken ct = default);
}
```

Rules:

- `CreateCardAsync` calls `ISrsScheduler.NewCardFields(now)`.
- `UpdateContentAsync` bumps only `ContentUpdatedAt`.
- `ApplyReviewAsync` bumps only `SrsUpdatedAt` and writes card, log, and outbox entries atomically.
- `DeleteCardAsync` sets `DeletedAt`, `ContentUpdatedAt`, and `SrsUpdatedAt`.
- `UndoReviewAsync` restores the card snapshot, deletes the local log if it has not synced, and requeues the card.

### 8.3 Note Repository

```csharp
public interface INoteRepository
{
    Task<Note> CaptureNoteAsync(string body, CancellationToken ct = default);
    Task UpdateNoteBodyAsync(Guid id, string body, CancellationToken ct = default);
    Task ArchiveNoteAsync(Guid id, CancellationToken ct = default);
    Task DeleteNoteAsync(Guid id, CancellationToken ct = default);
    Task MarkConvertedAsync(Guid id, IReadOnlyList<Guid> cardIds, CancellationToken ct = default);
    Task<IReadOnlyList<Note>> ListInboxAsync(CancellationToken ct = default);
}
```

Rules:

- `CaptureNoteAsync` stores status `Inbox`.
- `MarkConvertedAsync` merges new `cardIds` with existing values.
- Consider a later `ConvertNoteAsync` repository method to create cards and mark note converted in one transaction.

### 8.4 Review Repository

```csharp
public interface IReviewRepository
{
    Task<int> CountNewCardsStudiedTodayAsync(Guid deckId, DateTimeOffset now, CancellationToken ct = default);
}
```

Rules:

- Count review logs where `StateBefore == CardState.New` and `ReviewedAt` is inside the user's local calendar day.
- Resolve logs to cards by `CardId` and count only matching `DeckId`.

## 9. SRS Scheduling

### 9.1 Adapter Boundary

Define an interface so the app does not depend directly on one FSRS implementation:

```csharp
public interface ISrsScheduler
{
    FsrsFields NewCardFields(DateTimeOffset now);
    ReviewResult Rate(Card card, ReviewRating rating, DateTimeOffset now);
    RatingPreview PreviewIntervals(Card card, DateTimeOffset now);
}
```

### 9.2 Implementation Options

Option A: Port FSRS to C#.

- Pros: no runtime JS dependency, full control, strong tests.
- Cons: algorithm porting effort and maintenance.

Option B: Use a vetted NuGet package.

- Pros: faster if mature.
- Cons: dependency quality and API drift unknown.

Option C: Keep `ts-fsrs` behind JS interop.

- Pros: behavior matches current implementation.
- Cons: undermines "C#/.NET rebuild", adds JS dependency, complicates offline packaging.

Recommendation: implement or adopt native C# behind `ISrsScheduler`, then use golden-master tests generated from the current TypeScript implementation for representative cards/ratings.

### 9.3 Required Behavior

- New card due is `now`.
- Rating map:
  - `Again = 1`
  - `Hard = 2`
  - `Good = 3`
  - `Easy = 4`
- `Good` on a new card moves state off `New`.
- `Again` on a new card returns due within minutes.
- Preview intervals format:
  - less than 1 hour: minutes
  - less than 1 day: hours
  - less than 30 days: days
  - 30+ days: months

### 9.4 Study Queue Builder

Keep queue building pure:

```csharp
public sealed class StudyQueueBuilder
{
    public IReadOnlyList<Card> BuildQueue(
        IReadOnlyList<Card> cards,
        Deck deck,
        int newStudiedToday,
        DateTimeOffset now);
}
```

Rules:

1. Exclude deleted and suspended.
2. Due learning/relearning first, due ascending.
3. Due review next, due ascending.
4. New cards last, created ascending, capped by `deck.NewPerDay - newStudiedToday`.
5. Session-level re-entry for short learning steps belongs in the study session service, not in the pure queue builder.

## 10. Sync Architecture

### 10.1 Client Sync State Machine

```text
Idle -> Pushing -> Pulling -> Idle
              \-> Error -> retry with backoff
```

Triggers:

- app start after auth restore
- browser online event
- outbox enqueue debounce
- visibility visible
- manual retry
- 60 second interval while online

Guards:

- no-op if signed out
- no-op if offline
- no-op if server base URL unavailable
- single-flight: never run two sync loops concurrently

### 10.2 Outbox

Outbox entries are deduped by `(TableName, RowId)`. Sync pushes row snapshots, not operations.

```csharp
public interface IOutbox
{
    Task EnqueueAsync(SyncTableName tableName, Guid rowId, CancellationToken ct = default);
    Task<IReadOnlyList<OutboxEntry>> ListAsync(CancellationToken ct = default);
    Task RemoveIfUnchangedAsync(IReadOnlyList<OutboxEntry> entries, CancellationToken ct = default);
    Task<int> CountAsync(CancellationToken ct = default);
}
```

Delete outbox entries only if their `QueuedAt` has not changed since the sync batch began.

### 10.3 Push Protocol

Client reads outbox, groups by table, loads current row snapshots, and sends to server in dependency order.

Preferred endpoint:

```http
POST /api/sync/push
Content-Type: application/json

{
  "deviceId": "guid",
  "batches": [
    { "table": "decks", "rows": [ ... ] },
    { "table": "notes", "rows": [ ... ] },
    { "table": "cards", "rows": [ ... ] },
    { "table": "reviewLogs", "rows": [ ... ] }
  ]
}
```

Server response:

```json
{
  "accepted": [
    { "table": "decks", "rowId": "..." }
  ],
  "rejected": [
    { "table": "cards", "rowId": "...", "reason": "deck_not_found" }
  ],
  "serverTime": "2026-07-04T12:00:00.000Z"
}
```

Server rules:

- Ignore client-supplied `UserId`; use authenticated user id.
- Validate row shape and enum values.
- Guard mutable rows with LWW.
- Insert review logs idempotently by `Id`.
- Use a transaction per batch or per table depending on size.

### 10.4 Pull Protocol

Preferred endpoint:

```http
GET /api/sync/pull?table=cards&cursor=2026-07-04T12:00:00.000Z&limit=500
```

Response:

```json
{
  "table": "cards",
  "rows": [
    {
      "id": "...",
      "serverUpdatedAt": "2026-07-04T12:01:00.000Z",
      "...": "..."
    }
  ],
  "nextCursor": "2026-07-04T12:01:00.000Z",
  "hasMore": false
}
```

Client pulls in table order:

1. decks
2. notes
3. cards
4. review logs

Merge rows directly into IndexedDB. Do not call repositories during pull, because repositories enqueue outbox entries.

### 10.5 Merge Policy

Decks and notes:

- Whole-row LWW based on `UpdatedAt`.
- Tie goes remote to match current behavior.

Review logs:

- Insert if absent.
- Skip if present.

Cards:

- Content group: `DeckId`, `NoteId`, `Front`, `Back`, `Suspended`.
- SRS group: `Due`, `Stability`, `Difficulty`, `ElapsedDays`, `ScheduledDays`, `Reps`, `Lapses`, `State`, `LastReview`.
- Compare `ContentUpdatedAt` for content group.
- Compare `SrsUpdatedAt` for SRS group.
- Tie goes remote.
- Tombstone wins if it is newer for the relevant group.

### 10.6 Server Guarded Upserts

The server must not blindly overwrite with stale client rows. Implement one of:

1. PostgreSQL SQL functions similar to the current migration.
2. EF Core transaction with conditional SQL updates.

For cards, SQL is clearer and safer:

```sql
-- Illustrative SQL shape for .NET migration, not final generated code.
update cards
set
  front = case when @content_updated_at > content_updated_at then @front else front end,
  back = case when @content_updated_at > content_updated_at then @back else back end,
  content_updated_at = greatest(@content_updated_at, content_updated_at),
  due = case when @srs_updated_at > srs_updated_at then @due else due end,
  srs_updated_at = greatest(@srs_updated_at, srs_updated_at)
where id = @id and user_id = @user_id;
```

Do not rely only on EF last-write wins. The stale overwrite bug is a core sync risk.

## 11. Server Data Model

### 11.1 EF Entities

Use separate EF entities from domain records if EF mapping gets noisy.

Tables:

- `decks`
- `cards`
- `notes`
- `review_logs`
- `users` / ASP.NET Identity tables

All synced tables include:

- `id uuid primary key`
- `user_id uuid not null`
- `deleted_at timestamptz null`
- `server_updated_at timestamptz not null default now()`

### 11.2 Server Updated Timestamp

Use the database clock for `ServerUpdatedAt`. Options:

- Postgres trigger updates `server_updated_at`.
- EF SaveChanges interceptor sets `ServerUpdatedAt` from server query. Less ideal because app clock can skew.

Recommendation: Postgres trigger.

### 11.3 Authorization

Every query/update must scope by authenticated user id.

Server service method shape:

```csharp
public Task UpsertCardAsync(Guid userId, CardSyncDto card, CancellationToken ct);
public Task<IReadOnlyList<CardSyncDto>> PullCardsAsync(Guid userId, DateTimeOffset cursor, int limit, CancellationToken ct);
```

Never trust `card.UserId` from client.

## 12. API Specification

### 12.1 Auth Endpoints

```http
POST /api/auth/magic-link
Body: { "email": "user@example.com" }
```

- Always return 202 to avoid account enumeration.
- Send signed one-time login link.
- Rate limit by IP/email.

```http
GET /api/auth/callback?token=...
```

- Validate token.
- Set secure HttpOnly session cookie.
- Redirect to app.

```http
GET /api/auth/session
```

Returns:

```json
{
  "signedIn": true,
  "user": {
    "id": "guid",
    "email": "user@example.com"
  }
}
```

```http
POST /api/auth/sign-out
```

- Clears cookie.

### 12.2 Sync Endpoints

```http
POST /api/sync/push
GET /api/sync/pull
POST /api/sync/full
```

`POST /api/sync/full` is optional. It can combine push and pull for fewer round trips, but separate endpoints are easier to debug.

### 12.3 Health Endpoint

```http
GET /healthz
```

Return DB connectivity and app version for deployment checks.

## 13. Blazor UI Specification

### 13.1 Route Map

| Existing route | Blazor component |
| --- | --- |
| `/` | `Pages/Home.razor` |
| `/capture` | `Pages/Capture.razor` |
| `/inbox` | `Pages/Inbox.razor` |
| `/study` | `Pages/Study.razor` |
| `/study/{DeckId:guid}` | `Pages/Study.razor` |
| `/decks` | `Pages/Decks.razor` |
| `/decks/{DeckId:guid}` | `Pages/DeckDetail.razor` |
| `/cards/new` | `Pages/CardEditor.razor` |
| `/cards/{CardId:guid}/edit` | `Pages/CardEditor.razor` |
| `/settings` | `Pages/Settings.razor` |

### 13.2 Component Layout

```text
Shared/
  MainLayout.razor
  NavMenu.razor
Components/
  AppButton.razor
  TextArea.razor
  MarkdownView.razor
  EmptyState.razor
  SyncBadge.razor
  RatingBar.razor
  Modal.razor
```

### 13.3 State Management

Use scoped services:

- `LocalDatabaseChangeNotifier`
- `SyncStateStore`
- `AuthStateStore`
- `StudySessionService`

Blazor components subscribe/unsubscribe in `OnInitialized`/`Dispose`.

Do not create a global Redux-like store. The current app uses local React state plus live database reads; mirror that simplicity.

### 13.4 Screen Requirements

#### Home

- Show total due count across decks.
- Show inbox teaser.
- Show deck rows with due/new counts.
- Empty state with create deck and capture buttons.

#### Capture

- Autofocused textarea.
- Save button.
- Ctrl/Cmd+Enter.
- Query parameter prefill for `title`, `text`, `url`.
- After save: clear, refocus, toast.

Blazor implementation notes:

- Use `ElementReference` and JS interop for focus.
- Use `NavigationManager.ToAbsoluteUri` and query parsing.

#### Inbox

- List inbox notes oldest first.
- Inline edit body.
- Convert dialog.
- Archive/delete.

#### Convert Note Dialog

- Deck select.
- Front/back textareas.
- Create.
- Create and add another.
- Last used deck in sync meta.

#### Study

- Full-screen-ish layout.
- Queue built from local DB.
- Reveal front/back.
- Rating bar.
- Single-level undo in memory.
- Keyboard shortcuts.

Move most session logic to `StudySessionService` so the component is not a large orchestration blob.

#### Decks

- Deck list.
- Create, rename, delete.
- Delete confirms card count.

#### Deck Detail

- Rename.
- New per day stepper.
- Search cards.
- Suspend/unsuspend.
- Delete card.
- Add card navigation.

#### Card Editor

- Deck select.
- Front/back textareas.
- Markdown preview.
- Save and save/add another.
- Mobile edit/preview toggle.

#### Settings

- Auth magic link form.
- Signed-in status.
- Sign out.
- Sync status.
- Manual sync.
- Export JSON.
- Import JSON with validation.
- App version.

## 14. PWA Specification

### 14.1 Manifest

Required fields:

```json
{
  "name": "Recall",
  "short_name": "Recall",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#0F6E56",
  "background_color": "#FAFAF7",
  "share_target": {
    "action": "/capture",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

### 14.2 Service Worker

Requirements:

- Precache app shell.
- Do not cache sync/auth API calls.
- Provide update-available notification.
- App cold-loads offline after first install.

For Blazor WASM, use the built-in PWA service worker as a starting point, then explicitly exclude or network-only API routes:

```text
/api/auth/*
/api/sync/*
/healthz
```

### 14.3 Offline Acceptance

Manual and automated tests must verify:

- Installed app opens offline.
- Capture works offline.
- Study review works offline.
- Outbox accumulates offline.
- Reconnect drains outbox after sign-in.

## 15. Backup Import/Export

### 15.1 Backup Format

Use versioned JSON:

```json
{
  "version": 2,
  "exportedAt": "2026-07-04T12:00:00.000Z",
  "source": "recall-dotnet",
  "decks": [],
  "cards": [],
  "notes": [],
  "reviewLogs": []
}
```

### 15.2 Compatibility

Support importing current TypeScript backup shape if generated by the existing app:

- `version: 1`
- snake_case fields
- `review_logs`

Implement a `BackupMigrationService`:

```csharp
public interface IBackupMigrationService
{
    BackupDocument ParseAndMigrate(string json);
}
```

### 15.3 Validation

Validate:

- Required fields.
- UUID format.
- ISO timestamps.
- Enum values.
- Card deck references.
- Review log card references when possible.
- Deleted rows remain valid tombstones.

Never blind-overwrite local DB. Import merges through the same merge policies as sync.

## 16. Security Specification

### 16.1 Main Risks

| Risk | Control |
| --- | --- |
| IDOR | Server scopes every query by authenticated user id. |
| CSRF | Antiforgery tokens if cookie auth is used. |
| XSS | Markdown raw HTML disabled/sanitized. |
| Import poisoning | Deep backup validation. |
| Account enumeration | Magic link endpoint returns generic 202. |
| Token theft | Short-lived one-time magic link tokens. |
| Stale sync overwrite | Server guarded upserts. |
| Secrets in client | Only public config in WASM. |

### 16.2 Markdown Policy

Allowed:

- headings
- bold/italic
- lists
- links
- inline code
- fenced code
- images by URL
- tables
- blockquotes

Disallowed:

- raw HTML
- `javascript:` links
- dangerous data URLs
- inline event handlers

### 16.3 Auth Session

Cookie settings:

- HttpOnly
- Secure
- SameSite=Lax or Strict depending on magic-link callback needs
- reasonable expiration

Magic link:

- one-time use
- short expiry
- signed token
- rate limited

## 17. Observability And Operations

### 17.1 Client Observability

Store in local sync meta:

- `lastSyncOkAt`
- `lastError`
- `lastAttemptAt`
- `lastPushCount`
- `lastPullCount`
- `lastBackoffMs`

Display in Settings.

### 17.2 Server Observability

Log structured events:

- auth magic link requested
- sync push started/completed/failed
- sync pull started/completed/failed
- rejected row with reason
- guarded upsert conflict skipped

Metrics:

- sync pushes per user
- rows pushed by table
- rows pulled by table
- sync failures by category
- magic link sends
- API latency

### 17.3 Deployment

Minimum production deployment:

- ASP.NET Core app hosting static Blazor WASM.
- PostgreSQL.
- Email provider for magic links.
- HTTPS.
- Static compression.
- Health checks.
- Database migrations run in controlled release step.

## 18. Testing Strategy

### 18.1 Domain Tests

Project: `Recall.Domain.Tests`

Cover:

- queue ordering
- new-card limit
- suspended/deleted exclusion
- FSRS wrapper behavior
- interval formatting
- merge policies
- backup validation

### 18.2 Client Tests

Project: `Recall.Client.Tests`

Use bUnit for Blazor components and a fake IndexedDB abstraction.

Cover:

- Capture saves and clears.
- Inbox edit/convert.
- Study reveal/rate/undo.
- Settings import failure.
- SyncBadge states.

### 18.3 Repository Tests

Use a fake or in-memory IndexedDB abstraction for unit tests, plus browser-based tests for real IndexedDB transaction behavior.

Cover:

- outbox dedupe
- apply review atomicity
- delete deck cascade tombstones
- note conversion
- import merge

### 18.4 Server Tests

Project: `Recall.Server.Tests`

Use:

- WebApplicationFactory
- Testcontainers PostgreSQL if acceptable
- Respawn or transactional cleanup

Cover:

- auth-required endpoints
- user scoping
- push LWW guard
- review log idempotency
- pull cursor
- different users cannot see rows

### 18.5 E2E Tests

Project: `Recall.E2E.Tests`

Use Playwright for .NET.

Cover:

- offline cold load after install/precache
- capture offline
- study offline
- reconnect sync
- share target prefill if automation supports it

## 19. Migration Strategy From Current App

### 19.1 Compatibility Goal

A user should be able to export JSON from the current React app and import it into the .NET app.

### 19.2 Steps

1. Freeze current backup schema as `RecallBackupV1`.
2. Add .NET parser for V1 snake_case.
3. Migrate to .NET V2 internal DTOs.
4. Validate referential integrity.
5. Merge into local IndexedDB through .NET repositories or merge service.
6. Enqueue imported rows for sync if signed in.

### 19.3 Sync Cutover

Do not point old React clients and new .NET clients at the same sync backend until:

- sync row shapes are compatible
- conflict policies match
- server guarded upserts handle both formats
- integration tests pass mixed-client scenarios

Safer rollout:

1. .NET local-only alpha.
2. .NET import/export compatibility.
3. .NET sync beta on separate backend.
4. migration tool or migration endpoint.
5. retire old sync backend after user migration.

## 20. Acceptance Criteria

The .NET rebuild is not done until:

- App installs as PWA.
- App opens offline after first load.
- Capture works offline.
- Study review/rating/undo works offline.
- Inbox conversion works.
- Deck/card CRUD works.
- Markdown preview disables raw HTML.
- Export/import works with old V1 and new V2 backups.
- Sign-in adopts local-only rows.
- Different-user local data is blocked.
- Offline reviews sync after reconnect.
- Conflict test preserves remote content edit and local SRS update.
- Deck delete tombstones cards across devices.
- Unit, component, server, and E2E tests pass.
- Server rejects cross-user access.
- API calls are not cached by service worker.

## 21. Open Decisions

These should be decided before implementation:

1. Exact .NET SDK/LTS target.
2. Blazor WASM hosted vs standalone plus separate API.
3. IndexedDB library vs custom JS interop.
4. Native C# FSRS implementation vs NuGet package vs JS interop.
5. Cookie auth vs bearer token.
6. Tailwind retained vs CSS variables/scoped CSS.
7. Whether to keep PostgreSQL RLS in addition to server authorization.
8. Whether current React and new .NET clients must coexist during migration.

## 22. Recommended Defaults

If the team wants a decisive starting point:

- Hosted Blazor WebAssembly PWA.
- ASP.NET Core same-origin server.
- PostgreSQL with EF Core migrations and raw SQL guarded upsert functions.
- Cookie auth with antiforgery.
- Custom thin JS interop for IndexedDB, heavily tested.
- Native C# FSRS adapter with golden-master tests.
- CSS variables/scoped CSS, no Tailwind dependency unless design velocity suffers.
- V1 backup import compatibility.
- No mixed-client sync until proven by tests.
