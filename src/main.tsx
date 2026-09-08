import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { HomeScreen } from "./features/home/HomeScreen";
import { initializeStudyData } from "./db/seed";
import { initAuth } from "./db/sync/auth";
import { setupSyncTriggers } from "./db/sync/engine";
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

function RouteFallback() {
  return (
    <div className="loading-state" role="status">
      <span className="loading-dot" />
      Loading this workspace...
    </div>
  );
}

async function initialize() {
  await initializeStudyData(({ completed, total, phase }) => {
    root.render(
      <div className="loading-state" role="status">
        <span className="loading-dot" />
        <span>{phase === "saving" ? "Saving your study library…" : `Preparing practice cards · ${completed.toLocaleString()} of ${total.toLocaleString()}`}</span>
      </div>,
    );
  });
  void initAuth()
    .then(setupSyncTriggers)
    .catch(() => {
      // Local study remains available if optional authentication is unreachable.
      setupSyncTriggers();
    });
}

const updateSW = registerSW({
  onNeedRefresh: notifyAppUpdate,
});
window.addEventListener("recall:apply-update", () => void updateSW(true));

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <div className="loading-state">
    <span className="loading-dot" />
    Preparing your engineering toolkit…
  </div>,
);
void initialize()
  .then(() =>
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <Routes>
            <Route element={<App />}>
              <Route index element={<HomeScreen />} />
              <Route
                path="dotnet"
                element={<Suspense fallback={<RouteFallback />}><DotnetScreen /></Suspense>}
              />
              <Route
                path="capture"
                element={<Suspense fallback={<RouteFallback />}><CaptureScreen /></Suspense>}
              />
              <Route
                path="inbox"
                element={<Suspense fallback={<RouteFallback />}><InboxScreen /></Suspense>}
              />
              <Route
                path="study"
                element={<Suspense fallback={<RouteFallback />}><StudyScreen /></Suspense>}
              />
              <Route
                path="study/:deckId"
                element={<Suspense fallback={<RouteFallback />}><StudyScreen /></Suspense>}
              />
              <Route
                path="decks"
                element={<Suspense fallback={<RouteFallback />}><DeckListScreen /></Suspense>}
              />
              <Route
                path="decks/:deckId"
                element={<Suspense fallback={<RouteFallback />}><DeckDetailScreen /></Suspense>}
              />
              <Route
                path="cards/new"
                element={<Suspense fallback={<RouteFallback />}><CardEditorScreen /></Suspense>}
              />
              <Route
                path="cards/:cardId/edit"
                element={<Suspense fallback={<RouteFallback />}><CardEditorScreen /></Suspense>}
              />
              <Route
                path="settings"
                element={<Suspense fallback={<RouteFallback />}><SettingsScreen /></Suspense>}
              />
              <Route
                path="progress"
                element={<Suspense fallback={<RouteFallback />}><ProgressScreen /></Suspense>}
              />
              <Route
                path="practice"
                element={<Suspense fallback={<RouteFallback />}><PracticeScreen /></Suspense>}
              />
              <Route
                path="practice/:missionId"
                element={<Suspense fallback={<RouteFallback />}><PracticeScreen /></Suspense>}
              />
              <Route
                path="*"
                element={
                  <div className="empty-panel">
                    <h1>That page took a wrong turn.</h1>
                    <a href="/">Back to your study space</a>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </React.StrictMode>,
    ),
  )
  .catch(() =>
    root.render(
      <div className="empty-panel">
        <h1>We couldn’t open your study space.</h1>
        <p>
          Please allow browser storage, then try again. Your existing data has
          not been erased.
        </p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </div>,
    ),
  );
