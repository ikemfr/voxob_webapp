// The windmill: a loop Short.
//   smiling 😁 with 👆👈👉👇 turns like a windmill (voxels, then the smooth view);
//   angry (🫨, the nearest Fluent Emoji to 🫪) with four 🫵 rushes at the screen: dash, shake, zigzag, spin-and-slam, white flash → back to the start.
// usage: node shorts/windmill.mjs   → shorts/fx/windmill-loop.mp4 (+ thumb, post text)
// Pictures: Microsoft Fluent Emoji (MIT, shorts/src/fluent/LICENSE.md). Sound: synthesized in shorts/synth.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { synth } from './synth.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const ROOT = process.cwd(), OUT = path.join(ROOT, 'shorts', 'fx'); fs.mkdirSync(OUT, { recursive: true });
const svg = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'shorts/src/fluent', f + '.svg')).toString('base64');
const PARTS = { up: svg('backhand-index-pointing-up'), left: svg('backhand-index-pointing-left'), down: svg('backhand-index-pointing-down'), you: svg('index-pointing-at-the-viewer'), smile: svg('beaming-face-with-smiling-eyes'), angry: svg('shaking-face') };

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
if (process.env.THREE_JS) await ctx.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ path: process.env.THREE_JS, contentType: 'text/javascript' }));
await ctx.route(/fonts\.googleapis|fonts\.gstatic|_vercel/, (r) => r.fulfill({ body: '' }));
await ctx.addInitScript(() => { localStorage.setItem('vs_lang', 'ja'); localStorage.setItem('vs_seen', '1'); localStorage.setItem('vs_smooth', '0') });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.error(e.message));
await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(800);

// ---------- build both windmills as voxel animations (in the page) ----------
await p.evaluate(async (PARTS) => {
  const img = async (u, flip) => { const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); if (flip) { x.translate(256, 0); x.scale(-1, 1) } x.drawImage(im, 0, 0, 256, 256); return c };
  const part = async (u, R, flip) => VoxoBConvert.ST.creature(VoxoBConvert.grid(await img(u, flip), R));
  const S = 26, C = 34, dist = 28, SZ = 2 * dist + S + 8, cx = SZ / 2, cy = SZ / 2;
  async function build(center, arms) {   // arms: [image, flip, angle of its slot]
    const c = await part(center, C), as = []; for (const [u, f, a] of arms) as.push({ v: await part(u, S, f), a });
    const D = Math.max(c.D, ...as.map((a) => a.v.D)) + 2, zc = D / 2;
    return (rot) => {   // voxels for the blades turned by rot (radians); the face stays put
      const out = {};
      const put = (x, y, z, col) => { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (x >= 0 && y >= 0 && z >= 0 && x < SZ && y < SZ && z < D) out[vk(x, y, z)] = { c: col, a: 255 } };
      for (const { v, a } of as) { const ang = a + rot, ca = Math.cos(ang), sa = Math.sin(ang), ox = cx + Math.cos(ang) * dist, oy = cy + Math.sin(ang) * dist, pr = Math.cos(rot), ps = Math.sin(rot);
        for (const [x, y, z, col] of v.vox) { const lx = x - v.W / 2, ly = y - v.H / 2; for (const [dx, dy] of [[0, 0], [.4, 0], [0, .4], [.4, .4]]) put(ox + (lx + dx) * pr - (ly + dy) * ps, oy + (lx + dx) * ps + (ly + dy) * pr, z - v.D / 2 + zc, col) } }
      for (const [x, y, z, col] of c.vox) put(cx - c.W / 2 + x, cy - c.H / 2 + y, z - c.D / 2 + zc, col);   // the face last, on top
      return out;
    };
  }
  // slots: up = +y (π/2), left = π, right = 0, down = -π/2
  const smile = await build(PARTS.smile, [[PARTS.up, false, Math.PI / 2], [PARTS.left, false, Math.PI], [PARTS.left, true, 0], [PARTS.down, false, -Math.PI / 2]]);
  const angry = await build(PARTS.angry, [[PARTS.you, false, Math.PI / 2], [PARTS.you, false, Math.PI], [PARTS.you, false, 0], [PARTS.you, false, -Math.PI / 2]]);
  const N1 = 24, N2 = 12, fr = [];
  for (let i = 0; i < N1; i++) fr.push({ v: smile(-i / N1 * Math.PI * 2), ws: false, cam: null });          // one full turn
  for (let i = 0; i < N2; i++) fr.push({ v: angry(-i / N2 * Math.PI / 2), ws: false, cam: null });         // a quarter turn (four alike blades loop)
  W = H = SZ; D = Math.max(...fr.map((f) => Math.max(...Object.keys(f.v).map((k) => pv_(k)[2])))) + 2; $('sW').value = W; $('sH').value = H; $('sD').value = D;
  frames = fr; curFrame = 0; rebMesh(); rebGrid(); resetCam(); uFUI();
  window.WM = { N1, N2, SZ };
}, PARTS);
console.log('windmill voxels:', await p.evaluate(() => frames.map((f) => Object.keys(f.v).length).slice(0, 3).join(', ') + ' …'));

// ---------- the loop Short ----------
const silent = path.join(OUT, "windmill-loop.silent.mp4");
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", silent], { stdio: ["pipe", "inherit", "inherit"] });
const closed = new Promise((r) => ff.on("close", r));
let pushed = 0;
await p.exposeFunction("__push", async (arr) => { for (const b64 of arr) { pushed++; if (!ff.stdin.write(Buffer.from(b64, "base64"))) await new Promise((r) => ff.stdin.once("drain", r)) } });
p.setDefaultTimeout(0);
const segs = await p.evaluate(async () => {
  const OW = 1080, OH = 1920, FPS = 30, out = document.createElement('canvas'); out.width = OW; out.height = OH; const ox = out.getContext('2d');
  ren.setPixelRatio(1); ren.setSize(OW, OH, false); cam.aspect = OW / OH; cam.updateProjectionMatrix(); if (gG) gG.visible = false;
  const { N1, N2, SZ } = WM, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), ease = (u) => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2, inQ = (u) => u * u * u;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const T = { smoothAt: 2.2, angry: 4.2, dash: 4.6, shake: 6.0, zig: 7.2, slam: 8.6, flash: 10.0, total: 10.4 };
  const cues = [{ t: 0, k: 'chime' }, { t: T.smoothAt, k: 'sweep' }, { t: T.angry, k: 'glitch' }, { t: T.angry + .05, k: 'boom' }, { t: T.dash, k: 'whoosh' }, { t: T.shake, k: 'glitch' }, { t: T.zig, k: 'whoosh' }, { t: T.zig + .6, k: 'whoosh' }, { t: T.slam, k: 'riser', d: T.flash - T.slam }, { t: T.flash, k: 'hit' }];
  const text = (s, x, y, size, fill, stroke = '#111', sw = 16) => { ox.font = `900 ${size}px "Noto Sans JP","Hiragino Sans",system-ui,sans-serif`; ox.textAlign = 'center'; ox.lineJoin = 'round'; ox.lineWidth = sw; ox.strokeStyle = stroke; ox.strokeText(s, x, y); ox.fillStyle = fill; ox.fillText(s, x, y) };
  const lines = (k, col) => { ox.save(); ox.translate(OW / 2, OH / 2); ox.strokeStyle = col; for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, r0 = 260 + rnd() * 300, r1 = r0 + 300 + rnd() * 900 * k; ox.globalAlpha = .25 + .5 * rnd(); ox.lineWidth = 2 + rnd() * 7; ox.beginPath(); ox.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ox.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ox.stroke() } ox.restore() };
  const frames3d = [];
  for (let f = 0, n = Math.ceil(T.total * FPS); f < n; f++) {
    const s = f / FPS, angryNow = s >= T.angry;
    // background
    ren.setClearColor(angryNow ? 0x3a0808 : 0xf7b23b, 1);
    if (false) { ox.save(); ox.translate(OW / 2, OH / 2); ox.rotate(-s * 1.2); ox.globalAlpha = .18; ox.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { ox.rotate(Math.PI / 8); ox.beginPath(); ox.moveTo(0, 0); ox.lineTo(1400, -90); ox.lineTo(1400, 90); ox.fill() } ox.restore() }
    // which frame, which view, where the camera is
    let fi, smooth, dist = 1.75, th = Math.PI / 2, ph = Math.PI / 2, shake = 0, roll = 0, scale = 1;
    if (!angryNow) { fi = Math.floor(s * 9) % N1; smooth = s >= T.smoothAt + .5; th = Math.PI / 2 + Math.sin(s * 1.4) * .35; ph = Math.PI / 2 - .15 + Math.sin(s * 2) * .06 }
    else {
      const spinRate = s < T.slam ? 18 : 30 + (s - T.slam) * 40; fi = N1 + Math.floor(s * spinRate) % N2;
      if (s < T.dash) { dist = 1.75; shake = 20 }                                                                   // turns angry
      else if (s < T.shake) { const u = (s - T.dash) / (T.shake - T.dash); dist = 6 - 4.6 * inQ(u) - 0 * u; smooth = u > .5 }   // 1: dash in from far away
      else if (s < T.zig) { dist = 1.4; shake = 26; smooth = Math.floor(s * 12) % 2 === 0 }                       // 2: shudder, flickering voxel / smooth
      else if (s < T.slam) { const u = (s - T.zig) / (T.slam - T.zig); dist = 1.4 - .35 * u; th = Math.PI / 2 + Math.sin(u * Math.PI * 3) * .7; roll = Math.sin(u * Math.PI * 3) * .15; smooth = u > .5 }   // 3: zigzag closer
      else { const u = clamp((s - T.slam) / (T.flash - T.slam)); dist = 1.05 - .8 * inQ(u); roll = u * 1.6; smooth = true; shake = 10 + 30 * u }        // 4: spin and slam into the screen
    }
    goFrame(fi); VoxoBSmooth.show(!!smooth);
    cTgt.set(SZ / 2, SZ / 2, SZ / 2 * .3); cT = th; cP = ph; cD = SZ * dist * 1.6; uCam(); cam.rotation.z += roll; ren.render(scn, cam);
    ox.save(); ox.translate(OW / 2 + (rnd() - .5) * shake, OH / 2 + (rnd() - .5) * shake); ox.rotate(roll * .3); ox.drawImage(c3, -OW / 2 - 40, -OH / 2 - 40, OW + 80, OH + 80); ox.restore();
    { const g = ox.createRadialGradient(OW / 2, OH / 2, OW * .45, OW / 2, OH / 2, OH * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, angryNow ? 'rgba(0,0,0,.75)' : 'rgba(200,70,0,.55)'); ox.fillStyle = g; ox.fillRect(0, 0, OW, OH) }
    if (angryNow && s >= T.dash) lines(clamp((s - T.dash) / 2), s >= T.slam ? '#ffffff' : '#ffb0b0');
    // words
    if (!angryNow) { text('くるくる風車 ♪', OW / 2, 250, 110, '#fff', '#c0390b'); if (s >= T.smoothAt) text(s < T.smoothAt + .5 ? 'カクカク → ' : '◐ なめらか', OW / 2, 1700, 80, '#fff', '#c0390b') }
    else if (s < T.dash) text('……え？', OW / 2, 260, 120, '#fff', '#000')
    else if (s < T.flash) { const k = 1 + .08 * Math.sin(s * 40); ox.save(); ox.translate(OW / 2, 250); ox.scale(k, k); text(s < T.zig ? 'こっち来る！！' : s < T.slam ? '逃げられない！！' : 'ぶつかる〜！！', 0, 0, 124, '#ff3b3b', '#000', 20); ox.restore() }
    if (angryNow && s < T.angry + .25) { for (let i = 0; i < 8; i++) { const y = rnd() * OH, h = 30 + rnd() * 120; ox.drawImage(out, 0, y, OW, h, (rnd() - .5) * 160, y, OW, h) } }
    ox.font = '600 26px system-ui, sans-serif'; ox.textAlign = 'left'; ox.fillStyle = 'rgba(255,255,255,.7)'; ox.fillText('Illustration: Fluent Emoji © Microsoft (MIT) · VoxoB', 28, OH - 28);
    // white at both ends, so the loop has no seam
    const fl = Math.max(s < .3 ? 1 - s / .3 : 0, s >= T.flash ? clamp((s - T.flash) / .3) : 0, s >= T.angry && s < T.angry + .12 ? .8 : 0); if (fl > 0) { ox.fillStyle = `rgba(255,255,255,${fl})`; ox.fillRect(0, 0, OW, OH) }
    frames3d.push(out.toDataURL('image/jpeg', .92).split(',')[1]);
    if (frames3d.length >= 30) { await window.__push(frames3d.splice(0)) }
  }
  if (frames3d.length) await window.__push(frames3d.splice(0));
  return { cues, duration: T.total, outroFrom: T.angry };
});
await browser.close();
ff.stdin.end(); await closed;
const wav = path.join(OUT, "windmill-loop.wav"); fs.writeFileSync(wav, synth(segs.cues, segs.duration));
const file = path.join(OUT, "windmill-loop.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-shortest", "-movflags", "+faststart", file]);
fs.rmSync(silent); fs.rmSync(wav);
// thumbnail: the smooth smiling one beside the angry one rushing in
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "3.5", "-i", file, "-ss", "8.3", "-i", file, "-filter_complex", "[0:v]trim=end_frame=1,crop=1080:1215:0:352,scale=640:720[a];[1:v]trim=end_frame=1,crop=1080:1215:0:352,scale=640:720[b];[a][b]hstack", "-frames:v", "1", "-q:v", "3", path.join(OUT, "windmill-loop-thumb.jpg")]);
const md = `# くるくる風車が急に怒って突っ込んでくる！ #Shorts #ボクセル

## 説明文

絵文字を組み合わせただけの風車 👆👈😁👉👇 をボクセルにして回してみたら…途中で 🫵🫨🫵 に変身して画面に突っ込んできます。ループするので最後まで見るとまた最初へ。
カクカクのボクセル表示と、ボタンひとつの「◐ なめらか表示」を切り替えながら、どちらもアニメーションで動いています。
VoxoB の「変換 → 🐾 生き物」とアニメーション機能で作りました。

▶ VoxoB（無料・ブラウザで動くボクセルエディタ）: https://voxob.vercel.app/

#Shorts #ボクセル #絵文字 #風車 #ループ #voxel #VoxoB

---
Illustration: Fluent Emoji © Microsoft (MIT) — https://github.com/microsoft/fluentui-emoji (🫪 is not in Fluent Emoji, so 🫨 stands in)
Sound: original, synthesized for this video. No generative AI was used.
`;
fs.writeFileSync(path.join(OUT, "windmill-loop.md"), md);
console.log(`→ shorts/fx/windmill-loop.mp4 ${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${pushed} frames; thumbnail and post text`);
