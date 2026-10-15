// FX Shorts: punchy 1080×1920 videos with synthesized sound, plus a 1280×720 thumbnail and the text to post with each.
// usage: node shorts/fx.mjs [name ...]   (from the repo root; Playwright with Chromium, and ffmpeg)
//   PLAYWRIGHT=…  CHROMIUM=…  THREE_JS=… as in shorts/make.mjs
// Pictures: Microsoft Fluent Emoji (MIT, see shorts/src/fluent/LICENSE.md). Sound: synthesized in shorts/synth.mjs, note by note — no recordings.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { synth } from './synth.mjs';
import { css } from './fonts.mjs';

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

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const job of JOBS.filter((j) => !want.length || want.includes(j.name))) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (process.env.THREE_JS) await ctx.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ path: process.env.THREE_JS, contentType: 'text/javascript' }));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|_vercel/, (r) => r.fulfill({ body: '' }));
  await ctx.addInitScript(() => { localStorage.setItem('vs_lang', 'ja'); localStorage.setItem('vs_seen', '1'); localStorage.setItem('vs_smooth', '0') });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.error(job.name, e.message));
  await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(800);
  await p.evaluate(async ([u, st, R]) => { const im = new Image(); im.src = u; await im.decode(); VoxoBConvert.setSource({ kind: 'image', el: im, name: 'src' }); $('cvSt').value = st; $('cvR').value = String(R); $('cvBg').checked = false; $('cvPr').checked = true; await VoxoBConvert.convert() }, [svg(job.img), job.style, job.R]);
  await p.addStyleTag({ content: css('dela-gothic-one') });   // a Japanese display face (OFL); the container's own fallback would draw kanji the Chinese way
  console.log(job.name, await p.evaluate(() => $('cvMsg').textContent));
  const fx = { ...job.fx, smooth: !!job.smooth, bg1: job.bg1, bg2: job.bg2, credit: CREDIT, thumb1: job.thumb[0], thumb2: job.thumb[1], font: '"Dela Gothic One"' };
  await p.evaluate((fx) => document.fonts.load('100px "Dela Gothic One"', Object.values(fx).filter((v) => typeof v === 'string').join('')), fx);
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
