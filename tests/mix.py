"""Mixer console, sound styles + smart knobs, mastering A/B and the Polish assistant."""
import os,asyncio
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
PEAK='''()=>{window.__pk=0;var a=__jr.curA(),buf=new Float32Array(2048);clearInterval(window.__t);window.__t=setInterval(function(){a.an.getFloatTimeDomainData(buf);for(var i=0;i<buf.length;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},10);}'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        await pg.click('#bStart');await pg.click('.vibe[data-v]');await pg.wait_for_timeout(1500)
        await pg.click('#bMix');await pg.wait_for_timeout(500)
        n=await pg.evaluate('()=>document.querySelectorAll("#mBox .strip").length');print('strips',n)
        await pg.screenshot(path=OUT+'/mix_console.png')
        # pick a style on the first instrument strip
        sid=await pg.evaluate('()=>[...document.querySelectorAll("#mBox .strip[data-id]")].map(s=>s.dataset.id)')
        sel=f'#mBox select[data-style="{sid[1]}"]'
        opts=await pg.evaluate(f'()=>[...document.querySelector(\'{sel}\').options].map(o=>o.value).filter(Boolean)')
        print('styles for strip 2:',opts)
        await pg.select_option(sel,opts[0]);await pg.wait_for_timeout(200)
        # drag the Warmth knob up on that strip
        k=await pg.query_selector(f'#mBox .strip[data-id="{sid[1]}"] .knob[data-k=warm]');bb=await k.bounding_box()
        await pg.mouse.move(bb['x']+bb['width']/2,bb['y']+15);await pg.mouse.down();await pg.mouse.move(bb['x']+bb['width']/2,bb['y']-45,steps=6);await pg.mouse.up()
        info=await pg.evaluate(f'''()=>{{var s=document.querySelector('#mBox .strip[data-id="{sid[1]}"]');return [...s.querySelectorAll('.knob')].map(k=>k.dataset.k+'='+(+k.dataset.v).toFixed(2)).join(' ')}}''')
        print('knobs after warmth drag:',info)
        # fader
        f=await pg.query_selector(f'#mBox .strip[data-id="{sid[0]}"] .fader');await f.evaluate('(e)=>{e.value=.5;e.dispatchEvent(new Event("input",{bubbles:true}))}')
        print('fader label',await pg.evaluate(f'''()=>document.querySelector('#mBox .strip[data-id="{sid[0]}"] [data-r=vol]').textContent'''))
        await pg.evaluate(PEAK);await pg.click('#mxPlay');await pg.wait_for_timeout(3000)
        await pg.screenshot(path=OUT+'/mix_console_play.png')
        print('peak with style',round(await pg.evaluate('()=>window.__pk'),3))
        await pg.click('#mxPlay');await pg.wait_for_timeout(300)
        # mastering
        await pg.click('#mBox [data-x=master]');await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT+'/mix_master.png')
        for mk in ['balanced','warm','punchy','open']:
            await pg.click(f'#mBox [data-mk={mk}]');await pg.evaluate(PEAK);await pg.click('#mBox [data-x=play]');await pg.wait_for_timeout(2500);await pg.click('#mBox [data-x=play]')
            print('master',mk,'peak',round(await pg.evaluate('()=>window.__pk'),3))
        await pg.click('#mBox [data-ab=A]');await pg.wait_for_timeout(100)
        await pg.click('#mBox [data-x=use]');await pg.wait_for_timeout(400)
        print('back at mixer:',await pg.evaluate('()=>!!document.querySelector("#mBox .console")'),'mst select',await pg.evaluate('()=>document.querySelector("#mxMst").value'))
        await pg.click('#mBox [data-x=close]');await pg.wait_for_timeout(300)
        # polish
        await pg.click('#bPolish');await pg.wait_for_function('()=>document.querySelector("#mBox .pcards")',timeout=90000)
        await pg.screenshot(path=OUT+'/mix_polish.png')
        await pg.evaluate(PEAK);await pg.click('#mBox [data-x=play]');await pg.wait_for_timeout(3000)
        a=round(await pg.evaluate('()=>window.__pk'),3)
        await pg.click('#mBox [data-ab=before]');await pg.evaluate(PEAK);await pg.wait_for_timeout(3000)
        bf=round(await pg.evaluate('()=>window.__pk'),3);await pg.click('#mBox [data-x=play]')
        print('polish peak after',a,'before',bf)
        await pg.click('#mBox [data-x=ok]');await pg.wait_for_timeout(300)
        print('errors',errs[:6]);await b.close()
asyncio.run(main())
