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

## 2026-10-10 — Slice 2 screens: one generator-made shell, embedded framing for the wizard steps, slice 2 mode

**Context:** The slice 2 brief asks for ten corrected exports and eight new screens in the slice 1 shell, each wizard step being the slice 2 page for that record (TSD §3.3.8), with states behind the Prototype menu at 1024 px and 375 px.

**Decision:** (1) Every slice 2 page is built from one shell and one sample-data set, so the pages read as one product and the data agrees across them. (2) The wizards frame the other pages in an iframe with `?embedded=1`; the kit hides the framed page's shell and relays step events. One component, two framings, as the TSD seam demands. (3) The kit gains a third navigation mode, slices 1 + 2, instead of stripping later-slice links from pages. (4) Rate segregation is enforced in the markup: a client or agency page embeds only its own organisation's data, and the agency pages carry no margin figure or sentence.

**Consequences:** The wizards need the framed pages present (they are); a page's states are also its step's states; party pages cannot leak Abstract-only data because the data is not in them.

## 2026-10-11 — Two-step verification: one page for set-up and backup codes, three steps, no self-service way off

**Context:** Slice 1 brief A9–A12 left the arrangement of the enrolment steps, the handling of backup codes and the recovery wording to the designer. The contract (TSD §3.1.13) fixes the rest: TOTP only, ten backup codes shown once, no trusted devices, no switching off, a reset that only Abstract can perform.

**Decision:** (1) `/{portal}/account/two-factor` is one page in the shell, not a dialog: off, set-up and on are states of the same page, so the required-by-policy landing and the My account link arrive at the same place. (2) Set-up is three steps, not the brief's four: scanning the code and confirming it share a screen, because the person looks from phone to screen once and the key for manual entry sits beside the field it feeds. (3) Backup codes are never listed again; the page offers only *Create new codes*, behind the password and a warning that the old set stops working. Copy, download and print are all offered. (4) When the policy requires it and the person has not set it up, the shell keeps its frame but offers no navigation, since every other route returns here. (5) The sign-in step is a single field with a link to switch to a backup code; a page for the ended step (`AUTH_TWO_FACTOR_CHALLENGE_EXPIRED`) was added from the error registry, though the brief does not list it. (6) On Users, two-step status is a second line under the status badge, not a column, so the table still fits at 1024 px; client and agency lists show the status and no action. (7) User-facing copy says *two-step verification*, following the TSD's quoted strings.

**Consequences:** A person who changes phone must ask Abstract for a reset, and the page says so before they turn it on. The QR codes are static SVG for a demo secret, so the pages need no extra library. The prototype remembers "on" per browser, which makes the TV-13 walk (set up, sign out, sign in with a code) demonstrable end to end.

## 2026-10-11 — Two-step reset: the organisation's own administrators first, never your own, two confirmations

**Context:** The screens delivered for slice 1 brief A12 gave the reset to Abstract alone, as the TSD then said. On 2026-10-11 Ujjwal Sharma ruled the four points those screens left open (slice 1 TSD R-39).

**Decision:** (1) A holder of *Reset two-step verification* resets a user of their own organisation; Abstract resets from the administering context when nobody there can. The action is on all three Users pages. (2) It is never on the signed-in person's own row: a reset always takes a second person, so it cannot become a way of switching two-step verification off for yourself. (3) The confirmation says what follows by the organisation's policy: set up again at next sign-in where it is required, off until turned on where it is not. The prototype shows one organisation of each kind. (4) The recovery copy sends a person to an administrator at their own organisation, who asks Abstract if they cannot. (5) No enrolment date and no count of unused backup codes is shown.

**Consequences:** A sole administrator who is locked out, or who changes phone, needs Abstract. The earlier decision entry of the same date ("no self-service way off") stands; its sentence that a person who changes phone must ask Abstract now reads "an administrator at their organisation, or Abstract".
