/* Slot IQ Arrive: check-in kiosk and door scanners.
   One scan at the entrance checks the patient in for every appointment; the
   same pass is scanned at each room door. Wrong door: nothing changes and the
   patient is told where to go (staff see it on Patients). */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
function kiosk(){
  var m=S.me,h,sc='<div class="scan"><i></i></div>',where='Main entrance',tk='<span class="ktick">✓</span>';
  if(!m)h=sc+'<h2>Scan or tap your pass</h2><p class="sub">No visit is booked yet. Book one first.</p>'+btn('book','Book the visit','primary big','clerk');
  else if(m.state==='expected')h=sc+'<h2>Scan or tap your Digital Visit Pass</h2><p class="sub">Hold the QR code on your phone or printed letter under the scanner.</p>'+btn('checkin','Scan pass','primary big');
  else if(m.state==='called'&&U.wrong&&U.wrong.open){var r=room(m.cur);where='Check-in point · '+U.wrong.at;h='<span class="ktick no">!</span><h2>Not this door, '+m.call+'</h2><p class="sub">Your stop is <b>'+r.name+'</b>, '+TYPES[r.type].where+'. Follow the <b style="color:'+COLD[r.type]+'">'+CNAME[r.type]+'</b> signs.</p><p class="sub">Staff can see you scanned here.</p>'+btn('wrongx','OK, take me to the right door','primary big');}
  else if(m.state==='called'){var r=room(m.cur);where='Check-in point · '+r.name;h=sc+'<h2>'+m.call+', you are called here</h2><p class="sub">Scan the same pass. It logs that you are in the right place.</p>'+btn('menext','Scan pass','way big')+btn('wrongscan','Try scanning at the wrong door','','');}
  else if(m.state==='in'){where='Door scanner · '+room(m.cur).name;h=tk+'<h2>Arrival recorded</h2><p class="sub">Staff know you are in the room.</p>';}
  else if(m.state==='finished')h=tk+'<h2>All done for today</h2><p class="sub">Every appointment on this pass is complete. The pass has now expired.</p>';
  else{
    var nx=m.steps.filter(function(s){return eligible(m,s.type);})[0],w=nx?estWait(m,nx.type):null;
    h=tk+'<h2>You’re checked in</h2><p class="sub">Digital Visit Pass · '+plural(m.steps.length,'appointment')+' today</p>'+(nx?'<p class="sub"><b>Estimated wait: '+(w?'about '+mins(w):'you are next')+'</b></p>':'')+
      '<div class="kcode"><small>Your number today</small><b>'+m.call+'</b></div><p class="sub">One number for every room. Watch the screen.<br>Booking reference '+refOf(m)+'</p>';
  }
  return '<div class="kdev"><div class="kscr"><div class="khead"><b>'+SITE+'</b><span>'+where+'</span></div><div class="kin">'+h+'</div></div><div class="kprint"><i></i></div><div class="kpole"></div><div class="kbase"></div></div>';
}

VP.component({
  id: "kiosk", order: 40, staff: true, name: "Kiosk check-in", product: "Slot IQ Arrive", icon: "kiosk", title: "Kiosk check-in",
  blurb: "Slot IQ Arrive. One scan at the entrance checks the patient in for every appointment. The same pass opens each room door.",
  render: kiosk,
  reset: function () { U.wrong = null; },
  actions: {
    wrongscan: function () {
      var m = S.me; if (!m || m.state !== "called") return;
      var o = S.rooms.filter(function (r) { return r.id !== m.cur; })[0];
      store.scanDoor(m.id, o.id);
      U.wrong = { t: S.now, at: o.name, open: true };
    },
    wrongx: function () { if (U.wrong) U.wrong.open = false; }
  }
});
})(window.VP);
