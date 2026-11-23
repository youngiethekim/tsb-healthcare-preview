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
  var S = {}, subs = [];

  function replace(target, src) { Object.keys(target).forEach(function (k) { delete target[k]; }); Object.keys(src).forEach(function (k) { target[k] = src[k]; }); return target; }
  function changed() { subs.forEach(function (f) { try { f(S); } catch (e) { console.error(e); } }); }
  function feed(p, x, k) { (p.feed = p.feed || []).unshift({ t: S.now, x: x, k: k || "" }); }

  var base = {
    engine: E,
    state: function () { return S; },
    subscribe: function (fn) { subs.push(fn); }
  };

  /* ---------------- demo adapter ---------------- */
  function demoAdapter() {
    var sim = window.SlotIQDemoSim.create(E, CFG);
    var clock = { running: true, speed: 1 };
    function wire() { S.announcement = S.announcement || ""; S.surveys = S.surveys || []; S.me = sim.me; }
    function reset() { replace(S, sim.reset()); sim.S = S; wire(); }
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

      /* Demo only: the simulated clock. */
      tick: function (dt) { sim.tick(dt); },
      advance: function (m, stopOnCall) { sim.advance(m, stopOnCall); changed(); },
      setAuto: function (on) { sim.auto = !!on; },
      isAuto: function () { return sim.auto; }
    };
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
        S.announcement = S.announcement || ""; S.surveys = S.surveys || [];
        changed();
      }).catch(function (e) { console.warn("Visit Pass: could not load state", e); });
    }
    function act(method, path, body) { return req(method, path, body).then(function (r) { return load().then(function () { return r; }); }); }
    S.now = 0; S.rules = {}; S.rooms = []; S.patients = []; S.log = []; S.me = null; S.announcement = ""; S.surveys = [];
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
      tick: function () {}, advance: function () {}, setAuto: function () {}, isAuto: function () { return false; }
    };
  }

  var a = CFG.mode === "api" ? apiAdapter() : demoAdapter();
  Object.keys(base).forEach(function (k) { a[k] = base[k]; });
  window.VisitPassStore = a;
})();
