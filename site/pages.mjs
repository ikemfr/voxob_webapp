// Builds the search-friendly guide pages (/ja/, /en/), sitemap.xml and robots.txt next to index.html.
// usage: node site/pages.mjs   (run from the repo root; plain Node, no dependencies)
import fs from 'node:fs';

const BASE = 'https://voxob.vercel.app/';
const TODAY = new Date().toISOString().slice(0, 10);
const html = fs.readFileSync('index.html', 'utf8');
// generator names straight from the app, so the list never drifts
const GN = Function(`return ${/const GN = (\{[\s\S]*?\n {4}\});/.exec(html)[1]}`)();
const half = (s) => s.normalize('NFKC'); // the app uses half-width katakana to fit buttons

const C = {
  ja: {
    title: 'VoxoB の使い方 — ブラウザで動く無料ボクセルエディタ',
    desc: 'インストール不要の無料ボクセルエディタ VoxoB の使い方。39種類のワンクリック自動生成、コマ送りアニメ、画像・動画・3Dモデルからの変換、OBJ・STL・GLB・MP4 書き出しまで。',
    h1: 'VoxoB の使い方',
    lead: 'VoxoB（ボクソブ）は、ブラウザだけで動くボクセル（立方体のドット）エディタです。インストールもログインも不要で、作ったデータは外部に送られず、使っているブラウザの中に保存されます。',
    open: 'VoxoB を開く',
    s: [
      ['はじめかた', ['ページを開くと、最初に「自動生成してみる」「まっさらから描く」「画像から作る」の3つが出ます。', 'PC は左のツール（ペン・直線・矩形・円・塗りつぶしなど）を選び、3D 画面か 2D 断面をクリックして置きます。右ドラッグで回転、Shift＋ドラッグで移動、ホイールでズーム。', 'スマホは上の「ツール」「設定」でパネルを開き、1本指タップで置く、2本指で回転、ピンチでズームです。']],
      ['ワンクリック自動生成（39種）', null],
      ['アニメーション', ['フレームを追加してコマ送りで作れます。右パネルの「アニメ生成」は、今の形から回転・揺れ・成長・分解など26種類の動きを自動で作ります。', '再生速度は FPS で調整し、WebM / MP4 の動画として書き出せます。']],
      ['画像・動画・3Dモデルから作る', ['PNG / JPG / GIF / BMP の画像、MP4 / WebM / MOV の動画、OBJ / STL の3Dモデルを読み込むと、ボクセルに変換します。画像は色から奥行きを付けることもできます。']],
      ['書き出しと保存', ['OBJ（＋MTL）、STL（3Dプリンタ向け）、GLB（ゲームエンジン・Web 3D向け）、PNG、WebM / MP4 動画、JSON に書き出せます。', '作品はブラウザに自動保存され、名前を付けて複数保存もできます。共有ボタンは作品を URL に詰めて渡せます（サーバーには保存しません）。']],
    ],
    faq: [
      ['無料ですか？', 'はい、無料です。登録も不要です。'],
      ['データはどこに保存されますか？', 'お使いのブラウザの中（localStorage）だけです。ブラウザのデータを消すと消えるので、大事な作品は JSON で書き出してください。'],
      ['スマホでも使えますか？', 'はい。1本指タップで置く、2本指で回転・ピンチでズームです。'],
    ],
    gens: 'ワンクリック自動生成（39種）',
    by: '作者：Ike mfr（個人開発）',
  },
  en: {
    title: 'How to use VoxoB — a free voxel editor in your browser',
    desc: 'How to use VoxoB, a free voxel editor that runs in the browser: 39 one-click generators, frame animation, image/video/3D-model to voxel conversion, and OBJ, STL, GLB and MP4 export.',
    h1: 'How to use VoxoB',
    lead: 'VoxoB is a voxel editor that runs entirely in your browser. No install, no sign-up. Your work is never uploaded; it is saved in the browser you are using.',
    open: 'Open VoxoB',
    s: [
      ['Getting started', ['On your first visit you can pick: generate something, start from an empty canvas, or make it from a picture.', 'On a computer, pick a tool on the left (pen, line, rectangle, circle, fill…) and click the 3D view or the 2D slice. Right-drag to orbit, Shift-drag to pan, scroll to zoom.', 'On a phone, open the panels with Tools and Settings at the top. Tap to place, two fingers to turn, pinch to zoom.']],
      ['One-click generators (39)', null],
      ['Animation', ['Add frames and build a flip-book animation. Animation generators in the right panel turn the current shape into 26 kinds of motion: spin, swing, grow, dissolve and more.', 'Set the speed with FPS and export WebM or MP4 video.']],
      ['From images, video and 3D models', ['Load PNG / JPG / GIF / BMP images, MP4 / WebM / MOV video, or OBJ / STL models and VoxoB turns them into voxels. Images can get depth from their colours.']],
      ['Export and save', ['Export OBJ (+MTL), STL for 3D printing, GLB for game engines and web 3D, PNG, WebM / MP4 video, or JSON.', 'Work is saved in the browser automatically, and you can keep several named projects. Share packs your work into a URL (nothing is stored on a server).']],
    ],
    faq: [
      ['Is it free?', 'Yes. No sign-up either.'],
      ['Where is my data stored?', 'Only in your browser (localStorage). Clearing browser data removes it, so export important work as JSON.'],
      ['Does it work on phones?', 'Yes. Tap to place, two fingers to turn, pinch to zoom.'],
    ],
    gens: 'One-click generators (39)',
    by: 'Made by Ike mfr (independent project)',
  },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
for (const lang of ['ja', 'en']) {
  const c = C[lang], url = `${BASE}${lang}/`;
  const gens = Object.values(GN[lang]).map((n) => `<li>${esc(half(n))}</li>`).join('');
  const body = c.s.map(([h, ps]) => `<h2>${esc(h)}</h2>${ps ? ps.map((p) => `<p>${esc(p)}</p>`).join('') : `<ul class="gens">${gens}</ul>`}`).join('\n');
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const page = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${BASE}ja/">
<link rel="alternate" hreflang="en" href="${BASE}en/">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.desc)}">
<meta property="og:image" content="${BASE}og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<style>
:root{--bg:#0e1018;--fg:#e6e8ee;--sub:#9aa1b2;--ac:#00d4f0;--card:#151820;--bd:#262b38}
@media (prefers-color-scheme:light){:root{--bg:#f6f7fa;--fg:#161922;--sub:#4c5363;--ac:#007c91;--card:#fff;--bd:#dde1ea}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.75 system-ui,-apple-system,"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 56px}
h1{font-size:28px;line-height:1.3;margin:8px 0 12px}h2{font-size:20px;margin:32px 0 8px;padding-top:8px;border-top:1px solid var(--bd)}
p{margin:0 0 10px}.lead{color:var(--sub)}a{color:var(--ac)}
.cta{display:inline-block;margin:12px 0 4px;padding:10px 18px;border-radius:8px;background:var(--ac);color:#05141a;font-weight:700;text-decoration:none}
img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--bd);margin:14px 0}
.gens{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;margin:8px 0}.gens li{background:var(--card);border:1px solid var(--bd);border-radius:999px;padding:2px 10px;font-size:14px}
dl dt{font-weight:700;margin-top:12px}dl dd{margin:2px 0 0}
nav,footer{font-size:14px;color:var(--sub)}footer{margin-top:40px}
</style>
</head>
<body>
<main>
<nav><a href="/">VoxoB</a> · ${lang === 'ja' ? '<a href="/en/">English</a>' : '<a href="/ja/">日本語</a>'}</nav>
<h1>${esc(c.h1)}</h1>
<p class="lead">${esc(c.lead)}</p>
<a class="cta" href="/">${esc(c.open)}</a>
<img src="/og-image.png" alt="VoxoB" width="1200" height="630" loading="lazy">
${body}
<h2>FAQ</h2>
<dl>${c.faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl>
<footer>${esc(c.by)} · <a href="https://github.com/ikemfr/voxob_webapp">GitHub</a></footer>
</main>
</body>
</html>
`;
  fs.mkdirSync(lang, { recursive: true });
  fs.writeFileSync(`${lang}/index.html`, page);
}
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['', 'ja/', 'en/'].map((p) => `  <url><loc>${BASE}${p}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
console.log('pages ja en, sitemap, robots');
