// Records the short looping demo clips shown on the guide pages: media/<lang>/<scene>.webm / .mp4 + .jpg poster.
// usage: node site/demos.mjs [lang ...]   (run from the repo root; needs Playwright with Chromium and ffmpeg)
//   PLAYWRIGHT=/path/to/playwright/index.mjs   where to import Playwright from (default: 'playwright')
//   THREE_JS=/path/to/three.min.js              serve Three.js r128 from disk when the CDN is unreachable
// The app runs from index.html in a fresh browser profile, so nothing of yours is recorded.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const ROOT = process.cwd();
const ARGS = process.argv.slice(2), SI = ARGS.indexOf('--scenes'), ONLY = SI >= 0 ? ARGS.slice(SI + 1) : null, LA = SI >= 0 ? ARGS.slice(0, SI) : ARGS;
const LANGS = LA.length ? LA : ['ja', 'en', 'es', 'pt', 'zh'];   // node site/demos.mjs [lang ...] [--scenes name ...]
const VW = 1280, VH = 720, OUT_W = 760, FPS = 20; // OUT_W = the guide page's text column
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'voxob-demos-'));

// a visible pointer with a ripple on click, since the recording has no cursor of its own
const CURSOR = () => {
  addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '#dmC{position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.35);pointer-events:none;z-index:2147483647;transition:transform .12s}'
      + '#dmC.dn{transform:scale(.7);background:rgba(0,212,240,.6)}.dmR{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #00d4f0;pointer-events:none;z-index:2147483646;animation:dmR .5s ease-out forwards}'
      + '@keyframes dmR{to{transform:scale(3.2);opacity:0}}[data-tip]::after,#_tip{display:none!important}';
    document.head.appendChild(st);
    const c = document.createElement('div'); c.id = 'dmC'; document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true);
    addEventListener('mousedown', (e) => { c.classList.add('dn'); const r = document.createElement('div'); r.className = 'dmR'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 600) }, true);
    addEventListener('mouseup', () => c.classList.remove('dn'), true);
  });
};

const wait = (p, ms) => p.waitForTimeout(ms);
async function clickEl(p, loc, pause = 900) {
  const b = await loc.boundingBox(); if (!b) throw new Error('not visible: ' + loc);
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 }); await wait(p, 150);
  await p.mouse.down(); await wait(p, 90); await p.mouse.up(); await wait(p, pause);
}
const tab = (p, id) => clickEl(p, p.locator(`.rtabs [data-tab=${id}]`), 500);
// generator / animation buttons by id: their labels differ per language, so find them through the app's own tables
const genBtn = (p, id) => p.locator('#rp .gb').filter({ hasText: new RegExp(`${String(GN_LABEL[id]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first();
let GN_LABEL = {};

// each scene: what it does, and the part of the 1280×720 window worth showing [x, y, w, h]
// (layout at this size: header 0–48, tools 0–216, 2D slice 222–599, 3D view 605–982, right panel 988–1280, frame bar 654–720)
const VIEW_RIGHT = [605, 48, 675, 606];
const SCENES = {
  // one click builds a whole model
  generate: { crop: VIEW_RIGHT, run: async (p) => {
    await tab(p, 'make');
    for (const id of ['castle', 'pagoda', 'city', 'house']) await clickEl(p, genBtn(p, id), 1300);
  } },
  // ✨ Next move adds one fitting step at a time
  next: { crop: [222, 0, 760, 660], run: async (p) => {
    for (let i = 0; i < 4; i++) await clickEl(p, p.locator('#hNx'), 2000);
  } },
  // Style recolours everything at once
  style: { crop: VIEW_RIGHT, setup: (p) => p.evaluate(() => gen('pagoda')), run: async (p) => {
    await tab(p, 'color'); await wait(p, 300);
    for (const i of [0, 3, 2, 4]) { await clickEl(p, p.locator('#styG button').nth(i), 1100); await p.evaluate(() => undo()) }
    await clickEl(p, p.locator('#styG button').nth(3), 1200);
  } },
  // shape tools on the 2D slice, layer by layer, and the result in 3D
  draw: { crop: [0, 48, 982, 606], setup: (p) => p.evaluate(() => { Object.keys(V()).forEach(k => { const [x, y, z] = pv_(k); delV(x, y, z) }); rebMesh(); d2D(); uCnt() }), run: async (p) => {
    const cv = await p.locator('#c2d').boundingBox();
    const at = (gx, gy) => [cv.x + cv.width * (gx + .5) / 16, cv.y + cv.height * (gy + .5) / 16];
    const tap = async (gx, gy, steps = 12, pause = 250) => { const [x, y] = at(gx, gy); await p.mouse.move(x, y, { steps }); await wait(p, 120); await p.mouse.down(); await p.mouse.up(); await wait(p, pause) };
    const paint = (hex) => p.evaluate((c) => { color = c }, hex);
    // shape tools: click a corner, click the other corner, click again to confirm
    await clickEl(p, p.locator('#tL [data-to=frect]'), 300);
    for (const [a, b, c] of [[2, 13, '#5b8c5a'], [4, 11, '#c9a26b'], [6, 9, '#e07a5f']]) {
      await paint(c); await tap(a, a); await tap(b, b, 18, 500); await tap(b, b, 2, 500); await p.keyboard.press('ArrowUp'); await wait(p, 350);
    }
    await paint('#ff3070'); await clickEl(p, p.locator('#tL [data-to=pen]'), 300);
    await tap(7, 7, 10, 200); await tap(8, 8, 6, 200); await tap(7, 8, 6, 200); await tap(8, 7, 6, 600);
    for (let i = 0; i < 4; i++) { await p.keyboard.press('ArrowDown'); await wait(p, 150) } // lower the slice so its highlight no longer tints the model
    await wait(p, 1400);
  } },
  // Animation generators turn the current shape into motion
  animate: { crop: [605, 48, 675, 672], setup: (p) => p.evaluate(() => gen('rocket')), run: async (p) => {
    await tab(p, 'anim'); await wait(p, 300);
    const ix = await p.evaluate(() => AGENS.findIndex(g => g.id === 'bounce'));
    await clickEl(p, p.locator('#agG .gb').nth(ix), 400);
    if (!(await p.evaluate(() => playing))) await clickEl(p, p.locator('#plB'), 200);
    await wait(p, 3200);
  } },
  // Export: OBJ / STL / GLB / PNG / video / JSON
  // Convert: type a word, pick City, convert, and watch the process frames play
  convert: { crop: VIEW_RIGHT, setup: (p) => p.evaluate(() => { color = '#e2413b' }), run: async (p) => {
    await tab(p, 'make'); await p.evaluate(() => { $('rp').scrollTop = 0 });
    await clickEl(p, p.locator('#cvTe'), 300);
    await p.locator('#cvTx').pressSequentially('VoxoB', { delay: 110 }); await wait(p, 300);
    await clickEl(p, p.locator('#cvSts [data-st=city]'), 400);
    await clickEl(p, p.locator('#cvGo'), 300); await p.waitForFunction(() => !$('cvGo').disabled); await wait(p, 300);
    await p.evaluate(() => { goFrame(0); if (!playing) togPlay() }); await wait(p, 2600); await p.evaluate(() => { if (playing) togPlay(); goFrame(frames.length - 1) }); await wait(p, 900);
  } },
  export: { crop: [420, 0, 760, 600], setup: (p) => p.evaluate(() => gen('castle')), run: async (p) => {
    await clickEl(p, p.locator('#hEx'), 2600);
  } },
};

async function record(browser, lang, name) {
  const dir = path.join(TMP, `${lang}-${name}`);
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, recordVideo: { dir, size: { width: VW, height: VH } }, deviceScaleFactor: 1 });
  if (process.env.THREE_JS) await ctx.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ path: process.env.THREE_JS, contentType: 'text/javascript' }));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|_vercel/, (r) => r.fulfill({ body: '' }));
  await ctx.addInitScript((l) => { localStorage.setItem('vs_lang', l); localStorage.setItem('vs_seen', '1') }, lang);
  await ctx.addInitScript(CURSOR);
  const p = await ctx.newPage(); p.on('dialog', (d) => d.accept()); p.on('pageerror', (e) => console.error(lang, name, e.message));
  const t0 = Date.now();
  await p.goto('file://' + path.join(ROOT, 'index.html')); await wait(p, 1500);
  GN_LABEL = await p.evaluate(() => (GN[lang] || GN.en));
  const sc = SCENES[name];
  await p.evaluate(() => { vol = 0; if (playing) togPlay(); gen('house') }); if (sc.setup) await sc.setup(p);
  await p.mouse.move(sc.crop[0] + sc.crop[2] * .5, sc.crop[1] + sc.crop[3] * .5); await wait(p, 700);
  const start = (Date.now() - t0) / 1000;
  await sc.run(p);
  const end = (Date.now() - t0) / 1000;
  const poster = path.join(ROOT, 'media', lang, `${name}.jpg`);
  await p.screenshot({ path: path.join(dir, 'last.png') });
  await ctx.close();
  const webm = fs.readdirSync(dir).find((f) => f.endsWith('.webm'));
  const out = path.join(ROOT, 'media', lang, `${name}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const [cx, cy, cw, ch] = sc.crop, ow = Math.min(OUT_W, cw) & ~1;
  const vf = `crop=${cw}:${ch}:${cx}:${cy},fps=${FPS},scale=${ow}:-2:flags=lanczos`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start), '-to', String(end), '-i', path.join(dir, webm), '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  // WebM (VP9) first for browsers without H.264, the MP4 above for the rest
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start), '-to', String(end), '-i', path.join(dir, webm), '-vf', vf, '-an', '-c:v', 'libvpx-vp9', '-crf', '42', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', out.replace(/\.mp4$/, '.webm')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(dir, 'last.png'), '-vf', vf.replace(`fps=${FPS},`, ''), '-q:v', '5', poster]);
  console.log(`${lang}/${name} mp4 ${(fs.statSync(out).size / 1024).toFixed(0)} KB, webm ${(fs.statSync(out.replace(/\.mp4$/, '.webm')).size / 1024).toFixed(0)} KB, ${(end - start).toFixed(1)} s`);
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const lang of LANGS) for (const name of Object.keys(SCENES).filter((n) => !ONLY || ONLY.includes(n))) await record(browser, lang, name);
await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });
