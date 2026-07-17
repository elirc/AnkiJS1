import { createId } from '../../lib/ids';
import { nowISO } from '../../lib/dates';
import { newCardFields } from '../../srs/scheduler';
import { db, type Card, type ReviewLog } from '../schema';
import { enqueueOutbox } from '../sync/outbox';

export async function createCard(input: {
  deck_id: string;
  front: string;
  back: string;
  note_id?: string;
}): Promise<Card> {
  const timestamp = nowISO();
  const card: Card = {
    id: createId(),
    user_id: null,
    deck_id: input.deck_id,
    note_id: input.note_id ?? null,
    front: input.front.trim(),
    back: input.back.trim(),
    suspended: false,
    ...newCardFields(new Date(timestamp)),
    content_updated_at: timestamp,
    srs_updated_at: timestamp,
    created_at: timestamp,
    deleted_at: null,
  };
  await db.transaction('rw', db.cards, db.outbox, async () => {
    await db.cards.add(card);
    await enqueueOutbox('cards', card.id, timestamp);
  });
  return card;
}

export async function updateContent(
  id: string,
  patch: { front?: string; back?: string; deck_id?: string; suspended?: boolean },
): Promise<void> {
  const timestamp = nowISO();
  await db.transaction('rw', db.cards, db.outbox, async () => {
    await db.cards.update(id, { ...patch, content_updated_at: timestamp });
    await enqueueOutbox('cards', id, timestamp);
  });
}

export async function applyReview(cardAfter: Card, log: ReviewLog): Promise<void> {
  const timestamp = nowISO();
  const finalCard = { ...cardAfter, srs_updated_at: timestamp };
  const finalLog = { ...log, user_id: finalCard.user_id };
  await db.transaction('rw', db.cards, db.review_logs, db.outbox, async () => {
    await db.cards.put(finalCard);
    await db.review_logs.put(finalLog);
    await enqueueOutbox('cards', finalCard.id, timestamp);
    await enqueueOutbox('review_logs', finalLog.id, timestamp);
  });
}

export async function undoReview(cardBefore: Card, logId: string): Promise<void> {
  const timestamp = nowISO();
  await db.transaction('rw', db.cards, db.review_logs, db.outbox, async () => {
    await db.cards.put({ ...cardBefore, srs_updated_at: timestamp });
    await db.review_logs.delete(logId);
    await enqueueOutbox('cards', cardBefore.id, timestamp);
    const outboxLog = await db.outbox.where('[table_name+row_id]').equals(['review_logs', logId]).first();
    if (outboxLog?.id !== undefined) await db.outbox.delete(outboxLog.id);
  });
}

export async function deleteCard(id: string): Promise<void> {
  const timestamp = nowISO();
  await db.transaction('rw', db.cards, db.outbox, async () => {
    await db.cards.update(id, {
      deleted_at: timestamp,
      content_updated_at: timestamp,
      srs_updated_at: timestamp,
    });
    await enqueueOutbox('cards', id, timestamp);
  });
}

export async function getCard(id: string): Promise<Card | undefined> {
  const card = await db.cards.get(id);
  return card?.deleted_at ? undefined : card;
}

export async function listCards(deckId?: string): Promise<Card[]> {
  const cards = deckId
    ? await db.cards.where('deck_id').equals(deckId).toArray()
    : await db.cards.toArray();
  return cards
    .filter((card) => card.deleted_at === null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function searchCards(query: string, deckId?: string): Promise<Card[]> {
  const needle = query.trim().toLocaleLowerCase();
  const cards = await listCards(deckId);
  if (!needle) return cards;
  return cards.filter(
    (card) =>
      card.front.toLocaleLowerCase().includes(needle) ||
      card.back.toLocaleLowerCase().includes(needle),
  );
}
