# Decisions Log

Append-only. Newest at the bottom. Records the *why* behind design/flow choices so a future
session doesn't relitigate them.

---

## 2026-07-31 — This repo optimizes for flow + continuity, not code quality

**Context:** These are directly-openable HTML mockups whose only job is to demonstrate the app's
UI/UX flow. Linting, formatting, and framework conventions add friction with no payoff here.

**Decision:** The AI kit tracks exactly two things — **flow integrity** (`scripts/check-flow.mjs`
regenerates `FLOWS.md` and flags dead links/orphans) and **continuity** (`PROGRESS.md` +
`DECISIONS.md`, updated by habit when screens change). No package.json, no prettier, no test
harness, no git hooks. Visual consistency is *guided* by the skills + `../DESIGN-SPEC-v4.md`, not
hard-gated.

**Consequences:** Fast to iterate; the flow map stays honest; nothing to install or run at commit time.
