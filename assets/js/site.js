(function () {
  "use strict";
  document.documentElement.className += " js";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
})();
