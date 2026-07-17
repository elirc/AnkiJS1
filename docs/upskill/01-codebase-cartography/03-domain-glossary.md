# Domain Glossary

| Term | Meaning | Where it appears |
| --- | --- | --- |
| Deck | Collection of cards with `new_per_day` limit. | `src/db/schema.ts:5-14`, `src/db/repos/deckRepo.ts:7-89` |
| Card | Flashcard plus FSRS scheduling state. | `src/db/schema.ts:17-39`, `src/db/repos/cardRepo.ts:7-99` |
| Note | Raw captured thought before/after triage. | `src/db/schema.ts:42-50`, `src/db/repos/noteRepo.ts:6-67` |
| ReviewLog | Immutable-ish record of a rating event. | `src/db/schema.ts:53-63`, `src/db/repos/cardRepo.ts:46-55` |
| Inbox | Notes with status `inbox`. | `src/db/schema.ts:40`, `src/db/repos/noteRepo.ts:64-67` |
| Converted | Note status after card creation. | `src/db/repos/noteRepo.ts:49-61`, `src/features/inbox/ConvertNoteDialog.tsx:40-43` |
| Suspended | Card excluded from study queue. | `src/db/schema.ts:23`, `src/srs/queue.ts:12-14` |
| Due | ISO date when a non-new card should be reviewed. | `src/db/schema.ts:24`, `src/srs/queue.ts:18-27` |
| New per day | Deck-level cap for new cards. | `src/db/schema.ts:10`, `src/db/repos/deckRepo.ts:38-44` |
| Outbox | Local table of row snapshots pending sync. | `src/db/schema.ts:65-70`, `src/db/sync/outbox.ts:4-37` |
| Cursor | Per-table pull checkpoint based on server time. | `src/db/sync/engine.ts:143-160` |
| LWW | Last-write-wins conflict resolution. | `src/db/sync/merge.ts:10-65`, `supabase/migrations/0001_init.sql:83-174` |
| Local-only mode | Signed-out operation with `user_id: null`. | `src/db/repos/deckRepo.ts:11`, `src/db/repos/cardRepo.ts:16`, `src/db/sync/supabaseClient.ts:5-19` |
| Adoption | First sign-in sets local rows to user id and enqueues them. | `src/db/sync/auth.ts:55-94` |

## Confusing Near-Synonyms

- **Note vs Card:** a note is unstructured inbox material; a card has front/back and SRS state.
- **`updated_at` vs `server_updated_at`:** client timestamps decide LWW; server timestamps drive pull cursors (`supabase/migrations/0001_init.sql:7-10`, `supabase/migrations/0001_init.sql:1-195`).
- **`content_updated_at` vs `srs_updated_at`:** cards split conflict ownership between text/deck/suspension and scheduling (`src/db/schema.ts:34-35`, `src/db/sync/merge.ts:34-58`).

Drill: pick one glossary term and find both its type definition and the repository function that mutates it.
