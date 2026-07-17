# Recall .NET Implementation Plan

## Phase 0: Project Decisions And Proofs

Goal: remove unknowns before building the whole app.

### Decisions

- Choose exact .NET SDK/LTS.
- Choose hosted Blazor WASM or standalone Blazor WASM plus API.
- Choose IndexedDB strategy.
- Choose FSRS strategy.
- Choose auth/session strategy.
- Choose whether old React clients must sync with new .NET server.

### Proofs Of Concept

1. **IndexedDB transaction proof**
   - Create a tiny Blazor page.
   - Write two stores in one transaction.
   - Force a failure and prove rollback.
   - Acceptance: local transaction behavior is reliable.

2. **PWA offline proof**
   - Blazor WASM app opens offline after first load.
   - `/api/*` is not cached.
   - Acceptance: browser devtools offline test passes.

3. **FSRS proof**
   - Rate one new card with Again/Good.
   - Compare against current TypeScript output for fixed timestamps.
   - Acceptance: behavior matches within agreed tolerance.

4. **Auth proof**
   - Send magic link in local dev or fake email provider.
   - Callback sets session.
   - API sees authenticated user id.
   - Acceptance: sync endpoint rejects anonymous requests.

## Phase 1: Solution Skeleton

Create:

```text
Recall.sln
src/Recall.Client
src/Recall.Server
src/Recall.Domain
src/Recall.Contracts
tests/Recall.Domain.Tests
tests/Recall.Client.Tests
tests/Recall.Server.Tests
```

Acceptance:

- `dotnet build` passes.
- `dotnet test` passes with initial smoke tests.
- Blazor client routes render.
- Server serves client and `/healthz`.

Do not implement product behavior yet.

## Phase 2: Domain And Contracts

Implement:

- Domain models.
- DTO models.
- enums.
- backup V1/V2 contracts.
- merge policies.
- queue builder.
- clock abstraction.
- ID abstraction if needed.

Tests:

- queue ordering
- suspended/deleted exclusion
- new-card limit
- merge card field-group tests
- tombstone merge tests
- backup parser rejects invalid shape

Acceptance:

- Domain test suite mirrors existing TypeScript pure tests.
- No dependency on Blazor, ASP.NET, EF Core, or JS.

## Phase 3: Client Local Database

Implement:

- IndexedDB schema/version.
- typed store abstraction.
- local change notifier.
- outbox.
- sync meta.
- deck/card/note/review repositories.

Repository acceptance:

- create deck writes deck and outbox.
- capture note writes note and outbox.
- create card initializes SRS fields.
- update content bumps only content timestamp.
- apply review writes card/log/outbox atomically.
- delete deck tombstones deck and cards.
- outbox dedupes repeated edits.

Tests:

- repository tests with fake abstraction.
- browser-backed transaction tests for real IndexedDB if possible.

Risk:

- IndexedDB transaction semantics through .NET interop. Resolve before proceeding.

## Phase 4: Blazor UI Without Sync

Implement pages:

1. Home
2. Capture
3. Inbox
4. Convert note dialog
5. Deck list
6. Deck detail
7. Card editor
8. Study
9. Settings local data section

Acceptance:

- Local-only app can create deck.
- Capture note.
- Convert note to card.
- Study card.
- Undo one review.
- Export/import local data.
- Works with network disabled after first load.

Tests:

- bUnit smoke tests for capture and study.
- Playwright local-only smoke flow if practical.

## Phase 5: PWA Hardening

Implement:

- manifest.
- icons.
- service worker update toast.
- share target route to `/capture`.
- network status service.
- offline badge state.

Acceptance:

- Lighthouse installable.
- App opens offline after first load.
- Share target query params prefill capture.
- API routes are network-only.

Manual checks:

- Chrome desktop PWA install.
- Android Chrome share target if device available.
- iOS add-to-home limitations documented.

## Phase 6: Server Persistence

Implement:

- EF Core DbContext.
- PostgreSQL migrations.
- tables for decks/cards/notes/review logs.
- `server_updated_at` trigger.
- guarded upsert SQL/functions.
- user ownership scoping.

Acceptance:

- Migrations apply to clean DB.
- Server can insert/pull rows for one user.
- Cross-user pull returns no rows.
- Stale deck/note update does not overwrite newer row.
- Stale card content does not overwrite newer content.
- Fresh SRS update can merge with older content and vice versa.

Tests:

- server integration tests with real PostgreSQL.
- guarded upsert tests.
- cursor paging tests.

## Phase 7: Auth

Implement:

- magic link request endpoint.
- callback endpoint.
- session endpoint.
- sign-out endpoint.
- client auth state service.
- local data adoption.
- different-user block dialog.

Acceptance:

- signed-out local-only mode works.
- sign-in adopts local rows and enqueues them.
- different-user local rows block sign-in continuation.
- sign-out keeps local data.
- sync endpoints require auth.

Security checks:

- generic magic-link response.
- one-time token.
- short expiry.
- rate limiting.
- secure HttpOnly cookie.
- antiforgery for mutating endpoints if cookie auth.

## Phase 8: Client Sync

Implement:

- sync engine state machine.
- triggers.
- push grouped by table.
- pull by cursor.
- merge direct local writes.
- error/backoff.
- sync badge.
- settings sync controls.

Acceptance:

- outbox drains after sign-in.
- offline outbox accumulates.
- reconnect pushes local rows.
- two profiles sync notes/cards.
- conflict test preserves content and SRS.
- manual retry works.
- sync errors are visible in settings.

Tests:

- mocked client/server sync tests.
- server integration tests.
- E2E two-browser-profile test if feasible.

## Phase 9: Import/Export Migration

Implement:

- V1 TypeScript backup importer.
- V2 .NET backup exporter/importer.
- deep validation.
- merge through merge policies.

Acceptance:

- export from current app imports into .NET app.
- invalid backup rejected with useful message.
- imported rows enqueue for sync if signed in.
- fresh profile restore works.

Tests:

- fixture backup from current app.
- malformed backup.
- tombstone backup.
- conflict merge backup.

## Phase 10: Polish, Accessibility, Performance

Implement:

- keyboard shortcuts.
- focus management.
- reduced-motion behavior.
- mobile layout pass.
- dark mode tokens.
- accessibility labels.
- performance profiling with large local DB.

Acceptance:

- 375px viewport usable.
- rating buttons reachable and labeled.
- card content readable.
- no overlapping text.
- large deck list remains acceptable.
- bundle size measured and documented.

## Phase 11: Deployment

Implement:

- production config.
- database migration process.
- email provider config.
- health checks.
- structured logging.
- deployment docs.

Acceptance:

- deploy to staging.
- migrations apply.
- HTTPS required.
- PWA install works.
- magic links work.
- rollback plan documented.

## Backlog By Area

### Domain

- [ ] Port domain models.
- [ ] Implement queue builder.
- [ ] Implement merge policy.
- [ ] Implement FSRS adapter.
- [ ] Add golden-master tests.

### Client Data

- [ ] IndexedDB schema.
- [ ] IndexedDB transaction abstraction.
- [ ] Repositories.
- [ ] Outbox.
- [ ] Sync meta.
- [ ] Backup import/export local merge.

### UI

- [ ] Layout/nav.
- [ ] Home.
- [ ] Capture.
- [ ] Inbox.
- [ ] Convert dialog.
- [ ] Study.
- [ ] Decks.
- [ ] Card editor.
- [ ] Settings.

### Server

- [ ] Auth endpoints.
- [ ] Sync endpoints.
- [ ] EF migrations.
- [ ] Guarded upserts.
- [ ] Health checks.
- [ ] Logging.

### Security

- [ ] Auth cookie/token strategy.
- [ ] Antiforgery.
- [ ] Markdown sanitization.
- [ ] Backup validation.
- [ ] User scoping tests.
- [ ] Rate limiting.

### Testing

- [ ] Domain unit tests.
- [ ] Repository tests.
- [ ] bUnit component tests.
- [ ] Server integration tests.
- [ ] Playwright E2E tests.
- [ ] PWA offline tests.

## Detailed Work Tickets

### Ticket 1: Define Domain Models

**Value:** creates shared language for all layers.  
**Files:** `Recall.Domain/Models/*.cs`.  
**Acceptance:**

- All current TypeScript entities represented.
- Enums match current string/number values at serialization boundary.
- Unit test serializes/deserializes sample backup rows.

### Ticket 2: Implement Queue Builder

**Value:** core study ordering without UI dependencies.  
**Acceptance:**

- Learning/relearning due first.
- Reviews due second.
- New cards capped.
- Suspended/deleted excluded.

### Ticket 3: Build IndexedDB Transaction POC

**Value:** de-risks the hardest client persistence piece.  
**Acceptance:**

- Multi-store transaction commits both stores.
- Simulated failure rolls back both stores.
- Test or manual reproduction documented.

### Ticket 4: Implement Local Note Capture

**Value:** first offline vertical slice.  
**Acceptance:**

- Capture page saves note offline.
- Note appears in inbox.
- Outbox has deduped note entry.
- Test covers save and clear.

### Ticket 5: Implement Card Review Transaction

**Value:** protects core study invariant.  
**Acceptance:**

- Card state updates.
- Review log inserts.
- Card and review log outbox entries exist.
- Failure does not commit partial data.

### Ticket 6: Implement Merge Policy

**Value:** prevents lost updates.  
**Acceptance:**

- Remote-newer content + local-newer SRS merge.
- Local-newer content + remote-newer SRS merge.
- Tombstone wins when newer.
- Tie goes remote.

### Ticket 7: Implement Server Guarded Upserts

**Value:** prevents stale clients from overwriting fresh data.  
**Acceptance:**

- Stale note update skipped.
- Stale deck update skipped.
- Card content and SRS groups update independently.
- Review log duplicate ignored.

### Ticket 8: Implement Magic Link Auth

**Value:** enables sync accounts.  
**Acceptance:**

- request endpoint is enumeration-safe.
- callback signs in.
- session endpoint returns user.
- sign-out works.

### Ticket 9: Implement Sync Push

**Value:** moves local data to server.  
**Acceptance:**

- Push order respected.
- Server assigns authenticated user id.
- Outbox entries removed only if unchanged.
- Errors leave outbox intact.

### Ticket 10: Implement Sync Pull

**Value:** brings remote data to device.  
**Acceptance:**

- Per-table cursors stored.
- Rows merge without re-enqueue.
- Pagination works.
- Missing deck card handling implemented.

### Ticket 11: Implement V1 Backup Import

**Value:** migration from current app.  
**Acceptance:**

- Existing export imports.
- snake_case maps correctly.
- invalid shape rejected.
- imported rows merge and enqueue.

### Ticket 12: Implement PWA Share Target

**Value:** preserves quick capture from OS share sheet.  
**Acceptance:**

- manifest declares share target.
- `/capture?title=&text=&url=` preloads textarea.
- mobile manual test documented.

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| IndexedDB transaction abstraction is unreliable through JS interop | Core offline writes unsafe | Medium | Phase 0 POC before architecture lock |
| FSRS C# behavior diverges from current app | Review scheduling changes unexpectedly | Medium | golden-master tests |
| Cookie auth creates CSRF exposure | account data sync risk | Medium | antiforgery and same-origin API |
| Service worker caches API responses | stale sync/auth state | Low/Medium | network-only API route tests |
| Import accepts malformed data | local DB corruption | Medium | deep validators |
| Server upsert uses blind overwrite | lost updates | High if skipped | guarded SQL tests |
| Mixed old/new clients conflict | data loss | Medium | separate beta backend or compatibility tests |
| Blazor WASM bundle too large | slow first load | Medium | measure, lazy load markdown/editor |

## Definition Of Done

The .NET rebuild is done only when:

```text
dotnet build
dotnet test
server integration tests
browser E2E offline smoke
manual PWA install/share target checks
security checklist
migration/import checklist
```

all pass or have documented, accepted exceptions.

## Suggested Implementation Order

If one engineer is building this:

1. Phase 0 POCs.
2. Domain models/queue/merge tests.
3. Local IndexedDB repositories.
4. Local-only Blazor UI.
5. PWA offline hardening.
6. Server DB/auth.
7. Sync.
8. Import/export migration.
9. Polish/deploy.

If a team is building this:

- Engineer A: domain/SRS/merge.
- Engineer B: IndexedDB/repositories.
- Engineer C: Blazor UI.
- Engineer D: server/auth/sync.
- Shared: test fixtures and backup compatibility.

Keep all teams aligned through shared contracts and golden-master fixtures.
