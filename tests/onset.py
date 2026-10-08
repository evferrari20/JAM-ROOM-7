"""How late does each instrument's sound start after the scheduled time? (MP3 encoder padding check)"""
import os,asyncio,sys
from playwright.async_api import async_playwright
JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
JS='''async(ids)=>{var out=[];for(var id of ids){await __jr.ensureSamples(id);
 for(var m of [48,60,72]){var oc=new OfflineAudioContext(1,44100*1,44100),g=oc.createGain();g.connect(oc.destination);
  var h=__jr.playInst(id,oc,g,m,0.1,.8);h.release(.8);var b=await oc.startRendering(),x=b.getChannelData(0),pk=0,i;
  for(i=0;i<x.length;i++)pk=Math.max(pk,Math.abs(x[i]));for(i=0;i<x.length;i++)if(Math.abs(x[i])>pk*.05)break;
  out.push([id,m,+((i/44100-0.1)*1000).toFixed(1)+'ms',+pk.toFixed(3)]);}}return out;}'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page();await pg.goto(JR);await pg.wait_for_timeout(800)
        for r in await pg.evaluate(JS,sys.argv[1:] or ['piano','steel']):print(r)
        await b.close()
asyncio.run(main())
