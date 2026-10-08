"""Orchestra workspace: own piece, ensemble set-up, sketch from a classic, write a section, add one instrument,
play, and swap back to the Studio song untouched."""
import os,asyncio
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
T="()=>__jr.S.tracks.map(t=>(t.orow||t.kind)+':'+t.notes.length).join(' ')"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']);pg=await b.new_page(viewport={'width':1180,'height':820})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX')
        await pg.click('#bStart');await pg.click('.vibe[data-v="Pop"]');await pg.wait_for_timeout(1500)
        studio=await pg.evaluate(T)
        await pg.locator('.modes button').nth(1).click();await pg.wait_for_timeout(1200)
        await pg.click('.osc[data-e=chamber]');await pg.wait_for_timeout(600)
        await pg.click('#oClassic');await pg.wait_for_timeout(300);await pg.locator('.clist button').first.click();await pg.wait_for_timeout(2500)
        await pg.click('[data-osec=Strings]');await pg.wait_for_timeout(300)
        await pg.click('#oAdd');await pg.click('.oai [data-row=tp]');await pg.click('.mbox [data-x=close]');await pg.click('#oWrite');await pg.wait_for_timeout(300)
        orch=await pg.evaluate(T);print('orchestra:',orch)
        await pg.click('#bPlay');await pg.wait_for_timeout(1500);await pg.click('#bPlay')
        await pg.locator('.modes button').nth(0).click();await pg.wait_for_timeout(1500)
        back=await pg.evaluate(T);print('studio unchanged:',back==studio)
        ok=('v1:' in orch and 'v1:0' not in orch and 'tp:0' not in orch and back==studio and not errs)
        print('errors',errs);print('PASS' if ok else 'FAIL');await b.close()
asyncio.run(main())
