/* Engine unit tests. No browser, no dependencies:
     node visit-pass/tests/engine.js
   These are the behaviours the server must keep when the engine is ported. */
const path = require("path");
global.window = {};
require(path.join(__dirname, "..", "config.js"));
const cfg = window.VISIT_PASS_CONFIG;
const E = require(path.join(__dirname, "..", "engine.js")).create(cfg);
const Sim = require(path.join(__dirname, "..", "demo-sim.js"));

let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };

function floor(now) { return E.newState(now || 540); }
function visit(S, id, types, arrive) {
  const p = E.addVisit(S, { id, name: id, call: "B-" + id, types, token: "T" + id });
  if (arrive != null) { S.now = arrive; E.checkIn(S, id); }
  return p;
}
function finish(S, roomId) { E.roomNext(S, roomId); E.roomNext(S, roomId); } // arrived, then check out

// --- one pooled queue ---
{
  const S = floor(540);
  visit(S, "a", ["blood"], 540); visit(S, "b", ["blood"], 541); visit(S, "c", ["blood"], 542);
  ok(E.patient(S, "a").cur === "b1" && E.patient(S, "b").cur === "b2", "two blood rooms call the first two arrivals");
  ok(E.patient(S, "c").state === "waiting", "third patient waits");
  finish(S, "b2");
  ok(E.patient(S, "c").cur === "b2", "freed room calls the longest-waiting open patient");
  ok(S.log[0].call === "B-c" && S.log[0].room === "Blood test 2", "call is logged for the display");
}
// --- patient goes to whichever of their rooms is free first ---
{
  const S = floor(540);
  visit(S, "x", ["blood"], 540); visit(S, "y", ["blood"], 540);
  const p = visit(S, "p", ["blood", "xray"], 541);
  ok(p.cur === "x1", "blood rooms busy, so the patient is called to X-ray first");
}
// --- rule: before (Cardiogram before Echo) ---
{
  const S = floor(540);
  const p = visit(S, "p", ["ecg", "echo"], 540);
  ok(p.cur === "e1", "called to cardiogram");
  ok(E.lockReason(S, p, "echo") === "After Cardiogram", "echo on hold until cardiogram is done");
  finish(S, "e1");
  ok(p.cur === "h1", "echo called once cardiogram is done");
}
// --- rule: last (Cardiologist comes last) ---
{
  const S = floor(540);
  const p = visit(S, "p", ["xray", "consult"], 540);
  ok(p.cur === "x1" && E.lockReason(S, p, "consult") === "After your tests", "consult waits for the tests");
  finish(S, "x1");
  ok(p.cur === "c1", "consult called after the last test");
}
// --- rule: gap (20 minutes after the blood test) ---
{
  const S = floor(540);
  const p = visit(S, "p", ["blood", "consult"], 540);
  S.now = 545; finish(S, "b1");
  ok(p.state === "waiting" && /^Opens 9:25 \(lab needs 20 min\)$/.test(E.lockReason(S, p, "consult")), "consult opens 20 min after blood: " + E.lockReason(S, p, "consult"));
  E.setNow(S, 564); ok(p.state === "waiting", "still waiting at 9:24");
  E.setNow(S, 565); ok(p.cur === "c1", "called at 9:25 when the gap ends");
}
// --- switching a rule off changes the calls live ---
{
  const S = floor(540);
  const p = visit(S, "p", ["blood", "consult"], 540);
  S.now = 545; finish(S, "b1");
  E.setRule(S, "hold", false);
  ok(p.cur === "c1", "hold switched off: consult called straight away");
}
// --- staff bump ---
{
  const S = floor(540);
  visit(S, "busy", ["xray"], 540);
  visit(S, "a", ["xray"], 541); const b = visit(S, "b", ["xray"], 542);
  let r = E.bump(S, "b", "xray");
  ok(r.ok && b.bump === "xray" && r.msg === "B-b is next for X-ray", "bump puts a waiting patient next: " + r.msg);
  finish(S, "x1");
  ok(b.cur === "x1" && E.patient(S, "a").state === "waiting", "bumped patient is called before an earlier arrival");
  r = E.bump(S, "a", "echo");
  ok(!r.ok && /has no Echocardiogram/.test(r.msg), "bump refuses a type not on the visit");
  const c = visit(S, "c", ["blood", "consult"], 543);
  finish(S, c.cur); // blood done: consult is now held by the 20 minute gap
  r = E.bump(S, "c", "consult");
  ok(!r.ok && /on hold/.test(r.msg), "bump refuses a step on hold");
}
// --- door scanner ---
{
  const S = floor(540);
  const p = visit(S, "p", ["xray"], 540);
  let r = E.scanDoor(S, "p", "b1");
  ok(!r.ok && r.reason === "wrong-door" && r.room === "x1" && p.state === "called", "wrong door changes nothing and names the right room");
  r = E.scanDoor(S, "p", "x1");
  ok(r.ok && p.state === "in", "right door: patient is in the room");
  E.roomNext(S, "x1");
  ok(p.state === "finished" && p.finishedAt === S.now, "last check-out finishes the visit");
}
// --- estimates ---
{
  const S = floor(540);
  visit(S, "a", ["echo"], 540);            // in the echo room for 25 min
  const p = visit(S, "p", ["echo"], 541);
  ok(E.estWait(S, p, "echo") === 26, "wait estimate counts the patient in the room: " + E.estWait(S, p, "echo"));
  const q = E.addVisit(S, { id: "q", call: "B-q", types: ["blood", "consult"] });
  const e = E.etas(S, q, "9:00");
  ok(e.blood === 540 && e.consult === 565, "before arrival: blood at 9:00, consult after the 20 min gap: " + JSON.stringify(e));
}
// --- privacy: nothing clinical in the state ---
{
  const sim = Sim.create(E, cfg); const S = sim.reset(); sim.bookMe(E.ORDER.slice()); sim.advance(60);
  const keys = new Set(); JSON.stringify(S, (k, v) => { keys.add(k); return v; });
  const allowed = ["", "now", "rules", "patients", "rooms", "log", "id", "name", "call", "ref", "token", "isMe", "steps", "state", "dueAt", "arrivedAt", "cur", "finishedAt", "bump", "f", "type", "status", "room", "calledAt", "start", "end", "d", "level", "pid", "since", "t", "me", "day", "arriveBy", "plan", "arrive"].concat(cfg.rules.map(r => r.id)).concat(Object.keys(Array(200).fill(0)));
  const extra = [...keys].filter(k => !allowed.includes(k));
  ok(extra.length === 0, "state holds only name, number, place and time fields" + (extra.length ? ": " + extra : ""));
}
// --- a full demo day runs to the end ---
{
  const sim = Sim.create(E, cfg); const S = sim.reset(); sim.bookMe(E.ORDER.slice()); sim.auto = true;
  E.checkIn(S, "me"); sim.advance(600); // the one cardiologist room is the bottleneck
  ok(sim.me.state === "finished", "demo patient finishes all " + sim.me.steps.length + " appointments");
  ok(S.patients.every(p => p.state === "finished"), "every patient of the day finishes");
  ok(S.rooms.every(r => r.state === "free"), "every room is free at the end");
}

console.log(fails ? fails + " failed" : "All engine tests passed");
process.exit(fails ? 1 : 0);
