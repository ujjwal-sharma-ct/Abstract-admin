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

## 2026-09-26 — Slice 1 screens: kernel system, shared kit, "slice 1 mode" instead of stripping

**Context:** The slice 1 design brief (`Abstract-VMS-plan/docs/slices/1/design/DESIGN-BRIEF.md`)
asks for missing slice 1 screens and for corrections that remove later-slice content (KPI
dashboards, business units/branches, org-level overrides). This repo shows the *whole* product,
so deleting that content would lose the later slices' design.

**Decision:**
1. New slice 1 screens follow the kernel design system (`docs/kernel/design-tokens.md` §9): Inter,
   gradient sidebar, `bg-slate-100`, kernel badge buckets — in every portal, even where older
   screens still carry Sora/Manrope.
2. Shared prototype behaviour lives in `slice1-kit.js` (namespaced `S1`): state switcher for the
   six required states, Toast, ConfirmDialog, notification Drawer with unread count, background-job
   chip, session-timeout warning, signed-out banner. Only its top `S1_CONFIG` block differs per portal.
3. **Slice 1 mode** (Prototype menu, the Slice 1 Index page, or `?s1=1`) hides nav links that are
   not slice 1 screens and every element marked `data-s1-later`, and points Dashboard / `data-s1-home`
   links at the slice 1 placeholder dashboard. Later-slice content is tagged, not deleted. Only
   content wrong for the whole MVP was removed (data-access audit tiles, keep-me-signed-in, SSO,
   invite-with-roles, non-kernel status words).
4. `scripts/check-flow.mjs` treats the activation-email landing and the Slice 1 Index as entry
   points (they are reached from an email and as the demo start, not by a link).

**Consequences:** The full-product flow is unchanged; the slice 1 demo is one toggle away. Older
agency/client screens look different from the new kernel-styled ones until they are rebuilt.
