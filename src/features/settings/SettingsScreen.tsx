import { useSyncExternalStore, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, RefreshCw, Send, Trash2, Upload } from 'lucide-react';
import { Button } from '../../components/Button';
import { eraseLocalData, exportData, importData } from '../../db/repos/dataRepo';
import { getMeta } from '../../db/repos/metaRepo';
import { getCurrentSession, sendMagicLink, signOut, subscribeAuth } from '../../db/sync/auth';
import { syncNow } from '../../db/sync/engine';
import { pendingOutboxCount } from '../../db/sync/outbox';
import { localDateStamp, relativeAge } from '../../lib/dates';

export function SettingsScreen() {
  const session = useSyncExternalStore(subscribeAuth, getCurrentSession);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useLiveQuery(pendingOutboxCount, [], 0);
  const lastSync = useLiveQuery(() => getMeta('last_sync_ok_at'), [], undefined);
  const lastError = useLiveQuery(() => getMeta('last_error'), [], undefined);
  const authBlocked = useLiveQuery(() => getMeta('auth_blocked'), [], undefined);

  async function exportJson() {
    const backup = await exportData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `recall-backup-${localDateStamp()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importData(JSON.parse(await file.text()));
      setMessage('Import complete.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted">Local data always stays usable offline.</p>
      </div>

      {authBlocked ? (
        <section className="rounded-2xl border border-again bg-surface p-4 shadow-sm">
          <h2 className="font-semibold text-again">Account blocked</h2>
          <p className="mt-1 text-sm text-muted">{authBlocked}</p>
          <Button
            className="mt-3"
            icon={Trash2}
            variant="danger"
            onClick={() => {
              if (window.confirm('Erase all local Recall data and continue?')) void eraseLocalData();
            }}
          >
            Erase local data
          </Button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <h2 className="font-semibold">Account</h2>
        {session ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-muted">{session.user.email}</p>
            <Button onClick={() => void signOut()}>Sign out</Button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-muted">Sign in to sync across devices.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="min-h-11 flex-1 rounded-xl border border-line bg-background px-3 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button
                icon={Send}
                variant="primary"
                disabled={!email.trim()}
                onClick={async () => {
                  await sendMagicLink(email);
                  setSent(true);
                }}
              >
                Send magic link
              </Button>
            </div>
            {sent ? <p className="text-sm font-medium text-primary">Check your email.</p> : null}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <h2 className="font-semibold">Sync</h2>
        <div className="mt-3 space-y-2 text-sm text-muted">
          <p>Pending changes: {pending}</p>
          <p>Last synced: {lastSync ? `${relativeAge(lastSync)} ago` : 'Never'}</p>
          {lastError ? <p className="text-again">Last error: {lastError}</p> : null}
        </div>
        <Button className="mt-3" icon={RefreshCw} onClick={() => void syncNow()}>
          Sync now
        </Button>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <h2 className="font-semibold">Data</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button icon={Download} onClick={() => void exportJson()}>
            Export JSON
          </Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-sm outline-none transition hover:border-primary/40 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary">
            <Upload className="size-4" aria-hidden="true" />
            Import JSON
            <input className="sr-only" type="file" accept="application/json" onChange={(event) => void importJson(event)} />
          </label>
        </div>
        {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <h2 className="font-semibold">About</h2>
        <p className="mt-2 text-sm text-muted">Version {import.meta.env.VITE_APP_VERSION ?? '0.1.0'}</p>
      </section>
    </div>
  );
}
