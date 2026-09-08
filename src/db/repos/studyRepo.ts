import { db, type Card, type ReviewLog } from "../schema";
import { localDateStamp } from "../../lib/dates";
import {
  normalizeStudyPreferences,
  type StudyPreferences,
} from "../../srs/preferences";
import { newCardCandidates } from "../../srs/siblings";
import { buildQueue, interleaveQueues } from "../../srs/queue";
import { getDeckInfo, type Track } from "../../data/curriculum";

export async function getStudyPreferences(): Promise<StudyPreferences> {
  const raw = (await db.sync_meta.get("study_preferences"))?.value;
  try {
    return normalizeStudyPreferences(raw ? JSON.parse(raw) : undefined);
  } catch {
    return normalizeStudyPreferences();
  }
}

export async function saveStudyPreferences(
  value: StudyPreferences,
): Promise<void> {
  await db.sync_meta.put({
    key: "study_preferences",
    value: JSON.stringify(normalizeStudyPreferences(value)),
  });
}

export function introductionCounts(
  cards: Card[],
  logs: ReviewLog[],
  now: Date,
) {
  const today = localDateStamp(now);
  const ids = new Set(
    logs
      .filter(
        (log) =>
          log.state_before === "new" &&
          localDateStamp(new Date(log.reviewed_at)) === today,
      )
      .map((log) => log.card_id),
  );
  const byDeck = new Map<string, number>();
  for (const card of cards)
    if (ids.has(card.id))
      byDeck.set(card.deck_id, (byDeck.get(card.deck_id) ?? 0) + 1);
  // Deleted or moved cards still consume today's global allowance.
  return { total: ids.size, byDeck };
}

export async function loadStudy(deckId?: string, now = new Date(), track?: Track) {
  const [allDecks, allCards, logs, preferences] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.review_logs.toArray(),
    getStudyPreferences(),
  ]);
  const decks = allDecks
    .filter((deck) => !deck.deleted_at && (!deckId || deck.id === deckId)
      && (!track || getDeckInfo(deck.id)?.track === track))
    .sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set(decks.map((deck) => deck.id));
  const counts = introductionCounts(allCards, logs, now);
  const remainingNew = Math.max(0, preferences.new_per_day - counts.total);
  // Rotate the first deck each local day so a small allowance reaches every subject.
  const day = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
  );
  const offset = decks.length && !track
    ? (day * Math.max(1, preferences.new_per_day)) % decks.length
    : 0;
  const rotated = [...decks.slice(offset), ...decks.slice(0, offset)];
  const candidates = newCardCandidates(allCards, logs, now);
  const queues = rotated.map((deck) =>
    buildQueue(candidates, deck, counts.byDeck.get(deck.id) ?? 0, now),
  );
  const future = allCards
    .filter(
      (card) =>
        ids.has(card.deck_id) &&
        !card.deleted_at &&
        !card.suspended &&
        card.state !== "new" &&
        Date.parse(card.due) > now.getTime(),
    )
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due));
  return {
    decks,
    // A focused path introduces new cards in curriculum order; due reviews stay first.
    queue: interleaveQueues(track ? [queues.flat()] : queues, remainingNew),
    nextDue: future[0]?.due ?? null,
    preferences,
    remainingNew,
  };
}
