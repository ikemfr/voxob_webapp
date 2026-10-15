// Makes the sample Shorts (1080×1920, H.264 MP4, silent) from the sources in shorts/src — all drawn for this project.
// usage: node shorts/make.mjs [name ...]   (from the repo root; needs Playwright with Chromium and ffmpeg)
//   PLAYWRIGHT=/path/to/playwright/index.mjs  CHROMIUM=/path/to/chromium  THREE_JS=/path/to/three.min.js (r128, when the CDN is unreachable)
// Frames are drawn one by one (no real-time capture), so the video is smooth even on a slow machine.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const ROOT = process.cwd(), OUT = path.join(ROOT, 'shorts');
const svg = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(OUT, 'src', f)).toString('base64');
const JOBS = [
  { name: 'bird-creature', src: { img: svg('bird.svg') }, style: 'creature', R: 96 },
  { name: 'town-city', src: { img: svg('town.svg') }, style: 'city', R: 96 },
  { name: 'pagoda-tower', src: { img: svg('pagoda.svg') }, style: 'tower', R: 96 },
  { name: 'island-terrain', src: { img: svg('island.svg') }, style: 'terrain', R: 96 },
  { name: 'text-city', src: { text: 'VoxoB' }, style: 'city', R: 64 },
  { name: 'dance-time', src: { video: 'dance' }, style: 'time', R: 64 },
];
const want = process.argv.slice(2);

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const job of JOBS.filter((j) => !want.length || want.includes(j.name))) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (process.env.THREE_JS) await ctx.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ path: process.env.THREE_JS, contentType: 'text/javascript' }));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|_vercel/, (r) => r.fulfill({ body: '' }));
  await ctx.addInitScript(() => { localStorage.setItem('vs_lang', 'ja'); localStorage.setItem('vs_seen', '1') });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.error(job.name, e.message));
  await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(800);
  await p.evaluate(() => { color = '#e2413b' });   // text colour for the text job

  if (job.src.img) await p.evaluate(async (u) => { const im = new Image(); im.src = u; await im.decode(); VoxoBConvert.setSource({ kind: 'image', el: im, name: 'src' }) }, job.src.img);
  if (job.src.text) await p.evaluate((tx) => { $('cvTx').value = tx; VoxoBConvert.setSource({ kind: 'text' }) }, job.src.text);
  if (job.src.video) {
    // an original 4 s clip: a ribbon of colour dancing across a plain wall, recorded in the page and kept as shorts/src/dance.webm
    const saved = path.join(OUT, 'src', 'dance.webm'), have = fs.existsSync(saved) ? fs.readFileSync(saved).toString('base64') : null;   // reuse the clip once made, so the source stays the same
    const b64 = await p.evaluate(async (have) => {
      if (have) { const v = document.createElement('video'); v.muted = true; v.src = 'data:video/webm;base64,' + have; await new Promise((r) => v.onloadeddata = r); if (!isFinite(v.duration)) { v.currentTime = 1e9; await new Promise((r) => v.ondurationchange = r); v.currentTime = 0 } VoxoBConvert.setSource({ kind: 'video', el: v, name: 'dance.webm' }); return have }
      const c = document.createElement('canvas'); c.width = 360; c.height = 360; const x = c.getContext('2d'), rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm' }), ch = []; rec.ondataavailable = (e) => ch.push(e.data);
      rec.start(); const t0 = performance.now();
      await new Promise((res) => { const f = () => { const s = (performance.now() - t0) / 4000; x.fillStyle = '#eef2f7'; x.fillRect(0, 0, 360, 360);
        for (let k = 0; k < 3; k++) { const a = s * Math.PI * 2 + k * 2.1, px = 180 + Math.cos(a) * (60 + 60 * s), py = 180 + Math.sin(a * 1.5) * 110; x.fillStyle = `hsl(${(s * 360 + k * 120) % 360},85%,52%)`; x.beginPath(); x.arc(px, py, 20, 0, 7); x.fill() }
        if (s < 1) requestAnimationFrame(f); else res() }; f() });
      rec.stop(); await new Promise((r) => rec.onstop = r);
      const blob = new Blob(ch, { type: 'video/webm' }), v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(blob); await new Promise((r) => v.onloadeddata = r);
      if (!isFinite(v.duration)) { v.currentTime = 1e9; await new Promise((r) => v.ondurationchange = r); v.currentTime = 0 }
      VoxoBConvert.setSource({ kind: 'video', el: v, name: 'dance.webm' });
      return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob) });
    }, have);
    fs.writeFileSync(path.join(OUT, 'src', 'dance.webm'), Buffer.from(b64, 'base64'));
  }
  await p.evaluate(([st, R]) => { $('cvSt').value = st; $('cvR').value = String(R); $('cvPr').checked = true }, [job.style, job.R]);
  await p.evaluate(() => VoxoBConvert.convert());
  const made = await p.evaluate(() => ({ msg: $('cvMsg').textContent, n: Object.keys(V()).length, ok: !!VoxoBConvert.last }));
  console.log(job.name, made.msg);
  if (!made.ok || !made.n) { console.error(`  ✗ ${job.name}: nothing converted, skipped`); process.exitCode = 1; await ctx.close(); continue }

  const file = path.join(OUT, job.name + '.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', r));
  await p.exposeFunction('__frame', async (b64) => { if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r)) });
  const t0 = Date.now();
  const r = await p.evaluate(() => VoxoBConvert.shorts({ onFrame: async (cv) => { await window.__frame(cv.toDataURL('image/jpeg', .93).split(',')[1]) } }));
  ff.stdin.end(); await done;
  console.log(`  → ${path.relative(ROOT, file)}: ${r.frames} frames, ${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  await ctx.close();
}
await browser.close();
