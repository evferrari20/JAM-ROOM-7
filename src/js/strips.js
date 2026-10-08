/* =============== CHORD STRIPS + AUTOPLAY =============== */
/* Chord strips: one tall strip per chord of the key. The upper five zones play the chord in
   higher or lower positions, the bottom three play bass notes (root, fifth, low root).
   Autoplay: hold a chord (strip or chord button) and the instrument plays a pattern in time:
   strums, arpeggios, pulses or bass grooves, chosen to suit the instrument. */
var AP={mode:0,held:[],timer:0,next:0,c0:0,cur:null};
try{AP.mode=+(localStorage.getItem('jr-ap')||0)||0;S.playmode=localStorage.getItem('jr-play')||'keys';}catch(e){S.playmode='keys';}
function apFamily(t){
  if(!t||t.kind==='drum')return null;var i=t.inst;
  if(BASSI[i])return'bass';
  if(/steel|nylon|eguitar|oguitar|jazzgtr|banjo|koto|shamisen|sitar|dulcimer|harp|spluck/.test(i))return'guitar';
  if(PADI[i]||/strings|violin|cello|brass|horn|trumpet|trombone|flute|clarinet|oboe|bassoon|sax|choir|oohs|tron/.test(i))return'sustain';
  return'keys';
}
/* pattern events: [step, length in 16ths, what]; what: 'c' chord, 'b' bass root, 'b5' bass fifth, 'b8' bass octave,
   number = chord tone (0 lowest; 3+ wraps up an octave), 'd'/'u' strum down/up */
var AP_PATS={
  keys:[['Pulse',[[0,1.7,'c'],[2,1.7,'c'],[4,1.7,'c'],[6,1.7,'c'],[8,1.7,'c'],[10,1.7,'c'],[12,1.7,'c'],[14,1.7,'c']]],
        ['Arpeggio',[0,1,2,3,4,3,2,1,0,1,2,3,4,3,2,1].map(function(k,i){return[i,1.6,k];})],
        ['Groove',[[0,3,'b'],[0,2.5,'c'],[3,1,'c'],[6,2,'c'],[8,2,'b'],[10,1.5,'c'],[12,3,'c']]],
        ['Ballad',[[0,8,'b'],[2,2,1],[4,2,2],[6,2,4],[8,8,'b5'],[10,2,1],[12,2,2],[14,2,4]]]],
  guitar:[['Strum',[[0,4,'d'],[4,2,'d'],[6,2,'u'],[10,2,'u'],[12,2,'d'],[14,2,'u']]],
          ['Fingerpick',[[0,4,'b'],[2,2,2],[4,4,'b5'],[6,2,3],[8,4,'b'],[10,2,2],[12,4,'b5'],[14,2,4]]],
          ['Eighths',[[0,1.8,'d'],[2,1.8,'d'],[4,1.8,'d'],[6,1.8,'d'],[8,1.8,'d'],[10,1.8,'d'],[12,1.8,'d'],[14,1.8,'d']]],
          ['Picking',[0,1,2,3,2,1,2,3].map(function(k,i){return[i*2,2,k];})]],
  sustain:[['Swell',[[0,15.8,'c']]],
           ['Pulse',[[0,1.4,'c'],[2,1.4,'c'],[4,1.4,'c'],[6,1.4,'c'],[8,1.4,'c'],[10,1.4,'c'],[12,1.4,'c'],[14,1.4,'c']]],
           ['Tremolo',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(function(i){return[i,.9,'c'];})],
           ['Rising line',[[0,4,0],[4,4,1],[8,4,2],[12,4,3]]]],
  bass:[['Root 8ths',[0,2,4,6,8,10,12,14].map(function(i){return[i,1.7,'b'];})],
        ['Octaves',[0,2,4,6,8,10,12,14].map(function(i){return[i,1.6,i%4?'b8':'b'];})],
        ['Walking',[[0,3.8,'b'],[4,3.8,'b3'],[8,3.8,'b5'],[12,3.8,'b6']]],
        ['Groove',[[0,3,'b'],[4,1,'b'],[6,1.5,'b5'],[8,3,'b'],[12,1.5,'b5'],[14,1.5,'b8']]]]
};
function apPatName(n){var f=apFamily(keyTrack());return f&&AP_PATS[f][n-1]?AP_PATS[f][n-1][0]:'';}
/* the notes a strip zone plays: zones 0-4 chord positions (0 = highest), 5-7 bass */
function stripNotes(ci,zone){
  var ch=chordNotes(ci),n=ch.length;
  if(zone>=5){var root=ch[0]-12,fifth=ch[2]-12;return zone===5?[root]:zone===6?[fifth-12>=28?fifth-12:fifth]:[root-12>=24?root-12:root];}
  var inv=4-zone,v=ch.slice();
  /* move the lowest notes up an octave once per step, starting one position below the middle */
  v=v.map(function(m){return m-12;});for(var i=0;i<inv+1;i++){v.sort(function(a,b){return a-b;});v[0]+=12;}
  return v.sort(function(a,b){return a-b;});
}
function stripsHTML(){
  var n=Math.min(SCALES[S.scale].length,7),h='<div class="strips">';
  for(var i=0;i<n;i++){
    h+='<div class="strip2" data-sci="'+i+'"><div class="sname"><b>'+esc(chordLabel(i))+'</b><small>'+ROMAN[i]+'</small></div>';
    for(var z=0;z<8;z++)h+='<div class="sz'+(z>=5?' bz':'')+'" data-strip="'+i+'" data-z="'+z+'">'+(z===5?'<span>Bass</span>':'')+'</div>';
    h+='</div>';
  }
  return h+'</div>';
}
/* ---------- autoplay engine ---------- */
function apNow(){return A.c?A.c.currentTime:0;}
function apBase(){return P.playing?P.T0:AP.c0;}
function apStart(pid,ci,zone,vel,el){
  ensureAudio();var kt=keyTrack();if(!kt)return;ensureHeard(kt);
  if(!AP.held.length&&!P.playing){AP.c0=apNow()+.02;AP.next=0;}
  else if(P.playing&&!AP.held.length){var b=(apNow()-P.T0)/spb();AP.next=Math.max(0,Math.ceil(b*4-.05));}
  AP.held=AP.held.filter(function(h){return h.pid!==pid;});
  AP.held.push({pid:pid,ci:ci,zone:zone==null?3:zone,vel:vel||.8,el:el});if(el)el.classList.add('on');
  if(!AP.timer){AP.timer=setInterval(apTick,25);}apTick();showHeldChord();
}
function apEnd(pid){
  var i=-1;AP.held.forEach(function(h,k){if(h.pid===pid)i=k;});if(i<0)return false;
  var h=AP.held.splice(i,1)[0];if(h.el)h.el.classList.remove('on');
  if(!AP.held.length){clearInterval(AP.timer);AP.timer=0;}
  showHeldChord();return true;
}
function apTick(){
  if(!AP.held.length||!A.c)return;
  var kt=keyTrack();if(!kt){AP.held=[];clearInterval(AP.timer);AP.timer=0;return;}
  var fam=apFamily(kt),cur=AP.held[AP.held.length-1],pat=AP_PATS[fam][Math.max(0,AP.mode-1)][1],sp=spb(),now=apNow(),hor=now+.12,base=apBase(),guard=0;
  if(cur.zone>=5){fam='bass';pat=AP_PATS.bass[Math.max(0,AP.mode-1)][1];}
  if(P.playing&&AP.next*sp/4+base<now-.05)AP.next=Math.ceil((now-base)/sp*4);
  while(base+AP.next*sp/4<hor&&guard++<16){
    var k=AP.next,st=((k%16)+16)%16,t=base+k*sp/4;
    if(S.swing&&st%2===1)t+=S.swing*sp/4;
    pat.forEach(function(ev){if(ev[0]!==st)return;apPlay(kt,cur,ev,Math.max(t,now),sp,k,fam);});
    AP.next++;
  }
}
function apPlay(kt,cur,ev,t,sp,k,fam){
  var ch=cur.zone>=5?chordNotes(cur.ci):stripNotes(cur.ci,cur.zone),root=chordNotes(cur.ci)[0],what=ev[2],ms=[],dur=ev[1]*sp/4,vel=cur.vel,strum=0;
  var sc=SCALES[S.scale],n=sc.length;
  function bassOf(off){var b=root-12;while(b>52)b-=12;while(b<33)b+=12;return b+off;}
  function scaleUp(m,steps){/* move m up the scale by a number of steps */var x=m;for(var i=0;i<steps;i++){x++;var g=0;while(!inScale(x)&&g++<3)x++;}return x;}
  if(what==='c')ms=ch;
  else if(what==='d'){ms=ch.length<5?[bassOf(0)].concat(ch):ch;strum=.011;}
  else if(what==='u'){ms=ch.slice(1).reverse();strum=.009;vel*=.82;}
  else if(what==='b')ms=[bassOf(0)];
  else if(what==='b5')ms=[bassOf(chordNotes(cur.ci)[2]-root)];
  else if(what==='b8')ms=[bassOf(12)];
  else if(what==='b3')ms=[scaleUp(bassOf(0),2)];
  else if(what==='b6'){var nx=bassOf(0)+7;ms=[nx-1>bassOf(0)?nx-1:nx];}
  else if(typeof what==='number'){var w=what%ch.length,o=Math.floor(what/ch.length);ms=[ch[w]+12*o];}
  if(fam==='bass'&&typeof what==='number')ms=ms.map(function(m){while(m>55)m-=12;return m;});
  var acc=(k%4===0?1:.86)*(k%16===0?1.05:1),rec=P.playing&&P.rec&&P.recTrack===kt;
  ms.forEach(function(m,i){
    var tt=t+i*strum,v=Math.max(.15,Math.min(1,vel*acc*(strum&&i?1-i*.02:1))),h=trackPlay(kt,m,tt,v);h.release(tt+dur*.97);
    if(rec){var b=wrapBeat((tt-P.T0)/sp);if(b!=null){var s=Math.round(b*1000)/1000,L=LEN();if(s<L&&!kt.notes.some(function(q){return q.m===m&&Math.abs(q.s-s)<1e-3;})){kt._undo=null;kt.notes.push({s:s,d:Math.min(ev[1]/4,L-s),m:m,v:Math.round(v*100)/100});}}}
  });
  if(rec){if(R&&R.t===kt)R.draw();markDirty();}
}
