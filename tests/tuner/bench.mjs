// Tuner bench, step 2: how well the tuner hears real instruments, before (REF, default HEAD) vs now (working copy).
// Usage: node tests/tuner/bench.mjs [/tmp/tuner-corpus] [instrument regex]   REF=<commit> to compare another version.
import fs from 'fs';
const C = process.argv[2] || '/tmp/tuner-corpus';
const ALGS = ['before', 'now'];
const ONLY = process.argv[3] || '';
const REF = process.env.REF || 'HEAD';
const SR = 48000;
const idxAll = JSON.parse(fs.readFileSync(`${C}/index.json`));
if (!idxAll[0].hasOwnProperty('truth')) measureTruth(idxAll);
const idx = idxAll.filter(c => c.truth && (!ONLY || c.inst.match(ONLY)));

// ---- current tuner's YIN, copied verbatim from src/tuner.html ----
import { execSync } from 'child_process';
function loadTuner(src) { const a = src.indexOf('  // ---------- Pitch detection'), b = src.indexOf('  // ---------- Main loop'); return new Function('const clamp=(v,l,h)=>Math.min(h,Math.max(l,v));' + src.slice(a, b) + '\nreturn detectPitch;')(); }
const yinDetect = loadTuner(execSync('git show ' + REF + ':src/tuner.html').toString());
const newDetect = loadTuner(fs.readFileSync(new URL('../../src/tuner.html', import.meta.url), 'utf8'));

const DET = { before: { det: yinDetect, win: 4096 }, now: { det: newDetect, win: 4096 } };

// ---- conditions ----
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function hpf(x, fc) { // 2nd-order Butterworth high-pass
  const w = Math.tan(Math.PI * fc / SR), k = 1 / (1 + Math.SQRT2 * w + w * w);
  const b0 = k, b1 = -2 * k, b2 = k, a1 = 2 * (w * w - 1) * k, a2 = (1 - Math.SQRT2 * w + w * w) * k;
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
function condition(x, kind, seed) {
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
  if (kind === 'clean') return x.map(v => v / peak * 0.3);
  const r = rng(seed); let y = hpf(x, kind === 'phone' ? 120 : 120);
  peak = 0; for (const v of y) peak = Math.max(peak, Math.abs(v));
  const target = kind === 'phone' ? 0.08 : 0.025, noise = kind === 'phone' ? 0.003 : 0.0025;
  let b0 = 0, b1 = 0, b2 = 0; // pinkish noise (room hum/air)
  return y.map(v => { const w = r() * 2 - 1; b0 = 0.997 * b0 + w * 0.03; b1 = 0.96 * b1 + w * 0.1; b2 = 0.5 * b2 + w * 0.3; return v / peak * target + (b0 + b1 + b2) * noise; });
}

// ---- true pitch of each recording: same method, long window, very clear frames only ----
function measureTruth(all) {
  const src = fs.readFileSync(new URL('../../src/tuner.html', import.meta.url), 'utf8');
  const a = src.indexOf('  function makeMPM'), z = src.indexOf('\n  const MIN_FREQ');
  const N = 16384, d = new Function(src.slice(a, z) + '\nreturn makeMPM;')()(N);
  for (const c of all) {
    const x = new Float32Array(fs.readFileSync(`${C}/${c.name}.f32`).buffer.slice(0)); const f = [];
    for (let t = 0.25; t + N / 48000 < x.length / 48000 && t < 2; t += 0.15) { const s = Math.floor(t * 48000), r = d(x.subarray(s, s + N), 48000, 27, 1600, 0.9); if (r.clarity > 0.95) f.push(r.freq); }
    f.sort((p, q) => p - q); const m = f.length >= 3 ? f[f.length >> 1] : 0, key = 440 * 2 ** ((c.key - 69) / 12);
    c.truth = m && Math.abs(1200 * Math.log2(m / key)) < 250 && m < 1600 ? m : 0; // some pack notes are labelled a semitone off
  }
  fs.writeFileSync(`${C}/index.json`, JSON.stringify(all));
}

// ---- the page's main loop, simplified but with the same smoothing as src/tuner.html ----
function runPipeline(x, det, opts = {}) {
  const hop = 2160, win = opts.win || 4096, out = [];
  const history = []; let smooth = 0, lastHeard = -1e9;
  for (let end = win; end <= x.length; end += hop) {
    const t = end / SR, frame = x.subarray(end - win, end);
    const r = det(frame, SR, smooth);
    if (r.freq > 0) {
      history.push(r.freq); if (history.length > 5) history.shift();
      const med = [...history].sort((p, q) => p - q)[Math.floor(history.length / 2)];
      if (!smooth || Math.abs(1200 * Math.log2(med / smooth)) > 40) smooth = med; else smooth += (med - smooth) * 0.35;
      lastHeard = t; out.push({ t, f: smooth, raw: r.freq });
    } else if (t - lastHeard > 1.2) { history.length = 0; smooth = 0; out.push({ t, f: 0 }); }
    else out.push({ t, f: smooth, held: true });
  }
  return out;
}

const keyF = k => 440 * 2 ** ((k - 69) / 12);
const results = {};
const t0 = Date.now(); const timing = {};
for (const alg of ALGS) {
  results[alg] = {};
  for (const kind of ['clean', 'phone', 'quiet']) {
    const rows = [];
    for (const c of idx) {
      const raw = new Float32Array(fs.readFileSync(`${C}/${c.name}.f32`).buffer.slice(0));
      const x = condition(raw, kind, c.key * 7 + c.vel);
      const ts = Date.now();
      const out = runPipeline(x, DET[alg].det, { win: DET[alg].win });
      timing[alg] = (timing[alg] || 0) + (Date.now() - ts);
      const F = c.truth;
      const win = out.filter(o => o.t >= 0.15 && o.t <= 2.5);
      const live = win.filter(o => o.f > 0 && !o.held);
      const shown = win.filter(o => o.f > 0);
      const cents = o => 1200 * Math.log2(o.f / F);
      const right = shown.filter(o => Math.abs(cents(o)) <= 50);
      const liveRight = live.filter(o => Math.abs(cents(o)) <= 50);
      const octave = shown.filter(o => Math.abs(Math.abs(cents(o)) - 1200) <= 60 || Math.abs(Math.abs(cents(o)) - 1902) <= 60 || Math.abs(Math.abs(cents(o)) - 2400) <= 60);
      const firstOk = out.find(o => o.f > 0 && Math.abs(cents(o)) <= 50);
      const rc = right.map(cents);
      let jit = 0; for (let i = 1; i < rc.length; i++) jit += Math.abs(rc[i] - rc[i - 1]); jit = rc.length > 1 ? jit / (rc.length - 1) : NaN;
      const acc = rc.length ? [...rc].sort((p,q)=>p-q)[Math.floor(rc.length/2)] : NaN;
      rows.push({ acc: Math.abs(acc), name: c.name, inst: c.inst, live: live.length / win.length, right: shown.length ? right.length / shown.length : 0,
        wrong: shown.length ? 1 - right.length / shown.length : 0, octave: shown.length ? octave.length / shown.length : 0,
        cover: liveRight.length / win.length, first: firstOk ? firstOk.t : 9, jit });
    }
    results[alg][kind] = rows;
  }
}
// ---- false readings with no instrument: room noise, and mains hum ----
const quietRuns = {};
for (const alg of ALGS) {
  const r = rng(99); let b0 = 0, b1 = 0, b2 = 0; const n = 48000 * 6;
  const noise = new Float32Array(n).map(() => { const w = r() * 2 - 1; b0 = 0.997 * b0 + w * 0.03; b1 = 0.96 * b1 + w * 0.1; b2 = 0.5 * b2 + w * 0.3; return (b0 + b1 + b2) * 0.003; });
  const hum = noise.map((v, i) => v + 0.002 * (Math.sin(2 * Math.PI * 60 * i / SR) + 0.5 * Math.sin(2 * Math.PI * 180 * i / SR)));
  const cnt = sig => runPipeline(sig, DET[alg].det, { win: DET[alg].win }).filter(o => o.f > 0 && !o.held).length;
  quietRuns[alg] = { noise: cnt(noise), hum: cnt(hum), frames: Math.floor(n / 2160) };
}
// ---- report ----
const insts = [...new Set(idx.map(c => c.inst))];
const avg = (rows, k) => { const v = rows.map(r => r[k]).filter(Number.isFinite); return v.reduce((p, q) => p + q, 0) / v.length; };
const pct = v => (v * 100).toFixed(0).padStart(4) + '%';
console.log('cover = share of the first 2.5 s showing the RIGHT note; wrong = share of shown readings on a wrong note; first = seconds to first right reading; jitter = avg cents change per update');
for (const kind of ['clean', 'phone', 'quiet']) {
  console.log(`\n== ${kind} ==`);
  console.log('instrument  '.padEnd(12) + ALGS.map(a => `| ${a.padEnd(6)} cover wrong first  acc`).join(' '));
  for (const inst of [...insts, 'ALL']) {
    let line = inst.padEnd(12);
    for (const alg of ALGS) {
      const rows = results[alg][kind].filter(r => inst === 'ALL' || r.inst === inst);
      line += `| ${''.padEnd(6)}${pct(avg(rows, 'cover'))} ${pct(avg(rows, 'wrong'))} ${avg(rows, 'first').toFixed(2).padStart(6)} ${avg(rows, 'acc').toFixed(1).padStart(4)} `;
    }
    console.log(line);
  }
}
console.log('\nreadings with NO instrument playing (out of', quietRuns[ALGS[0]].frames, 'updates):', JSON.stringify(quietRuns));
console.log('\ncpu ms per algorithm (all clips, all conditions):', timing);

