/* Vee — the Lab Online Booking guide. An original mascot: a friendly test tube.
 * Vee.svg({ mood, cls }) returns inline SVG. Moods: "happy", "wave", "party", "think".
 * Each instance gets its own clip-path id so several can share a page. */
(function () {
  "use strict";
  var n = 0;
  var INK = "#0f2a5c";

  function mouth(mood) {
    if (mood === "party") return '<path d="M51 80 q9 13 18 0 z" fill="' + INK + '"/><path d="M55 84 q5 4 10 0" fill="#ff8a95"/>';
    if (mood === "think") return '<path d="M53 83 q5 2 9 0 t6 -3" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    return '<path d="M52 81 q8 8 16 0" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
  }
  function extras(mood) {
    if (mood === "party") return '<path d="M44 18 L60 -8 L76 18 z" fill="#ffc94a" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/><circle cx="60" cy="-9" r="5" fill="#ef5b63" stroke="' + INK + '" stroke-width="3"/><circle cx="54" cy="8" r="2.4" fill="#ef5b63"/><circle cx="64" cy="2" r="2.4" fill="#1f63c6"/>';
    if (mood === "think") return '<circle cx="104" cy="30" r="4" fill="#cfe3fa" stroke="' + INK + '" stroke-width="2.5"/><circle cx="112" cy="16" r="6" fill="#cfe3fa" stroke="' + INK + '" stroke-width="2.5"/>';
    return "";
  }

  function svg(o) {
    o = o || {};
    var mood = o.mood || "happy", id = "veeclip" + (++n);
    var waving = mood === "wave" || mood === "party";
    return '<svg class="vee ' + (o.cls || "") + (waving ? " is-waving" : "") + '" viewBox="0 -16 124 186" role="img" aria-label="Vee, the Lab Online Booking guide">' +
      '<defs><clipPath id="' + id + '"><rect x="36" y="32" width="48" height="120" rx="24"/></clipPath></defs>' +
      '<ellipse cx="60" cy="164" rx="30" ry="5" fill="' + INK + '" opacity=".12"/>' +
      '<path d="M35 96 q-15 6 -19 19" stroke="' + INK + '" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="16" cy="116" r="5.5" fill="#fff" stroke="' + INK + '" stroke-width="3"/>' +
      '<g class="vee-arm"><path d="M85 92 q15 -5 19 -21" stroke="' + INK + '" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="104" cy="69" r="5.5" fill="#fff" stroke="' + INK + '" stroke-width="3"/></g>' +
      '<ellipse cx="48" cy="157" rx="10" ry="5.5" fill="' + INK + '"/><ellipse cx="72" cy="157" rx="10" ry="5.5" fill="' + INK + '"/>' +
      '<rect x="34" y="30" width="52" height="124" rx="26" fill="#eef6fd" stroke="' + INK + '" stroke-width="4"/>' +
      '<g clip-path="url(#' + id + ')"><path d="M28 106 q16 -8 32 0 t32 0 V160 H28 z" fill="#ef5b63"/><circle cx="50" cy="124" r="3.5" fill="#ffc2c7"/><circle cx="66" cy="136" r="2.5" fill="#ffc2c7"/><circle cx="58" cy="117" r="2" fill="#ffc2c7"/></g>' +
      '<path d="M44 46 v34" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="28" y="16" width="64" height="20" rx="8" fill="#1f63c6" stroke="' + INK + '" stroke-width="4"/><path d="M36 22 h18" stroke="#8fc0ff" stroke-width="3" stroke-linecap="round"/>' +
      '<g class="vee-eyes"><ellipse cx="51" cy="66" rx="4.6" ry="6.2" fill="' + INK + '"/><ellipse cx="69" cy="66" rx="4.6" ry="6.2" fill="' + INK + '"/><circle cx="52.6" cy="63.6" r="1.7" fill="#fff"/><circle cx="70.6" cy="63.6" r="1.7" fill="#fff"/></g>' +
      '<ellipse cx="44" cy="78" rx="5" ry="3" fill="#ff9aa6" opacity=".85"/><ellipse cx="76" cy="78" rx="5" ry="3" fill="#ff9aa6" opacity=".85"/>' +
      mouth(mood) + extras(mood) + "</svg>";
  }

  window.Vee = { svg: svg };
})();
