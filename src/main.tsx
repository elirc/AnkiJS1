import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { HomeScreen } from "./features/home/HomeScreen";
import { curriculumVersionKey, initializeStudyData } from "./db/seed";
import { db } from "./db/schema";
import { isSupabaseConfigured, loadSupabaseClient } from "./db/sync/supabaseClient";
import { notifyAppUpdate } from "./lib/appUpdate";
import "./styles.css";

const CardEditorScreen = lazy(() =>
  import("./features/cards/CardEditorScreen").then((module) => ({
    default: module.CardEditorScreen,
  })),
);
const CaptureScreen = lazy(() =>
  import("./features/capture/CaptureScreen").then((module) => ({
    default: module.CaptureScreen,
  })),
);
const DeckDetailScreen = lazy(() =>
  import("./features/decks/DeckDetailScreen").then((module) => ({
    default: module.DeckDetailScreen,
  })),
);
const DeckListScreen = lazy(() =>
  import("./features/decks/DeckListScreen").then((module) => ({
    default: module.DeckListScreen,
  })),
);
const DotnetScreen = lazy(() =>
  import("./features/dotnet/DotnetScreen").then((module) => ({
    default: module.DotnetScreen,
  })),
);
const InboxScreen = lazy(() =>
  import("./features/inbox/InboxScreen").then((module) => ({
    default: module.InboxScreen,
  })),
);
const PracticeScreen = lazy(() =>
  import("./features/practice/PracticeScreen").then((module) => ({
    default: module.PracticeScreen,
  })),
);
const ProgressScreen = lazy(() =>
  import("./features/progress/ProgressScreen").then((module) => ({
    default: module.ProgressScreen,
  })),
);
const SettingsScreen = lazy(() =>
  import("./features/settings/SettingsScreen").then((module) => ({
    default: module.SettingsScreen,
  })),
);
const StudyScreen = lazy(() =>
  import("./features/study/StudyScreen").then((module) => ({
    default: module.StudyScreen,
  })),
);

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-dot" />
      {children}
    </div>
  );
}

const fallback = <Loading>Loading…</Loading>;

const root = ReactDOM.createRoot(document.getElementById("root")!);

function renderApp() {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<HomeScreen />} />
            <Route path="dotnet" element={<Suspense fallback={fallback}><DotnetScreen /></Suspense>} />
            <Route path="capture" element={<Suspense fallback={fallback}><CaptureScreen /></Suspense>} />
            <Route path="inbox" element={<Suspense fallback={fallback}><InboxScreen /></Suspense>} />
            <Route path="study" element={<Suspense fallback={fallback}><StudyScreen /></Suspense>} />
            <Route path="study/:deckId" element={<Suspense fallback={fallback}><StudyScreen /></Suspense>} />
            <Route path="decks" element={<Suspense fallback={fallback}><DeckListScreen /></Suspense>} />
            <Route path="decks/:deckId" element={<Suspense fallback={fallback}><DeckDetailScreen /></Suspense>} />
            <Route path="cards/new" element={<Suspense fallback={fallback}><CardEditorScreen /></Suspense>} />
            <Route path="cards/:cardId/edit" element={<Suspense fallback={fallback}><CardEditorScreen /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={fallback}><SettingsScreen /></Suspense>} />
            <Route path="progress" element={<Suspense fallback={fallback}><ProgressScreen /></Suspense>} />
            <Route path="practice" element={<Suspense fallback={fallback}><PracticeScreen /></Suspense>} />
            <Route path="practice/:missionId" element={<Suspense fallback={fallback}><PracticeScreen /></Suspense>} />
            <Route
              path="*"
              element={
                <div className="empty-panel">
                  <h1>Page not found.</h1>
                  <a href="/">Back to home</a>
                </div>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </React.StrictMode>,
  );
}

function renderStorageError() {
  root.render(
    <div className="empty-panel">
      <h1>Recall could not open its local storage.</h1>
      <p>
        Allow site storage for this page, then try again. Nothing already saved
        has been removed.
      </p>
      <button onClick={() => window.location.reload()}>Try again</button>
    </div>,
  );
}

// A first install must finish before the UI is useful, so it shows progress.
// A curriculum upgrade runs behind the existing library; if it fails (for
// example while offline), the current cards stay usable and it retries later.
async function prepareLibrary(): Promise<void> {
  if (await db.sync_meta.get(curriculumVersionKey)) return;
  if ((await db.decks.count()) === 0) {
    await initializeStudyData(({ completed, total, phase }) => {
      root.render(
        <Loading>
          {phase === "saving"
            ? "Saving your library…"
            : `Installing cards · ${completed.toLocaleString()} of ${total.toLocaleString()}`}
        </Loading>,
      );
    });
    return;
  }
  const upgrade = () => initializeStudyData().catch(() => {
    window.addEventListener("online", upgrade, { once: true });
  });
  void upgrade();
}

async function startSync(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  void loadSupabaseClient();
  const [{ initAuth }, { setupSyncTriggers }] = await Promise.all([
    import("./db/sync/auth"),
    import("./db/sync/engine"),
  ]);
  try {
    await initAuth();
  } finally {
    // Local study remains available if optional authentication is unreachable.
    setupSyncTriggers();
  }
}

const updateSW = registerSW({
  onNeedRefresh: notifyAppUpdate,
});
window.addEventListener("recall:apply-update", () => void updateSW(true));

root.render(<Loading>Opening Recall…</Loading>);
prepareLibrary()
  .then(() => {
    renderApp();
    void startSync().catch(() => undefined);
  })
  .catch(renderStorageError);
