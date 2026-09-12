import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  ArrowRight,
  Edit3,
  ExternalLink,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { MarkdownView } from "../../components/MarkdownView";
import { AnswerExplorer } from "../../components/AnswerExplorer";
import { DeckIcon } from "../../components/DeckCard";
import {
  deleteCard,
  searchCards,
  updateContent,
} from "../../db/repos/cardRepo";
import {
  deckCounts,
  deleteDeck,
  getDeck,
  setNewPerDay,
} from "../../db/repos/deckRepo";
import { formatDue } from "../../lib/dates";
import { getDeckInfo } from "../../data/curriculum";
import { DOTNET_TRACK } from "../../data/dotnet-path";
import { CreateDeckDialog } from "./CreateDeckDialog";
import { useNow } from "../../lib/useNow";
export function DeckDetailScreen() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const now = useNow();
  const [visibleCount, setVisibleCount] = useState(30);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState<{
    id: string;
    deck: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const data = useLiveQuery(async () => {
    const deck = await getDeck(deckId);
    if (!deck) return null;
    return {
      deck,
      counts: await deckCounts(deck.id, now),
      cards: await searchCards(query, deck.id),
    };
  }, [deckId, query, now.getTime()]);
  if (data === undefined)
    return <p className="loading-state">Loading deck</p>;
  if (data === null)
    return (
      <div className="empty-panel">
        <h1>Deck not found</h1>
        <p>It may have been deleted, or the link is wrong.</p>
        <Link to="/decks">All decks</Link>
      </div>
    );
  const { deck, counts, cards } = data;
  const info = getDeckInfo(deck.id);
  const backTo = info?.track === DOTNET_TRACK ? "/dotnet" : "/decks";
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch {
      setError("That change was not saved. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <Link to={backTo} className="back-link">
        <ArrowLeft size={14} />
        {info?.track === DOTNET_TRACK ? "C# & .NET path" : "All decks"}
      </Link>
      <div className="page-heading">
        <div>
          <div className="detail-heading">
            <DeckIcon id={deck.id} />
            <div>
              <div className="eyebrow">
                {info?.track ?? "Personal deck"}
              </div>
              <h1>{deck.name}</h1>
              <p>{info?.description ?? "Cards you added yourself."}</p>
            </div>
          </div>
          <div className="detail-actions">
            <Button
              variant="primary"
              icon={Play}
              disabled={counts.due + counts.new_available === 0}
              onClick={() => navigate(`/study/${deck.id}?minutes=5`)}
            >
              Study this deck
              <ArrowRight size={14} />
            </Button>
            <Button
              icon={Plus}
              onClick={() => navigate(`/cards/new?deckId=${deck.id}`)}
            >
              Add card
            </Button>
            <Button
              aria-label="Rename deck"
              icon={Edit3}
              variant="ghost"
              onClick={() => setRenaming(true)}
            />
            <Button
              aria-label="Delete deck"
              icon={Trash2}
              variant="ghost"
              onClick={() => setDeleting({ id: deck.id, deck: true })}
            />
          </div>
        </div>
      </div>
      <section className="content-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">
            <strong className="text-text">{counts.total}</strong> active cards ·{" "}
            <strong className="text-primary">
              {counts.due + counts.new_available}
            </strong>{" "}
            ready to study
          </p>
          <label className="flex items-center gap-3 text-xs text-muted">
            New cards per day
            <input
              aria-label="New cards per day"
              className="text-input !w-20"
              type="number"
              min="0"
              max="100"
              value={deck.new_per_day}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (Number.isFinite(value))
                  void action(() =>
                    setNewPerDay(deck.id, Math.min(100, value)),
                  );
              }}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">
          The global new-card limit in Settings also applies. Related new
          exercises are introduced on different days.
        </p>
        {info && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[...new Set(info.topics)].map((topic) => (
              <span className="deck-category" key={topic}>
                {topic}
              </span>
            ))}
            <a
              href={info.resource.url}
              target="_blank"
              rel="noreferrer"
              className="subtle-link ml-auto"
            >
              {info.resource.label}
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </section>
      <div className="search-field">
        <Search size={18} />
        <input
          aria-label="Search cards"
          placeholder="Search questions and answers"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(30);
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-again">
          {error}
        </p>
      )}
      <section className="content-panel">
        <div className="panel-heading">
          <h2>Cards</h2>
          <span className="text-xs text-muted">Select a question to show its answer</span>
        </div>
        {cards.length === 0 ? (
          <div className="empty-panel">
            <p>
              {query
                ? "No cards match the search."
                : "This deck has no cards yet."}
            </p>
            {!query && (
              <Button
                icon={Plus}
                onClick={() => navigate(`/cards/new?deckId=${deck.id}`)}
              >
                Add a card
              </Button>
            )}
          </div>
        ) : (
          cards.slice(0, visibleCount).map((card) => (
            <article className="card-list-row" key={card.id}>
              <div className="card-list-head">
                <button
                  className="card-list-question"
                  aria-expanded={expanded === card.id}
                  onClick={() =>
                    setExpanded(expanded === card.id ? null : card.id)
                  }
                >
                  <p>
                    {card.front.split("```")[0].replace(/\*\*/g, "").trim()}
                  </p>
                  <span className="card-list-status">
                    <span>
                      {card.suspended
                        ? "Suspended"
                        : card.state === "new"
                          ? "New card"
                          : `${card.state} · ${formatDue(card.due)}`}
                    </span>
                    <span>{card.reps} reviews</span>
                  </span>
                </button>
                <div className="card-list-actions">
                  <Button
                    className="!size-11 !p-0"
                    variant="ghost"
                    icon={Edit3}
                    aria-label="Edit card"
                    onClick={() => navigate(`/cards/${card.id}/edit`)}
                  />
                  <Button
                    className="!size-11 !p-0"
                    variant="ghost"
                    icon={card.suspended ? Play : Pause}
                    disabled={busy}
                    aria-label={card.suspended ? "Resume card" : "Suspend card"}
                    onClick={() =>
                      void action(() =>
                        updateContent(card.id, { suspended: !card.suspended }),
                      )
                    }
                  />
                  <Button
                    className="!size-11 !p-0"
                    variant="ghost"
                    icon={Trash2}
                    aria-label="Delete card"
                    onClick={() => setDeleting({ id: card.id, deck: false })}
                  />
                </div>
              </div>
              {expanded === card.id && (
                <div className="card-list-answer">
                  {card.front.includes("```") && (
                    <MarkdownView source={card.front} className="mb-5" />
                  )}
                  <AnswerExplorer front={card.front} back={card.back} />
                </div>
              )}
            </article>
          ))
        )}
        {cards.length > visibleCount && (
          <div className="mt-5 text-center">
            <Button onClick={() => setVisibleCount((count) => count + 30)}>
              Show 30 more ({cards.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </section>
      {renaming && (
        <CreateDeckDialog deck={deck} onClose={() => setRenaming(false)} />
      )}
      {deleting && (
        <ConfirmDialog
          title={deleting.deck ? "Delete this deck?" : "Delete this card?"}
          confirmLabel={deleting.deck ? "Delete deck" : "Delete card"}
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            void action(async () => {
              if (deleting.deck) {
                await deleteDeck(deleting.id);
                navigate(backTo);
              } else await deleteCard(deleting.id);
              setDeleting(null);
            })
          }
        >
          <p>
            {deleting.deck
              ? `“${deck.name}” and its ${counts.total} cards will be removed, including their review history.`
              : "This card and its review history will be removed."}{" "}
            Export a backup in Settings first if you want to keep a copy.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
