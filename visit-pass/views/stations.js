/* Slot IQ Flow: station hub. One card per room: confirm the patient arrived,
   then check them out to free the room. The engine calls the next patient. */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
function tech(){ // Station hub: one card per room, plus the ready queue
  var wait=S.patients.filter(function(p){return p.state==='waiting';}).sort(function(a,b){return (a.bump?-1e6:0)+a.arrivedAt-((b.bump?-1e6:0)+b.arrivedAt);});
  var busy=S.rooms.filter(function(r){return r.state!=='free';}).length;
  var h='<div class="sthead"><span class="go">Auto-coordinate is on</span><span>Activity log '+S.log.length+'</span><span>'+busy+' of '+S.rooms.length+' stations busy</span></div><div class="stgrid"><div class="stcards">';
  S.rooms.forEach(function(r){
    var p=r.pid?patient(r.pid):null,lab={free:'Available',called:'Called','in':'In progress'}[r.state],body,b;
    if(!p){body='<p>Next: —</p>';b='<span class="auto">Calls the next ready patient by itself</span>';}
    else if(r.state==='called'){body='<p>On the way · called '+fmt(r.since)+'</p><div>'+chip(p)+'</div>';b=btn('roomnext','Patient arrived','way',r.id);}
    else{body='<p>Serving · '+Math.floor(S.now-r.since)+' min</p><div>'+chip(p)+'</div>';b=btn('roomnext','Check out','primary',r.id);}
    h+='<div class="st '+r.state+(p&&p.isMe?' mine':'')+'" style="border-top:6px solid '+COL[r.type]+'"><span class="ss '+r.state+'">'+lab+'</span><h3>'+r.name+'</h3><p>'+TYPES[r.type].name+'</p>'+body+b+'</div>';
  });
  h+='</div><div class="ready"><h3>Ready · '+wait.length+'</h3>'+(wait.length?wait.slice(0,9).map(function(p){
    var e=p.steps.filter(function(s){return eligible(p,s.type);}).map(function(s){return SHORT[s.type];});
    return '<div class="rq">'+chip(p)+'<span>'+(e.length?e.join(' · '):'On hold by a rule')+'</span></div>';}).join(''):'<p class="sub">Nobody is waiting.</p>')+
    '<p class="sub" style="font-size:12.5px">Each patient goes to whichever of their rooms is free first. No clinical details here.</p></div></div>';
  return h;
}

VP.component({
  id: "stations", order: 60, staff: true, name: "Station hub", product: "Slot IQ Flow", icon: "tech", title: "Station hub",
  blurb: "Staff calling and check-out. Each room confirms the patient arrived, then checks them out to free the room.",
  render: tech
});
})(window.VP);
