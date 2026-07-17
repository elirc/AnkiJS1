import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Edit3, Library, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { createDeck, deckCounts, deleteDeck, listDecks, renameDeck } from '../../db/repos/deckRepo';

export function DeckListScreen() {
  const navigate = useNavigate();
  const rows = useLiveQuery(async () => {
    const decks = await listDecks();
    const now = new Date();
    return Promise.all(decks.map(async (deck) => ({ deck, counts: await deckCounts(deck.id, now) })));
  }, []);

  async function addDeck() {
    const name = window.prompt('Deck name');
    if (!name) return;
    const deck = await createDeck(name);
    navigate(`/decks/${deck.id}`);
  }

  if (!rows) return <p className="text-muted">Loading</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Decks</h1>
          <p className="text-muted">{rows.length} total</p>
        </div>
        <Button icon={Plus} variant="primary" onClick={addDeck}>
          New deck
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Create a deck to start authoring cards." action={<Button icon={Plus} onClick={addDeck}>Create a deck</Button>} />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          {rows.map(({ deck, counts }) => (
            <div key={deck.id} className="flex min-h-16 items-center gap-3 px-4 transition hover:bg-primary/5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Library className="size-5" aria-hidden="true" />
              </span>
              <Link to={`/decks/${deck.id}`} className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <p className="truncate font-medium">{deck.name}</p>
                <p className="text-sm text-muted">
                  {counts.total} cards, {counts.due + counts.new_available} due today
                </p>
              </Link>
              <Button
                className="size-11 px-0"
                variant="ghost"
                icon={Edit3}
                aria-label="Rename deck"
                onClick={() => {
                  const name = window.prompt('New deck name', deck.name);
                  if (name) void renameDeck(deck.id, name);
                }}
              />
              <Button
                className="size-11 px-0"
                variant="ghost"
                icon={Trash2}
                aria-label="Delete deck"
                onClick={() => {
                  if (window.confirm(`Delete ${deck.name} and its ${counts.total} cards?`)) {
                    void deleteDeck(deck.id);
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
