// Regression + performance checks for index.html, driven in a real browser.
// usage: node tests/regress.mjs [--save baseline.json] [--compare baseline.json] [--bench]
//   PLAYWRIGHT=/path/to/playwright/index.mjs   CHROMIUM=/path/to/chromium   THREE_JS=/path/to/three.min.js (r128, when the CDN is unreachable)
// Random numbers are seeded, so every generator, action and animation produces the same voxels on every run;
// --save writes a fingerprint of all of them, --compare checks a later build against it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
const BENCH = process.argv.includes('--bench');
const ROOT = process.cwd();
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('  ✗ ' + msg) } else console.log('  ✓ ' + msg) };

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
async function open(lang = 'en', vp = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport: vp, acceptDownloads: true });
  // three.js draws object ids from Math.random; give it its own stream so the seeded one only feeds the app
  await ctx.route('https://cdnjs.cloudflare.com/**', async (r) => {
    const src = process.env.THREE_JS ? fs.readFileSync(process.env.THREE_JS, 'utf8') : await (await r.fetch()).text();
    r.fulfill({ body: src.replaceAll('4294967295*Math.random()', '4294967295*(window.__idRand||Math.random)()'), contentType: 'text/javascript' });
  });
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|_vercel/, (r) => r.fulfill({ body: '' }));
  await ctx.addInitScript((l) => {
    localStorage.setItem('vs_lang', l); localStorage.setItem('vs_seen', '1');
    let s = 12345, q = 99; window.__seed = (n) => { s = n }; window.__idRand = () => (q = (q * 16807) % 2147483647) / 2147483647; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
    window.__dl = []; const ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dl.push({ name: this.download, href: this.href }); return } return ac.call(this) };
    URL.revokeObjectURL = () => {};
    window.alert = (m) => (window.__alerts = (window.__alerts || []).concat(String(m))); window.confirm = () => true; window.prompt = (m, d) => d || 'test';
  }, lang);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(800);
  return { p, ctx, errs };
}
// a stable fingerprint of the current frame's voxels
const FP = `(() => { const v = V(); const ks = Object.keys(v).sort(); let h = 2166136261; for (const k of ks) { const s = k + v[k].c + (v[k].a || 255); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } } return ks.length + ':' + (h >>> 0).toString(16) })()`;

const out = {};
// ---------- 1. data: generators, actions, animation generators, Next move, styles ----------
{
  console.log('data');
  const { p, ctx, errs } = await open();
  const ids = await p.evaluate(() => GENS.map((g) => g.id));
  for (const id of ids) { await p.evaluate((id) => { __seed(7); gen(id) }, id); out['gen:' + id] = await p.evaluate(FP) }
  ok(ids.every((id) => +out['gen:' + id].split(':')[0] > 0), `${ids.length} generators all produce voxels`);
  for (const a of await p.evaluate(() => ACTS)) { await p.evaluate(() => { __seed(7); gen('castle') }); await p.evaluate((a) => { __seed(7); doAct(a) }, a); out['act:' + a] = await p.evaluate(FP) }
  for (const a of await p.evaluate(() => AGENS.map((g) => g.id))) {
    await p.evaluate(() => { frames = [{ v: {}, ws: false, cam: null }]; curFrame = 0; __seed(7); gen('house') });
    await p.evaluate((a) => { __seed(7); animGen(a) }, a);
    out['anim:' + a] = await p.evaluate((fp) => { const r = frames.length + '|' + frames.map((f, i) => { curFrame = i; return eval(fp) }).join(','); curFrame = 0; return r }, FP);
  }
  await p.evaluate(() => { frames = [{ v: {}, ws: false, cam: null }]; curFrame = 0; rebMesh() });
  await p.evaluate(() => { __seed(7); gen('house') });
  for (let i = 0; i < 6; i++) { await p.evaluate((i) => { __seed(100 + i); $('hNx').click() }, i); out['next:' + i] = await p.evaluate(FP) }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await ctx.close();
}
// ---------- 2. editing: tools on the 2D slice, 3D picking, undo / redo, frames ----------
{
  console.log('editing');
  const { p, ctx, errs } = await open();
  await p.evaluate(() => { Object.keys(V()).forEach((k) => { const [x, y, z] = pv_(k); delV(x, y, z) }); undoSt = []; redoSt = []; rebMesh(); d2D(); uCnt() });
  const cv = await p.locator('#c2d').boundingBox();
  const at = (gx, gy) => [cv.x + cv.width * (gx + .5) / 16, cv.y + cv.height * (gy + .5) / 16];
  const tap = async (gx, gy) => { const [x, y] = at(gx, gy); await p.mouse.click(x, y) };
  await p.evaluate(() => setTool('pen')); await tap(3, 3); await tap(4, 3);
  const n1 = await p.evaluate(() => Object.keys(V()).length); ok(n1 === 2, 'pen places 2 voxels on the slice (' + n1 + ')');
  await p.evaluate(() => setTool('frect')); await tap(5, 5); await tap(9, 8); await tap(9, 8);
  const n2 = await p.evaluate(() => Object.keys(V()).length); ok(n2 === 2 + 5 * 4, 'filled rectangle 5×4 (' + n2 + ')');
  await p.evaluate(() => undo()); ok(await p.evaluate(() => Object.keys(V()).length) === 2, 'undo removes the rectangle');
  await p.evaluate(() => redo()); ok(await p.evaluate(() => Object.keys(V()).length) === 22, 'redo brings it back');
  // 3D picking: click the top face of a known voxel, expect the new voxel above it
  await p.evaluate(() => { Object.keys(V()).forEach((k) => { const [x, y, z] = pv_(k); delV(x, y, z) }); setV(8, 0, 8, '#ff0000', 255); rebMesh(); setTool('pen'); resetCam() });
  const hit = await p.evaluate(() => { const v = new THREE.Vector3(8.5, 1, 8.5).project(cam); const r = c3.getBoundingClientRect(); const e = { clientX: r.left + (v.x + 1) / 2 * r.width, clientY: r.top + (1 - v.y) / 2 * r.height }; return JSON.stringify(ray3D(e)) });
  out['pick:top'] = hit; ok(hit.includes('"ex":{"x":8,"y":0,"z":8}') && hit.includes('"adj":{"x":8,"y":1,"z":8}'), '3D pick top face → ' + hit);
  const side = await p.evaluate(() => { const v = new THREE.Vector3(9, .5, 8.5).project(cam); const r = c3.getBoundingClientRect(); const e = { clientX: r.left + (v.x + 1) / 2 * r.width, clientY: r.top + (1 - v.y) / 2 * r.height }; return JSON.stringify(ray3D(e)) });
  out['pick:side'] = side; ok(side.includes('"adj":{"x":9,"y":0,"z":8}'), '3D pick side face → ' + side);
  const ground = await p.evaluate(() => { const v = new THREE.Vector3(3.5, 0, 3.5).project(cam); const r = c3.getBoundingClientRect(); const e = { clientX: r.left + (v.x + 1) / 2 * r.width, clientY: r.top + (1 - v.y) / 2 * r.height }; return JSON.stringify(ray3D(e)) });
  out['pick:ground'] = ground; ok(ground.includes('"adj":{"x":3,"y":0,"z":3}'), '3D pick ground → ' + ground);
  // the 3D view actually shows the voxel
  const px = await p.evaluate(() => { ren.render(scn, cam); const v = new THREE.Vector3(8.5, .5, 8.5).project(cam); const gl = ren.getContext(); const b = new Uint8Array(4); const s = ren.getPixelRatio(); gl.readPixels(Math.round((v.x + 1) / 2 * c3.width), Math.round((v.y + 1) / 2 * c3.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); return [...b] });
  ok(px[0] > 90 && px[1] < 80, '3D view draws the red voxel (pixel ' + px + ')');
  // frames
  await p.evaluate(() => { addFrame() }); ok(await p.evaluate(() => frames.length) === 2, 'add frame');
  await p.evaluate(() => { goFrame(0) }); ok(await p.evaluate(() => Object.keys(V()).length) === 1, 'frame 0 keeps its voxel');
  await p.evaluate(() => { undo() }); ok(await p.evaluate(() => frames.length) === 1, 'undo add frame');
  // canvas resize
  await p.evaluate(() => { $('sW').value = 32; $('sH').value = 24; $('sD').value = 32; appSz() });
  ok(await p.evaluate(() => W === 32 && H === 24 && D === 32), 'resize canvas to 32×24×32');
  await p.evaluate(() => { setV(31, 23, 31, '#00ff00', 255); rebMesh() }); ok(await p.evaluate(() => !!V()['31,23,31']), 'voxel at the far corner');
  // wireframe toggle and back
  await p.evaluate(() => { togWire(); togWire() });
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await ctx.close();
}
// ---------- 3. files: exports, JSON round trip, image import ----------
{
  console.log('files');
  const { p, ctx, errs } = await open();
  await p.evaluate(() => gen('house'));
  const cnt = await p.evaluate(() => Object.keys(V()).length);
  for (const f of ['xOBJ', 'xSTL', 'xGLB', 'xJSON', 'xPNG']) await p.evaluate((f) => window[f](), f);
  const dl = await p.evaluate(async () => Promise.all(window.__dl.map(async (d) => { const b = await (await fetch(d.href)).arrayBuffer(); return { name: d.name, size: b.byteLength, head: new TextDecoder().decode(b.slice(0, 120)) } })));
  ok(dl.length >= 6, 'exports downloaded: ' + dl.map((d) => d.name + ' ' + d.size).join(', '));
  const obj = dl.find((d) => d.name.endsWith('.obj')), stl = dl.find((d) => d.name.endsWith('.stl')), glb = dl.find((d) => d.name.endsWith('.glb')), js = dl.find((d) => d.name.endsWith('.json'));
  ok(obj && obj.size > 1000 && obj.head.includes('mtllib'), 'OBJ looks valid');
  ok(stl && stl.size === 84 + 50 * (await p.evaluate(() => outerFaces().n * 2)), 'binary STL size matches its triangle count');
  // load every export back with three.js' own loaders (THREE_LOADERS = folder with GLTFLoader.js, OBJLoader.js, STLLoader.js from three r128 examples/js/loaders)
  if (process.env.THREE_LOADERS) {
    for (const f of ['GLTFLoader.js', 'OBJLoader.js', 'STLLoader.js']) await p.addScriptTag({ path: path.join(process.env.THREE_LOADERS, f) });
    const r = await p.evaluate(async () => {
      const get = async (ext) => (await fetch(window.__dl.find((x) => x.name.endsWith(ext)).href)).arrayBuffer();
      const tris = (o) => { let t = 0; const bb = new THREE.Box3(); o.traverse((m) => { if (m.isMesh) { const g = m.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; g.computeBoundingBox(); bb.union(g.boundingBox) } }); return { t, min: bb.min.toArray(), max: bb.max.toArray() } };
      const vs = Object.keys(V()).map(pv_), lo = [0, 1, 2].map((i) => Math.min(...vs.map((q) => q[i]))), hi = [0, 1, 2].map((i) => Math.max(...vs.map((q) => q[i])) + 1);
      const want = outerFaces().n * 2;
      const g = await new Promise(async (res, rej) => new THREE.GLTFLoader().parse(await get('.glb'), '', (x) => res(tris(x.scene)), rej));
      const o = tris(new THREE.OBJLoader().parse(new TextDecoder().decode(await get('.obj'))));
      const sg = new THREE.STLLoader().parse(await get('.stl')); sg.computeBoundingBox();
      const st = { t: sg.attributes.position.count / 3, min: sg.boundingBox.min.toArray(), max: sg.boundingBox.max.toArray() };
      return { want, lo, hi, g, o, st };
    });
    const same = (b) => b.t === r.want && b.min.join() === r.lo.join() && b.max.join() === r.hi.join();
    ok(same(r.g), `GLB loads in GLTFLoader: ${r.g.t} triangles, bounds ${r.g.min}→${r.g.max} (want ${r.want}, ${r.lo}→${r.hi})`);
    ok(same(r.o), `OBJ loads in OBJLoader: ${r.o.t} triangles`);
    ok(same(r.st), `STL loads in STLLoader: ${r.st.t} triangles`);
  }
  ok(glb && glb.head.startsWith('glTF'), 'GLB header');
  // GLB must parse with three's loader-free check: JSON chunk + accessor counts
  const glbOk = await p.evaluate(async () => { const d = window.__dl.find((x) => x.name.endsWith('.glb')); const b = await (await fetch(d.href)).arrayBuffer(); const dv = new DataView(b); const jl = dv.getUint32(12, true); const j = JSON.parse(new TextDecoder().decode(new Uint8Array(b, 20, jl))); return j.accessors && j.accessors.length >= 2 && j.meshes.length >= 1 });
  ok(glbOk, 'GLB JSON chunk parses');
  // JSON round trip
  const jsonText = await p.evaluate(async () => { const d = window.__dl.find((x) => x.name.endsWith('.json')); return (await fetch(d.href)).text() });
  const before = await p.evaluate(FP);
  await p.evaluate(() => { Object.keys(V()).forEach((k) => { const [x, y, z] = pv_(k); delV(x, y, z) }); rebMesh() });
  const tmp = path.join(process.env.VOXOB_TMP || os.tmpdir(), 'voxob-rt.json'); fs.writeFileSync(tmp, jsonText);
  await p.setInputFiles('#imF', tmp); await p.waitForTimeout(400);
  ok(await p.evaluate(FP) === before, 'JSON save → load round trip (' + cnt + ' voxels)');
  // image import: an 8×4 PNG made in the page
  const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 8; c.height = 4; const x = c.getContext('2d'); x.fillStyle = '#ff0000'; x.fillRect(0, 0, 4, 4); x.fillStyle = '#0000ff'; x.fillRect(4, 0, 4, 4); return c.toDataURL('image/png').split(',')[1] });
  const pf = path.join(process.env.VOXOB_TMP || os.tmpdir(), 'voxob-8x4.png'); fs.writeFileSync(pf, Buffer.from(png, 'base64'));
  await p.evaluate(() => { Object.keys(V()).forEach((k) => { const [x, y, z] = pv_(k); delV(x, y, z) }); rebMesh() });
  await p.setInputFiles('#imgIn', pf); await p.waitForTimeout(800);
  out['import:png'] = await p.evaluate(FP); ok(+out['import:png'].split(':')[0] > 0, 'image import makes voxels (' + out['import:png'] + ')');
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await ctx.close();
}
// ---------- 4. big canvas: size cap, autosave to IndexedDB and back, frame switching ----------
{
  console.log('big canvas');
  const { p, ctx, errs } = await open();
  await p.evaluate(() => { $('sW').value = 1000; $('sH').value = 2; $('sD').value = 64; appSz() });
  ok(await p.evaluate(() => W === 256 && H === 4 && D === 64), 'canvas size is clamped to 4–256');
  await p.evaluate(() => { $('sW').value = 96; $('sH').value = 64; $('sD').value = 96; appSz() });
  const n = await p.evaluate(() => { const v = V(); for (let x = 0; x < 96; x++) for (let z = 0; z < 96; z++) for (let y = 0; y < 20; y++) v[vk(x, y, z)] = { c: y < 19 ? '#8a6f4d' : '#5b8c5a', a: 255 }; rebMesh(); return Object.keys(v).length });
  const fp = await p.evaluate(FP);
  await p.evaluate(() => autoSave()); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => localStorage.getItem('vs9_big') === '1' && !localStorage.getItem('vs9')), `${n} voxels: autosave went to IndexedDB`);
  await p.reload(); await p.waitForTimeout(2500);
  ok(await p.evaluate(FP) === fp && await p.evaluate(() => W === 96 && H === 64 && D === 96), 'reload restores the big project from IndexedDB');
  // small again → back to localStorage
  await p.evaluate(() => { frames = [{ v: {}, ws: false, cam: null }]; curFrame = 0; gen('house'); autoSave() }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!localStorage.getItem('vs9') && !localStorage.getItem('vs9_big')), 'small project autosaves to localStorage again');
  // switching frames of a big model
  const t = await p.evaluate(() => { $('sW').value = 128; $('sH').value = 64; $('sD').value = 128; appSz(); const mk = (h) => { const v = {}; for (let x = 0; x < 128; x++) for (let z = 0; z < 128; z++) for (let y = 0; y < h; y++) v[vk(x, y, z)] = { c: '#7090b0', a: 255 }; return v }; frames = [{ v: mk(8), ws: false, cam: null }, { v: mk(12), ws: false, cam: null }]; const t0 = performance.now(); for (let i = 0; i < 4; i++) { goFrame(i % 2); ren.render(scn, cam) } return Math.round((performance.now() - t0) / 4) });
  ok(t < 1500, `frame switch with ~200k voxels: ${t} ms`);
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await ctx.close();
}
// ---------- 5. conversion: every style, text, video, undo, Shorts ----------
{
  console.log('convert');
  const { p, ctx, errs } = await open();
  await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 200); x.fillStyle = '#e67e22'; x.beginPath(); x.arc(100, 110, 70, 0, 7); x.fill(); x.fillStyle = '#4caf50'; x.fillRect(10, 10, 50, 40); x.fillStyle = '#3d7fd6'; x.fillRect(140, 10, 50, 40); window.PIC = c });
  for (const st of ['city', 'creature', 'tower', 'terrain', 'relief', 'flat']) {
    const r = await p.evaluate(async (st) => { VoxoBConvert.setSource({ kind: 'image', el: PIC, name: 'pic' }); $('cvSt').value = st; $('cvR').value = '48'; $('cvPr').checked = true; await VoxoBConvert.convert();
      const vs = Object.keys(V()).map(pv_), inside = vs.every(([x, y, z]) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D);
      const grow = frames.every((f, i) => i === 0 || Object.keys(f.v).length >= Object.keys(frames[i - 1].v).length);
      return { n: vs.length, inside, frames: frames.length, grow, cur: curFrame, dims: [W, H, D].join('×') } }, st);
    ok(r.n > 50 && r.inside && r.frames === 12 && r.grow && r.cur === 11, `${st}: ${r.n} voxels in ${r.dims}, 12 growing process frames`);
  }
  // terrain on a sharp step: any voxel left out of a solid column is boxed in on all six sides (no see-through holes)
  const cliff = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 40, 40); x.fillStyle = '#fff'; x.fillRect(20, 0, 20, 40); x.fillStyle = '#888'; x.fillRect(5, 5, 8, 8);
    const r = VoxoBConvert.ST.terrain(VoxoBConvert.grid(c, 40)), has = new Set(r.vox.map((v) => v.slice(0, 3).join())), top = new Map();
    r.vox.forEach((v) => { const k = v[0] + ',' + v[2]; top.set(k, Math.max(top.get(k) ?? -1, v[1])) });
    let holes = 0, left = 0; const solid = (x, y, z) => y >= 0 && y <= (top.get(x + ',' + z) ?? -1);
    top.forEach((t, k) => { const [x, z] = k.split(',').map(Number); for (let y = 0; y <= t; y++) { if (has.has([x, y, z].join())) continue; left++; for (const [a, b, d] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (!solid(x + a, y + b, z + d)) holes++ } });
    return { left, holes } });
  ok(cliff.holes === 0 && cliff.left > 0, `terrain: ${cliff.left} hidden voxels left out, ${cliff.holes} open to the air`);
  // creature: the last process frame holds every voxel
  const all = await p.evaluate(async () => { VoxoBConvert.setSource({ kind: 'image', el: PIC, name: 'pic' }); $('cvSt').value = 'creature'; $('cvPr').checked = true; await VoxoBConvert.convert(); const a = Object.keys(V()).length; $('cvPr').checked = false; await VoxoBConvert.convert(); return [a, Object.keys(V()).length] });
  ok(all[0] === all[1], `process animation ends with the full model (${all[0]} = ${all[1]})`);
  const single = await p.evaluate(async () => { $('cvPr').checked = false; $('cvSt').value = 'creature'; await VoxoBConvert.convert(); return frames.length });
  ok(single === 1, 'without the process option a conversion is one frame');
  // undo / redo of a conversion swaps the whole project back and forth
  const before = await p.evaluate(() => { gen('house'); return [W, H, D, frames.length, Object.keys(V()).length].join() });
  await p.evaluate(async () => { $('cvPr').checked = true; $('cvSt').value = 'terrain'; await VoxoBConvert.convert() });
  const conv = await p.evaluate(() => [W, H, D, frames.length, Object.keys(V()).length].join());
  await p.evaluate(() => undo()); const un = await p.evaluate(() => [W, H, D, frames.length, Object.keys(V()).length].join());
  await p.evaluate(() => redo()); const re = await p.evaluate(() => [W, H, D, frames.length, Object.keys(V()).length].join());
  ok(un === before && re === conv, `undo / redo a conversion (${before} ⇄ ${conv})`);
  // text: wide enough to read, and not empty
  const tx = await p.evaluate(async () => { $('cvTx').value = 'こんにちは'; VoxoBConvert.setSource({ kind: 'text' }); $('cvSt').value = 'relief'; $('cvR').value = '32'; await VoxoBConvert.convert(); return { W, n: Object.keys(V()).length } });
  ok(tx.W >= 80 && tx.n > 200, `text "こんにちは" relief: ${tx.W} wide, ${tx.n} voxels`);
  // text on a transparent ground: white inside the letters (an emoji's teeth, white text) stays; "keep background" still adds the ground
  const tw = await p.evaluate(async () => { const keep = color; $('cvTx').value = '😁'; VoxoBConvert.setSource({ kind: 'text' }); $('cvSt').value = 'flat'; $('cvR').value = '32'; $('cvBg').checked = false; await VoxoBConvert.convert();
    const white = (m) => Object.values(m).filter((v) => { const n = parseInt(v.c.slice(1), 16); return (n >> 16) > 200 && ((n >> 8) & 255) > 200 && (n & 255) > 200 }).length;
    const a = white(V()), na = Object.keys(V()).length; color = '#ffffff'; $('cvTx').value = 'AB'; await VoxoBConvert.convert(); const b = Object.keys(V()).length;
    $('cvBg').checked = true; await VoxoBConvert.convert(); const c = Object.keys(V()).length; $('cvBg').checked = false; color = keep; return { a, na, b, c } });
  ok(tw.a > 5 && tw.b > 20 && tw.c > tw.b, `text keeps white inside: 😁 ${tw.a} white of ${tw.na}; white "AB" ${tw.b} voxels, ${tw.c} with its ground`);
  const noSrc = await p.evaluate(async () => { $('cvTx').value = '  '; await VoxoBConvert.convert(); return $('cvMsg').textContent });
  ok(/text|文字/i.test(noSrc), 'empty text is refused with a message: ' + noSrc);
  // time sculpture needs a video; with a video it stacks frames in depth
  const tv = await p.evaluate(async () => { VoxoBConvert.setSource({ kind: 'image', el: PIC, name: 'pic' }); $('cvSt').value = 'time'; await VoxoBConvert.convert(); return $('cvMsg').textContent });
  ok(/video|動画/i.test(tv), 'time sculpture without a video is refused: ' + tv);
  const ts = await p.evaluate(() => { const g = (k) => { const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#eee'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#f00'; x.fillRect(k * 2, 10, 6, 6); return VoxoBConvert.grid(c, 32) }; const r = VoxoBConvert.timeSculpture([0, 1, 2, 3, 4, 5, 6, 7].map(g)); const zs = new Set(r.vox.map((v) => v[2])); return { n: r.vox.length, layers: zs.size, D: r.D } });
  ok(ts.layers === 8 && ts.n >= 8 * 30, `time sculpture: moving square → ${ts.layers} layers, ${ts.n} voxels`);
  // video, one conversion per frame: a growing disk puffs up a little more each frame, every frame on the same centre
  const vid = await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 160; c.height = 160; const x = c.getContext('2d'), rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm' }), ch = []; rec.ondataavailable = (e) => ch.push(e.data); rec.start(); const t0 = performance.now();
    await new Promise((res) => { const f = () => { const s = (performance.now() - t0) / 2000; x.fillStyle = '#fff'; x.fillRect(0, 0, 160, 160); x.fillStyle = '#2a9d8f'; x.beginPath(); x.arc(80, 80, 20 + 50 * Math.min(1, s), 0, 7); x.fill(); if (s < 1) requestAnimationFrame(f); else res() }; f() });
    rec.stop(); await new Promise((r) => rec.onstop = r);
    const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(new Blob(ch, { type: 'video/webm' })); await new Promise((r) => v.onloadeddata = r);
    if (!isFinite(v.duration)) { v.currentTime = 1e9; await new Promise((r) => v.ondurationchange = r); v.currentTime = 0 }
    VoxoBConvert.setSource({ kind: 'video', el: v, name: 'disk.webm' }); $('cvSt').value = 'creature'; $('cvR').value = '32'; await VoxoBConvert.convert();
    const cz = frames.map((f) => { const zs = Object.keys(f.v).map((k) => pv_(k)[2]); return (Math.min(...zs) + Math.max(...zs) + 1) / 2 });
    return { n: frames.length, D, cz, grow: Object.keys(frames[frames.length - 1].v).length > Object.keys(frames[0].v).length };
  });
  ok(vid.n >= 6 && vid.grow && vid.cz.every((z) => Math.abs(z - vid.D / 2) <= 1), `video → ${vid.n} creature frames, centred in depth (${vid.cz.map((z) => z.toFixed(1)).join(' ')} / ${vid.D})`);
  // Shorts, frame by frame: right size and length, and the editor is put back as it was
  const sh = await p.evaluate(async () => { $('cvPr').checked = true; $('cvSt').value = 'creature'; $('cvR').value = '32'; VoxoBConvert.setSource({ kind: 'image', el: PIC, name: 'pic' }); await VoxoBConvert.convert(); goFrame(3);
    const was = [c3.width, c3.height, cam.aspect.toFixed(3), curFrame, gG ? gG.visible : null].join(); let n = 0, size = '';
    const r = await VoxoBConvert.shorts({ fps: 6, onFrame: (cv) => { n++; size = cv.width + 'x' + cv.height } });
    return { was, now: [c3.width, c3.height, cam.aspect.toFixed(3), curFrame, gG ? gG.visible : null].join(), n, size, r } });
  ok(sh.size === '1080x1920' && sh.n === sh.r.frames && sh.n > 60, `Shorts: ${sh.n} frames of ${sh.size}`);
  ok(sh.was === sh.now, `editor restored after Shorts (${sh.was})`);
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await ctx.close();
}
// ---------- 6. realistic depth, 3D models, smooth view, clear all, drop, rotate, typing, sound ----------
{
  console.log('more');
  const { p, ctx, errs } = await open('ja');
  const svg = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'shorts/src', f)).toString('base64');
  const real = async (f, bg) => p.evaluate(async ([u, bg]) => { const im = new Image(); im.src = u; await im.decode(); VoxoBConvert.setSource({ kind: 'image', el: im, name: 'x' }); $('cvSt').value = 'real'; $('cvR').value = '64'; $('cvBg').checked = bg; $('cvPr').checked = false; await VoxoBConvert.convert();
    const zs = new Map(); for (const k of Object.keys(V())) { const [x, y, z] = pv_(k); const c = x + ',' + y; zs.set(c, (zs.get(c) || 0) + 1) } const thick = [...zs.values()].sort((a, b) => b - a)[Math.floor(zs.size / 10)];
    return { n: Object.keys(V()).length, D, back: Object.keys(V()).filter((k) => pv_(k)[2] === 0).length, thick } }, [svg(f), bg]);
  const por = await real('portrait.svg', false), ani = await real('anime.svg', false), lan = await real('landscape.svg', true);
  ok(por.thick >= 8 && por.back === 0, `realistic portrait: a figure ${por.thick}+ voxels thick (${por.n} voxels), no backdrop`);
  ok(ani.thick >= 8, `realistic anime: ${ani.thick}+ voxels thick (${ani.n})`);
  ok(lan.back > 500 && lan.D >= 16, `realistic landscape: sky backdrop of ${lan.back} voxels, ${lan.D} deep`);
  // 3D models (fixtures made for these tests)
  const fx = (...f) => f.map((x) => path.join(ROOT, 'tests/fixtures', x));
  const model = async (files, R) => { await p.setInputFiles('#cvMoF', fx(...files)); return p.evaluate(async (R) => { $('cvR').value = String(R); $('cvPr').checked = false; await VoxoBConvert.convert(); const cs = {}; for (const v of Object.values(V())) cs[v.c] = (cs[v.c] || 0) + 1; return { n: Object.keys(V()).length, colours: Object.keys(cs).length, top: Object.entries(cs).sort((a, b) => b[1] - a[1]).slice(0, 4).map((e) => e[0]), dims: [W, H, D].join('×') } }, R) };
  const glb = await model(['shapes.glb'], 64);
  ok(glb.n > 5000 && glb.colours > 50 && glb.top.some((c) => /^#[ef]/.test(c)) && glb.top.some((c) => /^#e[0-9a-f]4/.test(c) || /^#e/.test(c)), `GLB: ${glb.n} voxels, ${glb.colours} colours (texture checker, vertex colours, material) ${glb.dims}`);
  const obj = await model(['pyramid.obj', 'p.mtl'], 32);
  ok(obj.n > 1000 && obj.top.includes('#f2bf33') && obj.top.includes('#664d33'), `OBJ + MTL: ${obj.n} voxels, materials ${obj.top.slice(0, 2)}`);
  const tri = await model(['triangle-text.stl'], 32);
  ok(tri.n >= 32 * 32 / 2 - 40 && tri.n <= 32 * 32 / 2 + 80, `text STL triangle filled: ${tri.n} voxels (~${32 * 32 / 2})`);
  const stl = await model(['house-binary.stl'], 32);
  ok(stl.n > 1000, `binary STL (VoxoB's own export) re-imported: ${stl.n} voxels`);
  // the File tab import uses the same voxelizer (not just the corners of triangles)
  await p.evaluate(() => { frames = [{ v: {}, ws: false, cam: null }]; curFrame = 0; W = H = D = 32; $('sW').value = $('sH').value = $('sD').value = 32; $('iSz').value = 24; rebMesh(); rebGrid() });
  await p.setInputFiles('#imgIn', fx('triangle-text.stl')); await p.waitForTimeout(800);
  const fileTab = await p.evaluate(() => Object.keys(V()).length);
  ok(fileTab > 200, `File tab STL import fills the triangle: ${fileTab} voxels`);
  // smooth view: surface faces outward, exports follow, and switching back shows cubes again
  const sm = await p.evaluate(async () => { gen('sphere'); VoxoBSmooth.set(true); ren.render(scn, cam); const s = VoxoBSmooth.surface(), c = [W / 2, H / 2, D / 2]; let out = 0, tot = 0;
    for (let i = 0; i < s.idx.length; i += 3) { const v = [0, 1, 2].map((j) => s.idx[i + j] * 3), P = (q, k) => s.pos[q + k], u = [0, 1, 2].map((k) => P(v[1], k) - P(v[0], k)), w = [0, 1, 2].map((k) => P(v[2], k) - P(v[0], k)), n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], m = [0, 1, 2].map((k) => (P(v[0], k) + P(v[1], k) + P(v[2], k)) / 3 - c[k]); if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] > 0) out++; tot++ }
    window.__dl = []; xGLB(); xSTL(); xOBJ(); const get = async (e) => (await fetch(window.__dl.find((d) => d.name.endsWith(e)).href)).arrayBuffer();
    const stl = await get('.stl'), glbB = await get('.glb'), objT = new TextDecoder().decode(await get('.obj'));
    const r = { out: out / tot, tot, hidden: !vG.visible, stlTris: new DataView(stl).getUint32(80, true), stlOk: stl.byteLength === 84 + 50 * new DataView(stl).getUint32(80, true), glb: new TextDecoder().decode(glbB.slice(0, 4)), objV: (objT.match(/^v /gm) || []).length };
    VoxoBSmooth.set(false); r.back = vG.visible; return r });
  ok(sm.out === 1 && sm.hidden && sm.back, `smooth view: ${sm.tot} triangles, all facing out; cubes hidden while on, back when off`);
  ok(sm.stlOk && sm.stlTris === sm.tot && sm.glb === 'glTF' && sm.objV > 100, `smooth exports: STL ${sm.stlTris} triangles, GLB, OBJ ${sm.objV} vertices`);
  // smooth view follows an animation: every frame shows its own surface, right away
  const sa = await p.evaluate(() => { frames = [{ v: {}, ws: false, cam: null }, { v: {}, ws: false, cam: null }]; curFrame = 0; rebMesh(); gen('sphere'); frames[1].v = {}; for (let x = 2; x < 6; x++) for (let y = 2; y < 6; y++) for (let z = 2; z < 6; z++) frames[1].v[vk(x, y, z)] = { c: '#ff0000', a: 255 };
    VoxoBSmooth.set(true); ren.render(scn, cam); const n = () => VoxoBSmooth.surface().idx.length; const a = n(); goFrame(1); ren.render(scn, cam); const b = n(); goFrame(0); ren.render(scn, cam); const c = n(); VoxoBSmooth.set(false); return { a, b, c } });
  ok(sa.a > 0 && sa.b > 0 && sa.a !== sa.b && sa.c === sa.a, `smooth view per animation frame: ${sa.a} → ${sa.b} → ${sa.c} indices`);
  // clear all: every frame, one undo step, redo clears again
  const ca = await p.evaluate(() => { frames = [{ v: {}, ws: false, cam: null }, { v: {}, ws: false, cam: null }]; curFrame = 0; rebMesh(); gen('house'); frames[1].v = { ...frames[0].v }; const n0 = Object.keys(frames[1].v).length;
    $('hClr').click(); const a = frames.map((f) => Object.keys(f.v).length).join(); undo(); const b = frames.map((f) => Object.keys(f.v).length).join(); redo(); const c = frames.map((f) => Object.keys(f.v).length).join(); undo();
    const box = $('hClr').getBoundingClientRect(); return { n0, a, b, c, shown: box.width > 0 && box.top < 60 && box.right > innerWidth * .5 } });
  ok(ca.a === '0,0' && ca.b === `${ca.n0},${ca.n0}` && ca.c === '0,0' && ca.shown, `Clear all in the header: ${ca.n0},${ca.n0} → ${ca.a} → undo ${ca.b} → redo ${ca.c}`);
  // drop: a floating voxel falls to the floor, a stack stays a stack
  const dr = await p.evaluate(() => { frames = [{ v: {}, ws: false, cam: null }]; curFrame = 0; rebMesh(); setV(3, 9, 3, '#f00', 255); setV(3, 12, 3, '#0f0', 255); setV(5, 0, 5, '#00f', 255); doAct('gravity'); const v = V(); return [v['3,0,3']?.c, v['3,1,3']?.c, v['5,0,5']?.c, Object.keys(v).length].join() });
  ok(dr === '#f00,#0f0,#00f,3', `drop: ${dr}`);
  // turning a canvas that is not a cube swaps its sides and keeps every voxel
  const rt = await p.evaluate(() => { W = 30; H = 10; D = 20; $('sW').value = 30; $('sH').value = 10; $('sD').value = 20; frames = [{ v: {}, ws: false, cam: null }]; curFrame = 0; rebMesh(); rebGrid(); for (let x = 0; x < 30; x++) setV(x, 2, 5, '#888', 255); const n = Object.keys(V()).length; doAct('rotY'); const a = [W, H, D, Object.keys(V()).length].join(); undo(); return { n, a, b: [W, H, D, Object.keys(V()).length].join() } });
  ok(rt.a === `20,10,30,${rt.n}` && rt.b === `30,10,20,${rt.n}`, `rotate a 30×10×20 canvas: ${rt.a}, undo ${rt.b}`);
  // resizing cuts every frame, not only the current one
  const rs = await p.evaluate(() => { W = H = D = 16; $('sW').value = $('sH').value = $('sD').value = 16; frames = [{ v: {}, ws: false, cam: null }, { v: { '15,0,15': { c: '#fff', a: 255 }, '2,0,2': { c: '#fff', a: 255 } }, ws: false, cam: null }]; curFrame = 0; rebMesh(); $('sW').value = 8; $('sD').value = 8; appSz(); return Object.keys(frames[1].v).join('|') });
  ok(rs === '2,0,2', 'resize clips the other frames too: ' + rs);
  // a big slice fits the 2D panel
  const sl = await p.evaluate(() => { $('sW').value = $('sH').value = $('sD').value = 256; appSz(); rs2(); d2D(); return [c2.width, c2.height, $('cw').clientWidth, $('cw').clientHeight].join() });
  const [cw2, ch2, pw, ph] = sl.split(',').map(Number); ok(cw2 <= pw && ch2 <= ph && cw2 >= 256, `256 slice fits the panel: ${cw2}×${ch2} in ${pw}×${ph}`);
  // typing in the text box does not switch tools; Space on a focused button does not play
  const ty = await p.evaluate(() => { setTool('pen'); return true }); await p.evaluate(() => { $('cvTe').click() }); await p.locator('#cvTx').fill(''); await p.locator('#cvTx').type('lrgb e');
  ok(await p.evaluate(() => tool === 'pen' && mode === 'draw'), 'typing "lrgb e" in the text box leaves the tool and mode alone');
  await p.evaluate(() => { frames = [{ v: {}, ws: false, cam: null }, { v: {}, ws: false, cam: null }]; curFrame = 0; rebMesh(); $('hU').focus() }); await p.keyboard.press(' ');
  ok(await p.evaluate(() => !playing), 'Space on a focused button does not start playback');
  // sounds: every kind plays without errors
  ok(await p.evaluate(() => { vol = .4; for (const k of ['place', 'erase', 'paint', 'click', 'copy', 'undo', 'redo', 'clear', 'done', 'gen', 'other']) snd(k); mode = 'del'; snd('place'); mode = 'draw'; return true }), 'sound engine plays every kind');
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await ctx.close();
}
// ---------- 6b. phone: the smooth button really toggles, and tapping leaves no tip on screen ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route('https://cdnjs.cloudflare.com/**', async (r) => r.fulfill({ body: process.env.THREE_JS ? fs.readFileSync(process.env.THREE_JS, 'utf8') : await (await r.fetch()).text(), contentType: 'text/javascript' }));
  await ctx.addInitScript(() => { localStorage.setItem('vs_seen', '1') });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(800);
  await p.locator('#bSmooth').tap(); await p.waitForTimeout(300);
  const a = await p.evaluate(() => [VoxoBSmooth.on, vG.visible].join());
  await p.locator('#hClr').tap(); await p.locator('#bSpin').tap(); await p.locator('#hU').tap(); await p.waitForTimeout(300);
  const tip = await p.evaluate(() => { const t = document.getElementById('_tip'); return t ? t.style.display : 'none' });
  await p.locator('#bSmooth').tap(); const b = await p.evaluate(() => [VoxoBSmooth.on, vG.visible].join());
  ok(a === 'true,false' && b === 'false,true', `phone: smooth button toggles (${a} → ${b})`);
  ok(tip !== 'block', 'phone: no tooltip left on screen after taps');
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await ctx.close();
}
// ---------- 7. languages load cleanly, with every Convert label filled ----------
for (const l of ['en', 'ja', 'es', 'pt', 'zh']) {
  const { p, ctx, errs } = await open(l);
  const bad = await p.evaluate(() => [...document.querySelectorAll('.cvp button, .cvp .pt, .cvp label span, .cvp .cvtip, .cvp .cvnote')].map((e) => e.textContent).filter((t) => !t.trim() || /undefined/.test(t)));
  ok(errs.length === 0 && bad.length === 0, `loads in ${l}` + (bad.length ? ' — empty labels: ' + bad.length : ''));
  await ctx.close();
}

// ---------- 8. performance on a big canvas ----------
if (BENCH) {
  console.log('bench');
  for (const N of [64, 128]) {
    const { p, ctx, errs } = await open();
    const r = await p.evaluate((N) => {
      W = H = D = N; $('sW').value = $('sH').value = $('sD').value = N; frames = [{ v: {}, ws: false, cam: null }]; curFrame = 0; rebGrid(); resetCam();
      const v = V(); for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) { const h = Math.floor(N / 4 + N / 5 * Math.sin(x / 7) * Math.cos(z / 9)); for (let y = 0; y <= h; y++) v[vk(x, y, z)] = { c: y > h - 2 ? '#5b8c5a' : '#8a6f4d', a: 255 } }
      const n = Object.keys(v).length;
      let t = performance.now(); rebMesh(); ren.render(scn, cam); const build = performance.now() - t;
      t = performance.now(); for (let i = 0; i < 20; i++) ren.render(scn, cam); ren.getContext().finish(); const frame = (performance.now() - t) / 20;
      t = performance.now(); for (let i = 0; i < 50; i++) setV(i % N, N - 1, (i * 7) % N, '#ff0000', 255); ren.render(scn, cam); const edit = performance.now() - t;
      t = performance.now(); const vv = new THREE.Vector3(N / 2, N / 3, N / 2).project(cam); const rr = c3.getBoundingClientRect(); for (let i = 0; i < 20; i++) ray3D({ clientX: rr.left + (vv.x + 1) / 2 * rr.width, clientY: rr.top + (1 - vv.y) / 2 * rr.height }); const pick = (performance.now() - t) / 20;
      return { N, voxels: n, buildMs: Math.round(build), frameMs: +frame.toFixed(1), edit50Ms: Math.round(edit), pickMs: +pick.toFixed(2), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null };
    }, N).catch((e) => ({ N, error: String(e).slice(0, 200) }));
    console.log('  ' + JSON.stringify(r)); out['bench:' + N] = r;
    await ctx.close();
  }
}
await browser.close();

if (arg('--save')) fs.writeFileSync(arg('--save'), JSON.stringify(out, null, 1));
if (arg('--compare')) {
  const base = JSON.parse(fs.readFileSync(arg('--compare'), 'utf8')); let diff = 0;
  for (const k of Object.keys(base)) if (!k.startsWith('bench:') && !k.startsWith('pick:') && base[k] !== out[k]) { diff++; console.log(`  ≠ ${k}: ${base[k]} → ${out[k]}`) }
  ok(diff === 0, `same voxels as the baseline for ${Object.keys(base).filter((k) => !k.startsWith('bench:')).length} checks`);
}
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
