// Builds the search-friendly guide pages (/ja/, /en/), sitemap.xml and robots.txt next to index.html.
// usage: node site/pages.mjs   (run from the repo root; plain Node, no dependencies)
import fs from 'node:fs';

const BASE = 'https://voxob.vercel.app/';
const TODAY = new Date().toISOString().slice(0, 10);
const html = fs.readFileSync('index.html', 'utf8');
// generator names straight from the app, so the list never drifts
const GN = Function(`return ${/const GN = (\{[\s\S]*?\n {4}\});/.exec(html)[1]}`)();
// plus the extra generators added in site/plus.js
const plus = fs.readFileSync('site/plus.js', 'utf8');
['en', 'ja'].forEach((lang, i) => Object.assign(GN[lang], Function(`return ${[...plus.matchAll(/ gn: (\{[^}]*\})/g)][i][1]}`)()));
const NG = Object.keys(GN.en).length;
const half = (s) => s.normalize('NFKC'); // the app uses half-width katakana to fit buttons

const C = {
  ja: {
    title: 'VoxoB の使い方｜無料ボクセルアート作成ツール（ブラウザ・スマホ対応）',
    desc: `インストール不要・登録不要の無料ボクセルエディタ VoxoB の使い方。${NG}種類のワンクリック自動生成、「次の一手」、コマ送りアニメ、画像・動画・3Dモデルからのボクセル変換、OBJ・STL・GLB・MP4 書き出しまで、スマホでも使えます。`,
    h1: 'VoxoB の使い方 — 無料でボクセルアートを作る',
    lead: 'VoxoB（ボクソブ）は、ブラウザだけで動くボクセル（立方体のドット）エディタです。3Dドット絵やボクセルアートを、PC・タブレット・スマホで作れます。インストールもログインも不要で、作ったデータは外部に送られず、使っているブラウザの中に保存されます。',
    open: 'VoxoB を開く（無料）',
    toc: '目次',
    home: 'ホーム',
    upd: '最終更新',
    alt: 'VoxoB の画面：ブラウザで動くボクセルエディタで作った作品',
    stepsH: ['steps', 'ボクセルアートの作り方（3ステップ）'],
    steps: [
      ['形を作る', '右パネルの「作る」タブで、家・城・木・地形などをワンクリックで自動生成するか、左のペンや矩形ツールで一から置きます。'],
      ['仕上げる', '「✨ 次の一手」で地面・屋根・窓・陰影などを足し、「スタイル変換」や「配色」で全体の色を整えます。'],
      ['書き出す', '右上の「エクスポート」から OBJ・STL・GLB・PNG・動画で保存します。3Dプリントやゲーム素材、SNS 投稿にそのまま使えます。'],
    ],
    s: [
      ['start', 'はじめかた', ['ページを開くと、最初に「自動生成してみる」「まっさらから描く」「画像から作る」の3つが出ます。', 'PC は左のツール（ペン・直線・矩形・円・塗りつぶしなど）を選び、3D 画面か 2D 断面をクリックして置きます。右ドラッグで回転、Shift＋ドラッグで移動、ホイールでズーム。', 'スマホは下のバーや上の「ツール」「設定」でパネルを開き、1本指タップで置く、2本指で回転、ピンチでズームです。']],
      ['generators', `ワンクリック自動生成（${NG}種）`, null],
      ['next', '次の一手とスタイル変換', ['上の「✨ 次の一手」（キーボードは N）を押すと、今の作品に合う次の工程をひとつ足します。地面を敷く・屋根を載せる・窓を付ける・木を植える・陰影をつける・角を締める、の中から形に合うものだけを選びます。どれも Ctrl+Z で取り消せます。', '右パネルの「スタイル変換」は、作品全体の色を和風・レトロ・パステル・夜・秋・モノクロに一度で変えます。「配色」では和色やレトロ16色などのパレットを選べます。']],
      ['animation', 'アニメーション', ['フレームを追加してコマ送りで作れます。右パネルの「アニメ生成」は、今の形から回転・揺れ・成長・分解など26種類の動きを自動で作ります。', '再生速度は FPS で調整し、WebM / MP4 の動画として書き出せます。']],
      ['import', '画像・動画・3Dモデルから作る', ['PNG / JPG / GIF / BMP の画像、MP4 / WebM / MOV の動画、OBJ / STL の3Dモデルを読み込むと、ボクセルに変換します。画像は色から奥行きを付けることもできます。ドット絵を立体にしたいときにも便利です。']],
      ['export', '書き出しと保存', ['OBJ（＋MTL）、STL（3Dプリンタ向け）、GLB（ゲームエンジン・Web 3D向け）、PNG、WebM / MP4 動画、JSON に書き出せます。', '作品はブラウザに自動保存され、名前を付けて複数保存もできます。共有ボタンは作品を URL に詰めて渡せます（サーバーには保存しません）。']],
    ],
    usesH: ['uses', 'こんな用途に'],
    uses: [
      '3Dプリント用のモデル作り（STL 書き出し）',
      'Blender・Unity・Godot などに読み込むゲーム素材やアイコン（OBJ / GLB）',
      'ブロックで組んだ建物や街並み、和風の神社・五重塔',
      'SNS に載せる回転アニメや短い動画（MP4 / WebM）',
      '学校や家庭での 3D・空間図形の学習（インストールできない端末でも使えます）',
    ],
    keysH: ['keys', 'キーボードショートカット'],
    keys: [
      ['B', 'ペン'], ['L', '直線'], ['R / Shift+R', '矩形 / 塗りつぶし矩形'], ['C / Shift+C', '円 / 塗りつぶし円'], ['Q', '楕円'],
      ['G / F', '塗りつぶし / 断面の塗りつぶし'], ['I', 'スポイト'], ['S', '範囲選択'], ['E', '描く ⇄ 消す'], ['N', '✨ 次の一手'],
      ['[ / ]', 'ブラシを小さく / 大きく'], ['↑ / ↓', '断面を上下に移動'], ['← / →', '前 / 次のフレーム'], ['Space', 'アニメ再生 / 停止'],
      ['Ctrl+Z / Ctrl+Y', '元に戻す / やり直し'], ['Ctrl+V', '貼り付け'], ['Ctrl+S', '保存'], ['Esc', '操作を取り消す'],
    ],
    keyCols: ['キー', '操作'],
    faqH: ['faq', 'よくある質問'],
    faq: [
      ['無料ですか？', 'はい、無料です。登録も不要です。'],
      ['インストールは必要ですか？', 'いいえ。ブラウザ（Chrome・Safari・Edge・Firefox など）でページを開くだけで使えます。WebGL が動く環境が必要です。'],
      ['データはどこに保存されますか？', 'お使いのブラウザの中（localStorage）だけです。ブラウザのデータを消すと消えるので、大事な作品は JSON で書き出してください。'],
      ['スマホでも使えますか？', 'はい。1本指タップで置く、2本指で回転・ピンチでズームです。iPhone・Android・iPad で動きます。'],
      ['Blender や Unity で使えますか？', 'はい。OBJ（＋MTL）か GLB で書き出せば、Blender・Unity・Godot などの 3D ソフトやゲームエンジンに読み込めます。'],
      ['3Dプリントできますか？', 'はい。STL で書き出して、スライサー（Cura・PrusaSlicer など）に読み込んでください。'],
      ['画像をボクセルに変換できますか？', 'はい。PNG / JPG / GIF / BMP を読み込むとボクセルに変換し、色から奥行きを付けることもできます。動画や OBJ / STL モデルも変換できます。'],
      ['MagicaVoxel などとの違いは？', 'VoxoB はインストールせずブラウザだけで動き、スマホでも使えます。ワンクリック自動生成や「次の一手」で、一から置かなくても形が作れるのが特徴です。'],
    ],
    by: '作者：Ike mfr（個人開発）',
  },
  en: {
    title: 'How to use VoxoB — free online voxel editor & voxel art maker',
    desc: `How to use VoxoB, a free voxel editor that runs in the browser on PC and phone, no install or sign-up: ${NG} one-click generators, a Next move button, frame animation, image/video/3D-model to voxel conversion, and OBJ, STL, GLB and MP4 export.`,
    h1: 'How to use VoxoB — make voxel art for free',
    lead: 'VoxoB is a voxel editor that runs entirely in your browser. Make 3D pixel art and voxel models on a computer, tablet or phone. No install, no sign-up. Your work is never uploaded; it is saved in the browser you are using.',
    open: 'Open VoxoB (free)',
    toc: 'Contents',
    home: 'Home',
    upd: 'Last updated',
    alt: 'VoxoB screenshot: a voxel model made in the browser-based voxel editor',
    stepsH: ['steps', 'Make voxel art in 3 steps'],
    steps: [
      ['Make a shape', 'In the Make tab on the right, generate a house, castle, tree, terrain and more with one click, or place voxels yourself with the pen and rectangle tools on the left.'],
      ['Finish it', 'Press ✨ Next move to add ground, a roof, windows, shading and more, then recolour everything with Style or Palette.'],
      ['Export', 'Use Export at the top right to save OBJ, STL, GLB, PNG or video, ready for 3D printing, game assets or social posts.'],
    ],
    s: [
      ['start', 'Getting started', ['On your first visit you can pick: generate something, start from an empty canvas, or make it from a picture.', 'On a computer, pick a tool on the left (pen, line, rectangle, circle, fill…) and click the 3D view or the 2D slice. Right-drag to orbit, Shift-drag to pan, scroll to zoom.', 'On a phone, open the panels from the bottom bar or Tools and Settings. Tap to place, two fingers to turn, pinch to zoom.']],
      ['generators', `One-click generators (${NG})`, null],
      ['next', 'Next move and styles', ['Press ✨ Next move at the top (or N) and VoxoB adds the next sensible step to what you have: ground, a roof, windows, trees, shading or darker edges, only the ones that fit the shape. Each can be undone with Ctrl+Z.', 'Style in the right panel recolours the whole model at once: Japanese, retro, pastel, night, autumn or mono. Palette offers sets such as traditional Japanese colours and a retro 16-colour set.']],
      ['animation', 'Animation', ['Add frames and build a flip-book animation. Animation generators in the right panel turn the current shape into 26 kinds of motion: spin, swing, grow, dissolve and more.', 'Set the speed with FPS and export WebM or MP4 video.']],
      ['import', 'From images, video and 3D models', ['Load PNG / JPG / GIF / BMP images, MP4 / WebM / MOV video, or OBJ / STL models and VoxoB turns them into voxels. Images can get depth from their colours, handy for turning pixel art into 3D.']],
      ['export', 'Export and save', ['Export OBJ (+MTL), STL for 3D printing, GLB for game engines and web 3D, PNG, WebM / MP4 video, or JSON.', 'Work is saved in the browser automatically, and you can keep several named projects. Share packs your work into a URL (nothing is stored on a server).']],
    ],
    usesH: ['uses', 'What people make with it'],
    uses: [
      'Models for 3D printing (STL export)',
      'Game assets and icons for Blender, Unity, Godot and more (OBJ / GLB)',
      'Block-built houses, towns and Japanese shrines and pagodas',
      'Turntable animations and short clips for social media (MP4 / WebM)',
      'Learning 3D and spatial shapes at school or home, even on devices where you cannot install apps',
    ],
    keysH: ['keys', 'Keyboard shortcuts'],
    keys: [
      ['B', 'Pen'], ['L', 'Line'], ['R / Shift+R', 'Rectangle / filled rectangle'], ['C / Shift+C', 'Circle / filled circle'], ['Q', 'Ellipse'],
      ['G / F', 'Fill / fill slice'], ['I', 'Eyedropper'], ['S', 'Select'], ['E', 'Draw ⇄ delete'], ['N', '✨ Next move'],
      ['[ / ]', 'Smaller / bigger brush'], ['↑ / ↓', 'Move the slice up / down'], ['← / →', 'Previous / next frame'], ['Space', 'Play / stop animation'],
      ['Ctrl+Z / Ctrl+Y', 'Undo / redo'], ['Ctrl+V', 'Paste'], ['Ctrl+S', 'Save'], ['Esc', 'Cancel the current action'],
    ],
    keyCols: ['Key', 'Action'],
    faqH: ['faq', 'FAQ'],
    faq: [
      ['Is it free?', 'Yes. No sign-up either.'],
      ['Do I need to install anything?', 'No. Open the page in a browser such as Chrome, Safari, Edge or Firefox. A device with WebGL is required.'],
      ['Where is my data stored?', 'Only in your browser (localStorage). Clearing browser data removes it, so export important work as JSON.'],
      ['Does it work on phones?', 'Yes. Tap to place, two fingers to turn, pinch to zoom. It works on iPhone, Android and iPad.'],
      ['Can I use my models in Blender or Unity?', 'Yes. Export OBJ (+MTL) or GLB and import it into Blender, Unity, Godot and other 3D tools and game engines.'],
      ['Can I 3D print my model?', 'Yes. Export STL and open it in your slicer (Cura, PrusaSlicer and so on).'],
      ['Can it convert an image to voxels?', 'Yes. Load a PNG / JPG / GIF / BMP and it becomes voxels, optionally with depth from its colours. Video and OBJ / STL models can be converted too.'],
      ['How is it different from MagicaVoxel?', 'VoxoB runs in the browser with nothing to install, and works on phones. One-click generators and Next move give you a shape without placing every voxel by hand.'],
    ],
    by: 'Made by Ike mfr (independent project)',
  },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ICON = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23151820'/><path d='M50 20L80 38V72L50 90L20 72V38Z' fill='%2300d4f0'/><path d='M50 20V55L80 38' fill='%239050f0'/><path d='M20 38L50 55V90' fill='%23f03070'/></svg>`;
const h2 = ([id, t]) => `<h2 id="${id}">${esc(t)}</h2>`;
for (const lang of ['ja', 'en']) {
  const c = C[lang], url = `${BASE}${lang}/`;
  const gens = Object.values(GN[lang]).map((n) => `<li>${esc(half(n))}</li>`).join('');
  const toc = [c.stepsH, ...c.s.map(([id, h]) => [id, h]), c.usesH, c.keysH, c.faqH];
  const body = [
    `${h2(c.stepsH)}<ol class="steps">${c.steps.map(([t, d]) => `<li><b>${esc(t)}</b>${lang === 'ja' ? '：' : ': '}${esc(d)}</li>`).join('')}</ol>`,
    ...c.s.map(([id, h, ps]) => `${h2([id, h])}${ps ? ps.map((p) => `<p>${esc(p)}</p>`).join('') : `<ul class="gens">${gens}</ul>`}`),
    `${h2(c.usesH)}<ul>${c.uses.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>`,
    `${h2(c.keysH)}<table class="keys"><thead><tr><th>${esc(c.keyCols[0])}</th><th>${esc(c.keyCols[1])}</th></tr></thead><tbody>${c.keys.map(([k, a]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(a)}</td></tr>`).join('')}</tbody></table>`,
    `${h2(c.faqH)}<dl>${c.faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl>`,
  ].join('\n');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: c.title, description: c.desc, inLanguage: lang, dateModified: TODAY, primaryImageOfPage: `${BASE}og-image.png`,
        isPartOf: { '@type': 'WebSite', '@id': `${BASE}#site`, name: 'VoxoB', url: BASE },
        about: { '@type': 'WebApplication', '@id': `${BASE}#app`, name: 'VoxoB', url: BASE, applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' } },
        author: { '@type': 'Person', name: 'Ike mfr' } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'VoxoB', item: BASE }, { '@type': 'ListItem', position: 2, name: c.h1.split(' — ')[0], item: url }] },
      { '@type': 'HowTo', name: c.stepsH[1], inLanguage: lang, tool: { '@type': 'HowToTool', name: 'VoxoB' }, step: c.steps.map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text, url: `${url}#steps` })) },
      { '@type': 'FAQPage', mainEntity: c.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const page = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.desc)}">
<meta name="author" content="Ike mfr">
<meta name="theme-color" content="#0e1018">
<link rel="icon" href="${ICON}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${BASE}ja/">
<link rel="alternate" hreflang="en" href="${BASE}en/">
<link rel="alternate" hreflang="x-default" href="${BASE}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="VoxoB">
<meta property="og:locale" content="${lang === 'ja' ? 'ja_JP' : 'en_US'}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.desc)}">
<meta property="og:image" content="${BASE}og-image.png">
<meta property="article:modified_time" content="${TODAY}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.title)}">
<meta name="twitter:description" content="${esc(c.desc)}">
<meta name="twitter:image" content="${BASE}og-image.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
:root{--bg:#0e1018;--fg:#e6e8ee;--sub:#9aa1b2;--ac:#00d4f0;--card:#151820;--bd:#262b38}
@media (prefers-color-scheme:light){:root{--bg:#f6f7fa;--fg:#161922;--sub:#4c5363;--ac:#007c91;--card:#fff;--bd:#dde1ea}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.75 system-ui,-apple-system,"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 56px}
h1{font-size:28px;line-height:1.3;margin:8px 0 12px}h2{font-size:20px;margin:32px 0 8px;padding-top:8px;border-top:1px solid var(--bd);scroll-margin-top:12px}
p{margin:0 0 10px}.lead{color:var(--sub)}a{color:var(--ac)}
.cta{display:inline-block;margin:12px 0 4px;padding:10px 18px;border-radius:8px;background:var(--ac);color:#05141a;font-weight:700;text-decoration:none}
img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--bd);margin:14px 0}
.toc{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px 16px;margin:16px 0}.toc b{font-size:14px;color:var(--sub)}.toc ol{margin:4px 0 0;padding-left:20px}
.gens{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;margin:8px 0}.gens li{background:var(--card);border:1px solid var(--bd);border-radius:999px;padding:2px 10px;font-size:14px}
.steps li{margin:4px 0}
.keys{border-collapse:collapse;width:100%;font-size:15px}.keys th,.keys td{border-bottom:1px solid var(--bd);padding:6px 8px;text-align:left}.keys th{color:var(--sub);font-weight:600}
kbd{font:13px ui-monospace,monospace;background:var(--card);border:1px solid var(--bd);border-radius:4px;padding:1px 6px;white-space:nowrap}
dl dt{font-weight:700;margin-top:12px}dl dd{margin:2px 0 0}
nav,footer{font-size:14px;color:var(--sub)}footer{margin-top:40px}
</style>
</head>
<body>
<main>
<nav aria-label="breadcrumb"><a href="/">VoxoB</a> › ${esc(c.h1.split(' — ')[0])} · ${lang === 'ja' ? '<a href="/en/" hreflang="en">English</a>' : '<a href="/ja/" hreflang="ja">日本語</a>'}</nav>
<h1>${esc(c.h1)}</h1>
<p class="lead">${esc(c.lead)}</p>
<a class="cta" href="/">${esc(c.open)}</a>
<img src="/og-image.png" alt="${esc(c.alt)}" width="1200" height="630" fetchpriority="high">
<nav class="toc" aria-label="${esc(c.toc)}"><b>${esc(c.toc)}</b><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav>
${body}
<p><a class="cta" href="/">${esc(c.open)}</a></p>
<footer>${esc(c.by)} · <a href="https://github.com/ikemfr/voxob_webapp">GitHub</a> · ${esc(c.upd)}: <time datetime="${TODAY}">${TODAY}</time></footer>
</main>
</body>
</html>
`;
  fs.mkdirSync(lang, { recursive: true });
  fs.writeFileSync(`${lang}/index.html`, page);
}
const alt = [['ja', 'ja/'], ['en', 'en/'], ['x-default', '']].map(([h, p]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${BASE}${p}"/>`).join('');
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['', 'ja/', 'en/'].map((p) => `  <url><loc>${BASE}${p}</loc><lastmod>${TODAY}</lastmod>${alt}</url>`).join('\n')}
</urlset>
`);
fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
console.log('pages ja en, sitemap, robots');
