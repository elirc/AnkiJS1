import type { Card, Deck, Note, ReviewLog } from "../schema";

export type RemoteRow<T> = T & { server_updated_at?: string };

export function stripServerFields<T extends object>(row: RemoteRow<T>): T {
  const { server_updated_at: _serverUpdatedAt, ...local } = row;
  return local as T;
}

export function mergeDeck(
  local: Deck | undefined,
  remoteRow: RemoteRow<Deck>,
): Deck {
  const remote = stripServerFields(remoteRow);
  if (!local) return remote;
  return remote.updated_at >= local.updated_at ? remote : local;
}

export function mergeNote(
  local: Note | undefined,
  remoteRow: RemoteRow<Note>,
): Note {
  const remote = stripServerFields(remoteRow);
  if (!local) return remote;
  return remote.updated_at >= local.updated_at ? remote : local;
}

function newerOrTie(remoteTime: string, localTime: string): boolean {
  return remoteTime >= localTime;
}

function newestTombstone(local: Card, remote: Card): string | null {
  if (!local.deleted_at) return remote.deleted_at;
  if (!remote.deleted_at) return local.deleted_at;
  return remote.deleted_at >= local.deleted_at
    ? remote.deleted_at
    : local.deleted_at;
}

export function mergeCard(
  local: Card | undefined,
  remoteRow: RemoteRow<Card>,
): Card {
  const remote = stripServerFields(remoteRow);
  if (!local) return remote;
  const useRemoteContent = newerOrTie(
    remote.content_updated_at,
    local.content_updated_at,
  );
  const useRemoteSrs = newerOrTie(remote.srs_updated_at, local.srs_updated_at);
  return {
    ...local,
    user_id: remote.user_id ?? local.user_id,
    deck_id: useRemoteContent ? remote.deck_id : local.deck_id,
    note_id: useRemoteContent ? remote.note_id : local.note_id,
    front: useRemoteContent ? remote.front : local.front,
    back: useRemoteContent ? remote.back : local.back,
    suspended: useRemoteContent ? remote.suspended : local.suspended,
    due: useRemoteSrs ? remote.due : local.due,
    stability: useRemoteSrs ? remote.stability : local.stability,
    difficulty: useRemoteSrs ? remote.difficulty : local.difficulty,
    elapsed_days: useRemoteSrs ? remote.elapsed_days : local.elapsed_days,
    scheduled_days: useRemoteSrs ? remote.scheduled_days : local.scheduled_days,
    learning_steps: useRemoteSrs ? remote.learning_steps : local.learning_steps,
    reps: useRemoteSrs ? remote.reps : local.reps,
    lapses: useRemoteSrs ? remote.lapses : local.lapses,
    state: useRemoteSrs ? remote.state : local.state,
    last_review: useRemoteSrs ? remote.last_review : local.last_review,
    content_updated_at: useRemoteContent
      ? remote.content_updated_at
      : local.content_updated_at,
    srs_updated_at: useRemoteSrs ? remote.srs_updated_at : local.srs_updated_at,
    created_at:
      remote.created_at < local.created_at
        ? remote.created_at
        : local.created_at,
    deleted_at: newestTombstone(local, remote),
  };
}

export function mergeReviewLog(
  local: ReviewLog | undefined,
  remoteRow: RemoteRow<ReviewLog>,
): ReviewLog {
  return local ?? stripServerFields(remoteRow);
}
