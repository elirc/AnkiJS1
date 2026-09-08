import 'fake-indexeddb/auto';
import {db, resetDatabaseForTests} from '../src/db/schema';
import {installStarterDecks, curriculumVersionKey} from '../src/db/seed';
import assert from 'node:assert/strict';
import { newCardCandidates, siblingKey } from '../src/srs/siblings';
import { buildQueue, interleaveQueues } from '../src/srs/queue';
import { loadStarterCards, starterCardCount, curriculum } from '../src/data/curriculum';
import { newCardFields } from '../src/srs/scheduler';
import { parseAnswerPages } from '../src/teaching/answers';
import type {Card, ReviewLog} from '../src/db/schema';
const timestamp=new Date(2026,2,7,12).toISOString();
function card(id:string, extras:Partial<Card>={}):Card{return {id,user_id:null,deck_id:'deck',note_id:'family',front:'Q',back:'A',suspended:false,...newCardFields(new Date(timestamp)),created_at:timestamp,content_updated_at:timestamp,srs_updated_at:timestamp,deleted_at:null,...extras};}
function log(id:string, day:number, state:Card['state']='new'):ReviewLog{return {id:`${id}-${day}`,user_id:null,card_id:id,rating:3,state_before:state,due_before:timestamp,stability_after:1,difficulty_after:1,scheduled_days_after:1,reviewed_at:new Date(2026,2,day,12).toISOString()};}
const cards=['one','two','three','four'].map(id=>card(id));
const logs=[log('one',7),log('two',8),log('three',11)];
for(const [n,day,expected] of [[1,7,0],[1,8,4],[2,10,0],[2,11,4],[3,17,0],[3,18,4]])assert.equal(newCardCandidates(cards,logs.slice(0,n),new Date(2026,2,day,13)).length,expected);
assert.equal(newCardCandidates(cards,[logs[0],log('one',7,'learning')],new Date(2026,2,8)).length,4);
const due=card('due',{state:'review'}),retry=card('retry',{state:'learning'});
assert.deepEqual(newCardCandidates([...cards,due,retry],logs,new Date(2026,2,11,13)),[due,retry]);
assert.equal(newCardCandidates(cards,logs.slice(0,1),new Date(2026,2,9)).length,4);
const deck={id:'deck',name:'Deck',new_per_day:10,user_id:null,created_at:timestamp,updated_at:timestamp,deleted_at:null};
const unseen=card('unseen',{note_id:null,created_at:'2020-01-01T00:00:00Z'});
assert.equal(buildQueue([...cards,unseen,card('learned',{state:'review',due:'2030-01-01T00:00:00Z'})],deck,0,new Date(timestamp))[0].id,'one');
assert.equal(interleaveQueues([[cards[0]],[cards[1]]]).length,1);
const packs=await loadStarterCards();const all=[...packs.values()].flat();assert.equal(all.length,starterCardCount);
for(const d of curriculum)assert.equal(packs.get(d.id)?.length,d.cardCount);
const original=new Set(all.filter(c=>!c.id.startsWith('a1000000-')).map(c=>siblingKey({...c,note_id:null})));
assert.equal(all.filter(c=>c.id.startsWith('a1000000-')).length,0);
for(const c of all.filter(c=>c.id.startsWith('a2000000-')))assert.equal(parseAnswerPages(c.back)?.length,3);
console.log(`PASS: ${all.length} cards load with correct counts and complete scenario answers. Related-card scheduling checks passed.`);

// An isolated in-memory database proves that completed earlier batches roll
// back if a later batch fails. It never opens the user's browser storage.
await resetDatabaseForTests();
const originalBulkAdd = db.cards.bulkAdd.bind(db.cards);
let batches = 0;
(db.cards as any).bulkAdd = (...args: any[]) => {
  if (++batches === 2) return Promise.reject(new Error('injected batch failure'));
  return (originalBulkAdd as any)(...args);
};
try {
  await assert.rejects(installStarterDecks(), /injected batch failure/);
  assert.equal(batches, 2);
  assert.equal(await db.cards.count(), 0);
  assert.equal(await db.decks.count(), 0);
  assert.equal(await db.outbox.count(), 0);
  assert.equal(await db.sync_meta.get(curriculumVersionKey), undefined);
  console.log('PASS: failure after a completed card batch rolls back cards, decks, queue, and curriculum version.');
} finally {
  db.cards.bulkAdd = originalBulkAdd;
  db.close();
}
