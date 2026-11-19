/* Lab Online Booking — printable templates.
 *
 * Every template is built from the same blocks and sized in em, so one design
 * scales from a 4 x 6 card to an 11 x 17 poster. The sheet's font-size sets
 * the scale. Clinic text is always escaped. Clinic logos appear only after
 * TSB approves them, and health authority logos never appear.
 */
(function () {
  "use strict";
  var S = window.ClinicStore, CFG = S.config;

  // Clinic-facing formats. "label" is the NFC stand label: TSB prints it when
  // the stand ships, so it is listed only for admins.
  var FORMATS = {
    poster:   { name: "Poster",           size: "Letter, 8.5 × 11 in",   page: "8.5in 11in", w: 8.5,  h: 11,  layout: "hero",    base: 12.6, use: "Waiting room or exam room wall" },
    tabloid:  { name: "Large poster",     size: "Tabloid, 11 × 17 in",   page: "11in 17in",  w: 11,   h: 17,  layout: "hero",    base: 17.6, use: "Hallways and entrances. Print shop or large-format printer" },
    counter:  { name: "Countertop sign",  size: "5 × 7 in",              page: "5in 7in",    w: 5,    h: 7,   layout: "hero",    base: 8,    use: "Front desk in a 5 × 7 frame or acrylic holder" },
    card:     { name: "Counter card",     size: "4 × 6 in",              page: "4in 6in",    w: 4,    h: 6,   layout: "compact", base: 7.6,  use: "Front desk, exam room counter or a 4 × 6 holder" },
    tent:     { name: "Table tent",       size: "Letter, folds to 8.5 × 5.5 in", page: "8.5in 11in", w: 8.5, h: 11, layout: "tent", base: 10.5, use: "Fold in half and stand on a desk or waiting room table" },
    handouts: { name: "Patient handouts", size: "4 per Letter sheet, 4.25 × 5.5 in each", page: "8.5in 11in", w: 8.5, h: 11, layout: "handouts", base: 8.1, use: "Cut along the dashed lines and hand one to each patient" },
    label:    { name: "NFC stand label",  size: "4.4 × 4.9 in",          page: "4.4in 4.9in", w: 4.4, h: 4.9, layout: "stand",   base: 7.7,  use: "Applied over the NFC tag when TSB ships a stand", admin: true }
  };

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- blocks ---------- */
  var LEAF = '<svg class="leaf" viewBox="0 0 100 100" aria-hidden="true"><path fill="#d8262c" d="M50 3l6 13 8-4-3 22 13-12 3 8 13-3-5 15 9 4-22 17 3 9-22-3 1 23h-8l1-23-22 3 3-9L6 46l9-4-5-15 13 3 3-8 13 12-3-22 8 4z"/></svg>';
  var ICONS = {
    cal: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.6"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h6M9.5 15.5h6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16.2 9.5"/>',
    nfc: '<path d="M8.5 9a4.5 4.5 0 0 1 0 6M5.5 6.5a8 8 0 0 1 0 11M11.5 11.3a1 1 0 0 1 0 1.4"/><rect x="13.5" y="4" width="7.5" height="13" rx="1.6"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + "</svg>"; }

  function header(d) {
    var brand = '<div class="brand">' + LEAF + '<div><div class="bn">Lab Online Booking</div><div class="bt">Accessible healthcare for BC.</div></div></div>';
    var cname = '<div class="cname' + (d.slot ? " print-only" : "") + '"><span>For patients of</span><b>' + esc(d.name) + "</b></div>";
    var right = d.logo
      ? '<span class="vr"></span><img class="clogo" src="' + esc(d.logo) + '" alt="' + esc(d.name) + '">'
      : '<span class="vr"></span>' + (d.slot ? logoSlot(d) : "") + cname;
    return '<header class="hdr">' + brand + right + "</header>";
  }
  // Screen-only "Your logo here" box. Never prints: print.css hides it, and the
  // clinic name prints in its place until TSB approves a logo.
  function logoSlot(d) {
    if (d.pendingLogo) {
      return '<button type="button" class="logo-slot has-img" data-logo-slot aria-label="Replace your clinic logo"><img src="' + esc(d.pendingLogo) + '" alt=""><span class="ls-tag">In review · won\'t print yet</span></button>';
    }
    return '<button type="button" class="logo-slot" data-logo-slot aria-label="Upload your clinic logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg><span><b>Your logo here</b><small>Click to upload</small></span></button>';
  }
  var SWOOSH = '<svg class="swoosh" viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true"><path d="M3 14C80 3 200 1 297 6" fill="none" stroke="#2f7fe0" stroke-width="5" stroke-linecap="round"/></svg>';
  function qrCard(d, cls) {
    return '<div class="qrwrap ' + (cls || "") + '"><svg class="burst" viewBox="0 0 30 30" aria-hidden="true"><path d="M6 13L2 6M13 10l1-8M19 14l7-5" stroke="#2f7fe0" stroke-width="3" stroke-linecap="round"/></svg><div class="qrcard">' + d.qr + '</div><div class="scan">Scan to book</div></div>';
  }
  function feats() {
    return '<ul class="feats">' +
      '<li><span class="ic">' + icon("cal") + "</span><span>Compare available appointments at participating BC labs.</span></li>" +
      '<li><span class="ic">' + icon("pin") + "</span><span>Find a location near you.</span></li>" +
      '<li><span class="ic">' + icon("phone") + "</span><span>Book in minutes on your phone.</span></li></ul>";
  }
  function visit(d) { return '<div class="or"><span>Or visit</span></div><div class="url">' + esc(d.shortTxt) + "</div>"; }
  function remind(d) {
    if (d.vee && window.Vee) return '<div class="vremind"><span class="vw">' + Vee.svg({ mood: "wave" }) + '</span><div class="vbub">Bring your requisition and your BC Services Card!</div></div>';
    return '<div class="remind"><span class="ic sm">' + icon("doc") + "</span>Bring your requisition and your BC Services Card.</div>";
  }
  function footer(d) {
    return '<footer class="wave"><svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22C70 4 140 34 210 22S330 2 400 16V60H0z" fill="#cfe3fa"/><path d="M0 34C80 18 150 46 230 32S340 18 400 28V60H0z" fill="#0f2a5c"/></svg>' +
      '<div class="ft"><span>Books hospital and community health authority labs.</span><b>' + esc(d.name) + "</b></div></footer>";
  }

  /* ---------- layouts ---------- */
  var L = {
    hero: function (d) {
      return '<div class="frame">' + (d.photo ? '<div class="photo"><div></div></div>' : "") + header(d) +
        '<div class="htxt"><h1>Need <br>Bloodwork?</h1>' + SWOOSH + '<h2>Book your lab visit <br>before you leave.</h2><p class="lead">Find the earliest available appointments across participating BC health regions.</p></div>' +
        '<div class="mid">' + feats() + qrCard(d) + "</div>" + visit(d) + remind(d) + footer(d) + "</div>";
    },
    compact: function (d) {
      return '<div class="frame">' + header(d) + '<div class="ctxt"><h1>Need Bloodwork?</h1>' + SWOOSH + "<h2>Book your lab visit before you leave.</h2></div>" +
        qrCard(d, "center") + visit(d) + remind(d) + footer(d) + "</div>";
    },
    wide: function (d) {
      return '<div class="frame">' + header(d) + '<div class="wmid"><div><h1>Need Bloodwork?</h1>' + SWOOSH + "<h2>Book your lab visit before you leave.</h2>" + feats() + "</div>" + qrCard(d) + "</div>" +
        '<div class="wbot"><div class="url">' + esc(d.shortTxt) + "</div>" + remind(d) + "</div>" + footer(d) + "</div>";
    },
    stand: function (d) {
      return '<div class="frame">' + header(d) + '<div class="ctxt"><h1 class="st">Book your bloodwork here</h1></div>' +
        '<div class="taprow"><div class="tap"><span class="tapic">' + icon("nfc") + "</span><b>Tap your phone</b><span>NFC</span></div>" +
        '<div class="ordiv">or</div>' + qrCard(d) + "</div>" +
        '<div class="url">' + esc(d.shortTxt) + "</div>" +
        '<ol class="steps"><li><span class="ic sm">' + icon("pin") + "</span>Find a lab near you</li><li><span class=\"ic sm\">" + icon("cal") + "</span>Choose an appointment</li><li><span class=\"ic sm\">" + icon("check") + "</span>Get confirmation</li></ol>" +
        footer(d) + "</div>";
    }
  };

  function sheet(fmtKey, d) {
    var f = FORMATS[fmtKey];
    if (f.layout === "tent") {
      var p = function (cls) { return '<div class="panel ' + cls + '" style="font-size:' + f.base + 'pt">' + L.wide(d) + "</div>"; };
      return '<div class="sheet tent" style="width:8.5in;height:11in">' + p("flip") + '<div class="fold"><span>Fold here</span></div>' + p("") + "</div>";
    }
    if (f.layout === "handouts") {
      var one = '<div class="hcell" style="font-size:' + f.base + 'pt">' + L.compact(d) + "</div>";
      return '<div class="sheet handouts" style="width:8.5in;height:11in">' + one + one + one + one + "</div>";
    }
    return '<div class="sheet ' + f.layout + '" style="width:' + f.w + "in;height:" + f.h + "in;font-size:" + f.base + 'pt">' + L[f.layout](d) + "</div>";
  }

  window.ClinicPrint = { FORMATS: FORMATS, sheet: sheet };

  /* ---------- page controller ---------- */
  var q = new URLSearchParams(location.search);
  var stage = document.getElementById("stage");
  if (!stage) return;
  var embed = q.get("embed") === "1";
  function fail(msg) { stage.innerHTML = '<div class="err">' + esc(msg) + "</div>"; }

  // Who is printing: the signed-in clinic, or (demo only) an admin printing a stand label.
  var c = null, isAdmin = false;
  if (q.get("clinic") && CFG.mode === "demo") {
    isAdmin = true;
    c = S.admin.clinics().filter(function (x) { return String(x.id) === q.get("clinic"); })[0];
    if (!c) return fail("Clinic not found.");
  } else {
    if (!S.me()) return fail("Please sign in to the clinic portal first.");
    try { c = S.kit(); } catch (e) { return fail(e.message); }
  }

  var fmt = FORMATS[q.get("type")] && (isAdmin || !FORMATS[q.get("type")].admin) ? q.get("type") : "poster";
  var sel = document.getElementById("fmt"), logoBox = document.getElementById("opt-logo"), photoBox = document.getElementById("opt-photo"), veeBox = document.getElementById("opt-vee");
  Object.keys(FORMATS).forEach(function (k) {
    if (FORMATS[k].admin && !isAdmin) return;
    var o = document.createElement("option"); o.value = k; o.textContent = FORMATS[k].name + " (" + FORMATS[k].size + ")"; sel.appendChild(o);
  });
  sel.value = fmt;
  logoBox.checked = q.get("logo") !== "0" && !!c.public_logo;
  logoBox.disabled = !c.public_logo;
  photoBox.checked = q.get("photo") !== "0";
  veeBox.checked = q.get("vee") !== "0";
  var note = document.getElementById("note");
  function setNote() {
    note.classList.remove("bad");
    note.textContent = c.logo_status === "pending" ? "Your logo is in review. Until it's approved, your clinic name prints in that spot."
      : !c.public_logo && !isAdmin ? "Click \u201cYour logo here\u201d to add your logo." : "";
  }
  setNote();

  // Upload straight from the logo spot on the preview.
  var fileIn = document.createElement("input");
  fileIn.type = "file"; fileIn.accept = "image/png,image/jpeg"; fileIn.hidden = true; document.body.appendChild(fileIn);
  stage.addEventListener("click", function (e) { if (!isAdmin && e.target.closest("[data-logo-slot]")) fileIn.click(); });
  fileIn.addEventListener("change", async function () {
    var file = fileIn.files[0]; fileIn.value = ""; if (!file) return;
    try {
      await S.uploadLogo(file);
      c = S.kit(); logoBox.disabled = !c.public_logo; logoBox.checked = !!c.public_logo;
      setNote(); render();
    } catch (err) { note.textContent = err.message; note.classList.add("bad"); }
  });

  function render() {
    var f = FORMATS[fmt];
    document.getElementById("photo-w").hidden = f.layout !== "hero";
    document.getElementById("vee-w").hidden = f.layout === "stand";
    document.getElementById("pagesize").textContent = "@page { size: " + f.page + "; margin: 0; }";
    document.title = f.name + " | " + c.display_name;
    stage.innerHTML = sheet(fmt, {
      name: c.display_name,
      logo: logoBox.checked ? c.public_logo : null,
      photo: photoBox.checked,
      vee: veeBox.checked,
      slot: !isAdmin && !c.public_logo,
      pendingLogo: c.logo_status === "pending" ? c.logo_data : null,
      qr: ClinicQR.svg(c.links.qr),
      shortTxt: c.links.short.replace(/^https?:\/\//, "").replace(/^labonlinebooking\.ca/i, "LabOnlineBooking.ca")
    });
    if (embed) {
      var el = stage.firstChild;
      document.body.style.zoom = String(Math.min(window.innerWidth / el.offsetWidth, window.innerHeight / el.offsetHeight));
    }
  }
  function sync() {
    var p = new URLSearchParams(location.search); p.set("type", fmt);
    p.set("logo", logoBox.checked ? "1" : "0"); p.set("photo", photoBox.checked ? "1" : "0"); p.set("vee", veeBox.checked ? "1" : "0");
    history.replaceState(null, "", "?" + p.toString());
    render();
  }
  sel.onchange = function () { fmt = sel.value; sync(); };
  logoBox.onchange = photoBox.onchange = veeBox.onchange = sync;
  document.getElementById("print").onclick = function () { window.print(); };
  if (embed) document.body.classList.add("embed");
  render();
})();
