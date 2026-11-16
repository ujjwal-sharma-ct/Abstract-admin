/*
 * slice5-proto.js — the slice 5 prototype's shared behaviour (agency fulfilment), one copy per portal.
 *
 * SOURCE: `Design/abstract admin/scripts/slice5-proto.src.js`. Each portal's `slice5-proto.js` is BUILT from it by
 * `node scripts/build-slice5-proto.mjs` (run from the abstract admin folder): the build keeps the lines outside a fence
 * and the lines inside a fence that names the portal (`//#if abstract`, `//#if client agency`, … closed by `//#endif`),
 * and drops the other portals' blocks and the fence lines themselves. Edit the source, never a built copy.
 *
 * Load order on a page: slice3-proto.js (absent on the agency portal) → slice5-proto.js → slice4-proto.js → slice1-kit.js.
 *
 * What a copy carries (slice 4's rule): only what its portal's responses would carry. The client's copy has no pay
 * figure, no booking source, no wave number, no candidate's personal data and no agency status; the agency's copy has
 * no charge rate, no margin but its own Agency Net Margin on an invoiced week (R5-D7), no other agency, no wave, no
 * roster and no position total. The demo store (localStorage
 * `s5-demo-v1`, shared by the three portals on one origin) holds the cross-portal facts — releases with their waves,
 * proposals, the agency's candidates, the Agency-sourced bookings, absence confirmations, and each released vacancy's
 * agency-facing facts and open count. A copy's accessors never return what its party may not read, even where the
 * store holds it (a prototype simplification: the store is one blob, the reader is the gate).
 *
 * What it gives a screen:
 *   S5.on()                          true in the slice 5 mode and the full product; every slice 5 addition is gated on it
 *   S5.proposals(f) / S5.proposal(id) the proposals the portal may read (ProposalSummary / Proposal, TSD §3.3.2)
 *   S5.ui.proposalBadge(status) / S5.ui.confBadge(state) / S5.ui.sourceBadge(src)   the kernel badges as drawn here
 *   abstract: S5.waves(vid), S5.releaseOptions(vid), S5.act.release, S5.act.startReview / accept / reject, S5.agencies()
 *   client:   S5.act.startReview / accept / reject; S5.directory() (B3); S5.supplyingParty(agencyId)
 *   agency:   S5.releasedVacancies() / S5.releasedVacancy(id), S5.myCandidates(), S5.act.propose / editNotes / withdraw,
 *             S5.act.saveCandidate, S5.agencyBookings(), S5.agencyWeeks(bookingId), S5.act.justify
 *   abstract and client also: the overlay on S3 (Agency-sourced bookings in the bookings and the roster, a released
 *   vacancy's status) and the S4 seam (S5.s4.*: the seeded weeks of the Agency-sourced booking, the confirmation states).
 *
 * "Today" is slice 3's: Saturday 10 Oct 2026.
 */
(function () {
  'use strict';
//#if abstract
  var PORTAL = 'abstract';
//#endif
//#if client
  var PORTAL = 'client';
//#endif
//#if agency
  var PORTAL = 'agency';
//#endif
  var TODAY = '2026-10-10';
  var KEY = 's5-demo-v1';
  var S5 = window.S5 = { PORTAL: PORTAL, TODAY: TODAY, KEY: KEY };

  // ---------- the slice mode (the kit's key; read directly when the kit has not loaded yet) ----------
  function mode() {
    if (window.S1 && S1.mode) return S1.mode();
    var m = null; try { m = window.localStorage.getItem('s1-mode'); } catch (e) { /* blocked */ }
    return m === 'on' ? 's1' : ['s2', 's3', 's4', 's5'].indexOf(m) >= 0 ? m : 'full';
  }
  function on() { var m = mode(); return m === 's5' || m === 'full'; }
  S5.mode = mode; S5.on = on;

  // ---------- storage ----------
  function read(k) { try { return JSON.parse(window.localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function write(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window: this page only */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function now() { var d = new Date(); return TODAY + 'T' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); }
  function refuse(code, message, data) { var e = new Error(message); e.code = code; e.data = data || {}; throw e; }
  var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(iso) { if (!iso) return '—'; var p = iso.slice(0, 10).split('-'); return Number(p[2]) + ' ' + MN[Number(p[1]) - 1] + ' ' + p[0]; }
  function fmtDateTime(iso) { return fmtDate(iso) + ', ' + iso.slice(11, 16); }
  S5.esc = esc; S5.now = now; S5.fmtDate = fmtDate; S5.fmtDateTime = fmtDateTime;
  var ABSENCES = ['Sick Leave', 'Holiday', 'No-show'];
  var PENDING = ['Submitted', 'Under Review'];

  // ---------- reference data: the agencies (slice 2's records) ----------
//#if abstract
  var AGENCIES = {
    techforce: { name: 'TechForce Recruitment', status: 'Active' },
    nexus: { name: 'Nexus Talent', status: 'Active' },
    calder: { name: 'Calder Recruitment', status: 'Active' },
    peoplebridge: { name: 'PeopleBridge', status: 'Pending Activation' },
    summit: { name: 'Summit Staffing Solutions', status: 'In Setup' },
    rapid: { name: 'Rapid Resource', status: 'Suspended' }
  };
  // Approved-supplier links (slice 2's LINKS on abstract.organisations.approved-suppliers.html) plus TWO prototype additions
  // the slice 2 page does not carry: Summit Staffing Solutions approved for Acme from 1 Sep 2026 while still In Setup, for
  // the drawer's "Not active" row; and Calder Recruitment, Active, approved for Acme from 1 Jul 2026, so Acme has three
  // Active approved agencies (5.6 TV-1; ruled 2026-11-16, Ujjwal Sharma). Calder lives in Abstract's copy alone: no other
  // copy names it.
  var APPROVALS = [
    { client: 'acme', agency: 'techforce', from: '2026-03-12', to: null },
    { client: 'acme', agency: 'nexus', from: '2026-03-20', to: null },
    { client: 'acme', agency: 'calder', from: '2026-07-01', to: null },
    { client: 'acme', agency: 'peoplebridge', from: '2026-11-01', to: null },
    { client: 'acme', agency: 'summit', from: '2026-09-01', to: null },
    { client: 'northgate', agency: 'techforce', from: '2026-05-01', to: null },
    { client: 'northgate', agency: 'nexus', from: '2026-02-01', to: '2026-09-30' },
    { client: 'pennine', agency: 'rapid', from: '2026-02-15', to: '2026-09-01' }
  ];
  function agencyName(id) { return AGENCIES[id] ? AGENCIES[id].name : id; }
  S5.agencies = function () { return Object.keys(AGENCIES).map(function (k) { return { id: k, name: AGENCIES[k].name, status: AGENCIES[k].status }; }); };
  S5.agencyName = agencyName;
//#endif
//#if client
  var AGENCY_NAMES = { techforce: 'TechForce Recruitment', nexus: 'Nexus Talent' };
  // visibility.client_sees_agency_name resolved for this client today (TSD §3.3.5; the key is sub-slice 5.5's).
  // The client session's pages may draw the key off (their `agencyhidden` state) by setting S5.seesAgencyName = false.
  S5.seesAgencyName = true;
  function agencyName(id) { return S5.seesAgencyName ? (AGENCY_NAMES[id] || 'Agency') : 'Agency'; }
  S5.supplyingParty = agencyName;
//#endif
//#if agency
  // The signed-in agency user's organisation. Nothing of any other agency is in this copy.
  var ME = { agencyId: 'techforce', agencyName: 'TechForce Recruitment', userName: 'Daniel Wright' };
  S5.ME = ME;
  function agencyName(id) { return id === ME.agencyId ? ME.agencyName : ''; }
//#endif

  // ---------- the agencies' branch structures (agencyOrgNodeId → the branch a candidate belongs to) ----------
//#if abstract agency
  var BRANCHES = {
    techforce: [
      { id: 'tf-root', parentId: null, name: 'TechForce Recruitment', root: true },
      { id: 'tf-north', parentId: 'tf-root', name: 'North' },
      { id: 'tf-leeds', parentId: 'tf-north', name: 'Leeds branch' },
      { id: 'tf-mid', parentId: 'tf-root', name: 'Midlands' },
      { id: 'tf-bham', parentId: 'tf-mid', name: 'Birmingham branch' }
    ]
//#endif
//#if abstract
    , nexus: [
      { id: 'nx-root', parentId: null, name: 'Nexus Talent', root: true },
      { id: 'nx-bham', parentId: 'nx-root', name: 'Birmingham office' }
    ]
//#endif
//#if abstract agency
  };
  function branchName(agencyId, id) { var n = (BRANCHES[agencyId] || []).filter(function (x) { return x.id === id; })[0]; return n ? n.name : null; }
  S5.BRANCHES = BRANCHES; S5.branchName = branchName;
//#endif

  // ---------- the agencies' candidates: what every party may read (name, compliance, licence validity) ----------
  function lic(t, e) { return { licenceType: t, expiryDate: e || null }; }
  var CANDS = [
    { id: 'ac-kofi', fullName: 'Kofi Mensah', agencyId: 'techforce', complianceStatus: 'Compliant', licences: [lic('Reach truck (RTITB)', '2028-03-31')] },
    { id: 'ac-liam', fullName: 'Liam Carter', agencyId: 'techforce', complianceStatus: 'Compliant', licences: [lic('Reach truck (RTITB)', '2027-06-30'), lic('Counterbalance (ITSSAR)', '2027-11-30')] },
    { id: 'ac-ryan', fullName: 'Ryan Hughes', agencyId: 'techforce', complianceStatus: 'Compliant', licences: [lic('Reach truck (RTITB)', '2026-08-15')] },
    { id: 'ac-chloe', fullName: 'Chloe Adams', agencyId: 'techforce', complianceStatus: 'Compliant', licences: [] },
    { id: 'ac-hannah', fullName: 'Hannah Brooks', agencyId: 'techforce', complianceStatus: 'Compliant', licences: [lic('Counterbalance (ITSSAR)', '2027-04-30')] },
    { id: 'ac-daniel', fullName: 'Daniel Osei', agencyId: 'techforce', complianceStatus: 'Pending', licences: [] },
    { id: 'ac-megan', fullName: 'Megan Price', agencyId: 'techforce', complianceStatus: 'Compliant', licences: [] },
    { id: 'ac-amira', fullName: 'Amira Hassan', agencyId: 'techforce', complianceStatus: 'Compliant', licences: [lic('Reach truck (RTITB)', '2027-09-30')] }
//#if abstract client
    , { id: 'nx-oliver', fullName: 'Oliver Grant', agencyId: 'nexus', complianceStatus: 'Pending', licences: [] },
    { id: 'nx-priya', fullName: 'Priya Kaur', agencyId: 'nexus', complianceStatus: 'Compliant', licences: [] },
    { id: 'nx-tom', fullName: 'Tom Fletcher', agencyId: 'nexus', complianceStatus: 'Compliant', licences: [lic('Counterbalance (ITSSAR)', '2026-12-31')] },
    { id: 'nx-grace', fullName: 'Grace Adebayo', agencyId: 'nexus', complianceStatus: 'Compliant', licences: [] },
    { id: 'nx-sam', fullName: 'Sam Whitfield', agencyId: 'nexus', complianceStatus: 'Compliant', licences: [] }
//#endif
  ];
//#if abstract agency
  // The personal data and the record itself: Abstract reads both owners, the agency its own (pii_restricted, XR-002).
  function item(status, expiry, doc) { return { status: status, expiryDate: expiry || null, doc: doc || null }; }
  function items(a, b, c, d) { return { right_to_work: a, dbs_check: b, references: c, hs_training: d }; }
  var OK = function (e, d) { return item('Compliant', e, d); }, NA = item('Not Applicable'), PD = item('Pending');
  function addr(l, t, p) { return { line1: l, line2: null, town: t, postcode: p, country: 'GB' }; }
  function priv(branch, dob, tel, email, a, ni, kin, it, licIssuers, extra) { return Object.assign({ agencyOrgNodeId: branch, dateOfBirth: dob, telephone: tel, email: email, address: a, nationalInsuranceNumber: ni, nextOfKin: kin, items: it, issuers: licIssuers || [], documents: [], createdAt: '2026-08-20T10:00:00', updatedAt: '2026-10-01T09:00:00', createdBy: 'Daniel Wright' }, extra || {}); }
  var PRIV = {
    'ac-kofi': priv('tf-leeds', '1990-02-11', '07700 900301', 'kofi.mensah@example.com', addr('8 Burley Road', 'Leeds', 'LS4 2EU'), 'QQ112233A', { name: 'Ama Mensah', relationship: 'Sister', telephone: '07700 900401' }, items(OK('2030-02-28', 'Share code.pdf'), OK('2027-05-31'), OK(), OK('2027-06-30')), ['RTITB'], { documents: [{ name: 'Share code.pdf', size: '180 KB', by: 'Daniel Wright', at: '2026-08-20T10:20:00' }] }),
    'ac-liam': priv('tf-leeds', '1995-06-03', '07700 900302', 'liam.carter@example.com', addr('21 Kirkstall Road', 'Leeds', 'LS3 1LH'), 'QQ223344B', null, items(OK('2031-01-31'), NA, OK(), OK('2027-08-31')), ['RTITB', 'ITSSAR']),
    'ac-ryan': priv('tf-leeds', '1987-10-19', '07700 900303', 'ryan.hughes@example.com', addr('4 Beeston Road', 'Leeds', 'LS11 6AA'), 'QQ334455C', { name: 'Kerry Hughes', relationship: 'Spouse', telephone: '07700 900403' }, items(OK('2029-03-31'), OK('2027-01-31'), OK(), OK('2027-02-28')), ['RTITB']),
    'ac-chloe': priv('tf-bham', '1998-12-08', '07700 900304', 'chloe.adams@example.com', addr('15 Moseley Road', 'Birmingham', 'B12 0HJ'), 'QQ445566D', null, items(OK('2030-09-30'), NA, OK(), OK('2027-03-31')), []),
    'ac-hannah': priv('tf-bham', '1993-04-27', '07700 900305', 'hannah.brooks@example.com', addr('30 Hagley Road', 'Birmingham', 'B16 8PE'), 'QQ556677A', { name: 'Paul Brooks', relationship: 'Father', telephone: '07700 900405' }, items(OK('2032-04-30'), OK('2027-10-31'), OK(), OK('2027-09-30')), ['ITSSAR']),
    'ac-daniel': priv('tf-bham', '2000-01-15', '07700 900306', 'daniel.osei@example.com', addr('2 Ladypool Road', 'Birmingham', 'B12 8JY'), null, null, items(OK('2030-12-31'), PD, OK(), OK('2027-12-31')), []),
    'ac-megan': priv('tf-bham', '1996-07-30', '07700 900307', 'megan.price@example.com', addr('9 Coventry Road', 'Birmingham', 'B10 0RX'), 'QQ778899C', null, items(OK('2029-07-31'), NA, OK(), OK('2027-01-31')), []),
    'ac-amira': priv('tf-leeds', '1992-03-09', '07700 900308', 'amira.hassan@example.com', addr('11 Harehills Lane', 'Leeds', 'LS8 4AA'), 'QQ889900D', { name: 'Omar Hassan', relationship: 'Husband', telephone: '07700 900408' }, items(OK('2031-03-31'), OK('2027-04-30'), OK(), OK('2027-05-31')), ['RTITB'])
//#endif
//#if abstract
    , 'nx-oliver': priv('nx-bham', '1994-05-05', '07700 900501', 'oliver.grant@example.com', addr('7 Bristol Street', 'Birmingham', 'B5 7AA'), 'NX112233A', null, items(PD, NA, OK(), OK('2027-02-28')), [], { createdBy: 'Nexus Talent' }),
    'nx-priya': priv('nx-bham', '1997-09-12', '07700 900502', 'priya.kaur@example.com', addr('19 Soho Road', 'Birmingham', 'B21 9SN'), 'NX223344B', null, items(OK('2030-05-31'), NA, OK(), OK('2027-06-30')), [], { createdBy: 'Nexus Talent' }),
    'nx-tom': priv('nx-bham', '1989-11-23', '07700 900503', 'tom.fletcher@example.com', addr('3 Pershore Road', 'Birmingham', 'B5 7RL'), 'NX334455C', null, items(OK('2029-11-30'), OK('2027-03-31'), OK(), OK('2027-04-30')), ['ITSSAR'], { createdBy: 'Nexus Talent' }),
    'nx-grace': priv('nx-bham', '1991-08-17', '07700 900504', 'grace.adebayo@example.com', addr('44 Alcester Road', 'Birmingham', 'B13 8AP'), 'NX445566D', null, items(OK('2031-08-31'), NA, OK(), OK('2027-07-31')), [], { createdBy: 'Nexus Talent' }),
    'nx-sam': priv('nx-bham', '1999-02-02', '07700 900505', 'sam.whitfield@example.com', addr('12 Stratford Road', 'Birmingham', 'B11 1AA'), 'NX556677A', null, items(OK('2030-01-31'), NA, OK(), OK('2027-01-31')), [], { createdBy: 'Nexus Talent' })
//#endif
//#if abstract agency
  };
//#endif

  // ---------- the store seed: the cross-portal facts ----------
  // Each copy seeds only the records (and the fields) its party may hold, so the agency's file has no other agency's
  // proposal and no wave number, and the client's no release row. The store is the union: on load a copy adds the seed
  // records no copy has seeded yet and fills in the fields of the ones another copy seeded with fewer (store.seeded keeps
  // the keys, so a record a write removed — an ended confirmation — never comes back).
  function rel(vid, agency, at, wave, by) { var r = { vacancyId: vid, agencyId: agency, releasedAt: at }; if (wave) { r.waveNumber = wave; r.releasedByName = by; } return r; }
  function prp(n, vid, cand, agency, status, sub, extra) {
    return Object.assign({ id: 'p' + n, reference: 'PRP-' + n, vacancyId: vid, candidateId: cand, agencyId: agency, status: status, notes: '', submittedAt: sub, updatedAt: sub, reviewStartedAt: null, decidedAt: null, decidedByParty: null, decisionReason: null, positionNumber: null, bookingId: null, bookingReference: null }, extra || {});
  }
  function abk(o) {
    return Object.assign({ extendedAt: null, startedBy: null, completedAt: null, completedBy: null, cancelledAt: null, cancelledBy: null, cancellationReason: null, updatedAt: o.createdAt }, o);
  }
  function by(x, extra) { return Object.assign({}, extra, x); }
  function seed() {
    var releases = [
//#if abstract
      rel('v1042', 'techforce', '2026-09-24T10:15:00', 1, 'Sarah Mitchell'),
      rel('v1043', 'techforce', '2026-09-30T08:50:00', 1, 'Sarah Mitchell'),
      rel('v1041', 'techforce', '2026-10-05T14:20:00', 1, 'Sarah Mitchell'),
      rel('v1041', 'nexus', '2026-10-07T09:35:00', 2, 'Sarah Mitchell'),
      rel('v1047', 'nexus', '2026-10-08T11:00:00', 1, 'Sarah Mitchell'),
      // VAC-1050 (slice 5 sample data, ruled 2026-11-16): released to TechForce alone, so the agency starts with a vacancy to propose to
      rel('v1050', 'techforce', '2026-10-09T11:30:00', 1, 'Sarah Mitchell')
//#endif
//#if agency
      rel('v1042', 'techforce', '2026-09-24T10:15:00'), rel('v1043', 'techforce', '2026-09-30T08:50:00'), rel('v1041', 'techforce', '2026-10-05T14:20:00'), rel('v1050', 'techforce', '2026-10-09T11:30:00')
//#endif
    ];
    // who decided, as each party may read it: Abstract's user by name only in Abstract's copy
    var ABS_DEC = {};
//#if abstract
    ABS_DEC = { decidedByName: 'Sarah Mitchell' };
//#endif
    var proposals = [
      prp(1001, 'v1042', 'ac-kofi', 'techforce', 'Accepted', '2026-09-24T13:40:00', by(ABS_DEC, { notes: 'Kofi drove reach trucks for three years at a Leeds cold store and holds a current RTITB licence. He can start on the 28th and is happy on the afternoon Shift.', reviewStartedAt: '2026-09-25T09:10:00', decidedAt: '2026-09-25T16:05:00', decidedByParty: 'abstract', positionNumber: 2, bookingId: 'b2210', bookingReference: 'BK-2210', updatedAt: '2026-09-25T16:05:00' })),
      prp(1002, 'v1042', 'ac-liam', 'techforce', 'Submitted', '2026-10-09T10:30:00', { notes: 'Liam holds reach truck and counterbalance licences and has worked high-bay replenishment at two distribution centres. Available from Monday.' }),
      prp(1003, 'v1042', 'ac-ryan', 'techforce', 'Rejected', '2026-09-25T09:00:00', by(ABS_DEC, { notes: 'Ryan has six years on reach trucks in Leeds and Wakefield.', decidedAt: '2026-09-26T11:20:00', decidedByParty: 'abstract', decisionReason: 'His reach truck licence expired on 15 Aug 2026. Propose him again once it is renewed.', updatedAt: '2026-09-26T11:20:00' })),
      prp(1004, 'v1043', 'ac-chloe', 'techforce', 'Rejected (Position Filled)', '2026-10-01T10:00:00', { notes: 'Chloe has worked nights at a Birmingham parcel hub for two years.', decidedAt: '2026-10-06T16:30:00', decidedByParty: 'system', updatedAt: '2026-10-06T16:30:00' }),
      prp(1005, 'v1041', 'ac-hannah', 'techforce', 'Under Review', '2026-10-05T16:10:00', { notes: 'Hannah led a goods-in team of six at a Birmingham DC over last year’s peak and holds a counterbalance licence.', reviewStartedAt: '2026-10-06T09:05:00', updatedAt: '2026-10-06T09:05:00' }),
      prp(1006, 'v1041', 'ac-daniel', 'techforce', 'Submitted', '2026-10-06T11:45:00', { notes: 'Daniel has two seasons of picking and packing experience. His DBS check is in progress.' }),
      prp(1007, 'v1041', 'ac-megan', 'techforce', 'Withdrawn', '2026-10-05T16:30:00', { notes: 'Megan has worked peak cover at this site before.', decidedAt: '2026-10-07T12:00:00', decidedByParty: 'agency', decidedByName: 'Daniel Wright', decisionReason: 'Megan has accepted a permanent role elsewhere.', updatedAt: '2026-10-07T12:00:00' })
//#if abstract client
      , prp(1008, 'v1041', 'nx-oliver', 'nexus', 'Rejected', '2026-10-07T15:40:00', by(ABS_DEC, { notes: 'Oliver is reliable on early starts and lives ten minutes from the site.', decidedAt: '2026-10-08T10:05:00', decidedByParty: 'abstract', decisionReason: 'His right to work check is still pending, and Acme needs it before the first day.', updatedAt: '2026-10-08T10:05:00' })),
      prp(1009, 'v1041', 'nx-priya', 'nexus', 'Submitted', '2026-10-08T09:20:00', { notes: 'Priya has picked to order on scanners at two retail DCs and can do the full ten weeks.' }),
      prp(1010, 'v1041', 'nx-tom', 'nexus', 'Under Review', '2026-10-07T15:00:00', { notes: 'Tom is a counterbalance driver who also covers goods-in. He has worked for Acme before, at Leicester.', reviewStartedAt: '2026-10-08T10:10:00', updatedAt: '2026-10-08T10:10:00' }),
      prp(1011, 'v1047', 'nx-grace', 'nexus', 'Accepted', '2026-10-08T13:15:00', by(ABS_DEC, { notes: 'Grace covered days at this site in the summer and can start tomorrow.', reviewStartedAt: '2026-10-08T15:00:00', decidedAt: '2026-10-08T16:40:00', decidedByParty: 'abstract', positionNumber: 2, bookingId: 'b2211', bookingReference: 'BK-2211', updatedAt: '2026-10-08T16:40:00' })),
      prp(1012, 'v1047', 'nx-sam', 'nexus', 'Rejected (Position Filled)', '2026-10-08T13:30:00', { notes: 'Sam is available immediately for days.', decidedAt: '2026-10-08T16:40:00', decidedByParty: 'system', updatedAt: '2026-10-08T16:40:00' })
//#endif
    ];
    // the Agency-sourced bookings; the names are stored with them so the agency's copy (which has no slice 3 data) reads them
    var KOFI = { id: 'b2210', reference: 'BK-2210', vacancyId: 'v1042', candidateId: 'ac-kofi', candidateName: 'Kofi Mensah', clientId: 'acme', clientName: 'Acme Logistics', orgNodeName: 'Leeds Hub', jobRoleTitle: 'Forklift Driver (Reach)', shiftName: 'Afternoon', startDate: '2026-09-28', endDate: '2026-11-27', workingTimes: 'Mon to Fri, 14:00 to 22:00', status: 'Active', startedAt: '2026-09-28T00:30:00', agencyId: 'techforce', proposalId: 'p1001', createdAt: '2026-09-25T16:05:00' };
//#if abstract client
    Object.assign(KOFI, { vacancyReference: 'VAC-1042', jobTitle: 'Reach truck drivers', positionNumber: 2, orgNodeId: 'lds', orgNodePath: ['Northern', 'Leeds Hub'], jobRoleId: 'jr-fd', shiftId: 'sh-pm' });
//#endif
//#if abstract
    KOFI.createdBy = 'Sarah Mitchell';
//#endif
    var bookings = [abk(KOFI)
//#if abstract client
      , abk({ id: 'b2211', reference: 'BK-2211', vacancyId: 'v1047', vacancyReference: 'VAC-1047', jobTitle: 'Days team cover', positionNumber: 2, candidateId: 'nx-grace', candidateName: 'Grace Adebayo', clientId: 'acme', clientName: 'Acme Logistics', orgNodeId: 'bhx-d', orgNodeName: 'Days', orgNodePath: ['Midlands', 'Birmingham DC', 'Days'], jobRoleId: 'jr-wo', jobRoleTitle: 'Warehouse Operative', shiftId: 'sh-am', shiftName: 'Morning', startDate: '2026-10-09', endDate: '2026-11-06', workingTimes: 'Mon to Fri, 06:00 to 14:00', status: 'Active', startedAt: '2026-10-09T00:30:00', agencyId: 'nexus', proposalId: 'p1011', createdAt: '2026-10-08T16:40:00' })
//#endif
    ];
//#if abstract
    bookings[1].createdBy = 'Sarah Mitchell';
//#endif
    // Each released vacancy's agency-facing facts (ReleasedVacancy, TSD §3.3.1), its open count and first release, kept
    // current by the Abstract and client copies whenever they read the vacancy. No pay rate here: each copy has its own money.
    function facts(id, ref, title, role, node, start, end, close, shift, times, desc, req, open, status, first) { return { id: id, reference: ref, jobTitle: title, jobRoleTitle: role, clientId: 'acme', clientName: 'Acme Logistics', orgNodeName: node, startDate: start, endDate: end, closeDate: close, shiftName: shift, workingTimes: times, description: desc, requirements: req, openCount: open, status: status, firstReleasedAt: first }; }
    var vacancies = {
      v1041: facts('v1041', 'VAC-1041', 'Warehouse operatives, peak cover', 'Warehouse Operative', 'Birmingham DC', '2026-10-19', '2026-12-18', '2026-10-16', 'Morning', 'Mon to Fri, 06:00 to 14:00', 'General warehouse duties at the site: goods in, picking to order, and loading for despatch.', 'Safety boots and hi-vis provided on site. Able to lift up to 20 kg.', 3, 'Released to Agencies', '2026-10-05T14:20:00'),
      v1042: facts('v1042', 'VAC-1042', 'Reach truck drivers', 'Forklift Driver (Reach)', 'Leeds Hub', '2026-09-28', '2026-11-27', null, 'Afternoon', 'Mon to Fri, 14:00 to 22:00', 'Racking and replenishment in the high-bay aisles.', 'Current reach truck licence.', 1, 'Released to Agencies', '2026-09-24T10:15:00'),
      v1050: facts('v1050', 'VAC-1050', 'Goods-in operatives', 'Warehouse Operative', 'Leicester DC', '2026-10-26', '2026-12-18', '2026-10-23', 'Morning', 'Mon to Fri, 06:00 to 14:00', 'Unloading inbound trailers, checking deliveries against the paperwork, and putting stock away.', 'Safety boots and hi-vis provided on site. Able to lift up to 20 kg.', 3, 'Released to Agencies', '2026-10-09T11:30:00'),
      v1043: facts('v1043', 'VAC-1043', 'Night shift operatives', 'Warehouse Operative', 'Nights', '2026-10-12', '2026-11-13', null, 'Night', 'Sun to Thu, 22:00 to 06:00', null, null, 0, 'Filled', '2026-09-30T08:50:00')
//#if abstract client
      , v1047: facts('v1047', 'VAC-1047', 'Days team cover', 'Warehouse Operative', 'Days', '2026-09-14', '2026-11-06', null, 'Morning', 'Mon to Fri, 06:00 to 14:00', null, null, 0, 'Filled', '2026-10-08T11:00:00')
//#endif
    };
    // Absence confirmations, keyed booking|date (glossary AbsenceConfirmationRequest; TSD §3.3.7)
    var confirmations = {
      'b2210|2026-09-30': { requestedAt: '2026-09-30T13:10:00', requestedByParty: 'policy', justification: 'Kofi called our Leeds branch at 12:40, before his shift, to say he was unwell. His self-certification is on file with us.', justifiedAt: '2026-09-30T16:20:00', justifiedByName: 'Daniel Wright' },
      'b2210|2026-10-07': { requestedAt: '2026-10-07T15:10:00', requestedByParty: 'client', justification: null, justifiedAt: null, justifiedByName: null }
    };
//#if abstract client
    confirmations['b2210|2026-10-07'].requestedByName = 'Rachel Green';
//#endif
    var audit = [
//#if abstract
      { type: 'vacancy', id: 'v1042', at: '2026-09-24T10:15:00', by: 'Sarah Mitchell', text: 'Released to agencies, wave 1: TechForce Recruitment' },
      { type: 'vacancy', id: 'v1043', at: '2026-09-30T08:50:00', by: 'Sarah Mitchell', text: 'Released to agencies, wave 1: TechForce Recruitment' },
      { type: 'vacancy', id: 'v1041', at: '2026-10-05T14:20:00', by: 'Sarah Mitchell', text: 'Released to agencies, wave 1: TechForce Recruitment' },
      { type: 'vacancy', id: 'v1041', at: '2026-10-07T09:35:00', by: 'Sarah Mitchell', text: 'Released to agencies, wave 2: Nexus Talent' },
      { type: 'vacancy', id: 'v1047', at: '2026-10-08T11:00:00', by: 'Sarah Mitchell', text: 'Released to agencies, wave 1: Nexus Talent' },
      { type: 'vacancy', id: 'v1050', at: '2026-10-09T11:30:00', by: 'Sarah Mitchell', text: 'Released to agencies, wave 1: TechForce Recruitment' }
//#endif
    ];
    return { releases: releases, proposals: proposals, candidates: [], bookings: bookings, vacancies: vacancies, confirmations: confirmations, weeks: {}, audit: audit, seq: { prp: 1012, bk: 2300, cand: 100 } };
  }

  // ---------- store ----------
  var KEYS = { releases: function (r) { return r.vacancyId + '|' + r.agencyId; }, proposals: function (r) { return r.id; }, bookings: function (r) { return r.id; }, audit: function (r) { return r.type + '|' + r.id + '|' + r.at + '|' + r.text; } };
  function merge(store, sd) {
    var seen = store.seeded || {}, changed = false;
    Object.keys(KEYS).forEach(function (c) {
      store[c] = store[c] || [];
      sd[c].forEach(function (rec) {
        var k = c + ':' + KEYS[c](rec), cur = store[c].filter(function (x) { return c + ':' + KEYS[c](x) === k; })[0];
        if (cur) { Object.keys(rec).forEach(function (f) { if (!(f in cur)) { cur[f] = rec[f]; changed = true; } }); }
        else if (!seen[k]) { store[c].push(JSON.parse(JSON.stringify(rec))); changed = true; }
        if (!seen[k]) { seen[k] = 1; changed = true; }
      });
    });
    ['vacancies', 'confirmations'].forEach(function (c) {
      store[c] = store[c] || {};
      Object.keys(sd[c]).forEach(function (key) {
        var k = c + ':' + key, cur = store[c][key], rec = sd[c][key];
        if (cur) { Object.keys(rec).forEach(function (f) { if (!(f in cur)) { cur[f] = rec[f]; changed = true; } }); }
        else if (!seen[k]) { store[c][key] = JSON.parse(JSON.stringify(rec)); changed = true; }
        if (!seen[k]) { seen[k] = 1; changed = true; }
      });
    });
    ['candidates', 'weeks'].forEach(function (c) { if (!store[c]) { store[c] = sd[c]; changed = true; } });
    if (!store.seq) { store.seq = sd.seq; changed = true; }
    store.seeded = seen;
    return changed;
  }
  var db = read(KEY);
  if (!db) { db = { seeded: {} }; merge(db, seed()); write(KEY, db); } else if (merge(db, seed())) write(KEY, db);
  function save() { write(KEY, db); }
  S5.reset = function () { try { window.localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ } db = { seeded: {} }; merge(db, seed()); save(); };
  function log(type, id, text, who) { db.audit.push({ type: type, id: id, at: now(), by: who === undefined ? S5.me : who, text: text }); }
//#if abstract
  S5.me = 'Sarah Mitchell'; var PARTY = 'abstract';
//#endif
//#if client
  S5.me = 'Rachel Green'; var PARTY = 'client';
//#endif
//#if agency
  S5.me = ME.userName; var PARTY = 'agency';
//#endif

  // ---------- candidates ----------
  // The seeded record, merged with any write the agency made (store.candidates), dressed with the compliance roll-up.
  function rawCand(id) {
    var w = db.candidates.filter(function (c) { return c.id === id; })[0];
    if (w) return w;
    var p = CANDS.filter(function (c) { return c.id === id; })[0]; if (!p) return null;
    var o = JSON.parse(JSON.stringify(p));
//#if abstract agency
    var x = PRIV[id]; if (x) { Object.assign(o, JSON.parse(JSON.stringify(x))); o.licences = o.licences.map(function (l, i) { return Object.assign({ id: id + '-l' + i, issuingBody: (x.issuers || [])[i] || null, removedAt: null }, l); }); delete o.issuers; }
//#endif
    return o;
  }
//#if abstract agency
  function rollup(c) { if (!c.items) return c.complianceStatus; var w = Object.keys(c.items).map(function (k) { return c.items[k].status; }); return w.indexOf('Expired') >= 0 ? 'Expired' : w.indexOf('Pending') >= 0 ? 'Pending' : 'Compliant'; }
//#endif
  function dressCand(c) {
    var o = JSON.parse(JSON.stringify(c));
    o.licences = (o.licences || []).filter(function (l) { return !l.removedAt; }).map(function (l) { return Object.assign(l, { expired: !!l.expiryDate && l.expiryDate < TODAY }); });
//#if abstract agency
    o.ownerType = 'agency'; o.ownerName = agencyName(c.agencyId); o.complianceStatus = rollup(c);
    o.agencyOrgNodeName = branchName(c.agencyId, c.agencyOrgNodeId); o.jobRoleId = null; o.jobRoleTitle = null;
    o.availability = null; o.legalHold = false; o.anonymised = !!c.anonymisedAt; o.photo = null;
    o.unavailableFrom = null; o.unavailableUntil = null;
//#endif
//#if abstract
    // Abstract edits an agency's candidate (ruled 2026-11-16, R5-D1): the job role and the legal hold it set read back;
    // availability stays refused for an agency-owned record (Q11), and the photo is the one Abstract stored, if any
    o.jobRoleId = c.jobRoleId || null; o.jobRoleTitle = c.jobRoleId && window.S3 ? S3.JOB_ROLES[c.jobRoleId] || null : null;
    o.legalHold = !!c.legalHold; o.photo = c.photo || null;
//#endif
//#if agency
    // what Abstract set on the record is not the agency's to read (R5-D1): the legal hold's facts
    delete o.legalHoldReason; delete o.legalHoldSetBy; delete o.legalHoldSetAt;
//#endif
//#if client
    // a client reads a candidate's name, compliance and licence validity only (PP-006, CP-018)
    o = { id: o.id, fullName: o.fullName, complianceStatus: o.complianceStatus, licences: o.licences.map(function (l) { return { licenceType: l.licenceType, expiryDate: l.expiryDate, expired: l.expired }; }), supplyingParty: agencyName(c.agencyId) };
//#endif
    return o;
  }
  function allCandIds() { var ids = CANDS.map(function (c) { return c.id; }); db.candidates.forEach(function (c) { if (ids.indexOf(c.id) < 0) ids.push(c.id); }); return ids; }
//#if abstract
  S5.isAgencyCandidate = function (id) { return allCandIds().indexOf(id) >= 0; };
  S5.candidate = function (id) { var c = rawCand(id); return c ? dressCand(c) : null; };
  // PATCH /candidates/:id from Abstract on an agency-owned record (ruled 2026-11-16, R5-D1): Abstract edits it as it edits
  // its own, except that availability is refused for every caller on an agency's record (Q11) and the owning agency and
  // its branch are the agency's (read only here). The record a write changes is kept in the store, so the agency reads it.
  S5.rawCandidate = function (id) { var w = db.candidates.filter(function (c) { return c.id === id; })[0]; if (w) return w; var c = rawCand(id); if (!c) return null; db.candidates.push(c); return c; };
  S5.saveCandidates = function () { save(); };
  S5.act = S5.act || {};
  S5.act.updateCandidate = function (id, patch) {
    var c = S5.rawCandidate(id); if (!c) refuse('CANDIDATE_NOT_FOUND', 'We can’t find that candidate.');
    ['unavailableFrom', 'unavailableUntil', 'unavailabilityNote'].forEach(function (k) { if (patch[k] != null) refuse('CANDIDATE_FIELD_NOT_ALLOWED', 'An agency’s candidate has no availability, so it can’t be set.', { field: k }); });
    ['agencyId', 'agencyOrgNodeId'].forEach(function (k) { if (k in patch && patch[k] !== c[k]) refuse('CANDIDATE_FIELD_NOT_ALLOWED', 'The owning agency and its branch are set by the agency.', { field: k }); });
    Object.keys(patch).forEach(function (k) { if (['unavailableFrom', 'unavailableUntil', 'unavailabilityNote', 'agencyId', 'agencyOrgNodeId'].indexOf(k) < 0) c[k] = patch[k]; });
    c.updatedAt = now(); log('candidate', id, 'Record changed by Abstract'); save();
  };
//#endif
//#if agency
  // GET /candidates?ownerType=agency — the agency's own candidates (CP-020); the propose picker's source (K53)
  S5.myCandidates = function () { return allCandIds().map(rawCand).filter(function (c) { return c && c.agencyId === ME.agencyId && !c.anonymisedAt; }).map(dressCand); };
  S5.myCandidate = function (id) { var c = rawCand(id); return c && c.agencyId === ME.agencyId ? dressCand(c) : null; };
  // POST / PATCH /candidates from an agency caller: branch required, no job role, no availability, no legal hold (Q11)
  S5.act = S5.act || {};
  S5.act.saveCandidate = function (f, id) {
    if (!f.agencyOrgNodeId || !branchName(ME.agencyId, f.agencyOrgNodeId)) refuse('CANDIDATE_BRANCH_INVALID', 'Choose one of your branches for this candidate.');
    ['jobRoleId', 'legalHold', 'unavailableFrom'].forEach(function (k) { if (f[k] != null) refuse('CANDIDATE_FIELD_NOT_ALLOWED', 'An agency can’t set ' + k + ' on a candidate.', { field: k }); });
    var c = id ? rawCand(id) : null;
    if (!c) { c = { id: 'ac-n' + (++db.seq.cand), agencyId: ME.agencyId, items: items(PD, PD, PD, PD), licences: [], documents: [], createdAt: now(), createdBy: ME.userName }; }
    Object.keys(f).forEach(function (k) { c[k] = f[k]; }); c.updatedAt = now();
    db.candidates = db.candidates.filter(function (x) { return x.id !== c.id; }).concat([c]); save(); return c.id;
  };
//#endif

  // ---------- reads: proposals ----------
  function rawP(id) { return db.proposals.filter(function (p) { return p.id === id; })[0]; }
  function facts(vid) { return db.vacancies[vid] || null; }
  function dressP(p) {
    var c = rawCand(p.candidateId) || { fullName: '—', complianceStatus: 'Pending', licences: [] }, dc = dressCand(c), f = facts(p.vacancyId) || {};
    var o = { id: p.id, reference: p.reference, vacancyId: p.vacancyId, vacancyReference: f.reference || '', jobTitle: f.jobTitle || '', clientId: f.clientId || 'acme', clientName: f.clientName || '', orgNodeName: f.orgNodeName || '',
      candidateId: p.candidateId, candidateName: dc.fullName, candidateComplianceStatus: dc.complianceStatus, candidateLicences: (dc.licences || []).map(function (l) { return { licenceType: l.licenceType, expiryDate: l.expiryDate, expired: l.expired }; }),
      supplyingParty: agencyName(p.agencyId), status: p.status, submittedAt: p.submittedAt, updatedAt: p.updatedAt,
      notes: p.notes, reviewStartedAt: p.reviewStartedAt, decidedAt: p.decidedAt, decidedByParty: p.decidedByParty, decisionReason: p.decisionReason,
      positionNumber: p.positionNumber, bookingId: p.bookingId, bookingReference: p.bookingReference };
//#if abstract
    o.agencyId = p.agencyId; o.agencyName = agencyName(p.agencyId); o.decidedByName = p.decidedByName || null; o.submittedByName = p.submittedByName || agencyName(p.agencyId);
//#endif
//#if client
    // who decided reads as the party: the client sees its own user's name, Abstract as "Abstract"
    o.decidedByName = p.decidedByParty === 'client' ? p.decidedByName : p.decidedByParty === 'abstract' ? 'Abstract' : null;
//#endif
//#if agency
    o.decidedByName = p.decidedByParty === 'agency' ? p.decidedByName : null;
//#endif
    return o;
  }
  function readable(p) {
//#if abstract
    return true;
//#endif
//#if client
    var f = facts(p.vacancyId); return !!f && f.clientId === 'acme';
//#endif
//#if agency
    return p.agencyId === ME.agencyId;
//#endif
  }
  // GET /proposals: vacancyId, status (array), pending, agencyId (Abstract only), q; newest first
  S5.proposals = function (f) {
    f = f || {};
    return db.proposals.filter(readable).filter(function (p) {
      if (f.vacancyId && p.vacancyId !== f.vacancyId) return false;
      if (f.candidateId && p.candidateId !== f.candidateId) return false;
      if (f.status && f.status.length && f.status.indexOf(p.status) < 0) return false;
      if (f.pending && PENDING.indexOf(p.status) < 0) return false;
//#if abstract
      if (f.agencyId && p.agencyId !== f.agencyId) return false;
//#endif
      return true;
    }).map(dressP).filter(function (x) { return !f.q || (x.reference + ' ' + x.candidateName + ' ' + x.vacancyReference).toLowerCase().indexOf(f.q.toLowerCase()) >= 0; })
      .sort(function (a, b) { return a.submittedAt < b.submittedAt ? 1 : -1; });
  };
  S5.proposal = function (id) { var p = rawP(id); return p && readable(p) ? dressP(p) : null; };
  S5.audit = function (type, id) { return db.audit.filter(function (a) { return a.type === type && a.id === id; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; }); };
  S5.PENDING = PENDING;

  // ---------- reads: releases (Abstract only — an agency never reads a wave, another release row or the history) ----------
//#if abstract
  S5.firstReleasedAt = function (vid) { var r = db.releases.filter(function (x) { return x.vacancyId === vid; }).sort(function (a, b) { return a.releasedAt < b.releasedAt ? -1 : 1; })[0]; return r ? r.releasedAt : null; };
  // GET /vacancies/:id/releases — VacancyReleaseWave[], wave 1 first (the page draws the newest on top)
  S5.waves = function (vid) {
    var m = {}; db.releases.filter(function (x) { return x.vacancyId === vid; }).forEach(function (r) { var w = m[r.waveNumber] = m[r.waveNumber] || { waveNumber: r.waveNumber, releasedAt: r.releasedAt, releasedByName: r.releasedByName, agencies: [] }; w.agencies.push({ agencyId: r.agencyId, agencyName: agencyName(r.agencyId) }); });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return a.waveNumber - b.waveNumber; });
  };
  function approvedToday(clientId) { return APPROVALS.filter(function (l) { return l.client === clientId && l.from <= TODAY && (!l.to || l.to > TODAY); }); }
  // GET /vacancies/:id/release-options — every agency approved for the client today, by name (AB-005)
  S5.releaseOptions = function (vid, clientId) {
    var released = {}; db.releases.filter(function (x) { return x.vacancyId === vid; }).forEach(function (r) { released[r.agencyId] = r; });
    return approvedToday(clientId).map(function (l) {
      var a = AGENCIES[l.agency], r = released[l.agency];
      var reason = r ? 'already_released' : a.status !== 'Active' ? 'not_active' : null;
      return { agencyId: l.agency, agencyName: a.name, agencyStatus: a.status, approvedFrom: l.from, eligible: !reason, reason: reason, released: r ? { waveNumber: r.waveNumber, releasedAt: r.releasedAt } : null };
    }).sort(function (a, b) { return a.agencyName < b.agencyName ? -1 : 1; });
  };
//#endif

  // ---------- writes ----------
  S5.act = S5.act || {};
//#if abstract
  // POST /vacancies/:id/releases — v is the dressed vacancy (S3.vacancy). Already-released is checked before eligibility (Q3).
  S5.act.release = function (v, agencyIds, o) {
    o = o || {};
    if (['Draft', 'Closed', 'Cancelled'].indexOf(v.status) >= 0) refuse('VACANCY_STATUS_INVALID', v.reference + ' is ' + v.status + ', so it can’t be released to agencies.', { status: v.status });
    if (window.S3 && S3.CLIENTS[v.clientId].status !== 'Active') refuse('VACANCY_CLIENT_NOT_ACTIVE', v.clientName + ' is ' + S3.CLIENTS[v.clientId].status + ', so its vacancies can’t be released.');
    if (v.openCount === 0) refuse('VACANCY_NO_OPEN_POSITIONS', 'All positions filled — release is not available.');
    if (!agencyIds.length) refuse('VALIDATION_ERROR', 'Choose at least one agency.');
    var opts = S5.releaseOptions(v.id, v.clientId), by = {}; opts.forEach(function (x) { by[x.agencyId] = x; });
    var again = agencyIds.filter(function (a) { return by[a] && by[a].released; });
    if (o.simulateConflict) again = agencyIds.slice(0, 1);
    if (again.length) refuse('VACANCY_RELEASE_AGENCY_ALREADY_RELEASED', 'Already released: ' + again.map(agencyName).join(', ') + '. Nothing was released; the list now shows who has this vacancy.', { agencyIds: again, names: again.map(agencyName) });
    var bad = agencyIds.filter(function (a) { return !by[a] || !by[a].eligible; });
    if (o.simulateIneligible) bad = agencyIds.slice(-1);
    if (bad.length) refuse('VACANCY_RELEASE_AGENCY_NOT_ELIGIBLE', 'Not eligible today: ' + bad.map(agencyName).join(', ') + '. Nothing was released; the list now shows who can receive it.', { agencies: bad.map(function (a) { return { agencyId: a, reason: by[a] ? 'not_active' : 'not_approved' }; }), names: bad.map(agencyName) });
    var wave = db.releases.filter(function (x) { return x.vacancyId === v.id; }).reduce(function (m, x) { return Math.max(m, x.waveNumber); }, 0) + 1, at = now();
    agencyIds.forEach(function (a) { db.releases.push(rel(v.id, a, wave, at, S5.me)); });
    save(); if (window.S3) syncFacts(S3.vacancy(v.id), true);
    log('vacancy', v.id, 'Released to agencies, wave ' + wave + ': ' + agencyIds.map(agencyName).join(', '));
    save(); return { waveNumber: wave, releasedAt: at, releasedByName: S5.me, agencies: agencyIds.map(function (a) { return { agencyId: a, agencyName: agencyName(a) }; }) };
  };
//#endif
//#if abstract client
  function reviewer(p, what) {
    if (PENDING.indexOf(p.status) < 0) refuse('PROPOSAL_STATUS_INVALID', 'This proposal is ' + p.status + ' now, so it can’t be ' + what + '. The page shows the latest.', { status: p.status });
  }
  // POST /proposals/:id/start-review
  S5.act.startReview = function (id, o) {
    var p = rawP(id); o = o || {};
    if (o.simulateStale || p.status !== 'Submitted') refuse('PROPOSAL_STATUS_INVALID', 'This proposal is ' + (o.simulateStale ? 'Withdrawn' : p.status) + ' now, so the review can’t start. The page shows the latest.', { status: p.status });
    p.status = 'Under Review'; p.reviewStartedAt = now(); p.updatedAt = now(); log('proposal', id, 'Status: Submitted → Under Review'); save();
  };
  // POST /proposals/:id/reject — reason 1–1,000
  S5.act.reject = function (id, reason) {
    var p = rawP(id); reviewer(p, 'rejected');
    if (!reason || !reason.trim()) refuse('VALIDATION_ERROR', 'Enter a reason.', { fields: { reason: 'Enter a reason.' } });
    if (reason.length > 1000) refuse('VALIDATION_ERROR', 'Keep the reason to 1,000 characters.', { fields: { reason: 'Keep the reason to 1,000 characters.' } });
    var was = p.status; p.status = 'Rejected'; p.decidedAt = now(); p.decidedByParty = PARTY; p.decidedByName = S5.me; p.decisionReason = reason.trim(); p.updatedAt = now();
    log('proposal', id, 'Status: ' + was + ' → Rejected. Reason: ' + reason.trim()); save();
  };
  // rejectPendingOnExhaustion (§3.3.2 rule 5): a write that leaves openCount 0 rejects every other pending proposal
  function rejectPending(vid, except, status, reason) {
    var n = 0;
    db.proposals.forEach(function (p) { if (p.vacancyId !== vid || p.id === except || PENDING.indexOf(p.status) < 0) return; var was = p.status; p.status = status; p.decidedAt = now(); p.decidedByParty = 'system'; p.decidedByName = null; p.decisionReason = reason || null; p.updatedAt = now(); n++; log('proposal', p.id, 'Status: ' + was + ' → ' + status + (reason ? '. Reason: ' + reason : ''), null); });
    return n;
  }
  S5._rejectPending = rejectPending;
  // POST /bookings/from-proposal — { proposalId, positionNumber?, startDate?, endDate?, workingTimes? }
  S5.act.accept = function (id, f, o) {
    o = o || {}; var p = rawP(id); f = f || {};
    if (o.simulate === 'stale') refuse('PROPOSAL_STATUS_INVALID', 'This proposal is Withdrawn now: the agency withdrew it while you had it open. Nothing was booked.', { status: 'Withdrawn' });
    reviewer(p, 'accepted');
    var v = window.S3 ? S3.vacancy(p.vacancyId) : null; if (!v) refuse('VACANCY_NOT_FOUND', 'We can’t find the vacancy.');
    if (['Closed', 'Cancelled', 'Draft'].indexOf(v.status) >= 0) refuse('VACANCY_STATUS_INVALID', v.reference + ' is ' + v.status + ', so nothing can be booked on it.', { status: v.status });
    if (o.simulate === 'clientinactive' || S3.CLIENTS[v.clientId].status !== 'Active') refuse('VACANCY_CLIENT_NOT_ACTIVE', v.clientName + ' is ' + (o.simulate ? 'Suspended' : S3.CLIENTS[v.clientId].status) + ', so nothing can be booked on its vacancies.');
//#endif
//#if abstract
    if (o.simulate === 'agencyinactive' || AGENCIES[p.agencyId].status !== 'Active') refuse('PROPOSAL_AGENCY_NOT_ACTIVE', agencyName(p.agencyId) + ' is ' + (o.simulate ? 'Suspended' : AGENCIES[p.agencyId].status) + ', so its proposal can’t be accepted until it is Active again. It can still be rejected.');
//#endif
//#if client
    if (o.simulate === 'agencyinactive') refuse('PROPOSAL_AGENCY_NOT_ACTIVE', 'The supplying agency isn’t active at the moment, so this proposal can’t be accepted. It can still be rejected.');
//#endif
//#if abstract client
    if (o.simulate === 'anonymised') refuse('CANDIDATE_ANONYMISED', 'This candidate’s record has been anonymised, so they can’t be booked.');
    var open = v.rosterRows.filter(function (r) { return r.status === 'Open'; });
    var n = f.positionNumber || (open[0] && open[0].n);
    var pos = v.rosterRows.filter(function (r) { return r.n === n; })[0];
    if (!pos) refuse('POSITION_NOT_FOUND', 'Position ' + n + ' doesn’t exist on this vacancy.');
    if (o.simulate === 'taken' || pos.status !== 'Open') refuse('POSITION_NOT_OPEN', 'Position ' + n + ' is no longer open: it was filled a moment ago. Choose another open position.');
    var start = f.startDate || v.startDate, end = f.endDate || v.endDate;
    if (end < start) refuse('BOOKING_DATES_INVALID', 'The end date is before the start date. Choose an end on or after ' + fmtDate(start) + '.');
    if (start < v.startDate || end > v.endDate) refuse('BOOKING_DATES_OUTSIDE_VACANCY', 'The dates must fall within the vacancy, ' + fmtDate(v.startDate) + ' to ' + fmtDate(v.endDate) + '.');
    var c = rawCand(p.candidateId), bid = 'b' + (++db.seq.bk), started = start <= TODAY;
    var b = abk({ id: bid, reference: 'BK-' + db.seq.bk, vacancyId: v.id, vacancyReference: v.reference, jobTitle: v.jobTitle, positionNumber: n, candidateId: p.candidateId, candidateName: c.fullName, clientId: v.clientId, clientName: v.clientName, orgNodeId: v.orgNodeId, orgNodeName: v.orgNodeName, orgNodePath: v.orgNodePath, jobRoleId: v.jobRoleId, jobRoleTitle: v.jobRoleTitle, shiftId: v.shiftId, shiftName: v.shiftName, startDate: start, endDate: end, workingTimes: f.workingTimes || v.workingTimes, status: started ? 'Active' : 'Pending Start', startedAt: started ? now() : null, agencyId: p.agencyId, proposalId: p.id, createdAt: now(), createdBy: S5.me });
    db.bookings.unshift(b);
    var was = p.status; p.status = 'Accepted'; p.decidedAt = now(); p.decidedByParty = PARTY; p.decidedByName = S5.me; p.positionNumber = n; p.bookingId = bid; p.bookingReference = b.reference; p.updatedAt = now();
    log('proposal', p.id, 'Status: ' + was + ' → Accepted. Position ' + n + ', booking ' + b.reference);
    log('booking', bid, 'Booking created from an accepted proposal');   // no proposal reference on a booking (ruled 2026-11-16, R5-G1)
    var left = open.length - 1, auto = left === 0 ? rejectPending(v.id, p.id, 'Rejected (Position Filled)') : 0;
    save(); if (window.S3) syncFacts(S3.vacancy(v.id));
    return { bookingId: bid, bookingReference: b.reference, positionNumber: n, autoRejected: auto };
  };
//#endif
//#if agency
  function myFacts(vid) { var f = facts(vid), r = db.releases.filter(function (x) { return x.vacancyId === vid && x.agencyId === ME.agencyId; })[0]; return f && r ? { f: f, r: r } : null; }
  // the cap (PP-007, PP-014, CFG-010; Q6): min(openCount, proposals.max_per_vacancy) — the key resolves to 2 for TechForce today
  var MAX_PER_VACANCY = 2;
  S5.MAX_PER_VACANCY = MAX_PER_VACANCY;
  function dressRV(vid) {
    var m = myFacts(vid); if (!m) return null; var f = m.f;
    var mine = db.proposals.filter(function (p) { return p.vacancyId === vid && p.agencyId === ME.agencyId && PENDING.indexOf(p.status) >= 0; }).length;
    // ReleasedVacancySummary / ReleasedVacancy (TSD §3.3.1): never a wave, the roster, the total or another agency
    return { id: vid, reference: f.reference, jobTitle: f.jobTitle, jobRoleTitle: f.jobRoleTitle, clientId: f.clientId, clientName: f.clientName, orgNodeName: f.orgNodeName, status: f.status, openCount: f.openCount, startDate: f.startDate, endDate: f.endDate, closeDate: f.closeDate, shiftName: f.shiftName, workingTimes: f.workingTimes, payRate: PAY[vid] || f.payRate || null, releasedAt: m.r.releasedAt, myPendingCount: mine, myProposalCap: Math.min(f.openCount, MAX_PER_VACANCY), description: f.description, requirements: f.requirements };
  }
  // The agency pay rate of each seeded released vacancy (VacancyRate.agencyPayRate, slice 2's card); a vacancy released
  // later carries it in its facts. This copy holds no charge rate.
  var PAY = { v1041: '14.10', v1042: '15.90', v1043: '15.70', v1047: '14.10', v1050: '13.20' };
  S5.releasedVacancies = function () { return db.releases.filter(function (r) { return r.agencyId === ME.agencyId; }).map(function (r) { return dressRV(r.vacancyId); }).filter(Boolean).sort(function (a, b) { return a.releasedAt < b.releasedAt ? 1 : -1; }); };
  S5.releasedVacancy = function (vid) { return dressRV(vid); };
  // POST /proposals — refusals in the TSD's order (§3.1.2)
  S5.act.propose = function (vid, candidateId, notes) {
    var v = dressRV(vid); if (!v) refuse('RELEASED_VACANCY_NOT_FOUND', 'We can’t find that vacancy.');
    if (['Closed', 'Cancelled'].indexOf(v.status) >= 0) refuse('VACANCY_STATUS_INVALID', v.reference + ' is ' + v.status + ', so it takes no new proposal.', { status: v.status });
    var c = S5.myCandidate(candidateId); if (!c) refuse('CANDIDATE_NOT_FOUND', 'Choose one of your candidates.');
    if (c.anonymised) refuse('PROPOSAL_CANDIDATE_INVALID', c.fullName + '’s record is anonymised, so they can’t be proposed.', { reason: 'anonymised' });
    var dup = db.proposals.filter(function (p) { return p.vacancyId === vid && p.candidateId === candidateId && (PENDING.indexOf(p.status) >= 0 || p.status === 'Accepted'); })[0];
    if (dup) refuse('PROPOSAL_CANDIDATE_DUPLICATE', c.fullName + ' is already proposed on this vacancy (' + dup.reference + ').', { proposalId: dup.id });
    if (v.openCount === 0) refuse('VACANCY_NO_OPEN_POSITIONS', 'Every position on this vacancy is filled, so it takes no new proposal.');
    if (v.myPendingCount + 1 > v.myProposalCap) refuse('PROPOSAL_CAP_REACHED', 'You have reached your proposal limit for this vacancy (' + v.myPendingCount + ' of ' + v.myProposalCap + ').', { pending: v.myPendingCount, openCount: v.openCount, maxPerVacancy: MAX_PER_VACANCY });
    if (!notes || !notes.trim()) refuse('VALIDATION_ERROR', 'Say why this candidate suits the vacancy.', { fields: { notes: 'Say why this candidate suits the vacancy.' } });
    if (notes.length > 2000) refuse('VALIDATION_ERROR', 'Keep the notes to 2,000 characters.', { fields: { notes: 'Keep the notes to 2,000 characters.' } });
    var n = ++db.seq.prp, p = prp(n, vid, candidateId, ME.agencyId, 'Submitted', now(), { notes: notes.trim(), submittedByName: ME.userName });
    db.proposals.push(p); log('proposal', p.id, 'Proposal submitted'); save(); return p.id;
  };
  // PATCH /proposals/:id { notes } — only while Submitted
  S5.act.editNotes = function (id, notes, o) {
    var p = rawP(id); o = o || {};
    if (o.simulateStale || p.status !== 'Submitted') refuse('PROPOSAL_STATUS_INVALID', 'This proposal is ' + (o.simulateStale ? 'Under Review' : p.status) + ' now, so its notes can’t be changed. The page shows the latest.', { status: p.status });
    if (!notes || !notes.trim()) refuse('VALIDATION_ERROR', 'Say why this candidate suits the vacancy.', { fields: { notes: 'Say why this candidate suits the vacancy.' } });
    p.notes = notes.trim(); p.updatedAt = now(); log('proposal', id, 'Notes changed'); save();
  };
  // POST /proposals/:id/withdraw { reason? } — while pending
  S5.act.withdraw = function (id, reason, o) {
    var p = rawP(id); o = o || {};
    if (o.simulateStale || PENDING.indexOf(p.status) < 0) refuse('PROPOSAL_STATUS_INVALID', 'This proposal is ' + (o.simulateStale ? 'Accepted' : p.status) + ' now, so it can’t be withdrawn. The page shows the latest.', { status: p.status });
    var was = p.status; p.status = 'Withdrawn'; p.decidedAt = now(); p.decidedByParty = 'agency'; p.decidedByName = ME.userName; p.decisionReason = reason ? reason.trim() : null; p.updatedAt = now();
    log('proposal', id, 'Status: ' + was + ' → Withdrawn'); save();
  };
//#endif

  // ---------- Agency-sourced bookings ----------
  function rawAB(id) { return db.bookings.filter(function (b) { return b.id === id; })[0]; }
  S5.isAgencyBooking = function (id) { return !!rawAB(id); };
//#if agency
  // GET /bookings for an agency caller: its own Agency-sourced bookings; agencyPayRate only, no source (BK-004, R1-D10)
  function dressAgencyB(b) { return { id: b.id, reference: b.reference, candidateId: b.candidateId, candidateName: b.candidateName, jobRoleTitle: b.jobRoleTitle, clientName: b.clientName, orgNodeName: b.orgNodeName, startDate: b.startDate, endDate: b.endDate, shiftName: b.shiftName, workingTimes: b.workingTimes, status: b.status, payRate: PAY[b.vacancyId] || null, proposalId: b.proposalId, supplyingParty: ME.agencyName, cancelledAt: b.cancelledAt, cancellationReason: b.cancellationReason }; }
  S5.agencyBookings = function () { return db.bookings.filter(function (b) { return b.agencyId === ME.agencyId; }).map(dressAgencyB).sort(function (a, b) { return a.startDate < b.startDate ? 1 : -1; }); };
  S5.agencyBooking = function (id) { var b = rawAB(id); return b && b.agencyId === ME.agencyId ? dressAgencyB(b) : null; };
//#endif
//#if client

  // ---------- the Candidate Directory (B3; TSD §3.3.3 rule 4, CandidateDirectoryRow; CP-017, CP-018, CP-019, DV-010) ----------
  // GET /candidate-directory: one row per candidate with at least one booking, in any status, at a node of the client in
  // the caller's subtree (Rachel Green's is the whole of Acme); an anonymised candidate is never a row. Every field is open:
  // no personal data, no pay, no charge, no margin, no source (CP-019, CP-022). A pool candidate's compliance and licence
  // validity are the open facts its slice 3 record rolls up to (Abstract's slice3-proto.js); this copy holds those alone.
  var POOL_FACTS = {
    'c-mo': { complianceStatus: 'Compliant', licences: [lic('Reach truck (RTITB)', '2027-08-31')] },
    'c-tw': { complianceStatus: 'Compliant', licences: [lic('Reach truck (RTITB)', '2026-09-30')] },
    'c-sa': { complianceStatus: 'Compliant', licences: [] },
    'c-lk': { complianceStatus: 'Pending', licences: [] },
    'c-ra': { complianceStatus: 'Compliant', licences: [lic('Counterbalance (ITSSAR)', '2027-02-28')] },
    'c-er': { complianceStatus: 'Expired', licences: [] },
    'c-gh': { complianceStatus: 'Compliant', licences: [] },
    'c-mo2': { complianceStatus: 'Compliant', licences: [] }
  };
  var COMPLIANCE = ['Compliant', 'Pending', 'Expired'];
  S5.COMPLIANCE = COMPLIANCE;
  function directoryRows() {
    var by = {};
    (window.S3 ? S3.bookings() : []).forEach(function (b) { if (S3.clientId && b.clientId !== S3.clientId) return; (by[b.candidateId] = by[b.candidateId] || []).push(b); });
    return Object.keys(by).map(function (id) {
      var list = by[id].slice().sort(function (a, b) { return a.startDate < b.startDate ? 1 : -1; }), latest = list[0], c = rawCand(id), facts, party;
      if (c) { if (c.anonymisedAt) return null; facts = dressCand(c); party = facts.supplyingParty; }
      else { facts = POOL_FACTS[id]; if (!facts) return null; party = 'Abstract'; }
      return { candidateId: id, fullName: c ? facts.fullName : latest.candidateName, jobRoleTitle: latest.jobRoleTitle, supplyingParty: party, complianceStatus: facts.complianceStatus,
        licences: (facts.licences || []).map(function (l) { return { licenceType: l.licenceType, expiryDate: l.expiryDate, expired: !!l.expiryDate && l.expiryDate < TODAY }; }),
        lastBookedFrom: latest.startDate, bookingCount: list.length };
    }).filter(Boolean).sort(function (a, b) { return a.fullName < b.fullName ? -1 : 1; });
  }
  // f: { q, jobRoleId, complianceStatus, supplyingParty }; a value outside the lists answers 422 VALIDATION_ERROR
  S5.directory = function (f) {
    f = f || {};
    var rows = directoryRows(), parties = S5.directoryParties(rows);
    if (f.jobRoleId && !(window.S3 && S3.JOB_ROLES[f.jobRoleId])) refuse('VALIDATION_ERROR', 'Choose a job role from the list.', { fields: { jobRoleId: 'That job role doesn’t exist. Choose one from the list.' } });
    if (f.complianceStatus && COMPLIANCE.indexOf(f.complianceStatus) < 0) refuse('VALIDATION_ERROR', 'Choose a compliance status from the list.', { fields: { complianceStatus: 'Choose Compliant, Pending or Expired.' } });
    if (f.supplyingParty && parties.indexOf(f.supplyingParty) < 0) refuse('VALIDATION_ERROR', 'Choose a supplying party from the list.', { fields: { supplyingParty: 'Choose a supplying party from the list.' } });
    if (f.q && f.q.length > 100) refuse('VALIDATION_ERROR', 'Keep the search to 100 characters.', { fields: { q: 'Keep the search to 100 characters.' } });
    return rows.filter(function (r) {
      if (f.jobRoleId && r.jobRoleTitle !== S3.JOB_ROLES[f.jobRoleId]) return false;
      if (f.complianceStatus && r.complianceStatus !== f.complianceStatus) return false;
      if (f.supplyingParty && r.supplyingParty !== f.supplyingParty) return false;
      return !f.q || r.fullName.toLowerCase().indexOf(f.q.trim().toLowerCase()) >= 0;
    });
  };
  // the supplying-party filter's options: Abstract and the agencies as this client reads them (Agency when its key is off)
  S5.directoryParties = function (rows) { var m = {}; (rows || directoryRows()).forEach(function (r) { m[r.supplyingParty] = 1; }); return Object.keys(m).sort(function (a, b) { return a === 'Abstract' ? -1 : b === 'Abstract' ? 1 : a < b ? -1 : 1; }); };
//#endif

  // ---------- absence confirmation (TSD §3.3.7) ----------
  var INVOICED = [
    // Prototype stand-in for slice 6's timesheet_invoiced_periods: one booking-week counts as invoiced, so the agency's
    // pay figures (§3.3.6 rule 3) and the "can't reopen" rule have a week to show on. Slice 5 writes no such row.
    { bookingId: 'b2210', weekStart: '2026-09-28', invoicedAt: '2026-10-07T10:00:00' }
  ];
  function invoiced(bookingId, ws) { return INVOICED.filter(function (r) { return r.bookingId === bookingId && r.weekStart === ws; })[0] || null; }
  S5.invoiced = invoiced;
  function confKey(bookingId, date) { return bookingId + '|' + date; }
  function confState(bookingId, date, dayStatus) {
    if (ABSENCES.indexOf(dayStatus) < 0) return null;
    var c = db.confirmations[confKey(bookingId, date)];
    return c ? (c.justification ? 'Justified' : 'Requested (awaiting agency)') : 'Not Requested';
  }
  function confOf(bookingId, date) {
    var c = db.confirmations[confKey(bookingId, date)]; if (!c) return null;
    var o = { requestedAt: c.requestedAt, requestedByParty: c.requestedByParty, justification: c.justification, justifiedAt: c.justifiedAt };
//#if abstract client
    o.requestedByName = c.requestedByName; o.justifiedByName = c.justifiedByName;
//#endif
    return o;
  }
  S5.confState = confState; S5.confirmation = confOf;
//#if agency
  // POST /timesheets/:id/days/:date/justification — the agency's one timesheet write, any week status (TS-022, XR-014)
  S5.act.justify = function (bookingId, date, reason, o) {
    o = o || {}; var b = rawAB(bookingId); if (!b || b.agencyId !== ME.agencyId) refuse('TIMESHEET_NOT_FOUND', 'We can’t find that week.');
    var c = db.confirmations[confKey(bookingId, date)];
    if (o.simulateStale || !c || c.justification) refuse('TIMESHEET_CONFIRMATION_STATE_INVALID', 'This day is ' + (o.simulateStale ? 'Justified' : c ? 'Justified' : 'no longer waiting for a reason') + ' now. The week shows the latest.', { confirmationState: c && c.justification ? 'Justified' : 'Not Requested' });
    if (!reason || !reason.trim()) refuse('VALIDATION_ERROR', 'Give the reason for the absence.', { fields: { reason: 'Give the reason for the absence.' } });
    if (reason.length > 1000) refuse('VALIDATION_ERROR', 'Keep the reason to 1,000 characters.', { fields: { reason: 'Keep the reason to 1,000 characters.' } });
    c.justification = reason.trim(); c.justifiedAt = now(); c.justifiedByName = ME.userName; save();
  };
  // AgencyBookingWeeks' source: each week's days as the agency reads them (§3.3.6). The Abstract and client copies write a
  // snapshot when they read the week (store.weeks); until one has, the seed below stands in. Pay figures only on an
  // invoiced week, worked out here from the hours and the booking's agency pay rate.
  var WEEKS_SEED = [
    { id: 'ts-s5-1', bookingId: 'b2210', weekStart: '2026-09-28', status: 'Approved', days: [
      { date: '2026-09-28', dayStatus: 'Worked', hours: '8.00', shiftName: 'Afternoon' }, { date: '2026-09-29', dayStatus: 'Worked', hours: '8.00', shiftName: 'Afternoon' },
      { date: '2026-09-30', dayStatus: 'Sick Leave', absenceComment: 'Phoned the branch before the shift.', absencePay: 'Paid', shiftName: 'Afternoon' },
      { date: '2026-10-01', dayStatus: 'No-show', absencePay: 'Paid', overridden: true, shiftName: 'Afternoon' },
      { date: '2026-10-02', dayStatus: 'Worked', hours: '8.00', shiftName: 'Afternoon' }, { date: '2026-10-03', dayStatus: 'Not Booked' }, { date: '2026-10-04', dayStatus: 'Not Booked' }] },
    { id: 'ts-s5-2', bookingId: 'b2210', weekStart: '2026-10-05', status: 'Draft', days: [
      { date: '2026-10-05', dayStatus: 'Worked', hours: '8.00', shiftName: 'Afternoon' }, { date: '2026-10-06', dayStatus: 'Worked', hours: '8.00', shiftName: 'Afternoon' },
      { date: '2026-10-07', dayStatus: 'No-show', absenceComment: 'Did not arrive; the site called the branch at 14:30.', absencePay: 'Unpaid' },
      { date: '2026-10-08', dayStatus: 'Sick Leave', absenceComment: 'Texted the site at 12:00.', absencePay: 'Paid', shiftName: 'Afternoon' },
      { date: '2026-10-09', dayStatus: 'Worked', hours: '8.00', shiftName: 'Afternoon' }, { date: '2026-10-10', dayStatus: null }, { date: '2026-10-11', dayStatus: null }] }
  ];
  // The agency's own Agency Net Margin on an invoiced booking-week (ruled 2026-11-16, slice 5 TSD review R5-D7; §3.3.6
  // rule 3 sends it): per day agencyCost − (workerGrossPay + Σ statutory), worked out as the server works it out with slice
  // 4's engine — the worker's gross pay at the rate card line's worker pay rate × the hours, and the statutory costs at the
  // engine's rates (employer's NI 15 %, WTR accrual 12.07 %, pension 3 %, apprenticeship levy 0.5 %), each rounded per day.
  // Only the margin is drawn: this copy uses these inputs for nothing else, and holds no charge rate and no Abstract margin.
  var WORKER_RATE = { v1042: '14.50' }, STAT_BP = [1500, 1207, 300, 50];
  function netMargin(vid, y, agencyCost) {
    var r = WORKER_RATE[vid]; if (!r) return null;
    var wgp = Math.round(Math.round(Number(r) * 100) * Number(y.hours || '8.00')), stat = STAT_BP.reduce(function (m, bp) { return m + Math.round(wgp * bp / 10000); }, 0);
    return ((Math.round(Number(agencyCost) * 100) - (wgp + stat)) / 100).toFixed(2);
  }
  S5.agencyWeeks = function (bookingId) {
    var b = rawAB(bookingId); if (!b || b.agencyId !== ME.agencyId) return [];
    var live = Object.keys(db.weeks).map(function (k) { return db.weeks[k]; }).filter(function (w) { return w.bookingId === bookingId; });
    var list = live.length ? live : WEEKS_SEED.filter(function (w) { return w.bookingId === bookingId; });
    var rate = PAY[b.vacancyId] || null;
    return list.map(function (w) {
      var inv = invoiced(bookingId, w.weekStart), o = { id: w.id, bookingId: bookingId, weekStart: w.weekStart, status: w.status, invoicedAt: inv ? inv.invoicedAt : null };
      o.days = w.days.map(function (y) {
        var x = { date: y.date, dayStatus: y.dayStatus, hours: y.hours || null, shiftName: y.shiftName || null, absenceComment: y.absenceComment || null, absencePay: y.absencePay || null, overridden: !!y.overridden, inRange: y.inRange !== false, confirmationState: confState(bookingId, y.date, y.dayStatus), confirmation: confOf(bookingId, y.date) };
        // pay figures (pay columns) only on an invoiced booking-week; absent, not null, otherwise
        if (inv && rate && (y.dayStatus === 'Worked' || y.absencePay === 'Paid')) { x.agencyPayRate = rate; x.agencyCost = (Math.round(Number(rate) * Number(y.hours || '8.00') * 100) / 100).toFixed(2); x.agencyNetMargin = netMargin(b.vacancyId, y, x.agencyCost); }
        return x;
      });
      if (inv) o.agencyCost = o.days.reduce(function (m, x) { return m + (x.agencyCost ? Number(x.agencyCost) : 0); }, 0).toFixed(2);
      // the agency's own Agency Net Margin, on an invoiced week only (R5-D7): the Σ of the days', in pence
      if (inv && o.days.some(function (x) { return x.agencyNetMargin != null; })) o.agencyNetMargin = (o.days.reduce(function (m, x) { return m + (x.agencyNetMargin != null ? Math.round(Number(x.agencyNetMargin) * 100) : 0); }, 0) / 100).toFixed(2);
      return o;
    }).sort(function (a, b2) { return a.weekStart < b2.weekStart ? 1 : -1; });
  };
  // GET /pay-statements, /pay-statements/:id for an agency caller (TS-100; TSD §3.3.8): its own workers' statements. A
  // statement exists once its week is approved (slice 4 §3.3.5: written at approval) — here, a week of AgencyBookingWeeks
  // whose status is Approved, Invoiced or Adjusted. One line per Worked day and Paid absence; the job role is the
  // booking's (the agency's week projection carries no covered role). The pay fields (agencyPayRate, agencyAmount,
  // agencyGrossPay) are present only on an invoiced booking-week (§3.3.6 rule 3): absent, not null, otherwise. No worker
  // pay (abstract_margin), no charge and no source are in this copy.
  var PS_GENERATED = { 'ts-s5-1': '2026-10-05T09:30:00' };
  function agencyStatement(w, b) {
    var lines = w.days.filter(function (y) { return y.dayStatus === 'Worked' || (ABSENCES.indexOf(y.dayStatus) >= 0 && y.absencePay === 'Paid'); }).map(function (y) {
      var l = { date: y.date, dayStatus: y.dayStatus, shiftName: y.shiftName || b.shiftName || null, jobRoleWorkedTitle: b.jobRoleTitle, hourType: 'Standard', hours: y.hours || '8.00', overridden: y.overridden };
      if (y.agencyPayRate) { l.agencyPayRate = y.agencyPayRate; l.agencyAmount = y.agencyCost; }
      return l;
    });
    var s = { id: 'ps-' + w.id + '-v1', timesheetId: w.id, bookingId: b.id, bookingReference: b.reference, candidateId: b.candidateId, candidateName: b.candidateName, clientName: b.clientName, orgNodeName: b.orgNodeName, jobRoleTitle: b.jobRoleTitle, supplyingParty: ME.agencyName, weekStart: w.weekStart, version: 1, supersededAt: null, generatedAt: PS_GENERATED[w.id] || null, invoicedAt: w.invoicedAt, totalHours: lines.reduce(function (m, l) { return m + Number(l.hours); }, 0).toFixed(2), lines: lines };
    if (w.invoicedAt) s.agencyGrossPay = lines.reduce(function (m, l) { return m + (l.agencyAmount ? Number(l.agencyAmount) : 0); }, 0).toFixed(2);
    return s;
  }
  S5.agencyPayStatements = function () {
    var out = [];
    db.bookings.filter(function (b) { return b.agencyId === ME.agencyId; }).forEach(function (raw) {
      var b = dressAgencyB(raw);
      S5.agencyWeeks(raw.id).forEach(function (w) { if (['Approved', 'Invoiced', 'Adjusted'].indexOf(w.status) >= 0) out.push(agencyStatement(w, b)); });
    });
    return out.sort(function (a, b2) { return a.weekStart < b2.weekStart ? 1 : a.weekStart > b2.weekStart ? -1 : a.candidateName < b2.candidateName ? -1 : 1; });
  };
  S5.agencyPayStatement = function (id) { return S5.agencyPayStatements().filter(function (s) { return s.id === id; })[0] || null; };
//#endif

  // ---------- the overlay on slice 3 (Abstract and client): Agency-sourced bookings, a released vacancy's status ----------
//#if abstract client
  // store each released vacancy's agency-facing facts and open count, for the agency's copy
  function syncFacts(v, force) {
    if (!v) return;
    var released = db.releases.some(function (x) { return x.vacancyId === v.id; }); if (!released && !force) return;
    var st = ['Filled', 'Closed', 'Cancelled'].indexOf(v.status) >= 0 ? v.status : 'Released to Agencies';
    var cur = db.vacancies[v.id] || {}, next = { id: v.id, reference: v.reference, jobTitle: v.jobTitle, jobRoleTitle: v.jobRoleTitle, clientId: v.clientId, clientName: v.clientName, orgNodeName: v.orgNodeName, startDate: v.startDate, endDate: v.endDate, closeDate: v.closeDate, shiftName: v.shiftName, workingTimes: v.workingTimes, description: v.description, requirements: v.requirements, openCount: v.openCount, status: st, firstReleasedAt: v.firstReleasedAt || cur.firstReleasedAt || null };
//#endif
//#if abstract
    if (v.rate) next.payRate = v.rate.pay;
//#endif
//#if abstract client
    if (cur.payRate && !next.payRate) next.payRate = cur.payRate;
    if (JSON.stringify(cur) !== JSON.stringify(next)) { db.vacancies[v.id] = next; save(); }
  }
  S5.syncFacts = syncFacts;
  if (window.S3) (function () {
    var _vacs = S3.vacancies, _vac = S3.vacancy, _bks = S3.bookings, _bk = S3.booking, A = S3.act;
    function rawVacancyStatus(o, v) {
      if (v.cancelledAt) return 'Cancelled';
      if (v.closedAt && (!v.reopenedAt || v.closedAt > v.reopenedAt) && o.openCount === 0) return 'Closed';
      if (!v.publishedAt) return 'Draft';
      if (o.openCount === 0 && o.filledCount > 0) return 'Filled';
      if (o.filledCount > 0) return 'Partially Filled';
      if (o.firstReleasedAt) return 'Released to Agencies';      // the step slice 5 adds (TSD §3.3.1 rule 1)
      return 'Open (Abstract Tier)';
    }
    // the first wave's time: Abstract's copy reads the release rows, the client's the vacancy's facts (it holds no release row)
    function firstReleased(vid) { var r = db.releases.filter(function (x) { return x.vacancyId === vid && x.agencyId; }).sort(function (a, b) { return a.releasedAt < b.releasedAt ? -1 : 1; })[0]; if (r) return r.releasedAt; var f = db.vacancies[vid]; return f && f.firstReleasedAt || null; }
    function overlayV(v) {
      if (!on()) return v;
      var o = Object.assign({}, v), ab = db.bookings.filter(function (b) { return b.vacancyId === v.id && b.status !== 'Cancelled'; });
      o.rosterRows = v.rosterRows.map(function (r) {
        var x = Object.assign({}, r), b = ab.filter(function (y) { return y.positionNumber === r.n; })[0];
        if (b) Object.assign(x, { status: 'Filled', bookingId: b.id, bookingReference: b.reference, candidateName: b.candidateName, candidateId: b.candidateId, filledAt: b.createdAt, bookingStartDate: b.startDate, supplyingParty: agencyName(b.agencyId), cancelledAt: null, cancelledReason: null });
//#endif
//#if abstract
        if (b) { x.source = 'Agency-sourced'; x.agencyId = b.agencyId; x.agencyName = agencyName(b.agencyId); } else if (x.bookingId) x.source = 'Abstract-sourced';
//#endif
//#if abstract client
        return x;
      });
      o.openCount = o.rosterRows.filter(function (r) { return r.status === 'Open'; }).length;
      o.filledCount = o.rosterRows.filter(function (r) { return r.status === 'Filled'; }).length;
      o.cancelledCount = o.rosterRows.filter(function (r) { return r.status === 'Cancelled'; }).length;
      o.positionCount = o.openCount + o.filledCount;
      o.firstReleasedAt = firstReleased(v.id); o.fulfillmentTier = o.firstReleasedAt ? 2 : 1;
      o.status = rawVacancyStatus(o, v);
      syncFacts(o);
      return o;
    }
    function dressAB(b) {
      var v = _vac(b.vacancyId), r = S3.resolveRate(b.jobRoleId, b.clientId, b.orgNodeId, b.shiftId);
      var o = Object.assign({}, b, { clientName: S3.CLIENTS[b.clientId].name, jobRoleTitle: S3.JOB_ROLES[b.jobRoleId], orgNodeName: S3.nodeName(b.clientId, b.orgNodeId), orgNodePath: S3.nodePath(b.clientId, b.orgNodeId), shiftName: S3.shiftName(b.clientId, b.shiftId), vacancyReference: v ? v.reference : b.vacancyReference, jobTitle: v ? v.jobTitle : b.jobTitle, positionTotal: v ? overlayV(v).positionCount : 0, rate: r, chargeRate: r ? r.charge : null, supplyingParty: agencyName(b.agencyId) });
//#endif
//#if abstract
      o.source = 'Agency-sourced'; o.agencyName = agencyName(b.agencyId);
      o.proposalReference = (rawP(b.proposalId) || {}).reference || null;
//#endif
//#if client
      // a client never reads the source or the agency's id (XR-001, DV-006)
      delete o.source; delete o.agencyId;
//#endif
//#if abstract client
      return o;
    }
    function overlayB(b) {
      if (!b || !on()) return b;
      var o = Object.assign({}, b); o.proposalId = null;
//#endif
//#if abstract
      o.source = 'Abstract-sourced'; o.agencyId = null; o.agencyName = null;
//#endif
//#if abstract client
      return o;
    }
    S3.vacancies = function () { return _vacs().map(overlayV); };
    S3.vacancy = function (id) { var v = _vac(id); return v ? overlayV(v) : v; };
    S3.bookings = function () { var r = _bks().map(overlayB); return on() ? db.bookings.filter(function (b) { return !S3.clientId || b.clientId === S3.clientId; }).map(dressAB).concat(r) : r; };
    S3.booking = function (id) { var a = rawAB(id); if (a) return on() && (!S3.clientId || a.clientId === S3.clientId) ? dressAB(a) : null; return overlayB(_bk(id)); };
//#endif
//#if abstract
    // Abstract reads both owners (§3.3.3 rule 3): the candidate's record link opens an agency's candidate too; the Worker
    // Pool's list (S3.candidates) stays the pool's alone, as the page sends ownerType=abstract (TV-7).
    var _cand = S3.candidate;
    S3.candidate = function (id) { if (on() && S5.isAgencyCandidate(id)) return S5.candidate(id); return _cand(id); };
    // and edits it (ruled 2026-11-16, R5-D1): the record pages' writes on an agency's candidate land in this store
    var _rawC = S3.rawCandidate, _saveC = S3.saveCandidates, _updC = S3.act.updateCandidate;
    S3.rawCandidate = function (id) { if (on() && S5.isAgencyCandidate(id)) return S5.rawCandidate(id); return _rawC(id); };
    S3.saveCandidates = function () { _saveC(); if (on()) save(); };
    S3.act.updateCandidate = function (id, patch) { if (on() && S5.isAgencyCandidate(id)) return S5.act.updateCandidate(id, patch); return _updC(id, patch); };
    // the BookingSourceBadge's second value (design-tokens §4: teal, fa-handshake-angle)
    var _src = S3.ui.source;
    S3.ui.source = function (s) { return s === 'Agency-sourced' ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-teal-50 text-teal-700 border border-teal-200"><i class="fa-solid fa-handshake-angle text-[10px]" aria-hidden="true"></i>Agency-sourced</span>' : _src(); };
    // the ActiveBookingsCard gains By agency on Abstract's dashboard (BK-010, byAgency abstract_only)
    var _card = S3.activeBookingsCard;
    S3.activeBookingsCard = function (host, state) {
      _card(host, state);
      if (!on() || ['loading', 'error', 'denied'].indexOf(state) >= 0) return;
      var sec = host.querySelector('section'); if (!sec) return;
      var by = {}; S3.bookings().filter(function (b) { return b.source === 'Agency-sourced' && (b.status === 'Active' || b.status === 'Extended'); }).forEach(function (b) { by[b.agencyId] = by[b.agencyId] || { id: b.agencyId, name: b.agencyName, n: 0 }; by[b.agencyId].n++; });
      var rows = state === 'empty' ? [] : Object.keys(by).map(function (k) { return by[k]; });
      if (state === 'large') { rows = []; for (var i = 1; i <= 14; i++) rows.push({ id: 'techforce', name: 'Agency ' + i, n: 30 - i }); }
      rows.sort(function (a, b) { return b.n - a.n; });
      var top = rows.slice(0, 10), widest = Math.max.apply(null, top.map(function (r) { return r.n; }).concat([1])), C = S3.C;
      sec.insertAdjacentHTML('beforeend', '<h3 class="mt-4 mb-2 text-xs font-semibold tracking-wider text-slate-600 uppercase">By agency</h3>' + (top.length ? '<ul class="flex flex-col gap-2">' + top.map(function (r) { return '<li class="flex flex-col gap-1"><span class="flex items-baseline justify-between gap-3 text-sm"><a class="' + C.link + ' truncate" href="abstract.bookings.bookings.html?status=Active,Extended&agency=' + encodeURIComponent(r.id) + '">' + esc(r.name) + '</a><span class="font-semibold text-slate-900 tnum">' + r.n + '</span></span><span class="h-1.5 w-full rounded-full bg-slate-100" aria-hidden="true"><span class="block h-1.5 rounded-full bg-teal-600" style="width:' + Math.round(r.n / widest * 100) + '%"></span></span></li>'; }).join('') + '</ul>' + (rows.length > 10 ? '<p class="mt-3 text-sm"><a class="' + C.link + '" href="abstract.bookings.bookings.html?status=Active,Extended&source=Agency-sourced">All</a> <span class="text-slate-600">and ' + (rows.length - 10) + ' more agencies</span></p>' : '') : '<p class="text-sm text-slate-600">No Agency-sourced bookings are active</p>'));
    };
//#endif
//#if abstract client
    // the writes: an Agency-sourced booking's own lifecycle, and the proposals a fill, a close or a cancel rejects
    function bookingActive(b) { if (S3.CLIENTS[b.clientId].status !== 'Active') refuse('BOOKING_CLIENT_NOT_ACTIVE', 'This client is ' + S3.CLIENTS[b.clientId].status + ', so its bookings take no extension, amendment or manual start or completion. A booking can still be cancelled.'); }
    function exhausted(vid) { var v = S3.vacancy(vid); if (v && v.openCount === 0 && ['Closed', 'Cancelled'].indexOf(v.status) < 0) rejectPending(vid, null, 'Rejected (Position Filled)'); syncFacts(v); save(); }
    var wrap = {
      fill: function (orig, f) {
        if (on()) { var v = S3.vacancy(f.vacancyId), r = v && v.rosterRows.filter(function (x) { return x.n === f.positionNumber; })[0]; if (r && r.status !== 'Open') refuse('POSITION_NOT_OPEN', 'Position ' + r.n + ' is no longer open: it reads ' + r.status + '. Go back to the vacancy to see who filled it.'); }
        var id = orig(f); if (on()) exhausted(f.vacancyId); return id;
      },
      changeCount: function (orig, id, n) {
        if (on()) { var v = S3.vacancy(id); if (n < v.filledCount) refuse('VACANCY_POSITION_COUNT_BELOW_FILLED', 'The count can’t go below the ' + v.filledCount + ' filled positions. Nothing was changed.', { filledCount: v.filledCount }); }
        orig(id, n); if (on()) exhausted(id);
      },
      close: function (orig, id, reason) { orig(id, reason); if (on()) { rejectPending(id, null, 'Rejected', 'Vacancy closed'); syncFacts(S3.vacancy(id)); save(); } },
      cancel: function (orig, id, reason) { orig(id, reason); if (on()) { rejectPending(id, null, 'Rejected', 'Vacancy cancelled'); syncFacts(S3.vacancy(id)); save(); } },
      extend: function (orig, id, end) { var b = rawAB(id); if (!b) return orig(id, end); bookingActive(b); var st = b.status, was = b.endDate; b.endDate = end; if (st === 'Active' || st === 'Extended') { b.status = 'Extended'; b.extendedAt = now(); } b.updatedAt = now(); log('booking', id, 'End date: ' + fmtDate(was) + ' → ' + fmtDate(end) + (st !== b.status ? '. Status: ' + st + ' → ' + b.status : '')); save(); },
      amend: function (orig, id, end, times) { var b = rawAB(id); if (!b) return orig(id, end, times); bookingActive(b); var parts = []; if (end && end !== b.endDate) { parts.push('End date: ' + fmtDate(b.endDate) + ' → ' + fmtDate(end)); b.endDate = end; } if (times !== b.workingTimes) { parts.push('Working times: ' + (b.workingTimes || 'none') + ' → ' + (times || 'none')); b.workingTimes = times; } b.updatedAt = now(); log('booking', id, parts.join('. ') || 'No change'); save(); },
      start: function (orig, id) { var b = rawAB(id); if (!b) return orig(id); bookingActive(b); b.status = 'Active'; b.startedAt = now(); b.startedBy = S5.me; b.updatedAt = now(); log('booking', id, 'Status: Pending Start → Active'); save(); },
      complete: function (orig, id) { var b = rawAB(id); if (!b) return orig(id); bookingActive(b); var st = b.status; b.status = 'Completed'; b.completedAt = now(); b.completedBy = S5.me; b.updatedAt = now(); log('booking', id, 'Status: ' + st + ' → Completed'); save(); },
      // BK-016: an Agency-sourced booking's cancel reopens its position; the proposal stays Accepted (terminal)
      cancelBooking: function (orig, id, reason) { var b = rawAB(id); if (!b) return orig(id, reason); var st = b.status; b.status = 'Cancelled'; b.cancelledAt = now(); b.cancelledBy = S5.me; b.cancellationReason = reason; b.updatedAt = now(); log('booking', id, 'Status: ' + st + ' → Cancelled. Reason: ' + reason); save(); syncFacts(S3.vacancy(b.vacancyId)); }
    };
    Object.keys(wrap).forEach(function (k) { var orig = A[k]; if (!orig) return; A[k] = function () { return wrap[k].apply(null, [orig].concat([].slice.call(arguments))); }; });
    // S3.audit carries an Agency-sourced booking's own entries
    var _audit = S3.audit;
    S3.audit = function (type, id) { var a = _audit(type, id); if (!on()) return a; return a.concat(db.audit.filter(function (x) { return x.type === type && x.id === id; }).map(function (x) { return { type: x.type, id: x.id, at: x.at, by: x.by, label: /created/i.test(x.text) ? 'Created' : 'Updated', text: x.text }; })).sort(function (p, q) { return p.at < q.at ? 1 : -1; }); };
  })();
//#endif

  // ---------- the slice 4 seam (Abstract and client): the Agency-sourced booking's weeks, the confirmation states ----------
//#if abstract client
  // BK-2210's two weeks, in slice 4's stored shape (built by slice4-proto.js's own helpers): the week of 28 Sep is
  // approved and invoiced (the prototype stand-in above), with a Justified sick day and a no-show whose pay Abstract
  // overrode; the week of 5 Oct is open, with a no-show Requested (awaiting agency) and a sick day Not Requested.
  function s4weeks(h) {
    var W3 = '2026-09-28', W4 = '2026-10-05';
    var d1 = {}; d1[W3] = h.W('8.00', 'sh-pm'); d1[h.addDays(W3, 1)] = h.W('8.00', 'sh-pm');
    d1[h.addDays(W3, 2)] = h.day('Sick Leave', null, 'sh-pm', { shiftDefaulted: true, absenceComment: 'Phoned the branch before the shift.' });
//#endif
//#if abstract
    d1[h.addDays(W3, 3)] = h.day('No-show', null, 'sh-pm', { shiftDefaulted: true, payOverride: { value: 'Paid', reason: 'The site closed the Leeds Hub gate at short notice on 1 Oct; Acme agreed to pay the shift.', by: 'Sarah Mitchell', at: '2026-10-02T17:05:00' } });
//#endif
//#if client
    // the client's copy holds the override's marker alone: never its reason, who or when (slice 4 DR-S6; TSD §3.3.6 rule 2)
    d1[h.addDays(W3, 3)] = h.day('No-show', null, 'sh-pm', { shiftDefaulted: true, payOverride: { value: 'Paid' } });
//#endif
//#if abstract client
    d1[h.addDays(W3, 4)] = h.W('8.00', 'sh-pm'); d1[h.addDays(W3, 5)] = h.NB(); d1[h.addDays(W3, 6)] = h.NB();
    var t1 = h.ts('ts-s5-1', 'b2210', W3, 'Approved', d1, { submittedAt: '2026-10-05T09:30:00', submittedBy: 'Rachel Green', submittedLate: false, approvedAt: '2026-10-05T09:30:00', approvedBy: null, approvalMode: 'automatic', updatedAt: '2026-10-05T09:30:00' });
    t1.approvals.push(h.approved(W3, '2026-10-05T09:30:00', null, 'automatic', d1));
//#endif
//#if abstract
    t1.events.push({ at: '2026-10-02T17:05:00', by: 'Sarah Mitchell', text: 'Thu 1 Oct: pay impact overridden to Paid. Reason: The site closed the Leeds Hub gate at short notice on 1 Oct; Acme agreed to pay the shift.' });
//#endif
//#if abstract client
    t1.events.push({ at: '2026-10-05T09:30:00', by: 'Rachel Green', text: 'Submitted' }); t1.events.push({ at: '2026-10-05T09:30:00', by: null, text: 'Approved automatically at submission' });
    var d2 = {}; d2[W4] = h.W('8.00', 'sh-pm'); d2[h.addDays(W4, 1)] = h.W('8.00', 'sh-pm');
    d2[h.addDays(W4, 2)] = h.day('No-show', null, null, { absenceComment: 'Did not arrive; the site called the branch at 14:30.' });
    d2[h.addDays(W4, 3)] = h.day('Sick Leave', null, 'sh-pm', { shiftDefaulted: true, absenceComment: 'Texted the site at 12:00.' });
    d2[h.addDays(W4, 4)] = h.W('8.00', 'sh-pm');
    var t2 = h.ts('ts-s5-2', 'b2210', W4, 'Draft', d2, { updatedAt: '2026-10-09T17:00:00' });
    t2.events.push({ at: '2026-10-07T15:10:00', by: 'Rachel Green', text: 'Wed 7 Oct: No-show. Agency confirmation requested' });
    t2.events.push({ at: '2026-10-08T12:20:00', by: 'Rachel Green', text: 'Thu 8 Oct: Sick Leave' });
    return [t1, t2];
  }
  function abstractParty() { return PARTY; }
  // leave.auto_request_confirmation resolved at the client (CFG-006): Acme asks for confirmation by default
  var AUTO_REQUEST = { acme: true };
  S5.autoRequest = function (clientId) { return !!AUTO_REQUEST[clientId]; };
  function isAgency(b) { return !!b && !!rawAB(b.id); }
  function chip(state, small) { return S5.ui.confBadge(state, small); }
//#endif
//#if abstract
  // The agency pay figures of an Agency-sourced week (slice 4 TSD §3.3.3 rules 3, 5 and 6; slice 5 §3.3.6), worked out from
  // the priced lines slice4-proto.js's engine leaves (ruled 2026-11-16, Ujjwal Sharma). Per line: agencyPayRate =
  // round(standard agency pay rate × multiplier), agencyCost = round(hours × agencyPayRate), 0.00 on a paid absence the agency
  // bears. Per day: agencyCost = Σ lines, abstractMargin = clientCost − agencyCost, agencyNetMargin = agencyCost −
  // (workerGrossPay + Σ statutory). The week's totals are the Σ of the days, null while a day waits for manual pricing. The
  // standard rate is the booking's agency pay rate (VacancyRate.agencyPayRate: the rate card line's pay figure). Abstract's
  // copy alone: the client reads no pay figure, and the agency reads its own gated projection (S5.agencyWeeks).
  function pence(s) { return Math.round(Number(s) * 100); }
  function money2(p) { return (p / 100).toFixed(2); }
  var STAT_KEYS = ['employerNi', 'wtrAccrual', 'pension', 'apprenticeshipLevy'];
  function agencyPay(o, b) {
    var std = b.rate && b.rate.pay ? pence(b.rate.pay) : null, pending = false, sum = { clientCost: 0, agencyCost: 0, abstractMargin: 0, agencyNetMargin: 0 };
    o.agencyPayRate = std == null ? null : money2(std);
    if (std == null) return;
    o.days.forEach(function (y) {
      if (y.pricingState === 'pending manual pricing') pending = true;
      if (!y.cost) return;
      var ac = 0, cc = 0, agencyBears = y.dayStatus !== 'Worked' && y.costBearer === 'Agency';
      y.lines.forEach(function (l) {
        var r = Math.round(std * Number(l.multiplier));
        l.agencyPayRate = money2(r);
        l.agencyCost = agencyBears ? '0.00' : money2(Math.round(r * pence(l.hours) / 100));
        if (agencyBears) l.clientCost = '0.00';      // costBearer Agency: the client is not charged the day either
        ac += pence(l.agencyCost); cc += pence(l.clientCost);
      });
      var stat = STAT_KEYS.reduce(function (m, k) { return m + pence(y.cost[k] || '0'); }, 0);
      y.cost.clientCost = money2(cc); y.cost.agencyCost = money2(ac);
      y.cost.abstractMargin = money2(cc - ac); y.cost.agencyNetMargin = money2(ac - (pence(y.cost.workerGrossPay) + stat));
      Object.keys(sum).forEach(function (k) { sum[k] += pence(y.cost[k]); });
    });
    Object.keys(sum).forEach(function (k) { o.totals[k] = pending ? null : money2(sum[k]); });
    o.clientCost = o.totals.clientCost;
  }
//#endif
//#if abstract client
  S5.s4 = {
    // seed(list, helpers): add the slice 5 weeks to slice 4's store if they are missing; true when it added any
    // (a week the client's copy seeded first carries the override's marker alone; Abstract's copy fills in the rest)
    ensure: function (list, h) {
      var added = false;
      s4weeks(h).forEach(function (t) {
        var cur = list.filter(function (x) { return x.id === t.id; })[0];
        if (!cur) { list.push(t); added = true; return; }
        Object.keys(t.days).forEach(function (dt) { var a = t.days[dt] && t.days[dt].payOverride, c = cur.days[dt] && cur.days[dt].payOverride; if (a && c && a.value === c.value) Object.keys(a).forEach(function (k) { if (!(k in c)) { c[k] = a[k]; added = true; } }); });
      });
      return added;
    },
    // dress(o, booking, raw): an Agency-sourced week's source, supplying party, invoiced stand-in and confirmation states
    dress: function (o, b, t) {
      if (!on() || !isAgency(b)) return;
      var ab = rawAB(b.id), inv = invoiced(b.id, o.weekStart);
      o.supplyingParty = agencyName(ab.agencyId); o.invoicedAt = inv ? inv.invoicedAt : null; o.invoicedStandIn = !!inv;
//#endif
//#if abstract
      o.source = 'Agency-sourced'; o.agencyId = ab.agencyId; o.agencyName = agencyName(ab.agencyId);
//#endif
//#if client
      delete o.source; delete o.agencyId; delete o.agencyName;
//#endif
//#if abstract client
      o.agencySourced = true; o.requestedDays = 0;
      o.days.forEach(function (y) { y.confirmationState = confState(b.id, y.date, y.dayStatus); y.confirmation = confOf(b.id, y.date); if (y.confirmationState === 'Requested (awaiting agency)') o.requestedDays++; });
//#endif
//#if abstract
      agencyPay(o, b);
//#endif
//#if abstract client
      // the snapshot the agency's copy reads (no charge, no worker pay: the agency's projection of the week)
      var snap = { id: o.id, bookingId: b.id, weekStart: o.weekStart, status: o.status, days: o.days.map(function (y) { return { date: y.date, dayStatus: y.dayStatus, hours: y.hours, shiftName: y.shiftName || null, absenceComment: y.absenceComment || null, absencePay: y.absencePay || null, overridden: !!y.absencePayOverride, inRange: y.inRange }; }) };
      if (!o.blank && JSON.stringify(db.weeks[o.id]) !== JSON.stringify(snap)) { db.weeks[o.id] = snap; save(); }
    },
    // check(booking, inputs): refuse requestConfirmation where it is not offered (TS-067)
    check: function (b, inputs) {
      inputs.forEach(function (inp) { if (inp.requestConfirmation === true && (!on() || !isAgency(b) || ABSENCES.indexOf(inp.dayStatus) < 0)) refuse('TIMESHEET_CONFIRMATION_NOT_OFFERED', 'Agency confirmation can only be requested on an absence of an Agency-sourced booking.', { date: inp.date }); });
    },
    // written(booking, changes): §3.3.7 rules 1 and 4 after a day write; changes = [{ date, prev, next, requestConfirmation }]
    written: function (b, changes) {
      if (!on() || !isAgency(b)) return;
      changes.forEach(function (c) {
        var k = confKey(b.id, c.date), had = db.confirmations[k], nextAbs = ABSENCES.indexOf(c.next) >= 0;
        if (c.prev !== c.next) {
          if (had) { delete db.confirmations[k]; log('timesheet', b.id, fmtDate(c.date) + ': the day changed, so its agency confirmation ended' + (had.justification ? ' (the reason stays in the audit)' : '')); }
          if (nextAbs && (c.requestConfirmation === true || (c.requestConfirmation === undefined && AUTO_REQUEST[b.clientId]))) db.confirmations[k] = { requestedAt: now(), requestedByParty: c.requestConfirmation === true ? PARTY : 'policy', requestedByName: c.requestConfirmation === true ? S5.me : null, justification: null, justifiedAt: null, justifiedByName: null };
        } else if (nextAbs && c.requestConfirmation === true && !had) {
          db.confirmations[k] = { requestedAt: now(), requestedByParty: PARTY, requestedByName: S5.me, justification: null, justifiedAt: null, justifiedByName: null };
        }
      });
      save();
    },
    // POST …/days/:date/confirmation-request — the standalone request on a Not Requested absence, any week status
    request: function (b, y, o) {
      o = o || {};
      if (!isAgency(b) || ABSENCES.indexOf(y.dayStatus) < 0) refuse('TIMESHEET_CONFIRMATION_NOT_OFFERED', 'Agency confirmation can only be requested on an absence of an Agency-sourced booking.', { date: y.date });
      var k = confKey(b.id, y.date);
      if (o.simulateStale || db.confirmations[k]) refuse('TIMESHEET_CONFIRMATION_STATE_INVALID', fmtDate(y.date) + ' is ' + (o.simulateStale ? 'Justified' : confState(b.id, y.date, y.dayStatus)) + ' already: ' + agencyName(rawAB(b.id).agencyId) + ' answered while you had the week open. The week now shows the latest.', { confirmationState: o.simulateStale ? 'Justified' : confState(b.id, y.date, y.dayStatus) });
      db.confirmations[k] = { requestedAt: now(), requestedByParty: PARTY, requestedByName: S5.me, justification: null, justifiedAt: null, justifiedByName: null }; save();
    },
    // the absence modal's section (TS-020, TS-022): offered on an Agency-sourced booking's absence only
    dialogHtml: function (x, y, st) {
      if (!on() || !x.agencySourced || ABSENCES.indexOf(st) < 0) return '';
      var same = y.dayStatus === st, cs = same ? y.confirmationState : null, ag = esc(x.supplyingParty), c = same ? y.confirmation : null;
      if (cs === 'Requested (awaiting agency)') return '<div class="rounded-lg border border-amber-200 bg-amber-50/60 p-3"><p class="text-xs font-semibold text-slate-700 mb-1.5">Agency confirmation</p>' + chip(cs) + '<p class="text-xs text-slate-600 mt-1.5">Requested ' + (c.requestedByParty === 'policy' ? 'automatically (client setting)' : 'by ' + esc(c.requestedByName || (c.requestedByParty === 'abstract' ? 'Abstract' : 'the client'))) + ' on ' + fmtDateTime(c.requestedAt) + '. ' + ag + ' gives the reason; this never holds the week.</p></div>';
      if (cs === 'Justified') return '<div class="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"><p class="text-xs font-semibold text-slate-700 mb-1.5">Agency confirmation</p>' + chip(cs) + '<p class="text-xs text-slate-700 mt-1.5"><span class="font-semibold">' + ag + '’s reason:</span> ' + esc(c.justification) + '</p><p class="text-xs text-slate-500 mt-0.5">Given on ' + fmtDateTime(c.justifiedAt) + '. Changing the day’s status ends the confirmation.</p></div>';
      var def = same ? false : !!AUTO_REQUEST[x.clientId];
      return '<label class="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer"><input type="checkbox" id="d-rc" class="mt-0.5"' + (def ? ' checked' : '') + '/><span class="min-w-0"><span class="block text-sm font-semibold text-slate-800">Request agency confirmation</span><span class="block text-xs text-slate-600 mt-0.5">' + ag + ' is asked to confirm the absence and give a reason. It never holds the week.' + (same ? '' : ' Ticked by default: the client’s leave policy asks for it.') + '</span></span></label>';
    },
    // a cell's marker: the requested and justified states read on the grid itself
    cellMark: function (y) {
      if (!on() || !y.confirmationState || y.confirmationState === 'Not Requested') return '';
      return y.confirmationState === 'Justified' ? '<span class="absolute bottom-1 right-1 text-emerald-700" title="' + esc('Justified: ' + y.confirmation.justification) + '"><i class="fa-solid fa-circle-check text-[10px]" aria-hidden="true"></i></span>' : '<span class="absolute bottom-1 right-1 text-amber-700" title="' + CLABEL['Requested (awaiting agency)'] + '"><i class="fa-solid fa-hourglass-half text-[10px]" aria-hidden="true"></i></span>';
    },
    ariaPart: function (y) { return on() && y.confirmationState && y.confirmationState !== 'Not Requested' ? ', ' + (CLABEL[y.confirmationState] || y.confirmationState) : ''; },
    // the day-by-day table's status cell: the state's badge, the reason, and the standalone request on a Not Requested absence.
    // Not Requested draws no badge (ruled 2026-11-16, Ujjwal Sharma): such a day shows only the request link, where it is offered.
    dayHtml: function (x, y, canRequest) {
      if (!on() || !x.agencySourced || !y.confirmationState) return '';
      if (y.confirmationState === 'Not Requested' && !canRequest) return '';
      var c = y.confirmation, h = '<div class="mt-1.5 flex flex-col gap-1">' + (y.confirmationState === 'Not Requested' ? '' : chip(y.confirmationState, true));
      if (y.confirmationState === 'Justified') h += '<p class="text-[11px] text-slate-700"><span class="font-semibold">' + esc(x.supplyingParty) + '’s reason:</span> ' + esc(c.justification) + '</p>';
      else if (y.confirmationState === 'Requested (awaiting agency)') h += '<p class="text-[11px] text-slate-600">Asked of ' + esc(x.supplyingParty) + ' on ' + fmtDateTime(c.requestedAt) + '</p>';
      else if (canRequest) h += '<button type="button" class="self-start text-[11px] font-semibold text-blue-700 hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" data-s5-req="' + esc(y.date) + '">Request agency confirmation</button>';
      return h + '</div>';
    },
    legend: function () { return on() ? '<span role="listitem" class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"><i class="fa-solid fa-hourglass-half text-amber-700" aria-hidden="true"></i>' + CLABEL['Requested (awaiting agency)'] + '</span><span role="listitem" class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"><i class="fa-solid fa-circle-check text-emerald-700" aria-hidden="true"></i>Justified</span>' : ''; },
    party: abstractParty
  };
//#endif
//#if abstract
  // statement(s, x): the pay statement's agency fields (slice 5 TSD §3.3.8, all `pay`): each line's agencyPayRate and
  // agencyAmount (the line's agencyCost) and the summary's agencyGrossPay = Σ agencyAmount. x is the week dressed from the
  // approval's days, so its lines carry agencyPay()'s figures; an Abstract-sourced statement keeps null (ruled 2026-11-16).
  S5.s4.statement = function (s, x) {
    s.agencyGrossPay = null;
    if (!on() || !x.agencySourced || x.agencyPayRate == null) { s.lines.forEach(function (l) { l.agencyPayRate = null; l.agencyAmount = null; }); return; }
    var i = 0, sum = 0;
    x.days.forEach(function (y) { y.lines.forEach(function (l) { var sl = s.lines[i++]; sl.agencyPayRate = l.agencyPayRate; sl.agencyAmount = l.agencyCost; sum += pence(l.agencyCost); }); });
    s.agencyGrossPay = money2(sum);
  };
//#endif

  // ---------- the look: badges as the kernel buckets them (design-tokens §5); every portal ----------
  var BUCKET = { neutral: 'bg-slate-100 text-slate-700 border border-slate-200', info: 'bg-blue-50 text-blue-700 border border-blue-200', waiting: 'bg-amber-50 text-amber-700 border border-amber-200', good: 'bg-emerald-50 text-emerald-700 border border-emerald-200', bad: 'bg-red-50 text-red-700 border border-red-200', closed: 'bg-slate-100 text-slate-600 border border-slate-200', released: 'bg-purple-50 text-purple-700 border border-purple-200' };
  // ProposalStatusBadge: Rejected (Position Filled) takes closed/archival with user-check — a system outcome, not a
  // judgement on the candidate (the pass's choice, flagged for K59). The confirmation words likewise (K59).
  var PWORD = { 'Submitted': ['info', 'fa-paper-plane'], 'Under Review': ['info', 'fa-magnifying-glass'], 'Accepted': ['good', 'fa-circle-check'], 'Rejected': ['bad', 'fa-circle-xmark'], 'Withdrawn': ['closed', 'fa-rotate-left'], 'Rejected (Position Filled)': ['closed', 'fa-user-check'] };
  var CWORD = { 'Not Requested': ['neutral', 'fa-minus'], 'Requested (awaiting agency)': ['waiting', 'fa-hourglass-half'], 'Justified': ['good', 'fa-circle-check'] };
  // the words a requested day reads on Abstract's and the client's pages: design-tokens §6's pill, "Awaiting agency" (pill,
  // legend, cell mark and its aria text; ruled 2026-11-16, slice 5 TSD review R5-D6). The state's value is unchanged.
  var CLABEL = {};
//#if abstract client
  CLABEL = { 'Requested (awaiting agency)': 'Awaiting agency' };
//#endif
  function badge(map, s, small, label) { var w = map[s] || ['neutral', 'fa-circle']; return '<span class="inline-flex items-center gap-1.5 ' + (small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs') + ' rounded-full font-semibold whitespace-nowrap ' + BUCKET[w[0]] + '"><i class="fa-solid ' + w[1] + ' text-[10px]" aria-hidden="true"></i>' + esc(label || s) + '</span>'; }
  S5.ui = {
    proposalBadge: function (s, small) { return badge(PWORD, s, small); },
    confBadge: function (s, small) { return badge(CWORD, s, small, CLABEL[s]); },
    complianceBadge: function (s, small) { return badge({ Compliant: ['good', 'fa-circle-check'], Pending: ['waiting', 'fa-hourglass-half'], Expired: ['bad', 'fa-circle-xmark'] }, s, small); },
    licenceChip: function (l) { return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ' + (l.expired ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200') + '"><i class="fa-solid ' + (l.expired ? 'fa-circle-xmark' : 'fa-id-card') + ' text-[10px]" aria-hidden="true"></i>' + esc(l.licenceType) + (l.expiryDate ? ' · ' + (l.expired ? 'expired ' : 'until ') + fmtDate(l.expiryDate) : '') + '</span>'; }
  };
  S5.PROPOSAL_STATUSES = Object.keys(PWORD);
})();
