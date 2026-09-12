import {
  ArrowUpRight,
  Braces,
  Bug,
  Database,
  GitBranch,
  Globe,
  Layers,
  Network,
  Workflow,
  Atom,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDeckInfo } from "../data/curriculum";
import type { DeckSummary } from "../db/repos/dashboardRepo";

const icons = {
  braces: Braces,
  tree: Workflow,
  react: Atom,
  network: Network,
  database: Database,
  globe: Globe,
  bug: Bug,
  git: GitBranch,
};
export function DeckIcon({
  id,
  small = false,
}: {
  id: string;
  small?: boolean;
}) {
  const info = getDeckInfo(id);
  const Icon = info ? icons[info.icon] : Layers;
  return (
    <span
      className={`deck-icon ${info?.color ?? "mint"} ${small ? "small" : ""}`}
    >
      <Icon size={small ? 19 : 23} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}
export function DeckCard({ summary }: { summary: DeckSummary }) {
  const { deck, total, learned, due, newAvailable } = summary;
  const info = getDeckInfo(deck.id);
  const percent = total ? Math.round((learned / total) * 100) : 0;
  return (
    <Link className="deck-card" to={`/decks/${deck.id}`}>
      <div className="deck-card-top">
        <DeckIcon id={deck.id} />
        <span className="deck-category">{info?.track ?? "Personal"}</span>
        <ArrowUpRight className="deck-arrow" size={18} aria-hidden="true" />
      </div>
      <h3>{deck.name}</h3>
      <p className="deck-description">
        {info?.description ?? "Cards you added yourself."}
      </p>
      <div className="deck-progress-label">
        <span>{total} cards</span>
        <span>{percent}% in review</span>
      </div>
      <div className="thin-progress">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="deck-card-bottom">
        <span className={due + newAvailable > 0 ? "ready-dot" : "muted-dot"}>
          {due + newAvailable > 0
            ? `${due + newAvailable} ready to study`
            : "Nothing due"}
        </span>
        <span>{newAvailable} new</span>
      </div>
    </Link>
  );
}
