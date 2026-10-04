"""Arrange view: sections timeline, drop a track out of a section (measured), drag to reorder, duplicate/remove/unique, play from a section, undo."""
import os,asyncio,math
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
RENDER='''async()=>{var S=__jr.S;
  await Promise.all(S.tracks.filter(t=>t.kind==='inst').map(t=>__jr.ensureSamples(t.inst)).concat([__jr.loadDrumKits()]));
  var sr=32000,sp=__jr.spb(),L=__jr.LEN(),N=S.arr.length,oc=new OfflineAudioContext(2,Math.ceil((N*L*sp+1.5)*sr),sr);
  var b=await __jr.offRender(oc,N,L,0,true),x=b.getChannelData(0),out=[];
  for(var s=0;s<N;s++){var i0=Math.floor(s*L*sp*sr),i1=Math.floor((s+1)*L*sp*sr),e=0;for(var i=i0;i<i1;i++)e+=x[i]*x[i];out.push(Math.sqrt(e/(i1-i0)));}
  return out;}'''
def db(v):return round(20*math.log10(v+1e-9),1)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX')
        await pg.click('#bStart');await pg.click('.vibe[data-v]');await pg.wait_for_timeout(1500)
        await pg.click('#arrBtn');await pg.wait_for_timeout(300)
        n=await pg.evaluate('()=>[document.querySelectorAll("#editor .arsec[data-i]").length,document.querySelectorAll("#editor .arn").length]')
        print('sections, tracks:',n,'order',await pg.evaluate('()=>__jr.S.arr.map(id=>__jr.S.parts.find(p=>p.id===id).name).join(" ")'))
        await pg.evaluate('()=>document.querySelector("#editor .arr").scrollIntoView({block:"start"})')
        await pg.screenshot(path=OUT+'/arr_view.png')
        lv0=await pg.evaluate(RENDER);print('section levels dB',[db(v) for v in lv0])
        # drop every instrument except drums out of section 1, and drums out of section 3
        drum=await pg.evaluate('()=>__jr.S.tracks.find(t=>t.kind==="drum").id')
        await pg.click(f'#editor .arcell[data-i="2"][data-t="{drum}"]')
        print('arrOff',await pg.evaluate('()=>JSON.stringify(__jr.S.arrOff)'))
        lv1=await pg.evaluate(RENDER);print('with drums out of section 3, dB',[db(v) for v in lv1])
        # drag section 4 to the front
        secs=await pg.query_selector_all('#editor .arsec[data-i]');b4=await secs[3].bounding_box();b1=await secs[0].bounding_box()
        await pg.mouse.move(b4['x']+20,b4['y']+15);await pg.mouse.down();await pg.mouse.move(b1['x']+10,b1['y']+15,steps=10);await pg.mouse.up();await pg.wait_for_timeout(200)
        print('after drag order',await pg.evaluate('()=>__jr.S.arr.map(id=>__jr.S.parts.find(p=>p.id===id).name).join(" ")'),'off',await pg.evaluate('()=>JSON.stringify(__jr.S.arrOff)'))
        await pg.click('#editor .arbar [data-a=dup]');await pg.wait_for_timeout(100)
        await pg.click('#editor .arbar [data-a=uniq]');await pg.wait_for_timeout(100)
        print('after duplicate + unique',await pg.evaluate('()=>__jr.S.arr.map(id=>__jr.S.parts.find(p=>p.id===id).name).join(" ")'),'parts',await pg.evaluate('()=>__jr.S.parts.length'))
        await pg.click('#editor .arbar [data-a=del]');await pg.wait_for_timeout(100)
        print('after remove',await pg.evaluate('()=>__jr.S.arr.length'),await pg.evaluate('()=>__jr.S.arrOff.length'))
        # play from section 3
        await pg.click('#editor .arsec[data-i="2"]');await pg.wait_for_timeout(500);await pg.click('#arPlay');await pg.wait_for_timeout(1200)
        print('playing at',await pg.evaluate('()=>document.getElementById("pos").textContent'),'highlight',await pg.evaluate('()=>[...document.querySelectorAll("#editor .arsec.now")].map(e=>e.dataset.i).join(",")'))
        await pg.screenshot(path=OUT+'/arr_play.png')
        await pg.keyboard.press('Space');await pg.wait_for_timeout(200)
        # undo the last arrangement change
        await pg.wait_for_timeout(600);a0=await pg.evaluate('()=>__jr.S.arr.length');await pg.keyboard.press('Control+z');await pg.wait_for_timeout(300)
        print('undo arr length',a0,'->',await pg.evaluate('()=>__jr.S.arr.length'))
        # double-tap a section opens its part in the editor
        await pg.click('#editor .arsec[data-i="1"]');await pg.wait_for_timeout(80);await pg.click('#editor .arsec[data-i="1"]');await pg.wait_for_timeout(300)
        print('back in editor',await pg.evaluate('()=>!!document.getElementById("roll")'),'part',await pg.evaluate('()=>__jr.S.parts.find(p=>p.id===__jr.S.part).name'))
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
