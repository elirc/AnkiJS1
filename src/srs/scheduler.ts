import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
} from 'ts-fsrs';
import type { Card, CardState, ReviewLog } from '../db/schema';
import { humanIntervalFromMs, nowISO } from '../lib/dates';
import { createId } from '../lib/ids';

export type FsrsFieldSubset = Pick<
  Card,
  | 'due'
  | 'stability'
  | 'difficulty'
  | 'elapsed_days'
  | 'scheduled_days'
  | 'reps'
  | 'lapses'
  | 'state'
  | 'last_review'
>;

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

const toFsrsState: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const fromFsrsState: Record<State, CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const ratingMap = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
} as const;

function toFsrsCard(card: Card): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: toFsrsState[card.state],
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

function fieldsFromFsrs(card: FsrsCard): FsrsFieldSubset {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: fromFsrsState[card.state],
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

export function newCardFields(now: Date): FsrsFieldSubset {
  const empty = createEmptyCard(now);
  return fieldsFromFsrs(empty);
}

export function rate(
  card: Card,
  rating: 1 | 2 | 3 | 4,
  now: Date,
): { card: Card; log: ReviewLog } {
  const result = scheduler.next(toFsrsCard(card), now, ratingMap[rating]);
  const updatedFields = fieldsFromFsrs(result.card);
  const reviewed_at = nowISO(now);
  const cardAfter: Card = {
    ...card,
    ...updatedFields,
    srs_updated_at: reviewed_at,
  };
  const log: ReviewLog = {
    id: createId(),
    user_id: card.user_id,
    card_id: card.id,
    rating,
    state_before: card.state,
    due_before: card.due,
    stability_after: cardAfter.stability,
    difficulty_after: cardAfter.difficulty,
    scheduled_days_after: cardAfter.scheduled_days,
    reviewed_at,
  };
  return { card: cardAfter, log };
}

export function previewIntervals(card: Card, now: Date): {
  again: string;
  hard: string;
  good: string;
  easy: string;
} {
  const preview = scheduler.repeat(toFsrsCard(card), now);
  const records = preview as Record<Rating.Again | Rating.Hard | Rating.Good | Rating.Easy, { card: FsrsCard }>;
  const format = (rating: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) =>
    humanIntervalFromMs(records[rating].card.due.getTime() - now.getTime());
  return {
    again: format(Rating.Again),
    hard: format(Rating.Hard),
    good: format(Rating.Good),
    easy: format(Rating.Easy),
  };
}
