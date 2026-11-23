/* Visit rules: what must come first. Rules are data in config.js (kinds:
   last, gap, before) and are enforced by engine.js. Switching one here
   changes the calls live. */
(function (VP) {
var K = VP.kit, S = K.S, E = K.E, U = K.U, CFG = K.CFG, store = K.store, TYPES = K.TYPES, ORDER = K.ORDER, COL = K.COL, COLD = K.COLD, CNAME = K.CNAME, SHORT = K.SHORT, LEVEL = K.LEVEL;
var $ = K.$, ic = K.ic, btn = K.btn, names = K.names, plural = K.plural, toast = K.toast, say = K.say, qr = K.qr, chip = K.chip, hsh = K.hsh, esc = K.esc, fmt = K.fmt, mins = K.mins, stepOf = K.stepOf, patient = K.patient, room = K.room, lockReason = K.lockReason, eligible = K.eligible, estWait = K.estWait, etas = K.etas, refOf = K.refOf;
var SITE = esc(CFG.site.name), FIRST = esc(CFG.demo.patientName.split(" ")[0]);
function queue(){
  function rule(R){var on=!!S.rules[R.id];return '<div class="rule"><button class="switch" role="switch" aria-checked="'+on+'" aria-label="'+esc(R.label)+'" data-a="rule" data-v="'+R.id+'"></button><div><b>'+esc(R.label)+'</b><small>'+esc(R.desc)+'</small></div></div>';}
  var h='<div class="card"><h3>Visit rules · '+SITE+'</h3>'+E.RULES.map(rule).join('')+
    '<p class="sub" style="margin-top:6px">Anything without a rule can happen in any order, so the patient goes to whichever room is free first.</p></div>'+
    '<div class="card"><h3>Appointment types today</h3><div class="tblwrap"><table><thead><tr><th>Appointment</th><th>Typical</th><th>Rooms</th><th>Where</th></tr></thead><tbody>';
  ORDER.forEach(function(k){h+='<tr><td>'+TYPES[k].name+'</td><td>'+TYPES[k].dur+' min</td><td>'+S.rooms.filter(function(r){return r.type===k;}).length+'</td><td>'+TYPES[k].where+'</td></tr>';});
  return h+'</tbody></table></div></div>';
}

VP.component({
  id: "rules", order: 70, staff: true, name: "Visit rules", product: "Slot IQ Flow", icon: "queue", title: "Visit rules",
  blurb: "What must come first. Switch a rule off and the calls change live.",
  render: queue,
  actions: { rule: function (v) { store.setRule(v, !S.rules[v]); } }
});
})(window.VP);
