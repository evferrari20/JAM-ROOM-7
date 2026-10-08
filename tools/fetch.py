import json,sys,os,urllib.request,urllib.parse,subprocess,hashlib
RAW="https://raw.githubusercontent.com/danigb/samples/main/audio/"
CACHE=os.path.join(os.path.dirname(os.path.abspath(__file__)),'cache')
os.makedirs(CACHE,exist_ok=True)
def get(url):
    h=hashlib.md5(url.encode()).hexdigest()
    p=os.path.join(CACHE,h)
    if not os.path.exists(p):
        u=urllib.parse.quote(url,safe=':/')
        req=urllib.request.Request(u,headers={'User-Agent':'x'})
        data=urllib.request.urlopen(req,timeout=60).read()
        open(p,'wb').write(data)
    return p
def websfz(rel):
    return json.load(open(get(RAW+rel)))
def sample(base_rel_dir,sample,fmt='ogg'):
    return get(RAW+base_rel_dir+sample+'.'+fmt)
