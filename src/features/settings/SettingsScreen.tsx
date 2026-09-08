import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Send,
  Smartphone,
  Upload,
} from "lucide-react";
import { Button } from "../../components/Button";
import { exportData, importData } from "../../db/repos/dataRepo";
import { importCardText } from "../../db/repos/textImport";
import { getMeta, setMeta } from "../../db/repos/metaRepo";
import {
  getCurrentSession,
  sendMagicLink,
  signOut,
  subscribeAuth,
} from "../../db/sync/auth";
import { syncNow } from "../../db/sync/engine";
import { getSupabaseClient } from "../../db/sync/supabaseClient";
import { localDateStamp, relativeAge } from "../../lib/dates";
import { installStarterDecks } from "../../db/seed";
import {
  getStudyPreferences,
  saveStudyPreferences,
} from "../../db/repos/studyRepo";
import { defaultStudyPreferences } from "../../srs/preferences";
import { starterCardCount } from "../../data/curriculum";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function SettingsScreen() {
  const session = useSyncExternalStore(subscribeAuth, getCurrentSession);
  const configured = Boolean(getSupabaseClient());
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [installed, setInstalled] = useState(
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches,
  );
  const preferences = useLiveQuery(
    getStudyPreferences,
    [],
    defaultStudyPreferences,
  );
  const goal = useLiveQuery(() => getMeta("daily_goal"), [], undefined);
  const lastSync = useLiveQuery(
    () => getMeta("last_sync_ok_at"),
    [],
    undefined,
  );
  const lastError = useLiveQuery(() => getMeta("last_error"), [], undefined);
  useEffect(() => {
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  async function perform(action: () => Promise<string>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      setMessage(await action());
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "That did not work. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function importFile(
    event: ChangeEvent<HTMLInputElement>,
    text: boolean,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await perform(async () => {
      const maxBytes = text ? 20_000_000 : 100_000_000;
      if (file.size > maxBytes)
        throw new Error(`Please choose a file smaller than ${maxBytes / 1_000_000} MB.`);
      setMessage(text ? "Importing cards…" : "Restoring backup…");
      const contents = await file.text();
      if (text) {
        const count = await importCardText(
          contents,
          file.name.replace(/\.(txt|tsv)$/i, ""),
        );
        return `Imported ${count} cards into a new deck. Find it in My decks.`;
      }
      await importData(JSON.parse(contents));
      return "Backup imported. Your decks, review history, and practice journal are ready.";
    });
  }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h1>
            Your study space, your way<span className="text-primary">.</span>
          </h1>
          <p>Small habits work best when they fit your life.</p>
        </div>
      </div>
      {message && (
        <p className="quiet-note mb-5" role="status">
          {message}
        </p>
      )}
      <section className="content-panel settings-section">
        <h2>Keep it sustainable</h2>
        <p>
          Your daily goal counts reviews across all decks. Spaced repetition
          brings difficult cards back sooner and gradually spaces out stronger
          memories.
        </p>
        <label className="setting-label">
          Daily review goal
          <select
            aria-label="Daily review goal"
            value={goal ?? "20"}
            onChange={(event) =>
              void perform(async () => {
                await setMeta("daily_goal", event.target.value);
                return "Daily goal saved.";
              })
            }
          >
            {[5, 10, 15, 20, 30, 50].map((value) => (
              <option key={value} value={value}>
                {value} cards
              </option>
            ))}
          </select>
        </label>
        <label className="setting-label">
          New cards per day · all decks
          <select
            aria-label="New cards per day"
            value={preferences.new_per_day}
            disabled={busy}
            onChange={(event) => {
              const value = Number(event.target.value);
              void perform(async () => {
                await saveStudyPreferences({
                  ...preferences,
                  new_per_day: value,
                });
                return "Daily new-card limit saved. Due reviews are always available.";
              });
            }}
          >
            {[0, 5, 10, 15, 20, 30, 50].map((value) => (
              <option key={value} value={value}>
                {value === 0 ? "0 · Review only" : `${value} new cards`}
              </option>
            ))}
          </select>
        </label>
        <p>
          Start with 5–10 new cards a day. Each deck’s own limit also applies.
          Due reviews come first and never count against this allowance. Related
          new exercises revisit the same idea after 1 day, then 3 days, then 7 days. Due reviews keep their own schedule.
        </p>
        <label className="setting-label">
          Target retention
          <select
            aria-label="Target retention"
            value={preferences.request_retention}
            disabled={busy}
            onChange={(event) => {
              const value = Number(event.target.value);
              void perform(async () => {
                await saveStudyPreferences({
                  ...preferences,
                  request_retention: value,
                });
                return "Retention target saved. It will apply as you review cards.";
              });
            }}
          >
            <option value={0.85}>85% · Lighter workload</option>
            <option value={0.9}>90% · Balanced</option>
            <option value={0.95}>95% · More frequent reviews</option>
          </select>
        </label>
        <p>
          FSRS uses your ratings and elapsed time to schedule each card. Higher
          retention targets mean more frequent reviews; this is a scheduling
          target, not a guaranteed score.
        </p>
        <p className="mt-4">
          New to spaced repetition? Think of your answer first, then reveal it.
          Choose Again if you forgot, Hard if you recalled with difficulty, Good
          for a solid recall, and Easy when it felt effortless.
        </p>
      </section>
      <section className="content-panel settings-section">
        <div className="flex items-center gap-3 mb-2">
          <Smartphone size={20} className="text-primary" />
          <h2 className="!mb-0">Your pocket-sized learning habit</h2>
        </div>
        <p>
          {installed
            ? "Recall is running as an installed app."
            : "Add Recall to your home screen for a full-screen app that opens with a tap."}{" "}
          Your cards and progress stay on this device.
        </p>
        {installPrompt && (
          <Button
            className="mt-4"
            variant="primary"
            icon={Download}
            onClick={() =>
              void perform(async () => {
                await installPrompt.prompt();
                const result = await installPrompt.userChoice;
                setInstallPrompt(null);
                return result.outcome === "accepted"
                  ? "Recall added. See you on your home screen."
                  : "You can install later from your browser menu.";
              })
            }
          >
            Install Recall
          </Button>
        )}
        <div className="install-steps">
          <p>
            <strong>iPhone:</strong> Open in Safari → Share → Add to Home
            Screen.
          </p>
          <p>
            <strong>Android:</strong> Open in Chrome → menu → Install app or Add
            to Home screen.
          </p>
          <p>
            <strong>Before you head out:</strong> Open the hosted HTTPS app once
            while online and let it finish loading. Your decks and reviews then
            work offline.
          </p>
        </div>
        <p className="mt-3">
          Progress is stored per browser and device. Export a backup to keep a
          separate copy; clearing site data removes local progress.
        </p>
      </section>
      <section className="content-panel settings-section">
        <h2>Your knowledge, kept safe</h2>
        <p>
          Export all decks, cards, notes, review history, and your practice journal. Import a Recall
          backup to restore or merge progress on another device.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            icon={Download}
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                const backup = await exportData();
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(backup, null, 2)], {
                    type: "application/json",
                  }),
                );
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `recall-backup-${localDateStamp()}.json`;
                document.body.append(anchor);
                anchor.click();
                anchor.remove();
                window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
                return "Backup downloaded. Keep it somewhere safe.";
              })
            }
          >
            Export backup
          </Button>
          <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-primary">
            <Upload size={16} />
            Import backup
            <input
              disabled={busy}
              aria-label="Import backup"
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void importFile(event, false)}
            />
          </label>
        </div>
      </section>
      <section className="content-panel settings-section">
        <h2>Bring your own cards</h2>
        <p>
          Import Anki’s plain-text export (.txt) or a tab-separated file (.tsv):
          question in the first column, answer in the second. Disable “Include
          HTML” when exporting from Anki. Markdown and quoted multiline fields
          work too. Anki package (.apkg) files and their schedules are not
          imported.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-primary">
            <FileText size={16} />
            Import text cards
            <input
              disabled={busy}
              aria-label="Import text cards"
              className="sr-only"
              type="file"
              accept=".txt,.tsv,text/plain,text/tab-separated-values"
              onChange={(event) => void importFile(event, true)}
            />
          </label>
          <Button
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await installStarterDecks();
                return "Available starter decks checked. Existing cards and progress were preserved.";
              })
            }
          >
            Add missing starter decks
          </Button>
        </div>
      </section>
      <section className="content-panel settings-section">
        <h2>Across your devices</h2>
        {!configured ? (
          <>
            <p>
              This build saves locally and works without an account. Use export
              and import to move your progress between devices.
            </p>
            <p className="mt-2">
              Automatic sync is optional. To enable it, configure the Supabase
              project described in this project’s README before building.
            </p>
          </>
        ) : (
          <>
            <p>
              Connect the same account on each device to sync your study data.
            </p>
            {session ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted">{session.user.email}</span>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await signOut();
                      return "Signed out. Your local study data is still here.";
                    })
                  }
                >
                  Sign out
                </Button>
                <Button
                  icon={RefreshCw}
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await syncNow();
                      return "Sync check complete.";
                    })
                  }
                >
                  Sync now
                </Button>
              </div>
            ) : (
              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform(async () => {
                    await sendMagicLink(email);
                    return "Check your email for a sign-in link.";
                  });
                }}
              >
                <input
                  aria-label="Email address"
                  className="text-input"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button
                  type="submit"
                  icon={Send}
                  variant="primary"
                  disabled={busy || !email.trim()}
                  className="shrink-0"
                >
                  Send sign-in link
                </Button>
              </form>
            )}
            <p className="mt-3">
              Last synced:{" "}
              {lastSync ? `${relativeAge(lastSync)} ago` : "Not yet"}
            </p>
            {lastError && (
              <p role="alert" className="text-again">
                {lastError}
              </p>
            )}
          </>
        )}
      </section>
      <p className="mt-5 text-xs text-muted">
        The expanded library includes adapted, openly licensed learning
        material.{" "}
        <a
          className="subtle-link"
          href="/content-credits.html"
          target="_blank"
          rel="noreferrer"
        >
          Content sources &amp; licenses
        </a>
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>
          Recall · {starterCardCount} starter cards · Built for the curious
          engineer
        </span>
        <a
          href="https://github.com/open-spaced-repetition/fsrs4anki"
          target="_blank"
          rel="noreferrer"
          className="subtle-link"
        >
          Scheduled with FSRS
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
