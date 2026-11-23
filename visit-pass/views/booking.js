/* Slot IQ Book: the booking clerk books every appointment on a request form
   as one visit with one pass. In production this is the existing booking
   flow; the only new step is POST /visits with the list of types. */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
function initials(n){return n.split(" ").map(function(w){return w.charAt(0);}).join("").slice(0,2).toUpperCase();}
function note(){ // "10 min · after Cardiogram", built from the visit rules
  var o={};ORDER.forEach(function(k){o[k]=TYPES[k].dur+' min';});
  E.RULES.forEach(function(R){if(R.kind==='before')o[R.then]+=' · after '+TYPES[R.first].name;if(R.kind==='last')o[R.type]+=' · last, after the tests';});
  return o;
}
function clerk(){
  var m=S.me,n=ORDER.filter(function(k){return U.sel[k];}).length;
  if(m)return '<div class="card"><h3>Visit booked for '+esc(m.name)+'</h3><div class="now npic fin"><span class="ni">'+ic('check')+'</span><div><b>'+plural(m.steps.length,'appointment')+', one visit, one pass</b><span>'+(U.bookedBy==='clerk'?'Booked by the booking clerk. Pass sent by text.':U.bookedBy==='ai'?FIRST+' booked this with the AI Booking Assistant.':FIRST+' booked this with Online Booking.')+'</span></div></div>'+
    '<ul class="steps" style="margin-top:10px">'+m.steps.map(function(s){return '<li><span class="dot'+(s.status==='done'?' done':'')+'">'+(s.status==='done'?'✓':m.steps.indexOf(s)+1)+'</span><div><b>'+TYPES[s.type].name+'</b><small>'+TYPES[s.type].where+'</small></div></li>';}).join('')+'</ul><p class="sub">Call number '+m.call+'. Follow this visit on the Flow Board.</p>'+(m.state==='expected'?btn('unbook','Change the appointments','',''):'')+'</div>';
  var notes=note();
  return '<div class="card"><h3>Book a visit for a patient</h3><div class="mini" style="margin-bottom:12px"><span class="num">'+initials(CFG.demo.patientName)+'</span><span><b>'+esc(CFG.demo.patientName)+'</b><br>Request form received from the clinic</span></div>'+
    '<p class="sub" style="margin-bottom:8px">Tick what is on the request form. Slot IQ puts them in a workable order.</p><div class="list">'+
    ORDER.map(function(k){return '<button class="opt" role="checkbox" aria-checked="'+(!!U.sel[k])+'" data-a="sel" data-v="'+k+'"><span class="box">'+(U.sel[k]?'✓':'')+'</span><span><b>'+TYPES[k].name+'</b><small>'+notes[k]+' · '+TYPES[k].where+'</small></span></button>';}).join('')+
    '</div><p class="sub" style="margin:10px 0">'+plural(n,'appointment')+' · one arrival today at '+VP.arriveBy+' · one Digital Visit Pass</p>'+(n?btn('book','Book the visit and text the pass','primary big next','clerk'):'<p class="sub">Tick at least one appointment.</p>')+'</div>';
}

VP.component({
  id: "booking", order: 30, staff: true, name: "Booking", product: "Slot IQ Book", icon: "cal", title: "Book a visit",
  blurb: "Booking clerks (or patients online) book every appointment on the request form as one visit. Slot IQ puts them in a workable order and sends one pass.",
  render: clerk,
  actions: {
    sel: function (v) { U.sel[v] = !U.sel[v]; },
    unbook: function () { store.unbook(); }
  }
});
})(window.VP);
