import os;JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio
from playwright.async_api import async_playwright
JS='''async()=>{
  var id='flute';await __jr.ensureSamples(id);
  var oc=new OfflineAudioContext(1,44100*5,44100),g=oc.createGain();g.connect(oc.destination);
  var h=__jr.playInst(id,oc,g,60,0.05,.8);h.release(4.0);
  var b=await oc.startRendering(),x=b.getChannelData(0);
  var c=Math.round(2.702*44100);var mxv=0,mxi=0;for(var q=Math.round(2.6*44100);q<Math.round(2.8*44100);q++){var v=Math.abs(x[q]-2*x[q-1]+x[q-2]);if(v>mxv){mxv=v;mxi=q;}}c=mxi;
  var seg=Array.from(x.slice(c-8,c+8)).map(v=>+v.toFixed(4));
  var d2=[];for(var i=c-8;i<c+8;i++)d2.push(+(x[i]-2*x[i-1]+x[i-2]).toFixed(4));
  // steady-state typical d2 magnitude
  var s=0,n=0;for(i=c-3000;i<c-100;i++){s+=Math.abs(x[i]-2*x[i-1]+x[i-2]);n++;}
  return{maxd2:+mxv.toFixed(4),at:+(mxi/44100).toFixed(4),seg:seg,d2:d2,typ:+(s/n).toFixed(5)};}'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page();await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        print(await pg.evaluate(JS));await b.close()
asyncio.run(main())
