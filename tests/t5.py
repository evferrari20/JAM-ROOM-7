import os;JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1300,'height':900})
        await pg.goto(JR);await pg.wait_for_timeout(800)
        await pg.click('#welcomeX')
        for v in ['Jazz trio','60s psych','80s','Forest folk','Hip-hop','House']:
            await pg.click('#bStart');await pg.wait_for_timeout(200)
            try: await pg.click(f'.vibe[data-v="{v}"]')
            except Exception as e: print('skip',v);continue
            await pg.wait_for_timeout(1500)
            await pg.evaluate('''()=>{window.__pk=0;window.__clip=0;window.__n=0;var buf=new Float32Array(__jr.A.an.fftSize);window.__t=setInterval(function(){__jr.A.an.getFloatTimeDomainData(buf);for(var i=0;i<buf.length;i++){var a=Math.abs(buf[i]);if(a>window.__pk)window.__pk=a;if(a>=.985)window.__clip++;window.__n++;}},8);}''')
            await pg.click('#bPlay');await pg.wait_for_timeout(9000);await pg.click('#bPlay')
            r=await pg.evaluate('()=>{clearInterval(window.__t);return [window.__pk,window.__clip,window.__n,__jr.A.c.state,__jr.A.c.sampleRate]}')
            print(v,[round(x,3) if isinstance(x,float) else x for x in r])
        await b.close()
asyncio.run(main())
