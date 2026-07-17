# 01 Codebase Cartography

Cartography answers: what exists, who owns what, and where a change should land.

Read in order:

1. [01-system-map.md](01-system-map.md)
2. [02-file-reading-order.md](02-file-reading-order.md)
3. [03-domain-glossary.md](03-domain-glossary.md)
4. [04-runtime-and-tooling-map.md](04-runtime-and-tooling-map.md)
5. [05-key-flows.md](05-key-flows.md)

Drill: before opening a feature file, predict which repository it should call. Then verify using `rg -n "import .*Repo|from '../../db/repos" src/features`.

Verification notes: repository inventory came from `rg --files`; route and layer anchors came from focused `rg -n` scans over `src/main.tsx`, `src/features`, `src/db`, and `src/srs`.
