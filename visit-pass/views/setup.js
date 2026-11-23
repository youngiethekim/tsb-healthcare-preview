/* Your setup: pick the Slot IQ components a site wants. Every component
   runs on the same engine. "Open this setup" reloads the demo with only the
   picked components (?components=...), which is also how a site's build is
   chosen in config.js (components: [...]). */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
/* [component id, name, product, icon, pitch, screen to open, built?] */
var COMPS=[
  ['flow','Slot IQ Flow','The engine','board','The live floor and the queue. Every patient is a card that moves by itself as they scan in.','flow',1],
  ['booking','Online booking','Slot IQ Book','people','Patients or booking clerks book appointments online, at any time of day.','booking',1],
  ['assist','AI scheduling assistant','Slot IQ Assist','sound','Answers patient questions and guides them to the right place, by chat or by phone call.','help',1],
  ['kiosk','Kiosk check-in','Slot IQ Arrive','kiosk','Patients scan in at the door. No line at the front desk.','kiosk',1],
  ['display','Waiting room display','Slot IQ Arrive','screen','Calls patients by code, never by name.','display',1],
  ['stations','Station hub','Slot IQ Flow','tech','Staff see who is next, confirm the patient arrived and check them out.','stations',1],
  ['rules','Visit rules','Slot IQ Flow','queue','What must come first, and how long to wait between steps. Switch a rule and the calls change live.','rules',1],
  ['journeys','Patient journeys','Slot IQ Flow','list','Every visit as a line of stops, like a transit map. See who is where and spot delays early.','journeys',1],
  ['pass','Digital Visit Pass','Slot IQ Arrive','nfc','One QR code and one number for a visit with several appointments, with rules for what must come first.','pass',1],
  ['insight','Analytics','Slot IQ Insight','stats','Waits, room use and patient feedback, live.','insight',1],
  ['tests','Test directory','Coming soon','queue','Every test or service, with prep steps, easy to search and linked straight to booking.','',0]
],picks={};
function initPicks(){COMPS.forEach(function(c){picks[c[0]]=c[6]&&(c[0]==='flow'||VP.enabled(c[0]))?1:0;});}
function setupUrl(){
  var ids=COMPS.filter(function(c){return picks[c[0]]&&c[6];}).map(function(c){return c[0];});
  return location.pathname+'?components='+ids.concat(['setup']).join(',')+'#'+(ids.indexOf('pass')>=0?'pass':ids[0]);
}
function about(){
  var on=COMPS.filter(function(c){return picks[c[0]];});
  var path='<div class="card pathc"><h3>One path, from booking to care</h3><div class="pathw"><div class="pin"><small>Patients arrive by</small><span>Online booking</span><span>AI Assistant</span><span>Clinic QR referral</span><span>Walk-in</span></div>'+[['Check in','Kiosk, QR code or NFC tap.','Check-in kiosk'],['One queue','Booked and walk-in patients in one fair order.','Slot IQ engine'],['Called','Number on the screen, plus a text.','Queue display'],['Seen','Staff call next and mark the visit done.','Technician kiosk'],['Feedback','Patients rate their visit before they leave.','Patient survey']].map(function(x){return '<i class="pa">›</i><div class="pst"><b>'+x[0]+'</b><span>'+x[1]+'</span><em>'+x[2]+'</em></div>';}).join('')+'</div><p class="sub">Missed the grace window? The slot goes to the next walk-in. Every step is timed.</p></div>';
  return path+'<div class="cgrid">'+COMPS.map(function(c){
    var lock=c[0]==='flow',p=!!picks[c[0]],soon=!c[6];
    return '<div class="comp'+(p?'':' off')+'"><div class="ct"><span class="ci">'+ic(c[3])+'</span><div><b>'+c[1]+'</b><small>'+c[2]+'</small></div></div><p>'+c[4]+'</p><div class="cr">'+
      (lock?'<span class="pill okp">Always included</span>':soon?'<span class="pill lock">Coming soon</span>':'<button class="btn'+(p?' on':'')+'" role="switch" aria-checked="'+p+'" data-a="pick" data-v="'+c[0]+'">'+(p?'✓ In my setup':'+ Add')+'</button>')+
      (c[5]&&VP.enabled(c[0])?'<button class="link" data-a="see" data-v="'+c[5]+'">See it ›</button>':'')+'</div></div>';}).join('')+'</div>'+
    '<div class="anon"><span class="ci">'+ic('lock')+'</span><div><b>No name on the Digital Visit Pass</b><p>The pass is anonymous. It carries a number, a QR code and an NFC tap, and nothing about the patient. All the patient needs is their number, or the QR code or tap on their phone. Screens and kiosks show the number only. The name stays inside the hospital’s own system.</p><div class="chips"><span class="cchip">B-052</span><span class="pill ready">QR code</span><span class="pill ready">NFC tap</span></div></div></div>'+
    '<div class="yours"><small>Your Slot IQ · '+on.length+' of '+COMPS.length+' components</small><b>'+on.map(function(c){return c[1];}).join(' + ')+'</b><span>Every component runs on the same engine, so the pieces you pick work together from day one.</span><a class="btn primary" style="align-self:flex-start;margin-top:8px;text-decoration:none" href="'+setupUrl()+'">Open this setup ›</a><small style="color:#9fd6e6">Opens the demo with only these components. Share the link to show someone their setup.</small></div>';
}

VP.component({
  id: "setup", order: 90, staff: true, name: "Your setup", product: "Slot IQ", icon: "gear", title: "Your setup",
  blurb: "Pick the components this site needs. They all share one engine, so any mix works together.",
  render: function () { if (!Object.keys(picks).length) initPicks(); return about(); },
  actions: { pick: function (v) { if (v !== "flow") picks[v] = picks[v] ? 0 : 1; } }
});
})(window.VP);
