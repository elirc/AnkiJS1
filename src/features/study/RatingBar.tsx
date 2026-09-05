import type { Card } from "../../db/schema";
import { previewIntervals } from "../../srs/scheduler";
const ratings = [
  { value: 1, label: "Again" },
  { value: 2, label: "Hard" },
  { value: 3, label: "Good" },
  { value: 4, label: "Easy" },
] as const;
export function RatingBar({
  card,
  onRate,
  disabled = false,
  retention = 0.9,
}: {
  card: Card;
  onRate: (rating: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
  retention?: number;
}) {
  const intervals = previewIntervals(card, new Date(), retention);
  const labels = [
    intervals.again,
    intervals.hard,
    intervals.good,
    intervals.easy,
  ];
  return (
    <div className="rating-grid">
      {ratings.map((rating, index) => (
        <button
          className={`rating-button rating-${rating.value}`}
          key={rating.value}
          type="button"
          disabled={disabled}
          aria-keyshortcuts={String(rating.value)}
          onClick={() => onRate(rating.value)}
        >
          <span>{rating.label}</span>
          <span>{labels[index]}</span>
        </button>
      ))}
    </div>
  );
}
