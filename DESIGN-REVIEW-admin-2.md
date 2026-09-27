# Admin Portal — Gap Audit #2 (cross-portal)

_Second pass, 2026-08-26. Audit #1 (`DESIGN-REVIEW-admin.md`) measured the admin portal against
the BRD. This one measures it against **its own sibling portals** — the agency and client builds —
which turn out to be materially more finished in several areas._

## Headline

| | Admin | Agency | Client |
| --- | --- | --- | --- |
| Screens | 23 | **28** | 12 |
| `onclick` handlers, total | **84** | **464** | 41 |
| Files that define any JS | **10 / 23** | **28 / 28** | — |
| `<button>` inert (no href, no handler) | **477 / 541 = 88%** | — | — |
| Items fixed since audit #1 | **0** (git shows only "updated login screen and logo") |

The admin is the *operator* portal, yet it is the least finished of the three. An entire
**account / settings / notification layer** that the agency already ships is absent, the global
chrome is decorative on every screen, and **eleven screens contain zero handlers**:
`6`, `7`, `8`, `9`, `11`, `12`, `13`, `16`, `17`, `18`, `19`, `20`, `22`.

---

## A. The notification layer — traced end to end

Your example, confirmed and extended. Four separate things are missing; the one thing that
exists is fake.

| Piece | Agency | Client | Admin |
| --- | --- | --- | --- |
| Notification **page** | `18-…Notifications.html` | `12-…Notifications.html` | **✗** |
| Notification **drawer** | `#notif-drawer` on all 25 in-app screens | — | **✗** |
| **Bell wired** | ✅ drawer **and** page | ✅ link + numeric badge "3" | **✗ 21 screens have a bell, 0 wired** |
| **Unread count / state** | pill "5 unread", `markNotifRead()`, `markAllNotifRead()`, `refreshNotifCount()`, empty state | "5 unread", mark-all-read | **✗** static red dot that never changes |
| Per-user **preferences** | `25-…Notification P.html` | — | **✗** |
| Org-level **routing config** | — | — | ⚠️ present but fake |

**The admin is behind *both* siblings** — even the simpler client portal has a working bell.

**The org matrix is decorative.** `23-…Configuration.html` has a proper Event × Email × In-app
grid (CFG-011: "Timesheet submitted", "Invoice generated", "Absence recorded"…) — but its
10 toggles are `<span>`s styled as switches. That file contains **0 real form controls**.

The bell itself:
```html
<button class="relative w-9 h-9 …">          <!-- no href, no onclick -->
  <i class="fa-regular fa-bell …"></i>
  <span class="absolute … w-2 h-2 rounded-full bg-red-500"></span>   <!-- permanent dot -->
</button>
```

**What the agency drawer does, that admin needs:** unread pill, per-item *Mark as read*,
*Mark all read*, live recount that hides the pill/dot at zero, empty state ("You're all caught
up"), Esc-to-close, backdrop, per-item deep links, and a footer with **See all notifications →**
page and **Preferences →**. Its page adds day grouping (Today/Yesterday), filter tabs
(All · Unread(5) · Absences · Vacancies · Proposals · Bookings · Self-Bills) and inline CTAs
("Justify", "View on timesheet →").

---

## B. Account & settings layer — entirely absent

| Screen | Agency | Client | Admin |
| --- | --- | --- | --- |
| My Account (profile, password, 2FA, sessions) | `26-…My Account.html` | — | **✗** |
| Settings — org/general profile | `23-…Agency Profile.html` | — | **✗** |
| Notification preferences | `25-…Notification P.html` | — | **✗** |
| Integrations | `27-…Integrations.html` | — | **✗** |
| Compliance register | `24-…Compliance Doc.html` | — | **✗** |
| User management | `20-…User Managemen.html` | `3-…Users & Permissi.html` | **✗** |
| Org / branch / BU management | `19-…Branches Overv.html` | `2-…Business Units.html` | **✗** |

Consequences in the shell: the **gear** is inert on every screen with no destination; the
**avatar** is static markup with no menu; the sidebar has no Account / Notifications / Users
entry (groups are MAIN · FULFILMENT · AGENCY · COMPLIANCE · FINANCE · SETUP · SYSTEM).

### What to mirror (agency contents, verified)

- **My Account** — photo upload, name/email/phone/job title; password block with rules and "last
  changed"; **2FA** (authenticator on/off, recovery codes); read-only "Your access" (role, scope);
  **active sessions** with *Sign out of all other sessions*.
- **Notification preferences** — Email/In-app matrix in 4 groups (Vacancies · Proposals ·
  Bookings & timesheets · Compliance & finance) plus a **Daily digest** option, and a note that
  org-wide defaults are set separately (CFG-011).
- **User management** — role filter, table (Name · Email · Role · Branch · Status), pagination,
  **Add User modal** (name, email, system role, scope assignment with helper text).
- **Org management** — table with primary/inactive chips, user counts, **Add modal**.

### What admin needs that the agency's layer does *not* cover

The agency's cluster is a *tenant* settings layer. Admin is the *provider*:

1. **Abstract's own roles don't exist.** BRD §5.1 defines **Abstract Admin / Operations /
   Finance**; the prototype uses "Super Admin" (15 screens) and "MSP Admin" (5) — neither is in
   the BRD. No screen invites or deactivates an Abstract staff user.
2. **Cross-tenant user administration** — admin must manage users of *every* client and agency.
   Today the only such surface is the onboarding wizards, where **`Invite user` has no handler**.
3. **Client directory + Agency directory (with edit)** — BRD CM-001 / AM-001 say *manage*, but
   admin can only *create* via wizards. No way to reopen, edit, suspend or reactivate an org.
4. **Cross-agency compliance register** — `17-…Approved Su.html` already shows a
   "3 Expiring Compliance" KPI with **nothing behind it**.
5. **Notification *template* administration** (GTH-001) — agency has only per-user on/off.
6. **Admin's own My Account** — `24-…System Config.html` already declares the *policy*
   (2FA "Required for all admin users", password min 12 chars, IP allowlist). The per-user
   surface that policy applies to does not exist.
7. **Provider-side integrations** — accounting/ERP export, payroll, SSO/SAML, webhooks, API keys,
   CSV importers (GTH-007).

---

## C. Auth flows are incomplete

| | Admin | Agency | Client |
| --- | --- | --- | --- |
| Sign-in submits | ✅ | ✅ | ❌ **inert** (`href="#"`) |
| Forgot password screen | **✗** | ✅ `1-…Forgot Passwor.html` | ✗ |
| Set new password screen | **✗** | ✅ `2-…Set New Passwo.html` | ✗ |
| "Forgot password?" link target | **`href="#"` — dead end** | → real screen | `#` |
| MFA challenge | ✗ | ✗ | ✗ |

Only the **agency** has a closed loop: sign-in → forgot → (email stand-in) → set new password
→ back to sign-in with a `?reset=1` confirmation banner. Its set-password screen has a live
5-rule strength checklist and a submit disabled until valid — worth porting wholesale.

Note the contradiction: System Config declares 2FA **required for all admin users**, but no MFA
step exists anywhere.

---

## D. Global chrome is decorative — and inconsistent

| Control | Admin | Agency |
| --- | --- | --- |
| Global search | inert `<input>`, **no results screen** | ✅ Enter → `28-…Search Results.html?q=`, page reads `?q=` back |
| Bell | inert | ✅ drawer + page |
| Gear | inert, no destination | ✅ → settings |
| Avatar | static, no menu | ✅ popover: My account · Notification prefs · Settings · Sign out — **plus a role switcher that actually hides nav items and persists to `sessionStorage`** |
| Scope selector | ✗ | ✅ branch scope on every screen |
| Logout | ✅ — **but missing entirely on `11-…Invoicing.html`** | ✅ |

**Admin's chrome isn't even consistent with itself:** header search missing on 8 screens
(`13,14,16,18,20,21,22,23`), bell missing on 3 (`14,16,22`), **gear missing on 13 of 22**.
Breadcrumbs are a real pattern on only 3 screens.

---

## E. Mobile navigation is broken (new — not in audit #1)

The sidebar is `hidden lg:flex`. Every screen ships a hamburger:
```html
<button id="mobile-menu-btn" class="lg:hidden …"><i class="fa-solid fa-bars"></i></button>
```
Present on **15 screens, wired on 0**. Below 1024px the sidebar is hidden and the only control
that could reveal it does nothing — **there is no navigation at all on tablet or mobile.**
This is a broken state, not a missing feature.

---

## F. Missing list / detail screens

13 screens a sibling has that admin has no equivalent for:

| Entity | Agency | Client | Admin |
| --- | --- | --- | --- |
| Bookings **list** | `12-…Bookings List.html` | `6-…Bookings.html` | **✗** (detail only, not in nav) |
| Candidate/worker **detail** | `7-…Candidate Deta.html` (6-tab profile) | — | **✗** (worker row → *Booking* Detail) |
| Create candidate/worker | `8-…Create Candida.html` (3-step) | — | **✗** |
| Proposals **list** | `9-…Proposal Manag.html` | — | **✗** (review screen only) |
| Self-bill / invoice **detail** | `15-…Self-bill Deta.html` | — | **✗** |
| Report **viewer** | `17-…Report Viewer.html` | — | ⚠️ merged, 0 handlers |
| Search results | `28-…Search Results.html` | — | **✗** |
| Forgot / set password | `1`, `2` | — | **✗** |
| Notifications | `18` | `12` | **✗** |
| Notification prefs | `25` | — | **✗** |
| Users | `20` | `3` | **✗** |
| Branches / BUs | `19` | `2` | **✗** |
| My Account / Settings / Integrations / Compliance | `26`,`23`,`27`,`24` | — | **✗** |

---

## G. Depth gaps where both have the "same" screen

- **Bookings** — admin's *detail* is richer than agency's (margin summary, rate composition,
  5-step approval chain) but **all its actions are inert**. Agency's *list* has filter rail,
  row overflow menus with 4 deep links, bulk selection with live counter, export, rows-per-page.
- **Worker Pool** — filters are decorative `<select>`s, `Add Worker to Pool` inert, pagination
  non-functional, row "View" mis-targets Booking Detail.
- **Invoicing** — the file contains **only sidebar hrefs**. Per-row View/Download, Generate
  Invoice, Generate Self-Bills, exports and status tabs all inert. It shows a
  "Disputes: 3 · £14,200 at risk" KPI with no dispute screen, and **no link to the Backing Report**.
- **Reports** — one page, 0 handlers. Agency splits catalogue (favourites, category filters) from
  a viewer with Group By, per-group subtotals, grand total, export with toast, pagination.
- **Timesheets** — admin's is the **strongest screen in the portal** (22 handlers, drill-down,
  day modal, cost-bearer, role change). Only gap: no pagination on the oversight table.

### Two portal-wide pattern gaps

- **No confirmation dialogs.** Agency has `openConfirm()` on 5 screens with a keyed map setting
  title/body/CTA/tone (danger vs neutral). Every destructive admin action — Cancel Booking,
  Revoke supplier, Reject proposal, Activate client — currently fires nothing and confirms nothing.
- **No empty states and no toasts.** Admin has **zero** "no results" states on any screen;
  agency has several plus `toast()` on 13 screens. Admin gives no feedback for any action.

---

## H. Still-open P0s from audit #1 — all unchanged

Re-verified today, **0 handlers each**: `8-…Proposal R` (Accept/Reject) · `9-…Booking De`
(Extend/Amend/Cancel) · `17-…Approved Su` (Approve/Revoke) · `18-…Rate Cards` (New Rate Card) ·
`11-…Invoicing` (Generate) · `13-…Worker Pool` (row → Booking Detail).

Also unresolved: `6`/`7` still carry an **agency identity** in the admin repo; `a.html` is still
an orphaned *client-portal* Invoices page; there is no `15-*.html` (numbering gap).

---

## I. Build backlog

**P0 — broken states**
1. Wire `mobile-menu-btn` → sidebar toggle (portal unusable < 1024px).
2. Wire the §H decision controls so source → book → invoice completes.
3. Add confirmation dialogs + toasts before/after destructive actions.
4. Worker "View" → a real worker profile.

**P1 — the missing layer both siblings have**
5. Notification **centre + drawer + real count**; wire the bell.
6. Notification **preferences**; make the Configuration matrix real controls.
7. **My Account** + avatar menu; **Settings hub** + wire the gear.
8. **User management** — cross-org, with the BRD's actual admin roles.
9. **Forgot / Set new password**; point the login link at them.
10. **Search results** + make header search a real form.

**P2 — completeness**
11. Bookings list · worker profile · proposals list · invoice & self-bill detail ·
    rate-card editor · client & agency directories (ongoing, not just onboarding).
12. Nav groups for Account / Notifications / Users so new screens are reachable.
13. Empty states + pagination across lists; normalise header chrome (gear missing on 13/22).
14. Reconcile roles to BRD §5.1; fix `6`/`7` identity; remove `a.html`.

---

## J. Method

Counts are grep-derived across the three portals; "wired" means an `href`, `onclick`, or
registered listener that resolves. "Inert" is a `<button>` with none. Screen-level claims are by
file inventory + per-screen inspection.
