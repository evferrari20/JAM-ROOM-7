import json,sys,urllib.request,urllib.parse
def ls(repo,ref,path=''):
    u=f"https://github.com/{repo}/tree/{ref}/"+urllib.parse.quote(path)
    r=urllib.request.Request(u,headers={'Accept':'application/json','User-Agent':'x'})
    d=json.load(urllib.request.urlopen(r))
    p=d['payload']
    t=p.get('tree') or p.get('codeViewTreeRoute',{}).get('tree')
    return [(i['name'],i['contentType']) for i in t['items']]
if __name__=='__main__':
    for n,t in ls(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else ''): print(t[0],n)
