import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ArrowRight, Check, Clock3, Download, Search } from "lucide-react";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/TextArea";
import { engineeringMissions, missionStages, type EngineeringMission } from "../../data/engineering-missions";
import { canCompleteMission, emptyPracticeEntry, listPracticeEntries, savePracticeEntry, type PracticeDraft, type PracticeEntry } from "../../db/repos/practiceRepo";
import "./practice.css";

function nextMission(entries: PracticeEntry[]) {
  return engineeringMissions.find((mission) => entries.some((entry) => entry.mission_id === mission.id && !entry.completed)) ??
    engineeringMissions.find((mission) => !entries.some((entry) => entry.mission_id === mission.id && entry.completed));
}

function exportEvidence(entries: PracticeEntry[]) {
  const lines = ["# My engineering practice", "", "Self-reviewed work samples. Completion records practice, not a verified career level.", ""];
  for (const mission of engineeringMissions) {
    const entry = entries.find((item) => item.mission_id === mission.id);
    if (!entry) continue;
    lines.push(`## ${mission.title}`, "", `${mission.skill} | ${entry.completed ? "Completed" : "In progress"} | Updated ${entry.updated_at}`, "",
      "### What I changed", entry.outcome, "", "### How I verified it", entry.verification, "", "### Tradeoff and next step", entry.tradeoff, "", "### Self-review",
      ...mission.checks.map((check) => `- [${entry.checked.includes(check.id) ? "x" : " "}] ${check.label}`), "");
  }
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "recall-engineering-evidence.md";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function PracticeScreen() {
  const { missionId } = useParams();
  const entries = useLiveQuery(listPracticeEntries);
  const [budget, setBudget] = useState(30);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  if (!entries) return <p className="loading-state">Loading your practice journal…</p>;
  if (missionId) {
    const mission = engineeringMissions.find((item) => item.id === missionId);
    if (!mission) return <div className="empty-panel"><h1>Mission not found</h1><Link className="text-link" to="/practice">See all engineering missions</Link></div>;
    return <MissionWorkspace key={mission.id} mission={mission} initial={entries.find((entry) => entry.mission_id === mission.id) ?? emptyPracticeEntry(mission.id)} />;
  }
  const completed = engineeringMissions.filter((mission) => entries.some((entry) => entry.mission_id === mission.id && entry.completed)).length;
  const next = nextMission(entries);
  const visibleMissions = engineeringMissions.filter(mission =>
    (stageFilter === "all" || mission.stage === stageFilter) &&
    `${mission.title} ${mission.skill} ${mission.brief}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="practice-screen">
      <section className="practice-hero">
        <h1>Engineering practice</h1>
        <p>Hands-on missions to do in Recall or your own project, with a journal for your evidence. Start with the first mission, or pick the skill you need at work.</p>
        <div className="practice-hero-actions">
          <Link className="practice-primary-link" to={next ? `/practice/${next.id}` : `/practice/${engineeringMissions[0].id}`}>
            {next ? "Continue your next mission" : "Revisit the first mission"}<ArrowRight size={17} />
          </Link>
          <span>{completed} / {engineeringMissions.length} completed with evidence</span>
        </div>
        <progress aria-label="Missions completed with evidence" value={completed} max={engineeringMissions.length} />
      </section>
      <section className="content-panel practice-session">
        <div><h2>Plan a session</h2><p>Review an idea briefly, then apply it. Missions can span several sessions.</p></div>
        <div className="time-options" role="group" aria-label="Practice time budget">
          {[15, 30, 60].map((minutes) => <button key={minutes} aria-pressed={budget === minutes} onClick={() => setBudget(minutes)}>{minutes} min</button>)}
        </div>
        <ol className="practice-session-plan">
          <li><strong>{budget === 15 ? 2 : 5} min · Recall</strong><span>Review due cards or explain the idea from memory.</span></li>
          <li><strong>{budget === 15 ? 10 : budget === 30 ? 20 : 45} min · Apply</strong><span>Work on one mission step in your own project.</span></li>
          <li><strong>{budget === 15 ? 3 : budget === 30 ? 5 : 10} min · Reflect</strong><span>Save evidence and one thing to improve next.</span></li>
        </ol>
        <Link className="text-link" to={`/study?minutes=${budget === 15 ? 2 : 5}`}>Start with a short review <ArrowRight size={15} /></Link>
      </section>
      <div className="practice-filters">
        <label className="mission-search"><Search size={18} /><input type="search" aria-label="Search missions" placeholder="Search missions" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <select aria-label="Mission stage" value={stageFilter} onChange={event => setStageFilter(event.target.value)}><option value="all">All stages</option>{missionStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}</select>
        <span role="status">{visibleMissions.length} missions</span>
      </div>
      {visibleMissions.length === 0 && <p className="empty-state">No missions match.</p>}
      {missionStages.map((stage, index) => visibleMissions.some(mission => mission.stage === stage) && (
        <section className="practice-stage" key={stage}>
          <div className="section-heading"><div><div className="eyebrow">STAGE {index + 1}</div><h2>{stage}</h2></div></div>
          <div className="mission-grid">{visibleMissions.filter((mission) => mission.stage === stage).map((mission) => {
            const entry = entries.find((item) => item.mission_id === mission.id);
            return <Link className="mission-card" to={`/practice/${mission.id}`} key={mission.id}>
              <div className="mission-card-meta"><span>{mission.skill}</span><span>{entry?.completed ? "Completed" : entry ? "In progress" : "Ready to start"}</span></div>
              <h3>{mission.title}</h3><p>{mission.brief}</p>
              <div className="mission-card-footer"><span><Clock3 size={14} /> About {mission.minutes} min · split as needed</span><ArrowRight size={17} /></div>
            </Link>;
          })}</div>
        </section>
      ))}
      <section className="content-panel practice-portability">
        <h2>Your evidence</h2>
        <p>Keep a file path, commit, PR link, or concrete result in each journal entry. Completion is your own review of a work sample, not a certification. Repeat missions later with less guidance.</p>
        <div className="practice-hero-actions"><Button icon={Download} disabled={entries.length === 0} onClick={() => exportEvidence(entries)}>Export evidence</Button><Link className="text-link" to="/settings">Back up or restore your journal <ArrowRight size={15} /></Link></div>
        <p className="practice-note">Saved on this device and included in Recall JSON backups. Practice entries do not use automatic cloud sync.</p>
      </section>
    </div>
  );
}

function MissionWorkspace({ mission, initial }: { mission: EngineeringMission; initial: PracticeDraft }) {
  const [draft, setDraft] = useState<PracticeDraft>(initial);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const revision = useRef(0);
  const unsaved = useRef(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (unsaved.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function persist(next: PracticeDraft) {
    setDraft(next);
    setSaveState("saving");
    unsaved.current = true;
    const current = ++revision.current;
    void savePracticeEntry(next).then(() => {
      if (current === revision.current) { unsaved.current = false; setSaveState("saved"); }
    }, () => {
      if (current === revision.current) setSaveState("error");
    });
  }
  const next = engineeringMissions[engineeringMissions.indexOf(mission) + 1];
  return (
    <div className="practice-screen mission-workspace">
      <Link className="text-link" to="/practice"><ArrowLeft size={16} /> All engineering missions</Link>
      <div className="page-heading"><div><div className="eyebrow">{mission.stage} · {mission.skill}</div><h1>{mission.title}</h1><p>{mission.brief}</p></div></div>
      <p className="practice-note"><Clock3 size={15} /> About {mission.minutes} minutes of focused work, split across sessions as needed. Use your own project and tools.</p>
      <div className="mission-work-grid">
        <div className="mission-instructions">
          <section className="content-panel"><h2>Your assignment</h2><ol className="mission-steps">{mission.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
            <Link className="text-link" to={`/decks?q=${encodeURIComponent(mission.study)}`}>Review related decks <ArrowRight size={15} /></Link>
          </section>
          <details className="content-panel mission-review"><summary>Review guidance & stretch challenge</summary><h3>Review your work</h3><p>{mission.review}</p><h3>Go further</h3><p>{mission.stretch}</p></details>
        </div>
        <section className="content-panel mission-journal" aria-label="Mission evidence journal">
          <div className="panel-heading"><h2>Your evidence journal</h2><span role="status">{saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : "Saved on this device"}</span></div>
          <p className="practice-note">Write what you actually did. Include a file path, commit, test result, or observation. Drafts save as you type.</p>
          {saveState === "error" && <div role="alert" className="practice-save-error"><p>Your latest changes could not be saved. Keep this page open, copy your text, or retry.</p><Button onClick={() => persist(draft)}>Retry save</Button></div>}
          <fieldset disabled={draft.completed}>
            <legend className="sr-only">Work sample and self-review</legend>
            {([
              ["outcome", "What I changed", "What did you build, debug, review, or decide? Where is the work?"],
              ["verification", "How I verified it", "Which checks did you run? What were the actual results and failure cases?"],
              ["tradeoff", "Tradeoff and next step", "Why this approach? What limitation remains, and what would you do next?"],
            ] as const).map(([field, label, placeholder]) => <label className="practice-field" key={field}><span>{label}</span><TextArea value={draft[field]} maxLength={12000} placeholder={placeholder} onChange={(event) => persist({ ...draft, [field]: event.target.value })} /></label>)}
            <div className="mission-checks"><h3>Self-review before completion</h3>{mission.checks.map((check) => <label key={check.id}><input type="checkbox" checked={draft.checked.includes(check.id)} onChange={(event) => persist({ ...draft, checked: event.target.checked ? [...draft.checked, check.id] : draft.checked.filter((id) => id !== check.id) })} /><span>{check.label}</span></label>)}</div>
          </fieldset>
          {draft.completed ? <div className="mission-completed"><p><Check size={18} /> Completed with evidence</p><Button disabled={saveState === "saving"} onClick={() => persist({ ...draft, completed: false })}>Reopen mission</Button>{next && <Link className="text-link" to={`/practice/${next.id}`}>Next mission <ArrowRight size={15} /></Link>}</div> : <div className="mission-completion"><p className="practice-note">Add all three evidence notes and check each criterion to complete your self-review.</p><Button variant="primary" disabled={saveState !== "saved" || !canCompleteMission(draft)} onClick={() => persist({ ...draft, completed: true })}>Complete mission</Button></div>}
        </section>
      </div>
    </div>
  );
}
