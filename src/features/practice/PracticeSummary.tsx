import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Hammer } from "lucide-react";
import { listPracticeEntries, type PracticeEntry } from "../../db/repos/practiceRepo";
import { engineeringMissions } from "../../data/engineering-missions";

function nextMission(entries: PracticeEntry[]) {
  return (
    engineeringMissions.find((mission) =>
      entries.some((entry) => entry.mission_id === mission.id && !entry.completed),
    ) ??
    engineeringMissions.find(
      (mission) =>
        !entries.some((entry) => entry.mission_id === mission.id && entry.completed),
    )
  );
}

export function PracticeSummary() {
  const entries = useLiveQuery(listPracticeEntries);
  const next = entries ? nextMission(entries) : undefined;
  const completed = entries?.filter(
    (entry) =>
      entry.completed &&
      engineeringMissions.some((mission) => mission.id === entry.mission_id),
  ).length;
  return (
    <Link className="practice-banner" to="/practice">
      <Hammer size={23} aria-hidden="true" />
      <span>
        <strong>Build your engineering skills</strong>
        <small>
          {entries
            ? `${completed} of ${engineeringMissions.length} missions completed with evidence. ${
                next
                  ? `Next: ${next.title}.`
                  : "Revisit your work and choose a stretch challenge."
              }`
            : "12 hands-on missions: build, debug, review, and ship."}
        </small>
      </span>
      <ArrowRight size={20} aria-hidden="true" />
    </Link>
  );
}
