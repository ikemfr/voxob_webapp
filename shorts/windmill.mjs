// The windmill: a horror loop Short.
//   👆 / 👈😁👉 / 👇 turns like a windmill to a music box (voxels, then the smooth view) — with things that should not be there
//   (a negative ghost turning the other way, one-frame flashes) — winds down, stops, goes dark and silent… then 🫵 / 🫵🫪🫵 / 🫵
//   screams and rushes at the screen four ways (dash, shudder, zigzag, spin-and-slam) and ends in static, which the start comes out of.
// Every emoji goes through VoxoB's own text → 3D (VoxoBConvert.textCanvas → creature), so 🫪 works wherever a font has it;
// here that is Noto Color Emoji from Fontsource, since the container's system copy predates it.
// usage: node shorts/windmill.mjs   → shorts/fx/windmill-loop.mp4, -thumb.jpg, .md   (PLAYWRIGHT=… CHROMIUM=… THREE_JS=… as in shorts/make.mjs)
// Fonts: Fontsource (SIL OFL 1.1), fetched by shorts/fonts.mjs — Japanese typefaces only. Sound: synthesized in shorts/synth.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { synth } from './synth.mjs';
import { css } from './fonts.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const ROOT = process.cwd(), OUT = path.join(ROOT, 'shorts', 'fx'); fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
if (process.env.THREE_JS) await ctx.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ path: process.env.THREE_JS, contentType: 'text/javascript' }));
await ctx.route(/fonts\.googleapis|fonts\.gstatic|_vercel/, (r) => r.fulfill({ body: '' }));
await ctx.addInitScript(() => { localStorage.setItem('vs_lang', 'ja'); localStorage.setItem('vs_seen', '1'); localStorage.setItem('vs_smooth', '0') });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.error(e.message)); p.setDefaultTimeout(0);
await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(800);
await p.addStyleTag({ content: [css('dela-gothic-one'), css('shippori-mincho-b1', { file: '800.css' }), css('dotgothic16'), css('noto-color-emoji', { file: 'emoji-400.css' })].join('\n') });

const SMILE = { up: '👆', left: '👈', right: '👉', down: '👇️', face: '😁' }, ANGRY = { up: '🫵', left: '🫵', right: '🫵', down: '🫵', face: '🫪' };
const WORDS = { pop: 'くるくる風車 ♪カクカク→◐なめらか表示', hor: '……あれ？ミツケタニゲラレナイズットイッショツカマエタみてるにげて', vhs: 'PLAY REC●0123456789:EmojiNotoColorOFL·VoxoB※音量注意' };

// ---------- fonts, then both windmills as voxel animations (in the page) ----------
const info = await p.evaluate(async ([SMILE, ANGRY, WORDS]) => {
  await Promise.all([document.fonts.load('100px "Dela Gothic One"', WORDS.pop), document.fonts.load('800 100px "Shippori Mincho B1"', WORDS.hor), document.fonts.load('100px "DotGothic16"', WORDS.vhs), document.fonts.load('100px "Noto Color Emoji"', Object.values(SMILE).join('') + Object.values(ANGRY).join(''))]);
  // is 🫪 a real colour glyph (not a blank box)?
  const tc = VoxoBConvert.textCanvas(ANGRY.face), td = tc.getContext('2d').getImageData(0, 0, tc.width, tc.height).data; let col = 0; for (let i = 0; i < td.length; i += 4) if (td[i + 3] > 128 && Math.abs(td[i] - td[i + 2]) > 60) col++;
  const part = (s, R) => VoxoBConvert.ST.creature(VoxoBConvert.grid(VoxoBConvert.textCanvas(s), R));
  const S = 36, C = 46, dist = 36, SZ = 2 * dist + S + 8, cx = SZ / 2, cy = SZ / 2;
  function build(e) {
    const c = part(e.face, C), as = [[e.up, Math.PI / 2], [e.left, Math.PI], [e.right, 0], [e.down, -Math.PI / 2]].map(([s, a]) => ({ v: part(s, S), a }));
    const D = Math.max(c.D, ...as.map((a) => a.v.D)) + 2, zc = D / 2;
    return (rot) => {   // voxels with the blades turned by rot (radians); the face stays put
      const out = {};
      const put = (x, y, z, col) => { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (x >= 0 && y >= 0 && z >= 0 && x < SZ && y < SZ && z < D) out[vk(x, y, z)] = { c: col, a: 255 } };
      for (const { v, a } of as) { const ang = a + rot, ox = cx + Math.cos(ang) * dist, oy = cy + Math.sin(ang) * dist, pr = Math.cos(rot), ps = Math.sin(rot);
        for (const [x, y, z, col] of v.vox) { const lx = x - v.W / 2, ly = y - v.H / 2; for (const [dx, dy] of [[0, 0], [.4, 0], [0, .4], [.4, .4]]) put(ox + (lx + dx) * pr - (ly + dy) * ps, oy + (lx + dx) * ps + (ly + dy) * pr, z - v.D / 2 + zc, col) } }
      for (const [x, y, z, col] of c.vox) put(cx - c.W / 2 + x, cy - c.H / 2 + y, z - c.D / 2 + zc, col);
      return out;
    };
  }
  const smile = build(SMILE), angry = build(ANGRY), N1 = 24, N2 = 12, fr = [];
  for (let i = 0; i < N1; i++) fr.push({ v: smile(-i / N1 * Math.PI * 2), ws: false, cam: null });   // one full turn
  for (let i = 0; i < N2; i++) fr.push({ v: angry(-i / N2 * Math.PI / 2), ws: false, cam: null });  // a quarter turn (four alike blades loop)
  W = H = SZ; D = Math.max(...fr.map((f) => Math.max(...Object.keys(f.v).map((k) => pv_(k)[2])))) + 2; $('sW').value = W; $('sH').value = H; $('sD').value = D;
  frames = fr; curFrame = 0; rebMesh(); rebGrid(); resetCam(); uFUI();
  window.WM = { N1, N2, SZ };
  return { glyph: col, voxels: fr.map((f) => Object.keys(f.v).length) };
}, [SMILE, ANGRY, WORDS]);
console.log(`🫪 colour pixels: ${info.glyph}; voxels per frame ${info.voxels[0]} (smile), ${info.voxels[24]} (angry)`);
if (info.glyph < 500) throw new Error('🫪 did not render in colour — check the emoji font');

// ---------- the loop Short ----------
const silent = path.join(OUT, 'windmill-loop.silent.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const closed = new Promise((r) => ff.on('close', r));
let pushed = 0;
await p.exposeFunction('__push', async (arr) => { for (const b64 of arr) { pushed++; if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r)) } });

const segs = await p.evaluate(async () => {
  const OW = 1080, OH = 1920, FPS = 30, mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c };
  const out = mk(OW, OH), ox = out.getContext('2d');
  ren.setPixelRatio(1); ren.setSize(OW, OH, false); cam.aspect = OW / OH; cam.updateProjectionMatrix(); if (gG) gG.visible = false;
  const { N1, N2, SZ } = WM, PI = Math.PI, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), inQ = (u) => u * u * u, ease = (u) => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
  const mixC = (a, b, u) => [16, 8, 0].reduce((s, sh) => s | Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * u) << sh, 0);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const POP = (n) => `${n}px "Dela Gothic One"`, HOR = (n) => `800 ${n}px "Shippori Mincho B1"`, VHS = (n) => `${n}px "DotGothic16"`;

  // one 3D view of the windmill into the renderer's canvas
  const r3 = (fi, smooth, o = {}) => { goFrame(fi); VoxoBSmooth.show(!!smooth); ren.setClearColor(o.clear ?? 0, 1); cTgt.set(SZ / 2, SZ / 2, SZ * .15); cT = o.th ?? PI / 2; cP = o.ph ?? PI / 2; cD = SZ * (o.dist ?? 1.75) * 1.6; uCam(); cam.rotation.z += o.roll || 0; ren.render(scn, cam); return c3 };
  // the angry face close up, red, on black: the ghost that haunts the seam and the one-frame flashes
  const ghost = mk(OW, OH), gx = ghost.getContext('2d'); gx.filter = 'saturate(.4) contrast(1.6) brightness(1.15)'; gx.drawImage(r3(N1, true, { dist: .8 }), 0, 0); gx.filter = 'none'; gx.globalCompositeOperation = 'multiply'; gx.fillStyle = '#ff7a6a'; gx.fillRect(0, 0, OW, OH); gx.globalCompositeOperation = 'source-over';
  // TV static, chunky like a worn tape
  const nz = mk(180, 320), nzx = nz.getContext('2d'), nid = nzx.createImageData(180, 320);
  const staticOver = (a, op = 'source-over') => { if (a <= 0) return; for (let y = 0; y < 320; y++) { const band = rnd() < .08 ? 90 : 0; for (let x = 0; x < 180; x++) { const i = (y * 180 + x) * 4, v = Math.min(255, rnd() * 230 + band); nid.data[i] = nid.data[i + 1] = nid.data[i + 2] = v; nid.data[i + 3] = 255 } }
    nzx.putImageData(nid, 0, 0); ox.save(); ox.globalAlpha = a; ox.globalCompositeOperation = op; ox.imageSmoothingEnabled = false; ox.drawImage(nz, 0, 0, OW, OH); ox.restore() };
  // the loop seam: static with the red face inside it; k = 1 on the last frame and the first
  const seam = (k) => { if (k <= 0) return; staticOver(Math.min(1, k * 1.15)); ox.save(); ox.globalAlpha = .6 * k; ox.globalCompositeOperation = 'screen'; ox.drawImage(ghost, (rnd() - .5) * 40 * k, (rnd() - .5) * 40 * k); ox.restore() };
  // red / cyan split of the whole frame
  const chans = ['#ff0000', '#00ff00', '#0000ff'].map((c) => { const cv = mk(OW, OH); return { cv, x: cv.getContext('2d'), c } });
  const rgb = (amt) => { if (amt < 1) return; for (const ch of chans) { ch.x.globalCompositeOperation = 'source-over'; ch.x.drawImage(out, 0, 0); ch.x.globalCompositeOperation = 'multiply'; ch.x.fillStyle = ch.c; ch.x.fillRect(0, 0, OW, OH) }
    ox.save(); ox.fillStyle = '#000'; ox.fillRect(0, 0, OW, OH); ox.globalCompositeOperation = 'lighter'; ox.drawImage(chans[0].cv, -amt, (rnd() - .5) * amt * .3); ox.drawImage(chans[1].cv, 0, 0); ox.drawImage(chans[2].cv, amt, (rnd() - .5) * amt * .3); ox.restore() };
  const tears = (n, w = 160) => { for (let i = 0; i < n; i++) { const y = rnd() * OH, h = 12 + rnd() * 110; ox.drawImage(out, 0, y, OW, h, (rnd() - .5) * w, y, OW, h) } };
  const invert = () => { ox.save(); ox.globalCompositeOperation = 'difference'; ox.fillStyle = '#fff'; ox.fillRect(0, 0, OW, OH); ox.restore() };
  const scan = mk(4, 6), sx = scan.getContext('2d'); sx.fillStyle = 'rgba(0,0,0,.55)'; sx.fillRect(0, 0, 4, 2); const scanPat = ox.createPattern(scan, 'repeat');
  const scanlines = (a) => { ox.save(); ox.globalAlpha = a; ox.fillStyle = scanPat; ox.fillRect(0, 0, OW, OH); ox.restore() };
  const vignette = (a, col = '0,0,0') => { const g = ox.createRadialGradient(OW / 2, OH / 2, OW * .3, OW / 2, OH / 2, OH * .72); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`); ox.fillStyle = g; ox.fillRect(0, 0, OW, OH) };
  const lines = (k, col) => { ox.save(); ox.translate(OW / 2, OH / 2); ox.strokeStyle = col; for (let i = 0; i < 80; i++) { const a = rnd() * PI * 2, r0 = 240 + rnd() * 300, r1 = r0 + 300 + rnd() * 1000 * k; ox.globalAlpha = .25 + .5 * rnd(); ox.lineWidth = 2 + rnd() * 8; ox.beginPath(); ox.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ox.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ox.stroke() } ox.restore() };
  const text = (s, x, y, font, fill, stroke, sw, split = 0) => { ox.save(); ox.font = font; ox.textAlign = 'center'; ox.textBaseline = 'middle'; ox.lineJoin = 'round'; if (sw) { ox.lineWidth = sw; ox.strokeStyle = stroke; ox.strokeText(s, x, y) }
    if (split) { ox.globalCompositeOperation = 'screen'; ox.fillStyle = '#ff0000'; ox.fillText(s, x - split, y + (rnd() - .5) * split); ox.fillStyle = '#00ffff'; ox.fillText(s, x + split, y + (rnd() - .5) * split); ox.globalCompositeOperation = 'source-over' }
    ox.fillStyle = fill; ox.fillText(s, x, y); ox.restore() };
  // a second, different windmill laid over the first
  const layer = (cv, op, a, dx = 0, dy = 0, sc = 1) => { if (a <= 0) return; ox.save(); ox.globalAlpha = a; ox.globalCompositeOperation = op; ox.translate(OW / 2 + dx, OH / 2 + dy); ox.scale(sc, sc); ox.drawImage(cv, -OW / 2, -OH / 2); ox.restore() };
  const lay = mk(OW, OH), lx = lay.getContext('2d'); const toLay = (c) => { lx.drawImage(c, 0, 0); return lay };
  // afterimages: the last few main views, small, replayed as a zooming echo
  const trail = Array.from({ length: 5 }, () => mk(OW / 2, OH / 2)); let tHead = 0;

  const T = { a: .5, smooth: 3.2, slow: 4.6, stop: 6.0, dark: 6.75, bang: 7.0, dash: 7.4, shake: 8.8, zig: 10.0, slam: 11.3, hit: 12.4, total: 13.0 };
  const subl = [1.9, 4.0], twitch = [6.25, 6.45, 6.6, 6.68], holds = [[7.62, 7.72], [9.2, 9.3], [10.45, 10.53], [11.0, 11.07]];
  const cues = [{ t: 0, k: 'static', d: T.a, dir: 'out', g: .3 }, { t: 0, k: 'drone', d: .9, g: .25 }, { t: .35, k: 'musicbox', d: T.stop - .35, slow: T.slow },
    ...subl.flatMap((t) => [{ t, k: 'tick' }, { t, k: 'stinger', d: .35 }]), { t: T.smooth, k: 'sweep' }, { t: 2.5, k: 'drone', d: T.dark - 2.5, g: .22 }, { t: 4.0, k: 'breath', d: 1.2, pan: -.5 },
    { t: 5.4, k: 'heart', d: 1.3, bpm0: 62, bpm1: 120 }, { t: 5.6, k: 'breath', d: 1.1, pan: .5, g: .3 }, ...twitch.map((t) => ({ t, k: 'tick' })),
    { t: T.bang, k: 'scream', d: 1.3 }, { t: T.bang, k: 'sub' }, { t: T.bang, k: 'glitch' }, { t: T.bang, k: 'stinger', d: 1.6 }, { t: T.bang, k: 'drone', d: T.total - T.bang, g: .3 },
    { t: T.dash, k: 'heart', d: T.hit - T.dash, bpm0: 140, bpm1: 200 }, { t: T.dash, k: 'whoosh' }, ...holds.map(([t]) => ({ t, k: 'glitch' })),
    { t: T.shake, k: 'glitch' }, { t: T.shake, k: 'stinger', d: 1 }, { t: T.zig, k: 'whoosh' }, { t: T.zig + .6, k: 'whoosh' },
    { t: T.slam, k: 'riser', d: T.hit - T.slam }, { t: T.slam, k: 'scream', d: T.hit - T.slam, up: true },
    { t: T.hit, k: 'sub' }, { t: T.hit, k: 'glitch' }, { t: T.hit, k: 'stinger', d: .6 }, { t: T.hit + .05, k: 'static', d: T.total - T.hit - .05, dir: 'in', g: .3 }];
  const at = (s, list) => list.some((t) => s >= t && s < t + 1 / FPS);
  const n = Math.round(T.total * FPS), batch = []; let last = null;
  for (let f = 0; f < n; f++) {
    const s = f / FPS;
    if (last && holds.some(([a, b]) => s >= a && s < b)) { batch.push(last); continue }   // the picture sticks, like a chewed tape
    ox.globalAlpha = 1; ox.globalCompositeOperation = 'source-over';
    if (s < T.bang) {
      // ----- the cheerful windmill, going wrong -----
      const Ds = T.stop - T.slow, tau = clamp(s - T.slow, 0, Ds), phase = 9 * Math.min(s, T.slow) + 9 * (tau - tau * tau / (2 * Ds)), calm = 1 - clamp((s - T.slow) / 1.4);
      const tw = at(s, twitch), fi = tw ? N1 : Math.floor(phase) % N1;
      const smooth = s >= T.smooth + .4 || (s >= T.smooth && Math.floor(s * 10) % 2 === 1);
      const creep = ease(clamp((s - T.slow) / (T.dark - T.slow))), clear = mixC(0xf7b23b, 0x231e1c, creep);
      const th = PI / 2 + Math.sin(s * 1.4) * .35 * calm, ph = PI / 2 - .15 + Math.sin(s * 2) * .06 * calm, dist = 1.45 - .5 * creep;
      ox.drawImage(r3(fi, smooth, { th, ph, dist, clear }), 0, 0);
      // the negative ghost: the angry one turning the other way, fading in
      const ga = s < 1.2 ? 0 : clamp((s - 1.2) / 4) * .3 + .25 * creep;
      if (ga > 0) layer(toLay(r3(N1 + (N2 - 1 - Math.floor(s * 6) % N2), true, { th: PI - th, ph, dist: dist * 1.15, clear: 0 })), 'difference', ga, Math.sin(s * .9) * 40, 0, 1.05);
      vignette(.35 + .55 * creep + (s > 5.4 ? .15 * Math.max(0, Math.sin(s * 9)) : 0), creep > .5 ? '0,0,0' : '160,50,0');
      staticOver(.05 + .1 * creep, 'overlay'); scanlines(.12 + .3 * creep);
      // words
      if (s < 5.2) text(at(s, subl) ? (s < 3 ? 'みてる' : 'にげて') : 'くるくる風車 ♪', OW / 2, 300, at(s, subl) ? HOR(150) : POP(108), at(s, subl) ? '#ff2020' : '#fff', at(s, subl) ? '#000' : '#c0390b', 18, s > 4.4 ? (rnd() < .2 ? 8 : 0) : 0);
      if (s >= T.smooth && s < 5.2) text(s < T.smooth + .4 ? 'カクカク → ' : '◐ なめらか表示', OW / 2, 1660, POP(76), '#fff', '#c0390b', 14);
      if (s >= 5.4 && s < T.dark) { const j = (s - 5.4) * 6; text('……あれ？', OW / 2 + (rnd() - .5) * j, 300 + (rnd() - .5) * j, HOR(96), '#eee', '#000', 10) }
      // one-frame flashes of what is coming
      if (at(s, subl)) { layer(ghost, 'source-over', .9); invert() }
      if (tw) { rgb(24); tears(5) }
      if (s >= T.dark) { ox.fillStyle = `rgba(0,0,0,${clamp((s - T.dark) / .08) * .94})`; ox.fillRect(0, 0, OW, OH); layer(ghost, 'screen', .07 + .05 * Math.sin(s * 40)); staticOver(.08, 'screen') }   // dark, and quiet
    } else {
      // ----- the angry one comes for you -----
      const spin = s < T.slam ? 18 : 30 + (s - T.slam) * 50; let fi = N1 + Math.floor(s * spin) % N2;
      let dist = 1.4, th = PI / 2, ph = PI / 2, shake = 0, roll = 0, smooth = true, split = 6, tr = 2, echo = 0, clear = 0x3a0808, cap = '';
      if (s < T.dash) { const u = (s - T.bang) / (T.dash - T.bang); dist = .95 + .2 * u; shake = 70 * (1 - u); split = 50 * (1 - u) + 8; tr = 14; cap = 'ミツケタ'; smooth = Math.floor(s * 15) % 2 === 0 }
      else if (s < T.shake) { const u = (s - T.dash) / (T.shake - T.dash); dist = 6 - 4.6 * inQ(u); smooth = u > .5; echo = .5; cap = 'ミツケタ'; shake = 6 + 20 * u }
      else if (s < T.zig) { dist = 1.4; shake = 28; smooth = Math.floor(s * 10) % 2 === 0; split = smooth ? 6 : 26; tr = smooth ? 2 : 8; cap = 'ニゲラレナイ' }
      else if (s < T.slam) { const u = (s - T.zig) / (T.slam - T.zig); dist = 1.4 - .35 * u; th = PI / 2 + Math.sin(u * PI * 3) * .7; roll = Math.sin(u * PI * 3) * .15; smooth = Math.floor(s * 7.5) % 2 === 0; echo = .45; clear = f % 4 === 0 ? 0x9a0000 : 0x2a0505; cap = 'ズット イッショ' }
      else if (s < T.hit) { const u = clamp((s - T.slam) / (T.hit - T.slam)); dist = 1.05 - .6 * inQ(u); roll = u * 1.6; shake = 10 + 40 * u; split = 6 + 30 * u; echo = .6; tr = 3 + 6 * u; cap = 'ツカマエタ' }
      else { dist = .42; roll = 1.6; shake = 60; split = 40; tr = 16 }
      const c = r3(fi, smooth, { th, ph, dist, roll, clear });
      ox.fillStyle = '#000'; ox.fillRect(0, 0, OW, OH);
      ox.save(); ox.translate(OW / 2 + (rnd() - .5) * shake, OH / 2 + (rnd() - .5) * shake); ox.rotate(roll * .3); ox.drawImage(c, -OW / 2 - 50, -OH / 2 - 50, OW + 100, OH + 100); ox.restore();
      // the smiling one is still in there, turning happily
      layer(toLay(r3(Math.floor(s * 9) % N1, true, { dist: 3.2, clear: 0 })), 'screen', .22 + .1 * Math.sin(s * 5), Math.sin(s * 3) * 60, Math.cos(s * 2) * 80, 1);
      // zooming afterimages of where it just was
      if (echo) trail.forEach((cv, i) => { const k = (tHead - i + trail.length) % trail.length; layer(trail[k], 'screen', echo * (1 - i / trail.length) * .5, 0, 0, 2 * (1 + .07 * (i + 1))) });
      const tc = trail[tHead = (tHead + 1) % trail.length]; tc.getContext('2d').drawImage(c, 0, 0, OW / 2, OH / 2);
      if (s >= T.dash) lines(clamp((s - T.dash) / 2), s >= T.slam ? '#ffffff' : '#ff9090');
      vignette(.8 + .15 * Math.sin(s * 22)); scanlines(.35); staticOver(.14, 'overlay');
      if (cap) { const k = 1 + .07 * Math.sin(s * 40) + (s > T.slam ? (s - T.slam) * .35 : 0); ox.save(); ox.translate(OW / 2 + (rnd() - .5) * 14, 300); ox.scale(k, k); ox.translate(-OW / 2, -300); text(cap, OW / 2, 300, HOR(cap.length > 5 ? 128 : 170), '#ff2020', '#000', 22, 10 + rnd() * 14); ox.restore() }
      rgb(split); tears(tr, 220);
      if (s < T.bang + 2 / FPS || (s >= T.hit && s < T.hit + 2 / FPS) || rnd() < .03) invert();
      if (s >= T.hit) { ox.fillStyle = `rgba(255,255,255,${clamp(1 - (s - T.hit) / .12) * .8})`; ox.fillRect(0, 0, OW, OH) }
    }
    // the tape's own overlay
    ox.save(); ox.textBaseline = 'alphabetic'; ox.font = VHS(46); ox.textAlign = 'left'; ox.fillStyle = s < T.slow ? '#fff' : '#ff3030'; ox.shadowColor = '#000'; ox.shadowBlur = 6;
    if (s < T.slow) ox.fillText('PLAY', 50, 110); else if (Math.floor(s * 2.5) % 2 === 0) ox.fillText('REC ●', 50, 110);
    const sec = s >= T.bang ? Math.floor(rnd() * 99) : Math.floor(s), fr2 = s >= T.bang ? Math.floor(rnd() * 30) : f % 30; ox.textAlign = 'right'; ox.fillStyle = '#fff'; ox.fillText(`00:00:${String(sec).padStart(2, '0')}:${String(fr2).padStart(2, '0')}`, OW - 50, 110);
    ox.font = VHS(26); ox.textAlign = 'left'; ox.fillStyle = 'rgba(255,255,255,.7)'; ox.fillText('Emoji: Noto Color Emoji (OFL) · VoxoB', 30, OH - 30); ox.restore();
    // into static at the end, and out of it at the start: the loop's seam
    seam(Math.max(s < T.a ? 1 - ease(s / T.a) : 0, clamp((s - (T.hit + .15)) / ((n - 1) / FPS - (T.hit + .15)))));
    last = out.toDataURL('image/jpeg', .92).split(',')[1]; batch.push(last);
    if (batch.length >= 30) await window.__push(batch.splice(0));
  }
  if (batch.length) await window.__push(batch.splice(0));

  // thumbnail: the happy one on the left, torn into the angry face on the right
  const th = mk(1280, 720), x = th.getContext('2d');
  x.drawImage(r3(3, true, { clear: 0xf7b23b, dist: 1.5 }), 0, 352, 1080, 1215, -40, 0, 640 * 1.05, 720);
  x.fillStyle = '#000'; x.fillRect(620, 0, 660, 720); x.drawImage(ghost, 0, 300, 1080, 1320, 560, -30, 720 * 1080 / 1320 * 1.08, 780);
  x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = .7; x.drawImage(ghost, 0, 300, 1080, 1320, 584, -30, 720 * 1080 / 1320 * 1.08, 780); x.restore();
  for (let i = 0; i < 14; i++) { const y = rnd() * 720, h = 6 + rnd() * 40; x.drawImage(th, 560, y, 720, h, 560 + (rnd() - .5) * 80, y, 720, h) }
  x.save(); x.beginPath(); x.moveTo(600, 0); x.lineTo(660, 0); x.lineTo(580, 720); x.lineTo(520, 720); x.closePath(); x.fillStyle = '#000'; x.fill(); x.restore();
  const tt = (s, X, Y, font, fill, stroke, sw, sp) => { x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = sw; x.strokeStyle = stroke; x.strokeText(s, X, Y);
    if (sp) { x.globalCompositeOperation = 'screen'; x.fillStyle = '#f00'; x.fillText(s, X - sp, Y); x.fillStyle = '#0ff'; x.fillText(s, X + sp, Y); x.globalCompositeOperation = 'source-over' } x.fillStyle = fill; x.fillText(s, X, Y) };
  tt('くるくる風車♪', 290, 90, POP(76), '#fff', '#c0390b', 16);
  tt('ミツケタ', 960, 600, HOR(150), '#ff2020', '#000', 22, 10);
  x.font = VHS(34); x.textAlign = 'left'; x.fillStyle = '#ff3030'; x.fillText('REC ●', 40, 690);
  return { cues, duration: T.total, thumb: th.toDataURL('image/jpeg', .92) };
});
await browser.close();
ff.stdin.end(); await closed;
fs.writeFileSync(path.join(OUT, 'windmill-loop-thumb.jpg'), Buffer.from(segs.thumb.split(',')[1], 'base64'));
const wav = path.join(OUT, 'windmill-loop.wav'); fs.writeFileSync(wav, synth(segs.cues, segs.duration, { beat: false }));
const file = path.join(OUT, 'windmill-loop.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-shortest', '-movflags', '+faststart', file]);
fs.rmSync(silent); fs.rmSync(wav);
const md = `# 回り続ける絵文字の風車を見ていたら…【ループ】 #Shorts #ホラー

## 説明文

👆👈😁👉👇 を組み合わせただけの、かわいい風車。オルゴールに合わせてくるくる回る…はずでした。
止まって、暗くなって、静かになったら──🫵🫪🫵 が画面に突っ込んできます。最後まで見ると、また最初へ。（音量注意）

絵文字は VoxoB の「テキスト → 3D」でそのまま立体にしたもの。カクカクのボクセル表示と「◐ なめらか表示」を切り替えながら、どちらもアニメーションで動かしています。

▶ VoxoB（無料・ブラウザで動くボクセルエディタ）: https://voxob.vercel.app/

#Shorts #ホラー #ループ #絵文字 #ボクセル #voxel #VoxoB

---
Emoji: Noto Color Emoji © Google (SIL OFL 1.1). Fonts: Dela Gothic One, Shippori Mincho B1, DotGothic16 (SIL OFL 1.1), via Fontsource.
Sound: original, synthesized for this video. No generative AI was used.
`;
fs.writeFileSync(path.join(OUT, 'windmill-loop.md'), md);
console.log(`→ shorts/fx/windmill-loop.mp4 ${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${pushed} frames; thumbnail and post text`);
