/* =============== 3D INSTRUMENTS (three.js) ===============
   Realistic instruments built in code and lit like a studio photo: the moving parts react to every note.
   VZ3D(THREE) returns {view(canvas)}. A view holds one instrument at a time:
   view.show(kind) builds it, view.press(midi,id,vel) / view.release(id) animate it, view.caption() describes it. */
function VZ3D(THREE,H){
  var TAU=Math.PI*2;H=H||{};
  var NN=H.noteNames||['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  /* ---------- shared materials and procedural textures ---------- */
  function canvasTex(w,h,draw,repeat){
    var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}return t;
  }
  function rnd(seed){var s=seed||1;return function(){s=(s*16807)%2147483647;return(s-1)/2147483646;};}
  function grain(base,line,dark,seed,wide){
    return canvasTex(1024,256,function(g,w,h){
      var r=rnd(seed||7);g.fillStyle=base;g.fillRect(0,0,w,h);
      for(var i=0;i<(wide?60:180);i++){var y=r()*h,a=.05+r()*.18,amp=1+r()*4,ph=r()*TAU,fr=.002+r()*.006;
        g.strokeStyle=r()<.5?line:dark;g.globalAlpha=a;g.lineWidth=wide?(1+r()*5):(.5+r()*1.6);g.beginPath();
        for(var x=0;x<=w;x+=16){var yy=y+Math.sin(x*fr+ph)*amp;if(x)g.lineTo(x,yy);else g.moveTo(x,yy);}g.stroke();}
      g.globalAlpha=1;
    },true);
  }
  var M=null;
  function mats(){
    if(M)return M;M={};
    M.spruceTex=grain('#d9a456','#b47a32','#e8bd74',3);
    M.roseTex=grain('#3a2417','#24140b','#4a2e1d',5);
    M.mahogTex=grain('#7a381b','#4f210d','#8f4a26',9,true);
    M.mapleTex=grain('#ecd3a2','#d6b276','#f6e3bf',11);
    M.spruce=new THREE.MeshPhysicalMaterial({map:M.spruceTex,roughness:.5,clearcoat:.25,clearcoatRoughness:.35,envMapIntensity:.3});
    M.rose=new THREE.MeshStandardMaterial({map:M.roseTex,roughness:.65});
    M.mahog=new THREE.MeshPhysicalMaterial({map:M.mahogTex,roughness:.5,clearcoat:.25,clearcoatRoughness:.35,envMapIntensity:.3});
    M.ebony=new THREE.MeshStandardMaterial({color:0x14110f,roughness:.45});
    M.bone=new THREE.MeshStandardMaterial({color:0xf1e9d6,roughness:.4});
    M.nickel=new THREE.MeshStandardMaterial({color:0xd9d6cf,metalness:1,roughness:.28});
    M.chrome=new THREE.MeshStandardMaterial({color:0xf2f2f2,metalness:1,roughness:.12});
    M.bronze=new THREE.MeshStandardMaterial({color:0xc7924c,metalness:1,roughness:.32});
    M.steel=new THREE.MeshStandardMaterial({color:0xe6e6e6,metalness:1,roughness:.22});
    M.brass=new THREE.MeshPhysicalMaterial({color:0xe2aa48,metalness:1,roughness:.2,clearcoat:.6,clearcoatRoughness:.1});
    M.silver=new THREE.MeshStandardMaterial({color:0xeef0f2,metalness:1,roughness:.16});
    M.pearl=new THREE.MeshPhysicalMaterial({color:0xf4eee6,roughness:.18,clearcoat:1,sheen:1,sheenColor:new THREE.Color(0xd8e8ff),iridescence:.6});
    M.black=new THREE.MeshPhysicalMaterial({color:0x070707,roughness:.3,clearcoat:.5,clearcoatRoughness:.15,envMapIntensity:.22});
    M.ivory=new THREE.MeshPhysicalMaterial({color:0xece4d2,roughness:.34,clearcoat:.2,envMapIntensity:.4});
    M.ebonyKey=new THREE.MeshPhysicalMaterial({color:0x0c0c0e,roughness:.28,clearcoat:.5,envMapIntensity:.25});
    M.skin=new THREE.MeshPhysicalMaterial({color:0xe2a888,roughness:.55,sheen:.6,sheenColor:new THREE.Color(0xffd0b8)});
    M.tort=new THREE.MeshPhysicalMaterial({map:canvasTex(256,256,function(g,w,h){var r=rnd(17);g.fillStyle='#2a0f05';g.fillRect(0,0,w,h);for(var i=0;i<140;i++){g.fillStyle=['#5e260b','#7d3812','#140602','#9a5320'][Math.floor(r()*4)];g.globalAlpha=.3+r()*.5;g.beginPath();g.ellipse(r()*w,r()*h,2+r()*12,1+r()*5,r()*3,0,TAU);g.fill();}},true),roughness:.3,clearcoat:.6,envMapIntensity:.3});M.tort.map.repeat.set(12,12);
    M.hole=new THREE.MeshBasicMaterial({color:0x050302});
    return M;
  }
  function room(renderer){
    /* a soft studio room for reflections (brass, lacquer, chrome) */
    var s=new THREE.Scene(),g=new THREE.BoxGeometry(),wall=new THREE.MeshStandardMaterial({side:THREE.BackSide,color:0x8a7a6a,roughness:1});
    var r=new THREE.Mesh(g,wall);r.scale.set(30,14,30);r.position.set(0,6,0);s.add(r);
    s.add(new THREE.PointLight(0xffffff,250,40,2));
    function panel(i,x,y,z,sx,sy,sz){var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:new THREE.Color(i,i*.96,i*.9)}));m.position.set(x,y,z);m.scale.set(sx,sy,sz);s.add(m);}
    panel(9,0,12.9,0,10,.1,4);panel(6,-14.8,6,-4,.1,5,7);panel(4,14.8,7,3,.1,4,5);panel(3,0,6,-14.8,9,3,.1);panel(2,-6,12.9,8,4,.1,4);
    var pm=new THREE.PMREMGenerator(renderer),t=pm.fromScene(s,.04).texture;pm.dispose();return t;
  }
  function label(text,opt){
    opt=opt||{};var t=canvasTex(128,128,function(g,w,h){g.fillStyle=opt.bg||'rgba(16,40,28,.92)';g.beginPath();g.arc(64,64,58,0,TAU);g.fill();g.lineWidth=7;g.strokeStyle=opt.ring||'#a9e6c5';g.stroke();
      g.fillStyle=opt.fg||'#eafff3';g.font='800 72px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,64,68);});
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.renderOrder=10;return s;
  }
  function tube(points,r,seg,mat,closed){var c=new THREE.CatmullRomCurve3(points.map(function(p){return new THREE.Vector3(p[0],p[1],p[2]||0);}),false,'catmullrom',.5);return new THREE.Mesh(new THREE.TubeGeometry(c,seg||64,r,14,!!closed),mat);}
  function cyl(rt,rb,h,mat,seg){return new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||24),mat);}
  function box(x,y,z,mat){return new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat);}
  var GLOW=new THREE.Color(0x35c27e);
  function tint(mesh,on,amt){var m=mesh.material;if(!m._own){m=mesh.material=m.clone();m._own=true;m._base=m.color.clone();}m.emissive=on?GLOW:new THREE.Color(0);m.emissiveIntensity=on?(amt||.55):0;
    if(m._base){if(on){var l=m._base.getHSL({}).l;m.color.copy(l>.5?new THREE.Color(0x9fdcba):new THREE.Color(0x1d6e48));}else m.color.copy(m._base);}}
  /* ---------- PIANO ---------- */
  function piano(view){
    var m=mats(),g=new THREE.Group(),keys={},W=[0,2,4,5,7,9,11],ww=.0235,wl=.15,wh=.02,lo=21,hi=108,whites=[];
    for(var k=lo;k<=hi;k++)if(W.indexOf(k%12)>=0)whites.push(k);
    var x0=-whites.length*ww/2;
    whites.forEach(function(k,i){var p=new THREE.Group();p.position.set(x0+i*ww+ww/2,0,-wl/2);var key=box(ww-.0012,wh,wl,m.ivory);key.position.set(0,-wh/2,wl/2);p.add(key);g.add(p);keys[k]={p:p,mesh:key,x:p.position.x,a:0,t:0};});
    for(k=lo;k<=hi;k++){if(W.indexOf(k%12)>=0)continue;var L=keys[k-1];if(!L)continue;var p2=new THREE.Group();p2.position.set(L.x+ww/2,.011,-wl/2);var bk=box(.0128,.016,.095,m.ebonyKey);bk.position.set(0,-.004,.0475);p2.add(bk);g.add(p2);keys[k]={p:p2,mesh:bk,x:p2.position.x,a:0,t:0,black:1};}
    var W2=whites.length*ww;
    var slip=box(W2+.02,.03,.016,m.black);slip.position.set(0,-.012,wl/2+.008);g.add(slip);
    var bed=box(W2+.02,.01,wl+.02,m.black);bed.position.set(0,-.026,0);g.add(bed);
    [-1,1].forEach(function(s){var c=box(.05,.05,wl+.05,m.black);c.position.set(s*(W2/2+.035),-.005,-.01);g.add(c);});
    var fall=box(W2+.12,.11,.014,m.black);fall.position.set(0,.045,-wl/2-.03);fall.rotation.x=-.18;g.add(fall);
    var logo=new THREE.Mesh(new THREE.PlaneGeometry(.22,.034),new THREE.MeshBasicMaterial({map:canvasTex(512,80,function(c,w,h){c.fillStyle='#d4a65e';c.font='600 46px Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.fillText('J A M   R O O M',w/2,h/2+2);}),transparent:true}));
    logo.position.set(0,.05,-wl/2-.022);logo.rotation.x=-.18;g.add(logo);
    view.cam(new THREE.Vector3(0,.3,.62),new THREE.Vector3(0,-.01,-.03),18,W2+.14,.2);
    return{group:g,name:'Piano',
      press:function(mm,id){var K=keys[mm];if(!K)return;K.t++;tint(K.mesh,true,K.black?.9:.45);view.wake();return{K:K};},
      release:function(h){if(!h||!h.K)return;h.K.t=Math.max(0,h.K.t-1);if(!h.K.t)tint(h.K.mesh,false);view.wake();},
      update:function(dt){var busy=false;Object.keys(keys).forEach(function(k){var K=keys[k],tg=K.t?.065:0;if(Math.abs(K.a-tg)>1e-4){K.a+=(tg-K.a)*Math.min(1,dt*(K.t?40:22));K.p.rotation.x=K.a;busy=true;}});return busy;}};
  }
  /* ---------- GUITAR (acoustic) ---------- */
  var GTUNE=[40,45,50,55,59,64];
  function guitar(view,opt){
    opt=opt||{};var m=mats(),g=new THREE.Group(),nutX=-.36,scale=.645,saddleX=nutX+scale,top=.10;
    function fx(f){return nutX+scale*(1-Math.pow(2,-f/12));}
    /* body outline (x along the guitar, y across it) */
    var sh=new THREE.Shape();
    function P(x,y){return[(x-300)/220*.52-.02,(y-75)/142*.40];}
    var a=P(300,37);sh.moveTo(a[0],a[1]);
    [[300,18,330,14,352,16],[375,18,385,30,400,30],[420,30,430,4,470,4],[505,4,520,40,520,75],[520,110,505,146,470,146],[430,146,420,120,400,120],[385,120,375,132,352,134],[330,136,300,132,300,113]].forEach(function(c){var p1=P(c[0],c[1]),p2=P(c[2],c[3]),p3=P(c[4],c[5]);sh.bezierCurveTo(p1[0],p1[1],p2[0],p2[1],p3[0],p3[1]);});
    sh.closePath();
    var bodyG=new THREE.ExtrudeGeometry(sh,{depth:top,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:3,curveSegments:48});
    m.spruceTex.repeat.set(3,5);m.mahogTex.repeat.set(4,4);
    var sideMat=m.mahog,body=new THREE.Mesh(bodyG,[m.spruce,sideMat]);body.rotation.x=-Math.PI/2;g.add(body);
    var binding=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.003,bevelEnabled:false,curveSegments:48}),new THREE.MeshStandardMaterial({color:0xf0e6d0,roughness:.4}));binding.rotation.x=-Math.PI/2;binding.position.y=top+.0035;binding.scale.set(1.004,1.004,1);
    /* soundhole and rosette */
    var shx=.105,hole=new THREE.Mesh(new THREE.CircleGeometry(.05,48),m.hole);hole.rotation.x=-Math.PI/2;hole.position.set(shx,top+.0045,0);g.add(hole);
    var ros=new THREE.Mesh(new THREE.RingGeometry(.053,.066,64),new THREE.MeshStandardMaterial({map:canvasTex(512,64,function(c,w,h){var r=rnd(4);for(var x=0;x<w;x+=4){c.fillStyle=['#2a140a','#d9c08a','#6d3a1a','#efe2c0','#1a0d06'][Math.floor(r()*5)];c.fillRect(x,0,4,h);}c.fillStyle='#120804';c.fillRect(0,0,w,6);c.fillRect(0,h-6,w,6);},true),roughness:.4}));
    ros.rotation.x=-Math.PI/2;ros.position.set(shx,top+.0046,0);g.add(ros);
    var guard=new THREE.Shape();guard.moveTo(.075,-.058);guard.bezierCurveTo(.115,-.052,.17,-.065,.178,-.098);guard.bezierCurveTo(.182,-.128,.135,-.135,.105,-.126);guard.bezierCurveTo(.08,-.118,.068,-.088,.075,-.058);
    var pg=new THREE.Mesh(new THREE.ExtrudeGeometry(guard,{depth:.0015,bevelEnabled:false}),m.tort);pg.rotation.x=-Math.PI/2;pg.position.y=top+.0042;g.add(pg);
    /* bridge */
    var saddleX=nutX+scale,br=box(.032,.009,.16,m.rose);br.position.set(saddleX+.012,top+.0085,0);g.add(br);
    var sad=box(.003,.006,.076,m.bone);sad.position.set(saddleX,top+.014,0);g.add(sad);
    for(var i=0;i<6;i++){var pin=cyl(.0028,.0028,.004,m.bone,12);pin.position.set(saddleX+.02,top+.014,(i-2.5)*.0105);g.add(pin);}
    /* neck, fretboard, frets, inlays */
    var nw0=.046,nw1=.058,endX=.045;
    var nk=new THREE.Shape();nk.moveTo(nutX,-nw0/2-.002);nk.lineTo(.0,-nw1/2);nk.lineTo(.0,nw1/2);nk.lineTo(nutX,nw0/2+.002);nk.closePath();
    var neck=new THREE.Mesh(new THREE.ExtrudeGeometry(nk,{depth:.024,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:4}),m.mahog);neck.rotation.x=-Math.PI/2;neck.position.y=top-.024;g.add(neck);
    var fb=new THREE.Shape();fb.moveTo(nutX,-nw0/2);fb.lineTo(endX,-(nw0+(nw1-nw0)*(endX-nutX)/(-nutX))/2-.002);fb.lineTo(endX,(nw0+(nw1-nw0)*(endX-nutX)/(-nutX))/2+.002);fb.lineTo(nutX,nw0/2);fb.closePath();
    m.roseTex.repeat.set(1.5,6);
    var board=new THREE.Mesh(new THREE.ExtrudeGeometry(fb,{depth:.006,bevelEnabled:false}),m.rose);board.rotation.x=-Math.PI/2;board.position.y=top+.002;g.add(board);
    var fbTop=top+.008;
    function wAt(x){return nw0+(nw1-nw0)*(x-nutX)/(-nutX);}
    for(var f=1;f<=20;f++){var x=fx(f);if(x>endX)break;var fr=cyl(.0011,.0011,wAt(x)+.002,m.nickel,8);fr.rotation.x=Math.PI/2;fr.position.set(x,fbTop,0);g.add(fr);}
    [3,5,7,9,15,17].forEach(function(f){var x=(fx(f)+fx(f-1))/2,d=cyl(.0032,.0032,.0008,new THREE.MeshPhysicalMaterial({color:0xf3f0ea,roughness:.2,iridescence:.5,clearcoat:1}),20);d.position.set(x,fbTop,0);g.add(d);});
    [-1,1].forEach(function(s){var x=(fx(12)+fx(11))/2,d=cyl(.0032,.0032,.0008,m.pearl,20);d.position.set(x,fbTop,s*.012);g.add(d);});
    var nut=box(.005,.006,nw0,m.bone);nut.position.set(nutX-.0025,fbTop+.002,0);g.add(nut);
    /* headstock with tuners */
    var hs=new THREE.Shape();hs.moveTo(nutX-.004,-nw0/2);hs.lineTo(nutX-.16,-.044);hs.quadraticCurveTo(nutX-.19,-.04,nutX-.19,0);hs.quadraticCurveTo(nutX-.19,.04,nutX-.16,.044);hs.lineTo(nutX-.004,nw0/2);hs.closePath();
    var head=new THREE.Mesh(new THREE.ExtrudeGeometry(hs,{depth:.016,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:2}),[new THREE.MeshPhysicalMaterial({color:0x1a0f0a,roughness:.3,clearcoat:.8}),m.mahog]);
    head.rotation.x=-Math.PI/2;head.position.y=top-.006;g.add(head);
    var posts=[];
    for(i=0;i<6;i++){var side=i<3?-1:1,j=i<3?i:5-i,px=nutX-.045-j*.035,pz=side*.026;var post=cyl(.003,.003,.02,m.chrome,12);post.position.set(px,top+.014,pz);g.add(post);posts.push([px,pz]);
      var btn=new THREE.Mesh(new THREE.SphereGeometry(.009,16,10),m.chrome);btn.scale.set(.7,.5,1.3);btn.position.set(px,top+.004,side*.07);g.add(btn);var sh2=cyl(.002,.002,.03,m.chrome,8);sh2.rotation.x=Math.PI/2;sh2.position.set(px,top+.004,side*.055);g.add(sh2);}
    /* strings: thin ribbons that can vibrate */
    var strs=[],N=48;
    for(i=0;i<6;i++){
      var zN=(i-2.5)*.0072,zS=(i-2.5)*.0105,yN=fbTop+.0035,yS=top+.0175,w=.0026-i*.00028;
      var geo=new THREE.BufferGeometry(),pos=new Float32Array((N+1)*2*3),idx=[];
      for(var q=0;q<N;q++){var a2=q*2;idx.push(a2,a2+1,a2+2,a2+1,a2+3,a2+2);}
      geo.setIndex(idx);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
      var mat=(i<4?m.bronze:m.steel).clone();var mesh=new THREE.Mesh(geo,mat);g.add(mesh);
      var S={i:i,mesh:mesh,geo:geo,pos:pos,zN:zN,zS:zS,yN:yN,yS:yS,w:w,amp:0,ph:0,from:0,t:0};strs.push(S);setString(S,0);
      var pp=posts[i],seg=tube([[nutX,yN,zN],[pp[0],top+.02,pp[1]]],.0005,4,mat);g.add(seg);
    }
    function setString(S,time){
      var x0=fx(S.from),x1=saddleX;
      for(var q=0;q<=N;q++){var u=q/N,x=nutX+(x1-nutX)*u,zc=S.zN+(S.zS-S.zN)*u,yc=S.yN+(S.yS-S.yN)*u;
        var dz=0;if(S.amp>1e-5&&x>x0){var v=(x-x0)/(x1-x0);dz=S.amp*Math.sin(Math.PI*v)*Math.sin(S.ph);}
        if(S.from>0&&x<=x0+.0005){}/* the fretted part stays still */
        var b=q*6;S.pos[b]=x;S.pos[b+1]=yc;S.pos[b+2]=zc-S.w/2+dz;S.pos[b+3]=x;S.pos[b+4]=yc;S.pos[b+5]=zc+S.w/2+dz;}
      S.geo.attributes.position.needsUpdate=true;S.geo.computeBoundingSphere();
    }
    /* fingertips with finger numbers, and a pick */
    var tips=[];for(i=0;i<4;i++){var tip=new THREE.Group(),ball=new THREE.Mesh(new THREE.SphereGeometry(.0095,20,14),m.skin);ball.scale.set(1.35,.6,1);tip.add(ball);var lb=label(String(i+1));lb.scale.set(.02,.02,1);lb.position.set(0,.018,0);tip.add(lb);tip.visible=false;g.add(tip);tips.push({g:tip,s:0,t:0});}
    var pk=new THREE.Shape();pk.moveTo(0,.012);pk.quadraticCurveTo(.012,.012,.011,0);pk.quadraticCurveTo(.006,-.012,0,-.016);pk.quadraticCurveTo(-.006,-.012,-.011,0);pk.quadraticCurveTo(-.012,.012,0,.012);
    var pick=new THREE.Mesh(new THREE.ExtrudeGeometry(pk,{depth:.0012,bevelEnabled:false}),m.tort);pick.rotation.x=-Math.PI/2;pick.position.set(.19,top+.026,-.05);g.add(pick);
    var pickT={z:-.05,vz:0,strum:0};
    /* which string and fret: stay near where the hand already is */
    var hand=1,held={},group=[];
    function place(list,exclude){
      /* list of midi notes played together; returns [{s,f}] or null */
      var best=null,bs=1e9,n=list.length,used=[];
      Object.keys(held).forEach(function(k){var h=held[k];if(h.at&&(!exclude||exclude.indexOf(h)<0))used.push(h.at.s);});
      (function rec(i,cur){
        if(i===n){var fr=cur.filter(function(c){return c.f>0;}).map(function(c){return c.f;}),mn=fr.length?Math.min.apply(null,fr):hand,mx=fr.length?Math.max.apply(null,fr):hand;if(mx-mn>4)return;
          var cost=Math.abs(mn-hand)*.6+(mx-mn)*.4+cur.reduce(function(a,c){return a+(c.f===0?.2:c.f*.04);},0);if(cost<bs){bs=cost;best=cur.slice();}return;}
        for(var s=0;s<6;s++){if(used.indexOf(s)>=0||cur.some(function(c){return c.s===s;}))continue;var f=list[i]-GTUNE[s];if(f<0||f>17)continue;cur.push({s:s,f:f});rec(i+1,cur);cur.pop();}
      })(0,[]);
      return best;
    }
    function fingerFor(f,mn){if(f===0)return 0;return Math.max(1,Math.min(4,f-mn+1));}
    function layout(){
      /* fingertips for every held fretted note */
      tips.forEach(function(t){t.g.visible=false;});
      var at=[];Object.keys(held).forEach(function(k){var h=held[k];if(h.at&&h.at.f>0)at.push(h.at);});
      var mn=at.length?Math.min.apply(null,at.map(function(a){return a.f;})):1,used={};
      at.forEach(function(a){var fn=fingerFor(a.f,mn);while(used[fn]&&fn<4)fn++;used[fn]=1;var t=tips[fn-1];if(!t)return;
        var x=fx(a.f-1)+(fx(a.f)-fx(a.f-1))*.72,u=(x-nutX)/(saddleX-nutX),S=strs[a.s];t.g.position.set(x,S.yN+(S.yS-S.yN)*u+.004,S.zN+(S.zS-S.zN)*u);t.g.visible=true;t.t=1;});
    }
    var cap='';
    return{group:g,name:'Acoustic guitar',
      press:function(mm,id,vel){
        while(mm<40)mm+=12;while(mm>81)mm-=12;
        var now=performance.now(),grp=Object.keys(held).map(function(k){return held[k];}).filter(function(h){return now-h.t0<45;});
        var notes=grp.map(function(h){return h.m;}).concat([mm]),pl=notes.length>6?null:place(notes,grp);
        if(!pl){pl=place([mm]);grp=[];}if(!pl)return null;
        var h={m:mm,t0:now,at:null};held[id]=h;
        var all=grp.concat([h]);all.forEach(function(x,i){x.at=pl[grp.length?i:pl.length-1];});
        all.forEach(function(x){var S=strs[x.at.s];S.from=x.at.f;S.amp=.0026*(vel||.8);S.t=0;tint(S.mesh,true,.9);});
        var fr=all.filter(function(x){return x.at.f>0;}).map(function(x){return x.at.f;});if(fr.length){var mn=Math.min.apply(null,fr);if(mn<hand||Math.max.apply(null,fr)>hand+3)hand=mn;}
        layout();pickT.strum=1;
        cap=all.length>=3&&H.nameChord?H.nameChord(all.map(function(x){return x.m;})):(h.at.f===0?'Open '+NN[GTUNE[h.at.s]%12]+' string':'Fret '+h.at.f+' · '+['low E','A','D','G','B','high E'][h.at.s]+' string');
        view.wake();return{id:id};
      },
      release:function(hd){if(!hd)return;var h=held[hd.id];if(!h)return;delete held[hd.id];if(h.at){var S=strs[h.at.s];if(!Object.keys(held).some(function(k){return held[k].at&&held[k].at.s===h.at.s;})){S.amp*=.35;tint(S.mesh,false);}}layout();view.wake();},
      update:function(dt,tm){
        var busy=false;
        strs.forEach(function(S){if(S.amp>2e-5){S.ph+=dt*TAU*21;S.amp*=Math.pow(.25,dt);setString(S);busy=true;}else if(S.amp){S.amp=0;setString(S);}});
        if(pickT.strum>0){pickT.strum-=dt*6;var u=1-Math.max(0,pickT.strum);pick.position.z=-.045+.09*Math.sin(u*Math.PI/2);busy=true;}
        else if(Math.abs(pick.position.z+.05)>1e-4){pick.position.z+=(-.05-pick.position.z)*Math.min(1,dt*8);busy=true;}
        return busy;
      },
      caption:function(){return cap;},
      setup:function(){view.cam(new THREE.Vector3(-.07,.9,.2),new THREE.Vector3(-.07,.08,0),24,.98,.2);}
    };
  }
  /* ---------- TRUMPET ---------- */
  function trumpet(view){
    var m=mats(),g=new THREE.Group(),R=.0055;
    /* bell: a flared horn turned on a lathe, pointing to the right */
    var prof=[];for(var i=0;i<=40;i++){var u=i/40,x=.11+u*.19,r=.0062+.056*Math.pow(u,4.2);prof.push(new THREE.Vector2(r,x));}
    prof.push(new THREE.Vector2(.0645,.302));prof.push(new THREE.Vector2(.062,.302));
    var bell=new THREE.Mesh(new THREE.LatheGeometry(prof,64),m.brass);bell.material=m.brass.clone();bell.material.side=THREE.DoubleSide;bell.rotation.z=-Math.PI/2;bell.position.set(0,.075,0);g.add(bell);
    var inner=new THREE.Mesh(new THREE.CircleGeometry(.06,48),new THREE.MeshBasicMaterial({color:0x1a0f04,transparent:true,opacity:.0}));inner.position.set(.30,.075,0);inner.rotation.y=Math.PI/2;g.add(inner);
    /* tubing */
    g.add(tube([[.11,.075],[-.12,.075],[-.175,.072],[-.2,.05],[-.18,.022],[-.13,.016],[-.052,.016]],R,80,m.brass));
    g.add(tube([[-.215,.04,-.012],[-.1,.04,-.012],[.06,.038,-.012],[.105,.03,-.012],[.125,.005,-.012],[.11,-.022,-.012],[.07,-.03,-.012],[.022,-.03,-.012]],R*.95,90,m.brass));
    /* mouthpiece */
    var mp=[];[[.0035,0],[.0045,.03],[.006,.05],[.009,.06],[.0125,.066],[.013,.069],[.0105,.07],[.004,.069]].forEach(function(p){mp.push(new THREE.Vector2(p[0],p[1]));});
    var mouth=new THREE.Mesh(new THREE.LatheGeometry(mp,32),m.silver);mouth.rotation.z=Math.PI/2;mouth.position.set(-.215,.04,-.012);g.add(mouth);
    /* valve slides under the valves */
    g.add(tube([[-.045,-.035],[-.05,-.07],[-.065,-.08],[-.08,-.07],[-.078,-.035]],R*.9,40,m.brass));
    g.add(tube([[.018,-.035],[.03,-.075],[.055,-.088],[.08,-.075],[.078,-.04]],R*.9,40,m.brass));
    var ring=new THREE.Mesh(new THREE.TorusGeometry(.008,.0018,10,24),m.brass);ring.position.set(.088,-.06,.008);g.add(ring);
    /* valves: casing, top cap, stem and pearl button that push down */
    var valves=[];
    [-.04,-.012,.016].forEach(function(x,k){
      var casing=cyl(.0095,.0095,.085,m.brass,32);casing.position.set(x,-.006,0);g.add(casing);
      [.037,-.049].forEach(function(y){var c=cyl(.0108,.0108,.006,m.brass,32);c.position.set(x,y,0);g.add(c);});
      var mov=new THREE.Group();mov.position.set(x,0,0);
      var stem=cyl(.0026,.0026,.03,m.silver,12);stem.position.y=.055;mov.add(stem);
      var btn=cyl(.0105,.0105,.005,m.pearl,32);btn.position.y=.072;mov.add(btn);
      var rim=new THREE.Mesh(new THREE.TorusGeometry(.0105,.0012,8,32),m.brass);rim.rotation.x=Math.PI/2;rim.position.y=.072;mov.add(rim);
      g.add(mov);var lb=label(String(k+1),{bg:'rgba(30,20,8,.9)',ring:'#d4a65e',fg:'#f6e6c4'});lb.scale.set(.016,.016,1);lb.position.set(x,.1,0);g.add(lb);
      valves.push({mov:mov,btn:btn,a:0,t:0});
    });
    var held={},cap='Open';
    var PART=[48,60,67,72,76,79,84,86,88],VCOMB=['','2','1','12','23','13','123'];
    function fingering(conc){var w=conc+2;for(var d=0;d<=6;d++){if(PART.indexOf(w+d)>=0)return VCOMB[d];}return'';}
    function apply(){var on=[0,0,0],last=null;Object.keys(held).forEach(function(k){last=held[k];});if(last)last.v.split('').forEach(function(c){on[+c-1]=1;});
      valves.forEach(function(v,i){v.t=on[i];tint(v.btn,!!on[i],.6);});
      cap=last?(last.v?'Valves '+last.v.split('').join(' + '):'No valves (open)'):'';
      bell.material.emissive=new THREE.Color(last?0x6a4a10:0);bell.material.emissiveIntensity=last?.35:0;view.wake();}
    return{group:g,name:'Trumpet',
      press:function(mm,id){var h={v:fingering(mm),t:performance.now()};held[id]=h;apply();return{id:id};},
      release:function(hd){if(!hd)return;delete held[hd.id];apply();},
      update:function(dt){var busy=false;valves.forEach(function(v){var tg=v.t?-.013:0;if(Math.abs(v.a-tg)>1e-5){v.a+=(tg-v.a)*Math.min(1,dt*35);v.mov.position.y=v.a;busy=true;}});return busy;},
      caption:function(){return cap;},
      setup:function(){view.cam(new THREE.Vector3(.04,.05,.62),new THREE.Vector3(.04,.008,0),28,.62,.26);}
    };
  }
  var BUILD={piano:piano,guitar:guitar,trumpet:trumpet};
  /* ---------- a view: renderer + scene + camera ---------- */
  function view(canvas){
    var r=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'low-power'});
    r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.95;
    var scene=new THREE.Scene();scene.environment=room(r);
    var key=new THREE.DirectionalLight(0xfff1dd,1.6);key.position.set(-1,2.2,1.6);scene.add(key);
    var fill=new THREE.DirectionalLight(0xcfe3ff,.6);fill.position.set(1.5,1,-1);scene.add(fill);
    var cam=new THREE.PerspectiveCamera(25,2,.01,20),inst=null,raf=0,last=0,live={},fit={w:1,h:.3};
    var V={
      cam:function(pos,look,fov,w,h){cam.position.copy(pos);cam.fov=fov;cam.lookAt(look);cam._look=look.clone();cam._pos=pos.clone();fit={w:w,h:h};resize();},
      wake:function(){if(!raf){last=performance.now();raf=requestAnimationFrame(loop);}},
      show:function(kind){if(inst){scene.remove(inst.group);}var b=BUILD[kind]||BUILD.piano;inst=b(V);scene.add(inst.group);if(inst.setup)inst.setup();live={};V.wake();return inst;},
      press:function(mm,id,vel){if(!inst)return;live[id]=inst.press(mm,id,vel);},
      release:function(id){if(!inst)return;inst.release(live[id]);delete live[id];},
      caption:function(){return inst&&inst.caption?inst.caption():'';},
      resize:resize,
      dispose:function(){cancelAnimationFrame(raf);r.dispose();}
    };
    function resize(){
      var w=canvas.clientWidth||600,h=canvas.clientHeight||150;r.setSize(w,h,false);cam.aspect=w/h;
      /* keep the whole instrument in frame: move the camera back if the strip is narrow */
      if(cam._pos){var need=fit.w/(2*Math.tan(cam.fov*Math.PI/360)*cam.aspect),needH=fit.h/(2*Math.tan(cam.fov*Math.PI/360)),d=Math.max(need,needH),dir=cam._pos.clone().sub(cam._look).normalize();cam.position.copy(cam._look.clone().add(dir.multiplyScalar(d)));cam.lookAt(cam._look);}
      cam.updateProjectionMatrix();V.wake();
    }
    function loop(t){
      var dt=Math.min(.05,(t-last)/1000);last=t;var busy=inst&&inst.update?inst.update(dt,t):false;
      r.render(scene,cam);raf=busy?requestAnimationFrame(loop):0;
    }
    return V;
  }
  return{view:view};
}
