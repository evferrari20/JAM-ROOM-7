"""Build Jam Room.

  python3 tools/assemble.py          -> dist/jam-room.html (one self-contained file, works offline anywhere)
                                        site/ (the website: small page + one sound pack per instrument,
                                               loaded on demand and kept for offline by sw.js)
Run from the project root.
"""
import json, os, re, sys, hashlib, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from packs import PK, all_packs

B85 = '!#$%()*+,-./0123456789:;=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~'[:85]
assert len(B85) == 85 and len(set(B85)) == 85 and not set(B85) & set('"&\'<>\\` ')


def b85(b):
    out = []; n = len(b); full = n // 4
    for i in range(full):
        v = int.from_bytes(b[i*4:i*4+4], 'big'); d = []
        for _ in range(5): d.append(B85[v % 85]); v //= 85
        out.append(''.join(reversed(d)))
    r = n % 4
    if r:
        v = int.from_bytes(b[full*4:] + b'\0'*(4-r), 'big'); d = []
        for _ in range(5): d.append(B85[v % 85]); v //= 85
        out.append(''.join(reversed(d))[:r+1])
    return ''.join(out)


def template():
    s = open('src/app.template.html').read()
    s = re.sub(r'/\*@include ([^*]+)\*/', lambda m: open('src/' + m.group(1).strip()).read(), s)
    a = s.index('<script type="application/json" id="smp">'); b = s.index('</script>', a) + 9
    return s[:a] + '@@SAMPLES@@' + s[b:]


def manifest(urls):
    man = {}
    for pid in all_packs():
        m = json.load(open(os.path.join(PK, pid + '.json')))
        man[pid] = {'r': m['r'], 'n': os.path.getsize(os.path.join(PK, pid + '.bin'))}
        if urls: man[pid]['u'] = urls[pid]
        for k in ('ch', 'gain', 'pg'):
            if k in m: man[pid][k] = m[k]
    return man


def main():
    os.makedirs('dist', exist_ok=True)
    s = template()
    ver = hashlib.sha1(s.encode()).hexdigest()[:10]
    # 1) single file: packs inline as base-85 text, one line per pack
    lines = []
    for pid in all_packs():
        lines.append(pid + ' ' + b85(open(os.path.join(PK, pid + '.bin'), 'rb').read()))
    single = s.replace('@@SAMPLES@@',
        '<script type="application/json" id="sman">' + json.dumps(manifest(None), separators=(',', ':')) + '</script>\n'
        '<script type="text/plain" id="smp">\n' + '\n'.join(lines) + '\n</script>')
    single = single.replace('@@BUILD@@', ver)
    open('dist/jam-room.html', 'w').write(single)
    # 2) website: page + hashed packs + service worker
    shutil.rmtree('site', ignore_errors=True); os.makedirs('site/s')
    urls = {}; total = 0
    for pid in all_packs():
        b = open(os.path.join(PK, pid + '.bin'), 'rb').read(); total += len(b)
        name = 's/%s.%s.bin' % (pid, hashlib.sha1(b).hexdigest()[:10])
        open('site/' + name, 'wb').write(b); urls[pid] = name
    page = s.replace('@@SAMPLES@@', '<script type="application/json" id="sman">' + json.dumps(manifest(urls), separators=(',', ':')) + '</script>')
    page = page.replace('@@BUILD@@', ver)
    for n in ('index.html', 'jam-room.html', 'jam-room-share.html'): open('site/' + n, 'w').write(page)
    sw = open('src/sw.js').read().replace('@@BUILD@@', ver)
    open('site/sw.js', 'w').write(sw)
    open('site/manifest.webmanifest', 'w').write(json.dumps({
        'name': 'Jam Room', 'short_name': 'Jam Room', 'start_url': './', 'display': 'standalone',
        'background_color': '#0a130f', 'theme_color': '#0c1712', 'icons': [{'src': 'icon.svg', 'sizes': 'any', 'type': 'image/svg+xml'}]}))
    open('site/icon.svg', 'w').write(open('src/icon.svg').read())
    shutil.copy('dist/jam-room.html', 'site/jam-room-offline.html')
    open('site/.nojekyll', 'w').write('')
    print('single file %.1f MB, web page %.0f KB + %d packs %.1f MB' % (len(single.encode()) / 1e6, len(page.encode()) / 1e3, len(urls), total / 1e6))


if __name__ == '__main__':
    main()
