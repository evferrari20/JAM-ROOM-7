/* =============== EXPORT: MP3 or WAV, stems in a zip, and a share card =============== */
var EXP={fmt:'mp3',kbps:192,what:'song',stems:false,cover:true,artist:''};
try{Object.assign(EXP,JSON.parse(localStorage.getItem('jr-exp')||'{}'));}catch(e){}
function expPrefs(){try{localStorage.setItem('jr-exp',JSON.stringify({fmt:EXP.fmt,kbps:EXP.kbps,cover:EXP.cover,artist:EXP.artist}));}catch(e){}}
function loadLame(){
  if(window.lamejs&&window.lamejs.Mp3Encoder)return Promise.resolve();
  return new Promise(function(res,rej){var s=document.createElement('script'),src=document.getElementById('lamesrc');
    s.src=(src&&src.textContent.length>1000)?URL.createObjectURL(new Blob([src.textContent],{type:'text/javascript'})):'vendor/lame.min.js';
    s.onload=function(){window.lamejs&&window.lamejs.Mp3Encoder?res():rej(new Error('lame'));};s.onerror=function(){rej(new Error('lame'));};document.head.appendChild(s);});
}
function soundEnd(buf){/* last moment with sound, plus a short tail */
  var sr=buf.sampleRate,L=buf.length,d=[],c;for(c=0;c<Math.min(2,buf.numberOfChannels);c++)d.push(buf.getChannelData(c));
  var end=L;while(end>sr&&d.every(function(x){return Math.abs(x[end-1])<2e-4;}))end--;return Math.min(L,end+Math.round(sr*.25));
}
function yieldUI(){return new Promise(function(r){setTimeout(r,0);});}
async function encodeMp3(buf,kbps,tags,onProg){
  await loadLame();
  var sr=buf.sampleRate,end=soundEnd(buf),ch=Math.min(2,buf.numberOfChannels),L=buf.getChannelData(0),R=ch>1?buf.getChannelData(1):L;
  var enc=new lamejs.Mp3Encoder(2,sr,kbps),out=[],block=1152*24,l16=new Int16Array(block),r16=new Int16Array(block),t0=Date.now();
  for(var i=0;i<end;i+=block){
    var n=Math.min(block,end-i);
    for(var k=0;k<n;k++){var a=L[i+k],b=R[i+k];a=a<-1?-1:a>1?1:a;b=b<-1?-1:b>1?1:b;l16[k]=a<0?a*32768:a*32767;r16[k]=b<0?b*32768:b*32767;}
    var mp=enc.encodeBuffer(n===block?l16:l16.subarray(0,n),n===block?r16:r16.subarray(0,n));if(mp.length)out.push(new Uint8Array(mp));
    if(Date.now()-t0>120){t0=Date.now();if(onProg)onProg(i/end);await yieldUI();}
  }
  var fin=enc.flush();if(fin.length)out.push(new Uint8Array(fin));
  if(tags)out.unshift(id3(tags));
  return new Blob(out,{type:'audio/mpeg'});
}
/* ID3v2.3 tag: title, artist, album, year, and the share card as cover art */
function id3(t){
  var frames=[];
  function u16text(id,txt){var s=String(txt||''),b=new Uint8Array(3+s.length*2+2),i;b[0]=1;b[1]=0xFF;b[2]=0xFE;for(i=0;i<s.length;i++){var c=s.charCodeAt(i);b[3+i*2]=c&255;b[4+i*2]=c>>8;}frames.push(frame(id,b));}
  function frame(id,body){var h=new Uint8Array(10+body.length);for(var i=0;i<4;i++)h[i]=id.charCodeAt(i);var n=body.length;h[4]=(n>>>24)&255;h[5]=(n>>>16)&255;h[6]=(n>>>8)&255;h[7]=n&255;h.set(body,10);return h;}
  if(t.title)u16text('TIT2',t.title);if(t.artist)u16text('TPE1',t.artist);u16text('TALB',t.album||'Made in Jam Room');u16text('TYER',String(new Date().getFullYear()));u16text('TSSE','Jam Room');
  if(t.png){var mime='image/png',body=new Uint8Array(1+mime.length+1+1+1+t.png.length),p=0;body[p++]=0;for(var i=0;i<mime.length;i++)body[p++]=mime.charCodeAt(i);body[p++]=0;body[p++]=3;body[p++]=0;body.set(t.png,p);frames.push(frame('APIC',body));}
  var size=frames.reduce(function(a,f){return a+f.length;},0),h=new Uint8Array(10+size),q=10;
  h.set([73,68,51,3,0,0,(size>>>21)&127,(size>>>14)&127,(size>>>7)&127,size&127]);frames.forEach(function(f){h.set(f,q);q+=f.length;});return h;
}
/* a plain zip (no compression: audio does not compress well anyway) */
var CRCT=null;
function crc32(u8){if(!CRCT){CRCT=new Uint32Array(256);for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CRCT[n]=c>>>0;}}
  var crc=0xFFFFFFFF;for(var i=0;i<u8.length;i++)crc=CRCT[(crc^u8[i])&255]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
async function makeZip(files){
  var parts=[],cent=[],off=0,d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)),dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate());
  for(var i=0;i<files.length;i++){
    var f=files[i],data=new Uint8Array(await f.blob.arrayBuffer()),name=new TextEncoder().encode(f.name),crc=crc32(data);
    var lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,dt,true);lh.setUint16(12,dd,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);lh.setUint16(26,name.length,true);lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer),name,data);
    var ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,dt,true);ch.setUint16(14,dd,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);ch.setUint16(28,name.length,true);ch.setUint32(42,off,true);
    cent.push(new Uint8Array(ch.buffer),name);off+=30+name.length+data.length;await yieldUI();
  }
  var csize=cent.reduce(function(a,x){return a+x.length;},0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,csize,true);e.setUint32(16,off,true);
  return new Blob(parts.concat(cent,[new Uint8Array(e.buffer)]),{type:'application/zip'});
}
/* render the song (or this part); solo = one track id for a stem */
async function prepRender(){
  await Promise.all(S.tracks.filter(function(t){return t.kind==='inst';}).map(function(t){return ensureSamples(t.inst);}).concat([loadDrumKits()]));
  var jobs=[];S.tracks.forEach(function(t){allTakes(t).forEach(function(k){if(k.tune)jobs.push(tuneTake(k));});});
  await Promise.all(jobs);S.tracks.forEach(function(t){allTakes(t).forEach(function(k){takeBuffer(k);});});
}
async function renderMix(song,sr,solo,noMaster){
  var OC=window.OfflineAudioContext||window.webkitOfflineAudioContext,N=song?S.arr.length:1,L=LEN(),sp=spb(),lead=.05,saveSolo=S.solo,saveM=S.mst,saveF=S.fin,oc;
  try{oc=new OC(2,Math.ceil((lead+L*N*sp+3)*sr),sr);}catch(e){sr=44100;oc=new OC(2,Math.ceil((lead+L*N*sp+3)*sr),sr);}
  try{if(solo)S.solo=[solo];if(noMaster){S.mst='off';S.fin=false;}return await offRender(oc,N,L,lead,song);}
  finally{S.solo=saveSolo;S.mst=saveM;S.fin=saveF;}
}
function songSecs(song){return(song?S.arr.length:1)*LEN()*spb();}
function safeName(s){return String(s||'song').replace(/[\\\/:*?"<>|]+/g,'').trim().slice(0,60)||'song';}
function openExport(){
  if(A.off)return;if(P.playing)stop();
  var multi=S.arr.length>1;if(!multi)EXP.what='part';
  function draw(){
    var w=EXP.what==='song'&&multi;
    $('mBox').innerHTML='<h3>Export audio</h3>'+
      (multi?'<div class="seg2 xopt"><button data-w="song" aria-pressed="'+w+'">Whole song · '+fmtTime(songSecs(true))+'</button><button data-w="part" aria-pressed="'+!w+'">This part ('+esc(partName(S.part))+') · '+fmtTime(songSecs(false))+'</button></div>':'')+
      '<div class="xfmt"><button class="xcard" data-f="mp3" aria-pressed="'+(EXP.fmt==='mp3')+'"><b>MP3</b><span>Plays everywhere, small enough to text or email</span></button><button class="xcard" data-f="wav" aria-pressed="'+(EXP.fmt==='wav')+'"><b>WAV</b><span>Studio quality, about 10× bigger</span></button></div>'+
      '<div class="xrow">'+(EXP.fmt==='mp3'?'<label class="il">Quality <select id="xKb">'+[[128,'Good (128 kbps)'],[192,'Very good (192 kbps)'],[256,'Excellent (256 kbps)'],[320,'Best (320 kbps)']].map(function(o){return'<option value="'+o[0]+'"'+(EXP.kbps===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>':'')+
      '<label class="il">Title <input type="text" id="xTitle" maxlength="60" value="'+esc(S.name)+'"></label><label class="il">Artist <input type="text" id="xArtist" maxlength="40" placeholder="Your name" value="'+esc(EXP.artist)+'"></label></div>'+
      '<label class="dchk"><input type="checkbox" id="xStems"'+(EXP.stems?' checked':'')+'><span><b>Also save each track on its own (stems)</b><small>One file per instrument plus the full mix, together in a .zip. Handy for remixing or another studio app.</small></span></label>'+
      (EXP.fmt==='mp3'?'<label class="dchk"><input type="checkbox" id="xCover"'+(EXP.cover?' checked':'')+'><span><b>Add a cover picture</b><small>The share card shows up as the artwork in music apps.</small></span></label>':'')+
      '<div class="row" style="justify-content:space-between"><button data-x="card">Save share card image</button><span class="row"><button data-x="close">Cancel</button><button class="primary" data-x="go">Export</button></span></div>';
  }
  openModal('',async function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.w){EXP.what=b.dataset.w;draw();return;}
    if(b.dataset.f){EXP.fmt=b.dataset.f;expPrefs();draw();return;}
    if(b.dataset.x==='close'){closeModal();return;}
    readForm();
    if(b.dataset.x==='card'){runCard();return;}
    if(b.dataset.x==='go')runExport();
  });
  function readForm(){var t=$('xTitle'),a=$('xArtist'),k=$('xKb'),st=$('xStems'),cv=$('xCover');if(t)S.name=(t.value||'My song').trim();if(a)EXP.artist=a.value.trim();if(k)EXP.kbps=+k.value;if(st)EXP.stems=st.checked;if(cv)EXP.cover=cv.checked;expPrefs();}
  $('mBox').classList.add('med');draw();
}
function expProgress(title,msg,frac){
  var box=$('mBox');if(!box.querySelector('.xprog')){box.innerHTML='<h3 id="xT"></h3><p class="hint" id="xM"></p><div class="xprog"><i id="xBar"></i></div>';}
  $('xT').textContent=title;$('xM').textContent=msg;$('xBar').style.width=Math.round((frac||0)*100)+'%';
}
async function runExport(){
  var song=EXP.what==='song'&&S.arr.length>1,fmt=EXP.fmt,title=S.name,base=safeName(title),secs=songSecs(song);
  modalOnClose=null;expProgress('Exporting…','Getting sounds ready',0);
  try{
    await prepRender();if(fmt==='mp3')await loadLame();
    var sr=(A.c&&A.c.sampleRate)||44100,stems=EXP.stems?S.tracks.filter(function(t){return(t.kind==='voice'?allTakes(t).length:t.notes.length||Object.keys(t.pd||{}).some(function(k){return(t.pd[k].notes||[]).length;}))&&!t.mute;}):[];
    var steps=1+stems.length,done=0,files=[],png=null;
    function step(msg,f){expProgress('Exporting…',msg,(done+(f||0))/steps);}
    step('Mixing '+(song?'the whole song':'this part')+' ('+fmtTime(secs)+')',.05);
    var mix=await renderMix(song,sr,null,false);
    if(fmt==='mp3'&&EXP.cover){step('Drawing the cover',.25);try{png=new Uint8Array(await (await shareCard(wavePeaks(mix,180))).arrayBuffer());}catch(er){png=null;}}
    var mixBlob=fmt==='mp3'?await encodeMp3(mix,EXP.kbps,{title:title,artist:EXP.artist,png:png},function(f){step('Making the MP3',.3+f*.7);}):encodeWav(mix);
    done++;
    if(!stems.length){closeModal();saveFile(base+(fmt==='mp3'?'.mp3':'.wav'),mixBlob,'Song audio');toast('Exported '+base+(fmt==='mp3'?'.mp3':'.wav'));return;}
    files.push({name:'00 Full mix.'+fmt,blob:mixBlob});
    for(var i=0;i<stems.length;i++){
      var t=stems[i];step('Track '+(i+1)+' of '+stems.length+': '+t.name,.05);
      var b=await renderMix(song,sr,t.id,true);
      var blob=fmt==='mp3'?await encodeMp3(b,EXP.kbps,{title:title+' – '+t.name,artist:EXP.artist},function(f){step('Track '+(i+1)+' of '+stems.length+': '+t.name,.3+f*.7);}):encodeWav(b);
      files.push({name:('0'+(i+1)).slice(-2)+' '+safeName(t.name)+'.'+fmt,blob:blob});done++;
    }
    expProgress('Exporting…','Packing the zip',1);
    var zip=await makeZip(files);closeModal();saveFile(base+' (stems).zip',zip,'Song stems');toast('Exported the mix and '+stems.length+' stems');
  }catch(err){console.error(err);closeModal();toast(fmt==='mp3'&&/lame/.test(String(err&&err.message))?'The MP3 maker could not load. Try WAV, or open Jam Room online once.':'Could not export. Try again, or try WAV.');}
}
/* ---------- share card ---------- */
async function shareCard(peaks){
  var W=1200,H=1200,cv=document.createElement('canvas');cv.width=W;cv.height=H;var g=cv.getContext('2d');
  /* background: evergreen with a mahogany band */
  var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0f2219');bg.addColorStop(1,'#08110d');g.fillStyle=bg;g.fillRect(0,0,W,H);
  var wd=g.createLinearGradient(0,H-260,0,H);wd.addColorStop(0,'#5a2a1b');wd.addColorStop(1,'#2a110a');g.fillStyle=wd;g.fillRect(0,H-260,W,260);
  for(var i=0;i<60;i++){g.strokeStyle='rgba(255,220,180,'+(.015+Math.random()*.03)+')';g.lineWidth=1+Math.random()*2;g.beginPath();var y=H-260+Math.random()*260;g.moveTo(0,y);g.bezierCurveTo(W*.3,y+Math.random()*16-8,W*.7,y+Math.random()*16-8,W,y+Math.random()*10-5);g.stroke();}
  g.fillStyle='rgba(212,166,94,.9)';g.fillRect(0,H-262,W,3);
  var F="'Segoe UI Variable Display','Segoe UI',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif";
  g.fillStyle='#d4a65e';g.font='700 34px '+F;g.fillText('JAM ROOM',80,120);
  g.fillStyle='#ece5d3';g.font='800 92px '+F;var title=S.name||'My song',words=title.split(' '),lines=[''],y0=250;
  words.forEach(function(w){var t=(lines[lines.length-1]+' '+w).trim();if(g.measureText(t).width>W-160&&lines[lines.length-1])lines.push(w);else lines[lines.length-1]=t;});
  lines.slice(0,2).forEach(function(l,k){g.fillText(l,80,y0+k*100);});var yy=y0+Math.min(2,lines.length)*100-20;
  if(EXP.artist){g.fillStyle='#8b9f93';g.font='600 44px '+F;g.fillText('by '+EXP.artist,80,yy+40);yy+=60;}
  /* waveform */
  if(!peaks){try{await prepRender();var b=await renderMix(S.arr.length>1&&S.songMode,16000,null,false);peaks=wavePeaks(b,180);}catch(e){peaks=null;}}
  var wy=yy+220,wh=200;
  if(peaks){var bw=(W-160)/peaks.length;peaks.forEach(function(p,k){var h=Math.max(4,p*wh);var gr=g.createLinearGradient(0,wy-h/2,0,wy+h/2);gr.addColorStop(0,'#9fe0bc');gr.addColorStop(1,'#3f8a64');g.fillStyle=gr;g.beginPath();if(g.roundRect)g.roundRect(80+k*bw,wy-h/2,Math.max(2,bw-3),h,3);else g.rect(80+k*bw,wy-h/2,Math.max(2,bw-3),h);g.fill();});}
  /* facts and chords */
  var facts=[NOTE_NAMES[S.key]+' '+S.scale.toLowerCase(),S.bpm+' BPM',fmtTime(songSecs(S.arr.length>1&&S.songMode))];
  g.font='700 36px '+F;var fx=80,fy=wy+wh/2+90;facts.forEach(function(f){var tw=g.measureText(f).width+44;g.fillStyle='rgba(109,181,143,.16)';g.beginPath();if(g.roundRect)g.roundRect(fx,fy-44,tw,62,31);else g.rect(fx,fy-44,tw,62);g.fill();g.fillStyle='#9fe0bc';g.fillText(f,fx+22,fy);fx+=tw+16;});
  var chs=S.chords&&S.chords[S.part]&&S.chords[S.part].slots.filter(Boolean),prog=chs&&chs.length?chs.slice(0,8).map(chName):(function(){var d=detectProg();return d?d.slice(0,8).map(progChordName):null;})();
  if(prog){g.fillStyle='#d4a65e';g.font='700 40px '+F;g.fillText(prog.join('  ·  '),80,fy+90);}
  /* instruments on the wood */
  var names=S.tracks.filter(function(t){return t.kind!=='voice'||allTakes(t).length;}).map(function(t){return{n:t.kind==='drum'?KITS[t.kit]?KITS[t.kit].label+' drums':'Drums':t.name,c:t.color};}).slice(0,6);
  g.font='600 30px '+F;var ix=80,iy=H-170;names.forEach(function(o){var tw=g.measureText(o.n).width+60;if(ix+tw>W-80){ix=80;iy+=60;}g.fillStyle='rgba(0,0,0,.28)';g.beginPath();if(g.roundRect)g.roundRect(ix,iy-38,tw,52,26);else g.rect(ix,iy-38,tw,52);g.fill();g.fillStyle=o.c;g.beginPath();g.arc(ix+24,iy-12,8,0,7);g.fill();g.fillStyle='#f3e3c8';g.fillText(o.n,ix+40,iy);ix+=tw+12;});
  g.fillStyle='rgba(243,227,200,.55)';g.font='600 26px '+F;g.fillText('Made in Jam Room',80,H-40);
  return await new Promise(function(res){cv.toBlob(function(b){res(b);},'image/png');});
}
function wavePeaks(buf,n){var d=buf.getChannelData(0),end=soundEnd(buf),step=Math.max(1,Math.floor(end/n)),out=[],mx=0;for(var i=0;i<n;i++){var p=0;for(var k=i*step;k<Math.min(end,(i+1)*step);k+=4){var a=Math.abs(d[k]);if(a>p)p=a;}out.push(p);if(p>mx)mx=p;}return out.map(function(p){return mx?Math.pow(p/mx,.8):0;});}
async function runCard(){
  modalOnClose=null;expProgress('Making your share card…','Listening to the song to draw it',.3);
  try{var blob=await shareCard(null);closeModal();saveFile(safeName(S.name)+' card.png',blob,'Share card');toast('Share card saved');}
  catch(e){closeModal();toast('Could not make the share card');}
}
