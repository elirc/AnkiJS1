import { db, type Card, type Deck, type Note, type ReviewLog } from "../schema";
import { mergeCard, mergeDeck, mergeNote, mergeReviewLog } from "../sync/merge";
import { enqueueOutbox } from "../sync/outbox";
import { nowISO } from "../../lib/dates";
import { getCurrentSession } from "../sync/auth";

import { getStudyPreferences, saveStudyPreferences } from "./studyRepo";
import type { StudyPreferences } from "../../srs/preferences";

export interface RecallBackup {
  version: 1;
  exported_at: string;
  decks: Deck[];
  cards: Card[];
  notes: Note[];
  review_logs: ReviewLog[];
  preferences?: { daily_goal?: number } & Partial<StudyPreferences>;
}

function isBackup(value: unknown): value is RecallBackup {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    Array.isArray(record.decks) &&
    Array.isArray(record.cards) &&
    Array.isArray(record.notes) &&
    Array.isArray(record.review_logs)
  );
}

export async function exportData(): Promise<RecallBackup> {
  return db.transaction(
    "r",
    db.decks,
    db.cards,
    db.notes,
    db.review_logs,
    db.sync_meta,
    async () => ({
      version: 1,
      exported_at: nowISO(),
      decks: await db.decks.toArray(),
      cards: await db.cards.toArray(),
      notes: await db.notes.toArray(),
      review_logs: await db.review_logs.toArray(),
      preferences: {
        ...(await getStudyPreferences()),
        daily_goal: Number((await db.sync_meta.get("daily_goal"))?.value ?? 20),
      },
    }),
  );
}

function validateRows(backup: RecallBackup) {
  const date = (value: unknown) =>
    typeof value === "string" && Number.isFinite(Date.parse(value));
  const text = (value: unknown) => typeof value === "string";
  const id = (value: unknown) => text(value) && (value as string).length > 0;
  const nonnegative = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  const states = ["new", "learning", "review", "relearning"];
  for (const [table, rows] of Object.entries({
    decks: backup.decks,
    cards: backup.cards,
    notes: backup.notes,
    review_logs: backup.review_logs,
  })) {
    if (rows.length > 100_000)
      throw new Error(
        "This backup is too large. Please import fewer than 100,000 rows per table.",
      );
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== "object" || !id(row.id) || seen.has(row.id))
        throw new Error(
          `Invalid or duplicate ID in ${table}. No data was imported.`,
        );
      seen.add(row.id);
    }
  }
  for (const deck of backup.decks)
    if (
      !text(deck.name) ||
      !nonnegative(deck.new_per_day) ||
      !Number.isInteger(deck.new_per_day) ||
      !date(deck.created_at) ||
      !date(deck.updated_at) ||
      (deck.deleted_at !== null && !date(deck.deleted_at))
    )
      throw new Error("Invalid deck in backup. No data was imported.");
  for (const card of backup.cards)
    if (
      !id(card.deck_id) ||
      !text(card.front) ||
      !text(card.back) ||
      typeof card.suspended !== "boolean" ||
      !states.includes(card.state) ||
      ![
        card.due,
        card.created_at,
        card.content_updated_at,
        card.srs_updated_at,
      ].every(date) ||
      (card.last_review !== null && !date(card.last_review)) ||
      (card.deleted_at !== null && !date(card.deleted_at)) ||
      ![
        card.stability,
        card.difficulty,
        card.elapsed_days,
        card.scheduled_days,
        card.reps,
        card.lapses,
      ].every(nonnegative) ||
      (card.learning_steps !== undefined && !nonnegative(card.learning_steps))
    )
      throw new Error("Invalid card in backup. No data was imported.");
  for (const note of backup.notes)
    if (
      !text(note.body) ||
      !["inbox", "converted", "archived"].includes(note.status) ||
      !Array.isArray(note.card_ids) ||
      !note.card_ids.every(id) ||
      !date(note.created_at) ||
      !date(note.updated_at) ||
      (note.deleted_at !== null && !date(note.deleted_at))
    )
      throw new Error("Invalid note in backup. No data was imported.");
  for (const log of backup.review_logs)
    if (
      !id(log.card_id) ||
      ![1, 2, 3, 4].includes(log.rating) ||
      !states.includes(log.state_before) ||
      !date(log.reviewed_at) ||
      !date(log.due_before) ||
      ![
        log.stability_after,
        log.difficulty_after,
        log.scheduled_days_after,
      ].every(nonnegative)
    )
      throw new Error(
        "Invalid review history in backup. No data was imported.",
      );
}

export async function importData(value: unknown): Promise<void> {
  if (!isBackup(value)) throw new Error("This file is not a Recall backup.");
  validateRows(value);
  const uid = getCurrentSession()?.user.id ?? null;
  await db.transaction(
    "rw",
    [db.decks, db.cards, db.notes, db.review_logs, db.outbox, db.sync_meta],
    async () => {
      const deckIds = new Set([
        ...(await db.decks.toArray()).map((deck) => deck.id),
        ...value.decks.map((deck) => deck.id),
      ]);
      if (value.cards.some((card) => !deckIds.has(card.deck_id)))
        throw new Error(
          "A card refers to a missing deck. No data was imported.",
        );
      for (const deck of value.decks) {
        const local = await db.decks.get(deck.id);
        await db.decks.put(
          mergeDeck(local, { ...deck, user_id: local?.user_id ?? uid }),
        );
        await enqueueOutbox("decks", deck.id);
      }
      for (const note of value.notes) {
        const local = await db.notes.get(note.id);
        await db.notes.put(
          mergeNote(local, { ...note, user_id: local?.user_id ?? uid }),
        );
        await enqueueOutbox("notes", note.id);
      }
      for (const card of value.cards) {
        const local = await db.cards.get(card.id);
        await db.cards.put(
          mergeCard(local, { ...card, user_id: local?.user_id ?? uid }),
        );
        await enqueueOutbox("cards", card.id);
      }
      for (const log of value.review_logs) {
        const local = await db.review_logs.get(log.id);
        await db.review_logs.put(
          mergeReviewLog(local, { ...log, user_id: local?.user_id ?? uid }),
        );
        await enqueueOutbox("review_logs", log.id);
      }
      if (
        value.preferences &&
        (value.preferences.new_per_day !== undefined ||
          value.preferences.request_retention !== undefined)
      )
        await saveStudyPreferences({
          ...(await getStudyPreferences()),
          ...value.preferences,
        });
      const goal = value.preferences?.daily_goal;
      if (
        typeof goal === "number" &&
        Number.isInteger(goal) &&
        goal > 0 &&
        goal <= 1000
      )
        await db.sync_meta.put({ key: "daily_goal", value: String(goal) });
    },
  );
}

export async function eraseLocalData(): Promise<void> {
  await db.delete();
  await db.open();
}
