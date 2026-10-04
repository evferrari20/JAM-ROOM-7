/* =============== DRUMMER: a virtual drummer that writes grooves =============== */
/* Patterns are one bar long. 16 steps per bar (or 12 for triplet feels).
   Each character is one step:  .  = no hit
   0-3 = a hit that appears from that busyness level up (0 = always, 3 = only when very busy)
   A-D = the same, accented      w-z = a soft ghost note, levels 0-3
   Lines marked loud:1 only play when the Soft-Loud control is high, quiet:1 only when it is low.
   Drum rows: 0 kick, 1 snare, 2 clap, 3 hi-hat, 4 open hat, 5 tom, 6 rim, 7 crash, 8 low tom, 9 shaker, 10 tambourine, 11 cowbell */
var DRUMMERS={
 'Rock':{d:'Straight-ahead rock beat',kit:'Studio',bpm:112,p:[[0,'A.....2.0.1...2.'],[1,'....A..y..z.A..y'],[3,'A3030303A3030303'],[4,'..............2.',{loud:1}],[10,'....1.......1...',{loud:1}]]},
 'Pop':{d:'Bright, steady pop groove',kit:'Studio',bpm:110,p:[[0,'A.....1.0.2.....'],[1,'....A.......A...'],[2,'....1.......1...'],[3,'A3030303A3030303'],[9,'2323232323232323'],[10,'....2.......2...',{loud:1}]]},
 'Hip-hop':{d:'Boom-bap with a lazy swing',kit:'Lo-fi',bpm:88,sw:.15,p:[[0,'A......0..1...2.'],[1,'....A..y....A...'],[3,'A2020202A2020202'],[4,'..............2.']]},
 'Lo-fi':{d:'Dusty, soft and laid back',kit:'Lo-fi',bpm:78,sw:.22,p:[[0,'A......1..0.....'],[1,'....A..y....A..z'],[3,'A.0.0.0.A.0.0.0.'],[9,'..1...1...1...1.']]},
 'Trap':{d:'Half-time 808 with hi-hat rolls',kit:'808',bpm:140,roll:1,p:[[0,'A.....1...0..2..'],[1,'........A.......'],[2,'........A.......'],[3,'A1010101A1010101'],[4,'.......2........']]},
 'House':{d:'Four on the floor, open hats on the off-beat',kit:'808',bpm:124,p:[[0,'A...A...A...A...'],[2,'....A.......A...'],[4,'..0...0...0...0.'],[3,'.1.1.1.1.1.1.1.1'],[9,'2.2.2.2.2.2.2.2.']]},
 'Disco':{d:'Kick on every beat, busy hats',kit:'Tight',bpm:118,p:[[0,'A...A...A...A...'],[1,'....A.......A...'],[4,'..0...0...0...0.'],[3,'1.1.1.1.1.1.1.1.'],[10,'....1.......1...']]},
 'Funk':{d:'Tight sixteenths and ghost notes',kit:'Tight',bpm:104,p:[[0,'A..1..0...0..1..'],[1,'....A..x.x..A..x'],[3,'A0000000A0000000'],[4,'......2.......2.',{loud:1}]]},
 'Half-time':{d:'Big and slow, snare on beat 3',kit:'Studio',bpm:80,p:[[0,'A..0......1.....'],[1,'........A.......'],[3,'0.1.0.1.0.1.0.1.'],[9,'2.2.2.2.2.2.2.2.']]},
 'Jazz swing':{d:'Brushes and spang-a-lang',kit:'Tight',bpm:132,trip:1,p:[[3,'A..0.0A..0.0'],[0,'w.....w.....'],[1,'..y..x..y..x'],[6,'.........1..']]},
 'Shuffle':{d:'Bluesy triplet shuffle',kit:'Studio',bpm:96,trip:1,p:[[0,'A.....0....2'],[1,'...A.....A..'],[3,'A.0A.0A.0A.0'],[4,'...........2',{loud:1}]]},
 'Bossa nova':{d:'Gentle Brazilian groove with a rim clave',kit:'Hand',bpm:132,p:[[0,'A..0A..0A..0A..0'],[6,'0..0..0...0..0..'],[3,'A.0.0.0.A.0.0.0.'],[9,'1111111111111111']]},
 'Reggae':{d:'One drop: kick and rim together on 3',kit:'Tight',bpm:76,p:[[0,'........A.......'],[6,'........A.......',{quiet:1}],[1,'........A.......',{loud:1}],[3,'A.0.0.0.A.0.0.0.'],[4,'..2...2...2...2.']]},
 'Afrobeat':{d:'Rolling kick, bell pattern and shaker',kit:'Tight',bpm:110,p:[[0,'A..0..0...0..1..'],[6,'....0..1....0.1.'],[3,'A.0.0.0.A.0.0.0.'],[11,'1.1.11.1.1.11.1.'],[9,'2222222222222222']]},
 'Latin':{d:'Cowbell, clave and a busy kick',kit:'Hand',bpm:100,p:[[0,'A.......0..0....'],[11,'0...0...0...0...'],[6,'0..0..0...0.0...'],[3,'..1...1...1...1.'],[10,'1.1.1.1.1.1.1.1.']]},
 'Ballad':{d:'Soft and spacious, rim click when quiet',kit:'Studio',bpm:72,p:[[0,'A.......0.....1.'],[6,'....0.......0...',{quiet:1}],[1,'....A.......A...',{loud:1}],[3,'0.1.0.1.0.1.0.1.'],[9,'...2...2...2...2']]}
};
var DRUM_VEL=[.92,.86,.82,.62,.7,.8,.7,.85,.82,.5,.55,.62];
var DRUM_LV=[0,.3,.6,.85];
function dHash(a,b,c,d){var h=2166136261^a;h=Math.imul(h^b,16777619);h=Math.imul(h^c,16777619);h=Math.imul(h^d,16777619);h^=h>>>13;h=Math.imul(h,1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
/* x: simple 0 .. busy 1, y: soft 0 .. loud 1 */
function drummerBar(st,x,y,seed,bar,out,fill,crash){
  var D=DRUMMERS[st],steps=D.trip?12:16,step=4/steps,b0=bar*4;
  D.p.forEach(function(line,li){
    var row=line[0],pat=line[1],opt=line[2]||{};
    if(opt.loud&&y<.62)return;if(opt.quiet&&y>=.62)return;
    for(var i=0;i<steps;i++){
      if(fill&&i>=fill.from&&row!==0&&row!==7)continue;
      var ch=pat.charAt(i);if(ch==='.'||!ch)continue;
      var lvl,acc=0,ghost=false;
      if(ch>='0'&&ch<='3')lvl=+ch;else if(ch>='A'&&ch<='D'){lvl=ch.charCodeAt(0)-65;acc=1;}else if(ch>='w'&&ch<='z'){lvl=ch.charCodeAt(0)-119;ghost=true;}else continue;
      var th=DRUM_LV[lvl],r=dHash(seed,bar*64+i,row,li);
      if(x<th){if(x<th-.12||r>(x-(th-.12))/.12)continue;}
      var v=ghost?.2+.14*y:DRUM_VEL[row]*(.62+.38*y)+(acc?.1:0)-(i%(steps/4)?.04:0);
      v+= (dHash(seed+7,bar*64+i,row,li)-.5)*.08;
      out.push({s:Math.round((b0+i*step)*10000)/10000,d:.25,m:row,v:Math.max(.1,Math.min(1,Math.round(v*100)/100))});
    }
  });
  /* hi-hat rolls (trap) when busy */
  if(D.roll&&x>.78){var rb=b0+3+(dHash(seed,bar,3,99)>.5?0:-2);out=out.filter(function(n){return!(n.m===3&&n.s>=rb&&n.s<rb+1);});
    for(var k=0;k<8;k++)out.push({s:Math.round((rb+k/8)*10000)/10000,d:.125,m:3,v:Math.round((.4+k*.06)*100)/100});}
  if(fill)drummerFill(out,b0,fill,x,y,seed,bar,D.trip);
  if(crash)out.push({s:b0,d:.25,m:7,v:Math.round((.7+.25*y)*100)/100});
  return out;
}
function drummerFill(out,b0,fill,x,y,seed,bar,trip){
  /* fill.from is the step where the fill starts; busier settings fill more of the bar */
  var steps=trip?12:16,step=4/steps,seq=[];
  for(var i=fill.from;i<steps;i++){
    var pos=(i-fill.from)/(steps-fill.from),every=(x<.35&&!trip)?2:1;
    if((i-fill.from)%every!==0)continue;
    var row=x<.3?1:(pos<.34?1:pos<.67?5:8);
    if(x>.85&&dHash(seed,bar,i,5)>.7)row=1;
    seq.push({s:Math.round((b0+i*step)*10000)/10000,d:.25,m:row,v:Math.round(Math.min(1,(.55+.4*y)*(.8+.3*pos))*100)/100});
  }
  seq.forEach(function(n){out.push(n);});
  out.push({s:Math.round((b0+fill.from*step)*10000)/10000,d:.25,m:0,v:.8});
}
function drummerNotes(cfg,bars,partName){
  var st=cfg.style,x=cfg.x,y=cfg.y,ph=(partName||'').toLowerCase(),crashFirst=false;
  /* in whole-song mode the drummer plays each section a little differently */
  if(cfg.song){
    if(/intro/.test(ph)){x-=.28;y-=.25;}else if(/pre/.test(ph)){x+=.1;y+=.08;}else if(/chorus|drop/.test(ph)){x+=.18;y+=.2;crashFirst=true;}
    else if(/bridge/.test(ph)){x-=.12;}else if(/outro/.test(ph)){x-=.2;y-=.12;}
    x=Math.max(0,Math.min(1,x));y=Math.max(0,Math.min(1,y));
  }
  if(cfg.crash&&y>.45)crashFirst=true;
  var out=[],D=DRUMMERS[st],steps=D.trip?12:16,fillFrom=x<.35?steps-steps/4:x<.75?steps-steps/4:steps/2;
  for(var bar=0;bar<bars;bar++){
    var fe=cfg.fills==='off'?0:cfg.fills==='2'?2:cfg.fills==='4'?4:bars,fill=fe&&(bar+1)%fe===0?{from:fillFrom}:null;
    drummerBar(st,x,y,cfg.seed||1,bar,out,fill,bar===0&&crashFirst);
  }
  /* one hit per drum per moment */
  var seen={};return out.filter(function(n){var k=n.m+'@'+n.s;if(seen[k])return false;seen[k]=1;return true;}).sort(function(a,b){return a.s-b.s||a.m-b.m;});
}
function drummerApply(t){
  var cfg=t.drummer;if(!cfg)return;var bars=S.bars;
  t._undo=null;
  if(cfg.song){
    S.parts.forEach(function(p){var notes=drummerNotes(cfg,bars,p.name);if(p.id===S.part)t.notes=notes;else{t.pd=t.pd||{};t.pd[p.id]=t.pd[p.id]||{notes:[],takes:[]};t.pd[p.id].notes=notes;}});
  }else t.notes=drummerNotes(cfg,bars,partName(S.part));
  if(R&&R.t===t){R.sel=new Set();R.draw();}
}
function drummerPanelHTML(t){
  var c=t.drummer||{style:'Pop',x:.4,y:.55,fills:'end',seed:1,song:false};
  return'<div class="drummer" id="drummer"><div class="dhead"><span class="hlabel">Drummer</span><span class="hint grow">Pick a style, then drag the dot: left is simple, right is busy; bottom is soft, top is loud. The drummer writes the notes, and you can still edit them.</span><button id="dmClose">Close</button></div>'+
    '<div class="dbody"><div class="dstyles">'+Object.keys(DRUMMERS).map(function(n){return'<button class="dsty" data-ds="'+n+'" aria-pressed="'+(c.style===n)+'"><b>'+n+'</b><small>'+DRUMMERS[n].d+'</small></button>';}).join('')+'</div>'+
    '<div class="dside"><div class="xy" id="dmXY" role="slider" aria-label="Simple to busy, soft to loud" tabindex="0"><span class="xl t">Loud</span><span class="xl b">Soft</span><span class="xl l">Simple</span><span class="xl r">Busy</span><i class="puck" style="left:'+(c.x*100)+'%;top:'+((1-c.y)*100)+'%"></i></div>'+
    '<label class="il">Fills <select id="dmFill"><option value="off"'+(c.fills==='off'?' selected':'')+'>No fills</option><option value="end"'+(c.fills==='end'?' selected':'')+'>End of the part</option><option value="4"'+(c.fills==='4'?' selected':'')+'>Every 4 bars</option><option value="2"'+(c.fills==='2'?' selected':'')+'>Every 2 bars</option></select></label>'+
    '<label class="dchk"><input type="checkbox" id="dmSong"'+(c.song?' checked':'')+'><span><b>Whole song</b><small>Every part, with a calmer intro and a bigger chorus</small></span></label>'+
    '<div class="row"><button id="dmTake" title="Same style, a slightly different performance">New take</button><button id="dmKit" title="Switch this track to the kit this style was made for">Use '+KITS[DRUMMERS[c.style].kit].label+' kit</button></div></div></div></div>';
}
function mountDrummer(t){
  var pn=$('drummer');if(!pn)return;
  t.drummer=t.drummer||{style:'Pop',x:.4,y:.55,fills:'end',seed:1,song:false};
  var c=t.drummer,xy=$('dmXY'),puck=xy.querySelector('.puck'),drag=null,tm=0;
  function regen(now){clearTimeout(tm);var go=function(){drummerApply(t);markDirty();};if(now)go();else tm=setTimeout(go,60);}
  function setXY(e){var r=xy.getBoundingClientRect();c.x=Math.round(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*100)/100;c.y=Math.round(Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height))*100)/100;puck.style.left=c.x*100+'%';puck.style.top=(1-c.y)*100+'%';regen();}
  xy.addEventListener('pointerdown',function(e){drag=e.pointerId;try{xy.setPointerCapture(e.pointerId);}catch(er){}setXY(e);});
  xy.addEventListener('pointermove',function(e){if(drag===e.pointerId)setXY(e);});
  xy.addEventListener('pointerup',function(e){if(drag===e.pointerId){drag=null;regen(true);}});
  xy.addEventListener('pointercancel',function(){drag=null;});
  xy.addEventListener('keydown',function(e){var k=e.key,st=.05;if(!/^Arrow/.test(k))return;e.preventDefault();e.stopPropagation();
    if(k==='ArrowLeft')c.x=Math.max(0,c.x-st);if(k==='ArrowRight')c.x=Math.min(1,c.x+st);if(k==='ArrowUp')c.y=Math.min(1,c.y+st);if(k==='ArrowDown')c.y=Math.max(0,c.y-st);
    puck.style.left=c.x*100+'%';puck.style.top=(1-c.y)*100+'%';regen();});
  pn.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    if(b.dataset.ds){c.style=b.dataset.ds;pn.querySelectorAll('.dsty').forEach(function(x){x.setAttribute('aria-pressed',x===b);});var kb=$('dmKit');if(kb)kb.textContent='Use '+KITS[DRUMMERS[c.style].kit].label+' kit';regen(true);toast(c.style+': '+DRUMMERS[c.style].d);return;}
    if(b.id==='dmTake'){c.seed=(c.seed||1)+1;regen(true);toast('New take');return;}
    if(b.id==='dmKit'){var k=DRUMMERS[c.style].kit;t.kit=k;loadKit(k).then(function(){preview(t,0);});renderTracks();markDirty();toast(KITS[k].label+' kit');return;}
    if(b.id==='dmClose'){DRUMMERUI.on=false;renderEditor();}
  });
  pn.addEventListener('change',function(e){if(e.target.id==='dmFill'){c.fills=e.target.value;regen(true);}if(e.target.id==='dmSong'){c.song=e.target.checked;regen(true);toast(c.song?'The drummer now plays every part of the song, adapting to each one':'The drummer now only plays the part you are editing');}});
  if(!t.notes.length&&!t._dmInit){t._dmInit=1;regen(true);}
}
var DRUMMERUI={on:false};
