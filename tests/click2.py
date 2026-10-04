import os;JR="file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","dist","jam-room.html"))
import asyncio,numpy as np
from playwright.async_api import async_playwright
JS='''async(args)=>{
  var ids=args.ids,notes=args.notes,res={};
  for(var id of ids){
    try{await __jr.ensureSamples(id);}catch(e){}
    res[id]=[];
    for(var m of notes){
      var oc=new OfflineAudioContext(1,44100*5,44100),g=oc.createGain();g.connect(oc.destination);
      try{var h=__jr.playInst(id,oc,g,m,0.05,.8);h.release(4.0);}catch(e){res[id].push([m,'ERR '+e]);continue;}
      var b=await oc.startRendering();res[id].push([m,Array.from(b.getChannelData(0))]);
    }
  }
  return res;}'''
def clicks(x,sr=44100,t0=.5,t1=3.9):
    x=np.asarray(x,dtype=np.float32)[int(t0*sr):int(t1*sr)]
    if len(x)<1000 or np.abs(x).max()<1e-4: return -1,0
    d2=np.abs(x[2:]-2*x[1:-1]+x[:-2])
    med=np.convolve(d2,np.ones(2048)/2048,mode='same')+1e-6
    pk=np.abs(x).max()
    flag=(d2>8*med)&(d2>0.06*pk)
    idx=np.flatnonzero(flag);ev=[];last=-9999
    for i in idx:
        if i-last>300: ev.append(i)
        last=i
    return len(ev),float(pk)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1300,'height':900})
        await pg.goto(JR);await pg.wait_for_timeout(1000);await pg.click('#welcomeX')
        ids=await pg.evaluate("()=>Object.keys(window.__jr.SD).filter(k=>!k.startsWith('kit'))")
        ids=[i for i in ids if i!='piano_s' and i!='epiano_s']
        allids=await pg.evaluate("()=>INST_NAME_LIST") if False else None
        bad=[]
        for i in range(0,len(ids),6):
            r=await pg.evaluate(JS,{'ids':ids[i:i+6],'notes':[48,60,72]})
            for id,arr in r.items():
                for m,x in arr:
                    if isinstance(x,str): print(id,m,x);continue
                    n,pk=clicks(x)
                    if n>0: bad.append((id,m,n))
        print('instruments tested',len(ids));print('with clicks:',bad)
        await b.close()
asyncio.run(main())
