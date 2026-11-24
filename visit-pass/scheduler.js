/* Slot IQ scheduler: finds times a patient can pick for exams booked by
 * invitation (imaging and other custom appointments).
 *
 * Given the exams on an invitation, a day and each room's booked time, it
 * returns start times where every exam fits back to back in one visit:
 * each exam in a room of its type, in an order the visit rules allow, with
 * walking time between rooms, the whole visit within `maxSpan`.
 *
 * No DOM and no storage: the server runs the same logic (see README.md,
 * "Pick-your-time booking"). Days are whole-day offsets from today (0 = today);
 * times are minutes after midnight, clinic local time.
 */
(function (root) {
  "use strict";

  function create(cfg, E) {
    var C = cfg.selfBooking, TYPES = E.TYPES, RULES = E.RULES;
    var ROOMS = cfg.rooms;

    function roomsOf(type) { return ROOMS.filter(function (r) { return r.type === type; }); }
    function free(busy, a, b) { for (var i = 0; i < busy.length; i++) if (a < busy[i][1] && busy[i][0] < b) return false; return true; }

    /* Every order of the exams that the visit rules allow. */
    function orders(types, rules) {
      var on = function (R) { return rules ? !!rules[R.id] : R.on !== false; };
      var out = [];
      (function perm(done, left) {
        if (!left.length) { out.push(done); return; }
        left.forEach(function (t, i) { perm(done.concat([t]), left.slice(0, i).concat(left.slice(i + 1))); });
      })([], types.slice());
      return out.filter(function (o) {
        return RULES.every(function (R) {
          if (!on(R)) return true;
          var at = function (t) { return o.indexOf(t); };
          if (R.kind === "last" && at(R.type) >= 0) return at(R.type) === o.length - 1;
          if (R.kind === "before" && at(R.first) >= 0 && at(R.then) >= 0) return at(R.first) < at(R.then);
          if (R.kind === "gap" && at(R.after) >= 0 && at(R.before) >= 0) return at(R.after) < at(R.before);
          return true;
        });
      });
    }

    /* Place the exams in one order, the first exactly at `start`, each next one
       as soon as a room of its type is free. Returns a plan or null. */
    function place(order, day, start, busyFn, rules) {
      var steps = [], cursor = start, ends = {};
      for (var i = 0; i < order.length; i++) {
        var type = order[i], dur = TYPES[type].dur, t = i === 0 ? start : cursor + C.transfer;
        RULES.forEach(function (R) {
          if (R.kind === "gap" && (rules ? rules[R.id] : R.on !== false) && R.before === type && ends[R.after] != null) t = Math.max(t, ends[R.after] + R.minutes);
        });
        t = Math.ceil(t / C.step) * C.step;
        var got = null;
        for (; t + dur <= C.close && !got; t += C.step) {
          roomsOf(type).some(function (r) { if (free(busyFn(r.id, day), t, t + dur)) { got = { type: type, room: r.id, start: t, end: t + dur }; return true; } return false; });
          if (i === 0) break; // the first exam starts exactly at the offered time
        }
        if (!got) return null;
        steps.push(got); ends[type] = got.end; cursor = got.end;
      }
      if (cursor - start > C.maxSpan) return null;
      return { day: day, start: start, end: cursor, arrive: start - C.arriveEarly, steps: steps };
    }

    /* The best plan for one start time: the order that finishes first. */
    function plan(types, day, start, busyFn, rules) {
      var best = null;
      orders(types, rules).forEach(function (o) {
        var p = place(o, day, start, busyFn, rules);
        if (p && (!best || p.end < best.end)) best = p;
      });
      return best;
    }

    /* All start times on one day. opts.after: earliest start (today: now + lead).
       opts.closed(day): true when the site is closed that day. */
    function options(types, day, busyFn, opts) {
      opts = opts || {};
      if (!types.length || (opts.closed && opts.closed(day))) return [];
      var out = [], from = Math.max(C.open, opts.after || 0);
      from = Math.ceil(from / C.startEvery) * C.startEvery;
      for (var s = from; s < C.close; s += C.startEvery) {
        var p = plan(types, day, s, busyFn, opts.rules);
        if (p) out.push(p);
      }
      // Several starts can end at the same time (the later exams wait for a
      // free room). Offer only the latest of them: same finish, less waiting.
      return out.filter(function (p) { return !out.some(function (q) { return q.end === p.end && q.start > p.start; }); });
    }

    /* Does a plan still fit? (Someone else may have taken a room meanwhile.) */
    function stillFree(p, busyFn) {
      return p.steps.every(function (st) { return free(busyFn(st.room, p.day), st.start, st.end); });
    }

    /* Demo only: other patients' bookings, the same every time for a given day. */
    function demoBusy(seed) {
      var cache = {};
      function h(a, b, c) { var x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + seed) * 43758.5453; return x - Math.floor(x); }
      return function (roomId, day) {
        var k = roomId + "|" + day;
        if (cache[k]) return cache[k];
        var r = ROOMS.filter(function (x) { return x.id === roomId; })[0], ri = ROOMS.indexOf(r), dur = TYPES[r.type].dur, out = [], t = C.open;
        while (t < C.close) {
          if (h(ri, day, t) < C.demoBusy) { out.push([t, t + dur]); t += dur; }
          else t += 15;
        }
        return (cache[k] = out);
      };
    }

    return { orders: orders, plan: plan, options: options, stillFree: stillFree, demoBusy: demoBusy, free: free };
  }

  var api = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SlotIQScheduler = api;
})(this);
