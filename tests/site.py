"""Website build: page loads small, packs load on demand, service worker caches them, drums+instruments play."""
import os,asyncio,subprocess,time
from playwright.async_api import async_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','site'))
async def main():
    srv=subprocess.Popen(['python3','-m','http.server','8765','-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
            ctx=await b.new_context(viewport={'width':1368,'height':912});pg=await ctx.new_page()
            errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));reqs=[];pg.on('request',lambda r:reqs.append(r.url))
            t=time.time();await pg.goto('http://localhost:8765/');await pg.wait_for_timeout(1500);print('load %.1fs'%(time.time()-t))
            await pg.click('#welcomeX')
            print('packs fetched at start:',len([u for u in reqs if '/s/' in u]))
            await pg.evaluate('''()=>{window.__pk=0;var buf=new Float32Array(1024);setInterval(function(){var a=__jr.curA();if(!a.an)return;a.an.getFloatTimeDomainData(buf);for(var i=0;i<1024;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},8);}''')
            await pg.click('.kb .wk >> nth=7');await pg.wait_for_timeout(1500)
            print('piano key peak',round(await pg.evaluate('()=>window.__pk'),3))
            await pg.evaluate('()=>window.__pk=0');await pg.click('#bPlay');await pg.wait_for_timeout(4000);await pg.click('#bPlay')
            print('playback peak',round(await pg.evaluate('()=>window.__pk'),3))
            print('sw:',await pg.evaluate('()=>navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active))'))
            print('cached packs:',await pg.evaluate("()=>caches.open('jr-packs').then(c=>c.keys()).then(k=>k.length)"))
            ok=await pg.evaluate('()=>new Promise(r=>{var t=Date.now();__jr.packsOffline&&0;r(1)})')
            print('errors',errs)
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
