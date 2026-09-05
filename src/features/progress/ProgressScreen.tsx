import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Flame, TrendingUp } from "lucide-react";
import { getDashboard } from "../../db/repos/dashboardRepo";
import { DeckIcon } from "../../components/DeckCard";
import { useNow } from "../../lib/useNow";
export function ProgressScreen() {
  const now = useNow();
  const data = useLiveQuery(() => getDashboard(now), [now.getTime()]);
  if (!data) return <p className="loading-state">Loading your progress…</p>;
  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PROGRESS OVER PERFECTION</div>
          <h1>
            Look how far you’ll go<span className="text-primary">.</span>
          </h1>
          <p>Every review is a small investment in what comes next.</p>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-icon mint">
            <Check size={20} />
          </span>
          <div>
            <span>Total reviews</span>
            <strong>
              {data.totalReviews}
              <small>since you started</small>
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
              <small>days</small>
            </strong>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon violet">
            <TrendingUp size={20} />
          </span>
          <div>
            <span>Recall today</span>
            <strong>
              {data.recall === null ? "—" : `${data.recall}%`}
              <small>rated Hard, Good, or Easy</small>
            </strong>
          </div>
        </div>
      </div>
      <section className="content-panel">
        <div className="panel-heading">
          <h2>Showing up adds up</h2>
          <span className="text-sm text-muted">Last 28 days</span>
        </div>
        <div className="activity-grid">
          {data.days.map((day) => (
            <div
              key={day.date}
              className={`activity-day level-${day.count === 0 ? 0 : day.count < 5 ? 1 : day.count < 15 ? 2 : 3}`}
              title={`${day.date}: ${day.count} reviews`}
              aria-label={`${day.date}: ${day.count} reviews`}
            >
              <span>{Number(day.date.slice(-2))}</span>
              <strong>{day.count}</strong>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted mt-4">
          {data.totalReviews
            ? "A review counts each time you rate an answer. Your streak stays active if you studied today or yesterday."
            : "Your story starts with one card. Complete a review to make your first mark."}
        </p>
      </section>
      <section className="content-panel">
        <div className="panel-heading">
          <h2>Your skill toolkit</h2>
          <span className="text-sm text-muted">Cards in the review stage</span>
        </div>
        <div className="skill-list">
          {data.summaries.map((row) => (
            <Link
              to={`/decks/${row.deck.id}`}
              className="skill-row"
              key={row.deck.id}
            >
              <DeckIcon id={row.deck.id} small />
              <div>
                <strong>{row.deck.name}</strong>
                <div className="thin-progress">
                  <span
                    style={{
                      width: `${row.total ? (row.learned / row.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <span>
                {row.learned} / {row.total}
              </span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <div className="quiet-note">
        New → Learning → Review. Cards move into review as their scheduled
        intervals grow. Forgetting is part of learning; rate honestly so the
        schedule can adapt.
      </div>
    </div>
  );
}
