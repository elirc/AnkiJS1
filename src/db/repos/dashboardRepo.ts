import { db, type Card, type Deck, type ReviewLog } from "../schema";
import { localDateStamp } from "../../lib/dates";
import { getDeckInfo } from "../../data/curriculum";

import { getStudyPreferences, introductionCounts } from "./studyRepo";
import {
  defaultStudyPreferences,
  type StudyPreferences,
} from "../../srs/preferences";

import { newCardCandidates } from "../../srs/siblings";
import { buildQueue, interleaveQueues } from "../../srs/queue";

export interface DeckSummary {
  deck: Deck;
  total: number;
  learned: number;
  due: number;
  newAvailable: number;
}
export function calculateProgress(
  decks: Deck[],
  cards: Card[],
  logs: ReviewLog[],
  now: Date,
  preferences: StudyPreferences = defaultStudyPreferences,
) {
  const today = localDateStamp(now);
  const activeDecks = decks.filter((deck) => !deck.deleted_at);
  const deckIds = new Set(activeDecks.map((deck) => deck.id));
  const active = cards.filter(
    (card) => !card.deleted_at && !card.suspended && deckIds.has(card.deck_id),
  );
  const todayLogs = logs.filter(
    (log) => localDateStamp(new Date(log.reviewed_at)) === today,
  );
  const introduced = introductionCounts(cards, logs, now);
  const remainingNew = Math.max(0, preferences.new_per_day - introduced.total);
  const candidates = newCardCandidates(cards, logs, now).filter(
    (card) => !card.deleted_at && !card.suspended && deckIds.has(card.deck_id),
  );
  const queues = new Map(
    activeDecks.map((deck) => [
      deck.id,
      buildQueue(candidates, deck, introduced.byDeck.get(deck.id) ?? 0, now),
    ]),
  );
  const summaries: DeckSummary[] = activeDecks
    .map((deck) => {
      const own = active.filter((card) => card.deck_id === deck.id);
      return {
        deck,
        total: own.length,
        learned: own.filter((card) => card.state === "review").length,
        due: own.filter(
          (card) =>
            card.state !== "new" && Date.parse(card.due) <= now.getTime(),
        ).length,
        newAvailable: Math.min(
          remainingNew,
          queues.get(deck.id)!.filter((card) => card.state === "new").length,
        ),
      };
    })
    .sort((a, b) => {
      const aInfo = getDeckInfo(a.deck.id),
        bInfo = getDeckInfo(b.deck.id);
      if (aInfo && bInfo) return a.deck.id.localeCompare(b.deck.id);
      return aInfo ? -1 : bInfo ? 1 : a.deck.name.localeCompare(b.deck.name);
    });
  const byDay = new Map<string, number>();
  for (const log of logs) {
    const day = localDateStamp(new Date(log.reviewed_at));
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!byDay.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (byDay.has(localDateStamp(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const days = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 27 + index,
    );
    return {
      date: localDateStamp(date),
      label: date.toLocaleDateString([], { weekday: "short" }),
      count: byDay.get(localDateStamp(date)) ?? 0,
    };
  });
  const due = summaries.reduce((sum, item) => sum + item.due, 0);
  const newAvailable = interleaveQueues(
    [...queues.values()],
    remainingNew,
  ).filter((card) => card.state === "new").length;
  return {
    preferences,
    remainingNew,
    summaries,
    todayCount: todayLogs.length,
    streak,
    days,
    totalReviews: logs.length,
    recall: todayLogs.length
      ? Math.round(
          (todayLogs.filter((log) => log.rating > 1).length /
            todayLogs.length) *
            100,
        )
      : null,
    ready: due + newAvailable,
    due,
    newAvailable,
    totalCards: active.length,
    learned: active.filter((card) => card.state === "review").length,
  };
}
export async function getDashboard(now = new Date()) {
  const [decks, cards, logs, goal, preferences] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.review_logs.toArray(),
    db.sync_meta.get("daily_goal"),
    getStudyPreferences(),
  ]);
  const rawGoal = Number(goal?.value ?? 20);
  return {
    ...calculateProgress(decks, cards, logs, now, preferences),
    goal: Number.isFinite(rawGoal) && rawGoal > 0 ? rawGoal : 20,
  };
}
