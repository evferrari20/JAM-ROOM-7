from specs1 import *
import urllib.parse
from ls2 import ls
def vsfiles(d): return [n for n,t in ls('sgossner/VSCO-2-CE','master',d) if t=='file']
def vsname_m(fn,pat):
    m=re.search(pat,fn); return n2m(m.group(1))+12
if want('strings'):
    items=[]
    secs=[('Strings/Cello Section/susvib',r'susvib_([A-G]#?\d)_v3_1'),('Strings/Viola Section/susvib',r'_([A-G]#?\d)_v2_1'),('Strings/Violin Section/susVib',r'_([A-G]#?\d)_v2\.wav')]
    pool={}
    for d,pat in secs:
        for f in vsfiles(d):
            if re.search(pat,f): pool.setdefault(d,{})[vsname_m(f,pat)]=d+'/'+f
    print({d:sorted(v) for d,v in pool.items()})
    want_keys=[36,41,46,50,55,60,64,69,74,79,84]
    for k in want_keys:
        d=secs[0][0] if k<52 else (secs[1][0] if k<64 else secs[2][0])
        best=min(pool[d],key=lambda x:abs(x-k)); items.append((best,vs(pool[d][best]),0))
    items=list({i[0]:i for i in items}.values())
    build('strings',items,2.8,loop=True,thr=.08)
if want('pizz'):
    secs=[('Strings/Cello Section/pizzT',r'pizzT_([A-G]#?\d)_v2_RR1'),('Strings/Viola Section/pizz',r'_([A-G]#?\d)_v2_rr1'),('Strings/Violin Section/Pizz',r'_([A-G]#?\d)_v2_rr1')]
    pool={}
    for d,pat in secs:
        for f in vsfiles(d):
            if re.search(pat,f): pool.setdefault(d,{})[vsname_m(f,pat)]=d+'/'+f
    items={}
    for k in [36,41,46,50,55,60,64,69,74,79,84]:
        d=secs[0][0] if k<50 else (secs[1][0] if k<62 else secs[2][0])
        best=min(pool[d],key=lambda x:abs(x-k)); items[best]=(best,vs(pool[d][best]),0)
    build('pizz',list(items.values()),1.3)
if want('oboe'):
    fs=[f for f in vsfiles('Woodwinds/Oboe/Vib') if '_v3_' in f]
    build('oboe',[(vsname_m(f,r'Vib_([A-G]#?\d)_'),vs('Woodwinds/Oboe/Vib/'+f),0) for f in fs],2.6,loop=True,thr=.08)
if want('piccolo'):
    fs=vsfiles('Woodwinds/Piccolo/Sus')
    build('piccolo',[(vsname_m(f,r'piccolo_([A-G]#?\d)_'),vs('Woodwinds/Piccolo/Sus/'+f),0) for f in fs],2.2,loop=True,thr=.08)
# MusyngKite
def gm(id,name,keys,dur,loop=False,**kw):
    if want(id): build(id,[(k,gl(name,k),0) for k in keys],dur,loop=loop,**kw)
gm('celesta','celesta',[60,65,70,75,80,85,90,96],2.2,durfn=decay(2.4,1.2))
gm('clav','clavinet',[36,42,48,54,60,66,72,78,84],1.4)
gm('drawbar','drawbar_organ',[36,42,48,54,60,66,72,78,84],2.2,loop=True)
gm('accordion','accordion',[48,54,60,66,72,78,84],2.2,loop=True)
gm('panflute','pan_flute',[60,65,70,75,80,85,91,96],2.0,loop=True,thr=.08)
gm('shakuhachi','shakuhachi',[55,61,67,73,79,85,91],2.2,loop=True,thr=.08)
gm('mutedtpt','muted_trumpet',[55,60,65,70,75,80,85],2.0,loop=True)
gm('choir','choir_aahs',[48,53,58,63,68,73,78,83],2.6,loop=True,thr=.08)
gm('oohs','voice_oohs',[48,53,58,63,68,73,78,83],2.6,loop=True,thr=.08)
gm('sitar','sitar',[48,54,60,66,72,78,84],2.6)
gm('banjo','banjo',[48,54,60,66,72,78,84],1.8)
gm('koto','koto',[48,54,60,66,72,78,84,90],2.0)
gm('shamisen','shamisen',[48,54,60,66,72,78,84],1.6)
gm('dulcimer','dulcimer',[48,54,60,66,72,78,84,90],2.2)
gm('steeldrum','steel_drums',[55,61,67,73,79,85,91],1.8,tune=False)
gm('slapbass','slap_bass_1',[28,34,40,46,52,58,64],1.4,lo=25,hi=600)
gm('jazzgtr','electric_guitar_jazz',[40,46,52,58,64,70,76,82],2.0)
gm('musicbox','music_box',[60,66,72,78,84,90,96],1.8,tune=False)
