import { db } from "../schema";
import { engineeringMissions } from "../../data/engineering-missions";

const prefix = "engineering_practice:";
const pendingWrites = new Map<string, Promise<PracticeEntry>>();
export interface PracticeEntry {
  mission_id: string;
  outcome: string;
  verification: string;
  tradeoff: string;
  checked: string[];
  completed: boolean;
  updated_at: string;
}
export type PracticeDraft = Omit<PracticeEntry, "updated_at">;

export function emptyPracticeEntry(mission_id: string): PracticeDraft {
  return { mission_id, outcome: "", verification: "", tradeoff: "", checked: [], completed: false };
}

export function canCompleteMission(entry: PracticeDraft): boolean {
  const mission = engineeringMissions.find((item) => item.id === entry.mission_id);
  return Boolean(mission && entry.outcome.trim() && entry.verification.trim() &&
    entry.tradeoff.trim() && mission.checks.every((check) => entry.checked.includes(check.id)));
}

export function validatePracticeEntries(value: unknown): asserts value is PracticeEntry[] {
  if (!Array.isArray(value) || value.length > 1000)
    throw new Error("Invalid practice journal. No data was imported.");
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" ||
      typeof item.mission_id !== "string" || !/^[a-z0-9-]{1,120}$/.test(item.mission_id) || ids.has(item.mission_id) ||
      ![item.outcome, item.verification, item.tradeoff].every((field) => typeof field === "string" && field.length <= 12000) ||
      typeof item.completed !== "boolean" || !Array.isArray(item.checked) || item.checked.length > 40 ||
      !item.checked.every((id: unknown) => typeof id === "string" && /^[a-z0-9-]{1,120}$/.test(id)) ||
      new Set(item.checked).size !== item.checked.length ||
      typeof item.updated_at !== "string" || !Number.isFinite(Date.parse(item.updated_at)))
      throw new Error("Invalid practice journal. No data was imported.");
    const known = engineeringMissions.some((mission) => mission.id === item.mission_id);
    if (item.completed && (!item.outcome.trim() || !item.verification.trim() || !item.tradeoff.trim() ||
      (known && !canCompleteMission(item))))
      throw new Error("Completed practice needs evidence and all review checks. No data was imported.");
    ids.add(item.mission_id);
  }
}

export async function listPracticeEntries(): Promise<PracticeEntry[]> {
  const rows = await db.sync_meta.where("key").startsWith(prefix).toArray();
  const entries: unknown = rows.map((row) => JSON.parse(row.value));
  validatePracticeEntries(entries);
  return entries;
}

export function hasPendingPracticeWrites(): boolean {
  return pendingWrites.size > 0;
}

export async function waitForPracticeWrites(): Promise<void> {
  await Promise.all([...pendingWrites.values()]);
}

export function savePracticeEntry(draft: PracticeDraft): Promise<PracticeEntry> {
  // Register snapshots immediately, including across route changes/remounts.
  const previous = pendingWrites.get(draft.mission_id) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(() => writePracticeEntry(draft));
  pendingWrites.set(draft.mission_id, operation);
  const settled = () => {
    if (pendingWrites.get(draft.mission_id) === operation) pendingWrites.delete(draft.mission_id);
  };
  void operation.then(settled, settled);
  return operation;
}

async function writePracticeEntry(draft: PracticeDraft): Promise<PracticeEntry> {
  return db.transaction("rw", db.sync_meta, async () => {
    const key = prefix + draft.mission_id;
    const local = await db.sync_meta.get(key);
    const previous: PracticeEntry | undefined = local ? JSON.parse(local.value) : undefined;
    const entry: PracticeEntry = {
      ...draft,
      updated_at: new Date(Math.max(Date.now(), previous ? Date.parse(previous.updated_at) + 1 : 0)).toISOString(),
    };
    validatePracticeEntries([entry]);
    await db.sync_meta.put({ key, value: JSON.stringify(entry) });
    return entry;
  });
}

// Called inside the full backup import transaction. Practice is local/backup-only.
export async function mergePracticeEntries(entries: PracticeEntry[]): Promise<void> {
  validatePracticeEntries(entries);
  for (const entry of entries) {
    const key = prefix + entry.mission_id;
    const row = await db.sync_meta.get(key);
    const local: PracticeEntry | undefined = row ? JSON.parse(row.value) : undefined;
    if (!local || Date.parse(entry.updated_at) > Date.parse(local.updated_at))
      await db.sync_meta.put({ key, value: JSON.stringify(entry) });
  }
}
