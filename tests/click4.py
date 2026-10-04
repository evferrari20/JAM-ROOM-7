import os;JR=os.environ.get("JR") or "file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio,sys
from playwright.async_api import async_playwright
JS='''async(args)=>{
  var out=[];
  for(var id of args.ids){
    await __jr.ensureSamples(id);var si=__jr.getSI()[id];
    for(var m of args.notes){
      var b0=si.bufs.reduce((a,b)=>Math.abs(b.m-m)<Math.abs(a.m-m)?b:a);
      var oc=new OfflineAudioContext(1,44100*5,44100),g=oc.createGain();g.connect(oc.destination);
      var h=__jr.playInst(id,oc,g,m,0.05,.8);h.release(4.0);
      var b=await oc.startRendering(),x=b.getChannelData(0),n=x.length;
      var d2=new Float32Array(n);for(var i=2;i<n;i++)d2[i]=Math.abs(x[i]-2*x[i-1]+x[i-2]);
      var pk=0;for(i=0;i<n;i++)pk=Math.max(pk,Math.abs(x[i]));
      var ev=[],last=-9999;
      for(i=Math.floor(.5*44100);i<Math.floor(3.9*44100);i++){
        var lo=Math.max(0,i-1024),hi=Math.min(n,i+1024),s=0;for(var j=lo;j<hi;j+=4)s+=d2[j];var mean=s/((hi-lo)/4)+1e-6;
        if(d2[i]>8*mean&&d2[i]>.06*pk){if(i-last>300)ev.push(+(i/44100).toFixed(3));last=i;}}
      var rate=Math.pow(2,(m-b0.m)/12),ls=b0.buf._ls,le=b0.buf._le;
      var wraps=[];if(ls!=null&&!b0.buf._nl){var t=0.05+le/rate,per=(le-ls)/rate;for(var k=0;k<4;k++)wraps.push(+(t+k*per).toFixed(3));}
      out.push({id:id,m:m,root:b0.m,loopS:ls&&+ls.toFixed(3),loopE:le&&+le.toFixed(3),events:ev.slice(0,8),wraps:wraps});
    }
  }
  return out;}'''
async def main(ids):
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1300,'height':900})
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX')
        r=await pg.evaluate(JS,{'ids':ids,'notes':[60]})
        for x in r: print(x)
        await b.close()
asyncio.run(main(sys.argv[1:]))
