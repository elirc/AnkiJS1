import { additionalEngineeringMissions } from './engineering-mission-expansion';

export interface EngineeringMission {
  id: string;
  title: string;
  stage: "Build independently" | "Make it reliable" | "Own the outcome";
  minutes: number;
  skill: string;
  brief: string;
  steps: string[];
  checks: { id: string; label: string }[];
  stretch: string;
  review: string;
  study: string;
}

// Stable IDs also identify saved evidence. Never derive them from array order.
export const engineeringMissions: EngineeringMission[] = [
  {
    id: "trace-a-request", title: "Trace a feature from click to storage",
    stage: "Build independently", minutes: 30, skill: "Codebase navigation",
    brief: "Use Recall or a small app you already run. Follow one save action until the data is persisted, then explain what happens when storage or the network fails.",
    steps: [
      "Run the app and choose one action, such as saving a note. Write the expected behavior before reading the implementation.",
      "Follow the event handler, repository, data model, and any background work. Record file names and the data passed across each boundary.",
      "In a disposable test profile, interrupt one dependency. Compare the visible result and stored data with your prediction.",
    ],
    checks: [
      { id: "trace", label: "I mapped the action to concrete files and data boundaries." },
      { id: "failure", label: "I reproduced one failure and recorded what was saved." },
      { id: "explain", label: "I can explain the flow and its failure behavior without reading a script." },
    ],
    stretch: "Identify one boundary where a future requirement would be expensive. Propose the smallest change that would make it easier.",
    review: "Could another engineer reproduce your trace? Distinguish observed behavior from assumptions. Naming layers alone is not enough.",
    study: "debugging",
  },
  {
    id: "ship-a-vertical-slice", title: "Ship one complete CRUD feature",
    stage: "Build independently", minutes: 60, skill: "Feature delivery",
    brief: "Add a small feature, such as archiving a note or editing an item title. Own the path from user input through storage and back to the screen.",
    steps: [
      "Write acceptance examples for success, blank input, missing data, and a failed save. Keep the change small enough for one review.",
      "Implement validation at the write boundary, a clear saving state, and useful recovery after failure. Preserve the user's input.",
      "Test the behavior, reload the app to verify persistence, and write a PR description explaining the user-visible result.",
    ],
    checks: [
      { id: "flow", label: "The feature works end to end and survives a reload." },
      { id: "recovery", label: "Invalid input and failed saves have tested recovery paths." },
      { id: "review", label: "My PR description includes scope, verification, and known limits." },
    ],
    stretch: "Try the action twice quickly. Explain whether duplicate requests or writes can produce an incorrect result.",
    review: "Review from the user's perspective: loading, empty, success, and error states. Do tests assert behavior instead of internal function calls?",
    study: "CRUD",
  },
  {
    id: "debug-a-regression", title: "Fix a bug with a regression test",
    stage: "Build independently", minutes: 45, skill: "Systematic debugging",
    brief: "Pick a reproducible defect in your own app, or deliberately introduce a small defect in a practice branch. Establish why it happens before changing code.",
    steps: [
      "Write exact reproduction steps, expected and actual results, and two plausible causes. Use logs or a debugger to rule one out.",
      "Add a focused test that fails for the original defect. Make the smallest fix that addresses the confirmed cause.",
      "Run the test before and after the fix. Inspect neighboring behavior and explain why a symptom-only workaround would be weaker.",
    ],
    checks: [
      { id: "repro", label: "I saved a minimal reproduction and evidence for the root cause." },
      { id: "test", label: "My regression test fails before the fix and passes afterward." },
      { id: "scope", label: "I checked a neighboring behavior and kept the fix focused." },
    ],
    stretch: "Write a short bug report another engineer could act on without asking for reproduction details.",
    review: "Does the evidence explain the cause, or only show the symptom? Would the test detect the same mistake in a future refactor?",
    study: "testing",
  },
  {
    id: "review-a-change", title: "Review a PR for correctness",
    stage: "Build independently", minutes: 30, skill: "Code review",
    brief: "Review a recent diff in your own project as if you were responsible for maintaining it. A solo review can still produce useful, actionable findings.",
    steps: [
      "Read the requirement and diff. Trace changes to inputs, persistence, error handling, and callers before focusing on naming or formatting.",
      "Try one edge case and inspect the tests. Write one blocking finding if supported, one nonblocking suggestion, and one question where intent is unclear.",
      "Revise the change or document why no fix is needed. Separate confirmed defects from possible risks.",
    ],
    checks: [
      { id: "evidence", label: "My findings include a trigger, consequence, and file location." },
      { id: "priority", label: "I separated blocking defects, suggestions, and questions." },
      { id: "followup", label: "I verified the fix or documented why the change is acceptable." },
    ],
    stretch: "Explain one good decision in the diff and what constraint it addresses. Practice reinforcing sound judgment as well as finding defects.",
    review: "Could the author act on each comment? Avoid speculative blockers and preference-only rewrites. An honest review can find no defects.",
    study: "Git",
  },
  {
    id: "design-an-api", title: "Make an API safe to retry",
    stage: "Make it reliable", minutes: 60, skill: "API contracts",
    brief: "Build or extend a create endpoint in a practice app. Simulate a response being lost after the server saves the record, then retry the operation.",
    steps: [
      "Define valid input, error responses, ownership checks, and what a duplicate operation means for this feature.",
      "Choose a stable request key or a domain uniqueness rule. Make duplicate detection and persistence atomic using your storage system's guarantees.",
      "Test a lost response, two concurrent requests with the same key, and reuse of a key with different input. Document the chosen behavior.",
    ],
    checks: [
      { id: "contract", label: "The API contract defines validation, authorization, and retry behavior." },
      { id: "duplicate", label: "Concurrent duplicate requests do not create duplicate effects." },
      { id: "mismatch", label: "Tests cover a lost response and key reuse with different input." },
    ],
    stretch: "Explain how long request keys must be kept and what happens when their retention window expires.",
    review: "Disabling a submit button is not a server guarantee. Where is uniqueness enforced, and which failures can safely be retried?",
    study: "HTTP",
  },
  {
    id: "migrate-without-loss", title: "Evolve stored data safely",
    stage: "Make it reliable", minutes: 60, skill: "Data migrations",
    brief: "Add a field or relationship to a practice app that already contains data. Demonstrate the upgrade using a copy of the old database.",
    steps: [
      "Create a small old-format fixture with ordinary and edge-case records. Make a backup and define which data must remain unchanged.",
      "Implement a migration or compatible reader. Test a fresh install, an existing install, and repeated startup after the upgrade.",
      "Document whether older code can read the new data. Rehearse restoration or a forward fix using disposable data.",
    ],
    checks: [
      { id: "preserve", label: "A before/after comparison shows existing data was preserved." },
      { id: "upgrade", label: "Fresh install, upgrade, and repeated startup are tested." },
      { id: "restore", label: "I rehearsed recovery and recorded compatibility limits." },
    ],
    stretch: "Plan an expand-and-contract change for a deployment where old and new application versions briefly run together.",
    review: "A reversible schema change may still lose data. Can you show restoration working, and distinguish application rollback from data recovery?",
    study: "SQL",
  },
  {
    id: "test-the-boundaries", title: "Test the failures that matter",
    stage: "Make it reliable", minutes: 45, skill: "Testing strategy",
    brief: "Choose a save or import flow. Build a small test portfolio around user-visible risks instead of chasing a coverage percentage.",
    steps: [
      "List the three most damaging ways this flow could fail: partial writes, duplicate actions, stale input, or lost user work.",
      "Use a pure unit test for a rule, a repository or API integration test for persistence, and one browser test for the critical journey.",
      "Inject a failure between related writes. Confirm that a failed operation leaves storage consistent and gives the user a way to recover.",
    ],
    checks: [
      { id: "risks", label: "Each test is tied to a concrete failure and consequence." },
      { id: "atomic", label: "A failure test proves related writes cannot partially commit." },
      { id: "journey", label: "A browser test verifies the critical journey and persisted result." },
    ],
    stretch: "Remove one redundant test and explain why the remaining tests still protect the behavior.",
    review: "Do mocks hide the storage behavior you need to verify? Tests should fail when the user-visible guarantee breaks.",
    study: "testing",
  },
  {
    id: "secure-a-feature", title: "Check trust boundaries",
    stage: "Make it reliable", minutes: 45, skill: "Practical security",
    brief: "Review one input or API boundary in an app you own. Use disposable test data and test accounts to check how untrusted data is handled.",
    steps: [
      "Draw the boundary between user input and trusted application state. List what must be checked at the write or server boundary.",
      "For a server app, test unauthenticated requests and attempts to access another test account's record. For a local app, test malformed imports and unsafe rendered markup.",
      "Fix one supported issue, add a regression test, and inspect whether error messages or logs expose sensitive values.",
    ],
    checks: [
      { id: "boundary", label: "I identified the validation or authorization boundary." },
      { id: "negative", label: "Negative tests reject unauthorized or malformed input." },
      { id: "logs", label: "I checked output and logs for unintended sensitive data." },
    ],
    stretch: "Document what your checks do not cover and prioritize the next security improvement by consequence and exposure.",
    review: "Hiding a control in the UI does not enforce authorization. Show the actual boundary rejecting the request or unsafe input.",
    study: "security",
  },
  {
    id: "measure-performance", title: "Improve performance with evidence",
    stage: "Own the outcome", minutes: 60, skill: "Performance reasoning",
    brief: "Choose a slow interaction or query in your app. Establish a repeatable baseline and improve the measured bottleneck.",
    steps: [
      "Create representative test data and define the metric: interaction latency, query duration, request count, or transferred bytes.",
      "Profile the interaction. Change one cause supported by the measurements, such as a repeated query, excess rendering, or unbounded data loading.",
      "Repeat the same workload before and after. Record multiple runs, tradeoffs, and a correctness check.",
    ],
    checks: [
      { id: "baseline", label: "I recorded a reproducible workload and baseline measurements." },
      { id: "cause", label: "Profiling connects my change to the bottleneck." },
      { id: "comparison", label: "Before/after measurements and correctness checks are saved." },
    ],
    stretch: "Explain when your improvement stops helping, and what additional measurement would justify the next change.",
    review: "Compare equivalent workloads. A faster empty dataset or one unusually good run does not establish an improvement.",
    study: "performance",
  },
  {
    id: "write-a-design-decision", title: "Choose a design under constraints",
    stage: "Own the outcome", minutes: 45, skill: "Technical judgment",
    brief: "Write a short design decision for a real requirement: offline editing, background jobs, search, or backup recovery. Use the simplest option that meets the need.",
    steps: [
      "State the user problem, constraints, non-goals, and what success would look like. Separate known facts from assumptions.",
      "Compare two viable options for complexity, failure behavior, data consistency, operating cost, and future change.",
      "Choose one option and describe the smallest experiment, rollout, recovery path, and signal that would make you revisit the decision.",
    ],
    checks: [
      { id: "constraints", label: "The decision starts with requirements and explicit constraints." },
      { id: "options", label: "I compared two viable options using the same criteria." },
      { id: "revisit", label: "I recorded a validation plan, recovery path, and revisit trigger." },
    ],
    stretch: "Give a five-minute explanation to an imagined product partner. Explain the user impact without depending on architecture jargon.",
    review: "Does your choice fit this app's scale and owner? For a single-user app, extra services need a concrete benefit to justify their upkeep.",
    study: "system design",
  },
  {
    id: "rehearse-an-incident", title: "Diagnose and recover from an incident",
    stage: "Own the outcome", minutes: 45, skill: "Incident response",
    brief: "In a practice environment, simulate a dependency outage, failed write, or bad release. Treat restoring a useful service as the first priority.",
    steps: [
      "Record a start time, user impact, and the first reliable symptom. Define a safe mitigation before exploring a permanent fix.",
      "Use logs, network inspection, or stored state to narrow the failure. Rehearse the mitigation and verify service recovery.",
      "Write a concise incident note: timeline, cause, recovery evidence, and one prevention action with a verification step.",
    ],
    checks: [
      { id: "impact", label: "I recorded impact, timeline, and evidence rather than guesses." },
      { id: "recovery", label: "I rehearsed mitigation and verified the user journey recovered." },
      { id: "prevention", label: "A specific prevention action has a test or measurable check." },
    ],
    stretch: "Write two short status updates: one during diagnosis and one after recovery. Be explicit about uncertainty and the next update.",
    review: "Separate immediate mitigation from the permanent fix. Would your runbook still help someone who did not implement the feature?",
    study: "reliability",
  },
  {
    id: "release-a-capstone", title: "Release and defend your capstone",
    stage: "Own the outcome", minutes: 90, skill: "Production ownership",
    brief: "Bring the previous missions together in one small CRUD app. Prepare a release with evidence that the important journeys work and data can be recovered.",
    steps: [
      "Choose one useful workflow. Write a release scope and verify validation, loading, empty and error states, keyboard use, and a narrow mobile layout.",
      "Build the production artifact and test that artifact. Rehearse backup restoration and update behavior with existing data; document any unsupported behavior.",
      "Prepare release notes, deployment and rollback commands, and a short walkthrough of the largest tradeoff, hardest bug, and what you would improve next.",
    ],
    checks: [
      { id: "journeys", label: "The production build passes the critical journeys and usability checks." },
      { id: "restore", label: "Backup restoration and an upgrade with existing data were rehearsed." },
      { id: "handoff", label: "Release notes, recovery steps, and my technical walkthrough are saved." },
    ],
    stretch: "Ask a peer to use the app and follow the recovery instructions. If reviewing solo, revisit the walkthrough the next day without implementation notes.",
    review: "Be precise about what was tested and what remains unverified. Completed practice is evidence to discuss, not an automatic seniority certification.",
    study: "delivery",
  },
  {
    id: "repair-a-search-race", title: "Make search survive out-of-order responses",
    stage: "Build independently", minutes: 45, skill: "Async UI correctness",
    brief: "Use a search or filter screen in a practice app. Make an older request finish after a newer one, then prevent obsolete results and errors from changing the current screen.",
    steps: [
      "Create two controlled responses for different queries. Resolve the newer request first and record the incorrect behavior before changing code.",
      "Give each request a clear lifetime. Guard success, error, and loading updates against stale completion; cancel obsolete work where supported.",
      "Test an old success, an old failure, and navigation away while a request is pending. Keep the current query's result and error state consistent.",
    ],
    checks: [
      { id: "reproduce", label: "My test reproduces the race with controlled response order." },
      { id: "states", label: "Stale success, error, and cleanup cannot overwrite current state." },
      { id: "navigation", label: "Navigation during a request preserves the next screen's behavior." },
    ],
    stretch: "Add debouncing and show that correctness does not depend on the debounce delay.",
    review: "Does the test control ordering instead of relying on sleep? Check catch and finally as carefully as the success handler.",
    study: "React",
  },
  {
    id: "measure-first-use", title: "Measure and improve first-use loading",
    stage: "Make it reliable", minutes: 60, skill: "Performance investigation",
    brief: "Profile a production build from a fresh browser profile and an existing populated profile. Improve the largest measured contributor to the time until a user can act.",
    steps: [
      "Define the usable-screen milestone. Record cache, storage, network throttling, device settings, and several cold and warm timings.",
      "Inspect downloads, parsing, main-thread work, and storage initialization. Change one measured bottleneck and repeat the same workload.",
      "Test offline navigation, an existing-data upgrade, and a failed load. Record any tradeoff introduced by the optimization.",
    ],
    checks: [
      { id: "baseline", label: "I saved comparable cold and warm measurements and their conditions." },
      { id: "result", label: "The before/after evidence connects the change to the measured bottleneck." },
      { id: "contracts", label: "Offline access, upgrades, and load failure recovery still work." },
    ],
    stretch: "Choose a realistic regression budget and automate a repeatable check for it.",
    review: "Do the measurements represent the same workload? Report variability and separate smaller assets from demonstrated user-visible improvement.",
    study: "performance",
  },
  {
    id: "protect-two-editors", title: "Resolve a conflicting edit without losing work",
    stage: "Make it reliable", minutes: 60, skill: "Concurrency control",
    brief: "Open the same record in two editors. Detect a stale save at the persistence boundary and give the second editor a usable way to resolve the conflict.",
    steps: [
      "Load the same version twice. Save the first edit, then demonstrate what the current app does with the stale second edit.",
      "Implement an atomic version condition using your database or ORM. Preserve the rejected draft and display the current stored value for comparison.",
      "Test stale update, deletion by the other editor, and a deliberate retry after resolution. Document how the chosen policy handles overlapping field changes.",
    ],
    checks: [
      { id: "atomic", label: "The version check and write are atomic at the persistence boundary." },
      { id: "draft", label: "A conflict preserves the user's unsaved draft." },
      { id: "resolution", label: "Stale update, deletion, and resolved retry have verified outcomes." },
    ],
    stretch: "Compare record-level conflicts with field-level merging using a concrete non-overlapping edit example.",
    review: "A preflight read does not close the race. Identify the exact operation that rejects the stale write and demonstrate the resulting stored data.",
    study: "concurrency",
  },
  {
    id: "review-learning-material", title: "Turn weak prompts into useful practice",
    stage: "Own the outcome", minutes: 45, skill: "Technical explanation",
    brief: "Review ten learning cards from a topic you can verify. Replace vague prompts or arbitrary word blanks with self-contained questions that test a specific engineering decision.",
    steps: [
      "For each prompt, write the skill being tested and answer it without looking at the back. Mark missing context, ambiguous expectations, duplicates, and incorrect claims.",
      "Rewrite the weak items as a prediction, debugging scenario, or bounded design decision. Give an answer, its reasoning, and a concrete way to verify it.",
      "Check claims against official documentation or a reproducible example. Keep source credits and stable identities when the learning objective is unchanged.",
    ],
    checks: [
      { id: "audit", label: "My audit identifies specific content defects with examples." },
      { id: "rewrite", label: "Each replacement has enough context and a defensible expected answer." },
      { id: "verify", label: "I recorded sources or reproducible checks for technical claims." },
    ],
    stretch: "Ask someone unfamiliar with the original wording to answer the revised prompts and record where they still need context.",
    review: "Do the revisions test understanding or memory of a phrase? Do not invent extra cards solely to reach a numerical target.",
    study: "Engineering craft",
  },
  ...additionalEngineeringMissions,
];

export const missionStages = ["Build independently", "Make it reliable", "Own the outcome"] as const;
