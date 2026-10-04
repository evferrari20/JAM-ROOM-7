/* =============== instrument view (visualizer) ===============
   A strip above the keys: the note on a small grand staff, plus a simple drawing of the
   instrument that lights up where that note is played. Piano, organ, fretboards, bowed
   strings, harp, mallet bars and wind/voice outlines. Drums light the drawn kit instead. */
var VIZ=(function(){
  var NS='http://www.w3.org/2000/svg',host=null,svg=null,kind='',tr=null,lit={},nid=0,want=true;
  try{want=localStorage.getItem('jr-viz')!=='0';}catch(e){}
  var FLATKEY={5:1,10:1,3:1,8:1,1:1};
  var LET=[0,0,1,1,2,3,3,4,4,5,5,6],SHARP=[0,1,0,1,0,0,1,0,1,0,1,0];
  function spell(m){
    /* letter step and accidental, sharps or flats by the song key */
    var pc=((m%12)+12)%12,oct=Math.floor(m/12)-1,flat=FLATKEY[S.key]&&SHARP[pc];
    var l=flat?LET[pc]+1:LET[pc],acc=SHARP[pc]?(flat?'♭':'♯'):'';
    if(l>6){l=0;oct++;}
    return{step:oct*7+l,acc:acc,name:'CDEFGAB'[l]+acc,oct:oct};
  }
  function el(t,a,p){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
  /* which drawing */
  function pick(t){
    if(!t)return'';if(t.kind==='drum')return'drum';if(t.kind==='voice')return'voice';
    var g=INST_GROUP[t.inst]||'',i=t.inst;
    if(i==='harp')return'harp';
    if(i==='violin'||i==='strings'||i==='tronstrings')return'violin';
    if(i==='cello')return'cello';
    if(i==='contrabass'||i==='jazzbass')return'dbass';
    if(i==='pizz')return'violin';
    if(g==='Guitars'||i==='sitar'||i==='shamisen')return i==='sitar'?'sitar':i==='shamisen'?'shamisen':'guitar';
    if(i==='banjo')return'banjo';
    if(g==='Bass')return'bass';
    if(g==='Organs & reeds'&&i!=='accordion')return'organ';
    if(g==='Mallets & bells'||i==='kalimba'||i==='steeldrum'||i==='koto'||i==='dulcimer')return'bars';
    if(g==='Brass')return'brass';
    if(g==='Woodwinds'||i==='shakuhachi'||i==='ocarina'||i==='harmonica'||i==='accordion')return i==='sax'||i==='tenorsax'||i==='clarinet'||i==='bassoon'||i==='oboe'?'reed':'flute';
    if(g==='Voices')return'voice';
    return'piano';
  }
  var TUNE={guitar:[40,45,50,55,59,64],bass:[28,33,38,43],banjo:[50,55,59,62,67],sitar:[48,53,55,60],shamisen:[48,55,60],violin:[55,62,69,76],cello:[36,43,50,57],dbass:[28,33,38,43]};
  var FRETTED={guitar:1,bass:1,banjo:1,sitar:1};
  var RANGE={brass:[40,84],reed:[44,84],flute:[60,96],voice:[40,84]};
  /* ---- staff ---- */
  function staffY(step){return 50-(step-28)*3;}/* C4 is step 28 */
  function drawStaff(g){
    for(var i=0;i<5;i++){el('line',{x1:8,x2:168,y1:20+i*6,y2:20+i*6,class:'vz-sl'},g);el('line',{x1:8,x2:168,y1:56+i*6,y2:56+i*6,class:'vz-sl'},g);}
    el('line',{x1:8,x2:8,y1:20,y2:80,class:'vz-sl'},g);
    var t1=el('text',{x:12,y:45,class:'vz-clef'},g);t1.textContent='𝄞';
    var t2=el('text',{x:13,y:70,class:'vz-clef b'},g);t2.textContent='𝄢';
    el('g',{class:'vz-heads'},g);
    var nm=el('text',{x:88,y:110,class:'vz-name','text-anchor':'middle'},g);nm.textContent='';
  }
  function drawHeads(){
    if(!svg)return;var g=svg.querySelector('.vz-heads'),nm=svg.querySelector('.vz-name');if(!g)return;
    while(g.firstChild)g.removeChild(g.firstChild);
    var ms=Object.keys(lit).map(function(k){return lit[k].m;}).filter(function(m,i,a){return a.indexOf(m)===i;}).sort(function(a,b){return a-b;}).slice(-6);
    var names=[],prev=null;
    ms.forEach(function(m){
      var sp=spell(m),y=staffY(sp.step),x=(prev!=null&&sp.step-prev<=1)?118:104;prev=sp.step;
      for(var ly=14;ly>=y-1;ly-=6)el('line',{x1:x-8,x2:x+8,y1:ly,y2:ly,class:'vz-sl'},g);
      for(ly=86;ly<=y+1;ly+=6)el('line',{x1:x-8,x2:x+8,y1:ly,y2:ly,class:'vz-sl'},g);
      if(sp.step===28)el('line',{x1:x-8,x2:x+8,y1:50,y2:50,class:'vz-sl'},g);
      el('ellipse',{cx:x,cy:y,rx:4.6,ry:3.4,transform:'rotate(-20 '+x+' '+y+')',class:'vz-head'},g);
      if(sp.acc){var a=el('text',{x:x-12,y:y+3.5,class:'vz-acc','text-anchor':'middle'},g);a.textContent=sp.acc;}
      names.push(sp.name+sp.oct);
    });
    nm.textContent=names.join(' ');
  }
  /* ---- instrument drawings (x 190..990, y 0..120) ---- */
  var X0=196,X1=988,VW=1000;
  function drawPiano(g){
    var lo=21,hi=108,whites=[],m,W=[0,2,4,5,7,9,11];
    for(m=lo;m<=hi;m++)if(W.indexOf(m%12)>=0)whites.push(m);
    var kw=(X1-X0)/whites.length,y=34,h=74;
    el('rect',{x:X0-8,y:y-14,width:X1-X0+16,height:h+20,rx:6,class:'vz-wood'},g);
    el('rect',{x:X0-2,y:y-4,width:X1-X0+4,height:4,class:'vz-felt'},g);
    var pos={};
    whites.forEach(function(mm,i){var r=el('rect',{x:X0+i*kw,y:y,width:kw-.8,height:h,rx:1.5,class:'vz-wk','data-m':mm},g);pos[mm]={x:X0+i*kw+kw/2,y:y+h-10,el:r};});
    for(m=lo;m<=hi;m++){if(W.indexOf(m%12)>=0)continue;var left=pos[m-1];if(!left)continue;var bx=left.x+kw/2-kw*.3;var r2=el('rect',{x:bx,y:y,width:kw*.6,height:h*.6,rx:1,class:'vz-bk','data-m':m},g);pos[m]={x:bx+kw*.3,y:y+h*.6-8,el:r2};}
    /* bracket: the part of a real piano your on-screen keys cover */
    var b0=12*(S.oct+1),bw=document.querySelectorAll('#dock .kb .wk').length,b1=b0;var cnt=0;for(m=b0;cnt<bw&&m<=hi;m++){if(W.indexOf(m%12)>=0)cnt++;b1=m;}
    if(pos[b0]&&pos[b1]){var xa=pos[b0].x-kw/2,xb=pos[b1].x+kw/2;el('path',{d:'M'+xa+' '+(y-8)+'v-4H'+xb+'v4',class:'vz-brk'},g);var tx=el('text',{x:(xa+xb)/2,y:y-15,class:'vz-cap','text-anchor':'middle'},g);tx.textContent='your keys';}
    var c4=pos[60];if(c4){var tc=el('text',{x:c4.x,y:y+h+11,class:'vz-cap','text-anchor':'middle'},g);tc.textContent='middle C';}
    return function(mm){var p=pos[mm];return p?{x:p.x,y:p.y,el:p.el}:null;};
  }
  function drawOrgan(g){
    var lo=36,hi=96,n=hi-lo+1,w=(X1-X0)/n,pos={};
    el('rect',{x:X0-8,y:104,width:X1-X0+16,height:12,rx:3,class:'vz-wood'},g);
    for(var m=lo;m<=hi;m++){var i=m-lo,h=88-i*1.05,x=X0+i*w,yy=104-h;
      var r=el('path',{d:'M'+(x+1)+' '+(yy+3)+'q'+(w/2-1)+' -5 '+(w-2)+' 0V104H'+(x+1)+'z',class:'vz-pipe'+(SHARP[m%12]?' s':''),'data-m':m},g);
      el('rect',{x:x+w*.25,y:104-12,width:w*.5,height:3,class:'vz-mouth'},g);pos[m]={x:x+w/2,y:yy+6,el:r};}
    return function(mm){while(mm<lo)mm+=12;while(mm>hi)mm-=12;return pos[mm];};
  }
  function drawNeck(g,k){
    var tun=TUNE[k],fr=!!FRETTED[k],nf=fr?15:12,L=(X1-X0-40)/(1-Math.pow(2,-nf/12)),nut=X0+30,ns=tun.length,top=22,bot=98,sp=(bot-top)/(ns-1);
    function fx(f){return nut+L*(1-Math.pow(2,-f/12));}
    el('path',{d:'M'+(X0)+' '+(top-10)+'H'+X1+'V'+(bot+10)+'H'+X0+'z',class:fr?'vz-neck':'vz-neck ebony'},g);
    el('rect',{x:X0,y:top-10,width:30,height:bot-top+20,class:'vz-head2'},g);
    el('rect',{x:nut-3,y:top-10,width:5,height:bot-top+20,class:'vz-nut'},g);
    if(fr){for(var f=1;f<=nf;f++)el('line',{x1:fx(f),x2:fx(f),y1:top-10,y2:bot+10,class:'vz-fret'},g);
      [3,5,7,9,15].forEach(function(f){el('circle',{cx:(fx(f)+fx(f-1))/2,cy:(top+bot)/2,r:3.5,class:'vz-inlay'},g);});
      el('circle',{cx:(fx(12)+fx(11))/2,cy:top+sp*.5,r:3.5,class:'vz-inlay'},g);el('circle',{cx:(fx(12)+fx(11))/2,cy:bot-sp*.5,r:3.5,class:'vz-inlay'},g);
      for(f=3;f<=nf;f+=2){if(f===11||f===13)continue;var tt=el('text',{x:(fx(f)+fx(f-1))/2,y:bot+20,class:'vz-cap','text-anchor':'middle'},g);tt.textContent=f;}}
    else{[2,4,5,7,9,12].forEach(function(f){el('line',{x1:fx(f),x2:fx(f),y1:bot+6,y2:bot+10,class:'vz-fret'},g);});}
    var strs=[];
    for(var s=0;s<ns;s++){var y=bot-s*sp,th=1+ (ns-s)*.35;strs.push(el('line',{x1:X0+12,x2:X1,y1:y,y2:y,'stroke-width':th,class:'vz-str'},g));
      var lb=el('text',{x:X0+8,y:y+3.5,class:'vz-cap','text-anchor':'middle'},g);lb.textContent=NOTE_NAMES[tun[s]%12].replace('#','♯').replace('b','♭');}
    return function find(mm){
      var best=null;for(var s2=0;s2<ns;s2++){var f2=mm-tun[s2];if(f2<0||f2>nf)continue;if(!best||f2<best.f)best={s:s2,f:f2};}
      /* out of range for this instrument: show it an octave up or down */
      if(!best){var o=mm;while(o<tun[0])o+=12;while(o>tun[ns-1]+nf)o-=12;if(o===mm)return null;return find(o);}
      var y2=bot-best.s*sp,x2=best.f===0?nut-12:(fx(best.f)+fx(best.f-1))/2;
      return{x:x2,y:y2,str:strs[best.s],open:best.f===0};
    };
  }
  function drawHarp(g){
    var lo=36,hi=96,W=[0,2,4,5,7,9,11],ss=[],m;for(m=lo;m<=hi;m++)if(W.indexOf(m%12)>=0)ss.push(m);
    var w=(X1-X0-40)/(ss.length-1),pos={};
    el('path',{d:'M'+X0+' 110 L'+(X0+10)+' 10 Q'+((X0+X1)/2)+' -6 '+X1+' 40 L'+X1+' 110 Z',class:'vz-harp'},g);
    ss.forEach(function(mm,i){var x=X0+20+i*w,top=14+i*(26/ss.length)+Math.pow(i/ss.length,2)*10,cls='vz-hs'+(mm%12===0?' c':mm%12===5?' f':'');
      var l=el('line',{x1:x,x2:x,y1:top+((x-X0)/(X1-X0))*10,y2:104,class:cls},g);pos[mm]={x:x,y:80,str:l};});
    return function(mm){var b=mm;while(!pos[b]&&b>lo-12){b--;}while(b<lo)b+=12;while(b>hi)b-=12;while(!pos[b])b--;var p=pos[b];return p?{x:p.x,y:p.y,str:p.str,sharp:b!==mm}:null;};
  }
  function drawBars(g,t){
    var lo=48,hi=96,W=[0,2,4,5,7,9,11],nat=[],m;for(m=lo;m<=hi;m++)if(W.indexOf(m%12)>=0)nat.push(m);
    var w=(X1-X0)/nat.length,pos={},metal=['vibes','glock','bowedvibe','tubular','chimes','celesta','musicbox','bells','steeldrum','glasses','kalimba'].indexOf(t.inst)>=0;
    el('rect',{x:X0-6,y:56,width:X1-X0+12,height:5,rx:2,class:'vz-rail'},g);el('rect',{x:X0-6,y:94,width:X1-X0+12,height:5,rx:2,class:'vz-rail'},g);
    nat.forEach(function(mm,i){var h=62-i*1.1,x=X0+i*w,yy=104-h;var r=el('rect',{x:x+1.5,y:yy,width:w-3,height:h,rx:3,class:'vz-bar'+(metal?' metal':''),'data-m':mm},g);pos[mm]={x:x+w/2,y:yy+h/2,el:r};});
    for(m=lo;m<=hi;m++){if(W.indexOf(m%12)>=0)continue;var p=pos[m-1];if(!p)continue;var h2=34-(m-lo)*.3,x2=p.x+w/2-w*.42;var r2=el('rect',{x:x2,y:4,width:w*.84,height:h2,rx:3,class:'vz-bar'+(metal?' metal':''),'data-m':m},g);pos[m]={x:x2+w*.42,y:4+h2/2,el:r2};}
    return function(mm){while(mm<lo)mm+=12;while(mm>hi)mm-=12;return pos[mm];};
  }
  var SIL={
    brass:'M230 60h300c18 0 26-8 40-8h40c6 0 10 4 18 4l90-30c26-8 50 2 60 20v28c-10 18-34 28-60 20l-90-30c-8 0-12 4-18 4h-40c-14 0-22-8-40-8H230z M520 52v-18h10v18M548 52v-18h10v18M576 52v-18h10v18',
    reed:'M250 40l60 8 260 0c30 0 40 10 60 30l60 60M632 78c20 20 40 34 76 34 40 0 60-28 60-62V40M768 40c0-8 10-12 22-6M300 48v-6h8v6',
    flute:'M220 64h640v12H220z M300 70m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    voice:'M560 18a30 30 0 0 1 60 0v40a30 30 0 0 1-60 0z M540 50a50 50 0 0 0 100 0 M590 100v14 M560 114h60'
  };
  function drawWind(g,k){
    var r=RANGE[k],path=SIL[k];
    var off=(VW-1000)/2,sg=el('g',{transform:'translate('+off+' 0)'},g);
    el('path',{d:path,class:'vz-sil'+(k==='flute'?' flute':'')},sg);
    if(k==='flute'){for(var i=0;i<6;i++)el('circle',{cx:620+i*30,cy:70,r:5,class:'vz-hole','data-i':i},sg);}
    el('line',{x1:X0+10,x2:X1-10,y1:112,y2:112,class:'vz-range'},g);
    var lt=el('text',{x:X0+10,y:106,class:'vz-cap'},g);lt.textContent='low';var ht=el('text',{x:X1-10,y:106,class:'vz-cap','text-anchor':'end'},g);ht.textContent='high';
    var mouth={brass:[856,60],reed:[790,38],flute:[840,70],voice:[590,30]}[k];mouth=[mouth[0]+off,mouth[1]];
    return function(mm){
      var f=Math.max(0,Math.min(1,(mm-r[0])/(r[1]-r[0])));
      if(k==='flute')svg.querySelectorAll('.vz-hole').forEach(function(h,i){h.classList.toggle('shut',i<Math.round((1-f)*6));});
      return{x:X0+10+f*(X1-X0-20),y:112,mouth:mouth,range:true};
    };
  }
  function mount(t){
    host=document.getElementById('viz');if(!host)return;tr=t;lit={};
    kind=pick(t);if(kind==='drum'){host.hidden=true;return;}
    host.hidden=!want;if(!want)return;
    host.innerHTML='';VW=Math.max(1000,Math.min(1600,Math.round(host.clientWidth/Math.max(1,host.clientHeight)*120)||1000));X1=VW-12;
    svg=el('svg',{viewBox:'0 0 '+VW+' 120',preserveAspectRatio:'xMidYMid meet',class:'vz'},host);
    var st=el('g',{class:'vz-staff'},svg);drawStaff(st);
    var g=el('g',{class:'vz-inst'},svg);
    var lab=el('text',{x:X1,y:10,class:'vz-cap','text-anchor':'end'},svg);lab.textContent=INST_NAME[t.inst]||(t.kind==='voice'?'Voice':'');
    var fx=kind==='piano'?drawPiano(g):kind==='organ'?drawOrgan(g):TUNE[kind]?drawNeck(g,kind):kind==='harp'?drawHarp(g):kind==='bars'?drawBars(g,t):drawWind(g,kind);
    svg._fx=fx;svg._fx2=el('g',{class:'vz-fx'},svg);
  }
  function ripple(x,y,big){
    if(LITE||VIS_PAUSE||!svg)return;var c=el('circle',{cx:x,cy:y,r:big?10:6,class:'vz-rip'},svg._fx2);setTimeout(function(){if(c.parentNode)c.parentNode.removeChild(c);},650);
  }
  function on(m,id){
    if(!svg||!svg._fx)return;var p=svg._fx(m);lit[id]={m:m,p:p};
    if(p){
      if(p.el)p.el.classList.add('lit');
      if(p.str){p.str.classList.remove('vib');void p.str.getBBox;p.str.classList.add('lit','vib');
        p.dot=el('g',{class:'vz-dot'},svg._fx2);el('circle',{cx:p.x,cy:p.y,r:8.5},p.dot);var tx=el('text',{x:p.x,y:p.y+3.5,'text-anchor':'middle'},p.dot);tx.textContent=spell(m).name;}
      if(p.range){p.dot=el('g',{class:'vz-dot'},svg._fx2);el('circle',{cx:p.x,cy:p.y,r:7},p.dot);
        if(!LITE&&!VIS_PAUSE){var b=el('text',{x:p.mouth[0],y:p.mouth[1],class:'vz-bub','text-anchor':'middle'},svg._fx2);b.textContent=spell(m).name;setTimeout(function(){if(b.parentNode)b.parentNode.removeChild(b);},1100);}}
      ripple(p.x,p.y,kind==='bars');
    }
    drawHeads();
  }
  function off(id){
    var L=lit[id];if(!L)return;delete lit[id];var p=L.p;
    if(p){var still=Object.keys(lit).some(function(k){return lit[k].p&&(lit[k].p.el===p.el&&p.el||lit[k].p.str===p.str&&p.str);});
      if(!still){if(p.el)p.el.classList.remove('lit');if(p.str)p.str.classList.remove('lit','vib');}
      if(p.dot&&p.dot.parentNode)p.dot.parentNode.removeChild(p.dot);}
    drawHeads();
  }
  function c(){return A.c;}
  /* called for every note a track plays (live or playback); shows it at the moment it sounds */
  function note(t,m,tm){
    if(!want||t!==tr||A.off||!svg)return null;var id=++nid,d=Math.max(0,(tm-c().currentTime)*1000);
    if(d<8)on(m,id);else setTimeout(function(){on(m,id);},d);
    return id;
  }
  function end(id,te){if(id==null)return;var d=Math.max(0,(te-c().currentTime)*1000);if(d<8)off(id);else setTimeout(function(){off(id);},d+20);}
  function drum(t,pi,tm){
    if(A.off||t!==tr)return;var d=Math.max(0,(tm-c().currentTime)*1000);
    setTimeout(function(){var p=document.querySelector('#dock .kitset .pad[data-m="'+pi+'"]');if(!p||p.classList.contains('on'))return;p.classList.add('on','auto');setTimeout(function(){p.classList.remove('on','auto');},120);},d);
  }
  function toggle(){want=!want;try{localStorage.setItem('jr-viz',want?'1':'0');}catch(e){}return want;}
  function clear(){Object.keys(lit).forEach(off);}
  return{mount:mount,note:note,end:end,drum:drum,toggle:toggle,on:function(){return want;},clear:clear,spell:spell,staffY:staffY};
})();
