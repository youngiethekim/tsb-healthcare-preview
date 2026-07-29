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
