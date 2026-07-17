# Fake Code Contrasts

## 1. Coupling UI To DB Shape

```ts
// Illustrative fake code: not from this repo.
await db.notes.add({ id: crypto.randomUUID(), body });
```

Better: call `captureNote` so timestamps/status/outbox are consistent (`src/db/repos/noteRepo.ts:6-21`).

## 2. Missing Permission Filter

```ts
// Illustrative fake code: not from this repo.
client.from('cards').select('*');
```

Better: filter by uid and rely on RLS (`src/db/sync/engine.ts:146-150`, `supabase/migrations/0001_init.sql:176-188`).

## 3. N+1 Without Reason

```ts
// Illustrative fake code: not from this repo.
for (const log of logs) cards.push(await db.cards.get(log.card_id));
```

Better: bulk get as reviewRepo does (`src/db/repos/reviewRepo.ts:7-11`).

## 4. Stale State In Async Handler

```ts
// Illustrative fake code: not from this repo.
setReviewed(reviewed + 1);
```

Better: functional updates used in study rating (`src/features/study/StudyScreen.tsx:82-84`).

## 5. Side Effect In Unreliable Place

```ts
// Illustrative fake code: not from this repo.
await client.from('notes').insert(note);
await db.notes.add(note);
```

Better: write local first and enqueue (`src/db/repos/noteRepo.ts:18-20`).

## 6. Swallowing Errors

```ts
// Illustrative fake code: not from this repo.
try { await syncNow(); } catch {}
```

Better: store `last_error` and expose it (`src/db/sync/engine.ts:80-87`, `src/features/settings/SettingsScreen.tsx:107-113`).

## 7. Overusing `any`

```ts
// Illustrative fake code: not from this repo.
function importBackup(x: any) { return x.cards.map(save); }
```

Better: accept `unknown`, narrow with a guard (`src/db/repos/dataRepo.ts:15-25`), then improve guard depth.

## 8. Changing Public Contracts Casually

```ts
// Illustrative fake code: not from this repo.
interface Card { nextDue: string }
```

Better: update schema, repos, FSRS adapter, SQL, merge, import/export, and tests together (`src/db/schema.ts:17-39`, `supabase/migrations/0001_init.sql:12-34`).

## 9. Refilling New Cards Incorrectly

```ts
// Illustrative fake code: not from this repo.
const newCards = cards.filter(c => c.state === 'new').slice(0, deck.new_per_day);
```

Better: subtract `newStudiedToday` as queue does (`src/srs/queue.ts:28-35`).

## 10. Raw HTML Markdown

```tsx
// Illustrative fake code: not from this repo.
<ReactMarkdown rehypePlugins={[rehypeRaw]}>{source}</ReactMarkdown>
```

Better: keep raw HTML disabled (`src/components/MarkdownView.tsx:13-16`).
