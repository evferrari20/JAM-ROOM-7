"""Chord strips and Autoplay: zone voicings, strip playing, autoplay patterns per instrument family, autoplay recording."""
import os,asyncio
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
PEAK='''()=>{window.__pk=0;var a=__jr.curA(),buf=new Float32Array(2048);clearInterval(window.__t);window.__t=setInterval(function(){a.an.getFloatTimeDomainData(buf);for(var i=0;i<buf.length;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},10);}'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX')
        await pg.evaluate('''()=>{var c=[...document.querySelectorAll('.tcard')].find(x=>/piano/i.test(x.innerText));c.click()}''');await pg.wait_for_timeout(300)
        print('zones for C (I):',[await pg.evaluate(f'()=>__jr.ap.strip(0,{z}).join(" ")') for z in range(8)])
        await pg.select_option('#hPlay','strips');await pg.wait_for_timeout(300)
        print('strips',await pg.evaluate('()=>document.querySelectorAll(".strip2").length'),'zones',await pg.evaluate('()=>document.querySelectorAll(".sz").length'))
        await pg.screenshot(path=OUT+'/strips.png')
        await pg.evaluate(PEAK)
        z=await (await pg.query_selector('.strip2[data-sci="4"] [data-z="1"]')).bounding_box()
        await pg.mouse.move(z['x']+20,z['y']+5);await pg.mouse.down();await pg.wait_for_timeout(500);await pg.mouse.up()
        print('strip tap peak',round(await pg.evaluate('()=>window.__pk'),3))
        # slide down a strip: plays each zone
        s=await (await pg.query_selector('.strip2[data-sci="0"]')).bounding_box()
        await pg.mouse.move(s['x']+20,s['y']+40);await pg.mouse.down();await pg.mouse.move(s['x']+20,s['y']+s['height']-6,steps=12);await pg.mouse.up()
        # autoplay on piano: hold for ~2.4 s while recording, count recorded notes
        for fam_sel,inst in [('piano','piano'),('guitar','steel'),('bass','ebass'),('strings','strings')]:
            await pg.evaluate(f'''()=>{{var t=__jr.selTrack();t.inst="{inst}";t.notes=[];}}''')
            await pg.evaluate('()=>__jr.renderDock()');await pg.wait_for_timeout(200)
            opts=await pg.evaluate('()=>[...document.querySelectorAll("#hAP option")].map(o=>o.textContent).join(" | ")')
            res=[]
            for mode in ['1','2','3','4']:
                await pg.select_option('#hAP',mode);await pg.wait_for_timeout(100)
                await pg.evaluate('()=>{__jr.selTrack().notes=[]}')
                await pg.click('#bRec') if False else None
                await pg.evaluate('''()=>{window.__cnt=0;var orig=window.__jr.trackPlay;}''')
                z=await (await pg.query_selector('.strip2[data-sci="0"] [data-z="2"]')).bounding_box()
                await pg.evaluate('''()=>{window.__vn=0;var o=document.getElementById('viz');}''')
                await pg.mouse.move(z['x']+20,z['y']+5);await pg.mouse.down();await pg.wait_for_timeout(1250);await pg.mouse.up()
                res.append(await pg.evaluate('()=>__jr.ap.state().next'))
            print(f'{inst:8s} autoplay patterns: {opts}  steps run per 1.25s hold: {res}')
        # record autoplay into the track
        await pg.evaluate('()=>{var t=__jr.selTrack();t.inst="piano";t.notes=[];__jr.S.count=false;}');await pg.evaluate('()=>__jr.renderDock()');await pg.wait_for_timeout(200)
        await pg.select_option('#hAP','2')
        await pg.keyboard.press('Enter');await pg.wait_for_timeout(500)
        z=await (await pg.query_selector('.strip2[data-sci="3"] [data-z="2"]')).bounding_box()
        await pg.mouse.move(z['x']+20,z['y']+5);await pg.mouse.down();await pg.wait_for_timeout(2000);await pg.mouse.up();await pg.wait_for_timeout(200)
        await pg.keyboard.press('Enter');await pg.wait_for_timeout(300)
        print('recorded autoplay notes',await pg.evaluate('()=>__jr.selTrack().notes.length'),'first',await pg.evaluate('()=>JSON.stringify(__jr.selTrack().notes.slice(0,4))'))
        await pg.select_option('#hAP','0');await pg.select_option('#hPlay','keys')
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
