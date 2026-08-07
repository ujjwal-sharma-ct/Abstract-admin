# VMS Admin Portal — UX-Flow Mockups

Static HTML mockups demonstrating the internal **Admin portal** screens and workflows for the VMS.
Each `.html` opens directly in a browser (Tailwind CDN + Font Awesome + Plotly, all inline).
This is a **design/flow deliverable, not an app** — no build, no dependencies.

## Quick start

- Open `index.html` in a browser to walk the flow, or open any screen directly.
- See the whole journey at a glance in **[`FLOWS.md`](FLOWS.md)**.
- Regenerate the flow map any time (Node only — nothing to install):
  ```bash
  node scripts/check-flow.mjs
  ```

## Working here with AI

Lightweight AI kit tuned for **flow + continuity**, not code quality:

- **[`docs/UX_FLOW.md`](docs/UX_FLOW.md)** — how to add/change screens and keep the flow coherent.
- `CLAUDE.md` / `AGENTS.md` — the rules the AI follows here.
- `.claude/` — skills, commands (`/new-screen`, `/design-review`), and a `design-reviewer` agent.
- `PROGRESS.md` / `DECISIONS.md` — keep current so the next session has context.
- Visual reference: `../DESIGN-SPEC-v4.md` (shared across all three portals).
