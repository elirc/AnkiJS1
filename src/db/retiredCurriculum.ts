import retirement from "../data/retired-curriculum.json";
import { nowISO } from "../lib/dates";
import { db, type Card, type Deck, type SyncTableName } from "./schema";
import { unchangedRetiredRetrievalCards } from "./retiredRetrieval";
import { unchangedRetiredLibraryCards } from "./retiredLibrary";
import { reviewedContentUpdates } from "./contentCorrections";

// Explicit shipped identities only: never classify a user's cards by their text.
// Kept permanently so an older backup/device cannot reintroduce retired lessons.
export async function retireLegacyCurriculum(): Promise<boolean> {
  return db.transaction("rw", db.decks, db.cards, db.outbox, db.sync_meta, async () => {
    const timestamp = nowISO();
    const corrected = await reviewedContentUpdates(timestamp);
    const cards: Card[] = [...await db.cards.bulkGet(retirement.cardIds),
      ...await unchangedRetiredRetrievalCards(),
      ...await unchangedRetiredLibraryCards()]
      .filter((card): card is Card => Boolean(card && !card.deleted_at))
      .map((card) => ({
        ...card,
        deleted_at: timestamp,
        content_updated_at: timestamp,
      }));
    // Large library upgrades share one transaction without queuing every write at once.
    const updatedCards = [...cards, ...corrected];
    for (let offset = 0; offset < updatedCards.length; offset += 500)
      await db.cards.bulkPut(updatedCards.slice(offset, offset + 500));
    const decks: Deck[] = [];
    for (const retired of retirement.decks) {
      const deck = await db.decks.get(retired.id);
      if (!deck) continue;
      const markerKey = `curriculum_retired_deck:${deck.id}`;
      const hasPersonalCards = await db.cards.where("deck_id").equals(deck.id)
        .filter((card) => !card.deleted_at).count();
      if (deck.deleted_at) {
        // A later old backup may introduce personal cards to a deck that this
        // migration hid when empty. Restore visibility only for our deletion;
        // a user's own deck deletion remains authoritative.
        const marker = await db.sync_meta.get(markerKey);
        if (hasPersonalCards && marker?.value === deck.deleted_at) {
          decks.push({ ...deck, deleted_at: null, updated_at: timestamp,
            name: deck.name === retired.name ? "My saved cards" : deck.name });
          await db.sync_meta.delete(markerKey);
        }
        continue;
      }
      if (!hasPersonalCards) {
        decks.push({ ...deck, deleted_at: timestamp, updated_at: timestamp });
        await db.sync_meta.put({ key: markerKey, value: timestamp });
      } else if (deck.name === retired.name) {
        // Keep custom cards visible, including ones added to an old bundled deck.
        decks.push({ ...deck, name: "My saved cards", updated_at: timestamp });
      }
    }
    for (const renamed of retirement.renamedDecks) {
      const deck = await db.decks.get(renamed.id);
      if (deck && !deck.deleted_at && deck.name === renamed.previousName)
        decks.push({ ...deck, name: renamed.name, updated_at: timestamp });
    }
    await db.decks.bulkPut(decks);
    const changes: { table_name: SyncTableName; row_id: string; queued_at: string }[] = [
      ...[...cards, ...corrected].map((card) => ({ table_name: "cards" as const, row_id: card.id, queued_at: timestamp })),
      ...decks.map((deck) => ({ table_name: "decks" as const, row_id: deck.id, queued_at: timestamp })),
    ];
    if (!changes.length) return false;
    const pending = new Map((await db.outbox.toArray())
      .map((row) => [`${row.table_name}:${row.row_id}`, row]));
    const queued = changes.map((row) => ({
      ...pending.get(`${row.table_name}:${row.row_id}`),
      ...row,
    }));
    for (let offset = 0; offset < queued.length; offset += 500)
      await db.outbox.bulkPut(queued.slice(offset, offset + 500));
    return true;
  });
}
