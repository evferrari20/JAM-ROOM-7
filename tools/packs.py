"""Sound packs: one binary file per instrument (all its MP3 clips back to back) plus a small index.

src/samples/packs/<id>.bin   the clips, concatenated
src/samples/packs/<id>.json  {"r": [[key, layer, rr, offset, length], ...], ...meta}

key   = MIDI note (float allowed) for pitched instruments, pad number for drum kits
layer = velocity layer, 0 = softest
rr    = round-robin variant number (alternate takes of the same note and layer)
"""
import json, os, base64, glob

PK = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'samples', 'packs'))


def write_pack(pid, clips, **meta):
    """clips: list of (key, layer, rr, mp3_bytes)"""
    os.makedirs(PK, exist_ok=True)
    blob = bytearray(); reg = []
    for key, layer, rr, b in sorted(clips, key=lambda c: (c[1], c[0], c[2])):
        k = round(float(key), 2)
        reg.append([int(k) if k == int(k) else k, int(layer), int(rr), len(blob), len(b)])
        blob += b
    open(os.path.join(PK, pid + '.bin'), 'wb').write(bytes(blob))
    meta['r'] = reg
    json.dump(meta, open(os.path.join(PK, pid + '.json'), 'w'), separators=(',', ':'))
    return len(blob)


def read_pack(pid):
    m = json.load(open(os.path.join(PK, pid + '.json')))
    b = open(os.path.join(PK, pid + '.bin'), 'rb').read()
    return m, b


def all_packs():
    return sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(PK, '*.json')))


if __name__ == '__main__':
    # one-time conversion of the old base64 JSON sample files into packs
    root = os.path.normpath(os.path.join(PK, '..'))
    old = json.load(open(os.path.join(root, 'legacy_samples.json')))
    D = dict(old)
    for f in glob.glob(os.path.join(root, 'new', '*.json')):
        D[os.path.basename(f)[:-5]] = json.load(open(f))
    D.pop('jazzbass_old', None)
    for pid, v in D.items():
        clips = []
        kit = pid == 'kit' or pid.startswith('kit_')
        for k, x in v.items():
            arr = x if isinstance(x, list) else [x]
            for i, a in enumerate(arr):
                b = base64.b64decode(a)
                if kit and len(arr) >= 4: clips.append((k, i // 2, i % 2, b))   # old kits: first half soft, second half hard
                else: clips.append((k, 0, i, b))
        n = write_pack(pid, clips, src='v1')
        print(pid, len(clips), n // 1024, 'KB')
