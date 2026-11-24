/* Demo simulator: a fictional clinic day with fake patients.
 *
 * Demo mode only. It fills the floor with patients, moves the clock, and
 * plays the parts that real people do in production (patients arriving,
 * staff tapping "Patient arrived" and "Check out"). The real decisions (who
 * is called where, what is on hold) are made by engine.js, exactly as they
 * will be on the server. Nothing here is sent or saved.
 */
(function (root) {
  "use strict";
  var NAMES = ["Megan Lloyd", "Jamie Reed", "Priya Nair", "Tom Okafor", "Sara Lindqvist", "Wei Chen", "Omar Haddad", "Lucy Brandt", "Daniel Cho", "Ana Ferreira", "Kofi Mensah", "Hana Sato", "Peter Novak", "Ruth Abera", "Liam Doyle", "Nadia Rahimi", "Carl Jensen", "Mei Tanaka", "Ivan Petrov", "Grace Obi", "Noah Fischer", "Leila Aziz", "Sam Whitlock", "Elena Ruiz", "Ben Arnett", "Farah Qureshi", "Jon Halvorsen", "Tessa Moreau", "Raj Patel", "Mina Park", "Owen Clarke", "Zoe Lambert", "Hugo Brandl", "Amara Diallo", "Kate Sorensen", "Yusuf Demir", "Isla Fraser", "Marco Bianchi", "Dana Levy", "Felix Wong"];
  var TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function create(E, cfg) {
    var D = cfg.demo, me = D.patientCall, myNo = parseInt(me.slice(2), 10);
    var sim = { S: null, me: null, auto: false };

    /* A fresh day: fake patients booked from opening time, then a short
       warm-up so the floor is already busy when the demo opens. */
    sim.reset = function (day) {
      var r = rng(D.seed + (day || 0)), S = E.newState(D.open), n = 31, t = D.open, i = 0;
      while (t < D.lastArrival) {
        var types = [];
        E.ORDER.forEach(function (k) { if (r() < (D.mix[k] || 0)) types.push(k); });
        if (!types.length) types.push(E.ORDER[0]);
        var booked = r() < 0.7;
        if (n === myNo) n++; // keep the demo patient's number free
        E.addVisit(S, { id: "p" + i, name: NAMES[i % NAMES.length], call: (booked ? "B-0" : "W-0") + n, types: types, dueAt: t, f: 0.85 + r() * 0.35 });
        n++; i++; t += 4 + r() * 5;
      }
      S.day = day || 0; // days from today; the demo can jump to a booked visit's day
      sim.S = S; sim.me = null; sim.auto = false;
      sim.advance(D.warmUp, false);
      return S;
    };

    /* The demo patient's visit, booked by the clerk. */
    sim.bookMe = function (types, opts) {
      opts = opts || {};
      if (sim.me || !types.length) return null;
      var tok = "";
      for (var i = 0; i < 8; i++) tok += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
      sim.me = E.addVisit(sim.S, { id: "me", name: D.patientName, call: me, types: types, isMe: true, token: tok, dueAt: opts.dueAt, arriveBy: opts.arriveBy, plan: opts.plan });
      return sim.me;
    };
    sim.unbookMe = function () { if (sim.me && E.removeVisit(sim.S, sim.me.id)) sim.me = null; };

    /* One step of the clinic clock (dt minutes). Other patients arrive on
       time and their rooms run by themselves. The demo patient waits for a
       scan or a staff tap, unless the demo is playing by itself. */
    sim.tick = function (dt) {
      var S = sim.S;
      S.now += dt;
      S.patients.forEach(function (p) { if (p.state === "expected" && !p.isMe && p.dueAt <= S.now) { p.state = "waiting"; p.arrivedAt = S.now; } });
      S.rooms.forEach(function (r) {
        if (r.state === "free") return;
        var p = E.patient(S, r.pid);
        if (p.isMe && !sim.auto) return;
        var s = E.stepOf(p, r.type);
        if (r.state === "called" && S.now - r.since >= 1.5) E.roomNext(S, r.id);
        else if (r.state === "in" && S.now - r.since >= s.d) E.roomNext(S, r.id);
      });
      E.dispatch(S);
    };
    /* Fast-forward m minutes, optionally stopping when the demo patient is called. */
    sim.advance = function (m, stopOnCall) {
      for (var i = 0; i < m * 4; i++) { sim.tick(0.25); if (stopOnCall && sim.me && sim.me.state === "called") break; }
    };
    return sim;
  }

  var api = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SlotIQDemoSim = api;
})(this);
