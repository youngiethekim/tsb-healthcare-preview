/* Digital Visit Pass: the patient's phone. One QR code and one call number for
   a whole visit with several appointments. Shows what to do now, the route,
   wait estimates, a map, the timeline of updates and staff messages, settings
   (language, larger text, voice), Apple Wallet, a ride home and the
   end-of-visit survey. The Help tab hosts the AI assistant when "assist" is on.
   Also exposes the wayfinding helpers as VP.way. */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
/* Phone screen state (this device only). */
var notif=null,lastState='',lastRoom='',celebrated=false,feedOpen=false,openRow=null,wal=null,infoOpen=null;
var sv={easy:0,wait:'',again:'',fix:{}};
function svDoneNow(){return !!(S.me&&S.surveys.some(function(x){return x.pid===S.me.id;}));}
function vlink(m){return CFG.site.passBaseUrl+m.token.slice(0,4)+'-'+m.token.slice(4);}
function pushNotif(a,b,k){notif={t:Date.now(),a:a,b:b,k:k};var mine=notif;setTimeout(function(){if(notif===mine){notif=null;VP.render();}},7000);}
var accOpen=null,LOC={English:'en-CA','Français':'fr-CA','中文':'zh-CN','ਪੰਜਾਬੀ':'pa-IN','Español':'es'},LT={
  English:{t:'This is your Digital Visit Pass',n:'Your number today',k:'Yours all day. Scan it at every door.',s:'Scan or tap in',d:'Scan or tap in at the door'},
  'Français':{t:'Voici votre laissez-passer numérique',n:'Votre numéro aujourd’hui',k:'Il est à vous toute la journée. Scannez-le à chaque porte.',s:'Scanner ou toucher pour entrer',d:'Scanner ou toucher à la porte'},
  '中文':{t:'这是您的数字就诊通行证',n:'您今天的号码',k:'全天有效。请在每个门口扫码。',s:'扫码或轻触签到',d:'在门口扫码或轻触'},
  'ਪੰਜਾਬੀ':{t:'ਇਹ ਤੁਹਾਡਾ ਡਿਜੀਟਲ ਵਿਜ਼ਿਟ ਪਾਸ ਹੈ',n:'ਅੱਜ ਤੁਹਾਡਾ ਨੰਬਰ',k:'ਸਾਰਾ ਦਿਨ ਤੁਹਾਡਾ। ਹਰ ਦਰਵਾਜ਼ੇ ’ਤੇ ਸਕੈਨ ਕਰੋ।',s:'ਸਕੈਨ ਕਰੋ ਜਾਂ ਟੈਪ ਕਰੋ',d:'ਦਰਵਾਜ਼ੇ ’ਤੇ ਸਕੈਨ ਜਾਂ ਟੈਪ ਕਰੋ'},
  'Español':{t:'Este es su Pase Digital de Visita',n:'Su número de hoy',k:'Es suyo todo el día. Escanéelo en cada puerta.',s:'Escanear o tocar para entrar',d:'Escanear o tocar en la puerta'}};
var NEEDS=VP.NEEDS;
function passDate(){
  var d=new Date();
  if(U.setg.lang==='ਪੰਜਾਬੀ')return ['ਐਤਵਾਰ','ਸੋਮਵਾਰ','ਮੰਗਲਵਾਰ','ਬੁੱਧਵਾਰ','ਵੀਰਵਾਰ','ਸ਼ੁੱਕਰਵਾਰ','ਸ਼ਨੀਵਾਰ'][d.getDay()]+', '+d.getDate()+' '+['ਜਨਵਰੀ','ਫ਼ਰਵਰੀ','ਮਾਰਚ','ਅਪ੍ਰੈਲ','ਮਈ','ਜੂਨ','ਜੁਲਾਈ','ਅਗਸਤ','ਸਤੰਬਰ','ਅਕਤੂਬਰ','ਨਵੰਬਰ','ਦਸੰਬਰ'][d.getMonth()]+' '+d.getFullYear();
  return d.toLocaleDateString(LOC[U.setg.lang]||'en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
}
function accBar(){
  if(!accOpen)return '';
  var b='<div class="amenu"><div class="aph"><b>Language and accessibility</b><button class="x" data-a="acc" data-v="menu" aria-label="Close settings">✕ Close</button></div><div class="abar" role="group" aria-label="Language and accessibility"><button class="'+(accOpen==='lang'?'on':'')+'" data-a="acc" data-v="lang" aria-expanded="'+(accOpen==='lang')+'">'+ic('globe')+U.setg.lang+'<i class="cv">'+(accOpen==='lang'?'▴':'▾')+'</i></button><button class="'+(U.setg.lg?'on':'')+'" data-a="setg" data-v="lg" aria-pressed="'+!!U.setg.lg+'"><i>Aa</i>Text</button><button class="'+(U.setg.hc?'on':'')+'" data-a="setg" data-v="hc" aria-pressed="'+!!U.setg.hc+'"><i class="hci"></i>Contrast</button><button data-a="readnow" data-v="">'+ic('sound')+'Listen</button>'+NEEDS.map(function(n){return '<button class="'+(U.setg[n[0]]?'on':'')+'" data-a="setg" data-v="'+n[0]+'" aria-pressed="'+!!U.setg[n[0]]+'">'+n[3]+'</button>';}).join('')+'</div>';
  if(accOpen==='lang')b+='<div class="apanel"><div class="aph"><b>Choose your language</b><button class="x" data-a="acc" data-v="lang" aria-label="Close language menu">✕ Close</button></div><div class="cq">'+Object.keys(LT).map(function(l){return btn('lang',l,U.setg.lang===l?'on':'',l);}).join('')+'</div><small class="sub">Sample translation of the pass. The rest of this demo stays in English.</small></div>';
  return b+'</div>';
}
var ride=null,rideOpen=false,RIDES=[['Taxi','Books a taxi for your pickup time and door.'],['Ride share','Opens your Uber or Lyft app with the pickup door set.'],['Accessible transit','A wheelchair-friendly ride. Best booked a day ahead.'],['Family or friend','Texts them your pickup time and door.']];
function rideInfo(m){
  var to=m.state==='expected',e=etas(m),t=0;
  m.steps.forEach(function(s){if(s.status==='todo'&&e[s.type]!=null)t=Math.max(t,e[s.type]+TYPES[s.type].dur);});
  if(m.state==='in'){var c=room(m.cur),cs=stepOf(m,c.type);t=Math.max(t,c.since+cs.d);}
  if(m.state==='finished'||!t)t=S.now+10;
  return {to:to,when:to?VP.arriveBy:fmt(Math.ceil(t/5)*5),label:to?'to the hospital':'home'};
}
function rideBtn(m){
  var r=rideInfo(m);
  return ride?'<button class="ridebtn done" data-a="ride" data-v="">'+ic('car')+'<span><b>✓ Ride '+r.label+': '+ride+'</b><small>'+(r.to?'Arrive by '+r.when:'Pickup about '+r.when)+' · Door A · tap to change</small></span></button>':
    '<button class="ridebtn" data-a="ride" data-v="">'+ic('car')+'<span><b>Arrange a ride '+r.label+'</b></span><i>›</i></button>';
}
function rideSheet(m){
  var r=rideInfo(m);
  return '<div class="wsheet"><div class="rsheet"><div class="aph"><b>Arrange a ride '+r.label+'</b><button class="x" data-a="ridex" data-v="">✕ Close</button></div><p class="sub">'+(r.to?'Your first appointment: arrive by <b>'+r.when+'</b>.':'You should be finished at about <b>'+r.when+'</b> (estimate). We update your pickup time if things change.')+' Main entrance, Door A.</p>'+
    RIDES.map(function(x){return '<button class="need'+(ride===x[0]?' on':'')+'" data-a="ridepick" data-v="'+x[0]+'"><span class="box">'+(ride===x[0]?'✓':'')+'</span><span><b>'+x[0]+'</b><small>'+x[1]+'</small></span></button>';}).join('')+
    (ride?btn('ridepick','Cancel my ride','wide',''):'')+'</div></div>';
}
var CZ='<div class="cz" aria-hidden="true"><figure><svg viewBox="0 0 120 80"><rect x="87" y="48" width="4" height="22" fill="#b9cbd4"/><rect x="77" y="70" width="24" height="4" rx="2" fill="#b9cbd4"/><rect x="70" y="8" width="38" height="40" rx="6" fill="#fff" stroke="#178099" stroke-width="2"/><g fill="#0a2740"><rect x="76" y="14" width="9" height="9"/><rect x="93" y="14" width="9" height="9"/><rect x="76" y="32" width="9" height="9"/><rect x="88" y="26" width="4" height="4"/><rect x="95" y="30" width="4" height="4"/><rect x="92" y="37" width="6" height="4"/></g><polygon class="cz-beam" points="44,36 70,12 70,44" fill="#4ccbe8"/><g class="cz-p1"><rect x="14" y="20" width="28" height="50" rx="6" fill="#0a2740"/><rect x="17" y="25" width="22" height="38" rx="2" fill="#e6f4f8"/><g class="cz-link"><rect x="19" y="28" width="18" height="9" rx="4.5" fill="#178099"/><rect x="22" y="31.5" width="12" height="2" rx="1" fill="#fff"/></g><circle class="cz-tap" cx="28" cy="32.5" r="5" fill="none" stroke="#ffc83d" stroke-width="2.5"/></g></svg><figcaption>Take a photo of the QR code, then tap the link</figcaption></figure><i>or</i><figure><svg viewBox="0 0 120 80"><rect x="58" y="62" width="4" height="12" fill="#b9cbd4"/><rect x="46" y="74" width="28" height="4" rx="2" fill="#b9cbd4"/><rect x="34" y="52" width="52" height="11" rx="5.5" fill="#178099"/><g fill="none" stroke="#4ccbe8" stroke-width="2.5" stroke-linecap="round"><path class="cz-w w1" d="M52 47a10 10 0 0 1 16 0"/><path class="cz-w w2" d="M47 42a17 17 0 0 1 26 0"/></g><g class="cz-p2"><rect x="46" y="0" width="28" height="46" rx="6" fill="#0a2740"/><rect x="49" y="5" width="22" height="34" rx="2" fill="#e6f4f8"/></g><g class="cz-ok"><circle cx="92" cy="26" r="10" fill="#1aa37a"/><path d="M87 26l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg><figcaption>Tap your phone on the NFC spot</figcaption></figure></div>';
var howOpen=false;
function howBox(c,t,d,m){return '<div class="scanhow'+c+(howOpen?' open':'')+'"><button class="shb" data-a="how" data-v="" aria-expanded="'+howOpen+'" aria-label="How to check in"><span class="si">'+ic('qr')+'</span><span class="sht"><b>'+t+'</b><span>'+d+'</span></span><span class="info" aria-hidden="true">'+(howOpen?'×':'i')+'</span></button>'+(howOpen?CZ+'<ol class="hsteps"><li><b>Find the check-in point.</b> A small stand at the entrance and beside each room door.</li><li><b>Take a photo of the QR code and tap the link.</b> Or tap your phone on the NFC spot.</li><li><b>Look for the green tick.</b> Your pass then shows where to go next.</li></ol><p class="sub">No phone with you? Tell staff your number, <b>'+m.call+'</b>.</p>':'')+'</div>';}
function track(){ // the patient's timeline, notifications and the finish celebration
  var m=S.me;if(!m)return;
  if(m.state!==lastState){
    var prev=lastState,c=m.cur?room(m.cur):null,note=function(x,k){(m.feed=m.feed||[]).unshift({t:S.now,x:x,k:k||''});};
    if(prev==='')note('Your visit is booked. Scan in at the main entrance when you arrive.');
    if(prev==='expected'&&m.state!=='expected')note('You scanned in at the main entrance.');
    if(prev==='in'&&m.state!=='in'&&lastRoom)note(lastRoom+' is done.');
    if(m.state==='called')note('Your turn. Go to '+c.name+', '+TYPES[c.type].where+'.','go');
    if(m.state==='in'){note('You scanned in at '+c.name+'. Nothing to do right now.');lastRoom=c.name;}
    if(m.state==='waiting')note(m.steps.some(function(s){return eligible(m,s.type);})?'Wait here. We will call '+m.call+' when a room is ready.':'Break time. We will call you when your next appointment opens.');
    if(m.state==='finished')note('All done. You can go home.');
    lastState=m.state;openRow=null;if(m.state==='called'&&U.setg.ring)pushNotif(m.call+', it is your turn','Go to '+c.name+' · '+TYPES[c.type].where,'call');else if(m.state!=='called'&&notif&&notif.k==='call')notif=null;if(m.state==='called'||U.pscr==='code'||U.pscr==='journey'&&m.state==='finished'){U.pscr='visit';U.dirFor=null;}}
  if(m.state==='finished'&&!celebrated){celebrated=true;K.confetti();}
}
function meLoc(m){ // where the patient physically is
  if(m.state==='expected')return {id:'out',level:1,name:'On the way in'};
  if(m.state==='in')return {id:m.cur,level:LEVEL[m.cur],name:room(m.cur).name};
  var d=m.steps.filter(function(s){return s.status==='done';}).sort(function(a,b){return b.end-a.end;})[0],lv=d?LEVEL[d.room]:1;
  return {id:'w'+lv,level:lv,name:lv===1?'Level 1 waiting area':'Level '+lv+' lounge'};
}
function walkProg(m){ // 0..1 along the way to the called room; beacons confirm each leg
  if(m.state!=='called')return 0;
  var st=stepOf(m,room(m.cur).type),lv=LEVEL[m.cur];
  return Math.min(1,(S.now-st.calledAt)/((meLoc(m).level===lv?1:3)*1.5));
}
function dirs(m){
  var r=room(m.cur),a=meLoc(m),lv=LEVEL[r.id],dept=TYPES[r.type].where.split(', ')[1],pr=walkProg(m);
  var out=[{t:'You are here',d:a.name,ar:'●'}];
  if(a.level!==lv)out.push({t:'Take the elevator to Level '+lv,d:'The elevator beacon confirms the floor',ar:lv>a.level?'↑':'↓'});
  out.push({t:'Follow the signs to '+dept,d:r.name+' is on this corridor',ar:'→'});
  out.push({t:'Scan your Digital Visit Pass at the door',d:r.name,ar:'▣'});
  var k=out.length,curI=k-1;
  out.forEach(function(x,i){x.ok=i===0||(i<k-1&&pr>=i/(k-1));});
  for(var i=0;i<k;i++)if(!out[i].ok){curI=i;break;}
  return {list:out,walk:a.level===lv?1:3,cur:out[curI],curI:curI,left:Math.max(0,Math.ceil((a.level===lv?1:3)*(1-pr)))};
}
var PLACES=CFG.map.places,CORR=CFG.map.corridors;
function dirsTo(m,type){
  var st=stepOf(m,type),r=room(st.room)||S.rooms.filter(function(x){return x.type===type;})[0],lv=LEVEL[r.id],a=m.state==='expected'?{level:1,name:'Main entrance, Door A'}:meLoc(m),dept=TYPES[type].where.split(', ')[1];
  var out=[['You are here',a.name]];
  if(a.level!==lv)out.push(['Take the elevator to Level '+lv,'The elevators are past the waiting area']);
  out.push(['Follow the signs to '+dept,r.name]);out.push(['Scan or tap in at the door','When your code is called']);
  return {room:r,list:out,walk:a.level===lv?1:3};
}
function mapSvg(m,to){
  function pt(id){if(id==='out')return [10,308,1];for(var i=0;i<PLACES.length;i++)if(PLACES[i][0]===id)return [PLACES[i][1]+PLACES[i][3]/2,PLACES[i][2]+PLACES[i][4]/2+10,PLACES[i][6]];}
  var walk=null,here=m?meLoc(m).id:null,dest=to||(!m?null:m.state==='expected'?'kiosk':m.state==='called'?m.cur:null),o='';
  CFG.map.floors.forEach(function(f){o+='<rect class="fl" x="20" y="'+f[1]+'" width="610" height="96" rx="12"/><text class="lv" x="34" y="'+(f[1]+16)+'">'+f[2]+'</text>';});
  o+='<rect class="rm" x="298" y="10" width="44" height="308" rx="8"/><text x="320" y="170" text-anchor="middle" transform="rotate(-90 320 170)">Elevator</text><text x="6" y="296" style="font-size:10px">In</text>';
  PLACES.forEach(function(p){
    var st=m&&room(p[0])?stepOf(m,room(p[0]).type):null;
    var cls='rm'+(p[0]===dest?' dest':p[0]===here?' here':(st&&st.status==='todo'?' todo':''));
    o+='<rect class="'+cls+'" x="'+p[1]+'" y="'+p[2]+'" width="'+p[3]+'" height="'+p[4]+'" rx="8"/><text x="'+(p[1]+p[3]/2)+'" y="'+(p[2]+22)+'" text-anchor="middle">'+p[5]+'</text>';
    if(st&&st.status==='done'&&st.room===p[0])o+='<circle class="tick" cx="'+(p[1]+p[3]-12)+'" cy="'+(p[2]+p[4]-12)+'" r="8"/><text x="'+(p[1]+p[3]-12)+'" y="'+(p[2]+p[4]-8)+'" text-anchor="middle" style="fill:#fff;font-size:10px">✓</text>';
  });
  if(here&&dest){
    var a=pt(here),b=pt(dest),pts=[[a[0],a[1]],[a[0],CORR[a[2]]]];
    if(a[2]!==b[2]){pts.push([320,CORR[a[2]]]);pts.push([320,CORR[b[2]]]);}
    pts.push([b[0],CORR[b[2]]]);pts.push([b[0],b[1]]);
    o+='<polyline class="path" points="'+pts.map(function(p){return p.join(',');}).join(' ')+'"/>';
    if(m.state==='called'&&!to){ // walk the dot along the route
      var tot=0,i,seg=[];for(i=1;i<pts.length;i++){var L=Math.abs(pts[i][0]-pts[i-1][0])+Math.abs(pts[i][1]-pts[i-1][1]);seg.push(L);tot+=L;}
      var go=walkProg(m)*tot;walk=pts[pts.length-1];
      for(i=0;i<seg.length;i++){if(go<=seg[i]){var f=seg[i]?go/seg[i]:0;walk=[pts[i][0]+(pts[i+1][0]-pts[i][0])*f,pts[i][1]+(pts[i+1][1]-pts[i][1])*f];break;}go-=seg[i];}
    }
  }
  CFG.map.beacons.forEach(function(b){o+='<circle class="bcr" cx="'+b[0]+'" cy="'+b[1]+'" r="8"/><circle class="bc" cx="'+b[0]+'" cy="'+b[1]+'" r="4"/>';});
  if(here){var c=walk||pt(here);o+='<circle class="me" cx="'+c[0]+'" cy="'+c[1]+'" r="9"/><text x="'+(c[0]+14)+'" y="'+(c[1]+4)+'" style="font-weight:800">You</text>';}
  return '<svg class="map" viewBox="0 0 640 328" role="img" aria-label="Map of the hospital showing where the patient is and where to go next">'+o+'</svg>';
}
function survey(){ // end-of-visit survey: about the visit, never about care or results
  if(svDoneNow())return '<div class="survey done"><b>Thank you.</b><span>Your answers go to the clinic team to improve the visit. They are not added to your health record.</span></div>';
  function pick(k,opts){return '<div class="chips">'+opts.map(function(o){return btn('sv',o,sv[k]===o?'on':'',k+'|'+o);}).join('')+'</div>';}
  var ready=sv.easy&&sv.wait&&sv.again;
  return '<div class="survey"><b>Quick survey · 4 taps</b>'+
    '<div class="q"><span>1. How easy was it to find your way?</span><div class="faces">'+[1,2,3,4,5].map(function(n){return '<button class="'+(sv.easy===n?'on':'')+'" data-a="sv" data-v="easy|'+n+'" aria-label="'+n+' out of 5">'+n+'</button>';}).join('')+'</div><small class="sub">1 = hard, 5 = very easy</small></div>'+
    '<div class="q"><span>2. How did the waiting feel?</span>'+pick('wait',['Shorter than expected','About right','Too long'])+'</div>'+
    '<div class="q"><span>3. Would you use one pass for a whole visit again?</span>'+pick('again',['Yes','Not sure','No'])+'</div>'+
    '<div class="q"><span>4. Anything we should fix? Optional</span><div class="chips">'+CFG.content.surveyFix.map(function(o,i){return btn('svfix',o,sv.fix[i]?'on':'',String(i));}).join('')+'</div></div>'+
    (ready?btn('svsend','Send my answers','primary wide'):'<small class="sub">Answer the first three to send.</small>')+'</div>';
}
function phone(){
  var m=S.me,h='<div class="ph-bar"><span>'+fmt(S.now)+'</span><i></i><span>5G</span></div><div class="ph-h"><span class="wm">Slot<i>IQ</i></span><span>'+SITE+' '+esc(CFG.site.note)+'</span><button class="gear'+(accOpen?' on':'')+'" data-a="acc" data-v="menu" aria-label="Language and accessibility settings" aria-expanded="'+!!accOpen+'">'+ic('gear')+'</button></div><div class="pscroll" tabindex="0" aria-label="Phone screen, scrolls">'+accBar();
  var T9=LT[U.setg.lang]||LT.English;
  function pic(cls,icn,t,d){return '<div class="now npic '+cls+'"><span class="ni">'+ic(icn)+'</span><div><b>'+t+'</b><span>'+d+'</span></div></div>';}
  if(!m)h+=pic('','clock','No visit yet','Your clinic books your appointments. Your pass will show up here.');
  else if(U.dirFor&&stepOf(m,U.dirFor)){
    var dd=dirsTo(m,U.dirFor),TT=TYPES[U.dirFor];
    h+='<button class="back" data-a="dirfor" data-v="">← Back to my visit</button><h2>'+TT.name+'</h2>'+
      '<div class="addr"><span class="ni">'+ic('pin')+'</span><div><small>Where to go</small><b>'+dd.room.name+'</b><span>'+TT.where+' · '+SITE+'</span><span class="when">About '+dd.walk+' min walk from where you are</span></div></div>'+
      '<ol class="dirs">'+dd.list.map(function(x,i){return '<li><span class="dn">'+(i+1)+'</span><div><b>'+x[0]+'</b><small>'+x[1]+'</small></div></li>';}).join('')+'</ol>'+
      '<div class="grp"><span class="gl">Hospital map · example</span><div class="mapbox">'+mapSvg(m,dd.room.id)+'</div></div>'+
      (m.state==='expected'?'<a class="btn wide gmap" href="'+CFG.site.mapsUrl+'" target="_blank" rel="noopener">'+ic('pin')+'Directions to the hospital in Google Maps</a>':'');
  }
  else if(U.pscr==='code'){
    var need=m.state==='expected'?btn('checkin','Scan or tap in','primary big wide next'):m.state==='called'?btn('menext','Scan or tap in at the door','way big wide next'):'';
    h+='<h2 class="center">My code</h2><div class="bigqr">'+qr(m.token)+'</div><div class="center"><div class="num" style="font-size:44px;line-height:1.1">'+m.call+'</div><p class="sub" style="display:flex;gap:6px;justify-content:center;align-items:center">'+ic('nfc')+'Scan the square, or tap your phone on the reader</p></div>'+
      (need||'<div class="now"><span>'+(m.state==='finished'?'Your visit is finished. This code has expired.':'Nothing to scan right now. We will tell you when.')+'</span></div>')+
      '<p class="sub center">One code for the entrance and every door today. No name or health details are on it.</p>';
  }
  else if(false){
    h+='<h2>How to check in</h2><p class="sub">Do this at the entrance, and again at each room.</p><div class="scanhow big">'+CZ+'</div><ol class="hsteps"><li><b>Find the check-in point.</b> It is a small stand at the entrance and beside each room door.</li><li><b>Take a photo of the QR code and tap the link.</b> Or tap your phone on the NFC spot.</li><li><b>Look for the green tick.</b> Your pass then shows where to go next.</li></ol><p class="sub">No phone with you? Tell staff your number, <b>'+m.call+'</b>.</p>';
  }
  else if(U.pscr==='set'){
    function sw(k,on,t,d){return '<div class="rule"><button class="switch" role="switch" aria-checked="'+on+'" aria-label="'+t+'" data-a="setg" data-v="'+k+'"></button><div><b>'+t+'</b><small>'+d+'</small></div></div>';}
    h+='<h2>Settings</h2>'+sw('lg',U.setg.lg,'Bigger text','Makes everything on this screen larger.')+sw('sound',U.soundOn,'Read my call aloud','Says your number and room when it is your turn.')+sw('ring',U.setg.ring,'Notify me when it is my turn','A notification on this phone when your number is called.')+sw('sms',U.setg.sms,'Text me when it is my turn','A text with your number and the room.')+
      '<div class="grp"><span class="gl">Language</span><div class="cq">'+Object.keys(LT).map(function(l){return btn('lang',l,U.setg.lang===l?'on':'',l);}).join('')+'</div><small class="sub">Sample translation of the pass only.</small></div>'+
      btn('wallet',ic('nfc')+(wal==='added'?'✓ Pass is in Apple Wallet':'Add to Apple Wallet'),'wide'+(wal==='added'?' on':''),'')+btn('copy',ic('lock')+'Copy my visit link to share','wide','')+
      '<p class="sub">'+'This link holds a code and today’s list of rooms. It has no name, no health card number and no health details.</p>';
  }
  else if(U.pscr==='help'){
    if(m)h+=howBox('','How to check in','Take a photo of the QR code, or tap NFC',m);
    if(VP.enabled('assist')){var ASKQ=VP.assist.questions;var tag='<small>'+ic('spark')+'AI Booking Assistant</small>',qs=Object.keys(ASKQ).map(function(k){return btn('ask',ASKQ[k],'',k);}).join(''),lastA=U.asks[U.asks.length-1];
    if(U.callOn)h+='<div class="call"><span class="av">'+ic('spark')+'</span><b>AI Booking Assistant</b><small>On a call · '+esc(CFG.site.assistantPhone)+'</small>'+
        '<p>'+(lastA?'<i>You: '+lastA.q+'</i><br>'+lastA.a:'Hi. I will guide you to each room. What would you like to know?')+'</p>'+btn('call','End call','','off')+'</div>'+
      '<div class="grp"><span class="gl">Say one of these</span><div class="cq">'+qs+'</div></div><p class="sub">The answer is read aloud. Scripted replies for this demo.</p>';
    else h+='<div class="chat"><div class="bub bot">'+tag+'Hi. I will guide you to each room and answer your questions.</div>'+
      U.asks.slice(-2).map(function(x){return '<div class="bub me">'+x.q+'</div><div class="bub bot">'+tag+x.a+'</div>';}).join('')+'</div>'+
      '<div class="cq">'+qs+'</div>'+btn('call',ic('sound')+'Call instead','on wide','on')+'<p class="sub">Or call 604-555-0142 from any phone (demo number). Scripted replies for this demo.</p>';}
  }else{
    // Main page: one list. The step you are on is open and highlighted, with where to go, your status and the code to scan.
    var cur=m.cur?room(m.cur):null,eta=etas(m),auto=null,fin=m.state==='finished';
    if(m.state==='expected')auto='arrive';
    else if(cur)auto=cur.type;
    else if(!fin){
      var op=m.steps.filter(function(s){return eligible(m,s.type);}).sort(function(a,b){return eta[a.type]-eta[b.type];});
      auto=(op[0]||m.steps.filter(function(s){return s.status==='todo';})[0]).type;
    }
    function row(key,name,cls,dot,tm,body){
      var isOpen=body&&(key===auto||key===openRow);
      return '<li class="acc lv-'+cls+(isOpen?' open':'')+'" data-card="s-'+key+'"><div class="ah"'+(body&&key!==auto?' role="button" tabindex="0" data-a="open" data-v="'+key+'" aria-expanded="'+isOpen+'"':'')+'>'+dot+'<b class="grow">'+name+'</b><span class="tm">'+tm+'</span>'+(body?'<span class="chev">'+(isOpen?'⌄':'›')+'</span>':'')+'</div>'+(isOpen?'<div class="ab">'+body+'</div>':'')+'</li>';
    }
    function box(key,pill,pcls,where,action,link){
      return '<div class="abtxt"><span class="pill '+pcls+'">'+pill+'</span><b>'+where[0]+'</b><span>'+where[1]+'</span></div>'+(action||'')+(link||'');
    }
    var gmap='<a class="glink" href="'+CFG.site.mapsUrl+'" target="_blank" rel="noopener">'+ic('pin')+'Directions in Google Maps</a>';
    var rows='';
    if(m.state==='expected')rows+=row('arrive','Arrive and scan in','live','<span class="dot go">→</span>','<small>Arrive by</small>'+VP.arriveBy,
      box('arrive','Scan in when you arrive','called',[''+SITE+'',esc(CFG.site.address)],'',gmap));
    else rows+=row('arrive','Arrive and scan in','done','<span class="dot done">★</span>','Done',null);
    m.steps.forEach(function(s,n){
      var T=TYPES[s.type],r=room(s.room)||S.rooms.filter(function(x){return x.type===s.type;})[0],why=lockReason(m,s.type),t=eta[s.type]!=null?'<small>Arrive by</small>'+fmt(eta[s.type]):'';
      var maplink='<button class="glink" data-a="dirfor" data-v="'+s.type+'">'+ic('pin')+'Map and directions</button>',where=[s.room?r.name:T.name,T.where+' · '+SITE+''];
      if(s.status==='done')rows+=row(s.type,T.name,'done','<span class="dot done">★</span>','Done',null);
      else if(s.status==='called')rows+=row(s.type,T.name,'live','<span class="dot go">→</span>','Now',box(s.type,'Your turn · go now','called',where,'',maplink));
      else if(s.status==='in')rows+=row(s.type,T.name,'live','<span class="dot go">●</span>','Now',box(s.type,'You are here','in',where,'',''));
      else if(m.state==='expected'||why)rows+=row(s.type,T.name,s.type===auto?'next':'lock','<span class="dot hold">'+ic('lock')+'</span>',t,box(s.type,m.state==='expected'?'Opens after you scan in':'Later · '+why.charAt(0).toLowerCase()+why.slice(1),'lock',where,'',maplink));
      else{var w=estWait(m,s.type);rows+=row(s.type,T.name,s.type===auto?'next':'open','<span class="dot ready">'+(n+1)+'</span>',t,box(s.type,'Waiting · '+(w?'about '+w+' min':'you are next'),'ready',[T.name,T.where+' · we will call '+m.call],'',maplink));}
    });
    if(notif)h+='<button class="notif" data-a="notifx" data-v="" aria-label="Dismiss notification"><span class="wm">Slot<i>IQ</i></span><small>now</small><b>'+notif.a+'</b><span>'+notif.b+'</span></button>';
    if(U.pscr==='journey')h+='<h2>My journey</h2><p class="sub">Every stop today, in order. Tap one to see where it is.</p><ul class="steps game">'+rows+'</ul>';
    else if(fin){var st=VP.meStats();h+='<div class="now npic fin"><span class="ni">'+ic('star')+'</span><div><b>All done!</b><span>'+plural(st.n,'appointment')+' in '+mins(st.total)+'. You can go home.</span></div></div>'+rideBtn(m)+survey();}
    else{
      h+='<div class="pass top big"><div class="phd"><b>'+T9.t+'</b><span>'+passDate()+'</span></div><div class="qr">'+qr(m.token)+'</div><div><small>'+T9.n+'</small><div class="cn">'+m.call+'</div><small class="keep">'+T9.k+'</small><small class="pref">Ref '+refOf(m)+'</small>'+(wal==='added'?'<span class="walmini done">'+ic('wallet')+'✓ In Apple Wallet</span>':'<button class="walmini" data-a="wallet" data-v="">'+ic('wallet')+'Add to Apple Wallet</button>')+'</div></div>';
      var how=function(c,t,d){return howBox(c,t,d,m);};
      if(m.state==='expected')h+=how('',T9.s,'At the check-in point by the main entrance');
      else if(m.state==='called')h+=how(' go',T9.d,'At the check-in point for '+cur.name);

      var fd=m.feed||[],f0=fd[0],wh=m.state==='expected'?''+SITE+' · Main entrance, Door A':cur?cur.name+' · '+TYPES[cur.type].where:'';
      var sm=fd.filter(function(e){return e.k==='staff';}),ri=rideInfo(m);
      var trow=function(k,icn,t,n,body){var o=infoOpen===k;return '<button class="trow" data-a="info" data-v="'+k+'" aria-expanded="'+o+'">'+ic(icn)+'<b>'+t+'</b><small>'+n+'</small><span class="chev">'+(o?'⌄':'›')+'</span></button>'+(o?'<ul class="tul">'+body+'</ul>':'');};
      var dirl=m.state==='expected'?'<a class="trow" href="'+CFG.site.mapsUrl+'" target="_blank" rel="noopener">'+ic('pin')+'<b>Directions in Google Maps</b><span class="chev">›</span></a>':cur&&m.state==='called'?'<button class="trow" data-a="dirfor" data-v="'+cur.type+'">'+ic('pin')+'<b>Map and directions</b><span class="chev">›</span></button>':'';
      if(f0)h+='<section class="todo'+(f0.k==='go'?' go':f0.k==='staff'?' staffm':'')+(feedOpen?' open':'')+'"><div class="th" role="button" tabindex="0" data-a="feed" data-v="" aria-expanded="'+feedOpen+'"><div><small>'+(f0.k==='staff'?'Message from staff':'What to do now')+' · '+fmt(f0.t)+'</small><b>'+f0.x+'</b>'+(wh?'<span class="wh">'+ic('pin')+wh+(U.setg.step?' · step-free route':'')+'</span>':'')+'</div><span class="chev">'+(feedOpen?'⌄':'›')+'</span></div>'+
        (feedOpen?'<ol class="feed">'+(fd.length>1?fd.slice(1,9).map(function(e){return '<li><span class="ft">'+fmt(e.t)+'</span><span>'+(e.k==='staff'?'<b>Staff:</b> ':'')+e.x+'</span></li>';}).join(''):'<li><span class="ft"></span><span>Earlier updates will show here.</span></li>')+'</ol>':'')+
        '<div class="tl">'+dirl+
        '<button class="trow" data-a="ride" data-v="">'+ic('car')+'<b>'+(ride?'✓ Ride '+ri.label+': '+ride:'Arrange a ride '+ri.label)+'</b><small>'+(ride?(ri.to?'by '+ri.when:'about '+ri.when):'')+'</small><span class="chev">›</span></button>'+
        trow('bring','list','What to bring',CFG.content.bring.length+' things',CFG.content.bring.map(function(x){return '<li>'+x+'</li>';}).join(''))+
        trow('staff','people','Instructions from staff',(sm.length?sm.length+' new · ':'')+CFG.content.prep.length+' notes',sm.map(function(e){return '<li class="new"><b>'+fmt(e.t)+'</b> '+e.x+'</li>';}).join('')+CFG.content.prep.map(function(x){return '<li>'+x+'</li>';}).join('')+'<li class="src">Written by the clinic that booked your visit.</li>')+
        '</div></section>';
      var nx=m.steps.filter(function(s){return s.status==='todo';}).sort(function(a,b){return eta[a.type]-eta[b.type];})[0];
      h+='<button class="nextl" data-a="pscr" data-v="journey"><span>'+(nx?'<small>'+(cur||m.state==='expected'?'After this':'Next')+'</small><b>'+TYPES[nx.type].name+' · arrive by '+fmt(eta[nx.type])+'</b>':'<small>After this</small><b>That is your last stop today</b>')+'</span><span class="chev">See my journey ›</span></button>';
    }
  }
  h+='</div>';
  if(m)h+='<nav class="pnav" aria-label="Patient link">'+[['visit','Now','qr'],['journey','My journey','list'],['help','Help','spark'],['set','Settings','gear']].map(function(t){return '<button class="'+(U.pscr===t[0]?'on':'')+'" data-a="pscr" data-v="'+t[0]+'">'+ic(t[2])+t[1]+'</button>';}).join('')+'</nav>';
  var demo='';
  if(store.mode!=='demo')demo='';
  else if(store.isAuto())demo='<span class="btn big on">Playing…</span>';
  else if(!m)demo=btn('book','Book the visit','primary big wide next','clerk');
  else if(m.state==='expected')demo=btn('checkin','Patient scans in at the entrance','primary big wide next');
  else if(m.state==='called')demo=btn('menext','Patient scans in at the door','way big wide next');
  else if(m.state==='waiting')demo=btn('skip','Skip the wait','primary big wide next');
  else if(m.state==='in')demo=btn('menext','Technician finishes','primary big wide next');
  else if(m.state==='finished')demo=btn('restart','Start again','big wide');
  fin=m&&m.state==='finished';
  demo='<div class="demo">'+(demo?'<span class="label">Demo control</span>'+demo:'')+(fin||store.mode!=='demo'?'':'<button class="link" data-a="play" data-v="">'+(store.isAuto()?'Stop and take over':'Or watch it play by itself')+'</button>')+'</div>';
  return '<span class="label">The patient’s phone</span><div class="phone'+(U.setg.lg?' lg':'')+(U.setg.hc?' hc':'')+(U.setg.flash&&notif&&notif.k==='call'?' flash':'')+'">'+h+(rideOpen&&m?rideSheet(m):'')+(wal==='sheet'&&m?'<div class="wsheet"><div class="wcard"><div class="wtop"><span class="wm">Slot<i>IQ</i></span><span>Digital Visit Pass</span></div><div class="wrow"><div><small>Date</small><b>'+new Date().toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})+'</b></div><div><small>Your number</small><b>'+m.call+'</b></div></div><div class="wrow"><div><small>Where</small><b>'+SITE+'</b></div><div><small>Reference</small><b style="font-size:14px">'+refOf(m)+'</b></div></div><div class="qr">'+qr(m.token)+'</div><small class="wn">'+ic('nfc')+'Hold near reader to tap in · no name on this pass</small></div><div class="wact">'+btn('walletx','Cancel','','')+btn('walletadd','Add','primary','')+'</div></div>':'')+'</div>'+demo;
}

VP.way = { meLoc: meLoc, dirs: dirs, dirsTo: dirsTo, mapSvg: mapSvg };
VP.notify = pushNotif;
VP.onFirstClick = function () { // browsers only play sound after a tap
  if (!VP.audio) { try { VP.audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (x) {} }
  if (VP.audio && VP.audio.state === "suspended") { try { VP.audio.resume(); } catch (x) {} }
};
VP.component({
  id: "pass", order: 5, staff: false, name: "Digital Visit Pass", product: "Slot IQ Arrive", icon: "phone", title: "Digital Visit Pass",
  blurb: "",
  render: phone,
  before: track,
  scrollKey: function () { return U.pscr + "|" + (U.dirFor || "") + "|" + (S.me ? S.me.state + (S.me.cur || "") : ""); },
  after: function (el) { var cz = el.querySelector(".cz"); if (cz) cz.style.setProperty("--sd", (-(performance.now() / 1000 % 4)).toFixed(2) + "s"); },
  reset: function () { notif = null; lastState = ""; lastRoom = ""; celebrated = false; feedOpen = false; openRow = null; wal = null; infoOpen = null; ride = null; rideOpen = false; howOpen = false; accOpen = null; sv = { easy: 0, wait: "", again: "", fix: {} }; },
  actions: {
    dirfor: function (v) { U.dirFor = v || null; },
    notifx: function () { notif = null; },
    feed: function () { feedOpen = !feedOpen; },
    open: function (v) { openRow = openRow === v ? null : v; },
    info: function (v) { infoOpen = infoOpen === v ? null : v; },
    pscr: function (v) { U.dirFor = null; if (U.pscr === "help" && v !== "help" && U.callOn) { U.callOn = false; try { window.speechSynthesis.cancel(); } catch (e) {} } U.pscr = v; },
    setg: function (v) { if (v === "sound") { U.soundOn = !U.soundOn; if (U.soundOn) say("Voice is on."); } else U.setg[v] = !U.setg[v]; },
    lang: function (v) { U.setg.lang = v; accOpen = null; },
    acc: function (v) { if (v === "menu") accOpen = accOpen ? null : "menu"; else accOpen = accOpen === "lang" ? "menu" : "lang"; },
    how: function () { howOpen = !howOpen; },
    ride: function () { rideOpen = true; },
    ridex: function () { rideOpen = false; },
    ridepick: function (v) { ride = v || null; rideOpen = false; toast("<span>" + (v ? v + " arranged (simulated in this demo)." : "Ride cancelled.") + "</span>"); },
    readnow: function () { var m = S.me; if (!m) return; var f = (m.feed || [])[0]; say("This is your Digital Visit Pass. Your number is " + m.call.split("").join(" ") + ". " + (f ? f.x : "")); toast("<span>Reading this screen aloud.</span>"); },
    copy: function () {
      var l = vlink(S.me), ok = function () { toast("<span>Link copied. Anyone with it can follow this visit.</span>"); };
      try { navigator.clipboard.writeText(l).then(ok, function () { toast("<span>Copy this link: " + l + "</span>"); }); } catch (e) { toast("<span>Copy this link: " + l + "</span>"); }
    },
    wallet: function () { if (wal !== "added") wal = "sheet"; },
    walletx: function () { wal = null; },
    walletadd: function () { wal = "added"; toast("<span>Pass added to Apple Wallet (simulated in this demo).</span>"); },
    sv: function (v) { var a = v.split("|"); sv[a[0]] = a[0] === "easy" ? +a[1] : a[1]; },
    svfix: function (v) { sv.fix[v] = !sv.fix[v]; },
    svsend: function () { if (S.me) store.survey(S.me.id, JSON.parse(JSON.stringify(sv))); }
  }
});
})(window.VP);
