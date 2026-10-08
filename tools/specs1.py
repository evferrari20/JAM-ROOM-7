from build import *
from fetch import websfz
def dg(base,s,fmt='ogg'): return get(RAW+base+s+'.'+fmt)
def gl(name,m): return get(f"https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/{name}-mp3/{m2gleitz(m)}.mp3")
def vs(p): return get('https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/'+p)
def decay(base,mn=1.2): return lambda m: max(mn, base*2**(-(m-60)/30))
which=sys.argv[1:] 
def want(i): return not which or i in which

# Rhodes
if want('epiano'):
    keys=[29,35,40,45,50,55,59,62,65,71,76,81,86,91]
    nm={29:'F1',35:'B1',40:'E2',45:'A2',50:'D3',55:'G3',59:'B3',62:'D4',65:'F4',71:'B4',76:'E5',81:'A5',86:'D6',91:'G6'}
    base='jlearman/rhodes-mki/jRhodes3d-mono/'
    build('epiano',[(m,dg(base,f'A_{m:03d}__{nm[m]}_2'),0) for m in keys],3,durfn=decay(3.2,1.4))
    build('epiano_s',[(m,dg(base,f'A_{m:03d}__{nm[m]}_4'),0) for m in keys],3,durfn=decay(3.2,1.4))
if want('wurli'):
    L=[(33,'a1f',-5),(36,'c2f',-7),(41,'f2f',-6),(47,'b2f',-8),(52,'e3f',-4),(56,'ab3f',-11),(61,'db4f',-2),(68,'ab4f',0),(73,'db5f',3),(79,'g5f',-7),(85,'db6f',0)]
    build('wurli',[(m,dg('gs-e-pianos/Wurlitzer EP200/Samples/',s),0) for m,s,t in L],2.6,durfn=decay(2.8,1.3))
if want('upright'):
    j=websfz('vcsl/Zithers/upright-piano-knight.websfz.json')
    regs=[r for g in j['groups'] for r in g['regions'] if r.get('lovel',0)>=84]
    by={r['pitch_keycenter']:r for r in regs}
    keys=[k for k in [25,29,33,37,41,45,49,53,57,61,65,69,73,77,81,85,89,93,97] if k in by]
    build('upright',[(k,dg('vcsl/Zithers/',by[k]['sample']),0) for k in keys],3,durfn=decay(3.4,1.4))
if want('recorder'):
    j=websfz('vcsl/Edge-blown Aerophones/baroque-alto-recorder-sustain.websfz.json')
    by={r['pitch_keycenter']:r for g in j['groups'] for r in g['regions']}
    build('recorder',[(k,dg('vcsl/Edge-blown Aerophones/',by[k]['sample']),0) for k in [65,68,72,76,80,84]],2.4,loop=True,thr=.08)
if want('tenorsax'):
    j=websfz('vcsl/Reed Aerophones/tenor-saxophone-vibrato.websfz.json')
    by={r['pitch_keycenter']:r for g in j['groups'] for r in g['regions']}
    build('tenorsax',[(k,dg('vcsl/Reed Aerophones/',by[k]['sample']),0) for k in [46,50,54,58,62,66,70,74,79,84]],2.6,loop=True,thr=.08)
if want('tubular'):
    j=websfz('vcsl/Struck Idiophones/tubular-bells-1.websfz.json')
    by={r['pitch_keycenter']:r for g in j['groups'] for r in g['regions'] if r.get('lovel',0)>=84}
    build('tubular',[(k,dg('vcsl/Struck Idiophones/',by[k]['sample']),0) for k in sorted(by) if k in (60,64,68,72,74,76)],3.6,tune=False)
if want('bowedvibe'):
    j=websfz('vcsl/Struck Idiophones/vibraphone-bowed.websfz.json')
    by={r['pitch_keycenter']:r for g in j['groups'] for r in g['regions']}
    build('bowedvibe',[(k,dg('vcsl/Struck Idiophones/',by[k]['sample']),0) for k in sorted(by)],3.2,loop=True,tune=False,thr=.1)
if want('glasses'):
    j=websfz('vcsl/Friction Idiophones/wine-glasses-slow.websfz.json')
    by={}
    for g in j['groups']:
        for r in g['regions']: by.setdefault(r['pitch_keycenter'],r)
    build('glasses',[(k,dg('vcsl/Friction Idiophones/',by[k]['sample']),-by[k].get('tune',0)/100) for k in sorted(by)],3.4,loop=True,tune=False,thr=.15)
if want('chimes'):
    j=websfz('vcsl/Struck Idiophones/hand-chimes.websfz.json')
    by={r['pitch_keycenter']:r for g in j['groups'] for r in g['regions']}
    build('chimes',[(k,dg('vcsl/Struck Idiophones/',by[k]['sample']),-by[k].get('tune',0)/100) for k in sorted(by) if k in (60,64,68,72,76,80,81,86,92,94)],2.6,tune=False)
if want('timpani'):
    j=websfz('vcsl/Struck Membranophones/timpani-1-hit.websfz.json')
    by={}
    for g in j['groups']:
        for r in g['regions']:
            if r.get('lovel',0)>=100: by.setdefault(r['pitch_keycenter'],r)
    build('timpani',[(k,dg('vcsl/Struck Membranophones/',by[k]['sample']),-by[k].get('tune',0)/100) for k in sorted(by)],2.6,tune=False)
if want('jazzbass'):
    L=[(24,'c1'),(27,'eb1'),(31,'g1'),(34,'bb1'),(38,'d2'),(41,'f2'),(45,'a2'),(48,'c3'),(52,'e3'),(55,'g3'),(57,'a3')]
    build('jazzbass',[(m,dg('dsmolken/double-bass/',f'pizz/pizz_{s}_ma'),0) for m,s in L],2.0,lo=25,hi=500)
# Mellotron: filename octave +1
def tron(id,folder):
    names=json.load(open(get(RAW+'mellotron/'+folder+'/samples.json')))
    by={}
    for n in names:
        m=re.match(r'([A-G]#?)(\d)',n); by[n2m(m.group(1)+m.group(2))+24]=n
    keys=[k for k in [55,59,63,67,71,75,79,83,87,89] if k in by]
    build(id,[(k,dg('mellotron/'+folder+'/',by[k]),0) for k in keys],2.6,loop=True,thr=.1)
if want('tronflute'): tron('tronflute','TRON FLUTE')
if want('tronstrings'): tron('tronstrings','MKII VIOLINS')
if want('tronchoir'): tron('tronchoir','8VOICE CHOIR')
