/* =============== Sound & effects (one panel per track) ===============
   Pick a sound style made for this kind of instrument, or a ready-made effect chain, hear it straight
   away on a short phrase, then fine-tune every effect with sliders. Opened from the editor toolbar
   ("Sound") and from each track card. */
var SND={tab:'styles'};
function soundName(t){
  if(t.style)return t.style;
  var on=FXN.filter(function(n){return(t.fx[n]||0)>.001;});
  if(!on.length)return'Natural';
  for(var p in FX_PRESETS){var q=FX_PRESETS[p],same=FXN.every(function(n){return Math.abs((q[n]||0)-(t.fx[n]||0))<.02;});if(same)return p;}
  return'Custom effects';
}
/* a short phrase in the song's key so every choice can be heard at once */
function soundPreview(t){
  ensureAudio();ensureHeard(t);var c=A.c,t0=c.currentTime+.06,sp=Math.min(.32,spb()/2);
  if(t.kind==='drum'){[[0,0],[3,0],[2,1],[3,1],[0,2],[0,2.5],[3,2],[2,3],[3,3]].forEach(function(h){drum(c,t.node,h[0],t0+h[1]*sp*2,.85,t.kit);});return;}
  if(t.kind==='voice'){toast('Effects on a voice track are heard when its takes play');return;}
  var ensure=ensureSamples(t.inst);(ensure&&ensure.then?ensure:Promise.resolve()).then(function(){
    var base=12*(S.oct+1)+S.key,sc=SCALES[S.scale]||[0,2,4,5,7,9,11],t1=A.c.currentTime+.06;
    [0,2,4,7,4,2].forEach(function(d,i){var m=base+sc[d%sc.length]+12*Math.floor(d/sc.length);var h=trackPlay(t,m,t1+i*sp,.8);h.release(t1+i*sp+sp*.9);});
    [0,2,4].forEach(function(d){var m=base-12+sc[d];var h=trackPlay(t,m,t1+6*sp,.7);h.release(t1+6*sp+sp*3);});
  });
}
function openSound(t){
  if(!t)return;
  function fxOf(p){return FXN.filter(function(n){return(FX_PRESETS[p][n]||0)>.001;}).map(function(n){return FXLAB[n];}).concat(FX_PRESETS[p].rev>.4?['Big reverb']:[]);}
  function card(kind,name,desc,tags,on){return'<button class="sndc'+(on?' on':'')+'" data-'+kind+'="'+esc(name)+'"><b>'+esc(name)+'</b><span>'+esc(desc)+'</span>'+(tags&&tags.length?'<small>'+tags.map(esc).join(' · ')+'</small>':'')+'</button>';}
  function sl(key,label,val,min,max,tip){return'<label class="sndsl" title="'+esc(tip||'')+'"><span>'+label+'</span><input type="range" data-snd="'+key+'" min="'+min+'" max="'+max+'" step="0.01" value="'+val+'"><em data-sv="'+key+'"></em></label>';}
  function draw(){
    var cur=soundName(t),h='<div class="sndh"><div><h3>Sound &amp; effects</h3><p class="hint">'+esc(t.name)+' · now: <b class="sndnow">'+esc(cur)+'</b></p></div><button class="primary" data-x="prev">'+IC.play+' Hear it</button></div>'+
      '<div class="seg2 sndtabs">'+[['styles','Sound styles'],['effects','Effects'],['fine','Fine-tune']].map(function(o){return'<button data-tab="'+o[0]+'" aria-pressed="'+(SND.tab===o[0])+'">'+o[1]+'</button>';}).join('')+'</div>';
    if(SND.tab==='styles'){var st=stylesFor(t);
      h+='<p class="hint">Complete sounds made for '+({keys:'keyboards',guitar:'guitars',bass:'bass',strings:'strings',brass:'brass',winds:'woodwinds',synth:'synths',drums:'drums',voice:'voices',orch:'orchestra'}[family(t)]||'this instrument')+': tone, compression, effects and space together. The Warm, Space, Drive and Move knobs in the Mixer then bend the chosen style.</p>'+
        '<div class="sndgrid">'+st.map(function(n){return card('st',n,STYLES[n].d,null,t.style===n);}).join('')+'</div>';}
    else if(SND.tab==='effects'){
      h+='<p class="hint">Effect chains that work on any instrument or voice. Tap one to hear it; fine-tune it in the next tab.</p><div class="sndgrid">'+Object.keys(FX_PRESETS).map(function(p){return card('fx',p,FX_PRESETS[p].d||'',fxOf(p),!t.style&&cur===p);}).join('')+'</div>';}
    else{
      h+='<div class="sndfine"><div class="sndcol"><h4>Space and place</h4>'+sl('rev','Reverb',t.rev||0,0,1,'How much room sound')+sl('echo','Echo',t.echo||0,0,1,'Tempo-synced echo on the shared echo bus')+sl('pan','Pan',t.pan||0,-1,1,'Left or right')+sl('tone','Tone',t.eq?Math.max(-1,Math.min(1,(t.eq.h-t.eq.l)/14)):(t.tone||0),-1,1,'Darker or brighter')+'</div>'+
        '<div class="sndcol"><h4>Effects</h4>'+FXN.map(function(n){return sl('fx:'+n,FXLAB[n],t.fx[n]||0,0,1,FXTIP[n]);}).join('')+'</div></div>'+
        '<div class="row"><button data-x="reset">Turn all effects off</button></div>';}
    h+='<div class="row" style="justify-content:flex-end"><button class="primary" data-x="close">Done</button></div>';
    var box=$('mBox');box.innerHTML=h;vals();
  }
  function vals(){$('mBox').querySelectorAll('[data-sv]').forEach(function(e){var k=e.dataset.sv,inp=$('mBox').querySelector('[data-snd="'+k+'"]'),v=+inp.value;e.textContent=k==='pan'?panFmt(v):k==='tone'?(v>0?'+':'')+Math.round(v*100):Math.round(v*100)+'%';});}
  function now(){var el=$('mBox').querySelector('.sndnow');if(el)el.textContent=soundName(t);}
  var pv=null;function later(){clearTimeout(pv);pv=setTimeout(function(){soundPreview(t);},120);}
  openModal('<div></div>',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.tab){SND.tab=b.dataset.tab;draw();return;}
    if(b.dataset.x==='close'){closeModal();return;}
    if(b.dataset.x==='prev'){soundPreview(t);return;}
    if(b.dataset.x==='reset'){t.style=null;t.sb=null;FXN.forEach(function(n){fxSet(t,n,0);});markDirty();draw();renderTracks();toast('Effects off');return;}
    if(b.dataset.st){applyStyle(t,b.dataset.st);renderTracks();draw();later();return;}
    if(b.dataset.fx){var p=FX_PRESETS[b.dataset.fx];t.style=null;t.sb=null;FXN.forEach(function(n){fxSet(t,n,p[n]||0);});t.rev=p.rev!=null?p.rev:(t.kind==='voice'?.25:.15);applyMix(t);if(t.send)t.send.gain.value=t.rev;markDirty();renderTracks();draw();later();return;}
  });
  var box=$('mBox');box.classList.add('wide','sndbox');
  box.oninput=function(e){var k=e.target.dataset&&e.target.dataset.snd;if(!k)return;var v=+e.target.value;
    if(k.slice(0,3)==='fx:'){var n=k.slice(3);fxSet(t,n,v);if(t.sb)t.sb.fx[n]=v-(macroDelta(t).fx[n]||0);}
    else if(k==='rev'){if(t.sb)stripSet(t,'rev',v);else{t.rev=v;if(t.send)t.send.gain.value=v;}}
    else if(k==='echo'){if(t.sb)stripSet(t,'echo',v);else{t.echo=v;if(t.dsend)t.dsend.gain.value=v;}}
    else if(k==='pan'){t.pan=v;applyMix(t);}
    else if(k==='tone'){if(t.eq){stripSet(t,'eql',-v*7);stripSet(t,'eqh',v*7);}else{t.tone=v;applyMix(t);}}
    markDirty();vals();now();};
  box.onchange=function(e){if(e.target.dataset&&e.target.dataset.snd){renderTracks();later();}};
  draw();
}
/* ---------- the same controls as an always-available panel above the note grid (live while playing) ---------- */
try{SND.open=localStorage.getItem('jr-sndp')!=='0';}catch(e){SND.open=true;}
function sndPanelHTML(t){
  if(!SND.open)return'';
  var cur=soundName(t),st=stylesFor(t);
  function chip(kind,name,on,tip){return'<button class="schip'+(on?' on':'')+'" data-'+kind+'="'+esc(name)+'" title="'+esc(tip||'')+'">'+esc(name)+'</button>';}
  function sl(key,label,val,min,max,tip){return'<label class="ssl" title="'+esc(tip||'')+'"><span>'+label+'</span><input type="range" data-snd="'+key+'" min="'+min+'" max="'+max+'" step="0.01" value="'+val+'"></label>';}
  return'<div class="sndpanel" id="sndPanel">'+
    '<div class="sprow"><b class="splab">Effects</b>'+Object.keys(FX_PRESETS).map(function(p){return chip('sfx',p,!t.style&&cur===p,FX_PRESETS[p].d);}).join('')+'</div>'+
    (st.length?'<div class="sprow"><b class="splab">Styles</b>'+st.map(function(n){return chip('sst',n,t.style===n,STYLES[n].d);}).join('')+'</div>':'')+
    '<div class="spsl">'+sl('rev','Reverb',t.rev||0,0,1,'Room sound')+sl('echo','Echo',t.echo||0,0,1,'Echo on the shared echo bus')+
      FXN.map(function(n){return sl('fx:'+n,FXLAB[n],t.fx[n]||0,0,1,FXTIP[n]);}).join('')+
      '<button class="sm" data-x="sndoff" title="Turn every effect off">All off</button></div></div>';
}
function sndRefresh(t){var p=$('sndPanel');if(p)p.outerHTML=sndPanelHTML(t);var b=$('sndBtn');if(b){var nb=b.querySelector('b');if(nb)nb.textContent=soundName(t);}}
function sndApplyKey(t,k,v){
  if(k.slice(0,3)==='fx:'){var n=k.slice(3);fxSet(t,n,v);if(t.sb)t.sb.fx[n]=v-(macroDelta(t).fx[n]||0);}
  else if(k==='rev'){if(t.sb)stripSet(t,'rev',v);else{t.rev=v;if(t.send)t.send.gain.value=v;}}
  else if(k==='echo'){if(t.sb)stripSet(t,'echo',v);else{t.echo=v;if(t.dsend)t.dsend.gain.value=v;}}
  markDirty();
}
$('editor').addEventListener('click',function(e){
  var b=e.target.closest('#sndPanel button');if(!b)return;var t=selTrack();if(!t)return;
  if(b.dataset.sfx){var p=FX_PRESETS[b.dataset.sfx];t.style=null;t.sb=null;FXN.forEach(function(n){fxSet(t,n,p[n]||0);});t.rev=p.rev!=null?p.rev:(t.kind==='voice'?.25:.15);applyMix(t);markDirty();renderTracks();sndRefresh(t);if(!P.playing)soundPreview(t);toast(b.dataset.sfx+': '+(p.d||''));return;}
  if(b.dataset.sst){applyStyle(t,b.dataset.sst);renderTracks();sndRefresh(t);if(!P.playing)soundPreview(t);toast(b.dataset.sst+': '+STYLES[b.dataset.sst].d);return;}
  if(b.dataset.x==='sndoff'){t.style=null;t.sb=null;FXN.forEach(function(n){fxSet(t,n,0);});markDirty();renderTracks();sndRefresh(t);toast('Effects off');}
});
$('editor').addEventListener('input',function(e){var k=e.target.dataset&&e.target.dataset.snd;if(!k||!e.target.closest('#sndPanel'))return;var t=selTrack();if(t)sndApplyKey(t,k,+e.target.value);var b=$('sndBtn');if(b&&t){var nb=b.querySelector('b');if(nb)nb.textContent=soundName(t);}});
$('editor').addEventListener('change',function(e){if(e.target.dataset&&e.target.dataset.snd&&e.target.closest('#sndPanel')){renderTracks();var t=selTrack();if(t)sndRefresh(t);}});
