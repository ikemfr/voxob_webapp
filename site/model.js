  // ===== VoxoB Model: 3D files → voxels (OBJ + MTL + textures, STL text / binary, glTF / GLB) =====
  // Every triangle is filled (not just its corners), the inside of closed shapes is filled too, and colours come from
  // textures, vertex colours or materials. Parsed here, in the browser; nothing is uploaded.
  (() => {
    const lin2srgb = (u) => u <= .0031308 ? u * 12.92 : 1.055 * Math.pow(u, 1 / 2.4) - .055;
    const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    async function imgData(blobOrUrl) {
      const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl), im = new Image(); im.src = url;
      try { await im.decode() } catch (e) { return null } finally { if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000) }
      const c = document.createElement('canvas'); c.width = Math.min(1024, im.naturalWidth); c.height = Math.min(1024, im.naturalHeight);
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, c.width, c.height); return { w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data };
    }
    const sampleTex = (t, u, v) => { u -= Math.floor(u); v -= Math.floor(v); const x = Math.min(t.w - 1, Math.floor(u * t.w)), y = Math.min(t.h - 1, Math.floor(v * t.h)), i = (y * t.w + x) * 4; return [t.d[i], t.d[i + 1], t.d[i + 2], t.d[i + 3]] };

    const corner = [];   // OBJ: the vertex index of each triangle corner (for per-vertex colours)
    // a mesh here: { pos: Float32Array (xyz per corner, 3 corners per triangle), col: (corner) => [r,g,b] 0–255 | null }
    // ---------- OBJ (+ MTL, + textures picked together) ----------
    async function parseOBJ(text, files) {
      const mtl = {}, byName = new Map(files.map(f => [f.name.toLowerCase(), f]));
      for (const f of files) if (/\.mtl$/i.test(f.name)) { let cur = null; for (const l of (await f.text()).split(/\r?\n/)) { const p = l.trim().split(/\s+/); if (p[0] === 'newmtl') { cur = p.slice(1).join(' '); mtl[cur] = {} } else if (cur && p[0] === 'Kd') mtl[cur].kd = [+p[1] * 255, +p[2] * 255, +p[3] * 255]; else if (cur && p[0] === 'map_Kd') mtl[cur].map = p[p.length - 1].split(/[\\/]/).pop().toLowerCase() } }
      for (const m of Object.values(mtl)) if (m.map && byName.has(m.map)) m.tex = await imgData(byName.get(m.map));
      const V = [], T = [], C = [], pos = [], uv = [], mat = [];
      let cur = null;
      for (const l of text.split(/\r?\n/)) {
        const p = l.trim().split(/\s+/);
        if (p[0] === 'v') { V.push([+p[1], +p[2], +p[3]]); C.push(p.length >= 7 ? [+p[4] * 255, +p[5] * 255, +p[6] * 255] : null) }
        else if (p[0] === 'vt') T.push([+p[1], +(p[2] || 0)]);
        else if (p[0] === 'usemtl') cur = p.slice(1).join(' ');
        else if (p[0] === 'f') {
          const idx = p.slice(1).map(q => { const [a, b] = q.split('/'); const vi = +a, ti = +b; return [vi < 0 ? V.length + vi : vi - 1, b ? (ti < 0 ? T.length + ti : ti - 1) : -1] });
          for (let k = 1; k + 1 < idx.length; k++) for (const [vi, ti] of [idx[0], idx[k], idx[k + 1]]) { const v = V[vi] || [0, 0, 0]; pos.push(v[0], v[1], v[2]); uv.push(ti >= 0 && T[ti] ? T[ti] : null); mat.push(cur); corner.push(vi) }
        }
      }
      return { pos: Float32Array.from(pos), col: (i) => { const m = mtl[mat[i]]; if (C[corner[i]]) return C[corner[i]]; return m && m.kd ? m.kd : null },
        tex: (t) => { const m = mtl[mat[t * 3]], a = uv[t * 3], b = uv[t * 3 + 1], c = uv[t * 3 + 2]; return m && m.tex && a && b && c ? { img: m.tex, uv: [a[0], 1 - a[1], b[0], 1 - b[1], c[0], 1 - c[1]], f: [1, 1, 1] } : null } };
    }
    // ---------- STL, text or binary ----------
    function parseSTL(buf) {
      const dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
      if (buf.byteLength === 84 + n * 50 && n > 0) {   // binary
        const pos = new Float32Array(n * 9); for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) pos[t * 9 + k] = dv.getFloat32(84 + t * 50 + 12 + k * 4, true);
        return { pos, col: () => null, tex: () => null };
      }
      const pos = []; for (const m of new TextDecoder().decode(buf).matchAll(/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g)) pos.push(+m[1], +m[2], +m[3]);
      return { pos: Float32Array.from(pos), col: () => null, tex: () => null };
    }
    // ---------- glTF 2.0 (.glb, or .gltf with embedded or picked buffers) ----------
    async function parseGLTF(buf, files, isGlb) {
      let json, bin = null;
      if (isGlb) { const dv = new DataView(buf); let o = 12; while (o < buf.byteLength) { const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true); if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o + 8, len))); else if (type === 0x004E4942) bin = buf.slice(o + 8, o + 8 + len); o += 8 + len } }
      else json = JSON.parse(new TextDecoder().decode(buf));
      const byName = new Map(files.map(f => [f.name.toLowerCase(), f]));
      const buffers = await Promise.all((json.buffers || []).map(async (b, i) => {
        if (!b.uri) return bin; if (b.uri.startsWith('data:')) return (await fetch(b.uri)).arrayBuffer();
        const f = byName.get(decodeURIComponent(b.uri).split('/').pop().toLowerCase()); return f ? f.arrayBuffer() : null }));
      const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
      const acc = (i) => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView], b = buffers[bv.buffer]; if (!b) throw new Error('missing buffer');
        const comp = N[a.type], T = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType], bs = T.BYTES_PER_ELEMENT, stride = bv.byteStride || comp * bs, out = new Float32Array(a.count * comp), dv = new DataView(b, (bv.byteOffset || 0) + (a.byteOffset || 0));
        const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType], div = a.normalized ? { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType] || 1 : 1;
        for (let k = 0; k < a.count; k++) for (let c = 0; c < comp; c++) out[k * comp + c] = dv[get](k * stride + c * bs, true) / div;
        return { out, comp } };
      const texCache = new Map(); async function tex(ti) { if (texCache.has(ti)) return texCache.get(ti); const im = json.images[json.textures[ti].source]; let data = null;
        if (im.bufferView !== undefined) { const bv = json.bufferViews[im.bufferView]; data = await imgData(new Blob([new Uint8Array(buffers[bv.buffer], bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType })) }
        else if (im.uri) { const f = im.uri.startsWith('data:') ? im.uri : byName.get(decodeURIComponent(im.uri).split('/').pop().toLowerCase()); if (f) data = await imgData(f) }
        texCache.set(ti, data); return data }
      const pos = [], cols = [], texs = [];
      const mul = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
      const mm = (a, b) => { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o };
      const local = (nd) => { if (nd.matrix) return nd.matrix; const [x, y, z, w] = nd.rotation || [0, 0, 0, 1], [sx, sy, sz] = nd.scale || [1, 1, 1], [tx, ty, tz] = nd.translation || [0, 0, 0];
        return [(1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0, (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0, (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1] };
      async function visit(ni, M) {
        const nd = json.nodes[ni], W = mm(M, local(nd));
        if (nd.mesh !== undefined) for (const pr of json.meshes[nd.mesh].primitives) {
          if ((pr.mode ?? 4) !== 4 || pr.attributes.POSITION === undefined) continue;
          const P = acc(pr.attributes.POSITION).out, C0 = pr.attributes.COLOR_0 !== undefined ? acc(pr.attributes.COLOR_0) : null, UV = pr.attributes.TEXCOORD_0 !== undefined ? acc(pr.attributes.TEXCOORD_0).out : null;
          const I = pr.indices !== undefined ? acc(pr.indices).out : Float32Array.from({ length: P.length / 3 }, (_, k) => k);
          const mat = pr.material !== undefined ? json.materials[pr.material] : null, pbr = mat && mat.pbrMetallicRoughness || {}, f = pbr.baseColorFactor || [1, 1, 1, 1];
          const tx = pbr.baseColorTexture && UV ? await tex(pbr.baseColorTexture.index) : null;
          for (let q = 0; q + 2 < I.length; q += 3) {
            for (const k of [I[q], I[q + 1], I[q + 2]]) {
              const p = mul(W, [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]]); pos.push(p[0], p[1], p[2]);
              let c = [f[0], f[1], f[2]].map(v => lin2srgb(v) * 255);
              if (C0) { const o = k * C0.comp; c = [C0.out[o], C0.out[o + 1], C0.out[o + 2]].map((v, j) => lin2srgb(v * f[j]) * 255) }
              cols.push(mat || C0 ? c : null);
            }
            texs.push(tx ? { img: tx, uv: [UV[I[q] * 2], UV[I[q] * 2 + 1], UV[I[q + 1] * 2], UV[I[q + 1] * 2 + 1], UV[I[q + 2] * 2], UV[I[q + 2] * 2 + 1]], f: [f[0], f[1], f[2]] } : null);
          }
        }
        for (const ch of nd.children || []) await visit(ch, W);
      }
      const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], sc = json.scenes ? json.scenes[json.scene || 0] : { nodes: json.nodes.map((_, i) => i) };
      for (const ni of sc.nodes) await visit(ni, I4);
      return { pos: Float32Array.from(pos), col: (i) => cols[i], tex: (t) => texs[t] };
    }
    async function parse(files) {
      files = [...files]; const main = files.find(f => /\.(glb|gltf|obj|stl)$/i.test(f.name)); if (!main) return null;
      const ext = main.name.toLowerCase().split('.').pop(), buf = await main.arrayBuffer();
      if (ext === 'stl') return parseSTL(buf);
      if (ext === 'obj') { corner.length = 0; return parseOBJ(new TextDecoder().decode(buf), files) }
      return parseGLTF(buf, files, ext === 'glb');
    }

    // ---------- triangles → voxels ----------
    // the longest side becomes R cells; Y is up (glTF, most OBJ); surfaces are sampled at under half a cell, then the inside is filled
    function voxelize(mesh, R, fallback) {
      const P = mesh.pos, nt = P.length / 9; if (!nt) return null;
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]) }
      const span = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) || 1, k = (R - 1) / span;
      const W = Math.max(1, Math.ceil((mx[0] - mn[0]) * k) + 1), H = Math.max(1, Math.ceil((mx[1] - mn[1]) * k) + 1), D = Math.max(1, Math.ceil((mx[2] - mn[2]) * k) + 1);
      const cell = new Map(), key = (x, y, z) => (x * H + y) * D + z, fb = fallback.match(/\w\w/g).map(h => parseInt(h, 16));
      for (let t = 0; t < nt; t++) {
        const a = [(P[t * 9] - mn[0]) * k, (P[t * 9 + 1] - mn[1]) * k, (P[t * 9 + 2] - mn[2]) * k], b = [(P[t * 9 + 3] - mn[0]) * k, (P[t * 9 + 4] - mn[1]) * k, (P[t * 9 + 5] - mn[2]) * k], c = [(P[t * 9 + 6] - mn[0]) * k, (P[t * 9 + 7] - mn[1]) * k, (P[t * 9 + 8] - mn[2]) * k];
        const ca = mesh.col(t * 3) || fb, cb = mesh.col(t * 3 + 1) || fb, cc = mesh.col(t * 3 + 2) || fb, tx = mesh.tex(t);   // a texture is sampled at every point, not just the corners
        const L = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]), Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2])), s = Math.max(1, Math.ceil(L * 2.2));
        for (let i = 0; i <= s; i++) for (let j = 0; j <= s - i; j++) {
          const u = i / s, v = j / s, w = 1 - u - v, x = Math.min(W - 1, Math.round(a[0] * w + b[0] * u + c[0] * v)), y = Math.min(H - 1, Math.round(a[1] * w + b[1] * u + c[1] * v)), z = Math.min(D - 1, Math.round(a[2] * w + b[2] * u + c[2] * v));
          const q = key(x, y, z); let e = cell.get(q); if (!e) { e = [0, 0, 0, 0]; cell.set(q, e) }
          if (tx) { const uv = tx.uv, s2 = sampleTex(tx.img, uv[0] * w + uv[2] * u + uv[4] * v, uv[1] * w + uv[3] * u + uv[5] * v); if (s2[3] < 40) continue; e[0] += s2[0] * tx.f[0]; e[1] += s2[1] * tx.f[1]; e[2] += s2[2] * tx.f[2]; e[3]++; continue }
          e[0] += ca[0] * w + cb[0] * u + cc[0] * v; e[1] += ca[1] * w + cb[1] * u + cc[1] * v; e[2] += ca[2] * w + cb[2] * u + cc[2] * v; e[3]++;
        }
      }
      // fill the inside: everything the outside air cannot reach
      const n = W * H * D, solid = n <= 8e6, air = solid ? new Uint8Array(n) : null;
      if (solid) { const st = []; const push = (x, y, z) => { if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D) return; const q = key(x, y, z); if (air[q] || cell.has(q)) return; air[q] = 1; st.push(q) };
        for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { push(x, y, 0); push(x, y, D - 1) } for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { push(x, 0, z); push(x, H - 1, z) } for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) { push(0, y, z); push(W - 1, y, z) }
        while (st.length) { const q = st.pop(), z = q % D, y = ((q - z) / D) % H, x = (q - z - y * D) / D / H; push(x + 1, y, z); push(x - 1, y, z); push(x, y + 1, z); push(x, y - 1, z); push(x, y, z + 1); push(x, y, z - 1) } }
      const vox = [], avg = (e) => e[3] ? toHex(e[0] / e[3], e[1] / e[3], e[2] / e[3]) : toHex(...fb);
      cell.forEach((e, q) => { const z = q % D, y = ((q - z) / D) % H, x = (q - z - y * D) / D / H; vox.push([x, y, z, avg(e), y / H]) });
      if (solid) { let inside = 0; for (let q = 0; q < n; q++) if (!air[q] && !cell.has(q)) inside++;
        if (inside && inside + vox.length < 1.5e6) for (let q = 0; q < n; q++) if (!air[q] && !cell.has(q)) { const z = q % D, y = ((q - z) / D) % H, x = (q - z - y * D) / D / H; vox.push([x, y, z, '#5a5550', y / H]) } }
      return { W, H, D, vox, triangles: nt };
    }
    // a picture of the model as loaded (for "before" in Shorts): its own small renderer, thrown away afterwards
    function snapshot(mesh, size = 640) {
      const g = new THREE.BufferGeometry(), n = mesh.pos.length / 3, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const c = mesh.col(i) || [190, 190, 196]; col[i * 3] = c[0] / 255; col[i * 3 + 1] = c[1] / 255; col[i * 3 + 2] = c[2] / 255 }
      g.setAttribute('position', new THREE.BufferAttribute(mesh.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); g.computeBoundingSphere();
      const sc = new THREE.Scene(); sc.add(new THREE.AmbientLight(0xffffff, .6)); const dl = new THREE.DirectionalLight(0xffffff, .7); dl.position.set(1, 2, 1.5); sc.add(dl);
      sc.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
      const bs = g.boundingSphere, cm = new THREE.PerspectiveCamera(35, 1, bs.radius * .05, bs.radius * 20); cm.position.copy(bs.center).add(new THREE.Vector3(1, .6, 1.4).normalize().multiplyScalar(bs.radius * 3.2)); cm.lookAt(bs.center);
      const cv = document.createElement('canvas'); cv.width = cv.height = size; const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setClearColor(0xf2f3f5, 1); r.render(sc, cm);
      const out = document.createElement('canvas'); out.width = out.height = size; out.getContext('2d').drawImage(cv, 0, 0); g.dispose(); r.dispose(); r.forceContextLoss(); return out;
    }
    window.VoxoBModel = { parse, voxelize, parseSTL, snapshot };
  })();
