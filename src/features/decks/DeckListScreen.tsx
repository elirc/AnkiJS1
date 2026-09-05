import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search } from "lucide-react";
import { Button } from "../../components/Button";
import { DeckCard } from "../../components/DeckCard";
import { getDashboard } from "../../db/repos/dashboardRepo";
import { getDeckInfo } from "../../data/curriculum";
import { CreateDeckDialog } from "./CreateDeckDialog";
import { useNow } from "../../lib/useNow";
export function DeckListScreen() {
  const [params] = useSearchParams();
  const now = useNow();
  const data = useLiveQuery(() => getDashboard(now), [now.getTime()]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(
    params.get("track") === "Start here" ? "Start here" : "All decks",
  );
  const [creating, setCreating] = useState(false);
  if (!data) return <p className="loading-state">Loading your library…</p>;
  const rows = data.summaries.filter(
    (item) =>
      (filter === "All decks" ||
        (getDeckInfo(item.deck.id)?.track ?? "Personal") === filter) &&
      `${item.deck.name} ${getDeckInfo(item.deck.id)?.topics.join(" ") ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR KNOWLEDGE, COMPOUNDING</div>
          <h1>
            Good things to know<span className="text-primary">.</span>
          </h1>
          <p>
            {data.totalCards} cards. {data.summaries.length} decks. A stronger
            foundation, one review at a time.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
          New deck
        </Button>
      </div>
      <div className="search-field">
        <Search size={18} />
        <input
          aria-label="Search decks"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a deck or topic…"
        />
      </div>
      <div className="filter-row" role="group" aria-label="Filter decks">
        {[
          "All decks",
          "Start here",
          "Foundations",
          "Frontend",
          "Backend",
          "Practice",
          "Personal",
        ].map((value) => (
          <button
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className="deck-grid">
          {rows.map((summary) => (
            <DeckCard key={summary.deck.id} summary={summary} />
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <h2>No decks found</h2>
          <p>Try another search or start a deck of your own.</p>
          <Button icon={Plus} onClick={() => setCreating(true)}>
            Create a deck
          </Button>
        </div>
      )}
      {creating && <CreateDeckDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
