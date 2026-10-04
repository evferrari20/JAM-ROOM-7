/* =============== LOOPS LIBRARY =============== */
/* Every loop is written in scale steps relative to each bar's chord, so it fits any key and scale
   and every loop agrees with the others: they all follow the chord progression chosen at the top.
   k = scale steps above the chord root (0 root, 2 third, 4 fifth, 6 seventh, 7 octave; negative = below).
   All loops here were written for Jam Room. */
var LOOP_PROGS=[
  {id:'pop',n:'Pop',p:[0,4,5,3]},{id:'sad',n:'Heartfelt',p:[5,3,0,4]},{id:'fifties',n:'Doo-wop',p:[0,5,3,4]},
  {id:'jazz',n:'Jazz ii–V–I',p:[1,4,0,0]},{id:'two',n:'Two-chord groove',p:[0,3,0,3]},{id:'rise',n:'Rising',p:[3,4,5,5]},
  {id:'minor1',n:'Minor epic',p:[0,5,2,6]},{id:'minor2',n:'Minor drive',p:[0,6,5,6]},{id:'minor3',n:'Minor classic',p:[0,3,4,0]},{id:'drone',n:'One chord',p:[0,0,0,0]}
];
var R16=function(a){return a.map(function(x){return[x,1.6];});};
var LOOPS=[
 /* drums: performed by the Drummer */
 {n:'Garage Rock',c:'Drums',dr:['Rock',.62,.78],g:['Rock','Energetic']},
 {n:'Easy Rock',c:'Drums',dr:['Rock',.28,.4],g:['Rock','Chill']},
 {n:'Pop Basic',c:'Drums',dr:['Pop',.35,.55],g:['Pop']},
 {n:'Pop Drive',c:'Drums',dr:['Pop',.72,.82],g:['Pop','Energetic']},
 {n:'Boom Bap',c:'Drums',dr:['Hip-hop',.5,.6],g:['Hip-hop']},
 {n:'Lazy Sunday',c:'Drums',dr:['Lo-fi',.42,.35],g:['Lo-fi','Chill']},
 {n:'Trap Rolls',c:'Drums',dr:['Trap',.86,.7],kit:'808',g:['Hip-hop','Energetic']},
 {n:'Club Four',c:'Drums',dr:['House',.5,.72],kit:'808',g:['Electronic','Energetic']},
 {n:'Mirror Ball',c:'Drums',dr:['Disco',.62,.75],kit:'Tight',g:['Electronic','Happy']},
 {n:'Pocket Funk',c:'Drums',dr:['Funk',.58,.62],kit:'Tight',g:['Funk']},
 {n:'Big Half-time',c:'Drums',dr:['Half-time',.45,.82],g:['Rock','Cinematic']},
 {n:'Brush Swing',c:'Drums',dr:['Jazz swing',.5,.35],kit:'Tight',g:['Jazz','Chill']},
 {n:'Blues Shuffle',c:'Drums',dr:['Shuffle',.5,.6],g:['Blues']},
 {n:'One Drop',c:'Drums',dr:['Reggae',.45,.5],kit:'Tight',g:['World','Chill']},
 {n:'Afro Groove',c:'Drums',dr:['Afrobeat',.6,.62],kit:'Tight',g:['World','Happy']},
 {n:'Soft Ballad',c:'Drums',dr:['Ballad',.3,.3],g:['Pop','Chill']},
 {n:'Hand Drums',c:'Percussion',dr:['Bossa nova',.6,.5],kit:'Hand',g:['World','Chill']},
 {n:'Campfire',c:'Percussion',dr:['Latin',.42,.45],kit:'Hand',g:['Folk','Happy']},
 {n:'Shaker & Bell',c:'Percussion',dr:['Afrobeat',.3,.4],kit:'Hand',g:['World']},
 /* bass */
 {n:'Root Eights',c:'Bass',i:'ebass',o:36,m:R16([0,2,4,6,8,10,12,14]).map(function(x){return[x[0],1.7,0];}),g:['Rock','Pop']},
 {n:'Motown Walk',c:'Bass',i:'ebass',o:36,m:[[0,3,0],[4,1,0],[6,1.5,4],[8,3,0],[12,1.5,4],[14,1.5,7]],g:['Soul','Happy']},
 {n:'Lo-fi Thump',c:'Bass',i:'ebass',o:36,m:[[0,6,0],[10,4,0],[14,2,4]],g:['Lo-fi','Chill']},
 {n:'Slap Pop',c:'Bass',i:'slapbass',o:36,m:[[0,1.5,0],[3,.8,7],[6,.8,0],[8,1.5,0],[10,.8,4],[11,.8,7],[14,.8,0]],g:['Funk','Energetic']},
 {n:'808 Glide',c:'Bass',i:'sub808',o:36,m:[[0,6,0],[7,2.5,0],[10,5,0]],g:['Hip-hop']},
 {n:'Disco Octaves',c:'Bass',i:'ebass',o:36,m:[[0,1.5,0],[2,1.5,7],[4,1.5,0],[6,1.5,7],[8,1.5,0],[10,1.5,7],[12,1.5,0],[14,1.5,7]],g:['Electronic','Happy']},
 {n:'Walking Jazz',c:'Bass',i:'jazzbass',o:36,walk:1,g:['Jazz']},
 {n:'Reggae Bubble',c:'Bass',i:'ebass',o:36,m:[[0,3,0],[4,1,0],[6,2,4],[10,3,0],[14,1,2]],g:['World','Chill']},
 {n:'Deep Sub',c:'Bass',i:'subbass',o:36,m:[[0,15.5,0]],g:['Electronic','Cinematic']},
 {n:'Synth Pulse',c:'Bass',i:'sbass',o:36,m:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(function(i){return[i,.8,i%4===2?7:0,i%4===0?.85:.6];}),g:['Electronic','Energetic']},
 {n:'Bowed Pedal',c:'Bass',i:'contrabass',o:36,m:[[0,8,0],[8,8,4]],g:['Cinematic']},
 /* keys */
 {n:'Rhodes Glow',c:'Keys',i:'epiano',o:62,sev:1,r:[[0,15.5]],g:['Soul','Chill','Lo-fi']},
 {n:'Rhodes Pulse',c:'Keys',i:'epiano',o:62,sev:1,r:[[0,3.5],[4,3.5],[8,3.5],[12,3.5]],g:['Soul','Jazz']},
 {n:'Piano Ballad',c:'Keys',i:'piano',o:55,arp:[0,4,7,9,11,9,7,4],rate:2,g:['Pop','Chill']},
 {n:'Pop Piano Push',c:'Keys',i:'piano',o:62,r:[[0,5.5],[6,5.5],[12,3.5]],g:['Pop','Happy']},
 {n:'Gospel Stabs',c:'Keys',i:'piano',o:62,sev:1,r:[[0,1.5],[3,1],[6,1.5],[10,1],[12,1.5]],g:['Soul','Energetic']},
 {n:'Wurli Offbeats',c:'Keys',i:'wurli',o:62,r:[[2,1.5],[6,1.5],[10,1.5],[14,1.5]],g:['Lo-fi','Soul']},
 {n:'Organ Bed',c:'Keys',i:'drawbar',o:60,r:[[0,15.5]],g:['Soul','Blues']},
 {n:'Clav Funk',c:'Keys',i:'clav',o:60,r:[[0,.8],[3,.8],[6,.8],[8,.8],[11,.8],[14,.8]],g:['Funk']},
 {n:'Baroque Run',c:'Keys',i:'harpsi',o:60,arp:[0,2,4,7,4,2,0,2],rate:1,g:['Classical']},
 {n:'Lullaby Box',c:'Keys',i:'musicbox',o:79,mel:[[0,2,7],[2,2,4],[4,2,2],[6,2,4],[8,4,7],[12,4,4],[16,2,9],[18,2,7],[20,2,4],[22,2,2],[24,8,0]],g:['Chill','Cinematic']},
 /* guitar */
 {n:'Folk Strum',c:'Guitar',i:'steel',gtr:1,strum:[[0,'D'],[4,'D'],[6,'U'],[10,'U'],[12,'D'],[14,'U']],g:['Folk','Happy']},
 {n:'Nylon Fingerpick',c:'Guitar',i:'nylon',o:48,arp:[0,7,4,9,0,7,4,9],rate:2,g:['Folk','Chill']},
 {n:'Clean Jangle',c:'Guitar',i:'eguitar',o:55,arp:[0,4,7,9,7,4,0,4],rate:2,g:['Rock','Pop']},
 {n:'Power Chords',c:'Guitar',i:'oguitar',gtr:2,strum:[[0,'D'],[2,'D'],[4,'D'],[6,'D'],[8,'D'],[10,'D'],[12,'D'],[14,'D']],g:['Rock','Energetic']},
 {n:'Reggae Skank',c:'Guitar',i:'eguitar',o:62,r:[[2,.7],[6,.7],[10,.7],[14,.7]],g:['World']},
 {n:'Jazz Comp',c:'Guitar',i:'jazzgtr',o:58,sev:1,r:[[0,2.5],[3,3]],g:['Jazz']},
 {n:'Funk Scratch',c:'Guitar',i:'eguitar',o:62,sev:1,r:[[0,.6],[2,.6],[3,.6],[6,.6],[8,.6],[10,.6],[11,.6],[14,.6]],g:['Funk']},
 /* synth */
 {n:'Juno Pad',c:'Synth',i:'junopad',o:62,r:[[0,15.5]],g:['Electronic','Chill']},
 {n:'Poly Stabs',c:'Synth',i:'juno',o:62,r:[[0,1.5],[3,1],[6,1.5],[10,1],[12,1.5]],g:['Electronic','Energetic']},
 {n:'Arp Sparkle',c:'Synth',i:'juno',o:62,arp:[0,2,4,7],rate:1,g:['Electronic','Happy']},
 {n:'Neon Lead',c:'Synth',i:'lead',o:72,mel:[[0,3,7],[3,1,6],[4,4,4],[10,2,2],[12,4,4],[16,3,4],[19,1,2],[20,6,0],[28,2,-1],[30,2,0]],g:['Electronic','Energetic']},
 {n:'Pluck Steps',c:'Synth',i:'spluck',o:62,arp:[0,4,2,7,4,9,7,4],rate:2,g:['Electronic','Pop']},
 {n:'Warm Pad',c:'Synth',i:'pad',o:60,r:[[0,15.5]],g:['Chill','Cinematic']},
 {n:'House Chords',c:'Synth',i:'juno',o:62,sev:1,r:[[2,1.2],[6,1.2],[10,1.2],[14,1.2]],g:['Electronic']},
 /* strings */
 {n:'String Pad',c:'Strings',i:'strings',o:60,r:[[0,15.5]],g:['Cinematic','Chill']},
 {n:'Pizzicato Steps',c:'Strings',i:'pizz',o:55,arp:[0,4,7,4],rate:2,g:['Classical','Happy']},
 {n:'Cello Line',c:'Strings',i:'cello',o:48,mel:[[0,8,0],[8,4,2],[12,4,4]],g:['Cinematic','Classical']},
 {n:'Violin Theme',c:'Strings',i:'violin',o:72,mel:[[0,8,4],[8,8,2],[16,12,0],[28,4,1]],g:['Cinematic','Classical']},
 {n:'Harp Ripple',c:'Strings',i:'harp',o:55,arp:[0,2,4,7,9,11,14,11],rate:1,g:['Cinematic','Chill']},
 /* brass and winds */
 {n:'Brass Stabs',c:'Brass & Winds',i:'brass',o:60,r:[[0,1.5],[3,1],[6,1.5],[10,1],[12,1.5]],g:['Funk','Energetic']},
 {n:'Horn Swell',c:'Brass & Winds',i:'horn',o:55,r:[[0,15.5]],g:['Cinematic']},
 {n:'Flute Melody',c:'Brass & Winds',i:'flute',o:72,mel:[[0,1,4],[1,1,5],[2,2,4],[4,2,2],[6,2,0],[8,4,2],[12,4,4]],g:['Folk','Happy']},
 {n:'Sax Riff',c:'Brass & Winds',i:'sax',o:62,mel:[[0,1.5,0],[2,1,2],[3,1,3],[4,2,4],[8,1.5,6],[10,1,4],[12,3,2]],g:['Jazz','Soul']},
 {n:'Smoky Trumpet',c:'Brass & Winds',i:'mutedtpt',o:64,mel:[[2,2,6],[4,2,4],[6,4,2],[12,2,3],[14,2,4],[16,6,0],[24,2,2],[26,2,4],[28,4,6]],g:['Jazz','Chill']},
 {n:'Clarinet Line',c:'Brass & Winds',i:'clarinet',o:62,mel:[[0,4,2],[4,2,4],[6,2,3],[8,8,2],[16,4,4],[20,2,6],[22,2,4],[24,8,2]],g:['Classical','Chill']},
 /* mallets and bells */
 {n:'Vibes Comp',c:'Mallets & Bells',i:'vibes',o:64,sev:1,r:[[0,3.5],[4,3.5],[8,3.5],[12,3.5]],g:['Jazz','Chill']},
 {n:'Marimba Ostinato',c:'Mallets & Bells',i:'marimba',o:60,arp:[0,4,7,4,2,4,7,9],rate:2,g:['World','Happy']},
 {n:'Glock Sparkle',c:'Mallets & Bells',i:'glock',o:79,mel:[[0,1,7],[2,1,9],[4,1,11],[6,1,9],[8,2,7],[12,2,4]],g:['Pop','Happy']},
 {n:'Kalimba Loop',c:'Mallets & Bells',i:'kalimba',o:67,arp:[0,4,2,7,4,2],rate:2,g:['Chill','World']},
 {n:'Celesta Twinkle',c:'Mallets & Bells',i:'celesta',o:72,arp:[0,2,4,7,9,7,4,2],rate:1,g:['Cinematic','Chill']}
];
var LOOPUI={cat:'All',q:'',tag:'',prog:null};
function harmScale(){var sc=SCALES[S.scale]||SCALES.Major;if(sc.length===7)return sc;return/minor|blues/i.test(S.scale)?SCALES.Minor:SCALES.Major;}
function scTone(j){var sc=harmScale(),n=sc.length;return sc[((j%n)+n)%n]+12*Math.floor(j/n);}
function chordLabel(deg){var r=scTone(deg),th=scTone(deg+2)-r,fi=scTone(deg+4)-r;return NOTE_NAMES[(S.key+r)%12]+(th===3?(fi===6?'°':'m'):(fi===8?'+':''));}
function progLabel(p){return p.map(chordLabel).join(' – ');}
/* guess the song's chords: for every bar, which chord of the key fits the notes best */
function detectProg(){
  var bars=S.bars,out=[],any=false;
  for(var b=0;b<bars;b++){
    var w=new Array(12).fill(0),tot=0;
    S.tracks.forEach(function(t){if(t.kind!=='inst'||t.mute)return;t.notes.forEach(function(n){var s0=Math.max(n.s,b*4),s1=Math.min(n.s+n.d,b*4+4);if(s1<=s0)return;var wt=(s1-s0)*(BASSI[t.inst]?1.6:1)*(s0===b*4?1.3:1);w[((n.m-S.key)%12+12)%12]+=wt;tot+=wt;});});
    if(tot<.25){out.push(null);continue;}any=true;
    var best=0,bs=-1e9;for(var d=0;d<7;d++){var r=scTone(d)%12,th=scTone(d+2)%12,fi=scTone(d+4)%12,sc=w[r]*1.25+w[th]+w[fi]*.85;
      for(var pc=0;pc<12;pc++)if(pc!==r&&pc!==th&&pc!==fi)sc-=w[pc]*.35;if(sc>bs){bs=sc;best=d;}}
    out.push(best);
  }
  if(!any)return null;
  for(var i=0;i<out.length;i++)if(out[i]==null)out[i]=i?out[i-1]:(out.filter(function(x){return x!=null;})[0]||0);
  return out;
}
function loopProg(){
  if(LOOPUI.prog==='song'){var d=detectProg();if(d)return d;}
  var p=LOOP_PROGS.filter(function(x){return x.id===LOOPUI.prog;})[0];if(p)return p.p;
  return /minor|dorian|phrygian|aeolian/i.test(S.scale)?[0,5,2,6]:[0,4,5,3];
}
function loopNotes(L,bars){
  var out=[];
  if(L.dr)return drummerNotes({style:L.dr[0],x:L.dr[1],y:L.dr[2],fills:bars>=4?'end':'off',seed:3},bars,'');
  var prog=loopProg(),prev=null,ref=function(base){var r=S.key+12*Math.floor(base/12);if(r<base-6)r+=12;if(r>base+6)r-=12;return r;};
  function v(x){return Math.round(Math.max(.2,Math.min(1,x))*100)/100;}
  for(var bar=0;bar<bars;bar++){
    var deg=prog[bar%prog.length],b0=bar*4;
    if(L.walk){
      var nd=prog[(bar+1)%prog.length],R0=ref(L.o)+scTone(deg),nxt=ref(L.o)+scTone(nd),pick=[R0,ref(L.o)+scTone(deg+2),ref(L.o)+scTone(deg+4),nxt+(nxt>R0?-1:1)];
      pick.forEach(function(m,i){while(m>L.o+10)m-=12;while(m<L.o-4)m+=12;out.push({s:b0+i,d:.95,m:m,v:v(.78+(i?0:.08))});});continue;
    }
    if(L.m||L.mel){
      var mm=L.m||L.mel,span=L.mel&&mm.some(function(x){return x[0]>=16;})?2:1;
      mm.forEach(function(x){if(span===2&&Math.floor(x[0]/16)!==bar%2)return;var st=x[0]%16,m=ref(L.o)+scTone(deg+x[2]);
        if(L.m){while(m>L.o+9)m-=12;while(m<L.o-5)m+=12;}
        out.push({s:b0+st/4,d:x[1]/4,m:m,v:v(x[3]||(L.m?.82:.74))});});
      continue;
    }
    if(L.arp){
      var steps=16/L.rate;for(var i=0;i<steps;i++){var k=L.arp[i%L.arp.length];out.push({s:b0+i*L.rate/4,d:L.rate/4*(L.rate>1?.9:1.4),m:ref(L.o)+scTone(deg+k),v:v((i%(4/L.rate||1)===0?.74:.62))});}
      continue;
    }
    if(L.gtr){
      var root=40+(((S.key+scTone(deg))-40)%12+12)%12,th=scTone(deg+2)-scTone(deg),fi=scTone(deg+4)-scTone(deg);
      var vo=L.gtr===2?[root,root+fi,root+12]:[root,root+fi,root+12,root+12+th,root+12+fi,root+24];
      L.strum.forEach(function(p){var down=p[1]==='D',str=down?vo:vo.slice(L.gtr===2?0:2).reverse();
        str.forEach(function(m,i){out.push({s:Math.round((b0+p[0]/4+i*.012)*10000)/10000,d:L.gtr===2?.4:.45,m:m,v:v((down?.74:.6)-i*.015)});});});
      continue;
    }
    if(L.r){
      var offs=[0,2,4].concat(L.sev?[6]:[]).map(function(k){return scTone(deg+k);}),ch=vVoice(offs,prev,L.o);prev=ch;
      L.r.forEach(function(p){ch.forEach(function(m){out.push({s:b0+p[0]/4,d:p[1]/4,m:m,v:v(L.o>=66?.55:.66)});});});
    }
  }
  /* keep high parts inside the instrument's range */
  var top=Math.max.apply(null,out.map(function(n){return n.m;}).concat([0]));while(top>100){out.forEach(function(n){n.m-=12;});top-=12;}
  return out;
}
/* ---------- preview ---------- */
var LPV={t:null,hs:[],end:0,id:null,tm:0};
function loopStop(){
  clearTimeout(LPV.tm);var c=A.c;if(c)LPV.hs.forEach(function(h){try{h.release(c.currentTime);}catch(e){}});LPV.hs=[];
  var t=LPV.t;LPV.t=null;LPV.id=null;if(t)setTimeout(function(){unwireTrack(t);},1500);
  document.querySelectorAll('.lcard .lplay').forEach(function(b){b.innerHTML=IC.play;b.setAttribute('aria-label','Preview');});
}
async function loopPreview(L,btn){
  var same=LPV.id===L.n;loopStop();if(same)return;
  var c=ensureAudio();try{if(c.state!=='running')await c.resume();}catch(e){}
  var t=mkTrack(L.dr?'drum':'inst',L.i);if(L.kit)t.kit=L.kit;else if(L.dr)t.kit=DRUMMERS[L.dr[0]].kit;t.vol=.8;t.rev=.14;
  LPV.id=L.n;if(btn){btn.innerHTML=IC.stop;btn.setAttribute('aria-label','Stop preview');}
  try{if(L.dr)await loadKit(t.kit);else await ensureSamples(L.i);}catch(e){}
  if(LPV.id!==L.n)return;
  wireTrack(t);t.vn.gain.value=.8;LPV.t=t;
  var bars=L.dr?2:4,notes=loopNotes(L,bars),sp=spb(),now=c.currentTime,t0=now+.08;
  if(P.playing){var bd=4*sp,k=Math.ceil((now+.05-P.T0)/bd);t0=P.T0+k*bd;}
  notes.forEach(function(n){var h=trackPlay(t,n.m,t0+n.s*sp,n.v);h.release(t0+(n.s+n.d)*sp);LPV.hs.push(h);});
  LPV.tm=setTimeout(loopStop,((t0-now)+bars*4*sp+.3)*1000);
}
function addLoop(L,onSel){
  loopStop();
  var sel=selTrack(),kind=L.dr?'drum':'inst',bars=S.bars,notes=loopNotes(L,bars);
  if(onSel&&sel&&sel.kind===kind){sel._undo=null;sel.notes=notes;if(kind==='inst'&&sel.inst!==L.i){/* keep the player's instrument choice */}renderEditor();markDirty();toast(L.n+' placed on '+sel.name);return;}
  var t=mkTrack(kind,L.i);applyInstFx(t);if(L.kit)t.kit=L.kit;else if(L.dr)t.kit=DRUMMERS[L.dr[0]].kit;
  t.notes=notes;t.vol=L.c==='Bass'?.78:L.dr?.8:(L.r&&L.r[0][1]>12)?.5:.62;
  if(L.dr)t.drummer={style:L.dr[0],x:L.dr[1],y:L.dr[2],fills:'end',seed:3,song:false};
  S.tracks.push(t);if(S.solo!==null)S.solo.push(t.id);if(A.c)wireTrack(t);loadTrackSamples(t);
  S.sel=t.id;S.lastInst=t.id;renderTracks();renderEditor();renderDock();markDirty();toast(L.n+' added as a new track');
}
function loopCats(){var c=['All'];LOOPS.forEach(function(L){if(c.indexOf(L.c)<0)c.push(L.c);});return c;}
function loopTags(){var g=[];LOOPS.forEach(function(L){(L.g||[]).forEach(function(x){if(g.indexOf(x)<0)g.push(x);});});return g.sort();}
function openLoops(){
  if(!LOOPUI.prog)LOOPUI.prog=detectProg()?'song':(/minor|dorian|phrygian|aeolian/i.test(S.scale)?'minor1':'pop');
  var det=detectProg();
  function list(){
    var q=LOOPUI.q.toLowerCase(),sel=selTrack();
    var items=LOOPS.filter(function(L){return(LOOPUI.cat==='All'||L.c===LOOPUI.cat)&&(!LOOPUI.tag||(L.g||[]).indexOf(LOOPUI.tag)>=0)&&(!q||(L.n+' '+L.c+' '+(L.g||[]).join(' ')+' '+(L.i?INST_NAME[L.i]||'':'')).toLowerCase().indexOf(q)>=0);});
    if(!items.length)return'<p class="hint">No loops match. Try another word or category.</p>';
    return items.map(function(L){var idx=LOOPS.indexOf(L),inst=L.dr?KITS[L.kit||DRUMMERS[L.dr[0]].kit].label+' · Drummer: '+L.dr[0]:(INST_NAME[L.i]||L.i),fit=sel&&sel.kind===(L.dr?'drum':'inst');
      return'<div class="lcard" data-l="'+idx+'"><button class="lplay" data-a="play" aria-label="Preview">'+(LPV.id===L.n?IC.stop:IC.play)+'</button><div class="lmeta"><b>'+esc(L.n)+'</b><small>'+esc(inst)+'</small><span class="ltags">'+(L.g||[]).map(function(x){return'<i>'+x+'</i>';}).join('')+'</span></div>'+
        '<div class="lacts"><button data-a="add" class="primary" title="Add as a new track">＋ Track</button>'+(fit?'<button data-a="use" title="Put these notes on the selected track ('+esc(sel.name)+') in this part, replacing its notes">Use here</button>':'')+'</div></div>';}).join('');
  }
  function progOpts(){
    return(det?'<option value="song"'+(LOOPUI.prog==='song'?' selected':'')+'>From my song: '+progLabel(det.slice(0,4))+(det.length>4?' …':'')+'</option>':'')+
      LOOP_PROGS.map(function(p){return'<option value="'+p.id+'"'+(LOOPUI.prog===p.id?' selected':'')+'>'+p.n+': '+progLabel(p.p)+'</option>';}).join('');
  }
  function draw(){
    $('mBox').innerHTML='<div class="lhead"><h3>Loops</h3><input type="search" id="lpQ" placeholder="Search loops" value="'+esc(LOOPUI.q)+'" aria-label="Search loops"><button data-x="close">Done</button></div>'+
      '<div class="lbar"><label class="il">Chords <select id="lpProg">'+progOpts()+'</select></label><span class="hint">Every loop follows these chords in '+NOTE_NAMES[S.key]+' '+S.scale.toLowerCase()+', so they all fit together. Press play on your song to hear loops in time with it.</span></div>'+
      '<div class="lwrap"><nav class="lnav">'+loopCats().map(function(c){var n=c==='All'?LOOPS.length:LOOPS.filter(function(L){return L.c===c;}).length;return'<button data-cat="'+c+'" aria-pressed="'+(LOOPUI.cat===c)+'">'+c+'<small>'+n+'</small></button>';}).join('')+'</nav>'+
      '<div class="lmain"><div class="ltagrow">'+['All moods'].concat(loopTags()).map(function(g){var v=g==='All moods'?'':g;return'<button class="chip" data-tag="'+v+'" aria-pressed="'+(LOOPUI.tag===v)+'">'+g+'</button>';}).join('')+'</div><div class="lgrid" id="lpList">'+list()+'</div></div></div>';
  }
  openModal('',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.x==='close'){loopStop();closeModal();return;}
    if(b.dataset.cat){LOOPUI.cat=b.dataset.cat;draw();return;}
    if(b.dataset.tag!=null){LOOPUI.tag=b.dataset.tag;draw();return;}
    var card=b.closest('.lcard');if(!card)return;var L=LOOPS[+card.dataset.l];
    if(b.dataset.a==='play'){loopPreview(L,b);return;}
    if(b.dataset.a==='add'){addLoop(L,false);draw();return;}
    if(b.dataset.a==='use'){addLoop(L,true);draw();}
  });
  modalOnClose=loopStop;
  $('mBox').classList.add('pk');draw();
  $('mBox').oninput=function(e){if(e.target.id==='lpQ'){LOOPUI.q=e.target.value;var l=$('lpList');if(l)l.innerHTML=list();}};
  $('mBox').onchange=function(e){if(e.target.id==='lpProg'){LOOPUI.prog=e.target.value;loopStop();toast('Loops now follow: '+e.target.selectedOptions[0].textContent);}};
}
