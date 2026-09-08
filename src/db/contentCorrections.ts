import revisions from "../data/content-corrections.json";
import { db, type Card } from "./schema";

export async function reviewedContentUpdates(timestamp: string): Promise<Card[]> {
  const cards = await db.cards.bulkGet(revisions.map(revision => revision.id));
  return cards.flatMap((card, index) => {
    const revision = revisions[index];
    if (!card || card.deleted_at || !revision.previous.some(previous =>
      previous.front === card.front && previous.back === card.back)) return [];
    return [{ ...card, front: revision.front, back: revision.back, content_updated_at: timestamp }];
  });
}
