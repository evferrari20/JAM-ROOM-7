/* =============== AUTOMATION: volume, pan, reverb and filter that change over time =============== */
/* Each part of the song keeps its own lanes: t.auto = {vol:[[beat,value],...], pan:..., rev:..., cut:...}
   Values are 0..1. Volume is a percentage of the mixer fader, so the mixer and Polish keep working. */
var AUTO_LANES={
  vol:{n:'Volume',top:'100%',bot:'silent'},
  pan:{n:'Pan',top:'right',bot:'left'},
  rev:{n:'Reverb',top:'wet',bot:'dry'},
  cut:{n:'Filter',top:'open',bot:'muffled'}
};
var AUTO_SHAPES={
  vol:[['fadein','Fade in (first bar)'],['fadeout','Fade out (last bar)'],['rise','Slow rise'],['fall','Slow fall'],['swell','Swell every bar'],['pump','Pump on every beat']],
  pan:[['lr','Left to right'],['rl','Right to left'],['ping','Swing left and right every beat'],['sweep','Slow sweep (2 bars)']],
  rev:[['rise','Build up'],['tail','Wash at the end'],['drywet','Dry, then wet']],
  cut:[['rise','Sweep open'],['fall','Sweep closed'],['intro','Filtered intro (2 bars)'],['wobble','Wobble every beat']]
};
var AUTOUI={lane:'vol',on:false};
try{AUTOUI.on=localStorage.getItem('jr-auto')==='1';}catch(e){}
function autoPts(t,pid,k){var a=partData(t,pid).auto;return a&&a[k]&&a[k].length?a[k]:null;}
function autoUses(t,k){if(t.auto&&t.auto[k]&&t.auto[k].length)return true;return Object.keys(t.pd||{}).some(function(id){var a=t.pd[id].auto;return a&&a[k]&&a[k].length;});}
function autoAt(p,b){
  if(b<=p[0][0])return p[0][1];
  for(var i=1;i<p.length;i++)if(b<=p[i][0]){var a=p[i-1],c=p[i],f=(b-a[0])/Math.max(1e-9,c[0]-a[0]);return a[1]+(c[1]-a[1])*f;}
  return p[p.length-1][1];
}
function autoMap(t,k,v,sr){
  if(k==='vol')return v*v;
  if(k==='pan')return v*2-1;
  if(k==='rev')return v;
  return 60*Math.pow((sr||48000)*.45/60,v);
}
function autoStatic(t,k,sr){return k==='vol'?1:k==='pan'?(t.pan||0):k==='rev'?t.rev:(sr||48000)*.45;}
function autoNorm(t,k){/* the lane's resting value, drawn when it has no points */
  if(k==='vol'||k==='cut')return 1;if(k==='pan')return((t.pan||0)+1)/2;return t.rev;}
function autoParam(t,k){
  if(k==='vol')return t.ag&&t.ag.gain;
  if(k==='pan')return t.pn&&t.pn.pan;
  if(k==='rev')return t.send&&t.send.gain;
  return t.af&&t.af.frequency;
}
/* called from scheduleRange for each track and each slice of time */
function autoSchedule(t,a,b,base,pid){
  var sp=spb(),c=A.c,sr=c.sampleRate;
  Object.keys(AUTO_LANES).forEach(function(k){
    var prm=autoParam(t,k);if(!prm)return;
    var p=autoPts(t,pid,k),tA=P.T0+(base+a)*sp,tB=P.T0+(base+b)*sp;
    if(!p){if(t._au&&t._au[k]&&(a<=1e-9||P.autoFirst)){try{prm.setValueAtTime(autoStatic(t,k,sr),Math.max(0,tA));}catch(e){}}return;}
    t._au=t._au||{};t._au[k]=1;
    /* points inside this slice, plus extra steps so volume and filter follow their curved scale smoothly */
    var bs=[a],fine=(k==='vol'||k==='cut')?.125:0;
    p.forEach(function(q){if(q[0]>a&&q[0]<b)bs.push(q[0]);});
    if(fine)for(var x=Math.ceil(a/fine)*fine;x<b;x+=fine)if(x>a)bs.push(x);
    bs.push(b);bs.sort(function(x,y){return x-y;});
    try{
      if(a<=1e-9||P.autoFirst)prm.setValueAtTime(autoMap(t,k,autoAt(p,a),sr),Math.max(0,tA));
      for(var i=1;i<bs.length;i++){if(bs[i]-bs[i-1]<1e-6)continue;prm.linearRampToValueAtTime(autoMap(t,k,autoAt(p,bs[i]),sr),P.T0+(base+bs[i])*sp);}
    }catch(e){}
  });
}
function autoPrime(){S.tracks.forEach(function(t){t._au={};Object.keys(AUTO_LANES).forEach(function(k){if(autoUses(t,k))t._au[k]=1;});});P.autoFirst=true;}
function autoReset(){
  if(!A.c)return;var sr=A.c.sampleRate,now=A.c.currentTime;
  S.tracks.forEach(function(t){Object.keys(AUTO_LANES).forEach(function(k){var prm=autoParam(t,k);if(!prm||!(t._au&&t._au[k]))return;
    try{prm.cancelScheduledValues(0);prm.setValueAtTime(autoStatic(t,k,sr),now);}catch(e){}});});
}
function autoNeedsFilter(t){return autoUses(t,'cut');}
/* ---------- shapes ---------- */
function autoShape(k,id){
  var L=LEN(),bars=L/4,p=[],i;
  if(id==='fadein')p=[[0,0],[Math.min(4,L),1]];
  else if(id==='fadeout')p=[[Math.max(0,L-4),1],[L,0]];
  else if(id==='rise')p=[[0,k==='vol'?.35:k==='rev'?.05:.12],[L,1]];
  else if(id==='fall')p=[[0,1],[L,k==='vol'?.35:.12]];
  else if(id==='swell')for(i=0;i<bars;i++){p.push([i*4,.45]);p.push([i*4+3.5,1]);}
  else if(id==='pump')for(i=0;i<L;i++){p.push([i,.45]);p.push([i+.45,1]);}
  else if(id==='lr')p=[[0,.1],[L,.9]];
  else if(id==='rl')p=[[0,.9],[L,.1]];
  else if(id==='ping')for(i=0;i<=L;i++)p.push([i,i%2?.85:.15]);
  else if(id==='sweep')for(i=0;i<=L;i+=4)p.push([i,(i/4)%2?.85:.15]);
  else if(id==='tail')p=[[Math.max(0,L-4),.15],[L,.8]];
  else if(id==='drywet')p=[[0,.05],[L/2-.25,.05],[L/2,.45],[L,.45]];
  else if(id==='intro')p=[[0,.25],[Math.min(8,L),1]];
  else if(id==='wobble')for(i=0;i<=L*2;i++)p.push([i/2,i%2?.85:.35]);
  return p.filter(function(q){return q[0]<=L+1e-9;}).map(function(q){return[Math.round(q[0]*1000)/1000,q[1]];});
}
/* ---------- editor panel ---------- */
function autoPanelHTML(t){
  var lanes=Object.keys(AUTO_LANES);
  return'<div class="apanel" id="apanel"'+(AUTOUI.on?'':' hidden')+'><div class="arow"><span class="hlabel">Automation</span><div class="seg2 alanes">'+lanes.map(function(k){var has=t.auto&&t.auto[k]&&t.auto[k].length;return'<button data-al="'+k+'" aria-pressed="'+(AUTOUI.lane===k)+'">'+AUTO_LANES[k].n+(has?' <i class="adot"></i>':'')+'</button>';}).join('')+'</div>'+
    '<label class="il">Shape <select id="aShape"><option value="">Choose…</option></select></label><button id="aClear">Clear lane</button><span class="hint grow" id="aHint"></span></div>'+
    '<div class="alane"><canvas></canvas></div></div>';
}
function mountAuto(t){
  var pn=$('apanel');if(!pn)return;var cv=pn.querySelector('canvas'),g=cv.getContext('2d'),H=96,drag=null,last={i:-1,t:0};
  function lane(){t.auto=t.auto||{};return t.auto[AUTOUI.lane]||(t.auto[AUTOUI.lane]=[]);}
  function geo(){
    var host=$('roll');
    if(R&&R.t===t&&host)return{Gw:R.Gw,cw:R.cw(),sx:host.scrollLeft,w:host.clientWidth};
    var w=cv.parentNode.clientWidth;return{Gw:56,cw:(w-64)/(LEN()*4),sx:0,w:w};
  }
  function xOf(G,b){return G.Gw+b*4*G.cw-G.sx;}
  function bOf(G,x){return(x+G.sx-G.Gw)/G.cw/4;}
  function yOf(v){return 6+(H-12)*(1-v);}
  function vOf(y){return Math.max(0,Math.min(1,1-(y-6)/(H-12)));}
  function fmt(k,v){if(k==='vol')return v<=.001?'silent':Math.round(20*Math.log10(v*v)*10)/10+' dB';if(k==='pan'){var p=v*2-1;return Math.abs(p)<.03?'centre':(p<0?'L':'R')+Math.round(Math.abs(p)*100);}
    if(k==='rev')return Math.round(v*100)+'%';var f=autoMap(t,'cut',v,A.c?A.c.sampleRate:48000);return f>=1000?(f/1000).toFixed(1)+' kHz':Math.round(f)+' Hz';}
  function size(){var G=geo(),d=window.devicePixelRatio||1;cv.width=G.w*d;cv.height=H*d;cv.style.width=G.w+'px';cv.style.height=H+'px';draw();}
  function draw(){
    if(pn.hidden)return;var G=geo(),d=window.devicePixelRatio||1,w=cv.width/d,C=theme(),k=AUTOUI.lane,p=t.auto&&t.auto[k]&&t.auto[k].length?t.auto[k]:null,L=LEN();
    g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,H);g.fillStyle=C.bg;g.fillRect(0,0,w,H);
    for(var s=0;s<=L*4;s+=4){var x=xOf(G,s/4);if(x<G.Gw||x>w)continue;g.fillStyle=s%16===0?C.bar:C.cell;g.fillRect(x,0,1,H);}
    var endX=xOf(G,L);if(endX<w){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(Math.max(G.Gw,endX),0,w-endX,H);}
    g.fillStyle=C.cell;g.fillRect(G.Gw,yOf(.5),w-G.Gw,1);
    if(!p){g.setLineDash([5,4]);g.strokeStyle=C.muted;g.lineWidth=1.5;g.beginPath();var y0=yOf(autoNorm(t,k));g.moveTo(G.Gw,y0);g.lineTo(Math.min(w,endX),y0);g.stroke();g.setLineDash([]);
      g.fillStyle=C.muted;g.font='600 11px system-ui, sans-serif';g.textBaseline='middle';g.textAlign='left';g.fillText('Tap to add a point, or pick a shape',G.Gw+10,H/2+(y0<H/2?14:-14));}
    else{
      g.strokeStyle=t.color;g.lineWidth=2;g.beginPath();
      g.moveTo(G.Gw,yOf(p[0][1]));p.forEach(function(q){g.lineTo(xOf(G,q[0]),yOf(q[1]));});g.lineTo(Math.min(w,endX),yOf(p[p.length-1][1]));g.stroke();
      g.globalAlpha=.14;g.fillStyle=t.color;g.lineTo(Math.min(w,endX),H);g.lineTo(G.Gw,H);g.closePath();g.fill();g.globalAlpha=1;
    }
    if(P.playing){var b=wrapBeat(curBeat());if(b!=null){var px=xOf(G,b);if(px>=G.Gw){g.fillStyle=C.head;g.fillRect(px,0,2,H);}}}
    g.fillStyle=C.panel;g.fillRect(0,0,G.Gw,H);g.fillStyle=C.cell;g.fillRect(G.Gw-1,0,1,H);
    g.fillStyle=C.ink;g.font='700 11px system-ui, sans-serif';g.textAlign='left';g.textBaseline='top';g.fillText(AUTO_LANES[k].n,6,6);
    g.fillStyle=C.muted;g.font='500 9.5px system-ui, sans-serif';g.fillText(AUTO_LANES[k].top,6,22);g.textBaseline='bottom';g.fillText(AUTO_LANES[k].bot,6,H-5);
    if(p){
      p.forEach(function(q,i){var x=xOf(G,q[0]),y=yOf(q[1]);if(x<G.Gw-6||x>w+4)return;g.beginPath();g.arc(x,y,drag&&drag.i===i?6:4.5,0,7);g.fillStyle=drag&&drag.i===i?C.ink:t.color;g.fill();g.strokeStyle=C.bg;g.lineWidth=1.5;g.stroke();});
      if(drag&&drag.i>=0&&p[drag.i]){var q=p[drag.i],tx=xOf(G,q[0]),ty=yOf(q[1]);g.fillStyle=C.ink;g.font='700 11px system-ui, sans-serif';g.textAlign=tx>w-90?'right':'left';g.textBaseline='middle';g.fillText(fmt(k,q[1]),tx+(tx>w-90?-10:10),ty<20?ty+12:ty-12);}
    }
  }
  function hitPt(G,x,y){var p=t.auto&&t.auto[AUTOUI.lane]||[],bi=-1,bd=12;p.forEach(function(q,i){var dx=xOf(G,q[0])-x,dy=yOf(q[1])-y,dd=Math.sqrt(dx*dx+dy*dy);if(dd<bd){bd=dd;bi=i;}});return bi;}
  function snap(b){var gr=(R&&R.t===t)?ROLL.grid:.25;return Math.round(b/gr)*gr;}
  cv.addEventListener('pointerdown',function(e){
    if(e.button>0)return;var r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,G=geo();if(x<G.Gw)return;
    var p=lane(),i=hitPt(G,x,y),now=Date.now();
    if(i>=0&&last.i===i&&now-last.t<420&&last.p===p[i]){p.splice(i,1);last={i:-1,t:0};changed();return;}
    if(i<0){var b=Math.max(0,Math.min(LEN(),snap(bOf(G,x))));if(p.some(function(q){return Math.abs(q[0]-b)<1e-6;}))b=Math.max(0,Math.min(LEN(),bOf(G,x)));
      p.push([b,vOf(y)]);p.sort(function(a,c){return a[0]-c[0];});i=p.findIndex(function(q){return q[0]===b;});}
    last={i:i,t:now,p:p[i]};drag={i:i,id:e.pointerId};try{cv.setPointerCapture(e.pointerId);}catch(er){}
    draw();
  });
  cv.addEventListener('pointermove',function(e){
    if(!drag||e.pointerId!==drag.id)return;var r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,G=geo(),p=lane(),q=p[drag.i];if(!q)return;
    var lo=drag.i>0?p[drag.i-1][0]+1e-3:0,hi=drag.i<p.length-1?p[drag.i+1][0]-1e-3:LEN();
    q[0]=Math.max(lo,Math.min(hi,snap(bOf(G,x))));q[1]=Math.round(vOf(y)*1000)/1000;last.t=0;
    if(AUTOUI.lane==='pan'||AUTOUI.lane==='rev'){var prm=autoParam(t,AUTOUI.lane);if(prm&&!P.playing){try{prm.value=autoMap(t,AUTOUI.lane,q[1]);}catch(er){}}}
    draw();
  });
  function up(e){if(!drag||e.pointerId!==drag.id)return;drag=null;changed();}
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  function changed(){
    var p=lane();p.sort(function(a,c){return a[0]-c[0];});
    if(AUTOUI.lane==='cut'&&!!t.af!==autoNeedsFilter(t)&&t.lo&&A.c)chainTrack(t);
    if(!P.playing)autoReset();
    chips();markDirty();draw();
  }
  function chips(){pn.querySelectorAll('[data-al]').forEach(function(b){var k=b.dataset.al,has=t.auto&&t.auto[k]&&t.auto[k].length;b.setAttribute('aria-pressed',AUTOUI.lane===k);b.innerHTML=AUTO_LANES[k].n+(has?' <i class="adot"></i>':'');});
    var sh=$('aShape');if(sh)sh.innerHTML='<option value="">Choose…</option>'+AUTO_SHAPES[AUTOUI.lane].map(function(o){return'<option value="'+o[0]+'">'+o[1]+'</option>';}).join('');
    var h=$('aHint');if(h)h.textContent={vol:'Fades and swells. 100% is the level set in the mixer.',pan:'Moves the sound between left and right speakers.',rev:'How much reverb, moment by moment.',cut:'A filter sweep: muffled at the bottom, fully open at the top.'}[AUTOUI.lane];}
  pn.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    if(b.dataset.al){AUTOUI.lane=b.dataset.al;chips();draw();return;}
    if(b.id==='aClear'){if(t.auto)delete t.auto[AUTOUI.lane];changed();toast(AUTO_LANES[AUTOUI.lane].n+' automation cleared');}
  });
  pn.addEventListener('change',function(e){if(e.target.id!=='aShape'||!e.target.value)return;t.auto=t.auto||{};t.auto[AUTOUI.lane]=autoShape(AUTOUI.lane,e.target.value);var nm=e.target.selectedOptions[0].textContent;e.target.value='';changed();toast(AUTO_LANES[AUTOUI.lane].n+': '+nm);});
  AUTOUI.draw=draw;AUTOUI.size=size;AUTOUI.t=t;chips();size();
}
function autoToggle(){AUTOUI.on=!AUTOUI.on;try{localStorage.setItem('jr-auto',AUTOUI.on?'1':'0');}catch(e){}var pn=$('apanel');if(pn)pn.hidden=!AUTOUI.on;var b=$('autoBtn');if(b)b.setAttribute('aria-pressed',AUTOUI.on);if(AUTOUI.on&&AUTOUI.size)AUTOUI.size();}
