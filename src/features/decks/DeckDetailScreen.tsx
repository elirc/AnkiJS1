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
import { Modal } from "../../components/Modal";
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
    return <p className="loading-state">Opening your deck…</p>;
  if (data === null)
    return (
      <div className="empty-panel">
        <h1>Deck not found.</h1>
        <Link to="/decks">Back to your decks</Link>
      </div>
    );
  const { deck, counts, cards } = data;
  const info = getDeckInfo(deck.id);
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch {
      setError("Could not save that change. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <Link to="/decks" className="back-link">
        <ArrowLeft size={14} />
        All decks
      </Link>
      <div className="page-heading">
        <div>
          <div className="detail-heading">
            <DeckIcon id={deck.id} />
            <div>
              <div className="eyebrow">
                {info?.track ?? "YOUR PERSONAL DECK"}
              </div>
              <h1>{deck.name}</h1>
              <p>{info?.description ?? "Make this knowledge your own."}</p>
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
          The daily allowance in Settings also applies across all decks. Related
          new exercises wait until another day.
        </p>
        {info && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {info.topics.map((topic) => (
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
          placeholder="Search questions and answers…"
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
          <h2>Inside this deck</h2>
          <span className="text-xs text-muted">Tap a question to peek</span>
        </div>
        {cards.length === 0 ? (
          <div className="empty-panel">
            <p>
              {query
                ? "No cards match your search."
                : "Your first card is a good place to start."}
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
        <Modal
          title={deleting.deck ? "Delete this deck?" : "Delete this card?"}
          onClose={() => setDeleting(null)}
        >
          <p className="text-muted">
            {deleting.deck
              ? `“${deck.name}” and its cards will be removed from your library.`
              : "This card will be removed from your deck and study queue."}{" "}
            Export a backup in Settings if you want to keep a copy.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setDeleting(null)}>Keep it</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  if (deleting.deck) {
                    await deleteDeck(deleting.id);
                    navigate("/decks");
                  } else await deleteCard(deleting.id);
                  setDeleting(null);
                })
              }
            >
              Delete {deleting.deck ? "deck" : "card"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
