"""Automation lanes: shapes, tap/drag/delete points, offline render measurements (fade, pan, filter), live playback, parts, undo."""
import os,asyncio
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
RENDER='''async(id)=>{
  var S=__jr.S,t=S.tracks.find(x=>x.id===id),save=S.solo;S.solo=[id];
  await Promise.all(S.tracks.filter(t=>t.kind==='inst').map(t=>__jr.ensureSamples(t.inst)).concat([__jr.loadDrumKits()]));
  var sr=44100,sp=__jr.spb(),L=__jr.LEN(),oc=new OfflineAudioContext(2,Math.ceil((L*sp+1.5)*sr),sr);
  var b=await __jr.offRender(oc,1,L,0,false);S.solo=save;
  var l=b.getChannelData(0),r=b.getChannelData(1),out=[];
  for(var beat=0;beat<L;beat++){var i0=Math.floor(beat*sp*sr),i1=Math.floor((beat+1)*sp*sr),el=0,er=0,hf=0;
    for(var i=i0;i<i1;i++){el+=l[i]*l[i];er+=r[i]*r[i];var d=l[i]-(i?l[i-1]:0);hf+=d*d;}
    out.push([Math.sqrt(el/(i1-i0)),Math.sqrt(er/(i1-i0)),Math.sqrt(hf/(i1-i0))]);}
  return out;}'''
def db(x):
    import math;return round(20*math.log10(x+1e-9),1)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];await pg.add_init_script("try{localStorage.setItem('jr-sndp','0')}catch(e){}");pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        await pg.click('#bStart');await pg.click('.vibe[data-v]');await pg.wait_for_timeout(1500)
        # a held chord on the Rhodes / keys track so levels are steady
        tid=await pg.evaluate('''()=>{var t=__jr.S.tracks.find(t=>t.kind==='inst'&&!/bass/.test(t.inst));t.notes=[];for(var b=0;b<__jr.LEN();b++)[60,64,67].forEach(m=>t.notes.push({s:b,d:1,m:m,v:.8}));
          t.pan=0;t.rev=0;t.echo=0;__jr.S.sel=t.id;document.querySelector('.tcard[data-id="'+t.id+'"]')?.click();return t.id}''')
        await pg.wait_for_timeout(300)
        if await pg.evaluate('()=>document.getElementById("apanel").hidden'):await pg.click('#autoBtn')
        await pg.evaluate('()=>document.getElementById("apanel").scrollIntoView({block:"center"})');await pg.wait_for_timeout(200)
        base=await pg.evaluate(RENDER,tid)
        print('no automation  beat dB:',[db(x[0]) for x in base[:8]])
        # volume fade in
        await pg.select_option('#aShape','fadein');await pg.wait_for_timeout(100)
        print('vol points',await pg.evaluate(f'()=>JSON.stringify(__jr.S.tracks.find(t=>t.id==="{tid}").auto.vol)'))
        fi=await pg.evaluate(RENDER,tid)
        print('fade in        beat dB:',[db(x[0]) for x in fi[:8]])
        await pg.screenshot(path=OUT+'/auto_vol.png')
        # pan ping-pong
        await pg.click('#apanel [data-al=pan]');await pg.select_option('#aShape','ping')
        pp=await pg.evaluate(RENDER,tid)
        print('ping-pong L-R dB per beat:',[round(db(x[0])-db(x[1]),1) for x in pp[4:10]])
        # filter intro
        await pg.click('#apanel [data-al=cut]');await pg.select_option('#aShape','intro')
        print('filter node',await pg.evaluate(f'()=>!!__jr.S.tracks.find(t=>t.id==="{tid}").af'))
        fl=await pg.evaluate(RENDER,tid)
        print('brightness (hf/rms) beat 0..9:',[round(x[2]/max(x[0],1e-9),3) for x in fl[:10]])
        await pg.screenshot(path=OUT+'/auto_cut.png')
        # tap to add a point on the reverb lane, drag it, double-tap removes it
        await pg.click('#apanel [data-al=rev]');cv=await (await pg.query_selector('#apanel canvas')).bounding_box()
        x=cv['x']+cv['width']*.5;y=cv['y']+30
        await pg.mouse.click(x,y);await pg.wait_for_timeout(500);n1=await pg.evaluate(f'()=>(__jr.S.tracks.find(t=>t.id==="{tid}").auto.rev||[]).length')
        await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+40,y+30,steps=5);await pg.mouse.up()
        pt=await pg.evaluate(f'()=>JSON.stringify(__jr.S.tracks.find(t=>t.id==="{tid}").auto.rev)')
        await pg.wait_for_timeout(500)
        await pg.mouse.click(x+40,y+30);await pg.wait_for_timeout(60);await pg.mouse.click(x+40,y+30)
        n2=await pg.evaluate(f'()=>(__jr.S.tracks.find(t=>t.id==="{tid}").auto.rev||[]).length')
        print('rev lane: tap ->',n1,'dragged ->',pt,'double-tap ->',n2)
        # live playback: automation gain follows the fade
        await pg.click('#apanel [data-al=vol]')
        vals=await pg.evaluate(f'''async()=>{{var t=__jr.S.tracks.find(t=>t.id==="{tid}"),out=[];document.getElementById('bPlay').click();
          for(var i=0;i<12;i++){{await new Promise(r=>setTimeout(r,150));out.push(+t.ag.gain.value.toFixed(3));}}document.getElementById('bPlay').click();await new Promise(r=>setTimeout(r,100));out.push(+t.ag.gain.value.toFixed(3));return out;}}''')
        print('live vol gain while playing (then after stop):',vals)
        # undo removes the last change, redo restores
        before=await pg.evaluate(f'()=>Object.keys(__jr.S.tracks.find(t=>t.id==="{tid}").auto).filter(k=>__jr.S.tracks.find(t=>t.id==="{tid}").auto[k].length).join(",")')
        await pg.click('#aClear');await pg.wait_for_timeout(700)
        mid=await pg.evaluate(f'()=>Object.keys(__jr.S.tracks.find(t=>t.id==="{tid}").auto).filter(k=>__jr.S.tracks.find(t=>t.id==="{tid}").auto[k].length).join(",")')
        await pg.keyboard.press('Control+z');await pg.wait_for_timeout(400)
        aft=await pg.evaluate(f'()=>Object.keys(__jr.S.tracks.find(t=>t.id==="{tid}").auto).filter(k=>__jr.S.tracks.find(t=>t.id==="{tid}").auto[k].length).join(",")')
        print('lanes',before,'| after clear vol:',mid,'| after undo:',aft)
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
