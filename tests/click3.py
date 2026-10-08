import os;JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio,sys
from playwright.async_api import async_playwright
JS='''async(args)=>{
  function clicks(x,sr){var a=Math.floor(.5*sr),b=Math.floor(3.9*sr),pk=0,i;for(i=a;i<b;i++){var v=Math.abs(x[i]);if(v>pk)pk=v;}
    if(pk<1e-4)return[-1,pk];
    var n=b-a-2,d2=new Float32Array(n);for(i=0;i<n;i++)d2[i]=Math.abs(x[a+i+2]-2*x[a+i+1]+x[a+i]);
    // running mean of d2 (window 2048)
    var W=2048,cs=new Float64Array(n+1);for(i=0;i<n;i++)cs[i+1]=cs[i]+d2[i];
    var ev=0,last=-9999;for(i=0;i<n;i++){var lo=Math.max(0,i-W/2),hi=Math.min(n,i+W/2),mean=(cs[hi]-cs[lo])/(hi-lo)+1e-6;
      if(d2[i]>8*mean&&d2[i]>.06*pk){if(i-last>300)ev++;last=i;}}
    return[ev,pk];}
  var out=[];
  for(var id of args.ids){
    try{await __jr.ensureSamples(id);}catch(e){}
    for(var m of args.notes){
      var oc=new OfflineAudioContext(1,44100*5,44100),g=oc.createGain();g.connect(oc.destination);
      try{var h=__jr.playInst(id,oc,g,m,0.05,.8);h.release(4.0);}catch(e){out.push([id,m,'ERR '+e]);continue;}
      var b=await oc.startRendering(),r=clicks(b.getChannelData(0),44100);
      if(r[0]!==0)out.push([id,m,r[0],+r[1].toFixed(3)]);
    }
  }
  return out;}'''
async def main(a,b_):
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1300,'height':900})
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX');await pg.evaluate('()=>{if(!__jr.S.tracks.length)__jr.classicStart();}');await pg.wait_for_timeout(300)
        ids=await pg.evaluate("()=>Object.keys(window.__jr.SD).filter(k=>!k.startsWith('kit')&&k!=='piano_s'&&k!=='epiano_s')")
        ids=ids[a:b_]
        r=await pg.evaluate(JS,{'ids':ids,'notes':[48,60,72]})
        print(len(ids),'tested',ids[:3],'..');print('flagged:',r)
        await b.close()
asyncio.run(main(int(sys.argv[1]),int(sys.argv[2])))
