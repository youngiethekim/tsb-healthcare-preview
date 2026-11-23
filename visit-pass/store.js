/* Slot IQ Digital Visit Pass: data layer.
 *
 * Every screen reads window.VisitPassStore.state() and changes things only
 * through the methods below. Two adapters share one interface:
 *
 *   demo  The whole floor runs in this browser (engine.js + demo-sim.js).
 *         Nothing is sent or saved.
 *   api   The state comes from the server and every action is a fetch() to
 *         the routes in README.md. The screens do not change.
 *
 * state() always returns the same object; its contents are replaced in place
 * when new state arrives, so screens can hold on to it.
 */
(function () {
  "use strict";
  var CFG = window.VISIT_PASS_CONFIG;
  var E = window.SlotIQEngine.create(CFG);
  var SC = window.SlotIQScheduler ? window.SlotIQScheduler.create(CFG, E) : null;
  var S = {}, subs = [];

  function replace(target, src) { Object.keys(target).forEach(function (k) { delete target[k]; }); Object.keys(src).forEach(function (k) { target[k] = src[k]; }); return target; }
  function changed() { subs.forEach(function (f) { try { f(S); } catch (e) { console.error(e); } }); }
  function feed(p, x, k) { (p.feed = p.feed || []).unshift({ t: S.now, x: x, k: k || "" }); }

  var base = {
    engine: E,
    scheduler: SC,
    state: function () { return S; },
    subscribe: function (fn) { subs.push(fn); }
  };

  /* ---------------- demo adapter ---------------- */
  function demoAdapter() {
    var sim = window.SlotIQDemoSim.create(E, CFG);
    var clock = { running: true, speed: 1 };
    var INV = SC ? demoInvites(sim) : null;
    function wire() { S.announcement = S.announcement || ""; S.surveys = S.surveys || []; S.me = sim.me; if (INV) S.invites = INV.list; }
    function reset() { replace(S, sim.reset()); sim.S = S; if (INV) INV.reset(); wire(); }
    reset();
    return {
      mode: "demo",
      clock: clock,
      reset: function () { reset(); changed(); },

      /* Booking (clerk, online or assistant). */
      book: function (types) { var p = sim.bookMe(types); wire(); changed(); return p; },
      unbook: function () { sim.unbookMe(); wire(); changed(); },

      /* Arrival: entrance kiosk and door scanners. */
      checkIn: function (pid) { var ok = E.checkIn(S, pid); changed(); return ok; },
      scanDoor: function (pid, roomId) {
        var r = E.scanDoor(S, pid, roomId), p = E.patient(S, pid);
        if (r.reason === "wrong-door" && p) feed(p, "That was " + E.room(S, roomId).name + ". Please go to " + E.room(S, r.room).name + ".", "go");
        changed(); return r;
      },

      /* Staff. */
      roomNext: function (roomId) { var ok = E.roomNext(S, roomId); changed(); return ok; },
      bump: function (pid, type) { var r = E.bump(S, pid, type); changed(); return r; },
      setRule: function (id, on) { E.setRule(S, id, on); changed(); },
      message: function (pid, text) { var p = E.patient(S, pid); if (p) feed(p, text, "staff"); changed(); },
      announce: function (text) { S.announcement = text || ""; changed(); },

      /* Patient survey at the end of the visit (about the visit, never care). */
      survey: function (pid, answers) { S.surveys.push({ pid: pid, t: S.now, answers: answers }); changed(); },

      /* Pick-your-time booking, by invitation (see demoInvites below). */
      invite: function (o) { var r = INV.invite(o); changed(); return r; },
      resendInvite: function (id) { var r = INV.resend(id); changed(); return r; },
      revokeInvite: function (id) { var r = INV.revoke(id); wire(); changed(); return r; },
      openInvite: function (token) { var r = INV.open(token); changed(); return r; },
      verifyInvite: function (token, answer) { var r = INV.verify(token, answer); changed(); return r; },
      slots: function (token, day) { return INV.slots(token, day); },
      bookInvite: function (token, plan) { var r = INV.book(token, plan); wire(); changed(); return r; },
      cancelInvite: function (token) { var r = INV.cancel(token); wire(); changed(); return r; },
      firstOpen: function (types, toDay) { return INV.firstOpen(types, toDay); },

      /* Demo only: jump to the day of a booked visit and play it. */
      startDay: function (day) {
        var keep = INV && INV.mine();
        replace(S, sim.reset(day)); sim.S = S;
        if (keep && keep.booking && keep.booking.day === day) INV.placeOnFloor(keep);
        wire(); changed();
      },

      /* Demo only: the simulated clock. */
      tick: function (dt) { sim.tick(dt); },
      advance: function (m, stopOnCall) { sim.advance(m, stopOnCall); changed(); },
      setAuto: function (on) { sim.auto = !!on; },
      isAuto: function () { return sim.auto; }
    };
  }

  /* ---------------- demo invitations ----------------
     In production all of this is server side: the date of birth is checked
     against the patient record, attempts are counted per link, and a booking
     is re-checked against the room calendars in one transaction. */
  function demoInvites(sim) {
    var SB = CFG.selfBooking, D = CFG.demo, busyDemo = SC.demoBusy(D.seed % 1000);
    var inv = { list: [] }, secret = {}, booked = {}, verified = {}, seq = 0;
    var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    function token() { var t = ""; for (var i = 0; i < 10; i++) t += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return t; }
    function prio(id) { return SB.priorities.filter(function (p) { return p.id === id; })[0] || SB.priorities[SB.priorities.length - 1]; }
    function byToken(t) { return inv.list.filter(function (x) { return x.token === t; })[0]; }
    function byId(id) { return inv.list.filter(function (x) { return x.id === id; })[0]; }
    function closed(day) { var d = new Date(); d.setDate(d.getDate() + day); return SB.closedWeekdays.indexOf(d.getDay()) >= 0; }
    function busy(roomId, day) { return busyDemo(roomId, day).concat((booked[day] && booked[day][roomId]) || []); }
    function hold(p, on) {
      p.steps.forEach(function (st) {
        var d = booked[p.day] = booked[p.day] || {}, r = d[st.room] = d[st.room] || [];
        if (on) r.push([st.start, st.end]);
        else d[st.room] = r.filter(function (x) { return !(x[0] === st.start && x[1] === st.end); });
      });
    }
    function absNow() { return S.day * 1440 + S.now; }
    function after(day) { return day === S.day ? S.now + SB.leadMinutes : 0; }
    function opts(day) { return { closed: closed, after: after(day), rules: S.rules }; }
    function add(o, status, fakeDob) {
      var p = prio(o.priority), x = {
        id: "i" + (++seq), token: token(), name: o.name, isMe: !!o.isMe, types: o.types.slice(), priority: p.id,
        from: S.day, to: S.day + p.days, sentAt: o.sentAt != null ? o.sentAt : absNow(), status: status || "sent",
        attempts: 0, booking: null, by: o.by || "Booking clerk"
      };
      secret[x.token] = o.dob || fakeDob;
      inv.list.unshift(x);
      return x;
    }
    inv.reset = function () {
      inv.list.length = 0; secret = {}; booked = {}; verified = {}; seq = 0;
      // A few other patients' invitations so the staff list is not empty.
      var FAKE = [["Wei Chen", ["xray"], "soon", "booked"], ["Priya Nair", ["ecg", "echo"], "routine", "booked"], ["Tom Okafor", ["consult"], "urgent", "opened"],
        ["Hana Sato", ["xray", "consult"], "soon", "sent"], ["Omar Haddad", ["echo"], "routine", "locked"], ["Ruth Abera", ["ecg"], "urgent", "expired"]];
      FAKE.forEach(function (f, i) {
        var x = add({ name: f[0], types: f[1], priority: f[2], sentAt: absNow() - (i + 1) * 410 }, f[3], "2000-01-01");
        if (f[3] === "booked") {
          for (var d = 1 + i * 2; d <= x.to + 3 && !x.booking; d++) { var o = SC.options(x.types, d, busy, opts(d)); if (o.length) { x.booking = o[Math.floor(o.length / 2)]; hold(x.booking, true); } }
        }
        if (f[3] === "locked") x.attempts = SB.maxAttempts;
      });
    };
    inv.mine = function () { return inv.list.filter(function (x) { return x.isMe && x.status !== "cancelled"; })[0] || null; };
    inv.invite = function (o) {
      inv.list.forEach(function (x) { if (x.isMe && x.status !== "booked") x.status = "cancelled"; }); // one open link per patient
      return add({ name: D.patientName, isMe: true, types: o.types, priority: o.priority, dob: D.patientDob, by: o.by });
    };
    inv.resend = function (id) { var x = byId(id); if (!x) return null; x.attempts = 0; if (x.status !== "booked") x.status = "sent"; x.sentAt = absNow(); return x; };
    inv.revoke = function (id) { var x = byId(id); if (!x) return null; if (x.booking) { hold(x.booking, false); if (x.isMe) unfloor(); } x.booking = null; x.status = "cancelled"; return x; };
    inv.open = function (t) {
      var x = byToken(t);
      if (!x || x.status === "cancelled" || x.status === "expired") return { ok: false, reason: "invalid" };
      if (x.status === "sent") x.status = "opened";
      return { ok: true, locked: x.attempts >= SB.maxAttempts, verified: !!verified[t] };
    };
    inv.verify = function (t, answer) {
      var x = byToken(t);
      if (!x || x.status === "cancelled" || x.status === "expired") return { ok: false, reason: "invalid" };
      if (x.attempts >= SB.maxAttempts) { x.status = x.booking ? x.status : "locked"; return { ok: false, reason: "locked" }; }
      if (String(answer || "").trim() === secret[t]) { verified[t] = true; x.attempts = 0; return { ok: true, invite: x }; }
      x.attempts++;
      if (x.attempts >= SB.maxAttempts && !x.booking) x.status = "locked";
      return { ok: false, reason: x.attempts >= SB.maxAttempts ? "locked" : "wrong", left: SB.maxAttempts - x.attempts };
    };
    inv.view = function (t) { var x = byToken(t); return x && verified[t] ? x : null; };
    inv.slots = function (t, day) {
      var x = inv.view(t); if (!x || day < x.from || day > x.to) return [];
      if (x.booking) hold(x.booking, false); // when changing, the patient's own time counts as free
      var o = SC.options(x.types, day, busy, opts(day));
      if (x.booking) hold(x.booking, true);
      return o;
    };
    function unfloor() { if (sim.me && S.me && S.me.state === "expected") sim.unbookMe(); }
    inv.placeOnFloor = function (x) {
      var b = x.booking;
      sim.bookMe(x.types, { dueAt: b.arrive, arriveBy: E.fmt(b.arrive), plan: b });
    };
    inv.book = function (t, p) {
      var x = inv.view(t);
      if (!x) return { ok: false, reason: "invalid" };
      if (x.booking) { hold(x.booking, false); if (x.isMe) unfloor(); }
      var fresh = SC.plan(x.types, p.day, p.start, busy, S.rules);
      if (!fresh || !SC.stillFree(fresh, busy) || p.day < x.from || p.day > x.to) { x.booking = null; x.status = "opened"; return { ok: false, reason: "taken" }; }
      x.booking = fresh; x.status = "booked"; hold(fresh, true);
      if (x.isMe && fresh.day === S.day && !sim.me) inv.placeOnFloor(x);
      return { ok: true, booking: fresh };
    };
    inv.cancel = function (t) {
      var x = inv.view(t);
      if (!x || !x.booking) return { ok: false };
      if (x.booking.day * 1440 + x.booking.start - absNow() < SB.changeUntilHours * 60) return { ok: false, reason: "too-late" };
      hold(x.booking, false); if (x.isMe) unfloor();
      x.booking = null; x.status = "opened";
      return { ok: true };
    };
    inv.firstOpen = function (types, toDay) {
      for (var d = S.day; d <= toDay; d++) { var o = SC.options(types, d, busy, opts(d)); if (o.length) return o[0]; }
      return null;
    };
    return inv;
  }

  /* ---------------- api adapter ----------------
     Polls the server for the floor (staff screens) or one visit (patient
     phone, ?pass=TOKEN) and posts each action. The engine is still used in
     the browser, but only to label state (what is on hold, wait estimates);
     the server makes every decision with the same rules. Untested against a
     real backend: it is the contract for the Laravel routes. */
  function apiAdapter() {
    var root = CFG.apiBase.replace(/\/$/, ""), pass = new URLSearchParams(location.search).get("pass");
    var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content;
    function req(method, path, body) {
      var h = { "Accept": "application/json" };
      if (body) h["Content-Type"] = "application/json";
      if (csrf) h["X-CSRF-TOKEN"] = csrf;
      return fetch(root + path, { method: method, headers: h, credentials: "same-origin", body: body ? JSON.stringify(body) : undefined })
        .then(function (r) { if (!r.ok) throw new Error(method + " " + path + " " + r.status); return r.status === 204 ? null : r.json(); });
    }
    function load() {
      return req("GET", pass ? "/visit/" + encodeURIComponent(pass) : "/floor").then(function (d) {
        replace(S, d);
        S.me = d.meId ? E.patient(S, d.meId) : null;
        S.announcement = S.announcement || ""; S.surveys = S.surveys || []; S.invites = S.invites || []; S.day = S.day || 0;
        changed();
      }).catch(function (e) { console.warn("Visit Pass: could not load state", e); });
    }
    function act(method, path, body) { return req(method, path, body).then(function (r) { return load().then(function () { return r; }); }); }
    S.now = 0; S.day = 0; S.rules = {}; S.rooms = []; S.patients = []; S.log = []; S.me = null; S.announcement = ""; S.surveys = []; S.invites = [];
    load(); setInterval(load, (CFG.pollSeconds || 3) * 1000);
    return {
      mode: "api",
      clock: { running: true, speed: 1 },
      reset: load,
      book: function (types) { return act("POST", "/visits", { types: types }); },
      unbook: function () { return S.me && act("DELETE", "/visits/" + S.me.id); },
      checkIn: function (pid) { return act("POST", "/visits/" + pid + "/check-in"); },
      scanDoor: function (pid, roomId) { return act("POST", "/rooms/" + roomId + "/scan", { visit: pid }); },
      roomNext: function (roomId) { return act("POST", "/rooms/" + roomId + "/next"); },
      bump: function (pid, type) { return act("POST", "/visits/" + pid + "/bump", { type: type }); },
      setRule: function (id, on) { return act("PUT", "/rules/" + id, { on: !!on }); },
      message: function (pid, text) { return act("POST", "/visits/" + pid + "/messages", { text: text }); },
      announce: function (text) { return act("PUT", "/announcement", { text: text || "" }); },
      survey: function (pid, answers) { return act("POST", "/visits/" + pid + "/survey", answers); },
      invite: function (o) { return act("POST", "/invites", o); },
      resendInvite: function (id) { return act("POST", "/invites/" + id + "/resend"); },
      revokeInvite: function (id) { return act("DELETE", "/invites/" + id); },
      openInvite: function (t) { return req("GET", "/i/" + t); },
      verifyInvite: function (t, answer) { return req("POST", "/i/" + t + "/verify", { answer: answer }); },
      slots: function (t, day) { return req("GET", "/i/" + t + "/slots?day=" + day); },
      bookInvite: function (t, plan) { return req("POST", "/i/" + t + "/book", { day: plan.day, start: plan.start }); },
      cancelInvite: function (t) { return req("POST", "/i/" + t + "/cancel"); },
      firstOpen: function () { return null; },
      startDay: function () {},
      tick: function () {}, advance: function () {}, setAuto: function () {}, isAuto: function () { return false; }
    };
  }

  var a = CFG.mode === "api" ? apiAdapter() : demoAdapter();
  Object.keys(base).forEach(function (k) { a[k] = base[k]; });
  window.VisitPassStore = a;
})();
