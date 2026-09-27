# Abstract Admin Portal — Critical Design Review

_UX/flow audit of the Abstract (MSP) admin mockups against `../BRD-VMS-v3-Complete.md`,
`../domain-model.md`, and `../BRD-VMS-Competitor-Backlog.md`. Date: 2026-08-18._

## Verdict

At the **page** level the portal is in good shape: the screens read as one product, and most
BRD functional areas have a screen. The prototype breaks down at the **action** level. The
admin's day-to-day is a chain of decisions — *raise → source → accept → book → timesheet →
approve → invoice → self-bill* — and almost every decision control in that chain is inert or
routes to the wrong place. Several entities the admin must operate on have **no screen at all**,
and one portal's chrome leaks into another. As a flow demonstration, the journeys do not complete.

The auto flow-checker reports "no dead links" because navigation is almost entirely the **sidebar**
(every screen links to every other screen). It cannot see the real problem: primary CTAs that do
nothing, or that jump to the wrong entity. That's where the gaps are.

Severity: **P0** = blocks the core journey / wrong destination · **P1** = missing screen or major
flow gap · **P2** = consistency / polish.

---

## A. Flow breaks & mis-targeted navigation (P0)

1. **Worker → wrong screen.** In [Worker Pool](abstract.candidates.worker-pool.html) a worker row's **View** links to
   [Booking Detail](abstract.bookings.booking-detail.html), not a worker profile. There is **no worker/candidate
   profile screen anywhere** in the admin portal (CP-001–009), so the worker's compliance,
   licences, availability and documents are unreachable.
2. **"Book into Position" has no vacancy picker.** The same rows' **Book into Position** jumps
   straight to [Fill Position](abstract.demand.fill-position.html), which is hard-scoped to one vacancy
   ("Forklift Driver (Reach) · VAC-1042 · Position 3 of 3"). Booking *from a vacancy* works
   (Vacancy Detail → Fill Position); booking *from a worker* should first let you **choose which
   open position** to fill (CP-014). That reverse flow is missing.
3. **Agency portal leaks into the admin flow.** The sidebar's "Agency Dashboard" opens
   [screen 6](abstract.organisations.agency-dashboard.html), whose sidebar brand reads **"Agency Portal"** and whose content
   is an agency user's view (candidate "Alex Chen"). [Agency Candidate Submission](abstract.demand.agency-candidate-submission.html) is the
   same — an agency-portal screen. This is why "the user profile changes": you've been dropped
   into a different portal. The admin needs its **own** agency directory/management view, not the
   agency's portal (AM-001–006).
4. **Decision actions don't advance the flow.** The commercial spine is visual-only:
   - [Proposal Review](abstract.demand.proposal-review.html): **Accept / Reject** are dead (no handler). Accepting a
     proposal must create the Agency-sourced booking and move state (PP-004/005) — here it does
     nothing and goes nowhere.
   - [Booking Detail](abstract.bookings.booking-detail.html): **Extend / Amend / Cancel** are dead (BK-007/008); cancel
     should return the position to Open (BK-016).
   - [Approved Suppliers](abstract.organisations.approved-suppliers.html): **Approve Agency / Revoke** are dead (AB-003/006).
     Because the approved-supplier list gates the release step, this is load-bearing.
5. **No way to browse bookings.** There is a Booking *Detail* but **no Bookings list / active-
   bookings dashboard** (BK-009/010) and no "Bookings" nav item — you can only reach a booking by
   luck from a worker or vacancy. Filtering by client/BU/agency/**source**/status has nowhere to live.

---

## B. Dead / non-functional controls (P0–P1)

In a static mockup not every button needs JS. The concern is CTAs that imply a **destination
screen that doesn't exist**, or that sit on a decision node and stop the journey. Wiring density
(plain `<button>` count vs. buttons with a handler) shows how much of each screen is decorative:

| Screen | buttons | wired | Notable dead CTAs |
| --- | --- | --- | --- |
| [Invoicing](abstract.money.invoicing-self-bill.html) | 51 | 0 | **Generate Invoice**, Generate, Download × many, Export |
| [Approved Suppliers](abstract.organisations.approved-suppliers.html) | 44 | 0 | Approve Agency, Revoke |
| [Vacancy List](abstract.demand.vacancy-list.html) | 63 | 0 | filters, row actions |
| [Configuration](abstract.configuration.organisation-configuration.html) | 31 | 8 | save/edit on several policy blocks |
| [Backing Report](abstract.money.backing-report.html) | 28 | 0 | export, drill-downs |
| [Proposal Review](abstract.demand.proposal-review.html) | 28 | 0 | Accept, Reject |
| [Booking Detail](abstract.bookings.booking-detail.html) | 23 | 0 | Extend, Amend, Cancel |
| [Rate Cards](abstract.rates.rate-cards.html) | 12 | 0 | **New Rate Card**, CSV Bulk Upload |
| [Reports](abstract.reporting.reports.html) | 10 | 0 | Run report, export |
| [AWR Tracking](abstract.awr.awr-tracking.html) | 5 | 0 | Apply Post-AWR Rate |

The two examples you already flagged are the sharpest cases because the destination doesn't exist:
- **Rate Cards → "New Rate Card"** is a bare button. There is **no rate-card create/edit screen**
  (RT-010) — no hour-type × shift matrix, no statutory breakdown, no effective-dating/version
  history, no CSV-upload preview (RT-007/013). Same for "CSV Bulk Upload" and "Commit 38 rows".
- **Invoicing → "Generate Invoice" / "Generate Self-Bills"** are inert and there is **no invoice-
  generation or invoice-detail screen** (IV-004–008): no line items, PDF, status transitions
  (Generated → Sent → Paid → Disputed → Credited), and no self-bill detail.

**Even the "working" directions don't commit.** Beyond the decision nodes above:
- [Fill Position](abstract.demand.fill-position.html) — **"Create Abstract-sourced Booking"** and **"Record Manual Fill"**
  are dead, so the one correctly-wired path (Vacancy → pool → fill) still can't create the booking.
- [Onboard Client](abstract.onboarding.onboard-client.html) / [Onboard Agency](abstract.onboarding.onboard-agency.html) — the step rail and *Continue* are wired, but
  **"Activate client" / "Activate agency"**, **"Invite user"**, "Add business unit / branch /
  role / rate card", and "CSV import" are all dead — the wizards can advance but **never
  complete/activate** (ONB-008/010), and the *only* place users are created doesn't work.
- [Vacancy List](abstract.demand.vacancy-list.html) — the 10 **sort-column headers** render sort arrows but don't sort
  (they look interactive, so they read as broken rather than absent).

---

## C. Missing screens & flows vs BRD (P1)

Diffed against the BRD's required admin capabilities. Present-but-shallow items are noted too.

**Missing entirely**
- **Worker / candidate profile & compliance** — CP-001–009 (identity, RTW/DBS, licences+expiry,
  documents, availability). No screen; worker rows dead-end at a booking.
- **Rate Card editor** + version/effective-dating + CSV preview — RT-007/010/013.
- **Client invoice detail + generate**, **self-bill detail**, **credit/debit-note** surface —
  IV-004–008, SB-001–010, TS-010.
- **Bookings list / active-bookings dashboard** — BK-009/010.
- **Ongoing Client management** (list + detail: profile, BU tree ≥3 levels, users, rate cards,
  approved agencies, config) — CM-001–007. Only *onboarding* exists.
- **Ongoing Agency management** (admin's own list + detail: branches, self-billing agreement,
  compliance/accreditation, client approvals, agreed margins) — AM-001–006. ("Agency Dashboard"
  is the agency's portal, not this.)
- **Users / roles / permissions management** — §5.1/§16. Only appears *inside* the onboarding
  wizards; no standing cross-org user admin, deactivation, session invalidation (CM-005/AM-004).
- **Notification centre** — GTH-002. Bell icons are decorative on every screen; the client portal
  has a Notifications page, the admin has none.
- **Onboarding pipeline/list** by status (Draft → In Setup → Pending Activation → Active) —
  ONB-002/003. Wizards exist; the pipeline to see who's mid-setup does not.
- **Self-billing-agreement register** and **DSAR / GDPR erasure/anonymisation run** tooling —
  XR-019, CP-010, SYS-009 (only a config *schedule* exists, no operator action screen).

**Present — credit where due**
- Selective **release to agencies with incremental waves** (VC-015/016) is built into
  [Vacancy Detail](abstract.demand.vacancy-detail.html) — the release drawer (Wave 1/2/3 + approved-supplier picker) is
  actually wired, so the core differentiator is demonstrated. (Note the top action-bar
  "Release to" shortcut and "Record Manual Fill"/"Save Draft" there are still dead.)
- **Timesheets** ([screen 10](abstract.timesheets.timesheets.html)) is the most complete flow: cross-client grid,
  on-behalf entry with day modal, absence + pay-override + cost-bearer (TS-035), per-shift role
  change (TS-049), and the **booking-change / un-book approval monitor** (TS-047) — good.
- **AWR Tracking**, **Reports** (with source split), **Backing Report**, **System Config**, and
  the two onboarding wizards exist and are on-scope — they mainly need their actions wired and,
  for Config, the per-org scope-resolution UI (CFG-001/002).

---

## D. Information architecture, identity & consistency (P2)

- **Nav doesn't match the entity model.** The sidebar has no Bookings, Clients, Agencies
  (management), Workers/Candidates (profiles), Users, or Notifications. Several core entities are
  only reachable sideways or not at all.
- **Navigation is sidebar-only.** Because every screen links to every other screen via the
  sidebar and there are few in-context "next step" links, lists and details are navigational
  dead-ends beyond the global nav. The *journey* (e.g. proposal → booking → timesheet → invoice
  for one placement) is never expressed as links.
- **Identity inconsistency (three different users).**
  - "Super Admin" / **"Sarah M."** on 15 screens (2,3,4,5,13,14,16,17,18,19,20,21,22,23,24).
  - "MSP Admin" / **"Sarah Mitchell"** on 5 screens (8,9,10,11,12) — same person, different role
    label *and* different name format; on the Super-Admin screens the header ("Sarah M.") even
    disagrees with the sidebar footer ("Sarah Mitchell").
  - "Agency Manager" / **"TechForce Agency"** on screens 6–7 — a *different user in a different
    portal* (see A-3), with no portal switch.
- **Orphan / wrong-portal file.** [`a.html`](a.html) is a *client-portal* "Invoices" page sitting
  in the admin repo, unreachable (flagged by the flow checker). Remove or relocate.
- Spot-check every screen against the DESIGN-SPEC status vocabulary and forbidden terms
  (`Shortlisted`, `Offered`, `Pending Approval`, `Uplift %`, `Commission`, `In Progress`,
  `On Hold`) and the visibility rules (source never shown to client; pay never to client; charge
  never to agency).

---

## E. Gaps in the BRD itself (things to decide, not just build)

Surfaced while mapping requirements to screens — the BRD under-specifies these:

- **Credit/debit notes are MVP-implied but Phase-2-scoped.** TS-010 requires credit/debit notes
  when an invoiced timesheet is adjusted, but the note surface is listed as Phase 2 (P2-IV-003).
  Internal inconsistency — the admin needs *some* MVP surface.
- **Invoice dispute resolution.** Status `Disputed` exists (IV-008) with no flow to resolve it
  (line-item vs whole-invoice).
- **No-show → backfill/replacement.** No-show is a day status (TS-014) but there's no workflow to
  re-source a dropped shift.
- **Payments reconciliation / AR ageing.** `Paid` statuses exist with no way to record/match a
  payment; overdue is only a derived flag (ageing is Phase 2).
- **Rate-change propagation to live bookings** (Q-09) and **client↔agency config precedence**
  (Q-14) are open questions that change screen behaviour.
- **Vacancy triage/approval gate.** Clients can raise vacancies (VC-009); is there an Abstract
  review/triage step before release? Undefined (and "Pending Approval" is a forbidden term).
- **Vendor performance scorecards / fill-rate** (CB-FS-011), budget/spend-by-dimension
  (CB-CL-004/005), contract-renewal alerts (CB-FS-014), and any accounting export (Xero/Sage,
  CB-FS-022) are backlog — confirm they're intentionally out of the admin MVP.

---

## F. Recommended priority order

**P0 — make the core journey complete and correctly wired**
1. Wire the decision nodes so they advance state and navigate: Proposal **Accept/Reject** →
   creates booking, Booking **Extend/Cancel**, Supplier **Approve/Revoke**, Vacancy **Release**.
2. Fix mis-targets: worker **View** → a real worker profile; **Book into Position** → a
   position/vacancy picker.
3. Add the **worker/candidate profile** screen (it's referenced from three places and is a hard
   dead-end today).
4. Add **invoice generate + detail** and wire **New Rate Card** → a rate-card editor.

**P1 — fill the missing operational surfaces**
5. Bookings **list**; Clients **list+detail**; admin-side Agencies **list+detail** (replace the
   agency-portal leak); **Users/roles** management; **Notification centre**; onboarding
   **pipeline** list.
6. Rate-card version/effective-dating + CSV preview; self-bill detail + credit/debit-note surface.

**P2 — consistency & IA**
7. Reconcile the header identity ("Super Admin" vs "MSP Admin"), remove the "Agency Portal" chrome
   from admin screens, delete/relocate `a.html`, add the missing nav entries, and add in-context
   "next step" links so a single placement can be followed end to end.

**Decisions to escalate to the BRD owner:** credit-note MVP scope, dispute resolution, no-show
backfill, payments/AR, rate-change propagation (Q-09), config precedence (Q-14), vacancy triage
gate, and whether scorecards/budget/renewal/accounting-export are out of MVP.
