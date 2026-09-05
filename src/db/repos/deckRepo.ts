import { createId } from "../../lib/ids";
import { nowISO } from "../../lib/dates";
import { db, type Deck } from "../schema";
import { enqueueMany, enqueueOutbox } from "../sync/outbox";
import { loadStudy } from "./studyRepo";

export async function createDeck(name: string): Promise<Deck> {
  const timestamp = nowISO();
  const deck: Deck = {
    id: createId(),
    user_id: null,
    name: name.trim() || "Untitled deck",
    new_per_day: 10,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };
  await db.transaction("rw", db.decks, db.outbox, async () => {
    await db.decks.add(deck);
    await enqueueOutbox("decks", deck.id, timestamp);
  });
  return deck;
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  const deck = await db.decks.get(id);
  return deck?.deleted_at ? undefined : deck;
}

export async function renameDeck(id: string, name: string): Promise<void> {
  const timestamp = nowISO();
  await db.transaction("rw", db.decks, db.outbox, async () => {
    await db.decks.update(id, {
      name: name.trim() || "Untitled deck",
      updated_at: timestamp,
    });
    await enqueueOutbox("decks", id, timestamp);
  });
}

export async function setNewPerDay(id: string, n: number): Promise<void> {
  const timestamp = nowISO();
  const new_per_day = Math.max(0, Math.floor(n));
  await db.transaction("rw", db.decks, db.outbox, async () => {
    await db.decks.update(id, { new_per_day, updated_at: timestamp });
    await enqueueOutbox("decks", id, timestamp);
  });
}

export async function deleteDeck(id: string): Promise<void> {
  const timestamp = nowISO();
  await db.transaction("rw", db.decks, db.cards, db.outbox, async () => {
    await db.decks.update(id, { deleted_at: timestamp, updated_at: timestamp });
    const cards = await db.cards.where("deck_id").equals(id).toArray();
    const deletedCards = cards.map((card) => ({
      ...card,
      deleted_at: timestamp,
      content_updated_at: timestamp,
      srs_updated_at: timestamp,
    }));
    await db.cards.bulkPut(deletedCards);
    await enqueueOutbox("decks", id, timestamp);
    await enqueueMany(
      "cards",
      deletedCards.map((card) => card.id),
      timestamp,
    );
  });
}

export async function listDecks(): Promise<Deck[]> {
  return (await db.decks.toArray())
    .filter((deck) => deck.deleted_at === null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function deckCounts(
  id: string,
  now: Date,
): Promise<{ due: number; new_available: number; total: number }> {
  const deck = await getDeck(id);
  if (!deck) return { due: 0, new_available: 0, total: 0 };
  const cards = (await db.cards.where("deck_id").equals(id).toArray()).filter(
    (card) => card.deleted_at === null && !card.suspended,
  );
  const due = cards.filter(
    (card) =>
      card.state !== "new" &&
      (card.state === "learning" ||
        card.state === "relearning" ||
        card.state === "review") &&
      new Date(card.due).getTime() <= now.getTime(),
  ).length;
  const study = await loadStudy(id, now);
  const new_available = study.queue.filter(
    (card) => card.state === "new",
  ).length;
  return { due, new_available, total: cards.length };
}
