import os;JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1440,'height':960})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200)
        await pg.click('#welcomeX')
        await pg.click('#bStart');await pg.wait_for_timeout(200)
        await pg.click('.vibe[data-v="Jazz trio"]');await pg.wait_for_timeout(500)
        vols0=await pg.evaluate('()=>__jr.S.tracks.map(t=>[t.name,t.vol,t.pan||0,t.rev])')
        m0=await pg.evaluate('()=>__jr.S.master')
        await pg.click('#bPolish')
        await pg.wait_for_selector('text=Mix polished',timeout=90000)
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/f2.png')
        vols1=await pg.evaluate('()=>__jr.S.tracks.map(t=>[t.name,t.vol,t.pan||0,t.rev])')
        print('before',vols0,m0);print('after ',vols1,await pg.evaluate('()=>[__jr.S.master,__jr.S.fin]'))
        await pg.click('[data-x=ok]')
        # play and measure peaks
        await pg.evaluate('''()=>{window.__pk=0;window.__cl=0;var buf=new Float32Array(1024);window.__t=setInterval(function(){var A=__jr.A;A.an.getFloatTimeDomainData(buf);for(var i=0;i<1024;i++){var a=Math.abs(buf[i]);if(a>window.__pk)window.__pk=a;if(a>=.985)window.__cl++;}},8);}''')
        await pg.click('#bPlay');await pg.wait_for_timeout(8000);await pg.click('#bPlay')
        print('play peak/clips',await pg.evaluate('()=>[window.__pk.toFixed(3),window.__cl]'))
        # undo test
        await pg.click('#bPolish');await pg.wait_for_selector('text=Mix polished',timeout=90000);await pg.click('[data-x=undo]')
        print('after undo',await pg.evaluate('()=>__jr.S.tracks.map(t=>[t.vol,t.pan||0])'))
        # share
        await pg.click('#bMenu');await pg.wait_for_timeout(300);await pg.click('[data-x=link]');await pg.wait_for_selector('#shLink')
        print('link empty before base:',repr(await pg.input_value('#shLink'))[:40])
        await pg.fill('#shBase','https://example.netlify.app/');await pg.wait_for_timeout(200)
        link=await pg.input_value('#shLink');print('link len',len(link),link[:60])
        await pg.screenshot(path='/tmp/f3.png')
        await pg.click('[data-x=close]')
        name=await pg.evaluate('()=>__jr.S.name');ntr=await pg.evaluate('()=>__jr.S.tracks.length')
        # open the link on file:// (same page) in a fresh context
        code=link.split('#s=')[1]
        ctx2=await b.new_context(viewport={'width':1440,'height':960});pg2=await ctx2.new_page()
        e2=[];pg2.on('pageerror',lambda e:e2.append(str(e)))
        await pg2.goto(JR+'#s='+code);await pg2.wait_for_timeout(2500)
        print('friend sees',await pg2.evaluate('()=>[__jr.S.name,__jr.S.tracks.length,__jr.S.tracks.map(t=>t.inst).join(",")]'),'expected',name,ntr,e2)
        print('modal text:',(await pg2.inner_text('#mBox'))[:80].replace('\n',' | '))
        await pg2.screenshot(path='/tmp/f4.png')
        # output dialog
        await pg.click('#bOut');await pg.wait_for_timeout(600);await pg.screenshot(path='/tmp/f5.png')
        await pg.click('[data-x=fix]');await pg.wait_for_timeout(500)
        print('errs',errs,e2)
        await b.close()
asyncio.run(main())
