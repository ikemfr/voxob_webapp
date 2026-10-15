  // ===== VoxoB Smooth: show (and export) the model as a smooth surface instead of cubes =====
  // Surface nets over a softened copy of the voxels: one vertex per cell the surface passes through, quads between them,
  // a few rounds of relaxing, colours from the voxels around each vertex. The voxels stay the model; this is only a view of it,
  // rebuilt shortly after each change. Picking, tools and saving keep working on the voxels.
  (() => {
    let on = false, built = null, dirtyS = true, lastEdit = 0;
    const sG = new THREE.Group(); scn.add(sG);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .62, metalness: .04 });
    try { on = localStorage.getItem('vs_smooth') === '1' } catch (e) { }
    const touchS = () => { dirtyS = true; lastEdit = performance.now() };
    { const a = addM, r = remM, b = rebMesh; addM = function (...x) { touchS(); return a.apply(this, x) }; remM = function (...x) { touchS(); return r.apply(this, x) }; rebMesh = function (...x) { touchS(); return b.apply(this, x) } }

    // the surface as plain arrays: positions, normals, colours (0–1, sRGB) and triangle indices
    function surface() {
      const v = V(), keys = Object.keys(v); if (!keys.length) return null;
      const PW = W + 2, PH = H + 2, PD = D + 2, N = PW * PH * PD, at = (x, y, z) => (x + 1) + PW * ((y + 1) + PH * (z + 1));
      const occ = new Float32Array(N), col = new Map();
      for (const k of keys) { const [x, y, z] = pv_(k); if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D) continue; const i = at(x, y, z); occ[i] = 1; col.set(i, v[k].c) }
      // soften: a light 1-6-1 blur along each axis, with the surface at 0.4 — a lone voxel (0.42) and a one-voxel wall (0.75) still show
      let F = occ;
      if (N <= 4.5e6) { const tmp = new Float32Array(N), out = new Float32Array(N), step = [1, PW, PW * PH]; let src = occ;
        for (let ax = 0; ax < 3; ax++) { const s = step[ax], dst = ax === 1 ? out : tmp; for (let i = 0; i < N; i++) dst[i] = (src[i] * 6 + (i >= s ? src[i - s] : 0) + (i + s < N ? src[i + s] : 0)) / 8; src = dst }
        F = tmp }
      const iso = N <= 4.5e6 ? .4 : .5, idxOf = new Map(), P = [], C = [];
      const cornerOff = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
      const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      // cells are between voxel centres; cell (x,y,z) spans centres x..x+1 (x from -1 to W-1)
      const cellVert = (x, y, z) => {
        const ck = (x + 1) + PW * ((y + 1) + PH * (z + 1)); if (idxOf.has(ck)) return idxOf.get(ck);
        const f = cornerOff.map(([a, b, c]) => F[at(x + a, y + b, z + c)]); let inside = 0; for (const q of f) if (q > iso) inside++;
        if (!inside || inside === 8) { idxOf.set(ck, -1); return -1 }
        let sx = 0, sy = 0, sz = 0, n = 0; for (const [a, b] of edges) { const fa = f[a], fb = f[b]; if ((fa > iso) === (fb > iso)) continue; const tt = (iso - fa) / (fb - fa), A = cornerOff[a], B = cornerOff[b]; sx += A[0] + (B[0] - A[0]) * tt; sy += A[1] + (B[1] - A[1]) * tt; sz += A[2] + (B[2] - A[2]) * tt; n++ }
        let r = 0, g = 0, bl = 0, m = 0; for (const [a, b, c] of cornerOff) { const h = col.get(at(x + a, y + b, z + c)); if (h) { const q = parseInt(h.slice(1, 7), 16); r += (q >> 16) & 255; g += (q >> 8) & 255; bl += q & 255; m++ } }
        const id = P.length / 3; P.push(x + .5 + sx / n, y + .5 + sy / n, z + .5 + sz / n); C.push(m ? r / m / 255 : .7, m ? g / m / 255 : .7, m ? bl / m / 255 : .7); idxOf.set(ck, id); return id;
      };
      const I = [];
      // every voxel-centre edge the surface crosses gets a quad from the four cells around it
      const seen = new Set();
      for (const k of keys) { const [x0, y0, z0] = pv_(k);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const x = x0 + dx, y = y0 + dy, z = z0 + dz; if (x < -1 || y < -1 || z < -1 || x > W || y > H || z > D) continue;
          const pk = at(x, y, z); if (seen.has(pk)) continue; seen.add(pk); const f0 = F[pk];
          for (const [ax, ox, oy, oz] of [[0, 1, 0, 0], [1, 0, 1, 0], [2, 0, 0, 1]]) {
            if (x + ox > W || y + oy > H || z + oz > D) continue; const f1 = F[at(x + ox, y + oy, z + oz)]; if ((f0 > iso) === (f1 > iso)) continue;
            const q = ax === 0 ? [[x, y - 1, z - 1], [x, y, z - 1], [x, y, z], [x, y - 1, z]] : ax === 1 ? [[x - 1, y, z - 1], [x - 1, y, z], [x, y, z], [x, y, z - 1]] : [[x - 1, y - 1, z], [x, y - 1, z], [x, y, z], [x - 1, y, z]];
            const vs = q.map(([a, b, c]) => cellVert(a, b, c)); if (vs.some(i => i < 0)) continue;
            if (f0 > iso) I.push(vs[0], vs[1], vs[2], vs[0], vs[2], vs[3]); else I.push(vs[0], vs[2], vs[1], vs[0], vs[3], vs[2]);
          } } }
      if (!I.length) return null;
      // relax: pull each vertex a little toward its neighbours
      const nb = Array.from({ length: P.length / 3 }, () => new Set()); for (let i = 0; i < I.length; i += 3) { const [a, b, c] = [I[i], I[i + 1], I[i + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b) }
      let pos = Float32Array.from(P);
      for (let it = 0; it < 3; it++) { const o = new Float32Array(pos.length); for (let i = 0; i < nb.length; i++) { let sx = 0, sy = 0, sz = 0; for (const j of nb[i]) { sx += pos[j * 3]; sy += pos[j * 3 + 1]; sz += pos[j * 3 + 2] } const n = nb[i].size || 1; o[i * 3] = pos[i * 3] * .5 + sx / n * .5; o[i * 3 + 1] = pos[i * 3 + 1] * .5 + sy / n * .5; o[i * 3 + 2] = pos[i * 3 + 2] * .5 + sz / n * .5 } pos = o }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(I); g.computeVertexNormals();
      return { pos, nor: g.attributes.normal.array, col: Float32Array.from(C), idx: Uint32Array.from(I), geo: g };
    }
    function rebuild() {
      if (built) { sG.remove(built.mesh); built.geo.dispose(); built = null }
      const s = surface(); dirtyS = false; if (!s) return;
      s.geo.setAttribute('color', new THREE.BufferAttribute(s.col, 3)); s.geo.computeBoundingSphere();
      built = { ...s, mesh: new THREE.Mesh(s.geo, mat) }; sG.add(built.mesh);
    }
    function apply() { vG.visible = !on; sG.visible = on; $('bSmooth').classList.toggle('on', on); $('bSmooth').setAttribute('aria-pressed', String(on)) }
    { const r0 = ren.render.bind(ren); ren.render = (s, c) => { if (on && dirtyS && performance.now() - lastEdit > 140) rebuild(); r0(s, c) } }
    function setSmooth(v) { on = v; try { localStorage.setItem('vs_smooth', on ? '1' : '0') } catch (e) { } if (on) rebuild(); apply(); snd('click') }

    // turntable: the view turns slowly until the next drag
    let spin = false; const spinBtn = document.createElement('button'), smBtn = document.createElement('button');
    smBtn.className = 'wb'; smBtn.id = 'bSmooth'; smBtn.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 1.8a6.2 6.2 0 0 1 0 12.4z" fill="currentColor"/></svg>';   // an icon, since ◐ is missing from some fonts smBtn.onclick = () => setSmooth(!on);
    spinBtn.className = 'wb'; spinBtn.id = 'bSpin'; spinBtn.textContent = '⟳'; spinBtn.onclick = () => { spin = !spin; spinBtn.classList.toggle('on', spin); spinBtn.setAttribute('aria-pressed', String(spin)); snd('click') };
    $('v3top').insertBefore(smBtn, $('bCamSv')); $('v3top').insertBefore(spinBtn, $('bCamSv'));
    let lt = performance.now(); (function tick(t) { requestAnimationFrame(tick); const dt = Math.min(.1, (t - lt) / 1000); lt = t; if (spin && !document.hidden) { cT += dt * .5; uCam() } })(lt);
    c3.addEventListener('pointerdown', () => { if (spin) { spin = false; spinBtn.classList.remove('on'); spinBtn.setAttribute('aria-pressed', 'false') } });
    const tips = { en: ['Smooth view: show the model as a smooth surface (exports follow)', 'Turntable: turn the view slowly'], ja: ['なめらか表示：ボクセルを滑らかな面で表示（書き出しも滑らかに）', 'ターンテーブル：ゆっくり回して眺める'] };
    Object.keys(I18N).forEach(l => { if (I18N[l].SM) tips[l] = I18N[l].SM });
    function relabel() { const tt = tips[lang] || tips.en; smBtn.dataset.tip = tt[0]; smBtn.setAttribute('aria-label', tt[0]); spinBtn.dataset.tip = tt[1]; spinBtn.setAttribute('aria-label', tt[1]) }
    const _sl = setLang; setLang = function (l) { _sl(l); relabel() }; relabel(); apply();

    // exports follow the view: with smooth on, OBJ / STL / GLB carry the smooth surface
    function smoothExport() { if (!on) return null; if (dirtyS || !built) rebuild(); return built }
    const lin = (u) => u <= .04045 ? u / 12.92 : Math.pow((u + .055) / 1.055, 2.4);
    { const o0 = xOBJ, s0 = xSTL, g0 = xGLB;
      xOBJ = function () { const s = smoothExport(); if (!s) return o0(); const fn = exFn(), out = ['# VoxoB smooth surface (vertex colours)\n'], n = s.pos.length / 3;
        for (let i = 0; i < n; i++) out.push(`v ${s.pos[i * 3].toFixed(4)} ${s.pos[i * 3 + 1].toFixed(4)} ${s.pos[i * 3 + 2].toFixed(4)} ${s.col[i * 3].toFixed(3)} ${s.col[i * 3 + 1].toFixed(3)} ${s.col[i * 3 + 2].toFixed(3)}\n`);
        for (let i = 0; i < n; i++) out.push(`vn ${s.nor[i * 3].toFixed(4)} ${s.nor[i * 3 + 1].toFixed(4)} ${s.nor[i * 3 + 2].toFixed(4)}\n`);
        for (let i = 0; i < s.idx.length; i += 3) { const a = s.idx[i] + 1, b = s.idx[i + 1] + 1, c = s.idx[i + 2] + 1; out.push(`f ${a}//${a} ${b}//${b} ${c}//${c}\n`) }
        dlF(fn + '.obj', new Blob(out)); hideExp() };
      xSTL = function () { const s = smoothExport(); if (!s) return s0(); const nt = s.idx.length / 3, buf = new ArrayBuffer(84 + nt * 50), dv = new DataView(buf); new Uint8Array(buf).set(new TextEncoder().encode('VoxoB smooth STL'), 0); dv.setUint32(80, nt, true);
        for (let t = 0, o = 84; t < nt; t++) { const v = [0, 1, 2].map(j => s.idx[t * 3 + j] * 3), p = (q, k) => s.pos[q + k], ux = p(v[1], 0) - p(v[0], 0), uy = p(v[1], 1) - p(v[0], 1), uz = p(v[1], 2) - p(v[0], 2), wx = p(v[2], 0) - p(v[0], 0), wy = p(v[2], 1) - p(v[0], 1), wz = p(v[2], 2) - p(v[0], 2);
          let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1; [nx / l, ny / l, nz / l].forEach((q, k) => dv.setFloat32(o + k * 4, q, true)); o += 12;
          for (const q of v) { for (let k = 0; k < 3; k++) dv.setFloat32(o + k * 4, s.pos[q + k], true); o += 12 } dv.setUint16(o, 0, true); o += 2 }
        dlF(exFn() + '.stl', buf, 'model/stl'); hideExp() };
      xGLB = function () { const s = smoothExport(); if (!s) return g0(); const n = s.pos.length / 3, ca = s.col.map(lin), mn = [0, 1, 2].map(k => { let m = Infinity; for (let i = k; i < s.pos.length; i += 3) m = Math.min(m, s.pos[i]); return m }), mx = [0, 1, 2].map(k => { let m = -Infinity; for (let i = k; i < s.pos.length; i += 3) m = Math.max(m, s.pos[i]); return m });
        const parts = [Float32Array.from(s.pos), Float32Array.from(s.nor), Float32Array.from(ca), Uint32Array.from(s.idx)], views = []; let off = 0; parts.forEach((a, i) => { views.push({ buffer: 0, byteOffset: off, byteLength: a.byteLength, target: i === 3 ? 34963 : 34962 }); off += a.byteLength });
        const g = { asset: { version: '2.0', generator: 'VoxoB smooth' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, mode: 4, material: 0 }] }], materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: .7 } }],
          accessors: [{ bufferView: 0, componentType: 5126, count: n, type: 'VEC3', min: mn, max: mx }, { bufferView: 1, componentType: 5126, count: n, type: 'VEC3' }, { bufferView: 2, componentType: 5126, count: n, type: 'VEC3' }, { bufferView: 3, componentType: 5125, count: s.idx.length, type: 'SCALAR' }], bufferViews: views, buffers: [{ byteLength: off }] };
        const jb = new TextEncoder().encode((() => { const js = JSON.stringify(g); return js + ' '.repeat((4 - js.length % 4) % 4) })()), tl = 28 + jb.length + off, glb = new ArrayBuffer(tl), dv = new DataView(glb), u8 = new Uint8Array(glb);
        dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, tl, true); dv.setUint32(12, jb.length, true); dv.setUint32(16, 0x4E4F534A, true); u8.set(jb, 20); const bo = 20 + jb.length; dv.setUint32(bo, off, true); dv.setUint32(bo + 4, 0x004E4942, true);
        let q = bo + 8; parts.forEach(a => { u8.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), q); q += a.byteLength }); dlF(exFn() + '.glb', glb, 'model/gltf-binary'); hideExp() };
    }
    window.VoxoBSmooth = { get on() { return on }, set: setSmooth, surface, smoothExport };
  })();
