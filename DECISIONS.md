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

## 2026-11-08 — Slice 4: Payroll in the sidebar, Pending pricing as a tab, one grid in two portals (pending Ujjwal's review)

**Context:** Slice 4 TSD §3.3.11 adds *Payroll* (behind `pay_statement:view`) to the FINANCE group and makes
*Pending pricing* a tab of *Timesheets* with its count. The rulings of 2026-11-08 make bulk fills preview-then-confirm.

**Decision:** *Payroll* sits after *Timesheets* (icon `fa-money-check-dollar`) on every Abstract sidebar. *Timesheets*
carries three tabs: the oversight list, *Week grid* and *Pending pricing (n)*. The week grid, the day dialog, the fill
preview and the booking-week are one implementation in `slice4-proto.js`, rendered by both portals, as slice 3 did for
the vacancy form. Taken on the recommended option while Ujjwal was away; logged in `../SLICE-4-DECISIONS-FOR-REVIEW.md`.

**Consequences:** The design spec's §5 owes an amendment for *Payroll*. A change to the grid is made once, in the
`slice4-proto.js` source, and both portals' copies are regenerated.

## 2026-11-08 — Slice 4: a future Holiday, and the slice 4 rows on earlier pages (ruled by Ujjwal Sharma)

**Context:** The overnight pass left three questions. Ujjwal ruled them on the morning of 2026-11-08.

**Decision:** (1) A covered day keeps the place's required checks. (2) *Fill week* leaves a future day blank. (3) A
future day may be `Not Booked` or `Holiday`; `Worked`, `Sick Leave` and `No-show` wait until the day — a departure
from TSD Q4 ("no `Worked` or absence day after today"). (4) The slice 4 changes to earlier pages are drawn: the
permission matrix rows (§3.3.6), the timesheet templates (§3.1.6, Abstract) and the preference rows, with
`timesheet.pricing_pending` critical, ticked and locked. Drawn by script, they ask the mode and redraw on `s1:mode`
(as 2026-10-11 item 4), so slices 1 to 3 read as delivered.

**Consequences:** The TSD owes the future-Holiday change (§1, §3.3.1 rule 3, the `TIMESHEET_DAY_IN_FUTURE` row, 4.1
TV-4). The rule lives once, in `FUTURE_OK` in the `slice4-proto.js` source.

## 2026-11-08 — Slice 4: the design review's screen fixes (R1)

**Context:** A fresh-context review of the slice 4 pass (project-docs `review/slices/SLICE-4-DESIGN-REVIEW-R1-RECORD.md`)
found two blockers and several should-fix screen findings. Ujjwal Sharma ruled (D4) that the pass fixes the screens in
its own PR, and ruled D2 (the pricing notice is two event types) and D3 (a first-week copy is `skipped`).

**Decision:** The fixes follow the ruled TSD at `aa6861b`: the Security tab drops the admin IP allow-list from slice 4
mode on; *Copy previous week* copies `Worked` days only and skips a booking's first week; the pricing notice is two
templates, `timesheet.pricing_pending` (Abstract) and `timesheet.pricing_pending_client` (the client), each party's
locked preference row its own; notification severity is a dot and icon, never a badge (design-tokens §5); the
Abstract grid gains *Reopen* and *Price by hand*; pages without the breakdown grant leave worker pay out of the markup;
the missing six-state cases are drawn. Two states on read-mostly pages were given a meaning: Payroll's *validation* is a
week range (the API's `from` / `to`), the pay statement's is a malformed link. The bulk confirm compares a preview token
(a digest of the week's `updatedAt` and the days it would write), as the TSD's token does.

**Consequences:** The delivery notes' *Design review R1 — the screen fixes* lists each finding and what changed. The
client copy of `slice4-proto.js` reads whether Abstract bears a paid day off (so it charges 0.00) without carrying a
cost-bearer field.

## 2026-11-08 — Slice 4: the screen fixes' own decisions, ruled (Ujjwal Sharma)

**Context:** The R1 screen fixes took five small decisions. Ujjwal Sharma ruled them on 2026-11-08 (spec side on
`tsd/slice-4` at `4cf0e90`).

**Decision:** Approved as drawn: Payroll's *From week* / *To week* validation; the pay statement's malformed link; the
hidden allow-list key's page answering "We couldn't find that setting"; the client's pricing notice. Changed: a
first-week *Copy previous week* reads *Skipped*, keyed on the API's `skipReason: "no_previous_week"` (present only on
that result), never on the page re-deriving the first-week rule; any other skipped row still reads *Kept*, so the fill
outcomes are *Filled* / *Kept* / *Skipped* / *Refused*. Abstract's notice (`timesheet.pricing_pending`) is titled "No
rate for a worked day: week held until priced" in-app, and its email subject is "No rate for {{candidateName}}'s
{{date}} at {{clientName}}: set a price to release the week"; the bodies are unchanged. The manual-price action reads
*Set a price* everywhere: the grid's *Set a price for <day>…*, the queue's *Set a price*, the dialog's *Set a price for
<day>*.

**Consequences:** The TSD's prose "priced by hand" stays; it is not screen copy. The permission's own label
(*Price days by hand*) and the *priced by hand* source note on a day are unchanged.

## 2026-11-12 — The original look comes back; design passes restyle, never redraw (ruled by Ujjwal Sharma)

**Context:** The slice 3 pass (2026-11-01; admin `97fa751`, client `dc335d1`) and the slice 4 pass (2026-11-08; admin
`1c629d9`, client `d88a0b6`) rewrote twelve screens from scratch instead of building on them — admin Booking Detail,
Vacancy List, Vacancy Detail, Create Vacancy, Fill Position, Worker Pool, Worker Profile and Timesheets; client
Bookings, Vacancies, Vacancy Detail and Timesheets — each losing 400 to 1,400 lines. Their look went with them: the
time-of-day shift backgrounds on the timesheet grids, the dark grid header, Booking Detail's placement-terms card and
margin composition bar, and more. The briefs' "build from the kernel" and "absent, not disabled" were read as licence to
redraw; design-tokens §6 draws a `Worked` day as a white cell while DESIGN-SPEC-v4 §6.5 says a role-changed cell "keeps
its shift background", and the conflict was not raised. It broke this log's 2026-09-26 rule (later-slice content is
tagged, not deleted), was not in either pass's decisions for review, and reached `main` (PRs #1–#3). The agency portal,
untouched by both passes, kept the original look.

**Decision:** (1) The original look goes back onto the rebuilt screens and every behaviour slices 3 and 4 added stays.
(2) All twelve screens, timesheets first. (3) The kernel's day-cell rule is amended so a `Worked` day takes its Shift's
time-of-day background (morning sky, afternoon sun, night sky with a moon); the amendment is drafted in project-docs for
approval. (4) `AGENTS.md` gains *Keep the existing look*: a pass restyles and never redraws, hides later-slice parts
instead of deleting them, and lists any big removal with before/after screenshots for approval.

**Consequences:** `slice4-proto.js` (both copies) draws a `Worked` cell in its Shift's look, keyed on the Shift's start
time (05:00–11:59 morning, 12:00–17:59 afternoon, otherwise night), adds the three Shifts to the legend and restores the
dark *Weekly day-status grid* header on the week grid and the booking-week. A cell pending manual pricing, or flagged in
error, keeps its kernel treatment. The pre-pass originals are the reference for the remaining screens: `35e14e7` (admin)
and `dc335d1^` (client) for the slice 3 pages, `97fa751` / `dc335d1` for the timesheets.

## 2026-11-13 — Four rulings from the design audit (Ujjwal Sharma)

Context: after the original look came back, an audit checked every design page against the slice 1–4 briefs, TSDs and rulings records. Four items had sources that disagreed and went to Ujjwal.

1. **"How this vacancy is worked" (client).** Clients never see this note. It is removed from the client portal, overriding slice 3 brief C9.
2. **"Released to Agencies" in the client vacancy status filter.** Hidden until agency release exists: `later(4)`, absent in every slice mode.
3. **Admin IP allow-list on System settings (SYS-010, TSD 1 TV-12).** Hidden on every screen, the full-product view included, until it is enforced (confirmed by Ujjwal in the project-docs session, 2026-11-13). The markup stays in `abstract.configuration.system-settings.html` with `hidden`.
4. **Client timesheet filters.** Week and status only, as TSD 4 §3.3.11 says. No compliance filter for clients, setting aside the overnight decision that allowed one.

## 2026-11-13 — Rulings from the design audit, second batch (Ujjwal Sharma)

Context: the second fix round (helpers working from the brief-side audit and the project-docs session's built-side gap list) left items where the design, the TSD and the build disagreed.

1. **Abstract's override reason on client screens.** The client sees the *overridden* marker only, never the reason text (TSD 4 contract). The reason stays on Abstract's screens. Client `slice4-proto.js`: the cell tooltip reads "Overridden by Abstract"; the day dialog names who overrode, not why.
2. **Pay statement markers *priced by hand* and *covered*.** Full-product view only; not in any slice 1–4 contract.
3. **Client vacancy list layout.** Keeps the restored original layout (View/Edit per row, job role under the reference). The frontend takes it in the restyle after slice 4.
4. **Client publish confirm.** Client wording in the design; the built client form's Abstract wording ("…worker pool or by a manual fill") is a frontend fix.
5. **Label "Margin"**, not "Gross margin", on vacancy and booking pages (built glossary term; ruled in the project-docs session).
6. **Backup codes.** *Copy codes* and *I've saved these* only, as built; Download and Print are dropped on all three portals' two-step pages (ruled in the project-docs session).
7. **K57 approved** (ruled in the project-docs session): a Worked cell takes its Shift's time-of-day look. The compliance icon on the morning and afternoon looks is amber-700, not amber-600, because amber-600 is below 3:1 on those backgrounds.
8. **Sample roles (R-36), DR-S12.** The sample keeps Abstract Operations *without* `user:create_edit`, one grant short of the R-36 seed, so the last-administrator refusal stays demonstrable: with a second role able to manage users, "you can't remove the last administrator" could never be reached. The built seed follows R-36; this is a deliberate prototype difference.
9. **User erasure "retention obligation" refusal, DR-S13.** Full-product view only. No slice mode shows it: the product has no such refusal for a user, only a candidate's legal hold (`abstract.identity-access.data-subject-requests.html`).

The project-docs session records these as DR-S11 to DR-S13 in `delivery/design-restore/PLAN.md` §2.

## 2026-11-15 — Slice 5 design pass, Abstract (taken on the recommended option; for Ujjwal Sharma's review)

Context: the slice 5 pass drew Part A of the slice 5 design brief. The pass ran unattended; each call below took the
recommended option and is listed in the pass report for review.

1. **Slice 5 mode.** The kit's sixth mode. `data-s4-later` changes meaning: it now marks a slice 5 part (shown in s5 and
   the full product); `data-s5-later` is the new full-product-only marker. Every earlier `data-s4-later`/`later(4)` that
   is not a slice 5 part was retagged to 5, so slice 4 mode and the pages outside slice 5 read in s5 as in s4.
2. **One shared prototype script, built per portal.** `scripts/slice5-proto.src.js` with `//#if <portal>` fences; each copy
   seeds only what its party may hold, and the store is their union (a record a write removed is not re-seeded).
3. **ProposalStatusBadge.** `Rejected (Position Filled)` takes closed/archival with `fa-user-check` (a system outcome, not
   a judgement on the candidate); `Requested (awaiting agency)` waiting with `fa-hourglass-half`; `Justified` good
   terminal. Flagged for K59.
4. **Proposal Review keeps its export.** The script draws the proposal of `?id=` in the page's look (context bar, KPI
   strip, candidate card with its gradient header, the dark vacancy summary, Accept & Assign, Agency Submissions, Activity
   Log) over the earlier static comparison, which stays in the file. Scorecard, competency match, internal notes, export,
   send-to-client, average rate and quick actions are `later(5)`; the side-by-side comparison is `later(5)`, drawn from
   the vacancy's other proposals.
5. **Vacancy Detail's KPI strip stays full-product only** (slice 3: one rate line in the slice modes); its Proposals tile is
   live. In s5 the count is on the Proposals card.
6. **Summit Staffing Solutions** is approved for Acme from 1 Sep 2026 while In Setup, in slice5-proto's seed only, for the
   drawer's *Not active* row. The slice 2 page does not carry the link.
7. **An agency's candidate on Abstract's worker profile is read only** (Abstract reads both owners; no write is specified).
8. **One booking-week counts as invoiced** (BK-2210, week of 28 Sep), a stand-in for slice 6's invoiced periods.

## 2026-11-16 — Slice 5 release drawer's rate row; no requirement IDs in copy (ruled by Ujjwal Sharma)

1. **The release drawer's rate row reads *Agencies see the pay rate only · £x/hr*** (no figure when no rate card is in
   force), with no *Locked* pill. *Locked* could be read as the figure being frozen at release; the figure is the rate
   card's and can change. Replaces *Rate shown to agencies / Pay Rate only · £x/hr / Locked* (DESIGN-SPEC §5.2's
   locked indicator: still read only, still never a control).
2. **No requirement ID in the copy a user reads.** Users have no use for them. Dropped from the slice 5 copy: the
   drawer's helper (XR-010), *All positions filled — release is not available* (VC-018, page and slice5-proto refusal),
   Proposal Review's accept dialog (PP-004, PP-008). The slice 5 design hubs keep theirs (reviewer pages). Earlier
   slices' pages are not changed by this entry.


## 2026-11-16 — Requirement IDs stripped from the earlier slices' pages too (ruled by Ujjwal Sharma)

Extends the entry above to every page: no requirement ID in copy a user reads — text, tooltips (`title`), toasts
and dialog bodies drawn by script. A trailing *(XX-NNN)* goes with its space; a leading *XX-NNN ·* label goes and
the rest is capitalised (*SYS-007 · effective-dated* → *Effective-dated*). Code comments keep their IDs, and so do
the slice design hubs (reviewer pages). Nothing else in the copy changed.

## 2026-11-16 — Slice 5 sample data and the agency pay figures (ruled by Ujjwal Sharma)

1. **A third Active agency approved for Acme: Calder Recruitment** (Active, approved from 1 Jul 2026), so slice 5 TSD
   5.6 TV-1 has three Active approved agencies. VAC-1042's release drawer now offers Calder and Nexus, so *Release to 2*
   can be drawn. Like Summit Staffing Solutions it is an addition in `slice5-proto`'s seed only (Abstract's copy alone:
   the client and agency copies do not name it); the slice 2 Approved Suppliers page does not carry the link.
2. **VAC-1050 *Goods-in operatives*** (Acme, Leicester DC, Warehouse Operative, Morning, 26 Oct to 18 Dec 2026, three
   open positions, created and published by Rachel Green on 6 Oct) is new slice 5 sample data, released to TechForce
   alone in wave 1 on 9 Oct 2026 at 11:30 by Sarah Mitchell, agency pay rate £13.20/hr (the rate card's line). No Acme
   vacancy of slice 3 was open, published and unreleased (VAC-1044 is the Draft demo, VAC-1048 is Northgate's and the
   hub's unreleased-release demo), so one was added. It lives in `slice3-proto.js` (both copies) flagged `s5only`: it
   reads only in the slice 5 mode and the full product, so slices 1 to 4 read as before. The agency demo now starts
   with a vacancy Daniel Wright can propose to (0 of 2).
3. **Agency pay figures on an Agency-sourced week and pay statement** (slice 5 TSD §3.3.6, §3.3.8; slice 4 §3.3.2,
   §3.3.3). Worked out in the S5 seam (`S5.s4.dress`, `S5.s4.statement`), not in slice 4's engine: per line agency pay
   rate = round(booking's agency pay rate × multiplier) and agency cost = round(hours × rate), 0.00 on a paid absence the
   agency bears; per day Abstract margin = client cost − agency cost and agency net margin = agency cost − (worker gross
   pay + statutory). Booking Week's *Day by day* gains *Agency pay rate* and *Agency cost* columns (cards: *· agency
   cost £x*) and *This week* an *Agency cost* line, both shown also without the full breakdown (tag `pay`); *Agency net
   margin* shows its total with the breakdown only. Pay Statement gains *Agency pay rate* / *Agency amount* columns and
   an *Agency gross pay* total; its source badge now reads the statement's own source (it always read Abstract-sourced).
   Payroll gains an *Agency gross pay* column when a listed statement is Agency-sourced, its source filter now filters by
   source (it emptied the list on Agency-sourced), and its intro names both sources in slice 5. Abstract-sourced weeks
   and statements are unchanged.
4. **No *Not Requested* badge in the day table.** An Agency-sourced absence whose confirmation was never requested shows
   no badge, only the *Request agency confirmation* link where it is offered (Abstract and client: one shared function).
   *Requested (awaiting agency)* and *Justified* keep theirs.

## 2026-11-16 — Slice 5 TSD review R5: the rulings applied to Abstract's pages (ruled by Ujjwal Sharma)

From the slice 5 TSD review R5 (project-docs `review/slices/SLICE-5-TSD-REVIEW-R5-RECORD.md`). The shared slice 5 source
`scripts/slice5-proto.src.js` was changed for all three portals and every copy rebuilt; the client's and the agency's
parts are recorded in their own `DECISIONS.md`.

1. **R5-D1 — Abstract edits an agency's candidate.** Worker Profile and Worker Form open an agency-owned record
   (`?id=ac-kofi`) as they open Abstract's own: Edit, the compliance items' Update, Add and Remove licence, Upload, and
   Set or Lift legal hold (still Abstract's control). What stays refused: availability (no *Set availability*, no
   availability fields on the form; `S5.act.updateCandidate` refuses `CANDIDATE_FIELD_NOT_ALLOWED` for it), and the
   owning agency and its branch, shown read only (the profile's note, the form's *Owning agency* and *Branch*). An
   agency's candidate is still never booked from the pool (no *Book into position*). The note now reads *This record is
   owned by &lt;agency&gt;, &lt;branch&gt;. Changes made here are audited.* The writes land in the shared store, so the
   agency reads them; on open, the record's drama number takes the pool's one-off conversion so it can be saved.
   Replaces entry 7 of the 2026-11-15 slice 5 entry (*read only*).
2. **R5-D6 — "Awaiting agency".** A requested day's pill, legend entry, cell mark tooltip and aria text read
   design-tokens §6's *Awaiting agency*, not *Requested (awaiting agency)*; the state's value is unchanged. *Justified*
   stays.
3. **R5-D8 — Margin on an Agency-sourced booking.** Booking Detail shows the agency pay rate where an Abstract-sourced
   booking shows the worker pay rate (KPI, Margin summary, projection, rate composition, summary card), and the margin is
   charge rate − agency pay rate: BK-2210 £22.50 − £15.90 = £6.60/hr, 29.33 % (worked out, not stored). The worker pay
   rate is not shown there. Abstract-sourced bookings are unchanged.
4. **R5-D9 — The absence modal sends the tick only if it changed.** `requestConfirmation` is sent only when the user
   changes the tick from its default (the client's setting), so an untouched default records party `policy`; the dialog
   then reads *Requested automatically (client setting)*.
5. **R5-G1 — No proposal reference on a booking.** Booking Detail's *From proposal* term is gone, and a booking created
   by an acceptance logs *Booking created from an accepted proposal*. Proposal pages keep their PRP ids.
6. **R5-P2 — Accept dialog dates refusals.** Proposal Review gains `datesoutside` (422 BOOKING_DATES_OUTSIDE_VACANCY)
   and `datesinvalid` (BOOKING_DATES_INVALID), as the client's page has them; the kit labels them.
