import os;JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        # piano label modes
        for mode in ['keys','none','notes']:
            await pg.select_option('#hLab',mode);await pg.wait_for_timeout(200)
            print(mode,'->',await pg.evaluate("()=>[...document.querySelectorAll('.wk')].slice(0,8).map(e=>e.innerText.replace(/\\n/g,'')).join(' ')"))
        # drums: computer key + pointer both make sound
        await pg.click('.tcard >> nth=0');await pg.wait_for_timeout(500)
        await pg.evaluate('''()=>{window.__pk=0;var buf=new Float32Array(1024);window.__t=setInterval(function(){__jr.A.an.getFloatTimeDomainData(buf);for(var i=0;i<1024;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},8);}''')
        await pg.evaluate('()=>document.activeElement.blur()');await pg.keyboard.press('a');await pg.wait_for_timeout(500)
        print('kick via keyboard peak',await pg.evaluate("()=>window.__pk.toFixed(3)"))
        await pg.evaluate("()=>window.__pk=0")
        await pg.evaluate("""()=>{var k=document.querySelector('.kitset .pad[data-m="1"]');k.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:4,pointerType:'touch',clientX:20,clientY:30,button:0,buttons:1}));}""")
        await pg.wait_for_timeout(400)
        print('snare via touch peak',await pg.evaluate("()=>window.__pk.toFixed(3)"))
        print(errs);await b.close()
asyncio.run(main())
