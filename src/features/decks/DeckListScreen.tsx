import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search } from "lucide-react";
import { Button } from "../../components/Button";
import { DeckCard } from "../../components/DeckCard";
import { getDashboard } from "../../db/repos/dashboardRepo";
import { getDeckInfo } from "../../data/curriculum";
import { CreateDeckDialog } from "./CreateDeckDialog";
import { useNow } from "../../lib/useNow";

const filters = [
  "All decks", "Start here", "Keep going", "C# & .NET", "Foundations", "Frontend",
  "Backend", "Practice", "Personal",
];

export function DeckListScreen() {
  const [params, setParams] = useSearchParams();
  const now = useNow();
  const data = useLiveQuery(() => getDashboard(now), [now.getTime()]);
  const query = params.get("q") ?? "";
  const setQuery = (value: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set("q", value);
    else next.delete("q");
    return next;
  }, { replace: true });
  const requestedTrack = params.get("track") ?? "All decks";
  const filter = filters.includes(requestedTrack) ? requestedTrack : "All decks";
  const setFilter = (value: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value === "All decks") next.delete("track");
    else next.set("track", value);
    return next;
  }, { replace: true });
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
        {filters.map((value) => (
          <button
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {filter === "C# & .NET" && <Link to="/dotnet" className="next-step-link">
        Follow the C# & .NET learning path and start a focused study session
      </Link>}
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
