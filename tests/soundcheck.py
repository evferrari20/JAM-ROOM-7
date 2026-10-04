"""Smoke test: open Output > Sound check, play each clip, answer, read the result code."""
import os,asyncio
from playwright.async_api import async_playwright
JR="file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        await pg.click('#bOut');await pg.wait_for_timeout(300);await pg.click('[data-x=sc]');await pg.wait_for_timeout(200)
        pk=[]
        for i in range(6):
            await pg.evaluate('''()=>{window.__pk=0;var a=__jr.curA(),buf=new Float32Array(1024);clearInterval(window.__t);window.__t=setInterval(function(){a.an.getFloatTimeDomainData(buf);for(var i=0;i<1024;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},10);}''')
            await pg.click('[data-x=play]');await pg.wait_for_timeout(6600)
            pk.append(round(await pg.evaluate('()=>window.__pk'),3))
            if i==2: await pg.screenshot(path=os.environ.get('SHOT','/tmp')+'/sc_step.png')
            await pg.click('[data-x=bad]' if i==4 else '[data-x=ok]');await pg.wait_for_timeout(200)
        await pg.wait_for_function('()=>document.getElementById("scCode")&&/x\\d/.test(document.getElementById("scCode").value)',timeout=60000)
        print('master-bus peaks per clip (clip 1-2 bypass the bus):',pk)
        print('code:',await pg.input_value('#scCode'))
        print('diagnosis:',(await pg.inner_text('.sc-card'))[:160].replace('\n',' '))
        await pg.screenshot(path=os.environ.get('SHOT','/tmp')+'/sc_result.png')
        print('errors',errs);await b.close()
asyncio.run(main())
