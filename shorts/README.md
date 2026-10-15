# VoxoB サンプル Shorts

VoxoB の「変換」で作った縦長動画のサンプルです。1080×1920、30fps、H.264 MP4、無音、約14秒。

各動画は次の順に進みます。
1. 元の素材（BEFORE）
2. 変換の過程
3. 完成品をぐるっと一周（AFTER）
4. 最後に真上から見下ろして「VoxoB — voxob.vercel.app」

| ファイル | 素材 | 変換 |
|---|---|---|
| `bird-creature.mp4` | `src/bird.svg`（自作イラスト） | 🐾 生き物 |
| `town-city.mp4` | `src/town.svg`（自作の地図風イラスト） | 🏙 街 |
| `pagoda-tower.mp4` | `src/pagoda.svg`（自作の塔のシルエット） | 🏯 塔 |
| `island-terrain.mp4` | `src/island.svg`（自作のグラデーション＝高さ） | ⛰ 地形 |
| `text-city.mp4` | 文字「VoxoB」（自分で入力） | 🏙 街 |
| `dance-time.mp4` | `src/dance.webm`（make.mjs がその場で描いて録画した自作アニメーション） | ⏳ 時間の彫刻 |

## 権利について

- **素材はすべてこのプロジェクトのために作ったもの**です。他人の写真・イラスト・映像・パブリックドメイン作品は使っていません。`src/` の素材は CC0（自由に利用可）として扱えます。
- **音楽は入っていません。** 付ける場合は YouTube のオーディオライブラリなど、利用条件がはっきりした音源を使ってください。パブリックドメインの曲でも、市販の録音は Content ID で申し立てを受けることがあります。
- **文字の描画**には、ブラウザが選んだフォントを使います。このサンプルを作った環境では Inter（SIL Open Font License。出力物の利用に制限なし）が使われ、動画内の日本語の見出しは IPAゴシック（IPAフォントライセンス）で表示されました。日本では書体のデザイン自体は原則として著作物に当たりません（最高裁 2000年、ゴナU事件）。ただし配布物にするときは、そのフォントのライセンスも確認してください。
- **生成 AI は使っていません。** 明らかに現実ではないボクセル表現なので、YouTube の「改変または合成されたコンテンツ」の表示も不要です。
- 詳しい調査と出典は [`docs/research-conversion-shorts.md`](../docs/research-conversion-shorts.md) にあります。

## 投稿のヒント

- タイトルに他社のゲーム名やロゴ（「マイクラ風」など）を入れない。
- 同じ型の動画を量産すると、YouTube の「繰り返しの多いコンテンツ」に当たりやすくなる。素材・変換・見せ方を毎回変える。
- 説明欄に「VoxoB（https://voxob.vercel.app/）で作成」と書くと、見た人がアプリにたどり着ける。

## 作り直す

```sh
node shorts/make.mjs                  # 全部
node shorts/make.mjs bird-creature    # 1本だけ
```

Playwright（Chromium）と ffmpeg が必要です。フレームを1枚ずつ描いて ffmpeg に渡すので、遅いマシンでもコマ落ちしません。

アプリの「📱 ショート動画 (9:16)」ボタンでも同じ構成の動画を書き出せます。H.264 で録画できるブラウザ（Chrome・Edge・Safari）では MP4、それ以外では WebM になります。YouTube はどちらも受け付けます。

このフォルダはサイトには公開されません（`.vercelignore` で除外）。

## くるくる風車（ホラー・ループ動画）

`node shorts/windmill.mjs` → `shorts/fx/windmill-loop.mp4`（サムネイル・説明文つき、13秒）。

- 絵文字はすべて VoxoB の「テキスト → 3D」（`VoxoBConvert.textCanvas` → 🐾 生き物）で立体化。👆 / 👈😁👉 / 👇 と 🫵 / 🫵🫪🫵 / 🫵。
- 🫪（U+1FAEA）はコンテナのシステム絵文字フォントに無いので、Fontsource の Noto Color Emoji（COLR 版の `emoji-400.css`。範囲別サブセットは SVG 形式で Chrome が描けない）を読み込んでいます。
- 文字は日本語書体のみ：Dela Gothic One・Shippori Mincho B1・DotGothic16（いずれも OFL、`shorts/fonts.mjs` が npm から `shorts/.fonts` に取得、コミットしない）。
- 流れ：静止画ノイズから始まる（前のループの終わりとつながる）→ オルゴールで回る（ボクセル → なめらか）、逆回転のネガの影と1コマだけの顔 → 減速して停止・暗転・無音 → 絶叫と共に 🫪 に変身 → 突進・震え・ジグザグ・回転激突 → ノイズへ。
- 効果音は `shorts/synth.mjs` で合成（オルゴール・ドローン・心音・絶叫・弦の不協和音・ノイズなど。`fx.mjs` と共用）。
