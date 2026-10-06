# Recall Upskill Curriculum

This curriculum turns Recall into a training lab for a junior engineer growing toward mid-level and senior work. It teaches this specific codebase, but every module also asks the transferable question: what boundary, invariant, contract, or risk does this code represent?

Recall is a single-app React/Vite/TypeScript PWA for local-first spaced repetition. The browser owns the primary data store through Dexie/IndexedDB (`src/db/schema.ts:80-101`). Repositories are the write boundary (`src/db/repos/cardRepo.ts:7-99`, `src/db/repos/noteRepo.ts:6-67`, `src/db/repos/deckRepo.ts:7-89`). Study scheduling is isolated in pure SRS helpers (`src/srs/scheduler.ts:78-124`, `src/srs/queue.ts:11-37`). Supabase is optional: auth and sync are disabled if env vars are missing (`src/db/sync/supabaseClient.ts:5-19`). The app routes are declared in one place (`src/main.tsx:28-43`), and the PWA service worker/share target live in Vite config (`vite.config.ts:8-58`). Tests cover core SRS, queueing, merge behavior, repositories, and two UI smoke flows (`src/srs/queue.test.ts:42-96`, `src/db/sync/merge.test.ts:31-72`, `src/features/study/StudyScreen.test.tsx:10-32`).

## Anchor Baseline — Read This First

Every `path:line` anchor in this folder is exact at commit **`06c8835`**, the
commit this curriculum was written against. The repo has since shipped two
large commits ("Expand reviewed curriculum and improve offline study
loading" and "Ship curriculum v15: curated library, simplified UI") that
reworked parts of `src/db/sync/`, the study and settings screens, and added
whole new modules the curriculum does not cover yet: the practice feature
(`src/features/practice/`, `src/db/repos/practiceRepo.ts`), the .NET study
screen (`src/features/dotnet/DotnetScreen.tsx`), and the retired-curriculum
machinery (`src/db/retiredCurriculum.ts`, `src/db/retiredRetrieval.ts`,
`src/db/retiredLibrary.ts`).

File names and the layer map are unchanged, so the prose still reads
correctly at HEAD — but line numbers into the files above may have shifted.
To study with exact anchors, check out the baseline beside your working
copy:

```sh
git worktree add ../recall-06c8835 06c8835
```

Reading at HEAD instead, trust the path and the described behaviour over
the line number. When you catch a drifted claim, updating it is a
real contribution — treat it as a standing good-first ticket.

## How To Use This

**One weekend:** read [00-fast-track.md](00-fast-track.md), trace capture and study in [01-codebase-cartography/05-key-flows.md](01-codebase-cartography/05-key-flows.md), do two drills from [04-code-reading-gym/01-annotation-drills.md](04-code-reading-gym/01-annotation-drills.md), then run `npm test`.

**Two weeks:** complete cartography, stack mastery, and quality modules. Ship one ticket from [06-contribution-practice/01-good-first-tickets.md](06-contribution-practice/01-good-first-tickets.md).

**Eight weeks:** alternate feature tickets, review katas, debugging scenarios, and a small design note. Aim to explain a cross-layer change from route to repository to tests.

**Ongoing contribution practice:** keep [08-reference/risk-register.md](08-reference/risk-register.md) open during reviews, use [07-career-and-collaboration/02-writing-prs-and-rfcs.md](07-career-and-collaboration/02-writing-prs-and-rfcs.md) before every PR, and revisit [03-architecture-and-patterns/06-architecture-critique.md](03-architecture-and-patterns/06-architecture-critique.md) when planning larger work.

## Learning Tracks

- **Codebase cartography:** routes, files, domain nouns, and end-to-end flows.
- **Stack mastery:** TypeScript, React, Dexie, Vite/PWA, Supabase, and FSRS mental models.
- **Architecture and patterns:** boundaries, persistence, sync, auth, side effects, and critique.
- **Code-reading gym:** annotation drills, trace tables, fake-code contrasts, review katas.
- **Quality engineering:** tests, debugging, performance, security, and operations.
- **Contribution practice:** beginner tickets, mid-level features, senior projects, and refactor katas.
- **Career and collaboration:** code review, PR/RFC writing, maintainer communication, and interview prep.

## Recommended Paths

| Learner | Start here | Goal |
| --- | --- | --- |
| Brand-new junior | `00-fast-track`, then cartography README | Run app, name layers, trace one flow. |
| Junior with stack familiarity | Stack mastery + good-first tickets | Make small changes using repo patterns. |
| Mid-level new to repo | Key flows + architecture + debugging | Own cross-layer features and tests. |
| Senior reviewer | Architecture critique + risk register + RFC guide | Assess commitments, costs, migration paths. |

## Conventions

- Anchors use `path:line-line` when relative Markdown links would be noisy.
- Fake code is always labeled `Illustrative fake code: not from this repo.`
- Drills ask you to predict, trace, modify, or review. Do the work before reading the rubric.
- Self-grading uses Basic/Solid/Strong so you can diagnose your own gaps.
- Verification notes list inspected files, commands, and uncertainty labels.

## Senior Mindset

A junior asks, "How do I make it work?" A mid-level engineer adds, "Is this the right pattern for this codebase?" A senior asks, "What does this commit us to, who pays the cost, what invariant must stay true, and how do we reduce the blast radius if we are wrong?"

## Verification Notes

- Inspected `package.json`, `README.md`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, key `src/db`, `src/srs`, `src/features`, tests, and `supabase/migrations/0001_init.sql`.
- Ran `rg --files`, `git status --short -- .`, and focused `rg -n` anchor scans.
- Earlier implementation pass verified `npm test` and `npm run build`; this documentation pass does not change product code.
- No root `.github`, `CONTRIBUTING`, `SECURITY`, `LICENSE`, Docker, or devcontainer files were found in repo-owned root files. A broad `.github` scan accidentally traversed `node_modules`; ignore third-party package metadata for this curriculum.
