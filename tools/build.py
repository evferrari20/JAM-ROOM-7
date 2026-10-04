import json,os,subprocess,base64,sys,re
import numpy as np
from fetch import get, RAW
SR=44100
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','src','samples','new')
NN={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
def n2m(s):
    m=re.match(r'([A-Ga-g][#b]?)(-?\d+)',s); n=m.group(1); n=n[0].upper()+n[1:]
    return NN[n]+12*(int(m.group(2))+1)
def m2gleitz(m):
    names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']; return names[m%12]+str(m//12-1)
def load(path):
    r=subprocess.run(['ffmpeg','-v','error','-i',path,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True)
    return np.frombuffer(r.stdout,dtype=np.float32).copy()
def detect(x,lo=40,hi=2000):
    # autocorrelation f0 on stable part
    a=int(.25*SR); seg=x[a:a+int(.5*SR)]
    if len(seg)<4096: seg=x[:int(.5*SR)]
    seg=seg-seg.mean()
    if np.abs(seg).max()<1e-4: return None
    n=len(seg); f=np.fft.rfft(seg,2*n); ac=np.fft.irfft(f*np.conj(f))[:n]
    ac/=ac[0]
    tmin=int(SR/hi); tmax=min(n-2,int(SR/lo))
    # first strong peak
    best=None
    seg_ac=ac[tmin:tmax]
    mx=seg_ac.max()
    for t in range(tmin+1,tmax-1):
        if ac[t]>ac[t-1] and ac[t]>=ac[t+1] and ac[t]>0.85*mx:
            best=t;break
    if best is None: return None
    y0,y1,y2=ac[best-1],ac[best],ac[best+1]; d=(y0-y2)/(2*(y0-2*y1+y2)+1e-12)
    f0=SR/(best+d); return 69+12*np.log2(f0/440), y1
def proc(x,dur,loop,fadein=0.002,thr=0.03,pre=0.004,startsec=None):
    pk=np.abs(x).max()
    if pk<=0: return x[:int(dur*SR)]
    if startsec is not None: s=int(startsec*SR)
    else:
        idx=np.argmax(np.abs(x)>pk*thr); s=max(0,idx-int(pre*SR))
    y=x[s:s+int(dur*SR)].copy()
    n=len(y); fi=int(fadein*SR); y[:fi]*=np.linspace(0,1,fi)
    fo=int((0.05 if loop else min(0.4*dur,0.8))*SR); fo=min(fo,n//2)
    y[n-fo:]*=np.cos(np.linspace(0,np.pi/2,fo))**2
    y*=0.9/np.abs(y).max()
    return y
def enc(y,br=None):
    # high-quality VBR with a gapless header (see build2.enc); br is ignored, kept for old call sites
    from build2 import enc as enc2
    return enc2(np.asarray(y,dtype=np.float32).reshape(-1,1),4)
def build(id,items,dur,loop=False,br=48,tune=True,durfn=None,lo=40,hi=2000,**kw):
    """items: list of (nominal_midi, path, extra_tune_semitones)"""
    res={};log=[]
    for nom,path,et in items:
        x=load(path)
        d=durfn(nom) if durfn else dur
        y=proc(x,d,loop,**kw)
        root=nom+et
        if tune:
            r=detect(y,lo,hi)
            if r:
                dm,cl=r; dev=dm-nom
                # fold octave errors
                if abs(dev-round(dev/12)*12)<0.45 and abs(round(dev/12))>=1: log.append(f'{nom}:oct{round(dev/12)}')
                dd=dev-round(dev/12)*12
                if abs(dd)<0.45 and cl>0.6: root=round(nom+dd,2)
                log.append(f'{nom}->{dm:.2f}({cl:.2f})')
        res[root]=enc(y,br)
    from packs import write_pack
    n=write_pack(id,[(k,0,0,b) for k,b in res.items()],src='v1hq')
    print(id,len(res),f'{n//1024}KB',' '.join(log)); sys.stdout.flush()
    return res
