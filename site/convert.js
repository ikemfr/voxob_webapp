  // ===== VoxoB Convert: image / video / text → city, creature, tower, terrain, relief, flat, time sculpture =====
  // Everything runs in the browser; nothing is uploaded. Each voxel carries the moment it appears in the build (o, 0–1),
  // so a conversion can also be kept as an animation of its own making — the material for before/after Shorts.
  // English and Japanese strings are here; Español / Português / 中文 come from I18N[lang].CV (site/i18n.js).
  (() => {
    const CVL = {
      en: {
        title: 'CONVERT', image: '🖼 Image', video: '🎞 Video', text: '🔤 Text', model: '🧊 3D model', modelTip: 'OBJ (with its MTL and textures), STL or glTF / GLB. Every triangle is filled, the inside too, and colours come from textures, vertex colours or materials. Pick the model together with its MTL and texture files.', textPh: 'Type a word or a name…', go: '✨ Convert', again: '↻ Convert again',
        styles: { real: '📐 Realistic', city: '🏙 City', creature: '🐾 Creature', tower: '🏯 Tower', terrain: '⛰ Terrain', relief: '🗿 Relief', flat: '▦ Flat', time: '⏳ Time sculpture' },
        tips: { real: 'Depth is worked out from the picture itself (no AI model, nothing uploaded): a figure on a plain background becomes a 3D figure you can walk around, with its shading as fine relief; a landscape becomes a deep diorama, using the sky, height in the picture, haze and detail.', city: 'The picture becomes a city map: dark or vivid parts grow into tall buildings, green into parks, blue into water. From straight above, the roofs show the picture.', creature: 'The outline is cut out and puffed up into a round 3D figure, thick where the shape is wide.', tower: 'The outline is turned around a vertical axis like a potter’s wheel: towers, vases, pagodas.', terrain: 'Brightness becomes height: water, sand, grass, rock and snow.', relief: 'A carved panel: the subject stands out from the background.', flat: 'One voxel per pixel, like pixel art.', time: 'Video only: moving things are stacked frame by frame into a solid trail through time.' },
        detail: 'Detail', keepBg: 'Keep the background', process: 'Keep the conversion process as animation', note: 'Use pictures, videos and text you made yourself or have the rights to. Avoid other people’s faces and works.',
        noSrc: 'Pick an image, a video or type some text first.', busy: 'Converting…', done: (n, f) => `Done: ${n.toLocaleString()} voxels${f > 1 ? `, ${f} frames` : ''}. Ctrl+Z to undo.`, timeOnlyVideo: 'Time sculpture needs a video.', empty: 'Nothing to convert was found in this source.',
        shorts: '📱 Shorts (9:16)', shortsTip: 'Record a vertical video: the source, the conversion, then a turn around the result.', shortsNo: 'Convert something first.', shortsBusy: 'Recording…', before: 'BEFORE', after: 'AFTER',
      },
      ja: {
        title: '変換', image: '🖼 画像', video: '🎞 動画', text: '🔤 文字', model: '🧊 3Dモデル', modelTip: 'OBJ（MTL・テクスチャ付きも可）、STL、glTF / GLB を読み込みます。三角形を面ごと埋め、中身も詰め、色はテクスチャ・頂点カラー・マテリアルから取ります。MTL やテクスチャの画像は一緒に選んでください。', textPh: '言葉や名前を入力…', go: '✨ 変換', again: '↻ もう一度変換',
        styles: { real: '📐 リアル', city: '🏙 街', creature: '🐾 生き物', tower: '🏯 塔', terrain: '⛰ 地形', relief: '🗿 レリーフ', flat: '▦ 平面', time: '⏳ 時間の彫刻' },
        tips: { real: '絵そのものから奥行きを推定します（AIモデルは使わず、外にも送りません）。無地の背景の人物やキャラクターは、陰影を細かな凹凸にした回り込める立体に。風景は空・画面内の高さ・かすみ・細かさから奥行きを読んだ立体ジオラマにします。', city: '絵を街の地図として読みます。濃い色・鮮やかな色は高いビル、緑は公園、青は水辺に。真上から見ると屋根が元の絵になります。', creature: '輪郭を切り抜き、幅の広いところほど厚く膨らませて丸い立体にします。', tower: '輪郭をろくろのように縦軸で回して、塔・器・五重塔のような形にします。', terrain: '明るさを高さにして、水・砂・草・岩・雪に塗り分けます。', relief: '背景から主題が浮き出る彫刻パネルにします。', flat: '1ピクセルを1ボクセルにした平面（ドット絵）です。', time: '動画専用：動いているものをフレームごとに奥へ積み、時間の軌跡を立体にします。' },
        detail: '細かさ', keepBg: '背景も残す', process: '変換の過程をアニメーションとして残す', note: '自分で撮った・描いた・書いた素材か、使う権利のある素材を使ってください。他人の顔や作品は避けましょう。',
        noSrc: '先に画像・動画を選ぶか、文字を入力してください。', busy: '変換中…', done: (n, f) => `完成：${n.toLocaleString()} ボクセル${f > 1 ? `・${f} フレーム` : ''}。Ctrl+Z で戻せます。`, timeOnlyVideo: '時間の彫刻は動画のときだけ使えます。', empty: 'この素材からは変換できる形が見つかりませんでした。',
        shorts: '📱 ショート動画 (9:16)', shortsTip: '縦長の動画を書き出します：元の素材 → 変換の過程 → 完成品をぐるっと一周。', shortsNo: '先に何か変換してください。', shortsBusy: '録画中…', before: 'BEFORE', after: 'AFTER',
      },
    };
    Object.keys(I18N).forEach(l => { if (I18N[l].CV) CVL[l] = I18N[l].CV });
    const t = (k) => (CVL[lang] || CVL.en)[k] ?? CVL.en[k];

    // ---------- pixels ----------
    const lumOf = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v / 4) * 4)).toString(16).padStart(2, '0')).join('');
    const shade = (r, g, b, f) => hex(r * f, g * f, b * f);
    function satHue(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360 } return [mx ? d / mx : 0, h] }
    const hash = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000 };
    // draw a source into a grid whose longest side is R
    function grid(src, R) {
      const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height, k = R / Math.max(sw, sh);
      const w = Math.max(2, Math.round(sw * k)), h = Math.max(2, Math.round(sh * k)), c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
      return { w, h, d: x.getImageData(0, 0, w, h).data };
    }
    // foreground: transparent pixels, else what is not the border colour (flood from the edges), else the darker/lighter minority
    function fgMask(g) {
      const { w, h, d } = g, n = w * h, m = new Uint8Array(n);
      let tr = 0; for (let i = 0; i < n; i++) if (d[i * 4 + 3] < 128) tr++;
      if (tr > n * .02) { for (let i = 0; i < n; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0; m.how = 'alpha'; return m }
      const cnt = new Map(), border = []; for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x); for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
      for (const i of border) { const q = (d[i * 4] >> 4) << 8 | (d[i * 4 + 1] >> 4) << 4 | d[i * 4 + 2] >> 4; cnt.set(q, (cnt.get(q) || 0) + 1) }
      let bq = 0, bc = -1; cnt.forEach((c, q) => { if (c > bc) { bc = c; bq = q } });
      const br = ((bq >> 8) & 15) * 16 + 8, bg = ((bq >> 4) & 15) * 16 + 8, bb = (bq & 15) * 16 + 8, T = 52 * 52;
      const near = (i) => { const dr = d[i * 4] - br, dg = d[i * 4 + 1] - bg, db = d[i * 4 + 2] - bb; return dr * dr + dg * dg + db * db < T };
      const bgm = new Uint8Array(n), st = []; for (const i of border) if (near(i) && !bgm[i]) { bgm[i] = 1; st.push(i) }
      while (st.length) { const i = st.pop(), x = i % w, y = (i / w) | 0; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !bgm[j] && near(j)) { bgm[j] = 1; st.push(j) } }
      let fg = 0; for (let i = 0; i < n; i++) { m[i] = bgm[i] ? 0 : 1; fg += m[i] }
      if (fg > n * .03 && fg < n * .97) { m.how = 'border'; m.bgShare = bc / border.length; return m }
      // no clear background: split by brightness (Otsu) and keep the smaller side
      const hist = new Array(64).fill(0), L = new Float32Array(n); for (let i = 0; i < n; i++) { L[i] = lumOf(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); hist[Math.min(63, (L[i] * 64) | 0)]++ }
      let best = 32, bv = -1, sum = 0; for (let i = 0; i < 64; i++) sum += i * hist[i]; let w0 = 0, s0 = 0;
      for (let i = 0; i < 64; i++) { w0 += hist[i]; if (!w0 || w0 === n) continue; s0 += i * hist[i]; const m0 = s0 / w0, m1 = (sum - s0) / (n - w0), v = w0 * (n - w0) * (m0 - m1) ** 2; if (v > bv) { bv = v; best = i } }
      let dark = 0; for (let i = 0; i < n; i++) if (L[i] * 64 <= best) dark++;
      const keepDark = dark <= n / 2; for (let i = 0; i < n; i++) m[i] = (L[i] * 64 <= best) === keepDark ? 1 : 0;
      m.how = 'otsu'; return m;
    }
    function bgLum(g, m) { let s = 0, c = 0; for (let i = 0; i < g.w * g.h; i++) if (!m[i]) { s += lumOf(g.d[i * 4], g.d[i * 4 + 1], g.d[i * 4 + 2]); c++ } return c ? s / c : 1 }

    // Poisson inflation (∇²u = −1 inside the mask, 0 outside): returns the half-thickness per pixel; a disk becomes a half-sphere
    function inflate(m, w, h) {
      const u = new Float32Array(w * h);
      for (let it = 0, N = Math.max(200, Math.max(w, h) * 6); it < N; it++) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!m[i]) continue; const nu = (u[i - 1] + u[i + 1] + u[i - w] + u[i + w] + 1) / 4; u[i] += 1.85 * (nu - u[i]) }
      const hh = new Float32Array(w * h); let hm = 0; for (let i = 0; i < w * h; i++) if (m[i]) { hh[i] = Math.sqrt(Math.max(0, u[i])) * 2; hm = Math.max(hm, hh[i]) }
      return { hh, hm };
    }
    const boxBlur = (a, w, h, r) => { const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) { const yy = y + j, xx = x + k; if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += a[yy * w + xx]; c++ } } o[y * w + x] = s / c } return o };
    // depth from one picture, without any learned model (see docs/research-conversion-shorts.md):
    // a subject on a plain ground is puffed up front and back, with its own shading as fine relief (dark lines sink in);
    // a scene is laid out by sky, height in the picture, haze (aerial perspective) and detail, smoothed along colour edges
    function realDepth(g) {
      const { w, h, d } = g, n = w * h, m = fgMask(g), L = new Float32Array(n);
      for (let i = 0; i < n; i++) L[i] = lumOf(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      let fg = 0; for (let i = 0; i < n; i++) fg += m[i];
      const subject = (m.how === 'alpha' || (m.how === 'border' && m.bgShare > .55)) && fg > n * .04 && fg < n * .88;
      if (subject) {
        const { hh, hm } = inflate(m, w, h), mean = boxBlur(L, w, h, 2), det = new Float32Array(n);
        for (let i = 0; i < n; i++) det[i] = m[i] ? Math.max(-.5, Math.min(.5, (L[i] - mean[i]) * 2.2)) : 0;
        return { subject: true, m, hh, hm, det };
      }
      // scene: sky from the top edge, then near/far cues
      const sky = new Uint8Array(n), G = new Float32Array(n);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; G[i] = Math.hypot(L[i + 1] - L[i - 1], L[i + w] - L[i - w]) }
      const isSky = (i) => { const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], [s] = satHue(r, gg, b); return G[i] < .09 && ((b >= r && b >= gg * .92 && L[i] > .3) || (s < .14 && L[i] > .62)) };
      const st = []; for (let x = 0; x < w; x++) if (isSky(x)) { sky[x] = 1; st.push(x) }
      while (st.length) { const i = st.pop(), x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && !sky[j] && isSky(j)) { sky[j] = 1; st.push(j) } }
      // clouds, the sun, birds: anything not joined to the ground from the bottom edge belongs to the sky
      { const gr = new Uint8Array(n), q = []; for (let x = 0; x < w; x++) { const i = (h - 1) * w + x; if (!sky[i]) { gr[i] = 1; q.push(i) } }
        while (q.length) { const i = q.pop(), x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && !gr[j] && !sky[j]) { gr[j] = 1; q.push(j) } }
        for (let i = 0; i < n; i++) if (!gr[i]) sky[i] = 1 }
      let hz = 0, hc = 0; for (let x = 0; x < w; x++) { let y = 0; while (y < h && sky[y * w + x]) y++; hz += y; hc++ } hz = hc ? hz / hc : 0;   // average horizon row
      const T = boxBlur(G, w, h, 2); let tmx = 1e-6; { const s2 = [...T].sort((a, b) => a - b); tmx = s2[Math.floor(n * .95)] || 1e-6 }
      let near = new Float32Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (sky[i]) continue;
        const v = Math.max(0, Math.min(1, (y - hz) / Math.max(1, h - 1 - hz))), [s] = satHue(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]), haze = (1 - s) * L[i] * (d[i * 4 + 2] >= d[i * 4] ? 1 : .6);
        near[i] = .62 * v + .23 * Math.min(1, T[i] / tmx) + .15 * (1 - haze) }
      // joint bilateral smoothing: pixels of a similar colour nearby end up at a similar depth
      for (let it = 0; it < 6; it++) { const o = new Float32Array(n);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (sky[i]) continue; let s = 0, ws = 0;
          for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) { const yy = y + j, xx = x + k; if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue; const q = yy * w + xx; if (sky[q]) continue;
            const dr = d[i * 4] - d[q * 4], dg = d[i * 4 + 1] - d[q * 4 + 1], db = d[i * 4 + 2] - d[q * 4 + 2], wt = Math.exp(-(dr * dr + dg * dg + db * db) / 1250 - (j * j + k * k) / 8); s += near[q] * wt; ws += wt }
          o[i] = s / ws }
        near = o }
      return { subject: false, sky, near };
    }

    // ---------- styles: each returns { W, H, D, vox: [[x, y, z, colour, order]] } ----------
    const ST = {
      // the most life-like: a figure you can walk around (subject) or a deep diorama (scene); opt.bg keeps the background
      real(g, opt = {}) {
        const { w, h, d } = g, R = realDepth(g), vox = [], keepBg = opt.bg !== false;
        if (R.subject) {
          const { m, hh, hm, det } = R, F = .95, B = .55, DD = Math.max(8, Math.min(MAXS, Math.ceil(hm * (F + B)) + (keepBg ? 6 : 4))), cz = Math.round(hm * B) + 2;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], wy = h - 1 - y;
            if (!m[i]) { if (keepBg && d[i * 4 + 3] >= 128) vox.push([x, wy, 0, shade(r, gg, b, .9), 0]); continue }
            const zf = Math.min(DD - 1, Math.round(cz + hh[i] * F + det[i] * Math.min(2.5, hm * .12))), zb = Math.max(keepBg ? 1 : 0, Math.round(cz - hh[i] * B));
            for (let z = zb; z <= zf; z++) vox.push([x, wy, z, z === zf ? hex(r, gg, b) : z === zb ? shade(r, gg, b, .72) : shade(r, gg, b, .86), Math.abs(z - cz) / (hm * F || 1)]) }
          return { W: w, H: h, D: DD, vox };
        }
        const { sky, near } = R, DD = Math.max(8, Math.min(MAXS, Math.round(Math.max(w, h) * .45))), Z = new Int16Array(w * h);
        for (let i = 0; i < w * h; i++) Z[i] = sky[i] ? -1 : 1 + Math.round(near[i] * (DD - 2));
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], wy = h - 1 - y;
          if (Z[i] < 0) { if (keepBg) vox.push([x, wy, 0, hex(r, gg, b), 0]); continue }
          // from the nearest surface back to the furthest neighbour, so steps in depth become walls rather than gaps
          let lo = Z[i]; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && Z[j] >= 0) lo = Math.min(lo, Z[j] + 1);
          if (!keepBg) lo = Math.min(lo, Z[i]); for (let z = Math.max(1, lo); z <= Z[i]; z++) vox.push([x, wy, z, z === Z[i] ? hex(r, gg, b) : shade(r, gg, b, .82), near[i] * .9 + .1]) }
        return { W: w, H: h, D: DD, vox };
      },
      // Poisson inflation (∇²u = −1 inside the outline, 0 on it): a disk becomes a half-sphere, a thin limb a thin tube
      creature(g) {
        const { w, h, d } = g, m = fgMask(g), u = new Float32Array(w * h);
        for (let it = 0, N = Math.max(200, w * 6); it < N; it++) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!m[i]) continue; const nu = (u[i - 1] + u[i + 1] + u[i - w] + u[i + w] + 1) / 4; u[i] += 1.85 * (nu - u[i]) }
        let hm = 0; const hh = new Float32Array(w * h); for (let i = 0; i < w * h; i++) if (m[i]) { hh[i] = Math.sqrt(Math.max(0, u[i])) * 2 * .85 + .5; hm = Math.max(hm, hh[i]) }
        const DD = Math.max(8, Math.min(MAXS, Math.ceil(hm * 2) + 3)), cz = DD / 2, k = hm > cz - 1 ? (cz - 1) / hm : 1, vox = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!m[i]) continue; const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], th = Math.max(.5, hh[i] * k), f = .78 + .22 * Math.min(1, th / (.55 * hm * k || 1));
          for (let z = Math.floor(cz - th); z < Math.ceil(cz + th); z++) vox.push([x, h - 1 - y, z, shade(r, gg, b, f), Math.abs(z + .5 - cz) / (hm * k || 1)]) }
        return { W: w, H: h, D: DD, vox };
      },
      // a city map: lots of 3×3 cells between 1-cell roads
      city(g) {
        const { w, h, d } = g, m = fgMask(g), bl = bgLum(g, m), P = 4, HH = Math.max(10, Math.round(Math.max(w, h) * .42)), vox = [];
        const lots = []; let md = 1e-6;
        for (let lz = 0; lz * P < h; lz++) for (let lx = 0; lx * P < w; lx++) {
          let r = 0, gg = 0, b = 0, c = 0, fg = 0; for (let y = lz * P; y < Math.min(h, lz * P + P - 1); y++) for (let x = lx * P; x < Math.min(w, lx * P + P - 1); x++) { const i = y * w + x; r += d[i * 4]; gg += d[i * 4 + 1]; b += d[i * 4 + 2]; fg += m[i]; c++ }
          if (!c) continue; r /= c; gg /= c; b /= c; const L = lumOf(r, gg, b), [sat, hue] = satHue(r, gg, b), diff = Math.abs(L - bl) * .75 + sat * .35 + (fg / c) * .25;
          lots.push({ lx, lz, r, g: gg, b, L, sat, hue, diff }); md = Math.max(md, diff);
        }
        for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if (x % P === P - 1 || z % P === P - 1) vox.push([x, 0, z, ((x + z) & 1) && (x % P === P - 1) !== (z % P === P - 1) ? '#5a5d66' : '#46494f', 0]);
        for (const L of lots) {
          const x0 = L.lx * P, z0 = L.lz * P, x1 = Math.min(w, x0 + P - 1), z1 = Math.min(h, z0 + P - 1), v = L.diff / md;
          const green = L.sat > .22 && L.hue > 70 && L.hue < 170, blue = L.sat > .3 && L.hue >= 185 && L.hue < 255;
          if (green || blue) {   // parks and water whatever their contrast
            for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) vox.push([x, 0, z, blue ? hex(60 + L.r * .2, 110 + L.g * .2, 200) : hex(L.r * .6 + 40, L.g * .6 + 70, L.b * .5 + 20), 0]);
            if (green && hash(x0, z0) > .4) { const tx = x0 + 1, tz = z0 + 1; vox.push([tx, 1, tz, '#6b4a2b', .1], [tx, 2, tz, '#3f8f3a', .2]) }
            continue;
          }
          const ht = v < .18 ? 1 + Math.round(hash(x0, z0) * 1.6) : Math.max(2, Math.round(Math.pow(v, 1.35) * (HH - 2) * (.85 + .3 * hash(x0, z0))));   // background lots stay low houses
          const wall = (L.L > .7 ? .82 : 1), glass = L.L < .35 ? '#ffe39a' : '#a9cbe0';
          for (let y = 1; y <= ht; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
            const edge = x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1; if (!edge && y < ht) continue;   // hollow inside
            const top = y === ht, win = !top && y % 2 === 0 && edge && ((x + z) % 2 === 0) && x1 - x0 > 1 && z1 - z0 > 1;
            vox.push([x, y, z, top ? hex(L.r, L.g, L.b) : win ? glass : shade(L.r, L.g, L.b, (y % 2 ? .78 : .86) * wall), y / HH]);
          }
          for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) vox.push([x, 0, z, '#5b5e66', 0]);
          if (ht > HH * .6 && hash(z0, x0) > .5) vox.push([x0 + 1, ht + 1, z0 + 1, '#c8ccd4', (ht + 1) / HH], [x0 + 1, ht + 2, z0 + 1, '#ff4040', (ht + 2) / HH]);
        }
        return { W: w, H: HH + 3, D: h, vox };
      },
      // the outline turned around a vertical axis; the front shows the picture, projected straight through
      tower(g) {
        const { w, h, d } = g, m = fgMask(g); let sx = 0, c = 0; for (let i = 0; i < w * h; i++) if (m[i]) { sx += i % w; c++ }
        if (!c) return { W: 8, H: 8, D: 8, vox: [] };
        const ax = sx / c, R = new Float32Array(h), rowC = []; let rm = 1;
        for (let y = 0; y < h; y++) { let r = -1, rr = 0, gg = 0, bb = 0, n = 0; for (let x = 0; x < w; x++) { const i = y * w + x; if (!m[i]) continue; r = Math.max(r, Math.abs(x + .5 - ax)); rr += d[i * 4]; gg += d[i * 4 + 1]; bb += d[i * 4 + 2]; n++ } R[y] = r; rowC.push(n ? [rr / n, gg / n, bb / n] : [200, 200, 200]); rm = Math.max(rm, r) }
        const S = Math.min(MAXS, Math.ceil(rm * 2) + 3), cx = S / 2, vox = [];
        for (let y = 0; y < h; y++) { const r = R[y]; if (r < 0) continue; const ra = y > 0 ? R[y - 1] : -1, rb = y < h - 1 ? R[y + 1] : -1, wy = h - 1 - y;
          for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) {
            const dx = x + .5 - cx, dz = z + .5 - cx, dist = Math.hypot(dx, dz); if (dist > r + .5) continue;
            if (dist < r - 1.6 && dist < ra - .5 && dist < rb - .5) continue;   // hidden inside
            const px = Math.round(ax + dx - .5), i = y * w + px, inPic = px >= 0 && px < w && m[i], [r0, g0, b0] = inPic ? [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]] : rowC[y];
            const ledge = dist > ra - .5 && ra >= 0 && ra < r - 1.5, ang = (Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI);
            vox.push([x, wy, z, shade(r0, g0, b0, ledge ? .72 : (dist > r - 1 ? 1 : .9)), ang * .85 + (wy / h) * .15]);
          } }
        return { W: S, H: h, D: S, vox };
      },
      // brightness → height, coloured by height
      terrain(g) {
        const { w, h, d } = g, HH = Math.max(8, Math.round(Math.max(w, h) * .35)), L = new Float32Array(w * h), B = new Float32Array(w * h), vox = [];
        for (let i = 0; i < w * h; i++) L[i] = lumOf(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const yy = y + j, xx = x + k; if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += L[yy * w + xx]; c++ } } B[y * w + x] = s / c }
        const sea = Math.round(HH * .18);
        for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
          const i = z * w + x, top = Math.max(1, Math.round(B[i] * (HH - 1))), r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], n = hash(x, z) * .12;
          const tp = (xx, zz) => xx < 0 || zz < 0 || xx >= w || zz >= h ? 0 : Math.max(1, Math.round(B[zz * w + xx] * (HH - 1)));
          const low = Math.min(tp(x - 1, z), tp(x + 1, z), tp(x, z - 1), tp(x, z + 1));
          for (let y = 0; y < top; y++) {
            if (y > 0 && y < low - 1 && y < top - 2) continue;   // hidden: every neighbouring column is taller than this voxel
            const q = y / HH, sur = y >= top - 2;
            let c = !sur ? '#7a6248' : q < .22 ? hex(214, 196, 142) : q < .55 ? hex(70 + r * .25, 130 + gg * .2, 60 + b * .15) : q < .78 ? hex(120 + r * .15, 112 + gg * .12, 104 + b * .12) : '#f2f4f7';
            if (sur && q >= .22 && q < .55) c = shade(70 + r * .25, 130 + gg * .2, 60 + b * .15, .92 + n);
            vox.push([x, y, z, c, y / HH]);
          }
          for (let y = top; y < sea; y++) vox.push([x, y, z, y === sea - 1 ? '#4a90d9' : '#3a78c2', y / HH]);
        }
        return { W: w, H: HH + 1, D: h, vox };
      },
      // a carved panel: the subject stands out of a 1-voxel plate
      relief(g) {
        const { w, h, d } = g, m = fgMask(g), bl = bgLum(g, m), DD = Math.max(6, Math.round(Math.max(w, h) * .18)), vox = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (d[i * 4 + 3] < 128) continue; const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
          const hgt = m[i] ? 2 + Math.round(Math.min(1, Math.abs(lumOf(r, gg, b) - bl) * 1.6 + .25) * (DD - 2)) : 1;
          for (let z = 0; z < hgt; z++) vox.push([x, h - 1 - y, z, z === hgt - 1 ? hex(r, gg, b) : shade(r, gg, b, .8), z / DD]) }
        return { W: w, H: h, D: DD, vox };
      },
      flat(g) {
        const { w, h, d } = g, vox = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (d[i * 4 + 3] < 128) continue; vox.push([x, h - 1 - y, 0, hex(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]), 1 - y / h]) }
        return { W: w, H: h, D: 4, vox };
      },
    };
    // video frames stacked in depth: only what differs from the background (per-pixel median over the clip)
    function timeSculpture(gs) {
      const { w, h } = gs[0], n = w * h, N = gs.length, vox = [], med = new Uint8Array(n * 3), tmp = new Uint8Array(N);
      for (let i = 0; i < n; i++) for (let ch = 0; ch < 3; ch++) { for (let f = 0; f < N; f++) tmp[f] = gs[f].d[i * 4 + ch]; tmp.sort(); med[i * 3 + ch] = tmp[N >> 1] }
      const T = 46 * 46;
      gs.forEach((g, f) => { for (let i = 0; i < n; i++) { const r = g.d[i * 4], gg = g.d[i * 4 + 1], b = g.d[i * 4 + 2], dr = r - med[i * 3], dg = gg - med[i * 3 + 1], db = b - med[i * 3 + 2]; if (dr * dr + dg * dg + db * db > T) vox.push([i % w, h - 1 - ((i / w) | 0), f, hex(r, gg, b), f / N]) } });
      return { W: w, H: h, D: Math.max(4, N), vox };
    }

    // ---------- sources ----------
    let src = null;          // { kind: 'image' | 'video' | 'text', el, name, text }
    let last = null;          // the last conversion: { srcCanvas, style, frames: [voxel maps], W, H, D }
    function textCanvas(str) {
      const lines = String(str).split(/\n/).map(s => s.trim()).filter(Boolean).slice(0, 4); if (!lines.length) return null;
      const c = document.createElement('canvas'), x = c.getContext('2d'), fam = '"Noto Sans JP","Hiragino Sans","Yu Gothic","PingFang SC","Microsoft YaHei","Segoe UI",system-ui,sans-serif';
      x.font = `900 100px ${fam}`; const wd = Math.max(...lines.map(l => x.measureText(l).width)), lh = 118;
      c.width = Math.ceil(wd + 60); c.height = lines.length * lh + 40; const n = parseInt(color.slice(1), 16), light = lumOf(n >> 16, (n >> 8) & 255, n & 255) > .8;
      x.fillStyle = light ? '#14161c' : '#ffffff'; x.fillRect(0, 0, c.width, c.height);   // a light text colour goes on a dark ground so it still stands out
      x.font = `900 100px ${fam}`; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillStyle = color;
      lines.forEach((l, i) => x.fillText(l, c.width / 2, 20 + lh * (i + .5)));
      return c;
    }
    function srcCanvasOf(el) { const c = document.createElement('canvas'), w = el.videoWidth || el.naturalWidth || el.width, h = el.videoHeight || el.naturalHeight || el.height; c.width = w; c.height = h; c.getContext('2d').drawImage(el, 0, 0); return c }
    const once = (el, ev) => new Promise((res) => el.addEventListener(ev, res, { once: true }));
    // seek and wait for that frame; an earlier seek still running (e.g. the rewind after reading a recorded clip's length) is let finish first
    async function seek(v, tm) {
      if (v.seeking) await once(v, 'seeked');
      const to = Math.min(Math.max(0, tm), Math.max(0, v.duration - .05)); if (Math.abs(v.currentTime - to) < 1e-4 && v.readyState >= 2) return;
      const ok = once(v, 'seeked'); v.currentTime = to; await ok;
      if (v.readyState < 2) await once(v, 'loadeddata');
    }
    async function videoFrames(v, R, N) { const out = []; for (let f = 0; f < N; f++) { await seek(v, v.duration * (f + .5) / N); out.push(grid(v, R)) } return out }

    // ---------- apply ----------
    function toMap(res, upTo, ox = 0, oz = 0) { const v = {}; for (const [x0, y, z0, c, o] of res.vox) { const x = x0 + ox, z = z0 + oz; if ((upTo >= 1 || o <= upTo) && x >= 0 && y >= 0 && z >= 0 && x < res.W && y < res.H && z < res.D) v[vk(x, y, z)] = { c, a: 255 } } return v }
    function fitSize(res) { res.W = Math.max(4, Math.min(MAXS, res.W)); res.H = Math.max(4, Math.min(MAXS, res.H)); res.D = Math.max(4, Math.min(MAXS, res.D)); return res }
    function commitFrames(dims, maps) {
      const before = takeSnap(); if (playing) togPlay();
      W = dims.W; H = dims.H; D = dims.D; $('sW').value = W; $('sH').value = H; $('sD').value = D;
      $('scXx').value = $('scPx').value = Math.floor(W / 2); $('scYy').value = $('scPy').value = Math.floor(H / 2); $('scZz').value = $('scPz').value = Math.floor(D / 2);
      frames = maps.map(v => ({ v, ws: false, cam: null })); curFrame = frames.length - 1; sIdx = Math.min(sIdx, smx() - 1);
      rebMesh(); rebGrid(); resetCam(); uSL(); rs2(); d2D(); uCnt(); uFUI(); pUSnap(before);
      setTimeout(autoSave, 60);
    }
    const busy = (on, msg) => { $('cvGo').disabled = on; $('cvSh').disabled = on; if (msg !== undefined) $('cvMsg').textContent = msg };
    async function convert() {
      const style = $('cvSt').value, R = Math.max(16, Math.min(MAXS, +$('cvR').value || 64)), proc = $('cvPr').checked;
      if (!src || (src.kind === 'text' && !$('cvTx').value.trim())) { busy(false, t('noSrc')); return }
      if (style === 'time' && src.kind !== 'video' && src.kind !== 'model') { busy(false, t('timeOnlyVideo')); return }
      busy(true, t('busy')); await new Promise(r => setTimeout(r, 30));
      try {
        let res, srcC, maps = [];
        if (src.kind === 'model') {
          const mesh = await VoxoBModel.parse(src.files); if (!mesh || !mesh.pos.length) { busy(false, t('empty')); return }
          res = VoxoBModel.voxelize(mesh, R, color); if (!res) { busy(false, t('empty')); return } fitSize(res); srcC = VoxoBModel.snapshot(mesh);
        } else if (src.kind === 'video') {
          const v = src.el;
          if (style === 'time') { const N = Math.min(64, Math.max(12, Math.round(R * .6))), gs = await videoFrames(v, R, N); res = fitSize(timeSculpture(gs)); await seek(v, v.duration * .5); srcC = srcCanvasOf(v) }
          else {   // one conversion per sampled frame → an animation
            const N = Math.min(24, Math.max(6, Math.round(v.duration * 4))), gs = await videoFrames(v, R, N), all = gs.map(g => ST[style](g, { bg: $('cvBg').checked })), dims = fitSize({ W: Math.max(...all.map(r => r.W)), H: Math.max(...all.map(r => r.H)), D: Math.max(...all.map(r => r.D)) });
            await seek(v, 0); srcC = srcCanvasOf(v);
            all.forEach(r => maps.push(toMap({ ...r, ...dims }, 1, Math.floor((dims.W - r.W) / 2), Math.floor((dims.D - r.D) / 2))));   // frames of different sizes share one centre last = { srcCanvas: srcC, style, frames: maps, dims, process: false };
            commitFrames(dims, maps); busy(false, t('done')(Object.keys(maps[maps.length - 1]).length, maps.length)); snd('done'); return;
          }
        } else {
          srcC = src.kind === 'text' ? textCanvas($('cvTx').value) : srcCanvasOf(src.el);
          if (!srcC) { busy(false, t('noSrc')); return }
          // text needs about 18 cells a character to stay readable
          const RR = src.kind === 'text' ? Math.min(MAXS, Math.max(R, 18 * Math.max(...$('cvTx').value.split(/\n/).map(l => Array.from(l.trim()).length)))) : R;
          res = fitSize(ST[style](grid(srcC, RR), { bg: $('cvBg').checked }));
        }
        if (!res.vox.length) { busy(false, t('empty')); return }
        if (proc) { const K = 12; for (let i = 1; i <= K; i++) maps.push(toMap(res, i === K ? 1 : Math.pow(i / K, 1.2))) } else maps.push(toMap(res, 1));
        last = { srcCanvas: srcC, style: src.kind === 'model' ? 'model' : style, frames: maps, dims: { W: res.W, H: res.H, D: res.D }, process: proc };
        commitFrames(res, maps); busy(false, t('done')(Object.keys(maps[maps.length - 1]).length, maps.length)); snd('done');
      } catch (e) { console.error(e); busy(false, String(e && e.message || e)) }
    }

    // ---------- Shorts: 1080×1920, source → conversion → a turn around the result ----------
    // draw(s) paints the moment s seconds in; the app records it in real time, opts.onFrame steps through it frame by frame
    async function shorts(opts = {}) {
      if (!last) { $('cvMsg').textContent = t('shortsNo'); return }
      busy(true, t('shortsBusy')); if (playing) togPlay();
      const OW = 1080, OH = 1920, FPS = opts.fps || 30, out = document.createElement('canvas'); out.width = OW; out.height = OH; const ox = out.getContext('2d');
      const pr = ren.getPixelRatio(), keep = { w: c3.width, h: c3.height, sw: c3.style.width, sh: c3.style.height, aspect: cam.aspect, cT, cP, cD, tgt: cTgt.clone(), frame: curFrame, bg: ren.getClearColor(new THREE.Color()).getHex(), grid: gG ? gG.visible : false };
      ren.setPixelRatio(1); ren.setSize(1080, 1080, false); cam.aspect = 1; cam.updateProjectionMatrix(); if (gG) gG.visible = false;   // no floor grid or slice plane in the video
      const BG = '#' + keep.bg.toString(16).padStart(6, '0'), sc = last.srcCanvas, F = last.frames.length, dims = last.dims, big = Math.max(dims.W, dims.H, dims.D);
      const T_SRC = 2.2, T_PROC = F > 1 ? 4.6 : 1.2, T_TURN = 6, T_END = 1.6, total = T_SRC + T_PROC + T_TURN + T_END;
      const label = (txt, y) => { ox.font = '800 64px system-ui, sans-serif'; ox.textAlign = 'center'; ox.fillStyle = 'rgba(0,0,0,.45)'; const w = ox.measureText(txt).width + 64; ox.fillRect(OW / 2 - w / 2, y - 56, w, 84); ox.fillStyle = '#fff'; ox.fillText(txt, OW / 2, y) };
      const drawSrc = (x, y, w, h) => { const k = Math.min(w / sc.width, h / sc.height), dw = sc.width * k, dh = sc.height * k; ox.imageSmoothingEnabled = true; ox.drawImage(sc, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh) };
      const ease = (u) => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      cTgt.set(dims.W / 2, dims.H * .42, dims.D / 2); cD = big * 1.9;
      let shown = -1;
      const draw = (s) => {
        ox.fillStyle = BG; ox.fillRect(0, 0, OW, OH);
        let fi = F - 1; if (s < T_SRC) fi = F > 1 ? 0 : F - 1; else if (s < T_SRC + T_PROC) fi = Math.min(F - 1, Math.floor((s - T_SRC) / T_PROC * F));
        if (fi !== shown) { goFrame(fi); shown = fi }
        const spin = s < T_SRC + T_PROC ? (s / (T_SRC + T_PROC)) * .6 : .6 + ease(Math.min(1, (s - T_SRC - T_PROC) / T_TURN)) * Math.PI * 2;
        cD = big * (1.75 - .35 * ease(Math.max(0, Math.min(1, (s - T_SRC - T_PROC) / T_TURN))));   // closer in once the picture has made way
        cT = Math.PI / 4 + spin; cP = Math.PI / 2.6 - (s > T_SRC + T_PROC + T_TURN ? ease(Math.min(1, (s - T_SRC - T_PROC - T_TURN) / T_END)) * .75 : 0); uCam();
        // the source on top, the 3D view below; the view takes over once the turn starts, and ends looking down from above
        const split = s < T_SRC + T_PROC ? 760 : Math.max(0, 760 - (s - T_SRC - T_PROC) * 900);
        if (split > 140) { ox.save(); ox.beginPath(); ox.rect(40, 120, OW - 80, split - 140); ox.clip(); drawSrc(40, 120, OW - 80, split - 140); ox.restore(); if (split > 420) label(t('before'), 220) }
        ren.render(scn, cam); ox.drawImage(c3, 0, Math.max(split, split + (OH - split - 1080) / 2), 1080, 1080);
        if (s >= T_SRC && s < T_SRC + T_PROC) label((t('styles')[last.style] || t('model')) + '  ' + Math.round(Math.min(1, (s - T_SRC) / T_PROC) * 100) + '%', split + 90);
        if (s >= T_SRC + T_PROC) label(t('after'), OH - 260);
        ox.font = '700 44px system-ui, sans-serif'; ox.textAlign = 'center'; ox.fillStyle = 'rgba(255,255,255,.85)'; ox.fillText(s > total - T_END ? 'VoxoB — voxob.vercel.app' : 'VoxoB', OW / 2, OH - 90);
      };
      try {
        if (opts.onFrame) { const n = Math.ceil(total * FPS); for (let f = 0; f < n; f++) { draw(f / FPS); await opts.onFrame(out, f, n) } return { frames: n, fps: FPS } }
        const mime = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.42E01F', 'video/webm;codecs=vp9', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';   // MP4 only when it really is H.264
        const rec = new MediaRecorder(out.captureStream(FPS), { mimeType: mime, videoBitsPerSecond: 8e6 }), parts = []; rec.ondataavailable = e => e.data.size && parts.push(e.data);
        const stopped = new Promise(r => rec.onstop = r); rec.start(250);
        const t0 = performance.now(); await new Promise(done => { const step = () => { const s = (performance.now() - t0) / 1000; draw(Math.min(s, total)); if (s < total) requestAnimationFrame(step); else done() }; requestAnimationFrame(step) });
        rec.stop(); await stopped;
        const blob = new Blob(parts, { type: mime.split(';')[0] }), a = document.createElement('a'), u = URL.createObjectURL(blob);
        a.href = u; a.download = `voxob-shorts-${last.style}.${mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      } finally {
        if (gG) gG.visible = keep.grid; ren.setPixelRatio(pr); ren.setSize(keep.w / pr, keep.h / pr, false); c3.style.width = keep.sw; c3.style.height = keep.sh; cam.aspect = keep.aspect; cam.updateProjectionMatrix();
        cT = keep.cT; cP = keep.cP; cD = keep.cD; cTgt.copy(keep.tgt); goFrame(keep.frame); uCam(); if (typeof onR === 'function') onR();
        busy(false, ''); snd('gen');
      }
    }

    // ---------- panel (Make tab, above Generate) ----------
    const box = document.createElement('div'); box.className = 'ps cvp';
    box.innerHTML = `<div class="pt" id="ptCv"></div>
      <div class="cvsrc"><button class="btn" id="cvIm"></button><button class="btn" id="cvVi"></button><button class="btn" id="cvTe"></button><button class="btn" id="cvMo"></button></div>
      <input type="file" id="cvFile" accept="image/*,video/*" style="display:none"><input type="file" id="cvMoF" accept=".obj,.mtl,.stl,.glb,.gltf,.bin,image/*" multiple style="display:none">
      <div class="cvname" id="cvName"></div>
      <textarea id="cvTx" rows="2" maxlength="60" style="display:none"></textarea>
      <div class="cvst" id="cvSts" role="radiogroup"></div><input type="hidden" id="cvSt" value="city">
      <div class="cvtip" id="cvTip"></div>
      <div class="sr"><label id="cvRl" for="cvR"></label><select id="cvR"><option>32</option><option>48</option><option selected>64</option><option>96</option><option>128</option></select></div>
      <label class="ck" id="cvBgL"><input type="checkbox" id="cvBg" checked><span id="cvBgl"></span></label>
      <label class="ck"><input type="checkbox" id="cvPr" checked><span id="cvPrl"></span></label>
      <div class="cvgo"><button class="btn pri" id="cvGo"></button><button class="btn" id="cvSh"></button></div>
      <div class="cvmsg" id="cvMsg" role="status" aria-live="polite"></div>
      <div class="cvnote" id="cvNote"></div>`;
    const gnPs = $('ptGn').closest('.ps'); gnPs.parentNode.insertBefore(box, gnPs);
    const STY = ['real', 'city', 'creature', 'tower', 'terrain', 'relief', 'flat', 'time'];
    function setSt(id) { $('cvSt').value = id; box.querySelectorAll('.cvst button').forEach(b => { const on = b.dataset.st === id; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)) }); $('cvTip').textContent = t('tips')[id]; $('cvBgL').hidden = id !== 'real' }
    function showSrc() { $('cvTx').style.display = src && src.kind === 'text' ? 'block' : 'none'; $('cvName').textContent = src && src.kind !== 'text' ? src.name : ''; [['cvIm', 'image'], ['cvVi', 'video'], ['cvTe', 'text'], ['cvMo', 'model']].forEach(([id, k]) => $(id).classList.toggle('on', !!src && src.kind === k)); box.querySelector('[data-st=time]').hidden = !(src && src.kind === 'video');
      const mdl = !!src && src.kind === 'model'; $('cvSts').hidden = mdl; $('cvBgL').hidden = mdl || $('cvSt').value !== 'real'; $('cvTip').textContent = mdl ? t('modelTip') : t('tips')[$('cvSt').value]; if ($('cvSt').value === 'time' && !(src && src.kind === 'video')) setSt('city') }
    function relabel() {
      $('ptCv').textContent = t('title'); $('cvIm').textContent = t('image'); $('cvVi').textContent = t('video'); $('cvTe').textContent = t('text'); $('cvMo').textContent = t('model'); $('cvTx').placeholder = t('textPh');
      $('cvRl').textContent = t('detail'); $('cvBgl').textContent = t('keepBg'); $('cvPrl').textContent = t('process'); $('cvGo').textContent = last ? t('again') : t('go'); $('cvSh').textContent = t('shorts'); $('cvSh').dataset.tip = t('shortsTip'); $('cvNote').textContent = t('note');
      const g = $('cvSts'); g.innerHTML = ''; STY.forEach(id => { const b = document.createElement('button'); b.className = 'at'; b.dataset.st = id; b.setAttribute('role', 'radio'); b.textContent = t('styles')[id]; b.onclick = () => { setSt(id); snd('click') }; g.appendChild(b) });
      setSt($('cvSt').value); showSrc();
    }
    $('cvIm').onclick = () => { $('cvFile').accept = 'image/*'; $('cvFile').click() };
    $('cvVi').onclick = () => { $('cvFile').accept = 'video/*'; $('cvFile').click() };
    $('cvTe').onclick = () => { src = { kind: 'text' }; showSrc(); $('cvTx').focus() };
    $('cvMo').onclick = () => $('cvMoF').click();
    $('cvMoF').onchange = (e) => { const fs = [...e.target.files]; e.target.value = ''; const main = fs.find(f => /\.(obj|stl|glb|gltf)$/i.test(f.name)); if (!main) return; src = { kind: 'model', files: fs, name: fs.map(f => f.name).join(', ') }; showSrc() };
    $('cvFile').onchange = (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return; const url = URL.createObjectURL(f);
      if (f.type.startsWith('video')) { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url; v.onloadeddata = async () => { if (!isFinite(v.duration)) { v.currentTime = 1e9; await new Promise(r => v.ondurationchange = r); v.currentTime = 0 } src = { kind: 'video', el: v, name: f.name }; showSrc(); setSt('time') }; v.onerror = () => { $('cvMsg').textContent = M('vidFmt', 'この動画形式はお使いのブラウザでサポートされていません。', 'This video format is not supported by your browser.') } }
      else { const im = new Image(); im.onload = () => { src = { kind: 'image', el: im, name: f.name }; showSrc() }; im.src = url }
    };
    $('cvGo').onclick = () => convert().then(() => relabel());
    $('cvSh').onclick = () => shorts().catch(e => { console.error(e); busy(false, String(e && e.message || e)) });
    $('cvTx').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); convert().then(() => relabel()) } e.stopPropagation() });
    const _sl = setLang; setLang = function (l) { _sl(l); relabel() };
    relabel();
    // the File tab's import used to place only the corners of each triangle; send 3D files through the voxelizer instead
    { const _lm = loadMedia;
      loadMedia = async function (e) {
        const fs = [...(e.target.files || [])], main = fs.find(f => /\.(obj|stl|glb|gltf)$/i.test(f.name));
        if (!main) return _lm(e);
        e.target.value = '';
        try {
          const mesh = await VoxoBModel.parse(fs); if (!mesh || !mesh.pos.length) return;
          const sz = Math.max(4, Math.min(MAXS, +$('iSz').value || 16)), r = VoxoBModel.voxelize(mesh, Math.min(sz, Math.max(W, H, D)), color); if (!r) return;
          const ox = Math.floor((W - r.W) / 2), oz = Math.floor((D - r.D) / 2), acts = [];
          for (const [x, y, z, c] of r.vox) { const a = setV(x + ox, y, z + oz, c, 255); if (a) acts.push(a) }
          pU(acts); d2D(); uCnt(); snd('gen');
        } catch (err) { console.error(err); alert(String(err && err.message || err)) }
      };
    }
    // for tests and the demo recorder
    window.VoxoBConvert = { ST, grid, fgMask, timeSculpture, textCanvas, setSource: (s) => { src = s; showSrc() }, convert, shorts, get last() { return last } };
  })();
