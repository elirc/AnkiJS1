import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Edit3,
  Eye,
  Home,
  Lightbulb,
  Pause,
  PartyPopper,
  RotateCcw,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { MarkdownView } from "../../components/MarkdownView";
import { AnswerExplorer } from "../../components/AnswerExplorer";
import { DeckIcon } from "../../components/DeckCard";
import {
  applyReview,
  undoReview,
  updateContent,
} from "../../db/repos/cardRepo";
import { loadStudy } from "../../db/repos/studyRepo";
import type { Card } from "../../db/schema";
import { rate } from "../../srs/scheduler";
import { RatingBar } from "./RatingBar";

type StudyData = Awaited<ReturnType<typeof loadStudy>>;
interface UndoSnapshot {
  cardBefore: Card;
  logId: string;
  rating: 1 | 2 | 3 | 4;
}

export function StudyScreen() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedMinutes = Number(params.get("minutes"));
  const minutes = [2, 5, 10].includes(requestedMinutes) ? requestedMinutes : 0;
  const [data, setData] = useState<StudyData>();
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [again, setAgain] = useState(0);
  const [undo, setUndo] = useState<UndoSnapshot | null>(null);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const lastCommitted = useRef("");
  const start = useRef(Date.now());
  const routeGeneration = useRef(0);
  const current = data?.queue[0];
  const currentKey = current ? `${current.id}:${current.srs_updated_at}` : "";
  const timeUp = minutes > 0 && elapsed >= minutes * 60;
  const remaining = Math.max(0, minutes * 60 - elapsed);
  const sessionTotal = reviewed + (data?.queue.length ?? 0);
  const progress =
    minutes > 0
      ? Math.min(100, (elapsed / (minutes * 60)) * 100)
      : sessionTotal
        ? (reviewed / sessionTotal) * 100
        : 0;

  useEffect(() => {
    let active = true;
    const generation = ++routeGeneration.current;
    setData(undefined);
    setReviewed(0);
    setAgain(0);
    setUndo(null);
    setRevealed(false);
    setFinished(false);
    setElapsed(0);
    setError("");
    lastCommitted.current = "";
    start.current = Date.now();
    const refresh = async () => {
      if (busy.current) return;
      try {
        const next = await loadStudy(deckId);
        if (active && generation === routeGeneration.current && !busy.current)
          setData(next);
      } catch {
        if (active)
          setError(
            "Could not load your cards. Please reopen this study session.",
          );
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        setElapsed(Math.floor((Date.now() - start.current) / 1000));
    }, 1000);
    const dueTimer = window.setInterval(() => void refresh(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setElapsed(Math.floor((Date.now() - start.current) / 1000));
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.clearInterval(dueTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deckId, minutes]);
  useEffect(() => {
    setRevealed(false);
  }, [current?.id]);

  async function rateCurrent(rating: 1 | 2 | 3 | 4) {
    if (
      !current ||
      !revealed ||
      busy.current ||
      lastCommitted.current === currentKey
    )
      return;
    busy.current = true;
    setSaving(true);
    setError("");
    const generation = routeGeneration.current;
    try {
      const result = rate(
        current,
        rating,
        new Date(),
        data?.preferences.request_retention,
      );
      await applyReview(result.card, result.log);
      lastCommitted.current = currentKey;
      if (generation !== routeGeneration.current) return;
      setUndo({ cardBefore: current, logId: result.log.id, rating });
      setReviewed((count) => count + 1);
      if (rating === 1) setAgain((count) => count + 1);
      setRevealed(false);
      setData(await loadStudy(deckId));
      if (minutes > 0 && Date.now() - start.current >= minutes * 60_000)
        setFinished(true);
    } catch {
      setError(
        "We could not finish this review. Your saved progress is safe. Please retry.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function undoLast() {
    if (!undo || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await undoReview(undo.cardBefore, undo.logId);
      const next = await loadStudy(deckId);
      // Return to the exact card that was undone, even in a mixed-deck session.
      const restored = next.queue.find(
        (card) => card.id === undo.cardBefore.id,
      );
      if (restored)
        next.queue = [
          restored,
          ...next.queue.filter((card) => card.id !== restored.id),
        ];
      setData(next);
      setReviewed((count) => Math.max(0, count - 1));
      if (undo.rating === 1) setAgain((count) => Math.max(0, count - 1));
      setUndo(null);
      setFinished(false);
      setRevealed(false);
      lastCommitted.current = "";
    } catch {
      setError("Could not undo that review. Please try again.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function suspendCurrent() {
    if (!current || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await updateContent(current.id, { suspended: true });
      setData(await loadStudy(deckId));
      setRevealed(false);
    } catch {
      setError("Could not suspend this card. Please try again.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const editCard = () => {
    if (!current) return;
    const path = `${deckId ? `/study/${deckId}` : "/study"}${minutes ? `?minutes=${minutes}` : ""}`;
    navigate(`/cards/${current.id}/edit?returnTo=${encodeURIComponent(path)}`);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target?.closest(
          "input, textarea, select, [contenteditable=true], [role=dialog]",
        )
      )
        return;
      if (
        (event.key === " " || event.key === "Enter") &&
        !target?.closest("button, a") &&
        current &&
        !revealed &&
        !finished
      ) {
        event.preventDefault();
        setRevealed(true);
      }
      if (revealed && !finished && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        void rateCurrent(Number(event.key) as 1 | 2 | 3 | 4);
      }
      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        void undoLast();
      }
      if (event.key.toLowerCase() === "e" && !finished) editCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!data)
    return (
      <div className="loading-state">
        {error ? <p role="alert">{error}</p> : "Finding your next small win…"}
      </div>
    );
  if (finished || !current)
    return (
      <section className="session-complete">
        <span className="completion-icon">
          {reviewed ? <PartyPopper size={31} /> : <Check size={31} />}
        </span>
        <div className="eyebrow justify-center">ONE STEP FURTHER</div>
        <h1>{reviewed ? "Session complete" : "You’re all caught up."}</h1>
        <p>
          {reviewed
            ? "A few minutes well spent. Your progress is saved."
            : data.decks.length
              ? data.remainingNew === 0
                ? "Your daily new-card allowance is complete. Due reviews will still appear here."
                : "Nothing is due right now. Let your learning settle."
              : "Add a deck and a few cards to start your journey."}
        </p>
        <div className="completion-stats">
          <div>
            <strong>{reviewed}</strong>
            <span>cards reviewed</span>
          </div>
          <div>
            <strong>
              {reviewed
                ? `${Math.round(((reviewed - again) / reviewed) * 100)}%`
                : "—"}
            </strong>
            <span>recalled without Again</span>
          </div>
        </div>
        {data.nextDue && (
          <p className="mb-6">
            Next review{" "}
            {new Date(data.nextDue).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            . {data.queue.length === 0 && "You can also explore your decks."}
          </p>
        )}
        {error && (
          <p role="alert" className="text-again">
            {error}
          </p>
        )}
        <div className="completion-actions">
          <Button icon={Home} variant="primary" onClick={() => navigate("/")}>
            Back to home
          </Button>
          {finished && current && (
            <Button
              onClick={() => {
                setFinished(false);
                start.current = Date.now();
                setElapsed(0);
              }}
            >
              Another {minutes || 5} minutes
              <ArrowRight size={15} />
            </Button>
          )}
          {undo && (
            <Button
              icon={RotateCcw}
              disabled={saving}
              onClick={() => void undoLast()}
            >
              Undo last review
            </Button>
          )}
          {!data.decks.length && (
            <Button onClick={() => navigate("/decks")}>Explore decks</Button>
          )}
        </div>
      </section>
    );

  const currentDeck = data.decks.find((deck) => deck.id === current.deck_id);
  return (
    <div className="study-screen">
      <div className="study-topline">
        <button
          className="inline-flex items-center gap-1"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={16} />
          Your workspace
        </button>
        <span className="timer">
          <Clock3 size={14} />
          {minutes
            ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
            : "At your pace"}
        </span>
        <button disabled={saving} onClick={() => setFinished(true)}>
          Finish
        </button>
      </div>
      <h1 className="study-title">
        {deckId ? currentDeck?.name : "A little of everything."}
      </h1>
      <div className="study-meta">
        <span>
          {minutes ? `${minutes}-minute session` : "Open study"} · {reviewed}{" "}
          reviewed
        </span>
        <span>{data.queue.length} left</span>
      </div>
      <div
        className="study-progress"
        role="progressbar"
        aria-label="Session progress"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      {timeUp && (
        <div className="study-notice">
          Time well spent. Finish this card, or tap Finish whenever you’re
          ready.
        </div>
      )}
      {error && (
        <p className="study-notice" role="alert">
          {error}
        </p>
      )}
      <section className="review-card" aria-live="polite">
        <div className="review-card-header">
          <DeckIcon id={current.deck_id} small />
          <span>{currentDeck?.name}</span>
          <span className="card-state">{current.state}</span>
        </div>
        <MarkdownView source={current.front} className="card-question" />
        {revealed ? (
          <div className="answer-section">
            <AnswerExplorer front={current.front} back={current.back} />
          </div>
        ) : (
          <div className="recall-prompt">
            <Lightbulb size={15} />
            Think it through before you reveal.
          </div>
        )}
      </section>
      <div className="study-actions">
        {revealed ? (
          <>
            <p className="rating-hint">
              Rate what you remembered before revealing.
            </p>
            <RatingBar
              card={current}
              retention={data.preferences.request_retention}
              disabled={saving}
              onRate={(rating) => void rateCurrent(rating)}
            />
          </>
        ) : (
          <Button
            aria-label="Show answer"
            variant="primary"
            className="show-answer"
            icon={Eye}
            disabled={saving}
            onClick={() => setRevealed(true)}
          >
            Show answer
          </Button>
        )}
      </div>
      <div className="study-toolbar">
        <button
          aria-label="Undo"
          disabled={!undo || saving}
          onClick={() => void undoLast()}
        >
          <RotateCcw size={14} />
          Undo
        </button>
        <button aria-label="Edit card" disabled={saving} onClick={editCard}>
          <Edit3 size={14} />
          Edit card
        </button>
        <button
          aria-label="Suspend card"
          disabled={saving}
          onClick={() => void suspendCurrent()}
        >
          <Pause size={14} />
          Suspend
        </button>
      </div>
      <p className="study-help">
        <kbd>Space</kbd> reveal <kbd>1–4</kbd> rate <kbd>U</kbd> undo · Changes
        saved on this device
      </p>
    </div>
  );
}
