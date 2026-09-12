import Dexie from "dexie";
import { db, type Card } from "./schema";

export interface ContentRevision {
  id: string;
  previous: { front: string; back: string }[];
  front: string;
  back: string;
}

// Source-derived reference cards (curriculum v12-v14) no longer ship. Their identities are
// prefix-scoped, so retirement never has to inspect a card's text to classify it.
export const retiredLibraryPrefixes = ["a3000000-", "a4000000-"] as const;
export const isRetiredLibraryId = (id: string): boolean =>
  retiredLibraryPrefixes.some((prefix) => id.startsWith(prefix));

// The revision list is only needed while a migration runs, so it stays out of the boot bundle.
let revisions: Promise<ContentRevision[]> | undefined;
export function loadContentRevisions(): Promise<ContentRevision[]> {
  revisions ??= import("../data/content-corrections.json")
    .then((module) => module.default as ContentRevision[])
    .catch((error) => {
      revisions = undefined;
      throw error;
    });
  return revisions;
}

export const matchesRevision = (card: Card, revision: ContentRevision): boolean =>
  (card.front === revision.front && card.back === revision.back) ||
  revision.previous.some((previous) => previous.front === card.front && previous.back === card.back);

export async function reviewedContentUpdates(timestamp: string): Promise<Card[]> {
  // The import is an external promise; waitFor keeps the caller's IDB transaction alive.
  const active = (await Dexie.waitFor(loadContentRevisions(), 120_000))
    .filter((revision) => !isRetiredLibraryId(revision.id));
  const cards = await db.cards.bulkGet(active.map((revision) => revision.id));
  return cards.flatMap((card, index) => {
    const revision = active[index];
    if (!card || card.deleted_at || !revision.previous.some((previous) =>
      previous.front === card.front && previous.back === card.back)) return [];
    return [{ ...card, front: revision.front, back: revision.back, content_updated_at: timestamp }];
  });
}
