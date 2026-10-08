"""Learn pieces written for Jam Room: first-steps lessons, public-domain folk/holiday melodies (with simple
left-hand parts written here), and original practice pieces in modern styles (chord patterns, blues, lo-fi).

Notation: bars separated by '|', notes 'C4:1' (pitch:quarter-beats), rests 'r:2', chords 'C3+E3+G3:4',
optional finger 'E4/3:1'. Dotted values are written as decimals ('G4:1.5').
"""
import music21 as m21


def _seq(text):
    out = []
    for bar in text.split('|'):
        for tok in bar.split():
            name, dur = tok.rsplit(':', 1)
            fing = None
            if '/' in name: name, fing = name.split('/'); fing = int(fing)
            out.append((name, float(dur), fing))
    return out


def song(rh, lh=None, ts='4/4', key=0, bpm=90):
    """build a two-staff piano score from the simple notation"""
    sc = m21.stream.Score()
    for hand, text in enumerate([rh, lh]):
        p = m21.stream.PartStaff()
        p.append(m21.instrument.Piano())
        p.append(m21.clef.TrebleClef() if hand == 0 else m21.clef.BassClef())
        p.append(m21.key.KeySignature(key)); p.append(m21.meter.TimeSignature(ts))
        if hand == 0: p.append(m21.tempo.MetronomeMark(number=bpm))
        if text: items = _seq(text)
        else:  # silent left hand: one rest per bar of the right hand
            items = [('r', sum(float(t.rsplit(':', 1)[1]) for t in bar.split()), None) for bar in rh.split('|')]
        for name, dur, fing in items:
            if name == 'r': el = m21.note.Rest(quarterLength=dur)
            elif '+' in name: el = m21.chord.Chord(name.split('+'), quarterLength=dur)
            else: el = m21.note.Note(name, quarterLength=dur)
            if fing and not isinstance(el, m21.note.Rest): el.articulations.append(m21.articulations.Fingering(fing))
            p.append(el)
        sc.insert(0, p.makeMeasures())
    return sc


def S(**kw): return lambda: song(**kw)


ORIGINALS = [
 # ---------- First steps (original exercises) ----------
 dict(id='fs-middle-c', g='First steps', lv=1, t='1 · Meet middle C', c='Jam Room', y=2026, bpm=80, score=S(
  rh='C4/1:1 C4/1:1 D4/2:1 D4/2:1 | E4/3:1 E4/3:1 D4/2:2 | E4/3:1 D4/2:1 C4/1:1 D4/2:1 | C4/1:4 | E4/3:1 E4/3:1 D4/2:1 D4/2:1 | C4/1:1 D4/2:1 E4/3:2 | D4/2:1 E4/3:1 D4/2:1 C4/1:1 | C4/1:4')),
 dict(id='fs-five-fingers', g='First steps', lv=1, t='2 · Five finger walk', c='Jam Room', y=2026, bpm=84, score=S(
  rh='C4/1:1 D4/2:1 E4/3:1 F4/4:1 | G4/5:2 G4/5:2 | G4/5:1 F4/4:1 E4/3:1 D4/2:1 | C4/1:4 | E4/3:1 G4/5:1 E4/3:1 C4/1:1 | D4/2:1 F4/4:1 D4/2:2 | E4/3:1 D4/2:1 C4/1:2 | C4/1:4')),
 dict(id='fs-left-hand', g='First steps', lv=1, t='3 · Hello, left hand', c='Jam Room', y=2026, bpm=80, score=S(
  rh='r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4',
  lh='C3/5:1 D3/4:1 E3/3:1 F3/2:1 | G3/1:2 G3/1:2 | G3/1:1 F3/2:1 E3/3:1 D3/4:1 | C3/5:4 | G3/1:1 E3/3:1 C3/5:2 | G3/1:1 E3/3:1 C3/5:2 | D3/4:1 E3/3:1 F3/2:1 D3/4:1 | C3/5:4')),
 dict(id='fs-together', g='First steps', lv=1, t='4 · Hands together', c='Jam Room', y=2026, bpm=72, score=S(
  rh='E4/3:2 D4/2:2 | C4/1:4 | E4/3:2 F4/4:2 | G4/5:4 | G4/5:2 F4/4:2 | E4/3:2 D4/2:2 | E4/3:1 D4/2:1 C4/1:2 | C4/1:4',
  lh='C3/5:4 | C3/5:4 | C3/5:4 | G2:4 | G2:4 | C3/5:4 | G2:4 | C3/5:4')),
 dict(id='fs-black-keys', g='First steps', lv=1, t='5 · Black keys: sharps', c='Jam Room', y=2026, bpm=76, score=S(
  key=1, rh='G4/1:1 A4/2:1 B4/3:1 C5/4:1 | D5/5:2 D5/5:2 | D5/5:1 C5/4:1 B4/3:1 A4/2:1 | G4/1:4 | F#4/1:1 G4/2:1 A4/3:1 G4/2:1 | F#4/1:1 G4/2:1 A4/3:2 | B4/3:1 A4/2:1 F#4/1:1 A4/2:1 | G4/1:4',
  lh='G3:4 | D3:4 | D3:4 | G3:4 | D3:4 | D3:4 | D3:4 | G3:4')),
 dict(id='fs-chords', g='First steps', lv=2, t='6 · Your first chords', c='Jam Room', y=2026, bpm=72, score=S(
  rh='E4:2 G4:2 | F4:2 A4:2 | G4:2 F4:2 | E4:4 | E4:2 G4:2 | A4:2 F4:2 | D4:2 G4:2 | C4:4',
  lh='C3+E3+G3:4 | C3+F3+A3:4 | B2+D3+G3:4 | C3+E3+G3:4 | C3+E3+G3:4 | C3+F3+A3:4 | B2+D3+G3:4 | C3+E3+G3:4')),
 # ---------- public-domain melodies (simple left hand written here) ----------
 dict(id='hot-cross-buns', g='Folk & holiday', lv=1, t='Hot Cross Buns', c='Traditional', y=1798, bpm=90, score=S(
  rh='E4/3:1 D4/2:1 C4/1:2 | E4/3:1 D4/2:1 C4/1:2 | C4/1:0.5 C4/1:0.5 C4/1:0.5 C4/1:0.5 D4/2:0.5 D4/2:0.5 D4/2:0.5 D4/2:0.5 | E4/3:1 D4/2:1 C4/1:2')),
 dict(id='mary-lamb', g='Folk & holiday', lv=1, t='Mary Had a Little Lamb', c='Lowell Mason', y=1830, bpm=100, score=S(
  rh='E4/3:1 D4/2:1 C4/1:1 D4/2:1 | E4/3:1 E4/3:1 E4/3:2 | D4/2:1 D4/2:1 D4/2:2 | E4/3:1 G4/5:1 G4/5:2 | E4/3:1 D4/2:1 C4/1:1 D4/2:1 | E4/3:1 E4/3:1 E4/3:1 E4/3:1 | D4/2:1 D4/2:1 E4/3:1 D4/2:1 | C4/1:4',
  lh='C3:4 | C3:4 | G2:4 | C3:4 | C3:4 | C3:4 | G2:4 | C3:4')),
 dict(id='twinkle', g='Folk & holiday', lv=1, t='Twinkle, Twinkle, Little Star', c='Traditional French', y=1761, bpm=100, score=S(
  rh='C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2 | G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2',
  lh='C3:4 | F3:2 C3:2 | F3:2 C3:2 | G2:2 C3:2 | C3:2 G2:2 | C3:2 G2:2 | C3:2 G2:2 | C3:2 G2:2 | C3:4 | F3:2 C3:2 | F3:2 C3:2 | G2:2 C3:2')),
 dict(id='ode-melody', g='Folk & holiday', lv=1, t='Ode to Joy (melody)', c='Ludwig van Beethoven', y=1824, bpm=100, score=S(
  rh='E4/3:1 E4/3:1 F4/4:1 G4/5:1 | G4/5:1 F4/4:1 E4/3:1 D4/2:1 | C4/1:1 C4/1:1 D4/2:1 E4/3:1 | E4/3:1.5 D4/2:0.5 D4/2:2 | E4/3:1 E4/3:1 F4/4:1 G4/5:1 | G4/5:1 F4/4:1 E4/3:1 D4/2:1 | C4/1:1 C4/1:1 D4/2:1 E4/3:1 | D4/2:1.5 C4/1:0.5 C4/1:2',
  lh='C3:4 | C3:2 G2:2 | C3:4 | C3:2 G2:2 | C3:4 | C3:2 G2:2 | C3:4 | G2:2 C3:2')),
 dict(id='jingle-bells', g='Folk & holiday', lv=2, t='Jingle Bells (chorus)', c='James Lord Pierpont', y=1857, bpm=120, score=S(
  rh='E4/3:1 E4/3:1 E4/3:2 | E4/3:1 E4/3:1 E4/3:2 | E4/3:1 G4/5:1 C4/1:1.5 D4/2:0.5 | E4/3:4 | F4/4:1 F4/4:1 F4/4:1.5 F4/4:0.5 | F4/4:1 E4/3:1 E4/3:1 E4/3:0.5 E4/3:0.5 | E4/3:1 D4/2:1 D4/2:1 E4/3:1 | D4/2:2 G4/5:2 | E4/3:1 E4/3:1 E4/3:2 | E4/3:1 E4/3:1 E4/3:2 | E4/3:1 G4/5:1 C4/1:1.5 D4/2:0.5 | E4/3:4 | F4/4:1 F4/4:1 F4/4:1.5 F4/4:0.5 | F4/4:1 E4/3:1 E4/3:1 E4/3:0.5 E4/3:0.5 | G4/5:1 G4/5:1 F4/4:1 D4/2:1 | C4/1:4',
  lh='C3:4 | C3:4 | C3:4 | C3:4 | F3:4 | C3:4 | G2:4 | G2:4 | C3:4 | C3:4 | C3:4 | C3:4 | F3:4 | C3:4 | G2:4 | C3:4')),
 dict(id='saints', g='Folk & holiday', lv=2, t='When the Saints Go Marching In', c='Traditional spiritual', y=1896, bpm=120, score=S(
  rh='r:1 C4/1:1 E4/3:1 F4/4:1 | G4/5:4 | r:1 C4/1:1 E4/3:1 F4/4:1 | G4/5:4 | r:1 C4/1:1 E4/3:1 F4/4:1 | G4/5:2 E4/3:2 | C4/1:2 E4/3:2 | D4/2:4 | r:1 E4/3:1 E4/3:1 D4/2:1 | C4/1:3 C4/1:1 | E4/3:2 G4/5:2 | G4/5:1 F4/4:3 | r:1 E4/3:1 F4/4:1 G4/5:1 | E4/3:2 C4/1:2 | D4/2:2 C4/1:2 | C4/1:4',
  lh='r:4 | C3+E3+G3:4 | r:4 | C3+E3+G3:4 | r:4 | C3+E3+G3:4 | C3+E3+G3:4 | G2+B2+D3:4 | r:4 | C3+E3+G3:4 | C3+E3+G3:4 | C3+F3+A3:4 | r:4 | C3+E3+G3:4 | G2+B2+D3:4 | C3+E3+G3:4')),
 dict(id='amazing-grace', g='Folk & holiday', lv=2, t='Amazing Grace', c='Traditional (New Britain)', y=1835, bpm=84, score=S(
  ts='3/4', rh='r:2 G3:1 | C4:2 E4:0.5 C4:0.5 | E4:2 D4:1 | C4:2 A3:1 | G3:2 G3:1 | C4:2 E4:0.5 C4:0.5 | E4:2 D4:1 | G4:3 | G4:2 E4:1 | G4:1.5 E4:0.5 G4:0.5 E4:0.5 | C4:2 G3:1 | A3:1.5 C4:0.5 C4:0.5 A3:0.5 | G3:2 G3:1 | C4:2 E4:0.5 C4:0.5 | E4:2 D4:1 | C4:3',
  lh='r:3 | C3:3 | C3:3 | F2:3 | C3:3 | C3:3 | C3:3 | G2:3 | C3:3 | C3:3 | C3:3 | F2:3 | C3:3 | C3:3 | G2:3 | C3:3')),
 dict(id='silent-night', g='Folk & holiday', lv=2, t='Silent Night', c='Franz Xaver Gruber', y=1818, bpm=60, score=S(
  ts='6/8', rh='G4:1.5 A4:0.5 G4:1 | E4:3 | G4:1.5 A4:0.5 G4:1 | E4:3 | D5:2 D5:1 | B4:3 | C5:2 C5:1 | G4:3 | A4:2 A4:1 | C5:1.5 B4:0.5 A4:1 | G4:1.5 A4:0.5 G4:1 | E4:3 | A4:2 A4:1 | C5:1.5 B4:0.5 A4:1 | G4:1.5 A4:0.5 G4:1 | E4:3 | D5:2 D5:1 | F5:1.5 D5:0.5 B4:1 | C5:3 | E5:3 | C5:1 G4:1 E4:1 | G4:1.5 F4:0.5 D4:1 | C4:3 | r:3',
  lh='C3+G3:3 | C3+G3:3 | C3+G3:3 | C3+G3:3 | G2+F3:3 | G2+F3:3 | C3+E3:3 | C3+E3:3 | F2+C3:3 | F2+C3:3 | C3+G3:3 | C3+G3:3 | F2+C3:3 | F2+C3:3 | C3+G3:3 | C3+G3:3 | G2+F3:3 | G2+F3:3 | C3+E3:3 | C3+E3:3 | C3+G3:3 | G2+F3:3 | C3+E3:3 | r:3')),
 dict(id='scarborough', g='Folk & holiday', lv=2, t='Scarborough Fair', c='Traditional English', y=1670, bpm=96, score=S(
  ts='3/4', rh='D4:2 D4:1 | A4:2 A4:1 | E4:1.5 F4:0.5 E4:1 | D4:3 | r:1 A4:1 C5:1 | D5:2 C5:1 | A4:1 B4:1 G4:1 | A4:3 | r:2 D5:1 | D5:2 D5:1 | C5:2 A4:1 | A4:1 G4:1 F4:1 | E4:1 C4:2 | D4:2 A4:1 | G4:2 F4:1 | E4:1 D4:1 C4:1 | D4:3',
  lh='D3+A3:3 | D3+A3:3 | C3+G3:3 | D3+A3:3 | D3+A3:3 | F3+C4:3 | G3+D4:3 | D3+A3:3 | D3+A3:3 | F3+A3:3 | F3+C4:3 | F3+A3:3 | C3+G3:3 | D3+A3:3 | G3+D4:3 | C3+G3:3 | D3+A3:3')),
 # ---------- original pieces in modern styles ----------
 dict(id='pop-four-chords', g='Pop patterns', lv=1, t='Four-chord ballad (I–V–vi–IV)', c='Jam Room (original)', y=2026, bpm=76, score=S(
  rh='E4:2 G4:2 | D4:2 G4:2 | C4:2 E4:2 | C4:2 F4:2 | E4:1 G4:1 C5:2 | B4:1 G4:1 D4:2 | C4:1 E4:1 A4:2 | A4:1 F4:1 C4:2',
  lh='C3:4 | G2:4 | A2:4 | F2:4 | C3:4 | G2:4 | A2:4 | F2:4')),
 dict(id='pop-chords-hands', g='Pop patterns', lv=2, t='Pop chords, both hands', c='Jam Room (original)', y=2026, bpm=80, score=S(
  rh='C4+E4+G4:4 | B3+D4+G4:4 | C4+E4+A4:4 | C4+F4+A4:4 | C4+E4+G4:2 C4+E4+G4:2 | B3+D4+G4:2 B3+D4+G4:2 | C4+E4+A4:2 C4+E4+A4:2 | C4+F4+A4:2 B3+D4+G4:2',
  lh='C3:4 | G2:4 | A2:4 | F2:4 | C3:1 G3:1 C3:2 | G2:1 D3:1 G2:2 | A2:1 E3:1 A2:2 | F2:2 G2:2')),
 dict(id='pop-sad', g='Pop patterns', lv=2, t='Moody pop (vi–IV–I–V)', c='Jam Room (original)', y=2026, bpm=84, score=S(
  rh='A4:1 C5:1 E5:1 C5:1 | A4:1 C5:1 F5:1 C5:1 | G4:1 C5:1 E5:1 C5:1 | G4:1 B4:1 D5:1 B4:1 | A4:1 C5:1 E5:1 C5:1 | A4:1 C5:1 F5:1 C5:1 | G4:1 C5:1 E5:1 G5:1 | D5:4',
  lh='A2:4 | F2:4 | C3:4 | G2:4 | A2:4 | F2:4 | C3:4 | G2:4')),
 dict(id='doo-wop', g='Pop patterns', lv=2, t='50s doo-wop (I–vi–IV–V)', c='Jam Room (original)', y=2026, bpm=72, score=S(
  ts='12/8', rh='C4+E4+G4:1.5 C4+E4+G4:1.5 C4+E4+G4:1.5 C4+E4+G4:1.5 | C4+E4+A4:1.5 C4+E4+A4:1.5 C4+E4+A4:1.5 C4+E4+A4:1.5 | C4+F4+A4:1.5 C4+F4+A4:1.5 C4+F4+A4:1.5 C4+F4+A4:1.5 | B3+D4+G4:1.5 B3+D4+G4:1.5 B3+D4+G4:1.5 B3+D4+G4:1.5',
  lh='C3:3 G2:3 | A2:3 E2:3 | F2:3 C3:3 | G2:3 D3:3')),
 dict(id='blues-12', g='Blues & boogie', lv=2, t='12-bar blues in C', c='Jam Room (original)', y=2026, bpm=96, score=S(
  rh='G4:1 E4:1 Eb4:0.5 C4:1.5 | r:4 | G4:1 E4:1 Eb4:0.5 C4:1.5 | r:4 | A4:1 F4:1 Eb4:0.5 C4:1.5 | r:4 | G4:1 E4:1 Eb4:0.5 C4:1.5 | r:4 | B4:1 G4:1 F4:1 D4:1 | A4:1 F4:1 Eb4:1 C4:1 | G4:1 E4:1 C4:2 | D4:2 G3:2',
  lh='C3:1 E3:1 G3:1 A3:1 | Bb3:1 A3:1 G3:1 E3:1 | C3:1 E3:1 G3:1 A3:1 | Bb3:1 A3:1 G3:1 E3:1 | F2:1 A2:1 C3:1 D3:1 | Eb3:1 D3:1 C3:1 A2:1 | C3:1 E3:1 G3:1 A3:1 | Bb3:1 A3:1 G3:1 E3:1 | G2:1 B2:1 D3:1 E3:1 | F2:1 A2:1 C3:1 D3:1 | C3:1 E3:1 G3:1 A3:1 | G2:1 B2:1 D3:1 F3:1')),
 dict(id='boogie', g='Blues & boogie', lv=3, t='Boogie-woogie left hand', c='Jam Room (original)', y=2026, bpm=110, score=S(
  rh='C4+E4+G4:1.5 C4+E4+G4:2.5 | r:1 Bb4:0.5 G4:0.5 E4:2 | C4+E4+G4:1.5 C4+E4+G4:2.5 | r:1 Bb4:0.5 G4:0.5 E4:2 | C4+F4+A4:1.5 C4+F4+A4:2.5 | r:1 C5:0.5 A4:0.5 F4:2 | C4+E4+G4:1.5 C4+E4+G4:2.5 | r:4 | B3+D4+G4:2 C4+F4+A4:2 | C4+E4+G4:4',
  lh='C3:0.5 E3:0.5 G3:0.5 A3:0.5 Bb3:0.5 A3:0.5 G3:0.5 E3:0.5 | C3:0.5 E3:0.5 G3:0.5 A3:0.5 Bb3:0.5 A3:0.5 G3:0.5 E3:0.5 | C3:0.5 E3:0.5 G3:0.5 A3:0.5 Bb3:0.5 A3:0.5 G3:0.5 E3:0.5 | C3:0.5 E3:0.5 G3:0.5 A3:0.5 Bb3:0.5 A3:0.5 G3:0.5 E3:0.5 | F2:0.5 A2:0.5 C3:0.5 D3:0.5 Eb3:0.5 D3:0.5 C3:0.5 A2:0.5 | F2:0.5 A2:0.5 C3:0.5 D3:0.5 Eb3:0.5 D3:0.5 C3:0.5 A2:0.5 | C3:0.5 E3:0.5 G3:0.5 A3:0.5 Bb3:0.5 A3:0.5 G3:0.5 E3:0.5 | C3:0.5 E3:0.5 G3:0.5 A3:0.5 Bb3:0.5 A3:0.5 G3:0.5 E3:0.5 | G2:0.5 B2:0.5 D3:0.5 E3:0.5 F2:0.5 A2:0.5 C3:0.5 D3:0.5 | C3:4')),
 dict(id='lofi-rain', g='Modern originals', lv=2, t='Lo-fi rain', c='Jam Room (original)', y=2026, bpm=70, score=S(
  rh='E4:1 G4:1 B4:2 | C5:1 A4:1 E4:2 | F4:1 A4:1 C5:2 | B4:1 G4:1 D4:2 | E4:1 G4:1 B4:1 D5:1 | C5:1 A4:1 E4:1 C4:1 | D4:1 F4:1 A4:1 C5:1 | B4:4',
  lh='C3+B3:4 | A2+G3:4 | D3+C4:4 | G2+F3:4 | C3+B3:4 | A2+G3:4 | D3+C4:4 | G2+F3:4')),
 dict(id='sunrise-waltz', g='Modern originals', lv=2, t='Sunrise waltz', c='Jam Room (original)', y=2026, bpm=120, score=S(
  ts='3/4', rh='G4:2 E4:1 | D4:2 C4:1 | E4:2 G4:1 | A4:3 | A4:2 F4:1 | E4:2 D4:1 | G4:1 F4:1 D4:1 | C4:3',
  lh='C3:1 G3:1 E3:1 | C3:1 G3:1 E3:1 | A2:1 E3:1 C3:1 | F2:1 C3:1 A2:1 | F2:1 C3:1 A2:1 | C3:1 G3:1 E3:1 | G2:1 D3:1 B2:1 | C3:1 G3:1 E3:1')),
 dict(id='ambient-drift', g='Modern originals', lv=3, t='Ambient drift', c='Jam Room (original)', y=2026, bpm=60, score=S(
  key=1, rh='B4:2 A4:1 D5:1 | G4:4 | F#4:2 E4:1 A4:1 | D4:4 | B4:2 D5:1 E5:1 | F#5:3 E5:1 | D5:2 B4:2 | A4:4',
  lh='G2+D3+A3:4 | E2+B2+G3:4 | C3+G3+D4:4 | D3+A3:4 | G2+D3+A3:4 | B2+F#3+D4:4 | C3+G3+E4:4 | D3+A3+F#4:4')),
]
