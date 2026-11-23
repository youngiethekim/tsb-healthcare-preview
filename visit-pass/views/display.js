/* Slot IQ Arrive: waiting room display. Calls numbers, never names. The
   patient keeps the same number all day. Runs well on its own on a TV:
   index.html?only=display */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
function meCall(){return S.me?S.me.call:CFG.demo.patientCall;}
function screen(){
  var calls=S.rooms.filter(function(r){return r.state==='called';});
  var note=S.announcement||CFG.content.screenNotes[Math.floor(S.now/4)%CFG.content.screenNotes.length];
  var w=S.patients.filter(function(p){return p.state==='waiting';}).sort(function(a,b){return a.arrivedAt-b.arrivedAt;});
  var hr=Math.floor(S.now/60),greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening',rt=function(n){var r=S.rooms.filter(function(q){return q.name===n;})[0];return r?r.type:'consult';};
  var up=w.slice(0,6),more=w.length-up.length;
  var h='<div class="tv2"><div class="sunw"><i></i><b></b></div><span class="cl c1"></span><span class="cl c2"></span>'+
    '<div class="t2h"><b>'+greet+'</b><span>We call numbers, never names. Follow the colour of your room.</span></div>'+
    '<div class="ncs">'+(calls.length?calls.map(function(r){var p=patient(r.pid);return '<div class="nc'+(p.isMe?' me':'')+'" data-c="'+p.call+r.id+'" style="background:'+COLD[r.type]+'"><div class="tkw"><small>Now calling</small><span class="tk" style="color:'+COLD[r.type]+'">'+p.call+'</span></div><span class="ft" aria-hidden="true"><i></i><i></i><i></i><em>›</em></span><div class="to"><b>'+r.name+'</b><span>'+TYPES[r.type].where+'</span></div></div>';}).join(''):'<div class="nc idle"><i class="breath"></i><div class="to"><b>Please relax</b><span>We will call your number here when it is your turn.</span></div></div>')+'</div>'+
    '<div class="upw"><h3>Up next<i>'+w.length+' waiting, in fair order</i></h3><div class="lane">'+(up.length?up.map(function(p,i){return '<span class="bb'+(i===0?' nx':'')+(p.isMe?' me':'')+'" style="--i:'+i+'">'+(i===0?'<small>Next</small>':'')+p.call+'</span>';}).join('')+(more>0?'<span class="bb mr">+'+more+'</span>':''):'<span class="bb none">Nobody is waiting</span>')+'<span class="door" aria-hidden="true">›</span></div></div>'+
    '<div class="rcw"><h3>Just called</h3><div class="rc">'+S.log.slice(0,4).map(function(l){return '<span class="'+(l.me?'me':'')+'"><i style="background:'+COL[rt(l.room)]+'"></i><b>'+l.call+'</b>'+l.room+'</span>';}).join('')+'</div></div>'+
    '<div class="keyc">'+ORDER.map(function(k){return '<span><i style="background:'+COL[k]+'"></i>'+TYPES[k].name+'</span>';}).join('')+'</div>'+
    '<div class="say">'+ic('sound')+'<div><small>'+(S.announcement?'From our staff':'Good to know')+'</small>'+note+'</div></div><i class="wv w1"></i><i class="wv w2"></i></div>';
  return h+'<div class="card"><h3>Announcements</h3><p class="sub" style="margin-bottom:10px">Each call is announced on the screen. Staff can also post a message for the whole waiting room.</p><div class="chips">'+
    CFG.content.announcements.map(function(p,i){return btn('annc','Post: '+p,S.announcement===p?'on':'',String(i));}).join('')+(S.announcement?btn('annc','Clear staff message','',''):'')+btn('sound',ic('sound')+(U.soundOn?'Voice is on for '+meCall():'Turn on voice for '+meCall()),U.soundOn?'on':'','')+'</div></div>';
}

var started = {};
VP.component({
  id: "display", order: 50, staff: true, name: "Waiting room display", product: "Slot IQ Arrive", icon: "screen", title: "Waiting room display",
  blurb: "Calls codes, never names. The patient’s number stays the same all day.",
  render: screen,
  after: function (el) { // keep the looping animations smooth across re-renders
    var tv = el.querySelector(".tv2"); if (!tv) return;
    var pn = performance.now(); tv.style.setProperty("--sd", (-pn / 1000).toFixed(2) + "s");
    tv.querySelectorAll(".nc[data-c]").forEach(function (n) { var c = n.getAttribute("data-c"); if (!started[c]) started[c] = pn; n.style.animationDelay = (-(pn - started[c]) / 1000).toFixed(2) + "s"; });
  },
  actions: {
    annc: function (v) { store.announce(v === "" ? "" : CFG.content.announcements[+v]); },
    sound: function () { U.soundOn = !U.soundOn; if (U.soundOn) say("Voice announcements are on."); }
  }
});
})(window.VP);
