"""Match the loudness of upgraded sound packs to the previous versions, so existing songs keep their mix balance.

  python3 tools/calibrate.py OLD_COMMIT id id ...    (ids of upgraded packs; 'kit' for the acoustic drum kit)

Renders notes / drum hits through the real app engine (offline) in the old build and the new build,
then stores gain (instruments) or pg (per drum pad) in src/samples/packs/<id>.json. Re-run assemble.py after.
"""
import os, sys, json, asyncio, subprocess, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from packs import PK
from playwright.async_api import async_playwright

JS = '''async(a)=>{var ids=a.ids,neutral=a.neutral,out={};
 function rms(x){var s=0;for(var i=0;i<x.length;i++)s+=x[i]*x[i];return Math.sqrt(s/x.length);}
 for(var id of ids){
  if(id==='kit'){
    if(neutral&&__jr.SD.kit)delete __jr.SD.kit.pg;
    await __jr.loadKit('Studio');var pads=[];
    for(var pi=0;pi<12;pi++){var oc=new OfflineAudioContext(1,44100*.6,44100),g=oc.createGain();g.connect(oc.destination);
      __jr.drum(oc,g,pi,0.02,.8,'Studio');pads.push(rms((await oc.startRendering()).getChannelData(0)));}
    out.kit=pads;continue;}
  if(neutral&&__jr.SD[id])delete __jr.SD[id].gain;
  await __jr.ensureSamples(id);var e=__jr.SD[id];if(!e){out[id]=null;continue;}
  var ks=e.r.map(r=>+r[0]).sort((p,q)=>p-q),mid=ks[Math.floor(ks.length/2)],lo=ks[Math.floor(ks.length/4)],hi=ks[Math.floor(ks.length*3/4)],v=[];
  for(var m of [lo,mid,hi]){var oc=new OfflineAudioContext(1,44100*1.2,44100),g=oc.createGain();g.connect(oc.destination);
    var h=__jr.playInst(id,oc,g,Math.round(m),0.02,.8);h.release(1.0);v.push(rms((await oc.startRendering()).getChannelData(0)));}
  out[id]=v;}
 return out;}'''


async def measure(path, ids, neutral):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto('file://' + os.path.abspath(path)); await pg.wait_for_timeout(1500)
        r = await pg.evaluate(JS, {'ids': ids, 'neutral': neutral}); await b.close(); return r


def db(x): return 20 * math.log10(max(x, 1e-9))


def main():
    old, ids = sys.argv[1], sys.argv[2:]
    wt = '/tmp/jr_old_' + old
    if not os.path.isdir(wt):
        subprocess.run(['git', 'worktree', 'add', '-f', wt, old], check=True, capture_output=True)
        t = open(wt + '/src/app.template.html').read()
        t = t.replace('curA:function(){return A;},', 'curA:function(){return A;},drum:function(){return drum.apply(null,arguments);},loadKit:function(n){return loadKit(n);},', 1)
        open(wt + '/src/app.template.html', 'w').write(t)
        subprocess.run(['python3', 'tools/assemble.py'], cwd=wt, check=True, capture_output=True)
    for id in ids:   # measure the new packs without any earlier correction
        f = os.path.join(PK, id + '.json'); m = json.load(open(f)); m.pop('gain', None); m.pop('pg', None)
        json.dump(m, open(f, 'w'), separators=(',', ':'))
    subprocess.run(['python3', 'tools/assemble.py'], check=True, capture_output=True)
    a = asyncio.run(measure(wt + '/dist/jam-room.html', ids, False))
    b = asyncio.run(measure('dist/jam-room.html', ids, True))
    # target = the old loudness, unless the old instrument was itself an outlier (more than 8 dB from the typical
    # level), in which case use the typical level instead
    olds = {i: sum(db(x) for x in a[i]) / len(a[i]) for i in ids if i != 'kit' and a.get(i) and b.get(i)}
    med = sorted(olds.values())[len(olds) // 2] if olds else -20
    for id in ids:
        f = os.path.join(PK, id + '.json'); m = json.load(open(f))
        if id == 'kit':
            pg = [round(min(6, max(.05, (x / y) if y > 1e-6 else 1)), 3) for x, y in zip(a['kit'], b['kit'])]
            m['pg'] = pg; print('kit pad gains', pg)
        else:
            if not b.get(id): print(id, 'skipped'); continue
            newdb = sum(db(y) for y in b[id]) / len(b[id])
            tgt = olds.get(id, med); note = ''
            if abs(tgt - med) > 8: note = ' (old level %.1f dB was an outlier; using typical %.1f dB)' % (tgt, med); tgt = med
            d = tgt - newdb
            m['gain'] = round(10 ** (d / 20), 3); print('%-12s %+5.1f dB -> gain %.3f%s' % (id, d, m['gain'], note))
        json.dump(m, open(f, 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()
