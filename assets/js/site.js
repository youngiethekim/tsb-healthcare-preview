/* =====================================================================
   LEAD CAPTURE — paste your two values here to go live:
   1) TSB_WEB3FORMS_KEY: free key from https://web3forms.com (tie it to
      info@tsbhealthcare.com) — form submissions then email straight to you.
   2) TSB_CALENDLY_URL: your Calendly link (e.g.
      https://calendly.com/tsbhealthcare/demo) — lets visitors self-book a
      time instantly after they request a demo.
   Until these are set, forms still validate and show a success message.
   ===================================================================== */
var TSB_WEB3FORMS_KEY = "";
var TSB_CALENDLY_URL = "";
function tsbSubmitLead(form, extra) {
  return new Promise(function (resolve) {
    if (!TSB_WEB3FORMS_KEY) { resolve(); return; }
    var data = new FormData(form);
    Object.keys(extra || {}).forEach(function (k) { data.append(k, extra[k]); });
    data.append("access_key", TSB_WEB3FORMS_KEY);
    data.append("subject", (extra && extra._subject) || "New lead — TSB HealthCare website");
    data.append("from_name", "TSB HealthCare website");
    fetch("https://api.web3forms.com/submit", { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function () { resolve(); }, function () { resolve(); });
  });
}

(function () {
  "use strict";
  document.documentElement.className += " js";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- nav ---- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    var toggle = nav.querySelector(".nav-toggle");
    if (toggle) toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    var mega = nav.querySelector(".mega-toggle");
    if (mega) {
      var item = mega.closest(".nav-item");
      mega.addEventListener("click", function (e) { e.stopPropagation(); var o = item.classList.toggle("open"); mega.setAttribute("aria-expanded", o); });
      document.addEventListener("click", function (e) { if (!item.contains(e.target)) item.classList.remove("open"); });
    }
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  /* ---- reveal ---- */
  var rev = document.querySelectorAll(".reveal");
  function showAll() { rev.forEach(function (e) { e.classList.add("in"); }); }
  if (reduce || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    rev.forEach(function (e) { io.observe(e); });
    window.addEventListener("load", function () {
      setTimeout(function () {
        var stuck = [].slice.call(rev).some(function (e) {
          var r = e.getBoundingClientRect();
          return r.top < window.innerHeight && r.bottom > 0 && !e.classList.contains("in");
        });
        if (stuck) showAll();
      }, 1200);
    });
  }

  /* ---- count-up (parses "3.3M+", "186K+", "70%", "99.9%") ---- */
  function animateCount(el) {
    var raw = el.getAttribute("data-count");
    var html = el.innerHTML; // preserve markup (e.g. <em>) for the final state
    var m = raw.match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!m || reduce) return; // leave the pre-rendered final value in place
    var pre = m[1], numStr = m[2].replace(/,/g, ""), suf = m[3];
    var to = parseFloat(numStr);
    var dec = (numStr.split(".")[1] || "").length;
    if (!isFinite(to)) return;
    var start = null, dur = 1500;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + (to * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
      else el.innerHTML = html;
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      // final values already rendered; nothing to do
    } else {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---- video lightbox ---- */
  var light = document.querySelector(".vlight");
  if (light) {
    var vid = light.querySelector("video");
    var open = function (e) { if (e) e.preventDefault(); light.classList.add("open"); if (vid) { try { vid.currentTime = 0; vid.play(); } catch (x) {} } document.body.style.overflow = "hidden"; };
    var close = function () { light.classList.remove("open"); if (vid) vid.pause(); document.body.style.overflow = ""; };
    document.querySelectorAll("[data-vopen]").forEach(function (b) {
      b.addEventListener("click", open);
      b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e); } });
    });
    light.addEventListener("click", function (e) { if (e.target === light) close(); });
    var cb = light.querySelector(".vclose"); if (cb) cb.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && light.classList.contains("open")) close(); });
  }

  /* ---- live phone mockup(s) ---- */
  if (!reduce) {
    document.querySelectorAll(".phone").forEach(function (phone) {
      var slots = phone.querySelectorAll(".slot");
      var days = phone.querySelectorAll(".day");
      var serve = phone.querySelector(".js-serve");
      var si = 1, di = 2, n = 107;
      if (slots.length) {
        setInterval(function () {
          slots.forEach(function (s) { s.classList.remove("on"); });
          si = (si + 1) % slots.length;
          slots[si].classList.add("on");
        }, 2200);
      }
      if (days.length) {
        setInterval(function () {
          days.forEach(function (d) { d.classList.remove("on"); });
          di = (di + 1) % days.length;
          days[di].classList.add("on");
        }, 3400);
      }
      if (serve) {
        setInterval(function () { n = n >= 148 ? 101 : n + 1; serve.textContent = "A-" + n; }, 2600);
      }
    });
  }

  /* ---- hero background video: honor reduced-motion (show poster still) ---- */
  var hv = document.querySelector(".hero-video");
  if (hv && reduce) { hv.removeAttribute("autoplay"); hv.pause(); }

  /* ---- hero ambient particles ---- */
  var fx = document.querySelector(".hero-fx");
  if (fx && !reduce && fx.getContext) {
    var ctx = fx.getContext("2d"), W, H, DPR = Math.min(window.devicePixelRatio || 1, 2), pts = [];
    function size() {
      var r = fx.getBoundingClientRect(); W = r.width; H = r.height;
      fx.width = W * DPR; fx.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    size(); window.addEventListener("resize", size);
    var N = 46;
    for (var i = 0; i < N; i++) pts.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, vx: (Math.random() - 0.5) * 0.0004, vy: (Math.random() - 0.5) * 0.0004, a: 0.15 + Math.random() * 0.45 });
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < N; i++) {
        var p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x += 1; if (p.x > 1) p.x -= 1; if (p.y < 0) p.y += 1; if (p.y > 1) p.y -= 1;
        var X = p.x * W, Y = p.y * H;
        for (var j = i + 1; j < N; j++) {
          var q = pts[j], dx = (p.x - q.x) * W, dy = (p.y - q.y) * H, d = Math.hypot(dx, dy);
          if (d < 120) { ctx.strokeStyle = "rgba(76,203,232," + (0.06 * (1 - d / 120)) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(q.x * W, q.y * H); ctx.stroke(); }
        }
        ctx.fillStyle = "rgba(120,214,240," + p.a + ")"; ctx.beginPath(); ctx.arc(X, Y, p.r, 0, 6.29); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }
})();

/* ---- ROI / capacity calculator ---- */
(function () {
  "use strict";
  var roi = document.getElementById("roi");
  if (!roi) return;
  var DAYS = 260, TARGET_NS = 0.02, WAIT_CUT = 0.40, STAFF_MIN = 2.2, STAFF_COST = 42;
  var keys = ["sites", "perday", "noshow", "wait", "rev"];
  var inp = {};
  keys.forEach(function (k) { inp[k] = roi.querySelector("#in-" + k); });
  function commas(n) { return Math.round(n).toLocaleString("en-US"); }
  function kfmt(n) { n = Math.round(n); if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M"; if (n >= 1000) return (n / 1000).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "K"; return String(n); }
  function money(n) { n = Math.round(n); if (n >= 1e6) return "$" + (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M"; return "$" + commas(n); }
  function set(id, v) { var el = roi.querySelector("#r-" + id); if (el) el.textContent = v; }
  function out(k, v) { var el = roi.querySelector("#out-" + k); if (el) el.textContent = v; }
  function update() {
    var sites = +inp.sites.value, perday = +inp.perday.value, ns = +inp.noshow.value / 100, wait = +inp.wait.value, rev = +inp.rev.value;
    out("sites", sites); out("perday", commas(perday)); out("noshow", inp.noshow.value + "%"); out("wait", wait + " min"); out("rev", "$" + rev);
    keys.forEach(function (k) { var el = inp[k]; el.style.setProperty("--fill", ((el.value - el.min) / (el.max - el.min)) * 100 + "%"); });
    var visits = sites * perday * DAYS;
    var recovered = Math.max(0, ns - TARGET_NS) * visits;
    var newWait = Math.round(wait * (1 - WAIT_CUT));
    var staffHrs = visits * STAFF_MIN / 60;
    var value = recovered * rev + staffHrs * STAFF_COST;
    set("appts", kfmt(recovered)); set("hours", kfmt(staffHrs)); set("wait", newWait + " min"); set("value", money(value));
    roi.dataset.summary = "~" + commas(recovered) + " appts/yr recovered, ~" + commas(staffHrs) + " staff hrs/yr, wait " + wait + "->" + newWait + " min, est. value " + money(value) + " (" + sites + " sites, " + perday + "/day, " + inp.noshow.value + "% no-show)";
  }
  keys.forEach(function (k) { inp[k].addEventListener("input", update); });
  update();
  var form = roi.querySelector("#roi-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var done = function () { form.style.display = "none"; roi.querySelector(".rform-ok").classList.add("show"); };
      tsbSubmitLead(form, { results: roi.dataset.summary || "", _subject: "New ROI calculator lead — TSB HealthCare" }).then(done);
    });
  }
})();

/* ---- sticky CTA bar + book-a-demo qualifying form ---- */
(function () {
  "use strict";
  /* sticky bar */
  var bar = document.querySelector(".sticky-cta");
  if (bar) {
    var dismissed = false;
    var onScroll = function () { if (!dismissed) bar.classList.toggle("show", window.scrollY > window.innerHeight * 0.85); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    var x = bar.querySelector(".sclose");
    if (x) x.addEventListener("click", function () { dismissed = true; bar.classList.remove("show"); });
  }

  /* book-a-demo form */
  var bform = document.getElementById("book-form");
  if (!bform) return;
  var sel = {}, groups = ["setting", "role", "bottleneck"];
  bform.querySelectorAll(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      var g = c.dataset.group;
      bform.querySelectorAll('.chip[data-group="' + g + '"]').forEach(function (o) { o.classList.remove("sel"); });
      c.classList.add("sel"); sel[g] = c.dataset.value;
      c.closest(".bgroup").classList.remove("err");
    });
  });
  var s1 = bform.querySelector('[data-step="1"]'), s2 = bform.querySelector('[data-step="2"]'), prog = bform.querySelector(".bprog");
  bform.querySelector("[data-next]").addEventListener("click", function () {
    var ok = true;
    groups.forEach(function (g) {
      if (!sel[g]) { ok = false; bform.querySelector('.chip[data-group="' + g + '"]').closest(".bgroup").classList.add("err"); }
    });
    if (!ok) return;
    s1.hidden = true; s2.hidden = false; prog.textContent = "Step 2 of 2";
    var f = s2.querySelector("input"); if (f) f.focus();
  });
  bform.querySelector("[data-back]").addEventListener("click", function () { s2.hidden = true; s1.hidden = false; prog.textContent = "Step 1 of 2"; });
  bform.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!bform.checkValidity()) { bform.reportValidity(); return; }
    var done = function () {
      bform.style.display = "none";
      var ok = document.querySelector(".bok"); ok.classList.add("show");
      if (TSB_CALENDLY_URL) {
        var d = document.getElementById("calendly-embed");
        d.innerHTML = '<div class="calendly-inline-widget" data-url="' + TSB_CALENDLY_URL + '" style="min-width:320px;height:640px"></div>';
        var sc = document.createElement("script"); sc.src = "https://assets.calendly.com/assets/external/widget.js"; sc.async = true; d.appendChild(sc);
      }
    };
    var extra = {}; groups.forEach(function (g) { extra[g] = sel[g] || ""; }); extra._subject = "New demo request — TSB HealthCare";
    tsbSubmitLead(bform, extra).then(done);
  });
})();
