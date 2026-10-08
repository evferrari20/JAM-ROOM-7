/* =============== 3D INSTRUMENTS (three.js, clean cartoon look) ===============
   Every instrument is modelled in code and drawn with soft cel shading and an ink outline, rendered at
   high resolution so edges stay crisp. Moving parts react to each note: keys go down, strings shake under
   fingertips, valves and keys press, slides move, bows bow, mallets strike, bellows breathe, singers sing.
   VZ3D(THREE,helpers) -> {view(canvas), has(instId)}; view.show(instId), view.press(midi,id,vel),
   view.release(id), view.caption(). Rendering only runs while something moves. */
function VZ3D(THREE,H){
  H=H||{};
  var TAU=Math.PI*2,NN=H.noteNames||['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  function nm(m){return NN[((m%12)+12)%12];}
  function clamp(v,a,b){return v<a?a:v>b?b:v;}
  function fold(m,lo,hi){while(m<lo)m+=12;while(m>hi)m-=12;return m;}
  /* ---------- the look ---------- */
  function gradTex(a){var t=new THREE.DataTexture(new Uint8Array(a),a.length,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;}
  var G3=gradTex([110,190,255]),G4=gradTex([85,155,215,255]);
  var C={ink:0x22160e,wood:0xe2a65a,woodL:0xf2c98a,woodD:0x9a4f26,mahog:0x7c3a1c,rose:0x4a2c1e,ebony:0x342c28,maple:0xf0d6a2,
    brass:0xf2c14e,silver:0xdfe6ea,chrome:0xf1f4f6,black:0x33333b,ivory:0xfbf6ea,ebKey:0x2f2f37,pearl:0xfff7ec,skin:0xf4b994,
    red:0xd24a33,cream:0xf3e8cd,green:0x6be3a8,greenD:0x2ea56b,gold:0xebbd4c,copper:0xd7804a,white:0xffffff,bamboo:0xd8c27a,tort:0x7a3414};
  var MC={};
  function T(hex,metal){var k=hex+(metal?'m':'');if(!MC[k]){MC[k]=new THREE.MeshToonMaterial({color:hex,gradientMap:metal?G4:G3});MC[k].userData.keep=1;}return MC[k];}
  function DS(m){if(!m.userData.ds){var c=m.clone();c.side=THREE.DoubleSide;c.userData.keep=1;m.userData.ds=c;}return m.userData.ds;}
  function lit(mesh,on,col){if(!mesh)return;if(!mesh.userData.m0)mesh.userData.m0=mesh.material;mesh.material=on?T(col==null?C.green:col,mesh.userData.m0.gradientMap===G4):mesh.userData.m0;}
  /* ink outline: back faces pushed out by a fixed number of screen pixels */
  var OL=new THREE.ShaderMaterial({uniforms:{px:{value:1.3},res:{value:new THREE.Vector2(800,150)},col:{value:new THREE.Color(C.ink)}},side:THREE.BackSide,
    vertexShader:'uniform float px;uniform vec2 res;void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);vec3 n=normalMatrix*normal;vec2 d=(projectionMatrix*vec4(n,0.0)).xy;float l=length(d);if(l>1e-6)d/=l;p.xy+=d*px*2.0/res*p.w;gl_Position=p;}',
    fragmentShader:'uniform vec3 col;void main(){gl_FragColor=vec4(col,1.0);}'});OL.userData.keep=1;
  function smoothGeo(g){
    var src=g.index?g.toNonIndexed():g;if(!src.attributes.normal){src=src.clone();src.computeVertexNormals();}
    var pos=src.attributes.position,nor=src.attributes.normal,n=pos.count,map={},keys=new Array(n),out=new Float32Array(n*3),i;
    for(i=0;i<n;i++){var k=Math.round(pos.getX(i)*2e4)+'_'+Math.round(pos.getY(i)*2e4)+'_'+Math.round(pos.getZ(i)*2e4);keys[i]=k;var a=map[k]||(map[k]=[0,0,0]);a[0]+=nor.getX(i);a[1]+=nor.getY(i);a[2]+=nor.getZ(i);}
    for(i=0;i<n;i++){var b=map[keys[i]],l=Math.hypot(b[0],b[1],b[2])||1;out[i*3]=b[0]/l;out[i*3+1]=b[1]/l;out[i*3+2]=b[2]/l;}
    var r=new THREE.BufferGeometry();r.setAttribute('position',pos);r.setAttribute('normal',new THREE.BufferAttribute(out,3));return r;
  }
  function outline(root){var list=[];root.traverse(function(o){if(o.isMesh&&!o.userData.noOL&&!o.userData.ol)list.push(o);});
    list.forEach(function(o){var g=o.geometry;if(!g.userData.olg)g.userData.olg=smoothGeo(g);var m=new THREE.Mesh(g.userData.olg,OL);m.userData.ol=1;m.userData.noOL=1;o.add(m);});}
  /* ---------- geometry helpers ---------- */
  var GC={};
  function rboxGeo(w,h,d,r){
    var k='rb'+[w,h,d,r].map(function(v){return v.toFixed(4);}).join(',');if(GC[k])return GC[k];
    var b=Math.max(1e-4,Math.min(r,h/2*.95,w/2*.95,d/2*.95)),iw=Math.max(2e-4,w-2*b),id=Math.max(2e-4,d-2*b),rr=Math.max(5e-5,Math.min(r-b*.5,iw/2*.98,id/2*.98)),s=new THREE.Shape();
    s.moveTo(-iw/2+rr,-id/2);s.lineTo(iw/2-rr,-id/2);s.quadraticCurveTo(iw/2,-id/2,iw/2,-id/2+rr);s.lineTo(iw/2,id/2-rr);s.quadraticCurveTo(iw/2,id/2,iw/2-rr,id/2);
    s.lineTo(-iw/2+rr,id/2);s.quadraticCurveTo(-iw/2,id/2,-iw/2,id/2-rr);s.lineTo(-iw/2,-id/2+rr);s.quadraticCurveTo(-iw/2,-id/2,-iw/2+rr,-id/2);
    var g=new THREE.ExtrudeGeometry(s,{depth:Math.max(1e-4,h-2*b),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:4});
    g.translate(0,0,-(h-2*b)/2);g.rotateX(-Math.PI/2);g.userData.keep=1;return GC[k]=g;
  }
  function KP(g){g.userData.keep=1;return g;}
  function cylGeo(rt,rb,h,seg){var k='cy'+[rt,rb,h,seg||24].join(',');return GC[k]||(GC[k]=KP(new THREE.CylinderGeometry(rt,rb,h,seg||24)));}
  function sphGeo(r,ws,hs){var k='sp'+[r,ws||22,hs||16].join(',');return GC[k]||(GC[k]=KP(new THREE.SphereGeometry(r,ws||22,hs||16)));}
  function torGeo(R,r,ts,arc){var k='to'+[R,r,ts||40,arc||0].join(',');return GC[k]||(GC[k]=KP(new THREE.TorusGeometry(R,r,10,ts||40,arc||TAU)));}
  function tubeGeo(pts,r,seg,closed){var c=new THREE.CatmullRomCurve3(pts.map(function(p){return new THREE.Vector3(p[0],p[1],p[2]||0);}),!!closed,'catmullrom',.5);return new THREE.TubeGeometry(c,seg||64,r,12,!!closed);}
  function latheGeo(prof,seg){return new THREE.LatheGeometry(prof.map(function(p){return new THREE.Vector2(p[0],p[1]);}),seg||40);}
  /* a flat shape lying on the ground (shape x -> x, shape y -> -z), raised by depth */
  function extGeo(shape,depth,bev){var g=new THREE.ExtrudeGeometry(shape,{depth:depth,bevelEnabled:!!bev,bevelThickness:bev||0,bevelSize:bev||0,bevelSegments:bev?3:0,curveSegments:40});g.rotateX(-Math.PI/2);return g;}
  function add(par,geo,mat,p,r,s,noOL){var m=new THREE.Mesh(geo,mat);if(p)m.position.set(p[0],p[1],p[2]||0);if(r)m.rotation.set(r[0]||0,r[1]||0,r[2]||0);if(s!=null){if(typeof s==='number')m.scale.setScalar(s);else m.scale.set(s[0],s[1],s[2]);}if(noOL)m.userData.noOL=1;par.add(m);return m;}
  function grp(par,p,r){var g=new THREE.Group();if(p)g.position.set(p[0],p[1],p[2]||0);if(r)g.rotation.set(r[0]||0,r[1]||0,r[2]||0);par.add(g);return g;}
  function V3(x,y,z){return new THREE.Vector3(x,y,z||0);}
  /* soft round texture (no hard pixels) for puffs and shadows */
  var SOFT=(function(){var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.5,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
  function shadow(par,w,d,y,x,z){var m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:SOFT,color:0x000000,transparent:true,opacity:.32,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x||0,y,z||0);m.userData.noOL=1;m.renderOrder=-1;par.add(m);return m;}
  var LBC={};
  function labelMat(text,style){
    var k=text+'|'+(style||'');if(LBC[k])return LBC[k];
    var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d'),br=style==='brass';
    g.fillStyle=br?'#3a2508':'#123a26';g.beginPath();g.arc(128,128,112,0,TAU);g.fill();g.lineWidth=16;g.strokeStyle=br?'#f2c14e':'#7fe8b4';g.stroke();
    g.fillStyle='#ffffff';g.font='800 '+(text.length>1?104:150)+'px system-ui,Segoe UI,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,138);
    var tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    LBC[k]=new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true});LBC[k].userData.keep=1;return LBC[k];
  }
  function label(text,style){var s=new THREE.Sprite(labelMat(text,style));s.renderOrder=20;return s;}
  /* a fingertip, optionally with a finger number floating above it */
  function fingertip(par,size,withNum){var g=grp(par);add(g,sphGeo(size),T(C.skin),[0,0,0],null,[1.3,.62,1]);if(withNum){var lb=label('1');lb.scale.set(size*2.4,size*2.4,1);lb.position.set(0,size*2.1,0);g.add(lb);g.userData.lb=lb;}g.visible=false;return g;}
  function tipNum(tip,num){var lb=tip.userData.lb;if(!lb)return;lb.visible=!!num;if(num&&tip.userData.n!==num){tip.userData.n=num;lb.material=labelMat(String(num));}}
  /* cartoon effects: sound rings from a bell, air puffs, floating notes */
  function effects(par){
    var pool=[];
    return{
      ring:function(pos,dir,size,col){var m=new THREE.Mesh(torGeo(size,size*.07,40),new THREE.MeshBasicMaterial({color:col||0xfff1c8,transparent:true,opacity:.8,depthWrite:false}));m.userData.noOL=1;m.position.copy(pos);m.lookAt(pos.clone().add(dir));par.add(m);pool.push({m:m,t:0,life:.75,dir:dir.clone().multiplyScalar(size*3),k:0});},
      puff:function(pos,dir,size){var s=new THREE.Sprite(new THREE.SpriteMaterial({map:SOFT,color:0xffffff,transparent:true,opacity:.7,depthWrite:false}));s.position.copy(pos);s.scale.setScalar(size);par.add(s);pool.push({m:s,t:0,life:.6,dir:dir.clone(),k:1,s:size});},
      note:function(pos,size){var s=label('♪','brass');s.position.copy(pos);s.scale.setScalar(size);par.add(s);pool.push({m:s,t:0,life:1.2,dir:V3((Math.random()-.5)*size,size*1.4,0),k:2,s:size});},
      update:function(dt){for(var i=pool.length-1;i>=0;i--){var p=pool[i];p.t+=dt;var u=p.t/p.life;if(u>=1){par.remove(p.m);if(p.k!==2)p.m.material.dispose();pool.splice(i,1);continue;}
        p.m.position.addScaledVector(p.dir,dt);if(p.k===0){p.m.scale.setScalar(1+u*1.6);p.m.material.opacity=.8*(1-u);}else if(p.k===1){p.m.scale.setScalar(p.s*(1+u*2.2));p.m.material.opacity=.6*(1-u);}else{p.m.material.opacity=Math.min(1,(1-u)*1.6);}}
        return pool.length>0;}
    };
  }
  function spring(o,key,target,rate,dt){var d=target-o[key];if(Math.abs(d)<1e-5){if(o[key]!==target){o[key]=target;return true;}return false;}o[key]+=d*Math.min(1,dt*rate);return true;}
  /* every instrument shares this little framework */
  function base(V,name){
    var I={group:new THREE.Group(),name:name,cap:'',held:{},fx:null,tick:[],
      press:function(m,id,v){},release:function(id){},
      update:function(dt){var busy=false;for(var i=0;i<I.tick.length;i++)if(I.tick[i](dt))busy=true;if(I.fx&&I.fx.update(dt))busy=true;return busy;},
      caption:function(){return I.cap;}};
    I.fx=effects(I.group);return I;
  }
  /* ---------- fingering helpers ---------- */
  var VCOMB=['','2','1','12','23','13','123'];
  function valves(w,partials,avoid){for(var d=0;d<=6;d++){if(partials.indexOf(w+d)>=0&&(!avoid||avoid.indexOf(w+d)<0))return VCOMB[d];}return null;}
  /* =============== KEYBOARDS =============== */
  var KBS={
    grand:{lo:21,hi:108,cs:0x26262d,logo:'JAM ROOM',fall:1},
    upright:{lo:21,hi:108,cs:0x6e3418,logo:'JAM ROOM',front:1},
    rhodes:{lo:28,hi:100,cs:0x2c2c33,lid:0x3c3c45,rail:0xe7ecef,logo:'ELECTRIC PIANO',railText:'#2c2c33'},
    wurli:{lo:33,hi:96,cs:0xefe1bd,lid:0xefe1bd,rail:0xc8452e,logo:'ELECTRIC PIANO',railText:'#fff3d6'},
    clav:{lo:29,hi:88,cs:0xb2703a,lid:0x8a4f26,rail:0x2c2c33,logo:'CLAVI',railText:'#f2c14e'},
    fm:{lo:36,hi:96,cs:0x3c3833,panel:'fm'},
    harpsi:{lo:29,hi:89,cs:0x8e2f22,rev:1,lid:0x8e2f22,rail:C.gold,logo:'',front:0},
    celesta:{lo:48,hi:96,cs:0x9a5a2c,front:1,logo:'CELESTA'},
    synth:{lo:36,hi:84,cs:0x2a2a31,panel:'synth'},
    pad:{lo:36,hi:84,cs:0x2f3a46,panel:'synth',accent:0x7fd0ff},
    tron:{lo:43,hi:77,cs:0xece2c9,panel:'tron'},
    drawbar:{lo:36,hi:96,cs:0x7a3c1c,panel:'drawbar',two:1},
    harmonium:{lo:41,hi:89,cs:0x8a4a24,panel:'stops'},
    pipes:{lo:36,hi:96,cs:0x6a3418,panel:'pipes'}
  };
  function keyset(par,lo,hi,rev,y,z){
    var W=[0,2,4,5,7,9,11],ww=.0235,wl=.15,wh=.022,keys={},whites=[],k;
    for(k=lo;k<=hi;k++)if(W.indexOf(k%12)>=0)whites.push(k);
    var x0=-whites.length*ww/2,natG=rboxGeo(ww-.0016,wh,wl,.003),shG=rboxGeo(.0128,.017,.094,.0025),natC=rev?0x2e2620:C.ivory,shC=rev?C.ivory:C.ebKey;
    var g=grp(par,[0,y||0,z||0]);
    whites.forEach(function(kk,i){var p=grp(g,[x0+i*ww+ww/2,0,-wl/2]);var m=add(p,natG,T(natC),[0,-wh/2,wl/2]);keys[kk]={p:p,m:m,a:0,t:0,dark:!!rev};});
    for(k=lo;k<=hi;k++){if(W.indexOf(k%12)>=0)continue;var L=keys[k-1];if(!L)continue;var p2=grp(g,[L.p.position.x+ww/2,.0075,-wl/2]);var m2=add(p2,shG,T(shC),[0,0,.047]);keys[k]={p:p2,m:m2,a:0,t:0,dark:!rev,blk:1};}
    return{keys:keys,width:whites.length*ww,depth:wl,g:g};
  }
  function textPlane(par,text,w,h,col,font,p,r){
    var c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);var g=c.getContext('2d');g.fillStyle=col;g.font=font||('600 '+Math.round(c.height*.62)+'px Georgia,serif');g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,c.height/2+2);
    var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;var m=add(par,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}),p,r,null,1);return m;
  }
  /* one note: its name and octave; three or more held: the chord name */
  function capOf(held,m){var ms=[];for(var k in held)if(held[k].m!=null)ms.push(held[k].m);return ms.length>=3&&H.nameChord?(H.nameChord(ms)||nm(m)+(Math.floor(m/12)-1)):nm(m)+(Math.floor(m/12)-1);}
  function keyboard(V,st){
    var o=KBS[st]||KBS.grand,I=base(V,st),g=I.group,ks=keyset(g,o.lo,o.hi,o.rev,0,0),W2=ks.width,wl=ks.depth,cs=T(o.cs),upper=null,extra={leds:[],pipes:{}};
    if(o.two){upper=keyset(g,o.lo,o.hi,0,.05,-.17);}
    add(g,rboxGeo(W2+.02,.032,.026,.004),cs,[0,-.02,wl/2+.011]);
    add(g,rboxGeo(W2+.03,.014,wl+.05+(o.two?.17:0),.004),cs,[0,-.032,o.two?-.08:0]);
    [-1,1].forEach(function(s){add(g,rboxGeo(.05,.07,wl+.06+(o.two?.17:0),.008),cs,[s*(W2/2+.032),0,o.two?-.08:0]);});
    var back=-wl/2-.02;
    if(o.fall){var f=add(g,rboxGeo(W2+.08,.08,.022,.006),cs,[0,.04,back-.012],[-.2,0,0]);textPlane(g,o.logo,.24,.035,'#e9c46a',null,[0,.045,back+.001],[-.2,0,0]);
      var lid=add(g,rboxGeo(W2+.08,.016,.5,.006),cs,[0,.072,back-.26]);}
    if(o.front){add(g,rboxGeo(W2+.1,.36,.05,.01),cs,[0,.16,back-.03]);add(g,rboxGeo(W2*.5,.05,.03,.006),T(0x3a1a0c),[0,.12,back]);if(o.logo)textPlane(g,o.logo,.22,.03,'#ebc66a',null,[0,.19,back-.004]);}
    if(o.lid){add(g,rboxGeo(W2+.08,.05,.24,.012),T(o.lid),[0,.012,back-.12]);add(g,rboxGeo(W2+.06,.03,.016,.004),T(o.rail,o.rail===0xe7ecef),[0,.03,back+.002]);if(o.logo)textPlane(g,o.logo,.3,.024,o.railText,'700 64px system-ui,sans-serif',[0,.03,back+.0112]);
      if(st==='harpsi'){add(g,rboxGeo(W2+.08,.012,.9,.006),T(o.lid),[0,.04,back-.48],[.0,0,0]);add(g,rboxGeo(W2*.9,.004,.6,.004),T(0xe8d6a8),[0,.0475,back-.42]);}}
    if(o.panel==='fm'||o.panel==='synth'||o.panel==='tron'){
      var ph=o.panel==='tron'?.08:.06,pan=add(g,rboxGeo(W2+.08,ph,.17,.008),cs,[0,ph/2-.01,back-.085]);
      if(o.panel==='fm'){add(g,rboxGeo(.16,.006,.05,.004),T(0x9fd8a8),[-.15,ph-.008,back-.07],null,null,1);for(var b=0;b<14;b++)add(g,rboxGeo(.022,.008,.018,.003),T(b%3?0xd8d0c0:0xc8452e),[-.02+b*.026,ph-.006,back-.07]);}
      else if(o.panel==='synth'){
        for(var kn=0;kn<10;kn++){var kx=-W2/2+.06+kn*.045,kb=add(g,cylGeo(.011,.012,.016,24),T(0x1c1c22),[kx,ph+.0,back-.11]);add(kb,rboxGeo(.003,.003,.01,.001),T(0xffffff),[0,.009,-.004],null,null,1);}
        for(var sl=0;sl<6;sl++){var sx=.05+sl*.032;add(g,rboxGeo(.006,.004,.08,.002),T(0x101014),[sx,ph-.008,back-.085],null,null,1);add(g,rboxGeo(.016,.012,.01,.003),T(sl%2?(o.accent||0xff7a3c):0xe8e8e8),[sx,ph,back-.085+((sl*37)%5-2)*.012]);}
        for(var li=0;li<12;li++)extra.leds.push(add(g,rboxGeo(.012,.004,.006,.002),T(0x3a2a1a),[W2/2-.2+li*.015,ph-.006,back-.03],null,null,1));}
      else{add(g,rboxGeo(.2,.004,.05,.006),T(0x3a2a1a),[-.12,ph-.006,back-.08],null,null,1);textPlane(g,'TAPE STRINGS · FLUTES · CHOIR',.19,.016,'#f3e3c0','700 52px system-ui,sans-serif',[-.12,ph-.0035,back-.08],[-Math.PI/2,0,0]);for(var tk=0;tk<3;tk++)add(g,cylGeo(.013,.014,.02),T(0x2c2c33),[.1+tk*.06,ph+.004,back-.08]);}
    }
    if(o.panel==='drawbar'){
      add(g,rboxGeo(W2+.12,.2,.04,.01),cs,[0,.12,back-.24]);
      var cols=[0x6b2e14,0x6b2e14,0xf3ede0,0xf3ede0,0x1e1e22,0xf3ede0,0x1e1e22,0x1e1e22,0xf3ede0];
      [-1,1].forEach(function(side){cols.forEach(function(c,i){var x=side*.2+(i-4)*.022,bar=grp(g,[x,.11,back-.205]);add(bar,rboxGeo(.012,.06,.012,.004),T(c),[0,-.02,0]);extra.leds.push(bar);});});
    }
    if(o.panel==='stops'){add(g,rboxGeo(W2+.1,.12,.04,.01),cs,[0,.07,back-.03]);for(var so=0;so<10;so++){var sk=add(g,cylGeo(.009,.009,.03),T(0xf3ede0),[-W2/2+.08+so*(W2-.16)/9,.09,back-.002],[Math.PI/2,0,0]);extra.leds.push(sk);}}
    if(o.panel==='pipes'){
      var n=o.hi-o.lo+1,pw=(W2+.08)/n;add(g,rboxGeo(W2+.14,.03,.06,.008),cs,[0,.03,back-.07]);add(g,rboxGeo(W2+.16,.04,.08,.01),cs,[0,.52,back-.07]);
      for(var pm=o.lo;pm<=o.hi;pm++){var i2=pm-o.lo,mid=Math.abs(i2-n/2)/(n/2),h2=.16+.3*(1-mid)+.04*Math.sin(i2*.9),px=-W2/2-.04+(i2+.5)*pw,pg=grp(g,[px,.045,back-.07]);
        var pipe=add(pg,cylGeo(pw*.42,pw*.42,h2,16),T(0xd9dee2,1),[0,h2/2+.03,0]);add(pg,cylGeo(pw*.08,pw*.42,.03,16),T(0xd9dee2,1),[0,.015,0]);add(pg,rboxGeo(pw*.5,.012,.004,.001),T(0x2a2a30),[0,.05,pw*.4],null,null,1);
        extra.pipes[pm]={g:pg,m:pipe,s:1,t:0};}
    }
    shadow(g,W2+.4,(o.two?.6:.4),-.04,0,o.two?-.08:-.05);
    outline(g);
    var allKeys=[ks.keys];if(upper)allKeys.push(upper.keys);
    function pick(m){var set=upper&&m>=60?upper.keys:ks.keys,lo=o.lo,hi=o.hi;m=fold(m,lo,hi);return set[m];}
    var ledT=0,ledLvl=0;
    I.press=function(m,id,v){var K=pick(m);if(!K)return;K.t++;lit(K.m,true,K.dark?C.greenD:C.green);I.held[id]={K:K,m:m};I.cap=capOf(I.held,m);ledLvl=Math.min(12,ledLvl+4);
      var P=extra.pipes[fold(m,o.lo,o.hi)];if(P){P.t++;lit(P.m,true,0xf2d27a);I.fx.puff(V3(P.g.position.x,P.g.position.y+.3,P.g.position.z+.02),V3(0,.06,.02),.03);}
      V.wake();};
    I.release=function(id){var h=I.held[id];if(!h)return;delete I.held[id];h.K.t=Math.max(0,h.K.t-1);if(!h.K.t)lit(h.K.m,false);var P=extra.pipes[fold(h.m,o.lo,o.hi)];if(P){P.t=Math.max(0,P.t-1);if(!P.t)lit(P.m,false);}V.wake();};
    I.tick.push(function(dt){var busy=false;allKeys.forEach(function(set){for(var k in set){var K=set[k];if(spring(K,'a',K.t?(K.blk?.06:.07):0,K.t?45:24,dt)){K.p.rotation.x=K.a;busy=true;}}});
      for(var pk in extra.pipes){var P=extra.pipes[pk];if(spring(P,'s',P.t?1.035:1,18,dt)){P.g.scale.set(1,P.s,1);busy=true;}}
      if(extra.leds.length){var tgt=Object.keys(I.held).length?Math.max(2,ledLvl):0;ledLvl+=(tgt-ledLvl)*Math.min(1,dt*6);
        if(o.panel==='synth'){extra.leds.forEach(function(l,i){var on=i<ledLvl;if(l.userData.on!==on){l.userData.on=on;lit(l,on,i>8?0xff6b4a:i>5?0xffd166:C.green);}});}
        else{extra.leds.forEach(function(l,i){var pull=Object.keys(I.held).length?.012*Math.sin(i*1.7)+.008:0;if(spring(l.position,'y',(o.panel==='stops'?.09:.11)+pull,10,dt))busy=true;});}
        if(Math.abs(ledLvl-tgt)>.05)busy=true;}
      return busy;});
    var tall=o.two||o.front||o.panel==='pipes',pan=o.panel&&!tall;V.cam(tall?[0,.55,1]:[0,.95,.8],[0,o.panel==='pipes'?.25:tall?.1:pan?.03:.025,o.two?-.1:tall?-.08:pan?-.07:-.02],W2+.12,o.panel==='pipes'?.72:tall?.4:pan?.34:.26);
    return I;
  }
  /* ---------- accordion: bass buttons, breathing bellows, piano keys ---------- */
  function accordion(V){
    var I=base(V,'accordion'),g=I.group,red=T(0xc8352a),blk=T(0x2a2a30),bel=grp(g,[0,0,0]);
    add(g,rboxGeo(.16,.13,.24,.02),red,[-.24,.05,0]);for(var r=0;r<6;r++)for(var c=0;c<4;c++)add(g,cylGeo(.007,.007,.008,16),T(r===2&&c===1?0xd9a066:0xf3ede0),[-.29+c*.03,.118,-.08+r*.032]);
    var pleats=[];for(var p=0;p<11;p++){var m=add(bel,rboxGeo(.018,.118,.226,.004),p%2?blk:T(0x4a4a55),[-.15+p*.03,.05,0]);pleats.push(m);}
    var right=grp(g,[0,0,0]);add(right,rboxGeo(.2,.13,.24,.02),red,[.24,.05,0]);
    var ks=keyset(right,60,84,0,.118,-.0);ks.g.scale.set(.75,1,.6);ks.g.position.x=.24;
    shadow(g,.8,.4,-.02);outline(g);
    var breath={s:1,dir:1};
    I.press=function(m,id){var K=ks.keys[fold(m,60,84)];if(K){K.t++;lit(K.m,true,K.dark?C.greenD:C.green);}I.held[id]={K:K,m:m};I.cap=capOf(I.held,m);V.wake();};
    I.release=function(id){var h=I.held[id];if(!h)return;delete I.held[id];if(h.K){h.K.t=Math.max(0,h.K.t-1);if(!h.K.t)lit(h.K.m,false);}V.wake();};
    var ph=0;
    I.tick.push(function(dt){var busy=false,on=Object.keys(I.held).length>0;if(on){ph+=dt*2.2;busy=true;}
      var target=on?1+.18*Math.sin(ph):1;if(spring(breath,'s',target,on?30:6,dt))busy=true;bel.scale.x=breath.s;bel.position.x=(breath.s-1)*-.15;right.position.x=(breath.s-1)*.17;
      for(var k in ks.keys){var K=ks.keys[k];if(spring(K,'a',K.t?.07:0,40,dt)){K.p.rotation.x=K.a;busy=true;}}return busy;});
    V.cam([0,.7,1],[0,.06,0],.82,.32);
    return I;
  }
  /* =============== GUITARS AND OTHER FRETTED / PLUCKED NECKS =============== */
  function svgShape(cmds,ox,oy,kx,ky){
    var s=new THREE.Shape();function X(x){return(x-ox)*kx;}function Y(y){return(oy-y)*ky;}
    cmds.forEach(function(c){var t=c[0];if(t==='M')s.moveTo(X(c[1]),Y(c[2]));else if(t==='L')s.lineTo(X(c[1]),Y(c[2]));else if(t==='Q')s.quadraticCurveTo(X(c[1]),Y(c[2]),X(c[3]),Y(c[4]));else if(t==='C')s.bezierCurveTo(X(c[1]),Y(c[2]),X(c[3]),Y(c[4]),X(c[5]),Y(c[6]));});
    s.closePath();return s;
  }
  var DREAD=[['M',300,37],['C',300,18,330,14,352,16],['C',375,18,385,30,400,30],['C',420,30,430,4,470,4],['C',505,4,520,40,520,75],['C',520,110,505,146,470,146],['C',430,146,420,120,400,120],['C',385,120,375,132,352,134],['C',330,136,300,132,300,113]];
  var STRAT=[['M',318,58],['C',300,50,288,30,300,18],['C',312,6,340,10,352,22],['C',362,32,372,30,392,22],['C',430,6,500,2,528,30],['C',548,50,546,100,528,120],['C',500,148,430,146,392,132],['C',372,124,362,124,352,128],['C',338,134,316,132,312,118],['C',310,108,318,96,318,92]];
  var SINGLE=[['M',318,58],['C',312,40,330,20,352,22],['C',370,24,372,40,392,34],['C',430,14,520,14,540,60],['C',552,90,540,130,500,142],['C',460,152,400,146,370,130],['C',350,122,330,118,318,92]];
  var GUARD=[['M',322,56],['C',330,40,360,34,392,36],['C',430,38,470,40,486,56],['C',494,66,478,74,462,76],['L',452,92],['C',470,100,478,116,456,124],['C',430,132,380,128,350,116],['C',330,108,322,98,322,92]];
  var GK={
    steel:{n:'Acoustic guitar',tune:[40,45,50,55,59,64],scale:.645,joint:14,frets:20,body:'dread',kx:.52/220,ky:.4/142,th:.1,top:0xf2c98a,edge:0x8f4a20,side:0x7c3a1c,neck:0x7c3a1c,board:0x45291c,head:'3x3',plate:0x241812,hole:.05,guard:'tort',bridge:'acoustic',str:'bbbbss',pick:1,dots:0xf3eee6},
    nylon:{n:'Classical guitar',tune:[40,45,50,55,59,64],scale:.65,joint:12,frets:19,body:'dread',kx:.48/220,ky:.37/142,th:.095,top:0xf5d6a0,edge:0xc08850,side:0x8a4a24,neck:0x9a5a2c,board:0x2e2724,head:'slot',plate:0x9a5a2c,hole:.043,bridge:'tie',str:'sssnnn',wide:1.16,finger:1},
    jazzgtr:{n:'Jazz guitar',tune:[40,45,50,55,59,64],scale:.63,joint:14,frets:20,body:'dread',kx:.53/220,ky:.42/142,th:.075,top:0xf0a24a,ring:0xc0632a,edge:0x5a2010,side:0x5a2010,neck:0x7c3a1c,board:0x2e2724,head:'3x3',plate:0x1e1612,fholes:1,guard:'float',bridge:'trapeze',pickups:[['hb',.92,0x1e1e22]],knobs:2,str:'ssssss',pick:1,dots:0xf3eee6},
    eguitar:{n:'Electric guitar',tune:[40,45,50,55,59,64],scale:.648,joint:16,frets:21,body:'strat',kx:.45/230,ky:.33/146,th:.045,top:0xf3b04e,ring:0xc4602a,edge:0x2a1008,side:0x2a1008,neck:C.maple,board:C.maple,head:'six',plate:C.maple,guard:'white',bridge:'trem',pickups:[['sc',.84,0xf6efe0],['sc',.905,0xf6efe0],['sc',.965,0xf6efe0]],knobs:3,str:'ssssss',pick:1,dots:0x22201e},
    oguitar:{n:'Overdriven guitar',tune:[40,45,50,55,59,64],scale:.628,joint:16,frets:22,body:'single',kx:.44/230,ky:.33/146,th:.05,top:0xd2321f,ring:0x9a1c12,edge:0x3c0a06,side:0x3c0a06,neck:0x7c3a1c,board:0x45291c,head:'3x3',plate:0x161416,binding:1,bridge:'tom',pickups:[['hb',.82,0xf3e8cd],['hb',.94,0xf3e8cd]],knobs:4,knobC:0xebbd4c,str:'ssssss',pick:1,dots:0xf3e8cd},
    ebass:{n:'Electric bass',tune:[28,33,38,43],scale:.864,joint:15,frets:20,body:'strat',kx:.5/230,ky:.36/146,th:.045,top:0xf3b04e,ring:0xc4602a,edge:0x2a1008,side:0x2a1008,neck:C.maple,board:0x45291c,head:'four',plate:C.maple,guard:'tortbass',bridge:'bass',pickups:[['split',.84,0x1e1e22]],knobs:2,str:'ssss',finger:1,dots:0xf3eee6},
    slapbass:{n:'Slap bass',tune:[28,33,38,43],scale:.864,joint:15,frets:20,body:'strat',kx:.5/230,ky:.36/146,th:.045,top:0x3f88c8,edge:0x1d3c5c,side:0x1d3c5c,neck:C.maple,board:C.maple,head:'four',plate:C.maple,guard:'black',bridge:'bass',pickups:[['sc',.86,0x1e1e22],['sc',.95,0x1e1e22]],knobs:3,str:'ssss',finger:1,dots:0x22201e,thumb:1},
    banjo:{n:'Banjo',tune:[50,55,59,62],scale:.66,joint:19,frets:22,body:'banjo',th:.07,neck:0x8a4a24,board:0x2e2724,head:'banjo',plate:0x5a2a14,str:'ssss',finger:1,dots:0xf3eee6,five:1},
    sitar:{n:'Sitar',tune:[48,53,55,60],scale:.9,joint:18,frets:18,body:'sitar',th:.06,neck:0xa8571f,board:0xa8571f,head:'sitar',plate:0xa8571f,str:'bsss',pick:1,curved:1,dots:0},
    shamisen:{n:'Shamisen',tune:[48,55,60],scale:.8,joint:20,frets:0,body:'shamisen',th:.08,neck:0x3a2216,board:0x3a2216,head:'shamisen',plate:0x3a2216,str:'nnn',bachi:1,dots:0}
  };
  function guitar(V,kind){
    var o=GK[kind]||GK.steel,I=base(V,o.n),g=I.group,ns=o.tune.length,scale=o.scale;
    var nutX=-scale*(1-Math.pow(2,-o.joint/12))+.01,saddleX=nutX+scale,top=o.th;
    function fx(f){return nutX+scale*(1-Math.pow(2,-f/12));}
    /* ---- body ---- */
    var bodyLen=.5;
    if(o.body==='dread'||o.body==='strat'||o.body==='single'){
      var path=o.body==='dread'?DREAD:o.body==='strat'?STRAT:SINGLE,ox=o.body==='dread'?300:318,sh=svgShape(path,ox,75,o.kx,o.ky);
      add(g,extGeo(sh,top,.004),T(o.edge),[0,0,0]);
      var sideRing=add(g,extGeo(sh,top*.7,0),T(o.side),[0,0,0],null,[1.006,1,1.006],1);
      if(o.ring){var r1=add(g,extGeo(sh,.001,0),T(o.ring),[0,top+.004,0],null,null,1);r1.scale.set(.93,1,.9);r1.position.x=.02;var r2=add(g,extGeo(sh,.0012,0),T(o.top),[0,top+.0048,0],null,null,1);r2.scale.set(.82,1,.74);r2.position.x=.05;}
      else{var tp=add(g,extGeo(sh,.001,0),T(o.top),[0,top+.004,0],null,null,1);tp.scale.set(.975,1,.965);tp.position.x=.006;}
      if(o.binding){var bd=add(g,extGeo(sh,.0008,0),T(C.cream),[0,top+.0036,0],null,null,1);bd.scale.set(1.0,1,1.0);}
      bodyLen=o.kx*(o.body==='dread'?220:230);
    }else if(o.body==='banjo'){
      add(g,cylGeo(.15,.15,top*.6,48),T(0x8a4a24),[.15,top*.3,0]);add(g,cylGeo(.142,.142,top,48),T(C.silver,1),[.15,top/2,0]);add(g,cylGeo(.135,.135,.004,48),T(0xf7f2e4),[.15,top+.001,0]);
      for(var h=0;h<24;h++){var a=h/24*TAU;add(g,cylGeo(.004,.004,.02,8),T(C.chrome,1),[.15+Math.cos(a)*.148,top-.006,Math.sin(a)*.148]);}
      bodyLen=.3;
    }else if(o.body==='sitar'){
      add(g,sphGeo(.19,32,22),T(0xa8571f),[.12,-.05,0],null,[1.1,.6,1.05]);add(g,cylGeo(.15,.15,.006,40),T(0xf0c070),[.12,top+.012,0]);add(g,torGeo(.15,.006,48),T(0xf5e3b8),[.12,top+.014,0],[Math.PI/2,0,0]);
      add(g,sphGeo(.08,24,16),T(0xa8571f),[nutX-.06,-.04,0],null,[1,.7,1]);bodyLen=.33;
    }else if(o.body==='shamisen'){
      add(g,rboxGeo(.2,top,.18,.02),T(0x3a2216),[.1,top/2,0]);add(g,rboxGeo(.19,.004,.17,.004),T(0xf7f1e2),[.1,top+.001,0]);bodyLen=.21;
    }
    /* ---- sound hole, guards, f-holes ---- */
    if(o.hole){var hx=nutX+scale*(1-Math.pow(2,-19.5/12))+o.hole*.4;add(g,cylGeo(o.hole,o.hole,.002,48),T(0x140c08),[hx,top+.0052,0],null,null,1);add(g,torGeo(o.hole*1.14,o.hole*.09,64),T(o.body==='dread'&&kind==='nylon'?0x6aa86a:0x3a2416),[hx,top+.0055,0],[Math.PI/2,0,0],null,1);add(g,torGeo(o.hole*1.28,o.hole*.035,64),T(0xf3e3c0),[hx,top+.0055,0],[Math.PI/2,0,0],null,1);}
    if(o.guard==='tort'){var gs=new THREE.Shape();gs.moveTo(.075,-.058);gs.bezierCurveTo(.115,-.052,.17,-.065,.178,-.098);gs.bezierCurveTo(.182,-.128,.135,-.135,.105,-.126);gs.bezierCurveTo(.08,-.118,.068,-.088,.075,-.058);add(g,extGeo(gs,.0015,0),T(C.tort),[0,top+.005,0],null,null,1);}
    if(o.guard==='white'||o.guard==='black'||o.guard==='tortbass'){var gc=o.guard==='white'?0xfbf8f0:o.guard==='black'?0x23232a:C.tort,gsh=svgShape(GUARD,318,75,o.kx,o.ky);add(g,extGeo(gsh,.0016,0),T(gc),[0,top+.0049,0],null,null,1);}
    if(o.guard==='float'){add(g,rboxGeo(.16,.003,.05,.012),T(0x1e1612),[saddleX-.12,top+.02,.07],[0,.25,0]);}
    if(o.fholes){[-1,1].forEach(function(s){var fh=grp(g,[saddleX-.04,top+.0055,s*.085],[0,s*.12,0]);add(fh,rboxGeo(.11,.002,.007,.003),T(0x140c08),[0,0,0],[0,0,0],null,1);add(fh,cylGeo(.007,.007,.002,16),T(0x140c08),[-.055,0,-.004],null,null,1);add(fh,cylGeo(.007,.007,.002,16),T(0x140c08),[.055,0,.004],null,null,1);});}
    /* ---- pickups, bridge, knobs ---- */
    (o.pickups||[]).forEach(function(p){var px=nutX+scale*p[1];
      if(p[0]==='sc'){add(g,rboxGeo(.019,.007,.072,.006),T(p[2]),[px,top+.008,0],[0,p[1]>.95?-.12:0,0]);for(var q=0;q<ns;q++)add(g,cylGeo(.0018,.0018,.002,10),T(C.chrome,1),[px,top+.0115,(q-(ns-1)/2)*.0105],null,null,1);}
      if(p[0]==='hb'){add(g,rboxGeo(.046,.004,.084,.006),T(0x1e1e22),[px,top+.004,0]);add(g,rboxGeo(.038,.009,.072,.005),T(p[2]),[px,top+.009,0]);for(var q2=0;q2<ns;q2++)add(g,cylGeo(.0019,.0019,.002,10),T(C.chrome,1),[px-.009,top+.0135,(q2-(ns-1)/2)*.0105],null,null,1);}
      if(p[0]==='split'){add(g,rboxGeo(.022,.009,.038,.006),T(p[2]),[px-.012,top+.008,-.018]);add(g,rboxGeo(.022,.009,.038,.006),T(p[2]),[px+.012,top+.008,.018]);}});
    var bH=.012;
    if(o.bridge==='acoustic'){add(g,rboxGeo(.03,.009,.16,.004),T(0x3a2416),[saddleX+.012,top+.009,0]);add(g,rboxGeo(.003,.007,.08,.0012),T(0xf4ecd8),[saddleX,top+.016,0]);for(var pn=0;pn<ns;pn++)add(g,cylGeo(.0028,.0028,.004,12),T(0xf4ecd8),[saddleX+.02,top+.015,(pn-2.5)*.0105],null,null,1);bH=.0175;}
    if(o.bridge==='tie'){add(g,rboxGeo(.03,.009,.18,.004),T(0x3a2416),[saddleX+.012,top+.009,0]);add(g,rboxGeo(.003,.007,.08,.0012),T(0xf4ecd8),[saddleX,top+.016,0]);bH=.0175;}
    if(o.bridge==='trem'){add(g,rboxGeo(.04,.004,.075,.003),T(C.chrome,1),[saddleX+.01,top+.006,0]);bH=.012;}
    if(o.bridge==='tom'){add(g,rboxGeo(.01,.01,.08,.003),T(C.chrome,1),[saddleX,top+.008,0]);add(g,rboxGeo(.01,.009,.085,.004),T(C.chrome,1),[saddleX+.04,top+.007,0]);bH=.013;}
    if(o.bridge==='bass'){add(g,rboxGeo(.05,.006,.08,.004),T(C.chrome,1),[saddleX+.015,top+.006,0]);bH=.013;}
    if(o.bridge==='trapeze'){add(g,rboxGeo(.012,.012,.07,.003),T(0x2e2724),[saddleX,top+.008,0]);var tz=new THREE.Shape();tz.moveTo(0,-.02);tz.lineTo(.11,-.04);tz.lineTo(.12,0);tz.lineTo(.11,.04);tz.lineTo(0,.02);add(g,extGeo(tz,.004,.001),T(C.gold,1),[saddleX+.03,top+.008,0]);bH=.02;}
    if(o.body==='banjo'){add(g,rboxGeo(.006,.012,.06,.002),T(C.maple),[saddleX,top+.008,0]);add(g,rboxGeo(.06,.004,.03,.004),T(C.chrome,1),[saddleX+.07,top+.006,0]);bH=.016;}
    if(o.body==='sitar'){add(g,rboxGeo(.03,.012,.05,.004),T(0xf3ede0),[saddleX,top+.016,0]);bH=.024;}
    if(o.body==='shamisen'){add(g,rboxGeo(.006,.012,.035,.002),T(0xf3ede0),[saddleX,top+.008,0]);bH=.014;}
    for(var kb=0;kb<(o.knobs||0);kb++)add(g,cylGeo(.009,.01,.012,24),T(o.knobC||0xf6efe0),[saddleX+.02+kb*.03,top+.007,.075+kb*.012]);
    /* ---- neck, fretboard, frets, dots ---- */
    var w0=(ns>4?.046:.042)*(o.wide||1),w1=(ns>4?.056:.06)*(o.wide||1),boardEnd=o.frets?fx(o.frets)+.008:saddleX-.08;
    if(o.body==='sitar'){w0=.07;w1=.08;}
    function wAt(x){return w0+(w1-w0)*clamp((x-nutX)/(boardEnd-nutX),0,1);}
    var neckTop=top+(o.body==='dread'||o.body==='banjo'?.0:.004),neckEnd=o.body==='banjo'?.02:.04;
    add(g,rboxGeo(neckEnd-nutX,.026,(w0+w1)/2,.008),T(o.neck),[(nutX+neckEnd)/2,neckTop-.013,0]);
    var fbTop=neckTop+.007,fbLen=boardEnd-nutX;
    var fbs=new THREE.Shape();fbs.moveTo(nutX,-w0/2);fbs.lineTo(boardEnd,-wAt(boardEnd)/2);fbs.lineTo(boardEnd,wAt(boardEnd)/2);fbs.lineTo(nutX,w0/2);fbs.closePath();
    add(g,extGeo(fbs,.006,0),T(o.board),[0,neckTop+.001,0]);
    for(var f=1;f<=o.frets;f++){var x=fx(f);add(g,o.curved?cylGeo(.0016,.0016,wAt(x)*.95,10):cylGeo(.0012,.0012,wAt(x),8),T(C.chrome,1),[x,fbTop+(o.curved?.004:0),0],[Math.PI/2,0,0],null,1);}
    if(o.dots){[3,5,7,9,15,17,19,21].forEach(function(f2){if(f2>o.frets)return;var x2=(fx(f2)+fx(f2-1))/2;add(g,cylGeo(.0032,.0032,.001,20),T(o.dots),[x2,fbTop+.0004,0],null,null,1);});
      var x12=(fx(12)+fx(11))/2;[-1,1].forEach(function(s){add(g,cylGeo(.0032,.0032,.001,20),T(o.dots),[x12,fbTop+.0004,s*.011],null,null,1);});}
    add(g,rboxGeo(.005,.007,w0+.002,.0015),T(o.str==='nnn'?0x2a2a30:0xf4ecd8),[nutX-.002,fbTop+.002,0]);
    /* ---- headstock and tuners ---- */
    var hd=grp(g,[nutX,neckTop-.008,0]),posts=[],hp=T(o.plate),chrome=T(C.chrome,1);
    function btn(x,z,side,size){add(hd,cylGeo(.0028,.0028,.018,10),chrome,[x,.012,z],null,null,1);var b=add(hd,sphGeo(size||.009),T(o.str==='sssnnn'?0xf6efe0:C.chrome,o.str!=='sssnnn'),[x,.006,z+side*.035],null,[.7,.5,1.4]);add(hd,cylGeo(.002,.002,.03,8),chrome,[x,.006,z+side*.02],[Math.PI/2,0,0],null,1);posts.push([nutX+x,z]);}
    if(o.head==='3x3'||o.head==='slot'){var hs=new THREE.Shape();var L=-.19,hw=o.head==='slot'?.032:.044;hs.moveTo(-.004,-w0/2);hs.lineTo(L+.03,-hw);hs.quadraticCurveTo(L,-hw,L,0);hs.quadraticCurveTo(L,hw,L+.03,hw);hs.lineTo(-.004,w0/2);hs.closePath();
      add(hd,extGeo(hs,.016,.002),hp,[0,0,0]);
      if(o.head==='slot'){[-1,1].forEach(function(s){add(hd,rboxGeo(.14,.004,.012,.004),T(0x140c08),[-.1,.017,s*.014],null,null,1);});for(var i=0;i<6;i++){var s2=i<3?-1:1,j=i<3?i:5-i,x3=-.045-j*.04;add(hd,cylGeo(.004,.004,.06,10),T(0xf6efe0),[x3,.015,0],[Math.PI/2,0,0]);posts.push([nutX+x3,s2*.014]);add(hd,sphGeo(.008),T(0xf6efe0),[x3,.008,s2*.045],null,[.6,.5,1.3]);}}
      else for(var i2=0;i2<ns;i2++){var s3=i2<ns/2?-1:1,j2=i2<ns/2?i2:ns-1-i2;btn(-.045-j2*.042,s3*.026,s3);}}
    if(o.head==='six'||o.head==='four'){var hs2=new THREE.Shape(),L2=o.head==='six'?-.19:-.22;hs2.moveTo(-.004,-w0/2);hs2.lineTo(L2*.4,-w0/2-.012);hs2.quadraticCurveTo(L2,-.05,L2,-.025);hs2.quadraticCurveTo(L2,.0,L2*.9,.012);hs2.lineTo(-.004,w0/2);hs2.closePath();
      add(hd,extGeo(hs2,.016,.002),hp,[0,0,0]);for(var i3=0;i3<ns;i3++){var x4=-.035-i3*(o.head==='six'?.025:.042);btn(x4,-.02+i3*.003,-1,o.head==='four'?.012:.008);}}
    if(o.head==='banjo'){var hs3=new THREE.Shape();hs3.moveTo(-.004,-w0/2);hs3.lineTo(-.15,-.04);hs3.quadraticCurveTo(-.19,0,-.15,.04);hs3.lineTo(-.004,w0/2);hs3.closePath();add(hd,extGeo(hs3,.016,.002),hp,[0,0,0]);for(var i4=0;i4<4;i4++){var s4=i4<2?-1:1,j4=i4<2?i4:3-i4;btn(-.05-j4*.05,s4*.024,s4);}
      var fifth=fx(5);add(g,cylGeo(.003,.003,.02,10),chrome,[fifth,fbTop+.005,.03]);add(g,sphGeo(.008),T(C.chrome,1),[fifth,fbTop,.06],null,[.7,.5,1.4]);}
    if(o.head==='sitar'){add(hd,rboxGeo(.22,.03,w0,.01),hp,[-.11,.0,0]);for(var i5=0;i5<7;i5++)add(hd,cylGeo(.005,.008,.07,12),T(0x5a2a10),[-.02-i5*.03,.01,(i5%2?1:-1)*.05],[Math.PI/2,0,0]);for(var i6=0;i6<ns;i6++)posts.push([nutX-.03-i6*.04,(i6%2?1:-1)*.01]);}
    if(o.head==='shamisen'){add(hd,rboxGeo(.16,.026,.035,.008),hp,[-.08,0,0]);for(var i7=0;i7<3;i7++){add(hd,cylGeo(.007,.005,.11,12),T(0xf3ede0),[-.04-i7*.04,.01,0],[Math.PI/2,0,0]);posts.push([nutX-.04-i7*.04,0]);}add(hd,sphGeo(.022),hp,[-.17,.0,0],null,[1.3,.7,1]);}
    if(!posts.length)for(var i8=0;i8<ns;i8++)posts.push([nutX-.05,(i8-(ns-1)/2)*.008]);
    /* ---- strings: ribbons that vibrate ---- */
    var sN=(ns>4?.0072:ns===3?.009:.0105)*(o.wide||1),sS=ns>4?.0105:ns===3?.012:.018;if(o.body==='banjo')sS=.011;
    var strs=[],N=40,yN=fbTop+.0035,yS=top+bH;
    for(var si=0;si<ns;si++){
      var zN=(si-(ns-1)/2)*sN,zS=(si-(ns-1)/2)*sS,ch=o.str.charAt(si)||'s',col=ch==='b'?0xd8a65a:ch==='n'?0xf6efe0:0xe9edf0,wd=(ns===4?.0034-si*.0004:.0026-si*.00028)*(ch==='n'?1.15:1);
      var geo=new THREE.BufferGeometry(),pos=new Float32Array((N+1)*6),idx=[];for(var q3=0;q3<N;q3++){var a2=q3*2;idx.push(a2,a2+1,a2+2,a2+1,a2+3,a2+2);}
      geo.setIndex(idx);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array((N+1)*6).map(function(v,ii){return ii%3===1?1:0;}),3));
      var mesh=add(g,geo,T(col,ch!=='n'),[0,0,0],null,null,1);mesh.frustumCulled=false;
      var S={mesh:mesh,geo:geo,pos:pos,zN:zN,zS:zS,w:wd,amp:0,ph:Math.random()*6,from:0,hold:0};strs.push(S);setStr(S);
      var pp=posts[si]||posts[posts.length-1];add(g,tubeGeo([[nutX,yN,zN],[pp[0],neckTop+.008,pp[1]]],wd*.35,4),T(col,1),null,null,null,1);
    }
    function setStr(S){var x0=fx(S.from);for(var q=0;q<=N;q++){var u=q/N,x=nutX+(saddleX-nutX)*u,zc=S.zN+(S.zS-S.zN)*u,yc=yN+(yS-yN)*u,dz=0;
      if(S.amp>1e-6&&x>x0){var v=(x-x0)/(saddleX-x0);dz=S.amp*Math.sin(Math.PI*v)*Math.sin(S.ph);}
      var b=q*6;S.pos[b]=x;S.pos[b+1]=yc;S.pos[b+2]=zc-S.w/2+dz;S.pos[b+3]=x;S.pos[b+4]=yc;S.pos[b+5]=zc+S.w/2+dz;}S.geo.attributes.position.needsUpdate=true;}
    /* ---- fingertips and the plucking hand ---- */
    var tips=[];for(var ti=0;ti<4;ti++)tips.push(fingertip(g,.0085,1));
    var plk=grp(g,[saddleX-.09,yS+.012,-.06]),plkMesh;
    if(o.pick){var pk=new THREE.Shape();pk.moveTo(0,.012);pk.quadraticCurveTo(.012,.012,.011,0);pk.quadraticCurveTo(.006,-.012,0,-.016);pk.quadraticCurveTo(-.006,-.012,-.011,0);pk.quadraticCurveTo(-.012,.012,0,.012);plkMesh=add(plk,extGeo(pk,.0015,0),T(o.body==='sitar'?C.silver:0xe0782c,o.body==='sitar'),[0,0,0]);}
    else if(o.bachi){var bs=new THREE.Shape();bs.moveTo(-.01,-.008);bs.lineTo(.06,-.035);bs.lineTo(.06,.035);bs.lineTo(-.01,.008);bs.closePath();plkMesh=add(plk,extGeo(bs,.004,.001),T(0xf3e3c0),[0,0,0],[0,Math.PI/2,0]);}
    else{plkMesh=add(plk,sphGeo(.011),T(C.skin),[0,0,0],null,[1.5,.7,1.1]);}
    outline(g);shadow(g,saddleX-nutX+.5,.5,-.005,(saddleX+nutX)/2);
    var hand=1,pl={z:-.06,t:0};
    function place(list,excl){
      var best=null,bs2=1e9,n=list.length,used=[];
      Object.keys(I.held).forEach(function(k){var h=I.held[k];if(h.at&&(!excl||excl.indexOf(h)<0))used.push(h.at.s);});
      (function rec(i,cur){
        if(i===n){var fr=cur.filter(function(c){return c.f>0;}).map(function(c){return c.f;}),mn=fr.length?Math.min.apply(null,fr):hand,mx=fr.length?Math.max.apply(null,fr):hand;if(mx-mn>4)return;
          var cost=Math.abs(mn-hand)*.6+(mx-mn)*.4+cur.reduce(function(a,c){return a+(c.f===0?.2:c.f*.04);},0);if(cost<bs2){bs2=cost;best=cur.slice();}return;}
        for(var s=0;s<ns;s++){if(used.indexOf(s)>=0||cur.some(function(c){return c.s===s;}))continue;var f=list[i]-o.tune[s];if(f<0||f>Math.max(17,o.frets))continue;cur.push({s:s,f:f});rec(i+1,cur);cur.pop();}
      })(0,[]);return best;
    }
    function layout(){
      tips.forEach(function(t){t.visible=false;});
      var at=[];Object.keys(I.held).forEach(function(k){var h=I.held[k];if(h.at&&h.at.f>0)at.push(h.at);});
      var mn=at.length?Math.min.apply(null,at.map(function(a){return a.f;})):1,used={};
      at.sort(function(a,b){return a.f-b.f||b.s-a.s;}).forEach(function(a){var fn=Math.max(1,Math.min(4,a.f-mn+1));while(used[fn]&&fn<4)fn++;if(used[fn])return;used[fn]=1;var t=tips[fn-1];
        var x=fx(a.f-1)+(fx(a.f)-fx(a.f-1))*.7,u=(x-nutX)/(saddleX-nutX),S=strs[a.s];t.position.set(x,yN+(yS-yN)*u+.004,S.zN+(S.zS-S.zN)*u);t.visible=true;tipNum(t,o.frets?fn:0);});
    }
    var SN=ns===4?['E','A','D','G']:ns===3?['low','middle','high']:['low E','A','D','G','B','high E'];
    I.press=function(m,id,v){
      var lo=o.tune[0],hi=o.tune[ns-1]+Math.max(15,o.frets);m=fold(m,lo,hi);
      var t0=performance.now(),grpH=Object.keys(I.held).map(function(k){return I.held[k];}).filter(function(h){return t0-h.t0<130;});/* a strum spreads a chord over ~100 ms */
      var notes=grpH.map(function(h){return h.m;}).concat([m]),pls=notes.length>ns?null:place(notes,grpH);
      if(!pls){pls=place([m]);grpH=[];}if(!pls)return;
      var h={m:m,t0:t0,at:null};I.held[id]=h;var all=grpH.concat([h]);all.forEach(function(x,i){x.at=pls[grpH.length?i:pls.length-1];});
      all.forEach(function(x){var S=strs[x.at.s];S.from=x.at.f;S.amp=.0024*(v||.8)*(ns===4?1.4:1);S.hold++;lit(S.mesh,true,C.green);});
      var fr=all.filter(function(x){return x.at.f>0;}).map(function(x){return x.at.f;});if(fr.length){var mn=Math.min.apply(null,fr);if(mn<hand||Math.max.apply(null,fr)>hand+3)hand=mn;}
      layout();pl.t=1;
      var heldM=Object.keys(I.held).map(function(k){return I.held[k].m;});I.cap=heldM.length>=3&&H.nameChord?H.nameChord(heldM):(h.at.f===0?'Open '+SN[h.at.s]+' string':(o.frets?'Fret ':'Position ')+h.at.f+' · '+SN[h.at.s]+' string');
      V.wake();};
    I.release=function(id){var h=I.held[id];if(!h)return;delete I.held[id];if(h.at){var S=strs[h.at.s];S.hold=Math.max(0,S.hold-1);if(!S.hold){S.amp*=.3;lit(S.mesh,false);}}layout();V.wake();};
    I.tick.push(function(dt){var busy=false;
      strs.forEach(function(S){if(S.amp>2e-6){S.ph+=dt*TAU*19;S.amp*=Math.pow(S.hold?.5:.08,dt);setStr(S);busy=true;}else if(S.amp){S.amp=0;setStr(S);}});
      if(pl.t>0){pl.t=Math.max(0,pl.t-dt*5);var u=1-pl.t;plk.position.z=-.06+.12*Math.sin(u*Math.PI/2);plk.position.y=yS+.012-.006*Math.sin(u*Math.PI);busy=true;}
      else if(spring(plk.position,'z',-.06,6,dt))busy=true;
      return busy;});
    var x0=nutX-.2,x1=o.body==='banjo'?.3:o.body==='sitar'?.33:bodyLen+.01;
    V.cam([0,1,.25],[(x0+x1)/2,top*.6,0],x1-x0+.02,o.ky?o.ky*146*1.14:o.body==='sitar'?.44:.36);
    return I;
  }
  /* =============== VIOLIN FAMILY (one design, scaled) =============== */
  var BW={violin:{n:'Violin',tune:[55,62,69,76],s:1,col:0xd06a2c,edge:0x8a3412,chin:1},
          cello:{n:'Cello',tune:[36,43,50,57],s:2.05,col:0xc45e26,edge:0x7a2c0e,pin:1},
          dbass:{n:'Double bass',tune:[28,33,38,43],s:3.0,col:0xa9501e,edge:0x66240a,pin:1,slope:1}};
  function bodyShape(slope){
    /* outline of a violin body: x 0 (neck end) .. 1 (tail), y = half width, mirrored */
    var s=new THREE.Shape(),top=[[0,0],[0,slope?.06:.12,slope?.08:.06,slope?.2:.23,.17,.23],[.25,.23,.31,.2,.335,.19],[.345,.205,.36,.165,.4,.155],[.45,.15,.52,.15,.57,.16],[.6,.17,.6,.2,.62,.21],[.66,.27,.73,.29,.8,.29],[.92,.29,1,.2,1,0]];
    s.moveTo(0,0);for(var i=1;i<top.length;i++){var c=top[i];if(c.length===6)s.bezierCurveTo(c[0],c[1],c[2],c[3],c[4],c[5]);}
    for(i=top.length-1;i>=1;i--){var c2=top[i],p=top[i-1],end=p.length===2?[p[0],-p[1]]:[p[4],-p[5]];s.bezierCurveTo(c2[2],-c2[3],c2[0],-c2[1],end[0],end[1]);}
    return s;
  }
  function bowed(V,kind,pizz){
    var o=BW[kind]||BW.violin,I=base(V,pizz?o.n+' (plucked)':o.n),g=I.group,k=o.s;
    var L=.356*k,Wd=.205*k,th=.034*k,neckL=.135*k,nutX=-neckL,bridgeX=L*.56,fbEnd=L*.42,ns=4;
    var sh=bodyShape(o.slope),body=add(g,extGeo(sh,th,.006*k),T(o.edge),[0,0,0],null,[L,1,Wd/.58*1.0]);
    var topP=add(g,extGeo(sh,.001,0),T(o.col),[L*.04,th+.006*k,0],null,[L*.92,1,Wd/.58*.9],1);
    /* f-holes */
    [-1,1].forEach(function(s){var fh=grp(g,[bridgeX,th+.0072*k,s*Wd*.2]);add(fh,rboxGeo(.06*k,.001,.004*k,.002*k),T(0x1a0e08),[0,0,0],[0,s*.35,0],null,1);add(fh,cylGeo(.004*k,.004*k,.001,14),T(0x1a0e08),[-.03*k,0,s*.012*k],null,null,1);add(fh,cylGeo(.004*k,.004*k,.001,14),T(0x1a0e08),[.03*k,0,-s*.012*k],null,null,1);});
    /* neck, fingerboard, pegbox, scroll */
    var fbTop=th+.022*k;
    add(g,rboxGeo(neckL+.03*k,.02*k,.026*k,.006*k),T(o.edge),[nutX/2+.01*k,th+.002,0]);
    var fb=new THREE.Shape();fb.moveTo(nutX,-.012*k);fb.lineTo(fbEnd,-.021*k);fb.lineTo(fbEnd,.021*k);fb.lineTo(nutX,.012*k);fb.closePath();add(g,extGeo(fb,.007*k,.001*k),T(0x26211f),[0,fbTop-.008*k,0]);
    add(g,rboxGeo(.004*k,.006*k,.026*k,.0015*k),T(0x26211f),[nutX-.002*k,fbTop,0]);
    add(g,rboxGeo(.075*k,.022*k,.022*k,.006*k),T(o.edge),[nutX-.04*k,th+.004,0]);
    add(g,rboxGeo(.05*k,.006*k,.012*k,.003*k),T(0x1a0e08),[nutX-.04*k,th+.016*k,0],null,null,1);
    var sc=grp(g,[nutX-.09*k,th+.006,0]);add(sc,torGeo(.014*k,.006*k,32),T(o.edge),[0,0,0],[Math.PI/2,0,0]);add(sc,torGeo(.007*k,.004*k,24),T(o.edge),[.002*k,.004*k,0],[Math.PI/2,0,0]);add(sc,sphGeo(.004*k),T(o.edge),[.003*k,.006*k,0]);
    if(o.slope){for(var mc=0;mc<4;mc++){var mz=(mc%2?1:-1)*.02*k,mx=nutX-.022*k-Math.floor(mc/2)*.03*k;add(g,cylGeo(.006*k,.006*k,.01*k,16),T(C.chrome,1),[mx,th+.012*k,mz*1.4]);add(g,sphGeo(.008*k),T(C.chrome,1),[mx,th+.01*k,mz*2.4],null,[.6,.5,1.3]);}}
    else{for(var pg=0;pg<4;pg++){var pz=(pg%2?1:-1),px=nutX-.022*k-Math.floor(pg/2)*.028*k;add(g,cylGeo(.0035*k,.0035*k,.05*k,12),T(0x1d1714),[px,th+.012*k,pz*.012*k],[Math.PI/2,0,0]);add(g,sphGeo(.009*k),T(0x1d1714),[px,th+.012*k,pz*.034*k],null,[.8,.5,1]);}}
    /* bridge, tailpiece, chinrest, endpin */
    var bh=.033*k;add(g,rboxGeo(.004*k,bh,.042*k,.0015*k),T(0xf0d39a),[bridgeX,th+.006*k+bh/2,0]);
    var tp=new THREE.Shape();tp.moveTo(0,-.009);tp.lineTo(.11,-.022);tp.quadraticCurveTo(.125,0,.11,.022);tp.lineTo(0,.009);tp.closePath();add(g,extGeo(tp,.006,.002),T(0x1d1714),[L*.63,th+.012*k,0],null,[k,k,k]);
    if(o.chin)add(g,cylGeo(.024,.024,.01,32),T(0x3a2216),[L*.9,th+.011,.05],null,[1.25,1,1]);
    if(o.pin){add(g,cylGeo(.006*k,.002*k,.12*k,12),T(C.chrome,1),[L+.06*k,th*.5,0],[0,0,Math.PI/2]);}
    /* strings */
    var SL=bridgeX-nutX;
    var strs=[],N=36,sN=.0045*k,sB=.0075*k,yN=fbTop+.002*k,yB=th+.006*k+bh;
    for(var si=0;si<ns;si++){var zN=(si-1.5)*sN,zB=(si-1.5)*sB,wd=(.0016-si*.0002)*k,
      geo=new THREE.BufferGeometry(),pos=new Float32Array((N+1)*6),idx=[];for(var q=0;q<N;q++){var a=q*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
      geo.setIndex(idx);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array((N+1)*6).map(function(v,ii){return ii%3===1?1:0;}),3));
      var mesh=add(g,geo,T(si<2?0xd8b46a:0xe9edf0,1),null,null,null,1);mesh.frustumCulled=false;
      var S={mesh:mesh,geo:geo,pos:pos,zN:zN,zB:zB,w:wd,amp:0,ph:Math.random()*6,d:0,hold:0};strs.push(S);setS(S);
      add(g,tubeGeo([[bridgeX,yB,zB],[L*.65,th+.016*k,zB*.6]],wd*.4,4),T(0xe9edf0,1),null,null,null,1);}
    function xAt(d){return nutX+SL*(1-Math.pow(2,-d/12));}
    function setS(S){var x0=xAt(S.d);for(var q2=0;q2<=N;q2++){var u=q2/N,x=nutX+SL*u,zc=S.zN+(S.zB-S.zN)*u,yc=yN+(yB-yN)*u,dz=0;if(S.amp>1e-7&&x>x0){var vv=(x-x0)/(bridgeX-x0);dz=S.amp*Math.sin(Math.PI*vv)*Math.sin(S.ph);}
      var b=q2*6;S.pos[b]=x;S.pos[b+1]=yc;S.pos[b+2]=zc-S.w/2+dz;S.pos[b+3]=x;S.pos[b+4]=yc;S.pos[b+5]=zc+S.w/2+dz;}S.geo.attributes.position.needsUpdate=true;}
    /* the bow */
    var bow=grp(g,[(fbEnd+bridgeX)/2+.004*k,yB+.006*k,0]),bowLen=.72*Math.min(1.2,k*.75+.25);
    add(bow,tubeGeo([[0,.004,-bowLen*.55],[0,.012,0],[0,.004,bowLen*.45]],.0032*Math.max(1,k*.6),24),T(0x5a2a14),null,null,null);
    add(bow,rboxGeo(.003,.0014,bowLen*.98,.0006),T(0xf6f0de),[0,-.002,-.05*bowLen],null,null,1);
    add(bow,rboxGeo(.014,.02,.04,.004),T(0x1d1714),[0,.004,bowLen*.42]);add(bow,cylGeo(.004,.004,.003,16),T(C.pearl),[.007,.006,bowLen*.42],[0,0,Math.PI/2],null,1);
    add(bow,rboxGeo(.008,.014,.014,.003),T(0xf6f0de),[0,.006,-bowLen*.55]);
    bow.visible=!pizz;var bowS={ph:0,on:0,y:yB+.006*k,z:0,tilt:0};
    var tips=[];for(var ti=0;ti<4;ti++)tips.push(fingertip(g,.0068*k,1));
    var plk=fingertip(g,.0075*k,0);
    outline(g);shadow(g,(L+neckL+.2*k)*1.2,Wd*1.5,-.004,L*.35);
    /* which string and finger: first position where possible, higher positions on the top string */
    var FM=kind==='violin'?[0,1,1,2,2,3,3,4]:kind==='cello'?[0,1,1,2,3,4]:[0,1,1,2,4];
    var POS=[[1,2],[2,4],[3,5],[4,7],[5,9],[6,10],[7,12]];
    function assign(m){var best=null;for(var s=0;s<ns;s++){var d=m-o.tune[s];if(d<0)continue;var lim=FM.length-1;if(d<=lim){if(!best||d<best.d)best={s:s,d:d,f:FM[d],pos:1};}}
      if(!best){var s2=ns-1,d2=m-o.tune[s2];if(d2>FM.length-1){for(var p=0;p<POS.length;p++){var off=d2-POS[p][1];if(off>=0&&off<=5){best={s:s2,d:d2,f:[1,1,2,2,3,4][off],pos:POS[p][0]};break;}}}}
      return best;}
    var SN=kind==='violin'?['G','D','A','E']:kind==='cello'?['C','G','D','A']:['E','A','D','G'],ORD=['','1st','2nd','3rd','4th','5th','6th','7th'];
    function layout(){tips.forEach(function(t){t.visible=false;});var used={};Object.keys(I.held).forEach(function(id){var h=I.held[id];if(!h.a||!h.a.f)return;var t=tips[h.a.f-1];if(!t||used[h.a.f])return;used[h.a.f]=1;var S=strs[h.a.s],x=xAt(h.a.d),u=(x-nutX)/SL;t.position.set(x,yN+(yB-yN)*u+.003*k,S.zN+(S.zB-S.zN)*u);t.visible=true;tipNum(t,h.a.f);});}
    I.press=function(m,id,v){m=fold(m,o.tune[0],o.tune[3]+19);var a=assign(m);if(!a)return;I.held[id]={a:a,m:m};var S=strs[a.s];S.d=a.d;S.hold++;S.amp=pizz?.0022*k:.0009*k;lit(S.mesh,true,C.green);
      bowS.tilt=(a.s-1.5)*.18;plk.position.set(fbEnd+.01*k,yN+.006*k,S.zB*.6);if(pizz){plk.visible=true;plk.userData.t=1;}
      I.cap=(a.d===0?'Open '+SN[a.s]+' string':SN[a.s]+' string · '+(a.pos>1?ORD[a.pos]+' position, ':'')+ORD[a.f]+' finger');layout();V.wake();};
    I.release=function(id){var h=I.held[id];if(!h)return;delete I.held[id];var S=strs[h.a.s];S.hold=Math.max(0,S.hold-1);if(!S.hold){lit(S.mesh,false);if(!pizz)S.amp=0;}layout();V.wake();};
    I.tick.push(function(dt){var busy=false,on=Object.keys(I.held).length>0;
      strs.forEach(function(S){if(S.amp>1e-7){S.ph+=dt*TAU*(pizz?17:24);if(pizz||!S.hold)S.amp*=Math.pow(.06,dt);setS(S);busy=true;}else if(S.amp){S.amp=0;setS(S);}});
      if(!pizz){if(on){bowS.ph+=dt*1.6;busy=true;}var tz=on?Math.sin(bowS.ph)*.16*Math.min(1.4,k*.7+.3):0;if(spring(bowS,'z',tz,on?40:4,dt))busy=true;if(spring(bowS,'on',on?1:0,6,dt))busy=true;
        bow.position.z=bowS.z;bow.position.y=bowS.y+(1-bowS.on)*.03*k;bow.rotation.x=bowS.tilt*bowS.on;}
      if(plk.visible){plk.userData.t-=dt*4;var u=1-Math.max(0,plk.userData.t);plk.position.y=yN+.006*k+u*.01*k;if(plk.userData.t<=0)plk.visible=false;busy=true;}
      return busy;});
    var x0=nutX-.12*k,x1=L+(o.pin?.1*k:.02*k);V.cam([0,1,.3],[(x0+x1)/2,th,0],x1-x0,Wd*1.25);
    return I;
  }
  /* =============== HARP =============== */
  function harp(V){
    var I=base(V,'Harp'),g=I.group,W=[0,2,4,5,7,9,11],ss=[],lo=36,hi=96;for(var m=lo;m<=hi;m++)if(W.indexOf(m%12)>=0)ss.push(m);
    var x0=-.55,x1=.62,n=ss.length;function topY(x){var u=(x-x0)/(x1-x0);return .62-.42*Math.pow(u,1.15)+.04*Math.sin(u*Math.PI);}function botY(x){var u=(x-x0)/(x1-x0);return .05+.12*u;}
    var gold=T(C.gold,1),wood=T(0xb8692e);
    add(g,cylGeo(.025,.03,.68,24),gold,[x0-.05,.34,0]);add(g,sphGeo(.05),gold,[x0-.05,.7,0]);add(g,torGeo(.035,.012),gold,[x0-.05,.06,0],[Math.PI/2,0,0]);
    var neckPts=[];for(var i=0;i<=16;i++){var x=x0-.05+(x1+.07-x0+.05)*i/16;neckPts.push([x,topY(Math.max(x0,Math.min(x1,x)))+.035,0]);}add(g,tubeGeo(neckPts,.025,80),wood);
    add(g,tubeGeo([[x0-.03,botY(x0)-.03,0],[x1+.05,botY(x1)-.02,0]],.04,20),wood);add(g,rboxGeo(.22,.06,.16,.02),wood,[x0+.02,.02,0]);
    add(g,tubeGeo([[x1+.06,botY(x1)-.02,0],[x1+.08,topY(x1)+.04,0]],.02,10),wood);
    var strs=[];ss.forEach(function(mm,i){var x=x0+(x1-x0)*(i+.5)/n,yt=topY(x)+.01,yb=botY(x)+.01,col=mm%12===0?0xd8452e:mm%12===5?0x2f4f8a:0xf2ead8;
      var s=add(g,cylGeo(.0022,.0022,yt-yb,8),T(col),[x,(yt+yb)/2,0],null,null,1);add(g,cylGeo(.004,.004,.008,10),gold,[x,yt,0],[Math.PI/2,0,0],null,1);strs.push({m:mm,mesh:s,x:x,amp:0,ph:0,col:col,hold:0});});
    var tip=fingertip(g,.012,0);outline(g);shadow(g,1.4,.3,-.01);
    I.press=function(m,id){var mm=fold(m,lo,hi),best=0,bd=99;strs.forEach(function(s,i){var d=Math.abs(s.m-mm);if(d<bd){bd=d;best=i;}});var S=strs[best];S.amp=.006;S.hold++;lit(S.mesh,true,C.green);I.held[id]=S;
      tip.position.set(S.x,.3,.012);tip.visible=true;tip.userData.t=1;I.cap=nm(S.m)+' string'+(mm!==S.m?(mm>S.m?' (pedal up a half step)':' (pedal down)'):'')+(S.m%12===0?' · the red C':S.m%12===5?' · the blue F':'');V.wake();};
    I.release=function(id){var S=I.held[id];if(!S)return;delete I.held[id];S.hold=Math.max(0,S.hold-1);if(!S.hold)lit(S.mesh,false);V.wake();};
    I.tick.push(function(dt){var busy=false;strs.forEach(function(S){if(S.amp>1e-5){S.ph+=dt*TAU*16;S.amp*=Math.pow(.08,dt);S.mesh.position.x=S.x+S.amp*Math.sin(S.ph);busy=true;}else if(S.amp){S.amp=0;S.mesh.position.x=S.x;}});
      if(tip.visible){tip.userData.t-=dt*3;tip.position.z=.012+(1-tip.userData.t)*.02;if(tip.userData.t<=0)tip.visible=false;busy=true;}return busy;});
    V.cam([0,.35,1],[.03,.36,0],1.35,.78);
    return I;
  }
  /* =============== KOTO and HAMMERED DULCIMER =============== */
  function zither(V,kind){
    var koto=kind==='koto',I=base(V,koto?'Koto':'Hammered dulcimer'),g=I.group,strs=[],n=koto?13:16,len=koto?1.2:.7,w=koto?.24:.4;
    var tune=koto?[50,55,57,58,62,63,67,69,70,74,75,79,81]:null;
    if(koto){add(g,rboxGeo(len,.05,w,.03),T(0xc9894a),[0,.025,0]);add(g,rboxGeo(len*.98,.008,w*.9,.004),T(0xe8b57a),[0,.051,0],null,null,1);add(g,rboxGeo(.06,.06,w+.02,.01),T(0x6a3418),[-len/2,.03,0]);add(g,rboxGeo(.06,.06,w+.02,.01),T(0x6a3418),[len/2,.03,0]);}
    else{var tz=new THREE.Shape();tz.moveTo(-.48,-.2);tz.lineTo(.48,-.2);tz.lineTo(.32,.2);tz.lineTo(-.32,.2);tz.closePath();add(g,extGeo(tz,.06,.006),T(0x9a5a2c),[0,0,0]);add(g,extGeo(tz,.002,0),T(0xe0b07a),[0,.066,0],null,[.92,1,.9],1);
      [-.12,.12].forEach(function(x){add(g,rboxGeo(.012,.014,.36,.004),T(0xf3e8cd),[x,.075,0]);});[-1,1].forEach(function(s){add(g,cylGeo(.03,.03,.002,24),T(0x2a1a10),[s*.25,.068,-.05],null,null,1);});}
    for(var i=0;i<n;i++){var z=koto?(i-(n-1)/2)*(w*.8/n):(i-(n-1)/2)*.022,xl=koto?-len/2+.04:-.44+Math.abs(z)*.4,xr=koto?len/2-.04:.44-Math.abs(z)*.4,y=koto?.07:.085;
      var s=add(g,cylGeo(.0014,.0014,xr-xl,6),T(0xf3ede0),[(xl+xr)/2,y,z],[0,0,Math.PI/2],null,1);
      var bx=koto?-.25+i*.04:0;if(koto)add(g,rboxGeo(.012,.022,.012,.003),T(0xf6f0e2),[bx,.06,z]);
      strs.push({mesh:s,z:z,amp:0,ph:0,hold:0,m:koto?tune[i]:48+i*2+(i>7?1:0),x:koto?bx+.15:(i%2?.25:-.25),y:y});}
    var tool=koto?fingertip(g,.012,0):grp(g,[0,.2,0]);
    if(!koto){add(tool,cylGeo(.003,.003,.22,8),T(0x7a3c1c),[0,0,.08],[Math.PI/2,0,0]);add(tool,sphGeo(.012),T(0xf3e8cd),[0,-.004,-.03],null,[1.2,.6,1]);tool.visible=false;}
    outline(g);shadow(g,len+.3,w+.3,-.01);
    I.press=function(m,id){var best=0,bd=99;strs.forEach(function(S,i){var d=Math.abs(fold(m,strs[0].m,strs[n-1].m)-S.m);if(d<bd){bd=d;best=i;}});var S=strs[best];S.amp=.004;S.hold++;lit(S.mesh,true,C.green);I.held[id]=S;
      tool.position.set(S.x,S.y+.02,S.z);tool.visible=true;tool.userData.t=1;I.cap=nm(m)+' · string '+(best+1);V.wake();};
    I.release=function(id){var S=I.held[id];if(!S)return;delete I.held[id];S.hold=Math.max(0,S.hold-1);if(!S.hold)lit(S.mesh,false);V.wake();};
    I.tick.push(function(dt){var busy=false;strs.forEach(function(S){if(S.amp>1e-5){S.ph+=dt*TAU*15;S.amp*=Math.pow(.1,dt);S.mesh.position.z=S.z+S.amp*Math.sin(S.ph);busy=true;}else if(S.amp){S.amp=0;S.mesh.position.z=S.z;}});
      if(tool.visible){tool.userData.t-=dt*4;var u=Math.max(0,tool.userData.t);tool.position.y=strs[0].y+.012+.03*Math.sin(u*Math.PI);if(tool.userData.t<=0)tool.visible=false;busy=true;}return busy;});
    V.cam([0,1,.45],[0,.04,0],koto?len+.08:.98,koto?.3:.44);
    return I;
  }
  /* =============== BRASS =============== */
  function bellGeo(x0,x1,r0,r1,pw){var p=[];for(var i=0;i<=36;i++){var u=i/36;p.push([r0+(r1-r0)*Math.pow(u,pw||4.2),x0+(x1-x0)*u]);}p.push([r1*1.04,x1+.001]);p.push([r1*.98,x1+.003]);var g=latheGeo(p,48);return g;}
  function pistons(I,par,xs,y0,label3,style){
    var vs=[];xs.forEach(function(x,k){var cas=add(par,cylGeo(.0095,.0095,.085,28),T(C.brass,1),[x,y0,0]);[.0425,-.0425].forEach(function(dy){add(par,cylGeo(.011,.011,.006,28),T(C.brass,1),[x,y0+dy,0]);});
      var mov=grp(par,[x,0,0]);add(mov,cylGeo(.0026,.0026,.03,12),T(C.silver,1),[0,y0+.06,0],null,null,1);var b=add(mov,cylGeo(.0105,.0105,.006,28),T(C.pearl),[0,y0+.077,0]);
      if(label3){var lb=label(String(k+1),'brass');lb.scale.set(.018,.018,1);lb.position.set(x,y0+.105,0);par.add(lb);}vs.push({mov:mov,b:b,a:0,t:0});});return vs;
  }
  function trumpet(V,muted){
    var I=base(V,muted?'Muted trumpet':'Trumpet'),g=I.group,R=.0058,br=T(C.brass,1);
    var bell=add(g,bellGeo(.11,.3,.0062,.062,4.2),br,[0,.075,0],[0,0,-Math.PI/2]);bell.material=bell.material.clone();bell.material.side=THREE.DoubleSide;bell.userData.m0=bell.material;
    add(g,tubeGeo([[.11,.075],[-.12,.075],[-.175,.072],[-.2,.05],[-.18,.022],[-.13,.016],[-.052,.016]],R,80),br);
    add(g,tubeGeo([[-.215,.04,-.012],[-.1,.04,-.012],[.06,.038,-.012],[.105,.03,-.012],[.125,.005,-.012],[.11,-.022,-.012],[.07,-.03,-.012],[.022,-.03,-.012]],R*.95,90),br);
    add(g,latheGeo([[.0035,0],[.0045,.03],[.006,.05],[.009,.06],[.0125,.066],[.013,.069],[.0105,.07],[.004,.069]],32),T(C.silver,1),[-.215,.04,-.012],[0,0,Math.PI/2]);
    add(g,tubeGeo([[-.045,-.035],[-.05,-.07],[-.065,-.08],[-.08,-.07],[-.078,-.035]],R*.9,40),br);add(g,tubeGeo([[.018,-.035],[.03,-.075],[.055,-.088],[.08,-.075],[.078,-.04]],R*.9,40),br);
    add(g,torGeo(.008,.0018,24),br,[.088,-.06,.008]);
    var vs=pistons(I,g,[-.04,-.012,.016],-.006,true);
    if(muted){add(g,latheGeo([[.004,0],[.02,.05],[.034,.1],[.036,.11],[.0,.112]],32),T(0x5a3a22),[.235,.075,0],[0,0,-Math.PI/2]);add(g,torGeo(.025,.005,32),T(0xd8b080),[.27,.075,0],[0,Math.PI/2,0]);}
    outline(g);shadow(g,.62,.2,-.1);
    var PART=[48,60,67,72,76,79,84,86,88];
    I.press=function(m,id){var w=fold(m,52,84)+2,v=valves(w,PART,[82])||'';I.held[id]=v;apply();if(!muted)I.fx.ring(V3(.305,.075,0),V3(1,0,0),.05);V.wake();};
    I.release=function(id){delete I.held[id];apply();};
    function apply(){var on=[0,0,0],last=null;for(var k in I.held)last=I.held[k];if(last)last.split('').forEach(function(c){on[+c-1]=1;});vs.forEach(function(v,i){v.t=on[i];lit(v.b,!!on[i],C.green);});
      bell.material.emissive=new THREE.Color(last!=null?0x6a4a10:0);bell.material.emissiveIntensity=last!=null?.3:0;I.cap=last==null?'':(last?'Valves '+last.split('').join(' + '):'Open (no valves)');V.wake();}
    I.tick.push(function(dt){var busy=false;vs.forEach(function(v){if(spring(v,'a',v.t?-.013:0,35,dt)){v.mov.position.y=v.a;busy=true;}});return busy;});
    V.cam([.05,.08,1],[.045,.01,0],.6,.25);
    return I;
  }
  function trombone(V){
    var I=base(V,'Trombone'),g=I.group,br=T(C.brass,1),R=.0065;
    add(g,bellGeo(.02,.3,.008,.105,4.6),DS(br),[0,.13,0],[0,0,-Math.PI/2]);
    add(g,tubeGeo([[.03,.13],[-.38,.13],[-.43,.12],[-.45,.09],[-.43,.06],[-.38,.05],[-.3,.05]],R,60),br);
    add(g,tubeGeo([[-.3,.05],[-.3,.0]],R*.8,4),br);add(g,tubeGeo([[-.4,.13],[-.4,.0]],.003,4),br);
    add(g,latheGeo([[.004,0],[.005,.03],[.007,.05],[.011,.06],[.014,.066],[.0145,.069],[.012,.07],[.004,.069]],32),T(C.silver,1),[-.38,.0,0],[0,0,Math.PI/2]);
    [0,-.055].forEach(function(y){add(g,cylGeo(R*.75,R*.75,.6,16),br,[-.08,y,0],[0,0,Math.PI/2]);});
    var sl=grp(g,[0,0,0]);[0,-.055].forEach(function(y){add(sl,cylGeo(R,R,.56,16),br,[.12,y,0],[0,0,Math.PI/2]);add(sl,cylGeo(R*1.25,R*1.25,.02,16),br,[-.15,y,0],[0,0,Math.PI/2]);});
    add(sl,tubeGeo([[.4,0],[.425,-.01],[.43,-.0275],[.425,-.045],[.4,-.055]],R,24),br);add(sl,tubeGeo([[-.12,0],[-.12,-.055]],.0035,4),br);add(sl,cylGeo(.006,.006,.03,12),T(C.silver,1),[-.12,-.0275,.012],[Math.PI/2,0,0]);
    var marks=[];for(var p=1;p<=7;p++){var mk=label(String(p),'brass');mk.scale.set(.02,.02,1);mk.position.set(-.13+(p-1)*.075,-.095,0);g.add(mk);mk.material=mk.material.clone();mk.material.opacity=.45;marks.push(mk);}
    outline(g);shadow(g,1.0,.24,-.12);
    var st={x:0,t:0},PART=[34,46,53,58,62,65,70,72,74];
    function pos(m){var best=8;PART.forEach(function(p){var d=p-m;if(d>=0&&d<=6&&d+1<best)best=d+1;});return best>7?1:best;}
    I.press=function(m,id){var p=pos(fold(m,40,77));I.held[id]=p;st.t=(p-1)*.075;marks.forEach(function(mk,i){mk.material.opacity=i===p-1?1:.4;});I.cap='Slide: '+['1st','2nd','3rd','4th','5th','6th','7th'][p-1]+' position';I.fx.ring(V3(.305,.13,0),V3(1,0,0),.07);V.wake();};
    I.release=function(id){delete I.held[id];if(!Object.keys(I.held).length){marks.forEach(function(mk){mk.material.opacity=.4;});}V.wake();};
    I.tick.push(function(dt){if(spring(st,'x',st.t,9,dt)){sl.position.x=st.x;return true;}return false;});
    V.cam([0,.15,1],[.05,.03,0],1.02,.34);
    return I;
  }
  function horn(V){
    var I=base(V,'French horn'),g=I.group,br=T(C.brass,1),R=.0055;
    var coil=[];for(var i=0;i<=80;i++){var a=i/80*TAU*1.25,r=.11-.02*i/80;coil.push([Math.cos(a)*r,Math.sin(a)*r,(i/80-.5)*.03]);}add(g,tubeGeo(coil,R,180),br);
    var coil2=[];for(var j=0;j<=60;j++){var a2=j/60*TAU,r2=.075;coil2.push([Math.cos(a2)*r2,Math.sin(a2)*r2,.02]);}add(g,tubeGeo(coil2,R*.9,120,true),br);
    var bg=grp(g,[.07,-.06,0],[0,0,-.75]);add(bg,bellGeo(0,.2,.008,.12,4.4),DS(br),[0,0,0],[0,0,-Math.PI/2]);
    add(g,tubeGeo([[-.24,.13,.03],[-.15,.12,.03],[-.06,.07,.03],[-.02,.03,.02]],R*.9,40),br);
    add(g,latheGeo([[.004,0],[.0045,.03],[.006,.05],[.009,.058],[.0115,.062],[.012,.065],[.004,.065]],32),T(C.silver,1),[-.24,.13,.03],[0,0,Math.PI/2]);
    var levers=[];[-.035,-.012,.011].forEach(function(x,k){add(g,cylGeo(.012,.012,.028,24),br,[x,.035,.03],[Math.PI/2,0,0]);var lv=grp(g,[x-.004,.06,.045]);add(lv,rboxGeo(.012,.004,.05,.003),T(C.silver,1),[0,0,.0],[0,0,0]);add(lv,rboxGeo(.018,.004,.016,.006),T(C.pearl),[0,.002,.03]);var lb=label(String(k+1),'brass');lb.scale.set(.016,.016,1);lb.position.set(0,.02,.03);lv.add(lb);levers.push({g:lv,a:0,t:0});});
    outline(g);shadow(g,.5,.3,-.15);
    var PART=[48,55,60,64,67,72,74,76,79,81,84];
    I.press=function(m,id){var w=fold(m,41,77)+7,v=valves(w,PART,[70])||'';I.held[id]=v;apply();I.fx.ring(V3(.2,-.2,0),V3(.6,-.8,0),.06);};
    I.release=function(id){delete I.held[id];apply();};
    function apply(){var on=[0,0,0],last=null;for(var k in I.held)last=I.held[k];if(last)last.split('').forEach(function(c){on[+c-1]=1;});levers.forEach(function(l,i){l.t=on[i];});I.cap=last==null?'':(last?'Valves '+last.split('').join(' + '):'Open (no valves)');V.wake();}
    I.tick.push(function(dt){var busy=false;levers.forEach(function(l){if(spring(l,'a',l.t?-.35:0,30,dt)){l.g.rotation.x=l.a;busy=true;}});return busy;});
    V.cam([0,.2,1],[.03,-.07,0],.55,.52);
    return I;
  }
  function tuba(V){
    var I=base(V,'Tuba'),g=I.group,br=T(C.brass,1);
    add(g,bellGeo(.22,.62,.028,.17,3.2),DS(br),[.08,0,0]);
    add(g,latheGeo([[.03,.22],[.028,.1],[.03,.05]],32),br,[.08,0,0]);
    add(g,tubeGeo([[.08,.06],[.06,.0],[0,-.03],[-.07,0],[-.09,.08],[-.09,.24]],.026,40),br);
    add(g,tubeGeo([[-.09,.24],[-.08,.33],[-.03,.36],[.02,.33]],.018,24),br);
    var vs=[];[-.03,-.005,.02,.045].forEach(function(x,k){add(g,cylGeo(.013,.013,.1,24),br,[x,.36,.04]);var mov=grp(g,[x,0,.04]);add(mov,cylGeo(.003,.003,.03,10),T(C.silver,1),[0,.425,0],null,null,1);var b=add(mov,cylGeo(.013,.013,.006,24),T(C.pearl),[0,.443,0]);var lb=label(String(k+1),'brass');lb.scale.set(.03,.03,1);lb.position.set(x,.48,.04);g.add(lb);vs.push({mov:mov,b:b,a:0,t:0});});
    add(g,tubeGeo([[-.03,.33,.04],[-.12,.36,.06],[-.2,.42,.06]],.009,20),br);add(g,latheGeo([[.005,0],[.006,.03],[.009,.05],[.015,.06],[.019,.066],[.0195,.069],[.004,.069]],32),T(C.silver,1),[-.2,.42,.06],[0,0,Math.PI/2]);
    outline(g);shadow(g,.5,.4,-.06);
    var PART=[22,34,41,46,50,53,58,60,62];
    I.press=function(m,id){var v=valves(fold(m,28,58),PART,[56])||'';I.held[id]=v;apply();I.fx.ring(V3(.08,.63,0),V3(0,1,0),.15);};
    I.release=function(id){delete I.held[id];apply();};
    function apply(){var on=[0,0,0,0],last=null;for(var k in I.held)last=I.held[k];if(last)last.split('').forEach(function(c){on[+c-1]=1;});vs.forEach(function(v,i){v.t=on[i];lit(v.b,!!on[i],C.green);});I.cap=last==null?'':(last?'Valves '+last.split('').join(' + '):'Open (no valves)');V.wake();}
    I.tick.push(function(dt){var busy=false;vs.forEach(function(v){if(spring(v,'a',v.t?-.014:0,35,dt)){v.mov.position.y=v.a;busy=true;}});return busy;});
    V.cam([0,.1,1],[0,.31,0],.5,.82);
    return I;
  }
  /* =============== WOODWINDS =============== */
  var FL={60:'T L1 L2 L3 R1 R2 R3 C',61:'T L1 L2 L3 R1 R2 R3 C',62:'T L1 L2 L3 R1 R2 R3',63:'T L1 L2 L3 R1 R2 R3 RP',64:'T L1 L2 L3 R1 R2 RP',65:'T L1 L2 L3 R1 RP',66:'T L1 L2 L3 R3 RP',67:'T L1 L2 L3 RP',68:'T L1 L2 L3 LP RP',69:'T L1 L2 RP',70:'T L1 R1 RP',71:'T L1 RP',72:'L1 RP',73:'RP',74:'T L2 L3 R1 R2 R3',75:'T L2 L3 R1 R2 R3 RP'};
  var SX={58:'L1 L2 L3 R1 R2 R3 LP',59:'L1 L2 L3 R1 R2 R3 LP',60:'L1 L2 L3 R1 R2 R3 RP',61:'L1 L2 L3 R1 R2 R3 LP',62:'L1 L2 L3 R1 R2 R3',63:'L1 L2 L3 R1 R2 R3 RP',64:'L1 L2 L3 R1 R2',65:'L1 L2 L3 R1',66:'L1 L2 L3 R2',67:'L1 L2 L3',68:'L1 L2 L3 LP',69:'L1 L2',70:'L1 SIDE',71:'L1',72:'L2',73:''};
  var CL={52:'T L1 L2 L3 R1 R2 R3 RP',53:'T L1 L2 L3 R1 R2 R3 LP',54:'T L1 L2 L3 R1 R2 R3 RP',55:'T L1 L2 L3 R1 R2 R3',56:'T L1 L2 L3 R1 R2 R3 RP',57:'T L1 L2 L3 R1 R2',58:'T L1 L2 L3 R1',59:'T L1 L2 L3 R2',60:'T L1 L2 L3',61:'T L1 L2 L3 RP',62:'T L1 L2',63:'T L1 SIDE',64:'T L1',65:'T',66:'L1',67:'',68:'GS',69:'A',70:'A REG'};
  var RC=['T L1 L2 L3 R1 R2 R3 R4','T L1 L2 L3 R1 R2 R3 R4h','T L1 L2 L3 R1 R2 R3','T L1 L2 L3 R1 R2 R3h','T L1 L2 L3 R1 R2','T L1 L2 L3 R1 R3 R4','T L1 L2 L3 R2 R3','T L1 L2 L3','T L1 L2 R1 R2 R3','T L1 L2','T L1 L3 R1','T L1','T L2','L1 L2','L2','L2 L3 R1 R2 R3','Th L1 L2 L3 R1 R2','Th L1 L2 L3 R1 R3','Th L1 L2 L3 R2','Th L1 L2 L3','Th L1 L2 R1','Th L1 L2','Th L1 L2 L3 R1 R2 R3','Th L1 L2 L3 R1 R2','Th L1 L2 R1 R2'];
  function chartFor(kind,m){
    var w,s;
    if(kind==='flute'||kind==='piccolo'){w=fold(m-(kind==='piccolo'?12:0),60,85);s=FL[w]!=null?FL[w]:FL[w-12];return{keys:s||'',w:null};}
    if(kind==='sax'||kind==='tenorsax'){w=fold(m+(kind==='sax'?9:14),58,89);if(w>=86)return{keys:'OCT PALM',w:w};s=w>=74?SX[w-12]+' OCT':SX[w];return{keys:s,w:w};}
    if(kind==='clarinet'){w=fold(m+2,52,86);s=w>=71?CL[w-19]+' REG':CL[w];return{keys:s,w:w};}
    if(kind==='oboe'){w=fold(m,58,85);s=w>=74?SX[w-12]+' OCT':SX[w];return{keys:s,w:null};}
    if(kind==='recorder'){w=fold(m,65,89);return{keys:RC[w-65]||'',w:null};}
    return null;
  }
  var WK={
    flute:{n:'Flute',x0:-.33,x1:.34,r:.0095,col:C.silver,metal:1,keys:[['L1',-.02,'cup'],['L2',.025,'cup'],['L3',.065,'cup'],['LP',.088,'lever'],['R1',.14,'cup'],['R2',.18,'cup'],['R3',.22,'cup'],['RP',.25,'lever'],['C',.3,'lever'],['T',-.04,'thumb']],mouth:-.27},
    piccolo:{n:'Piccolo',x0:-.17,x1:.17,r:.0068,col:C.silver,metal:1,keys:[['L1',-.012,'cup'],['L2',.012,'cup'],['L3',.035,'cup'],['LP',.048,'lever'],['R1',.075,'cup'],['R2',.097,'cup'],['R3',.118,'cup'],['RP',.135,'lever'],['T',-.025,'thumb']],mouth:-.135},
    recorder:{n:'Recorder',x0:-.2,x1:.26,r:.0125,col:0xe7c389,keys:[['L1',-.06,'hole'],['L2',-.03,'hole'],['L3',0,'hole'],['R1',.05,'hole'],['R2',.08,'hole'],['R3',.11,'hole'],['R4',.145,'hole'],['T',-.085,'thumb']]},
    oboe:{n:'Oboe',x0:-.3,x1:.3,r:.0095,col:0x2b2a30,keys:[['OCT',-.24,'lever'],['L1',-.17,'ring'],['L2',-.13,'ring'],['L3',-.09,'ring'],['LP',-.05,'lever'],['R1',.02,'ring'],['R2',.06,'ring'],['R3',.1,'ring'],['RP',.15,'lever'],['SIDE',.05,'lever']],bell:.022},
    clarinet:{n:'Clarinet',x0:-.27,x1:.24,r:.0125,col:0x2b2a30,keys:[['REG',-.2,'lever'],['A',-.215,'lever'],['GS',-.205,'lever'],['T',-.19,'thumb'],['L1',-.16,'ring'],['L2',-.12,'ring'],['L3',-.08,'ring'],['LP',-.04,'lever'],['SIDE',.06,'lever'],['R1',.03,'ring'],['R2',.07,'ring'],['R3',.11,'ring'],['RP',.16,'lever']],bell:.034},
    bassoon:{n:'Bassoon'},shakuhachi:{n:'Shakuhachi'},ocarina:{n:'Ocarina'}
  };
  function wind(V,kind){
    var o=WK[kind]||WK.flute,I=base(V,o.n),g=I.group,keys={},mat=o.col!=null?T(o.col,o.metal):null,silver=T(C.silver,1),mouthPos=V3(o.x0,0,0),bellPos=null;
    var len=o.x1-o.x0;
    if(o.x0!=null)add(g,cylGeo(o.r,o.r*(kind==='recorder'?.78:1),len,28),mat,[(o.x0+o.x1)/2,0,0],[0,0,Math.PI/2]);
    if(kind==='flute'||kind==='piccolo'){var k=kind==='piccolo'?.55:1;add(g,cylGeo(o.r*1.08,o.r*1.08,.012*k,28),silver,[o.x0+.004,0,0],[0,0,Math.PI/2]);add(g,rboxGeo(.03*k,.003,.022*k,.008*k),silver,[o.mouth,o.r*.9,0]);add(g,rboxGeo(.01*k,.002,.006*k,.003*k),T(0x1a1a20),[o.mouth,o.r*.9+.0018,0],null,null,1);
      add(g,cylGeo(.0012,.0012,len*.6,8),silver,[o.x0+len*.55,o.r*.8,-o.r*.7],[0,0,Math.PI/2],null,1);mouthPos=V3(o.mouth,o.r+.006,0);}
    if(kind==='recorder'){add(g,latheGeo([[.0,-.04],[.012,-.035],[.0135,-.01],[.0135,0]],28),mat,[o.x0,0,0],[0,0,Math.PI/2]);add(g,rboxGeo(.012,.003,.009,.002),T(0x2a1a10),[o.x0+.045,o.r*.95,0],null,null,1);
      [o.x0+.09,o.x0+.24,o.x1-.02].forEach(function(x){add(g,cylGeo(o.r*1.12,o.r*1.12,.012,28),T(0xc99a5a),[x,0,0],[0,0,Math.PI/2]);});mouthPos=V3(o.x0-.035,0,0);}
    if(kind==='clarinet'||kind==='oboe'){
      if(kind==='clarinet'){add(g,latheGeo([[.003,0],[.011,.012],[.012,.05],[.0125,.06]],28),T(0x1c1c22),[o.x0-.06,0,0],[0,0,-Math.PI/2]);add(g,torGeo(.0128,.0025,28),silver,[o.x0-.03,0,0],[0,Math.PI/2,0]);add(g,rboxGeo(.05,.002,.011,.001),T(0xf0dca8),[o.x0-.035,-.0115,0],null,null,1);add(g,cylGeo(.0145,.0145,.045,28),T(0x24232a),[o.x0+.02,0,0],[0,0,Math.PI/2]);mouthPos=V3(o.x0-.065,0,0);}
      else{add(g,cylGeo(.003,.0045,.04,10),T(0xd8a060),[o.x0-.03,0,0],[0,0,Math.PI/2]);add(g,rboxGeo(.022,.002,.008,.001),T(0xf0dca8),[o.x0-.06,0,0],null,null,1);mouthPos=V3(o.x0-.072,0,0);}
      [o.x0+.06,0,(o.x1-.02)].forEach(function(x){add(g,torGeo(o.r*1.08,.0018,28),silver,[x,0,0],[0,Math.PI/2,0],null,1);});
      add(g,bellGeo(0,.09,o.r,o.bell,2.6),DS(mat),[o.x1-.005,0,0],[0,0,-Math.PI/2]);add(g,torGeo(o.bell*1.02,.0016,40),silver,[o.x1+.087,0,0],[0,Math.PI/2,0],null,1);bellPos=V3(o.x1+.09,0,0);
      add(g,cylGeo(.0012,.0012,len*.8,8),silver,[(o.x0+o.x1)/2,o.r*.85,o.r*.6],[0,0,Math.PI/2],null,1);}
    var tips=[];
    (o.keys||[]).forEach(function(kd){var id=kd[0],x=kd[1],type=kd[2],K={id:id,type:type,x:x};
      if(type==='cup'){K.m=add(g,cylGeo(o.r*.95,o.r*.95,.004,24),silver,[x,o.r+.002,0]);add(g,cylGeo(o.r*.35,o.r*.35,.0042,16),T(0x8a9196,1),[x,o.r+.0025,0],null,null,1);K.tipPos=V3(x,o.r+.008,0);}
      else if(type==='hole'){K.m=add(g,cylGeo(o.r*.34,o.r*.34,.003,16),T(0x241408),[x,o.r*.96,0],null,null,1);K.tipPos=V3(x,o.r+.006,0);}
      else if(type==='ring'){K.m=add(g,torGeo(o.r*.42,.0012,20),silver,[x,o.r*.98,0],[Math.PI/2,0,0],null,1);add(g,cylGeo(o.r*.3,o.r*.3,.002,16),T(0x0e0e12),[x,o.r*.97,0],null,null,1);K.tipPos=V3(x,o.r+.006,0);}
      else if(type==='lever'){K.m=add(g,rboxGeo(.012,.003,.006,.002),silver,[x,o.r*.7,-o.r*1.05]);}
      else if(type==='thumb'){K.m=add(g,cylGeo(o.r*.36,o.r*.36,.003,16),type==='thumb'&&kind!=='flute'?T(0x241408):silver,[x,-o.r*.2,o.r*1.02],[Math.PI/2,0,0],null,1);K.tipPos=V3(x,-o.r*.1,o.r+.008);}
      if(K.tipPos){K.tip=fingertip(g,o.r*.62,0);K.tip.position.copy(K.tipPos);}
      keys[id]=K;});
    if(kind==='bassoon'){var bw=T(0xb4602a);add(g,cylGeo(.017,.017,.75,24),bw,[-.12,.045,0],[0,0,Math.PI/2]);add(g,cylGeo(.013,.013,.42,24),bw,[.07,0,0],[0,0,Math.PI/2]);add(g,rboxGeo(.07,.09,.05,.02),bw,[.3,.02,0]);add(g,torGeo(.021,.003,24),T(C.cream),[-.49,.045,0],[0,Math.PI/2,0],null,1);
      add(g,tubeGeo([[-.14,0],[-.2,.02],[-.26,.05],[-.3,.055]],.003,20),silver);add(g,rboxGeo(.02,.002,.007,.001),T(0xd8a060),[-.31,.055,0],null,null,1);mouthPos=V3(-.33,.055,0);
      ['L1','L2','L3','R1','R2','R3'].forEach(function(id,i){var x=i<3?-.08+i*.03:.14+(i-3)*.035,y=i<3?.013:.013,K={id:id,x:x};K.m=add(g,cylGeo(.004,.004,.003,12),T(0x241408),[x,y,0],null,null,1);K.tip=fingertip(g,.008,0);K.tip.position.set(x,y+.006,0);keys[id]=K;});bellPos=V3(-.5,.045,0);}
    if(kind==='shakuhachi'){var bm=T(C.bamboo);add(g,cylGeo(.018,.02,.55,28),bm,[0,0,0],[0,0,Math.PI/2]);for(var nd=0;nd<6;nd++)add(g,torGeo(.0195,.0022,28),T(0xb59a52),[-.24+nd*.095,0,0],[0,Math.PI/2,0],null,1);
      ['L1','L2','R1','R2'].forEach(function(id,i){var x=.03+i*.045,K={id:id,x:x};K.m=add(g,cylGeo(.0045,.0045,.003,14),T(0x241408),[x,.018,0],null,null,1);K.tip=fingertip(g,.009,0);K.tip.position.set(x,.024,0);keys[id]=K;});keys.T={id:'T',x:-.01};keys.T.tip=fingertip(g,.009,0);keys.T.tip.position.set(-.01,0,.026);mouthPos=V3(-.28,.01,0);}
    if(kind==='ocarina'){add(g,sphGeo(.07,32,22),T(0x5c8fc8),[0,0,0],null,[1.7,.72,1.05]);add(g,rboxGeo(.05,.022,.03,.01),T(0x5c8fc8),[-.13,.0,0]);
      ['L1','L2','L3','L4','R1','R2','R3','R4'].forEach(function(id,i){var x=-.06+(i%4)*.035+(i>3?.0:0),z=i<4?-.025:.025,K={id:id,x:x};K.m=add(g,cylGeo(.006,.006,.003,14),T(0x14283e),[x+(i>3?.02:0),.05,z],null,null,1);K.tip=fingertip(g,.01,0);K.tip.position.set(x+(i>3?.02:0),.056,z);keys[id]=K;});mouthPos=V3(-.16,0,0);}
    if(kind==='bassoon'||kind==='shakuhachi'||kind==='ocarina'){}
    outline(g);shadow(g,(o.x1||.35)-(o.x0||-.35)+.3,.16,-(o.r||.02)-.02,0);
    var lastKeys='';
    function show(spec){
      var on={};spec.split(' ').forEach(function(t){if(t)on[t]=1;});
      Object.keys(keys).forEach(function(id){var K=keys[id],half=on[id+'h']||(id==='T'&&on.Th),cl=!!on[id]||half;
        if(K.tip){K.tip.visible=cl;if(cl)K.tip.position.x=K.tipPos?K.tipPos.x+(half?.006:0):K.x;}
        if(K.m&&(K.type==='cup'||K.type==='lever'||K.type==='ring'))lit(K.m,cl,K.type==='ring'?C.green:C.greenD);
        if(K.type==='cup'&&K.m)K.m.position.y=(o.r+.002)-(cl?.0018:0);});
    }
    function countSpec(m,lo,hi,ids){var n=Math.round(clamp((hi-fold(m,lo,hi))/(hi-lo),0,1)*ids.length);return ids.slice(0,n).join(' ');}
    I.press=function(m,id){var ch=chartFor(kind,m),spec;
      if(ch){spec=ch.keys||'';}
      else if(kind==='bassoon')spec=countSpec(m,34,72,['L1','L2','L3','R1','R2','R3']);
      else if(kind==='shakuhachi')spec=countSpec(m,62,86,['T','L1','L2','R1','R2']);
      else spec=countSpec(m,69,89,['L1','L2','L3','L4','R1','R2','R3','R4']);
      I.held[id]=spec;show(spec);lastKeys=spec;
      var pretty=spec.replace(/\bOCT\b/,'octave key').replace(/\bREG\b/,'register key').replace(/\bPALM\b/,'palm keys').replace(/\bSIDE\b/,'side key').replace(/\bTh\b/,'half thumb');
      var fingers=spec.split(' ').filter(function(t){return/^[LR]\d|^T$/.test(t);}).length;
      I.cap=ch?(spec?(ch.w&&kind!=='oboe'?'Written '+nm(ch.w)+' · ':'')+fingers+' finger'+(fingers===1?'':'s')+(/octave|register|palm|side|half/.test(pretty)?' + '+pretty.split(' ').filter(function(t){return/key|keys|half|thumb/.test(t);}).slice(-2).join(' '):''):'All fingers up'):nm(m);
      I.fx.puff(mouthPos.clone(),V3(-.05,.04,0),.02);if(bellPos)I.fx.ring(bellPos.clone(),V3(1,0,0),.03);V.wake();};
    I.release=function(id){delete I.held[id];var last=null;for(var k in I.held)last=I.held[k];show(last||'');V.wake();};
    if(kind==='bassoon')V.cam([0,.35,1],[-.1,.02,0],.9,.2);
    else if(kind==='ocarina')V.cam([0,.7,1],[-.03,0,0],.4,.18);
    else if(kind==='shakuhachi')V.cam([0,.55,1],[-.02,0,0],.82,.09);
    else{var xa=Math.min(o.x0,mouthPos.x)-.03,xb=o.x1+(bellPos?.14:.03);V.cam([0,.55,1],[(xa+xb)/2,0,0],xb-xa,bellPos?.13:.09,12);}
    return I;
  }
  /* saxophone: a curved brass body with big pads and pearl touches */
  function sax(V,tenor){
    var I=base(V,tenor?'Tenor saxophone':'Alto saxophone'),g=I.group,k=tenor?1.25:1,br=T(C.brass,1),keys={};
    var body=grp(g,[0,0,0]);body.scale.setScalar(k);
    add(body,cylGeo(.036,.014,.44,32),br,[.09,0,0],[0,0,-Math.PI/2]);
    add(body,tubeGeo([[.31,0],[.35,-.01],[.375,.03],[.365,.08],[.33,.11]],.038,40),br);
    add(body,bellGeo(0,.11,.04,.085,2.2),DS(br),[.31,.115,0],[0,0,.45]);
    add(body,tubeGeo([[-.13,0],[-.17,.015],[-.2,.045],[-.24,.058]],.01,24),br);
    add(body,latheGeo([[.004,0],[.009,.01],[.0105,.04],[.009,.055],[.004,.06]],28),T(0x1c1c22),[-.24,.058,0],[0,0,Math.PI/2]);
    var defs=[['OCT',-.1,'lever'],['PALM',-.115,'lever'],['L1',-.05,'pearl'],['L2',-.015,'pearl'],['L3',.02,'pearl'],['LP',.05,'lever'],['SIDE',.11,'lever'],['R1',.13,'pearl'],['R2',.165,'pearl'],['R3',.2,'pearl'],['RP',.25,'lever']];
    defs.forEach(function(d){var id=d[0],x=d[1],rr=.012+(x+.1)*.05,K={id:id};
      if(d[2]==='pearl'){add(body,cylGeo(rr*1.6,rr*1.6,.006,28),br,[x,0,.026+(x+.1)*.03],[Math.PI/2,0,0]);K.m=add(body,cylGeo(.0065,.0065,.004,20),T(C.pearl),[x,.03+(x+.1)*.035,0]);K.tip=fingertip(body,.009,0);K.tip.position.set(x,.038+(x+.1)*.035,0);}
      else{K.m=add(body,rboxGeo(.014,.004,.01,.003),T(C.pearl),[x,id==='OCT'?-.02:.022+(x+.1)*.03,id==='SIDE'?.03:-.02]);}
      keys[id]=K;});
    outline(g);shadow(g,.8*k,.25*k,-.06*k,.06);
    function show(spec){var on={};spec.split(' ').forEach(function(t){if(t)on[t]=1;});Object.keys(keys).forEach(function(id){var K=keys[id],cl=!!on[id];if(K.tip)K.tip.visible=cl;lit(K.m,cl,C.green);});}
    I.press=function(m,id){var ch=chartFor(tenor?'tenorsax':'sax',m);I.held[id]=ch.keys;show(ch.keys);var f=ch.keys.split(' ').filter(function(t){return/^[LR]\d$/.test(t);}).length;
      I.cap='Written '+nm(ch.w)+' · '+(f?f+' finger'+(f>1?'s':''):'no fingers')+(/OCT/.test(ch.keys)?' + octave key':'')+(/PALM/.test(ch.keys)?' + palm keys':'')+(/SIDE/.test(ch.keys)?' + side key':'');
      I.fx.ring(V3(.36*k,.21*k,0),V3(.4,1,0),.06*k);V.wake();};
    I.release=function(id){delete I.held[id];var last=null;for(var kk in I.held)last=I.held[kk];show(last||'');V.wake();};
    V.cam([0,.35,1],[.07*k,.07*k,0],.68*k,.38*k);
    return I;
  }
  function panflute(V){
    var I=base(V,'Pan flute'),g=I.group,W=[0,2,4,5,7,9,11],ps=[];for(var m=60;m<=84;m++)if(W.indexOf(m%12)>=0)ps.push(m);
    ps.forEach(function(mm,i){var len=.26-i*.0135,x=-.12+i*.018,p=add(g,cylGeo(.008,.008,len,18),T(C.bamboo),[x,.1-len/2,0]);add(g,cylGeo(.0055,.0055,.002,14),T(0x3a2a10),[x,.1005,0],null,null,1);ps[i]={m:mm,mesh:p,x:x};});
    add(g,rboxGeo(.29,.012,.022,.004),T(0x8a4a24),[0,.06,0]);outline(g);shadow(g,.4,.12,-.18);
    I.press=function(m,id){var mm=fold(m,60,84),b=0,bd=99;ps.forEach(function(p,i){var d=Math.abs(p.m-mm);if(d<bd){bd=d;b=i;}});var P=ps[b];I.held[id]=P;lit(P.mesh,true,C.green);I.fx.puff(V3(P.x,.11,.02),V3(0,.05,.03),.02);I.cap=nm(P.m)+' pipe';V.wake();};
    I.release=function(id){var P=I.held[id];if(!P)return;delete I.held[id];if(!Object.keys(I.held).some(function(k){return I.held[k]===P;}))lit(P.mesh,false);V.wake();};
    V.cam([0,.15,1],[0,.0,0],.34,.3);
    return I;
  }
  function harmonica(V){
    var I=base(V,'Harmonica'),g=I.group,holes=[];
    add(g,rboxGeo(.104,.012,.03,.003),T(0xd8a35a),[0,0,0]);add(g,rboxGeo(.106,.008,.032,.003),T(C.chrome,1),[0,.01,0]);add(g,rboxGeo(.106,.008,.032,.003),T(C.chrome,1),[0,-.01,0]);
    for(var h=0;h<10;h++){var x=-.045+h*.01;holes.push({mesh:add(g,rboxGeo(.0065,.006,.002,.001),T(0x241408),[x,0,.0152],null,null,1),x:x});var lb=label(String(h+1),'brass');lb.scale.set(.006,.006,1);lb.position.set(x,.022,.016);g.add(lb);}
    outline(g);shadow(g,.16,.08,-.02);
    var BL=[60,64,67,72,76,79,84,88,91,96],DR=[62,67,71,74,77,81,83,86,89,93];
    I.press=function(m,id){var mm=fold(m,60,96),hi=BL.indexOf(mm),blow=true;if(hi<0){hi=DR.indexOf(mm);blow=false;}var bend=false;if(hi<0){bend=true;var bd=99;DR.forEach(function(d,i){if(Math.abs(d-mm)<bd){bd=Math.abs(d-mm);hi=i;}});blow=false;}
      var H2=holes[hi];I.held[id]=H2;lit(H2.mesh,true,C.green);I.fx.puff(V3(H2.x,0,blow?.03:.06),V3(0,.01,blow?.06:-.05),.012);I.cap='Hole '+(hi+1)+' · '+(blow?'blow':'draw (breathe in)')+(bend?' and bend':'');V.wake();};
    I.release=function(id){var H2=I.held[id];if(!H2)return;delete I.held[id];lit(H2.mesh,false);V.wake();};
    V.cam([0,.25,1],[0,.004,0],.13,.05);
    return I;
  }
  /* =============== MALLET BARS (one design: marimba, xylophone, vibraphone, glockenspiel) =============== */
  var MK={marimba:{n:'Marimba',lo:45,hi:96,bar:0x9a4520,res:0x34343b,head:0x7c5ccf,rl:1,bw:.036},
          xylo:{n:'Xylophone',lo:65,hi:101,bar:0xd27c3e,res:0x9aa0a6,head:0xd8452e,rl:.45,bw:.032},
          vibes:{n:'Vibraphone',lo:53,hi:89,bar:0xd9dee3,metal:1,res:0xe3b24a,head:0x3a6ad8,rl:.65,bw:.036,discs:1},
          bowedvibe:{n:'Bowed vibraphone',lo:53,hi:89,bar:0xd9dee3,metal:1,res:0xe3b24a,head:0x3a6ad8,rl:.65,bw:.036,bow:1},
          glock:{n:'Glockenspiel',lo:79,hi:108,bar:0xe9eef1,metal:1,head:0xebbd4c,bw:.024,box:1}};
  function mallets(V,kind){
    var o=MK[kind]||MK.marimba,I=base(V,o.n),g=I.group,W=[0,2,4,5,7,9,11],nat=[],m,bars={},bw=o.bw,discs=[],acc=[];
    for(m=o.lo;m<=o.hi;m++)if(W.indexOf(m%12)>=0)nat.push(m);
    var span=nat.length*bw,x0=-span/2,maxL=o.box?.13:.3,minL=o.box?.07:.15;
    function bl(i,n){return maxL-(maxL-minL)*i/Math.max(1,n-1);}
    nat.forEach(function(mm,i){var x=x0+i*bw+bw/2,L=bl(i,nat.length),b=add(g,rboxGeo(bw*.86,.016,L,.005),T(o.bar,o.metal),[x,0,L/2]);bars[mm]={m:b,x:x,z:L/2,y:0,L:L,t:0,a:0};
      if(o.rl){var rL=(.05+.25*(1-i/nat.length))*o.rl;add(g,cylGeo(bw*.33,bw*.33,rL,16),T(o.res,1),[x,-.04-rL/2,L/2]);if(o.discs)discs.push(add(g,cylGeo(bw*.3,bw*.3,.003,16),T(0xf6f6f6),[x,-.03,L/2],null,null,1));}});
    for(m=o.lo;m<=o.hi;m++){if(W.indexOf(m%12)>=0)continue;var L2=bars[m-1];if(!L2)continue;var x2=L2.x+bw/2,L3=L2.L*.85,z3=-.014-L3/2,b2=add(g,rboxGeo(bw*.8,.015,L3,.005),T(o.bar,o.metal),[x2,.022,z3]);bars[m]={m:b2,x:x2,z:z3,y:.022,L:L3,t:0,a:0};acc.push(bars[m]);
      if(o.rl){var rL2=(.04+.2*(1-(m-o.lo)/(o.hi-o.lo)))*o.rl;add(g,cylGeo(bw*.3,bw*.3,rL2,16),T(o.res,1),[x2,-.03-rL2/2,z3]);}}
    /* rails run under the two nodes of every bar, so they slope as the bars get shorter */
    function rail(a,b,fa,y){var za=a.z-a.L/2+a.L*fa,zb=b.z-b.L/2+b.L*fa,dx=b.x-a.x,dz=zb-za;add(g,rboxGeo(Math.hypot(dx,dz)+bw,.012,.016,.004),T(0x5a2a14),[(a.x+b.x)/2,y,(za+zb)/2],[0,-Math.atan2(dz,dx),0]);}
    var nf=bars[nat[0]],nl=bars[nat[nat.length-1]];rail(nf,nl,.224,-.014);rail(nf,nl,.776,-.014);if(acc.length>1){rail(acc[0],acc[acc.length-1],.224,.008);rail(acc[0],acc[acc.length-1],.776,.008);}
    if(o.box){add(g,rboxGeo(span+.08,.03,.3,.01),T(0x26262d),[0,-.03,-.005]);add(g,rboxGeo(span+.06,.004,.28,.004),T(0x8a2a2a),[0,-.012,-.005],null,null,1);}
    var rz=maxL*.75,ms=[0,1].map(function(i){var mg=grp(g,[x0+span*(i?.65:.35),.05,rz]);add(mg,cylGeo(.0028,.0028,.2,10),T(0xd8b47a),[0,.045,.09],[1.1,0,0]);add(mg,sphGeo(o.box?.011:.016),T(o.head),[0,0,0]);return{g:mg,x:mg.position.x,z:rz,tx:mg.position.x,tz:rz,t:1,rest:mg.position.x};});
    var bow=null;if(o.bow){bow=grp(g,[0,.05,.12]);add(bow,cylGeo(.003,.003,.5,10),T(0x5a2a14),[0,.25,0]);add(bow,rboxGeo(.004,.48,.002,.001),T(0xf6f0de),[.006,.25,0],null,null,1);bow.visible=false;}
    outline(g);shadow(g,span+.3,.5,-.32,0,-.04);
    var flip=0,dph=0;
    I.press=function(m,id){var mm=fold(m,o.lo,o.hi),B=bars[mm];if(!B)return;B.t++;lit(B.m,true,C.green);I.held[id]=B;
      if(bow){bow.visible=true;bow.position.set(B.x,.05,B.y>.01?B.z-B.L/2-.01:B.z+B.L/2+.01);}
      else{var M=ms[0],M2=ms[1];var pickM=Math.abs(M.x-B.x)<=Math.abs(M2.x-B.x)?(flip++%3===2?M2:M):(flip++%3===2?M:M2);pickM.tx=B.x;pickM.tz=B.z+B.L*.22;pickM.t=0;pickM.ty=B.y;}
      I.cap=nm(mm)+(Math.floor(mm/12)-1);V.wake();};
    I.release=function(id){var B=I.held[id];if(!B)return;delete I.held[id];B.t=Math.max(0,B.t-1);if(!B.t)lit(B.m,false);if(bow&&!Object.keys(I.held).length)bow.visible=false;V.wake();};
    var bph=0;
    I.tick.push(function(dt){var busy=false;
      ms.forEach(function(M){M.x+=(M.tx-M.x)*Math.min(1,dt*30);M.z+=(M.tz-M.z)*Math.min(1,dt*30);if(M.t<1){M.t=Math.min(1,M.t+dt*5);busy=true;}
        var hop=M.t<.35?(1-M.t/.35):(M.t-.35)/.65*.6+.0;var y=(M.ty||0)+.014+(M.t<1?hop*.05:.05);M.g.position.set(M.x,y,M.z);M.g.rotation.x=M.t<1?-.3*(1-hop):0;
        if(M.t>=1&&Math.abs(M.tx-M.x)>1e-4)busy=true;});
      if(o.discs&&Object.keys(I.held).length){dph+=dt*8;discs.forEach(function(d){d.rotation.y=dph;});busy=true;}
      if(bow&&bow.visible){bph+=dt*2;bow.position.y=.05+Math.sin(bph)*.06;busy=true;}
      return busy;});
    V.cam([0,1.3,1],[0,0,o.box?0:.01],span+.12,o.box?.34:.52);
    return I;
  }
  /* =============== HANGING TUBES: tubular bells, chimes, bells =============== */
  function tubes(V,kind){
    var I=base(V,kind==='bells'?'Bells':kind==='chimes'?'Chimes':'Tubular bells'),g=I.group,n=18,lo=kind==='chimes'?72:60,ts=[],col=kind==='bells'?C.gold:C.chrome;
    add(g,rboxGeo(.62,.025,.04,.01),T(0x5a2a14),[0,.72,0]);[-1,1].forEach(function(s){add(g,rboxGeo(.03,.76,.04,.01),T(0x5a2a14),[s*.3,.36,0]);});add(g,rboxGeo(.66,.03,.12,.01),T(0x5a2a14),[0,0,0]);
    for(var i=0;i<n;i++){var x=-.27+i*.032,len=.62-i*.019,tg=grp(g,[x,.7,0]);var tb=add(tg,cylGeo(.011,.011,len,20),T(col,1),[0,-len/2-.02,0]);add(tg,torGeo(.012,.003,20),T(col,1),[0,-.02,0],[Math.PI/2,0,0]);add(tg,cylGeo(.0012,.0012,.02,6),T(0x3a2a20),[0,-.01,0],null,null,1);ts.push({g:tg,m:tb,a:0,v:0,mm:lo+i,x:x});}
    var ham=grp(g,[0,.62,.06]);add(ham,cylGeo(.003,.003,.16,10),T(0xd8b47a),[0,-.08,.04],[.6,0,0]);add(ham,cylGeo(.014,.014,.035,16),T(0xf0e3c0),[0,0,0],[0,0,Math.PI/2]);var hs={t:1};
    outline(g);shadow(g,.8,.3,-.02);
    I.press=function(m,id){var mm=fold(m,lo,lo+n-1),T2=ts[mm-lo];T2.v+=.6;lit(T2.m,true,C.green);I.held[id]=T2;ham.position.x=T2.x;hs.t=0;I.cap=nm(mm)+(Math.floor(mm/12)-1);V.wake();};
    I.release=function(id){var T2=I.held[id];if(!T2)return;delete I.held[id];lit(T2.m,false);V.wake();};
    I.tick.push(function(dt){var busy=false;ts.forEach(function(T2){if(Math.abs(T2.v)>1e-4||Math.abs(T2.a)>1e-4){T2.v-=T2.a*60*dt;T2.v*=Math.pow(.25,dt);T2.a+=T2.v*dt;T2.g.rotation.x=T2.a;busy=true;}});
      if(hs.t<1){hs.t=Math.min(1,hs.t+dt*4);ham.rotation.x=-Math.sin(hs.t*Math.PI)*.5;ham.position.z=.06-.03*Math.sin(hs.t*Math.PI);busy=true;}return busy;});
    V.cam([0,.2,1],[0,.38,0],.7,.8);
    return I;
  }
  /* =============== MUSIC BOX =============== */
  function musicbox(V){
    var I=base(V,'Music box'),g=I.group,n=18,lo=72,tines=[];
    add(g,rboxGeo(.3,.08,.18,.012),T(0x9a4f26),[0,-.04,0]);add(g,rboxGeo(.28,.004,.16,.004),T(0x8a2a2a),[0,.001,0],null,null,1);add(g,rboxGeo(.3,.16,.012,.01),T(0x9a4f26),[0,.07,-.1],[-.25,0,0]);
    var cyl=add(g,cylGeo(.025,.025,.16,32),T(C.brass,1),[0,.03,-.03],[0,0,Math.PI/2]);var pins=grp(cyl,[0,0,0]);for(var p=0;p<40;p++){var a=p*2.39996,y=((p*37)%16)/16*.15-.075;add(pins,cylGeo(.0012,.0012,.006,6),T(C.chrome,1),[Math.cos(a)*.027,y,Math.sin(a)*.027],[0,0,a+Math.PI/2],null,1);}
    add(g,rboxGeo(.18,.01,.03,.003),T(0x9aa0a6,1),[0,.01,.05]);
    for(var i=0;i<n;i++){var x=-.08+i*.0094,len=.06-i*.0018,tg=grp(g,[x,.016,.05]);add(tg,rboxGeo(.006,.002,len,.0008),T(0xc9cfd4,1),[0,0,-len/2]);tines.push({g:tg,a:0,v:0,mm:lo+i*(i>11?1:1)});}
    outline(g);shadow(g,.4,.28,-.08);
    var spin=0;
    I.press=function(m,id){var mm=fold(m,lo,lo+n-1),Ti=tines[mm-lo];Ti.v-=.35;I.held[id]=Ti;I.cap=nm(mm)+(Math.floor(mm/12)-1);V.wake();};
    I.release=function(id){delete I.held[id];V.wake();};
    I.tick.push(function(dt){var busy=false;tines.forEach(function(Ti){if(Math.abs(Ti.v)>1e-4||Math.abs(Ti.a)>1e-4){Ti.v-=Ti.a*900*dt;Ti.v*=Math.pow(.05,dt);Ti.a+=Ti.v*dt;Ti.g.rotation.x=Ti.a;busy=true;}});
      if(Object.keys(I.held).length||busy){spin+=dt*.8;cyl.rotation.x=spin;busy=true;}return busy;});
    V.cam([0,.7,1],[0,.045,-.02],.36,.32);
    return I;
  }
  /* =============== KALIMBA =============== */
  function kalimba(V){
    var I=base(V,'Kalimba'),g=I.group,tines=[],order=[60,62,64,65,67,69,71,72,74,76,77,79,81,83,84,86,88];
    add(g,rboxGeo(.18,.03,.14,.02),T(0xc98a4a),[0,0,0]);add(g,cylGeo(.016,.016,.002,24),T(0x2a1408),[0,.016,.035],null,null,1);add(g,rboxGeo(.15,.008,.008,.003),T(C.chrome,1),[0,.02,-.02]);
    var nT=order.length;for(var i=0;i<nT;i++){var rank=i===0?0:Math.ceil(i/2)*(i%2?1:-1),x=rank*.0085,len=.085-Math.abs(rank)*.0045,tg=grp(g,[x,.025,-.02]);add(tg,rboxGeo(.0055,.002,len,.001),T(0xd5dbe0,1),[0,0,len/2]);tines.push({g:tg,m:order[i],a:0,v:0,x:x,len:len});}
    var thumb=fingertip(g,.012,0);outline(g);shadow(g,.26,.2,-.016);
    I.press=function(m,id){var mm=fold(m,60,88),b=0,bd=99;tines.forEach(function(t,i){var d=Math.abs(t.m-mm);if(d<bd){bd=d;b=i;}});var Ti=tines[b];Ti.v+=.5;I.held[id]=Ti;thumb.position.set(Ti.x,.032,-.02+Ti.len*.9);thumb.visible=true;thumb.userData.t=1;I.cap=nm(Ti.m)+' tine';V.wake();};
    I.release=function(id){delete I.held[id];V.wake();};
    I.tick.push(function(dt){var busy=false;tines.forEach(function(Ti){if(Math.abs(Ti.v)>1e-4||Math.abs(Ti.a)>1e-4){Ti.v-=Ti.a*700*dt;Ti.v*=Math.pow(.06,dt);Ti.a+=Ti.v*dt;Ti.g.rotation.x=-Ti.a;busy=true;}});
      if(thumb.visible){thumb.userData.t-=dt*3;if(thumb.userData.t<=0)thumb.visible=false;busy=true;}return busy;});
    V.cam([0,1,.6],[0,.01,0],.24,.18);
    return I;
  }
  /* =============== STEEL DRUM =============== */
  function steeldrum(V){
    var I=base(V,'Steel drum'),g=I.group,pads=[],notes=[[60,62,64,65,67,69,71,72],[74,76,77,79,81,83,84,86],[88,89,91,93]];
    add(g,cylGeo(.3,.29,.14,48),T(0xc9cfd4,1),[0,-.07,0]);add(g,cylGeo(.29,.29,.004,48),T(0xb7bec4,1),[0,.001,0],null,null,1);add(g,torGeo(.3,.008,64),T(0xeef2f4,1),[0,0,0],[Math.PI/2,0,0]);
    notes.forEach(function(ring,ri){var R=[.22,.13,.05][ri];ring.forEach(function(mm,i){var a=i/ring.length*TAU+ri*.3,p=add(g,cylGeo(1,1,.004,24),T(0xd5dbe0,1),[Math.cos(a)*R,.004,Math.sin(a)*R],null,[ri===2?.03:.045,1,ri===2?.022:.03]);p.rotation.y=-a;pads.push({m:mm,mesh:p,x:Math.cos(a)*R,z:Math.sin(a)*R});});});
    var st=grp(g,[0,.1,.2]);add(st,cylGeo(.003,.003,.2,8),T(0xd8b47a),[0,.1,.05],[-.5,0,0]);add(st,sphGeo(.014),T(0xd8452e),[0,0,0]);var ss={t:1};
    outline(g);shadow(g,.7,.7,-.15);
    I.press=function(m,id){var mm=fold(m,60,93),b=0,bd=99;pads.forEach(function(p,i){var d=Math.abs(p.m-mm);if(d<bd){bd=d;b=i;}});var P=pads[b];lit(P.mesh,true,C.green);I.held[id]=P;st.position.set(P.x,.1,P.z+.03);ss.t=0;I.cap=nm(P.m)+' note';V.wake();};
    I.release=function(id){var P=I.held[id];if(!P)return;delete I.held[id];lit(P.mesh,false);V.wake();};
    I.tick.push(function(dt){if(ss.t<1){ss.t=Math.min(1,ss.t+dt*5);st.position.y=.02+.08*Math.abs(Math.cos(ss.t*Math.PI));return true;}return false;});
    V.cam([0,1,.55],[0,-.03,.02],.66,.64);
    return I;
  }
  /* =============== WINE GLASSES =============== */
  function glasses(V){
    var I=base(V,'Wine glasses'),g=I.group,gl=[],notes=[72,74,76,77,79,81,83,84,86,88];
    notes.forEach(function(mm,i){var x=-.27+i*.06,gg=grp(g,[x,0,0]);add(gg,latheGeo([[.02,0],[.02,.004],[.003,.008],[.003,.05],[.006,.058],[.022,.075],[.026,.1],[.025,.12]],28),DS(T(0xcfe7f2)),[0,0,0]);
      var lvl=.068+.04*(1-i/notes.length),wtr=add(gg,cylGeo(.022,.012,lvl-.06,24),T(0x6fb6e6),[0,(lvl+.06)/2,0],null,null,1);gl.push({g:gg,m:mm,w:wtr,x:x,on:0});});
    var tip=fingertip(g,.009,0);outline(g);shadow(g,.7,.15,-.002);var ph=0,cur=null;
    I.press=function(m,id){var mm=fold(m,72,88),b=0,bd=99;gl.forEach(function(G,i){var d=Math.abs(G.m-mm);if(d<bd){bd=d;b=i;}});cur=gl[b];I.held[id]=cur;lit(cur.w,true,C.green);tip.visible=true;I.fx.ring(V3(cur.x,.12,0),V3(0,1,0),.03,0xbfe9ff);I.cap=nm(cur.m)+' glass';V.wake();};
    I.release=function(id){var G=I.held[id];if(!G)return;delete I.held[id];lit(G.w,false);if(!Object.keys(I.held).length){tip.visible=false;cur=null;}V.wake();};
    I.tick.push(function(dt){if(!cur)return false;ph+=dt*7;tip.position.set(cur.x+Math.cos(ph)*.025,.123,Math.sin(ph)*.025);return true;});
    V.cam([0,.35,1],[0,.06,0],.66,.16);
    return I;
  }
  /* =============== TIMPANI =============== */
  function timpani(V){
    var I=base(V,'Timpani'),g=I.group,drums=[],sz=[.2,.18,.162,.145],ranges=[40,45,50,55];
    var tx=-.76;sz.forEach(function(r,i){var x=tx+r;tx+=2*r+.05;var dg=grp(g,[x,0,0]);add(dg,latheGeo([[.0,-.24],[r*.6,-.22],[r*.95,-.11],[r,-.02],[r*1.02,0]],40),T(C.copper,1),[0,0,0]);var head=add(dg,cylGeo(r*1.0,r*1.0,.006,40),T(0xf4efe2),[0,.002,0]);add(dg,torGeo(r*1.02,.008,48),T(C.chrome,1),[0,0,0],[Math.PI/2,0,0]);
      for(var l=0;l<3;l++){var a=l/3*TAU+.5;add(dg,cylGeo(.007,.007,.3,8),T(C.chrome,1),[Math.cos(a)*r*.6,-.32,Math.sin(a)*r*.6]);}drums.push({g:dg,head:head,x:x,r:r,lo:ranges[i],s:1,v:0});});
    var ms=[0,1].map(function(i){var mg=grp(g,[-.2+i*.4,.12,.15]);add(mg,cylGeo(.004,.004,.26,8),T(0xd8b47a),[0,.058,.116],[1.1,0,0]);add(mg,sphGeo(.022),T(0xf3ede0),[0,0,0]);return{g:mg,t:1,x:mg.position.x,z:.15};}),flip=0;
    outline(g);shadow(g,1.6,.6,-.72);
    I.press=function(m,id){var mm=fold(m,40,62),b=0,bd=99;drums.forEach(function(D,i){var d=Math.abs(D.lo+3-mm);if(d<bd){bd=d;b=i;}});var D=drums[b];D.v=.06;lit(D.head,true,C.green);I.held[id]=D;var M=ms[flip++%2];M.x=D.x;M.z=.08;M.t=0;I.cap=nm(mm)+(Math.floor(mm/12)-1)+' · drum '+(b+1);V.wake();};
    I.release=function(id){var D=I.held[id];if(!D)return;delete I.held[id];lit(D.head,false);V.wake();};
    I.tick.push(function(dt){var busy=false;drums.forEach(function(D){if(D.v>1e-4){D.v*=Math.pow(.02,dt);D.head.scale.y=1+Math.sin(performance.now()*.06)*D.v*30;busy=true;}else D.head.scale.y=1;});
      ms.forEach(function(M){if(M.t<1){M.t=Math.min(1,M.t+dt*5);busy=true;}M.g.position.set(M.x,.02+.12*Math.abs(Math.cos(M.t*Math.PI/1)),M.z);});return busy;});
    V.cam([0,.8,1],[0,-.12,0],1.62,.62);
    return I;
  }
  /* =============== CHOIR and MICROPHONE =============== */
  function choir(V){
    var I=base(V,'Choir'),g=I.group,sing=[],robes=[0x7a2a3a,0x2e5a8a,0x2f6b4a,0x6a3a8a];
    ['Bass','Tenor','Alto','Soprano'].forEach(function(nmS,i){var x=-.33+i*.22,sg=grp(g,[x,0,0]);add(sg,latheGeo([[.0,0],[.085,0],[.07,.16],[.05,.24],[.0,.26]],32),T(robes[i]),[0,0,0]);add(sg,torGeo(.045,.012,24),T(0xf6f0e2),[0,.245,0],[Math.PI/2,0,0]);
      var head=grp(sg,[0,.31,0]);add(head,sphGeo(.055),T(C.skin),[0,0,0]);add(head,sphGeo(.058),T([0x3a2416,0x6a3a1c,0x1e1a18,0xc98a3a][i]),[0,.012,-.006],null,[1,.85,1]);
      [-1,1].forEach(function(s){add(head,sphGeo(.007),T(0x22160e),[s*.018,.008,.051],null,null,1);});var mouth=add(head,sphGeo(.012),T(0x5a1a14),[0,-.022,.05],null,[1.2,.25,.4],1);
      add(sg,rboxGeo(.07,.05,.01,.004),T(0x1e1e24),[0,.17,.07],[-.4,0,0]);sing.push({g:sg,head:head,mouth:mouth,o:0,t:0,x:x,name:nmS});});
    outline(g);shadow(g,1,.3,-.002);var bob=0;
    I.press=function(m,id){var i=m<52?0:m<60?1:m<67?2:3,S=sing[i];S.t++;I.held[id]=S;I.fx.note(V3(S.x+.04,.42,.05),.05);I.cap=S.name+' sings '+nm(m)+(Math.floor(m/12)-1);V.wake();};
    I.release=function(id){var S=I.held[id];if(!S)return;delete I.held[id];S.t=Math.max(0,S.t-1);V.wake();};
    I.tick.push(function(dt){var busy=false;bob+=dt*3;sing.forEach(function(S){if(spring(S,'o',S.t?1:0,12,dt))busy=true;S.mouth.scale.set(1.2-S.o*.2,.25+S.o*1.1,.4);S.head.rotation.x=-S.o*.12;S.head.position.y=.31+S.o*.008*Math.sin(bob);if(S.t)busy=true;});return busy;});
    V.cam([0,.15,1],[0,.2,0],.9,.48);
    return I;
  }
  function mic(V){
    var I=base(V,'Voice'),g=I.group;
    add(g,cylGeo(.004,.004,.3,10),T(0x2c2c33,1),[0,.15,0]);add(g,cylGeo(.06,.06,.01,32),T(0x2c2c33,1),[0,0,0]);var head=grp(g,[0,.34,0]);var gr=add(head,sphGeo(.035),T(0xcfd5da,1),[0,.03,0],null,[1,1.3,1]);add(head,cylGeo(.025,.02,.06,24),T(0x2c2c33,1),[0,-.02,0]);
    outline(g);shadow(g,.2,.2,-.002);
    I.press=function(m,id){I.held[id]=1;lit(gr,true,C.green);I.fx.ring(V3(0,.38,.04),V3(0,0,1),.05);I.cap=nm(m);V.wake();};
    I.release=function(id){delete I.held[id];if(!Object.keys(I.held).length)lit(gr,false);V.wake();};
    V.cam([0,.1,1],[0,.22,0],.3,.46);
    return I;
  }
  /* =============== which model each instrument uses =============== */
  var MAP={
    piano:['kb','grand'],upright:['kb','upright'],epiano:['kb','rhodes'],wurli:['kb','wurli'],fmep:['kb','fm'],clav:['kb','clav'],harpsi:['kb','harpsi'],celesta:['kb','celesta'],
    organ:['kb','pipes'],drawbar:['kb','drawbar'],harmonium:['kb','harmonium'],accordion:['acc'],
    tronflute:['kb','tron'],tronstrings:['kb','tron'],tronchoir:['kb','tron'],
    steel:['gt','steel'],nylon:['gt','nylon'],jazzgtr:['gt','jazzgtr'],eguitar:['gt','eguitar'],oguitar:['gt','oguitar'],spluck:['kb','synth'],
    ebass:['gt','ebass'],slapbass:['gt','slapbass'],jazzbass:['bw','dbass',1],contrabass:['bw','dbass'],sbass:['kb','synth'],subbass:['kb','synth'],sub808:['kb','synth'],
    strings:['bw','violin'],pizz:['bw','violin',1],violin:['bw','violin'],cello:['bw','cello'],harp:['harp'],
    trumpet:['tpt'],mutedtpt:['tpt',1],brass:['tpt'],trombone:['tbn'],horn:['horn'],tuba:['tuba'],
    flute:['wind','flute'],piccolo:['wind','piccolo'],recorder:['wind','recorder'],oboe:['wind','oboe'],clarinet:['wind','clarinet'],bassoon:['wind','bassoon'],
    sax:['sax'],tenorsax:['sax',1],panflute:['pan'],
    sitar:['gt','sitar'],shamisen:['gt','shamisen'],banjo:['gt','banjo'],koto:['zit','koto'],dulcimer:['zit','dulcimer'],steeldrum:['steel'],kalimba:['kal'],
    shakuhachi:['wind','shakuhachi'],ocarina:['wind','ocarina'],harmonica:['hca'],
    vibes:['mal','vibes'],bowedvibe:['mal','bowedvibe'],marimba:['mal','marimba'],xylo:['mal','xylo'],glock:['mal','glock'],
    musicbox:['mbox'],tubular:['tub','tubular'],chimes:['tub','chimes'],bells:['tub','bells'],glasses:['gls'],timpani:['timp'],
    choir:['choir'],oohs:['choir'],synchoir:['choir'],
    juno:['kb','synth'],junopad:['kb','pad'],lead:['kb','synth'],pad:['kb','pad'],
    voice:['mic']
  };
  function build(V,id){
    var e=MAP[id]||MAP.piano,k=e[0];
    if(k==='kb')return keyboard(V,e[1]);if(k==='acc')return accordion(V);if(k==='gt')return guitar(V,e[1]);if(k==='bw')return bowed(V,e[1],!!e[2]);
    if(k==='harp')return harp(V);if(k==='zit')return zither(V,e[1]);if(k==='tpt')return trumpet(V,!!e[1]);if(k==='tbn')return trombone(V);if(k==='horn')return horn(V);if(k==='tuba')return tuba(V);
    if(k==='wind')return wind(V,e[1]);if(k==='sax')return sax(V,!!e[1]);if(k==='pan')return panflute(V);if(k==='hca')return harmonica(V);
    if(k==='mal')return mallets(V,e[1]);if(k==='tub')return tubes(V,e[1]);if(k==='mbox')return musicbox(V);if(k==='kal')return kalimba(V);if(k==='steel')return steeldrum(V);
    if(k==='gls')return glasses(V);if(k==='timp')return timpani(V);if(k==='choir')return choir(V);return mic(V);
  }
  /* =============== the view: one canvas, renders only while something moves =============== */
  /* give back GPU memory of a model we no longer show (shared shapes and colours stay) */
  function free(root){root.traverse(function(o){
    if(o.isMesh&&o.geometry&&!o.geometry.userData.keep&&!o.userData.ol){if(o.geometry.userData.olg)o.geometry.userData.olg.dispose();o.geometry.dispose();}
    var m=o.material;if(m&&m.userData&&!m.userData.keep){if(m.map&&m.map!==SOFT)m.map.dispose();m.dispose();}});}
  function view(canvas){
    var r=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'low-power'});
    r.setPixelRatio(Math.min(2,Math.max(1.5,window.devicePixelRatio||1)));r.toneMapping=THREE.NoToneMapping;r.setClearColor(0x000000,0);
    var scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff6e8,0x8a7058,1.25));
    var key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(-.8,2.4,1.8);scene.add(key);
    var cam=new THREE.PerspectiveCamera(24,4,.01,30),inst=null,curId=null,raf=0,last=0,fit=null,alive=true,size=[0,0];
    var V={
      /* aim at `look` from direction `dir`, backing off until a w x h area fits the strip */
      cam:function(dir,look,w,h,fov){fit={dir:new THREE.Vector3(dir[0],dir[1],dir[2]).normalize(),look:new THREE.Vector3(look[0],look[1],look[2]||0),w:w,h:h};cam.fov=fov||18;place();},
      /* minMs caps the frame rate (the app passes 33 ms = 30 frames a second, 66 in low-power mode) */
      minMs:0,
      wake:function(){if(!raf&&alive){last=performance.now()-Math.max(16,V.minMs);raf=requestAnimationFrame(loop);}},
      show:function(id){
        if(id===curId&&inst)return inst;
        if(inst){scene.remove(inst.group);free(inst.group);}
        curId=id;inst=build(V,id);scene.add(inst.group);V.wake();return inst;},
      press:function(m,id,vel){if(!inst)return;try{inst.press(m,id,vel==null?.8:vel);}catch(e){}V.wake();},
      release:function(id){if(!inst)return;try{inst.release(id);}catch(e){}V.wake();},
      clear:function(){if(!inst)return;Object.keys(inst.held).forEach(function(id){V.release(id);});},
      caption:function(){return inst?inst.caption():'';},
      name:function(){return inst?inst.name:'';},
      resize:function(){place();},
      dispose:function(){alive=false;if(raf)cancelAnimationFrame(raf);raf=0;r.dispose();}
    };
    function place(){
      var w=canvas.clientWidth||600,h=canvas.clientHeight||150;
      if(w!==size[0]||h!==size[1]){size=[w,h];r.setSize(w,h,false);OL.uniforms.res.value.set(w,h);}
      cam.aspect=w/h;
      if(fit){var t=Math.tan(cam.fov*Math.PI/360),d=Math.max(fit.h/(2*t),fit.w/(2*t*cam.aspect))*1.1;
        cam.position.copy(fit.look).addScaledVector(fit.dir,d);cam.near=Math.max(.005,d*.05);cam.far=d*12;cam.lookAt(fit.look);}
      cam.updateProjectionMatrix();V.wake();
    }
    function loop(t){
      raf=0;if(!alive)return;
      if(V.minMs&&t-last<V.minMs-3){raf=requestAnimationFrame(loop);return;}
      if(canvas.clientWidth!==size[0]||canvas.clientHeight!==size[1])place();
      var dt=Math.min(.07,Math.max(0,(t-last)/1000));last=t;var busy=false;
      try{busy=inst?inst.update(dt):false;}catch(e){busy=false;}
      if(size[0]>0&&size[1]>0)r.render(scene,cam);
      if(busy)raf=requestAnimationFrame(loop);
    }
    return V;
  }
  return{view:view,has:function(id){return!!MAP[id];},map:MAP};
}
