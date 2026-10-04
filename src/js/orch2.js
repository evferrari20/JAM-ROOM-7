/* =============== ORCHESTRA WORKSPACE ===============
   The Orchestra tab opens its own piece in the same editor as the Studio (piano roll, recording with
   everything playing along, mixer, effects, undo), set up the way composers build orchestral music:
   tracks grouped by section (Strings, Woodwinds, Brass, Percussion, Harp & keys, Voices), added one
   section or one instrument at a time. A "Piano sketch" track can hold the tune and chords, and any part
   can be written from it in a chosen style (orch.js does the orchestration). Saved separately from the
   Studio song: switching tabs swaps the two. */
var SLOT='studio';
function slotKey(){return SLOT==='orch'?'__orch__':'__auto__';}
var ORCH2=(function(){
  var SEC_ORDER=['Sketch','Strings','Woodwinds','Brass','Percussion','Harp & keys','Voices'];
  var SECS={
    Strings:['v1','v2','va','vc','cb'],Woodwinds:['fl','ob','cl','bn','picc'],Brass:['hn','tp','tb','tu'],
    Percussion:['ti','pc'],'Harp & keys':['hp','ce','hc'],Voices:['ch']
  };
  var SOLO={q1:'Solo violin',qc:'Solo cello'};
  function R(){return ORCH.ROW;}
  function secOf(t){if(t.orow==='_sk')return'Sketch';var r=R()[t.orow];return r?r[1]:'Other';}
  function sty(){return S.osty||'romantic';}
  /* ---------- making tracks ---------- */
  function trackFor(id){
    var r=R()[id];if(!r)return null;var t=r[2]==='drums'?mkTrack('drum'):mkTrack('inst',r[2]);
    if(r[2]==='drums')t.kit='Orchestra';
    t.name=r[0];t.orow=id;t.pan=r[5]||0;t.rev=.32;t.vol=.75;t.color=ORCH.SEC_COL[r[1]]||t.color;return t;
  }
  function sketchTrack(){var t=mkTrack('inst','piano');t.name='Piano sketch';t.orow='_sk';t.color='#ece5d3';t.rev=.2;return t;}
  function sortTracks(){S.tracks.sort(function(a,b){var x=SEC_ORDER.indexOf(secOf(a)),y=SEC_ORDER.indexOf(secOf(b));if(x<0)x=99;if(y<0)y=99;return x-y;});}
  function addRows(ids){
    var added=[];ids.forEach(function(id){if(S.tracks.some(function(t){return t.orow===id;}))return;var t=trackFor(id);if(!t)return;S.tracks.push(t);if(A.c)wireTrack(t);loadTrackSamples(t);added.push(t);});
    sortTracks();if(added.length){S.sel=added[0].id;}renderAll();markDirty();return added;
  }
  function blank(ens){
    var rowsList=ens?ORCH.ENS[ens].r:[];
    return{v:1,name:'My symphony',bpm:84,key:0,scale:'Major',bars:16,space:'Hall',loop:false,metro:false,count:true,master:.85,tune:REF,
      parts:[{id:'p1',name:'Main'}],part:'p1',arr:['p1'],tracks:[]};
  }
  function setupTracks(ens){
    S.tracks.forEach(unwireTrack);S.tracks=[sketchTrack()];
    (ens?ORCH.ENS[ens].r:[]).forEach(function(id){var t=trackFor(id);if(t)S.tracks.push(t);});
    sortTracks();if(A.c)S.tracks.forEach(wireTrack);S.tracks.forEach(loadTrackSamples);
    S.sel=(S.tracks[1]||S.tracks[0]).id;S.lastInst=S.sel;renderAll();markDirty();
  }
  /* ---------- entering and leaving: swap the Orchestra piece and the Studio song ---------- */
  var busy=false;
  async function enter(){
    if(busy||SLOT==='orch')return;busy=true;
    try{
      if(P.playing)stop();clearTimeout(dirtyT);await dbPut('__auto__');
      SLOT='orch';document.body.classList.add('orchmode');
      var rec=await dbGet('__orch__');
      if(rec&&rec.data&&rec.data.tracks&&rec.data.tracks.length){applyProject(rec.data,audFromRecord(rec));sortTracks();renderAll();}
      else{applyProject(blank(),{});S.space='Hall';if(A.c)A.rev.buffer=makeIR(A.c,'Hall');syncHeader();setup(true);}
      HIST.list=[];HIST.idx=-1;commitHist();
    }finally{busy=false;}
  }
  async function leave(){
    if(busy||SLOT!=='orch')return;busy=true;
    try{
      if(P.playing)stop();clearTimeout(dirtyT);await dbPut('__orch__');
      SLOT='studio';document.body.classList.remove('orchmode');
      var rec=await dbGet('__auto__');
      if(rec&&rec.data&&rec.data.tracks)applyProject(rec.data,audFromRecord(rec));else starter();
      HIST.list=[];HIST.idx=-1;commitHist();
    }finally{busy=false;}
  }
  /* ---------- the first screen: choose how big an orchestra to start with ---------- */
  function setup(first){
    var E=ORCH.ENS,cards=[['quartet','4 players','Two violins, viola and cello. Intimate and clear.'],['chamber','11 players','Small orchestra: winds, horn, harpsichord, strings.'],
      ['symphony','17 sections','The full orchestra: strings, woodwinds, brass, timpani, harp.'],['film','14 sections','Big brass, drums, choir and strings.'],['choral','14 sections','Choir with orchestra.']];
    openModal('<h3>'+(first?'Build your orchestra piece':'Start a new orchestra piece')+'</h3>'+
      '<p class="hint">Real orchestral music is built a section at a time. Start empty and add sections as you go, or start with a whole ensemble. Each instrument gets its own track: record it on the keyboard while everything else plays, draw notes in the grid, or let Jam Room write it from a piano sketch.</p>'+
      '<div class="oset"><button class="osc primary-card" data-e=""><b>Start empty</b><span>Just a piano sketch track. Add sections one by one.</span></button>'+
      cards.map(function(c){return'<button class="osc" data-e="'+c[0]+'"><b>'+esc(E[c[0]].n)+'</b><small>'+c[1]+'</small><span>'+c[2]+'</span></button>';}).join('')+'</div>'+
      (first?'':'<p class="hint">This replaces the current orchestra piece. Your Studio song is not touched.</p>')+
      '<div class="row" style="justify-content:flex-end">'+(first?'':'<button data-x="close">Cancel</button>')+'</div>',
      function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.x==='close'){closeModal();return;}
        if(b.dataset.e==null)return;closeModal();
        if(!first){applyProject(blank(),{});S.space='Hall';if(A.c)A.rev.buffer=makeIR(A.c,'Hall');syncHeader();}
        setupTracks(b.dataset.e||null);
        toast(b.dataset.e?'Your '+ORCH.ENS[b.dataset.e].n+' is ready. Tap an instrument and press record, or fill the sketch first.':'Tap “+ Section” to add your first section');});
    $('mBox').classList.add('med');
  }
  /* ---------- adding sections or single instruments ---------- */
  function addMenu(){
    var ROW=R(),have={};S.tracks.forEach(function(t){if(t.orow)have[t.orow]=1;});
    var h='<h3>Add to your orchestra</h3><p class="hint">Add a whole section, or just the instruments you want. Each one gets its own track with its real sound.</p><div class="oadd">';
    Object.keys(SECS).forEach(function(sec){
      var ids=SECS[sec],miss=ids.filter(function(id){return!have[id];});
      h+='<div class="oag" style="--sc:'+ORCH.SEC_COL[sec]+'"><div class="oah"><b>'+esc(sec)+'</b>'+(miss.length?'<button class="primary-soft" data-sec="'+esc(sec)+'">Add whole section</button>':'<span class="hint">All added</span>')+'</div><div class="oai">'+
        ids.map(function(id){return'<button data-row="'+id+'"'+(have[id]?' disabled':'')+'>'+(have[id]?'✓ ':'+ ')+esc(ROW[id][0])+'</button>';}).join('')+'</div></div>';
    });
    h+='<div class="oag"><div class="oah"><b>Soloists</b></div><div class="oai">'+Object.keys(SOLO).map(function(id){return'<button data-row="'+id+'"'+(have[id]?' disabled':'')+'>'+(have[id]?'✓ ':'+ ')+SOLO[id]+'</button>';}).join('')+
      (S.tracks.some(function(t){return t.orow==='_sk';})?'':'<button data-row="_sk">+ Piano sketch</button>')+'</div></div></div><div class="row" style="justify-content:flex-end"><button class="primary" data-x="close">Done</button></div>';
    openModal(h,function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.x==='close'){closeModal();return;}
      if(b.dataset.sec){var add=addRows(SECS[b.dataset.sec]);toast(b.dataset.sec+' added ('+add.length+' tracks)');addMenu();return;}
      if(b.dataset.row==='_sk'){var t=sketchTrack();S.tracks.push(t);if(A.c)wireTrack(t);sortTracks();S.sel=t.id;renderAll();markDirty();addMenu();return;}
      if(b.dataset.row){addRows([b.dataset.row]);toast(R()[b.dataset.row][0]+' added');addMenu();}});
    $('mBox').classList.add('med');
  }
  /* ---------- writing parts from the sketch ---------- */
  function sketchNotes(){var sk=S.tracks.filter(function(t){return t.orow==='_sk';})[0];return sk?sk.notes.map(function(n){return{t:n.s,d:n.d,m:n.m,v:n.v||.8};}):[];}
  function write(t){
    var sk=sketchNotes();if(!sk.length){toast('Put the tune and chords in the Piano sketch track first (record or draw them), or load a classic');return false;}
    var r=ORCH.fillPart(t.orow,sk,sty(),LEN(),4);
    if(!r||!r.notes.length){toast(ORCH.STY[sty()].n+' style does not use '+t.name+'. Try another style, or play the part yourself.');return false;}
    t.notes=r.notes.map(function(n){return{s:n.t,d:n.d,m:n.m,v:n.v};});
    if(r.art==='pizz'&&/strings|contrabass|cello|violin/.test(t.inst)){t.inst0=t.inst0||t.inst;t.inst='pizz';loadTrackSamples(t);}
    t._undo=null;return true;
  }
  function writeOne(t){commitHist();if(write(t)){renderAll();markDirty();toast(t.name+' written in '+ORCH.STY[sty()].n+' style. Edit it, or record over it.');}}
  function writeSection(sec){
    var list=S.tracks.filter(function(t){return t.orow&&t.orow!=='_sk'&&(!sec||secOf(t)===sec);}),n=0;
    if(!sketchNotes().length){write({orow:'_none'});return;}
    commitHist();list.forEach(function(t){if(write(t))n++;});renderAll();markDirty();toast(n?(sec||'The whole orchestra')+': '+n+' part'+(n>1?'s':'')+' written':'Nothing to write for that section in this style');
  }
  /* ---------- sketch sources ---------- */
  function ensureSketch(){var sk=S.tracks.filter(function(t){return t.orow==='_sk';})[0];if(!sk){sk=sketchTrack();S.tracks.unshift(sk);if(A.c)wireTrack(sk);}return sk;}
  function fromClassic(){
    var list=LEARN.songs().filter(function(s){return s.lv<=4;});
    openModal('<h3>Sketch from a classic</h3><p class="hint">A public-domain piano piece becomes your Piano sketch (first 32 bars). Then write any section from it, or play over it.</p><div class="clist">'+
      list.map(function(s){return'<button data-cl="'+s.id+'"><b>'+esc(s.t)+'</b><span>'+esc(s.c)+'</span></button>';}).join('')+'</div><div class="row" style="justify-content:flex-end"><button data-x="close">Cancel</button></div>',
      function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.x==='close'){closeModal();return;}var id=b.dataset.cl;if(!id)return;closeModal();toast('Loading…');
        LEARN.loadData(id).then(function(d){
          var meta=LEARN.songs().filter(function(s){return s.id===id;})[0],ts=(meta.ts||'4/4').split('/'),bpb=+ts[0]*4/+ts[1]||4;
          var maxB=Math.min(32*bpb,Math.ceil(meta.beats));commitHist();
          S.bpm=Math.round(meta.bpm);S.bars=[4,8,12,16,32].filter(function(n){return n>=Math.ceil(maxB/4);})[0]||32;S.name=meta.t;
          var sk=ensureSketch();sk.notes=d.data.n.filter(function(n){return n[0]<maxB;}).map(function(n){return{s:n[0],d:Math.min(n[1],maxB-n[0]),m:n[2],v:.75};});
          sortTracks();S.sel=sk.id;syncHeader();renderAll();markDirty();
          var parts=S.tracks.filter(function(t){return t.orow&&t.orow!=='_sk';});
          toast('"'+meta.t+'" is your sketch.'+(parts.length?' Tap Write parts to fill a section.':' Add sections with + Section.'));
        },function(){toast('Could not load that piece');});});
    $('mBox').classList.add('med');
  }
  /* ---------- score ---------- */
  function score(){
    var parts={};S.tracks.forEach(function(t){if(t.orow&&R()[t.orow]&&t.kind==='inst'&&t.notes.length)parts[t.orow]=t.notes.map(function(n){return{t:n.s,d:n.d,m:n.m};});});
    if(!Object.keys(parts).length){toast('No orchestra parts yet');return;}
    openModal('<h3>Score</h3><div class="oscore2" id="oScore"><div class="lload small"><div class="spin"></div></div></div><div class="row" style="justify-content:flex-end"><button class="primary" data-x="close">Done</button></div>',
      function(e){var b=e.target.closest('button');if(b&&b.dataset.x==='close')closeModal();});
    $('mBox').classList.add('wide');
    LEARN.osmd().then(function(O){var host=$('oScore');if(!host)return;host.innerHTML='<div class="paper" id="oPaper"></div>';
      var o=new O.OpenSheetMusicDisplay($('oPaper'),{autoResize:false,backend:'svg',drawTitle:true,drawComposer:false,drawPartNames:true,drawCredits:false});
      return o.load(ORCH.scoreXML(S.name,S.bars,4,parts,S.bpm)).then(function(){try{o.zoom=.6;}catch(e){}o.render();});
    }).catch(function(){var h=$('oScore');if(h)h.innerHTML='<p class="hint">The score could not be drawn here.</p>';});
  }
  /* ---------- the bar above the tracks ---------- */
  function barHTML(){
    var sk=S.tracks.some(function(t){return t.orow==='_sk'&&t.notes.length;});
    return'<div class="obar"><b class="obt">Orchestra</b>'+
      '<button id="oAdd" class="primary-soft">+ Section</button>'+
      '<button id="oClassic" title="Use a public-domain piano piece as the Piano sketch">Sketch from a classic</button>'+
      '<label class="il">Style <select id="oSty">'+Object.keys(ORCH.STY).map(function(k){return'<option value="'+k+'"'+(k===sty()?' selected':'')+'>'+ORCH.STY[k].n+'</option>';}).join('')+'</select></label>'+
      '<button id="oWriteAll"'+(sk?'':' disabled')+' title="Write every part from the Piano sketch">Write all parts</button>'+
      '<button id="oScoreBtn">Score</button><button id="oNew" title="Start a new orchestra piece">New piece</button></div>';
  }
  /* editor toolbar extras for an orchestra track */
  function editorExtras(t){
    if(SLOT!=='orch'||!t.orow||t.orow==='_sk')return'';
    var str=/strings|contrabass|cello|violin|pizz/.test(t.inst)||/^(v1|v2|va|vc|cb|q1|q2|qa|qc)$/.test(t.orow);
    return'<button id="oWrite" title="Write this part from the Piano sketch in the chosen style">'+IC.wand+' Write from sketch</button>'+
      (str?'<label class="il">Bowing <select id="oArt"><option value="arco"'+(t.inst!=='pizz'?' selected':'')+'>Bowed</option><option value="pizz"'+(t.inst==='pizz'?' selected':'')+'>Plucked (pizzicato)</option></select></label>':'');
  }
  /* track list: section headers between groups */
  function groupHeader(t,prev){
    if(SLOT!=='orch')return'';var s=secOf(t),p=prev?secOf(prev):null;if(s===p)return'';
    var col=s==='Sketch'?'#ece5d3':(ORCH.SEC_COL[s]||'#8b9f93');
    return'<div class="tsec" style="--sc:'+col+'"><span>'+esc(s==='Sketch'?'Sketch':s)+'</span>'+(SECS[s]?'<button class="sm" data-osec="'+esc(s)+'" title="Write every part in this section from the Piano sketch">Write section</button>':'')+'</div>';
  }
  document.addEventListener('click',function(e){
    if(SLOT!=='orch')return;var b=e.target.closest('button');if(!b)return;
    if(b.id==='oAdd'){addMenu();return;}
    if(b.id==='oClassic'){fromClassic();return;}
    if(b.id==='oWriteAll'){writeSection(null);return;}
    if(b.id==='oScoreBtn'){score();return;}
    if(b.id==='oNew'){twoTap(b,'Tap again: start a new piece',function(){setup(false);});return;}
    if(b.id==='oWrite'){var t=selTrack();if(t)writeOne(t);return;}
    if(b.dataset.osec){writeSection(b.dataset.osec);return;}
  });
  document.addEventListener('change',function(e){
    if(SLOT!=='orch')return;
    if(e.target.id==='oSty'){S.osty=e.target.value;markDirty();toast(ORCH.STY[S.osty].n+': '+ORCH.STY[S.osty].d);return;}
    if(e.target.id==='oArt'){var t=selTrack();if(!t)return;if(e.target.value==='pizz'){t.inst0=t.inst==='pizz'?t.inst0:t.inst;t.inst='pizz';}else{t.inst=t.inst0||R()[t.orow][2];}loadTrackSamples(t);renderTracks();renderDock();markDirty();toast(e.target.value==='pizz'?'Plucked strings':'Bowed strings');}
  });
  return{enter:enter,leave:leave,barHTML:barHTML,editorExtras:editorExtras,groupHeader:groupHeader,secOf:secOf};
})();
