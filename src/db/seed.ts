import { curriculum, loadStarterCards } from "../data/curriculum";
import { newCardFields } from "../srs/scheduler";
import { db, type Card, type Deck, type SyncTableName } from "./schema";

export const curriculumVersionKey = "starter_curriculum_v3";

export async function installStarterDecks(): Promise<void> {
  // Fetch before opening the transaction: a network wait can close an IDB transaction.
  const content = await loadStarterCards();
  await db.transaction(
    "rw",
    db.decks,
    db.cards,
    db.outbox,
    db.sync_meta,
    async () => {
      const timestamp = "2026-01-01T00:00:00.000Z";
      const existingDecks = new Map(
        (await db.decks.toArray()).map((deck) => [deck.id, deck]),
      );
      const existingCards = new Set(
        await db.cards.toCollection().primaryKeys(),
      );
      const decksToAdd: Deck[] = [];
      const cardsToAdd: Card[] = [];
      const initialSchedule = newCardFields(new Date(timestamp));
      const additions: {
        table_name: SyncTableName;
        row_id: string;
        queued_at: string;
      }[] = [];
      for (const starter of curriculum) {
        const existing = existingDecks.get(starter.id);
        // Tombstones preserve intentional deletions. Existing rows preserve all edits and SRS state.
        if (existing?.deleted_at) continue;
        const deck: Deck = existing ?? {
          id: starter.id,
          name: starter.name,
          user_id: null,
          new_per_day: 3,
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
        };
        if (!existing) {
          decksToAdd.push(deck);
          additions.push({
            table_name: "decks",
            row_id: deck.id,
            queued_at: timestamp,
          });
        }
        const cards: Card[] = (content.get(starter.id) ?? []).flatMap(
          (card, index) =>
            existingCards.has(card.id)
              ? []
              : [
                  {
                    id: card.id,
                    user_id: deck.user_id,
                    deck_id: deck.id,
                    note_id: null,
                    front: card.front,
                    back: card.back,
                    suspended: false,
                    ...initialSchedule,
                    created_at: new Date(
                      Date.parse(timestamp) + index,
                    ).toISOString(),
                    content_updated_at: timestamp,
                    srs_updated_at: timestamp,
                    deleted_at: null,
                  },
                ],
        );
        cardsToAdd.push(...cards);
        additions.push(
          ...cards.map((card) => ({
            table_name: "cards" as const,
            row_id: card.id,
            queued_at: timestamp,
          })),
        );
      }
      await db.decks.bulkAdd(decksToAdd);
      await db.cards.bulkAdd(cardsToAdd);
      // One batched write keeps first launch fast with thousands of cards.
      const pending = new Map(
        (await db.outbox.toArray()).map((row) => [
          `${row.table_name}:${row.row_id}`,
          row,
        ]),
      );
      await db.outbox.bulkPut(
        additions.map((row) => ({
          ...pending.get(`${row.table_name}:${row.row_id}`),
          ...row,
        })),
      );
      await db.sync_meta.put({
        key: "starter_curriculum_v1",
        value: timestamp,
      });
      await db.sync_meta.put({ key: curriculumVersionKey, value: timestamp });
    },
  );
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("recall:outbox-enqueued"));
}

export async function initializeStudyData(): Promise<void> {
  if (!(await db.sync_meta.get(curriculumVersionKey)))
    await installStarterDecks();
}
