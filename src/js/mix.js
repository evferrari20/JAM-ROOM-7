/* =============== MIXING: console strips, sound styles + smart knobs, mastering, Polish assistant =============== */

/* ---------- knob control (drag up/down, double-tap to reset) ---------- */
function knobHTML(id,label,val,min,max,def,fmt){
  var f=(val-min)/(max-min),a0=-135,a=a0+f*270,r=15;
  function pt(deg){var rd=(deg-90)*Math.PI/180;return[18+r*Math.cos(rd),18+r*Math.sin(rd)];}
  var p0=pt(a0),p1=pt(a),large=(a-a0)>180?1:0;
  return'<div class="knob" title="'+(KTIP[id]||label)+'" data-k="'+id+'" data-min="'+min+'" data-max="'+max+'" data-def="'+def+'" data-v="'+val+'" tabindex="0" role="slider" aria-label="'+label+'" aria-valuenow="'+val+'">'+
    '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="kt"/><path class="ka" d="M'+p0[0].toFixed(1)+' '+p0[1].toFixed(1)+' A15 15 0 '+large+' 1 '+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+'"/><circle cx="18" cy="18" r="10.5" class="kc"/><line x1="18" y1="18" x2="'+pt(a)[0].toFixed(1)+'" y2="'+pt(a)[1].toFixed(1)+'" class="kp" transform="translate(0 0)"/></svg>'+
    '<span class="kl">'+label+'</span><span class="kv">'+(fmt?fmt(val):Math.round(val*100))+'</span></div>';
}
var KNOB=null;
var KTIP={warm:'Warmth: darker and cosier, or brighter',space:'Space: more or less reverb and echo',drive:'Drive: grit and punch',move:'Movement: chorus and phaser swirl',eqh:'High EQ (treble)',eqm:'Mid EQ',eql:'Low EQ (bass)',comp:'Compressor: evens out loud and soft notes',rev:'Reverb send',echo:'Echo send (synced to the tempo)',pan:'Pan: left or right'};
document.addEventListener('pointerdown',function(e){
  var k=e.target.closest&&e.target.closest('.knob');if(!k)return;e.preventDefault();
  var now=Date.now();if(k._lt&&now-k._lt<320){setKnob(k,+k.dataset.def,true);k._lt=0;return;}k._lt=now;
  KNOB={k:k,y:e.clientY,v:+k.dataset.v,id:e.pointerId};try{k.setPointerCapture(e.pointerId);}catch(er){}
});
document.addEventListener('pointermove',function(e){
  if(!KNOB||e.pointerId!==KNOB.id)return;var k=KNOB.k,min=+k.dataset.min,max=+k.dataset.max,dv=(KNOB.y-e.clientY)/160*(max-min);
  setKnob(k,Math.max(min,Math.min(max,KNOB.v+dv)),false);
});
document.addEventListener('pointerup',function(){if(KNOB){var k=KNOB.k;KNOB=null;k.dispatchEvent(new CustomEvent('knobdone',{bubbles:true}));}});
document.addEventListener('keydown',function(e){var k=e.target.closest&&e.target.closest('.knob');if(!k)return;var st=(+k.dataset.max-+k.dataset.min)/40;
  if(e.key==='ArrowUp'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();setKnob(k,Math.min(+k.dataset.max,+k.dataset.v+st),true);}
  if(e.key==='ArrowDown'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();setKnob(k,Math.max(+k.dataset.min,+k.dataset.v-st),true);}},true);
function setKnob(k,v,done){
  var min=+k.dataset.min,max=+k.dataset.max;k.dataset.v=v;k.setAttribute('aria-valuenow',v.toFixed(2));
  var tmp=document.createElement('div');tmp.innerHTML=knobHTML(k.dataset.k,'',v,min,max,+k.dataset.def);var svg=tmp.querySelector('svg');k.replaceChild(svg,k.querySelector('svg'));
  k.dispatchEvent(new CustomEvent('knob',{bubbles:true,detail:{id:k.dataset.k,v:v}}));
  if(done)k.dispatchEvent(new CustomEvent('knobdone',{bubbles:true}));
}
function dbFmt(v){return(v>0?'+':'')+v.toFixed(1);}
function panFmt(v){return Math.abs(v)<.03?'C':(v<0?'L':'R')+Math.round(Math.abs(v)*100);}

/* ---------- sound styles ---------- */
/* each: family list, description, base settings: eq [low, mid, high] dB, comp 0-1, fx {...}, rev, echo */
var STYLES={
 'Concert Hall':{f:['keys','strings','orch'],d:'Natural, spacious and clear',eq:[0,0,1],comp:.1,fx:{},rev:.32,echo:0},
 'Vintage Soul Keys':{f:['keys'],d:'Warm tape, slow chorus, cosy room',eq:[2,-1,-2],comp:.25,fx:{tape:.45,chorus:.3},rev:.18,echo:.05},
 'Lo-fi Bedroom':{f:['keys','guitar','synth','drums'],d:'Dusty, dark and squashed',eq:[2,0,-6],comp:.4,fx:{tape:.7},rev:.15,echo:.04},
 'Bright Pop Piano':{f:['keys'],d:'Sparkly, upfront and punchy',eq:[-1,1,3.5],comp:.35,fx:{},rev:.14,echo:0},
 'Dreamy Keys':{f:['keys','synth'],d:'Floating chorus and long echoes',eq:[0,-1,1],comp:.15,fx:{chorus:.6},rev:.4,echo:.25},
 'Stadium Guitar':{f:['guitar'],d:'Big drive, wide echo, arena reverb',eq:[1,2,1],comp:.3,fx:{fuzz:.45},rev:.3,echo:.22},
 'Clean Jangle':{f:['guitar'],d:'Bright chorus shimmer',eq:[-2,0,3],comp:.3,fx:{chorus:.45},rev:.2,echo:.06},
 'Surf Spring':{f:['guitar'],d:'Drippy reverb and slapback',eq:[-1,1,2],comp:.15,fx:{},rev:.5,echo:.18},
 'Bluesy Crunch':{f:['guitar','keys'],d:'Warm overdrive with mid bite',eq:[1,3,-1],comp:.3,fx:{fuzz:.3,tape:.2},rev:.16,echo:.04},
 'Psychedelic':{f:['guitar','synth','keys'],d:'Phaser swirl, fuzz and echoes',eq:[0,1,1],comp:.2,fx:{phaser:.55,fuzz:.35},rev:.3,echo:.3},
 'Round & Deep':{f:['bass'],d:'Warm, full and steady',eq:[3,-1,-3],comp:.5,fx:{},rev:.03,echo:0},
 'Punchy Pick':{f:['bass'],d:'Defined attack that cuts through',eq:[1,3,1],comp:.6,fx:{},rev:.03,echo:0},
 'Dub Bass':{f:['bass'],d:'Huge lows, soft top',eq:[5,-2,-6],comp:.45,fx:{tape:.25},rev:.04,echo:.05},
 'Fuzz Bass':{f:['bass','synth'],d:'Gritty and loud',eq:[2,2,-1],comp:.5,fx:{fuzz:.5},rev:.03,echo:0},
 'Cinematic Hall':{f:['strings','orch','keys','voice'],d:'Grand, wide and warm',eq:[1,-1,1],comp:.15,fx:{},rev:.5,echo:.04},
 'Intimate Chamber':{f:['strings','orch','keys'],d:'Close, woody and natural',eq:[0,1,0],comp:.1,fx:{},rev:.16,echo:0},
 'Silky Pad':{f:['strings','synth','orch'],d:'Soft, wide and smooth',eq:[0,-2,-2],comp:.15,fx:{chorus:.4},rev:.4,echo:.08},
 'Big Band':{f:['brass','winds'],d:'Bold, bright and present',eq:[0,2,2],comp:.35,fx:{},rev:.2,echo:0},
 'Smoky Club':{f:['brass','winds','keys','voice'],d:'Warm, late-night and close',eq:[2,0,-3],comp:.3,fx:{tape:.35},rev:.25,echo:.06},
 'Radio Voice':{f:['voice','winds','brass','keys'],d:'Thin, crunchy old-radio sound',eq:[-8,5,-6],comp:.6,fx:{fuzz:.15},rev:.06,echo:0},
 'Dreamy Pad':{f:['synth','strings'],d:'Chorus, slow phaser, endless space',eq:[0,-1,0],comp:.1,fx:{chorus:.6,phaser:.2},rev:.5,echo:.2},
 'Tape Wobble':{f:['synth','keys','guitar'],d:'Warbly old cassette',eq:[1,0,-4],comp:.3,fx:{tape:.9,chorus:.15},rev:.2,echo:.08},
 '80s Gated':{f:['drums','synth'],d:'Big squashed 80s punch',eq:[1,2,2],comp:.75,fx:{squash:.5},rev:.4,echo:0},
 'Acid Edge':{f:['synth','bass'],d:'Sharp, driven and moving',eq:[0,3,2],comp:.4,fx:{fuzz:.3,phaser:.35},rev:.12,echo:.12},
 'Tight Studio':{f:['drums'],d:'Clean, controlled, short room',eq:[1,0,1.5],comp:.45,fx:{},rev:.1,echo:0},
 'Squashed Lo-fi':{f:['drums'],d:'Crunchy, compressed and dusty',eq:[2,0,-5],comp:.5,fx:{squash:.7,tape:.45},rev:.08,echo:0},
 'Big Room':{f:['drums'],d:'Live and roomy',eq:[1,0,1],comp:.35,fx:{},rev:.38,echo:0},
 'Vintage Break':{f:['drums'],d:'Warm tape and glue',eq:[2,1,-2],comp:.55,fx:{tape:.5},rev:.14,echo:0},
 'Boom Bap':{f:['drums'],d:'Heavy low end, dusty top',eq:[4,-1,-3],comp:.6,fx:{tape:.3},rev:.1,echo:0},
 'Pop Vocal':{f:['voice'],d:'Upfront, polished and bright',eq:[-4,1,3],comp:.6,fx:{},rev:.22,echo:.1},
 'Dreamy Vocal':{f:['voice'],d:'Soft, floating and far away',eq:[-4,-1,2],comp:.35,fx:{chorus:.3},rev:.45,echo:.3},
 'Cathedral Choir':{f:['voice','orch','strings'],d:'Huge stone-church space',eq:[-1,-1,1],comp:.1,fx:{},rev:.7,echo:0},
 'Natural':{f:['keys','guitar','bass','strings','brass','winds','synth','drums','voice','orch'],d:'As recorded, no colour',eq:[0,0,0],comp:0,fx:{},rev:.15,echo:0}
};
function family(t){
  if(t.kind==='drum')return'drums';if(t.kind==='voice')return'voice';var g=INST_GROUP[t.inst]||'';
  return{'Pianos & keys':'keys','Organs & reeds':'keys','Mellotron':'keys','Guitars':'guitar','Bass':'bass','Strings':'strings','Brass':'brass','Woodwinds':'winds','World & folk':'guitar','Mallets & bells':'keys','Voices':'voice','Synths':'synth'}[g]||'keys';
}
function stylesFor(t){var f=family(t);return Object.keys(STYLES).filter(function(n){return STYLES[n].f.indexOf(f)>=0;});}
var MAC={warm:'Warm',space:'Space',drive:'Drive',move:'Move'};
function macroDelta(t){
  var m=t.mac||{warm:.5,space:.5,drive:.5,move:.5},w=m.warm-.5,sp=m.space-.5,dr=m.drive-.5,mv=m.move-.5;
  return{eq:[w*7,0,-w*6+dr*2],comp:dr*.5,rev:sp*.5,echo:Math.max(0,sp*.35),fx:{tape:Math.max(0,w*.6),fuzz:(family(t)==='drums'?0:Math.max(0,dr*.8)),squash:family(t)==='drums'?Math.max(0,dr*.8):0,chorus:Math.max(0,mv*.9),phaser:Math.max(0,mv*.5)}};
}
function clamp01(v){return Math.max(0,Math.min(1,v));}
function styleCompute(t){
  if(!t.sb)return;var b=t.sb,d=macroDelta(t);
  t.eq={l:Math.max(-12,Math.min(12,b.eq[0]+d.eq[0])),m:Math.max(-12,Math.min(12,b.eq[1]+d.eq[1])),h:Math.max(-12,Math.min(12,b.eq[2]+d.eq[2]))};
  t.comp=clamp01(b.comp+d.comp);t.rev=clamp01(b.rev+d.rev);t.echo=clamp01(b.echo+d.echo);
  FXN.forEach(function(n){var v=clamp01((b.fx[n]||0)+(d.fx[n]||0));if(Math.abs((t.fx[n]||0)-v)>1e-3)fxSet(t,n,v);});
  applyMix(t);
}
function applyStyle(t,name){
  var s=STYLES[name];if(!s)return;
  t.style=name;t.sb={eq:s.eq.slice(),comp:s.comp,rev:s.rev,echo:s.echo,fx:Object.assign({},s.fx)};t.mac={warm:.5,space:.5,drive:.5,move:.5};
  styleCompute(t);markDirty();
}
/* manual strip edits change the style's base, so the smart knobs stay relative */
function ensureSb(t){if(!t.sb){t.sb={eq:[t.eq?t.eq.l:-(t.tone||0)*7,t.eq?t.eq.m:0,t.eq?t.eq.h:(t.tone||0)*7],comp:t.comp||0,rev:t.rev,echo:t.echo||0,fx:Object.assign({},t.fx)};t.mac=t.mac||{warm:.5,space:.5,drive:.5,move:.5};}}
function stripSet(t,k,v){
  ensureSb(t);var d=macroDelta(t);
  if(k==='eql')t.sb.eq[0]=v-d.eq[0];else if(k==='eqm')t.sb.eq[1]=v-d.eq[1];else if(k==='eqh')t.sb.eq[2]=v-d.eq[2];
  else if(k==='comp')t.sb.comp=v-d.comp;else if(k==='rev')t.sb.rev=v-d.rev;else if(k==='echo')t.sb.echo=v-d.echo;
  else if(k==='pan'){t.pan=v;applyMix(t);return;}
  else if(MAC[k]){t.mac[k]=v;}
  styleCompute(t);
}

/* ---------- console mixer ---------- */
function stripHTML(t){
  var e=t.eq||{l:-(t.tone||0)*7,m:0,h:(t.tone||0)*7},m=t.mac||{warm:.5,space:.5,drive:.5,move:.5},st=stylesFor(t);
  return'<div class="strip" data-id="'+t.id+'" style="--tc:'+t.color+'">'+
    '<div class="sh"><span class="si">'+tIcon(t)+'</span><b title="'+esc(t.name)+'">'+esc(t.name)+'</b></div>'+
    '<select class="ssel" data-style="'+t.id+'" title="Sound style"><option value="">Sound style…</option>'+st.map(function(n){return'<option'+(t.style===n?' selected':'')+'>'+n+'</option>';}).join('')+'</select>'+
    '<div class="sgrp"><span class="sgl">Smart</span><div class="kgrid">'+Object.keys(MAC).map(function(k){return knobHTML(k,MAC[k],m[k],0,1,.5);}).join('')+'</div></div>'+
    '<div class="sgrp"><span class="sgl">EQ</span><div class="kgrid">'+knobHTML('eqh','High',e.h,-12,12,0,dbFmt)+knobHTML('eqm','Mid',e.m,-12,12,0,dbFmt)+knobHTML('eql','Low',e.l,-12,12,0,dbFmt)+knobHTML('comp','Comp',t.comp||0,0,1,0)+'</div></div>'+
    '<div class="sgrp"><span class="sgl">Sends</span><div class="kgrid">'+knobHTML('rev','Reverb',t.rev,0,1,.15)+knobHTML('echo','Echo',t.echo||0,0,1,0)+knobHTML('pan','Pan',t.pan||0,-1,1,0,panFmt)+'<span></span>'+'</div></div>'+
    '<div class="sfad"><div class="smeter"><i></i><b class="clip" title="Clipped: lower this track. Tap to reset."></b></div><input type="range" class="fader" orient="vertical" data-m="vol" min="0" max="1" step="0.01" value="'+t.vol+'" aria-label="Volume"><span class="sv" data-r="vol">'+Math.round(t.vol*100)+'</span></div>'+
    '<div class="mbtns"><button class="tog" data-m="mute" aria-pressed="'+t.mute+'">M</button><button class="tog" data-m="solo" aria-pressed="'+(S.solo!==null&&S.solo.indexOf(t.id)>=0)+'">S</button></div></div>';
}
function openMixer(){
  ensureAudio();
  var m=mstName();
  var master='<div class="strip master" style="--tc:var(--brass)"><div class="sh"><span class="si">'+IC.speaker+'</span><b>Master</b></div>'+
    '<select class="ssel" id="mxMst" title="Mastering style">'+Object.keys(MASTERS).map(function(k){return'<option value="'+k+'"'+(k===m?' selected':'')+'>'+(k==='off'?'No mastering':MASTERS[k].n+' master')+'</option>';}).join('')+'</select>'+
    '<p class="hint mxd" id="mxMstD">'+MASTERS[m].d+'</p>'+
    '<div class="sfad"><div class="smeter"><i id="mmMaster"></i><b class="clip" id="mmClip"></b></div><input type="range" class="fader" data-m="master" min="0" max="1.2" step="0.01" value="'+S.master+'" aria-label="Master volume"><span class="sv" data-r="mvol">'+Math.round(S.master*100)+'</span></div>'+
    '<button data-x="master" class="mxmb">Mastering &amp; A/B…</button></div>';
  openModal('<h3>Mixer</h3><div class="console">'+S.tracks.map(stripHTML).join('')+master+'</div><div class="row" style="justify-content:space-between"><button data-x="play" id="mxPlay">'+(P.playing?IC.stop+' Stop':IC.play+' Play')+'</button><span class="hint grow">Drag a knob up or down. Double-tap to reset it. Smart knobs work on top of the sound style.</span><button class="primary" data-x="close">Done</button></div>',function(e){
    var b=e.target.closest('button');
    if(e.target.closest('.clip')){e.target.closest('.strip').classList.remove('clipped');return;}
    if(!b)return;
    if(b.dataset.x==='close'){closeModal();return;}
    if(b.dataset.x==='play'){var upd=function(){var pb=$('mxPlay');if(pb)pb.innerHTML=P.playing?IC.stop+' Stop':IC.play+' Play';};if(P.playing){stop();upd();}else start(false).then(upd);return;}
    if(b.dataset.x==='master'){openMastering(true);return;}
    var col=b.closest('.strip'),t=col&&trackById(col.dataset.id);if(!t)return;
    if(b.dataset.m==='mute'){t.mute=!t.mute;b.setAttribute('aria-pressed',t.mute);applyGains();renderHear();markDirty();}
    if(b.dataset.m==='solo'){soloToggle(t.id);document.querySelectorAll('.strip[data-id]').forEach(function(sc){var bb=sc.querySelector('[data-m=solo]');if(bb)bb.setAttribute('aria-pressed',S.solo!==null&&S.solo.indexOf(sc.dataset.id)>=0);});}
  });
  $('mBox').classList.add('wide');mixMeters();
}
$('mBox').addEventListener('knob',function(e){
  var strip=e.target.closest('.strip'),t=strip&&trackById(strip.dataset.id);if(!t)return;
  stripSet(t,e.detail.id,e.detail.v);var kv=e.target.querySelector('.kv');
  if(kv){var id=e.detail.id;kv.textContent=/^eq/.test(id)?dbFmt(e.detail.v):id==='pan'?panFmt(e.detail.v):Math.round(e.detail.v*100);}
  if(MAC[e.detail.id])refreshStrip(strip,t);
});
$('mBox').addEventListener('knobdone',function(){markDirty();});
function refreshStrip(strip,t){
  /* smart knobs move the underlying EQ / comp / sends: update those knobs' drawings */
  var e=t.eq||{l:0,m:0,h:0},vals={eql:e.l,eqm:e.m,eqh:e.h,comp:t.comp||0,rev:t.rev,echo:t.echo||0};
  Object.keys(vals).forEach(function(k){var kn=strip.querySelector('.knob[data-k='+k+']');if(!kn||KNOB&&KNOB.k===kn)return;var tmp=document.createElement('div'),d=kn.dataset;tmp.innerHTML=knobHTML(k,'',vals[k],+d.min,+d.max,+d.def);kn.replaceChild(tmp.querySelector('svg'),kn.querySelector('svg'));kn.dataset.v=vals[k];kn.querySelector('.kv').textContent=/^eq/.test(k)?dbFmt(vals[k]):Math.round(vals[k]*100);});
}
$('mBox').addEventListener('change',function(e){
  if(e.target.dataset.style!=null){var t=trackById(e.target.dataset.style);if(!t||!e.target.value)return;applyStyle(t,e.target.value);var strip=e.target.closest('.strip');strip.outerHTML=stripHTML(t);toast(e.target.value+': '+STYLES[e.target.value].d);return;}
  if(e.target.id==='mxMst'){S.mst=e.target.value;S.fin=S.mst!=='off';applyFin();var d=$('mxMstD');if(d)d.textContent=MASTERS[S.mst].d;markDirty();}
});
function mixMeters(){
  cancelAnimationFrame(MIX.raf);var b1=new Float32Array(512),b2=null;
  (function fr(){
    var box=document.querySelector('#mBox .console');
    if(!box||!$('modal').classList.contains('show')){$('mBox').classList.remove('wide');renderTracks();return;}
    box.querySelectorAll('.strip[data-id]').forEach(function(col){
      var t=trackById(col.dataset.id);if(!t||!t.an)return;t.an.getFloatTimeDomainData(b1);var pk=0;for(var j=0;j<b1.length;j++){var a=Math.abs(b1[j]);if(a>pk)pk=a;}
      lvlBar(col.querySelector('.smeter i'),pk);if(pk>.98)col.classList.add('clipped');
    });
    if(A.an){var n=A.an.fftSize||1024;if(!b2||b2.length!==n)b2=new Float32Array(n);A.an.getFloatTimeDomainData(b2);var pk2=0;for(var q=0;q<b2.length;q++){var a2=Math.abs(b2[q]);if(a2>pk2)pk2=a2;}lvlBar($('mmMaster'),pk2);if(pk2>.98){var mc=document.querySelector('.strip.master');if(mc)mc.classList.add('clipped');}}
    MIX.raf=requestAnimationFrame(fr);
  })();
}

/* ---------- mastering ---------- */
function openMastering(back){
  var cur=mstName(),pick=cur==='off'?'balanced':cur,ab='B';
  function draw(){
    $('mBox').innerHTML='<h3>Master your song</h3><p class="hint">One tap gives the whole song a finished sound. Press play and switch between <b>A</b> (no mastering) and <b>B</b> (your choice) to compare.</p>'+
      '<div class="mcards">'+Object.keys(MASTERS).filter(function(k){return k!=='off';}).map(function(k){return'<button class="mcard" data-mk="'+k+'" aria-pressed="'+(k===pick)+'"><b>'+MASTERS[k].n+'</b><span>'+MASTERS[k].d+'</span></button>';}).join('')+'</div>'+
      '<div class="row abrow"><span class="hint">Compare</span><div class="seg2 ab"><button data-ab="A" aria-pressed="'+(ab==='A')+'">A · Before</button><button data-ab="B" aria-pressed="'+(ab==='B')+'">B · '+MASTERS[pick].n+'</button></div><span class="grow"></span><button data-x="play">'+(P.playing?IC.stop+' Stop':IC.play+' Play')+'</button></div>'+
      '<div class="row" style="justify-content:space-between"><button data-x="none">Remove mastering</button><span class="row"><button data-x="cancel">Cancel</button><button class="primary" data-x="use">Use '+MASTERS[pick].n+'</button></span></div>';
  }
  function hear(){S.mst=ab==='A'?'off':pick;applyFin();}
  openModal('',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.mk){pick=b.dataset.mk;ab='B';hear();draw();return;}
    if(b.dataset.ab){ab=b.dataset.ab;hear();draw();return;}
    var x=b.dataset.x;
    if(x==='play'){if(P.playing){stop();draw();}else start(false).then(draw);return;}
    if(x==='cancel'){revert();leave();return;}
    if(x==='none'){S.mst='off';S.fin=false;applyFin();markDirty();leave();toast('Mastering removed');return;}
    if(x==='use'){S.mst=pick;S.fin=true;applyFin();markDirty();leave();toast(MASTERS[pick].n+' mastering on');}
  });
  function revert(){S.mst=cur;S.fin=cur!=='off';applyFin();}
  function leave(){modalOnClose=null;if(back)openMixer();else closeModal();}
  modalOnClose=revert;
  $('mBox').classList.add('med');draw();hear();
}

/* ---------- Polish: a mix assistant ---------- */
var ROLE_DB={vocal:-17,lead:-19,drums:-17,bass:-19.5,chords:-21.5,color:-23,pad:-24};
var ROLE_PAN={chords:[-.3,.3],pad:[-.42,.42],color:[.25,-.25],lead:[0,0],vocal:[0,0],bass:[0,0],drums:[0,0]};
var ROLE_SPACE={vocal:[.24,.12],lead:[.2,.1],chords:[.18,.04],pad:[.3,.06],color:[.22,.08],bass:[.04,0],drums:[.12,0]};
var ROLE_EQ={vocal:[-4,0,2.5],lead:[-2,1,1.5],chords:[-3,-1,0],pad:[-4,-2,-1],color:[-3,0,1],bass:[1.5,-1,-2],drums:[1.5,-1,1.5]};
var ROLE_COMP={vocal:.55,lead:.3,chords:.2,pad:.12,color:.15,bass:.5,drums:.45};
function polishMix(){
  if(A.off)return;if(P.playing)stop();
  if(!S.tracks.some(function(t){return t.notes.length||(t.takes&&t.takes.length);})){toast('Add some notes first, then polish');return;}
  var snap=function(){return{m:S.master,mst:mstName(),tr:S.tracks.map(function(t){return{id:t.id,vol:t.vol,pan:t.pan||0,rev:t.rev,echo:t.echo||0,eq:t.eq?Object.assign({},t.eq):null,comp:t.comp||0,sb:t.sb?JSON.parse(JSON.stringify(t.sb)):null};})};};
  var before=snap(),plan=null,strength=.8,on={level:true,space:true,clear:true,width:true,glue:true,finish:true},ab='after';
  function restore(s){S.master=s.m;S.mst=s.mst;S.fin=s.mst!=='off';s.tr.forEach(function(o){var t=trackById(o.id);if(!t)return;t.vol=o.vol;t.pan=o.pan;t.rev=o.rev;t.echo=o.echo;t.eq=o.eq;t.comp=o.comp;t.sb=o.sb;applyMix(t);});applyGains();if(A.master)A.master.gain.value=S.master;applyFin();}
  function lerp(a,b){return a+(b-a)*strength;}
  function applyPlan(){
    restore(before);
    if(!plan)return;
    S.tracks.forEach(function(t){
      var p=plan.tr[t.id],o=before.tr.filter(function(x){return x.id===t.id;})[0];if(!p||!o)return;
      if(on.level&&p.vol!=null)t.vol=Math.round(lerp(o.vol,p.vol)*100)/100;
      if(on.width)t.pan=Math.round(lerp(o.pan,p.pan)*100)/100;
      if(on.space){t.rev=lerp(o.rev,p.rev);t.echo=lerp(o.echo,p.echo);}
      if(on.clear){var e0=o.eq||{l:-(t.tone||0)*7,m:0,h:(t.tone||0)*7};t.eq={l:lerp(e0.l,e0.l+p.eq[0]),m:lerp(e0.m,e0.m+p.eq[1]),h:lerp(e0.h,e0.h+p.eq[2])};}
      if(on.glue)t.comp=lerp(o.comp,Math.max(o.comp,p.comp));
      t.sb=null;applyMix(t);
    });
    if(on.finish){S.mst=plan.mst;S.fin=true;S.master=Math.round(lerp(before.m,plan.master)*100)/100;}
    applyGains();if(A.master)A.master.gain.value=S.master;applyFin();
  }
  var CARDS=[['level','Balance the levels','Each part set to a volume that suits its role (vocals and lead forward, pads behind).'],
    ['clear','Clear up the EQ','Trims muddy lows from chords and pads so bass and kick have room; adds air to vocals and leads.'],
    ['width','Spread the stereo','Backing parts placed left and right; bass, drums, lead and vocals stay centred.'],
    ['space','Set the space','Reverb and echo chosen by role: bass dry, vocals and pads roomier.'],
    ['glue','Glue with compression','Gentle compression so parts sit steadily in the mix.'],
    ['finish','Finish the song','Mastering style and overall loudness for the whole song.']];
  function draw(){
    if(!plan){$('mBox').innerHTML='<h3>Polish</h3><p class="hint" id="plMsg">Listening to your song…</p><div class="spin"></div>';return;}
    $('mBox').innerHTML='<h3>Polish your mix</h3><p class="hint">I listened to every part. Here is what I suggest: switch off anything you don\'t want, set how strong it is, and compare before and after while it plays.</p>'+
      '<div class="pcards">'+CARDS.map(function(c){var det=plan.det[c[0]]||'';return'<label class="pc'+(on[c[0]]?' on':'')+'"><input type="checkbox" data-pc="'+c[0]+'"'+(on[c[0]]?' checked':'')+'><span><b>'+c[1]+'</b><small>'+c[2]+'</small>'+(det?'<em>'+det+'</em>':'')+'</span></label>';}).join('')+'</div>'+
      '<label class="shl">Strength <span class="hint">'+Math.round(strength*100)+'%: '+(strength<.4?'subtle':strength<.75?'moderate':'bold')+'</span><input type="range" id="plStr" min="0" max="1" step="0.05" value="'+strength+'"></label>'+
      '<label class="shl">Finish style<select id="plMst">'+Object.keys(MASTERS).filter(function(k){return k!=='off';}).map(function(k){return'<option value="'+k+'"'+(k===plan.mst?' selected':'')+'>'+MASTERS[k].n+': '+MASTERS[k].d+'</option>';}).join('')+'</select></label>'+
      '<div class="row abrow"><span class="hint">Hear</span><div class="seg2 ab"><button data-ab="before" aria-pressed="'+(ab==='before')+'">Before</button><button data-ab="after" aria-pressed="'+(ab==='after')+'">After</button></div><span class="grow"></span><button data-x="play">'+(P.playing?IC.stop+' Stop':IC.play+' Play')+'</button></div>'+
      '<div class="row" style="justify-content:space-between"><button data-x="undo">Undo all</button><button class="primary" data-x="ok">Keep it</button></div>';
  }
  openModal('',function(e){
    var b=e.target.closest('button');
    var cb=e.target.closest('[data-pc]');if(cb){on[cb.dataset.pc]=cb.checked;cb.closest('.pc').classList.toggle('on',cb.checked);if(ab==='after')applyPlan();return;}
    if(!b)return;
    if(b.dataset.ab){ab=b.dataset.ab;if(ab==='before')restore(before);else applyPlan();draw();return;}
    var x=b.dataset.x;
    if(x==='play'){if(P.playing){stop();draw();}else start(false).then(draw);return;}
    if(x==='undo'){modalOnClose=null;restore(before);renderTracks();markDirty();closeModal();toast('Back to how it was');return;}
    if(x==='ok'){modalOnClose=null;if(ab==='before')applyPlan();renderTracks();markDirty();closeModal();toast('Mix polished');}
  });
  $('mBox').classList.add('med');draw();
  modalOnClose=function(){if(!plan){restore(before);return;}if(ab==='before')applyPlan();renderTracks();markDirty();};
  $('mBox').oninput=function(e){if(e.target.id==='plStr'){strength=+e.target.value;var h=e.target.parentNode.querySelector('.hint');if(h)h.textContent=Math.round(strength*100)+'%: '+(strength<.4?'subtle':strength<.75?'moderate':'bold');if(ab==='after')applyPlan();}};
  $('mBox').onchange=function(e){if(e.target.id==='plMst'){plan.mst=e.target.value;if(ab==='after')applyPlan();}};
  /* analysis: measure each part offline, then build the plan */
  (async function(){
    try{
      await Promise.all(S.tracks.filter(function(t){return t.kind==='inst';}).map(function(t){return ensureSamples(t.inst);}).concat([loadDrumKits()]));
      var jobs=[];S.tracks.forEach(function(t){allTakes(t).forEach(function(k){if(k.tune)jobs.push(tuneTake(k));});});await Promise.all(jobs);
      S.tracks.forEach(function(t){allTakes(t).forEach(function(k){takeBuffer(k);});});
      var saveM=S.mst;S.mst='off';applyFin();
      var lev=await measureTracks(function(i,n){var m=$('plMsg');if(m)m.textContent='Listening to part '+i+' of '+n+'…';});
      S.mst=saveM;applyFin();
      var raw={},mx=0,side={},det={level:[],width:[],clear:0,space:0,glue:0};
      S.tracks.forEach(function(t){var l=lev[t.id];if(l==null)return;var r=Math.max(.3,Math.min(3,Math.pow(10,(ROLE_DB[roleOf(t)]-l)/20)));raw[t.id]=t.vol*r;mx=Math.max(mx,raw[t.id]);});
      var sc=mx>.95?.95/mx:1;plan={tr:{},mst:'balanced',master:S.master,det:{}};
      var hasDrums=S.tracks.some(function(t){return t.kind==='drum';}),hasBass=S.tracks.some(function(t){return roleOf(t)==='bass';});
      S.tracks.forEach(function(t){
        var r=roleOf(t),pp=ROLE_PAN[r]||[0,0],k=side[r]=(side[r]||0)+1,pan=Math.abs(t.pan||0)>.05?t.pan:(pp[(k-1)%2]||0);
        var eq=(ROLE_EQ[r]||[0,0,0]).slice();if(r==='bass'&&hasDrums)eq[1]-=1;if(r==='drums'&&hasBass)eq[1]-=.5;
        plan.tr[t.id]={vol:raw[t.id]!=null?Math.max(.06,Math.min(1,raw[t.id]*sc)):null,pan:pan,rev:(ROLE_SPACE[r]||[.15,0])[0],echo:(ROLE_SPACE[r]||[.15,0])[1],eq:eq,comp:ROLE_COMP[r]||.2};
        var p=plan.tr[t.id];if(p.vol!=null&&Math.abs(p.vol-t.vol)>.04)det.level.push(t.name+' '+Math.round(t.vol*100)+'→'+Math.round(p.vol*100));
        if(Math.abs(pan-(t.pan||0))>.05)det.width.push(t.name+' '+panFmt(pan));
      });
      var vibe=S.tracks.some(function(t){return/epiano|wurli|tape/.test(t.inst||'');})?'warm':hasDrums&&hasBass?'punchy':S.tracks.some(function(t){return roleOf(t)==='pad';})?'open':'balanced';
      plan.mst=vibe;
      plan.det={level:det.level.slice(0,4).join(' · ')+(det.level.length>4?' …':''),width:det.width.join(' · '),finish:'Suggested: '+MASTERS[vibe].n};
      /* loudness: render once with the plan applied, aim for a comfortable level */
      applyPlan();
      var OC=window.OfflineAudioContext||window.webkitOfflineAudioContext,L=LEN(),sp=spb(),sr=32000,oc=new OC(2,Math.ceil((.05+L*sp+1.2)*sr),sr),mb=await offRender(oc,1,L,.05,false),ml=levelOf(mb,.05+L*sp);
      if(ml!=null)plan.master=Math.max(.45,Math.min(1.1,S.master*Math.pow(10,(-15-ml)/20)));
      applyPlan();draw();
    }catch(err){modalOnClose=null;restore(before);closeModal();toast('Could not polish this song');console.error(err);}
  })();
}
