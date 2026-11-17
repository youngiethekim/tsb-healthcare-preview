/* Lab Online Booking — Clinic Portal screens (hash routed). */
(function () {
  "use strict";
  var S = window.ClinicStore, CFG = S.config;
  var app = document.getElementById("app");
  var who = document.getElementById("who");

  /* ---------- tiny helpers ---------- */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function $(sel, root) { return (root || app).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || app).querySelectorAll(sel)); }
  function go(path) { location.hash = "#" + path; }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }
  function formData(form) {
    var o = {}; $$("input,select,textarea", form).forEach(function (el) { if (!el.name) return; o[el.name] = el.type === "checkbox" ? el.checked : el.value; }); return o;
  }
  function showErr(form, e) {
    var box = $(".form-msg", form); if (!box) return;
    box.className = "form-msg err"; box.textContent = e.message || String(e); box.hidden = false;
    if (e.code === "auth") setTimeout(function () { go("/login"); }, 900);
  }
  function bind(form, fn) {
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var btn = $("button[type=submit]", form); if (btn) btn.disabled = true;
      var box = $(".form-msg", form); if (box) box.hidden = true;
      try { await fn(formData(form), form); } catch (e) { showErr(form, e); }
      finally { if (btn) btn.disabled = false; }
    });
  }
  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : ""; }
  function monthName(m) { var p = m.split("-"); return new Date(+p[0], +p[1] - 1, 15).toLocaleDateString("en-CA", { month: "short", year: "numeric" }); }
  function copy(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast("Copied"); }, function () { window.prompt("Copy this link:", text); });
  }
  function regionOptions(sel) {
    return '<option value="">Choose…</option>' + S.regions.map(function (r) { return '<option value="' + esc(r.id) + '"' + (r.id === sel ? " selected" : "") + ">" + esc(r.name) + "</option>"; }).join("");
  }
  var ICON = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2M14 18h2v2M18 18h2v2"/>',
    user: '<path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
    stand: '<path d="M7 3h10v12H7zM10 18h4M9 21h6M12 15v6"/>',
    team: '<path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17 11a3 3 0 1 0 0-6M21 20v-1a4 4 0 0 0-3-3.9"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };
  function icon(n, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + "</svg>"; }

  /* ---------- chrome ---------- */
  function renderWho(me) {
    if (!me) { who.innerHTML = ""; return; }
    who.innerHTML = '<div class="who"><span>' + esc(me.user.name) + " · </span>" + esc(me.clinic.display_name) + '</div><button class="btn btn-ghost btn-sm" id="signout">Sign out</button>';
    document.getElementById("signout").onclick = function () { S.signOut(); go("/login"); };
  }
  function shell(me, active, inner) {
    var locked = me.clinic.status !== "approved";
    var nav = [["/", "home", "Dashboard"], ["/kit", "qr", "Booking kit", locked], ["/profile", "user", "Clinic profile"], ["/stand", "stand", "NFC stand", locked], ["/team", "team", "Team"]];
    app.innerHTML = '<div class="shell"><nav class="side" aria-label="Portal">' + nav.map(function (n) {
      return '<a href="#' + n[0] + '"' + (n[0] === active ? ' aria-current="page"' : "") + ">" + icon(n[1]) + esc(n[2]) + (n[3] ? '<span class="lock">' + icon("lock", 14) + "</span>" : "") + "</a>";
    }).join("") + '</nav><main class="main">' + inner + "</main></div>";
  }
  function statusBanner(c) {
    if (c.status === "pending") return '<div class="banner pending"><div><b>We are reviewing your clinic.</b>You will get an email within two business days. Your booking kit and stand request unlock once you are approved.</div></div>';
    if (c.status === "rejected") return '<div class="banner rejected"><div><b>We could not approve this clinic.</b>' + esc(c.rejection_reason || "") + ' Questions? <a href="mailto:' + esc(CFG.supportEmail) + '">' + esc(CFG.supportEmail) + "</a></div></div>";
    if (c.status === "suspended") return '<div class="banner suspended"><div><b>Your clinic link is paused.</b>Patients who scan your code are sent to the main Lab Online Booking page. Contact <a href="mailto:' + esc(CFG.supportEmail) + '">' + esc(CFG.supportEmail) + "</a>.</div></div>";
    return "";
  }
  function lockedCard(what) {
    return '<div class="card locked">' + icon("lock", 34) + '<h2 style="margin-top:10px">' + esc(what) + ' unlocks after approval</h2><p class="muted" style="margin-top:8px">A TSB Healthcare team member reviews every clinic before any public link or QR code goes live.</p></div>';
  }

  /* ---------- auth screens ---------- */
  function authPage(inner) { renderWho(null); app.innerHTML = '<div class="auth"><div class="card stack">' + inner + "</div></div>"; }
  function sentBox(res) {
    return '<div class="ok-msg">' + esc(res.message) + "</div>" + (res.demoLink ?
      '<div class="banner info small"><div><b>Demo mode: no email is sent.</b>Open your sign-in link here: <a class="demo-link" href="' + esc(res.demoLink) + '">' + esc(res.demoLink.split("#")[1].slice(0, 22)) + "…</a></div></div>" : "");
  }

  function viewLogin() {
    authPage('<h1>Sign in to your clinic portal</h1><p class="muted">Enter your work email and we will send you a sign-in link. No password needed.</p>' +
      '<form id="f" class="stack" novalidate><div class="field"><label for="email">Work email</label><input id="email" name="email" type="email" autocomplete="email" required></div>' +
      '<div class="form-msg" hidden></div><button class="btn btn-primary btn-block" type="submit">Email me a sign-in link</button></form>' +
      '<div id="sent"></div><p class="small muted">New clinic? <a href="#/register">Register your clinic</a></p>');
    bind($("#f"), async function (d) { var r = await S.requestLink(d.email); $("#sent").innerHTML = sentBox(r); });
  }

  function viewRegister() {
    authPage('<h1>Register your clinic</h1><p class="muted">Get your clinic\'s own booking link, QR code and printable kit. Free for referring clinics in BC.</p>' +
      '<form id="f" novalidate><div class="field"><label for="name">Your name</label><input id="name" name="name" type="text" autocomplete="name" required></div>' +
      '<div class="field"><label for="email">Work email</label><input id="email" name="email" type="email" autocomplete="email" required><div class="hint">We send a sign-in link here. Use a clinic address, not a personal one.</div></div>' +
      '<div class="field"><label for="clinicName">Clinic name</label><input id="clinicName" name="clinicName" type="text" maxlength="120" required></div>' +
      '<div class="field"><label for="region">Health authority region</label><select id="region" name="region" required>' + regionOptions() + "</select></div>" +
      '<div class="field"><label class="check"><input type="checkbox" name="terms"> <span>We will display Lab Online Booking materials unaltered, never charge patients for booking, and never enter patient information in this portal.</span></label></div>' +
      '<div class="field"><div class="form-msg" hidden></div></div><div class="field"><button class="btn btn-primary btn-block" type="submit">Register and email my sign-in link</button></div></form>' +
      '<div id="sent"></div><p class="small muted">Already registered? <a href="#/login">Sign in</a></p>');
    bind($("#f"), async function (d, form) { var r = await S.register(d); form.hidden = true; $("#sent").innerHTML = sentBox(r); });
  }

  async function viewAuth(token) {
    authPage('<p class="muted">Signing you in…</p>');
    try { await S.verifyToken(token); history.replaceState(null, "", location.pathname + "#/"); route(); }
    catch (e) { authPage('<h1>Link not valid</h1><div class="err">' + esc(e.message) + '</div><a class="btn btn-primary" href="#/login">Request a new link</a>'); }
  }

  /* ---------- dashboard ---------- */
  function viewDashboard(me) {
    var c = me.clinic, k = c.status === "approved" ? S.myCounts() : null;
    var html = '<div class="page-h"><div><h1>' + esc(c.display_name) + '</h1><p class="muted">' + esc(c.region_name) + ' · <span class="pill ' + esc(c.status) + '">' + esc(c.status) + "</span></p></div></div>" + statusBanner(c);
    if (k) {
      var stat = function (label, key) {
        return '<div class="card stat"><div class="k">' + label + '</div><div class="v">' + k.current[key].toLocaleString() + '</div><div class="s">Last month ' + k.last[key].toLocaleString() + " · All time " + k.all[key].toLocaleString() + "</div></div>";
      };
      html += '<div class="grid g3">' + stat("Visits this month", "visit") + stat("Bookings started", "booking_started") + stat("Bookings completed", "booking_completed") + "</div>";
      if (!k.all.visit) {
        html += '<div class="card row"><div><h3>No scans yet.</h3><p class="muted small">Put your QR code at the front desk to get started.</p></div><span class="spacer"></span><a class="btn btn-primary" href="#/kit">Get your QR code</a></div>';
      }
      html += '<div class="card"><div class="row"><h2>Last 12 months</h2><span class="spacer"></span><span class="tiny">Counts only. No patient information is collected.</span></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Month</th><th class="n">QR visits</th><th class="n">NFC visits</th><th class="n">Link visits</th><th class="n">Started</th><th class="n">Completed</th></tr></thead><tbody>' +
        k.months.slice().reverse().map(function (m) {
          return "<tr><td>" + monthName(m.month) + '</td><td class="n">' + m.qr.visit + '</td><td class="n">' + m.nfc.visit + '</td><td class="n">' + m.link.visit + '</td><td class="n">' + m.total.booking_started + '</td><td class="n">' + m.total.booking_completed + "</td></tr>";
        }).join("") + "</tbody></table></div></div>";
    } else {
      html += '<div class="grid g2" style="margin-top:18px"><div class="card"><h3>1. Complete your profile</h3><p class="muted small" style="margin-top:6px">Address, phone and display name help us approve you faster.</p><a class="btn btn-ghost btn-sm" style="margin-top:12px" href="#/profile">Edit profile</a></div>' +
        '<div class="card"><h3>2. Get your booking kit</h3><p class="muted small" style="margin-top:6px">After approval: your link, QR code, poster, counter card and a free NFC stand.</p></div></div>';
    }
    shell(me, "/", html);
  }

  /* ---------- booking kit ---------- */
  function viewKit(me) {
    var c = me.clinic;
    if (c.status !== "approved") { shell(me, "/kit", '<div class="page-h"><h1>Booking kit</h1></div>' + statusBanner(c) + lockedCard("Your booking kit")); return; }
    c = S.kit();
    var L = c.links, file = "lob-" + c.short_code.toLowerCase();
    var preview = "c/?code=" + encodeURIComponent(c.short_code) + "&m=qr";
    var html = '<div class="page-h"><div><h1>Booking kit</h1><p class="muted">Your clinic\'s permanent link and QR code. They never change, so print as many as you like.</p></div></div>' +
      '<div class="card"><div class="kit"><div><div class="qr-box" id="qr">' + ClinicQR.svg(L.qr) + '</div>' +
      '<p class="tiny" style="text-align:center;margin-top:8px">Code <span class="code">' + esc(c.short_code) + "</span></p></div>" +
      '<div class="stack"><div><h2>Download your QR code</h2><p class="muted small" style="margin-top:4px">High error correction, black on white. Print it at least 1 inch (2.5 cm) wide.</p></div>' +
      '<div class="row"><button class="btn btn-primary" id="png">Download PNG (1024 px)</button><button class="btn btn-ghost" id="svg">Download SVG</button></div>' +
      '<div class="field"><label for="l-share">Shareable link (for text or email)</label><div class="linkline"><input id="l-share" type="text" readonly value="' + esc(L.share) + '"><button class="btn btn-ghost btn-sm" data-copy="' + esc(L.share) + '">Copy</button></div></div>' +
      '<div class="field"><label for="l-short">Short link (printed under the QR code)</label><div class="linkline"><input id="l-short" type="text" readonly value="' + esc(L.short) + '"><button class="btn btn-ghost btn-sm" data-copy="' + esc(L.short) + '">Copy</button></div></div>' +
      '<p class="small"><a href="' + esc(preview) + '" target="_blank" rel="noopener">Preview the page patients see →</a></p></div></div></div>' +
      '<div class="card"><h2>Printables</h2><p class="muted small" style="margin-top:4px">Each opens a print-ready page. Choose "Save as PDF" or print directly. Use actual size (100%).</p>' +
      '<div class="print-tiles" style="margin-top:14px">' +
      tile("poster", "Poster", "Letter, 8.5 × 11 in", "Waiting room or exam room wall") +
      tile("card", "Counter card", "4 × 6 in", "Front desk") +
      tile("label", "Stand label", "4.4 × 4.9 in", "Fits the Lab Online Booking stand") + "</div></div>";
    if (CFG.mode === "demo") html += '<div class="banner info small" style="margin-top:18px"><div><b>Demo note</b>The QR code encodes ' + esc(L.qr) + '. That address goes live when the portal ships on labonlinebooking.ca. Until then, use "Preview the page patients see".</div></div>';
    shell(me, "/kit", html);
    $("#png").onclick = function () { ClinicQR.downloadPNG(L.qr, file + "-qr.png"); };
    $("#svg").onclick = function () { ClinicQR.downloadSVG(L.qr, file + "-qr.svg"); };
    $$("[data-copy]").forEach(function (b) { b.onclick = function () { copy(b.getAttribute("data-copy")); }; });
    function tile(type, name, size, use) {
      return '<div class="tile"><h3>' + name + '</h3><div class="small">' + size + '</div><div class="tiny">' + use + '</div><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="print/?type=' + type + '">Open printable</a></div>';
    }
  }

  /* ---------- profile ---------- */
  function viewProfile(me) {
    var c = me.clinic;
    var logo = c.logo_data ? '<img class="logo-prev" src="' + esc(c.logo_data) + '" alt="Your clinic logo">' : '<p class="muted small">No logo. Your display name appears as text.</p>';
    var logoState = { none: "", pending: '<span class="pill pending">Waiting for review</span>', approved: '<span class="pill approved">Approved</span>' }[c.logo_status] || "";
    var emrSel = CFG.emrOptions.map(function (o) { return '<option' + (o === c.emr ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("");
    var html = '<div class="page-h"><div><h1>Clinic profile</h1><p class="muted">Region: ' + esc(c.region_name) + ' · Link and code are set by Lab Online Booking and cannot be edited.</p></div></div>' + statusBanner(c) +
      '<div class="card"><form id="f" novalidate>' +
      '<div class="field"><label for="display_name">Display name (shown to patients)</label><input id="display_name" name="display_name" type="text" maxlength="60" value="' + esc(c.display_name) + '"><div class="hint">Up to 60 characters. Registered as: ' + esc(c.name) + "</div></div>" +
      '<div class="field"><label for="a1">Address</label><input id="a1" name="address_line1" type="text" autocomplete="address-line1" value="' + esc(c.address_line1) + '"></div>' +
      '<div class="field"><input aria-label="Address line 2" name="address_line2" type="text" autocomplete="address-line2" placeholder="Suite or unit (optional)" value="' + esc(c.address_line2) + '"></div>' +
      '<div class="field f2"><div class="field"><label for="city">City</label><input id="city" name="city" type="text" value="' + esc(c.city) + '"></div><div class="field"><label for="pc">Postal code</label><input id="pc" name="postal_code" type="text" maxlength="7" value="' + esc(c.postal_code) + '"></div></div>' +
      '<input type="hidden" name="province" value="' + esc(c.province || "BC") + '">' +
      '<div class="field f2"><div class="field"><label for="phone">Front-desk phone</label><input id="phone" name="phone" type="tel" value="' + esc(c.phone) + '"></div><div class="field"><label for="pcnt">Number of physicians</label><input id="pcnt" name="physician_count" type="number" min="0" max="500" step="1" value="' + esc(c.physician_count == null ? "" : c.physician_count) + '"></div></div>' +
      '<div class="field f2"><div class="field"><label for="emr">EMR (optional)</label><select id="emr" name="emr"><option value="">Not specified</option>' + emrSel + '</select></div><div class="field" id="emr-other-w"' + (c.emr === "Other" ? "" : " hidden") + '><label for="emr_other">Which EMR?</label><input id="emr_other" name="emr_other" type="text" value="' + esc(c.emr_other || "") + '"></div></div>' +
      '<div class="field"><div class="form-msg" hidden></div></div><div class="field"><button class="btn btn-primary" type="submit">Save profile</button></div></form></div>' +
      '<div class="card"><div class="row"><h2>Clinic logo</h2>' + logoState + '</div><p class="muted small" style="margin-top:4px">Optional. PNG or JPG, 1 MB at most. It appears below the Lab Online Booking header after our team approves it. Do not use a health authority logo.</p>' +
      '<div class="row" style="margin-top:14px">' + logo + '</div><form id="lf" class="row" style="margin-top:14px" novalidate><input id="logo" type="file" accept="image/png,image/jpeg" aria-label="Logo file"><button class="btn btn-ghost btn-sm" type="submit">Upload logo</button>' + (c.logo_data ? '<button class="btn btn-danger btn-sm" type="button" id="rmlogo">Remove</button>' : "") + '<div class="form-msg" hidden style="flex-basis:100%"></div></form></div>';
    shell(me, "/profile", html);
    $("#emr").onchange = function () { $("#emr-other-w").hidden = this.value !== "Other"; };
    bind($("#f"), async function (d) { S.updateProfile(d); toast("Profile saved"); route(); });
    bind($("#lf"), async function () { await S.uploadLogo($("#logo").files[0]); toast("Logo uploaded for review"); route(); });
    if ($("#rmlogo")) $("#rmlogo").onclick = function () { S.removeLogo(); route(); };
  }

  /* ---------- stand ---------- */
  function viewStand(me) {
    var c = me.clinic;
    if (c.status !== "approved") { shell(me, "/stand", '<div class="page-h"><h1>NFC stand</h1></div>' + statusBanner(c) + lockedCard("The free stand")); return; }
    var list = S.stands(), open = list.filter(function (s) { return ["requested", "approved", "programmed", "shipped"].indexOf(s.status) >= 0; })[0];
    var html = '<div class="page-h"><div><h1>NFC stand</h1><p class="muted">A free countertop stand with your QR code and a tap-to-book NFC tag.</p></div></div>';
    if (list.length) {
      html += '<div class="card"><h2>Your requests</h2><div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Requested</th><th>Ship to</th><th>Status</th><th>Tracking</th></tr></thead><tbody>' +
        list.map(function (s) { return "<tr><td>" + fmtDate(s.created_at) + "</td><td>" + esc(s.ship_to_name) + "<br><span class=tiny>" + esc(s.address_line1 + ", " + s.city) + '</span></td><td><span class="pill ' + esc(s.status) + '">' + esc(s.status) + "</span></td><td>" + (s.tracking_number ? '<span class="code">' + esc(s.tracking_number) + "</span>" : '<span class="tiny">Shown once shipped</span>') + "</td></tr>"; }).join("") +
        "</tbody></table></div></div>";
    }
    if (!open && !list.filter(function (s) { return s.status !== "cancelled"; }).length) {
      html += '<div class="card"><h2>Request your free stand</h2><form id="f" style="margin-top:14px" novalidate>' +
        '<div class="field"><label for="sn">Contact name</label><input id="sn" name="ship_to_name" type="text" value="' + esc(me.user.name) + '"></div>' +
        '<div class="field"><label for="a1">Shipping address</label><input id="a1" name="address_line1" type="text" value="' + esc(c.address_line1) + '"></div>' +
        '<div class="field"><input aria-label="Address line 2" name="address_line2" type="text" placeholder="Suite or unit (optional)" value="' + esc(c.address_line2) + '"></div>' +
        '<div class="field f2"><div class="field"><label for="city">City</label><input id="city" name="city" type="text" value="' + esc(c.city) + '"></div><div class="field"><label for="pc">Postal code</label><input id="pc" name="postal_code" type="text" maxlength="7" value="' + esc(c.postal_code) + '"></div></div>' +
        '<input type="hidden" name="province" value="BC">' +
        '<div class="field"><label class="check"><input type="checkbox" name="display_confirm"> <span>We will display the stand at our front desk.</span></label></div>' +
        '<div class="field"><div class="form-msg" hidden></div></div><div class="field"><button class="btn btn-primary" type="submit">Request stand</button></div></form></div>';
    } else if (!open) {
      html += '<div class="banner info"><div>Your clinic has received its free stand. Need another? Email <a href="mailto:' + esc(CFG.supportEmail) + '">' + esc(CFG.supportEmail) + "</a>.</div></div>";
    }
    shell(me, "/stand", html);
    if ($("#f")) bind($("#f"), async function (d) { S.requestStand(d); toast("Stand requested"); route(); });
  }

  /* ---------- team ---------- */
  function viewTeam(me) {
    var team = S.team(), owner = me.user.role === "owner";
    var html = '<div class="page-h"><div><h1>Team</h1><p class="muted">Each clinic has one owner and can add one staff member.</p></div></div><div class="card"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th></th></tr></thead><tbody>' +
      team.map(function (u) { return "<tr><td>" + esc(u.name) + "</td><td>" + esc(u.email) + '</td><td><span class="pill">' + esc(u.role) + "</span></td><td>" + (u.last_login_at ? fmtDate(u.last_login_at) : '<span class="tiny">Not yet</span>') + "</td><td>" + (owner && u.role === "staff" ? '<button class="btn btn-danger btn-sm" data-rm="' + u.id + '">Remove</button>' : "") + "</td></tr>"; }).join("") + "</tbody></table></div>";
    if (owner && team.length < 2) {
      html += '<div class="card"><h2>Invite a colleague</h2><form id="f" style="margin-top:14px" novalidate><div class="f2"><div class="field"><label for="n">Name</label><input id="n" name="name" type="text"></div><div class="field"><label for="e">Work email</label><input id="e" name="email" type="email"></div></div><div class="field"><div class="form-msg" hidden></div></div><div class="field"><button class="btn btn-primary" type="submit">Send invite</button></div></form><div id="sent"></div></div>';
    }
    shell(me, "/team", html);
    if ($("#f")) bind($("#f"), async function (d, form) { var r = await S.invite(d); form.reset(); $("#sent").innerHTML = sentBox(r); });
    $$("[data-rm]").forEach(function (b) { b.onclick = function () { if (confirm("Remove this team member?")) { S.removeMember(+b.getAttribute("data-rm")); route(); } }; });
  }

  /* ---------- TSB admin (demo stand-in for the existing admin area) ---------- */
  function viewAdmin() {
    renderWho(S.me());
    var list = S.admin.clinics(), stands = S.admin.stands(), report = S.admin.report();
    var html = '<div class="shell" style="grid-template-columns:1fr"><main class="main"><div class="page-h"><div><h1>TSB admin: clinics</h1><p class="muted">Demo stand-in. In production this lives inside the existing LOB admin area behind admin sign-in.</p></div><span class="spacer"></span><a class="btn btn-ghost" href="#/">Back to clinic portal</a></div>';
    html += '<div class="card"><h2>Clinics</h2>' + (list.length ? '<div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Clinic</th><th>Region</th><th>Contact</th><th>Status</th><th>Logo</th><th class="n">Completed</th><th>Actions</th></tr></thead><tbody>' +
      list.map(function (c) {
        var acts = c.status === "pending" ? btn("approve", c.id, "Approve", "primary") + btn("reject", c.id, "Reject", "danger")
          : c.status === "approved" ? btn("suspend", c.id, "Suspend", "danger") : btn("approve", c.id, "Reinstate", "ghost");
        var logo = c.logo_status === "pending" ? '<img class="logo-prev" style="max-width:90px" src="' + esc(c.logo_data) + '" alt="">' + btn("logo-ok", c.id, "Approve logo", "ghost") + btn("logo-no", c.id, "Reject", "danger") : esc(c.logo_status);
        return "<tr><td><b>" + esc(c.display_name) + '</b><br><span class="tiny">/' + esc(c.region_id + "/" + c.slug) + " · " + esc(c.short_code) + "</span></td><td>" + esc(c.region_id.toUpperCase()) + "</td><td>" + c.users.map(function (u) { return esc(u.email); }).join("<br>") + '</td><td><span class="pill ' + esc(c.status) + '">' + esc(c.status) + "</span></td><td>" + logo + '</td><td class="n">' + c.counts.all.booking_completed + '</td><td><div class="row">' + acts + "</div></td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="muted" style="margin-top:8px">No clinics yet. <a href="#/register">Register one</a>.</p>') + "</div>";

    html += '<div class="card"><div class="row"><h2>Stand queue</h2><span class="spacer"></span><span class="tiny">Approved this month: ' + S.admin.approvedThisMonth() + " of " + CFG.standMonthlyCap + "</span></div>" + (stands.length ? '<div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Clinic</th><th>Ship to</th><th>NFC link to program</th><th>Status</th><th>Next step</th></tr></thead><tbody>' +
      stands.map(function (s) {
        var next = { requested: btn("st-approved", s.id, "Approve", "primary") + btn("st-cancelled", s.id, "Cancel", "danger"), approved: btn("st-programmed", s.id, "Mark programmed", "ghost"),
          programmed: '<input type="text" placeholder="NFC tag ID" id="uid' + s.id + '" style="padding:6px 8px;font-size:13px;max-width:130px"><input type="text" placeholder="Tracking #" id="trk' + s.id + '" style="padding:6px 8px;font-size:13px;max-width:130px">' + btn("st-shipped", s.id, "Mark shipped", "primary"),
          shipped: btn("st-delivered", s.id, "Mark delivered", "ghost") }[s.status] || "";
        return "<tr><td>" + esc(s.clinic ? s.clinic.display_name : "") + "</td><td>" + esc(s.ship_to_name) + '<br><span class="tiny">' + esc([s.address_line1, s.address_line2, s.city, s.province, s.postal_code].filter(Boolean).join(", ")) + '</span></td><td><span class="code" style="letter-spacing:0;font-size:12.5px">' + esc(s.clinic ? s.clinic.links.nfc : "") + '</span></td><td><span class="pill ' + esc(s.status) + '">' + esc(s.status) + '</span></td><td><div class="row">' + next + "</div></td></tr>";
      }).join("") + '</tbody></table></div><details style="margin-top:12px"><summary class="small"><b>Fulfilment checklist</b></summary><ol class="checklist small" style="margin-top:8px"><li>Write the NFC link to a genuine NXP NTAG213 or NTAG215 tag using NFC Tools.</li><li>Test the tap on an iPhone and an Android phone.</li><li>Lock the tag.</li><li>Print the stand label and apply it over the tag.</li><li>Scan the printed QR code to confirm it opens the right clinic page.</li><li>Enter the tag ID and tracking number, then mark the request shipped.</li></ol></details>' : '<p class="muted" style="margin-top:8px">No stand requests.</p>') + "</div>";

    html += '<div class="card"><div class="row"><h2>Where bookings come from</h2><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="csv"' + (report.length ? "" : " disabled") + '>Export CSV</button></div><p class="tiny" style="margin-top:4px">Counts of link events by clinic and month. This is not attendance: events are not tied to appointments.</p>' +
      (report.length ? '<div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Month</th><th>Clinic</th><th>Region</th><th class="n">Visits</th><th class="n">Started</th><th class="n">Completed</th></tr></thead><tbody>' +
      report.slice(0, 60).map(function (r) { return "<tr><td>" + monthName(r.month) + "</td><td>" + esc(r.clinic) + "</td><td>" + esc(r.region.toUpperCase()) + '</td><td class="n">' + r.visits + '</td><td class="n">' + r.started + '</td><td class="n">' + r.completed + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted" style="margin-top:8px">No activity yet.</p>') + "</div>";

    var mail = S.admin.outbox();
    html += '<div class="card"><h2>Email outbox (demo)</h2><p class="tiny" style="margin-top:4px">Emails the portal would send through the app\'s existing mail setup.</p><div class="stack" style="margin-top:12px">' +
      (mail.length ? mail.slice(0, 10).map(function (m) { return '<div class="mail"><b>' + esc(m.subject) + '</b> <span class="tiny">to ' + esc(m.to) + " · " + fmtDate(m.sent_at) + "</span><pre>" + esc(m.body) + "</pre></div>"; }).join("") : '<p class="muted">Nothing sent yet.</p>') + "</div></div></main></div>";
    app.innerHTML = html;

    function btn(act, idv, label, kind) { return '<button class="btn btn-' + kind + ' btn-sm" data-act="' + act + '" data-id="' + idv + '">' + label + "</button>"; }
    $$("[data-act]").forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute("data-act"), idv = +b.getAttribute("data-id");
        try {
          if (a === "approve") S.admin.setStatus(idv, "approved");
          else if (a === "reject") { var r = prompt("Reason for rejecting (sent to the clinic):"); if (r === null) return; S.admin.setStatus(idv, "rejected", r); }
          else if (a === "suspend") { if (!confirm("Suspend this clinic? Its link will open the main booking page.")) return; S.admin.setStatus(idv, "suspended"); }
          else if (a === "logo-ok") S.admin.setLogo(idv, true);
          else if (a === "logo-no") S.admin.setLogo(idv, false);
          else if (a.indexOf("st-") === 0) {
            var st = a.slice(3), extra = null;
            if (st === "shipped") extra = { tracking_number: $("#trk" + idv).value, nfc_tag_uid: $("#uid" + idv).value };
            S.admin.setStand(idv, st, extra);
          }
          viewAdmin();
        } catch (e) { alert(e.message); }
      };
    });
    if ($("#csv")) $("#csv").onclick = function () {
      var q = function (v) { v = String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
      var lines = [["month", "clinic", "region", "short_code", "visits", "bookings_started", "bookings_completed"].join(",")].concat(
        report.map(function (r) { return [r.month, r.clinic, r.region, r.short_code, r.visits, r.started, r.completed].map(q).join(","); }));
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = "clinic-referrals.csv"; a.click();
    };
  }

  /* ---------- demo strip ---------- */
  function demoStrip() {
    var el = document.getElementById("demo");
    if (CFG.mode !== "demo") { el.innerHTML = ""; return; }
    var me = S.me();
    el.innerHTML = '<div class="demo"><div class="demo-in"><b>Demo mode</b><span>Data stays in this browser. No emails are sent.</span><span class="spacer"></span>' +
      '<a href="#/admin">TSB admin view</a>' + (me && me.clinic.status === "approved" ? '<button id="seed">Add sample activity</button>' : "") + '<button id="reset">Reset demo</button></div></div>';
    if (document.getElementById("seed")) document.getElementById("seed").onclick = function () { S.demo.seedActivity(); toast("Sample activity added"); route(); };
    document.getElementById("reset").onclick = function () { if (confirm("Clear all demo data in this browser?")) { S.demo.reset(); go("/register"); route(); } };
  }

  /* ---------- router ---------- */
  function route() {
    if (!CFG.enabled) { app.innerHTML = '<div class="auth"><div class="card"><h1>Not found</h1></div></div>'; return; }
    var path = (location.hash || "#/").slice(1) || "/";
    window.scrollTo(0, 0);
    demoStrip();
    if (path.indexOf("/auth/") === 0) return viewAuth(path.slice(6));
    if (path === "/register") return viewRegister();
    if (path === "/login") return viewLogin();
    if (path === "/admin" && CFG.mode === "demo") return viewAdmin();
    var me = S.me();
    if (!me) return go("/login");
    renderWho(me);
    try {
      if (path === "/kit") return viewKit(me);
      if (path === "/profile") return viewProfile(me);
      if (path === "/stand") return viewStand(me);
      if (path === "/team") return viewTeam(me);
      return viewDashboard(me);
    } catch (e) {
      if (e.code === "auth") return go("/login");
      app.innerHTML = '<div class="auth"><div class="card"><div class="err">' + esc(e.message) + "</div></div></div>";
    }
  }
  window.addEventListener("hashchange", route);
  route();
})();
