from specs1 import dg, vs
from build import *
from fetch import websfz
def kit(id,paths,durs=None):
    res={};tot=0
    D=[.7,.5,.5,.25,.8,.7,.3,1.8,.9,.4,.6,.5]
    for i,p in enumerate(paths):
        d=(durs or {}).get(i,D[i])
        y=proc(load(p),d,False,thr=.05,pre=.001)
        b=enc(y,64);res[str(i)]=[base64.b64encode(b).decode()];tot+=len(b)
    print(id,tot//1024,'KB');json.dump(res,open(f'{OUT}/kit_{id}.json','w'))
T='drum-machines/TR-808/'
kit('808',[dg(T,x) for x in ['kick/bd2575','snare/sd5050','clap/cp','hihat-close/ch','hihat-open/oh25','mid-tom/mt50','rimshot/rs','cymbal/cy5050','tom-low/lt50','maraca/ma','conga-hi/hc50','cowbell/cb']],{0:1.4})
L='drum-machines/LM-2/'
kit('linn',[dg(L,x) for x in ['kick','snare-m','clap','hhclosed','hhopen','tom-m','stick-m','crash','tom-l','cabasa','tambourine','cowbell']])
C='drum-machines/Roland-CR-8000/'
kit('cr8000',[dg(C,'Cr8k'+x) for x in ['bass','snar','clap','chat','ohat','hitm','rim','cymb','lotm','clav','mcng','cowb']])
K='drum-machines/Sequential-Circuits-Drumtraks/'
kit('drumtraks',[dg(K,'DT_'+x) for x in ['Kick','Snare','Clap','Closedhat','Openhat','Tom01','Rimshot','Crash','Tom02','Cabasa','Tamborine','Cowbell']])
Z='drum-machines/Casio-RZ1/'
kit('rz1',[dg(Z,x) for x in ['kick','snare','clap','hihat-closed','hihat-open','tom-1','clave','crash','tom-3','ride','tom-2','cowbell']],{9:1.2})
def vc(cat,f,key,minv=0):
    j=websfz(f'vcsl/{cat}/{f}.websfz.json')
    rs=[r for g in j['groups'] for r in g['regions'] if r.get('pitch_keycenter',r.get('lokey'))==key]
    rs.sort(key=lambda r:-(r.get('hivel') or 127)); r=[x for x in rs if (x.get('hivel') or 127)<=110] or rs
    return dg(f'vcsl/{cat}/',r[0]['sample'])
SI='Struck Idiophones';P='Percussion/'
kit('hand',[vc(SI,'cajon',60),vc(SI,'cajon',62),vc(SI,'claps',60),vc(SI,'shaker-small',61),vc(SI,'tambourine-1',60),
 vs(P+'Quinto-HitN_v3_rr1_Sum.wav'),vs(P+'Claves1_Hit_v2_rr1_Sum.wav'),vs(P+'Sleighbells_Hit_v1_rr1_Mid.wav'),vs(P+'Conga-HitN_v3_rr1_Sum.wav'),
 vc(SI,'cabasa',60),vc('Struck Membranophones','bongos',60),vs(P+'Cowbell1_Hit_v3_rr1_Sum.wav')],{7:1.2,4:.6})
