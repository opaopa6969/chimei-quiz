# 設問パターンの構造化

全カテゴリを同じ形（QuestionType）に落とし込み、データソースから機械的に大量生成する。
手書きの問題文は書かない・書いても最小限（ジェネレータが尽きたときの穴埋め用）。

## 共通スキーマ

```ts
type QuestionType = {
  id: string                 // "same-name" / "timeline-reason" / "vanished" / "portmanteau" / "reading" / "lore-trivia" / "city-fact"
  format: "choice4" | "tap-map" | "reorder" | "true-false"
  generate: (source: SourceData, seed: Prng) => QuestionInstance[]
  difficulty: (instance: QuestionInstance) => number   // 0.0(易)〜1.0(難)、データの特性から機械算出
}

type QuestionInstance = {
  type: string
  id: string                 // 例: "same-name-fuchu"（データ由来で決定論的に採番、seedに依らない）
  prompt: string
  choices?: string[]
  answer: string | string[]
  distractorStrategy: string // 誤答をどう選んだか（後述）。デバッグ・難易度調整用に残す
  tags: string[]              // 都道府県・年代・カテゴリ等。ミックス出題のフィルタに使う
  source: { dataset: string, refs: string[] }  // 出典（municipality-history / address-lore / wikidata の行ID等）
}
```

`generate()` は同じ入力データなら同じ順序・同じ内容を返す（`Math.random`不使用、seed付きPRNGのみ）。
実行時のシャッフルは表示直前に seed=日付 等で行い、生成そのものはビルド時に確定させる。

## 誤答（distractor）生成の共通戦略

設問タイプをまたいで使い回せるので、独立した関数として切り出す。

| 戦略 | やること | 効くカテゴリ |
|---|---|---|
| `sameCategoryPool` | 正解と同じ属性（都道府県・年代帯）の値からランダム抽出 | 全般の基本形 |
| `geographicNeighbor` | 隣接都道府県・近い自治体コードから選ぶ（紛らわしくして難易度UP） | 同名地名・消えた市町村 |
| `nearYear` | 施行年が近い他レコードから選ぶ | 自治体変遷推理 |
| `readingConfusion` | 音が似た読み（長音・促音・連濁違い等）を機械生成 | 難読地名 |

各 `QuestionInstance.distractorStrategy` にどれを使ったか記録し、後で「どの戦略が正答率高すぎ/低すぎか」を
測って調整できるようにする（プレイログを溜めたら効いてくる）。

## カテゴリ別ジェネレータ

### 1. `same-name`（同名地名）
- **入力**: `municipality-changes.json` を現存自治体名でグルーピング → 2件以上ヒットしたグループ
- **prompt**: `「{name}」は{prefA}の他にどこにある？`
- **answer**: 他の都道府県名
- **distractor**: `geographicNeighbor` + `sameCategoryPool`
- **difficulty**: 一致件数が多い（＝有名）ほど易、市区町村名より**字レベルの一致**は認知度が低いぶん難

### 2. `timeline-reason`（変遷理由当て）
- **入力**: `reason` 列に固有パターン（「◯◯市の政令指定都市施行」「◯◯村を編入」等）を含むレコード
- **prompt**: reason文の市区町村名部分だけ伏せて提示 → `この変遷はどの市の話？`
- **distractor**: `nearYear`（同時期の他の変遷）
- **difficulty**: 改正事由の文中ヒント量（固有名詞の残り具合）で調整

### 3. `vanished`（消えた市町村）
- **入力**: あるレコードの `municipality`/`district` が、それ以降のレコードで新設合併・改称等により
  参照されなくなったもの（reasonテキストの「廃止」「〜市の廃止」「新設合併により消滅」等を検出）
- **prompt**: `次のうち、現在は存在しない市はどれ？`
- **choices**: 消滅市1件 + 現存市3件（`distractorStrategy: geographicNeighbor`）
- **format**: `choice4`（真偽形式 `true-false` にも展開可）

### 4. `portmanteau`（合成地名）
- **入力**: reasonテキストから「A町・B村が合併しC市が誕生」を抽出し、新地名の文字が旧地名群からの
  合成になっているものをヒューリスティック検出（新地名の各文字 ∈ 旧地名群の文字集合）
- **prompt**: `「西東京市」は元々何市町村の合併？` → 選択肢は旧地名の組み合わせ4パターン
- **distractor**: 他の合成地名事例の旧地名を混ぜて紛らわしくする

### 5. `reading`（難読地名）
- **入力**: 「かな文字数÷漢字文字数」の比率スコアで自動抽出を試みたが失敗した — 「下関市＝しものせきし」
  のような、単に訓読みの文字数が多いだけの普通に読める地名まで難読扱いしてしまう欠陥があった
  （下＝しも、関＝せき、はどちらもごく一般的な訓読みで、比率だけでは「一般的な読みかどうか」を
  判定できない。実際にユーザーから「下関市が難読は変」と指摘を受けて発覚）。
  → **`lore-trivia` と同じ半自動方式に変更**: 実際に「難読地名」として広く知られる市区町村
  （北海道・沖縄のアイヌ語/琉球語由来の自治体名が中心）を手作業でキュレーションし、
  municipality-master に実在するものだけを採用。読み仮名は municipality-history（e-Stat公式）に
  データがあれば優先し、キュレーション側と食い違えば警告する
- **prompt**: `「{漢字}」の読み方は？`
- **distractor**: 公式読みデータを持つ現存自治体のプールからランダム抽出
- **format**: `choice4`
- **教訓**: 「比率・スコアで自動判定できそう」に見えるタスクでも、日本語の読みのように
  正解/不正解が言語知識ベースで決まるものは、安易な数値ヒューリスティックが機能しない
  ケースがある。機械的な閾値の裏に「これは本当に難読の定義を捉えているか」を疑うこと。

### 6. `lore-trivia`（住所地誌トリビア）
- **入力**: `address-lore` の `usage=human-hint` かつ `datatype=prose` エントリ（京都通り名・条丁目など）
- **生成方式**: エントリ数が54件と少ないので**半自動**（`excerpt` から機械で選択肢候補を作り、人間/LLMが
  最終チェック）。他カテゴリのような全自動生成はしない
- **prompt**: `payload` の対比構造（都市タイプ/郊外タイプ/農村タイプ等）をそのまま4択に転用できるものが多い

### 7. `city-fact`（ご当地トリビア、Wikidata拡充後）
- **入力**: `city-facts.json`（人口・面積・特産品・由来）
- **prompt例**: `人口が一番多い政令指定都市は？` / `〇〇の名産品は？`
- **distractor**: `sameCategoryPool`（同じ指標の他都市から）
- 全1,741市区町村ではなく優先度リストから段階的に拡充するため、当面は都道府県庁所在地・政令市が中心

## ミックス出題

`tags` でフィルタしてセットを組む（例: `pref=北海道` だけの北海道編、`category=vanished` だけの
上級者向け「消えた市町村スペシャル」）。デイリークイズは `seed = 日付文字列` で `QuestionType[]` を
横断選抜し、`shuffle(seed)` で順序を決める。

## 実装配置

```
scripts/question-types/same-name.mjs
scripts/question-types/timeline-reason.mjs
scripts/question-types/vanished.mjs
scripts/question-types/portmanteau.mjs
scripts/question-types/reading.mjs
scripts/question-types/lore-trivia.mjs
scripts/question-types/city-fact.mjs
scripts/question-types/distractors.mjs   # 共通distractor戦略
scripts/build-quiz-sets.mjs               # 上記を全部呼んで data/quiz/*.json に書き出す
```
