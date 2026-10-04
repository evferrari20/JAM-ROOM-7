"""Orchestra: start from a classic, orchestrate in each style, play and measure, render the score."""
import os,asyncio
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX')
        await pg.click('.modes [data-mode=orch]');await pg.wait_for_timeout(600)
        if await pg.query_selector('#modal.show'):await pg.click('#mBox [data-x=close]')
        await pg.click('[data-o=classic]');await pg.wait_for_timeout(300)
        await pg.click('[data-cl="fur-elise-easy"]');await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'/orch_blocks.png')
        for sty in ['romantic','film','pastoral','baroque','mysterious']:
            await pg.select_option('#orSty',sty);await pg.wait_for_timeout(300)
            parts=await pg.evaluate('''()=>{var mv=__orch.state().mv[__orch.state().cur];return Object.keys(mv.parts).map(k=>k+':'+mv.parts[k].length).join(' ')}''')
            await pg.evaluate('''()=>{window.__pk=0;var a=__jr.curA(),buf=new Float32Array(1024);clearInterval(window.__t);window.__t=setInterval(function(){a.an.getFloatTimeDomainData(buf);for(var i=0;i<1024;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},10);}''')
            await pg.click('[data-o=play]');await pg.wait_for_timeout(5000);await pg.click('[data-o=play]')
            print(sty,'peak',round(await pg.evaluate('()=>window.__pk'),3),'|',parts)
        await pg.select_option('#orSty','romantic');await pg.wait_for_timeout(300)
        await pg.click('[data-o=vscore]');await pg.wait_for_function('()=>document.querySelector("#orScore svg")||document.querySelector("#orScore .hint")',timeout=60000)
        await pg.wait_for_timeout(800);await pg.screenshot(path=OUT+'/orch_score.png')
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
