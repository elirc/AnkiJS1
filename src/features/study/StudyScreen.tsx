import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Edit3, Eye, Home, Pause, PartyPopper, RotateCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { MarkdownView } from '../../components/MarkdownView';
import { getCard, listCards, undoReview, updateContent } from '../../db/repos/cardRepo';
import { getDeck, listDecks } from '../../db/repos/deckRepo';
import { newCardsStudiedToday } from '../../db/repos/reviewRepo';
import type { Card, Deck } from '../../db/schema';
import { buildQueue } from '../../srs/queue';
import { rate } from '../../srs/scheduler';
import { applyReview } from '../../db/repos/cardRepo';
import { RatingBar } from './RatingBar';

interface UndoSnapshot {
  cardBefore: Card;
  logId: string;
  rating: 1 | 2 | 3 | 4;
}

export function StudyScreen() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [again, setAgain] = useState(0);
  const [undo, setUndo] = useState<UndoSnapshot | null>(null);
  const [sessionLearningIds, setSessionLearningIds] = useState<string[]>([]);
  const sessionKey = sessionLearningIds.join('|');

  const data = useLiveQuery(async () => {
    const decks = deckId ? [await getDeck(deckId)] : await listDecks();
    const activeDecks = decks.filter((deck): deck is Deck => Boolean(deck));
    const allCards = await listCards();
    const now = new Date();
    const baseQueue: Card[] = [];
    for (const deck of activeDecks) {
      const studied = await newCardsStudiedToday(deck.id, now);
      baseQueue.push(...buildQueue(allCards, deck, studied, now));
    }
    const baseIds = new Set(baseQueue.map((card) => card.id));
    const sessionCards = (await Promise.all(sessionLearningIds.map((id) => getCard(id)))).filter(
      (card): card is Card => {
        if (!card) return false;
        return !baseIds.has(card.id) && !card.suspended;
      },
    );
    return { decks: activeDecks, queue: [...baseQueue, ...sessionCards] };
  }, [deckId, sessionKey]);

  const current = data?.queue[0];
  const currentId = current?.id;
  const progressText = data ? `${data.queue.length} left` : 'Loading';
  const againRate = reviewed === 0 ? 0 : Math.round((again / reviewed) * 100);

  useEffect(() => {
    setRevealed(false);
  }, [currentId]);

  const editReturn = useMemo(() => {
    const path = deckId ? `/study/${deckId}` : '/study';
    return encodeURIComponent(path);
  }, [deckId]);

  async function rateCurrent(rating: 1 | 2 | 3 | 4) {
    if (!current) return;
    const now = new Date();
    const result = rate(current, rating, now);
    await applyReview(result.card, result.log);
    const dueMs = new Date(result.card.due).getTime();
    if (
      (result.card.state === 'learning' || result.card.state === 'relearning') &&
      dueMs <= now.getTime() + 10 * 60_000
    ) {
      setSessionLearningIds((ids) => Array.from(new Set([...ids, result.card.id])));
    } else {
      setSessionLearningIds((ids) => ids.filter((id) => id !== result.card.id));
    }
    setUndo({ cardBefore: current, logId: result.log.id, rating });
    setReviewed((count) => count + 1);
    if (rating === 1) setAgain((count) => count + 1);
    setRevealed(false);
  }

  async function undoLast() {
    if (!undo) return;
    await undoReview(undo.cardBefore, undo.logId);
    setSessionLearningIds((ids) => ids.filter((id) => id !== undo.cardBefore.id));
    setReviewed((count) => Math.max(0, count - 1));
    if (undo.rating === 1) setAgain((count) => Math.max(0, count - 1));
    setUndo(null);
    setRevealed(false);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select')) return;
      if ((event.key === ' ' || event.key === 'Enter') && current && !revealed) {
        event.preventDefault();
        setRevealed(true);
      }
      if (revealed && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        void rateCurrent(Number(event.key) as 1 | 2 | 3 | 4);
      }
      if (event.key.toLocaleLowerCase() === 'u') {
        event.preventDefault();
        void undoLast();
      }
      if (event.key.toLocaleLowerCase() === 'e' && current) {
        navigate(`/cards/${current.id}/edit?returnTo=${editReturn}`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!data) return <p className="text-muted">Loading</p>;
  if (data.decks.length === 0) return <EmptyState title="Create a deck and add cards before studying." />;
  if (!current) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center text-center">
        <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PartyPopper className="size-8" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Session complete</h1>
        <p className="mt-2 text-muted">
          Reviewed {reviewed} cards. Again rate {againRate}%.
        </p>
        <Button className="mt-6" icon={Home} variant="primary" onClick={() => navigate('/')}>
          Back to home
        </Button>
      </div>
    );
  }

  const sessionTotal = reviewed + data.queue.length;
  const progressPct = sessionTotal === 0 ? 0 : Math.round((reviewed / sessionTotal) * 100);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-13rem)] max-w-3xl flex-col md:min-h-[calc(100dvh-9rem)]">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-sm font-semibold text-muted">{progressText}</p>
        <div className="ml-auto flex gap-1">
          <Button className="size-11 px-0" variant="ghost" icon={RotateCcw} disabled={!undo} aria-label="Undo" onClick={() => void undoLast()} />
          <Button className="size-11 px-0" variant="ghost" icon={Edit3} aria-label="Edit card" onClick={() => navigate(`/cards/${current.id}/edit?returnTo=${editReturn}`)} />
          <Button className="size-11 px-0" variant="ghost" icon={Pause} aria-label="Suspend card" onClick={() => void updateContent(current.id, { suspended: true })} />
        </div>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-pressed transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <section
        className={cn(
          'min-h-[45dvh] flex-1 overflow-auto rounded-2xl border border-line bg-surface p-6 shadow-md shadow-black/5 md:p-8',
          !revealed && 'flex flex-col justify-center',
        )}
        aria-live="polite"
      >
        <MarkdownView source={current.front} className="font-serif text-[22px] leading-[1.6]" />
        {revealed ? (
          <>
            <div className="my-6 h-px bg-gradient-to-r from-transparent via-line to-transparent" aria-hidden="true" />
            <MarkdownView source={current.back} className="font-serif text-[19px] leading-[1.6]" />
          </>
        ) : null}
      </section>

      <div className="sticky bottom-24 mt-4 bg-background py-3 md:bottom-0">
        {revealed ? (
          <RatingBar card={current} onRate={(rating) => void rateCurrent(rating)} />
        ) : (
          <Button className="w-full" variant="primary" icon={Eye} onClick={() => setRevealed(true)}>
            Show answer
            <kbd
              aria-hidden="true"
              className="ml-1 hidden rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 font-sans text-[11px] font-medium md:inline"
            >
              Space
            </kbd>
          </Button>
        )}
      </div>
    </div>
  );
}
