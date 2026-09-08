# Recall — Engineering practice, in your pocket

A local-first spaced-repetition web app with **21,102 practical web development flashcards across 75 decks** and 48 hands-on engineering missions. The card library includes 72 authored debugging scenarios and 828 guided lessons. No API key or account is required. The library focuses on forms, APIs, SQL, authentication, validation, testing, and shipping CRUD apps. LeetCode and DSA exercises are excluded.

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

1. Publish `dist/` to an HTTPS static host. Netlify and Vercel configuration is included. Run `python scripts/package-release.py` after building to create the portable `release/recall-web.zip` archive and its SHA-256 checksum.
2. Open the hosted URL on your phone while online and let the app finish loading once.
3. **iPhone:** Safari → Share → Add to Home Screen. **Android:** Chrome → menu → Install app / Add to Home screen.
4. Pick a 2-, 5-, or 10-minute session. Think of the answer, reveal it, and rate your recall. You can stop at any time; each rating is saved immediately.
5. Reopen and review even without a connection. Offline behavior is tested against the production build, including rating and reloading.

The development server also prints your local network address for testing on the same Wi-Fi. A LAN HTTP address is for previewing: reliable PWA installation and service workers require **HTTPS** outside localhost. A localhost URL will not work on your phone when you are away from this computer. Publishing is a separate step; the project does not automatically upload your code or study data.

## Included toolkit

The library is **about 22× the original 128-card version**:

- **808 original cards:** core SWE foundations, realistic engineering scenarios, 160 beginner cards, 200 follow-on cards, and 192 C#/.NET cards.
- **Start here:** ten numbered beginner decks covering your first program, control flow, collections, async and debugging, web pages, React, databases, Git, CRUD features, and reliable services.
- **Keep going:** ten more guided decks covering TypeScript, Python, debugging, testing, accessible interfaces, HTTP APIs, SQL reasoning, security, delivery, and real CRUD app problems. Find them from the home page or [open the collection locally](http://localhost:4173/decks?track=Keep+going). Track filters persist in the URL for bookmarks.
- **1,991 adapted cards:** 1,211 explanation exercises and 780 code-completion exercises from the CC BY 4.0 licensed _30 seconds of code_ collection. Topics include JavaScript, Python, Git, CSS, HTML, and React.
- **C# & .NET web development:** a [dedicated learning area](http://localhost:4173/dotnet) with 12 ordered decks and 96 lessons, built around .NET 10. Learn C#, object modeling, LINQ, async, ASP.NET Core endpoints, dependency injection, EF Core, security, MVC/Razor Pages/Blazor, testing, deployment, and a notes-app capstone. Its 2-, 5-, and 10-minute sessions contain only .NET cards, with due reviews first and new cards in deck order. Daily limits still apply across the whole library. Editing, undo, suspension, and offline reload preserve the session's subject.
- Searchable topic decks, 30-at-a-time card browsing, and editable Markdown/code answers. Related new exercises are separated until another day.

Revealing an answer opens an explanation reader. **Next explanation**, Previous, and the explanation picker let you try another teaching approach without recording a review. All 552 guided cards have five views: plain English, a worked example, an analogy, a common mistake, and a practice prompt with a separate **Check my answer** button. Rate the card based on what you remembered before revealing it.

Existing installations receive the CRUD curriculum automatically on the next app load after updating. Version 6 removes retired bundled puzzle cards, adds the new practical lessons, and preserves personal content and progress on retained cards.

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

## Hands-on engineering practice

Open **Engineering practice** from the sidebar, Home, or Progress. The 48 missions cover feature delivery, reliability, and production ownership, with search and stage filters. New assignments include accessible dialogs, recoverable uploads, time-zone handling, conflicting edits, query plans, bounded retries, backup restoration, and measured loading improvements.

Each mission contains a concrete assignment, three acceptance checks, review guidance, and a stretch challenge. Use Recall or your own small app as the practice project. The 15-, 30-, and 60-minute session plans combine recall, implementation, and reflection; larger missions can span multiple sessions.

The evidence journal saves as you type. Record what changed, how you verified it, and the tradeoff or next step, then complete the mission after checking every criterion. Completed entries can be reopened. Mission completion is self-reviewed evidence, separate from flashcard ratings and job-level certification.

Practice entries work offline and travel in the normal JSON backup. Older backups without a journal still import, and older journal entries do not replace newer local edits. Automatic Supabase sync does not include the journal. **Export evidence** downloads a Markdown work-sample report; use the full JSON backup for restoration.

Related deck searches persist in the URL, including after reload.

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
python scripts/author-practical-lessons.py
python scripts/author-dotnet-lessons.py
python scripts/build-curriculum.py
```

The builder downloads only the declared pinned public source revision when its local cache is absent. It does not execute downloaded examples. Generated IDs depend on source identity, not card position. `src/data/content-report.json` records the content totals and source provenance. The `c0000000` and `e0000000` UUID prefixes and final variant digit identify related adapted exercises and guided cards; preserve these IDs when maintaining the curriculum. Curriculum v6 removes 434 bundled algorithm/puzzle cards and adds 38 guided CRUD cards. Retained card identities, deck membership, edits, and review schedules stay unchanged. Explicit retirement IDs also apply to older backups and cloud pulls; personal cards remain visible. The builder filters after assigning the original deck boundaries, so repeated builds cannot move retained cards between decks. `scripts/crud-content-policy.json` records the source exclusions.

### Current expansion (v13)

Version 13 adds **14,068 distinct source-backed cards**, including **552 three-part guided lessons**, and **32 original engineering missions**. Overall cards, guided lessons, and missions are each three times their v12 totals; individual deck growth varies with topic coverage. New content ships in 62 lazy-loaded packs below 600 KB each. Existing card identities and saved progress remain intact.

The review removes site templates, navigation-only fragments, incomplete includes, and off-topic administration material. It normalizes documentation links, preserves code, and keeps source credits visible across explanation pages. Structural checks cover the full library; semantic review is sampled, not a claim that every imported example has been executed. See [the comprehensive expansion review](docs/COMPREHENSIVE-EXPANSION.md).

`npm run content:expand-all` rebuilds this selection from the pinned local archives and source cache. Normal app builds use the generated packs without downloading documentation. Run `npm run content:check` and `npm run content:runtime` after content changes.

### Earlier expansion (v12)

Version 12 includes 4,163 source-backed additions to the retained v10 library: **2.45 times the previous content**. Pinned material from MDN, Microsoft, React, GitHub, and freeCodeCamp is selected for topic fit and self-contained context, with attribution and license texts available offline. The 22 new chunks are each kept below 600 KB. Existing card identities and saved progress remain intact. The final version marker also applies corrected TypeScript wording to installations that loaded the v11 draft.

`npm run content:build` rebuilds the inventory using the checked-in packs. `npm run content:expand` refreshes selection from the pinned candidate cache under `artifacts`; it requires the existing source cache and `scripts/build-section-expansion.py` candidate output. Run `npm run content:check` and `npm run content:runtime` after any content changes. See [the expansion review](docs/LIBRARY-EXPANSION.md) for scope and limitations.

### Reviewed scenarios (v10)

Version 10 replaces the automatically multiplied retrieval layer with 72 authored scenarios and corrects older examples. Each scenario asks a concrete question and includes an answer, reasoning, and a verification task. The 10,810 old variations remain in the repository for audit but are not bundled. Existing untouched copies become tombstones; exact content fingerprints preserve personal rewrites, and review history remains intact. See [the quality review](docs/CONTENT-REVIEW.md).

Related introductions are separated by 1, then 3, then 7 local calendar days. Eligible follow-ups take priority within a deck; only one new prompt per family appears in a session queue. Daily allowances still apply. FSRS due reviews and short learning retries remain available. Your original cards, edits, tombstones, and schedules retain their identities. JSON backups up to 100 MB can be restored (text imports remain limited to 20 MB).

Rebuild and validate the scenarios from the checked-in authored source:

```sh
npm run content:build
npm run content:check
```

The manifest and listed scenario pack ship together. The legacy family index remains for existing review history and personally edited old cards. No network access or execution of lesson examples is needed for these commands.
