import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { CardEditorScreen } from "./features/cards/CardEditorScreen";
import { CaptureScreen } from "./features/capture/CaptureScreen";
import { DeckDetailScreen } from "./features/decks/DeckDetailScreen";
import { DeckListScreen } from "./features/decks/DeckListScreen";
import { HomeScreen } from "./features/home/HomeScreen";
import { InboxScreen } from "./features/inbox/InboxScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { StudyScreen } from "./features/study/StudyScreen";
import { ProgressScreen } from "./features/progress/ProgressScreen";
import { initializeStudyData } from "./db/seed";
import { initAuth } from "./db/sync/auth";
import { setupSyncTriggers } from "./db/sync/engine";
import "./styles.css";

async function initialize() {
  await initializeStudyData();
  void initAuth()
    .then(setupSyncTriggers)
    .catch(() => {
      // Local study remains available if optional authentication is unreachable.
      setupSyncTriggers();
    });
}

const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("recall:update-available"));
  },
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
              <Route path="capture" element={<CaptureScreen />} />
              <Route path="inbox" element={<InboxScreen />} />
              <Route path="study" element={<StudyScreen />} />
              <Route path="study/:deckId" element={<StudyScreen />} />
              <Route path="decks" element={<DeckListScreen />} />
              <Route path="decks/:deckId" element={<DeckDetailScreen />} />
              <Route path="cards/new" element={<CardEditorScreen />} />
              <Route path="cards/:cardId/edit" element={<CardEditorScreen />} />
              <Route path="settings" element={<SettingsScreen />} />
              <Route path="progress" element={<ProgressScreen />} />
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
