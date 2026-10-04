/* =============== LEARN (piano lessons) ===============
   Library by genre then level; lesson player with falling notes, sheet music with a moving cursor (OpenSheetMusicDisplay),
   wait-for-me, hands, tempo, loop, hints that fade, stars, saved progress and a practice recorder. */
var MODE='studio';
var LEARN=(function(){
  var IDX=[],built=false,view=null,P2=null,OSMDP=null,raf=0,bus=null,held={},kbBase=48;
  var GENRES=['First steps','Folk & holiday','Pop patterns','Blues & boogie','Modern originals','Baroque','Classical','Romantic','Impressionist','Ballet & orchestral','Ragtime'];
  var LV=['','Beginner','Easy','Intermediate','Advanced','Virtuoso'];
  var NN=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'],NNF=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
  var LESSON={
    'fs-middle-c':['Middle C','Find the two black keys in the middle of the piano. The white key just to their left is <b>middle C</b>. Put your right thumb (finger 1) on it, finger 2 on D and finger 3 on E. On the music, middle C sits on its own little line between the two staves.'],
    'fs-five-fingers':['Five-finger position','Keep your thumb on middle C and rest one finger on each white key up to G: C D E F G are fingers 1 2 3 4 5. On the music, notes that go up the staff go up the piano.'],
    'fs-left-hand':['Your left hand','Left-hand fingers are numbered from the thumb too, so the little finger (5) plays the lowest note. Put finger 5 on the C below middle C. Its music is in the bottom staff (bass clef).'],
    'fs-together':['Hands together','Your left hand holds one long note while your right hand moves. Turn on <b>Wait for me</b> and take your time: the music waits for you.'],
    'fs-black-keys':['Sharps','A <b>sharp</b> (♯) means "the next key up", often a black key. This piece is in G, so every F is played as F♯. Look for the ♯ at the start of each line.'],
    'fs-chords':['Chords','A chord is several notes played together. Your left hand plays three-note chords while the right hand plays the tune.']
  };
  var STORE='jr-learn-v1',PROG={};try{PROG=JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(e){PROG={};}
  function save(){try{localStorage.setItem(STORE,JSON.stringify(PROG));}catch(e){}}
  function idx(){if(!IDX.length){try{IDX=JSON.parse(document.getElementById('learnidx').textContent)||[];}catch(e){IDX=[];}}return IDX;}
  function songMeta(id){return idx().filter(function(s){return s.id===id;})[0];}
  function fmtTime(s){s=Math.round(s);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
  function stars(n,big){var h='';for(var i=0;i<3;i++)h+='<span class="st'+(i<n?' on':'')+'">'+IC.star+'</span>';return'<span class="stars'+(big?' big':'')+'">'+h+'</span>';}
  function pr(id){return PROG[id]||{};}

  /* ---------- data ---------- */
  var INL=null;
  function inline(key){
    if(INL===null){INL={};var el=document.getElementById('learndata');if(el){el.textContent.split('\n').forEach(function(l){var i=l.indexOf(' ');if(i>0)INL[l.slice(0,i)]=l.slice(i+1);});}}
    return INL[key];
  }
  function b64ab(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer;}
  function loadSong(id){
    var j=inline(id+'.json'),x=inline(id+'.mxl');
    if(j&&x)return Promise.resolve({data:JSON.parse(j),mxl:b64ab(x)});
    return Promise.all([fetch('learn/'+id+'.json').then(function(r){return r.json();}),fetch('learn/'+id+'.mxl').then(function(r){return r.arrayBuffer();})]).then(function(a){return{data:a[0],mxl:a[1]};});
  }
  function osmd(){
    if(OSMDP)return OSMDP;
    OSMDP=new Promise(function(res,rej){
      if(window.opensheetmusicdisplay){res(window.opensheetmusicdisplay);return;}
      var s=document.createElement('script'),src=document.getElementById('osmdsrc');
      if(src&&src.textContent.length>1000)s.src=URL.createObjectURL(new Blob([src.textContent],{type:'text/javascript'}));else s.src='learn/osmd.min.js';
      s.onload=function(){window.opensheetmusicdisplay?res(window.opensheetmusicdisplay):rej(new Error('osmd'));};s.onerror=function(){OSMDP=null;rej(new Error('osmd load'));};
      document.head.appendChild(s);
    });
    return OSMDP;
  }

  /* ---------- mode switch ---------- */
  function setMode(m){
    if(m===MODE&&!(m==='studio'&&SLOT==='orch'))return;
    if(MODE==='orch')ORCH.leave();
    if(MODE==='learn')stopPlayer();
    document.body.classList.remove('mode-learn','mode-orch');
    if(m==='orch'){
      /* the Orchestra is its own piece, opened in the studio editor */
      Object.keys(down).forEach(function(p){pressEnd(p,true);});
      MODE='studio';renderDock();ORCH2.enter();osmd().catch(function(){});
      document.querySelectorAll('.modes [data-mode]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.mode==='orch');});return;
    }else if(m==='learn'){
      if(P.playing)stop();
      MODE='learn';document.body.classList.add('mode-learn');
      Object.keys(down).forEach(function(p){pressEnd(p,true);});
      ensureAudio();ensureSamples('piano');osmd().catch(function(){});
      if(!built)build();
      if(P2)showPlayer();else showLibrary();
    }else{
      if(SLOT==='orch'&&MODE==='studio'&&!document.body.classList.contains('mode-learn')){}
      MODE='studio';if(SLOT==='orch')ORCH2.leave();renderDock();if(R)R.resize();
    }
    document.querySelectorAll('.modes [data-mode]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.mode===MODE);});
  }
  function build(){
    built=true;view=document.getElementById('learn');
    view.addEventListener('click',onClick);view.addEventListener('input',onInput);view.addEventListener('change',onInput);
    view.addEventListener('pointerdown',onKeyDown);
    document.addEventListener('pointerup',onKeyUp);document.addEventListener('pointercancel',onKeyUp);
    window.addEventListener('resize',function(){if(MODE==='learn'&&P2)layout();});
  }

  /* ---------- library ---------- */
  var LIBG='First steps';try{LIBG=localStorage.getItem('jr-learn-genre')||LIBG;}catch(e){}
  function showLibrary(){
    stopPlayer();P2=null;
    var all=idx(),tot=0,earned=0;all.forEach(function(s){tot+=3;earned+=pr(s.id).stars||0;});
    var h='<div class="lib"><div class="libhead"><div><h2>Learn piano</h2><p class="hint">Pick a piece. Every song has falling notes and real sheet music side by side. Start with <b>First steps</b> if you have never read music.</p></div>'+
      '<div class="libsum">'+stars(3)+'<b>'+earned+'</b><span>of '+tot+' stars</span></div></div>'+
      '<div class="gtabs" role="tablist">'+GENRES.filter(function(g){return all.some(function(s){return s.g===g;});}).map(function(g){
        var n=all.filter(function(s){return s.g===g;}).length;return'<button class="gtab" data-genre="'+esc(g)+'" aria-pressed="'+(g===LIBG)+'">'+esc(g)+'<small>'+n+'</small></button>';}).join('')+'</div><div class="libbody">';
    for(var lv=1;lv<=5;lv++){
      var ss=all.filter(function(s){return s.g===LIBG&&s.lv===lv;});if(!ss.length)continue;
      h+='<section><h4><span class="lvdot lv'+lv+'"></span>'+LV[lv]+'</h4><div class="scards">'+ss.map(function(s){
        var p=pr(s.id),mins=s.beats*60/s.bpm;
        return'<button class="scard" data-song="'+s.id+'"><span class="sct">'+esc(s.t)+'</span><span class="scc">'+esc(s.c)+(s.y?' · '+s.y:'')+'</span>'+
          '<span class="scm"><span>'+fmtTime(mins)+'</span><span>'+(s.hands.length>1?'Both hands':(s.hands[0]?'Left hand':'Right hand'))+'</span>'+(s.fing==='score'?'<span>Fingering</span>':'')+'</span>'+
          '<span class="scs">'+stars(p.stars||0)+(p.best?'<span class="scb">'+Math.round(p.best)+'%</span>':'')+'</span></button>';}).join('')+'</div></section>';
    }
    h+='</div></div>';
    view.innerHTML=h;
  }

  /* ---------- player ---------- */
  function keyRange(notes){
    var lo=127,hi=0;notes.forEach(function(n){if(n[2]<lo)lo=n[2];if(n[2]>hi)hi=n[2];});
    lo=Math.max(21,lo-2);hi=Math.min(108,hi+2);
    while([1,3,6,8,10].indexOf(lo%12)>=0)lo--;while([1,3,6,8,10].indexOf(hi%12)>=0)hi++;
    if(hi-lo<24){var mid=(lo+hi)/2;lo=Math.round(mid-12);hi=lo+24;while([1,3,6,8,10].indexOf(lo%12)>=0)lo--;while([1,3,6,8,10].indexOf(hi%12)>=0)hi++;}
    return[lo,hi];
  }
  function openSong(id){
    var meta=songMeta(id);if(!meta)return;
    view.innerHTML='<div class="lload"><div class="spin"></div><p>Getting "'+esc(meta.t)+'" ready…</p></div>';
    Promise.all([loadSong(id),ensureSamples('piano')]).then(function(a){
      var d=a[0].data,p=pr(id),hintLv=(p.stars||0)>=3?0:(p.stars||0)>=2?1:2;
      P2={meta:meta,id:id,mxl:a[0].mxl,raw:d.n,bars:d.bars&&d.bars.length?d.bars:[0],bpm:meta.bpm,tempo:p.tempo||(meta.lv>=4?.6:meta.lv>=3?.75:.85),
        hands:p.hands||'both',wait:p.wait!=null?p.wait:true,names:hintLv>=2,fingers:hintLv>=1,other:true,metro:false,view:'both',
        pos:-2,playing:false,listen:false,loopA:null,loopB:null,rec:[],done:false,last:0};
      var r=keyRange(d.n);P2.lo=r[0];P2.hi=r[1];
      kbBase=12*Math.floor((d.n.filter(function(n){return n[3]===0;}).reduce(function(a,n){return Math.min(a,n[2]);},72))/12);
      prepNotes();showPlayer();
      if(LESSON[id]&&!(p.plays>0))lessonCard();
    },function(){view.innerHTML='<div class="lload"><p>Could not open this piece. Check your connection and try again.</p><button data-x="lib">Back to the library</button></div>';});
  }
  function prepNotes(){
    var P=P2,hand=P.hands;
    P.notes=P.raw.map(function(n,i){var tgt=hand==='both'||(hand==='R'&&n[3]===0)||(hand==='L'&&n[3]===1);return{t:n[0],d:n[1],m:n[2],h:n[3],f:n[4],i:i,tgt:tgt,hit:null,err:null,played:false};});
    P.end=P.notes.reduce(function(a,n){return Math.max(a,n.t+n.d);},0);
    var g={};P.notes.forEach(function(n){if(n.tgt){(g[n.t]||(g[n.t]=[])).push(n);}});
    P.groups=Object.keys(g).map(Number).sort(function(a,b){return a-b;}).map(function(t){return{t:t,ns:g[t]};});
    P.gi=0;P.wrong=0;P.rec=[];P.done=false;
  }
  function spb(){return 60/(P2.bpm*P2.tempo);}
  function barOf(pos){var b=0;for(var i=0;i<P2.bars.length;i++)if(P2.bars[i]<=pos+1e-6)b=i;return b;}
  function barEnd(i){return i+1<P2.bars.length?P2.bars[i+1]:P2.end;}
  function showPlayer(){
    var P=P2,m=P.meta;
    view.innerHTML='<div class="lp">'+
      '<div class="lptop">'+
        '<button class="ib" data-x="lib" title="Back to the library" aria-label="Back to the library"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>'+
        '<div class="lpt"><b>'+esc(m.t)+'</b><span>'+esc(m.c)+' · '+LV[m.lv]+'</span></div>'+
        '<button class="round play" data-x="play" aria-label="Play">'+IC.play+'</button>'+
        '<button class="ib" data-x="restart" title="Start again" aria-label="Start again"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/></svg></button>'+
        '<div class="lpbar" id="lpBar">Bar 1</div>'+
        '<div class="seg2" role="group" aria-label="Hands"><button data-hands="L" aria-pressed="'+(P.hands==='L')+'">Left</button><button data-hands="both" aria-pressed="'+(P.hands==='both')+'">Both</button><button data-hands="R" aria-pressed="'+(P.hands==='R')+'">Right</button></div>'+
        '<button class="tog" data-x="wait" aria-pressed="'+P.wait+'" title="The music waits until you play the right notes">Wait for me</button>'+
        '<label class="tempo" title="Tempo">'+IC.metro.replace('class="i"','class="i tmi"')+'<input type="range" id="lpTempo" min="0.25" max="1.2" step="0.05" value="'+P.tempo+'" aria-label="Tempo"><b id="lpTempoV">'+Math.round(P.tempo*100)+'%</b></label>'+
        '<span class="grow"></span>'+
        '<select id="lpLoop" title="Practise a few bars over and over"><option value="0">No loop</option><option value="1">Loop 1 bar</option><option value="2">Loop 2</option><option value="4">Loop 4</option></select>'+
        '<div class="seg2" role="group" aria-label="Hints"><button data-x="names" aria-pressed="'+P.names+'" title="Show note names">ABC</button><button data-x="fingers" aria-pressed="'+P.fingers+'" title="Show finger numbers">123</button><button data-x="metro" aria-pressed="'+P.metro+'" title="Metronome click" aria-label="Metronome">'+IC.count+'</button></div>'+
        '<button class="ib" data-x="listen" title="Listen: hear the piece played for you" aria-label="Listen">'+IC.phones+'</button>'+
        '<select id="lpView" title="What to show"><option value="both">Both views</option><option value="notes">Notes only</option><option value="sheet">Music only</option></select>'+
      '</div>'+
      '<div class="lpmain v-'+P.view+'"><div class="lpleft"><div class="lpfall"><canvas id="lpCv"></canvas><div class="lpmsg" id="lpMsg"></div></div><div class="lpkb" id="lpKb"></div></div><div class="lpsheet" id="lpSheet"><div class="lload small"><div class="spin"></div></div></div></div>'+
    '</div>';
    view.querySelector('#lpView').value=P.view;
    layout();loadSheet();draw();
    msg(P.wait?'Press <b>Play</b>. In <b>Wait for me</b> mode the music pauses until you play the right notes.':'Press <b>Play</b> and play along.');
  }
  function msg(h,t){var el=view&&view.querySelector('#lpMsg');if(!el)return;el.innerHTML=h||'';el.classList.toggle('show',!!h);clearTimeout(el._t);if(h&&t)el._t=setTimeout(function(){el.classList.remove('show');},t);}
  function lessonCard(){
    var L=LESSON[P2.id];if(!L)return;
    openModal('<h3>'+L[0]+'</h3><p class="hint lesson">'+L[1]+'</p><div class="row" style="justify-content:flex-end"><button class="primary" data-x="close">Let\'s play</button></div>',function(e){var b=e.target.closest('button');if(b)closeModal();});
  }

  /* keyboard geometry shared by the canvas and the keys */
  var GEO=null;
  function isBlack(m){return[1,3,6,8,10].indexOf(m%12)>=0;}
  function layout(){
    var P=P2;if(!P)return;var kb=view.querySelector('#lpKb'),fall=view.querySelector('.lpfall');if(!kb)return;
    var W=fall.clientWidth||kb.clientWidth,whites=[];for(var m=P.lo;m<=P.hi;m++)if(!isBlack(m))whites.push(m);
    var ww=W/whites.length,x={},w={};
    whites.forEach(function(m,i){x[m]=i*ww;w[m]=ww;});
    for(m=P.lo;m<=P.hi;m++)if(isBlack(m)){var o={1:.62,3:.72,6:.6,8:.67,10:.75}[m%12];x[m]=x[m-1]+ww*o;w[m]=ww*.6;}
    GEO={x:x,w:w,ww:ww,W:W};
    var h='';
    whites.forEach(function(m){h+='<div class="lk w" data-m="'+m+'" style="left:'+x[m].toFixed(1)+'px;width:'+(ww-1).toFixed(1)+'px"><i></i><em>'+(m%12===0?'C'+(Math.floor(m/12)-1):'')+'</em></div>';});
    for(m=P.lo;m<=P.hi;m++)if(isBlack(m))h+='<div class="lk b" data-m="'+m+'" style="left:'+x[m].toFixed(1)+'px;width:'+w[m].toFixed(1)+'px"><i></i></div>';
    kb.style.width=W+'px';kb.innerHTML=h;
    var cv=view.querySelector('#lpCv'),d=window.devicePixelRatio||1;cv.width=W*d;cv.height=fall.clientHeight*d;cv.style.width=W+'px';cv.style.height=fall.clientHeight+'px';
    draw();
  }
  function noteName(m){var n=(FLAT()?NNF:NN)[m%12];return n;}
  function FLAT(){return P2&&P2.meta.ks<0;}

  /* ---------- sheet music ---------- */
  function loadSheet(){
    var P=P2,host=view.querySelector('#lpSheet');
    osmd().then(function(O){
      if(P!==P2)return;
      host.innerHTML='<div class="paper" id="lpPaper"></div>';
      var o=new O.OpenSheetMusicDisplay(host.querySelector('#lpPaper'),{autoResize:false,backend:'svg',drawTitle:false,drawSubtitle:false,drawComposer:false,drawLyricist:false,drawPartNames:false,drawPartAbbreviations:false,drawCredits:false,drawFingerings:true,followCursor:false,cursorsOptions:[{type:0,color:'#2f7a55',alpha:.45,follow:false}]});
      P.osmd=o;
      return o.load(new Uint8Array(P.mxl).length?blobString(P.mxl):'').then(function(){
        if(P!==P2)return;
        try{o.zoom=Math.max(.55,Math.min(1,(host.clientWidth-20)/900));}catch(e){}
        o.render();o.cursor.show();
        /* every cursor step and the beat it starts on, so the cursor can follow the music */
        var steps=[],c=o.cursor;c.reset();var guard=0;
        while(!c.Iterator.EndReached&&guard++<20000){steps.push(c.Iterator.currentTimeStamp.RealValue*4);c.next();}
        c.reset();P.steps=steps;P.ci=0;
        renderFingerToggle();
      });
    }).catch(function(e){host.innerHTML='<p class="hint" style="padding:16px">Sheet music could not be shown here, but the falling notes still work.</p>';});
  }
  function blobString(ab){
    /* OSMD reads compressed .mxl when given a binary string */
    var u=new Uint8Array(ab),s='',C=0x8000;for(var i=0;i<u.length;i+=C)s+=String.fromCharCode.apply(null,u.subarray(i,i+C));return s;
  }
  function renderFingerToggle(){var o=P2&&P2.osmd;if(!o)return;try{o.EngravingRules.RenderFingerings=!!P2.fingers;o.render();o.cursor.show();moveCursor(true);}catch(e){}}
  function moveCursor(force){
    var P=P2;if(!P||!P.osmd||!P.steps)return;
    var k=0,pos=Math.max(0,P.pos);for(var i=0;i<P.steps.length;i++){if(P.steps[i]<=pos+1e-6)k=i;else break;}
    if(k===P.ci&&!force)return;
    var c=P.osmd.cursor;
    try{
      if(k<P.ci||force){c.reset();for(var j=0;j<k;j++)c.next();}else{for(j=P.ci;j<k;j++)c.next();}
      P.ci=k;
      var ce=c.cursorElement,host=view.querySelector('#lpSheet');
      if(ce&&host){var top=ce.offsetTop,ht=host.clientHeight;if(top<host.scrollTop+30||top>host.scrollTop+ht*.6)host.scrollTo({top:Math.max(0,top-ht*.25),behavior:'smooth'});}
    }catch(e){}
  }

  /* ---------- sound ---------- */
  function out(){
    var c=ensureAudio();
    if(!bus||bus.context!==c){bus=c.createGain();bus.gain.value=.9;bus.connect(A.master);var s=c.createGain();s.gain.value=.18;bus.connect(s);s.connect(A.rev);}
    return bus;
  }
  function sound(m,v,dur){var c=ensureAudio(),h=playInst('piano',c,out(),m,c.currentTime+.005,v);if(dur)h.release(c.currentTime+dur);return h;}
  function tick(acc){var c=ensureAudio(),o=c.createOscillator(),g=c.createGain(),t=c.currentTime+.005;o.frequency.value=acc?1500:1000;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(acc?.22:.14,t+.002);g.gain.setTargetAtTime(.0001,t+.003,.015);o.connect(g);g.connect(A.master);o.start(t);o.stop(t+.1);}

  /* ---------- clock ---------- */
  function play(listen){
    var P=P2;if(!P)return;ensureAudio();wakeAudio();
    if(P.done||P.pos>=P.end){restart(true);}
    P.listen=!!listen;P.playing=true;P.last=performance.now();P.started=P.started||Date.now();
    var b=view.querySelector('[data-x=play]');if(b){b.innerHTML=IC.stop;b.setAttribute('aria-label','Pause');}
    msg('');cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  }
  function pause(){
    var P=P2;if(!P)return;P.playing=false;cancelAnimationFrame(raf);
    var b=view&&view.querySelector('[data-x=play]');if(b){b.innerHTML=IC.play;b.setAttribute('aria-label','Play');}
    P.notes.forEach(function(n){if(n.h_&&!n.hold){n.h_.release(A.c.currentTime);n.h_=null;}});
  }
  function stopPlayer(){if(P2)pause();cancelAnimationFrame(raf);}
  function restart(keep){
    var P=P2;if(!P)return;var wasPlaying=P.playing;pause();
    var start=P.loopA!=null?P.loopA:0;
    P.notes.forEach(function(n){n.hit=null;n.err=null;n.played=false;});
    P.pos=start-(start>0?1:2);P.gi=0;while(P.gi<P.groups.length&&P.groups[P.gi].t<start-1e-6)P.gi++;
    P.wrong=0;P.rec=[];P.done=false;P.started=null;
    moveCursor(true);draw();if(wasPlaying&&!keep)play(P.listen);
  }
  var lastBeat=-1;
  function frame(now){
    var P=P2;if(!P||!P.playing)return;raf=requestAnimationFrame(frame);
    var dt=Math.min(.1,(now-P.last)/1000);P.last=now;
    var next=P.pos+dt/spb();
    /* wait for me: hold at the next group of notes until they are all played */
    if(P.wait&&!P.listen){
      while(P.gi<P.groups.length&&P.groups[P.gi].ns.every(function(n){return n.hit;}))P.gi++;
      var g=P.groups[P.gi];
      if(g&&next>=g.t){next=g.t;if(!P.waitMsg){P.waitMsg=1;}}else P.waitMsg=0;
    }
    /* accompaniment / listen: play notes as they reach the line */
    P.notes.forEach(function(n){
      if(n.played||n.t>next)return;if(n.t<P.pos-.01&&P.pos>0){n.played=true;return;}
      if(P.listen||!n.tgt){if(P.listen||P.other){n.h_=sound(n.m,n.tgt?.75:.55,null);n.endAt=n.t+n.d;flash(n.m,n.h,true);}}
      n.played=true;
    });
    P.notes.forEach(function(n){if(n.h_&&next>=n.endAt){n.h_.release(A.c.currentTime);n.h_=null;flash(n.m,n.h,false);}});
    /* missed notes when playing along */
    if(!P.wait&&!P.listen){var win=.3/spb();P.notes.forEach(function(n){if(n.tgt&&!n.hit&&next>n.t+win){n.hit='miss';}});}
    if(P.metro){var bt=Math.floor(next);if(bt!==lastBeat&&next>=0){lastBeat=bt;var bi=barOf(next);tick(Math.abs(next-P.bars[bi])<.05||Math.abs(bt-P.bars[bi])<1e-6);}}
    P.pos=next;
    /* loop */
    if(P.loopB!=null&&P.pos>=P.loopB){restartLoop();}
    else if(P.pos>=P.end+.5){finish();return;}
    var bl=view.querySelector('#lpBar');if(bl)bl.textContent=P.pos<0?'Get ready':'Bar '+(barOf(P.pos)+1)+' of '+P.bars.length;
    moveCursor();draw();
  }
  function restartLoop(){
    var P=P2;P.notes.forEach(function(n){if(n.t>=P.loopA-1e-6&&n.t<P.loopB){n.hit=null;n.played=false;}});
    P.pos=P.loopA-.5;P.gi=0;while(P.gi<P.groups.length&&P.groups[P.gi].t<P.loopA-1e-6)P.gi++;
    P.loops=(P.loops||0)+1;moveCursor(true);
  }
  function setLoop(nb){
    var P=P2;if(!nb){P.loopA=P.loopB=null;msg('Loop off',1500);return;}
    var b=barOf(Math.max(0,P.pos));P.loopA=P.bars[b];P.loopB=barEnd(Math.min(P.bars.length-1,b+nb-1));
    msg('Looping bar'+(nb>1?'s '+(b+1)+'–'+(b+nb):' '+(b+1))+'. Choose "Loop: off" to continue.',2500);
    if(P.pos<P.loopA-1||P.pos>P.loopB){P.pos=P.loopA-.5;P.gi=0;while(P.gi<P.groups.length&&P.groups[P.gi].t<P.loopA-1e-6)P.gi++;}
  }

  /* ---------- input ---------- */
  function press(m,v){
    var P=P2;if(!P)return;var c=ensureAudio();
    held[m]=sound(m,v||.8,null);flash(m,null,true,true);
    if(!P.playing||P.listen){return;}
    var pos=P.pos,matched=null,best=1e9;
    if(P.wait){
      var g=P.groups[P.gi];
      if(g)g.ns.forEach(function(n){if(!n.hit&&n.m===m&&pos>=g.t-.75){matched=n;}});
      if(matched){matched.hit='ok';matched.err=(pos-matched.t)*spb();}
    }else{
      var win=.3/spb();
      P.notes.forEach(function(n){if(n.tgt&&!n.hit&&n.m===m){var e=Math.abs(pos-n.t);if(e<=win&&e<best){best=e;matched=n;}}});
      if(matched){var es=(pos-matched.t)*spb();matched.err=es;matched.hit=Math.abs(es)<=.12?'ok':(es<0?'early':'late');}
    }
    P.rec.push({t:pos,m:m,v:v||.8,ok:!!matched});
    if(!matched&&pos>=0){P.wrong++;wrongFlash(m);}
  }
  function release(m){if(held[m]){held[m].release(A.c.currentTime);delete held[m];}flash(m,null,false,true);}
  function flash(m,h,on,user){
    var k=view&&view.querySelector('.lk[data-m="'+m+'"]');if(!k)return;
    k.classList.toggle(user?'on':'auto',on);if(h!=null)k.classList.toggle('lh',h===1);
  }
  function wrongFlash(m){var k=view&&view.querySelector('.lk[data-m="'+m+'"]');if(!k)return;k.classList.add('bad');setTimeout(function(){k.classList.remove('bad');},250);}
  function onKeyDown(e){
    if(MODE!=='learn')return;var k=e.target.closest&&e.target.closest('.lk');if(!k)return;
    e.preventDefault();var r=k.getBoundingClientRect(),v=e.pointerType==='pen'&&e.pressure>0&&e.pressure!==.5?Math.max(.2,Math.min(1,.15+e.pressure)):(e.pointerType==='mouse'?.8:Math.max(.35,Math.min(1,.4+(e.clientY-r.top)/r.height*.6)));
    var m=+k.dataset.m;held['p'+e.pointerId]=m;press(m,v);
  }
  function onKeyUp(e){if(MODE!=='learn')return;var m=held['p'+e.pointerId];if(m!=null){delete held['p'+e.pointerId];release(m);}}
  var KEYS={KeyZ:0,KeyS:1,KeyX:2,KeyD:3,KeyC:4,KeyV:5,KeyG:6,KeyB:7,KeyH:8,KeyN:9,KeyJ:10,KeyM:11,Comma:12,KeyL:13,Period:14,Semicolon:15,Slash:16,
    KeyQ:12,Digit2:13,KeyW:14,Digit3:15,KeyE:16,KeyR:17,Digit5:18,KeyT:19,Digit6:20,KeyY:21,Digit7:22,KeyU:23,KeyI:24,Digit9:25,KeyO:26,Digit0:27,KeyP:28};
  var kdown={};
  function key(e,isDown){
    if(!P2){if(isDown&&e.code==='Escape'){setMode('studio');return true;}return false;}
    if(isDown){
      if(e.code==='Space'){e.preventDefault();if(!e.repeat){if(P2.playing)pause();else play(false);}return true;}
      if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();kbBase=Math.max(24,Math.min(96,kbBase+(e.code==='ArrowUp'?12:-12)));msg('Computer keys now start at C'+(kbBase/12-1),1500);return true;}
      if(e.code==='Escape'){pause();return true;}
      var o=KEYS[e.code];if(o==null)return false;e.preventDefault();if(e.repeat||kdown[e.code]!=null)return true;
      kdown[e.code]=kbBase+o;press(kbBase+o,.8);return true;
    }else{var m=kdown[e.code];if(m!=null){delete kdown[e.code];release(m);return true;}return false;}
  }
  function midi(st,n,vel){
    if(st===0x90&&vel>0)press(n,Math.max(.2,vel/127));else if(st===0x80||(st===0x90&&vel===0))release(n);
  }

  /* ---------- drawing ---------- */
  function draw(){
    var P=P2;if(!P||!GEO)return;var cv=view.querySelector('#lpCv');if(!cv)return;
    var g=cv.getContext('2d'),d=window.devicePixelRatio||1,W=cv.width/d,H=cv.height/d;g.setTransform(d,0,0,d,0,0);
    g.fillStyle='#0b1611';g.fillRect(0,0,W,H);
    /* lanes */
    for(var m=P.lo;m<=P.hi;m++){if(!isBlack(m)){if(m%12===0||m%12===5){g.fillStyle=m%12===0?'rgba(212,166,94,.13)':'rgba(255,255,255,.04)';g.fillRect(GEO.x[m],0,1,H);}}else{g.fillStyle='rgba(0,0,0,.18)';g.fillRect(GEO.x[m],0,GEO.w[m],H);}}
    var pxb=Math.max(40,Math.min(160,H/(3.2/spb()))),hit=H-4;
    function y(t){return hit-(t-P.pos)*pxb;}
    /* bar lines */
    g.font='600 10px system-ui,sans-serif';g.textAlign='left';
    P.bars.forEach(function(b,i){var yy=y(b);if(yy<-20||yy>H)return;g.fillStyle='rgba(212,166,94,.22)';g.fillRect(0,yy,W,1);g.fillStyle='rgba(236,229,211,.4)';g.fillText(i+1,4,yy-3);});
    if(P.loopA!=null){g.fillStyle='rgba(109,181,143,.06)';var ya=y(P.loopA),yb=y(P.loopB);g.fillRect(0,yb,W,ya-yb);}
    /* notes */
    var now={};
    P.notes.forEach(function(n){
      var y1=y(n.t),y0=y(n.t+n.d);if(y1<-4||y0>H)return;if(n.m<P.lo||n.m>P.hi)return;
      var x=GEO.x[n.m]+1,w=GEO.w[n.m]-2,blk=isBlack(n.m),col=n.h?[212,166,94]:[109,181,143];
      if(!n.tgt)col=n.h?[150,120,80]:[80,130,105];
      var a=n.tgt?1:.45,hitc=n.hit==='ok'?'#a9e6c5':n.hit==='early'?'#7ea7c9':n.hit==='late'?'#e0b060':n.hit==='miss'?'#9a4a3a':null;
      g.globalAlpha=a;g.fillStyle=hitc||'rgb('+col.join(',')+')';
      var h=Math.max(6,y1-y0-2);
      if(g.roundRect){g.beginPath();g.roundRect(x,y0+1,w,h,Math.min(6,w/2));g.fill();}else g.fillRect(x,y0+1,w,h);
      if(blk){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x,y0+1,w,h);}
      g.globalAlpha=1;
      if(n.tgt&&(P.names||P.fingers)&&w>=11&&h>=14){
        g.textAlign='center';g.fillStyle='#07130d';
        var lab=[];if(P.fingers&&n.f)lab.push(n.f);if(P.names)lab.push(noteName(n.m));
        g.font='700 '+Math.min(12,w*.55)+'px system-ui,sans-serif';
        if(P.fingers&&n.f){g.fillText(n.f,x+w/2,y1-5);}
        if(P.names&&h>=28){g.font='600 '+Math.min(10,w*.45)+'px system-ui,sans-serif';g.fillText(noteName(n.m),x+w/2,y1-(P.fingers&&n.f?18:5));}
      }
      if(n.t<=P.pos+.02&&n.t+n.d>P.pos&&n.tgt)now[n.m]=n;
    });
    /* hit line */
    var gr=g.createLinearGradient(0,hit-10,0,hit+4);gr.addColorStop(0,'rgba(212,166,94,0)');gr.addColorStop(1,'rgba(212,166,94,.5)');g.fillStyle=gr;g.fillRect(0,hit-10,W,14);
    g.fillStyle='#d4a65e';g.fillRect(0,hit,W,2);
    /* key hints: what to press now (wait mode: the waiting group) */
    var want={};
    if(P.wait&&!P.listen){var gg=P.groups[P.gi];if(gg&&gg.t-P.pos<1.5)gg.ns.forEach(function(n){if(!n.hit)want[n.m]=n;});}
    else Object.keys(now).forEach(function(k){want[k]=now[k];});
    view.querySelectorAll('.lk').forEach(function(k){var m=+k.dataset.m,n=want[m];k.classList.toggle('want',!!n);k.classList.toggle('wl',!!n&&n.h===1);var i=k.firstChild;var t=n&&P.fingers&&n.f?n.f:'';if(i.textContent!=t)i.textContent=t;});
  }

  /* ---------- results + practice recorder ---------- */
  function finish(){
    var P=P2;pause();P.done=true;
    var tg=P.notes.filter(function(n){return n.tgt&&(P.loopA==null||(n.t>=P.loopA&&n.t<P.loopB));});
    if(P.listen||!tg.length){P.listen=false;msg('That\'s how it sounds. Now press <b>Play</b> and try it yourself.');return;}
    var ok=tg.filter(function(n){return n.hit&&n.hit!=='miss';}).length,early=tg.filter(function(n){return n.hit==='early';}).length,late=tg.filter(function(n){return n.hit==='late';}).length,miss=tg.length-ok;
    var acc=Math.max(0,Math.min(100,100*ok/(tg.length+.5*P.wrong)));if(!P.wait)acc=Math.max(0,100*(ok-.5*(early+late))/(tg.length+.5*P.wrong));
    var st=acc>=90?3:acc>=75?2:acc>=50?1:0;
    var p=PROG[P.id]||(PROG[P.id]={});p.plays=(p.plays||0)+1;p.tempo=P.tempo;p.hands=P.hands;p.wait=P.wait;
    var counts=P.tempo>=.7&&P.hands==='both'||P.meta.hands.length<2;
    var newBest=false;
    if(counts&&acc>(p.best||0)){p.best=acc;newBest=true;}
    if(counts&&st>(p.stars||0))p.stars=st;
    p.mins=(p.mins||0)+(P.started?(Date.now()-P.started)/60000:0);P.started=null;
    save();
    /* hardest bar: most missed/wrong-timed notes */
    var per={};tg.forEach(function(n){if(n.hit==='miss'||n.hit==='early'||n.hit==='late'){var b=barOf(n.t);per[b]=(per[b]||0)+(n.hit==='miss'?2:1);}});
    var worst=Object.keys(per).sort(function(a,b){return per[b]-per[a];})[0];
    var tip=P.wait?(P.wrong>tg.length*.15?'Lots of wrong keys: try one hand at a time, or turn on note names.':'Nice! Try turning <b>Wait for me</b> off to play in time.'):
      (early>late*2&&early>3?'You tend to rush: a little ahead of the beat. Try the metronome.':late>early*2&&late>3?'You tend to drag behind the beat. Look ahead at the falling notes.':miss>tg.length*.2?'Missed quite a few: slow the tempo down and loop the hard bar.':'Steady timing. Speed the tempo up a little next time.');
    var why=counts?'':'<p class="hint">Stars count at 70% tempo or faster with both hands. This run is practice.</p>';
    openModal('<h3>'+(st===3?'Brilliant!':st===2?'Great playing':st===1?'Good effort':'Keep going')+'</h3>'+
      '<div class="res">'+stars(st,true)+'<div class="resn"><b>'+Math.round(acc)+'%</b><span>'+(newBest?'New best!':'Best '+Math.round(p.best||0)+'%')+'</span></div></div>'+
      '<div class="resg"><span><b>'+ok+'</b> right</span>'+(!P.wait?'<span class="e"><b>'+early+'</b> early</span><span class="l"><b>'+late+'</b> late</span>':'')+'<span class="m"><b>'+miss+'</b> missed</span><span class="w"><b>'+P.wrong+'</b> wrong keys</span></div>'+
      '<canvas class="tl" id="resTl"></canvas><p class="hint">'+tip+'</p>'+why+
      '<div class="row" style="justify-content:space-between"><span class="row"><button data-r="mine">'+IC.play+' Hear my take</button>'+(worst!=null?'<button data-r="worst">Practise bar '+(+worst+1)+'</button>':'')+'</span><span class="row"><button data-r="lib">Library</button><button class="primary" data-r="again">Play again</button></span></div>',
      function(e){var b=e.target.closest('button');if(!b)return;var r=b.dataset.r;
        if(r==='mine'){playTake();return;}
        closeModal();
        if(r==='again')restart(true);
        else if(r==='worst'){P.loopA=P.bars[+worst];P.loopB=barEnd(+worst);var sel=view.querySelector('#lpLoop');if(sel)sel.value='1';restart(true);msg('Looping bar '+(+worst+1)+'. Slow the tempo down if you need to.',3000);}
        else if(r==='lib')showLibrary();
      });
    $('mBox').classList.add('med');
    drawTimeline(tg);
  }
  function drawTimeline(tg){
    var cv=document.getElementById('resTl');if(!cv)return;var P=P2,d=window.devicePixelRatio||1,W=cv.clientWidth||600,H=70;cv.width=W*d;cv.height=H*d;var g=cv.getContext('2d');g.setTransform(d,0,0,d,0,0);
    var t0=tg[0].t,t1=tg[tg.length-1].t+1,sx=function(t){return 8+(t-t0)/(t1-t0)*(W-16);};
    g.fillStyle='#0d1814';g.fillRect(0,0,W,H);
    P.bars.forEach(function(b,i){if(b<t0||b>t1)return;g.fillStyle='rgba(212,166,94,.2)';g.fillRect(sx(b),0,1,H);});
    g.fillStyle='rgba(255,255,255,.12)';g.fillRect(0,H/2,W,1);
    tg.forEach(function(n){var c=n.hit==='ok'?'#6db58f':n.hit==='early'?'#7ea7c9':n.hit==='late'?'#e0b060':'#c0563e';var e=n.err!=null&&!P.wait?Math.max(-1,Math.min(1,n.err/.3)):0;
      g.fillStyle=c;g.beginPath();g.arc(sx(n.t),H/2+e*(H/2-8),n.hit==='miss'||!n.hit?3.5:3,0,7);g.fill();});
    g.font='600 9px system-ui';g.fillStyle='rgba(236,229,211,.5)';g.fillText(P.wait?'each dot is a note':'early ↑   on time   ↓ late',6,10);
  }
  function playTake(){
    var P=P2;if(!P.rec.length)return;var c=ensureAudio(),t0=c.currentTime+.1,first=P.rec[0].t,s=spb();
    P.rec.forEach(function(r){var h=playInst('piano',c,out(),r.m,t0+(r.t-first)*s,r.v);h.release(t0+(r.t-first)*s+.45);});
  }

  /* ---------- events ---------- */
  function onClick(e){
    var b=e.target.closest('button,[data-song],[data-genre]');if(!b)return;
    if(b.dataset.genre){LIBG=b.dataset.genre;try{localStorage.setItem('jr-learn-genre',LIBG);}catch(er){}showLibrary();view.querySelector('.libbody').scrollTop=0;return;}
    if(b.dataset.song){openSong(b.dataset.song);return;}
    var x=b.dataset.x,P=P2;
    if(x==='lib'){showLibrary();return;}
    if(!P)return;
    if(b.dataset.hands){P.hands=b.dataset.hands;var pw=P.playing;pause();prepNotes();P.pos=Math.min(P.pos,P.loopA!=null?P.loopA:P.pos);view.querySelectorAll('[data-hands]').forEach(function(z){z.setAttribute('aria-pressed',z.dataset.hands===P.hands);});restart(true);draw();
      msg(P.hands==='both'?'Both hands':'Your '+(P.hands==='R'?'right':'left')+' hand. The other hand plays along for you.',2500);return;}
    if(x==='play'){if(P.playing)pause();else play(false);return;}
    if(x==='listen'){restart(true);play(true);msg('Listening… press Play to try it yourself.',2500);return;}
    if(x==='restart'){restart(true);return;}
    if(x==='wait'){P.wait=!P.wait;b.setAttribute('aria-pressed',P.wait);msg(P.wait?'The music waits for you.':'Play along in time. Notes you miss go red.',2000);return;}
    if(x==='names'){P.names=!P.names;b.setAttribute('aria-pressed',P.names);draw();return;}
    if(x==='fingers'){P.fingers=!P.fingers;b.setAttribute('aria-pressed',P.fingers);draw();renderFingerToggle();return;}
    if(x==='metro'){P.metro=!P.metro;b.setAttribute('aria-pressed',P.metro);msg(P.metro?'Metronome on':'Metronome off',1200);return;}
  }
  function onInput(e){
    var P=P2;if(!P)return;
    if(e.target.id==='lpTempo'){P.tempo=+e.target.value;var v=view.querySelector('#lpTempoV');if(v)v.textContent=Math.round(P.tempo*100)+'%';draw();}
    if(e.target.id==='lpLoop'&&e.type==='change'){setLoop(+e.target.value);}
    if(e.target.id==='lpView'&&e.type==='change'){P.view=e.target.value;var mm=view.querySelector('.lpmain');mm.className='lpmain v-'+P.view;layout();if(P.osmd){try{P.osmd.render();P.osmd.cursor.show();moveCursor(true);}catch(er){}}}
  }
  window.__learnState=function(){return P2;};window.__learnOpen=openSong;window.__learnPress=press;window.__learnRelease=release;
  return{setMode:setMode,key:key,midi:midi,loadData:loadSong,osmd:osmd,open:function(){setMode('learn');},songs:idx,openSong:function(id){setMode('learn');openSong(id);},state:function(){return P2;},press:press,release:release};
})();
