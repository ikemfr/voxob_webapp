// Builds the search-friendly guide pages (/ja/, /en/, /es/, /pt/, /zh/), sitemap.xml and robots.txt next to index.html.
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
// and the other languages from site/i18n.js
const I18N = Function(`${fs.readFileSync('site/i18n.js', 'utf8')}; return I18N`)();
Object.entries(I18N).forEach(([lang, d]) => { GN[lang] = { ...d.GN, ...d.PLUS.gn } });
const LANGS = ['ja', 'en', 'es', 'pt', 'zh'];
// html lang, hreflang, og:locale, name in the language switcher
const LOC = { ja: ['ja', 'ja', 'ja_JP', '日本語'], en: ['en', 'en', 'en_US', 'English'], es: ['es', 'es', 'es_ES', 'Español'], pt: ['pt-BR', 'pt', 'pt_BR', 'Português'], zh: ['zh-CN', 'zh-Hans', 'zh_CN', '中文'] };
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
  es: {
    title: 'Cómo usar VoxoB — editor de vóxeles online gratis para crear voxel art',
    desc: `Cómo usar VoxoB, un editor de vóxeles gratis que funciona en el navegador del PC y del móvil, sin instalar ni registrarse: ${NG} generadores de un clic, botón Siguiente paso, animación por fotogramas, conversión de imágenes, vídeo y modelos 3D a vóxeles, y exportación OBJ, STL, GLB y MP4.`,
    h1: 'Cómo usar VoxoB — crea voxel art gratis',
    lead: 'VoxoB es un editor de vóxeles (píxeles en 3D) que funciona por completo en tu navegador. Crea pixel art en 3D y modelos de vóxeles en el ordenador, la tableta o el móvil. Sin instalar nada y sin registro. Tu trabajo nunca se sube: se guarda en el navegador que estás usando.',
    open: 'Abrir VoxoB (gratis)',
    toc: 'Contenido',
    home: 'Inicio',
    upd: 'Última actualización',
    alt: 'Captura de VoxoB: un modelo de vóxeles creado en el editor del navegador',
    stepsH: ['steps', 'Crea voxel art en 3 pasos'],
    steps: [
      ['Crea una forma', 'En la pestaña Crear del panel derecho, genera una casa, un castillo, un árbol, un terreno y más con un clic, o coloca vóxeles tú mismo con el lápiz y el rectángulo del panel izquierdo.'],
      ['Termínala', 'Pulsa ✨ Siguiente paso para añadir suelo, tejado, ventanas, sombreado y más; después cambia todos los colores con Estilo o Paleta.'],
      ['Exporta', 'Con Exportar, arriba a la derecha, guarda OBJ, STL, GLB, PNG o vídeo, listos para impresión 3D, recursos de juegos o redes sociales.'],
    ],
    s: [
      ['start', 'Primeros pasos', ['En tu primera visita puedes elegir: generar algo, empezar con un lienzo vacío o crearlo a partir de una imagen.', 'En el ordenador, elige una herramienta a la izquierda (lápiz, línea, rectángulo, círculo, relleno…) y haz clic en la vista 3D o en el corte 2D. Arrastra con el botón derecho para girar, Shift + arrastrar para mover y la rueda para hacer zoom.', 'En el móvil, abre los paneles desde la barra inferior o con Herramientas y Ajustes. Toca para colocar, usa dos dedos para girar y pellizca para hacer zoom.']],
      ['generators', `Generadores de un clic (${NG})`, null],
      ['next', 'Siguiente paso y estilos', ['Pulsa ✨ Siguiente paso arriba (o N) y VoxoB añade el siguiente paso lógico a lo que tienes: suelo, tejado, ventanas, árboles, sombreado o bordes más oscuros, solo los que encajan con la forma. Cada uno se puede deshacer con Ctrl+Z.', 'Estilo, en el panel derecho, cambia los colores de todo el modelo a la vez: japonés, retro, pastel, noche, otoño o mono. Paleta ofrece juegos como los colores tradicionales japoneses o una paleta retro de 16 colores.']],
      ['animation', 'Animación', ['Añade fotogramas y crea una animación fotograma a fotograma. Generar animación, en el panel derecho, convierte la forma actual en 26 tipos de movimiento: giro, péndulo, crecer, disolver y más.', 'Ajusta la velocidad con FPS y exporta vídeo WebM o MP4.']],
      ['import', 'Desde imágenes, vídeo y modelos 3D', ['Carga imágenes PNG / JPG / GIF / BMP, vídeo MP4 / WebM / MOV o modelos OBJ / STL y VoxoB los convierte en vóxeles. Las imágenes pueden tomar profundidad de sus colores: ideal para pasar pixel art a 3D.']],
      ['export', 'Exportar y guardar', ['Exporta OBJ (+MTL), STL para impresión 3D, GLB para motores de juego y web 3D, PNG, vídeo WebM / MP4 o JSON.', 'El trabajo se guarda en el navegador automáticamente y puedes tener varios proyectos con nombre. Compartir mete tu trabajo en una URL (no se guarda nada en un servidor).']],
    ],
    usesH: ['uses', 'Para qué se usa'],
    uses: [
      'Modelos para impresión 3D (exportación STL)',
      'Recursos de juego e iconos para Blender, Unity, Godot y más (OBJ / GLB)',
      'Casas, ciudades, santuarios y pagodas japonesas hechos con bloques',
      'Animaciones giratorias y vídeos cortos para redes sociales (MP4 / WebM)',
      'Aprender 3D y geometría espacial en clase o en casa, incluso en equipos donde no se pueden instalar apps',
    ],
    keysH: ['keys', 'Atajos de teclado'],
    keys: [
      ['B', 'Lápiz'], ['L', 'Línea'], ['R / Shift+R', 'Rectángulo / rectángulo lleno'], ['C / Shift+C', 'Círculo / círculo lleno'], ['Q', 'Elipse'],
      ['G / F', 'Rellenar / rellenar corte'], ['I', 'Cuentagotas'], ['S', 'Seleccionar'], ['E', 'Dibujar ⇄ borrar'], ['N', '✨ Siguiente paso'],
      ['[ / ]', 'Pincel más pequeño / más grande'], ['↑ / ↓', 'Subir / bajar el corte'], ['← / →', 'Fotograma anterior / siguiente'], ['Space', 'Reproducir / parar la animación'],
      ['Ctrl+Z / Ctrl+Y', 'Deshacer / rehacer'], ['Ctrl+V', 'Pegar'], ['Ctrl+S', 'Guardar'], ['Esc', 'Cancelar la acción actual'],
    ],
    keyCols: ['Tecla', 'Acción'],
    faqH: ['faq', 'Preguntas frecuentes'],
    faq: [
      ['¿Es gratis?', 'Sí. Y no hace falta registrarse.'],
      ['¿Hay que instalar algo?', 'No. Abre la página en un navegador como Chrome, Safari, Edge o Firefox. Se necesita un dispositivo compatible con WebGL.'],
      ['¿Dónde se guardan mis datos?', 'Solo en tu navegador (localStorage). Si borras los datos del navegador, se pierden, así que exporta en JSON los trabajos importantes.'],
      ['¿Funciona en el móvil?', 'Sí. Toca para colocar, dos dedos para girar y pellizca para hacer zoom. Funciona en iPhone, Android e iPad.'],
      ['¿Puedo usar mis modelos en Blender o Unity?', 'Sí. Exporta OBJ (+MTL) o GLB e impórtalo en Blender, Unity, Godot y otras herramientas 3D y motores de juego.'],
      ['¿Puedo imprimir mi modelo en 3D?', 'Sí. Exporta STL y ábrelo en tu laminador (Cura, PrusaSlicer, etc.).'],
      ['¿Puede convertir una imagen en vóxeles?', 'Sí. Carga un PNG / JPG / GIF / BMP y se convierte en vóxeles, con profundidad según sus colores si quieres. También convierte vídeo y modelos OBJ / STL.'],
      ['¿En qué se diferencia de MagicaVoxel?', 'VoxoB funciona en el navegador sin instalar nada y también en el móvil. Los generadores de un clic y Siguiente paso te dan una forma sin colocar cada vóxel a mano.'],
    ],
    by: 'Hecho por Ike mfr (proyecto independiente)',
  },
  pt: {
    title: 'Como usar o VoxoB — editor de voxels online grátis para criar voxel art',
    desc: `Como usar o VoxoB, um editor de voxels grátis que roda no navegador do PC e do celular, sem instalar nem criar conta: ${NG} geradores de um clique, botão Próximo passo, animação quadro a quadro, conversão de imagens, vídeo e modelos 3D em voxels, e exportação OBJ, STL, GLB e MP4.`,
    h1: 'Como usar o VoxoB — crie voxel art de graça',
    lead: 'O VoxoB é um editor de voxels (pixels em 3D) que roda inteiramente no seu navegador. Crie pixel art 3D e modelos de voxels no computador, no tablet ou no celular. Sem instalação e sem cadastro. Seu trabalho nunca é enviado: ele fica salvo no navegador que você está usando.',
    open: 'Abrir o VoxoB (grátis)',
    toc: 'Conteúdo',
    home: 'Início',
    upd: 'Última atualização',
    alt: 'Tela do VoxoB: um modelo de voxels criado no editor do navegador',
    stepsH: ['steps', 'Crie voxel art em 3 passos'],
    steps: [
      ['Crie uma forma', 'Na aba Criar do painel direito, gere uma casa, um castelo, uma árvore, um terreno e mais com um clique, ou coloque voxels você mesmo com o lápis e o retângulo do painel esquerdo.'],
      ['Finalize', 'Toque em ✨ Próximo passo para adicionar chão, telhado, janelas, sombreamento e mais; depois mude todas as cores com Estilo ou Paleta.'],
      ['Exporte', 'Em Exportar, no canto superior direito, salve OBJ, STL, GLB, PNG ou vídeo, prontos para impressão 3D, assets de jogos ou redes sociais.'],
    ],
    s: [
      ['start', 'Primeiros passos', ['Na primeira visita você pode escolher: gerar algo, começar com a tela vazia ou criar a partir de uma imagem.', 'No computador, escolha uma ferramenta à esquerda (lápis, linha, retângulo, círculo, preencher…) e clique na vista 3D ou no corte 2D. Arraste com o botão direito para girar, Shift + arrastar para mover e use a roda para dar zoom.', 'No celular, abra os painéis pela barra inferior ou por Ferramentas e Ajustes. Toque para colocar, use dois dedos para girar e faça pinça para dar zoom.']],
      ['generators', `Geradores de um clique (${NG})`, null],
      ['next', 'Próximo passo e estilos', ['Toque em ✨ Próximo passo no topo (ou N) e o VoxoB adiciona o próximo passo lógico ao que você tem: chão, telhado, janelas, árvores, sombreamento ou bordas mais escuras, apenas os que combinam com a forma. Cada um pode ser desfeito com Ctrl+Z.', 'Estilo, no painel direito, muda as cores do modelo inteiro de uma vez: japonês, retrô, pastel, noite, outono ou mono. Paleta traz conjuntos como as cores tradicionais japonesas e uma paleta retrô de 16 cores.']],
      ['animation', 'Animação', ['Adicione quadros e monte uma animação quadro a quadro. Gerar animação, no painel direito, transforma a forma atual em 26 tipos de movimento: giro, pêndulo, crescer, dissolver e mais.', 'Ajuste a velocidade com o FPS e exporte vídeo WebM ou MP4.']],
      ['import', 'A partir de imagens, vídeo e modelos 3D', ['Carregue imagens PNG / JPG / GIF / BMP, vídeo MP4 / WebM / MOV ou modelos OBJ / STL e o VoxoB os transforma em voxels. As imagens podem ganhar profundidade a partir das cores: ótimo para levar pixel art ao 3D.']],
      ['export', 'Exportar e salvar', ['Exporte OBJ (+MTL), STL para impressão 3D, GLB para engines de jogos e web 3D, PNG, vídeo WebM / MP4 ou JSON.', 'O trabalho é salvo no navegador automaticamente, e você pode manter vários projetos com nome. Compartilhar coloca seu trabalho em uma URL (nada é guardado em servidor).']],
    ],
    usesH: ['uses', 'Para que serve'],
    uses: [
      'Modelos para impressão 3D (exportação STL)',
      'Assets de jogos e ícones para Blender, Unity, Godot e mais (OBJ / GLB)',
      'Casas, cidades, santuários e pagodes japoneses feitos de blocos',
      'Animações giratórias e vídeos curtos para redes sociais (MP4 / WebM)',
      'Aprender 3D e geometria espacial na escola ou em casa, até em aparelhos onde não dá para instalar apps',
    ],
    keysH: ['keys', 'Atalhos de teclado'],
    keys: [
      ['B', 'Lápis'], ['L', 'Linha'], ['R / Shift+R', 'Retângulo / retângulo cheio'], ['C / Shift+C', 'Círculo / círculo cheio'], ['Q', 'Elipse'],
      ['G / F', 'Preencher / preencher corte'], ['I', 'Conta-gotas'], ['S', 'Selecionar'], ['E', 'Desenhar ⇄ apagar'], ['N', '✨ Próximo passo'],
      ['[ / ]', 'Pincel menor / maior'], ['↑ / ↓', 'Subir / descer o corte'], ['← / →', 'Quadro anterior / próximo'], ['Space', 'Reproduzir / parar a animação'],
      ['Ctrl+Z / Ctrl+Y', 'Desfazer / refazer'], ['Ctrl+V', 'Colar'], ['Ctrl+S', 'Salvar'], ['Esc', 'Cancelar a ação atual'],
    ],
    keyCols: ['Tecla', 'Ação'],
    faqH: ['faq', 'Perguntas frequentes'],
    faq: [
      ['É grátis?', 'Sim. E não precisa criar conta.'],
      ['Preciso instalar alguma coisa?', 'Não. Abra a página em um navegador como Chrome, Safari, Edge ou Firefox. É preciso um aparelho com suporte a WebGL.'],
      ['Onde meus dados ficam salvos?', 'Só no seu navegador (localStorage). Limpar os dados do navegador apaga tudo, então exporte em JSON os trabalhos importantes.'],
      ['Funciona no celular?', 'Sim. Toque para colocar, dois dedos para girar e pinça para dar zoom. Funciona no iPhone, Android e iPad.'],
      ['Posso usar meus modelos no Blender ou no Unity?', 'Sim. Exporte OBJ (+MTL) ou GLB e importe no Blender, Unity, Godot e outras ferramentas 3D e engines de jogos.'],
      ['Posso imprimir meu modelo em 3D?', 'Sim. Exporte STL e abra no seu fatiador (Cura, PrusaSlicer etc.).'],
      ['Dá para converter uma imagem em voxels?', 'Sim. Carregue um PNG / JPG / GIF / BMP e ele vira voxels, com profundidade pelas cores se quiser. Vídeos e modelos OBJ / STL também podem ser convertidos.'],
      ['Qual a diferença para o MagicaVoxel?', 'O VoxoB roda no navegador sem instalar nada e funciona no celular. Os geradores de um clique e o Próximo passo criam uma forma sem você colocar cada voxel à mão.'],
    ],
    by: 'Feito por Ike mfr (projeto independente)',
  },
  zh: {
    title: 'VoxoB 使用指南｜免费在线体素编辑器・体素画制作工具（浏览器・手机均可）',
    desc: `免安装、免注册的免费体素编辑器 VoxoB 使用指南。${NG} 种一键自动生成、“下一步”按钮、逐帧动画、图片／视频／3D 模型转体素，以及 OBJ・STL・GLB・MP4 导出，手机也能用。`,
    h1: 'VoxoB 使用指南 — 免费制作体素画',
    lead: 'VoxoB 是一款完全在浏览器中运行的体素（立方体像素）编辑器。在电脑、平板或手机上就能制作 3D 像素画和体素模型。无需安装，无需登录。作品不会上传到外部，只保存在你正在使用的浏览器中。',
    open: '打开 VoxoB（免费）',
    toc: '目录',
    home: '首页',
    upd: '最后更新',
    alt: 'VoxoB 截图：用浏览器体素编辑器制作的作品',
    stepsH: ['steps', '三步制作体素画'],
    steps: [
      ['做出形状', '在右侧面板的“制作”标签中，一键自动生成房子、城堡、树木、地形等，或用左侧的画笔、矩形工具从零开始放置体素。'],
      ['完善细节', '点“✨ 下一步”添加地面、屋顶、窗户、阴影等，再用“风格转换”或“配色”统一整体颜色。'],
      ['导出', '从右上角的“导出”保存为 OBJ・STL・GLB・PNG 或视频，可直接用于 3D 打印、游戏素材或发到社交媒体。'],
    ],
    s: [
      ['start', '快速上手', ['第一次打开页面时，可以选择“自动生成试试”“从空白画布开始”“从图片制作”三种方式。', '在电脑上，从左侧选择工具（画笔、直线、矩形、圆、填充等），点击 3D 视图或 2D 截面即可放置。右键拖动旋转，Shift＋拖动平移，滚轮缩放。', '在手机上，用底部栏或上方的“工具”“设置”打开面板。单指点按放置，双指旋转，捏合缩放。']],
      ['generators', `一键自动生成（${NG} 种）`, null],
      ['next', '下一步与风格转换', ['点击上方的“✨ 下一步”（键盘为 N），会为当前作品添加一个合适的步骤：铺地面、加屋顶、开窗户、种树、加阴影、加深边角，只挑选适合当前形状的。每一步都可以用 Ctrl+Z 撤销。', '右侧面板的“风格转换”可一次性把整个作品的颜色换成和风、复古、马卡龙、夜晚、秋天或黑白。“配色”中可以选择日本传统色、复古 16 色等调色板。']],
      ['animation', '动画', ['添加帧即可制作逐帧动画。右侧面板的“生成动画”能把当前形状自动做成旋转、摆动、生长、溶解等 26 种动作。', '用 FPS 调整播放速度，并导出为 WebM / MP4 视频。']],
      ['import', '从图片、视频和 3D 模型制作', ['读取 PNG / JPG / GIF / BMP 图片、MP4 / WebM / MOV 视频或 OBJ / STL 3D 模型，即可转换为体素。图片还能根据颜色生成深度，很适合把像素画变成立体。']],
      ['export', '导出与保存', ['可导出 OBJ（＋MTL）、STL（适合 3D 打印）、GLB（适合游戏引擎和 Web 3D）、PNG、WebM / MP4 视频以及 JSON。', '作品会自动保存在浏览器中，也可以命名保存多个项目。“分享”会把作品打包进 URL 发送（不会保存到服务器）。']],
    ],
    usesH: ['uses', '适用场景'],
    uses: [
      '制作 3D 打印模型（导出 STL）',
      '为 Blender、Unity、Godot 等制作游戏素材和图标（OBJ / GLB）',
      '用方块搭建房屋、街景，以及和风神社、五重塔',
      '发到社交媒体的旋转动画和短视频（MP4 / WebM）',
      '在学校或家里学习 3D 与空间图形（无法安装软件的设备也能用）',
    ],
    keysH: ['keys', '键盘快捷键'],
    keys: [
      ['B', '画笔'], ['L', '直线'], ['R / Shift+R', '矩形 / 实心矩形'], ['C / Shift+C', '圆 / 实心圆'], ['Q', '椭圆'],
      ['G / F', '填充 / 截面填充'], ['I', '吸管'], ['S', '选择范围'], ['E', '绘制 ⇄ 删除'], ['N', '✨ 下一步'],
      ['[ / ]', '画笔变小 / 变大'], ['↑ / ↓', '截面上移 / 下移'], ['← / →', '上一帧 / 下一帧'], ['Space', '播放 / 停止动画'],
      ['Ctrl+Z / Ctrl+Y', '撤销 / 重做'], ['Ctrl+V', '粘贴'], ['Ctrl+S', '保存'], ['Esc', '取消当前操作'],
    ],
    keyCols: ['按键', '操作'],
    faqH: ['faq', '常见问题'],
    faq: [
      ['免费吗？', '是的，完全免费，也不需要注册。'],
      ['需要安装吗？', '不需要。用 Chrome、Safari、Edge、Firefox 等浏览器打开页面即可使用。需要支持 WebGL 的设备。'],
      ['数据保存在哪里？', '只保存在你的浏览器中（localStorage）。清除浏览器数据后会丢失，重要的作品请导出为 JSON。'],
      ['手机可以用吗？', '可以。单指点按放置，双指旋转，捏合缩放。支持 iPhone、Android 和 iPad。'],
      ['可以在 Blender 或 Unity 中使用吗？', '可以。导出 OBJ（＋MTL）或 GLB 后，就能导入 Blender、Unity、Godot 等 3D 软件和游戏引擎。'],
      ['可以 3D 打印吗？', '可以。导出 STL，再用切片软件（Cura、PrusaSlicer 等）打开即可。'],
      ['可以把图片转换成体素吗？', '可以。读取 PNG / JPG / GIF / BMP 即可转换为体素，还能根据颜色生成深度。视频和 OBJ / STL 模型也能转换。'],
      ['和 MagicaVoxel 有什么不同？', 'VoxoB 无需安装，在浏览器中就能运行，手机上也能用。一键自动生成和“下一步”让你不必逐个放置体素也能做出形状。'],
    ],
    by: '作者：Ike mfr（个人开发）',
  },
};

// short looping clips recorded by site/demos.mjs: [scene, section it belongs to, width, height, seconds]
const DEMOS = [['draw', 'start', 760, 470, 15], ['generate', 'generators', 674, 606, 12], ['next', 'next', 760, 660, 13], ['style', 'next', 674, 606, 15], ['animate', 'animation', 674, 672, 7], ['export', 'export', 760, 600, 3]];
const CAP = {
  ja: { draw: '塗り矩形で1段ずつ重ね、ペンで仕上げる。2D 断面で描いた分が右の 3D にすぐ出ます。', generate: '「作る」タブのボタンを押すだけで、城・五重塔・街・家ができあがります。', next: '「✨ 次の一手」を押すたびに、地面・木・陰影など今の形に合う工程がひとつ足されます。', style: '「スタイル変換」で和風・夜・パステル・秋へ。形はそのまま、色だけが一度に変わります。', animate: '「アニメ生成」で弾む動きを付けて再生。', export: '「エクスポート」から OBJ・STL・GLB・PNG・動画・JSON を選んで保存。' },
  en: { draw: 'Stack filled rectangles one layer at a time, then finish with the pen. What you draw on the 2D slice appears in 3D right away.', generate: 'One click in the Make tab builds a castle, a pagoda, a city or a house.', next: 'Each press of ✨ Next move adds one step that fits the shape: ground, trees, shading and more.', style: 'Style switches to Japanese, night, pastel or autumn. The shape stays; only the colours change.', animate: 'An animation generator adds a bounce, then Play.', export: 'Export to OBJ, STL, GLB, PNG, video or JSON.' },
  es: { draw: 'Apila rectángulos llenos capa a capa y termina con el lápiz. Lo que dibujas en el corte 2D aparece al instante en 3D.', generate: 'Un clic en la pestaña Crear construye un castillo, una pagoda, una ciudad o una casa.', next: 'Cada pulsación de ✨ Siguiente paso añade un paso que encaja con la forma: suelo, árboles, sombreado y más.', style: 'Estilo cambia a japonés, noche, pastel u otoño. La forma se queda; solo cambian los colores.', animate: 'Un generador de animación añade un rebote y luego se reproduce.', export: 'Exporta a OBJ, STL, GLB, PNG, vídeo o JSON.' },
  pt: { draw: 'Empilhe retângulos cheios camada por camada e finalize com o lápis. O que você desenha no corte 2D aparece na hora em 3D.', generate: 'Um clique na aba Criar monta um castelo, um pagode, uma cidade ou uma casa.', next: 'Cada toque em ✨ Próximo passo adiciona um passo que combina com a forma: chão, árvores, sombreamento e mais.', style: 'Estilo troca para japonês, noite, pastel ou outono. A forma fica; só as cores mudam.', animate: 'Um gerador de animação adiciona um quique e depois reproduz.', export: 'Exporte para OBJ, STL, GLB, PNG, vídeo ou JSON.' },
  zh: { draw: '用实心矩形一层层叠起来，再用画笔收尾。在 2D 截面上画的内容会立即出现在 3D 中。', generate: '在“制作”标签中点一下，就能生成城堡、五重塔、城市或房子。', next: '每按一次“✨ 下一步”，就会添加一个适合当前形状的步骤：地面、树木、阴影等。', style: '“风格转换”可切换为和风、夜晚、马卡龙或秋天。形状不变，只有颜色一次性改变。', animate: '用“生成动画”加上弹跳动作并播放。', export: '从“导出”中选择 OBJ、STL、GLB、PNG、视频或 JSON 保存。' },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ICON = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23151820'/><path d='M50 20L80 38V72L50 90L20 72V38Z' fill='%2300d4f0'/><path d='M50 20V55L80 38' fill='%239050f0'/><path d='M20 38L50 55V90' fill='%23f03070'/></svg>`;
const h2 = ([id, t]) => `<h2 id="${id}">${esc(t)}</h2>`;
const fig = (lang, [n, , w, h]) => `<figure class="demo"><video poster="/media/${lang}/${n}.jpg" width="${w}" height="${h}" muted loop playsinline preload="none" aria-label="${esc(CAP[lang][n])}"><source src="/media/${lang}/${n}.webm" type="video/webm"><source src="/media/${lang}/${n}.mp4" type="video/mp4"></video><figcaption>${esc(CAP[lang][n])}</figcaption></figure>`;
for (const lang of LANGS) {
  const c = C[lang], url = `${BASE}${lang}/`;
  const gens = Object.values(GN[lang]).map((n) => `<li>${esc(half(n))}</li>`).join('');
  const toc = [c.stepsH, ...c.s.map(([id, h]) => [id, h]), c.usesH, c.keysH, c.faqH];
  const body = [
    `${h2(c.stepsH)}<ol class="steps">${c.steps.map(([t, d]) => `<li><b>${esc(t)}</b>${lang === 'ja' || lang === 'zh' ? '：' : ': '}${esc(d)}</li>`).join('')}</ol>`,
    ...c.s.map(([id, h, ps]) => `${h2([id, h])}${ps ? ps.map((p) => `<p>${esc(p)}</p>`).join('') : `<ul class="gens">${gens}</ul>`}${DEMOS.filter((d) => d[1] === id).map((d) => fig(lang, d)).join('')}`),
    `${h2(c.usesH)}<ul>${c.uses.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>`,
    `${h2(c.keysH)}<table class="keys"><thead><tr><th>${esc(c.keyCols[0])}</th><th>${esc(c.keyCols[1])}</th></tr></thead><tbody>${c.keys.map(([k, a]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(a)}</td></tr>`).join('')}</tbody></table>`,
    `${h2(c.faqH)}<dl>${c.faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl>`,
  ].join('\n');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: c.title, description: c.desc, inLanguage: LOC[lang][0], dateModified: TODAY, primaryImageOfPage: `${BASE}og-image.png`,
        isPartOf: { '@type': 'WebSite', '@id': `${BASE}#site`, name: 'VoxoB', url: BASE },
        about: { '@type': 'WebApplication', '@id': `${BASE}#app`, name: 'VoxoB', url: BASE, applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' } },
        author: { '@type': 'Person', name: 'Ike mfr' } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'VoxoB', item: BASE }, { '@type': 'ListItem', position: 2, name: c.h1.split(' — ')[0], item: url }] },
      { '@type': 'HowTo', name: c.stepsH[1], inLanguage: LOC[lang][0], tool: { '@type': 'HowToTool', name: 'VoxoB' }, step: c.steps.map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text, url: `${url}#steps` })) },
      ...DEMOS.map(([n, , w, h, sec]) => ({ '@type': 'VideoObject', name: `VoxoB — ${CAP[lang][n].split(/[。.]/)[0]}`, description: CAP[lang][n], inLanguage: LOC[lang][0], thumbnailUrl: `${BASE}media/${lang}/${n}.jpg`, contentUrl: `${BASE}media/${lang}/${n}.mp4`, uploadDate: TODAY, duration: `PT${sec}S`, width: w, height: h })),
      { '@type': 'FAQPage', mainEntity: c.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const page = `<!DOCTYPE html>
<html lang="${LOC[lang][0]}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.desc)}">
<meta name="author" content="Ike mfr">
<meta name="theme-color" content="#0e1018">
<link rel="icon" href="${ICON}">
<link rel="canonical" href="${url}">
${LANGS.map((l) => `<link rel="alternate" hreflang="${LOC[l][1]}" href="${BASE}${l}/">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${BASE}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="VoxoB">
<meta property="og:locale" content="${LOC[lang][2]}">
${LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOC[l][2]}">`).join('\n')}
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
.demo{margin:14px 0 18px}.demo video{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--bd);background:#0e1018;cursor:pointer}.demo figcaption{font-size:14px;color:var(--sub);margin-top:6px}
.keys{border-collapse:collapse;width:100%;font-size:15px}.keys th,.keys td{border-bottom:1px solid var(--bd);padding:6px 8px;text-align:left}.keys th{color:var(--sub);font-weight:600}
kbd{font:13px ui-monospace,monospace;background:var(--card);border:1px solid var(--bd);border-radius:4px;padding:1px 6px;white-space:nowrap}
dl dt{font-weight:700;margin-top:12px}dl dd{margin:2px 0 0}
nav,footer{font-size:14px;color:var(--sub)}footer{margin-top:40px}
</style>
</head>
<body>
<main>
<nav aria-label="breadcrumb"><a href="/">VoxoB</a> › ${esc(c.h1.split(' — ')[0])} · ${LANGS.filter((l) => l !== lang).map((l) => `<a href="/${l}/" hreflang="${LOC[l][1]}" lang="${LOC[l][0]}">${LOC[l][3]}</a>`).join(' · ')}</nav>
<h1>${esc(c.h1)}</h1>
<p class="lead">${esc(c.lead)}</p>
<a class="cta" href="/">${esc(c.open)}</a>
<img src="/og-image.png" alt="${esc(c.alt)}" width="1200" height="630" fetchpriority="high">
<nav class="toc" aria-label="${esc(c.toc)}"><b>${esc(c.toc)}</b><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav>
${body}
<p><a class="cta" href="/">${esc(c.open)}</a></p>
<script>
// clips play only while on screen (and not at all with reduced motion: tap to play instead)
(() => { const vs = document.querySelectorAll('.demo video'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  vs.forEach((v) => v.addEventListener('click', () => v.paused ? v.play() : v.pause()));
  if (still || !('IntersectionObserver' in window)) { vs.forEach((v) => { v.controls = true; v.preload = 'metadata' }); return }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause() }), { threshold: .35 });
  vs.forEach((v) => io.observe(v)) })();
</script>
<footer>${esc(c.by)} · <a href="https://github.com/ikemfr/voxob_webapp">GitHub</a> · ${esc(c.upd)}: <time datetime="${TODAY}">${TODAY}</time></footer>
</main>
</body>
</html>
`;
  fs.mkdirSync(lang, { recursive: true });
  fs.writeFileSync(`${lang}/index.html`, page);
}
const alt = [...LANGS.map((l) => [LOC[l][1], `${l}/`]), ['x-default', '']].map(([h, p]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${BASE}${p}"/>`).join('');
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['', ...LANGS.map((l) => `${l}/`)].map((p) => `  <url><loc>${BASE}${p}</loc><lastmod>${TODAY}</lastmod>${alt}</url>`).join('\n')}
</urlset>
`);
fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
console.log(`pages ${LANGS.join(' ')}, sitemap, robots`);
