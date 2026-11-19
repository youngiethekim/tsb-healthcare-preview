/* Lab Online Booking.ca — site script.
   No framework, no build step. Each page sets <body data-page="...">
   and the matching init function below runs.
   API seams are marked "API:" so the team can swap demo logic for fetch(). */
(function () {
  "use strict";

  var CFG = window.LOB_CONFIG || {};
  var LOCS = window.LOB_LOCATIONS || [];
  var HAS = window.LOB_AUTHORITIES || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.body.getAttribute("data-root") || "./";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function haSlug(id) { var h = HAS.filter(function (x) { return x.id === id; })[0]; return h ? h.slug : ""; }
  function locUrl(l) { return root + "locations/" + haSlug(l.ha) + "/" + l.id + "/"; }
  function haName(id) { var h = HAS.filter(function (x) { return x.id === id; })[0]; return h ? h.name : ""; }
  function locById(id) { return LOCS.filter(function (l) { return l.id === id; })[0]; }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  var ARROW = '<svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';

  /* ---------------- Header ---------------- */
  function initHeader() {
    var header = $(".site-header");
    if (!header) return;
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 4); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

    var toggle = $(".menu-toggle");
    if (toggle) toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open);
    });

    $$(".nav-item > button.nav-link").forEach(function (btn) {
      var item = btn.parentNode;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = !item.classList.contains("open");
        $$(".nav-item.open").forEach(function (i) { i.classList.remove("open"); $("button", i).setAttribute("aria-expanded", "false"); });
        item.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open);
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".nav-item")) $$(".nav-item.open").forEach(function (i) { i.classList.remove("open"); $("button", i).setAttribute("aria-expanded", "false"); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") $$(".nav-item.open").forEach(function (i) { i.classList.remove("open"); var b = $("button", i); b.setAttribute("aria-expanded", "false"); b.focus(); });
    });
  }

  /* ---------------- Counter (home) ---------------- */
  function renderDigits(el, n) {
    var s = n.toLocaleString("en-CA");
    el.innerHTML = s.split("").map(function (ch) {
      return ch === "," ? '<span class="digit comma">,</span>' : '<span class="digit">' + ch + "</span>";
    }).join("") + '<span class="digit plus">+</span>';
    el.setAttribute("aria-label", s + " plus");
  }
  function initCounter() {
    var el = $("[data-counter]");
    if (!el) return;
    // API: replace with the live total from platform reporting.
    var target = CFG.appointmentsSince2018 || 4500000;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { renderDigits(el, target); return; }
    renderDigits(el, Math.round(target * 0.97 / 1000) * 1000);
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var start = performance.now(), from = target * 0.97, dur = 1400;
      (function tick(t) {
        var k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
        renderDigits(el, Math.round((from + (target - from) * e) / 1000) * 1000);
        if (k < 1) requestAnimationFrame(tick); else renderDigits(el, target);
      })(start);
    });
    io.observe(el);
  }

  /* ---------------- Location search ---------------- */
  function normalize(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
  function searchLocations(q, haFilter) {
    var nq = normalize(q), city = null;
    var pc = nq.replace(/\s/g, "").toUpperCase();
    if (/^V\d/.test(pc)) city = (window.LOB_FSA || {})[pc.slice(0, 2)] || null;
    var list = LOCS.filter(function (l) { return !haFilter || !haFilter.length || haFilter.indexOf(l.ha) > -1; });
    if (!nq) return { list: list, matched: true };
    var hits = list.filter(function (l) {
      var hay = normalize(l.name + " " + l.city + " " + haName(l.ha));
      return city ? normalize(l.city) === normalize(city) : hay.indexOf(nq) > -1;
    });
    return hits.length ? { list: hits, matched: true, city: city } : { list: list, matched: false };
  }

  // API: GET /api/locations/{id}/next-available
  function nextAvailable(loc) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    for (var i = 0; i < 21; i++) {
      var day = new Date(d); day.setDate(d.getDate() + i);
      if (slotsFor(loc, day).length) return day;
    }
    return null;
  }

  function locCard(l, pick) {
    var next = nextAvailable(l);
    var nextTxt = next ? "Next: " + next.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }) : "No openings in 3 weeks";
    return '<article class="loc">' +
      '<h3><a href="' + locUrl(l) + '">' + esc(l.name) + "</a></h3>" +
      '<div class="meta"><span>' + esc(l.city) + "</span><span>" + esc(haName(l.ha)) + "</span><span>" + esc(l.hours) + "</span></div>" +
      '<div class="tags">' + l.services.map(function (s) { return '<span class="tag">' + esc(s) + "</span>"; }).join("") + '<span class="tag next">' + esc(nextTxt) + "</span></div>" +
      (pick
        ? '<button class="btn btn-primary" data-pick="' + esc(l.id) + '">Choose ' + ARROW + "</button>"
        : '<a class="btn btn-primary" href="' + root + "book/?lab=" + encodeURIComponent(l.id) + '">Book here ' + ARROW + "</a>") +
      "</article>";
  }

  function initLocations() {
    var form = $("#loc-form"), input = $("#loc-q"), out = $("#loc-list"), count = $("#loc-count");
    if (!out) return;
    var params = new URLSearchParams(location.search);
    input.value = params.get("q") || "";
    var preHa = params.get("ha");
    $$(".filters input[type=checkbox]").forEach(function (c) { if (preHa) c.checked = c.value === preHa; });

    function run() {
      var has = $$(".filters input:checked").map(function (c) { return c.value; });
      var r = searchLocations(input.value, has);
      count.textContent = r.matched
        ? r.list.length + " participating location" + (r.list.length === 1 ? "" : "s") + (input.value ? " near “" + input.value + "”" : "")
        : "No exact match for “" + input.value + "”. Showing all participating locations.";
      out.innerHTML = r.list.length ? r.list.map(locCard).join("") : '<div class="empty">No locations match these filters.</div>';
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var u = new URL(location.href); u.searchParams.set("q", input.value); history.replaceState(null, "", u);
      run();
    });
    $$(".filters input").forEach(function (c) { c.addEventListener("change", run); });
    run();
  }

  /* ---------------- Availability (demo) ---------------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  // API: GET /api/locations/{id}/availability?date=YYYY-MM-DD
  function slotsFor(loc, day) {
    var dow = day.getDay();
    if (dow === 0) return [];
    if (dow === 6 && loc.hours.indexOf("Sat") === -1) return [];
    var m = loc.hours.match(/(\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})/);
    var open = m ? +m[1] * 60 + +m[2] : 420, close = m ? +m[3] * 60 + +m[4] : 900;
    var now = new Date(), out = [];
    for (var t = open; t < close; t += 10) {
      var slot = new Date(day); slot.setHours(0, t, 0, 0);
      if (slot < new Date(now.getTime() + 30 * 60000)) continue;
      if (hash(loc.id + ymd(day) + t) % 100 < 58) continue; // ~58% already booked
      out.push(t);
    }
    return out;
  }
  function fmtTime(mins) {
    var h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? "p.m." : "a.m.";
    return ((h + 11) % 12 + 1) + ":" + String(m).padStart(2, "0") + " " + ap;
  }
  function fmtDate(d) { return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }

  /* ---------------- Booking flow ---------------- */
  function initBook() {
    var app = $("#book-app");
    if (!app) return;
    var params = new URLSearchParams(location.search);
    var state = { lab: locById(params.get("lab")) || null, day: null, time: null };
    var haParam = params.get("ha");
    if (state.lab && /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") || "")) {
      var dp = params.get("date").split("-"); state.day = new Date(+dp[0], +dp[1] - 1, +dp[2]);
      var tp = parseInt(params.get("time"), 10);
      if (slotsFor(state.lab, state.day).indexOf(tp) > -1) state.time = tp;
    }
    var steps = $$(".progress li");

    function setStep(n) {
      steps.forEach(function (li, i) { li.classList.toggle("done", i < n); li.classList.toggle("active", i === n); if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function stepLab() {
      setStep(0);
      app.innerHTML = '<section class="panel" aria-labelledby="s1"><h2 id="s1">Find a lab near you</h2>' +
        '<p>Search by city or postal code, then choose a location.</p>' +
        '<form class="find-form" id="bk-form" role="search"><div class="field-search">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/></svg>' +
        '<label class="sr-only" for="bk-q">City or postal code</label><input id="bk-q" autocomplete="postal-code" placeholder="Enter your city or postal code (e.g. Vancouver, V6B 1A1)"></div>' +
        '<button class="btn btn-primary">Find Labs ' + ARROW + "</button></form>" +
        '<p class="loc-count" id="bk-count" style="margin-top:16px"></p><div class="loc-list" id="bk-list"></div></section>';
      var q = $("#bk-q"); q.value = params.get("q") || "";
      function run() {
        var r = searchLocations(q.value, haParam ? [haParam] : null);
        $("#bk-count").textContent = r.matched ? r.list.length + " locations" + (haParam ? " in " + haName(haParam) : "") : "No exact match. Showing all participating locations.";
        $("#bk-list").innerHTML = r.list.map(function (l) { return locCard(l, true); }).join("");
      }
      $("#bk-form").addEventListener("submit", function (e) { e.preventDefault(); run(); });
      $("#bk-list").addEventListener("click", function (e) {
        var b = e.target.closest("[data-pick]"); if (!b) return;
        state.lab = locById(b.getAttribute("data-pick")); state.day = state.time = null; stepTime();
      });
      run();
    }

    function chosenBar(extra) {
      return '<div class="chosen"><span>Lab: <b>' + esc(state.lab.name) + "</b>, " + esc(state.lab.city) + "</span>" + (extra || "") +
        '<button class="btn btn-ghost" data-change>Change lab</button></div>';
    }

    function stepTime() {
      setStep(1);
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var days = [];
      for (var i = 0; i < 21; i++) { var d = new Date(today); d.setDate(today.getDate() + i); days.push(d); }
      if (!state.day) state.day = days.filter(function (d) { return slotsFor(state.lab, d).length; })[0] || days[0];
      app.innerHTML = '<section class="panel" aria-labelledby="s2"><h2 id="s2">Choose a date and time</h2>' + chosenBar() +
        '<div class="days" role="group" aria-label="Date">' + days.map(function (d) {
          var n = slotsFor(state.lab, d).length;
          return '<button class="day" data-day="' + ymd(d) + '" aria-pressed="' + (ymd(d) === ymd(state.day)) + '"' + (n ? "" : " disabled") + ">" +
            "<small>" + d.toLocaleDateString("en-CA", { weekday: "short" }) + "</small><b>" + d.getDate() + "</b><small>" + d.toLocaleDateString("en-CA", { month: "short" }) + "</small></button>";
        }).join("") + "</div>" +
        '<div id="slot-area"></div>' +
        '<div class="actions"><button class="btn btn-ghost" data-back>&larr; Back</button><button class="btn btn-primary" id="to-details" disabled>Continue ' + ARROW + "</button></div></section>";
      renderSlots();
      $(".days", app).addEventListener("click", function (e) {
        var b = e.target.closest("[data-day]"); if (!b || b.disabled) return;
        var p = b.getAttribute("data-day").split("-"); state.day = new Date(+p[0], +p[1] - 1, +p[2]); state.time = null;
        $$(".day", app).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        renderSlots();
      });
      $("[data-change]", app).addEventListener("click", stepLab);
      $("[data-back]", app).addEventListener("click", stepLab);
      $("#to-details").addEventListener("click", stepDetails);
    }

    function renderSlots() {
      var s = slotsFor(state.lab, state.day), area = $("#slot-area");
      var groups = [["Morning", s.filter(function (t) { return t < 720; })], ["Afternoon", s.filter(function (t) { return t >= 720; })]];
      area.innerHTML = '<p style="margin-top:8px"><b>' + esc(fmtDate(state.day)) + "</b></p>" + (s.length ? groups.filter(function (g) { return g[1].length; }).map(function (g) {
        return '<p class="slot-group">' + g[0] + '</p><div class="slots" role="group" aria-label="' + g[0] + ' times">' + g[1].map(function (t) {
          return '<button class="slot" data-t="' + t + '" aria-pressed="' + (state.time === t) + '">' + fmtTime(t) + "</button>";
        }).join("") + "</div>";
      }).join("") : '<div class="empty">No times left on this day. Try another date.</div>');
      area.onclick = function (e) {
        var b = e.target.closest("[data-t]"); if (!b) return;
        state.time = +b.getAttribute("data-t");
        $$(".slot", area).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        $("#to-details").disabled = false;
      };
      $("#to-details").disabled = state.time == null;
    }

    function stepDetails() {
      setStep(2);
      var when = " <span>When: <b>" + esc(fmtDate(state.day)) + ", " + fmtTime(state.time) + "</b></span>";
      app.innerHTML = '<section class="panel" aria-labelledby="s3"><h2 id="s3">Your details</h2>' + chosenBar(when) +
        '<form id="det" novalidate><div class="form-grid">' +
        fld("first", "First name", "text", "given-name", true) + fld("last", "Last name", "text", "family-name", true) +
        fld("dob", "Date of birth", "date", "bday", true) +
        fld("phn", 'Personal Health Number <span class="hint">(10 digits, on your BC Services Card)</span>', "text", "off", true, 'inputmode="numeric" maxlength="12" pattern="[0-9 ]{10,12}"') +
        fld("phone", "Mobile phone", "tel", "tel", false) + fld("email", "Email", "email", "email", false) +
        '<div class="fld full"><label for="f-notes">Anything the lab should know? <span class="hint">(optional)</span></label><textarea id="f-notes" name="notes" maxlength="300"></textarea></div>' +
        '<div class="full"><label class="check"><input type="checkbox" name="remind" checked> Send me a reminder by text or email before my appointment.</label></div>' +
        '<div class="full"><label class="check"><input type="checkbox" name="req" required> I have a laboratory requisition from my doctor or nurse practitioner, and I will bring it.</label><p class="fld"><span class="err" id="req-err">Please confirm you have a requisition.</span></p></div>' +
        "</div>" +
        '<div class="actions"><button type="button" class="btn btn-ghost" data-back>&larr; Back</button><button class="btn btn-primary">Confirm booking ' + ARROW + "</button></div></form></section>";
      $("[data-back]", app).addEventListener("click", stepTime);
      $("[data-change]", app).addEventListener("click", stepLab);
      $("#det").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = e.target, ok = true;
        ["first", "last", "dob"].forEach(function (n) { ok = mark(f[n], !!f[n].value.trim()) && ok; });
        ok = mark(f.phn, /^\d{10}$/.test(f.phn.value.replace(/\s/g, ""))) && ok;
        var contact = f.phone.value.trim() || f.email.value.trim();
        ok = mark(f.phone, !!contact) && ok;
        if (f.email.value.trim()) ok = mark(f.email, /.+@.+\..+/.test(f.email.value)) && ok;
        var reqOk = f.req.checked; $("#req-err").style.display = reqOk ? "none" : "block"; ok = ok && reqOk;
        if (!ok) { var bad = $(".invalid input", f); if (bad) bad.focus(); return; }
        // API: POST /api/bookings  { location_id, start, patient{...}, reminders }
        var code = makeCode();
        var booking = { code: code, lab: state.lab.id, date: ymd(state.day), time: state.time, first: f.first.value.trim(), last: f.last.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), created: Date.now() };
        var all = store("lob.bookings") || []; all.push(booking); store("lob.bookings", all);
        stepDone(booking);
      });
    }

    function stepDone(b) {
      setStep(3); steps.forEach(function (li) { li.classList.add("done"); });
      app.innerHTML = '<section class="panel confirm" aria-labelledby="s4">' +
        '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>' +
        '<h2 id="s4">You’re booked</h2><p>Your confirmation code</p><div class="code">' + esc(b.code) + "</div>" +
        "<p>Keep this code. You’ll need it with your last name to change or cancel.</p>" +
        bookingSummary(b) +
        '<div class="actions" style="justify-content:center"><a class="btn btn-outline" href="' + root + 'manage/">Manage booking</a><button class="btn btn-ghost" onclick="window.print()">Print</button></div></section>';
    }

    if (state.lab && state.time != null) stepDetails(); else if (state.lab) stepTime(); else stepLab();
  }

  function fld(name, label, type, ac, req, extra) {
    return '<div class="fld"><label for="f-' + name + '">' + label + "</label>" +
      '<input id="f-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + ac + '"' + (req ? " required" : "") + " " + (extra || "") + ">" +
      '<span class="err">' + (name === "phone" ? "Add a phone number or email so we can send your confirmation." : name === "phn" ? "Enter the 10-digit number on your BC Services Card." : "This field is required.") + "</span></div>";
  }
  function mark(input, ok) { input.closest(".fld").classList.toggle("invalid", !ok); input.setAttribute("aria-invalid", !ok); return ok; }
  function makeCode() { var a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", s = ""; var r = new Uint32Array(8); crypto.getRandomValues(r); for (var i = 0; i < 8; i++) s += a[r[i] % a.length]; return s.slice(0, 4) + "-" + s.slice(4); }
  function bookingSummary(b) {
    var l = locById(b.lab) || {}, p = b.date.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return '<dl class="summary">' +
      "<div><dt>Patient</dt><b>" + esc(b.first + " " + b.last) + "</b></div>" +
      "<div><dt>Lab</dt><b>" + esc(l.name || "") + "<br><small>" + esc(l.city || "") + "</small></b></div>" +
      "<div><dt>Date</dt><b>" + esc(fmtDate(d)) + "</b></div>" +
      "<div><dt>Time</dt><b>" + fmtTime(b.time) + "</b></div>" +
      "<div><dt>Bring</dt><b>Your requisition and BC Services Card</b></div></dl>";
  }

  /* ---------------- Manage booking ---------------- */
  function initManage() {
    var form = $("#manage-form"), out = $("#manage-out");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = form.code.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      var last = form.last.value.trim().toLowerCase();
      // API: POST /api/bookings/lookup { code, last_name } — rate limited server side.
      var all = store("lob.bookings") || [];
      var b = all.filter(function (x) { return x.code.replace("-", "") === code && x.last.toLowerCase() === last; })[0];
      if (!b) { out.innerHTML = '<div class="panel"><p>We couldn’t find a booking with that code and last name. Check your confirmation email or text and try again.</p></div>'; return; }
      out.innerHTML = '<div class="panel"><h2>Booking ' + esc(b.code) + "</h2>" + bookingSummary(b) +
        '<div class="actions"><a class="btn btn-outline" href="' + root + "book/?lab=" + encodeURIComponent(b.lab) + '">Book a new time</a><button class="btn btn-ghost" id="cancel-bk" style="color:#b3261e">Cancel this appointment</button></div></div>';
      $("#cancel-bk").addEventListener("click", function () {
        if (!confirm("Cancel this appointment? The time will be released to other patients.")) return;
        store("lob.bookings", all.filter(function (x) { return x !== b; }));
        out.innerHTML = '<div class="panel"><p><b>Your appointment is cancelled.</b> Thank you for letting the lab know.</p></div>';
      });
    });
  }

  /* ---------------- Home search ---------------- */
  function initHomeSearch() {
    var f = $("#home-find");
    if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      location.href = root + "locations/?q=" + encodeURIComponent($("input", f).value);
    });
  }

  /* ---------------- AI Booking Assistant (demo) ----------------
     A scripted stand-in for Slot IQ Assist. API: replace reply() with
     POST /api/assistant { messages } and render the response. */
  function initAssistant() {
    var panel = $("#chat");
    if (!panel) return;
    var log = $(".chat-log", panel), form = $(".chat-form", panel), input = $("input", form), greeted = false;
    function add(html, who) { var m = document.createElement("div"); m.className = "msg " + who; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
    function open() {
      panel.hidden = false; $$("[data-chat]").forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
      if (!greeted) {
        greeted = true;
        add("Hi! I can find a lab, check availability, and help you book. Where are you located?", "bot");
        add('<div class="chips"><button class="chip">Vancouver</button><button class="chip">Surrey</button><button class="chip">Kelowna</button><button class="chip">What do I need to bring?</button></div>', "bot");
      }
      setTimeout(function () { input.focus(); }, 60);
    }
    function close() { panel.hidden = true; $$("[data-chat]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); }); }
    function reply(text) {
      var t = normalize(text);
      if (/bring|need|requisition/.test(t)) return "Bring your laboratory requisition from your doctor or nurse practitioner and your BC Services Card. Some tests need fasting, so check your requisition. <a href=\"" + root + "help/\">More in Help &amp; FAQs</a>.";
      if (/cancel|change|resched/.test(t)) return 'You can change or cancel with your confirmation code and last name on <a href="' + root + 'manage/">Manage Your Booking</a>.';
      if (/walk|without/.test(t)) return "Participating labs expect the time you booked. Booking ahead is the fastest way to be seen.";
      var r = searchLocations(text);
      if (r.matched && text.trim()) {
        var top = r.list.slice(0, 3);
        return "Here are labs near " + esc(text) + ":<br>" + top.map(function (l) {
          var n = nextAvailable(l);
          return "• <a href=\"" + root + "book/?lab=" + l.id + "\">" + esc(l.name) + "</a>" + (n ? " — next opening " + n.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }) : "");
        }).join("<br>") + "<br>Tap a lab to pick a time.";
      }
      return "I can help with that. Tell me your city or postal code and I’ll find labs with openings, or <a href=\"" + root + "locations/\">browse all locations</a>.";
    }
    function send(text) {
      if (!text.trim()) return;
      add(esc(text), "me");
      var typing = add("…", "bot");
      setTimeout(function () { typing.innerHTML = reply(text); log.scrollTop = log.scrollHeight; }, 450);
    }
    $$("[data-chat]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); panel.hidden ? open() : close(); }); });
    $(".chat-close", panel).addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(); });
    log.addEventListener("click", function (e) { var c = e.target.closest(".chip"); if (c) send(c.textContent); });
    form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); input.value = ""; });
    if (location.hash === "#assistant") open();
  }

  /* ---------------- Next-available tags on server-rendered cards ---------------- */
  function fillNextTags() {
    $$("[data-next]").forEach(function (el) {
      var l = locById(el.getAttribute("data-next")); if (!l) return;
      var n = nextAvailable(l);
      el.textContent = n ? "Next: " + n.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }) : "No openings in 3 weeks";
    });
  }

  /* ---------------- Organization page ---------------- */
  function initOrg() {
    var list = $("#org-list");
    if (!list) return;
    $$(".city-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var c = chip.getAttribute("data-city");
        $$(".city-chip").forEach(function (x) { x.setAttribute("aria-pressed", x === chip); });
        $$(".loc", list).forEach(function (card) { card.hidden = !!c && card.getAttribute("data-city") !== c; });
      });
    });
  }

  /* ---------------- Location page ---------------- */
  // API: open/closed should use the site's per-day hours and holiday calendar.
  function openStatus(hours, now) {
    var m = hours.match(/(\w{3})–(\w{3}) (\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})/);
    if (!m) return null;
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var a = days.indexOf(m[1]), b = days.indexOf(m[2]), d = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes(), open = +m[3] * 60 + +m[4], close = +m[5] * 60 + +m[6];
    var dayOpen = d >= a && d <= b;
    if (dayOpen && mins >= open && mins < close) return { open: true, text: "Open now · closes " + fmtTime(close) };
    if (dayOpen && mins < open) return { open: false, text: "Closed · opens " + fmtTime(open) + " today" };
    return { open: false, text: "Closed now" };
  }
  function initLocation() {
    var st = $("[data-open-status]");
    if (st) {
      var s = openStatus(st.getAttribute("data-hours"), new Date());
      if (s) { st.textContent = s.text; st.classList.add(s.open ? "is-open" : "is-closed"); }
      var dow = (new Date().getDay() + 6) % 7, row = $('.hours tr[data-dow="' + dow + '"]');
      if (row) { row.classList.add("today"); row.querySelector("th").insertAdjacentHTML("beforeend", ' <span class="today-tag">Today</span>'); }
    }
    var box = $("#next-times");
    if (!box) return;
    var l = locById(box.getAttribute("data-lab")), d = new Date(); d.setHours(0, 0, 0, 0);
    var html = "", shown = 0;
    for (var i = 0; i < 21 && shown < 2; i++) {
      var day = new Date(d); day.setDate(d.getDate() + i);
      var s2 = slotsFor(l, day); if (!s2.length) continue;
      shown++;
      var label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : day.toLocaleDateString("en-CA", { weekday: "long" });
      html += '<p class="slot-group">' + label + " · " + day.toLocaleDateString("en-CA", { month: "long", day: "numeric" }) + '</p><div class="slots">' +
        s2.slice(0, 8).map(function (t) { return '<a class="slot" href="' + root + "book/?lab=" + l.id + "&date=" + ymd(day) + "&time=" + t + '">' + fmtTime(t) + "</a>"; }).join("") + "</div>";
    }
    box.innerHTML = html || '<div class="empty">No openings in the next 3 weeks. Try a <a href="' + root + 'locations/">nearby lab</a>.</div>';
  }

  document.documentElement.classList.add("js");
  initHeader();
  initCounter();
  initHomeSearch();
  initLocations();
  initBook();
  initManage();
  initAssistant();
  fillNextTags();
  initOrg();
  initLocation();
})();
