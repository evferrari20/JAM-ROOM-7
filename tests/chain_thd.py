"""Distortion (THD) of a bass/piano tone through the master chain: old settings vs new.
Shows how much the limiter itself dirties the sound. Usage: python3 tests/chain_thd.py"""
import asyncio,json
from playwright.async_api import async_playwright
JS='''async(cfg)=>{
  var out={};
  for(var f of [55,110,220]){
    var sr=48000,n=sr*2,oc=new OfflineAudioContext(1,n,sr),o=oc.createOscillator(),g=oc.createGain();
    o.frequency.value=f;g.gain.value=cfg.amp;o.connect(g);var last=g;
    for(var c of cfg.chain){var d=oc.createDynamicsCompressor();d.threshold.value=c[0];d.knee.value=c[1];d.ratio.value=c[2];d.attack.value=c[3];d.release.value=c[4];last.connect(d);last=d;}
    last.connect(oc.destination);o.start();
    var b=await oc.startRendering(),x=b.getChannelData(0).slice(sr,sr+sr); // last second, steady
    // DFT at harmonics
    function mag(h){var re=0,im=0,w=2*Math.PI*f*h/sr;for(var i=0;i<x.length;i++){re+=x[i]*Math.cos(w*i);im+=x[i]*Math.sin(w*i);}return Math.hypot(re,im);}
    var h1=mag(1),hs=0;for(var h=2;h<=8;h++){var m=mag(h);hs+=m*m;}
    out[f+'Hz']=+(100*Math.sqrt(hs)/h1).toFixed(2);
  }
  return out;}'''
OLD=[[-14,20,3,.005,.2],[-6,0,20,.002,.08]]
NEW=[[-16,12,2.5,.01,.3],[-3,6,12,.004,.35]]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page()
        for amp in [.5,.8]:
            for name,ch in [('old',OLD),('new',NEW),('none',[])]:
                print('amp',amp,name,'THD %',json.dumps(await pg.evaluate(JS,{'amp':amp,'chain':ch})))
        await b.close()
asyncio.run(main())
