/*
 * slice3-proto.js — the slice 3 prototype's shared behaviour, one copy per portal.
 *
 * The two copies come from one source, and each holds only what its portal's responses would carry
 * (design-tokens §8): what a client may not see is not in the client's copy at all.
 *
 * What it gives a screen:
 *   S3.vacancies() / S3.vacancy(id) / S3.bookings() / S3.booking(id)   the records, statuses derived on read
 *   S3.act.*                     the writes of the demo path, refused the way the TSD refuses them
 *   S3.vacancyForm(host, props)  one VacancyForm in two portals (TSD §3.3.9)
 *   S3.roster(vacancy, props)    one PositionRoster in two variants
 *   S3.tree, S3.combobox, S3.fileUpload, S3.dialog, S3.ui.*   the kernel components as this prototype draws them
 *
 * Writes persist in localStorage so the demo path crosses pages and portals when both are served from
 * one origin. S3.reset() returns to the seed. Storage is a convenience: it may be blocked, and the seed
 * then renders and writes last for the page.
 */
(function () {
  'use strict';
  var PORTAL = 'abstract';
  var TODAY = '2026-10-10';
  var KEY = 's3-demo-v1';

  // ---------- reference data, read from slice 2's records ----------
  var CLIENTS = {
    acme: { name: 'Acme Logistics', status: 'Active' },
    northgate: { name: 'Northgate Foods', status: 'Active' }
    , pennine: { name: 'Pennine Distribution', status: 'Suspended' } 
  };
  var TREES = {
    acme: [
      { id: 'acme-root', parentId: null, name: 'Acme Logistics', nodeType: 'organisation', root: true },
      { id: 'mid', parentId: 'acme-root', name: 'Midlands', nodeType: 'region' },
      { id: 'bhx', parentId: 'mid', name: 'Birmingham DC', nodeType: 'site' },
      { id: 'bhx-n', parentId: 'bhx', name: 'Nights', nodeType: 'department' },
      { id: 'bhx-d', parentId: 'bhx', name: 'Days', nodeType: 'department' },
      { id: 'lei', parentId: 'mid', name: 'Leicester DC', nodeType: 'site' },
      { id: 'nth', parentId: 'acme-root', name: 'Northern', nodeType: 'region' },
      { id: 'lds', parentId: 'nth', name: 'Leeds Hub', nodeType: 'site' },
      { id: 'lgw', parentId: 'acme-root', name: 'London Gateway', nodeType: 'site' }
    ],
    northgate: [
      { id: 'ng-root', parentId: null, name: 'Northgate Foods', nodeType: 'organisation', root: true },
      { id: 'ng-prod', parentId: 'ng-root', name: 'Production', nodeType: 'business_unit' },
      { id: 'ng-leeds', parentId: 'ng-prod', name: 'Leeds bakery', nodeType: 'site' }
    ]
    , pennine: [
      { id: 'pn-root', parentId: null, name: 'Pennine Distribution', nodeType: 'organisation', root: true },
      { id: 'pn-hud', parentId: 'pn-root', name: 'Huddersfield depot', nodeType: 'site' }
    ] 
  };
  var JOB_ROLES = {
    'jr-wo': 'Warehouse Operative', 'jr-fd': 'Forklift Driver (Reach)', 'jr-pp': 'Picker / Packer', 'jr-tl': 'Team Leader'
  };
  var CLIENT_ROLES = { acme: ['jr-wo', 'jr-fd', 'jr-pp', 'jr-tl'], northgate: ['jr-pp', 'jr-wo'] , pennine: ['jr-wo']  };
  var SHIFTS = {
    acme: [{ id: 'sh-am', name: 'Morning', def: true }, { id: 'sh-pm', name: 'Afternoon' }, { id: 'sh-nt', name: 'Night' }],
    northgate: [{ id: 'ng-d', name: 'Days', def: true }, { id: 'ng-l', name: 'Lates' }]
    , pennine: [{ id: 'pn-d', name: 'Days', def: true }] 
  };
  // The standard line of the card in force. The client's copy carries the charge alone.
  var LINES = [
    { role: 'jr-wo', client: 'acme', node: null, shift: 'sh-am', charge: '18.60' , pay: '13.20', base: '12.00', margin: '2.93', pct: '15.75'  },
    { role: 'jr-wo', client: 'acme', node: null, shift: 'sh-pm', charge: '18.90' , pay: '13.40', base: '12.20', margin: '2.97', pct: '15.71'  },
    { role: 'jr-wo', client: 'acme', node: null, shift: 'sh-nt', charge: '19.60' , pay: '14.70', base: '13.40', margin: '2.10', pct: '10.71'  },
    { role: 'jr-wo', client: 'acme', node: 'bhx', shift: 'sh-am', charge: '20.10' , pay: '14.10', base: '12.80', margin: '3.40', pct: '16.92'  },
    { role: 'jr-wo', client: 'acme', node: 'bhx', shift: 'sh-pm', charge: '20.50' , pay: '14.40', base: '13.10', margin: '3.39', pct: '16.54'  },
    { role: 'jr-wo', client: 'acme', node: 'bhx', shift: 'sh-nt', charge: '21.30' , pay: '15.70', base: '14.30', margin: '2.62', pct: '12.30'  },
    { role: 'jr-fd', client: 'acme', node: null, shift: 'sh-am', charge: '22.10' , pay: '15.60', base: '14.20', margin: '3.56', pct: '16.11'  },
    { role: 'jr-fd', client: 'acme', node: null, shift: 'sh-pm', charge: '22.50' , pay: '15.90', base: '14.50', margin: '3.56', pct: '15.82'  },
    { role: 'jr-fd', client: 'acme', node: null, shift: 'sh-nt', charge: '24.00' , pay: '17.30', base: '15.80', margin: '3.37', pct: '14.04'  },
    { role: 'jr-pp', client: 'northgate', node: null, shift: 'ng-d', charge: '19.40' , pay: '13.60', base: '12.30', margin: '3.34', pct: '17.22'  },
    { role: 'jr-pp', client: 'northgate', node: null, shift: 'ng-l', charge: '19.80' , pay: '13.90', base: '12.60', margin: '3.35', pct: '16.92'  },
    { role: 'jr-wo', client: 'northgate', node: null, shift: 'ng-d', charge: '19.90' , pay: '14.00', base: '12.70', margin: '3.32', pct: '16.68'  },
    { role: 'jr-wo', client: 'northgate', node: null, shift: 'ng-l', charge: '20.30' , pay: '14.30', base: '13.00', margin: '3.32', pct: '16.35'  }
    , { role: 'jr-wo', client: 'pennine', node: null, shift: 'pn-d', charge: '18.20', pay: '13.10', base: '11.90', margin: '2.70', pct: '14.84' } 
  ];

  // ---------- the seed: facts both portals may hold ----------
  function pos(n, status, bookingId, extra) { return Object.assign({ n: n, status: status, bookingId: bookingId || null, filledAt: null, cancelledAt: null, cancelledReason: null }, extra || {}); }
  function vac(o) {
    return Object.assign({ description: null, requirements: null, workingTimes: null, closeDate: null, publishedAt: null, publishedBy: null, closedAt: null, closedBy: null, closeReason: null, reopenedAt: null, reopenedByBooking: null, cancelledAt: null, cancelledBy: null, cancellationReason: null, createdBy: 'Sarah Mitchell', createdAt: '2026-09-20T09:00:00', updatedAt: '2026-10-01T09:00:00', documents: [] }, o);
  }
  var DESC = 'General warehouse duties at the site: goods in, picking to order, and loading for despatch.';
  var REQ = 'Safety boots and hi-vis provided on site. Able to lift up to 20 kg.';
  function seed() {
    var v = [
      vac({ id: 'v1041', reference: 'VAC-1041', clientId: 'acme', orgNodeId: 'bhx', jobRoleId: 'jr-wo', jobTitle: 'Warehouse operatives, peak cover', startDate: '2026-10-19', endDate: '2026-12-18', shiftId: 'sh-am', workingTimes: 'Mon to Fri, 06:00 to 14:00', closeDate: '2026-10-16', description: DESC, requirements: REQ, publishedAt: '2026-10-02T10:12:00', publishedBy: 'Sarah Mitchell', positions: [pos(1, 'Open'), pos(2, 'Open'), pos(3, 'Open')], documents: [{ name: 'Site induction pack.pdf', size: '1.2 MB', by: 'Sarah Mitchell', at: '2026-10-02T10:10:00' }] }),
      vac({ id: 'v1042', reference: 'VAC-1042', clientId: 'acme', orgNodeId: 'lds', jobRoleId: 'jr-fd', jobTitle: 'Reach truck drivers', startDate: '2026-09-28', endDate: '2026-11-27', shiftId: 'sh-pm', workingTimes: 'Mon to Fri, 14:00 to 22:00', description: 'Racking and replenishment in the high-bay aisles.', requirements: 'Current reach truck licence.', publishedAt: '2026-09-15T11:00:00', publishedBy: 'Rachel Green', createdBy: 'Rachel Green', positions: [pos(1, 'Filled', 'b2201', { filledAt: '2026-09-22T14:02:00' }), pos(2, 'Open'), pos(3, 'Filled', 'b2202', { filledAt: '2026-09-23T09:30:00' }), pos(4, 'Open')] }),
      vac({ id: 'v1043', reference: 'VAC-1043', clientId: 'acme', orgNodeId: 'bhx-n', jobRoleId: 'jr-wo', jobTitle: 'Night shift operatives', startDate: '2026-10-12', endDate: '2026-11-13', shiftId: 'sh-nt', workingTimes: 'Sun to Thu, 22:00 to 06:00', publishedAt: '2026-09-29T15:20:00', publishedBy: 'Sarah Mitchell', positions: [pos(1, 'Filled', 'b2203', { filledAt: '2026-10-05T10:00:00' }), pos(2, 'Filled', 'b2204', { filledAt: '2026-10-06T16:30:00' })] }),
      vac({ id: 'v1044', reference: 'VAC-1044', clientId: 'acme', orgNodeId: 'lei', jobRoleId: 'jr-wo', jobTitle: 'Christmas temporary operatives', startDate: '2026-11-23', endDate: '2027-01-08', shiftId: 'sh-am', workingTimes: null, createdBy: 'Rachel Green', positions: [pos(1, 'Open'), pos(2, 'Open'), pos(3, 'Open'), pos(4, 'Open'), pos(5, 'Open')] }),
      vac({ id: 'v1045', reference: 'VAC-1045', clientId: 'acme', orgNodeId: 'lgw', jobRoleId: 'jr-wo', jobTitle: 'Gateway loading team', startDate: '2026-08-03', endDate: '2026-09-25', shiftId: 'sh-am', publishedAt: '2026-07-20T09:00:00', publishedBy: 'Sarah Mitchell', closedAt: '2026-09-26T09:15:00', closedBy: 'Sarah Mitchell', closeReason: 'The contract at this site ended and the last seat is no longer needed.', positions: [pos(1, 'Filled', 'b2205', { filledAt: '2026-07-24T12:00:00' }), pos(2, 'Cancelled', null, { cancelledAt: '2026-09-26T09:15:00', cancelledReason: 'vacancy_closed' })] }),
      vac({ id: 'v1046', reference: 'VAC-1046', clientId: 'acme', orgNodeId: 'lds', jobRoleId: 'jr-wo', jobTitle: 'Leeds weekend cover', startDate: '2026-10-03', endDate: '2026-11-29', shiftId: 'sh-am', publishedAt: '2026-09-18T13:00:00', publishedBy: 'Sarah Mitchell', cancelledAt: '2026-10-07T11:05:00', cancelledBy: 'Sarah Mitchell', cancellationReason: 'Acme moved this work to its Leicester site.', positions: [pos(1, 'Filled', 'b2206', { filledAt: '2026-09-25T10:00:00' }), pos(2, 'Cancelled', null, { cancelledAt: '2026-10-07T11:05:00', cancelledReason: 'vacancy_cancelled' })] }),
      vac({ id: 'v1047', reference: 'VAC-1047', clientId: 'acme', orgNodeId: 'bhx-d', jobRoleId: 'jr-wo', jobTitle: 'Days team cover', startDate: '2026-09-14', endDate: '2026-11-06', shiftId: 'sh-am', workingTimes: 'Mon to Fri, 06:00 to 14:00', publishedAt: '2026-09-01T09:00:00', publishedBy: 'Sarah Mitchell', closedAt: '2026-10-01T16:00:00', closedBy: 'Sarah Mitchell', closeReason: 'All seats filled for the period.', reopenedAt: '2026-10-08T10:20:00', reopenedByBooking: 'BK-2207', positions: [pos(1, 'Filled', 'b2208', { filledAt: '2026-09-08T11:00:00' }), pos(2, 'Open')] }),
      vac({ id: 'v1048', reference: 'VAC-1048', clientId: 'northgate', orgNodeId: 'ng-leeds', jobRoleId: 'jr-pp', jobTitle: 'Bakery packers', startDate: '2026-10-26', endDate: '2026-12-23', shiftId: 'ng-d', workingTimes: 'Mon to Sat, 07:00 to 15:00', publishedAt: '2026-10-05T09:40:00', publishedBy: 'James Okafor', positions: [pos(1, 'Open'), pos(2, 'Open')] })
      , vac({ id: 'v1049', reference: 'VAC-1049', clientId: 'pennine', orgNodeId: 'pn-hud', jobRoleId: 'jr-wo', jobTitle: 'Depot operatives', startDate: '2026-09-07', endDate: '2026-11-27', shiftId: 'pn-d', publishedAt: '2026-08-24T09:00:00', publishedBy: 'Sarah Mitchell', positions: [pos(1, 'Filled', 'b2209', { filledAt: '2026-08-28T15:00:00' }), pos(2, 'Open')] }) 
    ];
    var b = [
      bk('b2201', 'BK-2201', 'v1042', 1, 'c-mo', 'Marek Nowak', 'acme', 'lds', 'jr-fd', 'sh-pm', '2026-09-28', '2026-11-27', 'Mon to Fri, 14:00 to 22:00', 'Active', { startedAt: '2026-09-28T00:30:00' }),
      bk('b2202', 'BK-2202', 'v1042', 3, 'c-tw', 'Tasha Williams', 'acme', 'lds', 'jr-fd', 'sh-pm', '2026-09-28', '2026-12-18', 'Mon to Fri, 14:00 to 22:00', 'Extended', { startedAt: '2026-09-28T00:30:00', extendedAt: '2026-10-02T10:00:00' }),
      bk('b2203', 'BK-2203', 'v1043', 1, 'c-sa', 'Samuel Adeyemi', 'acme', 'bhx-n', 'jr-wo', 'sh-nt', '2026-10-12', '2026-11-13', 'Sun to Thu, 22:00 to 06:00', 'Pending Start', {}),
      bk('b2204', 'BK-2204', 'v1043', 2, 'c-lk', 'Lucy O’Brien', 'acme', 'bhx-n', 'jr-wo', 'sh-nt', '2026-10-12', '2026-11-13', 'Sun to Thu, 22:00 to 06:00', 'Pending Start', {}),
      bk('b2205', 'BK-2205', 'v1045', 1, 'c-ra', 'Ravi Patel', 'acme', 'lgw', 'jr-wo', 'sh-am', '2026-08-03', '2026-09-25', null, 'Completed', { startedAt: '2026-08-03T00:30:00', completedAt: '2026-09-26T00:30:00' }),
      bk('b2206', 'BK-2206', 'v1046', 1, 'c-er', 'Ewa Rybak', 'acme', 'lds', 'jr-wo', 'sh-am', '2026-10-03', '2026-11-29', null, 'Active', { startedAt: '2026-10-03T00:30:00' }),
      bk('b2207', 'BK-2207', 'v1047', 2, 'c-gh', 'George Hall', 'acme', 'bhx-d', 'jr-wo', 'sh-am', '2026-09-14', '2026-11-06', 'Mon to Fri, 06:00 to 14:00', 'Cancelled', { startedAt: '2026-09-14T00:30:00', cancelledAt: '2026-10-08T10:20:00', cancelledBy: 'Sarah Mitchell', cancellationReason: 'The worker accepted a permanent role elsewhere.' }),
      bk('b2208', 'BK-2208', 'v1047', 1, 'c-mo2', 'Nadia Hussain', 'acme', 'bhx-d', 'jr-wo', 'sh-am', '2026-09-14', '2026-11-06', 'Mon to Fri, 06:00 to 14:00', 'Active', { startedAt: '2026-09-14T00:30:00' })
      , bk('b2209', 'BK-2209', 'v1049', 1, 'c-ax', 'XXXXXXXX', 'pennine', 'pn-hud', 'jr-wo', 'pn-d', '2026-09-07', '2026-11-27', null, 'Active', { startedAt: '2026-09-07T00:30:00' }) 
    ];
    var a = [
      { type: 'vacancy', id: 'v1042', at: '2026-09-15T10:40:00', by: 'Rachel Green', label: 'Created', text: 'Vacancy created as a draft' },
      { type: 'vacancy', id: 'v1042', at: '2026-09-15T11:00:00', by: 'Rachel Green', label: 'Updated', text: 'Status: Draft → Open (Abstract Tier)' },
      { type: 'vacancy', id: 'v1042', at: '2026-09-18T09:12:00', by: 'Sarah Mitchell', label: 'Updated', text: 'Position count: 3 → 4' },
      { type: 'vacancy', id: 'v1042', at: '2026-09-22T14:02:00', by: 'Sarah Mitchell', label: 'Updated', text: 'Position 1 filled: BK-2201' },
      { type: 'vacancy', id: 'v1042', at: '2026-09-23T09:30:00', by: 'Sarah Mitchell', label: 'Updated', text: 'Position 3 filled: BK-2202' },
      { type: 'booking', id: 'b2202', at: '2026-09-23T09:30:00', by: 'Sarah Mitchell', label: 'Created', text: 'Booking created from the worker pool' },
      { type: 'booking', id: 'b2202', at: '2026-09-28T00:30:00', by: null, label: 'Updated', text: 'Status: Pending Start → Active' },
      { type: 'booking', id: 'b2202', at: '2026-10-02T10:00:00', by: 'Sarah Mitchell', label: 'Updated', text: 'End date: 27 Nov 2026 → 18 Dec 2026. Status: Active → Extended' }
    ];
    return { vacancies: v, bookings: b, audit: a, seq: { vac: 1060, bk: 2240 }, extra: [] };
  }
  function bk(id, reference, vacancyId, positionNumber, candidateId, candidateName, clientId, orgNodeId, jobRoleId, shiftId, startDate, endDate, workingTimes, status, extra) {
    return Object.assign({ id: id, reference: reference, vacancyId: vacancyId, positionNumber: positionNumber, candidateId: candidateId, candidateName: candidateName, clientId: clientId, orgNodeId: orgNodeId, jobRoleId: jobRoleId, shiftId: shiftId, startDate: startDate, endDate: endDate, workingTimes: workingTimes, status: status, supplyingParty: 'Abstract', extendedAt: null, startedAt: null, startedBy: null, completedAt: null, completedBy: null, cancelledAt: null, cancelledBy: null, cancellationReason: null, createdBy: 'Sarah Mitchell', createdAt: '2026-09-20T09:00:00', updatedAt: '2026-10-01T09:00:00' }, extra);
  }

  // ---------- store ----------
  function read(k) { try { return JSON.parse(window.localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function write(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window: this page only */ } }
  var db = read(KEY) || seed();
  function save() { write(KEY, db); }

  var S3 = window.S3 = { PORTAL: PORTAL, TODAY: TODAY, CLIENTS: CLIENTS, JOB_ROLES: JOB_ROLES, SHIFTS: SHIFTS, TREES: TREES, CLIENT_ROLES: CLIENT_ROLES };
  S3.reset = function () { try { window.localStorage.removeItem(KEY); window.localStorage.removeItem(KEY + '-abstract'); } catch (e) { /* nothing stored */ } db = seed(); };
  S3.me = PORTAL === 'abstract' ? 'Sarah Mitchell' : 'Rachel Green';
  S3.clientId = PORTAL === 'client' ? 'acme' : null;
  function now() { var d = new Date(); return TODAY + 'T' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); }
  S3.now = now;
  function node(c, id) { return (TREES[c] || []).filter(function (n) { return n.id === id; })[0]; }
  function pathOf(c, id) { var out = [], n = node(c, id); while (n && !n.root) { out.unshift(n.name); n = node(c, n.parentId); } return out; }
  function ancestors(c, id) { var out = [], n = node(c, id); while (n && !n.root) { out.push(n.id); n = node(c, n.parentId); } return out; }
  S3.nodePath = pathOf;
  S3.nodeName = function (c, id) { var n = node(c, id); return n ? n.name : ''; };
  S3.subtree = function (c, id) { var out = [id]; (TREES[c] || []).forEach(function (n) { if (ancestors(c, n.id).indexOf(id) >= 0 && out.indexOf(n.id) < 0) out.push(n.id); }); return out; };
  S3.shiftName = function (c, id) { var s = (SHIFTS[c] || []).filter(function (x) { return x.id === id; })[0]; return s ? s.name : ''; };
  function resolveRate(role, c, nodeId, shift) {
    var chain = ancestors(c, nodeId).concat([null]);
    for (var i = 0; i < chain.length; i++) {
      for (var j = 0; j < LINES.length; j++) { var l = LINES[j]; if (l.role === role && l.client === c && l.node === chain[i] && l.shift === shift) return l; }
    }
    return null;
  }
  S3.resolveRate = resolveRate;

  // ---------- reads: §3.3.1 rule 3 and rule 4, on every read ----------
  function statusOf(v) {
    var open = v.positions.filter(function (p) { return p.status === 'Open'; }).length, filled = v.positions.filter(function (p) { return p.status === 'Filled'; }).length;
    if (v.cancelledAt) return 'Cancelled';
    if (v.closedAt && (!v.reopenedAt || v.closedAt > v.reopenedAt) && open === 0) return 'Closed';
    if (!v.publishedAt) return 'Draft';
    if (open === 0 && filled > 0) return 'Filled';
    if (filled > 0) return 'Partially Filled';
    return 'Open (Abstract Tier)';
  }
  function dressV(v) {
    var o = Object.assign({}, v);
    o.openCount = v.positions.filter(function (p) { return p.status === 'Open'; }).length;
    o.filledCount = v.positions.filter(function (p) { return p.status === 'Filled'; }).length;
    o.cancelledCount = v.positions.filter(function (p) { return p.status === 'Cancelled'; }).length;
    o.positionCount = o.openCount + o.filledCount;
    o.status = statusOf(v);
    o.clientName = CLIENTS[v.clientId].name; o.jobRoleTitle = JOB_ROLES[v.jobRoleId];
    o.orgNodeName = S3.nodeName(v.clientId, v.orgNodeId); o.orgNodePath = pathOf(v.clientId, v.orgNodeId);
    o.shiftName = S3.shiftName(v.clientId, v.shiftId);
    o.rate = resolveRate(v.jobRoleId, v.clientId, v.orgNodeId, v.shiftId);
    o.chargeRate = o.rate ? o.rate.charge : null;
    o.rosterRows = v.positions.map(function (p) {
      var b = p.bookingId ? rawB(p.bookingId) : null;
      return Object.assign({}, p, { bookingReference: b ? b.reference : null, candidateName: b ? b.candidateName : null, candidateId: b ? b.candidateId : null, supplyingParty: b ? b.supplyingParty : null, startDate: b ? b.startDate : null });
    });
    return o;
  }
  function rawV(id) { return db.vacancies.filter(function (v) { return v.id === id; })[0]; }
  function rawB(id) { return db.bookings.filter(function (b) { return b.id === id; })[0]; }
  function dressB(b) {
    var o = Object.assign({}, b);
    o.clientName = CLIENTS[b.clientId].name; o.jobRoleTitle = JOB_ROLES[b.jobRoleId];
    o.orgNodeName = S3.nodeName(b.clientId, b.orgNodeId); o.orgNodePath = pathOf(b.clientId, b.orgNodeId);
    o.shiftName = S3.shiftName(b.clientId, b.shiftId);
    var v = rawV(b.vacancyId); o.vacancyReference = v ? v.reference : ''; o.jobTitle = v ? v.jobTitle : ''; o.positionTotal = v ? dressV(v).positionCount : 0;
    o.rate = resolveRate(b.jobRoleId, b.clientId, b.orgNodeId, b.shiftId);
    o.chargeRate = o.rate ? o.rate.charge : null;
    return o;
  }
  function own(x) { return !S3.clientId || x.clientId === S3.clientId; }
  S3.vacancies = function () { return db.vacancies.filter(own).map(dressV); };
  S3.vacancy = function (id) { var v = rawV(id); return v && own(v) ? dressV(v) : null; };
  S3.bookings = function () { return db.bookings.filter(own).map(dressB); };
  S3.booking = function (id) { var b = rawB(id); return b && own(b) ? dressB(b) : null; };
  S3.audit = function (type, id) { return db.audit.filter(function (a) { return a.type === type && a.id === id; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; }); };
  function log(type, id, label, text) { db.audit.push({ type: type, id: id, at: now(), by: S3.me, label: label, text: text }); }
  function refuse(code, message, data) { var e = new Error(message); e.code = code; e.data = data || {}; throw e; }

  // ---------- writes ----------
  function clientActive(c, what) {
    if (CLIENTS[c].status !== 'Active') refuse('VACANCY_CLIENT_NOT_ACTIVE', CLIENTS[c].name + ' is ' + CLIENTS[c].status + ', so ' + what + '.');
  }
  S3.act = {
    saveVacancy: function (f, id, publish) {
      var v = id ? rawV(id) : null, c = id ? v.clientId : f.clientId;
      clientActive(c, 'nothing can be saved on its vacancies');
      if (publish && !resolveRate(f.jobRoleId, c, f.orgNodeId, f.shiftId)) refuse('VACANCY_NO_EFFECTIVE_RATE', 'This vacancy can’t be published: no rate card is in force for ' + JOB_ROLES[f.jobRoleId] + ' at ' + S3.nodeName(c, f.orgNodeId) + ' on the ' + S3.shiftName(c, f.shiftId) + ' Shift for ' + S3.fmtDate(f.startDate > TODAY ? f.startDate : TODAY) + '.');
      if (!v) {
        v = vac({ id: 'v' + (++db.seq.vac), clientId: c, createdBy: S3.me, createdAt: now(), positions: [] });
        v.reference = 'VAC-' + db.seq.vac;
        for (var i = 1; i <= f.positionCount; i++) v.positions.push(pos(i, 'Open'));
        db.vacancies.unshift(v);
        log('vacancy', v.id, 'Created', 'Vacancy created as a draft');
      } else { log('vacancy', v.id, 'Updated', 'Details changed'); }
      ['orgNodeId', 'jobRoleId', 'jobTitle', 'description', 'requirements', 'startDate', 'endDate', 'shiftId', 'workingTimes', 'closeDate'].forEach(function (k) { if (f[k] !== undefined) v[k] = f[k]; });
      v.updatedAt = now();
      if (publish) { v.publishedAt = now(); v.publishedBy = S3.me; log('vacancy', v.id, 'Updated', 'Status: Draft → Open (Abstract Tier)'); }
      save(); return v.id;
    },
    publish: function (id) {
      var v = rawV(id); clientActive(v.clientId, 'this vacancy can’t be published');
      if (!resolveRate(v.jobRoleId, v.clientId, v.orgNodeId, v.shiftId)) refuse('VACANCY_NO_EFFECTIVE_RATE', 'This vacancy can’t be published: no rate card is in force for ' + JOB_ROLES[v.jobRoleId] + ' at ' + S3.nodeName(v.clientId, v.orgNodeId) + ' on the ' + S3.shiftName(v.clientId, v.shiftId) + ' Shift for ' + S3.fmtDate(v.startDate > TODAY ? v.startDate : TODAY) + '.');
      v.publishedAt = now(); v.publishedBy = S3.me; v.updatedAt = now();
      log('vacancy', id, 'Updated', 'Status: Draft → Open (Abstract Tier)'); save();
    },
    changeCount: function (id, n) {
      var v = rawV(id), d = dressV(v); clientActive(v.clientId, 'the position count can’t be changed');
      if (n < d.filledCount) refuse('VACANCY_POSITION_COUNT_BELOW_FILLED', d.filledCount + (d.filledCount === 1 ? ' position is' : ' positions are') + ' filled, so the count can’t go below ' + d.filledCount + '. Cancel a booking first if you need fewer.', { filledCount: d.filledCount });
      var before = d.positionCount, delta = n - before;
      if (delta > 0) { var top = v.positions.reduce(function (m, p) { return Math.max(m, p.n); }, 0); for (var i = 1; i <= delta; i++) v.positions.push(pos(top + i, 'Open')); }
      if (delta < 0) { var opens = v.positions.filter(function (p) { return p.status === 'Open'; }).sort(function (a, b) { return b.n - a.n; }); opens.slice(0, -delta).forEach(function (p) { p.status = 'Cancelled'; p.cancelledAt = now(); p.cancelledReason = 'count_reduced'; }); }
      v.updatedAt = now(); log('vacancy', id, 'Updated', 'Position count: ' + before + ' → ' + n); save();
    },
    close: function (id, reason) {
      var v = rawV(id);
      v.positions.forEach(function (p) { if (p.status === 'Open') { p.status = 'Cancelled'; p.cancelledAt = now(); p.cancelledReason = 'vacancy_closed'; } });
      v.closedAt = now(); v.closedBy = S3.me; v.closeReason = reason; v.updatedAt = now();
      log('vacancy', id, 'Updated', 'Closed. Reason: ' + reason); save();
    },
    cancel: function (id, reason) {
      var v = rawV(id);
      v.positions.forEach(function (p) { if (p.status === 'Open') { p.status = 'Cancelled'; p.cancelledAt = now(); p.cancelledReason = 'vacancy_cancelled'; } });
      v.cancelledAt = now(); v.cancelledBy = S3.me; v.cancellationReason = reason; v.updatedAt = now();
      log('vacancy', id, 'Updated', 'Cancelled. Reason: ' + reason); save();
    },
    addDocument: function (id, name, size) { var v = rawV(id); v.documents.unshift({ name: name, size: size, by: S3.me, at: now() }); log('vacancy', id, 'Created', 'Document uploaded: ' + name); save(); },
    
    fill: function (f) {
      var v = rawV(f.vacancyId), p = v.positions.filter(function (x) { return x.n === f.positionNumber; })[0];
      clientActive(v.clientId, 'its positions can’t be filled');
      if (p.status !== 'Open') refuse('POSITION_NOT_OPEN', 'Position ' + p.n + ' is no longer open: it reads ' + p.status + '. Go back to the vacancy to see who filled it.');
      var cand = f.candidateId ? S3.candidate(f.candidateId) : S3.act.createCandidate(Object.assign({}, f.candidate, { jobRoleId: v.jobRoleId, createdFromFill: true }));
      var id = 'b' + (++db.seq.bk), started = f.startDate <= TODAY;
      var b = bk(id, 'BK-' + db.seq.bk, v.id, p.n, cand.id, cand.fullName, v.clientId, v.orgNodeId, v.jobRoleId, v.shiftId, f.startDate, f.endDate, f.workingTimes || v.workingTimes, started ? 'Active' : 'Pending Start', { createdBy: S3.me, createdAt: now(), updatedAt: now(), startedAt: started ? now() : null, startedBy: started ? S3.me : null });
      db.bookings.unshift(b);
      p.status = 'Filled'; p.bookingId = id; p.filledAt = now(); v.updatedAt = now();
      log('booking', id, 'Created', f.candidateId ? 'Booking created from the worker pool' : 'Booking created by a manual fill');
      log('vacancy', v.id, 'Updated', 'Position ' + p.n + ' filled: ' + b.reference);
      save(); S3.saveCandidates(); return id;
    },
    extend: function (id, end) {
      var b = rawB(id), was = b.endDate, st = b.status; bookingActive(b);
      b.endDate = end; if (b.status === 'Active' || b.status === 'Extended') { b.status = 'Extended'; b.extendedAt = now(); }
      b.updatedAt = now(); log('booking', id, 'Updated', 'End date: ' + S3.fmtDate(was) + ' → ' + S3.fmtDate(end) + (st !== b.status ? '. Status: ' + st + ' → ' + b.status : '')); save();
    },
    amend: function (id, end, times) {
      var b = rawB(id), parts = []; bookingActive(b);
      if (end && end !== b.endDate) { parts.push('End date: ' + S3.fmtDate(b.endDate) + ' → ' + S3.fmtDate(end)); b.endDate = end; }
      if (times !== b.workingTimes) { parts.push('Working times: ' + (b.workingTimes || 'none') + ' → ' + (times || 'none')); b.workingTimes = times; }
      b.updatedAt = now(); log('booking', id, 'Updated', parts.join('. ') || 'No change'); save();
    },
    start: function (id) { var b = rawB(id); bookingActive(b); b.status = 'Active'; b.startedAt = now(); b.startedBy = S3.me; b.updatedAt = now(); log('booking', id, 'Updated', 'Status: Pending Start → Active'); save(); },
    complete: function (id) { var b = rawB(id), st = b.status; bookingActive(b); b.status = 'Completed'; b.completedAt = now(); b.completedBy = S3.me; b.updatedAt = now(); log('booking', id, 'Updated', 'Status: ' + st + ' → Completed'); save(); },
    cancelBooking: function (id, reason) {
      var b = rawB(id), v = rawV(b.vacancyId), p = v.positions.filter(function (x) { return x.bookingId === id; })[0], st = b.status;
      b.status = 'Cancelled'; b.cancelledAt = now(); b.cancelledBy = S3.me; b.cancellationReason = reason; b.updatedAt = now();
      log('booking', id, 'Updated', 'Status: ' + st + ' → Cancelled. Reason: ' + reason);
      if (p) {
        p.bookingId = null; p.filledAt = null;
        if (v.cancelledAt) { p.status = 'Cancelled'; p.cancelledAt = now(); p.cancelledReason = 'vacancy_cancelled'; log('vacancy', v.id, 'Updated', 'Position ' + p.n + ' cancelled by the cancellation of ' + b.reference); }
        else { p.status = 'Open'; if (v.closedAt && (!v.reopenedAt || v.closedAt > v.reopenedAt)) { v.reopenedAt = now(); v.reopenedByBooking = b.reference; } log('vacancy', v.id, 'Updated', 'Position ' + p.n + ' returned to Open by the cancellation of ' + b.reference); }
      }
      save();
    },
    
    _: null
  };
  
  function bookingActive(b) { if (CLIENTS[b.clientId].status !== 'Active') refuse('BOOKING_CLIENT_NOT_ACTIVE', CLIENTS[b.clientId].name + ' is ' + CLIENTS[b.clientId].status + ', so this booking can’t be changed. It can still be cancelled.', { lifecycleStatus: CLIENTS[b.clientId].status }); }

  // ---------- the candidate record: Abstract's copy only ----------
  function item(status, expiry, doc) { return { status: status, expiryDate: expiry || null, doc: doc || null }; }
  function allItems(a, b, c, d) { return { right_to_work: a, dbs_check: b, references: c, hs_training: d }; }
  var ADDR = function (l, t, p) { return { line1: l, line2: null, town: t, postcode: p, country: 'GB' }; };
  function cand(id, name, role, dob, tel, email, addr, ni, kin, items, lic, extra) {
    return Object.assign({ id: id, fullName: name, jobRoleId: role, ownerType: 'abstract', ownerName: 'Abstract', dateOfBirth: dob, telephone: tel, email: email, address: addr, nationalInsuranceNumber: ni, nextOfKin: kin, items: items, licences: lic, documents: [], photo: null, unavailableFrom: null, unavailableUntil: null, unavailabilityNote: null, legalHold: false, legalHoldReason: null, legalHoldSetBy: null, legalHoldSetAt: null, anonymisedAt: null, createdFromFill: false, createdAt: '2026-03-02T09:00:00', updatedAt: '2026-10-01T09:00:00' }, extra || {});
  }
  var OK = function (e, d) { return item('Compliant', e, d); }, NA = item('Not Applicable'), PD = item('Pending');
  function seedCandidates() {
    return [
      cand('c-mo', 'Marek Nowak', 'jr-fd', '1988-04-12', '07700 900101', 'marek.nowak@example.com', ADDR('14 Armley Road', 'Leeds', 'LS12 2AA'), 'QQ123456C', { name: 'Anna Nowak', relationship: 'Spouse', telephone: '07700 900201' }, allItems(OK('2029-04-30', 'Right to work share code.pdf'), OK('2027-02-01', 'DBS certificate.pdf'), OK(), OK('2027-06-30')), [{ id: 'l1', licenceType: 'Reach truck (RTITB)', issuingBody: 'RTITB', expiryDate: '2027-08-31', removedAt: null }], { documents: [{ name: 'Right to work share code.pdf', size: '220 KB', by: 'Sarah Mitchell', at: '2026-03-02T09:30:00' }, { name: 'DBS certificate.pdf', size: '310 KB', by: 'Sarah Mitchell', at: '2026-03-02T09:32:00' }] }),
      cand('c-tw', 'Tasha Williams', 'jr-fd', '1993-11-02', '07700 900102', 'tasha.w@example.com', ADDR('3 Kirkstall Lane', 'Leeds', 'LS5 3AA'), 'QQ223344A', { name: 'Devon Williams', relationship: 'Brother', telephone: '07700 900202' }, allItems(OK('2030-01-31'), NA, OK(), OK('2027-03-31')), [{ id: 'l2', licenceType: 'Reach truck (RTITB)', issuingBody: 'RTITB', expiryDate: '2026-09-30', removedAt: null }]),
      cand('c-sa', 'Samuel Adeyemi', 'jr-wo', '1990-07-21', '07700 900103', 'samuel.adeyemi@example.com', ADDR('58 Soho Road', 'Birmingham', 'B21 9BH'), 'QQ334455B', { name: 'Grace Adeyemi', relationship: 'Spouse', telephone: '07700 900203' }, allItems(OK('2031-05-31'), OK('2027-09-01'), OK(), OK('2027-05-31')), []),
      cand('c-lk', 'Lucy O’Brien', 'jr-wo', '1997-02-14', '07700 900104', 'lucy.obrien@example.com', ADDR('9 Aston Street', 'Birmingham', 'B4 7ET'), null, null, allItems(OK(), PD, OK(), PD), []),
      cand('c-ra', 'Ravi Patel', 'jr-wo', '1985-09-09', '07700 900105', 'ravi.patel@example.com', ADDR('21 Barking Road', 'London', 'E6 1PW'), 'QQ445566C', { name: 'Meena Patel', relationship: 'Mother', telephone: '07700 900205' }, allItems(OK('2028-12-31'), NA, OK(), OK('2027-01-31')), [{ id: 'l3', licenceType: 'Counterbalance (ITSSAR)', issuingBody: 'ITSSAR', expiryDate: '2027-02-28', removedAt: null }]),
      cand('c-er', 'Ewa Rybak', 'jr-wo', '1994-05-30', '07700 900106', null, ADDR('2 Holbeck Moor', 'Leeds', 'LS11 9QF'), 'QQ556677D', null, allItems(item('Expired', '2026-08-31'), OK(), OK(), OK('2027-04-30')), []),
      cand('c-gh', 'George Hall', 'jr-wo', '1979-12-01', '07700 900107', 'george.hall@example.com', ADDR('77 Bristol Road', 'Birmingham', 'B5 7TU'), 'QQ667788A', { name: 'Sue Hall', relationship: 'Spouse', telephone: '07700 900207' }, allItems(OK(), OK(), OK(), OK('2027-02-28')), [], { unavailableFrom: '2026-10-05', unavailableUntil: '2026-10-23', unavailabilityNote: 'Annual leave' }),
      cand('c-mo2', 'Nadia Hussain', 'jr-wo', '1991-03-17', '07700 900108', 'nadia.hussain@example.com', ADDR('40 Stratford Road', 'Birmingham', 'B11 1AN'), 'QQ778899B', { name: 'Imran Hussain', relationship: 'Husband', telephone: '07700 900208' }, allItems(OK('2029-11-30'), NA, OK(), OK('2027-07-31')), []),
      cand('c-jd', 'Joao Dias', 'jr-wo', '1996-08-08', '07700 900109', 'joao.dias@example.com', ADDR('6 Digbeth', 'Birmingham', 'B5 6DR'), 'QQ889900C', { name: 'Rita Dias', relationship: 'Sister', telephone: '07700 900209' }, allItems(OK('2030-06-30'), OK('2027-10-01'), OK(), OK('2027-08-31')), [{ id: 'l4', licenceType: 'Counterbalance (ITSSAR)', issuingBody: 'ITSSAR', expiryDate: '2027-11-30', removedAt: null }], { legalHold: true, legalHoldReason: 'Employment tribunal claim, keep until it concludes.', legalHoldSetBy: 'James Okafor', legalHoldSetAt: '2026-09-14T10:00:00' }),
      cand('c-al', 'Aisha Lewis', 'jr-pp', '1999-01-25', '07700 900110', 'aisha.lewis@example.com', ADDR('12 Meanwood Road', 'Leeds', 'LS7 2AB'), null, null, allItems(PD, PD, PD, PD), []),
      cand('c-ax', 'XXXXXXXX', 'jr-wo', '', '', null, null, null, null, allItems(OK(), NA, OK(), OK()), [], { anonymisedAt: '2026-09-30T02:10:00' })
    ];
  }
  var cdb = read(KEY + '-abstract') || seedCandidates();
  S3.saveCandidates = function () { write(KEY + '-abstract', cdb); };
  var _reset = S3.reset; S3.reset = function () { _reset(); cdb = seedCandidates(); };
  function rollup(c) { var w = Object.keys(c.items).map(function (k) { return c.items[k].status; }); if (w.indexOf('Expired') >= 0) return 'Expired'; if (w.indexOf('Pending') >= 0) return 'Pending'; return 'Compliant'; }
  function current(c) { return db.bookings.filter(function (b) { return b.candidateId === c.id && (b.status === 'Active' || b.status === 'Extended') && b.startDate <= TODAY && TODAY <= b.endDate; })[0] || null; }
  function dressC(c) {
    var o = Object.assign({}, c), cur = current(c);
    o.jobRoleTitle = c.jobRoleId ? JOB_ROLES[c.jobRoleId] : null; o.complianceStatus = rollup(c); o.anonymised = !!c.anonymisedAt;
    o.availability = cur ? 'On Assignment' : (c.unavailableFrom && c.unavailableFrom <= TODAY && (!c.unavailableUntil || c.unavailableUntil >= TODAY)) ? 'Unavailable' : 'Available';
    o.currentBooking = cur ? dressB(cur) : null;
    o.licences = c.licences.filter(function (l) { return !l.removedAt; }).map(function (l) { return Object.assign({}, l, { expired: !!l.expiryDate && l.expiryDate < TODAY }); });
    var bs = db.bookings.filter(function (b) { return b.candidateId === c.id; });
    if (bs.some(function (b) { return ['Pending Start', 'Active', 'Extended'].indexOf(b.status) >= 0; })) o.retainUntil = null;
    else { var last = bs.reduce(function (m, b) { return b.endDate > m ? b.endDate : m; }, ''); var base = last || c.createdAt.slice(0, 10); var d = new Date(base + 'T00:00:00'); d.setDate(d.getDate() + 2190); o.retainUntil = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    return o;
  }
  S3.candidates = function () { return cdb.filter(function (c) { return !c.anonymisedAt; }).map(dressC); };
  S3.candidate = function (id) { var c = cdb.filter(function (x) { return x.id === id; })[0]; return c ? dressC(c) : null; };
  S3.rawCandidate = function (id) { return cdb.filter(function (x) { return x.id === id; })[0]; };
  S3.overlaps = function (cid, from, to) { return S3.bookings().filter(function (b) { return b.candidateId === cid && b.status !== 'Cancelled' && b.status !== 'Completed' && b.startDate <= to && b.endDate >= from; }); };
  S3.matchingPositions = function (c) { return S3.vacancies().filter(function (v) { return c.jobRoleId === v.jobRoleId && v.openCount > 0 && v.publishedAt && !v.cancelledAt; }); };
  S3.act.createCandidate = function (f) {
    var c = cand('c' + Date.now(), f.fullName, f.jobRoleId || null, f.dateOfBirth, f.telephone, f.email || null, f.address || null, f.nationalInsuranceNumber || null, f.nextOfKin || null, allItems(PD, PD, PD, PD), f.licences || [], { createdFromFill: !!f.createdFromFill, createdAt: now(), updatedAt: now() });
    if (f.items) c.items = f.items;
    cdb.unshift(c); S3.saveCandidates(); return dressC(c);
  };
  S3.act.updateCandidate = function (id, patch) { var c = S3.rawCandidate(id); Object.assign(c, patch, { updatedAt: now() }); S3.saveCandidates(); };
  // the mandated checks resolved at the vacancy's node (compliance.required_checks): information on Fill Position, nothing else
  S3.mandatedChecks = function (v) { return v.clientId === 'acme' ? ['Right to work', 'H&S training', 'Reach truck licence'].slice(0, v.jobRoleId === 'jr-fd' ? 3 : 2) : ['Right to work']; };
  

  // ---------- formatting ----------
  var GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  S3.esc = esc;
  S3.money = function (s) { return GBP.format(Number(s)); };
  S3.fmtDate = function (iso) { if (!iso) return '—'; var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
  S3.fmtDateTime = function (iso) { var d = new Date(iso); return S3.fmtDate(iso) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  S3.initials = function (n) { return String(n).split(/\s+/).map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase(); };

  // ---------- the look: recipes as the slice 2 pages draw them ----------
  var C = {
    sec: 'inline-flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 rounded-lg px-3 py-2 text-xs font-semibold transition-colors min-h-[38px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1',
    pri: 'inline-flex items-center justify-center gap-2 text-white rounded-lg px-4 py-2.5 text-xs font-semibold hover:opacity-95 transition-opacity min-h-[38px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
    priStyle: 'background:linear-gradient(135deg,#1D4ED8,#5B2E91)',
    dan: 'inline-flex items-center justify-center gap-2 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-lg px-3 py-2 text-xs font-semibold min-h-[38px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1',
    ghost: 'inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline rounded px-1 py-1 min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1',
    input: 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-600/20',
    err: 'border-red-400 bg-red-50/40',
    card: 'bg-white rounded-2xl border border-slate-200 shadow-sm',
    th: 'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
    td: 'px-4 py-3 text-sm text-slate-700',
    label: 'block text-xs font-semibold text-slate-700 mb-1.5',
    link: 'text-blue-700 hover:text-blue-900 hover:underline font-semibold rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1'
  };
  S3.C = C;
  var BUCKET = { neutral: 'bg-slate-100 text-slate-700 border border-slate-200', info: 'bg-blue-50 text-blue-700 border border-blue-200', released: 'bg-purple-50 text-purple-700 border border-purple-200', waiting: 'bg-amber-50 text-amber-700 border border-amber-200', good: 'bg-emerald-50 text-emerald-700 border border-emerald-200', bad: 'bg-red-50 text-red-700 border border-red-200', closed: 'bg-slate-100 text-slate-600 border border-slate-200' };
  var WORD = {
    'Draft': ['neutral', 'fa-file-pen'], 'Open (Abstract Tier)': ['info', 'fa-circle-dot'], 'Released to Agencies': ['released', 'fa-paper-plane'], 'Partially Filled': ['waiting', 'fa-circle-half-stroke'], 'Filled': ['good', 'fa-circle-check'], 'Closed': ['closed', 'fa-lock'], 'Cancelled': ['bad', 'fa-ban'],
    'Open': ['info', 'fa-circle-dot'],
    'Pending Start': ['neutral', 'fa-clock'], 'Active': ['good', 'fa-circle-check'], 'Extended': ['waiting', 'fa-calendar-plus'], 'Completed': ['good', 'fa-flag-checkered'],
    'Compliant': ['good', 'fa-circle-check'], 'Pending': ['waiting', 'fa-hourglass-half'], 'Expired': ['bad', 'fa-circle-xmark'], 'Not Applicable': ['neutral', 'fa-minus'],
    'Available': ['good', 'fa-circle-check'], 'On Assignment': ['info', 'fa-briefcase'], 'Unavailable': ['neutral', 'fa-user-slash'],
    'Suspended': ['bad', 'fa-ban']
  };
  var ui = S3.ui = {};
  ui.badge = function (s, small) { var w = WORD[s] || WORD.Draft; return '<span class="inline-flex items-center gap-1.5 ' + (small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs') + ' rounded-full font-semibold whitespace-nowrap ' + BUCKET[w[0]] + '"><i class="fa-solid ' + w[1] + ' text-[10px]" aria-hidden="true"></i>' + esc(s) + '</span>'; };
  var MARK = { 'default': 'bg-slate-100 text-slate-700 border-slate-200', success: 'bg-emerald-50 text-emerald-700 border-emerald-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', info: 'bg-blue-50 text-blue-700 border-blue-200', danger: 'bg-red-50 text-red-700 border-red-200' };
  ui.marker = function (t, v) { return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ' + MARK[v || 'default'] + '">' + esc(t) + '</span>'; };
  
  ui.source = function () { return '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-200"><i class="fa-solid fa-building-shield text-[10px]" aria-hidden="true"></i>Abstract-sourced</span>'; };
  
  ui.positions = function (filled, total) { var p = total ? Math.round(filled / total * 100) : 0; return '<div class="flex items-center gap-2"><span class="text-sm font-semibold text-slate-900 tnum whitespace-nowrap">' + filled + ' / ' + total + '</span><div class="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true"><div class="h-full bg-emerald-500" style="width:' + p + '%"></div></div></div>'; };
  ui.empty = function (icon, title, text, cta) { return '<div class="' + C.card + ' px-6 py-12 text-center"><div class="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4"><i class="fa-solid ' + icon + ' text-xl" aria-hidden="true"></i></div><h2 class="text-base font-bold text-slate-900">' + esc(title) + '</h2>' + (text ? '<p class="text-sm text-slate-600 mt-1 max-w-md mx-auto">' + esc(text) + '</p>' : '') + (cta ? '<div class="mt-5">' + cta + '</div>' : '') + '</div>'; };
  ui.banner = function (tone, html) { var t = { error: ['border-red-200 bg-red-50 text-red-800', 'fa-circle-exclamation'], warning: ['border-amber-200 bg-amber-50 text-amber-800', 'fa-triangle-exclamation'], info: ['border-blue-200 bg-blue-50 text-blue-800', 'fa-circle-info'], success: ['border-emerald-200 bg-emerald-50 text-emerald-800', 'fa-circle-check'] }[tone]; return '<div class="flex gap-3 rounded-xl border px-4 py-3 text-sm ' + t[0] + '"' + (tone === 'error' ? ' role="alert"' : '') + '><i class="fa-solid ' + t[1] + ' mt-0.5" aria-hidden="true"></i><div class="min-w-0">' + html + '</div></div>'; };
  ui.dl = function (rows) { return '<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">' + rows.map(function (r) { return '<div class="min-w-0"><dt class="text-xs font-medium text-slate-500">' + esc(r[0]) + '</dt><dd class="text-sm text-slate-800 mt-0.5 break-words">' + (r[1] == null || r[1] === '' ? '<span class="text-slate-500">—</span>' : r[1]) + '</dd></div>'; }).join('') + '</dl>'; };
  ui.crumbs = function (items) { return '<nav aria-label="Breadcrumb" class="mb-3 text-xs text-slate-600"><ol class="flex flex-wrap items-center gap-1.5">' + items.map(function (it, i) { return '<li class="flex items-center gap-1.5">' + (i ? '<i class="fa-solid fa-chevron-right text-[9px] text-slate-400" aria-hidden="true"></i>' : '') + (it[1] ? '<a class="' + C.link + '" href="' + it[1] + '">' + esc(it[0]) + '</a>' : '<span class="font-semibold text-slate-800" aria-current="page">' + esc(it[0]) + '</span>') + '</li>'; }).join('') + '</ol></nav>'; };
  ui.pager = function (total, page, pages, word) { return '<div class="flex flex-wrap items-center justify-between gap-3 px-1 py-3"><p class="text-xs text-slate-600"><span class="font-semibold text-slate-800 tnum">' + total.toLocaleString('en-GB') + '</span> ' + esc(word) + '</p>' + (pages > 1 ? '<div class="flex items-center gap-1"><button type="button" data-pg="' + (page - 1) + '" ' + (page === 1 ? 'disabled' : '') + ' aria-label="Previous page" class="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"><i class="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i></button><span class="px-2 text-xs text-slate-600 tnum">Page ' + page + ' of ' + pages.toLocaleString('en-GB') + '</span><button type="button" data-pg="' + (page + 1) + '" ' + (page === pages ? 'disabled' : '') + ' aria-label="Next page" class="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"><i class="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i></button></div>' : '') + '</div>'; };
  ui.tile = function (label, n, icon) { return '<div class="' + C.card + ' p-4"><div class="flex items-center justify-between"><p class="text-xs font-medium text-slate-500">' + esc(label) + '</p><i class="fa-solid ' + icon + ' text-slate-400 text-xs" aria-hidden="true"></i></div><p class="text-2xl font-extrabold tracking-tight text-slate-900 tnum mt-1">' + Number(n).toLocaleString('en-GB') + '</p></div>'; };
  // A list: a table from md up, MobileCards below it (K: tables become cards at 375 px).
  ui.list = function (o) {
    return '<div class="hidden md:block ' + C.card + ' overflow-hidden"><div class="relative overflow-x-auto"><table class="w-full text-left"><caption class="sr-only">' + esc(o.caption) + '</caption><thead class="bg-slate-50 border-b border-slate-200"><tr>' + o.cols.map(function (c) { return '<th scope="col" class="' + C.th + (c.right ? ' text-right' : '') + '">' + (c.sr ? '<span class="sr-only">' + esc(c.sr) + '</span>' : esc(c.label)) + '</th>'; }).join('') + '</tr></thead><tbody class="divide-y divide-slate-100">' +
      o.rows.map(function (r) { return '<tr class="hover:bg-slate-50/60' + (o.href ? ' cursor-pointer' : '') + '"' + (o.href ? ' data-href="' + o.href(r) + '"' : '') + '>' + o.cols.map(function (c) { return '<td class="' + C.td + (c.right ? ' text-right tnum' : '') + (c.nowrap ? ' whitespace-nowrap' : '') + '">' + c.cell(r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div><ul class="md:hidden flex flex-col gap-3">' + o.rows.map(function (r) { return '<li>' + o.card(r) + '</li>'; }).join('') + '</ul>';
  };
  ui.mobileCard = function (o) { return '<div class="' + C.card + ' p-4"><div class="flex items-start justify-between gap-2"><div class="min-w-0">' + o.title + '</div><div class="flex-shrink-0">' + (o.badge || '') + '</div></div>' + (o.lines || []).map(function (l) { return '<p class="text-xs text-slate-600 mt-1">' + l + '</p>'; }).join('') + (o.actions ? '<div class="flex flex-wrap gap-2 mt-3">' + o.actions + '</div>' : '') + '</div>'; };
  ui.wireRows = function (root) { root.querySelectorAll('tr[data-href]').forEach(function (tr) { tr.onclick = function (e) { if (!e.target.closest('a,button')) location.href = tr.dataset.href; }; }); };
  // A filter bar, collapsed behind a button at 375 px (TSD state tables).
  ui.filterBar = function (id, html) {
    return '<div class="' + C.card + ' p-3 md:p-4 mb-4"><button type="button" class="md:hidden ' + C.sec + ' w-full" aria-expanded="false" aria-controls="' + id + '" data-filter-toggle><i class="fa-solid fa-filter" aria-hidden="true"></i> Filters</button><div id="' + id + '" class="hidden md:flex flex-wrap items-center gap-3 mt-3 md:mt-0">' + html + '</div></div>';
  };
  ui.wireFilterToggle = function (root) { root.querySelectorAll('[data-filter-toggle]').forEach(function (b) { b.onclick = function () { var p = document.getElementById(b.getAttribute('aria-controls')), open = p.classList.contains('hidden'); p.classList.toggle('hidden', !open); p.classList.toggle('flex', open); p.classList.toggle('flex-col', open); p.classList.toggle('items-stretch', open); b.setAttribute('aria-expanded', String(open)); }; }); };
  ui.select = function (id, label, icon, opts, value) { return '<label class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[38px] focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/20"><i class="fa-solid ' + icon + ' text-slate-400 text-xs" aria-hidden="true"></i><span class="sr-only">' + esc(label) + '</span><select id="' + id + '" class="bg-transparent text-xs font-medium text-slate-700 outline-none w-full">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; };
  ui.search = function (id, placeholder) { return '<label class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[38px] flex-1 min-w-[200px] focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/20"><i class="fa-solid fa-magnifying-glass text-slate-400 text-xs" aria-hidden="true"></i><span class="sr-only">' + esc(placeholder) + '</span><input id="' + id + '" type="search" placeholder="' + esc(placeholder) + '" class="bg-transparent text-sm text-slate-800 placeholder-slate-500 outline-none w-full"/></label>'; };
  ui.dates = function (idFrom, idTo) { return '<label class="flex items-center gap-2 text-xs font-medium text-slate-600"><span>Start from</span><input id="' + idFrom + '" type="date" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 min-h-[38px]"/></label><label class="flex items-center gap-2 text-xs font-medium text-slate-600"><span>to</span><input id="' + idTo + '" type="date" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 min-h-[38px]"/></label>'; };
  ui.field = function (f) {
    var c = C.input, id = f.id, v = f.value == null ? '' : f.value, ctl;
    if (f.type === 'textarea') ctl = '<textarea id="' + id + '" rows="' + (f.rows || 3) + '" class="' + c + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(v) + '</textarea>';
    else if (f.type === 'select') ctl = '<select id="' + id + '" class="' + c + '">' + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    else ctl = '<input id="' + id + '" type="' + (f.type || 'text') + '" class="' + c + '" value="' + esc(v) + '" placeholder="' + esc(f.placeholder || '') + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + (f.readonly ? ' readonly' : '') + '/>';
    return '<div' + (f.wide ? ' class="sm:col-span-2"' : '') + '><label for="' + id + '" class="' + C.label + '">' + esc(f.label) + (f.required ? ' <span class="text-red-700">*</span><span class="sr-only"> required</span>' : '') + '</label>' + ctl + (f.hint ? '<p class="text-xs text-slate-500 mt-1">' + esc(f.hint) + '</p>' : '') + '<p id="' + id + '-err" class="text-xs font-medium text-red-700 mt-1" style="display:none" role="alert"></p></div>';
  };
  ui.setErr = function (id, msg) { var i = document.getElementById(id), e = document.getElementById(id + '-err'); if (!i) return; C.err.split(' ').forEach(function (k) { i.classList.toggle(k, !!msg); }); if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); if (e) { e.textContent = msg || ''; e.style.display = msg ? '' : 'none'; } };
  ui.showErrs = function (errs, ids) { (ids || []).forEach(function (id) { ui.setErr(id, null); }); var first; Object.keys(errs).forEach(function (id) { ui.setErr(id, errs[id]); first = first || id; }); if (first) { var el = document.getElementById(first); if (el) el.focus(); } return !first; };

  // ---------- Dialog: a Modal or a ConfirmDialog with typed fields and field errors (kernel Modal, ConfirmDialog) ----------
  S3.dialog = function (o) {
    var danger = o.tone === 'danger', last = document.activeElement;
    var scrim = document.createElement('div'); scrim.className = 's1-scrim'; scrim.setAttribute('role', 'dialog'); scrim.setAttribute('aria-modal', 'true'); scrim.setAttribute('aria-labelledby', 's3-dlg-t');
    scrim.innerHTML = '<div class="s1-dialog" style="max-width:' + (o.width || 480) + 'px"><div style="padding:20px 20px 8px"><h2 id="s3-dlg-t">' + esc(o.title) + '</h2>' + (o.body ? '<p style="margin-top:6px">' + o.body + '</p>' : '') + '<div id="s3-dlg-banner" style="margin-top:10px"></div><div class="grid gap-3 mt-3">' + (o.fields || []).map(ui.field).join('') + '</div></div><div class="s1-dlg-foot"><button type="button" class="s1-btn" data-x>' + esc(o.cancel || 'Cancel') + '</button><button type="button" class="s1-btn ' + (danger ? 's1-btn-danger' : 's1-btn-primary') + '" data-ok>' + esc(o.cta) + '</button></div></div>';
    function close() { scrim.remove(); if (last && last.focus) last.focus(); }
    scrim.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { var f = scrim.querySelectorAll('button,textarea,input,select'), a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); } }
    });
    document.body.appendChild(scrim);
    var api = { close: close, banner: function (tone, html) { document.getElementById('s3-dlg-banner').innerHTML = html ? ui.banner(tone, html) : ''; } };
    scrim.querySelector('[data-x]').onclick = close;
    scrim.querySelector('[data-ok]').onclick = function () {
      var vals = {}, ids = (o.fields || []).map(function (f) { return f.id; });
      ids.forEach(function (id) { vals[id] = document.getElementById(id).value.trim(); });
      var errs = o.validate ? o.validate(vals) : {};
      (o.fields || []).forEach(function (f) { if (f.required && !vals[f.id] && !errs[f.id]) errs[f.id] = f.requiredMessage || (f.label + ' is required.'); });
      if (!ui.showErrs(errs, ids)) return;
      try { if (o.onOk(vals, api) !== false) close(); } catch (e) { if (e.code) api.banner('error', esc(e.message)); else throw e; }
    };
    var first = scrim.querySelector('input,textarea,select') || scrim.querySelector('[data-ok]'); first.focus();
    return api;
  };

  // ---------- Tree: the kernel component, single selection (WAI-ARIA tree) ----------
  S3.tree = function (host, o) {
    var nodes = o.nodes, expanded = {}, value = o.value || null, q = '', depthOf = {};
    function kids(p) { return nodes.filter(function (n) { return n.parentId === p; }); }
    (function walk(p, d) { kids(p).forEach(function (n) { depthOf[n.id] = d; if (d < (o.expandDepth == null ? 2 : o.expandDepth)) expanded[n.id] = true; walk(n.id, d + 1); }); })(null, 0);
    function matches(n) { if (n.name.toLowerCase().indexOf(q) >= 0) return true; return kids(n.id).some(matches); }
    function rows(p, out) { kids(p).forEach(function (n) { if (q && !matches(n)) return; out.push(n); if (expanded[n.id] || q) rows(n.id, out); }); return out; }
    var hits = function () { return nodes.filter(function (n) { return !n.root && n.name.toLowerCase().indexOf(q) >= 0; }).length; };
    host.innerHTML = '<div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[38px] mb-2"><i class="fa-solid fa-magnifying-glass text-slate-400 text-xs" aria-hidden="true"></i><input type="search" aria-label="Search the structure" placeholder="Search the structure" class="bg-transparent text-sm text-slate-800 placeholder-slate-500 outline-none w-full"/></div><p class="text-xs text-slate-500 mb-1" data-tree-count style="display:none"></p><ul role="tree" aria-label="' + esc(o.label || 'Structure') + '" class="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-1"></ul>';
    var ul = host.querySelector('ul'), input = host.querySelector('input'), count = host.querySelector('[data-tree-count]'), focusId = null;
    function draw() {
      var list = rows(null, []);
      if (!focusId || !list.some(function (n) { return n.id === focusId; })) focusId = value && list.some(function (n) { return n.id === value; }) ? value : (list[0] && list[0].id);
      ul.innerHTML = list.map(function (n) {
        var has = kids(n.id).length > 0, dis = n.root || (o.disabledIds || []).indexOf(n.id) >= 0, sel = n.id === value;
        return '<li role="treeitem" data-id="' + n.id + '" tabindex="' + (n.id === focusId ? 0 : -1) + '" aria-level="' + (depthOf[n.id] + 1) + '" aria-selected="' + sel + '"' + (has ? ' aria-expanded="' + !!(expanded[n.id] || q) + '"' : '') + (dis ? ' aria-disabled="true"' : '') + ' class="flex items-center gap-2 rounded-lg pr-2 min-h-[36px] text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ' + (sel ? 'bg-blue-50 text-blue-800 font-semibold' : dis ? 'text-slate-500 cursor-default' : 'text-slate-700 hover:bg-slate-50') + '" style="padding-left:' + (8 + depthOf[n.id] * 16) + 'px">' + (has ? '<i data-tw class="fa-solid fa-chevron-' + (expanded[n.id] || q ? 'down' : 'right') + ' text-[10px] text-slate-400 w-3" aria-hidden="true"></i>' : '<span class="w-3"></span>') + '<span class="truncate">' + esc(n.name) + '</span>' + (n.root ? '<span class="ml-auto text-[11px] text-slate-500">Choose a place within it</span>' : (n.nodeType ? '<span class="ml-auto text-[11px] text-slate-500 capitalize">' + esc(n.nodeType.replace('_', ' ')) + '</span>' : '')) + '</li>';
      }).join('') || '<li class="px-3 py-4 text-sm text-slate-500">No node matches.</li>';
      if (q) { count.style.display = ''; count.textContent = hits() + ' of ' + nodes.filter(function (n) { return !n.root; }).length + ' nodes match'; } else count.style.display = 'none';
    }
    function choose(id) { var n = nodes.filter(function (x) { return x.id === id; })[0]; if (!n || n.root || (o.disabledIds || []).indexOf(id) >= 0) return; value = id; draw(); if (o.onChange) o.onChange(id); }
    ul.addEventListener('click', function (e) { var li = e.target.closest('[data-id]'); if (!li) return; focusId = li.dataset.id; if (e.target.hasAttribute('data-tw')) { expanded[focusId] = !expanded[focusId]; draw(); } else choose(focusId); });
    ul.addEventListener('keydown', function (e) {
      var list = rows(null, []), i = list.findIndex(function (n) { return n.id === focusId; }), n = list[i]; if (!n) return;
      var go = function (j) { if (list[j]) { focusId = list[j].id; draw(); ul.querySelector('[data-id="' + focusId + '"]').focus(); } };
      if (e.key === 'ArrowDown') { go(i + 1); e.preventDefault(); } else if (e.key === 'ArrowUp') { go(i - 1); e.preventDefault(); } else if (e.key === 'Home') { go(0); e.preventDefault(); } else if (e.key === 'End') { go(list.length - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { if (kids(n.id).length && !expanded[n.id]) { expanded[n.id] = true; draw(); ul.querySelector('[data-id="' + focusId + '"]').focus(); } else go(i + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { if (expanded[n.id]) { expanded[n.id] = false; draw(); ul.querySelector('[data-id="' + focusId + '"]').focus(); } else { var pi = list.findIndex(function (x) { return x.id === n.parentId; }); go(pi); } e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { choose(n.id); ul.querySelector('[data-id="' + focusId + '"]').focus(); e.preventDefault(); }
    });
    input.addEventListener('input', function () { q = input.value.trim().toLowerCase(); draw(); });
    draw();
    return { get: function () { return value; }, set: function (v) { value = v; draw(); } };
  };

  // ---------- Combobox: the kernel's ARIA autocomplete ----------
  S3.combobox = function (host, o) {
    var value = o.value || null, active = -1, id = o.id;
    var labelOf = function (v) { var m = o.options().filter(function (x) { return x[0] === v; })[0]; return m ? m[1] : ''; };
    host.innerHTML = '<label for="' + id + '" class="' + C.label + '">' + esc(o.label) + (o.required ? ' <span class="text-red-700">*</span><span class="sr-only"> required</span>' : '') + '</label><div class="relative"><input id="' + id + '" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="' + id + '-list" autocomplete="off" class="' + C.input + ' pr-8" placeholder="' + esc(o.placeholder || 'Search') + '" value="' + esc(labelOf(value)) + '"' + (o.disabled ? ' disabled' : '') + '/><i class="fa-solid fa-chevron-down text-[10px] text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true"></i><ul id="' + id + '-list" role="listbox" aria-label="' + esc(o.label) + '" class="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-2xl hidden"></ul></div><p id="' + id + '-err" class="text-xs font-medium text-red-700 mt-1" style="display:none" role="alert"></p>';
    var input = host.querySelector('input'), ul = host.querySelector('ul');
    function filtered(all) { var q = all ? '' : input.value.trim().toLowerCase(); return o.options().filter(function (x) { return x[1].toLowerCase().indexOf(q) >= 0; }); }
    function draw(all) { var l = filtered(all); ul.innerHTML = l.map(function (x, i) { return '<li role="option" id="' + id + '-o' + i + '" data-v="' + esc(x[0]) + '" aria-selected="' + (x[0] === value) + '" class="px-3 py-2 text-sm cursor-pointer min-h-[36px] ' + (i === active ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50') + '">' + esc(x[1]) + '</li>'; }).join('') || '<li class="px-3 py-2 text-sm text-slate-500">No match</li>'; ul.classList.remove('hidden'); input.setAttribute('aria-expanded', 'true'); if (active >= 0) input.setAttribute('aria-activedescendant', id + '-o' + active); else input.removeAttribute('aria-activedescendant'); }
    function hide() { ul.classList.add('hidden'); input.setAttribute('aria-expanded', 'false'); active = -1; }
    function pick(v) { value = v; input.value = labelOf(v); hide(); if (o.onChange) o.onChange(v); }
    input.addEventListener('focus', function () { draw(true); });
    input.addEventListener('input', function () { active = -1; draw(false); });
    input.addEventListener('keydown', function (e) {
      var l = filtered(ul.classList.contains('hidden'));
      if (e.key === 'ArrowDown') { active = Math.min(active + 1, l.length - 1); draw(true); e.preventDefault(); } else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); draw(true); e.preventDefault(); }
      else if (e.key === 'Enter') { if (active >= 0 && l[active]) { pick(l[active][0]); e.preventDefault(); } } else if (e.key === 'Escape') { hide(); }
    });
    input.addEventListener('blur', function () { setTimeout(function () { hide(); input.value = labelOf(value); }, 120); });
    ul.addEventListener('mousedown', function (e) { var li = e.target.closest('[data-v]'); if (li) { e.preventDefault(); pick(li.dataset.v); } });
    return { get: function () { return value; }, set: function (v) { value = v; input.value = labelOf(v); } };
  };

  // ---------- FileUpload: drop zone and picker; the page uploads, this reports ----------
  S3.fileUpload = function (host, o) {
    var acc = o.accept || '.pdf,.png,.jpg,.jpeg,.docx';
    host.innerHTML = '<label class="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-300 rounded-xl px-4 py-5 text-center cursor-pointer hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-600"><i class="fa-solid fa-cloud-arrow-up text-slate-400" aria-hidden="true"></i><span class="text-sm font-semibold text-slate-700">' + esc(o.label || 'Drop a file here or choose one') + '</span><span class="text-xs text-slate-500">' + esc(o.hint || 'PDF, Word or an image, up to 20 MB') + '</span><input type="file" accept="' + acc + '" class="sr-only" aria-label="' + esc(o.label || 'Choose a file') + '"/></label><div data-up class="mt-2"></div>';
    var input = host.querySelector('input'), box = host.querySelector('[data-up]');
    function take(file) {
      var size = file.size > 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(file.size / 1024)) + ' KB', p = 0;
      if (file.size > 20971520) { box.innerHTML = ui.banner('error', 'That file is larger than 20 MB, so it wasn’t uploaded.'); return; }
      var t = setInterval(function () {
        p += 34; box.innerHTML = '<p class="text-xs text-slate-600">' + esc(file.name) + ' · ' + size + '</p><div class="h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden" role="progressbar" aria-valuenow="' + Math.min(p, 100) + '" aria-valuemin="0" aria-valuemax="100" aria-label="Uploading"><div class="h-full bg-blue-600" style="width:' + Math.min(p, 100) + '%"></div></div>';
        if (p >= 100) { clearInterval(t); box.innerHTML = ''; input.value = ''; o.onFile(file.name, size); }
      }, 160);
    }
    input.addEventListener('change', function () { if (input.files[0]) take(input.files[0]); });
    var zone = host.querySelector('label');
    ['dragover', 'drop'].forEach(function (k) { zone.addEventListener(k, function (e) { e.preventDefault(); if (k === 'drop' && e.dataTransfer.files[0]) take(e.dataTransfer.files[0]); }); });
  };

  // ---------- PositionRoster: one component, two variants (kernel pattern; TSD §3.3.9) ----------
  S3.roster = function (v, o) {
    var abs = o.variant === 'abstract', page = o.page || 1, PAGE = 50, rows = v.rosterRows, pages = Math.ceil(rows.length / PAGE) || 1, view = rows.slice((page - 1) * PAGE, page * PAGE);
    var bookingHref = function (r) { return (abs ? 'abstract' : 'client') + '.bookings.booking-detail.html?id=' + r.bookingId + (abs ? '&from=vacancy' : ''); };
    var head = '<div class="px-5 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-3"><h2 class="text-sm font-bold text-slate-900">Positions</h2>' + ui.badge(v.status) + '</div><div class="flex items-center gap-3"><p class="text-sm font-semibold text-slate-800 tnum">' + v.filledCount + ' of ' + v.positionCount + ' positions filled</p><div class="w-28 h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true"><div class="h-full bg-emerald-500" style="width:' + (v.positionCount ? Math.round(v.filledCount / v.positionCount * 100) : 0) + '%"></div></div></div></div>';
    var cancelWord = function (r) { return r.cancelledReason === 'count_reduced' ? 'Removed by a count change' : r.cancelledReason === 'vacancy_closed' ? 'Cancelled when the vacancy closed' : 'Cancelled with the vacancy'; };
    var canFill = abs && o.canFill && (v.status === 'Open (Abstract Tier)' || v.status === 'Partially Filled');
    var fillLinks = function (r) { var h = 'abstract.demand.fill-position.html?id=' + v.id + '&position=' + r.n; return '<span class="inline-flex flex-wrap gap-2"><a class="' + C.sec + '" href="' + h + '">Fill from pool</a><a class="' + C.sec + '" href="' + h + '&tab=manual">Record manual fill</a></span>'; };
    var cols =  abs ?
      [{ label: '#', cell: function (r) { return '<span class="tnum font-semibold text-slate-900">' + r.n + '</span>'; } }, { label: 'Status', cell: function (r) { return ui.badge(r.status); } },
      { label: 'Candidate', cell: function (r) { return r.candidateName ? '<a class="' + C.link + '" href="abstract.candidates.worker-profile.html?id=' + r.candidateId + '">' + esc(r.candidateName) + '</a>' : (r.status === 'Cancelled' ? '<span class="text-xs text-slate-500">' + cancelWord(r) + '</span>' : '<span class="text-slate-500">—</span>'); } },
      { label: 'Source', cell: function (r) { return r.status === 'Filled' ? ui.source() : '<span class="text-slate-500">—</span>'; } },
      { label: 'Booking ref', cell: function (r) { return r.bookingId ? '<a class="' + C.link + ' tnum" href="' + bookingHref(r) + '">' + esc(r.bookingReference) + '</a>' : '<span class="text-slate-500">—</span>'; } },
      { label: 'Filled on', nowrap: true, cell: function (r) { return r.filledAt ? S3.fmtDate(r.filledAt) : '<span class="text-slate-500">—</span>'; } },
      { sr: 'Action', right: true, cell: function (r) { return r.status === 'Open' && canFill ? fillLinks(r) : ''; } }] : 
      [{ label: '#', cell: function (r) { return '<span class="tnum font-semibold text-slate-900">' + r.n + '</span>'; } }, { label: 'Status', cell: function (r) { return ui.badge(r.status); } },
      { label: 'Candidate', cell: function (r) { return r.candidateName ? esc(r.candidateName) : '<span class="text-slate-500">—</span>'; } },
      { label: 'Supplied by', cell: function (r) { return r.supplyingParty ? esc(r.supplyingParty) : '<span class="text-slate-500">—</span>'; } },
      { label: 'Start date', nowrap: true, cell: function (r) { return r.startDate ? S3.fmtDate(r.startDate) : '<span class="text-slate-500">—</span>'; } },
      { label: 'Booking ref', cell: function (r) { return r.bookingId ? '<a class="' + C.link + ' tnum" href="' + bookingHref(r) + '">' + esc(r.bookingReference) + '</a>' : '<span class="text-slate-500">—</span>'; } }];
    var table = '<div class="hidden md:block relative overflow-x-auto border-t border-slate-200"><table class="w-full text-left"><caption class="sr-only">Positions on this vacancy</caption><thead class="bg-slate-50"><tr>' + cols.map(function (c) { return '<th scope="col" class="' + C.th + (c.right ? ' text-right' : '') + '">' + (c.sr ? '<span class="sr-only">' + c.sr + '</span>' : c.label) + '</th>'; }).join('') + '</tr></thead><tbody class="divide-y divide-slate-100">' + view.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td class="' + C.td + (c.right ? ' text-right' : '') + '">' + c.cell(r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    var cards = '<ul class="md:hidden flex flex-col gap-3 px-4 pb-4 pt-1">' + view.map(function (r) {
      var lines = [];
      if (r.candidateName) lines.push('Candidate: ' + (abs ? '<a class="' + C.link + '" href="abstract.candidates.worker-profile.html?id=' + r.candidateId + '">' + esc(r.candidateName) + '</a>' : esc(r.candidateName)));
      else if (r.status === 'Cancelled' && abs) lines.push(cancelWord(r));
      if (r.bookingId) lines.push('Booking: <a class="' + C.link + '" href="' + bookingHref(r) + '">' + esc(r.bookingReference) + '</a>');
      if (r.filledAt && abs) lines.push('Filled on ' + S3.fmtDate(r.filledAt));
      if (!abs && r.supplyingParty) lines.push('Supplied by ' + esc(r.supplyingParty));
      if (!abs && r.startDate) lines.push('Starts ' + S3.fmtDate(r.startDate));
      return '<li class="border border-slate-200 rounded-xl p-3"><div class="flex items-center justify-between gap-2"><span class="text-sm font-bold text-slate-900">Position ' + r.n + '</span>' + ui.badge(r.status, true) + '</div>' + lines.map(function (l) { return '<p class="text-xs text-slate-600 mt-1">' + l + '</p>'; }).join('') +  (abs && r.status === 'Filled' ? '<div class="mt-2">' + ui.source() + '</div>' : '') +  '' + (r.status === 'Open' && canFill ? '<div class="mt-2">' + fillLinks(r) + '</div>' : '') + '</li>';
    }).join('') + '</ul>';
    return '<section class="' + C.card + ' overflow-hidden" aria-label="Positions">' + head + table + cards + (pages > 1 ? '<div class="px-4 border-t border-slate-200">' + ui.pager(rows.length, page, pages, 'positions') + '</div>' : '') + '</section>';
  };

  // ---------- VacancyForm: one form in two portals (TSD §3.3.9, §5.5) ----------
  S3.vacancyForm = function (host, p) {
    var edit = p.mode === 'edit', v = edit ? S3.vacancy(p.vacancyId) : null, abs = p.portal === 'abstract';
    var detail = (abs ? 'abstract' : 'client') + '.demand.vacancy-detail.html', list = abs ? 'abstract.demand.vacancy-list.html' : 'client.demand.vacancies.html';
    var clientId = edit ? v.clientId : (abs ? (p.preset && p.preset.clientId) || null : S3.clientId);
    var locked = edit && v.filledCount > 0;
    var d = edit ? v : Object.assign({ jobTitle: '', startDate: '', endDate: '', workingTimes: '', closeDate: '', description: '', requirements: '', positionCount: 1, jobRoleId: null, orgNodeId: null, shiftId: null }, p.preset || {});
    var cardCls = C.card + ' p-5';
    function shiftOptions(c) { return c ? [['', 'Choose a Shift']].concat(SHIFTS[c].map(function (s) { return [s.id, s.name + (s.def ? ' (the client’s default)' : '')]; })) : [['', 'Choose a client first']]; }
    host.innerHTML = '<div class="max-w-3xl mx-auto flex flex-col gap-4">' +
      '<div id="vf-banner"></div>' +
      '<section class="' + cardCls + '" aria-labelledby="vf-1"><h2 id="vf-1" class="text-sm font-bold text-slate-900 mb-4">The vacancy</h2><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
      (abs ? '<div id="vf-client-box" class="sm:col-span-2"></div>' : '') +
      ui.field({ id: 'vf-title', label: 'Job title', required: true, wide: true, value: d.jobTitle, hint: 'What the client calls this work.' }) +
      '<div id="vf-role-box" class="sm:col-span-2"></div>' +
      '<div class="sm:col-span-2"><p class="' + C.label + '" id="vf-node-l">Where in the structure <span class="text-red-700">*</span><span class="sr-only"> required</span></p><div id="vf-tree"></div><p id="vf-node-err" class="text-xs font-medium text-red-700 mt-1" style="display:none" role="alert"></p></div>' +
      (edit ? '' : ui.field({ id: 'vf-count', label: 'Positions', required: true, type: 'number', min: 1, max: 500, value: d.positionCount, hint: 'One seat per position, each filled by one person.' })) +
      '<div>' + ui.field({ id: 'vf-shift', label: 'Shift', required: true, type: 'select', options: shiftOptions(clientId), value: d.shiftId || '', hint: 'The Shift this vacancy’s rate is read for.' }) + '</div>' +
      ui.field({ id: 'vf-start', label: 'Start date', required: true, type: 'date', value: d.startDate }) + ui.field({ id: 'vf-end', label: 'End date', required: true, type: 'date', value: d.endDate }) +
      ui.field({ id: 'vf-close', label: 'Close date', type: 'date', value: d.closeDate, hint: 'Optional. Nothing closes by itself on this date.' }) +
      ui.field({ id: 'vf-times', label: 'Working times', type: 'textarea', rows: 2, wide: true, value: d.workingTimes, hint: 'For people to read. Nothing is calculated from it.' }) +
      '</div></section>' +
      '<section class="' + cardCls + '" aria-labelledby="vf-2"><h2 id="vf-2" class="text-sm font-bold text-slate-900 mb-4">Description</h2><div class="grid grid-cols-1 gap-4">' +
      ui.field({ id: 'vf-desc', label: 'Description', type: 'textarea', rows: 4, value: d.description }) + ui.field({ id: 'vf-req', label: 'Requirements', type: 'textarea', rows: 3, value: d.requirements }) + '</div></section>' +
      '<section class="' + cardCls + '" aria-labelledby="vf-3"><h2 id="vf-3" class="text-sm font-bold text-slate-900 mb-3">Rate</h2><div id="vf-rate"></div></section>' +
      '<div class="flex flex-wrap items-center justify-end gap-2"><a class="' + C.sec + '" href="' + (edit ? detail + '?id=' + v.id : list) + '">Cancel</a>' +
      (edit ? '<button type="button" id="vf-save" class="' + C.pri + '" style="' + C.priStyle + '">Save changes</button>' : '<button type="button" id="vf-draft" class="' + C.sec + '">Save as draft</button><button type="button" id="vf-publish" class="' + C.pri + '" style="' + C.priStyle + '">Publish</button>') + '</div></div>';
    var role, tree, nodesFor = function (c) {
      if (!c) return [];
      var ns = TREES[c] || [];
      if (p.large && c === 'acme') { ns = ns.slice(); for (var i = 1; i <= 340; i++) ns.push({ id: 'x' + i, parentId: i % 3 === 0 ? 'nth' : 'mid', name: 'Site ' + i, nodeType: 'site' }); }
      return ns;
    };
    function drawNoteRole() {
      var box = document.getElementById('vf-role-box');
      if (clientId && p.noRoles) { box.innerHTML = '<p class="' + C.label + '">Job role</p>' + ui.banner('info', 'This client has no job roles yet. ' + (abs ? 'Add one on <a class="' + C.link + '" href="abstract.rates.rate-cards.html">Rate Cards</a> first.' : 'Ask Abstract to add one.')); return; }
      role = S3.combobox(box, { id: 'vf-role', label: 'Job role', required: true, disabled: locked, placeholder: clientId ? 'Search job roles' : 'Choose a client first', value: d.jobRoleId, options: function () { return clientId ? CLIENT_ROLES[clientId].map(function (r) { return [r, JOB_ROLES[r]]; }) : []; }, onChange: rateLine });
    }
    function drawTree() {
      var box = document.getElementById('vf-tree');
      if (!clientId) { box.innerHTML = '<p class="text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg px-3 py-4">Choose a client to see its structure.</p>'; tree = null; return; }
      var ns = nodesFor(clientId);
      tree = S3.tree(box, { nodes: ns, value: d.orgNodeId, label: 'Where in the structure', expandDepth: ns.length >= 50 ? 1 : 3, disabledIds: locked ? ns.map(function (n) { return n.id; }).filter(function (i) { return i !== d.orgNodeId; }) : [], onChange: rateLine });
    }
    function rateLine() {
      var b = document.getElementById('vf-rate');
      if (!edit) { b.innerHTML = '<p class="text-sm text-slate-600">The rate shows here once this vacancy is saved. It comes from the job role’s rate card; nothing is entered on a vacancy.</p>'; return; }
      var r = resolveRate(role ? role.get() : v.jobRoleId, v.clientId, tree ? tree.get() : v.orgNodeId, document.getElementById('vf-shift').value);
      if (!r) { b.innerHTML = '<p class="text-sm text-slate-600">No rate card is in force for this job role, place and Shift, so this vacancy can’t be published as it stands.</p>'; return; }
      S3.rateLineHtml(b, r, v, !!p.nobreakdown);
    }
    if (abs) {
      if (edit) { document.getElementById('vf-client-box').innerHTML = '<p class="' + C.label + '">Client</p><p class="text-sm text-slate-800">' + esc(v.clientName) + '</p>'; }
      else S3.combobox(document.getElementById('vf-client-box'), { id: 'vf-client', label: 'Client', required: true, placeholder: 'Search clients', value: clientId, options: function () { return Object.keys(CLIENTS).filter(function (k) { return CLIENTS[k].status === 'Active'; }).map(function (k) { return [k, CLIENTS[k].name]; }); }, onChange: function (c) { clientId = c; d.jobRoleId = null; d.orgNodeId = null; drawNoteRole(); drawTree(); var sel = document.getElementById('vf-shift'); sel.innerHTML = shiftOptions(c).map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join(''); var def = SHIFTS[c].filter(function (s) { return s.def; })[0]; if (def) sel.value = def.id; rateLine(); } });
    }
    drawNoteRole(); drawTree(); rateLine();
    if (!edit && clientId && !d.shiftId) { var def = SHIFTS[clientId].filter(function (s) { return s.def; })[0]; if (def) document.getElementById('vf-shift').value = def.id; }
    document.getElementById('vf-shift').addEventListener('change', rateLine);
    var IDS = ['vf-title', 'vf-count', 'vf-shift', 'vf-start', 'vf-end', 'vf-close', 'vf-role', 'vf-client'];
    function collect() {
      return { clientId: clientId, jobTitle: document.getElementById('vf-title').value.trim(), jobRoleId: role ? role.get() : null, orgNodeId: tree ? tree.get() : null, shiftId: document.getElementById('vf-shift').value, startDate: document.getElementById('vf-start').value, endDate: document.getElementById('vf-end').value, closeDate: document.getElementById('vf-close').value || null, workingTimes: document.getElementById('vf-times').value.trim() || null, description: document.getElementById('vf-desc').value.trim() || null, requirements: document.getElementById('vf-req').value.trim() || null, positionCount: edit ? v.positionCount : Number((document.getElementById('vf-count') || {}).value) };
    }
    function validate(f) {
      var e = {};
      if (abs && !edit && !f.clientId) e['vf-client'] = 'Choose a client.';
      if (!f.jobTitle) e['vf-title'] = 'Enter a job title.';
      if (!f.jobRoleId) e['vf-role'] = 'Choose a job role.';
      if (!f.shiftId) e['vf-shift'] = 'Choose a Shift.';
      if (!f.startDate) e['vf-start'] = 'Enter a start date.';
      if (!f.endDate) e['vf-end'] = 'Enter an end date.';
      if (f.startDate && f.endDate && f.endDate < f.startDate) e['vf-end'] = 'The end date can’t be before the start date.';
      if (f.closeDate && f.endDate && f.closeDate > f.endDate) e['vf-close'] = 'The close date can’t be after the end date.';
      if (!edit && !(f.positionCount >= 1 && f.positionCount <= 500)) e['vf-count'] = 'Enter between 1 and 500 positions.';
      var ne = document.getElementById('vf-node-err');
      ne.style.display = f.orgNodeId ? 'none' : ''; ne.textContent = f.orgNodeId ? '' : 'Choose a place below the organisation itself.';
      ui.showErrs(e, IDS);
      return !Object.keys(e).length && !!f.orgNodeId;
    }
    function fail(err) { if (!err.code) throw err; document.getElementById('vf-banner').innerHTML = ui.banner('error', esc(err.message)); document.getElementById('main').scrollTop = 0; }
    function saved(id, msg) { S1.toast(msg, 'success'); setTimeout(function () { location.href = detail + '?id=' + id; }, 500); }
    if (edit) document.getElementById('vf-save').onclick = function () { var f = collect(); if (!validate(f)) return; try { if (p.suspendOnSave) S3.fail('VACANCY_CLIENT_NOT_ACTIVE'); S3.act.saveVacancy(f, v.id, false); saved(v.id, 'Vacancy saved.'); } catch (e) { fail(e); } };
    else {
      document.getElementById('vf-draft').onclick = function () { var f = collect(); if (!validate(f)) return; try { if (p.suspendOnSave) S3.fail('VACANCY_CLIENT_NOT_ACTIVE'); saved(S3.act.saveVacancy(f, null, false), 'Saved as a draft.'); } catch (e) { fail(e); } };
      document.getElementById('vf-publish').onclick = function () {
        var f = collect(); if (!validate(f)) return;
        S1.confirm({ title: 'Publish this vacancy?', body: 'Abstract starts working it, and the client’s users who can see ' + S3.nodeName(f.clientId, f.orgNodeId) + ' can see it.', cta: 'Publish vacancy', onConfirm: function () { try { if (p.suspendOnSave) S3.fail('VACANCY_CLIENT_NOT_ACTIVE'); saved(S3.act.saveVacancy(f, null, true), 'Vacancy published.'); } catch (e) { fail(e); } } });
      };
    }
    if (p.showErrors) { validate(Object.assign(collect(), p.showErrors)); }
  };
  S3.fail = function (code) { refuse(code, 'This client’s status changed to Suspended while you were working, so nothing was saved. Your entries are still here.'); };
  S3.rateLineHtml = function (b, r, v, nobreakdown) {
    var rows = [['Charge rate', '<span class="font-semibold tnum">' + S3.money(r.charge) + '</span> per hour'], ['Shift', esc(v.shiftName)], ['Resolved for', S3.fmtDate(v.startDate > TODAY ? v.startDate : TODAY)]];
    
    if (PORTAL === 'abstract' && !nobreakdown) { rows.push(['Pay rate', '<span class="tnum">' + S3.money(r.pay) + '</span> per hour']); rows.push(['Margin', '<span class="tnum">' + S3.money(r.margin) + ' (' + Number(r.pct).toFixed(2) + ' %)</span>']); }
    
    b.innerHTML = ui.dl(rows) + '<p class="text-xs text-slate-500 mt-3">Resolved from the rate card' + (PORTAL === 'abstract' ? '. <a class="' + C.link + '" href="abstract.rates.rate-cards.html">Open Rate Cards</a>' : '') + '</p>';
  };

  // ---------- ActiveBookingsCard: one card on both dashboards (TSD §3.3.9) ----------
  S3.activeBookingsCard = function (host, state) {
    if (state === 'loading') { host.innerHTML = '<div class="' + C.card + ' p-5" aria-busy="true"><div class="h-3 w-32 bg-slate-200 rounded animate-pulse"></div><div class="h-7 w-16 bg-slate-200 rounded animate-pulse mt-3"></div></div>'; return; }
    if (state === 'error') { host.innerHTML = '<div class="' + C.card + ' p-5" role="alert"><p class="text-sm font-semibold text-slate-900">We couldn’t load active bookings</p><button type="button" class="' + C.sec + ' mt-3" onclick="S1.setState(\'default\')">Retry</button></div>'; return; }
    if (state === 'denied') { host.innerHTML = ''; return; }
    var live = S3.bookings().filter(function (b) { return b.status === 'Active' || b.status === 'Extended'; }), abs = PORTAL === 'abstract', lines = {}, list = abs ? 'abstract.bookings.bookings.html?active=1&client=' : 'client.bookings.bookings.html?active=1&node=';
    if (state === 'empty') live = [];
    live.forEach(function (b) { var k = abs ? b.clientId : b.orgNodeId; lines[k] = lines[k] || { id: k, name: abs ? b.clientName : b.orgNodeName, n: 0 }; lines[k].n++; });
    var rows = Object.keys(lines).map(function (k) { return lines[k]; }), total = live.length;
    if (state === 'large') { rows = []; for (var i = 1; i <= 50; i++) rows.push({ id: 'acme', name: 'Client ' + i, n: 60 - i }); total = rows.reduce(function (m, r) { return m + r.n; }, 0); }
    rows.sort(function (a, b) { return b.n - a.n; });
    var top = rows.slice(0, 10), all = abs ? 'abstract.bookings.bookings.html?active=1' : 'client.bookings.bookings.html?active=1';
    host.innerHTML = '<section class="' + C.card + ' p-5" aria-labelledby="abc-t"><div class="flex items-center justify-between gap-3"><h2 id="abc-t" class="text-sm font-bold text-slate-900">Active bookings</h2><i class="fa-solid fa-calendar-check text-slate-400 text-xs" aria-hidden="true"></i></div>' + (total ? '<p class="text-3xl font-extrabold tracking-tight text-slate-900 tnum mt-2">' + total + '</p><ul class="mt-3 divide-y divide-slate-100">' + top.map(function (r) { return '<li><a class="flex items-center justify-between gap-3 py-2 min-h-[36px] text-sm text-slate-700 hover:text-blue-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" href="' + list + encodeURIComponent(r.id) + '"><span class="truncate">' + esc(r.name) + '</span><span class="font-semibold tnum">' + r.n + '</span></a></li>'; }).join('') + '</ul>' + (rows.length > 10 ? '<a class="' + C.ghost + ' mt-2" href="' + all + '">All</a>' : '') : '<p class="text-sm text-slate-600 mt-2">No active bookings</p>') + '</section>';
  };

  // ---------- page plumbing ----------
  S3.mobileNav = function () {
    var btn = document.getElementById('mobile-menu-btn'), sb = document.getElementById('sidebar'); if (!btn || !sb) return;
    btn.setAttribute('aria-controls', 'sidebar'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Open navigation');
    var bd = document.createElement('div'); bd.setAttribute('aria-hidden', 'true'); bd.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:40;display:none'; document.body.appendChild(bd);
    function open() { sb.style.display = 'flex'; sb.style.position = 'fixed'; sb.style.top = '0'; sb.style.bottom = '0'; sb.style.left = '0'; sb.style.zIndex = '50'; bd.style.display = 'block'; btn.setAttribute('aria-expanded', 'true'); }
    function close() { ['display', 'position', 'top', 'bottom', 'left', 'zIndex'].forEach(function (p) { sb.style[p] = ''; }); bd.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () { bd.style.display === 'block' ? close() : open(); }); bd.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bd.style.display === 'block') close(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) close(); });
  };
  S3.onState = function (render) { document.addEventListener('s1:state', function (e) { render(e.detail.state); }); };
  S3.param = function (k) { return new URLSearchParams(location.search).get(k); };
})();
