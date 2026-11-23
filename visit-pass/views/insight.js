/* Slot IQ Insight: live numbers. Waits, room use and patient feedback.
   Where and when only, never results. */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
function stats(){
  var fin=S.patients.filter(function(p){return p.state==='finished';}),tot=0,inr=0,appts=0,multi=0,el=Math.max(1,S.now-CFG.demo.open);
  fin.forEach(function(p){tot+=p.finishedAt-p.arrivedAt;p.steps.forEach(function(s){inr+=s.end-s.start;});if(p.steps.length>1)multi++;});
  S.patients.forEach(function(p){p.steps.forEach(function(s){if(s.status==='done')appts++;});});
  var n=fin.length,avg=n?tot/n:0,wait=n?(tot-inr)/n:0;
  var h='<div class="grid tiles">'+
    '<div class="tile"><div class="n">'+n+'</div><span>Visits finished</span></div>'+
    '<div class="tile"><div class="n">'+appts+'</div><span>Appointments done</span></div>'+
    '<div class="tile"><div class="n">'+multi+'</div><span>Visits with 2 or more</span></div>'+
    '<div class="tile"><div class="n">'+(n?Math.round(avg):'–')+'<small style="font-size:14px"> min</small></div><span>Average door to door</span></div>'+
    '<div class="tile"><div class="n">'+(n?Math.round(wait):'–')+'<small style="font-size:14px"> min</small></div><span>Average waiting</span></div></div>'+
    '<div class="card"><h3>Room use since '+fmt(CFG.demo.open)+'</h3>';
  ORDER.forEach(function(k){
    var busy=0,rs=S.rooms.filter(function(r){return r.type===k;}).length;
    S.patients.forEach(function(p){var s=stepOf(p,k);if(s&&s.start!=null)busy+=(s.end!=null?s.end:S.now)-s.start;});
    var u=Math.min(100,Math.round(busy/(el*rs)*100));
    h+='<div class="ubar"><span>'+TYPES[k].name+'</span><div class="bar"><i style="width:'+u+'%"></i></div><span>'+u+'%</span></div>';
  });
  h+='<p class="sub" style="margin-top:8px">Share of open time each appointment type had a patient in the room. Fake data from this demo clinic.</p></div>';
  var last=S.surveys[S.surveys.length-1],sv=last?last.answers:{},svDone=!!last,fx=CFG.content.surveyFix.filter(function(o,i){return sv.fix&&sv.fix[i];});
  return h+'<div class="card"><h3>Patient survey</h3>'+(svDone?'<div class="tblwrap"><table><tbody><tr><td>Finding the way</td><td><b>'+sv.easy+' out of 5</b></td></tr><tr><td>Waiting felt</td><td><b>'+sv.wait+'</b></td></tr><tr><td>One pass again</td><td><b>'+sv.again+'</b></td></tr><tr><td>To fix</td><td><b>'+(fx.length?fx.join(', '):'Nothing flagged')+'</b></td></tr></tbody></table></div><p class="sub" style="margin-top:8px">'+plural(S.surveys.length,'response')+'. Latest shown.</p>':'<p class="sub">No responses yet. The survey appears on the patient phone when a visit is complete.</p>')+'</div>';
}

VP.component({
  id: "insight", order: 80, staff: true, name: "Analytics", product: "Slot IQ Insight", icon: "stats", title: "Analytics",
  blurb: "Slot IQ Insight. Live numbers from this demo clinic.",
  render: stats
});
})(window.VP);
