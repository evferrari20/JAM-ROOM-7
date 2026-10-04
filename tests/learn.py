"""Learn: open library, open songs, play with wait mode via simulated key presses, check sheet music + results."""
import os,asyncio,sys
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX')
        await pg.click('.modes [data-mode=learn]');await pg.wait_for_timeout(800)
        await pg.screenshot(path=OUT+'/learn_lib.png')
        print('songs',await pg.evaluate('()=>LEARN.songs().length') if False else await pg.evaluate('()=>document.querySelectorAll(".scard").length'),'cards in first genre')
        for sid in sys.argv[1:] or ['fs-middle-c','fur-elise-easy']:
            await pg.evaluate('(id)=>window.__learnOpen(id)',sid)
            await pg.wait_for_timeout(2500)
            if await pg.query_selector('#modal.show'):await pg.click('#mBox button');await pg.wait_for_timeout(200)
            await pg.wait_for_function('()=>document.querySelector("#lpSheet svg")||document.querySelector("#lpSheet .hint")',timeout=30000)
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/learn_{sid}.png')
            st=await pg.evaluate('()=>{var P=window.__learnState&&window.__learnState();return P?[P.notes.length,P.groups.length,(P.steps||[]).length,P.lo,P.hi]:null}')
            print(sid,'notes/groups/cursor steps/range',st)
            # play in wait mode, pressing every group's notes as the music waits
            await pg.evaluate('()=>{var P=window.__learnState();P.tempo=1.2;}')
            await pg.click('[data-x=play]')
            for i in range(3000):
                done=await pg.evaluate('''()=>{var P=window.__learnState();if(!P||P.done)return 'done';var g=P.groups[P.gi];if(!g)return 'end';
                  if(P.pos>=g.t-0.01){g.ns.forEach(n=>{if(!n.hit){window.__learnPress(n.m,.8);setTimeout(()=>window.__learnRelease(n.m),60);}});}return P.pos.toFixed(2);}''')
                if done in('done',):break
                await pg.wait_for_timeout(40)
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{OUT}/learn_{sid}_result.png')
            print(' result modal:',(await pg.inner_text('#mBox'))[:120].replace('\n',' | ') if await pg.query_selector('#modal.show') else 'none')
            if await pg.query_selector('#modal.show'):await pg.click('[data-r=lib]');await pg.wait_for_timeout(300)
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
