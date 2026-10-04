"""Instrument view: switch instruments, play notes, screenshot each drawing."""
import os,asyncio
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX')
        for inst,notes in [('piano',[60,64,67]),('steel',[52,59]),('ebass',[33]),('violin',[69]),('cello',[48]),('harp',[62,65]),('marimba',[72]),('organ',[60]),('trumpet',[67]),('flute',[79]),('sax',[62]),('choir',[64])]:
            await pg.evaluate('''(a)=>{var t=__jr.S.tracks.find(t=>t.kind==='inst');t.inst=a[0];__jr.S.sel=t.id;__jr.rerender&&__jr.rerender();}''',[inst])
            await pg.evaluate('()=>__jr.renderDock()')
            await pg.evaluate('''(ns)=>{var t=__jr.S.tracks.find(t=>t.kind==='inst'),c=__jr.curA().c;ns.forEach(m=>__jr.trackPlay(t,m,c.currentTime+.01,.8));}''',notes)
            await pg.wait_for_timeout(150)
            el=await pg.query_selector('#viz')
            await el.screenshot(path=f'{OUT}/viz_{inst}.png')
        print('errors',errs);await b.close()
asyncio.run(main())
