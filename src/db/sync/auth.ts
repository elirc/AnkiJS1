import type { Session } from '@supabase/supabase-js';
import { db } from '../schema';
import { enqueueOutbox } from './outbox';
import { getSession, getSupabaseClient } from './supabaseClient';
import { syncNow } from './engine';

type AuthListener = () => void;

const listeners = new Set<AuthListener>();
let currentSession: Session | null = null;

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentSession(): Session | null {
  return currentSession;
}

function emitAuth() {
  for (const listener of listeners) listener();
}

export async function initAuth(): Promise<void> {
  currentSession = await getSession();
  const client = getSupabaseClient();
  client?.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    emitAuth();
    if (session) void adoptLocalData(session.user.id);
  });
  emitAuth();
  if (currentSession) await adoptLocalData(currentSession.user.id);
}

export async function sendMagicLink(email: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
  currentSession = null;
  emitAuth();
}

export async function adoptLocalData(uid: string): Promise<void> {
  const ownedUsers = new Set<string>();
  const tables = [db.decks, db.cards, db.notes, db.review_logs] as const;
  for (const table of tables) {
    const rows = await table.toArray();
    rows.forEach((row) => {
      if (row.user_id && row.user_id !== uid) ownedUsers.add(row.user_id);
    });
  }
  if (ownedUsers.size > 0) {
    await db.sync_meta.put({
      key: 'auth_blocked',
      value: 'This device has data belonging to another account.',
    });
    return;
  }

  await db.transaction('rw', db.decks, db.cards, db.notes, db.review_logs, db.outbox, async () => {
    const deckRows = (await db.decks.toArray()).filter((row) => row.user_id === null);
    const cardRows = (await db.cards.toArray()).filter((row) => row.user_id === null);
    const noteRows = (await db.notes.toArray()).filter((row) => row.user_id === null);
    const logRows = (await db.review_logs.toArray()).filter((row) => row.user_id === null);
    for (const deck of deckRows) {
      await db.decks.update(deck.id, { user_id: uid });
      await enqueueOutbox('decks', deck.id);
    }
    for (const card of cardRows) {
      await db.cards.update(card.id, { user_id: uid });
      await enqueueOutbox('cards', card.id);
    }
    for (const note of noteRows) {
      await db.notes.update(note.id, { user_id: uid });
      await enqueueOutbox('notes', note.id);
    }
    for (const log of logRows) {
      await db.review_logs.update(log.id, { user_id: uid });
      await enqueueOutbox('review_logs', log.id);
    }
  });
  void syncNow();
}
