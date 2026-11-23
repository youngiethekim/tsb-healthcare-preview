/* Patients: every visit as a line of stops, like a transit map. Search by
   name, booking reference or call number. Each stop shows when the pass was
   scanned at that check-in point. Click a line to open the visit card. */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
var trk='',jAll=false;
function journeys(){ // transit-map view: one line per visit, from how they booked to check-out
  var q=trk.replace(/[^a-z0-9]/gi,'').toUpperCase();
  var ps=S.patients.filter(function(p){return (p.state!=='expected'||p.isMe)&&(!q||(refOf(p)+p.call+(p.name||'')).toUpperCase().replace(/[^A-Z0-9]/g,'').indexOf(q)>=0);}),act=ps.filter(function(p){return p.state!=='finished';}).sort(function(a,b){return (b.isMe?1:0)-(a.isMe?1:0)||(a.arrivedAt||9e9)-(b.arrivedAt||9e9);}),
    fin=ps.filter(function(p){return p.state==='finished';}).sort(function(a,b){return b.finishedAt-a.finishedAt;}).slice(0,3);
  function stop(c,l,t,n,col){return '<div class="js '+c+'"><i class="nd">'+(n||'')+'</i><b'+(col?' style="color:'+col+'"':'')+'>'+l+'</b><small>'+t+'</small></div>';}
  var total=act.length+fin.length,list=jAll||q?act.slice(0,12).concat(fin):act.slice(0,5);
  var rows=list.map(function(p){
    var n=parseInt(p.call.slice(2),10)||0,walk=p.call.charAt(0)==='W',org=p.source||(walk?'Walk-in':p.isMe||n%3?'Online booking':'Clinic referral'),od=p.bookedOn?new Date(p.bookedOn):new Date();if(!p.bookedOn)od.setDate(od.getDate()-(2+n%12));
    var e={};try{e=etas(p);}catch(x){}
    var arrived=p.state!=='expected',done=p.steps.filter(function(s){return s.status==='done';}).sort(function(a,b){return a.start-b.start;}),now=p.steps.filter(function(s){return s.status==='called'||s.status==='in';}),
      todo=p.steps.filter(function(s){return s.status==='todo';}).sort(function(a,b){return (e[a.type]||0)-(e[b.type]||0);}),last=0;
    var h=stop('org',org,walk?'No booking':od.toLocaleDateString('en-CA',{month:'short',day:'numeric'}),'●')+stop(arrived?'done':'next','Check-in',arrived?fmt(p.arrivedAt):fmt((+VP.arriveBy.split(':')[0])*60+(+VP.arriveBy.split(':')[1])),arrived?'✓':'');
    done.forEach(function(s){h+=stop('done',SHORT[s.type],fmt(s.start),'✓',COLD[s.type]);last=Math.max(last,s.end);});
    now.forEach(function(s){h+=stop('cur',SHORT[s.type],s.status==='in'?'Scanned '+fmt(room(p.cur).since):'Called',s.status==='in'?'✓':'',COLD[s.type]);});
    var wnow=!now.length&&p.state==='waiting';
    todo.forEach(function(s,i){var t=e[s.type]!=null?fmt(e[s.type]):'';h+=stop(wnow&&i===0?'cur':'next',SHORT[s.type],wnow&&i===0?'Waiting':t,'');last=Math.max(last,(e[s.type]||0)+TYPES[s.type].dur);});
    if(now.length){var c=room(p.cur),cs=stepOf(p,c.type);last=Math.max(last,c.since+(cs?cs.d:0));}
    h+=p.state==='finished'?stop('out','Check-out',fmt(p.finishedAt),'✓')+'<span class="fb">✉ Feedback sent<small>Short survey, '+fmt(p.finishedAt+1)+'</small></span>':stop('next','Check-out',last?fmt(Math.ceil(last/5)*5):'','');
    var since=Math.max.apply(null,[p.arrivedAt||0].concat(done.map(function(s){return s.end;}))),w=wnow?Math.max(0,Math.round(S.now-since)):0;
    var sub=p.state==='finished'?'Checked out · pass closed':!arrived?'Booked · not arrived yet':now.length?(p.state==='called'?'Called to ':'Now: ')+room(p.cur).name:'Waiting for '+(todo[0]?SHORT[todo[0].type]:'next stop');
    var pill=p.state==='finished'?'<span class="jp ok">Visit complete</span>':!arrived?'<span class="jp">Expected '+VP.arriveBy+'</span>':w>=15?'<span class="jp bad">Waiting '+w+' min</span>':w>=5?'<span class="jp warn">Waiting '+w+' min</span>':'<span class="jp ok">On time</span>';
    if(p.isMe&&U.wrong&&p.state!=='finished')pill='<span class="jp warn">Wrong door '+fmt(U.wrong.t)+' · redirected</span>'+pill;
    return '<div class="jrow'+(p.isMe?' me':'')+'" role="button" tabindex="0" data-a="card" data-v="'+p.id+'"><div class="jid">'+chip(p)+'<b class="jn">'+esc(p.name)+'</b><small class="ref">'+refOf(p)+'</small><small>'+sub+'</small>'+(arrived?'<small class="ar">Arrived '+fmt(p.arrivedAt)+'</small>':'')+'</div><div class="jl">'+h+'</div><div class="jpw">'+pill+'</div></div>';}).join('');
  return '<label class="trk">'+ic('list')+'<span>Find a patient</span><input id="trk" type="search" autocomplete="off" placeholder="First or last name, reference or number" value="'+trk.replace(/"/g,'&quot;').replace(/</g,'&lt;')+'">'+(trk?'<button class="link" data-a="trkx" data-v="">Clear</button>':'')+'</label><div class="legend"><span><i class="lj org"></i>Starts from</span><span><i class="lj done"></i>Scanned in at that stop’s check-in point</span><span><i class="lj cur"></i>Now</span><span><i class="lj next"></i>Next stops, with arrival time</span><span><i class="lj out"></i>Checked out, pass closed</span><span>Yellow ring: the demo patient</span></div><div class="card jcard">'+(rows||'<p class="sub" style="padding:14px 0">'+(trk?'No patient with that name, reference or number today.':'No visits yet.')+'</p>')+(!q&&total>5?'<button class="link jmore" data-a="jall" data-v="">'+(jAll?'Show fewer':'Show all '+total+' patients')+'</button>':'')+'</div>';
}

VP.component({
  id: "journeys", order: 20, staff: true, name: "Patients", product: "Slot IQ Flow", icon: "list", title: "Patients",
  blurb: "Look up a patient by name, booking reference or number. Each visit is a line of stops, as long or short as the visit. Every stop has a check-in point: each scan is logged with the time, so staff know the patient is in the right place. Click a line to open the visit.",
  render: journeys,
  reset: function () { trk = ""; jAll = false; },
  actions: {
    trkx: function () { trk = ""; },
    jall: function () { jAll = !jAll; }
  }
});
document.addEventListener("input", function (e) { if (e.target && e.target.id === "trk") { trk = e.target.value; VP.render(); } });
})(window.VP);
