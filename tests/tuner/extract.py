"""Tuner bench, step 1: cut real notes out of Jam Room's sound packs into raw 48 kHz audio.
   python3 tests/tuner/extract.py /tmp/tuner-corpus   (needs ffmpeg)
   Step 2: node tests/tuner/bench.mjs /tmp/tuner-corpus"""
import json, subprocess, os, sys
PK='/home/user/JAM-ROOM-7/src/samples/packs'; OUT=sys.argv[1] if len(sys.argv)>1 else '/tmp/tuner-corpus'
os.makedirs(OUT, exist_ok=True)
# instrument -> (midi lo, hi): ranges the tuner is used for
WANT={'steel':(40,76),'nylon':(40,81),'eguitar':(40,76),'ebass':(23,55),'jazzbass':(28,55),'contrabass':(28,55),
      'violin':(55,88),'cello':(36,69),'piano':(33,93),'banjo':(48,79),'trumpet':(52,82),'sax':(49,81),'flute':(60,93),'harp':(40,76)}
idx=[]
for inst,(lo,hi) in WANT.items():
    j=json.load(open(f'{PK}/{inst}.json')); data=open(f'{PK}/{inst}.bin','rb').read()
    seen=set()
    for r in j['r']:
        key,vel,rr,off,ln=r[:5]
        if not(lo<=key<=hi) or rr!=0: continue
        if (key,vel) in seen: continue
        # keep the loudest-but-one velocity layer only, plus the softest, to limit size
        seen.add((key,vel))
        name=f'{inst}_{key}_v{vel}'
        mp3=f'{OUT}/{name}.mp3'; open(mp3,'wb').write(data[off:off+ln])
        raw=f'{OUT}/{name}.f32'
        subprocess.run(['ffmpeg','-v','error','-y','-i',mp3,'-ac','1','-ar','48000','-f','f32le',raw],check=True)
        os.remove(mp3)
        idx.append({'name':name,'inst':inst,'key':key,'vel':vel})
json.dump(idx,open(f'{OUT}/index.json','w'))
from collections import Counter
print(len(idx),'clips', Counter(i['inst'] for i in idx))
