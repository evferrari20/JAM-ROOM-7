"""Note editor: add, select, move, resize, double-tap delete, box select, copy/paste, duplicate, transpose, velocity lane, touch pan, undo."""
import os,asyncio
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
OUT=os.environ.get('SHOT','/tmp')
N='()=>__jr.selTrack().notes.length'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1368,'height':912});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(JR);await pg.wait_for_timeout(1200);await pg.click('#welcomeX')
        # pick the first instrument track
        await pg.evaluate('''()=>{var c=[...document.querySelectorAll('.tcard')].find(x=>/piano|keys|Rhodes|Grand/i.test(x.innerText));(c||document.querySelectorAll('.tcard')[1]).click()}''')
        await pg.wait_for_timeout(400)
        kind=await pg.evaluate('()=>__jr.selTrack().kind+" "+__jr.selTrack().inst');print('track',kind)
        await pg.evaluate('()=>{__jr.selTrack().notes=[];__jr.roll().draw()}')
        await pg.evaluate('()=>{var h=document.getElementById("roll");document.getElementById("rtools").scrollIntoView({block:"start"});h.scrollTop=(96-84)*18;}');await pg.wait_for_timeout(200)
        cv=await pg.query_selector('#roll canvas');bb=await cv.bounding_box()
        geo=await pg.evaluate('()=>{var r=__jr.roll(),h=document.getElementById("roll");return{cw:r.cw(),Gw:r.Gw,sl:h.scrollLeft,st:h.scrollTop,hi:r.hi}}')
        cw,Gw,st,hi=geo['cw'],geo['Gw'],geo['st'],geo['hi'];rh=18;HDR=22
        def xy(beat,m):return bb['x']+Gw+beat*4*cw-geo['sl']+3, bb['y']+HDR+(hi-m)*rh-st+rh/2
        x,y=xy(0,72);await pg.mouse.click(x,y);await pg.wait_for_timeout(200)
        x,y=xy(1,76);await pg.mouse.click(x,y);await pg.wait_for_timeout(200)
        x,y=xy(2,79);await pg.mouse.click(x,y);await pg.wait_for_timeout(200)
        print('added',await pg.evaluate(N),'sel',await pg.evaluate('()=>__jr.roll().sel.size'))
        # move note at beat 0 / C4 two 16ths right and up 2 semitones
        x,y=xy(0,72);await pg.mouse.move(x+4,y);await pg.mouse.down();await pg.mouse.move(x+4+2*cw,y-2*rh,steps=6);await pg.mouse.up()
        print('moved',await pg.evaluate('()=>JSON.stringify(__jr.selTrack().notes.map(n=>[n.s,n.m,n.d]))'))
        # resize the note at beat 1 (E4): drag right edge by 4 cells
        n1=await pg.evaluate('()=>{var n=__jr.selTrack().notes.find(n=>n.m===76);return[n.s,n.d]}')
        ex=bb['x']+Gw+(n1[0]+n1[1])*4*cw-geo['sl']-4;_,y=xy(1,76)
        await pg.mouse.move(ex,y);await pg.mouse.down();await pg.mouse.move(ex+4*cw,y,steps=6);await pg.mouse.up()
        print('resized E4 d',n1[1],'->',await pg.evaluate('()=>__jr.selTrack().notes.find(n=>n.m===76).d'))
        # double-tap delete G4
        x,y=xy(2,79);await pg.mouse.click(x,y);await pg.wait_for_timeout(80);await pg.mouse.click(x,y);await pg.wait_for_timeout(200)
        print('after double-tap delete',await pg.evaluate(N))
        # box select everything (mouse drag on empty space)
        x0,y0=xy(3.5,84);x1,y1=xy(-.0,70);await pg.mouse.move(x0,y0);await pg.mouse.down();await pg.mouse.move(bb['x']+Gw+2,y1+rh,steps=8);await pg.mouse.up()
        print('box selected',await pg.evaluate('()=>__jr.roll().sel.size'))
        await pg.screenshot(path=OUT+'/roll_select.png')
        # copy, set marker in ruler at bar 2, paste
        await pg.keyboard.press('Control+c');await pg.mouse.click(bb['x']+Gw+4*4*cw-geo['sl']+2,bb['y']+10);await pg.keyboard.press('Control+v');await pg.wait_for_timeout(100)
        print('after paste',await pg.evaluate(N),'cursor',await pg.evaluate('()=>__jr.roll().cursor'))
        await pg.keyboard.press('Control+d');await pg.wait_for_timeout(100)
        print('after duplicate',await pg.evaluate(N),await pg.evaluate('()=>JSON.stringify(__jr.selTrack().notes.map(n=>n.s).sort((a,b)=>a-b))'))
        # transpose selection up an octave with Shift+ArrowUp, then a step down with ArrowDown
        before=await pg.evaluate('()=>[...__jr.roll().sel].map(n=>n.m).join(",")')
        await pg.keyboard.press('Shift+ArrowUp');await pg.keyboard.press('ArrowDown')
        print('transpose',before,'->',await pg.evaluate('()=>[...__jr.roll().sel].map(n=>n.m).join(",")'),'oct still',await pg.evaluate('()=>__jr.S.oct'))
        # velocity lane: drag up on first selected note's stem
        await pg.keyboard.press('Control+a')
        await pg.click('#rtools details.more summary');await pg.click('#rtools [data-r=vel]');await pg.evaluate('()=>document.getElementById("vlane").scrollIntoView({block:"center"})');await pg.wait_for_timeout(200)
        geo['sl']=await pg.evaluate('()=>document.getElementById("roll").scrollLeft')
        lane=await (await pg.query_selector('#vlane canvas')).bounding_box()
        sx=lane['x']+Gw+1*4*cw-geo['sl']+3
        await pg.mouse.move(sx,lane['y']+30);await pg.mouse.down();await pg.mouse.move(sx,lane['y']+50,steps=4);await pg.mouse.up()
        print('velocities',await pg.evaluate('()=>__jr.selTrack().notes.map(n=>n.v).join(",")'))
        # undo
        await pg.wait_for_timeout(600);c0=await pg.evaluate(N);await pg.keyboard.press('Delete');c1=await pg.evaluate(N)
        await pg.wait_for_timeout(600);await pg.keyboard.press('Control+z');await pg.wait_for_timeout(300)
        print('delete',c0,'->',c1,'undo ->',await pg.evaluate(N))
        # touch: pan on empty space scrolls instead of adding notes
        await pg.evaluate('()=>{document.getElementById("roll").scrollTop=200}');st0=await pg.evaluate('()=>document.getElementById("roll").scrollTop');cnt=await pg.evaluate(N)
        await pg.evaluate('''([x,y])=>{var c=document.querySelector('#roll canvas');function ev(t,yy){c.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:7,pointerType:'touch',clientX:x,clientY:yy,button:0,buttons:1,isPrimary:true}));}
          ev('pointerdown',y);for(var i=1;i<=8;i++)ev('pointermove',y-i*12);ev('pointerup',y-96);}''',[bb['x']+Gw+7.3*4*cw,bb['y']+60])
        print('touch pan scrollTop',st0,'->',await pg.evaluate('()=>document.getElementById("roll").scrollTop'),'notes unchanged',cnt==await pg.evaluate(N))
        await pg.click('#rtools [data-r=zi]');await pg.wait_for_timeout(200)
        await pg.evaluate('()=>document.getElementById("rtools").scrollIntoView({block:"start"})')
        await pg.screenshot(path=OUT+'/roll_zoom.png')
        # drums: tap adds hit, arrow moves row
        await pg.click('.tcard >> nth=0');await pg.wait_for_timeout(400)
        print('drum track',await pg.evaluate('()=>__jr.selTrack().kind'),'hits',await pg.evaluate(N))
        await pg.screenshot(path=OUT+'/roll_drums.png')
        print('errors',errs[:5]);await b.close()
asyncio.run(main())
