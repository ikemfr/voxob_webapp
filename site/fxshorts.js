  // ===== VoxoB FX Shorts: the punchy 1080×1920 cut (hook, glitch, build-up with sparks, impact, turn, optional smooth-view wipe, end card) =====
  // Frame by frame through opts.onFrame(canvas); returns the moments of sound cues ({ t, k }) so shorts/fx.mjs can lay the sound under them.
  (() => {
    // Japanese typefaces only (a Chinese fallback draws kanji in the wrong shapes); opts.fx.font picks another, e.g. a web font the caller loaded
    const JP = '"Hiragino Sans","Noto Sans JP","Yu Gothic","Meiryo","IPAPGothic",sans-serif';
    const ease = (u) => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2, outBack = (u) => { const c = 1.7; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2 }, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    async function fxShorts(opts) {
      const last = VoxoBConvert.last; if (!last) throw new Error('convert first');
      const fx = opts.fx || {}, OW = 1080, OH = 1920, FPS = opts.fps || 30, out = document.createElement('canvas'); out.width = OW; out.height = OH; const ox = out.getContext('2d');
      const pr = ren.getPixelRatio(), keep = { w: c3.width, h: c3.height, sw: c3.style.width, sh: c3.style.height, aspect: cam.aspect, cT, cP, cD, tgt: cTgt.clone(), frame: curFrame, grid: gG ? gG.visible : false };
      if (playing) togPlay(); ren.setPixelRatio(1); ren.setSize(1080, 1080, false); cam.aspect = 1; cam.updateProjectionMatrix(); if (gG) gG.visible = false;
      const sc = last.srcCanvas, F = last.frames.length, dims = last.dims, big = Math.max(dims.W, dims.H, dims.D);
      const T = { hook: 1.3, move: 2.0, build: 6.2, smooth: fx.smooth ? 8.6 : null, end: 11.6, total: 13.6 };
      const cues = [{ t: 0, k: 'hit' }, { t: T.hook, k: 'glitch' }, { t: T.hook + .05, k: 'whoosh' }, { t: T.move, k: 'riser', d: T.build - T.move }, { t: T.build, k: 'boom' }, { t: T.end, k: 'chime' }];
      if (T.smooth) cues.push({ t: T.smooth, k: 'sweep' });
      const sparks = []; let shown = -1, seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1080; const tx = tmp.getContext('2d');
      const text = (s, x, y, size, fill = '#fff', stroke = '#000', sw = 14) => { ox.font = `900 ${size}px ${fx.font || JP}`; ox.textAlign = 'center'; ox.lineJoin = 'round'; ox.lineWidth = sw; ox.strokeStyle = stroke; ox.strokeText(s, x, y); ox.fillStyle = fill; ox.fillText(s, x, y) };
      const fit = (img, x, y, w, h) => { const k = Math.min(w / img.width, h / img.height), dw = img.width * k, dh = img.height * k; ox.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh) };
      const bg = (s) => { const g = ox.createRadialGradient(OW / 2, OH * .45, 100, OW / 2, OH * .45, OH * .8); g.addColorStop(0, fx.bg1 || '#2a1f5c'); g.addColorStop(1, fx.bg2 || '#07070d'); ox.fillStyle = g; ox.fillRect(0, 0, OW, OH);
        ox.save(); ox.translate(OW / 2, OH * .45); ox.rotate(s * .25); ox.globalAlpha = .12; ox.fillStyle = '#fff'; for (let i = 0; i < 18; i++) { ox.rotate(Math.PI * 2 / 18); ox.beginPath(); ox.moveTo(0, 0); ox.lineTo(1500, -60); ox.lineTo(1500, 60); ox.fill() } ox.restore() };
      cTgt.set(dims.W / 2, dims.H * .45, dims.D / 2);
      const view3d = (s, smoothCut) => {   // the 3D view into a 1080² canvas; smoothCut 0–1 = how far the smooth surface has wiped across
        let fi = F - 1; if (s < T.move) fi = 0; else if (s < T.build) fi = Math.min(F - 1, Math.floor((s - T.move) / (T.build - T.move) * F));
        if (fi !== shown) { goFrame(fi); if (shown >= 0 && s < T.build) { cues.push({ t: s, k: 'pop' }); for (let i = 0; i < 26; i++) sparks.push({ x: 540 + (rnd() - .5) * 500, y: 1180 + (rnd() - .5) * 500, vx: (rnd() - .5) * 900, vy: (rnd() - .8) * 900, life: 1, hue: rnd() * 360 }) } shown = fi }
        const turn = clamp((s - T.build) / (T.end - T.build));
        cT = Math.PI / 4 + s * .12 + ease(turn) * Math.PI * 2; cP = Math.PI / 2.5 - (s > T.end ? ease(clamp((s - T.end) / 1.2)) * .7 : 0);
        cD = big * (s < T.build ? 1.9 - .25 * clamp((s - T.move) / 4) : 1.65 - .3 * Math.sin(Math.PI * turn)); uCam();
        if (window.VoxoBSmooth) VoxoBSmooth.show(false); ren.render(scn, cam); tx.clearRect(0, 0, 1080, 1080); tx.drawImage(c3, 0, 0);
        if (smoothCut > 0 && window.VoxoBSmooth) { VoxoBSmooth.show(true); ren.render(scn, cam); tx.save(); tx.beginPath(); tx.rect(0, 0, 1080 * smoothCut, 1080); tx.clip(); tx.clearRect(0, 0, 1080, 1080); tx.drawImage(c3, 0, 0); tx.restore(); VoxoBSmooth.show(false)
          if (smoothCut < 1) { tx.fillStyle = 'rgba(255,255,255,.9)'; tx.fillRect(1080 * smoothCut - 6, 0, 12, 1080) } }
        return tmp;
      };
      const draw = (s) => {
        bg(s);
        let shake = 0; if (s < .5) shake = 26 * (1 - s / .5); if (s >= T.build && s < T.build + .5) shake = 30 * (1 - (s - T.build) / .5);
        ox.save(); ox.translate((rnd() - .5) * shake, (rnd() - .5) * shake);
        // the source: big and punchy first, then up into the top panel
        const mv = ease(clamp((s - T.hook) / (T.move - T.hook))), punch = s < .4 ? outBack(clamp(s / .4)) : 1;
        if (s < T.build + .4) {
          const fade = s < T.build ? 1 : 1 - (s - T.build) / .4, w0 = 920 * (1.35 - .35 * punch), x = OW / 2 - w0 / 2 * (1 - mv) - 300 * mv, y = 470 - w0 / 2 * (1 - mv) + (-140) * mv, w = w0 * (1 - mv) + 600 * mv;
          ox.globalAlpha = fade; ox.fillStyle = 'rgba(255,255,255,.95)'; ox.shadowColor = 'rgba(0,0,0,.5)'; ox.shadowBlur = 40; ox.beginPath(); ox.roundRect(x, y, w, w, 36); ox.fill(); ox.shadowBlur = 0; fit(sc, x + w * .06, y + w * .06, w * .88, w * .88);
          if (s >= T.hook && s < T.hook + .3) { const k = 1 - (s - T.hook) / .3; for (let i = 0; i < 9; i++) { const yy = rnd() * OH, hh = 20 + rnd() * 90; ox.globalAlpha = .7 * k; ox.drawImage(out, 0, yy, OW, hh, (rnd() - .5) * 120, yy, OW, hh); ox.fillStyle = ['rgba(255,0,90,.35)', 'rgba(0,220,255,.35)'][i % 2]; ox.fillRect(0, yy, OW, hh * .3) } }
          ox.globalAlpha = 1;
        }
        // the 3D view
        if (s >= T.move - .2) {
          const cut = T.smooth ? clamp((s - T.smooth) / .9) : 0, v = view3d(s, cut), a = clamp((s - T.move + .2) / .4), sz = s < T.build ? 1080 : 1080 + 200 * Math.sin(Math.PI * clamp((s - T.build) / .6)) * .2;
          ox.globalAlpha = a; ox.drawImage(v, (OW - sz) / 2, (s < T.build ? 760 : 520 - 120 * clamp((s - T.build) / .6)) - (sz - 1080) / 2, sz, sz); ox.globalAlpha = 1;
        }
        // sparks
        for (const p of sparks) { if (p.life <= 0) continue; p.x += p.vx / FPS; p.y += p.vy / FPS; p.vy += 1600 / FPS; p.life -= 1.6 / FPS; ox.globalAlpha = clamp(p.life); ox.fillStyle = `hsl(${p.hue},95%,65%)`; ox.fillRect(p.x, p.y, 10, 10) } ox.globalAlpha = 1;
        // shockwave at the impact
        if (s >= T.build && s < T.build + .8) { const u = (s - T.build) / .8; ox.strokeStyle = `rgba(255,255,255,${1 - u})`; ox.lineWidth = 40 * (1 - u); ox.beginPath(); ox.arc(OW / 2, 1060, 120 + u * 900, 0, Math.PI * 2); ox.stroke() }
        ox.restore();
        // words
        if (s < T.move) { const p = outBack(clamp(s / .35)); ox.save(); ox.translate(OW / 2, 190); ox.scale(p, p); text(fx.title || '', 0, 0, 104, '#fff', '#111', 18); text(fx.sub || '', 0, 120, 64, '#ffe14d', '#111', 14); ox.restore() }
        else if (s < T.build) { text(fx.during || '', OW / 2, 690, 76, '#fff', '#111', 14); const k = clamp((s - T.move) / (T.build - T.move)); ox.fillStyle = 'rgba(255,255,255,.2)'; ox.fillRect(140, 1820, 800, 18); ox.fillStyle = '#ffe14d'; ox.fillRect(140, 1820, 800 * k, 18) }
        else if (s < T.end) { const p = outBack(clamp((s - T.build) / .3)); ox.save(); ox.translate(OW / 2, 250); ox.scale(p, p); text(fx.done || '', 0, 0, 132, '#ffe14d', '#111', 20); ox.restore(); if (T.smooth && s >= T.smooth) text(fx.smoothLabel || '', OW / 2, 1700, 76, '#7ff0ff', '#111', 14) }
        else { const p = outBack(clamp((s - T.end) / .35)); ox.fillStyle = `rgba(7,7,13,${.55 * clamp((s - T.end) / .3)})`; ox.fillRect(0, 0, OW, OH); ox.save(); ox.translate(OW / 2, 820); ox.scale(p, p); text('VoxoB', 0, 0, 170, '#fff', '#111', 22); text(fx.cta || '', 0, 130, 58, '#ffe14d', '#111', 12); text('voxob.vercel.app', 0, 230, 54, '#7ff0ff', '#111', 12); ox.restore() }
        if (fx.credit) { ox.font = '600 26px system-ui, sans-serif'; ox.textAlign = 'left'; ox.fillStyle = 'rgba(255,255,255,.6)'; ox.fillText(fx.credit, 28, OH - 28) }
        // flashes
        const fl = Math.max(s < .25 ? 1 - s / .25 : 0, s >= T.build && s < T.build + .3 ? 1 - (s - T.build) / .3 : 0, T.smooth && s >= T.smooth && s < T.smooth + .2 ? .6 * (1 - (s - T.smooth) / .2) : 0);
        if (fl > 0) { ox.fillStyle = `rgba(255,255,255,${fl})`; ox.fillRect(0, 0, OW, OH) }
      };
      try { const n = Math.ceil(T.total * FPS); for (let f = 0; f < n; f++) { draw(f / FPS); await opts.onFrame(out, f, n) } return { frames: n, fps: FPS, cues: cues.sort((a, b) => a.t - b.t), duration: T.total } }
      finally { if (window.VoxoBSmooth) VoxoBSmooth.show(VoxoBSmooth.on); if (gG) gG.visible = keep.grid; ren.setPixelRatio(pr); ren.setSize(keep.w / pr, keep.h / pr, false); c3.style.width = keep.sw; c3.style.height = keep.sh; cam.aspect = keep.aspect; cam.updateProjectionMatrix(); cT = keep.cT; cP = keep.cP; cD = keep.cD; cTgt.copy(keep.tgt); goFrame(keep.frame); uCam() }
    }
    // a 1280×720 thumbnail: the source, an arrow, the 3D result and a headline
    function thumb(fx = {}) {
      const last = VoxoBConvert.last, c = document.createElement('canvas'); c.width = 1280; c.height = 720; const x = c.getContext('2d'), dims = last.dims, big = Math.max(dims.W, dims.H, dims.D);
      const g = x.createLinearGradient(0, 0, 1280, 720); g.addColorStop(0, fx.bg1 || '#2a1f5c'); g.addColorStop(1, fx.bg2 || '#07070d'); x.fillStyle = g; x.fillRect(0, 0, 1280, 720);
      const pr = ren.getPixelRatio(), keep = { w: c3.width, h: c3.height, sw: c3.style.width, sh: c3.style.height, aspect: cam.aspect, cT, cP, cD, tgt: cTgt.clone() }, gw = gG ? gG.visible : false;
      ren.setPixelRatio(1); ren.setSize(720, 720, false); cam.aspect = 1; cam.updateProjectionMatrix(); if (gG) gG.visible = false; goFrame(frames.length - 1);
      cT = Math.PI / 4 + .35; cP = Math.PI / 2.6; cD = big * 1.55; cTgt.set(dims.W / 2, dims.H * .45, dims.D / 2); uCam(); if (window.VoxoBSmooth) VoxoBSmooth.show(!!fx.smooth); ren.render(scn, cam);
      x.save(); x.translate(250, 400); x.rotate(-.08); x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 30; x.beginPath(); x.roundRect(-190, -190, 380, 380, 28); x.fill(); x.shadowBlur = 0; const s = last.srcCanvas, k = Math.min(330 / s.width, 330 / s.height); x.drawImage(s, -s.width * k / 2, -s.height * k / 2, s.width * k, s.height * k); x.restore();
      x.drawImage(c3, 540, 0, 720, 720);
      x.fillStyle = '#ffe14d'; x.beginPath(); x.moveTo(470, 330); x.lineTo(560, 400); x.lineTo(470, 470); x.closePath(); x.fill();
      const t = (s2, y, size, fill) => { x.font = `900 ${size}px ${fx.font || JP}`; x.textAlign = 'left'; x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = '#111'; x.strokeText(s2, 40, y); x.fillStyle = fill; x.fillText(s2, 40, y) };
      t(fx.thumb1 || '', 110, 92, '#fff'); t(fx.thumb2 || '', 690, 84, '#ffe14d');
      if (window.VoxoBSmooth) VoxoBSmooth.show(VoxoBSmooth.on); if (gG) gG.visible = gw; ren.setPixelRatio(pr); ren.setSize(keep.w / pr, keep.h / pr, false); c3.style.width = keep.sw; c3.style.height = keep.sh; cam.aspect = keep.aspect; cam.updateProjectionMatrix(); cT = keep.cT; cP = keep.cP; cD = keep.cD; cTgt.copy(keep.tgt); uCam();
      return c;
    }
    window.VoxoBFx = { fxShorts, thumb };
  })();
