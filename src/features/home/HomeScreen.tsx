import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Code2,
  Hammer,
  Inbox,
  Play,
  Plus,
  Target,
  Wrench,
} from "lucide-react";
import { Button } from "../../components/Button";
import { DeckCard } from "../../components/DeckCard";
import { getDashboard } from "../../db/repos/dashboardRepo";
import { listInbox } from "../../db/repos/noteRepo";
import { getDeckInfo, curriculum } from "../../data/curriculum";
import { dotnetDecks } from "../../data/dotnet-path";
import { engineeringMissions } from "../../data/engineering-missions";
import { useNow } from "../../lib/useNow";
import { CreateDeckDialog } from "../decks/CreateDeckDialog";

const startHereCount = curriculum.filter((deck) => deck.track === "Start here").length;
const keepGoingCount = curriculum.filter((deck) => deck.track === "Keep going").length;

const paths = [
  {
    to: "/decks?track=Start+here",
    icon: BookOpen,
    label: "Start here",
    text: `${startHereCount} beginner decks. Each card has a plain-English answer, a worked example, an analogy, a common mistake, and a practice question.`,
  },
  {
    to: "/decks?track=Keep+going",
    icon: Wrench,
    label: "Keep going",
    text: `${keepGoingCount} decks on TypeScript, Python, debugging, testing, accessibility, APIs, SQL, security, and delivery.`,
  },
  {
    to: "/dotnet",
    icon: Code2,
    label: "C# & .NET",
    text: `${dotnetDecks.length} ordered decks from C# syntax to an ASP.NET Core app with EF Core.`,
  },
  {
    to: "/practice",
    icon: Hammer,
    label: "Engineering practice",
    text: `${engineeringMissions.length} hands-on missions with a journal for your evidence.`,
  },
];

export function HomeScreen() {
  const navigate = useNavigate();
  const now = useNow();
  const data = useLiveQuery(() => getDashboard(now), [now.getTime()]);
  const inboxCount = useLiveQuery(
    async () => (await listInbox()).length,
    [],
    0,
  );
  const [minutes, setMinutes] = useState(5);
  const [filter, setFilter] = useState("All decks");
  const [creating, setCreating] = useState(false);
  if (!data)
    return (
      <div className="loading-state">
        <span className="loading-dot" />
        Loading your decks
      </div>
    );
  const progress = Math.min(100, (data.todayCount / data.goal) * 100);
  const rows = data.summaries.filter(
    (item) =>
      filter === "All decks" || getDeckInfo(item.deck.id)?.track === filter,
  );
  const week = data.days.slice(-7);
  const maxWeek = Math.max(data.goal, ...week.map((day) => day.count));
  const remainingToGoal = Math.max(0, data.goal - data.todayCount);
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h1>Today</h1>
          <p>
            {now.toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="hero-grid">
        <section className="study-hero" aria-labelledby="study-heading">
          <div className="hero-copy">
            <h2 id="study-heading">
              {data.ready > 0
                ? `${data.ready} cards ready`
                : "Nothing due right now"}
            </h2>
            <p>
              {data.ready > 0 ? (
                <>
                  <strong>{data.due} due</strong> for review and{" "}
                  <strong>{data.newAvailable} new</strong> cards available.
                  Choose a session length and start. You can stop at any time.
                </>
              ) : (
                <>
                  Come back when the next review is due, or open a deck to
                  read its cards.
                </>
              )}
            </p>
            <div
              className="time-options"
              role="group"
              aria-label="Session length"
            >
              {[2, 5, 10].map((value) => (
                <button
                  key={value}
                  aria-pressed={minutes === value}
                  onClick={() => setMinutes(value)}
                >
                  <Clock3 size={14} />
                  {value} min
                </button>
              ))}
            </div>
            <Button
              className="start-study"
              variant="primary"
              disabled={data.ready === 0}
              onClick={() => navigate(`/study?minutes=${minutes}`)}
            >
              <Play size={15} fill="currentColor" />
              Study now
              <ArrowRight size={17} />
            </Button>
            <span className="hero-footnote">
              {data.due} due · {data.newAvailable} new today. Stop anytime.
            </span>
          </div>
        </section>
        <section className="goal-card">
          <div className="panel-heading">
            <h2>Today’s goal</h2>
            <Target size={18} />
          </div>
          <div
            className="goal-ring"
            role="img"
            aria-label={`${data.todayCount} of ${data.goal} reviews today`}
          >
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="51" className="ring-track" />
              <circle
                cx="60"
                cy="60"
                r="51"
                className="ring-value"
                strokeDasharray={`${progress * 3.2044} 320.44`}
              />
            </svg>
            <div>
              <strong>
                {data.todayCount}
                <span> / {data.goal}</span>
              </strong>
              <small>cards reviewed</small>
            </div>
          </div>
          <p>
            {progress >= 100
              ? "Daily goal reached."
              : `${remainingToGoal} more ${remainingToGoal === 1 ? "review" : "reviews"} to reach today’s goal.`}
          </p>
          <Link to="/settings" className="subtle-link">
            Change daily goal <ArrowRight size={13} />
          </Link>
        </section>
      </div>
      {inboxCount > 0 && (
        <Link to="/inbox" className="inbox-banner">
          <Inbox size={18} />
          <span>
            {inboxCount} {inboxCount === 1 ? "note" : "notes"} waiting
          </span>
          <span>
            Turn a note into a card <ArrowRight size={15} />
          </span>
        </Link>
      )}
      <section className="pathway-panel" aria-labelledby="pathway-heading">
        <div className="section-heading">
          <div>
            <h2 id="pathway-heading">Paths</h2>
            <p>Ordered decks and missions for a specific goal.</p>
          </div>
          <Link className="text-link" to="/decks">
            All decks
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="pathway-grid">
          {paths.map((path) => (
            <Link className="pathway-card" to={path.to} key={path.to}>
              <span className="pathway-icon">
                <path.icon size={18} aria-hidden="true" />
              </span>
              <span>
                <strong>{path.label}</strong>
                <small>{path.text}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <section className="decks-section">
        <div className="section-heading">
          <div>
            <h2>
              Decks <span className="count-pill">{data.summaries.length}</span>
            </h2>
            <p>
              {data.learned} of {data.totalCards} cards are in the review
              stage.
            </p>
          </div>
          <Link className="text-link" to="/decks">
            All decks
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="filter-row" role="group" aria-label="Filter decks">
          {["All decks", "Foundations", "Frontend", "Backend", "Practice"].map(
            (value) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ),
          )}
        </div>
        {data.summaries.length === 0 ? (
          <div className="empty-panel">
            <h3>No decks yet.</h3>
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Create a deck
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-panel">No decks in this track.</div>
        ) : (
          <div className="deck-grid">
            {rows.slice(0, 6).map((summary) => (
              <DeckCard key={summary.deck.id} summary={summary} />
            ))}
          </div>
        )}
      </section>
      <section className="weekly-panel">
        <div className="panel-heading">
          <h2>Last 7 days</h2>
          <Link to="/progress" className="subtle-link">
            All progress
            <ArrowRight size={14} />
          </Link>
        </div>
        <div
          className="weekly-chart"
          aria-label="Reviews over the last seven days"
        >
          {week.map((day) => (
            <div
              className="chart-day"
              key={day.date}
              title={`${day.date}: ${day.count} reviews`}
            >
              <span className="chart-count">{day.count}</span>
              <div className="chart-track">
                <span
                  style={{
                    height: `${Math.max(3, (day.count / maxWeek) * 100)}%`,
                  }}
                  className={day.date === week[6].date ? "today" : ""}
                />
              </div>
              <span>{day.label}</span>
            </div>
          ))}
        </div>
      </section>
      {creating && <CreateDeckDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
