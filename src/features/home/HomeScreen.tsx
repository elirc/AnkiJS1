import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  Check,
  Clock3,
  Flame,
  Inbox,
  Layers,
  Lightbulb,
  Play,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "../../components/Button";
import { DeckCard } from "../../components/DeckCard";
import { getDashboard } from "../../db/repos/dashboardRepo";
import { listInbox } from "../../db/repos/noteRepo";
import { getDeckInfo, curriculum } from "../../data/curriculum";
import { useNow } from "../../lib/useNow";
import { CreateDeckDialog } from "../decks/CreateDeckDialog";

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
        Getting your study space ready…
      </div>
    );
  const progress = Math.min(100, (data.todayCount / data.goal) * 100);
  const rows = data.summaries.filter(
    (item) =>
      filter === "All decks" || getDeckInfo(item.deck.id)?.track === filter,
  );
  const week = data.days.slice(-7);
  const maxWeek = Math.max(data.goal, ...week.map((day) => day.count));
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> YOUR DAILY COMMIT
          </div>
          <h1>
            A little better, every day<span className="text-primary">.</span>
          </h1>
          <p>Turn your spare minutes into your next engineering superpower.</p>
        </div>
        <span className="date-label">
          {now.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <div className="hero-grid">
        <section className="study-hero">
          <div className="hero-copy">
            <span className="hero-kicker">
              <Sparkles size={14} /> LITTLE SESSIONS. LASTING SKILLS.
            </span>
            <h2>
              A few minutes.
              <br />A sharper mind.
            </h2>
            <p>
              {data.ready > 0 ? (
                <>
                  <strong>{data.ready} cards</strong> are ready when you are.
                  <br />
                  Pick a moment. Make it count.
                </>
              ) : (
                <>
                  You’re all caught up for now.
                  <br />
                  Come back when your next cards are ready.
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
          <div className="hero-art" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <span className="art-spark">✦</span>
            <div className="art-card card-back" />
            <div className="art-card card-middle" />
            <div className="art-card card-front">
              <div className="art-dots">
                <i />
                <i />
                <i />
                <span>one small commit</span>
              </div>
              <div className="art-code">
                <span className="code-comment">// invest in yourself</span>
                <br />
                <span className="code-purple">while</span> (curious) {"{"}
                <br />
                &nbsp;&nbsp;<span className="code-green">learn</span>();
                <br />
                &nbsp;&nbsp;<span className="code-green">build</span>();
                <br />
                &nbsp;&nbsp;<span className="code-green">repeat</span>();
                <br />
                {"}"}
              </div>
              <span className="art-success">
                <Check size={12} /> Growth, one card at a time
              </span>
            </div>
            <span className="art-plus">+</span>
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
              ? "Daily goal complete. Nicely done!"
              : "A little consistency goes a long way."}
          </p>
          <Link to="/settings" className="subtle-link">
            Adjust daily goal <ArrowRight size={13} />
          </Link>
        </section>
      </div>
      <Link className="beginner-banner" to="/decks?track=Start+here">
        <span>
          <strong>New to coding? Start here.</strong>
          <small>
            Plain English, small examples, and another way to explain every
            idea.
          </small>
        </span>
        <ArrowRight size={20} aria-hidden="true" />
      </Link>
      <section className="stats-row" aria-label="Study statistics">
        <div className="stat-item">
          <span className="stat-icon mint">
            <Layers size={20} />
          </span>
          <div>
            <span>Ready to study</span>
            <strong>
              {data.ready}
              <small>
                {data.due} review · {data.newAvailable} new
              </small>
            </strong>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon amber">
            <Flame size={20} />
          </span>
          <div>
            <span>Current streak</span>
            <strong>
              {data.streak}
              <small>{data.streak === 1 ? "day" : "days"} of showing up</small>
            </strong>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon violet">
            <Check size={20} />
          </span>
          <div>
            <span>Cards in review</span>
            <strong>
              {data.learned}
              <small>of {data.totalCards} in your library</small>
            </strong>
          </div>
        </div>
      </section>
      {inboxCount > 0 && (
        <Link to="/inbox" className="inbox-banner">
          <Inbox size={18} />
          <span>{inboxCount} notes waiting</span>
          <span>
            Turn a thought into a flashcard <ArrowRight size={15} />
          </span>
        </Link>
      )}
      <section className="decks-section">
        <div className="section-heading">
          <div>
            <h2>
              Your learning decks{" "}
              <span className="count-pill">{data.summaries.length}</span>
            </h2>
            <p>A well-rounded toolkit for the engineer you’re becoming.</p>
          </div>
          <Link className="text-link" to="/decks">
            View all decks
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
            <h3>Your next chapter starts here.</h3>
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Create a deck
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-panel">No decks in this category yet.</div>
        ) : (
          <div className="deck-grid">
            {rows.slice(0, 6).map((summary) => (
              <DeckCard key={summary.deck.id} summary={summary} />
            ))}
          </div>
        )}
      </section>
      <div className="bottom-grid">
        <section className="weekly-panel">
          <div className="panel-heading">
            <h2>A week of small wins</h2>
            <Link to="/progress" className="subtle-link">
              Your progress
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
        <section className="tip-panel">
          <span className="tip-kicker">
            <Lightbulb size={16} /> BETTER LEARNING, BY DESIGN
          </span>
          <h2>
            Don’t just recognize it.
            <br />
            Try to explain it.
          </h2>
          <p>
            Before revealing an answer, say it in your own words. A little
            effort now makes the next recall easier.
          </p>
          <Link to={`/decks/${curriculum[6].id}`} className="text-link">
            Put your knowledge to work
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      {creating && <CreateDeckDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
