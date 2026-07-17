import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, Check, CreditCard, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TextArea } from '../../components/TextArea';
import { listDecks } from '../../db/repos/deckRepo';
import { archiveNote, deleteNote, listInbox, updateNoteBody } from '../../db/repos/noteRepo';
import type { Note } from '../../db/schema';
import { relativeAge } from '../../lib/dates';
import { ConvertNoteDialog } from './ConvertNoteDialog';

export function InboxScreen() {
  const notes = useLiveQuery(listInbox, [], []);
  const decks = useLiveQuery(listDecks, [], []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [converting, setConverting] = useState<Note | null>(null);

  function startEdit(note: Note) {
    setEditingId(note.id);
    setDraft(note.body);
  }

  async function saveEdit(note: Note) {
    await updateNoteBody(note.id, draft);
    setEditingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-muted">{notes.length} notes waiting</p>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState title="Inbox zero. Go capture something." />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          {notes.map((note) => (
            <article key={note.id} className="p-4 transition hover:bg-primary/5">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <TextArea value={draft} onChange={(event) => setDraft(event.target.value)} />
                  <Button icon={Check} variant="primary" onClick={() => void saveEdit(note)}>
                    Save note
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="block w-full rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => startEdit(note)}
                >
                  <p className="line-clamp-3 whitespace-pre-wrap text-text">{note.body}</p>
                  <p className="mt-2 text-sm text-muted">{relativeAge(note.created_at)}</p>
                </button>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button icon={CreditCard} variant="primary" onClick={() => setConverting(note)}>
                  Make card
                </Button>
                <Button icon={Archive} onClick={() => void archiveNote(note.id)}>
                  Archive
                </Button>
                <Button
                  icon={Trash2}
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm('Delete this note?')) void deleteNote(note.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {converting ? (
        <ConvertNoteDialog note={converting} decks={decks} onClose={() => setConverting(null)} />
      ) : null}
    </div>
  );
}
