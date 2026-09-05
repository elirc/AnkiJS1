# Recall — Engineering practice, in your pocket

A complete, local-first spaced-repetition web app for the spare minutes in your day. Open it and start studying: **2,803 software engineering flashcards across 55 decks** are included. No API key or account is required.

## Start the app

Requires Node 22.13+ (or Node 24+) and npm.

```sh
npm ci
npm run dev
```

For the production app, including offline support:

```sh
npm run build
npm start
```

Open the printed address (normally `http://localhost:4173`). `dist/` contains the complete prebuilt website; it needs a web server and cannot be opened by double-clicking `index.html`.

## Use it on your phone, anywhere

1. Publish `dist/` to an HTTPS static host. Netlify and Vercel configuration is included. The deployable archive is `release/recall-web.zip` when built for delivery.
2. Open the hosted URL on your phone while online and let the app finish loading once.
3. **iPhone:** Safari → Share → Add to Home Screen. **Android:** Chrome → menu → Install app / Add to Home screen.
4. Pick a 2-, 5-, or 10-minute session. Think of the answer, reveal it, and rate your recall. You can stop at any time; each rating is saved immediately.
5. Reopen and review even without a connection. Offline behavior is tested against the production build, including rating and reloading.

The development server also prints your local network address for testing on the same Wi-Fi. A LAN HTTP address is for previewing: reliable PWA installation and service workers require **HTTPS** outside localhost. A localhost URL will not work on your phone when you are away from this computer. Publishing is a separate step; the project does not automatically upload your code or study data.

## Included toolkit

The library is **21.9× the original 128-card version**:

- **448 original cards:** core SWE foundations, realistic engineering scenarios, and 160 new beginner cards covering 80 ideas.
- **Start here:** ten numbered beginner decks covering your first program, control flow, collections, async and debugging, web pages, React, databases, Git, algorithms, and reliable services.
- **2,355 adapted cards:** 1,438 explanation exercises and 917 code-completion exercises from the CC BY 4.0 licensed _30 seconds of code_ collection. Topics include JavaScript, Python, Git, CSS, HTML, and React.
- Searchable topic decks, 30-at-a-time card browsing, and editable Markdown/code answers. Related new exercises are separated until another day.

Revealing an answer opens an explanation reader. **Next explanation**, Previous, and the explanation picker let you try another teaching approach without recording a review. Every new beginner card has five views: plain English, a worked example, an analogy, a common mistake, and a practice prompt with a separate **Check my answer** button. Rate the card based on what you remembered before revealing it.

Older cards retain their complete original answers and source credits. The reader adds a related beginner lesson, code view, or jargon translations where applicable; these are supporting examples, not a new bespoke solution to every advanced exercise. Use **Full original answer** to see all of the original detail. Add your own explanations in the card editor and preview them before saving. Teaching pages are stored with the Markdown answer, so they travel with existing backups and sync.

See [the full deck inventory](docs/CURRICULUM.md) and [content credits](public/content-credits.html). Source links are attached to adapted answers and the full license is bundled offline. The original scenarios also draw on this repo's `docs/upskill/` learning material.

- **FSRS scheduling:** Again / Hard / Good / Easy with actual interval previews; learning-step state persists correctly. Due reviews come before new material. Mixed sessions alternate decks and rotate the starting subject daily. Target retention is adjustable to 85%, 90%, or 95%; changes affect subsequent reviews. Future learning cards are not shown early.
- **Short sessions:** elapsed-time budget, comfortable tap targets, code-formatted answers, finish-anytime summary, and undo including the last card. The timer does not cut off the answer you are reading; finish the current card or tap Finish.
- **Progress:** daily review goal, streaks, review history, a 28-day activity view, and per-deck review-stage counts. No demo progress is fabricated. “In review” is a scheduling stage, not a claim of mastery.
- **Daily limits:** 10 new cards per day across the entire library by default, with a separate per-deck cap of 3. Change the global allowance in Settings, including 0 for review-only study. Due reviews are always available and do not consume the new allowance. The daily review goal remains motivational.
- **Capture:** save a quick note, then turn it into a flashcard from the inbox.
- **Data portability:** complete JSON backups with history, daily goal, new-card allowance, and retention target; validated, transactional imports; Anki plain-text and TSV import. Export Anki notes with HTML disabled. The first two fields become question/answer; extra tag fields are ignored. Quoted multiline fields are supported. `.apkg`, media, cloze conversion, and Anki scheduling history are not supported.
- **Offline:** the service worker caches application assets and the bundled curriculum. IndexedDB stores cards, notes, reviews, and the optional sync outbox. Updates ask before reloading.

Keyboard: Space reveals, 1–4 rate, U undoes, E edits. Shortcuts ignore form inputs and key repeats.

## Your data

Progress is local to a browser profile and device. Clearing site storage removes it. Export backups in Settings regularly and keep a copy separately. Importing a backup merges newer data and does not intentionally replace newer local edits. Backups are validated before any write; malformed records roll back the import.

Starter content upgrades automatically and adds only missing cards, with stable IDs and old baseline timestamps so a fresh device does not replace newer synced progress. Rerunning installation does not overwrite edits or resurrect deleted decks. The included starter IDs are shared, so use a **dedicated personal Supabase project** for this build, not a multi-tenant shared service.

## Optional automatic sync

The app is fully usable without a backend. To enable the existing Supabase integration for your own devices:

1. Create your personal Supabase project.
2. Run `supabase/migrations/0001_init.sql`, then `0002_learning_steps.sql`.
3. Enable email magic links and allow your deployed HTTPS URL in Auth's redirect configuration.
4. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the public anon key, never a service-role secret).
5. Rebuild and sign in with the same account on your devices.

Local study is the source of truth; signed-out and offline use remain available. Live remote sync needs your own credentials and has not been verified against a configured backend in this workspace. The existing sync implementation treats remote review logs as immutable: undo is exact locally, but a review already uploaded is not deleted remotely. For reliable backup portability without a backend, use export/import.

## Development and verification

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite starts the production preview automatically and checks mobile and desktop layouts, seeded cards, review/undo/persistence, personal card editing/deletion, offline reload/review, backup download, and text import. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only if using an existing Chromium installation. On PowerShell, use `npm.cmd` when forwarding arguments after `--`.

The app uses React, TypeScript, Vite, Dexie/IndexedDB, ts-fsrs, and an optional Supabase backend. Scheduling is pure logic in `src/srs/`; writes are in `src/db/repos/`; the original core cards are in `src/data/curriculum.ts`. Expanded cards load as a separate asset on installation, then live in IndexedDB. Both the asset and content licenses are precached for offline use.

## Rebuild the included content

The generated JSON is checked in, so normal installs and builds need no content download. To reproduce it:

```sh
python scripts/author-backend-cards.py
python scripts/author-beginner-lessons.py
python scripts/build-curriculum.py
```

The builder downloads only the declared pinned public source revision when its local cache is absent. It does not execute downloaded examples. Generated IDs depend on source identity, not card position. `src/data/content-report.json` records the content totals and source provenance. The `c0000000` and `e0000000` UUID prefixes and final variant digit identify related adapted exercises and beginner cards; preserve these IDs when maintaining the curriculum. Curriculum v3 adds beginner cards without overwriting existing content, schedules, review logs, or intentional deletions.
