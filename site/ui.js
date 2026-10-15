  // ===== VoxoB UI layout =====
  // Re-arranges the existing controls (ids and handlers unchanged) into:
  //  header  : undo / redo / ✨ Next move … view toggles · Export (primary) · ⚙ menu (theme, language, sound, wire, share, BG, About)
  //  left    : draw / delete / colour switch, tools in a 2-column grid, brush · snap · symmetry
  //  right   : five tabs instead of one long scroll — Make · Colour · Motion · Edit · File (last tab remembered)
  //  phones  : a bottom bar in thumb reach opens the tools or a tab as a bottom sheet; the header keeps undo / redo / next / export
  (() => {
    const U = {
      en: { make: 'Make', color: 'Colour', anim: 'Motion', edit: 'Edit', file: 'File', tools: 'Tools', menu: 'Settings', close: 'Close', view: 'View' },
      ja: { make: '作る', color: '色', anim: '動き', edit: '編集', file: 'ファイル', tools: 'ツール', menu: '設定', close: '閉じる', view: '表示' },
    };
    Object.keys(I18N).forEach(l => U[l] = I18N[l].UI);
    const u = (k) => (U[lang] || U.en)[k];
    const TABS = [['make', '🎲', ['ptCv', 'ptGn']], ['color', '🎨', ['ptCl', 'ptSty']], ['anim', '🎞', ['ptAG']], ['edit', '✂', ['ptAc', 'ptCP']], ['file', '📁', ['ptPj', 'ptSz', 'ptMd']]];
    const mobile = () => matchMedia('(max-width: 900px)').matches;
    document.body.classList.add('ui2');

    // ---------- header ----------
    const hd = $('hd'), copy = hd.querySelector('.m-hide');
    const sp = document.createElement('div'); sp.className = 'hsp';
    const gear = document.createElement('button'); gear.className = 'hb'; gear.id = 'hGear'; gear.setAttribute('aria-haspopup', 'true'); gear.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div'); menu.id = 'gearM'; menu.setAttribute('role', 'menu');
    menu.appendChild($('mxR')); if (copy) { copy.classList.remove('m-hide'); copy.className = 'gcopy'; menu.appendChild(copy) }
    $('mExtra').remove();
    document.body.appendChild(menu);
    [$('hU'), $('hR'), $('hNx')].forEach(b => hd.appendChild(b));
    hd.appendChild(sp); hd.appendChild($('hTog2D')); hd.appendChild($('hEx')); hd.appendChild(gear);
    hd.querySelectorAll('.hs').forEach(e => e.remove());
    $('hEx').classList.add('pri'); $('hNx').classList.add('acc');
    const placeMenu = () => { const r = gear.getBoundingClientRect(); menu.style.top = (r.bottom + 6) + 'px'; menu.style.right = Math.max(8, innerWidth - r.right) + 'px' };
    const setMenu = (on) => { menu.classList.toggle('on', on); gear.setAttribute('aria-expanded', String(on)); if (on) placeMenu() };
    gear.onclick = (e) => { e.stopPropagation(); setMenu(!menu.classList.contains('on')) };
    document.addEventListener('pointerdown', (e) => { if (menu.classList.contains('on') && !menu.contains(e.target) && e.target !== gear) setMenu(false) });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setMenu(false); closeSheets() } });
    menu.addEventListener('click', (e) => { if (e.target.closest('button')) setTimeout(() => setMenu(false), 0) });

    // ---------- left: tools in two columns, the switch on top ----------
    $('lp').classList.add('ui2lp');

    // ---------- right: tabs ----------
    const rp = $('rp'), bar = document.createElement('div'); bar.className = 'rtabs'; bar.setAttribute('role', 'tablist'); rp.prepend(bar);
    const secOf = {}; rp.querySelectorAll(':scope > .ps').forEach(ps => { const t = ps.querySelector('.pt'); const tab = t && TABS.find(([, , ids]) => ids.includes(t.id)); ps.dataset.tab = tab ? tab[0] : 'make'; secOf[ps.dataset.tab] = (secOf[ps.dataset.tab] || 0) + 1 });
    // keep each tab's sections in the listed order
    TABS.forEach(([id, , ids]) => ids.forEach(pid => { const p = $(pid) && $(pid).closest('.ps'); if (p) rp.appendChild(p) }));
    let cur = 'make'; try { const s = localStorage.getItem('vs_tab'); if (TABS.some(t => t[0] === s)) cur = s } catch (e) { }
    function showTab(id) {
      cur = id; try { localStorage.setItem('vs_tab', id) } catch (e) { }
      rp.querySelectorAll(':scope > .ps').forEach(ps => ps.hidden = ps.dataset.tab !== id);
      bar.querySelectorAll('button').forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)) });
      bnav.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === id && rp.classList.contains('on')));
      rp.scrollTop = 0;
    }

    // ---------- phones: bottom bar + bottom sheets ----------
    const bnav = document.createElement('nav'); bnav.id = 'bnav'; $('app').appendChild(bnav);
    const grab = (el) => { const g = document.createElement('div'); g.className = 'sgrab'; const x = document.createElement('button'); x.className = 'sclose'; x.textContent = '✕'; x.onclick = closeSheets; g.appendChild(x); el.prepend(g); return x };
    const xL = grab($('lp')), xR = grab(rp);
    function closeSheets() { $('lp').classList.remove('on'); rp.classList.remove('on'); syncNav() }
    function syncNav() { bnav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab ? (rp.classList.contains('on') && b.dataset.tab === cur) : $('lp').classList.contains('on'))) }
    function openTab(id) { const same = rp.classList.contains('on') && cur === id; $('lp').classList.remove('on'); if (same) { rp.classList.remove('on') } else { showTab(id); rp.classList.add('on') } syncNav() }
    function openTools() { const on = !$('lp').classList.contains('on'); rp.classList.remove('on'); $('lp').classList.toggle('on', on); syncNav() }

    function build() {
      bar.innerHTML = ''; TABS.forEach(([id, ic]) => { const b = document.createElement('button'); b.dataset.tab = id; b.setAttribute('role', 'tab'); b.innerHTML = `<span>${ic}</span>${u(id)}`; b.onclick = () => showTab(id); bar.appendChild(b) });
      bnav.innerHTML = ''; const tb = document.createElement('button'); tb.innerHTML = `<span>🛠</span>${u('tools')}`; tb.onclick = openTools; bnav.appendChild(tb);
      TABS.forEach(([id, ic]) => { const b = document.createElement('button'); b.dataset.tab = id; b.innerHTML = `<span>${ic}</span>${u(id)}`; b.onclick = () => openTab(id); bnav.appendChild(b) });
      gear.innerHTML = mobile() ? '⚙' : '⚙ ' + u('menu'); gear.setAttribute('aria-label', u('menu')); xL.setAttribute('aria-label', u('close')); xR.setAttribute('aria-label', u('close'));
      showTab(cur); syncNav();
    }
    // the old header drawer buttons are replaced by the bottom bar
    ['hMT', 'hMS'].forEach(id => $(id) && ($(id).style.display = 'none'));
    // tapping the canvas closes a sheet (the main script already does this for touch)
    const _sl = setLang; setLang = function (l) { _sl(l); build() };
    matchMedia('(max-width: 900px)').addEventListener('change', () => { closeSheets(); build() });
    build();
  })();
