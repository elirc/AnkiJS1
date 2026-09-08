import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Braces, Clock3, Play } from "lucide-react";
import { Button } from "../../components/Button";
import { DeckCard } from "../../components/DeckCard";
import { DOTNET_TRACK, dotnetDecks, dotnetStages, dotnetStudyUrl } from "../../data/dotnet-path";
import { getDashboard } from "../../db/repos/dashboardRepo";
import { loadStudy } from "../../db/repos/studyRepo";
import { useNow } from "../../lib/useNow";

export function DotnetScreen() {
  const navigate = useNavigate();
  const now = useNow();
  const [minutes, setMinutes] = useState<2 | 5 | 10>(5);
  const data = useLiveQuery(async () => {
    const [dashboard, study] = await Promise.all([
      getDashboard(now), loadStudy(undefined, now, DOTNET_TRACK),
    ]);
    return { dashboard, study };
  }, [now.getTime()]);
  if (!data) return <p className="loading-state">Preparing your .NET learning path…</p>;
  const summaries = new Map(data.dashboard.summaries.map((row) => [row.deck.id, row]));
  const own = dotnetDecks.flatMap((deck) => summaries.get(deck.id) ?? []);
  const total = own.reduce((sum, row) => sum + row.total, 0);
  const learned = own.reduce((sum, row) => sum + row.learned, 0);
  const fresh = data.study.queue.filter((card) => card.state === "new").length;
  const due = data.study.queue.length - fresh;
  return (
    <div className="dotnet-screen">
      <section className="dotnet-hero" aria-labelledby="dotnet-title">
        <div className="dotnet-intro">
          <span className="dotnet-kicker"><Braces size={18} aria-hidden="true" /> YOUR C# & .NET WEB PATH</span>
          <h1 id="dotnet-title">From your first line<br />to a working web app.</h1>
          <p>Learn C#, ASP.NET Core, and EF Core in the minutes you have. Start with everyday explanations, then follow the code all the way to a real feature.</p>
          <div className="dotnet-facts" aria-label="Your .NET library">
            <span><strong>{own.length}</strong> decks</span>
            <span><strong>{total}</strong> active cards</span>
            <span><strong>{learned}</strong> in review</span>
          </div>
          <span className="dotnet-edition">Built around .NET 10 · Beginner through practical web development</span>
        </div>
        <div className="dotnet-session">
          <span className="eyebrow">A LITTLE .NET, EVERY DAY</span>
          <h2>Your next few minutes</h2>
          <p><strong>{due} due</strong> reviews · <strong>{fresh} new</strong> cards ready</p>
          <div className="time-options" role="group" aria-label=".NET session length">
            {([2, 5, 10] as const).map((value) => (
              <button key={value} aria-pressed={minutes === value} onClick={() => setMinutes(value)}>
                <Clock3 size={14} aria-hidden="true" /> {value} min
              </button>
            ))}
          </div>
          <Button variant="primary" className="dotnet-start" icon={Play}
            disabled={data.study.queue.length === 0}
            onClick={() => navigate(dotnetStudyUrl(minutes))}>
            Study C# & .NET <ArrowRight size={17} aria-hidden="true" />
          </Button>
          <p className="dotnet-session-note">
            {data.study.queue.length ? "Due reviews first. New cards follow deck order. Stop whenever you need to."
              : data.study.remainingNew === 0 ? "Your daily new-card allowance is used. Return for due reviews or browse a deck below."
                : "You're caught up for now. Browse a deck below or come back for your next review."}
          </p>
          {!data.study.queue.length && data.study.nextDue && <p className="dotnet-session-note">
            Next .NET review: {new Date(data.study.nextDue).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
          </p>}
          <Link to="/settings" className="subtle-link">Daily limits are shared across all subjects <ArrowRight size={13} /></Link>
        </div>
      </section>
      <section className="dotnet-how" aria-label="How to use this path">
        <div><span>01</span><p><strong>Try an answer in your own words.</strong> One small idea or web development decision at a time.</p></div>
        <div><span>02</span><p><strong>Tap Next explanation.</strong> Switch between plain English, an example, an analogy, mistakes, and practice.</p></div>
        <div><span>03</span><p><strong>Rate what you remembered.</strong> Spaced repetition brings it back when it needs another look.</p></div>
      </section>
      <div className="section-heading dotnet-path-heading">
        <div><h2>A path you can follow</h2><p>Start at deck 01, or jump to what you need for your current project.</p></div>
        <Link to={`/decks?${new URLSearchParams({ track: DOTNET_TRACK })}`} className="text-link">Search .NET decks <ArrowRight size={15} /></Link>
      </div>
      {dotnetStages.map((stage, index) => (
        <section className="dotnet-stage" key={stage.title} aria-labelledby={`dotnet-stage-${index}`}>
          <div className="dotnet-stage-heading">
            <span className="dotnet-stage-number" aria-hidden="true">{index + 1}</span>
            <div><h2 id={`dotnet-stage-${index}`}>{stage.title}</h2><p>{stage.description}</p></div>
          </div>
          <div className="deck-grid">
            {stage.decks.map((deck) => {
              const summary = summaries.get(deck.id);
              return summary ? <DeckCard key={deck.id} summary={summary} /> : null;
            })}
          </div>
        </section>
      ))}
      <div className="dotnet-footer-note">
        Your progress saves on this device. After the first online load, lessons and reviews work offline.
        <Link to="/settings">Back up or sync your progress <ArrowRight size={14} /></Link>
      </div>
    </div>
  );
}
