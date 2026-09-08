import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db, resetDatabaseForTests, type Card } from '../src/db/schema';
import { initializeStudyData, curriculumVersionKey } from '../src/db/seed';
import { retireLegacyCurriculum } from '../src/db/retiredCurriculum';
import { newCardFields, rate } from '../src/srs/scheduler';
import { applyReview } from '../src/db/repos/cardRepo';
import { importData } from '../src/db/repos/dataRepo';
import { loadStarterCards, starterCardCount, curriculum } from '../src/data/curriculum';
import { getAnswerPages, parseAnswerPages } from '../src/teaching/answers';
import legacyPacks from '../src/data/section-packs/retrieval-01.json';
import { engineeringMissions } from '../src/data/engineering-missions';
import corrections from '../src/data/content-corrections.json';
import library from '../src/data/library-expansion-manifest.json';
import comprehensive from '../src/data/comprehensive-manifest.json';
import sourceLessons from '../src/data/source-guided-lessons.json';

const timestamp = '2026-01-01T00:00:00.000Z';
const deck = { id: legacyPacks[0].id, name: 'My edited deck', user_id: null,
  new_per_day: 3, created_at: timestamp, updated_at: timestamp, deleted_at: null };
function card(index: number): Card {
  return { ...legacyPacks[0].cards[index], deck_id: deck.id, user_id: null, note_id: null,
    suspended: false, ...newCardFields(new Date(timestamp)), created_at: timestamp,
    content_updated_at: timestamp, srs_updated_at: timestamp, deleted_at: null };
}
const packs = await loadStarterCards();
const all = [...packs.values()].flat();
assert.equal(all.length, starterCardCount);
for (const deck of curriculum) assert.equal(packs.get(deck.id)?.length, deck.cardCount);
assert.equal(all.filter(c => c.id.startsWith('a1000000-')).length, 0);
assert.equal(all.filter(c => c.id.startsWith('a2000000-')).length, 72);
for (const c of all.filter(c => c.id.startsWith('a2000000-'))) assert.equal(parseAnswerPages(c.back)?.length, 3);
const sourceCards = all.filter(c => c.id.startsWith('a3000000-'));
assert.equal(sourceCards.length, library.addedCards);
for (const card of sourceCards) assert.ok(parseAnswerPages(card.back)?.every(page => page.body.trim().length > 0));
assert.equal(new Set(engineeringMissions.map(m => m.id)).size, engineeringMissions.length);
assert.equal(engineeringMissions.length, 48);
assert.equal(engineeringMissions[0].id, 'trace-a-request');
for (const mission of engineeringMissions) {
  assert.equal(new Set(mission.checks.map(check => check.id)).size, 3);
  for (const field of ['brief', 'stretch', 'review'] as const) assert.ok(mission[field].length > 50);
  assert.equal(mission.steps.length, 3);
}
assert.equal(sourceLessons.length, comprehensive.guidedLessons);
for (const lesson of sourceLessons) {
  const card = all.find(card => card.id === lesson.id)!;
  const answer = getAnswerPages(card.front, card.back);
  assert.equal(answer.pages.length, 3);
  assert.ok(answer.credit.includes(lesson.source), `Missing shared source credit: ${lesson.id}`);
  assert.ok(answer.pages.every(page => !page.body.includes('Adapted from [')));
}
assert.equal(all.filter(card => card.id.startsWith('a4000000-')).length, comprehensive.addedCards);
console.log(`PASS: runtime inventory, 72 three-page scenarios, ${sourceLessons.length} new guided lessons, and 48 stable mission identities.`);

try {
  await resetDatabaseForTests();
  for (const revision of corrections.filter(revision => revision.id.startsWith('a3000000-'))) {
    await resetDatabaseForTests();
    await db.decks.bulkAdd(curriculum.map(info => ({ ...deck, id: info.id, deleted_at: info.id === deck.id ? null : timestamp })));
    const saved = { ...card(0), id: revision.id, ...revision.previous[0], reps: 4 };
    await db.cards.put(saved);
    await db.sync_meta.put({ key: 'starter_curriculum_v11', value: timestamp });
    await initializeStudyData();
    assert.ok(await db.sync_meta.get(curriculumVersionKey));
    const corrected = (await db.cards.get(saved.id))!;
    assert.equal(corrected.front, revision.front);
    assert.equal(corrected.back, revision.back);
    assert.equal(corrected.reps, saved.reps);
    assert.equal(corrected.due, saved.due);
    await db.cards.update(saved.id, { front: 'My revised source question' });
    await db.sync_meta.delete(curriculumVersionKey);
    await initializeStudyData();
    assert.equal((await db.cards.get(saved.id))?.front, 'My revised source question');
  }
  console.log('PASS: source-lesson corrections preserve schedules and personally edited wording.');
  if (process.argv.includes('--corrections-only')) { db.close(); process.exit(0); }
  await resetDatabaseForTests();
  await Promise.all([initializeStudyData(), initializeStudyData()]);
  assert.equal(await db.cards.count(), starterCardCount);
  assert.equal(await db.outbox.count(), starterCardCount + curriculum.length);
  console.log('PASS: concurrent fresh installation produces one copy of every card and queue entry.');

  const saved = (await db.cards.get(all.find(card => !card.id.startsWith('a3000000-'))!.id))!;
  const savedReview = rate(saved, 3, new Date());
  await applyReview(savedReview.card, savedReview.log);
  await db.cards.update(saved.id, { front: 'My preserved v10 question' });
  const removed = await db.cards.where(':id').between('a3000000-', 'a3000000-\uffff').delete();
  assert.equal(removed, library.addedCards);
  console.log('Prepared the v10 library fixture.');
  await db.outbox.clear();
  await db.sync_meta.delete(curriculumVersionKey);
  await db.sync_meta.put({ key: 'starter_curriculum_v10', value: timestamp });
  const savedLogs = await db.review_logs.toArray();
  const removedComprehensive = await db.cards.where(':id').between('a4000000-', 'a4000000-\uffff').delete();
  assert.equal(removedComprehensive, comprehensive.addedCards);
  await initializeStudyData();
  assert.equal(await db.cards.count(), starterCardCount);
  assert.equal((await db.cards.get(saved.id))?.front, 'My preserved v10 question');
  assert.equal((await db.cards.get(saved.id))?.due, savedReview.card.due);
  assert.deepEqual(await db.review_logs.toArray(), savedLogs);
  const upgradedQueue = await db.outbox.toArray();
  await initializeStudyData();
  assert.deepEqual(await db.outbox.toArray(), upgradedQueue);
  console.log('PASS: v10-to-v13 expansion preserves personal wording, scheduling, history, and repeat-install idempotence.');
  await db.cards.where(':id').between('a4000000-', 'a4000000-\uffff').delete();
  assert.equal(await db.cards.count(), comprehensive.baseline.cards);
  // A synced v12 library cannot contain pending entries for v13-only cards.
  await db.outbox.clear();
  await db.sync_meta.delete(curriculumVersionKey);
  await db.sync_meta.put({ key: 'starter_curriculum_v12', value: timestamp });
  await initializeStudyData();
  assert.equal(await db.cards.count(), starterCardCount);
  assert.equal((await db.cards.get(saved.id))?.front, 'My preserved v10 question');
  assert.deepEqual(await db.review_logs.toArray(), savedLogs);
  console.log('PASS: the shipped v12 library upgrades to v13 without losing edits or review history.');

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
  const queue = await db.outbox.toArray();
  assert.equal(await retireLegacyCurriculum(), false);
  assert.deepEqual(await db.outbox.toArray(), queue);
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

  await resetDatabaseForTests();
  await db.decks.add(deck);
  const revision = corrections[0];
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
  console.log('PASS: upgrading v9 applies final corrections, preserves identity and scheduling, and never overwrites personal wording.');

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
