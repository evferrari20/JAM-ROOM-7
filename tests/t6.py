import os;JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1300,'height':900},has_touch=True)
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(800)
        await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        await pg.evaluate('''()=>{window.__pk=0;var buf=new Float32Array(1024);window.__t=setInterval(function(){var A=__jr.A;if(!A.an)return;A.an.getFloatTimeDomainData(buf);for(var i=0;i<1024;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},10);}''')
        await pg.click('#bSnd');await pg.wait_for_timeout(1800)
        r1=await pg.evaluate('()=>__jr.A.c.state+" peak(after beeps)="+window.__pk.toFixed(3)')
        await pg.evaluate('()=>{window.__pk=0}')
        await pg.click('.kb .wk');await pg.wait_for_timeout(1200)
        r2=await pg.evaluate('()=>"peak(key tap)="+window.__pk.toFixed(3)')
        print(r1,r2,errs)
        await b.close()
asyncio.run(main())
