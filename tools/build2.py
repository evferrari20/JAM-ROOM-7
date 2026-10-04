"""Second-generation sample builder: high-quality packs from free sample libraries.

  python3 tools/build2.py piano ebass ...     build the named instruments (or all with no names)

Sources are public sample libraries cloned into SRC (blobless git clones; audio is fetched on demand).
See CREDITS.md for licences. Every instrument becomes src/samples/packs/<id>.bin/.json (see packs.py).
"""
import os, re, sys, json, subprocess, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfz
from packs import write_pack

SRC = os.environ.get('JR_SRC', '/home/user/src-samples')
SR = 44100
REPOS = {
    'SalamanderGrandPiano': 'sfzinstruments/SalamanderGrandPiano',
    'VSCO-2-CE': 'sgossner/VSCO-2-CE',
    'sso': 'peastman/sso',
    'karoryfer.emilyguitar': 'sfzinstruments/karoryfer.emilyguitar',
    'karoryfer.black-and-green-guitars': 'sfzinstruments/karoryfer.black-and-green-guitars',
    'karoryfer.growlybass': 'sfzinstruments/karoryfer.growlybass',
    'karoryfer.meatbass': 'sfzinstruments/karoryfer.meatbass',
    'karoryfer.weresax': 'sfzinstruments/karoryfer.weresax',
    'karoryfer.big-rusty-drums': 'sfzinstruments/karoryfer.big-rusty-drums',
    'karoryfer.unruly-drums': 'sfzinstruments/karoryfer.unruly-drums',
    'karoryfer.swirly-drums': 'sfzinstruments/karoryfer.swirly-drums',
    'VCSL': 'sgossner/VCSL',
    'tonejs-instruments': 'nbrosowsky/tonejs-instruments',
    'jlearman.jRhodes3d': 'sfzinstruments/jlearman.jRhodes3d',
}
NN = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n2m(s):
    m = re.match(r'([A-Ga-g][#b]?)(-?\d+)', s); n = m.group(1); n = n[0].upper() + n[1:]
    return NN[n] + 12 * (int(m.group(2)) + 1)


# ---------------- fetching ----------------
def ensure_repo(name):
    d = os.path.join(SRC, name)
    if not os.path.isdir(os.path.join(d, '.git')):
        os.makedirs(SRC, exist_ok=True)
        subprocess.run(['git', 'clone', '-q', '--filter=blob:none', '--no-checkout', '--depth', '1',
                        'https://github.com/' + REPOS[name], d], check=True, env=dict(os.environ, GIT_LFS_SKIP_SMUDGE='1'))
    return d


def tree(name):
    d = ensure_repo(name)
    return subprocess.run(['git', '-C', d, 'ls-tree', '-r', 'HEAD', '--name-only'], capture_output=True, text=True).stdout.split('\n')


def fetch(name, paths):
    """make sure these repo-relative files exist on disk (batch download), return absolute paths"""
    d = ensure_repo(name)
    miss = [p for p in paths if not os.path.exists(os.path.join(d, p))]
    for i in range(0, len(miss), 200):
        subprocess.run(['git', '-C', d, 'checkout', 'HEAD', '--'] + miss[i:i+200], check=True, capture_output=True)
    return [os.path.join(d, p) for p in paths]


# ---------------- audio ----------------
def load(path, ch=1):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, ch).copy()


def onset(x, thr=0.02, pre=0.003):
    a = np.abs(x).max(axis=1); pk = a.max()
    if pk <= 0: return 0
    i = int(np.argmax(a > pk * thr))
    return max(0, i - int(pre * SR))


def shape(x, dur, start=None, thr=0.02, fadein=0.0015, fadeout=None, loop=False):
    s = onset(x, thr) if start is None else int(start * SR)
    y = x[s:s + int(dur * SR)].copy(); n = len(y)
    fi = int(fadein * SR); y[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int((fadeout if fadeout is not None else (0.06 if loop else min(0.45 * n / SR, 0.9))) * SR); fo = min(fo, n // 2)
    y[n - fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
    return y


def enc(y, q):
    """MP3 (LAME VBR quality q). Written via a temp file so the Info/LAME header is present: it tells browsers
    exactly how much encoder lead-in silence to drop, so notes start on time."""
    import tempfile
    ch = y.shape[1]
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as t: tmp = t.name
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(ch), '-i', '-',
                    '-c:a', 'libmp3lame', '-q:a', str(q), '-write_xing', '1', '-id3v2_version', '0', tmp],
                   input=np.ascontiguousarray(y, dtype=np.float32).tobytes(), check=True)
    b = open(tmp, 'rb').read(); os.unlink(tmp)
    return b


def finish(pid, notes, q=4, peak=0.9, **meta):
    """notes: dict key -> list of (layer, rr, array). Levels are evened out per note using its loudest layer,
    so softer layers stay softer. Writes the pack."""
    clips = []; tot_s = 0
    if not notes: print('!! %s: no samples matched, skipped' % pid); return
    for key, items in notes.items():
        top = max(l for l, rr, y in items)
        ref = max(np.abs(y).max() for l, rr, y in items if l == top) or 1
        for l, rr, y in items:
            g = peak / ref; z = y * g
            if np.abs(z).max() > 0.99: z *= 0.99 / np.abs(z).max()
            clips.append((key, l, rr, enc(z, q))); tot_s += len(y) / SR
    n = write_pack(pid, clips, ch=int(items[0][2].shape[1]), src='v2', **meta)
    print('%-12s %3d clips %5.0f s audio %6.0f KB' % (pid, len(clips), tot_s, n / 1024)); sys.stdout.flush()


# ---------------- instruments ----------------
B = {}
def inst(f): B[f.__name__.rstrip('_')] = f; return f


@inst
def piano():
    """Salamander Grand Piano V3 (Yamaha C5), stereo, 3 velocity layers, every minor third."""
    LAY = [5, 10, 15]
    names = [p for p in tree('SalamanderGrandPiano') if re.match(r'Samples/[A-G]#?\d+v\d+\.flac$', p)]
    want = [p for p in names if int(re.search(r'v(\d+)\.flac', p).group(1)) in LAY]
    fetch('SalamanderGrandPiano', want)
    notes = collections.defaultdict(list)
    for p in want:
        nm, v = re.match(r'Samples/([A-G]#?\d+)v(\d+)', p).groups()
        m = n2m(nm); l = LAY.index(int(v))
        dur = max(2.6, 9.0 - (m - 21) * 0.085)
        x = load(os.path.join(SRC, 'SalamanderGrandPiano', p), 2)
        notes[m].append((l, 0, shape(x, dur, thr=0.01, fadeout=min(1.2, dur * 0.35))))
    finish('piano', notes, q=4, peak=0.85)



# ---------------- generic helpers ----------------
def detect(x, lo=40, hi=2000):
    """median f0 (as MIDI) over the steady part, or None"""
    x = x.mean(axis=1) if x.ndim > 1 else x
    a = int(.2 * SR); seg = x[a:a + int(.6 * SR)]
    if len(seg) < 4096: seg = x[:int(.6 * SR)]
    seg = seg - seg.mean()
    if np.abs(seg).max() < 1e-4: return None
    n = len(seg); f = np.fft.rfft(seg, 2 * n); ac = np.fft.irfft(f * np.conj(f))[:n]; ac /= ac[0] + 1e-12
    tmin = int(SR / hi); tmax = min(n - 2, int(SR / lo)); mx = ac[tmin:tmax].max()
    for t in range(tmin + 1, tmax - 1):
        if ac[t] > ac[t - 1] and ac[t] >= ac[t + 1] and ac[t] > .85 * mx:
            y0, y1, y2 = ac[t - 1], ac[t], ac[t + 1]; d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) + 1e-12)
            return 69 + 12 * np.log2(SR / (t + d) / 440)
    return None


def pick_layers(found, n):
    """choose n of the available velocity layer ids, spread from soft to loud (always include the loudest)"""
    found = sorted(found)
    if len(found) <= n: return found
    idx = sorted(set(int(round(i * (len(found) - 1) / (n - 1))) for i in range(n)))
    return [found[i] for i in idx]


def build_entries(pid, repo, entries, layers=3, rrs=1, dur=3.0, loop=False, ch=1, q=4, check_pitch=True,
                  octave_fix=True, thr=0.03, durfn=None, keys=None, peak=0.9, lo=40, hi=2000, mix=None, fadeout=None, **meta):
    """entries: list of (midi, layer_id, rr_id, repo_path). Picks layers/round robins, checks pitch, writes the pack."""
    if keys: entries = [e for e in entries if e[0] in keys]
    lids = pick_layers({e[1] for e in entries}, layers)
    sel = [e for e in entries if e[1] in lids]
    rr_by = collections.defaultdict(list)
    for e in sel: rr_by[(e[0], e[1])].append(e)
    sel = [e for k in rr_by for e in sorted(rr_by[k], key=lambda e: e[2])[:rrs]]
    fetch(repo, sorted({e[3] for e in sel}))
    notes = collections.defaultdict(list); log = []; octv = []
    for m, l, rr, path in sorted(sel):
        x = load(os.path.join(SRC, repo, path), ch)
        if mix: x = mix(x, path)
        d = durfn(m) if durfn else dur
        y = shape(x, d, thr=thr, loop=loop, fadeout=fadeout)
        root = m
        if check_pitch and l == lids[-1]:
            f = detect(y, lo, hi)
            if f is not None:
                dev = f - m; octs = round(dev / 12)
                if abs(dev - octs * 12) < .5: octv.append(octs)
                if octs and abs(dev - octs * 12) < .5: log.append('%s:oct%+d' % (m, octs))
                fine = dev - octs * 12
                if abs(fine) > .35: log.append('%s:%+.2f' % (m, fine))
        notes[root].append((lids.index(l), rr_by and sorted(r[2] for r in rr_by[(m, l)]).index(rr), y))
    if log: print('  pitch notes', pid, ' '.join(log[:20]))
    if octave_fix and octv:
        c = collections.Counter(octv).most_common(1)[0]
        if c[0] and c[1] >= .6 * len(octv):
            print('  %s: library is mapped %+d octave(s) from the real pitch; correcting' % (pid, -c[0]))
            notes = {k + 12 * c[0]: v for k, v in notes.items()}
    finish(pid, notes, q=q, peak=peak, **meta)


def vsco(path_re, name_re, layer_re=None, rr_re=None, octave=0):
    """VSCO-2-CE style names: note, then velocity and round robin markers"""
    out = []
    for p in tree('VSCO-2-CE'):
        if not re.search(path_re, p) or not p.lower().endswith('.wav'): continue
        f = p.split('/')[-1]; m = re.search(name_re, f)
        if not m: continue
        mm = n2m(m.group(1)) + octave
        l = re.search(layer_re, f).group(1) if layer_re and re.search(layer_re, f) else '0'
        r = re.search(rr_re, f).group(1) if rr_re and re.search(rr_re, f) else '1'
        out.append((mm, l, int(r) if r.isdigit() else r, p))
    return out


def from_sfz(repo, sfzfile, include=None, exclude=None, rr_mode='auto'):
    """(midi, layer=lovel, rr, path) for attack regions of an SFZ mapping"""
    d = ensure_repo(repo)
    rs = sfz.parse(os.path.join(d, sfzfile))
    out = []; cnt = collections.Counter()
    for r in rs:
        if r['_trigger'] != 'attack' or r['_root'] is None: continue
        rel = os.path.relpath(r['_path'], d)
        if include and not re.search(include, rel): continue
        if exclude and re.search(exclude, rel): continue
        if (r['_lovel'], r['_hivel']) == (0, 127) and len({x['_lovel'] for x in rs}) > 2 and not include: continue
        rr = r['_seq']
        if 'lorand' in r: rr = int(float(r['lorand']) * 100)
        out.append((r['_root'], r['_lovel'], rr, rel))
    return out


# ---------------- keyboards ----------------
@inst
def upright():
    e = vsco(r'Keys/Upright Piano/', r'_([A-G]#?\d)_', r'_(v\d+|\w+)_?\d*\.wav$')
    build_entries('upright', 'VSCO-2-CE', e, layers=2, dur=4, durfn=lambda m: max(2.2, 5.5 - (m - 30) * .05), q=4)


@inst
def organ():
    """VSCO 2 pipe organ, loud registration (one file per note number)"""
    out = []
    for p in tree('VSCO-2-CE'):
        m = re.search(r'Keys/Organ/Loud/.*_(\d+)\.wav$', p)
        if m: out.append((35 + int(m.group(1)), 0, 1, p))
    build_entries('organ', 'VSCO-2-CE', out, layers=1, dur=3, loop=True, check_pitch=True)


@inst
def ebass():
    """Karoryfer Growlybass (Squier Jazz Bass, direct), sustained notes"""
    e = from_sfz('karoryfer.growlybass', 'growlybass_clean.sfz', include=r'^sustain/')
    build_entries('ebass', 'karoryfer.growlybass', e, layers=3, rrs=2, dur=2.6, lo=25, hi=600, q=4)


@inst
def jazzbass():
    """Karoryfer Meatbass (1958 Otto Rubner double bass), pizzicato"""
    e = from_sfz('karoryfer.meatbass', 'Programs/pizz_basic.sfz', include=r'Samples/pizz/')
    build_entries('jazzbass', 'karoryfer.meatbass', e, layers=3, rrs=2, dur=2.3, lo=25, hi=600, q=4)


@inst
def contrabass():
    """Karoryfer Meatbass, bowed (looped samples)"""
    e = from_sfz('karoryfer.meatbass', 'Programs/arco_mw_three_map.sfz', include=r'arco_looped/')
    e = [(m, re.search(r'_vl(\d)', p).group(1), 1 if 'down' in p else 2, p) for m, l, r, p in e]
    build_entries('contrabass', 'karoryfer.meatbass', e, layers=2, rrs=1, dur=3, loop=True, lo=25, hi=600, thr=.05)


@inst
def eguitar():
    """Karoryfer Emily (Epiphone, direct), clean"""
    e = from_sfz('karoryfer.emilyguitar', 'emily_clean.sfz', include=r'^notes/')
    build_entries('eguitar', 'karoryfer.emilyguitar', e, layers=3, rrs=2, dur=3.2, q=4)


def amp(x, path=None, drive=7.0):
    """offline amp: pre-emphasis, asymmetric soft clipping (4x oversampled), speaker-cabinet tone"""
    from numpy.fft import rfft, irfft
    y = x.mean(axis=1)
    def filt(sig, f):
        n = len(sig); F = rfft(sig, 2 * n); fr = np.fft.rfftfreq(2 * n, 1 / SR); return irfft(F * f(fr))[:n]
    y = filt(y, lambda fr: 1 + 1.2 * np.exp(-((np.log2(np.maximum(fr, 1) / 900)) ** 2) / .5) - .5 * (fr < 120))
    up = np.interp(np.arange(len(y) * 4) / 4, np.arange(len(y)), y)
    z = np.tanh(drive * up + .25) - np.tanh(.25)
    z = np.tanh(1.6 * z) / np.tanh(1.6)
    z = z[::4]
    cab = lambda fr: 1 / np.sqrt(1 + (fr / 4300) ** 8) * (1 - 1 / np.sqrt(1 + (fr / 90) ** 4)) * (1 + .6 * np.exp(-((np.log2(np.maximum(fr, 1) / 2200)) ** 2) / .3))
    z = filt(z, cab)
    return z[:, None].astype(np.float32)


@inst
def oguitar():
    """Emily guitar through an offline amp and speaker simulation"""
    e = from_sfz('karoryfer.emilyguitar', 'emily_clean.sfz', include=r'^notes/')
    build_entries('oguitar', 'karoryfer.emilyguitar', e, layers=2, rrs=1, dur=3.0, mix=amp, check_pitch=False, q=4, peak=.8)


@inst
def jazzgtr():
    """Karoryfer Black And Green Guitars: Hofner Club archtop ('black'), ordinary notes"""
    sf = [p for p in tree('karoryfer.black-and-green-guitars') if p.endswith('.sfz') and 'black' in p.lower()]
    best = None
    for f in sf:
        try: e = from_sfz('karoryfer.black-and-green-guitars', f, include=r'black/ord/')
        except Exception: continue
        if e and (not best or len(e) > len(best[1])): best = (f, e)
    print('  using', best[0])
    build_entries('jazzgtr', 'karoryfer.black-and-green-guitars', best[1], layers=3, rrs=1, dur=2.8)


@inst
def sax():
    """Karoryfer Weresax (alto saxophone), condenser mic"""
    e = [(m, l, r, p.replace('_dnm.wav', '_cnd.wav')) for m, l, r, p in from_sfz('karoryfer.weresax', 'Programs/Sax.sfz', include=r'Samples/alto/.*_dnm\.wav')]
    build_entries('sax', 'karoryfer.weresax', e, layers=2, rrs=1, dur=2.8, loop=True, thr=.05)


# ---------------- brass / winds / strings (VSCO 2) ----------------
@inst
def trumpet():
    e = vsco(r'Brass/Trumpet/susvib/', r'_susvib_([A-G]#?\d)_', r'_v(\d)_', r'_rr(\d)')
    build_entries('trumpet', 'VSCO-2-CE', e, layers=2, dur=2.6, loop=True, thr=.06)


@inst
def mutedtpt():
    e = vsco(r'Brass/Trumpet/straightM-sus/', r'-sus_([A-G]#?\d)_', r'_v(\d)_', r'_rr(\d)')
    build_entries('mutedtpt', 'VSCO-2-CE', e, layers=2, dur=2.6, loop=True, thr=.06)


@inst
def trombone():
    e = vsco(r'Brass/Tenor Trombone/sus/', r'_sus_([A-G]#?\d)_', r'_v(\d)_', r'_(\d)\.wav')
    build_entries('trombone', 'VSCO-2-CE', e, layers=2, dur=2.8, loop=True, thr=.06)


@inst
def horn():
    e = vsco(r'Brass/F Horn/sus/', r'_sus_([A-G]#?\d)_', r'_v(\d)_', r'_(\d)\.wav')
    build_entries('horn', 'VSCO-2-CE', e, layers=2, dur=2.8, loop=True, thr=.06)


@inst
def tuba():
    e = vsco(r'Brass/Tuba/sus/', r'_sus_([A-G]#?\d)_', r'_v(\d)_', r'_rr(\d)')
    build_entries('tuba', 'VSCO-2-CE', e, layers=2, dur=2.8, loop=True, thr=.06, lo=25, hi=600)


@inst
def flute():
    e = vsco(r'Woodwinds/Flute/susvib/', r'_susvib_([A-G]#?\d)_', r'_v(\d)_', r'_(\d)\.wav')
    build_entries('flute', 'VSCO-2-CE', e, layers=1, dur=2.6, loop=True, thr=.06)


@inst
def clarinet():
    e = vsco(r'Woodwinds/Clarinet/susLong/', r'_susLong_([A-G]#?\d)_', r'_v(\d)_', r'_rr(\d)')
    build_entries('clarinet', 'VSCO-2-CE', e, layers=2, dur=2.8, loop=True, thr=.06)


@inst
def bassoon():
    e = vsco(r'Woodwinds/Bassoon/sus/', r'PSBassoon_([A-G]#?\d)_', r'_v(\d)_', r'_(\d)\.wav')
    build_entries('bassoon', 'VSCO-2-CE', e, layers=2, dur=2.8, loop=True, thr=.06, lo=30, hi=800)


@inst
def violin():
    e = vsco(r'Strings/Solo Violin/Arco Vib/', r'_ArcoVib_([A-G]#?\d)_', r'_(p|f)\.wav')
    e = [(m, 0 if l == 'p' else 1, r, p) for m, l, r, p in e]
    build_entries('violin', 'VSCO-2-CE', e, layers=2, dur=2.8, loop=True, thr=.06)


@inst
def harp():
    e = vsco(r'Strings/Harp/', r'KSHarp_([A-G]#?\d)_')
    build_entries('harp', 'VSCO-2-CE', e, layers=1, dur=3.5, durfn=lambda m: max(1.8, 5 - (m - 40) * .06))


@inst
def marimba():
    e = vsco(r'Percussion/Marimba/', r'_([A-G]#?\d)_')
    build_entries('marimba', 'VSCO-2-CE', e, layers=1, dur=2.2)


@inst
def xylo():
    e = vsco(r'Percussion/Xylo/', r'_([A-G]#?\d)_')
    build_entries('xylo', 'VSCO-2-CE', e, layers=1, dur=1.4)


@inst
def glock():
    e = vsco(r'Percussion/Glock/', r'_([A-G]#?\d)\.wav')
    build_entries('glock', 'VSCO-2-CE', e, layers=1, dur=2.2, check_pitch=False)



# ---------------- lossless originals of earlier instruments ----------------
@inst
def epiano():
    """jRhodes3d (Fender Rhodes Mark I), mono, 3 of its 5 velocity layers"""
    e = from_sfz('jlearman.jRhodes3d', 'jRhodes3d-mono.sfz')
    build_entries('epiano', 'jlearman.jRhodes3d', e, layers=3, rrs=1, durfn=lambda m: max(1.6, 3.6 * 2 ** (-(m - 60) / 30)), q=4)


def tonejs(folder):
    out = []
    for p in tree('tonejs-instruments'):
        m = re.match(r'samples/' + folder + r'/([A-G])(s?)(\d)\.wav$', p)
        if m: out.append((n2m(m.group(1) + ('#' if m.group(2) else '') + m.group(3)), 0, 1, p))
    return out


@inst
def steel():
    build_entries('steel', 'tonejs-instruments', tonejs('guitar-acoustic'), layers=1, dur=3.0)


@inst
def nylon():
    build_entries('nylon', 'tonejs-instruments', tonejs('guitar-nylon'), layers=1, dur=3.0)


@inst
def harmonium():
    build_entries('harmonium', 'tonejs-instruments', tonejs('harmonium'), layers=1, dur=2.6, loop=True, thr=.05)


# ---------------- Sonatina Symphonic Orchestra ----------------
SSO = 'Sonatina Symphonic Orchestra/'


def sso(sfzname, layer_re=None, **kw):
    e = from_sfz('sso', SSO + sfzname, **kw)
    if layer_re:
        e = [(m, (re.search(layer_re, p).group(1) if re.search(layer_re, p) else 'z'), r, p) for m, l, r, p in e]
    return e


@inst
def cello():
    build_entries('cello', 'sso', sso('Strings - Performance/Cello Solo Sustain.sfz'), layers=1, dur=3, loop=True, thr=.05)


@inst
def celesta():
    build_entries('celesta', 'sso', sso('Percussion/Celeste.sfz', r'-(soft|hard)\.'), layers=2, dur=2.4, check_pitch=False)


@inst
def harpsi():
    build_entries('harpsi', 'sso', sso("Harpsichord/Harpsichord 8'.sfz"), layers=1, rrs=1, dur=2.2)


@inst
def vibes():
    build_entries('vibes', 'sso', sso('Percussion/Vibraphone.sfz'), layers=1, dur=3.2, check_pitch=False)


@inst
def choir():
    build_entries('choir', 'sso', sso('Chorus - Performance/Mixed Chorus.sfz'), layers=1, dur=3, loop=True, thr=.06,
                  keys=set(range(36, 90, 2)))


@inst
def brass():
    """Brass section: real trumpet, horn and trombone section recordings blended note by note"""
    secs = [('Brass - Performance/Trumpets Sustain.sfz', 1.0), ('Brass - Performance/Horns Sustain.sfz', .8),
            ('Brass - Performance/Trombones Sustain.sfz', .9)]
    by = collections.defaultdict(list)
    for f, w in secs:
        e = from_sfz('sso', SSO + f)
        top = {}
        for m, l, r, p in e:   # loudest mapping per note
            if m not in top or p > top[m]: top[m] = p
        for m, p in top.items(): by[m].append((p, w))
    fetch('sso', sorted({p for v in by.values() for p, w in v}))
    notes = {}
    for m, parts in sorted(by.items()):
        mixd = None
        for p, w in parts:
            x = load(os.path.join(SRC, 'sso', p), 1); x = x[onset(x, .05):] * w
            mixd = x if mixd is None else (np.pad(mixd, ((0, max(0, len(x) - len(mixd))), (0, 0))) + np.pad(x, ((0, max(0, len(mixd) - len(x))), (0, 0))))
        notes[m] = [(0, 0, shape(mixd, 3.0, thr=.04, loop=True))]
    finish('brass', notes, q=4)


# ---------------- drum kits ----------------
def kitfiles(repo, folder, layer_re=r'_vl(\d+)', rr_re=r'_rr(\d+)', name_re=None):
    out = {}
    for p in tree(repo):
        if not p.startswith(folder + '/') or '/' in p[len(folder) + 1:] or not re.search(r'\.(wav|flac)$', p): continue
        f = p.split('/')[-1]
        if name_re and not re.search(name_re, f): continue
        l = re.search(layer_re, f); r = re.search(rr_re, f)
        out[(int(l.group(1)) if l else 1, int(r.group(1)) if r else 1)] = p
    return out


def kit_pad(repo, mics, layers=3, rrs=2, dur=.8, name_re=None, layer_re=r'_vl(\d+)', rr_re=r'_rr(\d+)'):
    """mics: [(folder, weight)]. Same take from each microphone is summed to one mono hit."""
    files = [(kitfiles(repo, f, layer_re, rr_re, name_re), w) for f, w in mics]
    keys = set(files[0][0])
    lids = pick_layers({k[0] for k in keys}, layers)
    chosen = sorted(k for k in keys if k[0] in lids and k[1] <= rrs)
    fetch(repo, sorted({fl[k] for fl, w in files for k in chosen if k in fl}))
    out = []
    for k in chosen:
        mixd = None
        for fl, w in files:
            if k not in fl: continue
            x = load(os.path.join(SRC, repo, fl[k]), 1) * w
            mixd = x if mixd is None else (np.pad(mixd, ((0, max(0, len(x) - len(mixd))), (0, 0))) + np.pad(x, ((0, max(0, len(mixd) - len(x))), (0, 0))))
        out.append((lids.index(k[0]), sorted(r for l, r in chosen if l == k[0]).index(k[1]), shape(mixd, dur, thr=.04, fadein=.0005, fadeout=min(.3, dur * .4))))
    return out


@inst
def kit():
    """Acoustic studio kit: Karoryfer Big Rusty Drums (close + overhead mics), VSCO 2 shaker/tambourine, Swirly cowbell"""
    R = 'karoryfer.big-rusty-drums'; S = 'Samples/'
    pads = {
        0: kit_pad(R, [(S + 'kick_24/kick/kick', 1), (S + 'kick_24/kick/oh', .55)], dur=1.1),
        1: kit_pad(R, [(S + 'snare_14/center/top', 1), (S + 'snare_14/center/btm', .35), (S + 'snare_14/center/oh', .6)], dur=.9),
        3: kit_pad(R, [(S + 'hihat_14/cl/cl', 1), (S + 'hihat_14/cl/oh', .5)], dur=.5),
        4: kit_pad(R, [(S + 'hihat_14/open/cl', 1), (S + 'hihat_14/open/oh', .5)], dur=1.4),
        5: kit_pad(R, [(S + 'tom_14/center/cl', 1), (S + 'tom_14/center/oh', .5)], dur=1.3),
        6: kit_pad(R, [(S + 'snare_14/sidestick/top', 1), (S + 'snare_14/sidestick/oh', .5)], dur=.4),
        7: kit_pad(R, [(S + 'crash_17/cr/cl', 1), (S + 'crash_17/cr/oh', .7)], dur=2.6, layers=2),
        8: kit_pad(R, [(S + 'tom_18/center/cl', 1), (S + 'tom_18/center/oh', .5)], dur=1.6),
        9: kit_pad('VSCO-2-CE', [("VSCO 1 Percussion/varWood/Camo's Shaker", 1)], layers=2, rrs=2, dur=.4, layer_re=r'(\d+)\.wav', rr_re=r'zz'),
        10: kit_pad('VSCO-2-CE', [('Percussion', 1)], name_re=r'^Tamb1-Hit', layer_re=r'_v(\d)', dur=.6),
        11: kit_pad('karoryfer.swirly-drums', [('Samples/cowbell', 1)], dur=.6),
    }
    old = clips_from_pack('kit', 2)
    pads[2] = old
    finish('kit', {k: v for k, v in pads.items() if v}, q=4, peak=.9)


def clips_from_pack(pid, key):
    """re-use clips of an existing pack (decoded) for one key"""
    import tempfile
    from packs import read_pack
    m, b = read_pack(pid); out = []
    for r in m['r']:
        if r[0] != key: continue
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as t: t.write(b[r[3]:r[3] + r[4]]); tmp = t.name
        x = load(tmp, 1); os.unlink(tmp)
        out.append((r[1], r[2], x[onset(x, .02, .001):]))
    return out


def main():
    names = sys.argv[1:] or list(B)
    import traceback
    for n in names:
        try: B[n]()
        except Exception: print('!! %s failed' % n); traceback.print_exc()


if __name__ == '__main__':
    main()
