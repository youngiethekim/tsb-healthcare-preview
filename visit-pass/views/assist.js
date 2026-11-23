/* Slot IQ Assist: the AI booking assistant on the patient phone (chat, or a
   phone call read aloud). In this demo the replies are scripted from the live
   visit, where and when only; it never sees results. In production the same
   facts (VP.assist.facts) are given to the assistant as its only context.
   Needs the Digital Visit Pass component (pass). */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
var ASKQ={where:'Where is my next appointment?',how:'How do I get there?',wait:'How long is my wait?',away:'Can I step away?',wc:'Where is the washroom?',results:'What were my results?'};
function concierge(q){ // scripted answers built from the live visit; where and when only
  var m=S.me,meLoc=VP.way.meLoc,dirs=VP.way.dirs,loc=meLoc(m),cur=m.cur?room(m.cur):null,open=m.steps.filter(function(s){return eligible(m,s.type);}),left=m.steps.filter(function(s){return s.status==='todo';});
  function whereIs(s){return TYPES[s.type].name+' is on '+TYPES[s.type].where;}
  if(q==='results')return 'I cannot see results or anything clinical. I only know where your appointments are and when. Your care team will share results with you.';
  if(q==='wc')return 'The nearest washroom is beside the elevator on Level '+loc.level+'. You keep your place in line.';
  if(m.state==='finished')return 'You are all done for today. The exit is on Level 1, past the Check-in Kiosk.';
  if(m.state==='expected')return q==='wait'?'Nothing to wait for yet. Scan your pass at the Check-in Kiosk when you arrive and I will line everything up.':'Start at the Check-in Kiosk at the main entrance, Level 1. One scan checks you in for all '+plural(m.steps.length,'appointment')+'.';
  if(m.state==='called'){var d=dirs(m);return q==='away'?'Not right now. '+cur.name+' is ready for you.':q==='wait'?'No wait. '+cur.name+' is ready for you now.':cur.name+' is on '+TYPES[cur.type].where+', about '+d.walk+' min from the '+loc.name+'. '+d.list.slice(1).map(function(x){return x.t;}).join('. ')+'. The next step is at the top of your screen.';}
  if(m.state==='in')return q==='where'||q==='how'?(left.length?'You are in '+cur.name+' now. After this: '+left.map(whereIs).join('. ')+'. I will guide you when you are called.':'You are in '+cur.name+', your last appointment today.'):'You are with the technician now. I will pick up as soon as this appointment ends.';
  if(open.length){
    var w=open.map(function(s){var e=estWait(m,s.type);return TYPES[s.type].name+(e?' about '+e+' min':' is next');}).join(', ');
    if(q==='wait')return 'Right now: '+w+'. You will be called to whichever comes first.';
    if(q==='away'){var mn=Math.min.apply(null,open.map(function(s){return estWait(m,s.type);}));return mn>=10?'Yes, for a few minutes. Your shortest wait is about '+mn+' min. I will call you on your phone.':'Best to stay close. You could be called within '+Math.max(1,mn)+' min.';}
    return 'You are in line for '+names(open)+'. '+open.map(whereIs).join('. ')+'. Stay in the '+loc.name+' and I will guide you from there when you are called.';
  }
  var why=lockReason(m,left[0].type);
  if(q==='away')return 'Yes. '+TYPES[left[0].type].name+': '+why+'. The café is on Level 2. I will call you when it is time.';
  if(q==='wait')return TYPES[left[0].type].name+' is on hold: '+why+'.';
  return 'Your next stop: '+whereIs(left[0])+'. It is on hold for now: '+why+'. I will guide you there when it opens.';
}

VP.assist = { questions: ASKQ, answer: concierge };
VP.component({
  id: "assist", order: 15, staff: false, name: "AI assistant", product: "Slot IQ Assist", icon: "spark",
  actions: {
    ask: function (v) { if (!S.me) return; var a = concierge(v); U.asks.push({ q: ASKQ[v], a: a }); if (U.callOn) say(a); },
    call: function (v) {
      U.callOn = v === "on";
      if (U.callOn) say("Hi. I booked your visit and I will guide you to each room. What would you like to know?");
      else { try { window.speechSynthesis.cancel(); } catch (e) {} }
    }
  }
});
})(window.VP);
