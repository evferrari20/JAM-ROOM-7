/* =============== piano roll / drum grid =============== */
/* Tap empty space to add a note. Tap a note to select it, double-tap to delete it.
   Drag a note to move it, drag its right edge to change its length.
   Select mode (or Shift + drag with a mouse) draws a box to select several notes.
   Copy, cut, paste, duplicate, delete, transpose, and a velocity lane underneath. */
var CLIP=null;
var ROLL={mode:'edit',grid:.25,zoom:1,vel:false};
try{var _rz=JSON.parse(localStorage.getItem('jr-roll')||'{}');if(_rz.zoom)ROLL.zoom=_rz.zoom;if(_rz.grid)ROLL.grid=_rz.grid;ROLL.vel=!!_rz.vel;}catch(e){}
function rollPrefs(){try{localStorage.setItem('jr-roll',JSON.stringify({zoom:ROLL.zoom,grid:ROLL.grid,vel:ROLL.vel}));}catch(e){}}
var ZOOMS=[.5,.75,1,1.5,2,3];
function theme(){
  if(TH)return TH;var cs=getComputedStyle(document.documentElement),g=function(n){return cs.getPropertyValue(n).trim();};
  TH={bg:g('--roll-bg'),black:g('--roll-black'),scale:g('--roll-scale'),root:g('--roll-root'),cell:g('--roll-cell'),beat:g('--roll-beat'),bar:g('--roll-bar'),head:g('--roll-head'),panel:g('--panel'),ink:g('--ink'),muted:g('--muted'),brass:g('--brass')};return TH;
}
function rollToolsHTML(t){
  var drums=t.kind==='drum';
  return'<div class="rtools" id="rtools">'+
    '<div class="seg2 rmode"><button data-rm="edit" aria-pressed="'+(ROLL.mode==='edit')+'" title="Tap to add notes, drag notes to move them">'+IC.pencil+' Edit</button><button data-rm="select" aria-pressed="'+(ROLL.mode==='select')+'" title="Drag a box around notes to select them">'+IC.marquee+' Select</button></div>'+
    '<label class="il" title="Notes snap to this grid when you move or stretch them">Grid <select id="rGrid">'+[[.125,'1/32'],[.25,'1/16'],[.5,'1/8'],[1,'1/4'],[1/3,'1/8 triplet']].map(function(o){return'<option value="'+o[0]+'"'+(Math.abs(ROLL.grid-o[0])<1e-6?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>'+
    '<span class="zoom"><button data-r="zo" aria-label="Zoom out" title="Zoom out">−</button><button data-r="zi" aria-label="Zoom in" title="Zoom in">+</button></span>'+
    '<button data-r="vel" class="tog" aria-pressed="'+ROLL.vel+'" title="Show a lane under the notes for how hard each note is played">Velocity</button>'+
    '<span class="rsep"></span>'+
    '<button data-r="all" title="Select every note (Ctrl+A)">Select all</button>'+
    '<span class="rsel" id="rSelN"></span>'+
    '<button data-r="copy" data-need="sel" title="Copy (Ctrl+C)">Copy</button>'+
    '<button data-r="cut" data-need="sel" title="Cut (Ctrl+X)">Cut</button>'+
    '<button data-r="paste" data-need="clip" title="Paste at the marker in the bar ruler (Ctrl+V). Tap the ruler to move the marker.">Paste</button>'+
    '<button data-r="dup" data-need="sel" title="Copy the selected notes right after themselves (Ctrl+D)">Duplicate</button>'+
    '<button data-r="del" data-need="sel" title="Delete selected notes (Delete key)">Delete</button>'+
    (drums?'':'<span class="tpose" title="Transpose: move the selected notes (or every note, if none are selected) up or down. With Scale lock on, single steps stay in the key."><span class="hint">Transpose</span><button data-r="t-12" aria-label="Down an octave">−8va</button><button data-r="t-1" aria-label="Down one step">−1</button><button data-r="t1" aria-label="Up one step">+1</button><button data-r="t12" aria-label="Up an octave">+8va</button></span>')+
  '</div>';
}
function mountRoll(host,t){
  var drums=t.kind==='drum',Gw=drums?76:48,HDR=22,cw0=drums?30:22,rh=drums?30:18,hi=96,lo=36,rows=drums?DRUM_NAMES.length:(hi-lo+1);
  var cw=cw0*ROLL.zoom;
  host.innerHTML='<div class="spacer"><canvas></canvas></div>';
  var sp=host.firstChild,cv=sp.firstChild,g=cv.getContext('2d');
  var lane=$('vlane'),vc=lane&&lane.querySelector('canvas'),vg=vc&&vc.getContext('2d'),VH=58;
  var drag=null,vdrag=null,lastTap={n:null,t:0},box=null;
  R={t:t,draw:draw,resize:size,sel:new Set(),cursor:0};
  function steps(){return S.bars*16;}
  function L(){return LEN();}
  function size(){
    var w=host.clientWidth,h=host.clientHeight,d=window.devicePixelRatio||1;if(!w||!h)return;
    cv.width=w*d;cv.height=h*d;cv.style.width=w+'px';cv.style.height=h+'px';R.d=d;
    sp.style.width=(Gw+steps()*cw)+'px';sp.style.height=(HDR+rows*rh)+'px';
    if(vc){vc.width=w*d;vc.height=VH*d;vc.style.width=w+'px';vc.style.height=VH+'px';}
    draw();
  }
  function rowOf(n){return drums?n.m:hi-n.m;}
  function rect(n){return{x:Gw+n.s*4*cw,y:HDR+rowOf(n)*rh,w:Math.max(drums?cw-2:5,n.d*4*cw-2),h:rh-2};}
  function hit(x,y){
    for(var i=t.notes.length-1;i>=0;i--){var n=t.notes[i],r=rect(n);
      if(x>=r.x&&x<=r.x+r.w+1&&y>=r.y&&y<=r.y+r.h+1){var edge=!drums&&x>r.x+r.w-Math.min(12,Math.max(5,r.w*.3));return{n:n,edge:edge};}}
    return null;
  }
  function pt(e,el){var b=(el||cv).getBoundingClientRect();return{x:e.clientX-b.left+host.scrollLeft,y:e.clientY-b.top+host.scrollTop,vx:e.clientX-b.left,vy:e.clientY-b.top};}
  function snapB(b){var gr=ROLL.grid;return Math.round(b/gr)*gr;}
  function floorB(b){var gr=ROLL.grid;return Math.floor(b/gr+1e-6)*gr;}
  function draw(){
    var d=R.d||1,w=cv.width/d,h=cv.height/d,sx=host.scrollLeft,sy=host.scrollTop,C=theme(),r,s;
    g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);g.fillStyle=C.bg;g.fillRect(0,0,w,h);
    var r0=Math.max(0,Math.floor((sy-HDR)/rh)),r1=Math.min(rows-1,Math.ceil((sy+h-HDR)/rh));
    for(r=r0;r<=r1;r++){
      var y=HDR+r*rh-sy,fill=null;
      if(drums){if(r%2)fill=C.black;}
      else{var m=hi-r,pc=m%12;if([1,3,6,8,10].indexOf(pc)>=0)fill=C.black;else if(inScale(m))fill=(pc===S.key)?C.root:C.scale;if(pc===S.key&&fill===C.black)fill=C.root;}
      if(fill){g.fillStyle=fill;g.fillRect(Gw,y,w-Gw,rh);}
      g.fillStyle=C.cell;g.fillRect(Gw,y+rh-1,w-Gw,1);
    }
    var s0=Math.max(0,Math.floor(sx/cw)),s1=Math.min(steps(),Math.ceil((sx+w)/cw)),every=cw<12?2:1;
    for(s=s0;s<=s1;s++){var x=Gw+s*cw-sx;if(x<Gw)continue;if(s%16&&s%4&&s%every)continue;g.fillStyle=s%16===0?C.bar:(s%4===0?C.beat:C.cell);g.fillRect(x,HDR,1,h-HDR);}
    var sel=R.sel;
    t.notes.forEach(function(n){
      var rc=rect(n),x=rc.x-sx,y=rc.y-sy,wd=rc.w;
      if(rowOf(n)<0||rowOf(n)>=rows||x+wd<Gw||x>w||y+rh<HDR||y>h)return;
      var on=sel.has(n);
      g.fillStyle=t.color;g.globalAlpha=.5+.5*(n.v==null?.8:n.v);
      g.beginPath();if(g.roundRect)g.roundRect(x+1,y+1,wd,rc.h,4);else g.rect(x+1,y+1,wd,rc.h);g.fill();g.globalAlpha=1;
      if(on){g.lineWidth=2;g.strokeStyle=C.ink;g.stroke();
        if(!drums&&wd>10){g.fillStyle='rgba(10,19,15,.55)';g.fillRect(x+wd-4,y+5,1.5,rc.h-8);g.fillRect(x+wd-7,y+5,1.5,rc.h-8);}}
      if(!drums&&wd>=30&&rh>=16){g.fillStyle='rgba(7,19,13,.78)';g.font='700 10px system-ui, sans-serif';g.textBaseline='middle';g.textAlign='left';g.fillText(NOTE_NAMES[n.m%12]+(Math.floor(n.m/12)-1),x+5,y+rh/2);}
    });
    if(box){g.fillStyle='rgba(212,166,94,.12)';g.strokeStyle=C.brass;g.lineWidth=1;g.setLineDash([4,3]);
      var bx=Math.min(box.x0,box.x1)-sx,by=Math.min(box.y0,box.y1)-sy,bw=Math.abs(box.x1-box.x0),bh=Math.abs(box.y1-box.y0);g.fillRect(bx,by,bw,bh);g.strokeRect(bx+.5,by+.5,bw,bh);g.setLineDash([]);}
    if(P.playing){var b=wrapBeat(curBeat());if(b!=null){var px=Gw+b*4*cw-sx;if(px>=Gw){g.fillStyle=C.head;g.fillRect(px,HDR,2,h-HDR);}}}
    g.fillStyle=C.panel;g.fillRect(Gw,0,w-Gw,HDR);g.fillRect(0,HDR,Gw,h-HDR);g.fillRect(0,0,Gw,HDR);
    g.fillStyle=C.muted;g.font='600 11px system-ui, sans-serif';g.textBaseline='middle';g.textAlign='left';
    for(s=s0;s<=s1;s+=1){if(s%16)continue;var bx2=Gw+s*cw-sx;if(bx2>=Gw&&s<steps())g.fillText(String(s/16+1),bx2+4,HDR/2);}
    /* paste marker */
    var cx=Gw+R.cursor*4*cw-sx;if(cx>=Gw&&cx<=w){g.fillStyle=C.brass;g.beginPath();g.moveTo(cx-5,HDR-9);g.lineTo(cx+5,HDR-9);g.lineTo(cx,HDR-2);g.closePath();g.fill();
      if(CLIP){g.globalAlpha=.45;g.fillRect(cx,HDR,1,h-HDR);g.globalAlpha=1;}}
    for(r=r0;r<=r1;r++){
      var yy=HDR+r*rh-sy;if(yy+rh/2<HDR+5)continue;
      if(drums){g.fillStyle=C.ink;g.font='700 12px system-ui, sans-serif';g.fillText(drumNames(t)[r],8,yy+rh/2);}
      else{var mm=hi-r;if(mm%12===0){g.fillStyle=C.ink;g.font='700 11px system-ui, sans-serif';g.fillText('C'+(Math.floor(mm/12)-1),8,yy+rh/2);}else if(inScale(mm)&&rh>=16){g.fillStyle=C.muted;g.font='600 10px system-ui, sans-serif';g.fillText(NOTE_NAMES[mm%12],8,yy+rh/2);}}
    }
    g.fillStyle=C.cell;g.fillRect(Gw-1,HDR,1,h-HDR);g.fillRect(0,HDR-1,w,1);
    drawLane();if(AUTOUI.draw&&AUTOUI.t===t)AUTOUI.draw();
  }
  function drawLane(){
    if(!vg)return;var d=R.d||1,w=vc.width/d,h=VH,sx=host.scrollLeft,C=theme();
    vg.setTransform(d,0,0,d,0,0);vg.clearRect(0,0,w,h);vg.fillStyle=C.bg;vg.fillRect(0,0,w,h);
    vg.fillStyle=C.cell;[.25,.5,.75].forEach(function(f){vg.fillRect(Gw,Math.round(4+(h-8)*(1-f)),w-Gw,1);});
    var any=R.sel.size>0;
    t.notes.forEach(function(n){
      var x=Gw+n.s*4*cw-sx+2;if(x<Gw-2||x>w)return;var v=n.v==null?.8:n.v,y=4+(h-8)*(1-v),on=R.sel.has(n);
      vg.globalAlpha=any&&!on?.35:1;vg.fillStyle=on?C.ink:t.color;vg.fillRect(x,y,2,h-y);vg.fillRect(x-2,y-1,Math.max(6,Math.min(n.d*4*cw-2,14)),3);
    });
    vg.globalAlpha=1;vg.fillStyle=C.panel;vg.fillRect(0,0,Gw,h);vg.fillStyle=C.muted;vg.font='600 10px system-ui, sans-serif';vg.textBaseline='middle';vg.textAlign='left';vg.fillText('Velocity',6,h/2-6);vg.font='500 9px system-ui, sans-serif';vg.fillText('loud ↑',6,h/2+7);
  }
  function selCount(){var el=$('rSelN');if(el)el.textContent=R.sel.size?R.sel.size+' selected':'';
    var tb=$('rtools');if(tb)tb.querySelectorAll('[data-need]').forEach(function(b){b.disabled=b.dataset.need==='sel'?!R.sel.size:!CLIP;});}
  R.update=function(){selCount();draw();};
  /* ---------- grid gestures ---------- */
  cv.addEventListener('pointerdown',function(e){
    if(e.button>0)return;var p=pt(e);
    if(p.vy<HDR){if(p.vx>=Gw){R.cursor=Math.max(0,Math.min(L()-ROLL.grid,floorB((p.x-Gw)/cw/4)));draw();}return;}
    var row=Math.floor((p.y-HDR)/rh);if(row<0||row>=rows)return;
    var m=drums?row:hi-row;
    if(p.vx<Gw){preview(t,m);return;}
    var h=hit(p.x,p.y),add=e.shiftKey||e.ctrlKey||e.metaKey;
    if(h){
      var n=h.n,was=R.sel.has(n);
      if(!was){if(!add)R.sel.clear();R.sel.add(n);}
      var orig=[];R.sel.forEach(function(q){orig.push({n:q,s:q.s,d:q.d,m:q.m});});
      drag={k:h.edge?'resize':'move',id:e.pointerId,x0:p.x,y0:p.y,n:n,was:was,add:add,orig:orig,moved:false,pm:n.m};
    }else{
      drag={k:'empty',id:e.pointerId,x0:p.x,y0:p.y,m:m,add:add,base:add?new Set(R.sel):new Set(),moved:false};
    }
    drag.vx0=p.vx;drag.vy0=p.vy;drag.sl0=host.scrollLeft;drag.st0=host.scrollTop;
    try{cv.setPointerCapture(e.pointerId);}catch(er){}
    selCount();draw();
  });
  cv.addEventListener('pointermove',function(e){
    if(!drag||e.pointerId!==drag.id){
      if(!drag&&e.pointerType==='mouse'){var q=pt(e),hh=q.vy>=HDR&&q.vx>=Gw?hit(q.x,q.y):null;cv.style.cursor=hh?(hh.edge?'ew-resize':'grab'):(ROLL.mode==='select'?'crosshair':'');}
      return;
    }
    var p=pt(e),dx=p.x-drag.x0,dy=p.y-drag.y0;
    if(!drag.moved&&Math.abs(p.vx-drag.vx0)<6&&Math.abs(p.vy-drag.vy0)<6)return;
    /* empty space: mouse or Select mode draws a selection box; a finger or pen in Edit mode scrolls */
    if(drag.k==='empty')drag.k=(ROLL.mode==='select'||e.pointerType==='mouse'||e.shiftKey)?'box':'pan';
    drag.moved=true;
    if(drag.k==='pan'){host.scrollLeft=drag.sl0-(p.vx-drag.vx0);host.scrollTop=drag.st0-(p.vy-drag.vy0);return;}
    var gr=ROLL.grid,LL=L();
    if(drag.k==='move'){
      var db=Math.round(dx/cw/4/gr)*gr,dr=Math.round(dy/rh),mn=1e9,mx=-1e9,mmn=1e9,mmx=-1e9;
      drag.orig.forEach(function(o){mn=Math.min(mn,o.s);mx=Math.max(mx,o.s);mmn=Math.min(mmn,o.m);mmx=Math.max(mmx,o.m);});
      db=Math.max(db,-mn);db=Math.min(db,LL-1/64-mx);
      var dm=drums?dr:-dr;
      if(drums)dm=Math.max(-mmn,Math.min(rows-1-mmx,dm));else dm=Math.max(lo-mmn,Math.min(hi-mmx,dm));
      drag.orig.forEach(function(o){o.n.s=Math.round((o.s+db)*10000)/10000;var nm=o.m+dm;if(!drums&&S.lock&&dm)nm=snapScale(nm);o.n.m=nm;if(o.n.s+o.n.d>LL)o.n.d=Math.max(1/16,LL-o.n.s);});
      if(drag.n.m!==drag.pm){drag.pm=drag.n.m;preview(t,drag.n.m);}
    }else if(drag.k==='resize'){
      var dd=Math.round(dx/cw/4/gr)*gr;
      drag.orig.forEach(function(o){var nd=o.d+dd;if(nd<gr*.99)nd=gr;o.n.d=Math.round(Math.min(nd,LL-o.n.s)*10000)/10000;});
    }else if(drag.k==='box'){
      box={x0:drag.x0,y0:drag.y0,x1:p.x,y1:p.y};
      var bx0=Math.min(box.x0,box.x1),bx1=Math.max(box.x0,box.x1),by0=Math.min(box.y0,box.y1),by1=Math.max(box.y0,box.y1);
      R.sel=new Set(drag.base);
      t.notes.forEach(function(n){var r=rect(n);if(r.x<bx1&&r.x+r.w>bx0&&r.y<by1&&r.y+r.h>by0)R.sel.add(n);});
      /* scroll when dragging near the edges */
      var vw=host.clientWidth,vh=host.clientHeight;
      if(p.vx>vw-24)host.scrollLeft+=12;else if(p.vx<Gw+12)host.scrollLeft-=12;
      if(p.vy>vh-20)host.scrollTop+=10;else if(p.vy<HDR+10)host.scrollTop-=10;
      selCount();
    }
    draw();
  });
  function endDrag(e,cancel){
    if(!drag||e.pointerId!==drag.id)return;var d0=drag;drag=null;box=null;
    if(cancel){if(d0.orig)d0.orig.forEach(function(o){o.n.s=o.s;o.n.d=o.d;o.n.m=o.m;});draw();return;}
    if(d0.k==='move'||d0.k==='resize'){
      if(d0.moved){t._undo=null;dedupe(d0.orig.map(function(o){return o.n;}));markDirty();}
      else{
        var n=d0.n,now=Date.now();preview(t,n.m);
        if(d0.add){if(d0.was)R.sel.delete(n);}
        else if(lastTap.n===n&&now-lastTap.t<420){removeNotes([n]);lastTap={n:null,t:0};}
        else{R.sel.clear();R.sel.add(n);lastTap={n:n,t:now};}
      }
    }else if(d0.k==='empty'){
      var p=pt(e),b=floorB((p.x-Gw)/cw/4);
      if(ROLL.mode==='select'){R.sel.clear();R.cursor=Math.max(0,Math.min(L()-ROLL.grid,b));}
      else if(b>=0&&b<L()){
        var m=d0.m,mm=(!drums&&S.lock)?snapScale(m):m,step=Math.round(b*4),dd=drums?.25:Math.min(S.len/4,L()-b);if(mm!==m)lockNudge();
        var nn={s:Math.round(b*10000)/10000,d:dd,m:mm,v:drums?(m===3?(step%4===0?.9:.55):.85):.8};
        t._undo=null;t.notes.push(nn);R.sel.clear();R.sel.add(nn);lastTap={n:nn,t:Date.now()};preview(t,mm);markDirty();
      }
    }
    selCount();draw();
  }
  cv.addEventListener('pointerup',function(e){endDrag(e,false);});
  cv.addEventListener('pointercancel',function(e){endDrag(e,true);});
  cv.addEventListener('wheel',function(e){
    if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();rollZoom(e.deltaY<0?1:-1,e);
  },{passive:false});
  function dedupe(moved){
    /* a moved note landing exactly on another note of the same pitch replaces it */
    var ms=new Set(moved);
    t.notes=t.notes.filter(function(n){if(ms.has(n))return true;return!moved.some(function(q){return q.m===n.m&&Math.abs(q.s-n.s)<1e-4;});});
  }
  function removeNotes(list){var rm=new Set(list);t._undo=null;t.notes=t.notes.filter(function(n){return!rm.has(n);});rm.forEach(function(n){R.sel.delete(n);});markDirty();}
  /* ---------- velocity lane ---------- */
  if(vc){
    function vAt(y){return Math.max(.05,Math.min(1,1-(y-4)/(VH-8)));}
    function stemX(n){return Gw+n.s*4*cw-host.scrollLeft+3;}
    vc.addEventListener('pointerdown',function(e){
      if(e.button>0)return;var b=vc.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;if(x<Gw)return;
      var best=null,bd=9;t.notes.forEach(function(n){var dx=Math.abs(stemX(n)-x);if(dx<bd){bd=dx;best=n;}});
      var pool=R.sel.size?t.notes.filter(function(n){return R.sel.has(n);}):t.notes;
      if(best&&R.sel.has(best)&&R.sel.size>1){vdrag={k:'rel',id:e.pointerId,y0:y,orig:pool.map(function(n){return{n:n,v:n.v==null?.8:n.v};})};}
      else{vdrag={k:'paint',id:e.pointerId,lx:x,pool:pool};paintV(x,x,y);}
      try{vc.setPointerCapture(e.pointerId);}catch(er){}draw();
    });
    vc.addEventListener('pointermove',function(e){
      if(!vdrag||e.pointerId!==vdrag.id)return;var b=vc.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
      if(vdrag.k==='rel'){var dv=(vdrag.y0-y)/(VH-8);vdrag.orig.forEach(function(o){o.n.v=Math.round(Math.max(.05,Math.min(1,o.v+dv))*100)/100;});}
      else{paintV(vdrag.lx,x,y);vdrag.lx=x;}
      draw();
    });
    function paintV(x0,x1,y){var a=Math.min(x0,x1)-5,b2=Math.max(x0,x1)+5,v=Math.round(vAt(y)*100)/100;vdrag.pool.forEach(function(n){var sx=stemX(n);if(sx>=a&&sx<=b2)n.v=v;});}
    function vend(e){if(!vdrag||e.pointerId!==vdrag.id)return;vdrag=null;t._undo=null;markDirty();draw();}
    vc.addEventListener('pointerup',vend);vc.addEventListener('pointercancel',vend);
  }
  host.addEventListener('scroll',function(){draw();});
  size();selCount();
  var bassy=['ebass','sbass','sub808','cello','jazzbass','slapbass','contrabass','subbass','tuba','timpani'].indexOf(t.inst)>=0;
  host.scrollTop=drums?0:(hi-(bassy?55:76))*rh;
  R.lo=lo;R.hi=hi;R.rows=rows;R.drums=drums;R.cw=function(){return cw;};R.Gw=Gw;R.removeNotes=removeNotes;R.dedupe=dedupe;
}
function rollZoom(dir,e){
  if(!R)return;var i=ZOOMS.indexOf(ROLL.zoom);if(i<0)i=2;var ni=Math.max(0,Math.min(ZOOMS.length-1,i+dir));if(ni===i)return;
  var host=$('roll'),old=ROLL.zoom,cwOld=R.cw(),Gw=R.Gw,anchor=e&&e.clientX!=null?e.clientX-host.getBoundingClientRect().left:host.clientWidth/2;
  var beat=(host.scrollLeft+anchor-Gw)/cwOld/4,st=host.scrollTop;ROLL.zoom=ZOOMS[ni];rollPrefs();
  var t=R.t,sel=R.sel,cur=R.cursor;mountRoll(host,t);R.sel=sel;R.cursor=cur;host.scrollTop=st;host.scrollLeft=Math.max(0,beat*4*R.cw()+Gw-anchor);R.update();
}
/* ---------- editing commands ---------- */
function rollSelList(){return R?R.t.notes.filter(function(n){return R.sel.has(n);}):[];}
function rollCopy(cut){
  var list=rollSelList();if(!list.length){toast('Select some notes first');return;}
  var s0=Math.min.apply(null,list.map(function(n){return n.s;})),e0=Math.max.apply(null,list.map(function(n){return n.s+n.d;}));
  CLIP={drum:R.drums,span:e0-s0,notes:list.map(function(n){return{s:n.s-s0,d:n.d,m:n.m,v:n.v};})};
  if(cut){R.removeNotes(list);toast('Cut '+list.length+' note'+(list.length>1?'s':''));}
  else toast('Copied '+list.length+' note'+(list.length>1?'s':'')+'. Tap the bar ruler to choose where to paste.');
  R.update();
}
function rollPlace(notes,at){
  /* add notes starting at beat 'at'; returns the new note objects that fit in the loop */
  var t=R.t,LL=LEN(),out=[];
  notes.forEach(function(c){var s=Math.round((at+c.s)*10000)/10000;if(s>=LL-1e-6)return;var m=c.m;
    if(!R.drums)m=Math.max(R.lo,Math.min(R.hi,m));
    var n={s:s,d:Math.min(c.d,LL-s),m:m,v:c.v==null?.8:c.v};t.notes.push(n);out.push(n);});
  R.dedupe(out);return out;
}
function rollPaste(){
  if(!CLIP){toast('Copy some notes first');return;}
  if(CLIP.drum!==R.drums){toast(CLIP.drum?'Those are drum hits: paste them into a drum track':'Those are notes: paste them into an instrument track');return;}
  R.t._undo=null;var out=rollPlace(CLIP.notes,R.cursor);
  if(!out.length){toast('No room there. Add bars or move the paste marker');return;}
  R.sel=new Set(out);var step=CLIP.span>=1?Math.ceil(CLIP.span-1e-6):Math.ceil(CLIP.span/.25-1e-6)*.25;R.cursor=Math.min(LEN()-ROLL.grid,R.cursor+step);
  markDirty();R.update();toast('Pasted '+out.length+' note'+(out.length>1?'s':''));
}
function rollDuplicate(){
  var list=rollSelList();if(!list.length){toast('Select some notes first');return;}
  var s0=Math.min.apply(null,list.map(function(n){return n.s;})),e0=Math.max.apply(null,list.map(function(n){return n.s+n.d;})),span=e0-s0;
  var step=span>=1?Math.ceil(span-1e-6):Math.max(.25,Math.ceil(span/.25-1e-6)*.25);
  var start=Math.floor(s0*4+1e-6)/4;
  R.t._undo=null;var out=rollPlace(list.map(function(n){return{s:n.s-start,d:n.d,m:n.m,v:n.v};}),start+step);
  if(!out.length){toast('No room after these notes. Add bars first');return;}
  R.sel=new Set(out);markDirty();R.update();toast('Duplicated');
}
function rollTranspose(k){
  if(!R||R.drums)return;var list=rollSelList(),all=!list.length;if(all)list=R.t.notes.slice();if(!list.length){toast('No notes to move');return;}
  var oct=Math.abs(k)===12,dir=k>0?1:-1,clamped=false;
  list.forEach(function(n){var m=n.m;
    if(oct)m+=k;else if(S.lock){m+=dir;var guard=0;while(!inScale(m)&&guard++<12)m+=dir;}else m+=dir;
    if(m<R.lo||m>R.hi){clamped=true;return;}n.m=m;});
  R.t._undo=null;markDirty();R.update();
  var what=all?'All notes':'Selected notes';
  toast(clamped?'Some notes are already at the edge of the keyboard':what+' moved '+(oct?(k>0?'up an octave':'down an octave'):(k>0?'up':'down')+(S.lock?' one step in the key':' a semitone')));
  if(list.length)preview(R.t,list[0].m);
}
function rollSelectAll(){if(!R)return;R.sel=new Set(R.t.notes);R.update();}
function rollDelete(){var list=rollSelList();if(!list.length)return;R.removeNotes(list);R.update();toast('Deleted '+list.length+' note'+(list.length>1?'s':''));}
$('editor').addEventListener('click',function(e){
  var b=e.target.closest('#rtools button');if(!b||!R)return;
  if(b.dataset.rm){ROLL.mode=b.dataset.rm;b.parentNode.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b);});toast(ROLL.mode==='select'?'Select mode: drag a box around notes. Drag selected notes to move them.':'Edit mode: tap to add notes, drag notes to move them');return;}
  var r=b.dataset.r;
  if(r==='vel'){ROLL.vel=!ROLL.vel;rollPrefs();b.setAttribute('aria-pressed',ROLL.vel);var vl=$('vlane');if(vl)vl.hidden=!ROLL.vel;var rl=$('roll');if(rl)rl.classList.toggle('withvel',ROLL.vel);R.resize();return;}
  if(r==='zi')rollZoom(1);else if(r==='zo')rollZoom(-1);
  else if(r==='all')rollSelectAll();else if(r==='copy')rollCopy(false);else if(r==='cut')rollCopy(true);
  else if(r==='paste')rollPaste();else if(r==='dup')rollDuplicate();else if(r==='del')rollDelete();
  else if(r&&r.charAt(0)==='t')rollTranspose(+r.slice(1));
});
$('editor').addEventListener('change',function(e){if(e.target.id==='rGrid'){ROLL.grid=+e.target.value;rollPrefs();}});
window.addEventListener('keydown',function(e){
  if(!R||MODE!=='studio'||$('modal').classList.contains('show'))return;
  var el=e.target,tg=el.tagName;if(tg==='TEXTAREA'||tg==='SELECT'||(tg==='INPUT'&&!/^(range|checkbox|radio|button)$/i.test(el.type||'')))return;
  var mod=e.ctrlKey||e.metaKey;
  function eat(){e.preventDefault();e.stopImmediatePropagation();}
  if(mod&&!e.altKey){
    if(e.code==='KeyC'&&R.sel.size){eat();rollCopy(false);}
    else if(e.code==='KeyX'&&R.sel.size){eat();rollCopy(true);}
    else if(e.code==='KeyV'&&CLIP){eat();rollPaste();}
    else if(e.code==='KeyD'&&R.sel.size){eat();rollDuplicate();}
    else if(e.code==='KeyA'&&R.t.notes.length){eat();rollSelectAll();}
    return;
  }
  if(!R.sel.size)return;
  if(e.code==='Delete'||e.code==='Backspace'){eat();rollDelete();return;}
  if(e.code==='Escape'){R.sel.clear();R.update();return;}
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){
    eat();var gr=ROLL.grid,d=e.code==='ArrowLeft'?-gr:gr,list=rollSelList(),LL=LEN();
    if(list.some(function(n){return n.s+d<-1e-6||n.s+d>=LL-1e-6;}))return;
    list.forEach(function(n){n.s=Math.round((n.s+d)*10000)/10000;n.d=Math.min(n.d,LL-n.s);});R.dedupe(list);R.t._undo=null;markDirty();R.update();return;
  }
  if(e.code==='ArrowUp'||e.code==='ArrowDown'){
    eat();var up=e.code==='ArrowUp';
    if(R.drums){var dl=rollSelList();if(dl.some(function(n){return up?n.m<=0:n.m>=R.rows-1;}))return;dl.forEach(function(n){n.m+=up?-1:1;});R.t._undo=null;markDirty();R.update();preview(R.t,dl[0].m);return;}
    rollTranspose((up?1:-1)*(e.shiftKey?12:1));
  }
},true);
