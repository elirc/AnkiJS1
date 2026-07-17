import Dexie, { type Table } from 'dexie';

export type ISODate = string;

export interface Deck {
  id: string;
  user_id: string | null;
  name: string;
  new_per_day: number;
  created_at: ISODate;
  updated_at: ISODate;
  deleted_at: ISODate | null;
}

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Card {
  id: string;
  user_id: string | null;
  deck_id: string;
  note_id: string | null;
  front: string;
  back: string;
  suspended: boolean;
  due: ISODate;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review: ISODate | null;
  content_updated_at: ISODate;
  srs_updated_at: ISODate;
  created_at: ISODate;
  deleted_at: ISODate | null;
}

export type NoteStatus = 'inbox' | 'converted' | 'archived';

export interface Note {
  id: string;
  user_id: string | null;
  body: string;
  status: NoteStatus;
  card_ids: string[];
  created_at: ISODate;
  updated_at: ISODate;
  deleted_at: ISODate | null;
}

export interface ReviewLog {
  id: string;
  user_id: string | null;
  card_id: string;
  rating: 1 | 2 | 3 | 4;
  state_before: CardState;
  due_before: ISODate;
  stability_after: number;
  difficulty_after: number;
  scheduled_days_after: number;
  reviewed_at: ISODate;
}

export type SyncTableName = 'decks' | 'cards' | 'notes' | 'review_logs';

export interface OutboxEntry {
  id?: number;
  table_name: SyncTableName;
  row_id: string;
  queued_at: ISODate;
}

export interface SyncMeta {
  key: string;
  value: string;
}

export class RecallDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;
  notes!: Table<Note, string>;
  review_logs!: Table<ReviewLog, string>;
  outbox!: Table<OutboxEntry, number>;
  sync_meta!: Table<SyncMeta, string>;

  constructor() {
    super('recall');
    this.version(1).stores({
      decks: 'id, updated_at, deleted_at',
      cards: 'id, deck_id, due, state, note_id, deleted_at, [deck_id+state]',
      notes: 'id, status, updated_at, deleted_at',
      review_logs: 'id, card_id, reviewed_at',
      outbox: '++id, [table_name+row_id]',
      sync_meta: 'key',
    });
  }
}

export const db = new RecallDB();

export async function resetDatabaseForTests(): Promise<void> {
  await db.delete();
  await db.open();
}
