  // ===== VoxoB+ : more generators, grouped generator panel, palettes, Next move, styles, autosave =====
  // (kept in its own script block; it wraps a few functions of the main script instead of editing them in place)
  (() => {
    const L = {
      en: {
        next: '✨ Next move', nextTip: 'Next move (N): adds the next sensible step\nto what you have — ground, roof, windows,\ntrees, shading… Undo with Ctrl+Z',
        cats: { build: 'Buildings', things: 'Things', nature: 'Nature', geo: 'Shapes', pattern: 'Patterns' }, luck: '🎲 Surprise me',
        pal: 'Palette', pals: { def: 'Default', wa: 'Japanese', pico: 'Retro 16', gb: 'Handheld 4', pastel: 'Pastel', earth: 'Earth' },
        styleT: 'STYLE', styles: { wa: '🏯 Japanese', retro: '👾 Retro', pastel: '🍬 Pastel', night: '🌙 Night', autumn: '🍁 Autumn', mono: '⬛ Mono' },
        styleDone: (n) => `Style changed (${n} voxels). Ctrl+Z to undo.`,
        steps: {
          empty: ['Start with a building', 'An empty canvas: here is something to work from.'],
          ground: ['Add ground', 'Things look placed once they stand on something.'],
          roof: ['Put on a roof', 'A flat top reads as unfinished; a roof gives it a silhouette.'],
          windows: ['Add windows', 'Regular openings show the scale of a wall.'],
          trees: ['Plant trees', 'Small things around a big one make it look bigger.'],
          shade: ['Add shading', 'Lighter tops and darker undersides make the form readable.'],
          outline: ['Darken the edges', 'Darker corners separate the shape from the background.'],
          done: ['That is everything for now', 'Change the shape or generate something new, and there will be more ideas.'],
        },
        gn: { house: 'House', tree: 'Tree', torii: 'Torii', pagoda: 'Pagoda', rocket: 'Rocket', snowman: 'Snowman', planet: 'Planet', robot: 'Robot', boat: 'Boat', lighthouse: 'Lighthouse', cactus: 'Cactus' },
      },
      ja: {
        next: '✨ 次の一手', nextTip: '次の一手（N）：今の作品に合う次の工程を\nひとつ足します（地面・屋根・窓・木・陰影など）\nCtrl+Z で取り消し',
        cats: { build: '建物', things: 'もの', nature: '自然', geo: '図形', pattern: '模様' }, luck: '🎲 おまかせ',
        pal: '配色', pals: { def: '標準', wa: '和色', pico: 'レトロ16色', gb: '携帯ゲーム4色', pastel: 'パステル', earth: 'アース' },
        styleT: 'スタイル変換', styles: { wa: '🏯 和風', retro: '👾 レトロ', pastel: '🍬 パステル', night: '🌙 夜', autumn: '🍁 秋', mono: '⬛ モノクロ' },
        styleDone: (n) => `スタイルを変えました（${n}個）。Ctrl+Z で戻せます。`,
        steps: {
          empty: ['建物から始める', 'まっさらなので、手がかりになる形を置きました。'],
          ground: ['地面を敷く', '何かの上に立つと「置かれている」感じが出ます。'],
          roof: ['屋根を載せる', '平らな上面は未完成に見えがち。屋根で輪郭がはっきりします。'],
          windows: ['窓を付ける', '規則的な窓があると、壁の大きさが伝わります。'],
          trees: ['木を植える', '大きなものの周りに小さなものを置くと、より大きく見えます。'],
          shade: ['陰影をつける', '上を明るく、下を暗くすると立体感が出ます。'],
          outline: ['角を締める', '角を少し暗くすると、背景から形が浮きます。'],
          done: ['今の提案はここまで', '形を変えたり新しく生成したりすると、また提案します。'],
        },
        gn: { house: '家', tree: '木', torii: '鳥居', pagoda: '五重塔', rocket: 'ロケット', snowman: '雪だるま', planet: '惑星', robot: 'ロボット', boat: '帆船', lighthouse: '灯台', cactus: 'サボテン' },
      },
    };
    const t = (k) => (L[lang] || L.en)[k];

    // ---------- small helpers ----------
    const keys = () => Object.keys(V());
    const inB = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D;
    const has = (x, y, z) => !!V()[vk(x, y, z)];
    const shade = (c, dl, ds = 0, dh = 0) => { const [h, s, l] = hex2hsl(c); return hsl2hex(h + dh, s + ds, l + dl) };
    function bbox() { let b = null; for (const k of keys()) { const [x, y, z] = pv_(k); if (!b) b = { x0: x, x1: x, y0: y, y1: y, z0: z, z1: z }; else { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z) } } return b }
    function commit(acts, msg) { acts = acts.filter(Boolean); if (!acts.length) return 0; pU(acts); rebMesh(); d2D(); uCnt(); if (msg) toast(msg); return acts.length }
    let tT = 0;
    function toast(m, sub) {
      let el = $('vxToast'); if (!el) { el = document.createElement('div'); el.id = 'vxToast'; document.body.appendChild(el) }
      el.innerHTML = ''; const b = document.createElement('b'); b.textContent = m; el.appendChild(b); if (sub) { const s = document.createElement('span'); s.textContent = sub; el.appendChild(s) }
      el.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => el.classList.remove('on'), sub ? 4200 : 2600);
    }

    // ---------- undo for Generate, and autosave ----------
    const _gen = gen;
    gen = function (id) {
      const before = Object.entries(V()).map(([k, v]) => { const [x, y, z] = pv_(k); return { t: 's', x, y, z, p: { ...v }, n: null } });
      const n0 = undoSt.length;
      if (NEW[id]) { keys().forEach(k => { const [x, y, z] = pv_(k); delV(x, y, z) }); const a = []; NEW[id]((x, y, z, c) => { if (inB(x, y, z)) { const r = setV(x, y, z, c, 255); if (r) a.push(r) } }); pU(a); d2D(); uCnt() }
      else _gen(id);
      // the clear at the start of Generate was not undoable: put it in front of the new step
      if (before.length) { if (undoSt.length > n0) undoSt[undoSt.length - 1].a = [...before, ...undoSt[undoSt.length - 1].a]; else pU(before) }
      nm.done.clear(); schedSave();
    };
    let sT = 0; function schedSave() { clearTimeout(sT); sT = setTimeout(autoSave, 700) }
    const _pU = pU; pU = function (a) { _pU(a); schedSave() };
    const _undo = undo; undo = function () { _undo(); schedSave() };
    const _redo = redo; redo = function () { _redo(); schedSave() };
    addEventListener('pagehide', autoSave); document.addEventListener('visibilitychange', () => { if (document.hidden) autoSave() });

    // ---------- new generators ----------
    const NEW = {
      house(s) {
        const w = Math.max(5, Math.min(W - 4, 11)), d = Math.max(5, Math.min(D - 4, 9)), h = Math.max(3, Math.min(H - Math.ceil(d / 2) - 2, 5));
        const x0 = Math.floor((W - w) / 2), z0 = Math.floor((D - d) / 2);
        for (let y = 0; y < h; y++) for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) { const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1; if (!edge && y > 0) continue; let c = y === 0 ? '#9a8f80' : '#e9dcc0'; if ((x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1) && (x === x0 || x === x0 + w - 1) && (z === z0 || z === z0 + d - 1)) c = '#a0764a'; s(x, y, z, c) }
        const dx = x0 + Math.floor(w / 2); s(dx, 1, z0, '#6b4226'); s(dx, 2, z0, '#6b4226');
        for (let x = x0 + 2; x < x0 + w - 2; x += 3) if (Math.abs(x - dx) > 1) { s(x, 2, z0, '#9fd8ff'); s(x, 2, z0 + d - 1, '#9fd8ff') }
        for (let z = z0 + 2; z < z0 + d - 2; z += 3) { s(x0, 2, z, '#9fd8ff'); s(x0 + w - 1, 2, z, '#9fd8ff') }
        for (let i = 0; i <= Math.ceil(d / 2); i++) for (let x = x0 - 1; x <= x0 + w; x++) { s(x, h + i, z0 - 1 + i, '#b33a2e'); s(x, h + i, z0 + d - i, '#b33a2e'); if (i > 0) { s(x, h + i - 1, z0 - 1 + i, '#9c3026'); s(x, h + i - 1, z0 + d - i, '#9c3026') } if (i > 0 && (x === x0 || x === x0 + w - 1)) for (let z = z0 + i; z < z0 + d - i; z++) s(x, h + i - 1, z, '#e9dcc0') }
        s(x0 + w - 3, h + Math.ceil(d / 2), z0 + 2, '#7a6a5a'); s(x0 + w - 3, h + Math.ceil(d / 2) + 1, z0 + 2, '#7a6a5a');
      },
      tree(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2), th = Math.max(3, Math.floor(H * 0.35)), r = Math.max(2, Math.min(W, D, H) / 4);
        for (let y = 0; y < th; y++) { s(cx, y, cz, '#7a4b24'); if (y < 2) { s(cx + 1, y, cz, '#6a4020'); s(cx, y, cz + 1, '#6a4020') } }
        const cy = th + r * 0.7; for (let x = 0; x < W; x++) for (let y = th - 1; y < H; y++) for (let z = 0; z < D; z++) { const dd = Math.hypot(x - cx, (y - cy) * 1.15, z - cz) + Math.sin(x * 1.7 + z * 2.3 + y) * 0.45; if (dd <= r) s(x, y, z, dd < r - 1.2 ? '#2f7d3b' : (y > cy ? '#5cb85a' : '#3f9e4a')) }
      },
      torii(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2), sp = Math.max(3, Math.min(Math.floor(W / 2) - 2, 5)), h = Math.max(5, Math.min(H - 3, 11));
        for (let y = 0; y < h; y++) { s(cx - sp, y, cz, '#d23a2a'); s(cx + sp, y, cz, '#d23a2a') } s(cx - sp, 0, cz, '#222'); s(cx + sp, 0, cz, '#222');
        for (let x = cx - sp - 1; x <= cx + sp + 1; x++) s(x, h - 3, cz, '#d23a2a');
        for (let x = cx - sp - 2; x <= cx + sp + 2; x++) { s(x, h - 1, cz, '#d23a2a'); s(x, h, cz, '#222') } s(cx - sp - 3, h + 1, cz, '#222'); s(cx + sp + 3, h + 1, cz, '#222');
        s(cx, h - 2, cz, '#d23a2a');
      },
      pagoda(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2); let y = 0, r = Math.max(2, Math.min(Math.floor(Math.min(W, D) / 2) - 2, 5));
        for (let x = cx - r - 1; x <= cx + r + 1; x++) for (let z = cz - r - 1; z <= cz + r + 1; z++) s(x, 0, z, '#8a8a8a'); y = 1;
        while (r >= 1 && y + 3 < H) {
          for (let k = 0; k < 2; k++, y++) for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) === r) s(x, y, z, k === 1 && (x === cx || z === cz) ? '#f0e0b0' : '#c8352b');
          for (let x = cx - r - 1; x <= cx + r + 1; x++) for (let z = cz - r - 1; z <= cz + r + 1; z++) s(x, y, z, '#3a3a44'); y++; r--;
        }
        for (let k = 0; k < 3 && y < H; k++, y++) s(cx, y, cz, '#c9a227');
      },
      rocket(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2), r = Math.max(1.5, Math.min(W, D) / 6), h = Math.max(8, H - 2), nose = Math.ceil(r * 2.2);
        for (let y = 2; y < h; y++) { const rr = y >= h - nose ? r * (h - y) / nose : r; for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (Math.hypot(x - cx, z - cz) <= rr) s(x, y, z, y >= h - nose ? '#e03a3a' : ((y - 2) % 6 === 3 ? '#c9ced8' : '#f2f2f5')) }
        const wy = Math.floor(h * 0.6); s(cx, wy, cz - Math.ceil(r), '#4aa8ff'); s(cx, wy + 1, cz - Math.ceil(r), '#4aa8ff');
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 1; i <= Math.ceil(r) + 2; i++) for (let y = 2; y < 2 + Math.max(1, 5 - i); y++) s(cx + dx * i, y, cz + dz * i, '#e03a3a');
        s(cx, 1, cz, '#ffb02e'); s(cx, 0, cz, '#ffe36b');
      },
      snowman(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2), u = Math.max(1.5, Math.min(W, D, H) / 8); let y0 = 0; const balls = [u * 2, u * 1.5, u * 1.1]; const cs = [];
        for (const r of balls) { const cy = y0 + r; cs.push(cy); for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) if (Math.hypot(x - cx, y - cy, z - cz) <= r) s(x, y, z, '#f4f7fb'); y0 += r * 1.8 }
        const hy = Math.round(cs[2]), fz = Math.round(cz - balls[2]); s(cx - 1, hy + 1, fz, '#222'); s(cx + 1, hy + 1, fz, '#222'); s(cx, hy, fz - 1, '#ff8a1f'); s(cx, hy, fz, '#ff8a1f');
        for (let i = -1; i <= 1; i++) s(cx + i, Math.round(cs[1]), Math.round(cz - balls[1]), '#333');
        const top = Math.round(y0 - balls[2] * 0.8 + balls[2]); for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) { s(x, top, z, '#2a2a33'); s(x, top + 1, z, '#2a2a33') }
      },
      planet(s) {
        const cx = (W - 1) / 2, cy = (H - 1) / 2, cz = (D - 1) / 2, r = Math.min(W, H, D) / 4, hue = Math.random() * 360;
        for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) { const dd = Math.hypot(x - cx, y - cy, z - cz); if (dd <= r) s(x, y, z, hsl2hex(hue + Math.sin(y * 1.3) * 18, 55, 45 + 10 * Math.sin(y * 0.9 + x * 0.2))); const ry = (y - cy) - (x - cx) * 0.35, rd = Math.hypot(x - cx, z - cz); if (Math.abs(ry) < 0.6 && rd > r * 1.35 && rd < r * 1.9) s(x, y, z, hsl2hex(hue + 40, 35, 70)) }
      },
      robot(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2), u = Math.max(1, Math.floor(Math.min(W, D, H) / 8)), box = (x0, y0, z0, w, h, d, c) => { for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) for (let z = z0; z < z0 + d; z++) s(x, y, z, c) };
        box(cx - 2 * u, 0, cz - u, u, 3 * u, 2 * u, '#5a6270'); box(cx + u, 0, cz - u, u, 3 * u, 2 * u, '#5a6270');
        box(cx - 2 * u, 3 * u, cz - u, 4 * u, 3 * u, 2 * u, '#9aa4b2'); box(cx - u, 4 * u, cz - u - 1, 2 * u, u, 1, '#ffcc33');
        box(cx - 3 * u, 3 * u, cz - Math.ceil(u / 2), u, 3 * u, u, '#7d8794'); box(cx + 2 * u, 3 * u, cz - Math.ceil(u / 2), u, 3 * u, u, '#7d8794');
        box(cx - u - Math.ceil(u / 2), 6 * u, cz - u, 3 * u, 2 * u, 2 * u, '#c3cbd6'); s(cx - u, 7 * u, cz - u - 1, '#33e0ff'); s(cx + u - 1, 7 * u, cz - u - 1, '#33e0ff');
        for (let y = 8 * u; y < 8 * u + 2; y++) s(cx, y, cz, '#c3cbd6'); s(cx, 8 * u + 2, cz, '#ff4466');
      },
      boat(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2), L2 = Math.max(4, Math.floor(W / 2) - 1), bw = Math.max(2, Math.floor(D / 6));
        for (let y = 0; y < 3; y++) for (let x = cx - L2 + (2 - y); x <= cx + L2 - (2 - y) + (y === 2 ? 1 : 0); x++) { const ww = bw - (2 - y) * 0.5; for (let z = Math.round(cz - ww); z <= Math.round(cz + ww); z++) s(x, y, z, y === 2 ? '#c89a5a' : '#8a5a2b') }
        const mh = Math.max(6, Math.min(H - 2, 12)); for (let y = 3; y < 3 + mh; y++) s(cx, y, cz, '#5a3a1a');
        for (let i = 0; i < mh - 2; i++) for (let x = cx + 1; x <= cx + 1 + Math.floor((mh - 2 - i) * 0.7); x++) s(x, 4 + i, cz, i % 4 === 1 ? '#e8e2d6' : '#fbf8f2');
        s(cx, 3 + mh, cz, '#e03a3a'); s(cx + 1, 3 + mh, cz, '#e03a3a');
      },
      lighthouse(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2), h = Math.max(8, H - 4), r0 = Math.max(2, Math.min(W, D) / 5);
        for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (Math.hypot(x - cx, z - cz) <= r0 + 2) s(x, 0, z, '#7d7a72');
        for (let y = 1; y < h; y++) { const rr = r0 - (y / h) * r0 * 0.4; for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { const dd = Math.hypot(x - cx, z - cz); if (dd <= rr && dd > rr - 1.2) s(x, y, z, Math.floor(y / 3) % 2 ? '#d8312b' : '#f5f5f2') } }
        for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) { s(x, h, z, '#ffe36b'); s(x, h + 1, z, '#ffe36b'); s(x, h + 2, z, '#333') } s(cx, h + 3, cz, '#333');
      },
      cactus(s) {
        const cx = Math.floor(W / 2), cz = Math.floor(D / 2), h = Math.max(6, Math.floor(H * 0.75));
        for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 2; z <= cz + 2; z++) for (let y = 0; y < 2; y++) if (Math.abs(x - cx) + Math.abs(z - cz) <= 3) s(x, y, z, y ? '#b8673a' : '#9a5530');
        for (let y = 2; y < h; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) s(cx + dx, y, cz + dz, (y + dx) % 3 ? '#3e9a4a' : '#2f7d3b');
        const a1 = Math.floor(h * 0.45), a2 = Math.floor(h * 0.6);
        for (let i = 1; i <= 3; i++) s(cx - i, a1, cz, '#3e9a4a'); for (let y = a1; y < a1 + 4; y++) s(cx - 3, y, cz, '#3e9a4a');
        for (let i = 2; i <= 4; i++) s(cx + i, a2, cz + 1, '#3e9a4a'); for (let y = a2; y < a2 + 3; y++) s(cx + 4, y, cz + 1, '#3e9a4a');
        s(cx, h, cz, '#ff7eb6'); s(cx + 1, h, cz + 1, '#ff7eb6');
      },
    };
    const NEW_I = { house: '🏠', tree: '🌳', torii: '⛩', pagoda: '🏯', rocket: '🚀', snowman: '⛄', planet: '🪐', robot: '🤖', boat: '⛵', lighthouse: '🗼', cactus: '🌵' };
    Object.keys(NEW).forEach(id => { GENS.push({ id, i: NEW_I[id] }); GN.en[id] = L.en.gn[id]; GN.ja[id] = L.ja.gn[id] });
    const CAT = {
      build: ['house', 'castle', 'city', 'temple', 'pagoda', 'torii', 'bridge', 'lighthouse'],
      things: ['rocket', 'robot', 'boat', 'snowman', 'heart', 'gears', 'dna', 'mushroom'],
      nature: ['tree', 'forest', 'cactus', 'terrain', 'mountain', 'island', 'cave', 'crystal', 'wave', 'planet', 'galaxy'],
      geo: ['sphere', 'torus', 'cylinder', 'cone', 'pyramid', 'octahedron', 'diamond', 'cross', 'star', 'spiral', 'helix', 'mobius', 'knot', 'rings', 'steps'],
      pattern: ['ripple', 'grid', 'checkerP', 'honeycomb', 'voronoi', 'fractal', 'maze', 'random'],
    };
    // grouped generator panel with a "surprise me" button
    buildGen = function () {
      const g = $('gnG'); g.innerHTML = ''; g.classList.add('gcat');
      const luck = document.createElement('button'); luck.className = 'gb gluck'; luck.textContent = t('luck');
      luck.onclick = () => { const pool = [...CAT.build, ...CAT.things, ...CAT.nature]; gen(pool[Math.floor(Math.random() * pool.length)]); resetCam(); snd('gen') }; g.appendChild(luck);
      const seen = new Set();
      const add = (id, box) => { const d = GENS.find(x => x.id === id); if (!d || seen.has(id)) return; seen.add(id); const b = document.createElement('button'); b.className = 'gb'; b.innerHTML = `<span class="gi">${d.i}</span>${String((GN[lang] || GN.en)[id] || id).normalize('NFKC')}`; b.onclick = () => { gen(id); snd('gen') }; box.appendChild(b) };
      for (const [c, ids] of Object.entries(CAT)) { const h = document.createElement('div'); h.className = 'gch'; h.textContent = t('cats')[c]; g.appendChild(h); const box = document.createElement('div'); box.className = 'gg'; g.appendChild(box); ids.forEach(id => add(id, box)) }
      const rest = GENS.filter(d => !seen.has(d.id)); if (rest.length) { const box = document.createElement('div'); box.className = 'gg'; g.appendChild(box); rest.forEach(d => add(d.id, box)) }
    };

    // ---------- palettes ----------
    const PALS = {
      def: MPAL.slice(),
      wa: ['#d7003a', '#e95464', '#f39800', '#ffd900', '#a8c97f', '#69821b', '#2f5d50', '#00a497', '#165e83', '#223a70', '#7058a3', '#e7609e', '#fbfaf5', '#bcb6a8', '#595857', '#16160e', '#9f563a', '#c39143', '#a2d7dd', '#f6bfbc'],
      pico: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
      gb: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
      pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#d7baff', '#ffc6e5', '#c9f2e7', '#f2e2c9', '#e6e6fa', '#ffffff', '#d9d9e3'],
      earth: ['#3e2c23', '#5b4130', '#7c5a3c', '#a47c52', '#c9a66b', '#e3d0a4', '#5a6b3a', '#7f8f4e', '#a3b18a', '#6b705c', '#3a5a6b', '#9c6644'],
    };
    const palRow = document.createElement('div'); palRow.className = 'sr'; palRow.style.marginTop = '3px';
    const palLb = document.createElement('label'); palLb.id = 'lbPal'; const palSel = document.createElement('select'); palSel.className = 'hsel'; palSel.id = 'palSel'; palSel.style.flex = '1';
    palSel.onchange = () => { MPAL.splice(0, MPAL.length, ...PALS[palSel.value]); bMPal(); try { localStorage.setItem('vs_pal', palSel.value) } catch (e) { } snd('click') };
    palRow.append(palLb, palSel); $('mpl').parentNode.insertBefore(palRow, $('mpl'));
    try { const p = localStorage.getItem('vs_pal'); if (p && PALS[p]) { palSel.value = p; MPAL.splice(0, MPAL.length, ...PALS[p]); bMPal() } } catch (e) { }

    // ---------- styles (recolour the whole model; one undo step) ----------
    const nearest = (c, list) => { const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); let best = list[0], bd = 1e9; for (const q of list) { const dr = r - parseInt(q.slice(1, 3), 16), dg = g - parseInt(q.slice(3, 5), 16), db = b - parseInt(q.slice(5, 7), 16), d = 2 * dr * dr + 4 * dg * dg + 3 * db * db; if (d < bd) { bd = d; best = q } } return best };
    const STY = {
      wa: (c) => nearest(c, PALS.wa),
      retro: (c) => nearest(c, PALS.pico),
      pastel: (c) => { const [h, s, l] = hex2hsl(c); return hsl2hex(h, Math.min(s, 55) * 0.85, 72 + l * 0.18) },
      night: (c) => { const [h, s, l] = hex2hsl(c); if (l > 62 && ((h > 170 && h < 230) || s < 20) || (h > 40 && h < 65 && s > 60)) return '#ffd36b'; return hsl2hex(h * 0.55 + 230 * 0.45, s * 0.6, l * 0.42) },
      autumn: (c) => { const [h, s, l] = hex2hsl(c); if (h > 60 && h < 170 && s > 15) return hsl2hex(15 + (h - 60) * 0.3, Math.min(90, s + 15), l); return hsl2hex(h, s * 0.9, l) },
      mono: (c) => { const [, , l] = hex2hsl(c); return hsl2hex(0, 0, l) },
    };
    function applyStyle(id) { const a = []; for (const [k, v] of Object.entries({ ...V() })) { const [x, y, z] = pv_(k); const nc = STY[id](v.c); if (nc !== v.c) a.push(setV(x, y, z, nc, v.a || 255)) } const n = commit(a); toast(t('styleDone')(n)); snd('gen') }
    const stBox = document.createElement('div'); stBox.className = 'ps'; stBox.innerHTML = '<div class="pt" id="ptSty"></div><div class="ag" id="styG"></div>';
    $('acG').parentNode.parentNode.insertBefore(stBox, $('acG').parentNode.nextSibling);
    function buildSty() { $('ptSty').textContent = t('styleT'); const g = $('styG'); g.innerHTML = ''; Object.keys(STY).forEach(id => { const b = document.createElement('button'); b.className = 'at'; b.textContent = t('styles')[id]; b.onclick = () => applyStyle(id); g.appendChild(b) }) }

    // ---------- Next move ----------
    const nm = { done: new Set(), n: -1 };
    function surface(x, y, z) { return [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].filter(([dx, , dz]) => !has(x + dx, y, z + dz) && inB(x + dx, y, z + dz) || !inB(x + dx, y, z + dz)) }
    const STEPS = {
      empty: () => keys().length ? null : () => { gen(['house', 'castle', 'pagoda', 'lighthouse', 'temple'][Math.floor(Math.random() * 5)]); resetCam(); return 1 },
      ground: () => {
        const b = bbox(); if (!b) return null; const fx = b.x1 - b.x0 + 1, fz = b.z1 - b.z0 + 1; let low = 0; for (let x = b.x0; x <= b.x1; x++) for (let z = b.z0; z <= b.z1; z++) if (has(x, 0, z)) low++;
        if (b.y0 === 0 && low >= fx * fz * 0.85) return null; // already standing on a full bottom layer
        if (b.y0 === 0 && b.y1 >= H - 1) return null;
        return () => {
          const a = []; if (b.y0 === 0) { const all = Object.entries({ ...V() }).sort((p, q) => pv_(q[0])[1] - pv_(p[0])[1]); for (const [k, v] of all) { const [x, y, z] = pv_(k); a.push(delV(x, y, z)); a.push(setV(x, y + 1, z, v.c, v.a || 255)) } }
          const m = 3; for (let x = Math.max(0, b.x0 - m); x <= Math.min(W - 1, b.x1 + m); x++) for (let z = Math.max(0, b.z0 - m); z <= Math.min(D - 1, b.z1 + m); z++) if (!has(x, 0, z)) a.push(setV(x, 0, z, (x * 7 + z * 13) % 5 ? '#5aa04a' : '#4e9442', 255));
          return commit(a);
        };
      },
      roof: () => {
        const b = bbox(); if (!b || b.y1 + 3 >= H) return null; const top = []; for (let x = b.x0; x <= b.x1; x++) for (let z = b.z0; z <= b.z1; z++) if (has(x, b.y1, z)) top.push([x, z]);
        const fx = b.x1 - b.x0 + 1, fz = b.z1 - b.z0 + 1; if (top.length < 9 || top.length < fx * fz * 0.45 || b.y1 - b.y0 < 2) return null;
        return () => { const a = []; let tx0 = b.x0 - 1, tx1 = b.x1 + 1, tz0 = b.z0 - 1, tz1 = b.z1 + 1, y = b.y1 + 1; while (tx0 <= tx1 && tz0 <= tz1 && y < H) { for (let x = tx0; x <= tx1; x++) for (let z = tz0; z <= tz1; z++) if (x === tx0 || x === tx1 || z === tz0 || z === tz1 || tx1 - tx0 < 2 || tz1 - tz0 < 2) if (inB(x, y, z) && !has(x, y, z)) a.push(setV(x, y, z, (y % 2) ? '#b33a2e' : '#9c3026', 255)); tx0++; tx1--; tz0++; tz1--; y++ } return commit(a) };
      },
      windows: () => {
        const b = bbox(); if (!b || b.y1 - b.y0 < 4) return null; const cand = [];
        for (const k of keys()) { const [x, y, z] = pv_(k); if (y - b.y0 < 2 || b.y1 - y < 1 || (y - b.y0) % 3 !== 1) continue; const f = surface(x, y, z); if (f.length !== 1) continue; const along = f[0][0] ? z : x; if (along % 3 !== 1) continue; if (!has(x, y + 1, z) || !has(x, y - 1, z)) continue; cand.push([x, y, z]) }
        if (cand.length < 4) return null;
        return () => commit(cand.map(([x, y, z]) => setV(x, y, z, '#9fd8ff', 255)));
      },
      trees: () => {
        const b = bbox(); if (!b || H < 6) return null; const spots = [];
        for (let x = 1; x < W - 1; x += 2) for (let z = 1; z < D - 1; z += 2) { if (!has(x, 0, z) || has(x, 1, z)) continue; let free = true; for (let dx = -1; dx <= 1 && free; dx++) for (let dz = -1; dz <= 1 && free; dz++) for (let y = 1; y <= 4; y++) if (has(x + dx, y, z + dz)) { free = false; break } if (free) spots.push([x, z]) }
        if (spots.length < 2) return null;
        return () => { const a = []; const pick = spots.sort(() => Math.random() - .5).slice(0, Math.min(5, Math.ceil(spots.length / 6) + 1)); for (const [x, z] of pick) { const th = 1 + (Math.random() < .5 ? 1 : 0); for (let y = 1; y <= th; y++) a.push(setV(x, y, z, '#7a4b24', 255)); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = th + 1; y <= th + 2; y++) if (inB(x + dx, y, z + dz) && !has(x + dx, y, z + dz) && !(y === th + 2 && Math.abs(dx) + Math.abs(dz) === 2)) a.push(setV(x + dx, y, z + dz, y === th + 2 ? '#5cb85a' : '#3f9e4a', 255)) } return commit(a) };
      },
      shade: () => {
        const cols = new Set(Object.values(V()).map(v => v.c)); if (!keys().length || cols.size > 40) return null;
        return () => { const a = []; for (const [k, v] of Object.entries({ ...V() })) { const [x, y, z] = pv_(k); const up = has(x, y + 1, z), dn = !has(x, y - 1, z) && y > 0; const dl = !up ? 7 : (dn ? -14 : -6); a.push(setV(x, y, z, shade(v.c, dl), v.a || 255)) } return commit(a) };
      },
      outline: () => {
        if (keys().length < 20) return null;
        return () => { const a = []; for (const [k, v] of Object.entries({ ...V() })) { const [x, y, z] = pv_(k); let open = 0; for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (!has(x + dx, y + dy, z + dz)) open++; if (open >= 3) a.push(setV(x, y, z, shade(v.c, -12, 5), v.a || 255)) } return commit(a) };
      },
    };
    function nextMove() {
      const n0 = keys().length; if (nm.n >= 0 && n0 !== nm.n) ['ground', 'roof', 'windows', 'trees'].forEach(id => nm.done.delete(id));
      for (const id of Object.keys(STEPS)) {
        if (nm.done.has(id)) continue; const run = STEPS[id](); if (!run) continue;
        nm.done.add(id); if (id === 'empty') nm.done.clear();
        const n = run(); if (!n && id !== 'empty') continue;
        if (id === 'empty') nm.done.add('empty');
        nm.n = keys().length; const [h, s] = t('steps')[id]; toast('✨ ' + h, s); snd('gen'); return;
      }
      nm.n = keys().length; const [h, s] = t('steps').done; toast(h, s); snd('click');
    }
    window.nextMove = nextMove;
    const nb = document.createElement('button'); nb.className = 'hb'; nb.id = 'hNx'; nb.style.color = 'var(--a3)'; nb.onclick = nextMove; $('hR').after(nb);
    document.addEventListener('keydown', e => { if (e.key && e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); nextMove() } });


    // ---------- labels ----------
    function relabel() {
      const m = matchMedia('(max-width: 900px)').matches; nb.textContent = m ? '✨' : t('next'); nb.dataset.tip = t('nextTip'); nb.setAttribute('aria-label', t('next').replace(/^\S+\s*/, ''));
      $('lbPal').textContent = t('pal'); const v = palSel.value || 'def'; palSel.innerHTML = ''; Object.keys(PALS).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = t('pals')[k]; palSel.appendChild(o) }); palSel.value = v;
      buildSty(); buildGen();
    }
    const _sl = setLang; setLang = function (l) { _sl(l); relabel() };
    matchMedia('(max-width: 900px)').addEventListener('change', relabel);
    relabel();
  })();
