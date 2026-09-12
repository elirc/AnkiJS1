import Dexie from "dexie";
import { db, type Card } from "./schema";
import {
  isRetiredLibraryId,
  loadContentRevisions,
  matchesRevision,
  retiredLibraryPrefixes,
} from "./contentCorrections";

// Every bundled card is installed with this content timestamp; an edit replaces it.
export const installTimestamp = "2026-01-01T00:00:00.000Z";

// Retired source-derived cards (a3/a4 prefixes) that the user never edited. A card whose text
// still equals a shipped correction counts as unedited too. Personal rewrites are kept.
export async function unchangedRetiredLibraryCards(): Promise<Card[]> {
  const candidates: Card[] = [];
  for (const prefix of retiredLibraryPrefixes)
    candidates.push(...await db.cards.where(":id").between(prefix, `${prefix}￿`)
      .filter((card) => !card.deleted_at).toArray());
  if (!candidates.length) return [];
  const unchanged = candidates.filter((card) => card.content_updated_at === installTimestamp);
  const edited = candidates.filter((card) => card.content_updated_at !== installTimestamp);
  if (!edited.length) return unchanged;
  const revisions = new Map((await Dexie.waitFor(loadContentRevisions(), 120_000))
    .filter((revision) => isRetiredLibraryId(revision.id))
    .map((revision) => [revision.id, revision]));
  return [...unchanged, ...edited.filter((card) => {
    const revision = revisions.get(card.id);
    return revision ? matchesRevision(card, revision) : false;
  })];
}
