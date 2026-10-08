/* =============== CHORD HELPER =============== */
/* Build a chord progression for a part, learn why chords work, then write it into the song.
   A chord is {r: semitones above the key's root (0-11), q: quality, inv: 0 root / 1 third / 2 fifth in the bass}.
   Progressions are kept per part in S.chords[partId] = {cpb: chords per bar, slots: [chord or null]}. */
var CQ={
 '':{iv:[0,4,7],s:'',n:'major'},'m':{iv:[0,3,7],s:'m',n:'minor'},'dim':{iv:[0,3,6],s:'°',n:'diminished'},'aug':{iv:[0,4,8],s:'+',n:'augmented'},
 '7':{iv:[0,4,7,10],s:'7',n:'dominant seventh'},'maj7':{iv:[0,4,7,11],s:'maj7',n:'major seventh'},'m7':{iv:[0,3,7,10],s:'m7',n:'minor seventh'},
 'm7b5':{iv:[0,3,6,10],s:'ø7',n:'half-diminished'},'sus2':{iv:[0,2,7],s:'sus2',n:'suspended second'},'sus4':{iv:[0,5,7],s:'sus4',n:'suspended fourth'},
 'add9':{iv:[0,4,7,14],s:'add9',n:'added ninth'},'madd9':{iv:[0,3,7,14],s:'m(add9)',n:'minor added ninth'},'6':{iv:[0,4,7,9],s:'6',n:'major sixth'},
 'm6':{iv:[0,3,7,9],s:'m6',n:'minor sixth'},'9':{iv:[0,4,7,10,14],s:'9',n:'dominant ninth'},'maj9':{iv:[0,4,7,11,14],s:'maj9',n:'major ninth'},
 'm9':{iv:[0,3,7,10,14],s:'m9',n:'minor ninth'},'7sus4':{iv:[0,5,7,10],s:'7sus4',n:'seventh, suspended fourth'}
};
var CH={sel:0,mood:'',inst:'sel',rhythm:'pulse',bass:'roots',lead:'piano'};
function minorKey(){return harmScale()[2]===3;}
function isMinorQ(q){return/^m(?!aj)|dim|m7b5/.test(q);}
function chName(c){if(!c)return'';var root=NOTE_NAMES[(S.key+c.r)%12],iv=CQ[c.q].iv,s=root+CQ[c.q].s;if(c.inv)s+='/'+NOTE_NAMES[(S.key+c.r+iv[Math.min(c.inv,iv.length-1)])%12];return s;}
function chNumKey(c){
  var M=['I','bII','II','bIII','III','IV','#IV','V','bVI','VI','bVII','VII'],m=['I','bII','II','III','#III','IV','#IV','V','VI','#VI','VII','#VII'],b=(minorKey()?m:M)[c.r];
  if(isMinorQ(c.q))b=b.replace(/[IV]+/,function(x){return x.toLowerCase();});
  if(c.q==='dim')b+='°';if(c.q==='aug')b+='+';if(c.q==='m7b5')b+='ø';return b;
}
function chRoman(c){if(!c)return'';var k=chNumKey(c),s=CQ[c.q].s;if(/7|9|6|sus|add/.test(c.q))k+=(c.q==='m7b5'?'7':s.replace(/^m(?!aj)/,'').replace('(add9)','add9'));return k;}
function chTones(c){return CQ[c.q].iv.map(function(i){return c.r+i;});}
function chPcs(c){return chTones(c).map(function(x){return((S.key+x)%12+12)%12;});}
/* the seven chords that belong to the key */
function diatonic(sev){
  var out=[];for(var d=0;d<7;d++){var r=scTone(d),th=scTone(d+2)-r,fi=scTone(d+4)-r,se=scTone(d+6)-r,q;
    q=th===4?(fi===8?'aug':''):(fi===6?'dim':'m');
    if(sev){if(q==='')q=se===11?'maj7':'7';else if(q==='m')q='m7';else if(q==='dim')q=se===10?'m7b5':'dim';}
    out.push({r:r%12,q:q,inv:0});}
  return out;
}
function chFunc(c){
  var r=c.r,mi=minorKey(),diat=diatonic(false).some(function(x){return x.r===r&&(x.q===c.q||(isMinorQ(x.q)===isMinorQ(c.q)&&x.q!=='dim'&&c.q!=='dim'));});
  if(!diat&&!(c.q==='7'&&r===7))return'colour';
  var home=mi?[0,3,8]:[0,9,4],away=mi?[2,5]:[2,5],tens=mi?[7,10,11]:[7,11];
  if(home.indexOf(r)>=0)return'home';if(away.indexOf(r)>=0)return'away';if(tens.indexOf(r)>=0)return'tension';return'colour';
}
var CH_FUNC={home:['Home','Feels settled and at rest. Songs usually start and end here.'],away:['Away','Moves away from home. Gentle motion that often leads to tension.'],
  tension:['Tension','Restless: it wants to resolve, usually back home.'],colour:['Colour','Borrowed from outside the key for a surprising, expressive flavour.']};
function spiceChords(){
  return minorKey()?[{r:5,q:'',n:'hopeful (Dorian)'},{r:7,q:'',n:'strong pull home'},{r:7,q:'7',n:'the strongest pull'},{r:1,q:'',n:'dramatic (Neapolitan)'},{r:0,q:'',n:'a bright ending'}]
    :[{r:5,q:'m',n:'bittersweet'},{r:10,q:'',n:'rock swagger'},{r:8,q:'',n:'epic'},{r:3,q:'',n:'bluesy'},{r:2,q:'',n:'pushes to V'},{r:4,q:'',n:'pushes to vi'},{r:0,q:'7',n:'leans into IV'}];
}
/* what tends to come next, with a reason */
var TRANS_MAJ={'I':[['IV','Lifts away from home: bright and open'],['V','Builds tension that wants to come back'],['vi','Turns emotional: the sad side of the key'],['ii','A gentle step away that sets up V'],['iii','Soft and dreamy'],['bVII','Rock-and-roll swagger (borrowed)']],
 'ii':[['V','The classic ii–V: pulls strongly back to I'],['IV','Stays in the away mood'],['I','Slips back home softly'],['vii°','Extra tension']],
 'iii':[['vi','Falls naturally down to vi'],['IV','Rises to the bright IV'],['ii','Keeps things moving']],
 'IV':[['V','Pushes into tension: the most common move'],['I','The warm "amen" return home'],['iv','Borrow the minor iv: bittersweet'],['vi','An emotional turn'],['ii','Smooth and gentle']],
 'V':[['I','Resolves home: very satisfying'],['vi','Deceptive: a surprise turn to the sad side'],['IV','Rock-style step back'],['iii','Unexpected and floating']],
 'vi':[['IV','The classic emotional pop move'],['ii','Smooth and warm'],['V','Builds up'],['iii','Drifts down gently'],['I','Brightens back home']],
 'vii°':[['I','Resolves home'],['iii','A soft landing']],'bVII':[['I','A big rock resolution'],['IV','Wide and open']],
 'bVI':[['bVII','An epic climb, like a film score'],['V','Dramatic tension'],['I','A surprising return home']],'iv':[['I','Bittersweet and nostalgic'],['V','Dark tension']],
 'II':[['V','Pushes hard into V'],['IV','A bright surprise']],'III':[['vi','Lands strongly on vi'],['IV','An unexpected lift']],'bIII':[['IV','A bluesy lift'],['bVII','Rock']]};
var TRANS_MIN={'i':[['iv','Sinks deeper into the minor mood'],['VI','Warm and hopeful'],['VII','A strong, heroic rise'],['V','Strong tension that wants to return'],['III','Brightens: the major side of the key'],['v','Calm tension']],
 'ii°':[['V','Dark, classical tension'],['v','Softer tension']],'III':[['VI','Floats down, cinematic'],['VII','Builds up'],['iv','Turns back to sadness']],
 'iv':[['V','Pulls hard back home'],['i','A sombre, gentle ending'],['VII','Heroic'],['VI','Opens up']],'v':[['i','A gentle return home'],['VI','Floating']],
 'V':[['i','Resolves home with power'],['VI','Deceptive: a surprise']],'VI':[['VII','An epic climb'],['III','Hopeful'],['iv','Sad again'],['V','Tension'],['i','Home']],
 'VII':[['III','Bright and triumphant'],['i','Home, with strength'],['VI','Steps back down']],'IV':[['i','Dorian colour: hopeful minor'],['V','A lift']],'bII':[['V','Dramatic'],['i','A dark return']],'I':[['iv','Bright, then sad'],['IV','Bright']]};
function chFromKey(k){/* numeral key -> chord in this key */
  var all=diatonic(false).concat(spiceChords()),hit=null;all.forEach(function(c){if(!hit&&chNumKey(c)===k)hit={r:c.r,q:c.q,inv:0};});return hit;
}
function suggestNext(prev){
  var T=minorKey()?TRANS_MIN:TRANS_MAJ;
  if(!prev){var home=diatonic(false)[0];return[[home,'Start at home: the safest, strongest opening']].concat((T[chNumKey(home)]||[]).slice(0,3).map(function(x){return[chFromKey(x[0]),'Or start away from home: '+x[1].charAt(0).toLowerCase()+x[1].slice(1)];}).filter(function(x){return x[0];}));}
  var list=(T[chNumKey(prev)]||[]).map(function(x){var c=chFromKey(x[0]);if(c&&/7/.test(prev.q)&&!/7/.test(c.q)){var d7=diatonic(true).filter(function(y){return y.r===c.r;})[0];if(d7)c.q=d7.q;}return c?[c,x[1]]:null;}).filter(Boolean);
  if(!list.length)list=[[diatonic(false)[0],'Head back home']];
  return list.slice(0,5);
}
/* ready-made progressions: 'M' written in a major key, 'm' in a minor key; moved to the relative key when needed */
var CH_TEMPLATES=[
 ['Happy','Pop anthem','M',[[0,''],[7,''],[9,'m'],[5,'']]],['Happy','Feel-good','M',[[0,''],[5,''],[7,''],[5,'']]],['Happy','Fifties','M',[[0,''],[9,'m'],[5,''],[7,'']]],
 ['Happy','Canon (Pachelbel, 1680s)','M',[[0,''],[7,''],[9,'m'],[4,'m'],[5,''],[0,''],[5,''],[7,'']]],
 ['Emotional','Heartfelt','M',[[9,'m'],[5,''],[0,''],[7,'']]],['Emotional','Bittersweet','M',[[0,''],[7,''],[9,'m'],[5,'m']]],['Emotional','Nostalgic','M',[[5,''],[5,'m'],[0,''],[0,'']]],
 ['Emotional','Sad minor','m',[[0,'m'],[5,'m'],[8,''],[7,'']]],
 ['Dreamy','Floating','M',[[0,'maj7'],[5,'maj7'],[0,'maj7'],[5,'maj7']]],['Dreamy','Daydream','M',[[0,''],[4,'m'],[5,''],[5,'m']]],['Dreamy','Night drive','M',[[9,'m7'],[5,'maj7'],[0,'maj7'],[7,'sus4']]],
 ['Epic','Film score','m',[[0,'m'],[8,''],[3,''],[10,'']]],['Epic','Heroic','m',[[0,'m'],[10,''],[8,''],[10,'']]],['Epic','Rising','m',[[8,''],[10,''],[0,'m'],[0,'m']]],['Epic','Victory','M',[[8,''],[10,''],[0,''],[0,'']]],
 ['Jazzy','ii–V–I','M',[[2,'m7'],[7,'7'],[0,'maj7'],[0,'maj7']]],['Jazzy','Turnaround','M',[[0,'maj7'],[9,'m7'],[2,'m7'],[7,'7']]],['Jazzy','Lo-fi','M',[[2,'m9'],[7,'9'],[0,'maj9'],[9,'m7']]],
 ['Jazzy','Minor ii–V','m',[[2,'m7b5'],[7,'7'],[0,'m7'],[0,'m7']]],
 ['Bluesy','12-bar blues','M',[[0,'7'],[0,'7'],[0,'7'],[0,'7'],[5,'7'],[5,'7'],[0,'7'],[0,'7'],[7,'7'],[5,'7'],[0,'7'],[7,'7']]],
 ['Bluesy','Rock','M',[[0,''],[10,''],[5,''],[0,'']]],['Bluesy','Garage','M',[[0,''],[5,''],[7,''],[7,'']]],
 ['Mysterious','Andalusian','m',[[0,'m'],[10,''],[8,''],[7,'']]],['Mysterious','Dorian vamp','m',[[0,'m7'],[5,'7'],[0,'m7'],[5,'7']]],['Mysterious','Dark march','m',[[0,'m'],[5,'m'],[0,'m'],[7,'7']]]
];
function tplChords(t){var shift=0;if(t[2]==='m'&&!minorKey())shift=9;if(t[2]==='M'&&minorKey())shift=3;return t[3].map(function(x){return{r:(x[0]+shift)%12,q:x[1],inv:0};});}
function chState(){S.chords=S.chords||{};var c=S.chords[S.part];if(!c){c=S.chords[S.part]={cpb:1,slots:[]};}var n=S.bars*c.cpb;while(c.slots.length<n)c.slots.push(null);if(c.slots.length>n)c.slots.length=n;return c;}
function chAt(beat,pid){var c=S.chords&&S.chords[pid||S.part];if(!c||!c.slots.some(Boolean))return null;var i=Math.floor(beat/(4/c.cpb));return c.slots[i]||null;}
/* ---------- naming what you play ---------- */
function nameChord(midis){
  if(!midis.length)return'';var ms=midis.slice().sort(function(a,b){return a-b;}),bass=ms[0]%12,pcs=[];ms.forEach(function(m){if(pcs.indexOf(m%12)<0)pcs.push(m%12);});
  if(pcs.length===1)return NOTE_NAMES[bass];
  if(pcs.length===2){var iv=((pcs[1]-pcs[0])%12+12)%12;if(iv===7||iv===5){var rt=iv===7?pcs[0]:pcs[1];return NOTE_NAMES[rt]+'5';}return NOTE_NAMES[pcs[0]]+' + '+NOTE_NAMES[pcs[1]];}
  var best=null,bs=-1e9;
  for(var r=0;r<12;r++){if(pcs.indexOf(r)<0)continue;Object.keys(CQ).forEach(function(q){
    var want=CQ[q].iv.map(function(i){return(r+i)%12;}),miss=want.filter(function(p){return pcs.indexOf(p)<0;}).length,extra=pcs.filter(function(p){return want.indexOf(p)<0;}).length;
    var fifthMissing=miss===1&&want.length>=4&&pcs.indexOf((r+7)%12)<0;var sc=-(fifthMissing?.5:miss*3)-extra*3-(r===bass?0:.8)-want.length*.15;if(sc>bs){bs=sc;best={r:r,q:q};}});}
  if(!best||bs<-3)return pcs.map(function(p){return NOTE_NAMES[p];}).join(' ');
  return NOTE_NAMES[best.r]+CQ[best.q].s+(best.r!==bass?'/'+NOTE_NAMES[bass]:'');
}
function heldNotes(){var ms=[];Object.keys(down).forEach(function(k){(down[k].items||[]).forEach(function(it){if(it.kt&&it.kt.kind!=='drum')ms.push(it.m);});});return ms;}
function showHeldChord(){var el=$('chNow');if(!el)return;var ms=heldNotes();if(ms.length<2&&!AP.held.length){el.textContent='';el.hidden=true;return;}
  var name=ms.length?nameChord(ms):'';if(AP.held.length){var h=AP.held[AP.held.length-1];name=chordLabel(h.ci);}el.textContent=name;el.hidden=!name;}
/* ---------- guitar shapes (standard tuning) ---------- */
var GTR=[40,45,50,55,59,64];
function guitarShape(c){
  var pcs=chPcs(c),iv=CQ[c.q].iv,rootPc=pcs[0],bassPc=c.inv?pcs[Math.min(c.inv,pcs.length-1)]:rootPc;
  var need=[rootPc,pcs[1]];if(iv.length>3)need.push(pcs[3]);if(iv.indexOf(14)>=0)need.push(((S.key+c.r+14)%12+12)%12);
  var best=null,bs=-1e9;
  for(var pos=0;pos<=9;pos++){
    var cand=GTR.map(function(o){var a=[-1];for(var f=0;f<=pos+3;f++){if(f>0&&f<pos)continue;if(pcs.indexOf((o+f)%12)>=0)a.push(f);}return a;});
    (function rec(i,cur){
      if(i<6){cand[i].forEach(function(f){cur.push(f);rec(i+1,cur);cur.pop();});return;}
      var snd=[];cur.forEach(function(f,s){if(f>=0)snd.push(s);});if(snd.length<3)return;
      var lo=snd[0];if((GTR[lo]+cur[lo])%12!==bassPc)return;
      for(var s=lo;s<6;s++)if(cur[s]<0&&s<snd[snd.length-1]){/* muted string in the middle */if(s!==lo+1)return;}
      var have=snd.map(function(s){return(GTR[s]+cur[s])%12;});if(need.some(function(p){return have.indexOf(p)<0;}))return;
      var fr=snd.map(function(s){return cur[s];}).filter(function(f){return f>0;});
      var mn=fr.length?Math.min.apply(null,fr):0,mx=fr.length?Math.max.apply(null,fr):0;if(mx-mn>3)return;
      /* one finger can hold down several strings on the lowest fret (a barre) only if nothing between them is open or muted */
      var bstr=[];cur.forEach(function(f,s){if(f===mn&&mn>0)bstr.push(s);});
      var canBar=bstr.length>1;if(canBar)for(var s3=bstr[0];s3<=bstr[bstr.length-1];s3++)if(cur[s3]<mn){canBar=false;break;}
      var fingers=fr.length-(canBar?bstr.length-1:0);if(fingers>4)return;
      var inner=0;for(var s2=lo;s2<6;s2++)if(cur[s2]<0)inner++;
      var opens=snd.filter(function(s){return cur[s]===0;}).length,roots=snd.filter(function(s){return(GTR[s]+cur[s])%12===rootPc;}).length;
      var fifth=pcs[2]!=null&&have.indexOf(pcs[2])>=0;
      var sc=snd.length*1.5-inner*2.5-mn*.8-(mx-mn)*.6-(fingers>3?.5:0)-(canBar?1:0)+roots*.3-(fifth?0:.5)+(mx<=3?opens*.8:-opens*.5);
      if(sc>bs){bs=sc;best={f:cur.slice(),pos:mn,bar:canBar&&fr.length>4?mn:0};}
    })(0,[]);
  }
  if(!best)return null;
  /* fingers: index finger barres the lowest fret when the shape needs it; otherwise roughly one finger per fret */
  var fr2=best.f.filter(function(f){return f>0;}),mn2=fr2.length?Math.min.apply(null,fr2):0,barre=!!best.bar;
  var fing=best.f.map(function(){return 0;}),prev=barre?1:0;
  best.f.forEach(function(f,s){if(barre&&f===mn2)fing[s]=1;});
  best.f.map(function(f,s){return[f,s];}).filter(function(x){return x[0]>0&&!(barre&&x[0]===mn2);}).sort(function(a,b){return a[0]-b[0]||a[1]-b[1];})
    .forEach(function(x){var fn=Math.max(prev+1,1+(x[0]-mn2));fing[x[1]]=fn;prev=fn;});
  /* out of fingers: notes on the same fret share one finger (a small barre) */
  if(fing.some(function(x){return x>4;})){var byFret={};best.f.forEach(function(f,s){if(f>0&&!(barre&&f===mn2)){if(byFret[f]==null)byFret[f]=fing[s];fing[s]=Math.min(4,byFret[f]);}});}
  return{f:best.f,fing:fing,barre:barre?mn2:0};
}
function guitarSVG(shape,name){
  if(!shape)return'<p class="hint">No easy guitar shape.</p>';
  var fr=shape.f.filter(function(f){return f>0;}),mn=fr.length?Math.min.apply(null,fr):1,start=Math.max(1,Math.max.apply(null,fr.concat([1]))>4?mn:1),W=120,H=132,x0=18,y0=26,sw=(W-x0-10)/5,fh=20,i,h='';
  h+='<svg class="gshape" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Guitar shape for '+esc(name)+'">';
  h+='<rect x="'+x0+'" y="'+y0+'" width="'+(sw*5)+'" height="'+(fh*5)+'" class="gb"/>';
  if(start===1)h+='<rect x="'+(x0-1)+'" y="'+(y0-3)+'" width="'+(sw*5+2)+'" height="4" class="gn"/>';else h+='<text x="'+(x0-6)+'" y="'+(y0+fh*.68)+'" class="gt" text-anchor="end">'+start+'</text>';
  for(i=1;i<5;i++)h+='<line x1="'+x0+'" x2="'+(x0+sw*5)+'" y1="'+(y0+i*fh)+'" y2="'+(y0+i*fh)+'" class="gf"/>';
  for(i=0;i<6;i++)h+='<line y1="'+y0+'" y2="'+(y0+fh*5)+'" x1="'+(x0+i*sw)+'" x2="'+(x0+i*sw)+'" class="gs"/>';
  if(shape.barre){var bs=shape.f.map(function(f,s){return f===shape.barre?s:-1;}).filter(function(s){return s>=0;});h+='<rect x="'+(x0+bs[0]*sw-6)+'" y="'+(y0+(shape.barre-start+.5)*fh-6)+'" width="'+((bs[bs.length-1]-bs[0])*sw+12)+'" height="12" rx="6" class="gd"/>';}
  shape.f.forEach(function(f,s){var x=x0+s*sw;if(f<0)h+='<text x="'+x+'" y="'+(y0-8)+'" class="gx" text-anchor="middle">×</text>';else if(f===0)h+='<circle cx="'+x+'" cy="'+(y0-11)+'" r="4" class="go"/>';
    else{var y=y0+(f-start+.5)*fh;if(!(shape.barre&&f===shape.barre))h+='<circle cx="'+x+'" cy="'+y+'" r="7" class="gd"/>';h+='<text x="'+x+'" y="'+(y+3.5)+'" class="gfn" text-anchor="middle">'+(shape.fing[s]||'')+'</text>';}});
  return h+'</svg>';
}
function pianoSVG(c){
  var tones=chTones(c),base=S.key+48,ms=tones.map(function(t){return base+t;}),lo=Math.floor(Math.min.apply(null,ms)/12)*12,W=196,H=64,wk=[0,2,4,5,7,9,11],h='<svg class="pshape" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Piano notes">',ww=W/14;
  for(var o=0;o<2;o++)wk.forEach(function(pc,i){var m=lo+o*12+pc,on=ms.indexOf(m)>=0;h+='<rect x="'+((o*7+i)*ww)+'" y="0" width="'+(ww-1)+'" height="'+H+'" rx="2" class="'+(on?'pw on':'pw')+'"/>'+(on?'<text x="'+((o*7+i)*ww+ww/2-.5)+'" y="'+(H-6)+'" text-anchor="middle" class="pl">'+NOTE_NAMES[m%12]+'</text>':'');});
  for(var o2=0;o2<2;o2++)[1,3,6,8,10].forEach(function(pc){var m=lo+o2*12+pc,on=ms.indexOf(m)>=0,x=(o2*7+[0,0,1,1,2,3,3,4,4,5,5,6][pc])*ww+ww*.68;h+='<rect x="'+x+'" y="0" width="'+(ww*.62)+'" height="'+(H*.6)+'" rx="2" class="'+(on?'pb on':'pb')+'"/>';});
  return h+'</svg>';
}
/* ---------- writing a progression into the song ---------- */
function chVoicings(slots,center){
  var prev=null;return slots.map(function(c){if(!c)return null;var v=vVoice(chTones(c).map(function(t){return t>=12?t-12:t;}),prev,center);
    if(c.inv){var bp=chPcs(c)[Math.min(c.inv,CQ[c.q].iv.length-1)];var g=0;while(v[0]%12!==bp&&g++<6){v[0]+=12;v.sort(function(a,b){return a-b;});}}
    prev=v;return v;});
}
var CH_RHY={hold:['Hold',[[0,15.5]]],pulse:['Pulse',[[0,3.5],[4,3.5],[8,3.5],[12,3.5]]],push:['Push',[[0,5.5],[6,5.5],[12,3.5]]],stabs:['Stabs',[[0,1.5],[3,1],[6,1.5],[10,1],[12,1.5]]],
  off:['Off-beats',[[2,1.5],[6,1.5],[10,1.5],[14,1.5]]],strum:['Strum',null],arp:['Arpeggio',null]};
function chNotes(st,rhythm){
  var cpb=st.cpb,len=16/cpb,out=[],vs=chVoicings(st.slots,rhythm==='arp'?60:62);
  st.slots.forEach(function(c,i){if(!c)return;var b0=i*4/cpb,v=vs[i];
    if(rhythm==='strum'){var ev=cpb===1?[[0,'D'],[4,'D'],[6,'U'],[10,'U'],[12,'D'],[14,'U']]:[[0,'D'],[4,'D'],[6,'U']];
      var gv=[v[0]-12].concat(v).concat([v[v.length-1]+(v.length>2?v[1]-v[0]+12:12)]);
      ev.forEach(function(e){var dn=e[1]==='D',str=dn?gv:gv.slice(2).reverse();str.forEach(function(m,k){out.push({s:Math.round((b0+e[0]/4+k*.012)*10000)/10000,d:.45,m:m,v:Math.round(((dn?.72:.58)-k*.012)*100)/100});});});return;}
    if(rhythm==='arp'){var seq=v.concat([v[0]+12]);seq=seq.concat(seq.slice(1,-1).reverse());for(var k2=0;k2<len/2;k2++)out.push({s:b0+k2*.5,d:.45,m:seq[k2%seq.length],v:k2%2?.6:.7});return;}
    CH_RHY[rhythm][1].forEach(function(p){if(p[0]>=len)return;v.forEach(function(m){out.push({s:b0+p[0]/4,d:Math.min(p[1],len-p[0])/4,m:m,v:.66});});});
  });
  return out;
}
function chBass(st,style){
  var cpb=st.cpb,out=[];
  st.slots.forEach(function(c,i){if(!c)return;var b0=i*4/cpb,span=4/cpb,pcs=chPcs(c),bp=pcs[c.inv?Math.min(c.inv,pcs.length-1):0],root=36+((bp-36)%12+12)%12;if(root>45)root-=12;
    var fifth=root+(CQ[c.q].iv[2]||7);
    if(style==='roots')out.push({s:b0,d:span*.95,m:root,v:.82});
    else if(style==='fifth'){out.push({s:b0,d:span/2*.95,m:root,v:.82});out.push({s:b0+span/2,d:span/2*.95,m:span>=4?fifth:root,v:.74});}
    else if(style==='eighths'){for(var k=0;k<span*2;k++)out.push({s:b0+k/2,d:.45,m:root,v:k%2?.66:.8});}
    else if(style==='walk'){var nx=st.slots[(i+1)%st.slots.length]||c,npcs=chPcs(nx),nr=36+((npcs[0]-36)%12+12)%12;if(nr>45)nr-=12;
      var line=span>=4?[root,root+CQ[c.q].iv[1],fifth,nr+(nr>root?-1:1)]:[root,nr+(nr>root?-1:1)];line.forEach(function(m,k){out.push({s:b0+k,d:.92,m:m,v:k?.72:.82});});}
  });
  return out;
}
function chWrite(){
  var st=chState();if(!st.slots.some(Boolean)){toast('Add some chords first');return;}
  var sel=selTrack(),t;
  if(CH.inst==='sel'&&sel&&sel.kind==='inst')t=sel;
  else{var inst=CH.inst==='sel'?'piano':CH.inst;t=mkTrack('inst',inst);applyInstFx(t);t.vol=inst==='strings'||inst==='junopad'||inst==='pad'?.5:.6;S.tracks.push(t);if(S.solo!==null)S.solo.push(t.id);if(A.c)wireTrack(t);loadTrackSamples(t);}
  t._undo=null;t.notes=chNotes(st,CH.rhythm);
  var made=[t.name];
  if(CH.bass!=='none'){
    var bt=S.tracks.filter(function(x){return x.kind==='inst'&&BASSI[x.inst]&&x!==t;})[0];
    if(!bt){bt=mkTrack('inst','ebass');applyInstFx(bt);bt.vol=.78;S.tracks.push(bt);if(S.solo!==null)S.solo.push(bt.id);if(A.c)wireTrack(bt);loadTrackSamples(bt);}
    bt._undo=null;bt.notes=chBass(st,CH.bass);made.push(bt.name);
  }
  S.sel=t.id;S.lastInst=t.id;renderTracks();renderEditor();renderDock();markDirty();
  toast('Written into '+partName(S.part)+': '+made.join(' and '));
}
/* ---------- preview ---------- */
async function chPreview(btn){
  if(LPV.id==='__ch'){loopStop();return;}
  loopStop();var st=chState();if(!st.slots.some(Boolean)){toast('Add some chords first');return;}
  var c=ensureAudio();try{if(c.state!=='running')await c.resume();}catch(e){}
  var inst=CH.inst==='sel'?((selTrack()&&selTrack().kind==='inst')?selTrack().inst:'piano'):CH.inst,t=mkTrack('inst',inst);t.vol=.8;t.rev=.18;
  LPV.id='__ch';if(btn)btn.innerHTML=IC.stop+' Stop';
  try{await ensureSamples(inst);}catch(e){}if(LPV.id!=='__ch')return;
  wireTrack(t);t.vn.gain.value=.8;LPV.t=t;
  var notes=chNotes(st,CH.rhythm),sp=spb(),now=c.currentTime,t0=now+.08,bars=S.bars,bt=null;
  if(CH.bass!=='none'){bt=mkTrack('inst','ebass');try{await ensureSamples('ebass');}catch(e){}wireTrack(bt);bt.vn.gain.value=.75;LPV.t2=bt;}
  notes.forEach(function(n){var h=trackPlay(t,n.m,t0+n.s*sp,n.v);h.release(t0+(n.s+n.d)*sp);LPV.hs.push(h);});
  if(bt)chBass(st,CH.bass).forEach(function(n){var h=trackPlay(bt,n.m,t0+n.s*sp,n.v);h.release(t0+(n.s+n.d)*sp);LPV.hs.push(h);});
  CH.t0=t0;LPV.tm=setTimeout(function(){loopStop();if(LPV.t2){var b2=LPV.t2;LPV.t2=null;setTimeout(function(){unwireTrack(b2);},1500);}var pb=$('chPlay');if(pb)pb.innerHTML=IC.play+' Play';},((t0-now)+bars*4*sp+.4)*1000);
  (function hl(){if(LPV.id!=='__ch')return;var b=(c.currentTime-CH.t0)/sp,i=Math.floor(b/(4/st.cpb));document.querySelectorAll('.chslot').forEach(function(el){el.classList.toggle('now',+el.dataset.i===i);});requestAnimationFrame(hl);})();
}
/* ---------- the panel ---------- */
function openChords(){
  var st=chState();if(CH.sel>=st.slots.length)CH.sel=0;
  function slotHTML(c,i){var f=c?chFunc(c):'';return'<button class="chslot'+(i===CH.sel?' on':'')+(c?' f-'+f:' empty')+'" data-i="'+i+'">'+(c?'<b>'+esc(chName(c))+'</b><small>'+chRoman(c)+'</small>':'<b>＋</b><small>Bar '+(Math.floor(i/st.cpb)+1)+'</small>')+'</button>';}
  function chip(c,extra,cls){return'<button class="chchip f-'+chFunc(c)+(cls?' '+cls:'')+'" data-c="'+c.r+','+c.q+','+(c.inv||0)+'"><b>'+esc(chName(c))+'</b><small>'+chRoman(c)+(extra?' · '+extra:'')+'</small></button>';}
  function detail(){
    var c=st.slots[CH.sel];if(!c)return'<div class="chdet"><p class="hint">Pick a chord for bar '+(Math.floor(CH.sel/st.cpb)+1)+' from the chords in your key, or from the suggestions.</p></div>';
    var f=chFunc(c),names=chPcs(c).map(function(p){return NOTE_NAMES[p];});
    return'<div class="chdet"><div class="chdh"><b>'+esc(chName(c))+'</b><span class="fb f-'+f+'">'+CH_FUNC[f][0]+'</span><span class="hint">'+chRoman(c)+' · '+CQ[c.q].n+'</span></div><p class="hint">'+CH_FUNC[f][1]+' Notes: <b>'+names.join(' – ')+'</b>.</p>'+
      '<div class="chdia">'+pianoSVG(c)+guitarSVG(guitarShape(c),chName(c))+'</div>'+
      '<div class="chvar"><span class="hint">Change it:</span>'+(isMinorQ(c.q)?['m','m7','madd9','m6','m9','sus2','sus4']:['','7','maj7','add9','6','sus2','sus4','9']).map(function(q){return'<button class="chq" data-q="'+q+'" aria-pressed="'+(c.q===q)+'">'+(CQ[q].s||'major')+'</button>';}).join('')+
      '<span class="hint">Bass:</span>'+['Root','3rd','5th'].map(function(n,k){return'<button class="chinv" data-inv="'+k+'" aria-pressed="'+((c.inv||0)===k)+'">'+n+'</button>';}).join('')+'<button data-x="clr" title="Empty this bar">Remove</button></div></div>';
  }
  function draw(){
    st=chState();var prev=null;for(var i=CH.sel-1;i>=0;i--)if(st.slots[i]){prev=st.slots[i];break;}
    var sug=suggestNext(prev),moods=['','Happy','Emotional','Dreamy','Epic','Jazzy','Bluesy','Mysterious'];
    $('mBox').innerHTML='<div class="lhead"><h3>Chord helper</h3><span class="hint">'+partName(S.part)+' · '+S.bars+' bars · '+NOTE_NAMES[S.key]+' '+S.scale.toLowerCase()+'</span><span class="grow"></span><button data-x="close">Done</button></div>'+
      '<div class="chbody">'+
      '<div class="chprog"><div class="chslots" style="grid-template-columns:repeat('+Math.min(st.slots.length,8)+',minmax(0,1fr))">'+st.slots.map(slotHTML).join('')+'</div>'+
      '<div class="row chctl"><button id="chPlay" data-x="play">'+(LPV.id==='__ch'?IC.stop+' Stop':IC.play+' Play')+'</button><label class="il">Chords per bar <select id="chCpb"><option value="1"'+(st.cpb===1?' selected':'')+'>1</option><option value="2"'+(st.cpb===2?' selected':'')+'>2</option></select></label>'+
      '<button data-x="read" title="Work out the chords from the notes already in this part">Read my song</button><button data-x="clear">Clear</button></div></div>'+
      '<div class="chcols"><div class="chleft">'+
        '<h4>What could come next'+(prev?' after '+esc(chName(prev)):'')+'</h4><div class="chsug">'+sug.map(function(x){return'<button class="chsg f-'+chFunc(x[0])+'" data-c="'+x[0].r+','+x[0].q+',0"><b>'+esc(chName(x[0]))+'</b><span>'+chRoman(x[0])+'</span><small>'+x[1]+'</small></button>';}).join('')+'</div>'+
        '<h4>Chords in your key</h4><div class="chpal">'+diatonic(false).map(function(c){return chip(c);}).join('')+'</div>'+
        '<div class="chpal">'+diatonic(true).map(function(c){return chip(c,'','sm');}).join('')+'</div>'+
        '<h4>Bold choices <span class="hint">borrowed from outside the key</span></h4><div class="chpal">'+spiceChords().map(function(c){return chip(c,c.n);}).join('')+'</div>'+
        detail()+
      '</div><div class="chright"><h4>Ready-made progressions</h4><div class="ltagrow">'+moods.map(function(m){return'<button class="chip" data-mood="'+m+'" aria-pressed="'+(CH.mood===m)+'">'+(m||'All')+'</button>';}).join('')+'</div>'+
        '<div class="chtpls">'+CH_TEMPLATES.filter(function(t){return!CH.mood||t[0]===CH.mood;}).map(function(t){var i=CH_TEMPLATES.indexOf(t),cs=tplChords(t);return'<button class="chtpl" data-t="'+i+'"><b>'+t[1]+'</b><small>'+cs.map(chName).join(' – ')+'</small><span class="hint">'+t[0]+' · '+cs.length+' chords</span></button>';}).join('')+'</div>'+
        '<div class="chout"><h4>Put it in my song</h4>'+
          '<label class="il">Played by <select id="chInst"><option value="sel"'+(CH.inst==='sel'?' selected':'')+'>'+((selTrack()&&selTrack().kind==='inst')?'Selected track ('+esc(selTrack().name)+')':'A new piano track')+'</option>'+[['piano','New grand piano'],['epiano','New Rhodes'],['steel','New acoustic guitar'],['eguitar','New electric guitar'],['strings','New string section'],['junopad','New synth pad'],['organ','New organ']].map(function(o){return'<option value="'+o[0]+'"'+(CH.inst===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>'+
          '<label class="il">Rhythm <select id="chRhy">'+Object.keys(CH_RHY).map(function(k){return'<option value="'+k+'"'+(CH.rhythm===k?' selected':'')+'>'+CH_RHY[k][0]+'</option>';}).join('')+'</select></label>'+
          '<label class="il">Bass line <select id="chBass">'+[['none','None'],['roots','Long roots'],['fifth','Root and fifth'],['eighths','Driving eighths'],['walk','Walking']].map(function(o){return'<option value="'+o[0]+'"'+(CH.bass===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>'+
          '<button class="primary" data-x="write">Write into '+esc(partName(S.part))+'</button><p class="hint">Writing replaces the notes of that track (and the bass track) in this part. Undo brings them back.</p></div>'+
      '</div></div></div>';
  }
  function setSlot(c){st=chState();st.slots[CH.sel]=c;if(CH.sel<st.slots.length-1)CH.sel++;markDirty();draw();if(R)R.draw();if(c)chAudition(c);}
  openModal('',function(e){
    var b=e.target.closest('button');if(!b)return;var x=b.dataset.x;
    if(x==='close'){loopStop();closeModal();return;}
    if(x==='play'){chPreview(b);return;}
    if(x==='clear'){st.slots=st.slots.map(function(){return null;});CH.sel=0;markDirty();draw();if(R)R.draw();return;}
    if(x==='read'){var d=detectProg();if(!d){toast('No notes to read in this part yet');return;}st.cpb=1;var dt=diatonic(false);st.slots=d.map(function(k){return Object.assign({},dt[k]);});CH.sel=0;markDirty();draw();if(R)R.draw();toast('Read the chords from your notes');return;}
    if(x==='write'){chWrite();draw();return;}
    if(x==='clr'){st.slots[CH.sel]=null;markDirty();draw();if(R)R.draw();return;}
    if(b.dataset.i!=null){CH.sel=+b.dataset.i;draw();var c0=st.slots[CH.sel];if(c0)chAudition(c0);return;}
    if(b.dataset.c){var p=b.dataset.c.split(',');setSlot({r:+p[0],q:p[1],inv:+p[2]||0});return;}
    if(b.dataset.q!=null){var c1=st.slots[CH.sel];if(c1){c1.q=b.dataset.q;markDirty();draw();chAudition(c1);if(R)R.draw();}return;}
    if(b.dataset.inv!=null){var c2=st.slots[CH.sel];if(c2){c2.inv=+b.dataset.inv;markDirty();draw();chAudition(c2);if(R)R.draw();}return;}
    if(b.dataset.mood!=null){CH.mood=b.dataset.mood;draw();return;}
    if(b.dataset.t!=null){var tp=CH_TEMPLATES[+b.dataset.t],cs=tplChords(tp);
      if(cs.length>S.bars*st.cpb){var nb=[2,4,8,12,16,32].filter(function(n){return n>=cs.length/st.cpb;})[0]||32;S.bars=nb;$('bars').value=nb;if(R)R.resize();renderSong();toast('This part is now '+nb+' bars long to fit '+tp[1]);}
      st=chState();st.slots=st.slots.map(function(_,i){return Object.assign({},cs[i%cs.length]);});CH.sel=0;markDirty();draw();if(R)R.draw();toast(tp[1]+': '+cs.map(chName).join(' – '));}
  });
  modalOnClose=loopStop;
  $('mBox').classList.add('pk','chbox');draw();
  $('mBox').onchange=function(e){var id=e.target.id;
    if(id==='chCpb'){var nc=+e.target.value,old=st.slots.slice(),oc=st.cpb;st.cpb=nc;st.slots=[];for(var i=0;i<S.bars*nc;i++)st.slots.push(old[Math.floor(i*oc/nc)]?Object.assign({},old[Math.floor(i*oc/nc)]):null);CH.sel=0;markDirty();draw();if(R)R.draw();}
    if(id==='chInst')CH.inst=e.target.value;if(id==='chRhy')CH.rhythm=e.target.value;if(id==='chBass')CH.bass=e.target.value;};
}
function chAudition(c){
  var kt=keyTrack();if(!kt||kt.kind!=='inst'){kt=null;}ensureAudio();var v=chVoicings([c],60)[0],t=kt||{kind:'inst',inst:'piano'};
  if(!kt){ensureSamples('piano').then(function(){var now=A.c.currentTime;v.forEach(function(m){var h=playInst('piano',A.c,A.master,m,now+.01,.7);h.release(now+.9);});});return;}
  ensureHeard(kt);var now=A.c.currentTime;v.forEach(function(m,i){var h=trackPlay(kt,m,now+.01+i*.012,.7);h.release(now+.9);});
}
