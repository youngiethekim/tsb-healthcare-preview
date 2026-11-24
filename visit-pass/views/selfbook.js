/* Pick-your-time booking, by invitation only.
 *
 * For imaging and other custom appointments that are not open to the public
 * (unlike Lab Online Booking). Staff send one patient a private link for
 * specific exams and a priority window. The patient proves who they are
 * (date of birth), sees only times where every exam fits back to back, books,
 * and can change or cancel until 24 hours before. On the day, the booking
 * becomes a Digital Visit Pass.
 *
 *   Staff:   Invitations screen (send, resend, cancel, see status, next open times)
 *   Patient: the phone shows this flow while the link is open and no visit is on the floor
 *
 * Slot finding is scheduler.js; every rule about who may see or book what is
 * in the store (server side in production).
 */
(function (VP) {
var K = VP.kit, S = K.S, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL;
var ic = K.ic, btn = K.btn, plural = K.plural, toast = K.toast, esc = K.esc, fmt = K.fmt, mins = K.mins;
var SB = CFG.selfBooking, SITE = esc(CFG.site.name);
var BOOKABLE = ORDER.filter(function (k) { return TYPES[k].selfBook; });

/* ---------- helpers ---------- */
function dateOf(day) { var d = new Date(); d.setDate(d.getDate() + day); return d; }
function dayLabel(day, long) {
  if (day === S.day) return "Today";
  if (day === S.day + 1) return "Tomorrow";
  return dateOf(day).toLocaleDateString("en-CA", long ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
}
function closed(day) { return SB.closedWeekdays.indexOf(dateOf(day).getDay()) >= 0; }
function prio(id) { return SB.priorities.filter(function (p) { return p.id === id; })[0]; }
function typeList(types) { return types.map(function (t) { return TYPES[t].name; }).join(", "); }
function visitLen(types) { var m = 0; types.forEach(function (t) { m += TYPES[t].dur; }); return m; }
/* Store calls may be sync (demo) or return a promise (api). Cache by key. */
var cache = {};
function get(key, fn) {
  if (key in cache) return cache[key];
  var r = fn();
  if (r && typeof r.then === "function") { cache[key] = undefined; r.then(function (v) { cache[key] = v; VP.render(); }); return undefined; }
  return (cache[key] = r);
}
function forget() { cache = {}; }

/* ---------- patient phone ---------- */
var P = { day: null, plan: null, err: "", mode: "" }; // mode: "" | "review" | "change"

function mine() { return U.invite ? S.invites.filter(function (x) { return x.token === U.invite; })[0] || null : null; }

function head(t, d) { return '<div class="now npic"><span class="ni">' + ic("cal") + "</span><div><b>" + t + "</b><span>" + d + "</span></div></div>"; }

function verifyScreen(st) {
  if (st.locked) return head("This link is locked", "Too many tries. Call " + SITE + " and ask for a new link.");
  return head("Book your appointment", SITE + " sent you this private link.") +
    '<div class="sbk"><label for="sbdob"><b>Your date of birth</b><small>To keep your details private, we check this before showing anything else.</small></label>' +
    '<input id="sbdob" type="date" autocomplete="bday" value="' + esc(P.dob || "") + '">' +
    (P.err ? '<p class="sberr" role="alert">' + esc(P.err) + "</p>" : "") +
    btn("sbverify", "Continue", "primary wide") + '<small class="sub">Demo: ' + esc(CFG.demo.patientDob) + "</small></div>";
}

function planCard(p, title) {
  return '<div class="sbplan">' + (title ? "<b>" + title + "</b>" : "") +
    '<div class="sbwhen"><span>' + ic("cal") + "<b>" + dayLabel(p.day, true) + '</b></span><span class="sub">Arrive by <b>' + fmt(p.arrive) + "</b> · done about " + fmt(p.end) + "</span></div>" +
    '<ol class="sbsteps">' + p.steps.map(function (s) {
      var T = TYPES[s.type];
      return '<li style="--lab:' + COL[s.type] + '"><span class="tm">' + fmt(s.start) + "</span><div><b>" + T.name + "</b><small>" + T.where + "</small>" + (T.prep ? '<small class="prep">' + esc(T.prep) + "</small>" : "") + "</div></li>";
    }).join("") + "</ol></div>";
}

function pickScreen(x) {
  var days = [], d;
  for (d = Math.max(x.from, S.day); d <= x.to; d++) days.push(d);
  if (P.day == null || P.day < days[0] || P.day > x.to) {
    P.day = null;
    for (var i = 0; i < days.length && P.day == null; i++) { var o = closed(days[i]) ? [] : get(x.token + "|" + days[i], function () { return store.slots(x.token, days[i]); }); if (o && o.length) P.day = days[i]; }
    if (P.day == null) P.day = days[0];
  }
  var h = head("Pick a time", typeList(x.types) + " · about " + mins(visitLen(x.types)) + " in the rooms") +
    '<p class="sub">Book by <b>' + dayLabel(x.to, true) + "</b>. Every time shown fits all your appointments, one after another.</p>" +
    '<div class="sbdays" role="group" aria-label="Day">' + days.map(function (dd) {
      var o = closed(dd) ? [] : get(x.token + "|" + dd, function () { return store.slots(x.token, dd); }), n = o ? o.length : null;
      var lab = dayLabel(dd).split(", ");
      return '<button class="sbday' + (dd === P.day ? " on" : "") + (n === 0 ? " none" : "") + '" data-a="sbday" data-v="' + dd + '"' + (n === 0 ? ' aria-disabled="true"' : "") + "><small>" + lab[0] + "</small><b>" + (lab[1] || dateOf(dd).getDate()) + "</b><i>" + (closed(dd) ? "Closed" : n == null ? "…" : n ? n + " times" : "Full") + "</i></button>";
    }).join("") + "</div>";
  var opts = closed(P.day) ? [] : get(x.token + "|" + P.day, function () { return store.slots(x.token, P.day); });
  if (opts == null) return h + '<p class="sub">Looking for times…</p>';
  if (!opts.length) return h + '<p class="sub">' + (closed(P.day) ? "Closed that day." : "No times left that day. Try another day.") + "</p>";
  function grp(t, list) { return list.length ? '<div class="grp"><span class="gl">' + t + '</span><div class="sbtimes">' + list.map(function (p) { return '<button class="sbtime" data-a="sbpick" data-v="' + p.start + '"><b>' + fmt(p.start) + "</b><small>done " + fmt(p.end) + "</small></button>"; }).join("") + "</div></div>" : ""; }
  return h + grp("Morning", opts.filter(function (p) { return p.start < 720; })) + grp("Afternoon", opts.filter(function (p) { return p.start >= 720; }));
}

function bookedScreen(x) {
  var b = x.booking, left = b.day * 1440 + b.start - (S.day * 1440 + S.now), canChange = left >= SB.changeUntilHours * 60;
  return '<div class="now npic fin"><span class="ni">' + ic("check") + "</span><div><b>You’re booked</b><span>" + dayLabel(b.day, true) + ", arrive by " + fmt(b.arrive) + "</span></div></div>" +
    planCard(b) +
    '<p class="sub">On the day, this turns into your Digital Visit Pass: one code for the entrance and every door.</p>' +
    btn("sbics", ic("cal") + "Add to my calendar", "wide", "") +
    (canChange ? '<div class="acts2">' + btn("sbchange", "Change the time", "", "") + btn("sbcancel", "Cancel booking", "", "") + "</div>"
      : '<p class="sub">Less than ' + SB.changeUntilHours + " hours to go. To change it, call " + SITE + ".</p>");
}

function phone() {
  if (!U.invite) return "";
  var st = get("open|" + U.invite, function () { return store.openInvite(U.invite); });
  if (st == null) return '<p class="sub">Opening your link…</p>';
  if (!st.ok) return head("This link is not valid", "It may have been cancelled or replaced. Ask " + SITE + " for a new one.");
  var x = st.verified || P.ok ? mine() || P.invite : null;
  if (!x) return verifyScreen(st);
  if (P.mode === "review" && P.plan) return '<button class="back" data-a="sbback" data-v="">← Other times</button><h2>Check your booking</h2>' + planCard(P.plan) +
    (P.err ? '<p class="sberr" role="alert">' + esc(P.err) + "</p>" : "") + btn("sbconfirm", "Book this time", "primary big wide next", "");
  if (x.booking && P.mode !== "change") return bookedScreen(x);
  return (P.mode === "change" ? '<button class="back" data-a="sbkeep" data-v="">← Keep my booking</button>' : "") + pickScreen(x);
}

/* Demo control under the phone when no visit is on today's floor. */
function demo() {
  var x = mine(); if (!x || store.mode !== "demo") return "";
  if (x.booking && x.booking.day !== S.day) return btn("sbjump", "Jump to " + dayLabel(x.booking.day, true), "primary big wide next", String(x.booking.day));
  return "";
}

function ics(x) {
  var b = x.booking, d = dateOf(b.day), p = function (n) { return (n < 10 ? "0" : "") + n; };
  var stamp = function (m) { return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "T" + p(Math.floor(m / 60)) + p(m % 60) + "00"; };
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Slot IQ//Visit//EN", "BEGIN:VEVENT", "UID:" + x.token + "@slotiq", "DTSTART:" + stamp(b.arrive), "DTEND:" + stamp(b.end),
    "SUMMARY:" + CFG.site.name + " appointment", "LOCATION:" + CFG.site.address.replace(/,/g, "\\,"), "DESCRIPTION:Arrive by " + fmt(b.arrive) + ". Bring your Digital Visit Pass.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

/* ---------- staff: Invitations ---------- */
var F = { types: {}, priority: "soon", sent: null };
var STATUS = { sent: ["Sent", "lock"], opened: ["Opened", "in"], booked: ["Booked", "okp"], locked: ["Locked", "called"], cancelled: ["Cancelled", "free"], expired: ["Expired", "free"] };

function staff() {
  var n = BOOKABLE.filter(function (k) { return F.types[k]; });
  var me = S.me && S.me.state !== "expected";
  var h = '<div class="card"><h3>Send a pick-your-time link</h3>' +
    '<div class="mini" style="margin-bottom:12px"><span class="num">' + esc(CFG.demo.patientName.split(" ").map(function (w) { return w[0]; }).join("")) + "</span><span><b>" + esc(CFG.demo.patientName) + "</b><br>From the request form. Mobile on file ends 0142</span></div>" +
    '<p class="sub" style="margin-bottom:8px">Only this patient can open the link. They see times that fit every exam you tick, one after another.</p><div class="list">' +
    BOOKABLE.map(function (k) { return '<button class="opt" role="checkbox" aria-checked="' + !!F.types[k] + '" data-a="sbtype" data-v="' + k + '"><span class="box">' + (F.types[k] ? "✓" : "") + "</span><span><b>" + TYPES[k].name + "</b><small>" + TYPES[k].dur + " min · " + TYPES[k].where + "</small></span></button>"; }).join("") +
    '</div><div class="grp" style="margin-top:12px"><span class="gl">How soon</span><div class="chips">' +
    SB.priorities.map(function (p) { return btn("sbprio", p.label + " · within " + plural(p.days, "day"), F.priority === p.id ? "on" : "", p.id); }).join("") + "</div></div>" +
    '<div style="margin-top:12px">' + (me ? '<p class="sub">' + esc(CFG.demo.patientName) + " is at the hospital in this demo. Start over to send a link.</p>"
      : n.length ? btn("sbsend", "Send the link by text", "primary big next", "") : '<p class="sub">Tick at least one exam.</p>') + "</div>" +
    (F.sent ? '<div class="sblink"><span>' + ic("lock") + "<code>" + esc(SB.inviteBaseUrl + F.sent) + "</code></span>" + (VP.enabled("pass") ? btn("see", "Open it on the patient phone ›", "", "pass") : "") + "</div>" : "") + "</div>";

  h += '<div class="card"><h3>Next open times</h3><div class="tblwrap"><table><thead><tr><th>Exam</th><th>First time that fits</th></tr></thead><tbody>' +
    BOOKABLE.map(function (k) { var p = store.firstOpen([k], S.day + 14); return "<tr><td>" + TYPES[k].name + "</td><td>" + (p ? dayLabel(p.day) + " · " + fmt(p.start) : "None in the next 2 weeks") + "</td></tr>"; }).join("") +
    "</tbody></table></div></div>";

  h += '<div class="card"><h3>Invitations · ' + S.invites.length + '</h3><div class="tblwrap"><table><thead><tr><th>Patient</th><th>Exams</th><th>How soon</th><th>Status</th><th>When</th><th></th></tr></thead><tbody>' +
    S.invites.map(function (x) {
      var s = STATUS[x.status] || [x.status, "free"], p = prio(x.priority);
      var when = x.booking ? dayLabel(x.booking.day) + " · " + fmt(x.booking.start) : x.status === "cancelled" || x.status === "expired" ? "—" : "Book by " + dayLabel(x.to);
      var acts = x.status === "cancelled" || x.status === "expired" ? "" : btn("sbresend", "Resend", "", x.id) + btn("sbrevoke", "Cancel", "", x.id);
      return '<tr class="' + (x.isMe ? "me" : "") + '"><td>' + esc(x.name) + (x.isMe ? ' <span class="pill called">demo</span>' : "") + "</td><td>" + x.types.map(function (t) { return '<span class="lab" style="--lab:' + COL[t] + '">' + TYPES[t].short + "</span>"; }).join(" ") + "</td><td>" + (p ? p.label : "") + '</td><td><span class="pill ' + s[1] + '">' + s[0] + (x.status === "locked" ? " · too many tries" : "") + "</span></td><td>" + when + '</td><td class="sbacts">' + acts + "</td></tr>";
    }).join("") + "</tbody></table></div><p class=\"sub\" style=\"margin-top:8px\">A locked link opens again when you resend it. Cancelling frees the booked rooms.</p></div>";
  return h;
}

VP.selfbook = { phone: phone, demo: demo, dayLabel: dayLabel };
VP.component({
  id: "selfbook", order: 32, staff: true, name: "Invitations", product: "Slot IQ Book", icon: "cal", title: "Pick-your-time invitations",
  blurb: "For imaging and other exams that are not open to the public. Send one patient a private link; they pick a time that fits every exam, and it becomes their Digital Visit Pass on the day.",
  render: staff,
  reset: function () { forget(); P = { day: null, plan: null, err: "", mode: "" }; F.sent = null; U.invite = null; },
  before: function () { if (!U.invite) { var q = new URLSearchParams(location.search).get("invite"); if (q) U.invite = q; } },
  actions: {
    sbtype: function (v) { F.types[v] = !F.types[v]; },
    sbprio: function (v) { F.priority = v; },
    sbsend: function () {
      var types = BOOKABLE.filter(function (k) { return F.types[k]; }); if (!types.length) return;
      if (S.me && S.me.state === "expected") store.unbook(); // the link replaces a visit the clerk booked
      VP.result(store.invite({ types: types, priority: F.priority, by: "Booking clerk" }), function (x) {
        if (!x) return; F.sent = x.token; U.invite = x.token; forget(); P = { day: null, plan: null, err: "", mode: "" };
        if (VP.notify) VP.notify(CFG.site.name, "Book your appointment: " + SB.inviteBaseUrl + x.token, "staff");
        toast("<span>Link sent to " + esc(CFG.demo.patientName.split(" ")[0]) + "’s phone.</span>");
      });
    },
    sbresend: function (v) { VP.result(store.resendInvite(v), function () { forget(); toast("<span>Link sent again.</span>"); }); },
    sbrevoke: function (v) { VP.result(store.revokeInvite(v), function () { forget(); toast("<span>Invitation cancelled.</span>"); }); },
    sbverify: function () {
      var el = document.getElementById("sbdob"); P.dob = el ? el.value : "";
      VP.result(store.verifyInvite(U.invite, P.dob), function (r) {
        forget();
        if (r && r.ok) { P.ok = true; P.err = ""; P.invite = r.invite; }
        else P.err = !r ? "Something went wrong. Try again." : r.reason === "locked" ? "Too many tries. This link is now locked." : "That date doesn’t match our records. " + (r.left === 1 ? "1 try" : r.left + " tries") + " left.";
      });
    },
    sbday: function (v) { P.day = +v; },
    sbpick: function (v) {
      var x = mine(); if (!x) return;
      var list = cache[x.token + "|" + P.day] || [];
      P.plan = list.filter(function (p) { return p.start === +v; })[0] || null; P.mode = "review"; P.err = "";
    },
    sbback: function () { P.mode = mine() && mine().booking ? "change" : ""; P.plan = null; },
    sbconfirm: function () {
      VP.result(store.bookInvite(U.invite, P.plan), function (r) {
        forget();
        if (r && r.ok) { P.mode = ""; P.plan = null; toast("<span>Booked. We sent a confirmation by text.</span>"); }
        else { P.err = "Sorry, that time was just taken. Please pick another."; P.mode = ""; }
      });
    },
    sbchange: function () { P.mode = "change"; P.day = null; },
    sbkeep: function () { P.mode = ""; },
    sbcancel: function () { VP.result(store.cancelInvite(U.invite), function (r) { forget(); P.mode = ""; toast("<span>" + (r && r.ok ? "Booking cancelled. Your link still works if you want a new time." : "It is too late to cancel online. Please call.") + "</span>"); }); },
    sbjump: function (v) { store.startDay(+v); forget(); U.pscr = "visit"; },
    sbics: function () {
      var x = mine(); if (!x || !x.booking) return;
      var a = document.createElement("a");
      a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics(x)); a.download = "appointment.ics";
      document.body.appendChild(a); a.click(); a.remove();
    }
  }
});
})(window.VP);
