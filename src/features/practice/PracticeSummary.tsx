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
        <strong>Engineering practice</strong>
        <small>
          {entries
            ? `${completed} of ${engineeringMissions.length} missions completed. ${
                next
                  ? `Next: ${next.title}.`
                  : "All missions are complete."
              }`
            : `${engineeringMissions.length} hands-on missions with a journal for your evidence.`}
        </small>
      </span>
      <ArrowRight size={20} aria-hidden="true" />
    </Link>
  );
}
