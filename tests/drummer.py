"""Drummer: every style at simple/busy x soft/loud, the XY pad, fills, whole-song mode, playback."""
import os,asyncio
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX')
        await pg.evaluate('()=>{var t=__jr.S.tracks.find(t=>t.kind==="drum");t.notes=[];}')
        await pg.click('.tcard >> nth=1',position={'x':60,'y':12});await pg.click('.tcard >> nth=0',position={'x':60,'y':12});await pg.wait_for_timeout(300)
        print('selected',await pg.evaluate('()=>__jr.selTrack().kind'))
        await pg.click('#dmBtn');await pg.wait_for_timeout(300)
        print('auto groove on open:',await pg.evaluate('()=>__jr.selTrack().notes.length'))
        await pg.evaluate('()=>document.getElementById("drummer").scrollIntoView({block:"start"})');await pg.wait_for_timeout(100)
        await pg.screenshot(path=OUT+'/drummer.png')
        styles=await pg.evaluate('()=>[...document.querySelectorAll(".dsty")].map(b=>b.dataset.ds)')
        xy=await (await pg.query_selector('#dmXY')).bounding_box()
        async def setxy(x,y):
            await pg.mouse.click(xy['x']+x*xy['width'],xy['y']+(1-y)*xy['height']);await pg.wait_for_timeout(120)
        for st in styles:
            await pg.click(f'.dsty[data-ds="{st}"]');row=[]
            for (x,y) in [(.05,.1),(.5,.5),(.95,.95)]:
                await setxy(x,y)
                row.append(await pg.evaluate('()=>{var n=__jr.selTrack().notes;return n.length+"/"+(n.reduce((a,b)=>a+b.v,0)/Math.max(1,n.length)).toFixed(2)}'))
            print(f'{st:12s} simple-soft {row[0]:>9s}  mid {row[1]:>9s}  busy-loud {row[2]:>9s}')
        # fills
        await pg.click('.dsty[data-ds="Rock"]');await setxy(.6,.6)
        for f in ['off','end','2']:
            await pg.select_option('#dmFill',f);await pg.wait_for_timeout(100)
            print('fills',f,'toms/snares in last beat of bar 4:',await pg.evaluate('()=>__jr.selTrack().notes.filter(n=>n.s>=15&&[1,5,8].includes(n.m)).length'),'bar 2:',await pg.evaluate('()=>__jr.selTrack().notes.filter(n=>n.s>=7&&n.s<8&&[1,5,8].includes(n.m)).length'))
        # whole song: start a 2-part song
        await pg.click('#bStart');await pg.click('.vibe[data-v="Pop"]');await pg.wait_for_timeout(1200)
        await pg.click('.tcard >> nth=1',position={'x':60,'y':12});await pg.click('.tcard >> nth=0',position={'x':60,'y':12});await pg.wait_for_timeout(300)
        if not await pg.query_selector('#drummer'):await pg.click('#dmBtn');await pg.wait_for_timeout(200)
        await pg.click('#dmSong');await pg.wait_for_timeout(300)
        print('whole song per part:',await pg.evaluate('''()=>{var t=__jr.selTrack(),S=__jr.S;return S.parts.map(p=>{var n=p.id===S.part?t.notes:t.pd[p.id].notes;return p.name+":"+n.length+" hits, crash "+n.filter(x=>x.m===7).length;}).join(" | ")}'''))
        await pg.evaluate('''()=>{window.__pk=0;var a=__jr.curA(),buf=new Float32Array(2048);clearInterval(window.__t);window.__t=setInterval(function(){a.an.getFloatTimeDomainData(buf);for(var i=0;i<buf.length;i++)window.__pk=Math.max(window.__pk,Math.abs(buf[i]));},10);}''')
        await pg.click('#bPlay');await pg.wait_for_timeout(2500);await pg.click('#bPlay')
        print('playback peak',round(await pg.evaluate('()=>window.__pk'),3))
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
