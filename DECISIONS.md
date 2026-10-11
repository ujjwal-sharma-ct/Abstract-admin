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

## 2026-10-11 — User detail: the row's actions on a page of their own; Forgot password shows its confirmation

**Context:** The slice 1 TSD has the route `/{portal}/settings/users/:id` and a *User detail* UI-state row (§3.3.11, §5.9), and no portal had the page; Ujjwal Sharma ruled on 2026-10-11 to draw it. The same day's batch added the reset-request page where it was missing (TSD §5.8, 1.8 TV-3).

**Decision:** (1) The detail page is the Users page's shell, dialogs and action code with the list swapped for one person, so its actions are the row's actions by construction: same labels, same order, same confirmations, same last-administrator refusal. They sit in one *Actions* card, beside the record on a wide screen and directly under the name on a phone. (2) Two-step status is a card of its own that says on, off or not set up, and what a reset leads to under the organisation's policy; no enrolment date and no count of backup codes (R-39). On your own record there is no reset, and the card says why. (3) Out of scope is a 404 inside the shell whose copy never says whether the person exists. (4) Slice 2's parts (Scope, *Set scope*, *Change email*, a pending email change) are marked `data-s1-later` or left out by the action list in *Slice 1 only*. (5) The row's name is the link; generated rows in the *Large data* state and a person invited a moment ago are plain text, because the prototype has no record for them. (6) Forgot password stops on its confirmation, which is the state TV-3 tests, and offers the emailed-link hop as a marked *Prototype only* link instead of walking it after a second. (7) Inside the administering context the page keeps the banner and `?org=`, and hides the slice 2 *Profile* and *Structure* tabs in *Slice 1 only*.

**Consequences:** A change to a row action must be made on both pages. An `Invited` user has no email correction on the detail page because the row has none; the TSD lists one for both (open point in `PROGRESS.md`).

## 2026-10-11 — The shell names the organisation, never a role title

**Context:** 26 older pages showed *Abstract Admin* under the signed-in person's name in the sidebar and 15 newer pages showed *Abstract*; the brief forbids role titles in copy, because roles are editable records.

**Decision:** Every place that described Sarah Mitchell by a role title now gives her organisation, *Abstract*: the sidebar footer, the header chip, and three in-page lines (ruled "everywhere", Ujjwal Sharma, 2026-10-11). The same rule changed two labels to *Two-step verification required*; the setting key `security.two_factor_required` keeps its name, as keys are not copy.

**Consequences:** The Audit Log's actor column now reads *Abstract* for her row, as it already did for another. `DESIGN-SYSTEM.html` keeps its title, which names the portal, not a role.

## 2026-10-11 — One set of role names, one signed-in person, and slice 2 parts that follow the mode

**Context:** Checking the day's first batch showed five things that were already wrong: slice 2 parts visible in *Slice 1 only*, role names that differed between Users and the matrix, permission counts that differed between portals, older pages signed in as a different person described by a role title, and no email correction for an `Invited` user although the TSD lists one. Ujjwal Sharma ruled each on 2026-10-11.

**Decision:** (1) Sample roles carry the TSD's seed names (§3.3.4) plus one custom role per party, with one set of ids across Users, User detail and the matrix. (2) Abstract's view of a party's roles and keys is a copy of that party's own matrix; no matrix was redrawn onto the TSD's key list. (3) Every page of this portal shows the Abstract user as signed in, the two pages that showed an agency user included. (4) A static slice 2 part carries `data-s1-later`; a part drawn by script asks the mode when it draws and is redrawn on the kit's `s1:mode` event, because the kit hides marked elements only at the moment the mode is applied. (5) *Correct email* is its own action and dialog for an `Invited` user, separate from slice 2's *Change email* for an `Active` user: a correction takes effect at once and sends a new activation link, a change waits for the person to confirm it. (6) A part that exists only inside the administering context is hidden again after every mode change, since the kit's slice mark would otherwise show it outside the context.

**Consequences:** The prototype's key lists still differ from the TSD's twelve slice 1 keys per party; that is a contract gap for a later pass, recorded in `PROGRESS.md`.
