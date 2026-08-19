# 出題演出（Remotion）の設計方針

フロントエンド実装はまだ先（データパイプラインが先）だが、方針だけ決めておく。

## なぜRemotion

Remotionは「Reactで動画を作る」フレームワークだが、`@remotion/player` を使うと事前レンダリング
無しでブラウザにインタラクティブなComposition（フレームベースのReactアニメーション）をそのまま
埋め込める。つまりmp4を焼く必要はなく、`<Player component={SameNameIntro} durationInFrames={90} .../>`
のようにゲーム画面へそのまま置ける。

- `useCurrentFrame()` / `interpolate()` でフレーム単位の値を決定論的に計算する
  → seed付きPRNGで生成した設問データと相性がよい（同じ設問なら同じ演出になる）
- 正解/不正解でComposition自体を差し替えるだけで演出の出し分けができる

## 依存

```bash
npm install remotion @remotion/player
```

pure-JS依存ゼロの suite-contract（game-engine-suite側の規約）はこのrepoには直接適用しないが、
Remotion関連は `src/remotion/` に閉じ込め、設問生成ロジック（`scripts/question-types/`）には
一切依存させない — データパイプラインは今まで通り依存ゼロで動かし続ける。

## 設問タイプ別の演出案

| タイプ | 演出 |
|---|---|
| `same-name` | 簡易SVG日本地図上に同名の2点が明滅 → 交互にズームイン→アウトを繰り返してから選択肢表示 |
| `vanished` | セピア調フィルター＋「解散」スタンプ演出。正解後に消滅年がフェードイン |
| `timeline-reason` | 複数の自治体の輪郭（簡易ポリゴン）が中央に寄って1つに溶け合うモーフィング |
| `portmanteau` | 旧地名の文字がバラバラに画面外から飛んできて新地名の位置に組み上がるタイポグラフィアニメ |
| `reading` | 漢字の上にふりがなが弾んで着地するアニメ（不正解の時だけ演出、正解時は即表示でテンポ優先） |
| `city-fact` | 棒グラフが左からスライドインして伸びる（人口・面積のランキング可視化） |
| `lore-trivia` | 出典（今尾恵介『番地の謎』等）をブックカバー風カードでめくって見せる |

## 実装配置（予定）

```
src/remotion/
  compositions/
    SameNameIntro.jsx
    VanishedReveal.jsx
    TimelineMorph.jsx
    PortmanteauAssemble.jsx
    ReadingFurigana.jsx
    CityFactBarChart.jsx
    LoreCard.jsx
  japan-map-svg.js      # 簡易日本地図（都道府県ポリゴン、japan-map-viewerとは独立に自前で持つ）
  Root.jsx               # 全Compositionの登録
public/
  quiz-app.jsx           # ゲーム本体。設問typeごとに対応するCompositionを選んでPlayerに渡す
```

## 決定論との整合

演出のランダム要素（明滅のタイミングのブレ等）も `Math.random` は使わず、設問の `id` をseedにした
PRNGから作る。同じ設問なら毎回同じ演出になる（プレイの再現性、デバッグのしやすさのため）。

## 簡易日本地図データ

`japan-map-viewer` のポリゴンデータ（`public/data/*.json`）は private repo かつ vacant-service系の
データを含むため使わない。都道府県境界は国土数値情報（国土交通省、公開データ）から自前で
簡略化したSVGパスを作る（低ポリゴンで十分 — 演出用であって精密な地図描画ではない）。
