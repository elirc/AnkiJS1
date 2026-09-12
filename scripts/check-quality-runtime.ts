import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db, resetDatabaseForTests, type Card } from '../src/db/schema';
import { initializeStudyData, curriculumVersionKey } from '../src/db/seed';
import { retireLegacyCurriculum } from '../src/db/retiredCurriculum';
import { installTimestamp } from '../src/db/retiredLibrary';
import { isRetiredLibraryId } from '../src/db/contentCorrections';
import { newCardFields, rate } from '../src/srs/scheduler';
import { applyReview } from '../src/db/repos/cardRepo';
import { importData } from '../src/db/repos/dataRepo';
import { loadStarterCards, starterCardCount, curriculum } from '../src/data/curriculum';
import { parseAnswerPages } from '../src/teaching/answers';
import legacyPacks from '../src/data/section-packs/retrieval-01.json';
import manifest from '../src/data/section-expansion-manifest.json';
import { engineeringMissions } from '../src/data/engineering-missions';
import corrections from '../src/data/content-corrections.json';

const timestamp = installTimestamp;
const deck = { id: legacyPacks[0].id, name: 'My edited deck', user_id: null,
  new_per_day: 3, created_at: timestamp, updated_at: timestamp, deleted_at: null };
function card(index: number): Card {
  return { ...legacyPacks[0].cards[index], deck_id: deck.id, user_id: null, note_id: null,
    suspended: false, ...newCardFields(new Date(timestamp)), created_at: timestamp,
    content_updated_at: timestamp, srs_updated_at: timestamp, deleted_at: null };
}
const libraryCard = (id: string): Card => ({ ...card(0), id, front: `Retired reference ${id}`, back: 'Reference text' });

const packs = await loadStarterCards();
const all = [...packs.values()].flat();
assert.equal(all.length, starterCardCount);
for (const deck of curriculum) assert.equal(packs.get(deck.id)?.length, deck.cardCount);
assert.equal(all.filter(c => c.id.startsWith('a1000000-')).length, 0);
assert.equal(all.filter(c => isRetiredLibraryId(c.id)).length, 0, 'Retired library cards must not ship');
const scenarios = all.filter(c => c.id.startsWith('a2000000-'));
assert.equal(scenarios.length, manifest.kinds.scenario);
for (const c of scenarios) assert.equal(parseAnswerPages(c.back)?.length, 3);
assert.equal(new Set(engineeringMissions.map(m => m.id)).size, engineeringMissions.length);
assert.equal(engineeringMissions[0].id, 'trace-a-request');
for (const mission of engineeringMissions) {
  assert.equal(new Set(mission.checks.map(check => check.id)).size, 3);
  for (const field of ['brief', 'stretch', 'review'] as const) assert.ok(mission[field].length > 50);
  assert.equal(mission.steps.length, 3);
}
console.log(`PASS: runtime inventory, ${scenarios.length} three-page scenarios, no retired library cards, ${engineeringMissions.length} stable mission identities.`);

try {
  await resetDatabaseForTests();
  await Promise.all([initializeStudyData(), initializeStudyData()]);
  assert.equal(await db.cards.count(), starterCardCount);
  assert.equal(await db.outbox.count(), starterCardCount + curriculum.length);
  console.log('PASS: concurrent fresh installation produces one copy of every card and queue entry.');

  // A v13/v14 installation holds source-derived a3/a4 cards. Untouched copies are hidden;
  // edited copies, review history, and every base card stay exactly as they were.
  const saved = (await db.cards.get(all[0].id))!;
  const savedReview = rate(saved, 3, new Date());
  await applyReview(savedReview.card, savedReview.log);
  await db.cards.update(saved.id, { front: 'My preserved base question' });
  const untouched = libraryCard('a3000000-0000-4000-8000-000000000001');
  const reviewedLibrary = libraryCard('a4000000-0000-4000-8000-000000000002');
  const editedLibrary = { ...libraryCard('a4000000-0000-4000-8000-000000000003'), back: 'My own notes', content_updated_at: '2026-08-01T00:00:00.000Z' };
  await db.cards.bulkAdd([untouched, reviewedLibrary, editedLibrary]);
  const libraryReview = rate(reviewedLibrary, 3, new Date());
  await applyReview(libraryReview.card, libraryReview.log);
  const logsBefore = await db.review_logs.toArray();
  await db.outbox.clear();
  await db.sync_meta.delete(curriculumVersionKey);
  await db.sync_meta.put({ key: 'starter_curriculum_v14', value: timestamp });
  await initializeStudyData();
  assert.ok((await db.cards.get(untouched.id))?.deleted_at);
  const hidden = (await db.cards.get(reviewedLibrary.id))!;
  assert.ok(hidden.deleted_at);
  assert.equal(hidden.due, libraryReview.card.due);
  assert.equal((await db.cards.get(editedLibrary.id))?.deleted_at, null);
  assert.equal((await db.cards.get(saved.id))?.front, 'My preserved base question');
  assert.equal((await db.cards.get(saved.id))?.due, savedReview.card.due);
  assert.deepEqual(await db.review_logs.toArray(), logsBefore);
  const queue = await db.outbox.toArray();
  assert.equal(queue.filter(row => row.row_id === untouched.id).length, 1);
  await initializeStudyData();
  assert.deepEqual(await db.outbox.toArray(), queue);
  console.log('PASS: the v14 library retires untouched source cards, keeps edits and history, and repeats as a no-op.');

  await resetDatabaseForTests();
  await db.decks.add(deck);
  const original = card(0);
  const edited = { ...card(1), back: 'My personally revised explanation' };
  const deleted = { ...card(2), deleted_at: timestamp };
  const personal = { ...card(3), id: '10000000-0000-4000-8000-000000000099' };
  await db.cards.bulkAdd([original, edited, deleted, personal]);
  const review = rate(original, 3, new Date());
  await applyReview(review.card, review.log);
  const logs = await db.review_logs.toArray();
  await initializeStudyData();
  const retired = (await db.cards.get(original.id))!;
  assert.ok(retired.deleted_at);
  assert.equal(retired.reps, review.card.reps);
  assert.equal(retired.due, review.card.due);
  assert.deepEqual(await db.cards.get(edited.id), edited);
  assert.deepEqual(await db.cards.get(deleted.id), deleted);
  assert.deepEqual(await db.cards.get(personal.id), personal);
  assert.deepEqual(await db.review_logs.toArray(), logs);
  assert.equal((await db.decks.get(deck.id))?.name, deck.name);
  const retirementQueue = await db.outbox.toArray();
  assert.equal(await retireLegacyCurriculum(), false);
  assert.deepEqual(await db.outbox.toArray(), retirementQueue);
  console.log('PASS: retirement preserves edits, personal cards, tombstones, deck names, schedules, and history; repeat is a no-op.');

  await resetDatabaseForTests();
  const backup = { version: 1, exported_at: timestamp, decks: [deck], cards: [original, edited], notes: [], review_logs: [] };
  await importData(backup);
  assert.ok((await db.cards.get(original.id))?.deleted_at);
  assert.deepEqual(await db.cards.get(edited.id), edited);
  await importData(backup);
  assert.ok((await db.cards.get(original.id))?.deleted_at);
  assert.deepEqual(await db.cards.get(edited.id), edited);
  console.log('PASS: old backup restoration applies quality retirement and preserves personal rewrites.');

  const revision = corrections.find(revision => !isRetiredLibraryId(revision.id));
  if (revision) {
    await resetDatabaseForTests();
    await db.decks.add(deck);
    const originalText = { ...card(0), id: revision.id, ...revision.previous[0] };
    await db.cards.add(originalText);
    const oldReview = rate(originalText, 3, new Date());
    await applyReview(oldReview.card, oldReview.log);
    await db.sync_meta.put({ key: 'starter_curriculum_v9', value: timestamp });
    await initializeStudyData();
    assert.ok(await db.sync_meta.get(curriculumVersionKey));
    const corrected = (await db.cards.get(revision.id))!;
    assert.equal(corrected.front, revision.front);
    assert.equal(corrected.back, revision.back);
    assert.equal(corrected.reps, oldReview.card.reps);
    assert.equal(corrected.due, oldReview.card.due);
    assert.equal(corrected.deleted_at, null);
    await db.cards.update(revision.id, { front: 'My edited correction' });
    assert.equal(await retireLegacyCurriculum(), false);
    assert.equal((await db.cards.get(revision.id))?.front, 'My edited correction');
    console.log('PASS: upgrading v9 applies corrections, preserves identity and scheduling, and never overwrites personal wording.');
  }

  await resetDatabaseForTests();
  await db.decks.add(deck);
  await db.cards.add(original);
  const visible = new Set<string>();
  let plannedCards = 0;
  for (const info of curriculum) if (plannedCards < 650) { visible.add(info.id); plannedCards += info.cardCount; }
  assert.ok(plannedCards > 500, 'Exercise rollback across multiple install batches');
  await db.decks.bulkAdd(curriculum.filter(info => !visible.has(info.id) && info.id !== deck.id)
    .map(info => ({ ...deck, id: info.id, deleted_at: timestamp })));
  const put = db.outbox.bulkPut;
  db.outbox.bulkPut = (() => Promise.reject(new Error('injected queue failure'))) as typeof put;
  try {
    await assert.rejects(initializeStudyData(), /injected queue failure/);
    assert.deepEqual(await db.cards.toArray(), [original]);
    assert.equal(await db.sync_meta.get(curriculumVersionKey), undefined);
    assert.equal(await db.outbox.count(), 0);
  } finally { db.outbox.bulkPut = put; }
  console.log('PASS: queue failure rolls back new cards, retirement, and the version marker atomically.');
} finally { db.close(); }
