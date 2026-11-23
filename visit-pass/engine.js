/* Slot IQ engine: one pooled queue, visit rules and wait estimates.
 *
 * This is the part of the Digital Visit Pass that decides who is called to
 * which room. It has no DOM and no storage, so it runs the same in the
 * browser (demo mode) and in Node (tests). In the Laravel build this logic
 * moves to the server (see README.md, "Porting the engine"); the screens keep
 * reading the same state shape.
 *
 * State shape (all times are minutes after midnight, clinic local time):
 *   { now, rules: {id: bool}, rooms: [Room], patients: [Patient], log: [Call] }
 *   Room    { id, name, type, level, state: 'free'|'called'|'in', pid, since }
 *   Patient { id, name, call, ref, token, isMe, state, dueAt, arrivedAt, cur,
 *             finishedAt, bump, steps: [Step] }
 *     state: 'expected' -> 'waiting' <-> 'called' -> 'in' -> ... -> 'finished'
 *   Step    { type, status: 'todo'|'called'|'in'|'done', room, calledAt, start, end, d }
 *   Call    { t, call, room, me }   newest first, the last 8
 *
 * The engine never stores or reads anything clinical: a name, a call number,
 * where the patient is, and when.
 */
(function (root) {
  "use strict";

  function create(cfg) {
    var TYPES = {}, ORDER = [];
    cfg.types.forEach(function (t) { TYPES[t.id] = t; ORDER.push(t.id); });
    var RULES = cfg.rules || [];

    /* ---------- formatting ---------- */
    function fmt(t) { var h = Math.floor(t / 60), m = Math.floor(t % 60), hh = ((h + 11) % 12) + 1; return hh + ":" + (m < 10 ? "0" : "") + m; }
    function mins(n) { n = Math.max(0, Math.round(n)); if (n < 60) return n + " min"; return Math.floor(n / 60) + " h " + (n % 60 ? (n % 60) + " min" : ""); }
    function parseClock(s) { var p = String(s).split(":"); return (+p[0]) * 60 + (+p[1] || 0); }

    /* ---------- state ---------- */
    function newState(now) {
      var rules = {};
      RULES.forEach(function (r) { rules[r.id] = r.on !== false; });
      return {
        now: now || 0, rules: rules, patients: [], log: [],
        rooms: cfg.rooms.map(function (r) { return { id: r.id, name: r.name, type: r.type, level: r.level, state: "free", pid: null, since: 0 }; })
      };
    }
    function makeSteps(types) {
      return ORDER.filter(function (k) { return types.indexOf(k) >= 0; })
        .map(function (k) { return { type: k, status: "todo", room: null, calledAt: null, start: null, end: null, d: TYPES[k].dur }; });
    }
    /* Add a booked (or walk-in) visit. Returns the patient. */
    function addVisit(S, v) {
      var p = {
        id: v.id, name: v.name || "", call: v.call, ref: v.ref || null, token: v.token || null, isMe: !!v.isMe,
        steps: makeSteps(v.types), state: "expected", dueAt: v.dueAt || 0, arrivedAt: null, cur: null, finishedAt: null,
        bump: null, f: v.f || 1
      };
      S.patients.push(p);
      return p;
    }
    function removeVisit(S, pid) {
      var p = patient(S, pid);
      if (!p || p.state !== "expected") return false;
      S.patients.splice(S.patients.indexOf(p), 1);
      return true;
    }

    /* ---------- lookups ---------- */
    function patient(S, id) { for (var i = 0; i < S.patients.length; i++) if (S.patients[i].id === id) return S.patients[i]; return null; }
    function byToken(S, tok) { for (var i = 0; i < S.patients.length; i++) if (S.patients[i].token === tok) return S.patients[i]; return null; }
    function room(S, id) { for (var i = 0; i < S.rooms.length; i++) if (S.rooms[i].id === id) return S.rooms[i]; return null; }
    function stepOf(p, type) { for (var i = 0; i < p.steps.length; i++) if (p.steps[i].type === type) return p.steps[i]; return null; }
    function isDone(p, type) { var s = stepOf(p, type); return !s || s.status === "done"; }

    /* ---------- visit rules ---------- */
    /* Why a step cannot start yet. Empty string means it is open. */
    function lockReason(S, p, type) {
      for (var i = 0; i < RULES.length; i++) {
        var R = RULES[i];
        if (!S.rules[R.id]) continue;
        if (R.kind === "before" && type === R.then && !isDone(p, R.first)) return "After " + TYPES[R.first].name;
        if (R.kind === "last" && type === R.type) {
          for (var j = 0; j < p.steps.length; j++) { var s = p.steps[j]; if (s.type !== R.type && s.status !== "done") return "After your tests"; }
        }
        if (R.kind === "gap" && type === R.before && stepOf(p, R.after)) {
          if (!isDone(p, R.after)) return "After " + TYPES[R.after].name;
          var end = stepOf(p, R.after).end;
          if (S.now < end + R.minutes) return "Opens " + fmt(end + R.minutes) + " (" + (R.why || "needs") + " " + R.minutes + " min)";
        }
      }
      return "";
    }
    function eligible(S, p, type) { var s = stepOf(p, type); return !!s && s.status === "todo" && !lockReason(S, p, type); }

    /* ---------- dispatch ---------- */
    function pri(p, type) { return (p.bump === type ? -1e6 : 0) + p.arrivedAt; }
    /* One pooled queue. When a room is free, call the patient who arrived
       first among those open for that room's appointment type. Staff can put
       one patient next for one type (bump). */
    function dispatch(S) {
      S.rooms.forEach(function (r) {
        if (r.state !== "free") return;
        var best = null;
        S.patients.forEach(function (p) { if (p.state === "waiting" && eligible(S, p, r.type) && (!best || pri(p, r.type) < pri(best, r.type))) best = p; });
        if (!best) return;
        var s = stepOf(best, r.type);
        if (best.bump === r.type) best.bump = null;
        s.status = "called"; s.room = r.id; s.calledAt = S.now; s.d = TYPES[r.type].dur * (best.f || 1);
        best.state = "called"; best.cur = r.id;
        r.state = "called"; r.pid = best.id; r.since = S.now;
        S.log.unshift({ t: S.now, call: best.call, room: r.name, me: best.isMe });
        if (S.log.length > 8) S.log.pop();
      });
    }

    /* ---------- events ---------- */
    /* Entrance kiosk scan: one scan checks the patient in for every appointment. */
    function checkIn(S, pid) {
      var p = patient(S, pid);
      if (!p || p.state !== "expected") return false;
      p.state = "waiting"; p.arrivedAt = S.now;
      dispatch(S);
      return true;
    }
    /* The room's next step: called -> in (patient arrived / door scan),
       in -> done (staff check-out). Freeing a room dispatches the next patient. */
    function roomNext(S, roomId) {
      var r = room(S, roomId), p = r && patient(S, r.pid);
      if (!p) return false;
      var s = stepOf(p, r.type);
      if (r.state === "called") { r.state = "in"; r.since = S.now; s.status = "in"; s.start = S.now; p.state = "in"; }
      else if (r.state === "in") {
        s.status = "done"; s.end = S.now;
        r.state = "free"; r.pid = null; p.cur = null;
        var left = p.steps.some(function (x) { return x.status !== "done"; });
        if (left) p.state = "waiting"; else { p.state = "finished"; p.finishedAt = S.now; }
        dispatch(S);
      }
      return true;
    }
    /* Door scanner. Right door: the patient is in. Wrong door: nothing changes
       and the caller is told where to go. */
    function scanDoor(S, pid, roomId) {
      var p = patient(S, pid);
      if (!p || p.state !== "called") return { ok: false, reason: "not-called" };
      if (p.cur !== roomId) return { ok: false, reason: "wrong-door", room: p.cur };
      roomNext(S, roomId);
      return { ok: true };
    }
    /* Staff put a waiting patient next for one appointment type. */
    function bump(S, pid, type) {
      var p = patient(S, pid), T = TYPES[type] && TYPES[type].name, s = p && stepOf(p, type);
      if (!p) return { ok: false, msg: "" };
      if (!s) return { ok: false, msg: p.call + " has no " + T + " on this visit" };
      if (s.status === "done") return { ok: false, msg: T + " is already done for " + p.call };
      if (p.state !== "waiting") return { ok: false, msg: "Only cards in Waiting can be moved" };
      var why = lockReason(S, p, type);
      if (why) return { ok: false, msg: T + " is on hold: " + why };
      p.bump = type; dispatch(S);
      return { ok: true, msg: p.state === "called" ? p.call + " is called to " + room(S, p.cur).name : p.call + " is next for " + T };
    }
    function setRule(S, id, on) { S.rules[id] = !!on; dispatch(S); }
    /* Move the clock forward. Gap rules open with time, so dispatch again. */
    function setNow(S, now) { S.now = now; dispatch(S); }

    /* ---------- estimates ---------- */
    /* Minutes until a waiting patient is likely called for one type. */
    function estWait(S, p, type) {
      var rs = S.rooms.filter(function (r) { return r.type === type; }), rem = 0, free = 0;
      if (!rs.length) return 0;
      rs.forEach(function (r) {
        if (r.state === "free") { free++; return; }
        var q = patient(S, r.pid), s = stepOf(q, type);
        rem += r.state === "in" ? Math.max(1, s.d - (S.now - r.since)) : s.d + 1;
      });
      var ahead = S.patients.filter(function (q) { return q !== p && q.state === "waiting" && eligible(S, q, type) && q.arrivedAt < p.arrivedAt; }).length;
      if (free && !ahead) return 0;
      return Math.max(1, Math.round((ahead * TYPES[type].dur + rem) / rs.length));
    }
    /* Rough clock time (rounded to 5 min) the patient should head to each
       remaining appointment. arriveBy is used before check-in. */
    function etas(S, p, arriveBy) {
      var out = {}, t = p.state === "expected" ? parseClock(arriveBy || fmt(p.dueAt)) : S.now, ends = {}, c, cs;
      p.steps.forEach(function (s) { if (s.status === "done") ends[s.type] = s.end; });
      if (p.state === "in" || p.state === "called") {
        c = room(S, p.cur); cs = stepOf(p, c.type);
        t = p.state === "in" ? Math.max(S.now, c.since + cs.d) : S.now + 1.5 + TYPES[c.type].dur;
        ends[c.type] = t; t += 2;
      }
      p.steps.filter(function (s) { return s.status === "todo"; }).forEach(function (s) {
        var start = t;
        if (p.state !== "expected" && eligible(S, p, s.type)) start = Math.max(t, S.now + estWait(S, p, s.type));
        RULES.forEach(function (R) { if (R.kind === "gap" && S.rules[R.id] && R.before === s.type && ends[R.after] != null) start = Math.max(start, ends[R.after] + R.minutes); });
        out[s.type] = Math.round(start / 5) * 5;
        ends[s.type] = start + TYPES[s.type].dur;
        t = start + TYPES[s.type].dur + 2;
      });
      return out;
    }
    /* Door-to-door totals for a finished visit. */
    function visitStats(p) {
      var inRoom = 0;
      p.steps.forEach(function (s) { if (s.end != null) inRoom += s.end - s.start; });
      var total = (p.finishedAt != null ? p.finishedAt : 0) - p.arrivedAt;
      return { total: total, inRoom: inRoom, wait: total - inRoom, n: p.steps.length };
    }

    return {
      TYPES: TYPES, ORDER: ORDER, RULES: RULES,
      fmt: fmt, mins: mins, parseClock: parseClock,
      newState: newState, makeSteps: makeSteps, addVisit: addVisit, removeVisit: removeVisit,
      patient: patient, byToken: byToken, room: room, stepOf: stepOf, isDone: isDone,
      lockReason: lockReason, eligible: eligible, dispatch: dispatch,
      checkIn: checkIn, roomNext: roomNext, scanDoor: scanDoor, bump: bump, setRule: setRule, setNow: setNow,
      estWait: estWait, etas: etas, visitStats: visitStats
    };
  }

  var api = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SlotIQEngine = api;
})(this);
