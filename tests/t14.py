import os;JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX')
        # smoothness persists + audio context uses it
        await pg.evaluate("()=>localStorage.setItem('jr-lat','playback')")
        await pg.reload();await pg.wait_for_timeout(900)
        await pg.click('#bPlay');await pg.wait_for_timeout(800);await pg.click('#bPlay')
        print('latency hint applied (baseLatency):',await pg.evaluate("()=>[__jr.A.c.baseLatency,__jr.A.c.outputLatency]"))
        await pg.evaluate("()=>localStorage.removeItem('jr-lat')")
        # strings/loop instrument song plays without errors, peaks sane
        await pg.reload();await pg.wait_for_timeout(900)
        await pg.click('#bStart');await pg.wait_for_timeout(200);await pg.click('.vibe[data-v="60s psych"]');await pg.wait_for_timeout(500)
        await pg.evaluate('''()=>{window.__pk=0;var buf=new Float32Array(1024);window.__t=setInterval(function(){__jr.A.an.getFloatTimeDomainData(buf);for(var i=0;i<1024;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},8);}''')
        await pg.click('#bPlay');await pg.wait_for_timeout(9000);await pg.click('#bPlay')
        print('60s psych peak',await pg.evaluate("()=>window.__pk.toFixed(3)"),errs)
        await b.close()
asyncio.run(main())
