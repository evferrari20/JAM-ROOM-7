import json,base64,glob,os
B85='!#$%()*+,-./0123456789:;=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~'[:85]
assert len(B85)==85 and len(set(B85))==85 and not set(B85)&set('"&\'<>\\` ')
def b85(b):
    out=[];n=len(b);full=n//4
    import struct
    for i in range(full):
        v=int.from_bytes(b[i*4:i*4+4],'big');d=[]
        for _ in range(5): d.append(B85[v%85]);v//=85
        out.append(''.join(reversed(d)))
    r=n%4
    if r:
        chunk=b[full*4:]+b'\0'*(4-r);v=int.from_bytes(chunk,'big');d=[]
        for _ in range(5): d.append(B85[v%85]);v//=85
        out.append(''.join(reversed(d))[:r+1])
    return ''.join(out)
old=json.load(open('src/samples/legacy_samples.json'))
new={}
for f in glob.glob('src/samples/new/*.json'):
    new[os.path.basename(f)[:-5]]=json.load(open(f))
new.pop('jazzbass_old',None)
D=dict(old);D.update(new)
lines=[]
for id,v in D.items():
    for k,x in v.items():
        arr=x if isinstance(x,list) else [x]
        for a in arr: lines.append(f'{id} {k} {b85(base64.b64decode(a))}')
data='\n'.join(lines)+'\n'
s=open('src/app.template.html').read()
import re
s=re.sub(r'/\*@include ([^*]+)\*/',lambda m:open('src/'+m.group(1).strip()).read(),s)
a=s.index('<script type="application/json" id="smp">');b=s.index('</script>',a)+9
s=s[:a]+'<script type="text/plain" id="smp">\n'+data+'</script>'+s[b:]
# restore signalsmith etc: skel had <B64> only inside smp? check
assert '<B64>' not in s, s.count('<B64>')
os.makedirs('dist',exist_ok=True)
open('dist/jam-room.html','w').write(s)
print(len(s.encode()), len(D), len(lines))
