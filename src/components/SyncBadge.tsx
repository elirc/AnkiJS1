import { useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { RefreshCw } from "lucide-react";
import { getSyncState, subscribeSyncState, syncNow } from "../db/sync/engine";
import { pendingOutboxCount } from "../db/sync/outbox";
import { getMeta } from "../db/repos/metaRepo";
import { relativeAge } from "../lib/dates";
import { cn } from "../lib/cn";
import { getSupabaseClient } from "../db/sync/supabaseClient";

export function SyncBadge() {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState);
  const pending = useLiveQuery(pendingOutboxCount, [], 0);
  const lastSync = useLiveQuery(
    () => getMeta("last_sync_ok_at"),
    [],
    undefined,
  );
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const syncing = state.phase === "pushing" || state.phase === "pulling";
  if (!getSupabaseClient())
    return (
      <span className="inline-flex items-center gap-2 text-[10px] text-[#839175]">
        <span className="status-dot" />
        Saved on this device
      </span>
    );
  const label = offline
    ? `Offline · ${pending} pending`
    : state.phase === "error"
      ? "Sync error"
      : syncing
        ? "Syncing"
        : pending > 0
          ? `${pending} pending`
          : lastSync
            ? `Synced ${relativeAge(lastSync)} ago`
            : "Local only";
  const dotColor = offline
    ? "bg-muted"
    : state.phase === "error"
      ? "bg-again"
      : syncing || pending > 0
        ? "bg-accent"
        : "bg-good";

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-medium text-muted shadow-sm outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary",
        state.phase === "error" && "border-again text-again",
      )}
      title={state.message ?? "Sync now"}
    >
      <span className="relative flex size-2" aria-hidden="true">
        {syncing ? (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-60",
              dotColor,
            )}
          />
        ) : null}
        <span
          className={cn("relative inline-flex size-2 rounded-full", dotColor)}
        />
      </span>
      <span className="hidden sm:inline">{label}</span>
      <RefreshCw
        className={cn("size-3.5 sm:hidden", syncing && "animate-spin")}
        aria-hidden="true"
      />
    </button>
  );
}
