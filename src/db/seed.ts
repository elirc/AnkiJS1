import { curriculum, loadStarterCards } from "../data/curriculum";
import { sectionExpansionVersion } from "../data/section-expansion";
import { newCardFields } from "../srs/scheduler";
import { db, type Card, type Deck, type SyncTableName } from "./schema";
import { retireLegacyCurriculum } from "./retiredCurriculum";
import { installTimestamp } from "./retiredLibrary";

export const curriculumVersionKey = `starter_curriculum_v${sectionExpansionVersion}`;

export interface CurriculumProgress {
  completed: number;
  total: number;
  phase: "cards" | "saving";
}
const installBatchSize = 500;

export async function installStarterDecks(onProgress?: (progress: CurriculumProgress) => void): Promise<void> {
  // Fetch before opening the transaction: a network wait can close an IDB transaction.
  const content = await loadStarterCards();
  await db.transaction(
    "rw",
    db.decks,
    db.cards,
    db.outbox,
    db.sync_meta,
    async () => {
      // Retirement relies on this exact timestamp to tell shipped text from a personal edit.
      const timestamp = installTimestamp;
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
      // Bound the browser's request backlog while retaining one atomic transaction.
      onProgress?.({ completed: 0, total: cardsToAdd.length, phase: "cards" });
      for (let offset = 0; offset < cardsToAdd.length; offset += installBatchSize) {
        await db.cards.bulkAdd(cardsToAdd.slice(offset, offset + installBatchSize));
        onProgress?.({ completed: Math.min(offset + installBatchSize, cardsToAdd.length), total: cardsToAdd.length, phase: "cards" });
      }
      onProgress?.({ completed: cardsToAdd.length, total: cardsToAdd.length, phase: "saving" });
      await retireLegacyCurriculum();
      // The sync queue commits with the cards, using the same bounded batches.
      const pending = new Map(
        (await db.outbox.toArray()).map((row) => [
          `${row.table_name}:${row.row_id}`,
          row,
        ]),
      );
      const queued = additions.map((row) => ({
        ...pending.get(`${row.table_name}:${row.row_id}`),
        ...row,
      }));
      for (let offset = 0; offset < queued.length; offset += installBatchSize)
        await db.outbox.bulkPut(queued.slice(offset, offset + installBatchSize));
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

export async function initializeStudyData(onProgress?: (progress: CurriculumProgress) => void): Promise<void> {
  if (!(await db.sync_meta.get(curriculumVersionKey)))
    await installStarterDecks(onProgress);
}
