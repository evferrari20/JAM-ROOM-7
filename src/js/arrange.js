/* =============== ARRANGE: the whole song as a timeline of sections =============== */
/* S.arr lists the parts in song order. S.arrOff[i] = {trackId:true} drops tracks out of section i
   (for example: no drums in the first chorus) without making a new part. */
var ARR={on:false,sel:0};
var PART_COL=['#6db58f','#d4a65e','#7aa7d6','#c9799a','#9b8ad8','#d98a5a','#5fb3b3','#b5b35f'];
function arrNorm(){if(!S.arrOff)S.arrOff=[];while(S.arrOff.length<S.arr.length)S.arrOff.push({});if(S.arrOff.length>S.arr.length)S.arrOff.length=S.arr.length;}
function slotOff(slot,tid){return slot>=0&&S.arrOff&&S.arrOff[slot]&&!!S.arrOff[slot][tid];}
function arrInsert(i,pid,off){arrNorm();S.arr.splice(i,0,pid);S.arrOff.splice(i,0,off||{});}
function arrRemove(i){arrNorm();S.arr.splice(i,1);S.arrOff.splice(i,1);}
function arrMove(i,j){arrNorm();if(i===j)return;var a=S.arr.splice(i,1)[0],o=S.arrOff.splice(i,1)[0];S.arr.splice(j,0,a);S.arrOff.splice(j,0,o);}
function partColor(pid){var i=-1;S.parts.forEach(function(p,k){if(p.id===pid)i=k;});return PART_COL[(i<0?0:i)%PART_COL.length];}
function fmtTime(sec){sec=Math.round(sec);return Math.floor(sec/60)+':'+('0'+(sec%60)).slice(-2);}
function arrToggle(on){ARR.on=on==null?!ARR.on:on;var b=$('arrBtn');if(b)b.setAttribute('aria-pressed',ARR.on);renderEditor();}
function renderArrange(host){
  arrNorm();if(ARR.sel>=S.arr.length)ARR.sel=S.arr.length-1;if(ARR.sel<0)ARR.sel=0;
  var L=LEN(),sp=spb(),n=S.arr.length,sel=ARR.sel,pid=S.arr[sel];
  var head='<div class="ehead"><strong>Arrange</strong><button class="qh" data-help="song" aria-label="Help" title="What is this?">?</button>'+
    '<button id="arSong" class="tog" aria-pressed="'+!!S.songMode+'" title="On: Play runs through every section in order">'+(S.songMode?'Playing whole song':'Play whole song')+'</button>'+
    '<button id="arPlay" title="Play the song starting at the selected section">'+IC.play+' Play from section '+(sel+1)+'</button>'+
    '<span class="grow"></span><span class="muted slen">'+songLenText()+'</span><button id="arClose">Back to notes</button></div>';
  var grid='<div class="arr" style="grid-template-columns:150px repeat('+n+',minmax(118px,1fr)) 46px">';
  grid+='<div class="arh">Sections</div>';
  S.arr.forEach(function(p,i){grid+='<div class="arsec'+(i===sel?' on':'')+'" data-i="'+i+'" style="--pc:'+partColor(p)+'" title="Tap to select, drag to move, double-tap to edit this part"><b>'+esc(partName(p))+'</b><small>'+(i+1)+' · '+fmtTime(i*L*sp)+'</small></div>';});
  grid+='<button class="arsec add" id="arAdd" title="Add a section to the end" aria-label="Add a section">＋</button>';
  S.tracks.forEach(function(t){
    grid+='<button class="arn" data-open="'+t.id+'" title="Edit '+esc(t.name)+'" style="--tc:'+t.color+'"><span class="si">'+tIcon(t)+'</span><span>'+esc(t.name)+'</span></button>';
    S.arr.forEach(function(p,i){var off=slotOff(i,t.id);grid+='<button class="arcell'+(i===sel?' on':'')+'" data-i="'+i+'" data-t="'+t.id+'" aria-pressed="'+!off+'" title="'+(off?'Bring '+esc(t.name)+' back in this section':'Drop '+esc(t.name)+' out of this section')+'" style="--tc:'+t.color+'"><canvas></canvas></button>';});
    grid+='<span></span>';
  });
  grid+='</div>';
  var bar='<div class="arbar"><b>Section '+(sel+1)+'</b><label class="il">Part <select id="arPart">'+S.parts.map(function(p){return'<option value="'+p.id+'"'+(p.id===pid?' selected':'')+'>'+esc(p.name)+'</option>';}).join('')+'</select></label>'+
    '<button data-a="left" '+(sel<1?'disabled':'')+' aria-label="Move earlier" title="Move earlier">◀</button><button data-a="right" '+(sel>=n-1?'disabled':'')+' aria-label="Move later" title="Move later">▶</button>'+
    '<button data-a="dup" title="Repeat this section straight after itself">Duplicate</button><button data-a="del" '+(n<2?'disabled':'')+'>Remove</button>'+
    '<button data-a="uniq" title="Give this section its own copy of the part, so you can change it without changing the other sections that use it">Make it unique</button>'+
    '<button data-a="edit" class="primary" title="Open this part in the note editor">Edit notes</button></div>';
  host.innerHTML=head+'<p class="hint">Each column is a section of your song. Tap a cell to drop that instrument out of that section (great for a quiet intro or a drum break). Drag a section name to move it.</p>'+grid+bar;
  host.querySelectorAll('.arcell').forEach(drawArrCell);
}
function drawArrCell(cell){
  var cv=cell.querySelector('canvas'),w=cell.clientWidth-2,h=cell.clientHeight-2,d=window.devicePixelRatio||1;if(w<4||h<4)return;
  cv.width=w*d;cv.height=h*d;cv.style.width=w+'px';cv.style.height=h+'px';
  var g=cv.getContext('2d'),t=trackById(cell.dataset.t),i=+cell.dataset.i,pid=S.arr[i];if(!t)return;
  g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
  var off=slotOff(i,t.id),L=LEN(),pd=partData(t,pid);
  g.globalAlpha=off?.22:.9;g.fillStyle=t.color;
  if(t.kind==='voice'){
    (pd.takes||[]).filter(function(k){return!k.mute;}).slice(0,3).forEach(function(k,j,arr){
      var raw=k.raw,len=raw.length,dur=len/k.sr,spb2=spb(),cols=Math.max(1,Math.floor(w*Math.min(1,dur/(L*spb2)))),lane=(h-6)/arr.length,y0=3+j*lane,mid=y0+lane/2,step=Math.max(1,Math.floor(len/cols));
      for(var x=0;x<cols;x++){var mx=0;for(var q=x*step;q<Math.min(len,(x+1)*step);q+=16){var a=Math.abs(raw[q]);if(a>mx)mx=a;}var bh=Math.max(1,mx*lane*.9);g.fillRect(x,mid-bh/2,1,bh);}
    });
  }else{
    var notes=pd.notes||[];
    if(notes.length){
      var drums=t.kind==='drum',lo=1e9,hi=-1e9;notes.forEach(function(n){lo=Math.min(lo,n.m);hi=Math.max(hi,n.m);});
      if(drums){lo=0;hi=11;}else{lo-=1;hi+=1;}
      var rows=hi-lo+1,rh=Math.max(1.5,(h-6)/rows);
      notes.forEach(function(n){var x=n.s/L*w,ww=Math.max(1.5,n.d/L*w-1),y=drums?3+n.m*rh:3+(hi-n.m)*rh;g.fillRect(x,y,ww,Math.max(1.5,rh-.5));});
    }
  }
  g.globalAlpha=1;
  if(off){g.strokeStyle='rgba(236,229,211,.25)';g.lineWidth=1;for(var x2=-h;x2<w;x2+=10){g.beginPath();g.moveTo(x2,h);g.lineTo(x2+h,0);g.stroke();}}
}
function arrMakeUnique(i){
  var src=S.arr[i],base=partName(src).replace(/ \d+$/,''),k=2,name;
  do{name=base+' '+k++;}while(S.parts.some(function(p){return p.name===name;}));
  var id=nid('p');S.parts.push({id:id,name:name});
  S.tracks.forEach(function(t){var d=partData(t,src);t.pd=t.pd||{};t.pd[id]={notes:JSON.parse(JSON.stringify(d.notes||[])),takes:(d.takes||[]).map(copyTake),auto:JSON.parse(JSON.stringify(d.auto||{}))};});
  if(S.chords&&S.chords[src])S.chords[id]=JSON.parse(JSON.stringify(S.chords[src]));
  S.arr[i]=id;return name;
}
$('editor').addEventListener('click',function(e){
  if(!ARR.on)return;var b=e.target.closest('button');if(!b)return;
  if(b.id==='arClose'){arrToggle(false);return;}
  if(b.id==='arSong'){S.songMode=!S.songMode;renderSong();renderEditor();markDirty();toast(S.songMode?'Play now runs through the whole song':'Play now loops the part you\'re editing');return;}
  if(b.id==='arPlay'){if(P.playing)stop();if(!S.songMode){S.songMode=true;renderSong();}start(false,{from:ARR.sel*LEN()});renderEditor();return;}
  if(b.id==='arAdd'){arrInsert(S.arr.length,S.arr[S.arr.length-1]||S.part,Object.assign({},S.arrOff[S.arr.length-1]||{}));ARR.sel=S.arr.length-1;renderSong();renderEditor();markDirty();return;}
  if(b.dataset.open){var t=trackById(b.dataset.open);ARR.on=false;selectTrack(b.dataset.open);return;}
  if(b.classList.contains('arcell')){var i=+b.dataset.i,tid=b.dataset.t;arrNorm();var o=S.arrOff[i];if(o[tid])delete o[tid];else o[tid]=true;
    b.setAttribute('aria-pressed',!o[tid]);drawArrCell(b);markDirty();var tt=trackById(tid);toast((o[tid]?tt.name+' drops out of section ':tt.name+' plays in section ')+(i+1));return;}
  var a=b.dataset.a,s=ARR.sel;if(!a)return;
  if(a==='left'&&s>0){arrMove(s,s-1);ARR.sel=s-1;}
  else if(a==='right'&&s<S.arr.length-1){arrMove(s,s+1);ARR.sel=s+1;}
  else if(a==='dup'){arrInsert(s+1,S.arr[s],Object.assign({},S.arrOff[s]||{}));ARR.sel=s+1;}
  else if(a==='del'){if(S.arr.length<2)return;arrRemove(s);ARR.sel=Math.max(0,s-1);}
  else if(a==='uniq'){var nm=arrMakeUnique(s);toast('Section '+(s+1)+' now uses its own part, “'+nm+'”');}
  else if(a==='edit'){ARR.on=false;var pid=S.arr[s];if(pid!==S.part)switchPart(pid);else{renderSong();renderEditor();}return;}
  renderSong();renderEditor();markDirty();
});
$('editor').addEventListener('change',function(e){if(!ARR.on||e.target.id!=='arPart')return;S.arr[ARR.sel]=e.target.value;renderSong();renderEditor();markDirty();});
/* sections: tap selects, double-tap edits, drag reorders */
(function(){
  var dg=null;
  $('editor').addEventListener('pointerdown',function(e){
    if(!ARR.on)return;var s=e.target.closest('.arsec[data-i]');if(!s)return;
    dg={i:+s.dataset.i,x:e.clientX,id:e.pointerId,moved:false,el:s,to:+s.dataset.i};try{s.setPointerCapture(e.pointerId);}catch(er){}
  });
  $('editor').addEventListener('pointermove',function(e){
    if(!dg||e.pointerId!==dg.id)return;if(!dg.moved&&Math.abs(e.clientX-dg.x)<8)return;dg.moved=true;dg.el.classList.add('drag');
    var secs=[].slice.call(document.querySelectorAll('#editor .arsec[data-i]')),best=dg.i,bd=1e9;
    secs.forEach(function(el,k){var r=el.getBoundingClientRect(),dd=Math.abs(e.clientX-(r.left+r.width/2));if(dd<bd){bd=dd;best=k;}});
    dg.to=best;
    secs.forEach(function(el,k){el.classList.toggle('dropl',k===dg.to&&dg.to<dg.i);el.classList.toggle('dropr',k===dg.to&&dg.to>dg.i);});
  });
  function end(e){
    if(!dg||e.pointerId!==dg.id)return;var d=dg;dg=null;
    if(d.moved){if(d.to!==d.i){arrMove(d.i,d.to);ARR.sel=d.to;markDirty();renderSong();}renderEditor();return;}
    var now=Date.now();
    if(ARR.last===d.i&&now-(ARR.lt||0)<420){ARR.on=false;var pid=S.arr[d.i];if(pid!==S.part)switchPart(pid);else renderEditor();return;}
    ARR.last=d.i;ARR.lt=now;ARR.sel=d.i;renderEditor();
  }
  $('editor').addEventListener('pointerup',end);$('editor').addEventListener('pointercancel',function(e){if(dg&&e.pointerId===dg.id){dg=null;renderEditor();}});
})();
