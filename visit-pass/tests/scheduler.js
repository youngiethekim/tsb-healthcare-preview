/* Pick-your-time booking tests: the scheduler and the invitation rules.
     node visit-pass/tests/scheduler.js
   No browser, no dependencies. These are the behaviours the server must keep. */
const path = require("path");
const R = f => path.join(__dirname, "..", f);
global.window = {};
require(R("config.js"));
const cfg = window.VISIT_PASS_CONFIG, SB = cfg.selfBooking;
const E = require(R("engine.js")).create(cfg);
const Sc = require(R("scheduler.js")).create(cfg, E);

let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const none = () => [];
const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1];

/* ---------- scheduler ---------- */
{
  const o = Sc.orders(["consult", "echo", "ecg", "xray"]).map(x => x.join(">"));
  ok(o.length === 3 && o.every(x => x.endsWith("consult") && x.indexOf("ecg") < x.indexOf("echo")), "orders follow the rules: cardiologist last, cardiogram before echo (" + o.join(" | ") + ")");
  const off = Sc.orders(["consult", "xray"], { last: false, hold: true, ecgFirst: true });
  ok(off.length === 2, "switching a rule off allows more orders");
}
{
  const p = Sc.plan(["xray", "echo", "consult"], 3, 540, none);
  ok(p && p.start === 540 && p.arrive === 540 - SB.arriveEarly, "empty calendar: plan starts at the offered time, arrive 10 min early");
  ok(p.steps.map(s => s.type).join(">") === "xray>echo>consult", "first-finishing order chosen");
  ok(p.steps.every((s, i) => i === 0 || s.start >= p.steps[i - 1].end + SB.transfer), "exams back to back with walking time");
  ok(p.steps.every(s => cfg.rooms.find(r => r.id === s.room).type === s.type), "each exam in a room of its type");
}
{
  const busy = Sc.demoBusy(7);
  let plans = 0, bad = 0;
  for (let d = 1; d <= 10; d++) Sc.options(["xray", "echo", "consult"], d, busy).forEach(p => {
    plans++;
    if (p.end - p.start > SB.maxSpan || p.end > SB.close || p.start < SB.open || p.start % SB.startEvery) bad++;
    p.steps.forEach(s => { if (busy(s.room, d).some(b => overlaps(b, [s.start, s.end]))) bad++; });
  });
  ok(plans > 20 && bad === 0, plans + " offered times over 10 days: none overlaps a booking, all within hours and the longest-visit limit");
  const o = Sc.options(["xray", "echo"], 4, busy);
  ok(o.every(p => !o.some(q => q.end === p.end && q.start > p.start)), "no two offers end together (the later start is kept: less waiting)");
}
{
  ok(Sc.options(["xray"], 2, none, { closed: d => d === 2 }).length === 0, "closed day: no times");
  ok(Sc.options(["xray"], 0, none, { after: 600 }).every(p => p.start >= 600), "today: nothing before now plus the lead time");
  const p = Sc.plan(["xray"], 1, 600, none), taken = (room, d) => (d === 1 && room === p.steps[0].room ? [[600, 610]] : []);
  ok(Sc.stillFree(p, none) && !Sc.stillFree(p, taken), "a plan is re-checked before booking");
}

/* ---------- invitations (the demo store; server side in production) ---------- */
window.SlotIQEngine = require(R("engine.js"));
window.SlotIQScheduler = require(R("scheduler.js"));
window.SlotIQDemoSim = require(R("demo-sim.js"));
require(R("store.js"));
const store = window.VisitPassStore, S = store.state(), D = cfg.demo;
{
  ok(S.invites.length === 6 && S.invites.filter(x => x.booking).length === 2, "demo starts with other patients' invitations, two booked");
  const x = store.invite({ types: ["xray", "consult"], priority: "soon" });
  ok(/^[A-Z2-9]{10}$/.test(x.token) && x.to - x.from === 7, "invite has a random 10-character token and a 7-day window for Soon");
  ok(store.slots(x.token, 1).length === 0, "no times before the patient proves who they are");
  ok(store.openInvite("NOPE").ok === false, "unknown link: not valid");
  let r = store.verifyInvite(x.token, "1990-01-01");
  ok(!r.ok && r.left === SB.maxAttempts - 1, "wrong date of birth refused, tries counted");
  r = store.verifyInvite(x.token, D.patientDob);
  ok(r.ok, "right date of birth opens the link");
  ok(store.slots(x.token, x.to + 1).length === 0, "no times after the booking window");
  let day = x.from + 2, o; // more than 24 h ahead, so the patient may cancel
  while (!(o = store.slots(x.token, day)).length) day++;
  const pick = o[0];
  r = store.bookInvite(x.token, pick);
  ok(r.ok && x.status === "booked" && x.booking.start === pick.start, "patient books an offered time");
  const y = store.invite({ types: ["xray", "consult"], priority: "soon" });
  ok(x.status === "booked", "a new link does not cancel an existing booking");
  store.verifyInvite(y.token, D.patientDob);
  ok(!store.slots(y.token, day).some(p => p.steps.some(s => x.booking.steps.some(b => b.room === s.room && overlaps([b.start, b.end], [s.start, s.end])))), "booked rooms are no longer offered to anyone else");
  ok(!store.bookInvite(y.token, pick).ok, "the same time can't be booked twice");
  r = store.cancelInvite(x.token);
  ok(r.ok && !x.booking && x.status === "opened", "patient cancels more than 24 h ahead; the link still works");
  ok(store.bookInvite(y.token, pick).ok, "the cancelled time is free again");
}
{
  const z = store.invite({ types: ["xray"], priority: "urgent" });
  for (let i = 0; i < SB.maxAttempts; i++) store.verifyInvite(z.token, "1900-01-01");
  ok(z.status === "locked" && !store.verifyInvite(z.token, D.patientDob).ok, "link locks after " + SB.maxAttempts + " wrong tries, even for the right answer");
  store.resendInvite(z.id);
  ok(z.status === "sent" && store.verifyInvite(z.token, D.patientDob).ok, "staff resend unlocks it");
  const today = store.slots(z.token, S.day);
  ok(today.every(p => p.start >= S.now + SB.leadMinutes), "same-day times start at least " + SB.leadMinutes + " min from now");
  if (today.length) {
    store.bookInvite(z.token, today[0]);
    ok(S.me && S.me.arriveBy === E.fmt(today[0].arrive), "a same-day booking puts the visit on today's floor with its arrival time");
    ok(!store.cancelInvite(z.token).ok, "less than 24 h to go: the patient can't cancel online");
    store.revokeInvite(z.id);
    ok(z.status === "cancelled" && !S.me, "staff cancel frees the rooms and takes the visit off the floor");
  }
  ok(store.openInvite(z.token).ok === false, "a cancelled link no longer opens");
}

console.log(fails ? fails + " failed" : "All scheduler tests passed");
process.exit(fails ? 1 : 0);
