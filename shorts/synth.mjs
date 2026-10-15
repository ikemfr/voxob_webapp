// Sound for the Shorts: everything synthesized note by note, no recordings. synth(cues, seconds) → a 48 kHz stereo WAV Buffer.
// ---------- sound: everything synthesized here ----------
const SR = 48000;
export function synth(cues, dur) {
  const n = Math.ceil(dur * SR), L = new Float32Array(n), Rr = new Float32Array(n);
  let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647 * 2 - 1;
  const add = (t0, len, fn, pan = 0, gain = 1) => { const a = Math.floor(t0 * SR), m = Math.floor(len * SR); for (let i = 0; i < m && a + i < n; i++) { if (a + i < 0) continue; const v = fn(i / SR, i / m) * gain; L[a + i] += v * (1 - pan) ; Rr[a + i] += v * (1 + pan) } };
  const env = (u, at = .01, k = 6) => (u < at ? u / at : Math.exp(-k * (u - at)));
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
  for (const c of cues) {
    if (c.k === 'hit') { add(c.t, 1.2, (x) => Math.sin(2 * Math.PI * (40 + 160 * Math.exp(-x * 18)) * x) * Math.exp(-x * 3.5), 0, .9); add(c.t, .5, (x, u) => rnd() * Math.exp(-u * 7), 0, .45); [523, 659, 784, 1046].forEach((f, j) => add(c.t + .02 * j, .9, (x, u) => Math.sin(2 * Math.PI * f * x) * env(u, .01, 4), j % 2 ? .4 : -.4, .1)) }
    if (c.k === 'glitch') for (let j = 0; j < 7; j++) add(c.t + j * .035, .03, (x) => Math.sign(Math.sin(2 * Math.PI * (300 + j * 170) * x)) * .5 + rnd() * .3, j % 2 ? .6 : -.6, .22);
    if (c.k === 'whoosh') add(c.t, .7, (x, u) => rnd() * Math.sin(Math.PI * u) * (.6 + .4 * Math.sin(2 * Math.PI * (200 + 1800 * u) * x)), 0, .3);
    if (c.k === 'riser') add(c.t, c.d, (x, u) => (rnd() * .5 + Math.sin(2 * Math.PI * (180 + 900 * u * u) * x) * .5) * u * u, 0, .18);
    if (c.k === 'pop') { const f = 700 + 700 * (rnd() + 1); add(c.t, .09, (x) => Math.sin(2 * Math.PI * f * x * (1 - x * 4)) * Math.exp(-x * 45), rnd() * .6, .16) }
    if (c.k === 'boom') { add(c.t, 2.2, (x) => Math.sin(2 * Math.PI * (32 + 90 * Math.exp(-x * 10)) * x) * Math.exp(-x * 2), 0, 1); add(c.t, 1.2, (x, u) => rnd() * Math.exp(-u * 4), 0, .5); [261.6, 329.6, 392, 523.3, 659.3].forEach((f, j) => add(c.t + .03 * j, 1.8, (x, u) => (Math.sin(2 * Math.PI * f * x) + .4 * Math.sin(4 * Math.PI * f * x)) * env(u, .01, 2.5), (j - 2) * .3, .08)) }
    if (c.k === 'sweep') { add(c.t, 1.0, (x, u) => Math.sin(2 * Math.PI * (300 + 2200 * u) * x) * Math.sin(Math.PI * u), 0, .14); [784, 988, 1175, 1568].forEach((f, j) => add(c.t + .12 * j, .9, (x, u) => Math.sin(2 * Math.PI * f * x) * env(u, .005, 5), (j - 1.5) * .4, .09)) }
    if (c.k === 'chime') [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, j) => add(c.t + .08 * j, 1.8, (x, u) => Math.sin(2 * Math.PI * f * x) * env(u, .005, 3), (j - 2) * .3, .11));
  }
  // master: soft clip, then normalise to -1 dBFS
  let pk = 0; for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * 1.2); Rr[i] = Math.tanh(Rr[i] * 1.2); pk = Math.max(pk, Math.abs(L[i]), Math.abs(Rr[i])) }
  const g = .89 / (pk || 1), buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Rr[i] * g * 32767), 46 + i * 4) }
  return buf;
}

