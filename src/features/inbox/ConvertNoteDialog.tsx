import { useEffect, useState } from 'react';
import { Save, Split } from 'lucide-react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { TextArea } from '../../components/TextArea';
import type { Deck, Note } from '../../db/schema';
import { createCard } from '../../db/repos/cardRepo';
import { markConverted } from '../../db/repos/noteRepo';
import { getMeta, setMeta } from '../../db/repos/metaRepo';

export function ConvertNoteDialog({
  note,
  decks,
  onClose,
}: {
  note: Note;
  decks: Deck[];
  onClose: () => void;
}) {
  const [front, setFront] = useState(note.body);
  const [back, setBack] = useState('');
  const [deckId, setDeckId] = useState(decks[0]?.id ?? '');
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const canCreate = Boolean(deckId && front.trim() && back.trim());

  useEffect(() => {
    void getMeta('last_deck_id').then((value) => {
      if (value && decks.some((deck) => deck.id === value)) setDeckId(value);
    });
  }, [decks]);

  async function createOne(): Promise<string | null> {
    if (!canCreate) return null;
    const card = await createCard({ deck_id: deckId, front, back, note_id: note.id });
    await setMeta('last_deck_id', deckId);
    setCreatedIds((ids) => [...ids, card.id]);
    return card.id;
  }

  async function finish(extraId?: string) {
    const ids = extraId ? [...createdIds, extraId] : createdIds;
    if (ids.length > 0) await markConverted(note.id, ids);
    onClose();
  }

  return (
    <Modal title="Make card" onClose={() => void finish()}>
      <div className="space-y-4">
        {decks.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-3 text-muted">
            Create a deck before converting notes.
          </p>
        ) : (
          <label className="block text-sm font-medium">
            Deck
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 shadow-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              value={deckId}
              onChange={(event) => setDeckId(event.target.value)}
            >
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm font-medium">
          Front
          <TextArea className="mt-1 min-h-28" value={front} onChange={(event) => setFront(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Back
          <TextArea className="mt-1 min-h-28" value={back} onChange={(event) => setBack(event.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon={Save}
            disabled={!canCreate}
            onClick={async () => {
              const id = await createOne();
              if (id) await finish(id);
            }}
          >
            Create
          </Button>
          <Button
            icon={Split}
            disabled={!canCreate}
            onClick={async () => {
              const id = await createOne();
              if (!id) return;
              setFront('');
              setBack('');
            }}
          >
            Create and add another
          </Button>
        </div>
      </div>
    </Modal>
  );
}
