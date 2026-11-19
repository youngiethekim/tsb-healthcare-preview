/* Lab Online Booking — Clinic Portal data layer (demo adapter).
 *
 * Every screen talks to window.ClinicStore and nothing else. In demo mode the
 * data lives in this browser's localStorage so the full journey can be shown
 * on a static host. The Laravel build replaces this file with fetch() calls to
 * the routes listed in README.md; the method names and rules stay the same.
 *
 * Tables mirror section 4 of the brief. None of them holds patient data:
 * link events carry clinic, medium, type and time only.
 */
(function () {
  "use strict";
  var CFG = window.CLINIC_PORTAL_CONFIG;
  var DB_KEY = "lobcp:v1";
  var SESSION_KEY = "lobcp:session";
  var ATTR_KEY = "lobcp:attr";
  var CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0 O 1 I L
  var MIN = 60 * 1000, HOUR = 60 * MIN;

  /* ---------- persistence ---------- */
  function blank() {
    return { seq: 1, clinics: [], clinic_users: [], clinic_login_tokens: [], clinic_link_events: [],
             clinic_stand_requests: [], clinic_audit_logs: [], login_requests: [], outbox: [] };
  }
  function load() {
    try { var d = JSON.parse(localStorage.getItem(DB_KEY)); if (d && d.clinics) return d; } catch (e) {}
    return blank();
  }
  function save(d) { try { localStorage.setItem(DB_KEY, JSON.stringify(d)); } catch (e) {} }
  function tx(fn) { var d = load(); var r = fn(d); save(d); return r; }
  function now() { return new Date().toISOString(); }
  function id(d) { return d.seq++; }
  function fail(msg, code) { var e = new Error(msg); e.code = code || "invalid"; throw e; }

  /* ---------- helpers ---------- */
  function randomBytes(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  async function sha256(s) {
    if (window.crypto && crypto.subtle) return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
    // Fallback for non-secure contexts (file://). Demo only.
    var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return "x" + (h >>> 0).toString(16);
  }
  function normEmail(e) { return String(e || "").trim().toLowerCase(); }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
  function clean(s, max) { return String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max || 200); }

  function makeShortCode(d) {
    for (var tries = 0; tries < 50; tries++) {
      var b = randomBytes(6), c = "";
      for (var i = 0; i < 6; i++) c += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
      if (!d.clinics.some(function (x) { return x.short_code === c; })) return c;
    }
    fail("Could not generate a unique code. Try again.");
  }
  function makeSlug(d, name, region) {
    var base = String(name).toLowerCase()
      .normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .replace(/-(medical-clinic|medical-centre|medical-center|family-practice|clinic)$/, "");
    if (!base) base = "clinic";
    base = base.slice(0, 40).replace(/-+$/, "");
    var slug = base, n = 2;
    function taken(s) { return d.clinics.some(function (c) { return c.region_id === region && (c.slug === s || (c.previous_slugs || []).indexOf(s) >= 0); }); }
    while (taken(slug)) { var suf = "-" + n++; slug = base.slice(0, 40 - suf.length).replace(/-+$/, "") + suf; }
    return slug;
  }
  function region(idv) { return CFG.regions.filter(function (r) { return r.id === idv; })[0]; }
  function audit(d, actorType, actorId, clinicId, action, meta) {
    d.clinic_audit_logs.push({ id: id(d), actor_type: actorType, actor_id: actorId, clinic_id: clinicId, action: action, meta: meta || {}, created_at: now() });
  }
  function mail(d, to, subject, body) {
    // Stand-in for the app's existing mail setup. Visible in the demo outbox.
    d.outbox.unshift({ id: id(d), to: to, subject: subject, body: body, sent_at: now() });
    d.outbox = d.outbox.slice(0, 50);
  }
  function clinicEmails(d, clinicId) {
    return d.clinic_users.filter(function (u) { return u.clinic_id === clinicId; }).map(function (u) { return u.email; });
  }
  function portalUrl(hash) { return location.href.split("#")[0].replace(/[^/]*$/, "") + "#" + hash; }

  /* ---------- session ---------- */
  function sessionUser(d) {
    var s; try { s = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) {}
    if (!s) return null;
    if (Date.now() - s.last_seen > CFG.sessionIdleHours * HOUR) { localStorage.removeItem(SESSION_KEY); return null; }
    var u = d.clinic_users.filter(function (x) { return x.id === s.user_id; })[0];
    if (!u) { localStorage.removeItem(SESSION_KEY); return null; }
    s.last_seen = Date.now(); localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return u;
  }
  function requireUser(d) { var u = sessionUser(d); if (!u) fail("Please sign in again.", "auth"); return u; }
  function myClinic(d, u) { return d.clinics.filter(function (c) { return c.id === u.clinic_id && !c.deleted_at; })[0] || fail("Clinic not found.", "auth"); }
  function requireApproved(c) { if (c.status !== "approved") fail("This is available once your clinic is approved.", "locked"); }

  /* ---------- public view of a clinic (what a clinic user may see) ---------- */
  function links(c) {
    var b = CFG.baseUrl.replace(/\/+$/, "");
    return {
      qr: b + "/c/" + c.short_code + "?m=qr",
      nfc: b + "/c/" + c.short_code + "?m=nfc",
      short: b + "/c/" + c.short_code,
      share: b + "/" + c.region_id + "/" + c.slug
    };
  }
  function present(c) {
    var r = region(c.region_id);
    return Object.assign({}, c, { region_name: r ? r.name : c.region_id, links: links(c),
      public_logo: c.logo_status === "approved" ? c.logo_data : null });
  }

  /* ---------- counting ---------- */
  function monthKey(iso) { return iso.slice(0, 7); }
  function countsFor(d, clinicId) {
    var ev = d.clinic_link_events.filter(function (e) { return clinicId == null || e.clinic_id === clinicId; });
    var t = new Date(), cur = t.toISOString().slice(0, 7);
    var prev = new Date(t.getFullYear(), t.getMonth() - 1, 15).toISOString().slice(0, 7);
    function tally(list) {
      var o = { visit: 0, booking_started: 0, booking_completed: 0 };
      list.forEach(function (e) { o[e.event_type]++; }); return o;
    }
    var months = [];
    for (var i = 11; i >= 0; i--) {
      var m = new Date(t.getFullYear(), t.getMonth() - i, 15).toISOString().slice(0, 7);
      var inM = ev.filter(function (e) { return monthKey(e.occurred_at) === m; });
      var row = { month: m };
      ["qr", "nfc", "link"].forEach(function (md) { row[md] = tally(inM.filter(function (e) { return e.medium === md; })); });
      row.total = tally(inM);
      months.push(row);
    }
    return {
      current: tally(ev.filter(function (e) { return monthKey(e.occurred_at) === cur; })),
      last: tally(ev.filter(function (e) { return monthKey(e.occurred_at) === prev; })),
      all: tally(ev), months: months
    };
  }

  var BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|slack|discord|preview|embedly|linkedinbot|skypeuripreview|bingpreview|headless/i;

  var Store = {
    config: CFG,
    regions: CFG.regions,

    /* ===== Clinic sign-up and sign-in ===== */
    async register(f) {
      var email = normEmail(f.email);
      if (!clean(f.name)) fail("Enter your name.");
      if (!validEmail(email)) fail("Enter a valid work email.");
      if (!clean(f.clinicName)) fail("Enter your clinic name.");
      if (!clean(f.address_line1) || !clean(f.city)) fail("Enter your clinic's street address and city.");
      var pcode = clean(f.postal_code, 7).toUpperCase().replace(/^([A-Z]\d[A-Z])\s?(\d[A-Z]\d)$/, "$1 $2");
      if (!/^V\d[A-Z] \d[A-Z]\d$/.test(pcode)) fail("Enter a BC postal code, for example V6B 1A1.");
      var where = this.regionFor(f);
      if (!where.region) fail(where.message, "region");
      if (!f.terms) fail("Please accept the clinic terms to continue.");
      var res = tx(function (d) {
        if (d.clinic_users.some(function (u) { return u.email === email; })) return { exists: true };
        var name = clean(f.clinicName, 120);
        var c = { id: id(d), name: name, display_name: name.slice(0, 60), region_id: where.region.id, region_source: where.source,
          slug: makeSlug(d, name, where.region.id), previous_slugs: [], short_code: makeShortCode(d),
          address_line1: clean(f.address_line1, 120), address_line2: clean(f.address_line2, 120), city: clean(f.city, 80), province: "BC",
          postal_code: pcode, lat: typeof f.lat === "number" ? f.lat : null, lng: typeof f.lng === "number" ? f.lng : null, phone: "",
          physician_count: null, emr: "", status: "pending", approved_by: null, approved_at: null,
          rejection_reason: null, logo_data: null, logo_status: "none", terms_accepted_at: now(),
          stand_limit: 1, created_at: now(), updated_at: now(), deleted_at: null };
        d.clinics.push(c);
        d.clinic_users.push({ id: id(d), clinic_id: c.id, name: clean(f.name, 100), email: email, role: "owner",
          last_login_at: null, created_at: now() });
        audit(d, "clinic_user", null, c.id, "registered", { region: where.region.id, region_source: where.source });
        return { exists: false };
      });
      return this.requestLink(email, res.exists ? null : "welcome");
    },

    // Health authority from the address. Returns { region, source, message }.
    // region is null when the address is outside the program or can't be placed.
    regionFor(a) {
      if (a.region) {
        var chosen = region(a.region);
        return chosen ? { region: chosen, source: "chosen" } : { region: null, message: "Choose your health authority." };
      }
      if (a.province && String(a.province).toUpperCase() !== "BC") return { region: null, source: "outside", message: "Clinic codes are for clinics in British Columbia." };
      var hit = window.ClinicRegions && ClinicRegions.lookup({ city: a.city, district: a.district });
      if (!hit) return { region: null, source: "unknown", message: "We couldn't match that city to a health authority. Choose yours below." };
      var inProgram = region(hit.id);
      if (!inProgram) return { region: null, source: "not_in_program", ha: hit.name,
        message: "Clinic codes are launching in " + CFG.regions.map(function (r) { return r.name; }).join(" and ") + " first. " + hit.name + " is coming later. Email " + CFG.supportEmail + " to be told when it opens." };
      return { region: inProgram, source: hit.source };
    },

    async requestLink(emailIn, kind) {
      var email = normEmail(emailIn);
      var generic = "If that email is registered, we sent a sign-in link. It works once and expires in " + CFG.loginLinkMinutes + " minutes.";
      if (!validEmail(email)) fail("Enter a valid email address.");
      var token = hex(randomBytes(32));
      var hash = await sha256(token);
      var demoLink = tx(function (d) {
        var cut = Date.now() - HOUR;
        d.login_requests = d.login_requests.filter(function (r) { return r.at > cut; });
        if (d.login_requests.filter(function (r) { return r.email === email; }).length >= CFG.loginLinksPerHour) return null;
        d.login_requests.push({ email: email, at: Date.now() });
        var u = d.clinic_users.filter(function (x) { return x.email === email; })[0];
        if (!u) return null;
        d.clinic_login_tokens.push({ id: id(d), clinic_user_id: u.id, token_hash: hash,
          expires_at: Date.now() + CFG.loginLinkMinutes * MIN, used_at: null, created_at: now() });
        var url = portalUrl("/auth/" + token);
        mail(d, email, kind === "welcome" ? "Welcome to the Lab Online Booking clinic portal" : "Your Lab Online Booking sign-in link",
          "Use this link to sign in. It works once and expires in " + CFG.loginLinkMinutes + " minutes.\n\n" + url);
        return url;
      });
      // demoLink is only returned in demo mode, where there is no real email.
      return { message: generic, demoLink: CFG.mode === "demo" ? demoLink : null };
    },

    async verifyToken(token) {
      var hash = await sha256(String(token || ""));
      return tx(function (d) {
        var t = d.clinic_login_tokens.filter(function (x) { return x.token_hash === hash; })[0];
        if (!t || t.used_at || Date.now() > t.expires_at) fail("This sign-in link has expired or was already used. Request a new one.", "token");
        t.used_at = now();
        var u = d.clinic_users.filter(function (x) { return x.id === t.clinic_user_id; })[0];
        if (!u) fail("Account not found.", "token");
        u.last_login_at = now();
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user_id: u.id, last_seen: Date.now() }));
        return true;
      });
    },

    signOut() { localStorage.removeItem(SESSION_KEY); },

    me() {
      var d = load(); var u = sessionUser(d);
      if (!u) return null;
      var c = d.clinics.filter(function (x) { return x.id === u.clinic_id && !x.deleted_at; })[0];
      if (!c) return null;
      return { user: u, clinic: present(c) };
    },

    /* ===== Clinic profile and logo ===== */
    updateProfile(p) {
      return tx(function (d) {
        var u = requireUser(d), c = myClinic(d, u);
        var dn = clean(p.display_name, 200);
        if (!dn) fail("Display name is required.");
        if (dn.length > 60) fail("Display name can be 60 characters at most.");
        var pc = p.physician_count === "" || p.physician_count == null ? null : Number(p.physician_count);
        if (pc != null && (!Number.isInteger(pc) || pc < 0 || pc > 500)) fail("Number of physicians must be a whole number.");
        var pcode = clean(p.postal_code, 7).toUpperCase();
        if (pcode && !/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(pcode)) fail("Enter a valid postal code, for example V6B 1A1.");
        // Only these fields are editable. slug, short_code, status and region are not.
        Object.assign(c, {
          display_name: dn, address_line1: clean(p.address_line1, 120), address_line2: clean(p.address_line2, 120),
          city: clean(p.city, 80), province: clean(p.province, 2).toUpperCase() || "BC", postal_code: pcode,
          phone: clean(p.phone, 30), physician_count: pc,
          emr: CFG.emrOptions.indexOf(p.emr) >= 0 ? p.emr : (p.emr ? "Other" : ""),
          emr_other: p.emr === "Other" ? clean(p.emr_other, 60) : "", updated_at: now()
        });
        return present(c);
      });
    },

    async uploadLogo(file) {
      if (!file) fail("Choose a file.");
      if (file.size > 1024 * 1024) fail("Logo must be 1 MB or smaller.");
      var head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      var isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
      var isJpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
      if (!isPng && !isJpg) fail("Logo must be a PNG or JPG file.");
      // Re-encode through a canvas: strips metadata and anything hidden in the file.
      var url = URL.createObjectURL(file);
      var img = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error("That image could not be read.")); }; i.src = url; });
      URL.revokeObjectURL(url);
      var scale = Math.min(1, 640 / img.naturalWidth, 320 / img.naturalHeight);
      var cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.naturalWidth * scale)); cv.height = Math.max(1, Math.round(img.naturalHeight * scale));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      var data = cv.toDataURL("image/png");
      return tx(function (d) {
        var u = requireUser(d), c = myClinic(d, u);
        c.logo_data = data; c.logo_status = "pending"; c.updated_at = now();
        audit(d, "clinic_user", u.id, c.id, "logo_uploaded", {});
        return present(c);
      });
    },

    removeLogo() {
      return tx(function (d) { var u = requireUser(d), c = myClinic(d, u); c.logo_data = null; c.logo_status = "none"; return present(c); });
    },

    /* ===== Booking kit ===== */
    kit() {
      var d = load(); var u = requireUser(d), c = myClinic(d, u); requireApproved(c); return present(c);
    },

    /* ===== Stand ===== */
    stands() {
      var d = load(); var u = requireUser(d), c = myClinic(d, u);
      return d.clinic_stand_requests.filter(function (s) { return s.clinic_id === c.id; }).sort(function (a, b) { return b.id - a.id; });
    },
    requestStand(f) {
      return tx(function (d) {
        var u = requireUser(d), c = myClinic(d, u); requireApproved(c);
        var open = d.clinic_stand_requests.filter(function (s) { return s.clinic_id === c.id && ["requested", "approved", "programmed", "shipped"].indexOf(s.status) >= 0; });
        if (open.length) fail("You already have an open stand request.");
        var total = d.clinic_stand_requests.filter(function (s) { return s.clinic_id === c.id && s.status !== "cancelled"; }).length;
        if (total >= (c.stand_limit || 1)) fail("Your clinic has received its free stand. Contact us if you need another.");
        if (!f.display_confirm) fail("Please confirm the stand will be displayed at your front desk.");
        var need = ["ship_to_name", "address_line1", "city", "postal_code"];
        need.forEach(function (k) { if (!clean(f[k])) fail("Complete the shipping name and address."); });
        var s = { id: id(d), clinic_id: c.id, requested_by: u.id, ship_to_name: clean(f.ship_to_name, 100),
          address_line1: clean(f.address_line1, 120), address_line2: clean(f.address_line2, 120), city: clean(f.city, 80),
          province: clean(f.province, 2).toUpperCase() || "BC", postal_code: clean(f.postal_code, 7).toUpperCase(),
          quantity: 1, status: "requested", tracking_number: "", nfc_tag_uid: "", shipped_at: null, notes: "",
          created_at: now(), updated_at: now() };
        d.clinic_stand_requests.push(s);
        mail(d, u.email, "We received your stand request", "Thanks. We'll program, label and ship your Lab Online Booking stand, and email you the tracking number.");
        return s;
      });
    },

    /* ===== Team ===== */
    team() {
      var d = load(); var u = requireUser(d), c = myClinic(d, u);
      return d.clinic_users.filter(function (x) { return x.clinic_id === c.id; });
    },
    invite(f) {
      var email = normEmail(f.email);
      var self = this;
      tx(function (d) {
        var u = requireUser(d), c = myClinic(d, u);
        if (u.role !== "owner") fail("Only the clinic owner can invite a colleague.");
        if (!clean(f.name)) fail("Enter your colleague's name.");
        if (!validEmail(email)) fail("Enter a valid work email.");
        if (d.clinic_users.some(function (x) { return x.email === email; })) fail("That email already has a portal account.");
        if (d.clinic_users.filter(function (x) { return x.clinic_id === c.id; }).length >= 2) fail("Each clinic can have one owner and one staff member.");
        d.clinic_users.push({ id: id(d), clinic_id: c.id, name: clean(f.name, 100), email: email, role: "staff", last_login_at: null, created_at: now() });
      });
      return self.requestLink(email, "welcome");
    },
    removeMember(userId) {
      return tx(function (d) {
        var u = requireUser(d), c = myClinic(d, u);
        if (u.role !== "owner") fail("Only the clinic owner can remove a colleague.");
        var t = d.clinic_users.filter(function (x) { return x.id === userId && x.clinic_id === c.id && x.role === "staff"; })[0];
        if (!t) fail("Member not found.");
        d.clinic_users = d.clinic_users.filter(function (x) { return x !== t; });
      });
    },

    /* ===== Dashboard ===== */
    myCounts() { var d = load(); var u = requireUser(d), c = myClinic(d, u); return countsFor(d, c.id); },

    /* ===== Public link (no login) ===== */
    resolve(q) {
      var d = load(), c = null;
      if (q.code) c = d.clinics.filter(function (x) { return x.short_code === String(q.code).toUpperCase(); })[0];
      else if (q.region && q.slug) c = d.clinics.filter(function (x) { return x.region_id === q.region && (x.slug === q.slug || (x.previous_slugs || []).indexOf(q.slug) >= 0); })[0];
      if (!c || c.deleted_at || c.status !== "approved") return null;
      var p = present(c);
      return { id: p.id, display_name: p.display_name, region_id: p.region_id, region_name: p.region_name, short_code: p.short_code, logo: p.public_logo };
    },
    trackVisit(clinicId, medium) {
      if (BOT_RE.test(navigator.userAgent || "")) return false;
      medium = ["qr", "nfc", "link"].indexOf(medium) >= 0 ? medium : "link";
      var seenKey = "lobcp:seen:" + clinicId;
      localStorage.setItem(ATTR_KEY, JSON.stringify({ clinic_id: clinicId, medium: medium, at: Date.now(), started: false }));
      if (sessionStorage.getItem(seenKey)) return false;
      sessionStorage.setItem(seenKey, "1");
      tx(function (d) { d.clinic_link_events.push({ id: id(d), clinic_id: clinicId, medium: medium, event_type: "visit", occurred_at: now() }); });
      return true;
    },
    // Called by the booking flow: first step, and the confirmation hook.
    trackBooking(type) {
      var a; try { a = JSON.parse(localStorage.getItem(ATTR_KEY)); } catch (e) {}
      if (!a || Date.now() - a.at > CFG.attributionHours * HOUR) { localStorage.removeItem(ATTR_KEY); return false; }
      if (type === "booking_started" && a.started) return false;
      tx(function (d) { d.clinic_link_events.push({ id: id(d), clinic_id: a.clinic_id, medium: a.medium, event_type: type, occurred_at: now() }); });
      if (type === "booking_completed") localStorage.removeItem(ATTR_KEY);
      else { a.started = true; localStorage.setItem(ATTR_KEY, JSON.stringify(a)); }
      return true;
    },

    /* ===== TSB admin (lives in the existing admin area in the real build) ===== */
    admin: {
      clinics(filter) {
        var d = load(); filter = filter || {};
        var order = { pending: 0, approved: 1, suspended: 2, rejected: 3 };
        return d.clinics.filter(function (c) { return !c.deleted_at && (!filter.status || c.status === filter.status) && (!filter.region || c.region_id === filter.region); })
          .sort(function (a, b) { return order[a.status] - order[b.status] || a.id - b.id; })
          .map(function (c) { var p = present(c); p.counts = countsFor(d, c.id); p.users = d.clinic_users.filter(function (u) { return u.clinic_id === c.id; }); return p; });
      },
      audit(clinicId) { return load().clinic_audit_logs.filter(function (a) { return a.clinic_id === clinicId; }).reverse(); },
      setStatus(clinicId, status, reason) {
        return tx(function (d) {
          var c = d.clinics.filter(function (x) { return x.id === clinicId; })[0] || fail("Clinic not found.");
          if (status === "rejected" && !clean(reason)) fail("A reason is required to reject a clinic.");
          c.status = status; c.updated_at = now();
          if (status === "approved") { c.approved_by = "tsb-admin"; c.approved_at = now(); c.rejection_reason = null; }
          if (status === "rejected") c.rejection_reason = clean(reason, 500);
          audit(d, "admin", "tsb-admin", c.id, status, reason ? { reason: clean(reason, 500) } : {});
          var to = clinicEmails(d, c.id).join(", ");
          if (status === "approved") mail(d, to, "Your clinic is approved", "Your booking kit, QR code and stand request are ready in the clinic portal.");
          if (status === "rejected") mail(d, to, "About your clinic portal request", "We could not approve this request: " + c.rejection_reason + "\nQuestions? " + CFG.supportEmail);
          if (status === "suspended") mail(d, to, "Your clinic link is paused", "Your clinic link now opens the main Lab Online Booking page. Contact " + CFG.supportEmail + ".");
        });
      },
      setRegion(clinicId, regionId) {
        return tx(function (d) {
          var c = d.clinics.filter(function (x) { return x.id === clinicId; })[0] || fail("Clinic not found.");
          if (!region(regionId)) fail("Unknown region.");
          if (c.status === "approved") fail("Change the region before approving. Approved clinics may already have printed links.");
          if (c.region_id === regionId) return;
          var from = c.region_id;
          var slug = makeSlug(d, c.name, regionId);
          c.region_id = regionId; c.region_source = "admin"; c.slug = slug; c.updated_at = now();
          audit(d, "admin", "tsb-admin", c.id, "region_changed", { from: from, to: regionId });
        });
      },
      setLogo(clinicId, approve) {
        return tx(function (d) {
          var c = d.clinics.filter(function (x) { return x.id === clinicId; })[0] || fail("Clinic not found.");
          if (approve) c.logo_status = "approved"; else { c.logo_status = "none"; c.logo_data = null; }
          audit(d, "admin", "tsb-admin", c.id, approve ? "logo_approved" : "logo_rejected", {});
        });
      },
      stands() {
        var d = load(); var order = ["requested", "approved", "programmed", "shipped", "delivered", "cancelled"];
        return d.clinic_stand_requests.map(function (s) {
          var c = d.clinics.filter(function (x) { return x.id === s.clinic_id; })[0];
          return Object.assign({}, s, { clinic: c ? present(c) : null });
        }).sort(function (a, b) { return order.indexOf(a.status) - order.indexOf(b.status) || a.id - b.id; });
      },
      approvedThisMonth() {
        var m = now().slice(0, 7);
        return load().clinic_audit_logs.filter(function (a) { return a.action === "stand_approved" && a.created_at.slice(0, 7) === m; }).length;
      },
      setStand(standId, status, extra) {
        var cap = CFG.standMonthlyCap, used = this.approvedThisMonth();
        return tx(function (d) {
          var s = d.clinic_stand_requests.filter(function (x) { return x.id === standId; })[0] || fail("Request not found.");
          if (status === "approved" && used >= cap) fail("This month's stand cap (" + cap + ") is reached. The request stays in the queue.");
          if (status === "shipped" && !clean(extra && extra.tracking_number)) fail("Enter the tracking number before marking shipped.");
          if (status === "shipped" && !clean(extra && extra.nfc_tag_uid)) fail("Enter the NFC tag ID before marking shipped.");
          s.status = status; s.updated_at = now();
          if (extra) { if (extra.tracking_number != null) s.tracking_number = clean(extra.tracking_number, 60); if (extra.nfc_tag_uid != null) s.nfc_tag_uid = clean(extra.nfc_tag_uid, 40); }
          if (status === "shipped") {
            s.shipped_at = now();
            mail(d, clinicEmails(d, s.clinic_id).join(", "), "Your Lab Online Booking stand has shipped", "Tracking number: " + s.tracking_number);
          }
          audit(d, "admin", "tsb-admin", s.clinic_id, "stand_" + status, { stand_id: s.id });
        });
      },
      report(regionId) {
        var d = load();
        var rows = [];
        d.clinics.filter(function (c) { return !c.deleted_at && (!regionId || c.region_id === regionId); }).forEach(function (c) {
          var byM = {};
          d.clinic_link_events.filter(function (e) { return e.clinic_id === c.id; }).forEach(function (e) {
            var k = monthKey(e.occurred_at); byM[k] = byM[k] || { visit: 0, booking_started: 0, booking_completed: 0 }; byM[k][e.event_type]++;
          });
          Object.keys(byM).forEach(function (m) { rows.push({ month: m, clinic: c.display_name, region: c.region_id, short_code: c.short_code, visits: byM[m].visit, started: byM[m].booking_started, completed: byM[m].booking_completed }); });
        });
        return rows.sort(function (a, b) { return b.month.localeCompare(a.month) || b.completed - a.completed; });
      },
      outbox() { return load().outbox; }
    },

    /* ===== Demo helpers ===== */
    demo: {
      reset() { localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); localStorage.removeItem(ATTR_KEY); },
      seedActivity() {
        return tx(function (d) {
          var u = requireUser(d), c = myClinic(d, u); requireApproved(c);
          var t = new Date();
          for (var i = 0; i < 6; i++) {
            var n = 20 + Math.floor(Math.random() * 40);
            for (var j = 0; j < n; j++) {
              var when = new Date(t.getFullYear(), t.getMonth() - i, 1 + Math.floor(Math.random() * (i ? 27 : Math.max(1, t.getDate() - 1))), 9 + Math.floor(Math.random() * 8));
              var r = Math.random(), medium = r < 0.6 ? "qr" : r < 0.85 ? "nfc" : "link";
              var push = function (type) { d.clinic_link_events.push({ id: id(d), clinic_id: c.id, medium: medium, event_type: type, occurred_at: when.toISOString() }); };
              push("visit");
              if (Math.random() < 0.7) { push("booking_started"); if (Math.random() < 0.8) push("booking_completed"); }
            }
          }
        });
      }
    }
  };

  window.ClinicStore = Store;
})();
