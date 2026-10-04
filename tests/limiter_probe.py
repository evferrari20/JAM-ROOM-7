"""Render each starter song through the full master chain (offline, 48 kHz) and log
how hard the compressor and limiter work, plus peak level. Usage: python3 tests/limiter_probe.py"""
import os,asyncio,json,sys
from playwright.async_api import async_playwright
JR="file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
JS='''async()=>{
  await Promise.all(__jr.S.tracks.filter(t=>t.kind==='inst').map(t=>__jr.ensureSamples(t.inst)).concat([__jr.loadDrumKits()]));
  var sr=48000,L=__jr.LEN(),sp=__jr.spb(),dur=Math.min(12,L*sp+1),oc=new OfflineAudioContext(2,Math.ceil(dur*sr),sr),lim=[],comp=[];
  for(var t=0.05;t<dur-0.05;t+=0.01){(function(t){oc.suspend(t).then(function(){var a=__jr.curA();if(a&&a.lim){lim.push(a.lim.reduction);comp.push(a.comp.reduction);}oc.resume();});})(t);}
  var b=await __jr.offRender(oc,1,L,0.05,false),x=b.getChannelData(0),pk=0;for(var i=0;i<x.length;i++)pk=Math.max(pk,Math.abs(x[i]));
  function st(a){a=a.map(Math.abs).sort((p,q)=>p-q);return{med:+a[a.length>>1].toFixed(2),p90:+a[Math.floor(a.length*.9)].toFixed(2),max:+a[a.length-1].toFixed(2),
    pctOver1dB:+(100*a.filter(v=>v>1).length/a.length).toFixed(0)};}
  // how fast limiter gain moves: mean abs change per 10ms
  var mv=0;for(i=1;i<lim.length;i++)mv+=Math.abs(lim[i]-lim[i-1]);
  return{peak:+pk.toFixed(3),lim:st(lim),limMovePer10ms:+(mv/lim.length).toFixed(2),comp:st(comp)};}'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1300,'height':900})
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX')
        vibes=sys.argv[1:] or ['Jazz trio','60s psych','80s','Forest folk','Hip-hop','House']
        for v in vibes:
            await pg.click('#bStart');await pg.wait_for_timeout(200)
            try: await pg.click(f'.vibe[data-v="{v}"]')
            except Exception: print('skip',v);continue
            await pg.wait_for_timeout(800)
            print(v,json.dumps(await pg.evaluate(JS)))
        await b.close()
asyncio.run(main())
