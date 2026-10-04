"""Build the Learn song library.

  python3 tools/learn_build.py          -> src/learn/index.json + src/learn/songs/<id>.json + <id>.mxl

Public-domain compositions only. Scores come from the musetrainer public-domain MusicXML library
(/home/user/src-scores/library, cloned from github.com/musetrainer/library) and from simple melodies and
original practice pieces written here (ORIGINALS below). Each song becomes:
  <id>.mxl   the score (repeats written out) for the sheet-music view
  <id>.json  {"n": [[beat, length, midi, hand(0 right,1 left), finger], ...], "bars": [bar start beats], ...}
"""
import os, sys, json, glob, re, warnings, zipfile, io
warnings.filterwarnings('ignore')
import music21 as m21

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'src', 'learn')
LIB = '/home/user/src-scores/library/scores/'

# genre, level (1 beginner .. 5 virtuoso), id, file, title, composer, year, default tempo (quarter notes / min)
CATALOG = [
 # --- Baroque
 ('Baroque', 2, 'minuet-g', 'Bach_Minuet_in_G_Major_BWV_Anh._114.mxl', 'Minuet in G', 'Christian Petzold (once credited to J. S. Bach)', 1725, 110),
 ('Baroque', 3, 'prelude-c', 'Prelude_I_in_C_major_BWV_846_-_Well_Tempered_Clavier_First_Book.mxl', 'Prelude in C major, BWV 846', 'J. S. Bach', 1722, 72),
 ('Baroque', 3, 'air-g-string', 'J._S._Bach_-_Air_on_the_G_String_Piano_arrangement.mxl', 'Air on the G String (piano)', 'J. S. Bach', 1730, 60),
 ('Baroque', 4, 'prelude-c-minor', 'Prelude_No._2_BWV_847_in_C_Minor.mxl', 'Prelude in C minor, BWV 847', 'J. S. Bach', 1722, 92),
 ('Baroque', 2, 'canon-easy', 'Canon_in_D_easy.mxl', 'Canon in D (easy)', 'Johann Pachelbel', 1680, 60),
 ('Baroque', 3, 'canon-mid', 'Canon_in_D_3.mxl', 'Canon in D', 'Johann Pachelbel', 1680, 70),
 ('Baroque', 4, 'canon-full', 'Canon_in_D.mxl', 'Canon in D (full)', 'Johann Pachelbel', 1680, 90),
 ('Baroque', 4, 'passacaglia', 'Passacaglia.mxl', 'Passacaglia (after Handel)', 'G. F. Handel', 1720, 110),
 ('Baroque', 5, 'toccata', 'Bach_Toccata_and_Fugue_in_D_Minor_Piano_solo.mxl', 'Toccata and Fugue in D minor (piano)', 'J. S. Bach', 1708, 80),
 # --- Classical era
 ('Classical', 1, 'ode-to-joy', 'Ode_to_Joy_Easy_variation.mxl', 'Ode to Joy (easy)', 'Ludwig van Beethoven', 1824, 110),
 ('Classical', 1, 'fur-elise-beginner', 'Fur_Elise_-_Beethoven_-_for_beginner_piano.mxl', 'Für Elise (beginner)', 'Ludwig van Beethoven', 1810, 66),
 ('Classical', 2, 'fur-elise-easy', 'Fur_Elise_Easy_Piano.mxl', 'Für Elise (easy)', 'Ludwig van Beethoven', 1810, 100),
 ('Classical', 3, 'fur-elise', 'Fur_Elise_fingered.mxl', 'Für Elise', 'Ludwig van Beethoven', 1810, 66),
 ('Classical', 2, 'danse-villageoise', 'DANSE_VILLAGEOISE_Beethoven.mxl', 'Danse villageoise (Country Dance)', 'Ludwig van Beethoven', 1795, 120),
 ('Classical', 3, 'moonlight-1', 'Sonate_No._14_Moonlight_1st_Movement.mxl', 'Moonlight Sonata, 1st movement', 'Ludwig van Beethoven', 1801, 54),
 ('Classical', 4, 'pathetique-2', 'Sonate_No._8_Pathetique_2nd_Movement.mxl', 'Pathétique Sonata, 2nd movement', 'Ludwig van Beethoven', 1798, 50),
 ('Classical', 3, 'k545-1', 'Sonata_No._16_1st_Movement_K._545.mxl', 'Sonata in C, K. 545, 1st movement', 'W. A. Mozart', 1788, 120),
 ('Classical', 4, 'turkish-march', 'WA_Mozart_Marche_Turque_Turkish_March_fingered.mxl', 'Turkish March (Rondo alla Turca)', 'W. A. Mozart', 1783, 120),
 ('Classical', 4, 'twinkle-variations', '12_Variations_of_Twinkle_Twinkle_Little_Star.mxl', '12 Variations on "Ah vous dirai-je, Maman"', 'W. A. Mozart', 1782, 100),
 ('Classical', 3, 'lacrimosa', 'Lacrimosa_-_Requiem.mxl', 'Lacrimosa (Requiem)', 'W. A. Mozart', 1791, 66),
 ('Classical', 4, 'beethoven-5', 'Beethoven_Symphony_No._5_1st_movement_Piano_solo.mxl', 'Symphony No. 5, 1st movement (piano)', 'Ludwig van Beethoven', 1808, 108),
 ('Classical', 5, 'moonlight-3', 'Sonate_No._14_Moonlight_3rd_Movement.mxl', 'Moonlight Sonata, 3rd movement', 'Ludwig van Beethoven', 1801, 160),
 # --- Romantic
 ('Romantic', 2, 'nocturne-eb-easy', 'Nocturne_in_E-flat_Major_Op._9_No._2_Easy.mxl', 'Nocturne in E-flat, Op. 9 No. 2 (easy)', 'Frédéric Chopin', 1832, 100),
 ('Romantic', 3, 'prelude-e-minor', 'Prlude_No._4_in_E_Minor_Op._28_-_Frdric_Chopin.mxl', 'Prelude in E minor, Op. 28 No. 4', 'Frédéric Chopin', 1839, 60),
 ('Romantic', 3, 'waltz-a-minor', 'Waltz_in_A_MinorChopin.mxl', 'Waltz in A minor', 'Frédéric Chopin', 1843, 120),
 ('Romantic', 3, 'ave-maria', 'Ave_Maria_D839_-_Schubert_-_Solo_Piano_Arrg..mxl', 'Ave Maria (piano)', 'Franz Schubert', 1825, 46),
 ('Romantic', 4, 'nocturne-eb', 'Chopin_-_Nocturne_Op_9_No_2_E_Flat_Major.mxl', 'Nocturne in E-flat, Op. 9 No. 2', 'Frédéric Chopin', 1832, 66),
 ('Romantic', 4, 'nocturne-c-sharp', 'Nocturne_in_C_sharp_Minor.mxl', 'Nocturne in C-sharp minor (posth.)', 'Frédéric Chopin', 1830, 65),
 ('Romantic', 4, 'nocturne-bb-minor', 'Chopin_-_Nocturne_Op._9_No._1.mxl', 'Nocturne in B-flat minor, Op. 9 No. 1', 'Frédéric Chopin', 1832, 60),
 ('Romantic', 4, 'waltz-c-sharp', 'Waltz_Opus_64_No._2_in_C_Minor.mxl', 'Waltz in C-sharp minor, Op. 64 No. 2', 'Frédéric Chopin', 1847, 140),
 ('Romantic', 4, 'hungarian-5', 'Hungarian_Dance_No_5_in_G_Minor.mxl', 'Hungarian Dance No. 5', 'Johannes Brahms', 1869, 120),
 ('Romantic', 4, 'serenade', 'Schubert_Serenade_-_Standchen_-_By_Lizst.mxl', 'Serenade (Ständchen), arr. Liszt', 'Franz Schubert / Franz Liszt', 1838, 58),
 ('Romantic', 5, 'liebestraum', 'Liebestraum_No._3_in_A_Major.mxl', 'Liebestraum No. 3', 'Franz Liszt', 1850, 60),
 ('Romantic', 5, 'ballade-1', 'Chopin_-_Ballade_no._1_in_G_minor_Op._23.mxl', 'Ballade No. 1 in G minor', 'Frédéric Chopin', 1835, 80),
 ('Romantic', 5, 'la-campanella', 'La_Campanella_-_Grandes_Etudes_de_Paganini_No._3_-_Franz_Liszt.mxl', 'La Campanella', 'Franz Liszt', 1851, 120),
 ('Romantic', 5, 'bumblebee', 'Flight_of_the_Bumblebee.mxl', 'Flight of the Bumblebee', 'Nikolai Rimsky-Korsakov', 1900, 140),
 # --- Impressionist & Satie
 ('Impressionist', 2, 'gymnopedie-1', 'Erik_Satie_-_Gymnopedie_No.1.mxl', 'Gymnopédie No. 1', 'Erik Satie', 1888, 72),
 ('Impressionist', 3, 'gnossienne-1', 'Gnossienne_No._1.mxl', 'Gnossienne No. 1', 'Erik Satie', 1890, 66),
 ('Impressionist', 4, 'clair-de-lune', 'Clair_de_lune_-_Claude_Debussy.mxl', 'Clair de Lune', 'Claude Debussy', 1905, 72),
 ('Impressionist', 4, 'arabesque-1', 'Arabesque_L._66_No._1_in_E_Major.mxl', 'Arabesque No. 1', 'Claude Debussy', 1891, 90),
 # --- Ballet & orchestral favourites
 ('Ballet & orchestral', 2, 'swan-lake', 'Swan_Lake.mxl', 'Swan Lake theme', 'Pyotr Ilyich Tchaikovsky', 1876, 90),
 ('Ballet & orchestral', 3, 'sugar-plum', 'Dance_of_the_sugar_plum_fairy.mxl', 'Dance of the Sugar Plum Fairy', 'Pyotr Ilyich Tchaikovsky', 1892, 70),
 ('Ballet & orchestral', 3, 'waltz-flowers', 'Waltz_of_the_Flowers.mxl', 'Waltz of the Flowers', 'Pyotr Ilyich Tchaikovsky', 1892, 100),
 # --- Ragtime
 ('Ragtime', 3, 'entertainer', 'The_Entertainer_-_Scott_Joplin.mxl', 'The Entertainer', 'Scott Joplin', 1902, 80),
 ('Ragtime', 4, 'maple-leaf', 'Maple_Leaf_Rag_Scott_Joplin.mxl', 'Maple Leaf Rag', 'Scott Joplin', 1899, 90),
 # --- Folk & holiday
 ('Folk & holiday', 1, 'happy-birthday', 'Happy_Birthday_To_You_C_Major.mxl', 'Happy Birthday', 'Mildred & Patty Hill', 1893, 100),
 ('Folk & holiday', 2, 'happy-birthday-2', 'Happy_Birthday_To_You_Piano.mxl', 'Happy Birthday (two hands)', 'Mildred & Patty Hill', 1893, 100),
 ('Folk & holiday', 2, 'greensleeves', 'Greensleeves_for_Piano_easy_and_beautiful.mxl', 'Greensleeves', 'Traditional English', 1580, 110),
 ('Folk & holiday', 2, 'carol-bells-easy', 'Carol_of_the_Bells_easy_piano.mxl', 'Carol of the Bells (easy)', 'Mykola Leontovych', 1914, 150),
 ('Folk & holiday', 3, 'carol-bells', 'Carol_of_the_Bells.mxl', 'Carol of the Bells', 'Mykola Leontovych', 1914, 180),
]


def to_mxl(xml_bytes, name='score.musicxml'):
    """Compress MusicXML into .mxl (zip with META-INF/container.xml) for the sheet-music view."""
    b = io.BytesIO()
    with zipfile.ZipFile(b, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('META-INF/container.xml', '<?xml version="1.0" encoding="UTF-8"?><container><rootfiles><rootfile full-path="%s" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>' % name)
        z.writestr(name, xml_bytes)
    return b.getvalue()


def extract(s, bpm_default):
    """notes [[beat, len, midi, hand, finger]], bar starts, tempo, meter"""
    parts = list(s.parts)
    if len(parts) > 2:  # keep the two piano staves with the most notes
        parts = sorted(parts, key=lambda p: -len(p.flatten().notes))[:2]
        parts.sort(key=lambda p: -sum(n.pitches[0].midi for n in p.flatten().notes) / max(1, len(p.flatten().notes)))
    notes = []
    for hand, p in enumerate(parts[:2]):
        p = p.stripTies()
        for n in p.flatten().notes:
            if n.duration.isGrace or n.quarterLength <= 0: continue
            fing = [a.fingerNumber for a in n.articulations if isinstance(a, m21.articulations.Fingering)]
            ps = sorted(n.pitches, key=lambda q: q.midi)
            for i, q in enumerate(ps):
                f = fing[i] if i < len(fing) and isinstance(fing[i], int) else (fing[0] if len(fing) == 1 and len(ps) == 1 else 0)
                notes.append([round(float(n.offset), 4), round(float(n.quarterLength), 4), q.midi, hand, f or 0])
    notes.sort(key=lambda x: (x[0], x[2]))
    had = sum(1 for n in notes if n[4])
    autofinger(notes)
    for n in notes: n[4] = int(n[4])
    bars = [round(float(m.offset), 4) for m in parts[0].getElementsByClass('Measure')]
    mm = s.flatten().getElementsByClass(m21.tempo.MetronomeMark)
    bpm = bpm_default
    ts = s.flatten().getElementsByClass(m21.meter.TimeSignature)
    ks = s.flatten().getElementsByClass(m21.key.KeySignature)
    return notes, bars, bpm, (ts[0].ratioString if ts else '4/4'), (ks[0].sharps if ks else 0)


BLACK = {1, 3, 6, 8, 10}


def autofinger(notes):
    """Suggest fingers (1 thumb .. 5 little finger) for notes that have none. One pass per hand over the onsets:
    chords get a spread fingering, single-note lines get a dynamic-programming fingering that prefers
    about a whole step per finger, allows thumb-under / finger-over crossings and avoids the thumb on black keys.
    Notes that already have a finger from the score keep it."""
    for hand in (0, 1):
        groups = {}
        for n in notes:
            if n[3] == hand: groups.setdefault(n[0], []).append(n)
        times = sorted(groups)
        seq = []  # (time, [notes]) runs of single notes, chords handled directly
        def spread(g):
            g = sorted(g, key=lambda n: n[2]); lo, hi = g[0][2], g[-1][2]; span = max(1, hi - lo)
            for n in g:
                if n[4]: continue
                r = (n[2] - lo) / span if len(g) > 1 else 0
                f = 1 + round(r * (4 if span >= 7 else min(4, len(g) - 1 + (1 if span > 4 else 0))))
                n[4] = f if hand == 0 else 6 - f
        def dp(run):
            if not run: return
            INF = 1e9; cost = [[INF] * 6 for _ in run]; back = [[0] * 6 for _ in run]
            for f in range(1, 6):
                n = run[0]
                if n[4] and n[4] != f: continue
                cost[0][f] = (1.5 if f == 1 and n[2] % 12 in BLACK else 0)
            for i in range(1, len(run)):
                a, b = run[i - 1], run[i]; d = (b[2] - a[2]) * (1 if hand == 0 else -1)
                for f2 in range(1, 6):
                    if b[4] and b[4] != f2: continue
                    pen = 1.5 if f2 == 1 and b[2] % 12 in BLACK else 0
                    for f1 in range(1, 6):
                        if cost[i - 1][f1] >= INF: continue
                        df = f2 - f1
                        if d == 0: c = 0 if df == 0 else .6
                        elif df == 0: c = 5
                        elif (d > 0) == (df > 0): c = abs(abs(d) - 1.8 * abs(df)) * .8
                        else:
                            crossing = (d > 0 and f2 == 1 and f1 in (2, 3, 4)) or (d < 0 and f1 == 1 and f2 in (2, 3, 4))
                            c = (2.2 + max(0, abs(d) - 5) * .8) if crossing else 8
                        if abs(d) > 12: c = min(c, 3)
                        t = cost[i - 1][f1] + c + pen
                        if t < cost[i][f2]: cost[i][f2] = t; back[i][f2] = f1
            f = min(range(1, 6), key=lambda k: cost[-1][k])
            for i in range(len(run) - 1, -1, -1):
                if not run[i][4]: run[i][4] = f
                f = back[i][f] or f
        run = []
        for t in times:
            g = groups[t]
            if len(g) == 1: run.append(g[0])
            else:
                dp(run); run = []; spread(g)
        dp(run)


def difficulty(notes, bpm):
    if not notes: return 0
    end = max(n[0] + n[1] for n in notes); secs = end * 60 / bpm
    nps = len(notes) / max(1, secs)
    onsets = {}
    for n in notes: onsets.setdefault((n[0], n[3]), []).append(n[2])
    chord = sum(1 for v in onsets.values() if len(v) > 1) / max(1, len(onsets))
    return round(nps, 1), round(chord, 2)


def build_song(entry, score=None):
    genre, level, sid, fname, title, comp, year, bpm = entry
    if score is None:
        s = m21.converter.parse(LIB + fname)
    else:
        s = score
    orig = s
    try:
        e = s.expandRepeats()
        if len(e.flatten().notes) >= len(s.flatten().notes): s = e
    except Exception:
        pass
    os.makedirs(os.path.join(OUT, 'songs'), exist_ok=True)
    try:
        xml = m21.musicxml.m21ToXml.GeneralObjectExporter(s).parse()
        mxl = to_mxl(xml)
    except Exception as ex:
        # some engraved scores hold durations the exporter cannot write back: use the original file as it is
        # (no repeats written out), and take the notes from that same unexpanded score so both views agree
        if not fname: raise
        print('   (%s: keeping the original score file: %s)' % (sid, str(ex)[:60]))
        s = orig; mxl = open(LIB + fname, 'rb').read()
    notes, bars, bpm, ts, ks = extract(s, bpm)
    open(os.path.join(OUT, 'songs', sid + '.mxl'), 'wb').write(mxl)
    json.dump({'n': notes, 'bars': bars}, open(os.path.join(OUT, 'songs', sid + '.json'), 'w'), separators=(',', ':'))
    nps, ch = difficulty(notes, bpm)
    hands = sorted({n[3] for n in notes})
    fing = sum(1 for n in notes if n[4])
    meta = {'id': sid, 't': title, 'c': comp, 'y': year, 'g': genre, 'lv': level, 'bpm': bpm, 'ts': ts, 'ks': ks,
            'beats': round(max(n[0] + n[1] for n in notes), 2), 'nn': len(notes), 'hands': hands, 'fing': 'score' if any(isinstance(a, m21.articulations.Fingering) for p in s.parts for x in p.flatten().notes for a in x.articulations) else 'suggested',
            'lo': min(n[2] for n in notes), 'hi': max(n[2] for n in notes)}
    print('%-22s lv%d %4d notes %5.1f notes/s chords %.2f range %d-%d fing %d' % (sid, level, len(notes), nps, ch, meta['lo'], meta['hi'], fing))
    sys.stdout.flush()
    return meta


def main():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from learn_originals import ORIGINALS
    only = set(sys.argv[1:])
    idx_path = os.path.join(OUT, 'index.json')
    old = {m['id']: m for m in json.load(open(idx_path))} if os.path.exists(idx_path) else {}
    index = []
    for e in CATALOG:
        if only and e[2] not in only and e[2] in old: index.append(old[e[2]]); continue
        try: index.append(build_song(e))
        except Exception as ex: print('!!', e[2], ex)
    for o in ORIGINALS:
        if only and o['id'] not in only and o['id'] in old: index.append(old[o['id']]); continue
        try:
            entry = (o['g'], o['lv'], o['id'], None, o['t'], o['c'], o['y'], o['bpm'])
            index.append(build_song(entry, o['score']()))
        except Exception as ex: print('!!', o['id'], ex)
    json.dump(index, open(idx_path, 'w'), indent=0, ensure_ascii=False)
    print(len(index), 'songs')


if __name__ == '__main__':
    main()
