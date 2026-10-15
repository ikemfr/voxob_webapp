# 変換機能の発展と Shorts 制作：リサーチと方針

2026-10 調査。法律の記述は公開情報の要約であり、法的助言ではありません。

## 1. いまの VoxoB の変換機能

- 画像（PNG/JPG/GIF/BMP）→ 1ピクセル1ボクセルの平面。任意で「色から3D深さ生成」。
- 動画 → フレームごとに上と同じ変換をしてアニメーションに。
- OBJ/STL → ボクセル化。
- テキストからの変換はなし。

課題：どの入力も「平面かレリーフ」にしかならず、街・生き物・建物のような立体には自分で組み直す必要がある。

## 2. 他ツールの状況

| ツール | やり方 | 備考 |
|---|---|---|
| SupaVoxel（Web） | AI で奥行きを推定 | サーバー側の AI 処理 |
| Trellis2 Image to STL | 明るさ→高さ（ハイトマップ） | ボクセルではなくメッシュ |
| FileToVox / DGtal heightfield2vol | ハイトマップ→ボリューム | コマンドライン |

→ ブラウザだけで動き、データを送らずに、入力を「街・生き物・建物」という**作品の型**に組み替えるツールは見当たらない。VoxoB の強み（インストール不要・データを外に出さない）を保ったまま差別化できる。

## 3. 採用する変換の手法（AI・外部送信なし、端末内で完結）

| 変換 | 手法 | 根拠 |
|---|---|---|
| 生き物（ふくらませる） | 背景を除いて輪郭を取り、輪郭からの距離に √ をかけた厚みで前後に膨らませる | スケッチから丸い立体を作る「インフレーション」。Monster Mash はポアソン方程式で、REVIVE 3D は高さに √ をかけて丸みを出す。距離変換はその軽量な近似 |
| 街 | 画像を区画に分け、明るさや彩度で建物の高さを決め、道路・窓・屋上を付ける | 画像を「地図」として読む独自の手法 |
| 塔・器（回転体） | 行ごとのシルエット幅を縦軸のまわりに回転 | ろくろ（旋盤）と同じ考え方 |
| 地形 | 明るさ→高さ。高さで水・砂・草・岩・雪に塗り分け | ハイトマップ |
| レリーフ・平面 | 既存の機能 | — |
| 時間の彫刻（動画） | 動画の各フレームの前景を奥行き方向に積み、動きの軌跡を立体にする | スリットスキャン／Tx-transform（時間と空間の軸を入れ替える）の 3D 版 |

テキストは入力ボックスの文字を画面に描いて画像にし、上のどの変換にも通す（文字の街、風船文字、文字の山など）。

**変換過程**：どの変換も、ボクセルごとに「組み上がる順番」を持たせる。それに沿って途中経過をアニメーションのフレームとして残せる（建物が階ごとに伸びる、生き物が中心から膨らむ、塔が回転しながら一周する、など）。この過程がそのまま Shorts の素材になる。

## 4. 大きなキャンバスに向けた軽量化

- **現状**：ボクセル1個につきメッシュ1個とマテリアル1個。描画命令の回数がボクセル数に比例するため、数万個で極端に重くなる。
- **方針**：
  - 空間を 16³ のチャンクに分ける。
  - チャンクごとに、外から見える面だけを1つのジオメトリにまとめ、色は頂点カラーで持つ。
  - 変更されたチャンクだけを、次の描画フレームでまとめて作り直す。
  - 定説として、全体を1つに結合すると視野外カリングが効かなくなる。チャンク単位で結合するのが落としどころ。
- **クリック判定**：メッシュの交差判定をやめ、グリッドを直進して最初のボクセルを探す DDA に置き換える。ボクセル数に依存しない。
- **グリッド線**：線ごとの別オブジェクトをやめ、1本の LineSegments にまとめる。

## 5. Shorts の仕様（YouTube）

- 縦 9:16、1080×1920 推奨。長さは最大3分（2024年10月に延長）。30fps、MP4 推奨。
- 本プロジェクトでは 15〜25 秒とし、次の順に並べる。
  1. 元の素材（Before）
  2. 変換過程
  3. 完成品の回転（After）
  4. 終わりにアプリ名
- 公式ヘルプではなく第三者のまとめが出典のため、投稿前に YouTube ヘルプで最終確認すること。

## 6. 権利面の確認

| 論点 | 結論 | 対応 |
|---|---|---|
| 素材の著作権 | 自作か、権利を持つ素材だけを使う | サンプル Shorts の素材は**すべて自作**（自分で描いた図形・自作アニメーション・入力した文字）。パブリックドメインの絵画も使える場合があるが、国ごとの保護期間の違い、Commons の PD-Art の扱い、Content ID の誤検出（パブリックドメイン作品でも申し立てが起きた例が多い）のリスクがあるため、今回は使わない |
| 音楽 | 使わない（無音） | パブリックドメインの曲でも、市販の録音は Content ID に当たりうる。投稿者が YouTube の音源ライブラリなどで後から付ける |
| 建物の写真から変換 | 日本では著作権法46条により、建築の著作物は原則として写真・動画などで利用できる（例外：建物として複製する場合など） | アプリ内の注意書きで、自分で撮った写真の利用を勧める |
| 人物の写真 | 肖像権・パブリシティ権は著作権とは別に問題になる | 注意書きで、他人の顔が写った素材は避けるよう案内 |
| フォント | 日本では書体のデザイン自体は原則として著作物に当たらない（最高裁 2000年9月7日、ゴナU事件）。ただしフォントごとのライセンスは別 | サンプルは自由な利用を認めるフォント（DejaVu、IPAゴシック）で描画 |
| AI 表示 | 現実と見間違えるような合成コンテンツでなければ表示は不要。アニメーションや明らかに現実ではない表現は対象外 | ボクセル表現は対象外。そもそも生成 AI は使っていない |
| 収益化（「不正確な（inauthentic）コンテンツ」） | 2025年7月から「繰り返しの多い、大量生産されたコンテンツ」と明記された | 素材・変換・構図をそれぞれ変え、過程を見せることで独自の価値を出す。同じ型の量産はしない |
| 商標 | 他社のゲーム名・ロゴを使わない | 「マイクラ風」などの表記はタイトルやタグに入れない |

## 7. 出典

- YouTube Shorts の仕様：[Piktochart](https://piktochart.com/blog/how-long-youtube-shorts/), [postfa.st](https://postfa.st/sizes/youtube/shorts)
- AI・合成コンテンツの表示：[YouTube 公式ブログ](https://blog.youtube/news-and-events/disclosing-ai-generated-content), [Android Central](https://www.androidcentral.com/apps-software/youtube-ai-synthetic-content-disclosure)
- 収益化ポリシー：[YouTube ヘルプ](https://support.google.com/youtube/answer/1311392), [Search Engine Journal](https://www.searchenginejournal.com/youtube-clarifies-monetization-update-targeting-spam-not-reaction-channels/550123/), [Mediaweek](https://www.mediaweek.com.au/?p=242629)
- Content ID の誤検出：[Reclaim The Net](https://reclaimthenet.org/youtube-takes-down-public-domain-copyright-grounds), [incompetech](https://incompetech.com/music/royalty-free/contentid.html)
- 建築の著作物（46条）：[モノリス法律事務所](https://monolith.law/en/general-corporate/building-image-use-illegal)
- 書体の著作物性（ゴナU事件）：[WIPO Lex](https://www.wipo.int/wipolex/en/text/592960)
- パブリックドメインの扱い：Wikimedia Commons の PD-Art / PD-Japan テンプレート
- インフレーション：[Monster Mash（Google Research）](https://research.google/blog/monster-mash-a-sketch-based-tool-for-casual-3d-modeling-and-animation/), [REVIVE 3D](https://arxiv.org/pdf/2604.27504)
- 時間の彫刻：[Tx-transform](https://en.wikipedia.org/wiki/Tx-transform)
- チャンク化と結合：[three.js forum](https://discourse.threejs.org/t/what-is-the-most-efficient-way-to-render-complex-geometry/25326), [Babylon.js forum](https://forum.babylonjs.com/t/instanced-meshes-vs-merged-meshes/54848)
- 他ツール：[SupaVoxel](https://moge.ai/product/supavoxel), [Trellis2](https://trellis2.app/image-to-stl), [FileToVox](https://gitee.com/heng32032/FileToVox)
