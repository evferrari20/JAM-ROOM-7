"""How hard does the sound engine work? Renders each starter song offline at 48 kHz as fast as possible
and reports 'x real time' (higher = lighter). Also runs the built-in Sound check speed test.
Headless numbers are only comparable with each other (same machine), not with a real Surface or iPad."""
import os,asyncio,json,sys
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
JS='''async()=>{
  await Promise.all(__jr.S.tracks.filter(t=>t.kind==='inst').map(t=>__jr.ensureSamples(t.inst)).concat([__jr.loadDrumKits()]));
  var sr=48000,L=__jr.LEN(),sp=__jr.spb(),N=2,dur=N*L*sp+1.5,best=1e9;
  for(var k=0;k<3;k++){var oc=new OfflineAudioContext(2,Math.ceil(dur*sr),sr),t=performance.now();await __jr.offRender(oc,N,L,0.05,false);best=Math.min(best,performance.now()-t);}
  return{seconds:+dur.toFixed(1),x:+(dur/(best/1000)).toFixed(1),tracks:__jr.S.tracks.length};}'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1300,'height':900})
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        out={}
        for v in sys.argv[1:] or ['Jazz trio','80s','Hip-hop','House','Pop']:
            await pg.click('#bStart');await pg.wait_for_timeout(200)
            try: await pg.click(f'.vibe[data-v="{v}"]')
            except Exception: print('skip',v);continue
            await pg.wait_for_timeout(800);out[v]=await pg.evaluate(JS);print(v,json.dumps(out[v]))
        sc=[await pg.evaluate('()=>__jr.scBench()') for _ in range(3)]
        print('sound-check bench x',[round(s,1) for s in sc])
        await b.close()
asyncio.run(main())
