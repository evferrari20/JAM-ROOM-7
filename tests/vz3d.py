"""3D instrument view: every instrument builds, reacts to notes and draws something; flat view still works.
Needs a WebGL-capable headless Chromium (SwiftShader). Screenshots go to $SHOT (default /tmp)."""
import os,asyncio,time
from playwright.async_api import async_playwright
from PIL import Image,ImageStat
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
ARGS=['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=ARGS)
        pg=await b.new_page(viewport={'width':1368,'height':912},device_scale_factor=2)
        errs=[];warn=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:warn.append(m.text[:120]) if m.type in('error','warning') else None)
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        await pg.wait_for_function('__jr.viz().st3()===2||__jr.viz().st3()===-1',timeout=30000)
        assert await pg.evaluate('__jr.viz().st3()')==2,'3D did not load'
        assert await pg.evaluate("document.querySelector('#viz.is3d canvas')!==null"),'3D canvas not mounted'
        ids=await pg.evaluate("__jr.instIds()")
        v0=await pg.evaluate('(window.__v0=__jr.viz().v3(),1)')
        bad=[];slow=[]
        for i in ids:
            t0=await pg.evaluate('''(id)=>{var t=__jr.S.tracks.find(t=>t.kind==='inst');t.inst=id;__jr.S.sel=t.id;var a=performance.now();__jr.renderDock();return performance.now()-a;}''',i)
            if t0>250:slow.append((i,round(t0)))
            await pg.evaluate('''()=>{var t=__jr.S.tracks.find(t=>t.kind==='inst'),c=__jr.curA().c;[60,64,67].forEach(m=>__jr.trackPlay(t,m,c.currentTime+.01,.8).release(c.currentTime+.6));}''')
            await pg.wait_for_timeout(160)
            cap=await pg.evaluate("(document.querySelector('.vz3-c')||{}).textContent||''")
            f=f'{OUT}/vz3d_{i}.png';await pg.locator('#viz .vz3').screenshot(path=f)
            st=ImageStat.Stat(Image.open(f).convert('L'));spread=st.stddev[0]
            if not cap or spread<8:bad.append((i,cap,round(spread,1)))
        same=await pg.evaluate('__jr.viz().v3()===window.__v0')
        ctx=await pg.evaluate("document.querySelectorAll('canvas.vz3c').length")
        # flat drawing still works when 3D is switched off
        await pg.click('#hViz3');await pg.wait_for_timeout(200)
        flat=await pg.evaluate("!document.querySelector('#viz').classList.contains('is3d')&&!!document.querySelector('#viz svg .vz-inst')")
        await pg.click('#hViz3');await pg.wait_for_timeout(200)
        back=await pg.evaluate("document.querySelector('#viz').classList.contains('is3d')")
        # frame cost while notes keep playing (headless software GPU, so only a rough upper bound)
        ms=await pg.evaluate('''async()=>{var t=__jr.S.tracks.find(t=>t.kind==='inst');t.inst='piano';__jr.renderDock();var c=__jr.curA().c,n=0,a=performance.now();
          for(var k=0;k<20;k++){__jr.trackPlay(t,60+k%12,c.currentTime+.01,.8).release(c.currentTime+.2);await new Promise(r=>setTimeout(r,100));}return(performance.now()-a)/20;}''')
        await pg.evaluate("localStorage.setItem('jr-viz3d','1')")
        print('instruments',len(ids),'problems',bad,'slow builds',slow)
        print('same view reused',same,'canvases',ctx,'flat ok',flat,'back to 3D',back,'avg step ms',round(ms,1))
        print('errors',errs,'warnings',[w for w in warn if 'GPU stall' not in w][:8])
        ok=not errs and not bad and same and ctx==1 and flat and back
        print('PASS' if ok else 'FAIL')
        await b.close()
asyncio.run(main())
