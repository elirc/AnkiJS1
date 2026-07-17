import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Inbox, Library, Plus, Sparkles } from 'lucide-react';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { deckCounts, listDecks, createDeck } from '../../db/repos/deckRepo';
import { listInbox } from '../../db/repos/noteRepo';

export function HomeScreen() {
  const navigate = useNavigate();
  const summaries = useLiveQuery(async () => {
    const decks = await listDecks();
    const now = new Date();
    return Promise.all(
      decks.map(async (deck) => ({
        deck,
        counts: await deckCounts(deck.id, now),
      })),
    );
  }, []);
  const inboxCount = useLiveQuery(async () => (await listInbox()).length, [], 0);
  const dueTotal = summaries?.reduce((sum, item) => sum + item.counts.due + item.counts.new_available, 0) ?? 0;

  async function addDeck() {
    const name = window.prompt('Deck name');
    if (!name) return;
    const deck = await createDeck(name);
    navigate(`/decks/${deck.id}`);
  }

  if (!summaries) return <p className="text-muted">Loading</p>;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-pressed p-6 text-white shadow-lg shadow-primary/25">
        <div
          className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 right-24 size-56 rounded-full bg-white/5 blur-xl"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-white/80">Due now</p>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-6xl font-semibold leading-none tracking-tight">{dueTotal}</h1>
            <p className="mt-2 text-white/80">
              {dueTotal > 0 ? 'Cards ready for review' : 'Nothing due right now'}
            </p>
          </div>
          <Button
            variant="inverse"
            icon={Sparkles}
            disabled={dueTotal === 0}
            onClick={() => navigate('/study')}
            className="sm:min-w-40"
          >
            Study now
          </Button>
        </div>
      </section>

      {inboxCount > 0 ? (
        <Link
          to="/inbox"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-accent/25 bg-accent/10 px-4 text-text shadow-sm outline-none transition hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Inbox className="size-5" aria-hidden="true" />
          </span>
          <span className="font-medium">{inboxCount} notes waiting</span>
          <span className="ml-auto flex items-center gap-1 text-sm text-muted">
            Open inbox
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
      ) : null}

      {summaries.length === 0 ? (
        <EmptyState
          title="Capture raw thoughts, turn them into cards, then review them when they are due."
          action={
            <>
              <Button icon={Plus} variant="primary" onClick={addDeck}>
                Create a deck
              </Button>
              <Button icon={Inbox} onClick={() => navigate('/capture')}>
                Capture a thought
              </Button>
            </>
          }
        />
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Decks</h2>
            <Button icon={Plus} variant="ghost" onClick={addDeck}>
              New deck
            </Button>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            {summaries.map(({ deck, counts }) => (
              <Link
                key={deck.id}
                to={`/study/${deck.id}`}
                className="flex min-h-16 items-center gap-3 px-4 outline-none transition hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Library className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{deck.name}</p>
                  <p className="text-sm text-muted">{counts.total} cards</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
                    {counts.due + counts.new_available} due
                  </span>
                  <span className="hidden text-sm text-muted sm:inline">{counts.new_available} new</span>
                  <ChevronRight className="size-4 text-muted" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
