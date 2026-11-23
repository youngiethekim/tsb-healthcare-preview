/* Slot IQ Flow: the live floor. Three views:
   Live view  the engine drawn live: sources -> one queue -> engine -> rooms -> done
   Board      one card per patient; drag a waiting card onto a room column to
              put that patient next for that type (engine.bump)
   Clinics    every clinic in the organization, worst first, and what needs attention
   Only this site's rooms are live; the other nine clinics are simulated so the
   organization view has something to show. */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
function kcard(p,drag){
  var done=p.steps.filter(function(s){return s.status==='done';}).length,cur=p.cur?room(p.cur):null,st='';
  if(p.state==='called')st='<span class="pill called">Called</span>';
  else if(p.state==='in')st='<span class="pill in">In room · '+Math.floor(S.now-cur.since)+' min</span>';
  else if(p.state==='finished')st='<span class="pill okp">'+mins(p.finishedAt-p.arrivedAt)+'</span>';
  else if(p.bump)st='<span class="pill called">Next · '+SHORT[p.bump]+'</span>';
  var labs=p.state==='finished'?'':p.steps.filter(function(s){return s.status==='todo';}).map(function(s){return '<span class="lab'+(p.state!=='expected'&&lockReason(p,s.type)?' hold':'')+'" style="--lab:'+COL[s.type]+'">'+SHORT[s.type]+'</span>';}).join('');
  return '<div class="kc'+(p.isMe?' me':'')+(p.state==='called'?' calling':'')+'" '+(drag?'draggable="true" ':'')+'tabindex="0" role="button" aria-label="Open visit card '+p.call+'" data-card="'+p.id+'" data-a="card" data-v="'+p.id+'"><div class="kt"><span class="num'+(p.call.charAt(0)==='W'?' w':'')+'">'+p.call+'</span><span class="kp">✓ '+done+'/'+p.steps.length+'</span></div>'+(p.isMe?'<div class="kn">Demo patient</div>':'')+(labs?'<div class="labs">'+labs+'</div>':'')+st+'</div>';
}
var flowMode='cmd',selZ=-1,DEPTS=[CFG.demo.clinicName||'Heart clinic','Lab','Imaging','Orthopaedics','Eye clinic','Maternity','Children’s clinic','Infusion','Physiotherapy','Day surgery'];
function hroom(z,i){ // one of 100 rooms: the heart clinic's six are the live demo rooms, the rest are simulated
  if(z===0&&i<S.rooms.length){var r=S.rooms[i],p=r.pid?patient(r.pid):null,st=p?stepOf(p,r.type):null,pg=r.state==='in'&&st?(S.now-r.since)/st.d:0;
    return {name:r.name,state:r.state,prog:Math.min(1,pg),over:pg>1.15,code:p?p.call:'',left:st?Math.max(0,Math.ceil(st.d-(S.now-r.since))):0,real:r,me:!!(p&&p.isMe),pid:p?p.id:''};}
  var h=hsh(z,i),nm=(z===1?'Bay ':z===2?'Imaging ':z===0?'Clinic room ':'Room ')+(i+1);
  if(h<0.06)return {name:nm,state:'closed',prog:0,code:'',left:0};
  var per=24+Math.floor(h*30),dur=per*(0.45+hsh(i,z)*0.4),T=S.now+h*500,t=T%per,code='B-'+(100+Math.floor(hsh(z+3,i+Math.floor(T/per))*800));
  if(t<2)return {name:nm,state:'called',prog:0,code:code,left:0};
  if(t<2+dur){var g=(t-2)/dur;return {name:nm,state:'in',prog:g,over:hsh(z+5,i)>0.82&&g>0.75,code:code,left:Math.ceil(dur-(t-2))};}
  return {name:nm,state:'free',prog:0,code:'',left:0};
}
function command(){ // Live view: the flow in plain words, what needs attention, then one row per clinic
  var Z=DEPTS.map(function(n,z){var rs=[];for(var i=0;i<10;i++)rs.push(hroom(z,i));
    var w=z===0?S.patients.filter(function(p){return p.state==='waiting';}).length:1+Math.floor(hsh(z,Math.floor(S.now/9))*11);
    return {z:z,n:n,rs:rs,w:w,lw:w?w*2+3:0,free:rs.filter(function(r){return r.state==='free';}).length,over:rs.filter(function(r){return r.over;}).length,me:rs.some(function(r){return r.me;}),
      st:w>=9?'bad':w>=6?'busy':'ok'};});
  var h='<div class="engwrap"><canvas id="eng" role="img" aria-label="Animated Slot IQ engine: patients flow from booking sources into one queue, through the engine, into the six Heart clinic rooms and out to done."></canvas><span class="engcap">'+DEPTS[engZ]+(engZ===0?' · live demo rooms':' · simulated')+'</span></div>';
  h='<div class="csw" role="group" aria-label="Clinics in your organization"><span class="label">Your clinics</span><div class="cswr">'+DEPTS.map(function(n,z){return '<button class="'+(z===engZ?'on':'')+'" data-a="engz" data-v="'+z+'" aria-pressed="'+(z===engZ)+'"><i style="background:'+DCOL[z]+'"></i>'+n+'</button>';}).join('')+'</div></div>'+h;
  if(flowMode==='cmd')return h;
  h='';
  var att=[];
  Z.filter(function(d){return d.st==='bad';}).forEach(function(d){att.push('<button class="att" data-a="selz" data-v="'+d.z+'"><span><b>'+d.n+' is backing up.</b> '+d.w+' people waiting, longest about '+d.lw+' min.</span><em>Open ›</em></button>');});
  Z.forEach(function(d){d.rs.forEach(function(r){if(r.over&&att.length<4)att.push('<button class="att" data-a="selz" data-v="'+d.z+'"><span><b>'+r.name+' in '+d.n+' is running over time.</b> '+r.code+' is still in the room.</span><em>Open ›</em></button>');});});
  h+='<div class="card"><h3>Needs attention'+(att.length?' · '+att.length:'')+'</h3>'+(att.length?att.join(''):'<p class="allok">✓ Everything is running on time.</p>')+'</div>';
  var lab={ok:'On time',busy:'Busy',bad:'Backing up'},rl={free:'Free',called:'Called, on the way','in':'In progress',closed:'Closed'};
  h+='<div class="card"><h3>Clinics · worst first</h3><div class="clist">'+Z.slice().sort(function(a,b){return b.w-a.w;}).map(function(d){
    var open=d.z===selZ,body='';
    if(open)body='<div class="crooms">'+d.rs.map(function(r){
      var act=r.real&&r.state==='called'?btn('roomnext','Patient arrived','way',r.real.id):r.real&&r.state==='in'?btn('roomnext','Check out','primary',r.real.id):'';
      return '<div class="crm '+r.state+(r.over?' over':'')+(r.me?' me':'')+'"><b>'+r.name+'</b><span class="cchip'+(r.code?'':' none')+'">'+(r.code||'—')+'</span><span class="cs">'+(r.state==='in'?(r.over?'Running over time':r.left+' min left'):rl[r.state])+'</span>'+act+'</div>';}).join('')+'</div>';
    return '<div class="crow '+d.st+(open?' open':'')+'"><button class="ch" data-a="selz" data-v="'+(open?-1:d.z)+'" aria-expanded="'+open+'"><i class="lamp"></i><span class="cn2"><b>'+d.n+(d.me?' <em>demo patient here</em>':'')+'</b><small>'+lab[d.st]+' · '+d.w+' waiting'+(d.w?' · longest '+d.lw+' min':'')+' · '+d.free+' rooms free</small></span><span class="wbar"><i style="width:'+Math.min(100,d.w*9)+'%"></i></span><span class="chev">'+(open?'⌄':'›')+'</span></button>'+body+'</div>';}).join('')+'</div></div>';
  return h;
}
var EG={t0:0,prev:null,tok:[],amb:[],last:0,z:0},engZ=0,DCOL=['#e0605e','#4f86e8','#9a63d8','#d98a14','#12a89d','#d4537e','#639922','#378add','#993c1d','#7f77dd'];
function engFrame(ts){
  requestAnimationFrame(engFrame);
  var c=document.getElementById('eng');if(!c||!S.rooms)return;
  var cw=c.clientWidth;if(!cw)return;
  var Z=engZ||0,nr=Z===0?S.rooms.length:10,mob=cw<640,rws=Math.ceil(nr/(mob?3:2)),W=mob?360:1080,H=mob?428+rws*96:380,dpr=Math.min(2,window.devicePixelRatio||1),k=cw/W;
  if(c.width!==Math.round(cw*dpr)||c.height!==Math.round(H*k*dpr)){c.width=Math.round(cw*dpr);c.height=Math.round(H*k*dpr);c.style.height=(H*k)+'px';}
  var x=c.getContext('2d'),still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,t=still?0:ts/1000,dt=Math.min(.1,(ts-EG.last)/1000||0);EG.last=ts;
  x.setTransform(dpr*k,0,0,dpr*k,0,0);x.clearRect(0,0,W,H);
  var F=function(w,z){x.font=w+' '+z+'px "Hanken Grotesk","Segoe UI",system-ui,sans-serif';};
  var RR=function(a,b,w,h,r){x.beginPath();if(x.roundRect)x.roundRect(a,b,w,h,r);else x.rect(a,b,w,h);};
  var NAVY='#0a2740',CY='#4ccbe8',TE='#178099',WAY='#f6c443';
  RR(0,0,W,H,18);x.fillStyle=NAVY;x.fill();
  // layout
  var src=mob?[[48,30],[136,30],[224,30],[312,30]]:[[80,70],[80,150],[80,230],[80,310]],sl=mob?['Online','Assistant','Referral','Walk-in']:['Online booking','AI Assistant','Clinic referral','Walk-in'],sw=mob?80:130;
  var Q=mob?{x:20,y:74,w:320,h:104}:{x:200,y:60,w:210,h:260},core=mob?{x:180,y:246,r:42}:{x:520,y:190,r:54};
  var gp=rws>3?8:12,rh=(332-(rws-1)*gp)/rws,rooms=[];for(var ri=0;ri<nr;ri++){var d=hroom(Z,ri);d.col=d.real?COL[d.real.type]:DCOL[Z];rooms.push(mob?{d:d,k:Z+'|'+ri,x:20+(ri%3)*110,y:318+Math.floor(ri/3)*96,w:100,h:84}:{d:d,k:Z+'|'+ri,x:660+(ri%2)*160,y:24+Math.floor(ri/2)*(rh+gp),w:146,h:rh});}
  var done=mob?{x:180,y:374+rws*96,r:34}:{x:1024,y:190,r:40};
  var qin=mob?[Q.x+Q.w/2,Q.y]:[Q.x,Q.y+Q.h/2],qout=mob?[Q.x+Q.w/2,Q.y+Q.h]:[Q.x+Q.w,Q.y+Q.h/2];
  var rin=function(o){return mob?[o.x+o.w/2,o.y]:[o.x,o.y+o.h/2];},rout=function(o){return mob?[o.x+o.w/2,o.y+o.h]:[o.x+o.w,o.y+o.h/2];};
  var pipe=function(a,b,hot){x.lineCap='round';x.setLineDash([]);x.strokeStyle='rgba(76,203,232,.16)';x.lineWidth=7;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();
    x.setLineDash([3,15]);x.lineDashOffset=-t*46;x.strokeStyle=hot?WAY:'rgba(76,203,232,.75)';x.lineWidth=3;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();x.setLineDash([]);};
  var busy=rooms.filter(function(o){return o.d.state==='in'||o.d.state==='called';}).length*(6/nr);
  src.forEach(function(p){pipe(mob?[p[0],p[1]+14]:[p[0]+sw/2,p[1]],qin);});
  pipe(qout,mob?[core.x,core.y-core.r]:[core.x-core.r,core.y]);
  rooms.forEach(function(o){pipe(mob?[core.x,core.y+core.r]:[core.x+core.r,core.y],rin(o),o.d.state==='called');if(o.d.state==='in'||o.d.state==='called')pipe(rout(o),mob?[done.x,done.y-done.r]:[done.x-done.r,done.y]);});
  // sources
  src.forEach(function(p,i){RR(p[0]-sw/2,p[1]-14,sw,28,14);x.fillStyle='#123249';x.fill();x.strokeStyle='#2a5a78';x.lineWidth=1.5;x.stroke();F(700,mob?11:12.5);x.fillStyle='#d9ecf3';x.textAlign='center';x.textBaseline='middle';x.fillText(sl[i],p[0],p[1]+1);});
  // ambient arrivals
  if(!still&&Math.random()<dt*2.2)EG.amb.push({s:Math.floor(Math.random()*4),u:0});
  EG.amb=EG.amb.filter(function(a){a.u+=dt/1.6;if(a.u>=1)return false;var p=src[a.s],f=mob?[p[0],p[1]+14]:[p[0]+sw/2,p[1]],e=a.u*a.u*(3-2*a.u);x.beginPath();x.arc(f[0]+(qin[0]-f[0])*e,f[1]+(qin[1]-f[1])*e,3.5,0,7);x.fillStyle=CY;x.fill();return true;});
  // queue
  RR(Q.x,Q.y,Q.w,Q.h,14);x.fillStyle='#0f3350';x.fill();x.strokeStyle='#2a5a78';x.lineWidth=1.5;x.stroke();
  var wait=[];if(Z===0)wait=S.patients.filter(function(p){return p.state==='waiting';}).sort(function(a,b){return a.arrivedAt-b.arrivedAt;});else{var wn=1+Math.floor(hsh(Z,Math.floor(S.now/9))*11);for(var wi=0;wi<wn;wi++)wait.push({call:(hsh(Z+1,wi+Math.floor(S.now/9))>.75?'W-':'B-')+(100+Math.floor(hsh(Z*3+wi,Math.floor(S.now/9)+wi)*800)),isMe:false});}
  x.textAlign='left';F(800,14);x.fillStyle='#fff';x.fillText('One queue',Q.x+14,Q.y+20);F(600,12);x.fillStyle='#9fd6e6';x.textAlign='right';x.fillText(wait.length+' waiting',Q.x+Q.w-14,Q.y+20);
  var cols=mob?5:3,chw=(Q.w-28-(cols-1)*6)/cols,max=mob?10:21;
  wait.slice(0,max).forEach(function(p,i){var a=Q.x+14+(i%cols)*(chw+6),b=Q.y+36+Math.floor(i/cols)*28+(still?0:Math.sin(t*2+i)*1.2);RR(a,b,chw,22,6);x.fillStyle=p.isMe?WAY:p.call.charAt(0)==='W'?TE:'#1d4d6b';x.fill();F(700,11.5);x.fillStyle=p.isMe?'#3a2a00':'#fff';x.textAlign='center';x.fillText(p.call,a+chw/2,b+12);});
  // engine core: spinning gear
  var sp=.5+busy*.25,ang=t*sp,teeth=10,R=core.r;
  x.save();x.translate(core.x,core.y);
  x.beginPath();x.arc(0,0,R+12+(still?0:Math.sin(t*3)*3),0,7);x.strokeStyle='rgba(76,203,232,'+(0.18+(still?0:(Math.sin(t*3)+1)*.08))+')';x.lineWidth=6;x.stroke();
  x.rotate(ang);x.beginPath();for(var i=0;i<teeth*2;i++){var a=i*Math.PI/teeth,rr=i%2?R:R-9;x.lineTo(Math.cos(a-.09)*rr,Math.sin(a-.09)*rr);x.lineTo(Math.cos(a+.09)*rr,Math.sin(a+.09)*rr);}x.closePath();x.fillStyle=TE;x.fill();
  x.rotate(-ang*2.3);x.beginPath();for(i=0;i<12;i++){a=i*Math.PI/6;rr=i%2?R-13:R-19;x.lineTo(Math.cos(a-.12)*rr,Math.sin(a-.12)*rr);x.lineTo(Math.cos(a+.12)*rr,Math.sin(a+.12)*rr);}x.closePath();x.fillStyle=CY;x.fill();
  x.restore();x.beginPath();x.arc(core.x,core.y,R-21,0,7);x.fillStyle=NAVY;x.fill();
  F(800,mob?9.5:11);x.fillStyle='#fff';x.textAlign='center';x.fillText('SLOT IQ',core.x,core.y-5);x.fillStyle=CY;x.fillText('ENGINE',core.x,core.y+8);
  // rooms
  rooms.forEach(function(o){var d=o.d,sm=o.h<70;
    RR(o.x,o.y,o.w,o.h,12);x.fillStyle='#123249';x.fill();
    if(d.prog>0){x.save();RR(o.x,o.y,o.w,o.h,12);x.clip();x.fillStyle=d.over?'rgba(224,96,94,.55)':'rgba(23,128,153,.75)';var fh=o.h*d.prog;x.fillRect(o.x,o.y+o.h-fh,o.w,fh);x.fillStyle=d.over?'#ff8f7a':'rgba(76,203,232,.9)';x.fillRect(o.x,o.y+o.h-fh-(still?0:Math.sin(t*4+o.x)*1.5),o.w,2.5);x.restore();}
    x.save();RR(o.x,o.y,o.w,o.h,12);x.clip();x.fillStyle=d.col;x.fillRect(o.x,o.y,o.w,5);x.restore();
    RR(o.x,o.y,o.w,o.h,12);x.lineWidth=d.state==='called'||d.me?3:1.5;x.strokeStyle=d.state==='called'?'rgba(246,196,67,'+(still?1:.55+.45*Math.sin(t*6))+')':d.me?WAY:d.state==='in'?CY:'#2a5a78';x.stroke();
    x.textAlign='left';F(600,mob||sm?10:11.5);x.fillStyle='#9fd6e6';var nm=d.name;while(x.measureText(nm).width>o.w-16&&nm.length>4)nm=nm.slice(0,-2);x.fillText(nm+(nm!==d.name?'…':''),o.x+9,o.y+(sm?16:19));
    F(800,sm?15:mob?17:20);x.fillStyle=d.code?(d.state==='called'?WAY:'#fff'):'#5f8499';x.fillText(d.code||(d.state==='closed'?'Closed':'Free'),o.x+9,o.y+o.h/2+(sm?5:4));
    F(600,sm?10:mob?10.5:12);x.fillStyle=d.state==='called'?WAY:d.over?'#ff8f7a':'#cfe0ea';var stx=d.state==='in'?(d.over?'Over time':d.left+' min left'):d.state==='called'?'On the way':'';
    if(sm){x.textAlign='right';x.fillText(stx,o.x+o.w-9,o.y+o.h/2+5);}else x.fillText(stx,o.x+9,o.y+o.h-13);});
  // done
  var fin=Z===0?S.patients.filter(function(p){return p.state==='finished';}).length:18+Z*4+Math.floor((S.now-CFG.demo.open)/2.5);
  x.beginPath();x.arc(done.x,done.y,done.r,0,7);x.fillStyle='#0f3d33';x.fill();x.strokeStyle='#1aa37a';x.lineWidth=3;x.stroke();
  x.textAlign='center';F(800,22);x.fillStyle='#fff';x.fillText(fin,done.x,done.y-4);F(700,10.5);x.fillStyle='#7fe0bd';x.fillText('DONE',done.x,done.y+14);
  // event tokens: a call travels queue -> engine -> room; a check-out travels room -> done
  var snap={};rooms.forEach(function(o){snap[o.k]={c:o.d.code,me:o.d.me};});
  if(EG.z!==Z){EG.z=Z;EG.prev=null;EG.tok=[];}
  if(EG.prev&&!still)rooms.forEach(function(o){var a=EG.prev[o.k],b=snap[o.k];if(!a)return;
    if(b.c&&b.c!==a.c)EG.tok.push({u:0,pts:[qout,[core.x,core.y],rin(o)],c:b.c,me:b.me,d:1.5});
    if(a.c&&a.c!==b.c)EG.tok.push({u:0,pts:[rout(o),mob?[done.x,done.y-done.r]:[done.x-done.r,done.y]],c:a.c,me:a.me,d:1.1});});
  EG.prev=snap;
  EG.tok=EG.tok.filter(function(k){k.u+=dt/k.d;if(k.u>=1)return false;var n=k.pts.length-1,f=Math.min(n-1e-6,k.u*n),i=Math.floor(f),e=f-i;e=e*e*(3-2*e);var a=k.pts[i],b=k.pts[i+1],px=a[0]+(b[0]-a[0])*e,py=a[1]+(b[1]-a[1])*e;
    x.shadowColor=k.me?WAY:CY;x.shadowBlur=14;RR(px-25,py-11,50,22,7);x.fillStyle=k.me?WAY:'#fff';x.fill();x.shadowBlur=0;F(800,11.5);x.fillStyle=NAVY;x.textAlign='center';x.fillText(k.c,px,py+1);return true;});
}
requestAnimationFrame(engFrame);
function board(){
  var sw='<div class="fsw" role="group" aria-label="View">'+btn('flow','Live view',flowMode==='cmd'?'on':'','cmd')+btn('flow','Board',flowMode==='board'?'on':'','board')+btn('flow','Clinics',flowMode==='clin'?'on':'','clin')+'</div>';
  return sw+(flowMode==='board'?board2():command());
}
function board2(){
  function col(t,n,inner,drop,c,foot){return '<section class="kcol"'+(drop?' data-drop="'+drop+'"':'')+' aria-label="'+t+'"><header><i style="background:'+c+'"></i><b>'+t+'</b><span>'+n+'</span></header><div class="kbody">'+inner+'</div>'+(foot?'<div class="kfoot">'+foot+'</div>':'')+'</section>';}
  var arr=S.patients.filter(function(p){return p.state==='expected'&&(p.isMe||p.dueAt<S.now+25);}).sort(function(a,b){return (a.isMe?-1:a.dueAt)-(b.isMe?-1:b.dueAt);}).slice(0,3);
  var wait=S.patients.filter(function(p){return p.state==='waiting';}).sort(function(a,b){return (a.bump?-1e6:0)+a.arrivedAt-((b.bump?-1e6:0)+b.arrivedAt);});
  var fin=S.patients.filter(function(p){return p.state==='finished';}).sort(function(a,b){return b.finishedAt-a.finishedAt;});
  var tot=0,inr=0;fin.forEach(function(p){tot+=p.finishedAt-p.arrivedAt;p.steps.forEach(function(s){inr+=s.end-s.start;});});
  var h='<div class="grid tiles"><div class="tile"><div class="n">'+wait.length+'</div><span>waiting</span></div><div class="tile"><div class="n">'+(fin.length?Math.round((tot-inr)/fin.length)+' min':'–')+'</div><span>average wait per visit</span></div><div class="tile"><div class="n">'+S.rooms.filter(function(r){return r.state!=='free';}).length+' of '+S.rooms.length+'</div><span>rooms busy</span></div><div class="tile"><div class="n">'+fin.length+'</div><span>visits finished</span></div></div>'+
    '<div class="board">'+col('Arriving',arr.length,arr.map(function(p){return kcard(p,false);}).join(''),'','#9fb1c9')+
    col('Waiting',wait.length,wait.map(function(p){return kcard(p,true);}).join('')||'<div class="slot">Nobody waiting</div>','','#ffc83d');
  ORDER.forEach(function(k){
    var rs=S.rooms.filter(function(r){return r.type===k;}),busy=0;
    var inner=rs.map(function(r){if(r.pid){busy++;return kcard(patient(r.pid),false);}return '<div class="slot">'+r.name+'<br>free</div>';}).join('');
    var q=wait.filter(function(p){return eligible(p,k);}).length;
    h+=col(SHORT[k],busy,inner,k,COL[k],q?q+' in line':'No line');
  });
  h+=col('Done',fin.length,fin.slice(0,3).map(function(p){return kcard(p,false);}).join('')+(fin.length>3?'<div class="slot">+'+(fin.length-3)+' more</div>':''),'','#14b8a6')+'</div>';
  return h+'<div class="legend"><span><span class="lab" style="--lab:#12a89d">ECG</span> still to do</span><span><span class="lab hold">Echo</span> on hold by a rule</span><span><span class="pill called">Called</span> on the way to the room</span><span>Yellow outline: the demo patient</span><span><span class="cchip">B</span> booked · <span class="cchip w">W</span> walk-in</span></div>';
}

VP.component({
  id: "flow", order: 10, staff: true, name: "Slot IQ Flow", product: "Slot IQ Flow", icon: "board", title: "Live floor",
  blurb: "The main engine. Watch patients flow from booking into one queue, through the engine and into rooms. Switch between the clinics in your organization. The Clinics tab lists what needs attention.",
  render: board,
  reset: function () { flowMode = "cmd"; selZ = -1; engZ = 0; },
  onKey: function (e) { // 1-9, 0: jump to a clinic
    if (flowMode === "board" || !/^[0-9]$/.test(e.key) || e.metaKey || e.ctrlKey || e.altKey || (e.target && e.target.tagName === "INPUT")) return false;
    selZ = (+e.key + 9) % 10; engZ = selZ; return true;
  },
  actions: {
    flow: function (v) { flowMode = v; },
    selz: function (v) { selZ = +v; if (selZ >= 0) engZ = selZ; },
    engz: function (v) { engZ = +v; selZ = engZ; }
  }
});
/* Drag a waiting card onto a room column. */
document.addEventListener("dragstart", function (e) {
  var c = e.target.closest && e.target.closest('.kc[draggable="true"]'); if (!c) return;
  VP.drag.id = c.dataset.card; VP.drag.on = true;
  try { e.dataTransfer.setData("text/plain", VP.drag.id); e.dataTransfer.effectAllowed = "move"; } catch (x) {}
});
document.addEventListener("dragover", function (e) { var d = VP.drag.id && e.target.closest && e.target.closest("[data-drop]"); if (d) { e.preventDefault(); d.classList.add("over"); } });
document.addEventListener("dragleave", function (e) { var d = e.target.closest && e.target.closest("[data-drop]"); if (d && !d.contains(e.relatedTarget)) d.classList.remove("over"); });
document.addEventListener("drop", function (e) {
  var d = VP.drag.id && e.target.closest && e.target.closest("[data-drop]"); if (!d) return;
  e.preventDefault(); VP.act.bump(VP.drag.id + "|" + d.dataset.drop);
});
})(window.VP);
