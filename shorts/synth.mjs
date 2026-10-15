// Sound for the Shorts: everything synthesized note by note, no recordings. synth(cues, seconds) → a 48 kHz stereo WAV Buffer.
// opts.beat = false leaves out the dance beat and bass line (for the horror cut, which lives on silence).
const SR = 48000;
export function synth(cues, dur, opts = {}) {
  const n = Math.ceil(dur * SR), L = new Float32Array(n), Rr = new Float32Array(n);
  let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647 * 2 - 1;
  const add = (t0, len, fn, pan = 0, gain = 1) => { const a = Math.floor(t0 * SR), m = Math.floor(len * SR); for (let i = 0; i < m && a + i < n; i++) { if (a + i < 0) continue; const v = fn(i / SR, i / m) * gain; L[a + i] += v * (1 - pan) ; Rr[a + i] += v * (1 + pan) } };
  const env = (u, at = .01, k = 6) => (u < at ? u / at : Math.exp(-k * (u - at)));
  const TAU = 2 * Math.PI, saw = (p) => 2 * (p - Math.floor(p + .5)), clamp = (v) => Math.max(0, Math.min(1, v));
  if (opts.beat !== false) {
  // beat: 128 bpm kick + clap + hats from the conversion on, quieter under the hook
  const bpm = 128, beat = 60 / bpm;
  for (let t = 1.3; t < dur - .8; t += beat) {
    const duck = cues.some((c) => c.k === 'boom' && t > c.t - .1 && t < c.t + .6) ? .3 : 1;
    add(t, .35, (x) => Math.sin(2 * Math.PI * (45 + 120 * Math.exp(-x * 30)) * x) * Math.exp(-x * 9), 0, .55 * duck);
    add(t + beat / 2, .06, (x, u) => rnd() * Math.exp(-u * 6) * .5, .3, .18 * duck);
    if (Math.round((t - 1.3) / beat) % 2 === 1) add(t, .18, (x, u) => rnd() * Math.exp(-u * 5) * (.6 + .4 * Math.sin(x * 9000)), -.2, .22 * duck);
  }
  // a bass line on the off-beats while it builds
  const notes = [55, 55, 65.4, 49];
  for (let i = 0, t = 2.0; t < dur - 1; i++, t += beat * 2) add(t, beat * 1.8, (x, u) => Math.sin(2 * Math.PI * notes[i % 4] * x) * env(u, .02, 3) + .3 * Math.sin(4 * Math.PI * notes[i % 4] * x) * env(u, .02, 5), 0, .22);
  }
  for (const c of cues) {
    if (c.k === 'hit') { add(c.t, 1.2, (x) => Math.sin(2 * Math.PI * (40 + 160 * Math.exp(-x * 18)) * x) * Math.exp(-x * 3.5), 0, .9); add(c.t, .5, (x, u) => rnd() * Math.exp(-u * 7), 0, .45); [523, 659, 784, 1046].forEach((f, j) => add(c.t + .02 * j, .9, (x, u) => Math.sin(2 * Math.PI * f * x) * env(u, .01, 4), j % 2 ? .4 : -.4, .1)) }
    if (c.k === 'glitch') for (let j = 0; j < 7; j++) add(c.t + j * .035, .03, (x) => Math.sign(Math.sin(2 * Math.PI * (300 + j * 170) * x)) * .5 + rnd() * .3, j % 2 ? .6 : -.6, .22);
    if (c.k === 'whoosh') add(c.t, .7, (x, u) => rnd() * Math.sin(Math.PI * u) * (.6 + .4 * Math.sin(2 * Math.PI * (200 + 1800 * u) * x)), 0, .3);
    if (c.k === 'riser') add(c.t, c.d, (x, u) => (rnd() * .5 + Math.sin(2 * Math.PI * (180 + 900 * u * u) * x) * .5) * u * u, 0, .18);
    if (c.k === 'pop') { const f = 700 + 700 * (rnd() + 1); add(c.t, .09, (x) => Math.sin(2 * Math.PI * f * x * (1 - x * 4)) * Math.exp(-x * 45), rnd() * .6, .16) }
    if (c.k === 'boom') { add(c.t, 2.2, (x) => Math.sin(2 * Math.PI * (32 + 90 * Math.exp(-x * 10)) * x) * Math.exp(-x * 2), 0, 1); add(c.t, 1.2, (x, u) => rnd() * Math.exp(-u * 4), 0, .5); [261.6, 329.6, 392, 523.3, 659.3].forEach((f, j) => add(c.t + .03 * j, 1.8, (x, u) => (Math.sin(2 * Math.PI * f * x) + .4 * Math.sin(4 * Math.PI * f * x)) * env(u, .01, 2.5), (j - 2) * .3, .08)) }
    if (c.k === 'sweep') { add(c.t, 1.0, (x, u) => Math.sin(2 * Math.PI * (300 + 2200 * u) * x) * Math.sin(Math.PI * u), 0, .14); [784, 988, 1175, 1568].forEach((f, j) => add(c.t + .12 * j, .9, (x, u) => Math.sin(2 * Math.PI * f * x) * env(u, .005, 5), (j - 1.5) * .4, .09)) }
    if (c.k === 'chime') [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, j) => add(c.t + .08 * j, 1.8, (x, u) => Math.sin(2 * Math.PI * f * x) * env(u, .005, 3), (j - 2) * .3, .11));
    // ----- horror kit -----
    // a music box playing an original little tune; from c.slow on it winds down (slower, lower, out of tune) like a dying spring
    if (c.k === 'musicbox') { const mel = [0, 4, 7, 12, 11, 7, 4, 7, 5, 9, 12, 9, 7, 4, 2, 4]; let t = c.t, i = 0;
      while (t < c.t + c.d) { const sl = c.slow != null ? clamp((t - c.slow) / (c.t + c.d - c.slow)) : 0, rate = 1 - .62 * sl, f = 1046.5 * 2 ** (mel[i % 16] / 12) * rate * (1 + sl * .04 * rnd());
        add(t, 1.4, (x) => (Math.sin(TAU * f * x) + .35 * Math.sin(TAU * f * 2.76 * x) * Math.exp(-x * 9) + .15 * Math.sin(TAU * f * 5.4 * x) * Math.exp(-x * 22)) * Math.exp(-x * 3.2) * Math.min(1, x * 400), i % 2 ? .3 : -.3, .17);
        t += .2 / rate; i++ } }
    // a low beating drone with a thin, wavering whistle on top
    if (c.k === 'drone') add(c.t, c.d, (x, u) => ((Math.sin(TAU * 41 * x) + Math.sin(TAU * 43.6 * x) + .6 * Math.sin(TAU * 82.4 * x * (1 + .004 * Math.sin(x * 1.7)))) / 2.6 + .12 * Math.sin(TAU * 1244 * x + 3 * Math.sin(TAU * 5.3 * x)) * u) * Math.min(1, u * 5, (1 - u) * 10), 0, c.g || .35);
    // heartbeat (lub-dub), speeding from bpm0 to bpm1
    if (c.k === 'heart') for (let t = c.t; t < c.t + c.d;) { const u = (t - c.t) / c.d, bpm = c.bpm0 + (c.bpm1 - c.bpm0) * u;
      add(t, .3, (x) => Math.sin(TAU * (48 + 40 * Math.exp(-x * 25)) * x) * Math.exp(-x * 13), 0, .75); add(t + .17, .3, (x) => Math.sin(TAU * (44 + 30 * Math.exp(-x * 25)) * x) * Math.exp(-x * 15), 0, .5); t += 60 / bpm }
    // a single-frame subliminal flash: a click with a needle of a tone
    if (c.k === 'tick') add(c.t, .09, (x, u) => rnd() * Math.exp(-u * 9) + Math.sin(TAU * 3300 * x) * Math.exp(-x * 60), (rnd() * .8), .4);
    // a scream: detuned buzzing voices gliding up with vibrato, driven into distortion (left and right voices differ)
    if (c.k === 'scream') for (const [pan, dt] of [[-.6, 1], [.6, 1.017]]) add(c.t, c.d, (x, u) => { const f = (480 + (c.up ? 520 : 260) * u + 35 * Math.sin(TAU * 7 * x)) * dt; let v = 0; for (const k of [1, 1.011, .991, 1.498]) v += saw(f * k * x); return Math.tanh(v * .9) * (1 + .3 * rnd()) * Math.min(1, x * 25) * (c.up ? Math.min(1, (1 - u) * 20) : (1 - u) ** .7) }, pan, .2);
    // horror strings: a tight cluster up high, trembling
    if (c.k === 'stinger') [1880, 1975, 2093, 2217, 2349].forEach((f, j) => add(c.t, c.d || 1.4, (x, u) => Math.sin(TAU * f * x * (1 + .002 * Math.sin(x * 40 + j))) * (.6 + .4 * Math.sin(TAU * 13 * x + j)) * env(u, .004, 2.2), (j - 2) * .35, .06));
    // a deep drop under an impact
    if (c.k === 'sub') add(c.t, 1.6, (x) => Math.sin(TAU * (24 + 70 * Math.exp(-x * 6)) * x) * Math.exp(-x * 2), 0, .95);
    // TV static, fading in (dir 'in') or out; the same level where one ends and the other starts, so a loop has no seam
    if (c.k === 'static') add(c.t, c.d, (x, u) => { const a = c.dir === 'in' ? u : 1 - u; return Math.round(rnd() * 3) / 3 * a * (.8 + .2 * Math.sin(TAU * 60 * x)) }, 0, c.g || .3);
    // a hushed breath: noise through a soft, slowly moving low-pass
    if (c.k === 'breath') { let y = 0; add(c.t, c.d, (x, u) => { const k = .02 + .05 * (.5 + .5 * Math.sin(TAU * 2.2 * x)); y += k * (rnd() - y); return y * 6 * Math.sin(Math.PI * u) }, c.pan || 0, c.g || .25) }
  }
  // master: soft clip, then normalise to -1 dBFS
  let pk = 0; for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * 1.2); Rr[i] = Math.tanh(Rr[i] * 1.2); pk = Math.max(pk, Math.abs(L[i]), Math.abs(Rr[i])) }
  const g = .89 / (pk || 1), buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Rr[i] * g * 32767), 46 + i * 4) }
  return buf;
}

