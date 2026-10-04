/* =============== ORCHESTRA (compose for a symphony orchestra) ===============
   Sketch on the piano (or start from a Learn classic or your Studio song), pick an ensemble and a style,
   and the orchestrator spreads the music across the orchestra with real orchestration rules
   (melody to violins/flute, bass to cellos/basses, harmony to violas/horns, voice-leading, instrument ranges).
   Then shape it: dynamics and tempo lanes, playing styles per section, movements, hall seat, score view. */
var ORCH=(function(){
  /* id: [name, section, instrument, low, high, pan] */
  var ROW={
    picc:['Piccolo','Woodwinds','piccolo',74,105,-.2],fl:['Flutes','Woodwinds','flute',60,96,-.3],ob:['Oboes','Woodwinds','oboe',58,91,-.1],
    cl:['Clarinets','Woodwinds','clarinet',50,89,.1],bn:['Bassoons','Woodwinds','bassoon',34,72,.25],
    hn:['Horns','Brass','horn',41,77,-.45],tp:['Trumpets','Brass','trumpet',55,82,.3],tb:['Trombones','Brass','trombone',40,70,.45],tu:['Tuba','Brass','tuba',28,55,.55],
    ti:['Timpani','Percussion','timpani',40,55,.1],pc:['Percussion','Percussion','drums',0,11,.15],
    hp:['Harp','Harp & keyboards','harp',24,100,-.55],ce:['Celesta','Harp & keyboards','celesta',60,105,-.4],hc:['Harpsichord','Harp & keyboards','harpsi',29,84,0],
    ch:['Choir','Voices','choir',48,79,0],
    v1:['Violins I','Strings','strings',55,100,-.6],v2:['Violins II','Strings','strings',55,96,-.3],va:['Violas','Strings','strings',48,84,.15],
    vc:['Cellos','Strings','strings',36,76,.4],cb:['Basses','Strings','contrabass',28,55,.6],
    q1:['Violin I','Strings','violin',55,100,-.45],q2:['Violin II','Strings','violin',55,96,-.15],qa:['Viola','Strings','strings',48,84,.15],qc:['Cello','Strings','cello',36,76,.45]
  };
  var SEC_COL={'Woodwinds':'#7ea7c9','Brass':'#d4a65e','Percussion':'#c97a5a','Harp & keyboards':'#a68bbf','Voices':'#d58f73','Strings':'#6db58f'};
  var ENS={
    symphony:{n:'Symphony orchestra',r:['picc','fl','ob','cl','bn','hn','tp','tb','tu','ti','pc','hp','v1','v2','va','vc','cb']},
    chamber:{n:'Chamber orchestra',r:['fl','ob','cl','bn','hn','hc','v1','v2','va','vc','cb']},
    quartet:{n:'String quartet',r:['q1','q2','qa','qc']},
    film:{n:'Film score',r:['hn','tp','tb','tu','ti','pc','ch','hp','ce','v1','v2','va','vc','cb']},
    choral:{n:'Choir & orchestra',r:['ch','fl','ob','hn','tp','tb','ti','pc','hp','v1','v2','va','vc','cb']}
  };
  /* how each style uses each row (see LINES below) */
  var STY={
    romantic:{n:'Romantic',d:'Singing violins, warm horns, harp ripples',dyn:[[0,.5],[.7,.85],[1,.55]],
      m:{fl:'M8',ob:'Mb',cl:'Ph',bn:'B1',hn:'Pm',ti:'Troot',hp:'Arp',ch:'Pad',v1:'M',v2:'Ph',va:'Pm',vc:'B1',cb:'B8',q1:'M',q2:'Ph',qa:'Pm',qc:'B1',hc:'Cont'}},
    film:{n:'Film epic',d:'Driving strings, big horns, drums and choir',dyn:[[0,.55],[.5,.75],[1,1]],
      m:{hn:'Mlow',tp:'M2',tb:'Pm',tu:'B8',bn:'B1',ti:'Tpulse',pc:'Pfilm',ch:'Pad',v1:'Ost',v2:'Ost2',va:'OstLow',vc:'Bpulse',cb:'B8',q1:'Ost',q2:'Ost2',qa:'Pm',qc:'Bpulse',hp:'',ce:'M8b'}},
    pastoral:{n:'Gentle pastoral',d:'Oboe and flute over soft strings and harp',dyn:[[0,.42],[.6,.55],[1,.4]],
      m:{fl:'M8alt',ob:'M',cl:'Ph',bn:'B1',hn:'Pm',hp:'Arp',pc:'Ptri',v1:'Ph',v2:'Pm',vc:'B1',cb:'B8p',q1:'M',q2:'Ph',qa:'Pm',qc:'B1',ch:'Pad',hc:'Cont'}},
    baroque:{n:'Baroque',d:'Harpsichord continuo, walking bass, oboe doubling',dyn:[[0,.65],[1,.65]],
      m:{hc:'Cont',ob:'M',fl:'M8',v1:'M',v2:'Ph',va:'Pm',vc:'Bwalk',cb:'B8walk',bn:'Bwalk',q1:'M',q2:'Ph',qa:'Pm',qc:'Bwalk',hp:'Cont'}},
    mysterious:{n:'Mysterious',d:'Celesta, slow harp, hushed strings and voices',dyn:[[0,.3],[.6,.5],[1,.3]],
      m:{ce:'M8',hp:'ArpSlow',cl:'Mlow',v1:'Ph',v2:'Pm',vc:'B1',cb:'B8',ch:'PadOoh',pc:'Psus',hn:'Pm',q1:'Ph',q2:'Pm',qa:'Mlow',qc:'B1',fl:'M'}}
  };
  var ART={legato:'Smooth',short:'Short',pizz:'Plucked'};
  var STORE='jr-orch-v1',PJ=null,view=null,built=false,PL=null,sel=null,zoom=1,recState=null,hold={};
  function blank(){return{name:'My symphony',bpm:84,beats:4,ens:'symphony',sty:'romantic',seat:'mid',cur:0,mv:[newMv('I. Allegro')]};}
  function newMv(n){return{name:n,bars:16,sketch:[],parts:{},art:{},mute:{},solo:{},vol:{},dyn:[[0,.6],[64,.6]],tmp:[[0,1],[64,1]]};}
  function load(){try{PJ=JSON.parse(localStorage.getItem(STORE)||'null');}catch(e){PJ=null;}if(!PJ||!PJ.mv)PJ=blank();}
  function save(){try{localStorage.setItem(STORE,JSON.stringify(PJ));}catch(e){toast('Could not save: your browser storage is full');}}
  function MV(){return PJ.mv[PJ.cur];}
  function rows(){return ENS[PJ.ens].r;}
  function len(){return MV().bars*PJ.beats;}

  /* ---------------- analysis ---------------- */
  function analyse(sk,L){
    var notes=sk.slice().sort(function(a,b){return a.t-b.t||b.m-a.m;});
    /* melody: the highest note at each onset (the "skyline") */
    var on={},mel=[];notes.forEach(function(n){var k=Math.round(n.t*4)/4;if(!on[k]||n.m>on[k].m)on[k]=n;});
    var ks=Object.keys(on).map(Number).sort(function(a,b){return a-b;});
    ks.forEach(function(k,i){var n=on[k];if(n.m<55)return;var nx=i+1<ks.length?ks[i+1]:k+n.d;mel.push({t:k,d:Math.max(.25,Math.min(n.d,nx-k)),m:n.m,v:n.v||.8});});
    /* harmony per beat: weighted pitch classes, lowest note as bass */
    var segs=[],prev=null;
    for(var b=0;b<L;b++){
      var w={},bass=null;
      notes.forEach(function(n){var o=Math.min(n.t+n.d,b+1)-Math.max(n.t,b);if(o<=0)return;w[n.m%12]=(w[n.m%12]||0)+o*(n.m<60?1.3:1);if(bass===null||n.m<bass)bass=n.m;});
      var pcs=Object.keys(w).map(Number).sort(function(x,y){return w[y]-w[x];}).slice(0,4);
      if(!pcs.length&&prev)segs.push({t:b,bass:prev.bass,pcs:prev.pcs,empty:true});
      else if(pcs.length){prev={t:b,bass:bass,pcs:pcs};segs.push(prev);}
      else segs.push({t:b,bass:null,pcs:[],empty:true});
    }
    /* voice-leading: alto and tenor move to the nearest chord tone */
    var alto=67,ten=57;
    segs.forEach(function(s){
      if(!s.pcs.length){s.a=s.tn=null;return;}
      function near(p,lo,hi,avoid){var best=null;for(var m=lo;m<=hi;m++){if(s.pcs.indexOf(m%12)<0||m===avoid)continue;if(best===null||Math.abs(m-p)<Math.abs(best-p))best=m;}return best===null?p:best;}
      alto=near(alto,58,76);ten=near(ten,48,66,alto);s.a=alto;s.tn=ten;
    });
    return{mel:mel,segs:segs,L:L};
  }
  /* keep a line inside an instrument's range: one octave shift for the whole line, then fix stray notes */
  function fit(line,lo,hi){
    if(!line.length)return line;var best=0,bs=-1;
    for(var o=-36;o<=36;o+=12){var c=0;line.forEach(function(n){if(n.m+o>=lo&&n.m+o<=hi)c++;});if(c>bs||(c===bs&&Math.abs(o)<Math.abs(best))){bs=c;best=o;}}
    return line.map(function(n){var m=n.m+best;while(m<lo)m+=12;while(m>hi)m-=12;return{t:n.t,d:n.d,m:m,v:n.v};});
  }
  function merge(line){var out=[];line.forEach(function(n){var p=out[out.length-1];if(p&&p.m===n.m&&Math.abs(p.t+p.d-n.t)<1e-6)p.d+=n.d;else out.push({t:n.t,d:n.d,m:n.m,v:n.v});});return out;}
  function chordTones(s,lo,hi){var out=[];if(!s.pcs.length)return out;for(var m=lo;m<=hi;m++)if(s.pcs.indexOf(m%12)>=0)out.push(m);return out;}
  var LINES={
    M:function(A,r){return fit(A.mel,r[3],r[4]);},
    Mb:function(A,r){return fit(A.mel.filter(function(n){return Math.floor(n.t/(PJ.beats*4))%2===1;}),r[3],r[4]);},
    M8:function(A,r){return fit(A.mel.map(function(n){return{t:n.t,d:n.d,m:n.m+12,v:n.v*.85};}),r[3],r[4]);},
    M8b:function(A,r){return fit(A.mel.filter(function(n){return n.t>=A.L/2;}).map(function(n){return{t:n.t,d:n.d,m:n.m+12,v:n.v*.7};}),r[3],r[4]);},
    M8alt:function(A,r){return fit(A.mel.filter(function(n){return Math.floor(n.t/(PJ.beats*4))%2===0;}).map(function(n){return{t:n.t,d:n.d,m:n.m+12,v:n.v};}),r[3],r[4]);},
    Mlow:function(A,r){return fit(A.mel.map(function(n){return{t:n.t,d:n.d,m:n.m-12,v:n.v};}),r[3],r[4]);},
    M2:function(A,r){return fit(A.mel.filter(function(n){return n.t>=A.L/2;}),r[3],r[4]);},
    Ph:function(A,r){return merge(fit(A.segs.filter(function(s){return s.a!=null;}).map(function(s){return{t:s.t,d:1,m:s.a,v:.55};}),r[3],r[4]));},
    Pm:function(A,r){return merge(fit(A.segs.filter(function(s){return s.tn!=null;}).map(function(s){return{t:s.t,d:1,m:s.tn,v:.5};}),r[3],r[4]));},
    Pad:function(A,r){return LINES.Ph(A,r).concat(LINES.Pm(A,r));},
    PadOoh:function(A,r){return LINES.Pad(A,r).map(function(n){n.v=.4;return n;});},
    B1:function(A,r){return merge(fit(A.segs.filter(function(s){return s.bass!=null;}).map(function(s){return{t:s.t,d:1,m:s.bass,v:.65};}),r[3],r[4]));},
    B8:function(A,r){return merge(fit(A.segs.filter(function(s){return s.bass!=null;}).map(function(s){return{t:s.t,d:1,m:s.bass-12,v:.6};}),r[3],r[4]));},
    B8p:function(A,r){return LINES.B8(A,r);},
    Bwalk:function(A,r){return fit(A.segs.filter(function(s){return s.bass!=null;}).map(function(s){return{t:s.t,d:.9,m:s.bass,v:.6};}),r[3],r[4]);},
    B8walk:function(A,r){return fit(A.segs.filter(function(s){return s.bass!=null;}).map(function(s){return{t:s.t,d:.9,m:s.bass-12,v:.55};}),r[3],r[4]);},
    Bpulse:function(A,r){var o=[];A.segs.forEach(function(s){if(s.bass==null)return;o.push({t:s.t,d:.45,m:s.bass,v:.7},{t:s.t+.5,d:.45,m:s.bass,v:.55});});return fit(o,r[3],r[4]);},
    Arp:function(A,r){return arp(A,r,.5,[0,1,2,3,2,1]);},
    ArpSlow:function(A,r){return arp(A,r,1,[0,1,2,3]);},
    Ost:function(A,r){return ost(A,r,72,.25);},Ost2:function(A,r){return ost(A,r,64,.25);},OstLow:function(A,r){return ost(A,r,55,.5);},
    Cont:function(A,r){var o=[];A.segs.forEach(function(s){if(!s.pcs.length)return;var ct=chordTones(s,55,72).slice(0,3);ct.forEach(function(m){o.push({t:s.t,d:.45,m:m,v:.5});});if(s.bass!=null)o.push({t:s.t,d:.9,m:s.bass,v:.55});});return o.map(function(n){var m=n.m;while(m<r[3])m+=12;while(m>r[4])m-=12;return{t:n.t,d:n.d,m:m,v:n.v};});},
    Troot:function(A,r){var o=[],bar=PJ.beats*2;A.segs.forEach(function(s){if(s.bass==null||s.t%bar)return;var m=s.bass;while(m<r[3])m+=12;while(m>r[4])m-=12;o.push({t:s.t,d:1,m:m,v:.7});});return o;},
    Tpulse:function(A,r){var o=[];A.segs.forEach(function(s){if(s.bass==null||s.t%2)return;var m=s.bass;while(m<r[3])m+=12;while(m>r[4])m-=12;o.push({t:s.t,d:.5,m:m,v:s.t%PJ.beats?.6:.85});});return o;},
    Pfilm:function(A){var o=[];for(var b=0;b<A.L;b+=PJ.beats){o.push({t:b,d:.5,m:0,v:.75});if(b%(PJ.beats*8)===0)o.push({t:b,d:.5,m:2,v:.8});}return o;},
    Ptri:function(A){var o=[];for(var b=0;b<A.L;b+=PJ.beats*4)o.push({t:b,d:.5,m:4,v:.45});return o;},
    Psus:function(A){var o=[];for(var b=0;b<A.L;b+=PJ.beats*8)o.push({t:b,d:2,m:3,v:.35});return o;}
  };
  function arp(A,r,step,pat){
    var o=[];A.segs.forEach(function(s){if(!s.pcs.length)return;var base=s.bass!=null?s.bass:48;var ct=chordTones(s,base+12,base+36);if(ct.length<2)return;
      for(var k=0;k<1/step;k++){var m=ct[pat[k%pat.length]%ct.length];while(m<r[3])m+=12;while(m>r[4])m-=12;o.push({t:s.t+k*step,d:step,m:m,v:.45});}});
    return o;
  }
  function ost(A,r,reg,step){
    var o=[];A.segs.forEach(function(s){if(!s.pcs.length)return;var ct=chordTones(s,reg,reg+12);if(!ct.length)return;var pat=[0,2,1,2];
      for(var k=0;k<1/step;k++){var m=ct[pat[k%4]%ct.length];while(m<r[3])m+=12;while(m>r[4])m-=12;o.push({t:s.t+k*step,d:step*.85,m:m,v:k%2?.5:.62});}});
    return o;
  }
  function orchestrate(){
    var mv=MV(),L=len();if(!mv.sketch.length){toast('Play or record a sketch first, or start from a classic');return false;}
    var A=analyse(mv.sketch,L),st=STY[PJ.sty];mv.parts={};mv.art={};
    rows().forEach(function(id){var role=st.m[id];if(!role||!LINES[role])return;mv.parts[id]=LINES[role](A,ROW[id]).filter(function(n){return n.t<L;});
      if(role==='B8p')mv.art[id]='pizz';if(role==='Bwalk'||role==='B8walk')mv.art[id]='short';if(/^Ost/.test(role))mv.art[id]='short';});
    mv.dyn=st.dyn.map(function(p){return[p[0]*L,p[1]];});
    save();return true;
  }

  /* ---------------- tempo + dynamics maps ---------------- */
  function lane(pts,b){if(!pts||!pts.length)return 1;if(b<=pts[0][0])return pts[0][1];for(var i=1;i<pts.length;i++){if(b<=pts[i][0]){var a=pts[i-1],c=pts[i];return a[1]+(c[1]-a[1])*(b-a[0])/Math.max(1e-6,c[0]-a[0]);}}return pts[pts.length-1][1];}
  function beatTime(b){/* seconds from beat 0 to beat b with the tempo lane (integrated in small steps) */var mv=MV(),s=0,step=.25,x=0;while(x+step<=b){s+=step*60/(PJ.bpm*lane(mv.tmp,x+step/2));x+=step;}if(b>x)s+=(b-x)*60/(PJ.bpm*lane(mv.tmp,(x+b)/2));return s;}

  /* ---------------- sound ---------------- */
  var G=null;
  function graph(c){
    if(G&&G.c===c)return G;
    var g={c:c,bus:c.createGain(),dry:c.createGain(),wet:c.createGain(),rev:c.createConvolver(),tone:F(c,'lowpass',20000,.5),rows:{}};
    g.rev.buffer=makeIR(c,'Hall');g.bus.connect(g.tone);g.tone.connect(g.dry);g.dry.connect(A.master);g.tone.connect(g.rev);g.rev.connect(g.wet);g.wet.connect(A.master);
    G=g;seat();return g;
  }
  function seat(){if(!G)return;var s={front:[.95,.18,20000,1],mid:[.85,.34,14000,.8],back:[.7,.55,9000,.55]}[PJ.seat]||[.85,.34,14000,.8];G.dry.gain.value=s[0];G.wet.gain.value=s[1];G.tone.frequency.value=s[2];G.width=s[3];
    Object.keys(G.rows).forEach(function(id){var n=G.rows[id];if(n.pan&&n.pan.pan)n.pan.pan.value=(ROW[id]?ROW[id][5]:0)*G.width;});}
  function rowNode(id){
    var c=ensureAudio(),g=graph(c);if(g.rows[id])return g.rows[id];
    var n={g:c.createGain(),pan:c.createStereoPanner?c.createStereoPanner():c.createGain()};n.g.connect(n.pan);n.pan.connect(g.bus);if(n.pan.pan)n.pan.pan.value=(ROW[id]?ROW[id][5]:0)*(g.width||.8);
    g.rows[id]=n;applyVol();return n;
  }
  function applyVol(){if(!G)return;var mv=MV(),anySolo=Object.keys(mv.solo).some(function(k){return mv.solo[k];});
    Object.keys(G.rows).forEach(function(id){var on=!mv.mute[id]&&(!anySolo||mv.solo[id]);G.rows[id].g.gain.value=on?(mv.vol[id]!=null?mv.vol[id]:.8):0;});}
  function playNote(id,n,tm,v,dur){
    var c=A.c,node=rowNode(id).g,art=MV().art[id]||'legato',inst=ROW[id]?ROW[id][2]:'piano';
    if(inst==='drums'){drum(c,node,n.m,tm,v,'Orchestra');return;}
    if(art==='pizz'&&/strings|violin|cello|contrabass/.test(inst))inst='pizz';
    var h=playInst(inst,c,node,n.m,tm,v),d=art==='short'?Math.min(dur,.32):dur;h.release(tm+d);
  }
  function prep(){var c=ensureAudio();graph(c);var need={};rows().forEach(function(id){var i=ROW[id][2];if(i==='drums')loadKit('Orchestra');else need[i]=1;});need.pizz=1;need.piano=1;return Promise.all(Object.keys(need).map(ensureSamples));}

  /* ---------------- transport ---------------- */
  function startPlay(fromBeat){
    var c=ensureAudio();wakeAudio();if(PL)stopPlay();
    prep().then(function(){
      var mv=MV(),t0=c.currentTime+.15-beatTime(fromBeat||0),L=len(),q=[];
      Object.keys(mv.parts).forEach(function(id){(mv.parts[id]||[]).forEach(function(n){if(n.t>=(fromBeat||0)&&n.t<L)q.push([n.t,id,n]);});});
      if(!Object.keys(mv.parts).length)mv.sketch.forEach(function(n){if(n.t>=(fromBeat||0))q.push([n.t,'_sk',n]);});
      q.sort(function(a,b){return a[0]-b[0];});
      PL={t0:t0,q:q,i:0,from:fromBeat||0,L:L};
      PL.timer=setInterval(sched,25);sched();PL.raf=requestAnimationFrame(frame);
      var b=view.querySelector('[data-o=play]');if(b){b.innerHTML=IC.stop;b.setAttribute('aria-label','Stop');}
    });
  }
  function sched(){
    if(!PL)return;var c=A.c,now=c.currentTime,mv=MV();
    while(PL.i<PL.q.length){var e=PL.q[PL.i],tm=PL.t0+beatTime(e[0]);if(tm>now+.2)break;PL.i++;
      var n=e[2],dyn=lane(mv.dyn,n.t),v=Math.max(.08,Math.min(1,(n.v||.7)*(.35+dyn*.9))),dur=beatTime(n.t+n.d)-beatTime(n.t);
      if(e[1]==='_sk'){var h=playInst('piano',c,rowNode('_sk').g,n.m,Math.max(now,tm),v);h.release(Math.max(now,tm)+dur);}
      else playNote(e[1],n,Math.max(now,tm),v,dur);}
    if(c.currentTime>PL.t0+beatTime(PL.L)+2)stopPlay();
  }
  function curBeatPl(){if(!PL)return null;var s=A.c.currentTime-PL.t0,lo=0,hi=PL.L+8;for(var k=0;k<30;k++){var m=(lo+hi)/2;if(beatTime(m)<s)lo=m;else hi=m;}return lo;}
  function frame(){if(!PL)return;PL.raf=requestAnimationFrame(frame);var b=curBeatPl();PL.pos=b;var el=view.querySelector('#orPos');if(el)el.textContent=b<0?'Ready':'Bar '+(Math.floor(b/PJ.beats)+1)+' · '+(Math.floor(b%PJ.beats)+1);drawTL();}
  function stopPlay(){if(!PL)return;clearInterval(PL.timer);cancelAnimationFrame(PL.raf);PL=null;var b=view&&view.querySelector('[data-o=play]');if(b){b.innerHTML=IC.play;b.setAttribute('aria-label','Play');}
    if(G)Object.keys(G.rows).forEach(function(id){var n=G.rows[id];try{n.g.gain.setTargetAtTime(0,A.c.currentTime,.05);}catch(e){}setTimeout(applyVol,300);});drawTL();}

  /* ---------------- sketch recording ---------------- */
  function rec(){
    if(recState){endRec();return;}
    stopPlay();var c=ensureAudio();wakeAudio();ensureSamples('piano');
    var mv=MV(),spb=60/PJ.bpm,t0=c.currentTime+.2+PJ.beats*spb;
    mv.sketch=[];mv.parts={};recState={t0:t0,spb:spb,open:{}};
    for(var k=0;k<PJ.beats;k++)metro(c.currentTime+.2+k*spb,k===0);
    recState.tick=setInterval(function(){if(!recState)return;var b=(A.c.currentTime-recState.t0)/spb;var nb=Math.floor(b+.15);if(nb!==recState.lb&&b>-1){recState.lb=nb;if(nb>=0&&nb<len())metro(recState.t0+nb*spb,nb%PJ.beats===0);}if(b>=len())endRec();},40);
    recState.raf=requestAnimationFrame(function f(){if(!recState)return;recState.raf=requestAnimationFrame(f);var b=(A.c.currentTime-recState.t0)/spb;var el=view.querySelector('#orPos');if(el)el.textContent=b<0?'Count '+Math.ceil(-b):'Rec bar '+(Math.floor(b/PJ.beats)+1);PL=PL||null;drawTL(b);});
    var rb=view.querySelector('[data-o=rec]');if(rb)rb.classList.add('on');
    toast('Recording your sketch: play the melody and chords. Tap the record button again to stop.');
  }
  function endRec(){
    if(!recState)return;clearInterval(recState.tick);cancelAnimationFrame(recState.raf);
    var now=(A.c.currentTime-recState.t0)/recState.spb;Object.keys(recState.open).forEach(function(m){var o=recState.open[m];MV().sketch.push({t:o.t,d:Math.max(.25,now-o.t),m:+m,v:o.v});});
    MV().sketch.forEach(function(n){n.t=Math.max(0,Math.round(n.t*4)/4);n.d=Math.max(.25,Math.round(n.d*4)/4);});
    recState=null;var rb=view.querySelector('[data-o=rec]');if(rb)rb.classList.remove('on');save();render();
    toast(MV().sketch.length?'Sketch saved. Now pick a style and tap Orchestrate.':'Nothing was recorded');
  }
  function metro(t,acc){var c=A.c,o=c.createOscillator(),g=c.createGain();o.frequency.value=acc?1500:1000;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(acc?.25:.15,t+.002);g.gain.setTargetAtTime(.0001,t+.003,.015);o.connect(g);g.connect(A.master);o.start(t);o.stop(t+.1);}
  function noteOn(m,v){
    var c=ensureAudio();hold[m]=playInst('piano',c,graph(c).bus,m,c.currentTime+.005,v||.8);
    var k=view&&view.querySelector('.ok[data-m="'+m+'"]');if(k)k.classList.add('on');
    if(recState){var b=(c.currentTime-recState.t0)/recState.spb;if(b>=-.25)recState.open[m]={t:Math.max(0,b),v:v||.8};}
  }
  function noteOff(m){
    if(hold[m]){hold[m].release(A.c.currentTime);delete hold[m];}
    var k=view&&view.querySelector('.ok[data-m="'+m+'"]');if(k)k.classList.remove('on');
    if(recState&&recState.open[m]){var o=recState.open[m],b=(A.c.currentTime-recState.t0)/recState.spb;MV().sketch.push({t:o.t,d:Math.max(.25,b-o.t),m:m,v:o.v});delete recState.open[m];}
  }

  /* ---------------- import ---------------- */
  function fromClassic(){
    var list=LEARN.songs().filter(function(s){return s.lv<=4;});
    openModal('<h3>Start from a classic</h3><p class="hint">Pick a public-domain piano piece. Its notes become your sketch, then the orchestra plays it in your chosen style. The first 32 bars are used.</p>'+
      '<div class="clist">'+list.map(function(s){return'<button data-cl="'+s.id+'"><b>'+esc(s.t)+'</b><span>'+esc(s.c)+'</span></button>';}).join('')+'</div><div class="row" style="justify-content:flex-end"><button data-x="close">Cancel</button></div>',
      function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.x==='close'){closeModal();return;}
        var id=b.dataset.cl;if(!id)return;closeModal();toast('Loading…');
        LEARN.loadData(id).then(function(d){
          var meta=LEARN.songs().filter(function(s){return s.id===id;})[0],ts=(meta.ts||'4/4').split('/'),beats=+ts[0]*4/+ts[1];
          PJ.beats=beats>=2?beats:4;PJ.bpm=Math.round(meta.bpm);
          var maxB=Math.min(32*PJ.beats,Math.ceil(meta.beats));
          var mv=MV();mv.name=meta.t;mv.bars=Math.ceil(maxB/PJ.beats);mv.sketch=d.data.n.filter(function(n){return n[0]<maxB;}).map(function(n){return{t:n[0],d:Math.min(n[1],maxB-n[0]),m:n[2],v:.75};});
          mv.tmp=[[0,1],[len(),1]];orchestrate();render();toast('"'+meta.t+'" orchestrated in '+STY[PJ.sty].n+' style. Press play.');
        },function(){toast('Could not load that piece');});
      });
    $('mBox').classList.add('med');
  }
  function fromStudio(){
    var ns=[];S.tracks.forEach(function(t){if(t.kind!=='inst'||!audible(t))return;t.notes.forEach(function(n){ns.push({t:n.s,d:n.d,m:n.m,v:n.v||.8});});});
    if(!ns.length){toast('Your Studio song has no instrument notes yet');return;}
    var mv=MV();mv.sketch=ns;mv.bars=S.bars;PJ.bpm=S.bpm||PJ.bpm;PJ.beats=4;orchestrate();render();toast('Your Studio song is now the sketch, orchestrated. Press play.');
  }

  /* ---------------- MusicXML (score view) ---------------- */
  function musicxml(){
    var mv=MV(),L=len(),D=4,ids=rows().filter(function(id){return(mv.parts[id]||[]).length&&ROW[id][2]!=='drums';});
    if(!ids.length&&mv.sketch.length)ids=['_sk'];
    var x='<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>'+esc(mv.name)+'</work-title></work><movement-title>'+esc(mv.name)+'</movement-title><part-list>';
    ids.forEach(function(id,i){x+='<score-part id="P'+i+'"><part-name>'+(id==='_sk'?'Sketch':ROW[id][0])+'</part-name></score-part>';});
    x+='</part-list>';
    var VAL=[[4,'whole',0],[3,'half',1],[2,'half',0],[1.5,'quarter',1],[1,'quarter',0],[.75,'eighth',1],[.5,'eighth',0],[.25,'16th',0]];
    ids.forEach(function(id,i){
      var ns=(id==='_sk'?mv.sketch:mv.parts[id]).map(function(n){return{t:Math.round(n.t*4)/4,e:Math.round((n.t+n.d)*4)/4,m:n.m};}).filter(function(n){return n.e>n.t&&n.t<L;});
      var avg=ns.reduce(function(a,n){return a+n.m;},0)/Math.max(1,ns.length),bass=avg<55;
      /* time slices: the set of sounding notes between consecutive boundaries */
      x+='<part id="P'+i+'">';
      for(var bar=0;bar<mv.bars;bar++){
        var b0=bar*PJ.beats,b1=b0+PJ.beats,cut={};cut[b0]=1;cut[b1]=1;
        ns.forEach(function(n){if(n.t>b0&&n.t<b1)cut[n.t]=1;if(n.e>b0&&n.e<b1)cut[n.e]=1;});
        var cs=Object.keys(cut).map(Number).sort(function(a,b){return a-b;});
        x+='<measure number="'+(bar+1)+'">';
        if(bar===0)x+='<attributes><divisions>'+D+'</divisions><key><fifths>0</fifths></key><time><beats>'+PJ.beats+'</beats><beat-type>4</beat-type></time><clef><sign>'+(bass?'F':'G')+'</sign><line>'+(bass?4:2)+'</line></clef></attributes>'+(i===0?'<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>'+PJ.bpm+'</per-minute></metronome></direction-type></direction>':'');
        for(var k=0;k+1<cs.length;k++){
          var a=cs[k],e=cs[k+1],on=ns.filter(function(n){return n.t<e-1e-6&&n.e>a+1e-6;});
          /* split the slice into writable note values */
          var rem=e-a,pos=a;
          while(rem>1e-6){
            var v=VAL.filter(function(q){return q[0]<=rem+1e-6&&((pos-b0)%q[0]<1e-6||q[0]<=.5);})[0]||VAL[VAL.length-1];
            var tieIn=pos>a||false,tieOut=rem-v[0]>1e-6;
            if(!on.length)x+='<note><rest/><duration>'+(v[0]*D)+'</duration><type>'+v[1]+'</type>'+(v[2]?'<dot/>':'')+'</note>';
            else on.forEach(function(n,j){
              var st=n.t<pos-1e-6||tieIn,sp=n.e>pos+v[0]+1e-6||tieOut,pc=n.m%12,oc=Math.floor(n.m/12)-1,STEP=['C','C','D','D','E','F','F','G','G','A','A','B'],ALT=[0,1,0,1,0,0,1,0,1,0,1,0];
              x+='<note>'+(j?'<chord/>':'')+'<pitch><step>'+STEP[pc]+'</step>'+(ALT[pc]?'<alter>1</alter>':'')+'<octave>'+oc+'</octave></pitch><duration>'+(v[0]*D)+'</duration>'+(st?'<tie type="stop"/>':'')+(sp?'<tie type="start"/>':'')+'<type>'+v[1]+'</type>'+(v[2]?'<dot/>':'')+(st||sp?'<notations>'+(st?'<tied type="stop"/>':'')+(sp?'<tied type="start"/>':'')+'</notations>':'')+'</note>';
            });
            pos+=v[0];rem-=v[0];
          }
        }
        x+='</measure>';
      }
      x+='</part>';
    });
    return x+'</score-partwise>';
  }
  function showScore(){
    var host=view.querySelector('#orScore');host.innerHTML='<div class="lload small"><div class="spin"></div></div>';
    LEARN.osmd().then(function(O){
      host.innerHTML='<div class="paper" id="orPaper"></div>';
      var o=new O.OpenSheetMusicDisplay(host.querySelector('#orPaper'),{autoResize:false,backend:'svg',drawTitle:true,drawComposer:false,drawPartNames:true,drawPartAbbreviations:true,drawCredits:false});
      return o.load(musicxml()).then(function(){try{o.zoom=.6;}catch(e){}o.render();});
    }).catch(function(){host.innerHTML='<p class="hint" style="padding:16px">The score could not be drawn here.</p>';});
  }

  /* ---------------- UI ---------------- */
  var VIEWM='blocks';
  function enter(){
    load();if(!built){built=true;view=document.getElementById('orch');view.addEventListener('click',onClick);view.addEventListener('change',onChange);view.addEventListener('pointerdown',onDown);document.addEventListener('pointerup',onUp);document.addEventListener('pointercancel',onUp);window.addEventListener('resize',function(){if(MODE==='orch')render();});}
    ensureAudio();ensureSamples('piano');render();
    if(!MV().sketch.length&&!localStorage.getItem('jr-orch-seen')){try{localStorage.setItem('jr-orch-seen','1');}catch(e){}intro();}
  }
  function leave(){stopPlay();if(recState)endRec();}
  function intro(){
    openModal('<h3>Write for an orchestra</h3><ol class="steps2"><li><b>Sketch</b> a melody with chords on the keyboard (tap <b>Record sketch</b>), or start from a classic or your Studio song.</li><li>Choose an <b>ensemble</b> and a <b>style</b>, then tap <b>Orchestrate</b>.</li><li>Shape it: draw <b>dynamics</b> (soft to loud) and <b>tempo</b> changes, set each section\'s playing style, add <b>movements</b>.</li><li>Pick your <b>seat</b> in the hall and listen. Switch to <b>Score</b> to see it as sheet music.</li></ol><div class="row" style="justify-content:space-between"><button data-i="classic">Start from a classic</button><button class="primary" data-x="close">Let\'s go</button></div>',
      function(e){var b=e.target.closest('button');if(!b)return;closeModal();if(b.dataset.i==='classic')fromClassic();});
  }
  function opts(o,cur){return Object.keys(o).map(function(k){return'<option value="'+k+'"'+(k===cur?' selected':'')+'>'+esc(o[k].n||o[k])+'</option>';}).join('');}
  function render(){
    if(!view)return;var mv=MV();
    view.innerHTML='<div class="otop">'+
      '<select id="orMv" title="Movement">'+PJ.mv.map(function(m,i){return'<option value="'+i+'"'+(i===PJ.cur?' selected':'')+'>'+esc(m.name)+'</option>';}).join('')+'<option value="+">+ New movement</option></select>'+
      '<button class="round play" data-o="play" aria-label="Play">'+IC.play+'</button>'+
      '<button class="round rec" data-o="rec" aria-label="Record sketch" title="Record a sketch on the keyboard">'+IC.rec+'</button>'+
      '<div class="lpbar" id="orPos">Bar 1 · 1</div>'+
      '<label class="omini">Tempo <input type="number" id="orBpm" min="30" max="200" value="'+PJ.bpm+'"></label>'+
      '<label class="omini">Bars <input type="number" id="orBars" min="2" max="128" value="'+mv.bars+'"></label>'+
      '<span class="tsep"></span>'+
      '<select id="orEns" title="Ensemble">'+opts(ENS,PJ.ens)+'</select>'+
      '<select id="orSty" title="Style">'+opts(STY,PJ.sty)+'</select>'+
      '<button class="primary-soft" data-o="orch">'+IC.wand+' Orchestrate</button>'+
      '<span class="grow"></span>'+
      '<button data-o="classic" title="Use a public-domain piano piece as the sketch">Classics</button>'+
      '<button data-o="studio" title="Use your Studio song as the sketch">From Studio</button>'+
      '<select id="orSeat" title="Your seat in the concert hall"><option value="front"'+(PJ.seat==='front'?' selected':'')+'>Front row</option><option value="mid"'+(PJ.seat==='mid'?' selected':'')+'>Middle seats</option><option value="back"'+(PJ.seat==='back'?' selected':'')+'>Balcony</option></select>'+
      '<div class="seg2"><button data-o="vblocks" aria-pressed="'+(VIEWM==='blocks')+'">Blocks</button><button data-o="vscore" aria-pressed="'+(VIEWM==='score')+'">Score</button></div>'+
      '</div>'+
      '<div class="obody">'+(VIEWM==='score'?'<div class="oscore" id="orScore"></div>':
      '<div class="orows">'+rowsHTML()+'</div><div class="otl"><canvas id="orCv"></canvas></div>')+'</div>'+
      (VIEWM==='blocks'?'<div class="olanes"><div class="olab"><b>Dynamics</b><span>soft ↔ loud</span></div><canvas id="orDyn" data-lane="dyn"></canvas><div class="olab"><b>Tempo</b><span>slower ↔ faster</span></div><canvas id="orTmp" data-lane="tmp"></canvas></div>':'')+
      '<div class="okb" id="orKb"></div>';
    kb();if(VIEWM==='score')showScore();else{size();drawTL();drawLanes();}
  }
  function rowsHTML(){
    var mv=MV(),h='<div class="orh sk'+(sel==='_sk'?' sel':'')+'" data-row="_sk"><i style="background:#ece5d3"></i><b>Piano sketch</b><span>'+mv.sketch.length+' notes</span></div>',last='';
    rows().forEach(function(id){var r=ROW[id];if(r[1]!==last){h+='<div class="osec" style="--sc:'+SEC_COL[r[1]]+'">'+r[1]+'</div>';last=r[1];}
      var n=(mv.parts[id]||[]).length,art=mv.art[id]||'legato',canPizz=/strings|violin|cello|contrabass/.test(r[2]);
      h+='<div class="orh'+(sel===id?' sel':'')+'" data-row="'+id+'" style="--sc:'+SEC_COL[r[1]]+'"><i></i><b>'+r[0]+'</b>'+
        (r[2]!=='drums'?'<select data-art="'+id+'" title="Playing style">'+Object.keys(ART).filter(function(k){return k!=='pizz'||canPizz;}).map(function(k){return'<option value="'+k+'"'+(k===art?' selected':'')+'>'+ART[k]+'</option>';}).join('')+'</select>':'<span></span>')+
        '<button class="tog sm" data-m2="'+id+'" aria-pressed="'+!!mv.mute[id]+'" title="Mute">M</button><button class="tog sm" data-s2="'+id+'" aria-pressed="'+!!mv.solo[id]+'" title="Solo">S</button></div>';});
    return h;
  }
  /* timeline canvas */
  var TL=null;
  function size(){var cv=view.querySelector('#orCv');if(!cv)return;var host=cv.parentNode,d=window.devicePixelRatio||1,W=host.clientWidth,H=Math.max(host.clientHeight,view.querySelector('.orows').scrollHeight);cv.width=W*d;cv.height=H*d;cv.style.width=W+'px';cv.style.height=H+'px';TL={W:W,H:H,d:d};
    ['orDyn','orTmp'].forEach(function(id){var c=view.querySelector('#'+id);if(!c)return;var w=c.clientWidth,h=c.clientHeight;c.width=w*d;c.height=h*d;});}
  function rowY(){var ys={},top=view.querySelector('.orows').getBoundingClientRect().top;view.querySelectorAll('.orh').forEach(function(e){var r=e.getBoundingClientRect();ys[e.dataset.row]=[r.top-top,r.height];});return ys;}
  function drawTL(recPos){
    var cv=view&&view.querySelector('#orCv');if(!cv||!TL)return;var g=cv.getContext('2d'),W=TL.W,H=TL.H,mv=MV(),L=len(),px=W/L,ys=rowY();
    g.setTransform(TL.d,0,0,TL.d,0,0);g.fillStyle='#0c1712';g.fillRect(0,0,W,H);
    for(var b=0;b<=L;b++){g.fillStyle=b%PJ.beats?'rgba(255,255,255,.035)':'rgba(212,166,94,.2)';g.fillRect(b*px,0,1,H);}
    g.font='600 10px system-ui';g.fillStyle='rgba(236,229,211,.45)';for(b=0;b<L;b+=PJ.beats*(px*PJ.beats<28?4:1))g.fillText(b/PJ.beats+1,b*px+3,10);
    function rowNotes(id,ns,col){var y=ys[id];if(!y)return;g.fillStyle='rgba(255,255,255,.02)';g.fillRect(0,y[0],W,y[1]-1);if(!ns.length)return;var lo=127,hi=0;ns.forEach(function(n){lo=Math.min(lo,n.m);hi=Math.max(hi,n.m);});var span=Math.max(12,hi-lo),hh=y[1]-8;
      g.fillStyle=col;ns.forEach(function(n){var yy=y[0]+4+hh*(1-(n.m-lo)/span)-2;g.globalAlpha=.4+.6*(n.v||.7);g.fillRect(n.t*px,yy,Math.max(2,n.d*px-1),3);});g.globalAlpha=1;}
    rowNotes('_sk',mv.sketch,'#ece5d3');
    rows().forEach(function(id){rowNotes(id,mv.parts[id]||[],SEC_COL[ROW[id][1]]);});
    var pos=recPos!=null?recPos:(PL&&PL.pos!=null?PL.pos:null);if(pos!=null&&pos>=0){g.fillStyle=recPos!=null?'#d9583a':'#e4a95b';g.fillRect(pos*px,0,2,H);}
  }
  function drawLanes(){
    ['dyn','tmp'].forEach(function(k){var c=view.querySelector('[data-lane='+k+']');if(!c)return;var g=c.getContext('2d'),d=window.devicePixelRatio||1,W=c.width/d,H=c.height/d,L=len(),pts=MV()[k],lo=k==='dyn'?0:.5,hi=k==='dyn'?1:1.5;
      g.setTransform(d,0,0,d,0,0);g.fillStyle='#0c1712';g.fillRect(0,0,W,H);
      for(var b=0;b<=L;b+=PJ.beats){g.fillStyle='rgba(212,166,94,.15)';g.fillRect(b/L*W,0,1,H);}
      if(k==='tmp'){g.fillStyle='rgba(255,255,255,.12)';g.fillRect(0,H/2,W,1);}
      var y=function(v){return H-4-(v-lo)/(hi-lo)*(H-8);};
      g.beginPath();g.moveTo(0,H);for(var x=0;x<=W;x+=3){g.lineTo(x,y(lane(pts,x/W*L)));}g.lineTo(W,H);g.closePath();g.fillStyle=k==='dyn'?'rgba(109,181,143,.18)':'rgba(212,166,94,.15)';g.fill();
      g.beginPath();for(x=0;x<=W;x+=3){var yy=y(lane(pts,x/W*L));if(x)g.lineTo(x,yy);else g.moveTo(x,yy);}g.strokeStyle=k==='dyn'?'#6db58f':'#d4a65e';g.lineWidth=2;g.stroke();
      g.font='600 9px system-ui';g.fillStyle='rgba(236,229,211,.5)';if(k==='dyn'){g.fillText('ff',4,10);g.fillText('pp',4,H-4);}else{g.fillText('faster',4,10);g.fillText('slower',4,H-4);}
    });
  }
  /* lanes: drag to draw */
  var drawing=null;
  function laneAt(e,c){var r=c.getBoundingClientRect(),k=c.dataset.lane,lo=k==='dyn'?0:.5,hi=k==='dyn'?1:1.5,L=len();return[Math.max(0,Math.min(L,(e.clientX-r.left)/r.width*L)),Math.max(lo,Math.min(hi,lo+(1-(e.clientY-r.top-4)/(r.height-8))*(hi-lo)))];}
  function laneDraw(e,c){var k=c.dataset.lane,p=laneAt(e,c),mv=MV(),pts=mv[k].filter(function(q){return Math.abs(q[0]-p[0])>.5;});pts.push([Math.round(p[0]*2)/2,Math.round(p[1]*100)/100]);pts.sort(function(a,b){return a[0]-b[0];});if(pts[0][0]>0)pts.unshift([0,pts[0][1]]);if(pts[pts.length-1][0]<len())pts.push([len(),pts[pts.length-1][1]]);mv[k]=pts;drawLanes();}
  /* keyboard for sketching */
  function kb(){
    var host=view.querySelector('#orKb');if(!host)return;var W=host.clientWidth||view.clientWidth,lo=36,hi=84,wh=[];for(var m=lo;m<=hi;m++)if([1,3,6,8,10].indexOf(m%12)<0)wh.push(m);var ww=W/wh.length,x={},h='';
    wh.forEach(function(m,i){x[m]=i*ww;h+='<div class="ok w" data-m="'+m+'" style="left:'+(i*ww).toFixed(1)+'px;width:'+(ww-1).toFixed(1)+'px"><em>'+(m%12===0?'C'+(m/12-1):'')+'</em></div>';});
    for(m=lo;m<=hi;m++)if([1,3,6,8,10].indexOf(m%12)>=0){var o={1:.62,3:.72,6:.6,8:.67,10:.75}[m%12];h+='<div class="ok b" data-m="'+m+'" style="left:'+(x[m-1]+ww*o).toFixed(1)+'px;width:'+(ww*.6).toFixed(1)+'px"></div>';}
    host.innerHTML=h;
  }
  function onDown(e){
    if(MODE!=='orch')return;
    var k=e.target.closest('.ok');if(k){e.preventDefault();var r=k.getBoundingClientRect(),v=e.pointerType==='mouse'?.8:Math.max(.35,Math.min(1,.4+(e.clientY-r.top)/r.height*.6));hold['p'+e.pointerId]=+k.dataset.m;noteOn(+k.dataset.m,v);return;}
    var c=e.target.closest('[data-lane]');if(c){e.preventDefault();drawing=c;c.setPointerCapture(e.pointerId);laneDraw(e,c);c.onpointermove=function(ev){if(drawing)laneDraw(ev,c);};return;}
  }
  function onUp(e){if(MODE!=='orch')return;var m=hold['p'+e.pointerId];if(m!=null){delete hold['p'+e.pointerId];noteOff(m);}if(drawing){drawing.onpointermove=null;drawing=null;save();}}
  function onClick(e){
    var b=e.target.closest('button,.orh');if(!b)return;var o=b.dataset.o,mv=MV();
    if(b.classList.contains('orh')&&!e.target.closest('select,button')){sel=b.dataset.row;view.querySelectorAll('.orh').forEach(function(x){x.classList.toggle('sel',x.dataset.row===sel);});
      if(sel!=='_sk'&&!PL){var ns=(mv.parts[sel]||[]).slice(0,8);var c=ensureAudio(),t=c.currentTime+.05;prep().then(function(){ns.forEach(function(n,i){playNote(sel,n,t+i*.25,.7,.3);});});}return;}
    if(b.dataset.m2){mv.mute[b.dataset.m2]=!mv.mute[b.dataset.m2];b.setAttribute('aria-pressed',!!mv.mute[b.dataset.m2]);applyVol();save();return;}
    if(b.dataset.s2){mv.solo[b.dataset.s2]=!mv.solo[b.dataset.s2];b.setAttribute('aria-pressed',!!mv.solo[b.dataset.s2]);applyVol();save();return;}
    if(o==='play'){if(PL)stopPlay();else startPlay(0);return;}
    if(o==='rec'){rec();return;}
    if(o==='orch'){stopPlay();if(orchestrate()){render();toast('Orchestrated for '+ENS[PJ.ens].n+' in '+STY[PJ.sty].n+' style');}return;}
    if(o==='classic'){fromClassic();return;}
    if(o==='studio'){fromStudio();return;}
    if(o==='vblocks'||o==='vscore'){VIEWM=o==='vblocks'?'blocks':'score';render();return;}
  }
  function onChange(e){
    var t=e.target,mv=MV();
    if(t.id==='orMv'){stopPlay();if(t.value==='+'){var n=PJ.mv.length+1,nm=['I','II','III','IV','V','VI','VII','VIII'][n-1]||String(n);PJ.mv.push(newMv(nm+'. '+(['Allegro','Adagio','Scherzo','Finale'][n-1]||'Movement')));PJ.cur=PJ.mv.length-1;}else PJ.cur=+t.value;save();render();return;}
    if(t.id==='orBpm'){PJ.bpm=Math.max(30,Math.min(200,+t.value||84));save();return;}
    if(t.id==='orBars'){mv.bars=Math.max(2,Math.min(128,+t.value||16));mv.dyn=mv.dyn.map(function(p,i,a){return i===a.length-1?[len(),p[1]]:p;});mv.tmp=mv.tmp.map(function(p,i,a){return i===a.length-1?[len(),p[1]]:p;});save();render();return;}
    if(t.id==='orEns'){PJ.ens=t.value;save();if(mv.sketch.length)orchestrate();render();return;}
    if(t.id==='orSty'){PJ.sty=t.value;save();if(mv.sketch.length)orchestrate();render();toast(STY[PJ.sty].n+': '+STY[PJ.sty].d);return;}
    if(t.id==='orSeat'){PJ.seat=t.value;save();seat();return;}
    if(t.dataset.art){mv.art[t.dataset.art]=t.value;save();return;}
  }
  var KEYS={KeyZ:0,KeyS:1,KeyX:2,KeyD:3,KeyC:4,KeyV:5,KeyG:6,KeyB:7,KeyH:8,KeyN:9,KeyJ:10,KeyM:11,Comma:12,KeyQ:12,Digit2:13,KeyW:14,Digit3:15,KeyE:16,KeyR:17,Digit5:18,KeyT:19,Digit6:20,KeyY:21,Digit7:22,KeyU:23,KeyI:24},kd={};
  function key(e,dn){
    if(dn&&e.code==='Space'){e.preventDefault();if(!e.repeat){if(PL)stopPlay();else startPlay(0);}return;}
    var o=KEYS[e.code];if(o==null)return;e.preventDefault();
    if(dn){if(e.repeat||kd[e.code]!=null)return;kd[e.code]=48+o;noteOn(48+o,.8);}else{var m=kd[e.code];if(m!=null){delete kd[e.code];noteOff(m);}}
  }
  function midi(st,n,vel){if(st===0x90&&vel>0)noteOn(n,Math.max(.2,vel/127));else if(st===0x80||(st===0x90&&vel===0))noteOff(n);}
  window.__orch={state:function(){return PJ;},orchestrate:orchestrate,render:render,play:startPlay,stop:stopPlay,musicxml:musicxml,analyse:analyse,fromClassic:function(id){return LEARN.loadData(id);}};
  return{enter:enter,leave:leave,key:key,midi:midi};
})();
