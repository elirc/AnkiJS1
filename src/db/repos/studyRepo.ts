import { db, type Card, type ReviewLog } from "../schema";
import { localDateStamp } from "../../lib/dates";
import {
  normalizeStudyPreferences,
  type StudyPreferences,
} from "../../srs/preferences";
import { newCardCandidates } from "../../srs/siblings";
import { buildQueues, interleaveQueues } from "../../srs/queue";
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
  const ids = new Set<string>();
  for (const log of logs)
    if (log.state_before === "new" && localDateStamp(new Date(log.reviewed_at)) === today)
      ids.add(log.card_id);
  const byDeck = new Map<string, number>();
  if (ids.size)
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
  const byDeck = buildQueues(candidates, rotated, counts.byDeck, now);
  const queues = rotated.map((deck) => byDeck.get(deck.id) ?? []);
  let nextDue: string | null = null;
  let nextDueMs = Infinity;
  for (const card of allCards) {
    if (!ids.has(card.deck_id) || card.deleted_at || card.suspended || card.state === "new") continue;
    const dueMs = Date.parse(card.due);
    if (dueMs > now.getTime() && dueMs < nextDueMs) {
      nextDueMs = dueMs;
      nextDue = card.due;
    }
  }
  return {
    decks,
    // A focused path introduces new cards in curriculum order; due reviews stay first.
    queue: interleaveQueues(track ? [queues.flat()] : queues, remainingNew),
    nextDue,
    preferences,
    remainingNew,
  };
}
