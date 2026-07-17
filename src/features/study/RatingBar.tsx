import type { Card } from '../../db/schema';
import { previewIntervals } from '../../srs/scheduler';
import { cn } from '../../lib/cn';

const ratings = [
  { value: 1, label: 'Again', color: 'border-again bg-again text-white shadow-sm shadow-again/30' },
  { value: 2, label: 'Hard', color: 'border-hard bg-hard text-white shadow-sm shadow-hard/30' },
  { value: 3, label: 'Good', color: 'border-good bg-good text-white shadow-sm shadow-good/30' },
  { value: 4, label: 'Easy', color: 'border-easy bg-easy text-white shadow-sm shadow-easy/30' },
] as const;

export function RatingBar({
  card,
  onRate,
}: {
  card: Card;
  onRate: (rating: 1 | 2 | 3 | 4) => void;
}) {
  const intervals = previewIntervals(card, new Date());
  const labels = [intervals.again, intervals.hard, intervals.good, intervals.easy];
  return (
    <div className="grid grid-cols-4 gap-2 pb-[env(safe-area-inset-bottom)]">
      {ratings.map((rating, index) => (
        <button
          key={rating.value}
          type="button"
          aria-keyshortcuts={String(rating.value)}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 text-sm font-semibold outline-none transition hover:brightness-110 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            rating.color,
          )}
          onClick={() => onRate(rating.value)}
        >
          <span className="flex items-center gap-1.5">
            {rating.label}
            <kbd
              aria-hidden="true"
              className="hidden rounded border border-white/25 bg-white/10 px-1 text-[10px] font-medium leading-4 sm:inline"
            >
              {rating.value}
            </kbd>
          </span>
          <span className="text-xs font-medium opacity-85">{labels[index]}</span>
        </button>
      ))}
    </div>
  );
}
