/* Slot IQ Digital Visit Pass: app shell.
 *
 * The shell owns what every component shares: helpers, the component
 * registry, routing, rendering and the patient visit card. Each component
 * (views/*.js) registers itself with VP.component({...}). A component that
 * is switched off in config.js, or whose file is not loaded, simply does not
 * appear, so a site can run any subset.
 *
 *   index.html                   patient phone + staff app + video
 *   index.html?components=a,b    only those components (sales demos)
 *   index.html?only=display      one component full screen (a TV, a kiosk)
 *   index.html#journeys          open the staff app on one component
 */
(function () {
var CFG = window.VISIT_PASS_CONFIG, store = window.VisitPassStore, E = store.engine, S = store.state();
var TYPES = E.TYPES, ORDER = E.ORDER;
var COL = {}, COLD = {}, CNAME = {}, SHORT = {}, LEVEL = {};
CFG.types.forEach(function (t) { COL[t.id] = t.color; COLD[t.id] = t.dark; CNAME[t.id] = t.colorName; SHORT[t.id] = t.short; });
CFG.rooms.forEach(function (r) { LEVEL[r.id] = r.level; });

/* State shared between components. Anything that must reach other devices
   (announcements, messages, surveys) goes through the store instead. */
var U = {
  setg: { lg: false, sms: true, ring: true, lang: "English" }, soundOn: false,
  wrong: null, bookedBy: "", callOn: false, asks: [], openCard: null,
  pscr: "visit", dirFor: null, sel: {}
};
ORDER.forEach(function (k) { U.sel[k] = true; });

var VP = window.VP = { cfg: CFG, store: store, E: E, S: S, ui: U, comps: {}, list: [], act: {}, arriveBy: CFG.demo.arriveBy };
VP.NEEDS = [["step", "Step-free routes", "", "Step-free route"], ["help", "I need extra help", "", "I need extra help"], ["interp", "I need an interpreter", "", "Interpreter"], ["flash", "Flash the screen when it is my turn", "", "Flash when called"]];

/* ---------- helpers ---------- */
function $(id) { return document.getElementById(id); }
var IC={
  phone:'<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  kiosk:'<rect x="6" y="2" width="12" height="12" rx="2"/><path d="M10 14l-1 8h6l-1-8M10 8l1.5 1.5L14 7"/>',
  screen:'<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  tech:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M9 12l2 2 4-4"/>',
  staff:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="14" width="8" height="7" rx="2"/>',
  queue:'<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5"/>',
  stats:'<path d="M5 20v-7M12 20V5M19 20v-11" stroke-width="3"/>',
  spark:'<path d="M11 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  board:'<rect x="3" y="3" width="5" height="17" rx="1.5"/><rect x="10" y="3" width="5" height="10" rx="1.5"/><rect x="17" y="3" width="5" height="14" rx="1.5"/>',
  pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-4M14 21v-1"/>',
  sound:'<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 010 5.5M18 14.5c1.8.8 3 2.6 3 4.5"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  nfc:'<path d="M6 8.5a7 7 0 010 7M10 6a11 11 0 010 12M14 3.5a15 15 0 010 17"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  bell:'<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4"/>',
  cal:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M9 13l2 2 4-4"/>',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M15.5 14.5h2.5"/>',
  car:'<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16M4 16h16v3H4zM7.5 19v1.5M16.5 19v1.5"/>',
  play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z"/>'
};
function ic(n){return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+IC[n]+'</svg>';}
function say(t){try{var u=new SpeechSynthesisUtterance(t);u.rate=.9;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}catch(e){}}
function btn(a, label, cls, v) { return '<button class="btn ' + (cls || "") + '" data-a="' + a + '" data-v="' + (v || "") + '">' + label + "</button>"; }
function names(list) { var n = list.map(function (s) { return TYPES[s.type].name; }); return n.length > 1 ? n.slice(0, -1).join(", ") + " and " + n[n.length - 1] : n[0]; }
function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
var toastT = null;
function toast(html){
  var t=$('toast');t.innerHTML=html;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('show');},2800);
}
function confetti(){
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var c=$('confetti'),x=c.getContext&&c.getContext('2d');if(!x)return;
  var W=c.width=window.innerWidth,H=c.height=window.innerHeight,cols=['#14b8a6','#35d0dd','#ffc83d','#0e2145','#8be3e8'],P=[],t0=Date.now();
  for(var i=0;i<140;i++)P.push({x:W/2+(Math.random()-.5)*W*.5,y:H*.3,vx:(Math.random()-.5)*11,vy:-Math.random()*11-3,s:5+Math.random()*7,c:cols[i%5],r:Math.random()*6});
  (function f(){
    var t=(Date.now()-t0)/1000;x.clearRect(0,0,W,H);if(t>3)return;
    P.forEach(function(p){p.vy+=.28;p.x+=p.vx;p.y+=p.vy;p.r+=.2;x.save();x.globalAlpha=Math.max(0,1-t/3);x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/3,p.s,p.s*.66);x.restore();});
    requestAnimationFrame(f);
  })();
}
function qrSvg(text){
  var cells='',n=25,x,y;
  try{
    var q=qrcode(0,'M');q.addData(text);q.make();n=q.getModuleCount();
    for(y=0;y<n;y++)for(x=0;x<n;x++)if(q.isDark(y,x))cells+='<rect x="'+x+'" y="'+y+'" width="1.02" height="1.02"/>';
  }catch(e){
    cells='';for(y=0;y<n;y++)for(x=0;x<n;x++)if(hsh(x,y)<0.48)cells+='<rect x="'+x+'" y="'+y+'" width="1.02" height="1.02"/>';
  }
  return '<svg viewBox="0 0 '+n+' '+n+'" shape-rendering="crispEdges" role="img" aria-label="Digital Visit Pass QR code"><rect width="'+n+'" height="'+n+'" fill="#fff"/><g fill="#0e2145">'+cells+'</g></svg>';
}
var qrCache = {};
function qr(tok) { if (!qrCache[tok]) qrCache[tok] = qrSvg(CFG.site.qrPrefix + tok); return qrCache[tok]; }
function chip(p) { return '<span class="cchip' + (p.call.charAt(0) === "W" ? " w" : "") + (p.isMe ? " me" : "") + '">' + p.call + "</span>"; }
function hsh(a, b) { var x = Math.sin(a * 97.13 + b * 31.7 + 1.3) * 43758.5453; return x - Math.floor(x); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
var fmt = E.fmt;
function patient(id) { return E.patient(S, id); }
function room(id) { return E.room(S, id); }
function lockReason(p, t) { return E.lockReason(S, p, t); }
function eligible(p, t) { return E.eligible(S, p, t); }
function estWait(p, t) { return E.estWait(S, p, t); }
function etas(p) { return E.etas(S, p, VP.arriveBy); }
VP.meStats = function () { return E.visitStats(S.me); };

/* Everything a component file needs, in one place. */
VP.kit = {
  CFG: CFG, store: store, E: E, S: S, U: U, TYPES: TYPES, ORDER: ORDER,
  COL: COL, COLD: COLD, CNAME: CNAME, SHORT: SHORT, LEVEL: LEVEL,
  $: $, ic: ic, btn: btn, names: names, plural: plural, toast: toast, confetti: confetti, say: say, qr: qr, chip: chip, hsh: hsh, esc: esc,
  fmt: E.fmt, mins: E.mins, stepOf: E.stepOf, patient: patient, room: room, lockReason: lockReason, eligible: eligible, estWait: estWait, etas: etas,
  refOf: refOf
};

/* ---------- components ---------- */
/* def: { id, name, product, icon, title, blurb, order,
          staff: true for a screen in the staff app,
          render(): HTML,  actions: { name(v) },
          reset(), before() each frame, after(el) once rendered, scrollKey() } */
VP.component = function (def) {
  VP.comps[def.id] = def; VP.list.push(def);
  VP.list.sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
  if (def.actions) Object.keys(def.actions).forEach(function (k) { VP.act[k] = def.actions[k]; });
};
var params = new URLSearchParams(location.search);
var picked = params.get("components") ? params.get("components").split(",") : (CFG.components || null);
VP.enabled = function (id) { return !!VP.comps[id] && (!picked || picked.indexOf(id) >= 0); };
VP.has = VP.enabled;
var ALIAS = { phone: "pass", board: "flow", screen: "display", tech: "stations", queue: "rules", stats: "insight", clerk: "booking", about: "setup" };
function cid(v) { v = ALIAS[v] || v; return VP.enabled(v) ? v : null; }
function staffList() { return VP.list.filter(function (c) { return c.staff && VP.enabled(c.id); }); }

/* ---------- shared patient card (Flow board, Patients, Station hub) ---------- */
function modal(){
  var p=U.openCard?patient(U.openCard):null;if(!p)return '';
  var cur=p.cur?room(p.cur):null,acts='';
  var where=p.state==='expected'?'Not arrived yet':p.state==='waiting'?'Waiting area':p.state==='finished'?'Visit finished':(p.state==='called'?'Called to ':'In ')+cur.name;
  var list=p.steps.map(function(s){
    var T=TYPES[s.type],why=lockReason(p,s.type),mk,sub;
    if(s.status==='done'){mk='<span class="dot done">✓</span>';sub='Done '+fmt(s.end);}
    else if(s.status==='called'){mk='<span class="dot go">→</span>';sub='Called '+fmt(s.calledAt)+' · '+room(s.room).name;}
    else if(s.status==='in'){mk='<span class="dot in">●</span>';sub='In the room since '+fmt(s.start);}
    else if(p.state!=='expected'&&why){mk='<span class="dot hold">II</span>';sub='On hold · '+why;}
    else{mk='<span class="dot ready">…</span>';sub=p.state==='expected'?'Planned':'In line';}
    return '<div class="sc" style="--lab:'+COL[s.type]+'">'+mk+'<div><b>'+T.name+'</b><small>'+sub+'</small></div></div>';
  }).join('');
  if(p.state==='called')acts=btn('roomnext','Patient arrived','way',cur.id);
  else if(p.state==='in')acts=btn('roomnext','Done','primary',cur.id);
  else if(p.state==='expected'&&p.isMe)acts=btn('checkin','Check in','primary');
  else if(p.state==='waiting')acts=p.steps.filter(function(s){return eligible(p,s.type);}).map(function(s){return btn('bump','Next for '+TYPES[s.type].name,p.bump===s.type?'on':'',p.id+'|'+s.type);}).join('');
  return '<div class="ov"><button class="bd" data-a="close" data-v="" aria-label="Close card"></button><div class="dlg" role="dialog" aria-label="Visit card '+p.call+'"><div class="dh"><div><span class="num">'+p.call+'</span><div>'+p.name+'</div><small class="sub">'+where+(p.arrivedAt?' · arrived '+fmt(p.arrivedAt):'')+'</small></div><button class="x" data-a="close" data-v="x" aria-label="Close">✕</button></div>'+
    '<div class="grp"><span class="gl">Visit checklist</span>'+list+'</div>'+(acts?'<div class="acts2">'+acts+'</div>':'')+(p.token&&p.state!=='finished'?'<div class="grp"><span class="gl">Message this patient</span>'+CFG.content.staffMessages.map(function(x,i){return '<button class="btn msgb" data-a="smsg" data-v="'+p.id+'|'+i+'">'+x+'</button>';}).join('')+'<small class="sub">Preset messages only. They show on the patient’s phone with the time.</small></div>':'')+(p.isMe&&VP.NEEDS.some(function(n){return n[0]!=='flash'&&U.setg[n[0]];})?'<div class="grp"><span class="gl">Patient asked for</span><div class="chips">'+VP.NEEDS.filter(function(n){return n[0]!=='flash'&&U.setg[n[0]];}).map(function(n){return '<span class="pill called">'+n[1].replace('I need ','')+'</span>';}).join('')+(U.setg.lang!=='English'?'<span class="pill ready">'+U.setg.lang+'</span>':'')+'</div></div>':'')+'<div class="grp"><span class="gl">Booking reference</span><b class="refb">'+refOf(p)+'</b><ul class="slog">'+(p.arrivedAt?'<li><span>'+fmt(p.arrivedAt)+'</span>Checked in at the entrance</li>':'<li><span>—</span>Booked, not arrived yet</li>')+p.steps.filter(function(s){return s.status==='done'||s.status==='in';}).sort(function(a,b){return a.start-b.start;}).map(function(s){return '<li><span>'+fmt(s.start)+'</span>'+TYPES[s.type].name+' · scanned in · '+refOf(p)+'-'+(ORDER.indexOf(s.type)+1)+'</li>';}).join('')+(p.state==='finished'?'<li><span>'+fmt(p.finishedAt)+'</span>Checked out · pass closed</li>':'')+'</ul></div><p class="sub">The card holds a name, a call number and where the patient is. No clinical details.</p></div></div>';
}
function refOf(p){ // booking reference: random-looking, carries nothing about the patient
  if(p.ref)return p.ref;var A='23456789ABCDEFGHJKLMNPQRSTUVWXYZ',n=parseInt(p.call.slice(2),10)||1,o='';
  for(var i=0;i<8;i++){o+=A.charAt(Math.floor(hsh(n*7.3+i,i*3.1+n)*A.length));if(i===3)o+='-';}
  return p.ref=CFG.site.refPrefix+o;
}

/* ---------- demo patient: book, scan, finish ---------- */
function prebook() { store.book(ORDER.filter(function (k) { return U.sel[k]; })); U.bookedBy = "clerk"; }
function meNext() { // the demo patient's next physical step
  var m = S.me; if (!m) return;
  if (m.state === "called") store.scanDoor(m.id, m.cur);
  else if (m.state === "in") store.roomNext(m.cur);
}
function demoStrip() {
  var m = S.me, t, b;
  if (store.mode !== "demo") return "";
  if (!m && U.invite) { t = "Pick-your-time link sent to the demo patient."; b = (VP.selfbook && VP.selfbook.demo()) || ""; }
  else if (!m) { t = "No demo patient yet."; b = btn("book", "Book the demo visit", "primary", "clerk"); }
  else if (m.state === "expected") { t = "Demo patient <b>" + m.call + "</b> has not arrived yet."; b = btn("checkin", "Scan " + m.call + " in at the kiosk", "primary"); }
  else if (m.state === "waiting") { t = "Demo patient <b>" + m.call + "</b> is in the waiting area."; b = btn("skip", "Skip the wait", ""); }
  else if (m.state === "called") { t = "Demo patient <b>" + m.call + "</b> is called to " + room(m.cur).name + "."; b = btn("menext", "Patient scans in at the door", "way"); }
  else if (m.state === "in") { t = "Demo patient <b>" + m.call + "</b> is in " + room(m.cur).name + "."; b = btn("menext", "Staff check-out", "primary"); }
  else { t = "Demo patient <b>" + m.call + "</b> has finished the visit."; b = btn("restart", "Start again", ""); }
  return '<div class="dstrip"><span class="label">Demo control</span><span>' + t + "</span>" + b + (VP.enabled("pass") && !only ? '<button class="link" data-a="aud" data-v="patient">See the patient phone</button>' : "") + "</div>";
}

/* ---------- layout ---------- */
var only = null; // set in boot(), once every component has registered
var aud = "patient", side = null, vidOn = /^#video$/.test(location.hash), lastSide = "", last = {}, down = false;
var motionOK = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

function frame(c, inner) {
  var nav = staffList().map(function (v) { return '<button class="' + (side === v.id ? "on" : "") + '" data-a="go" data-v="' + v.id + '">' + ic(v.icon) + v.name + (v.id === "flow" ? "<em>Engine</em>" : "") + "</button>"; }).join("");
  return '<div class="app"><div class="chrome"><span class="dots"><i></i><i></i><i></i></span><span class="url">' + ic("lock") + "app.slotiq.ca/" + c.id + '</span><span class="live">● Live</span></div><div class="appb"><nav class="snav" aria-label="Slot IQ components"><div class="slogo">' + ic("cal") + "Slot IQ</div>" + nav +
    '</nav><div class="amain"><div class="ahead"><h1>' + c.title + "</h1><span>" + esc(CFG.site.name + " " + CFG.site.note) + ' · Digital Visit Pass</span></div><p class="seat">' + c.blurb + "</p>" + inner + "</div></div></div>" + demoStrip();
}
function clockBar() {
  if (store.mode !== "demo") return "";
  var k = store.clock;
  return '<span class="clock"><small>Clinic time</small>' + E.fmt(S.now) + '</span><button class="ghost" data-a="run" data-v="">' + (k.running ? "Pause" : "Resume") + '</button><button class="ghost" data-a="speed" data-v="">Speed ' + k.speed + '×</button><button class="ghost" data-a="restart" data-v="">Start over</button>';
}
function tabs() {
  if (only) return "";
  var b = [];
  if (VP.enabled("pass")) b.push('<button class="' + (aud === "patient" && !vidOn ? "on" : "") + '" data-a="aud" data-v="patient">' + ic("phone") + "I am the patient</button>");
  if (staffList().length) b.push('<button class="' + (aud === "staff" && !vidOn ? "on" : "") + '" data-a="aud" data-v="staff">' + ic("people") + "I am staff</button>");
  if (CFG.videoUrl) b.push('<button class="' + (vidOn ? "on" : "") + '" data-a="aud" data-v="video">' + ic("play") + "Video</button>");
  return '<div class="aud" role="group" aria-label="Who are you" style="grid-template-columns:repeat(' + b.length + ',auto)">' + b.join("") + "</div>";
}
function setView(v, push) {
  var c = cid(v);
  if (c === "pass") aud = "patient";
  else if (c && VP.comps[c].staff) { aud = "staff"; side = c; }
  if (!VP.enabled("pass")) aud = "staff";
  if (!side || !VP.enabled(side)) side = (staffList()[0] || {}).id || null;
  if (push) { try { location.hash = aud === "patient" ? "pass" : side; } catch (e) {} }
}

function render(force) {
  VP.arriveBy = (S.me && S.me.arriveBy) || CFG.demo.arriveBy;
  VP.list.forEach(function (c) { if (VP.enabled(c.id) && c.before) c.before(); });
  var showPhone = only ? only === "pass" : (aud === "patient" && VP.enabled("pass"));
  var sc = side && VP.comps[side];
  var parts = {
    sim: clockBar(),
    tabs: tabs(),
    phonecol: showPhone ? VP.comps.pass.render() : "",
    sidecol: only ? (only === "pass" ? "" : '<div class="solo-h"><h1>' + VP.comps[only].title + "</h1></div>" + VP.comps[only].render() + demoStrip())
      : (aud === "staff" && sc ? frame(sc, sc.render()) : ""),
    modal: modal()
  };
  var w = $("work");
  w.dataset.view = showPhone ? "phone" : "side";
  w.classList.toggle("staffmode", !showPhone);
  w.classList.toggle("solo", showPhone);
  document.body.classList.toggle("is-staff", !showPhone && !vidOn);
  document.body.classList.toggle("is-video", vidOn && !only);
  document.body.classList.toggle("is-only", !!only);
  var act = document.activeElement, key = act && act.dataset && act.dataset.a ? [act.dataset.a, act.dataset.v] : null;
  Object.keys(parts).forEach(function (k) {
    if (!force && last[k] === parts[k]) return;
    var el = $(k), owner = k === "phonecol" ? VP.comps.pass : k === "sidecol" ? VP.comps[only || side] : null;
    var flip = motionOK && !force && (k === "phonecol" || (k === "sidecol" && lastSide === side)), old = {}, had = false;
    if (flip) el.querySelectorAll("[data-card]").forEach(function (n) { old[n.dataset.card] = n.getBoundingClientRect(); had = true; });
    // keep scroll positions and the search box caret across re-renders
    var ps = el.querySelector(".pscroll"), sk = owner && owner.scrollKey ? owner.scrollKey() : "", pt = ps && sk === render["sk" + k] ? ps.scrollTop : 0; render["sk" + k] = sk;
    var ab = el.querySelector(".abar"), sl = ab ? ab.scrollLeft : 0;
    var ae = document.activeElement, tf = ae && ae.tagName === "INPUT" && el.contains(ae) ? ae.id : null, tp = tf ? ae.selectionStart : 0;
    el.innerHTML = parts[k]; last[k] = parts[k];
    if (tf) { var tn = $(tf); if (tn) { tn.focus(); try { tn.setSelectionRange(tp, tp); } catch (e) {} } }
    if (pt) { ps = el.querySelector(".pscroll"); if (ps) ps.scrollTop = pt; }
    if (sl) { ab = el.querySelector(".abar"); if (ab) ab.scrollLeft = sl; }
    if (owner && owner.after) owner.after(el);
    if (flip && had) el.querySelectorAll("[data-card]").forEach(function (n) { // cards glide to their new list
      if (!n.animate) return; var o = old[n.dataset.card];
      if (o) { var r = n.getBoundingClientRect(), dx = o.left - r.left, dy = o.top - r.top; if (Math.abs(dx) + Math.abs(dy) > 3) n.animate([{ transform: "translate(" + dx + "px," + dy + "px)", zIndex: 5 }, { transform: "none", zIndex: 5 }], { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)" }); }
      else n.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 300 });
    });
  });
  lastSide = side;
  if (key && !document.body.contains(act)) { var f = document.querySelector('[data-a="' + key[0] + '"][data-v="' + key[1] + '"]'); if (f) f.focus({ preventScroll: true }); }
}
VP.render = render;

/* Read the demo patient's call aloud when voice is on. */
var spoken = "";
function voice() {
  var l = S.log[0]; if (!l || !l.me) return;
  var k = l.call + "@" + l.t; if (k === spoken) return; spoken = k;
  if (U.soundOn) say(l.call.replace("-", " ").split("").join(" ") + ", please go to " + l.room);
}

/* ---------- shared actions ---------- */
function result(r, fn) { if (r && typeof r.then === "function") r.then(function (x) { fn(x); render(); }); else fn(r); }
var SHARED = {
  go: function (v) { setView(v, true); },
  see: function (v) { if (v === "help" || v === "pass") { U.dirFor = null; U.pscr = v === "help" ? "help" : "visit"; setView("pass", true); } else setView(v, true); },
  aud: function (v) {
    if (v === "video") { vidOn = true; try { location.hash = "video"; } catch (e) {} }
    else { vidOn = false; if (v === "patient") setView("pass", true); else { aud = "staff"; setView(side, true); } }
  },
  run: function () { store.clock.running = !store.clock.running; },
  speed: function () { var k = store.clock; k.speed = k.speed === 1 ? 4 : k.speed === 4 ? 10 : 1; },
  play: function () { var on = !store.isAuto(); store.setAuto(on); store.clock.running = true; store.clock.speed = on ? 4 : 1; },
  restart: function () {
    store.reset(); prebook();
    U.wrong = null; U.callOn = false; U.asks = []; U.openCard = null; U.pscr = "visit"; U.dirFor = null; spoken = "";
    VP.list.forEach(function (c) { if (c.reset) c.reset(); });
  },
  book: function () { if (S.me) return; U.invite = null; prebook(); toast("<span>Visit booked. Pass sent to " + esc(CFG.demo.patientName.split(" ")[0]) + "’s phone.</span>"); },
  checkin: function () { if (S.me) store.checkIn(S.me.id); },
  skip: function () { store.clock.running = true; store.advance(40, true); },
  menext: meNext,
  roomnext: function (v) { store.roomNext(v); },
  card: function (v) { U.openCard = v; },
  close: function () { U.openCard = null; },
  bump: function (v) { var a = v.split("|"); result(store.bump(a[0], a[1]), function (r) { if (r && r.msg) toast("<span>" + r.msg + "</span>"); }); },
  smsg: function (v) { var a = v.split("|"), p = patient(a[0]); if (!p) return; store.message(p.id, CFG.content.staffMessages[+a[1]]); if (VP.notify) VP.notify("Message from staff", CFG.content.staffMessages[+a[1]], "staff"); toast("<span>Sent to " + p.call + "’s phone.</span>"); }
};
Object.keys(SHARED).forEach(function (k) { VP.act[k] = SHARED[k]; });
VP.result = result;
VP.setView = setView;

/* ---------- events ---------- */
var drag = { id: null, on: false };
VP.drag = drag;
function boot() {
  document.addEventListener("click", function (e) {
    if (VP.onFirstClick) VP.onFirstClick();
    var el = e.target.closest("[data-a]"); if (!el || !VP.act[el.dataset.a]) return;
    VP.act[el.dataset.a](el.dataset.v); render();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && U.openCard) { U.openCard = null; render(); return; }
    var c = VP.comps[only || side]; if (c && c.onKey && aud === "staff" && c.onKey(e)) { render(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.getAttribute && e.target.getAttribute("role") === "button" && e.target.tagName !== "BUTTON") { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener("dragend", function () { drag.on = false; drag.id = null; down = false; render(true); });
  document.addEventListener("pointerdown", function () { down = true; });
  ["pointerup", "pointercancel"].forEach(function (n) { document.addEventListener(n, function () { down = false; }); });
  window.addEventListener("hashchange", function () { vidOn = location.hash === "#video"; if (!vidOn) setView(location.hash.slice(1), false); render(); });
  store.subscribe(function () { if (store.mode !== "demo") render(); });

  var v = $("vidlink"); if (v && CFG.videoUrl) { v.href = CFG.videoUrl; document.querySelectorAll("[data-video]").forEach(function (a) { a.href = CFG.videoUrl; }); }
  only = cid(params.get("only") || "");
  if (store.mode === "demo") prebook();
  setView(location.hash.slice(1), false);
  render(true);
  setInterval(function () {
    var k = store.clock;
    if (store.mode !== "demo" || !k.running || down || drag.on) { voice(); return; }
    if (store.isAuto()) {
      if (!S.me) SHARED.book(); else if (S.me.state === "expected") store.checkIn(S.me.id);
      if (S.me.state === "finished") { store.setAuto(false); k.speed = 1; }
    }
    for (var i = 0; i < k.speed; i++) store.tick(0.25);
    voice();
    render();
  }, 250);
}
document.addEventListener("DOMContentLoaded", boot);
})();
