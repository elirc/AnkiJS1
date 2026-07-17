import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { MarkdownView } from '../../components/MarkdownView';
import { TextArea } from '../../components/TextArea';
import { createCard, getCard, updateContent } from '../../db/repos/cardRepo';
import { listDecks } from '../../db/repos/deckRepo';

type MobileMode = 'edit' | 'preview';

export function CardEditorScreen() {
  const { cardId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const decks = useLiveQuery(listDecks, [], []);
  const card = useLiveQuery(() => (cardId ? getCard(cardId) : Promise.resolve(undefined)), [cardId]);
  const [deckId, setDeckId] = useState(searchParams.get('deckId') ?? '');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [mode, setMode] = useState<MobileMode>('edit');
  const returnTo = searchParams.get('returnTo');
  const editing = Boolean(cardId);

  useEffect(() => {
    if (card) {
      setDeckId(card.deck_id);
      setFront(card.front);
      setBack(card.back);
    } else if (!editing && decks.length > 0 && !deckId) {
      setDeckId(decks[0].id);
    }
  }, [card, deckId, decks, editing]);

  async function save(addAnother = false) {
    if (!deckId || !front.trim() || !back.trim()) return;
    if (editing && cardId) {
      await updateContent(cardId, { deck_id: deckId, front: front.trim(), back: back.trim() });
      navigate(returnTo ?? `/decks/${deckId}`);
      return;
    }
    await createCard({ deck_id: deckId, front, back, note_id: searchParams.get('noteId') ?? undefined });
    if (addAnother) {
      setFront('');
      setBack('');
      setMode('edit');
      return;
    }
    navigate(`/decks/${deckId}`);
  }

  if (decks.length === 0) return <EmptyState title="Create a deck before adding cards." />;
  if (editing && card === undefined) return <p className="text-muted">Loading</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{editing ? 'Edit card' : 'New card'}</h1>
        <p className="text-muted">Markdown is supported. Raw HTML stays disabled.</p>
      </div>

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

      <div className="inline-grid grid-cols-2 rounded-xl border border-line bg-surface p-1 shadow-sm lg:hidden">
        <button
          type="button"
          className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${mode === 'edit' ? 'bg-primary text-white' : 'text-muted'}`}
          onClick={() => setMode('edit')}
        >
          Edit
        </button>
        <button
          type="button"
          className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${mode === 'preview' ? 'bg-primary text-white' : 'text-muted'}`}
          onClick={() => setMode('preview')}
        >
          Preview
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={mode === 'preview' ? 'hidden lg:block' : 'space-y-4'}>
          <label className="block text-sm font-medium">
            Front
            <TextArea
              className="mt-1 min-h-44"
              value={front}
              onChange={(event) => setFront(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void save();
              }}
            />
          </label>
          <label className="block text-sm font-medium">
            Back
            <TextArea
              className="mt-1 min-h-44"
              value={back}
              onChange={(event) => setBack(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void save();
              }}
            />
          </label>
        </div>
        <div className={mode === 'edit' ? 'hidden lg:grid lg:gap-4' : 'grid gap-4'}>
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-muted">Front preview</p>
            <MarkdownView source={front} />
          </section>
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-muted">Back preview</p>
            <MarkdownView source={back} />
          </section>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={Save} disabled={!deckId || !front.trim() || !back.trim()} onClick={() => void save()}>
          Save
        </Button>
        {!editing ? (
          <Button disabled={!deckId || !front.trim() || !back.trim()} onClick={() => void save(true)}>
            Save and add another
          </Button>
        ) : null}
      </div>
    </div>
  );
}
