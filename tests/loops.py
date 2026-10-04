"""Loops library: every loop renders notes in range for several scales, chord detection, preview audio, add as track / use on track."""
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
        await pg.click('#bStart');await pg.click('.vibe[data-v="Pop"]');await pg.wait_for_timeout(1200)
        print('Pop starter verse uses degrees [0,4,5,3]; detected:',await pg.evaluate('()=>JSON.stringify(__jr.loops.detect())'))
        for sc in ['Major','Minor','Dorian','Major pentatonic','Blues']:
            r=await pg.evaluate('''(sc)=>{__jr.S.scale=sc;var bad=[],tot=0,out=0;__jr.loops.all().forEach(function(L){var n=__jr.loops.notes(L,4);tot+=n.length;if(!n.length)bad.push(L.n);
              n.forEach(function(x){var lo=L.dr?0:24,hi=L.dr?11:100;if(x.m<lo||x.m>hi||x.s<0||x.s>=16||!(x.d>0))out++;});});return {tot:tot,bad:bad,out:out};}''',sc)
            print(f'{sc:17s} notes {r["tot"]}, empty loops {r["bad"]}, out of range {r["out"]}')
        await pg.evaluate('()=>{__jr.S.scale="Major"}')
        # in-key check: pitched loops only use notes from the scale (Major)
        r=await pg.evaluate('''()=>{var S=__jr.S,sc=[0,2,4,5,7,9,11],off=0,tot=0;__jr.loops.all().filter(L=>!L.dr&&!L.walk).forEach(function(L){__jr.loops.notes(L,4).forEach(function(x){tot++;if(sc.indexOf(((x.m-S.key)%12+12)%12)<0)off++;});});return off+'/'+tot}''')
        print('notes outside the key (walking bass excluded):',r)
        await pg.click('#bLoops');await pg.wait_for_timeout(300)
        print('cards',await pg.evaluate('()=>document.querySelectorAll(".lcard").length'),'categories',await pg.evaluate('()=>[...document.querySelectorAll(".lnav button")].map(b=>b.textContent).join(", ")'))
        await pg.screenshot(path=OUT+'/loops.png')
        await pg.evaluate(PEAK)
        for name in ['Garage Rock','Motown Walk','Folk Strum','Rhodes Glow','Neon Lead','Walking Jazz']:
            await pg.fill('#lpQ',name);await pg.wait_for_timeout(100)
            await pg.evaluate('()=>window.__pk=0');await pg.click('.lcard .lplay');await pg.wait_for_timeout(2200)
            print('preview',name,'peak',round(await pg.evaluate('()=>window.__pk'),3));await pg.click('.lcard .lplay');await pg.wait_for_timeout(100)
        n0=await pg.evaluate('()=>__jr.S.tracks.length')
        await pg.fill('#lpQ','Folk Strum');await pg.click('.lcard [data-a=add]');await pg.wait_for_timeout(300)
        print('tracks',n0,'->',await pg.evaluate('()=>__jr.S.tracks.length'),'new',await pg.evaluate('()=>{var t=__jr.selTrack();return t.inst+" "+t.notes.length+" notes"}'))
        await pg.fill('#lpQ','Clean Jangle');await pg.click('.lcard [data-a=use]');await pg.wait_for_timeout(300)
        print('use on selected ->',await pg.evaluate('()=>{var t=__jr.selTrack();return t.inst+" "+t.notes.length+" notes"}'),'tracks',await pg.evaluate('()=>__jr.S.tracks.length'))
        # in time with the song: play the song, preview a loop
        await pg.click('[data-x=close]');await pg.click('#bPlay');await pg.wait_for_timeout(500);await pg.click('#bLoops');await pg.fill('#lpQ','Brass Stabs');await pg.click('.lcard .lplay');await pg.wait_for_timeout(2500)
        print('preview while playing ok, playing:',await pg.evaluate('()=>!!document.querySelector("#bPlay[aria-label=Stop], #bPlay.on")'))
        await pg.click('[data-x=close]');await pg.click('#bPlay')
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
