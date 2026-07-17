import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { CardEditorScreen } from './features/cards/CardEditorScreen';
import { CaptureScreen } from './features/capture/CaptureScreen';
import { DeckDetailScreen } from './features/decks/DeckDetailScreen';
import { DeckListScreen } from './features/decks/DeckListScreen';
import { HomeScreen } from './features/home/HomeScreen';
import { InboxScreen } from './features/inbox/InboxScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { StudyScreen } from './features/study/StudyScreen';
import { initAuth } from './db/sync/auth';
import { setupSyncTriggers } from './db/sync/engine';
import './styles.css';

void initAuth().finally(() => setupSyncTriggers());

registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('recall:update-available'));
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
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
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
