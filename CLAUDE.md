# Jam Room: project notes for Claude Code

## Who this is for
Evan. Not technical, so explain things in plain language, avoid jargon, and say what you changed and why it matters to him.
This is a personal project and will never be sold or licensed. He uses it on a **Microsoft Surface (Edge/Chrome)**; his girlfriend uses it on an **iPad (Safari)**.
Be honest about what you could not verify, especially anything that has to be *heard*.

## What it is
A one-file, offline-capable music studio (HTML/CSS/JS, no framework). Record and edit tracks, pick from 76 instruments (mostly real recorded samples), 9 drum kits, mixer, reverb spaces, song starter, tuning, share links, WAV export.
The deliverable is a **single self-contained HTML file** (about 15.6 MB, mostly base64 audio). Two identical copies are given out: `jam-room.html` (his) and `jam-room-share.html` (for sending).

## Layout of this folder
- `src/app.template.html`: the whole app (no audio inside). Edit this. It pulls in `src/css/*.css` and `src/js/*.js` via `/*@include ...*/`.
- `src/samples/packs/<id>.bin + .json`: the sounds, one pack per instrument (MP3 clips back to back; the JSON lists key, velocity layer, round robin, offset, length, encoder delay, sample count, and an optional loudness `gain` / per-pad `pg`).
- `tools/assemble.py`: **run `python3 tools/assemble.py` from the project root**. Builds `dist/jam-room.html` (one self-contained file) and `site/` (the website: small page + packs loaded on demand + `sw.js` for offline). GitHub Actions publishes `site/` to the gh-pages branch on every push.
- `tools/build2.py`: builds high-quality packs from free sample libraries (SFZ maps via `tools/sfz.py`, pitch check, octave fix, gapless MP3). `python3 tools/build2.py piano ebass ...`. Libraries are blobless git clones in `/home/user/src-samples` (fetched on demand).
- `tools/specs1.py, specs2.py, kits.py, build.py, fetch.py`: older instruments, now writing high-quality packs too.
- `tools/calibrate.py OLD_COMMIT ids...`: matches loudness of rebuilt packs to an older build (stores `gain`/`pg`).
- `tests/`: Playwright scripts (`limiter_probe.py`, `soundcheck.py`, `site.py`, `viz.py`, `onset.py`, `click3.py`, ...). They use `dist/jam-room.html` or `$JR`.
- `CREDITS.md`: where the samples came from and their licences.

## How the code is organised (inside app.template.html)
- Audio chain (`buildGraph`): tracks -> master -> highpass -> finishing EQ (`applyFin`) -> compressor -> limiter -> trim -> destination (+ analyser `A.an`). `A` holds the audio context and nodes.
- `SI` = per-instrument settings table; `FB` = fallback synth for instruments without samples; `SD` = parsed sample index (lines `id key data` in a `<script type="text/plain" id="smp">` block, decoded lazily by `b85buf`).
- Sample voices: `sampleVoice` pitch-shifts with `playbackRate` (scaled by `REF/440` for tuning). Sustained instruments loop via `prepLoop` (phase-matched loop point + crossfade).
- Drum kits: `KITS`, `drumNames`, `loadKit`, and the drawn kit (`kitHTML`, `KZ`, `ART`, `SHP_KIT`).
- Features added this session: pine/brown theme and polish CSS, instrument browser (`INST_GROUPS`), reference pitch dialog (`TUNINGS`, `setRef`, `REF`), Polish mix (`polishMix`, `S.fin`), share link (`packSong`/`unpackSong`, hash `#s=`), output device dialog (`openOutput`, `setSinkId`), note-name key labels (`KLAB`), iOS silent-switch fix (`wakeAudio`, silent keep-alive audio element, iOS only), Scale lock now off by default.
- 3D instrument view: `src/js/vz3d.js` builds a cartoon three.js model per instrument (`VZ3D(THREE,helpers)`, table `MAP` from instrument id to model; renders only while something moves, capped at `FRAME_MS`). `src/js/viz.js` loads three.js on first use (inline `#threesrc` in the single file, `vendor/three.module.min.js` on the website), reuses one canvas, and falls back to the flat drawing in Low-power mode, when the dock's 3D toggle is off, or without WebGL. Test: `tests/vz3d.py` (needs SwiftShader flags).
- Test hook: `window.__jr` exposes `SD, A, S, mtof, ref, playInst, ensureSamples, setRef, offRender, LEN, spb, loadDrumKits, getSI`.
- Gotcha: some HTML inside JS strings uses `\"` and some uses plain `"`. Check before bulk find/replace.
- Gotcha: publishing as a Claude artifact has a 16 MB page limit; the file is at about 15.6 MB. Hosting elsewhere (Netlify Drop) has no such limit.

## Job 1: the crackle on the Surface (still unsolved)
Evan hears crackle **both when pressing keys live and when songs play back**, on Surface speakers, wired headphones and Bluetooth. Changing Output > Sound smoothness to Smooth did **not** fix it.
Already done (all measured offline, none of it cured the Surface):
- Fixed real clipping (limiter -6 dB, trim 0.9; peaks now about 0.75-0.89).
- Rebuilt loop points (phase matched) after finding a click at each loop wrap.
- Context latencyHint default is `balanced`, user-selectable. Removed an experimental WaveShaper.
- Offline renders of the starter songs show no discontinuities from the drums, bass or keys; headless CPU is about 12-16% of one core.
So the cause is probably **real-time on the actual device**, which this chat could not reproduce. Because Claude Code runs on the Surface itself, **investigate there, thoroughly, with measurements**:
1. Reproduce in Edge and in Chrome; note the device sample rate (likely 48000) vs the sample rate of the AudioContext and of the MP3s (44100). Per-voice resampling and context mismatch are prime suspects. Try constructing the context at the device rate and resampling every sample once at decode time.
2. Check whether the crackle is audio-thread underruns (CPU) or main-thread jank. Use Edge DevTools Performance traces during playback; try disabling the canvas roll redraw, the VU meter analysers and the spectrum updates to see whether it stops.
3. Look at node churn: each note creates several nodes (filter, gain, panner, sources). Consider voice limiting, a shared filter bank, or an AudioWorklet mixer. Consider a lighter reverb (the ConvolverNode with long IRs is costly) and fewer compressors.
4. Check Windows audio enhancements, exclusive mode, Bluetooth codecs, power mode (Battery Saver throttles), and whether other tabs/apps contend.
5. Test a bare page that only plays one sample in a loop, then add pieces until the crackle appears. Bisect.
6. Report plainly what you find. If a rebuild of the audio engine is warranted, propose it before starting.

## Job 2: Learn Piano mode (new feature, not started)
Evan's answers to the planning questions:
- Crackle: both live and playback, all outputs (see Job 1).
- Lesson display: **falling bars onto an on-screen piano AND sheet music with a moving cursor, side by side.** He **cannot read sheet music**, so teach reading gradually (note names, finger numbers, a beginner-friendly legend).
- Input: **mainly touchscreen, sometimes Type Cover keys** (MIDI possible later). Be forgiving with timing; make touch targets big.
- Songs: **public-domain classical at several difficulty levels, plus some "modern"**: public-domain ragtime and early 20th-century pieces, original easy pieces in modern styles, and the common chord patterns behind pop music. **Must include Fur Elise, Clair de Lune, Moonlight Sonata (first movement)**; use best judgement and taste for the rest (Bach, Mozart, Beethoven, Chopin, Debussy, Satie, Joplin, Pachelbel, etc.).
- **Do not transcribe copyrighted songs.** Only use compositions in the public domain, and prefer sourcing note data from public-domain scores (for example Mutopia Project or IMSLP) and check each piece. Modern-style pieces must be original.
- It should be a whole new "page" (view) inside the same HTML tool, piano only to start.
Design direction (model on Simply Piano, flowkey, Yousician, Synthesia, Piano Marvel): wait-for-me mode (the lesson pauses until the right note), each hand separately, adjustable tempo, loop a hard bar, finger numbers, star ratings and progress saved, short lessons, note-name hints that fade out, and a clear song-picker with difficulty levels.
Also: **an instrument visualizer.** For whichever instrument is selected, show a drawing of it that lights up where the note played would be, with a small animation, in real time. Piano keys first; later guitar fretboard, violin/cello fingerboard, mallet bars, and the drum kit that already exists (`kitHTML`).
Keep the 16 MB page limit and file size in mind (note data is tiny; keep it that way).

## Working rules
- Keep the app one self-contained HTML file that works offline, and keep `jam-room.html` and `jam-room-share.html` identical.
- Test before saying something is done. Be explicit about what was verified only by measurement versus by ear.
- Keep the look: deep pine green with warm brown/amber accents, flat and clean, readable on Surface and iPad.
