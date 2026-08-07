# Admin Portal mockups — current state

Static HTML UX-flow prototype for the VMS internal **Admin** portal (~25 screens). Main areas:
Admin Dashboard, Vacancies (list, create, detail) + Fill Position, Worker Pool, Proposals review,
Bookings, Invoicing, Rate Cards, AWR Tracking, Approved Suppliers, Audit Log, Reports,
Onboarding (Client, Agency), Configuration / System Config, plus agency- and client-facing views.

Each `.html` is openable directly; the click-path between them is the demonstrated flow (see `FLOWS.md`).

## Next Steps

- Run `node scripts/check-flow.mjs` to regenerate `FLOWS.md` and see the journey + any dead links/orphans.
- When adding/editing a screen: use `/new-screen`, wire it into the flow (link to and from it), then note it here.

## Log

- 2026-08-06 — **Timesheet drill-down rework** (`10-Vendor Management - Client Wee.html`). (1) **Progressive disclosure** — the per-candidate detail (weekly grid + financial breakdown) is now hidden by default behind an empty state; it opens only when the admin clicks "Open" on a candidate row (`openGrid(id)`), with a Close button + Esc to collapse. All 8 oversight rows now open their own dataset (`CANDS`), not just Marcus. (2) **Day cells + entry flow now mirror the client portal**: shift-background cells (`cell-morning/afternoon/night`) and a **day-entry modal** (`#day-modal`) replace the old inline cell editing. The modal ports the client's worked/absence flow (status radios, role-for-shift, vivid shift tiles, hours) and keeps admin-only capability: pay-impact override (TS-018), paid-absence cost bearer (TS-035), per-shift role change (TS-049–051), and full charge/pay/margin visibility. Abstract-sourced candidates hide the agency-confirmation control and relabel the pay column. Reference implementation copied from `../client/7-Abstractvms - Timesheets.html`. No flow/link changes (drill-down is JS-driven, not hrefs).
- 2026-08-06 — **Per-shift role change (editable)** (`10-Vendor Management - Client Wee.html`). The admin-on-behalf drill-down grid (Marcus Reid) can now record a worked shift against a **different job role** than the assigned one. Added a **role rate card** (`ROLES` — charge+pay per role) that resolves each worked day's charge/pay by `day.role || assigned` (Abstract sees both + margin). The inline cell editor gained a **locked role dropdown + "Change role"** button (unlock → pick; `aEnableRole` mutates in place so typed hours aren't lost). Worked cards flag a role change (**purple card + swap badge + covered-role pill**); added a legend chip + a role-change note banner. The week financial summary now shows **"Mixed · role change"** for the per-hr rate lines when roles differ, totals still per-day (verified: 22.5 worked hrs → £567.75 charge / £426.75 pay with Fri seeded as an FLT cover). Editing is Abstract/client only; agency is read-only (its portal). See BRD TS-049–051 (v4.4) + `../DESIGN-SPEC-v4.md` §6.5. No flow/link changes.
- 2026-08-06 — Reports (`20-Vendor Management - Reports.html`): added agency-by-agency segregation to the agency-level bifurcations. Fulfilment Report bars now split the "Agency" segment per agency (TechForce/Nexus Talent/PeopleBridge) with a per-client breakdown line; Source Split donut splits the agency-sourced arc into per-agency arcs. Numbers reconcile across both (agency 18/12/6 = 36, Abstract 31, filled 67). Agency colours are distinct hues to avoid blue-on-blue blending with Abstract: TechForce = amber, Nexus Talent = rose, PeopleBridge = teal (Abstract = indigo, Open = slate). No flow/link changes.
- 2026-07-31 — Added the AI UX-flow kit (CLAUDE.md/AGENTS.md, `scripts/check-flow.mjs`, design skills, `FLOWS.md`). No screens changed.
