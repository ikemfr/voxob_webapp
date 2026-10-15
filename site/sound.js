  // ===== VoxoB Sound: soft, short sounds made in the browser (no recordings, nothing to license) =====
  // Everything goes through one gentle chain (low-pass → light compression), sounds are kept short and quiet, a burst of the
  // same sound is thinned out, and a run of placements walks up a pentatonic scale, so painting a row sounds like a tune.
  (() => {
    let ctx = null, out = null, verb = null, noiseBuf = null;
    const last = {}, PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    let run = 0, runT = 0;
    function init() {
      if (ctx) return ctx; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C(); const lp = ctx.createBiquadFilter(), cmp = ctx.createDynamicsCompressor(); lp.type = 'lowpass'; lp.frequency.value = 7000; cmp.threshold.value = -20; cmp.ratio.value = 3;
      out = ctx.createGain(); out.connect(lp); lp.connect(cmp); cmp.connect(ctx.destination);
      // a short airy tail: two quiet, damped echoes
      verb = ctx.createGain(); verb.gain.value = .16; const dl = ctx.createDelay(.3), fb = ctx.createGain(), dlp = ctx.createBiquadFilter(); dl.delayTime.value = .085; fb.gain.value = .32; dlp.type = 'lowpass'; dlp.frequency.value = 2400;
      verb.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(out);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return ctx;
    }
    function tone(f, t, dur, gain, type = 'sine', bend = 1, wet = true) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (bend !== 1) o.frequency.exponentialRampToValueAtTime(f * bend, t + dur * .7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(out); if (wet) g.connect(verb); o.start(t); o.stop(t + dur + .02);
    }
    function noise(t, dur, gain, f0, f1, q = 1.2) {
      const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(bp); bp.connect(g); g.connect(out); s.start(t); s.stop(t + dur + .02);
    }
    const GAP = { place: .045, erase: .05, paint: .05, click: .03, copy: .08, gen: .2, undo: .06, redo: .06, clear: .3, done: .3 };
    snd = function (type) {
      if (!(vol > 0)) return; if (!init()) return; if (ctx.state === 'suspended') ctx.resume();
      if (type === 'place' && mode === 'del') type = 'erase'; else if (type === 'place' && mode === 'recolor') type = 'paint';
      const now = ctx.currentTime, v = Math.min(1, vol) * .9; if (now - (last[type] || -1) < (GAP[type] || .03)) return; last[type] = now;
      const jit = 1 + (Math.random() - .5) * .03;
      switch (type) {
        case 'place': {   // a soft wooden "tok" that climbs a pentatonic scale while you keep placing
          if (now - runT > .45) run = 0; runT = now; const f = 392 * Math.pow(2, PENTA[run % PENTA.length] / 12) * jit; run++;
          tone(f, now, .09, .11 * v, 'sine', .62); tone(f * 2.01, now, .04, .03 * v, 'triangle', .7, false); noise(now, .02, .05 * v, 3200, 1800, 2); break }
        case 'erase': noise(now, .09, .12 * v, 1600 * jit, 380, .9); tone(220 * jit, now, .07, .04 * v, 'sine', .7, false); break;   // a soft puff
        case 'paint': noise(now, .07, .07 * v, 5200 * jit, 2400, 1.6); tone(660 * jit, now, .06, .03 * v, 'sine', 1.06); break;   // a brush stroke
        case 'click': tone(1500 * jit, now, .025, .035 * v, 'triangle', .9, false); break;
        case 'copy': tone(740, now, .06, .06 * v, 'sine', 1.02); tone(988, now + .055, .08, .06 * v, 'sine', 1.02); break;
        case 'undo': tone(587, now, .07, .06 * v, 'sine', .82); noise(now, .05, .03 * v, 2600, 900); break;
        case 'redo': tone(494, now, .07, .06 * v, 'sine', 1.2); noise(now, .05, .03 * v, 900, 2600); break;
        case 'clear': noise(now, .35, .1 * v, 4200, 260, .7); tone(330, now + .05, .3, .05 * v, 'sine', .5); break;   // a whoosh down
        case 'done': [0, 4, 7, 12].forEach((s, i) => tone(523.25 * Math.pow(2, s / 12), now + i * .06, .5, .05 * v)); break;
        case 'gen': [0, 7, 12].forEach((s, i) => tone(523.25 * Math.pow(2, s / 12) * jit, now + i * .05, .38, .055 * v, 'sine', 1.002)); noise(now + .1, .25, .02 * v, 7000, 9000, 3); break;   // a little chime
        default: tone(880, now, .03, .03 * v, 'triangle', 1, false);
      }
    };
  })();
