# Recall curriculum

The current v15 library contains 2,871 cards across 75 decks: 2,799 retained base cards plus 72 authored scenarios, including 552 guided lesson cards across 276 lessons, alongside 48 hands-on engineering missions. Version 15 retires the generated source-derived library added in curriculum versions 12 through 14; [the release notes](RELEASE.md) record what that does to an existing installation. The automatic retrieval layer remains retired as well; [the earlier quality review](CONTENT-REVIEW.md) documents that decision.

## Historical v8 inventory

The following table records the superseded v8 expansion, not current counts. Current per-deck counts are in `src/data/section-expansion-manifest.json`.

| Deck | Track | Base | Related practice | Total |
| --- | --- | ---: | ---: | ---: |
| JavaScript & TypeScript | Frontend | 16 | 41 | 57 |
| React & frontend | Frontend | 16 | 34 | 50 |
| System design | Backend | 16 | 38 | 54 |
| Databases & SQL | Backend | 16 | 36 | 52 |
| APIs & networking | Backend | 16 | 43 | 59 |
| Testing & debugging | Practice | 16 | 34 | 50 |
| Engineering craft | Practice | 16 | 36 | 52 |
| JavaScript · arrays & collections · 1 | Foundations | 87 | 348 | 435 |
| JavaScript · arrays & collections · 2 | Foundations | 99 | 396 | 495 |
| JavaScript · arrays & collections · 3 | Foundations | 68 | 272 | 340 |
| JavaScript · arrays & collections · 4 | Foundations | 67 | 268 | 335 |
| JavaScript · objects & types · 1 | Foundations | 118 | 472 | 590 |
| JavaScript · objects & types · 2 | Foundations | 67 | 268 | 335 |
| JavaScript · strings & regex · 1 | Foundations | 95 | 380 | 475 |
| JavaScript · strings & regex · 2 | Foundations | 67 | 268 | 335 |
| JavaScript · functions & async · 1 | Foundations | 115 | 460 | 575 |
| JavaScript · functions & async · 2 | Foundations | 61 | 244 | 305 |
| JavaScript · numbers & form values · 1 | Foundations | 50 | 200 | 250 |
| JavaScript · numbers & form values · 2 | Foundations | 13 | 52 | 65 |
| JavaScript · dates & time | Foundations | 92 | 368 | 460 |
| Browser APIs & DOM practice · 1 | Frontend | 120 | 480 | 600 |
| Browser APIs & DOM practice · 2 | Frontend | 67 | 268 | 335 |
| JavaScript · language mechanics · 1 | Foundations | 76 | 304 | 380 |
| JavaScript · language mechanics · 2 | Foundations | 102 | 408 | 510 |
| JavaScript · language mechanics · 3 | Foundations | 35 | 140 | 175 |
| Python · practical fluency · 1 | Backend | 114 | 456 | 570 |
| Python · practical fluency · 2 | Backend | 21 | 84 | 105 |
| CSS · layout & interaction · 1 | Frontend | 120 | 480 | 600 |
| CSS · layout & interaction · 2 | Frontend | 26 | 104 | 130 |
| HTML · semantics & browser behavior | Frontend | 33 | 132 | 165 |
| Git · everyday workflows · 1 | Practice | 120 | 480 | 600 |
| Git · everyday workflows · 2 | Practice | 28 | 112 | 140 |
| React · hooks & patterns · 1 | Frontend | 120 | 480 | 600 |
| React · hooks & patterns · 2 | Frontend | 10 | 40 | 50 |
| SQL · production queries | Backend | 16 | 39 | 55 |
| Distributed systems · failure scenarios | Backend | 16 | 37 | 53 |
| API design · contracts & edge cases | Backend | 16 | 42 | 58 |
| Application security · practical defenses | Backend | 16 | 43 | 59 |
| TypeScript · model the invariants | Foundations | 16 | 41 | 57 |
| Testing · meaningful confidence | Practice | 16 | 42 | 58 |
| Observability · diagnose production | Practice | 16 | 41 | 57 |
| Systems · processes & concurrency | Foundations | 16 | 50 | 66 |
| Delivery · containers & safe releases | Practice | 16 | 41 | 57 |
| 01 · Read your first program | Start here | 16 | 64 | 80 |
| 02 · Follow the flow | Start here | 16 | 64 | 80 |
| 03 · Work with collections | Start here | 16 | 64 | 80 |
| 04 · Understand time and failures | Start here | 16 | 64 | 80 |
| 05 · Understand a web page | Start here | 16 | 64 | 80 |
| 06 · React without the mystery | Start here | 16 | 64 | 80 |
| 07 · Databases in plain English | Start here | 16 | 64 | 80 |
| 08 · Git and the terminal | Start here | 16 | 64 | 80 |
| 09 · Build your first CRUD feature | Start here | 16 | 64 | 80 |
| 10 · Build reliable small services | Start here | 16 | 64 | 80 |
| 11 · TypeScript you can read | Keep going | 20 | 80 | 100 |
| 12 · Python step by step | Keep going | 20 | 80 | 100 |
| 13 · Debug without guessing | Keep going | 20 | 80 | 100 |
| 14 · Tests that teach you what broke | Keep going | 20 | 80 | 100 |
| 15 · Build interfaces people can use | Keep going | 20 | 80 | 100 |
| 16 · Read and design an API | Keep going | 20 | 80 | 100 |
| 17 · Reason about your database | Keep going | 20 | 80 | 100 |
| 18 · Security habits for your first app | Keep going | 20 | 80 | 100 |
| 19 · Ship and maintain a small app | Keep going | 20 | 80 | 100 |
| 20 · Fix real CRUD app problems | Keep going | 20 | 80 | 100 |
| 01 · C# from your first line | C# & .NET | 16 | 64 | 80 |
| 02 · Model your web app in C# | C# & .NET | 16 | 64 | 80 |
| 03 · Collections and LINQ for web data | C# & .NET | 16 | 64 | 80 |
| 04 · Async C# without the confusion | C# & .NET | 16 | 64 | 80 |
| 05 · Build ASP.NET Core endpoints | C# & .NET | 16 | 64 | 80 |
| 06 · Services, middleware, and configuration | C# & .NET | 16 | 64 | 80 |
| 07 · Persist data with EF Core | C# & .NET | 16 | 64 | 80 |
| 08 · Validation and web security | C# & .NET | 16 | 64 | 80 |
| 09 · Choose and build a .NET web UI | C# & .NET | 16 | 64 | 80 |
| 10 · Test and debug .NET web apps | C# & .NET | 16 | 64 | 80 |
| 11 · Run a reliable .NET service | C# & .NET | 16 | 64 | 80 |
| 12 · Build a real notes app, one decision at a time | C# & .NET | 16 | 64 | 80 |

808 cards are original Recall material. 1,991 cards are adapted from 30 seconds of code under CC BY 4.0: 1,211 explanation prompts and 780 code-completion prompts. See the bundled [credits](../public/content-credits.html) and [license](../public/licenses/30-seconds.txt).

The base Start here path teaches 80 ideas, and Keep going teaches 100 further ideas, through 360 paired understanding and application cards. The follow-on decks cover TypeScript, Python, debugging, testing, accessible interfaces, HTTP APIs, SQL reasoning, security, delivery, and real CRUD app problems. Each card has five explanations with plain English, a worked example, an analogy, a common mistake, and a practice prompt whose solution is hidden until requested. Older answers keep their full content and receive related supporting lessons when applicable. Browsing explanations does not change the spaced-repetition schedule.

The default schedule introduces 10 new cards per local day across all decks, with due reviews first. Related introductions revisit the same idea after 1, then 3, then 7 local calendar days. Eligible familiar ideas take priority within a deck. Due reviews and learning retries are not delayed by this introduction spacing. FSRS retention defaults to 90%, configurable in Settings.

The authored C# & .NET path contains 96 lessons and 192 paired cards. Together with the earlier authored paths, the retained guided set contains 276 lessons and 552 cards. The dedicated `/dotnet` page groups its decks into C# fundamentals, web backend development, and completing a working app. Focused sessions keep due reviews first and introduce new cards in deck order while sharing the existing global daily allowance. The authored path uses .NET 10 as its baseline, with official Microsoft Learn links for further reading. Source references retain their documented platform context.

Curriculum version 6 removes 434 bundled DSA, puzzle, and unrelated math cards and replaces the guided algorithm material with 38 CRUD cards. The new decks are **09 · Build your first CRUD feature** and **20 · Fix real CRUD app problems**; an early-return lesson also replaces the recursion exercise. The C# & .NET path remains available at `/dotnet`.

The upgrade uses a permanent list of retired built-in IDs. It preserves retained content and scheduling, user-created cards, existing deletions, and review history. Retired cards become tombstones so they stop appearing in study and library views; they remain in backups with their history. Empty retired decks are hidden. If a retired deck contains personal cards, those cards remain visible. Default names for the numbers decks are updated without overwriting custom names. Older backup imports and cloud pulls apply the same retirement rules.

Source filtering happens after assigning the original deck part boundaries. Native arrays, objects, maps, sets, built-in sorting, SQL indexes, job queues, and practical debugging remain because they support ordinary web development. Algorithm implementations, LeetCode problems, graph traversal puzzles, dynamic programming, and unrelated math exercises are excluded. The checked-in source policy and regression checks prevent their return during a content rebuild.

## Historical retrieval variation provenance

Each generated answer is extracted from its own existing lesson. Code restoration keeps the full surrounding example; output questions use results explicitly documented by the source; explanation prompts hide a bounded concept or phrase. All cards retain the existing no-puzzles scope and source credits. The family index connects variations to original cards without changing the database schema, so backup and sync retain the relationship through stable IDs.
