# chimei-quiz MCP 化調査（Phase 1）

## 概要

chimei-quiz は日本の地名・自治体まわりの雑学クイズゲーム。同名地名・消えた市町村・合成地名・自治体変遷推理・難読地名・ご当地トリビアなど **9 カテゴリ 3,099 問** を公開データ（Wikidata / e-Stat / 番地の謎）から機械生成し、React + Remotion の SPA として静的配信する。`server.js` は `dist/` の静的配信のみで `/healthz` を持つ。既に volta にホスト済み（`https://chimei-quiz.unlaxer.org`）。

## 判定と理由

**判定: `skill-only`** — tool は置かず、skill と resource のみ配る。

このリポジトリの核心はブラウザで遊ぶクイズゲームであり、エージェントが呼びたい操作（入力→出力が定義された副作用付き処理）は存在しない。`server.js` は静的配信のみで API エンドポイントを持たない。一方、データパイプライン（Wikidata / municipality-history / address-lore から 3,099 問を機械生成する手順）とクイズ設問設計のノウハウ（難読地名のキュレーション方針、distractor 戦略、決定論的生成）は、他の地名・住所系サービスと組み合わせる際に有用な手続き知識になる。したがって tool は置かず、skill（locality: repo/service）と resource（spec/guide/クイズデータのメタデータ）のみ配る方針とする。

## 公開候補

| kind | name | io / 説明 | 副作用 | 長時間 |
|---|---|---|---|---|
| resource | `spec` | `chimei_quiz://spec` — 9カテゴリ・3,099問の設問セット仕様 | read | no |
| resource | `guide` | `chimei_quiz://guide` — ブラウザでの遊び方・デイリークイズの仕組み | read | no |
| resource | `municipality-master` | `chimei_quiz://municipality-master` — 現存自治体1,754件（人口・面積付き） | read | no |
| resource | `municipality-changes` | `chimei_quiz://municipality-changes` — 自治体変遷3,507件（1970-2024） | read | no |
| resource | `quiz-data` | `chimei_quiz://quiz/{category}` — カテゴリ別設問JSON | read | no |
| skill | `build-quiz-data` | 公開データから設問セットをビルドする手順（locality: repo） | — | — |
| skill | `question-pattern-design` | 設問パターン設計のノウハウ（locality: repo） | — | — |
| skill | `compose-quiz-from-data` | 自治体データから新設問カテゴリを企画する手順（locality: service） | — | — |

## 組み合わせ例

1. `municipality_history__lookup`（将来MCP化）で変遷データを取得 → `chimei_quiz://quiz/timeline-reason` で設問を参照 → `adoyose__normalize` で関連住所を正規化して周辺情報を補足
2. `chimei_quiz://municipality-master` で人口トップ10を取得 → `kamishibai` で「日本の市人口ランキングクイズ」動画を生成 → `index` で公開
3. `chimei_quiz://quiz/reading`（難読地名）を参照 → 地図サービス（将来MCP化）で該当地名をプロットして可視化

## 依存と協調

| 相手 repo | 方向 | 能力 | 現在存在 | 備考 |
|---|---|---|---|---|
| municipality-history | depends_on | 自治体変遷履歴データ（estat-haichi.csv） | yes | volta catalog に library として登録済み・MCP バックエンド未搭載 |
| address-lore | depends_on | 住所知識エントリ（番地の謎） | no | volta catalog に未登録 |
| Wikidata | depends_on | 現存自治体の人口・面積（SPARQL） | yes | 外部サービス・MCP 入口ではない |
| adoyose | provides_to | 地名・自治体データのコンテキスト提供 | no | chimei-quiz 側に API が無いため提供入口は未実装 |

ビルド時に `municipality-history` と `address-lore` のローカル clone（`~/work/adoyose-workspace/` 配下）を読む。`municipality-history` は volta catalog に library として登録済みだが MCP バックエンドは未搭載。`address-lore` は catalog に未登録。

## ライブラリのサーバ化

該当しない（既に service として volta にホスト済み）。`library_serve.needed = false`。

## リスク

- クイズデータはビルド時に生成された静的 JSON のみ。実行時にデータを更新する仕組みがないため、MCP resource として配る場合はビルド済み JSON を読む形になる（鮮度はデプロイタイミングに依存）
- `all.json` が1.8MB・`municipality-master.json` が約1.1MB と大きく、MCP resource として全件配信するとトークンを大量消費する。カテゴリ別・件数制限・検索ツールの検討が要る
- データパイプラインが `municipality-history` / `address-lore` のローカル clone に依存。skill として配る手順書にはこの前提を明記する必要がある

## 持ち主への質問

1. クイズデータを MCP resource として配る場合、全件配信か検索ツールを置くか？検索ツールを置くなら skill-only ではなく wrap 判定になるが、エージェントがクイズを検索して嬉しいユースケースがあるか？
2. 自治体マスター・変遷データは `municipality-history` リポジトリ本体が MCP 化された場合、重複する。データの正本をどちらに寄せるか？（`municipality-history` が `library-serve` で MCP 化されるなら、chimei-quiz 側はクイズ生成 skill のみに絞れる）
3. クイズゲーム本体（ブラウザ SPA）をエージェントから操作したい需要はあるか？（例: デイリークイズの seed を取得する）あれば tool 1つ追加する価値があるが、現在は想定しがたい
