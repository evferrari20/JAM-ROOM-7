# Jam Room: summary of everything so far

Read this first, then read `CLAUDE.md` (technical map of the code). This file is the story and the plan.

## What this is
Jam Room is a personal music studio that lives in **one self-contained HTML file** (about 15.6 MB, works offline). You can record and edit tracks, play instruments from an on-screen keyboard, drum kit or computer keys, use a mixer, and export a song.
The owner is **Evan**. He is not technical, so explain things in plain language and say what you changed and why it matters. This is a personal project and will **never be sold or licensed**.
- Evan uses it on a **Microsoft Surface** (Edge/Chrome), mostly by touch, sometimes with the Type Cover.
- His girlfriend will use it on an **iPad (Safari)**. She is not a Claude user, so she must be able to open it from a plain link.
- Evan wants plain **HTML files**, not Claude artifact links. Two identical copies are kept: `jam-room.html` (his) and `jam-room-share.html` (to send).

## What has been built (all in the current file)
- **Look:** dark pine green with brown/amber accents, flat and clean. No light/dark switch. Laid out for a Surface screen (3:2) in landscape and portrait.
- **Touch and pen:** big touch targets. Tapping lower on a key or pad plays louder; Surface Pen pressure sets volume.
- **Instruments:** 76 sounds in 12 families, most of them real recordings (pianos, Rhodes, Wurlitzer, organs, Mellotron, guitars, basses, orchestra strings and winds, world instruments, mallets and bells, choirs, synths). There is a browser with search and favorites.
- **Drums:** 9 recorded kits (acoustic, TR-808, LinnDrum, CR-8000, Drumtraks, RZ-1, hand percussion). The pad area is now a **drawn drum kit** with labeled cymbals, toms, snare, kick and so on. It changes shape for the hand-percussion kit (cajon, congas, bongos). Each piece lights up and presses in when hit.
- **Piano labels:** keys show note names (C, D, E, black keys show both C-sharp and D-flat). A Labels menu can switch to computer-key letters or none.
- **Scale lock:** off by default (it used to silently move black-key notes onto white keys, which Evan noticed as "flats sound the same").
- **Tuning:** a reference-pitch button (A = 440 Hz by default) with a slider, typed value and labeled presets: 415 Baroque, 430 Classical, 432 "Verdi tuning", 435 French 1859, 440 modern standard, 442 orchestral. All instruments and recordings follow it.
- **Polish mix:** one tap listens to each track, sets levels by role, spreads backing sounds left/right, keeps bass dry and adds a gentle finish. Shows what changed and can undo.
- **Share a link:** makes a link that carries the song (vocal recordings left out). It needs the app to be hosted on a real web address; the dialog asks for it once. There is also a song code to paste.
- **Output / listening device:** a dialog to pick speakers, headphones or Bluetooth (works in Edge/Chrome; iPad can only use Control Center), a Fix sound button, a test beep, and a "Sound smoothness" setting (Instant / Balanced / Smooth).
- **iPad fix:** sound used to play only with headphones because of the iPhone/iPad silent switch; now fixed with a playback audio session and a silent keep-alive clip (iOS only).
- **Fixes along the way:** clipping, a click at every loop repeat on sustained instruments (loops rebuilt), and a bad experiment that caused silence (removed).

## Open problem 1: the crackle (NOT solved)
Evan hears crackle **both when pressing keys and when songs play back**, on Surface speakers, wired headphones and Bluetooth. Switching Sound smoothness to Smooth did not help.
In the chat sandbox, offline renders showed no clicks and modest CPU, so the cause is probably **real-time behaviour on the actual Surface**. Ideas to test, with measurements, on the device:
- Sample-rate mismatch (device probably 48 kHz, samples 44.1 kHz) and per-note resampling.
- Audio underruns or main-thread jank (canvas drawing, meters, analysers). Use Edge performance traces and turn pieces off to bisect.
- Node churn per note (filters, gains, panners), the reverb convolver, multiple compressors.
- Windows audio enhancements, power mode, Bluetooth.
- A bare page that loops one sample, then add parts until it crackles.
If an audio-engine rebuild is the answer, propose it before starting.

## Open problem 2: a second flaw Evan mentioned
He once said he noticed "two flaws" but only described the flat-notes one (now fixed). Ask him what the second was.

## The next big feature: Learn Piano
A whole new "page" inside the same HTML file, **piano only to start**. Goal: Evan actually learns piano. He cannot read sheet music.
His decisions:
- **Show the song two ways side by side:** falling bars onto an on-screen piano, and sheet music with a moving cursor. Teach reading gradually (note names, finger numbers).
- **Input:** mainly touchscreen, sometimes Type Cover. Make timing forgiving; make targets big.
- **Songs:** public-domain classical at several difficulty levels, plus some "modern": public-domain ragtime and early 20th-century pieces, original easy pieces in modern styles, and the chord patterns behind pop music. Must include **Fur Elise, Clair de Lune, Moonlight Sonata (first movement)**. Use good judgement and taste for the rest (Bach, Mozart, Beethoven, Chopin, Debussy, Satie, Joplin, Pachelbel...).
- **Copyright rule:** only public-domain compositions; do not transcribe copyrighted songs. Prefer public-domain score sources (Mutopia Project, IMSLP) and check each piece. Modern-style pieces must be original.
- **Teaching approach (modelled on Simply Piano, flowkey, Yousician, Synthesia, Piano Marvel):** wait-for-me mode, each hand separately, adjustable tempo, loop a hard bar, finger numbers, hints that fade, short lessons, star ratings, saved progress, a clear song picker with difficulty levels.
- **Visual instrument display:** for whichever instrument is selected, show a drawing of it that lights up where the played note would be, with a small animation, in real time. Piano keys first; later guitar neck, violin/cello fingerboard, mallet bars, and the existing drum kit.

## Ground rules
- Keep one self-contained HTML file that works offline; keep the two copies identical.
- The page is near the 16 MB limit for publishing as a Claude artifact. Hosting elsewhere (for example Netlify Drop) has no such limit. Keep new data small.
- Test before saying something is done, and be clear about what was only measured versus actually heard. Claude cannot hear audio; Evan tells you what he hears.
- When Evan sends it to someone, the plain-link route is: rename the file `index.html`, drag it onto app.netlify.com/drop, send the address.
- Sample licences vary (see `CREDITS.md`). Fine for personal use; check before anything else.
