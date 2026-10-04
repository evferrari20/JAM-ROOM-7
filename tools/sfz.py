"""Minimal SFZ reader: enough of the format to pull note mappings out of free sample libraries.

Handles <control> default_path, #define, #include, <global>/<master>/<group>/<region> inheritance,
and the opcodes we use: sample, pitch_keycenter, key, lokey/hikey, lovel/hivel, seq_position, tune,
transpose, trigger, and anything else as plain strings.
"""
import os, re

NOTE = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}


def note_num(v):
    v = str(v).strip()
    if re.fullmatch(r'-?\d+', v): return int(v)
    m = re.fullmatch(r'([a-gA-G])([#b]?)(-?\d+)', v)
    if not m: return None
    n = NOTE[m.group(1).lower()] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)
    return n + 12 * (int(m.group(3)) + 1)


def _read(path, defines, seen):
    txt = open(path, encoding='utf-8', errors='replace').read()
    txt = re.sub(r'/\*.*?\*/', ' ', txt, flags=re.S)
    out = []
    for line in txt.split('\n'):
        line = line.split('//')[0]
        m = re.match(r'\s*#define\s+(\$\w+)\s+(.*)', line)
        if m: defines[m.group(1)] = m.group(2).strip(); continue
        m = re.match(r'\s*#include\s+"([^"]+)"', line)
        if m:
            inc = os.path.join(os.path.dirname(path), m.group(1).replace('\\', '/'))
            if inc not in seen and os.path.exists(inc):
                seen.add(inc); out.append(_read(inc, defines, seen))
            continue
        for k, v in sorted(defines.items(), key=lambda kv: -len(kv[0])): line = line.replace(k, v)
        out.append(line)
    return '\n'.join(out)


def parse(path):
    """Returns a list of regions (dicts of opcode -> string, already inherited), each with 'sample' resolved
    relative to the repository (forward slashes)."""
    text = _read(path, {}, {path})
    tokens = re.split(r'(<\w+>)', text)
    levels = {'control': {}, 'global': {}, 'master': {}, 'group': {}}
    regions = []; cur = None; header = None
    order = ['global', 'master', 'group']

    def opcodes(s):
        # values may contain spaces (sample paths): an opcode runs until the next "name=" token
        res = {}
        for m in re.finditer(r'(\w+)=(.*?)(?=\s+\w+=|$)', s.strip(), flags=re.S):
            res[m.group(1)] = m.group(2).strip()
        return res

    for t in tokens:
        h = re.fullmatch(r'<(\w+)>', t)
        if h:
            header = h.group(1)
            if header == 'region':
                cur = {}
                for lv in order: cur.update(levels[lv])
                regions.append(cur)
            elif header in levels:
                levels[header] = {}
                if header == 'global': levels['master'] = {}; levels['group'] = {}
                if header == 'master': levels['group'] = {}
            continue
        if header is None: continue
        ops = opcodes(t)
        if header == 'region': cur.update(ops)
        elif header in levels: levels[header].update(ops)
    base = os.path.dirname(path)
    dp = levels['control'].get('default_path', '').replace('\\', '/')
    for r in regions:
        if 'sample' in r:
            r['_path'] = os.path.normpath(os.path.join(base, dp, r['sample'].replace('\\', '/'))).replace('\\', '/')
        key = note_num(r['key']) if 'key' in r else None
        r['_lo'] = note_num(r.get('lokey', key if key is not None else 0))
        r['_hi'] = note_num(r.get('hikey', key if key is not None else 127))
        r['_root'] = note_num(r.get('pitch_keycenter', key if key is not None else r['_lo']))
        r['_lovel'] = int(r.get('lovel', 0)); r['_hivel'] = int(r.get('hivel', 127))
        r['_seq'] = int(r.get('seq_position', 1))
        r['_tune'] = float(r.get('tune', 0)) / 100 + int(r.get('transpose', 0))
        r['_trigger'] = r.get('trigger', 'attack')
    return [r for r in regions if '_path' in r]
