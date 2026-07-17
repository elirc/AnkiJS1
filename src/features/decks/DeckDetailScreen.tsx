import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Edit3, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { deleteCard, searchCards, updateContent } from '../../db/repos/cardRepo';
import { deckCounts, getDeck, renameDeck, setNewPerDay } from '../../db/repos/deckRepo';
import { formatDue } from '../../lib/dates';

export function DeckDetailScreen() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const data = useLiveQuery(async () => {
    const deck = await getDeck(deckId);
    if (!deck) return undefined;
    return {
      deck,
      counts: await deckCounts(deck.id, new Date()),
      cards: await searchCards(query, deck.id),
    };
  }, [deckId, query]);

  if (data === undefined) return <EmptyState title="Deck not found." />;
  const { deck, counts, cards } = data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            type="button"
            className="group flex items-center gap-2 rounded-lg text-left text-2xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Rename deck"
            onClick={() => {
              const name = window.prompt('New deck name', deck.name);
              if (name) void renameDeck(deck.id, name);
            }}
          >
            {deck.name}
            <Edit3
              className="size-4 text-muted opacity-60 transition group-hover:text-primary group-hover:opacity-100"
              aria-hidden="true"
            />
          </button>
          <p className="text-muted">
            {counts.total} cards, {counts.due + counts.new_available} due today
          </p>
        </div>
        <Button icon={Plus} variant="primary" onClick={() => navigate(`/cards/new?deckId=${deck.id}`)}>
          Add card
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm">
        <span className="text-sm font-medium">New per day</span>
        <Button className="size-11 px-0" icon={Minus} aria-label="Decrease new per day" onClick={() => void setNewPerDay(deck.id, deck.new_per_day - 1)} />
        <input
          className="h-11 w-20 rounded-xl border border-line bg-background text-center outline-none focus:ring-2 focus:ring-primary"
          type="number"
          min={0}
          value={deck.new_per_day}
          onChange={(event) => void setNewPerDay(deck.id, Number(event.target.value))}
        />
        <Button className="size-11 px-0" icon={Plus} aria-label="Increase new per day" onClick={() => void setNewPerDay(deck.id, deck.new_per_day + 1)} />
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          className="min-h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 shadow-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          placeholder="Search cards"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {cards.length === 0 ? (
        <EmptyState title="No cards match this deck yet." />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          {cards.map((card) => (
            <div key={card.id} className="flex min-h-16 items-center gap-3 px-4 transition hover:bg-primary/5">
              <Link to={`/cards/${card.id}/edit`} className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <p className="truncate font-medium">{card.front}</p>
                <p className="text-sm text-muted">
                  {card.state} · {formatDue(card.due)}
                </p>
              </Link>
              <Button
                variant="ghost"
                onClick={() => void updateContent(card.id, { suspended: !card.suspended })}
              >
                {card.suspended ? 'Unsuspend' : 'Suspend'}
              </Button>
              <Button
                className="size-11 px-0"
                variant="ghost"
                icon={Trash2}
                aria-label="Delete card"
                onClick={() => {
                  if (window.confirm('Delete this card?')) void deleteCard(card.id);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
