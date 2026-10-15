// FX Shorts: punchy 1080×1920 videos with synthesized sound, plus a 1280×720 thumbnail and the text to post with each.
// usage: node shorts/fx.mjs [name ...]   (from the repo root; Playwright with Chromium, and ffmpeg)
//   PLAYWRIGHT=…  CHROMIUM=…  THREE_JS=… as in shorts/make.mjs
// Pictures: Microsoft Fluent Emoji (MIT, see shorts/src/fluent/LICENSE.md). Sound: synthesized below, note by note — no recordings.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const ROOT = process.cwd(), OUT = path.join(ROOT, 'shorts', 'fx'); fs.mkdirSync(OUT, { recursive: true });
const svg = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'shorts/src/fluent', f)).toString('base64');
const CREDIT = 'Illustration: Fluent Emoji © Microsoft (MIT)';
const JOBS = [
  { name: 'creature-dragon', img: 'dragon.svg', style: 'creature', R: 96, bg1: '#1f4d3a', bg2: '#06100c',
    fx: { title: 'この絵が…', sub: 'ワンタップで立体に！？', during: '🐾 生き物モード', done: '3Dドラゴン完成！', cta: 'ブラウザで無料・インストール不要' },
    thumb: ['絵 → 3Dドラゴン', 'ワンタップ変換'],
    post: { title: '2Dの絵がワンタップで3Dドラゴンに！？ #Shorts #ボクセル', tags: ['#Shorts', '#ボクセル', '#ボクセルアート', '#3D', '#voxel', '#VoxoB'],
      body: '絵の輪郭を切り抜いて、幅の広いところほど厚く膨らませると…丸い立体のドラゴンに。\nVoxoB の「変換 → 🐾 生き物」で作りました。ブラウザだけで動く無料のボクセルエディタです（インストール・登録不要、画像は外に送りません）。' } },
  { name: 'tower', img: 'tokyo-tower.svg', style: 'tower', R: 96, bg1: '#4d1f1f', bg2: '#100606',
    fx: { title: 'タワーの絵を', sub: 'ろくろのように回すと…', during: '🏯 塔モード', done: '立体タワー完成！', cta: 'ブラウザで無料・インストール不要' },
    thumb: ['絵を回して', '3Dタワーに！'],
    post: { title: 'タワーの絵をろくろのように回したら3Dに！ #Shorts #ボクセル', tags: ['#Shorts', '#ボクセル', '#3D', '#建築', '#voxel', '#VoxoB'],
      body: '絵のシルエットを縦の軸でぐるっと回して、塔や器のような立体を作ります。正面には元の絵がそのまま写ります。\nVoxoB の「変換 → 🏯 塔」で作りました。ブラウザだけで動く無料のボクセルエディタです。' } },
  { name: 'realistic-fox', img: 'fox.svg', style: 'real', R: 96, bg1: '#5c3a1f', bg2: '#100a06',
    fx: { title: 'キツネの絵から', sub: '奥行きを読み取ると…', during: '📐 リアルモード', done: '回り込める3Dに！', cta: 'AI不使用・ブラウザで完結' },
    thumb: ['1枚の絵から', 'リアル3D化！'],
    post: { title: '1枚の絵から奥行きを読んでリアル3D化！ #Shorts #3D', tags: ['#Shorts', '#3D', '#ボクセル', '#イラスト', '#voxel', '#VoxoB'],
      body: '陰影や輪郭から奥行きを推定して、横や後ろからも見られる立体にします。AIモデルは使わず、画像も外に送りません。\nVoxoB の「変換 → 📐 リアル」で作りました。' } },
  { name: 'smooth-unicorn', img: 'unicorn.svg', style: 'creature', R: 96, smooth: true, bg1: '#3a1f5c', bg2: '#0a0612',
    fx: { title: 'カクカクの3Dが', sub: 'ボタンひとつで…', during: '🐾 まずはボクセルに', done: 'ユニコーン完成！', smoothLabel: '◐ なめらか表示 ON', cta: 'ボクセルも曲面も・無料' },
    thumb: ['カクカク → ', 'なめらか！'],
    post: { title: 'カクカクのボクセルがボタンひとつでなめらかに！ #Shorts #3D', tags: ['#Shorts', '#ボクセル', '#3DCG', '#ユニコーン', '#voxel', '#VoxoB'],
      body: 'ボクセルの面をなめらかな曲面でつなぐ「なめらか表示」。データはボクセルのまま、見た目と書き出し（OBJ・STL・GLB）だけ滑らかになります。\nVoxoB の ◐ ボタンで切り替えられます。' } },
];
const want = process.argv.slice(2);

// ---------- sound: everything synthesized here ----------
const SR = 48000;
function synth(cues, dur) {
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

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const job of JOBS.filter((j) => !want.length || want.includes(j.name))) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (process.env.THREE_JS) await ctx.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ path: process.env.THREE_JS, contentType: 'text/javascript' }));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|_vercel/, (r) => r.fulfill({ body: '' }));
  await ctx.addInitScript(() => { localStorage.setItem('vs_lang', 'ja'); localStorage.setItem('vs_seen', '1'); localStorage.setItem('vs_smooth', '0') });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.error(job.name, e.message));
  await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(800);
  await p.evaluate(async ([u, st, R]) => { const im = new Image(); im.src = u; await im.decode(); VoxoBConvert.setSource({ kind: 'image', el: im, name: 'src' }); $('cvSt').value = st; $('cvR').value = String(R); $('cvBg').checked = false; $('cvPr').checked = true; await VoxoBConvert.convert() }, [svg(job.img), job.style, job.R]);
  console.log(job.name, await p.evaluate(() => $('cvMsg').textContent));
  const fx = { ...job.fx, smooth: !!job.smooth, bg1: job.bg1, bg2: job.bg2, credit: CREDIT, thumb1: job.thumb[0], thumb2: job.thumb[1] };
  // thumbnail
  const th = await p.evaluate((fx) => VoxoBFx.thumb(fx).toDataURL('image/jpeg', .92), fx);
  fs.writeFileSync(path.join(OUT, job.name + '-thumb.jpg'), Buffer.from(th.split(',')[1], 'base64'));
  // frames → ffmpeg
  const silent = path.join(OUT, job.name + '.silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  await p.exposeFunction('__frame', async (b64) => { if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r)) });
  const r = await p.evaluate((fx) => VoxoBFx.fxShorts({ fx, onFrame: async (cv) => { await window.__frame(cv.toDataURL('image/jpeg', .93).split(',')[1]) } }), fx);
  ff.stdin.end(); await closed;
  const wav = path.join(OUT, job.name + '.wav'); fs.writeFileSync(wav, synth(r.cues, r.duration));
  const file = path.join(OUT, job.name + '.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-shortest', '-movflags', '+faststart', file]);
  fs.rmSync(silent); fs.rmSync(wav);
  // the text to post
  const md = `# ${job.post.title}\n\n## 説明文\n\n${job.post.body}\n\n▶ VoxoB（無料・ブラウザで動くボクセルエディタ）: https://voxob.vercel.app/\n\n${job.post.tags.join(' ')}\n\n---\n${CREDIT} — https://github.com/microsoft/fluentui-emoji\nSound: original, synthesized for this video. No generative AI was used.\n`;
  fs.writeFileSync(path.join(OUT, job.name + '.md'), md);
  console.log(`  → shorts/fx/${job.name}.mp4 ${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${r.frames} frames; thumbnail and post text`);
  await ctx.close();
}
await browser.close();
