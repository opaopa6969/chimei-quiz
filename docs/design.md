# chimei-quiz 設計メモ

日本の地名・自治体まわりの雑学クイズゲーム。データはビルド時に外部ソースから抽出して
`data/*.json` に静的同梱する（実行時に他repo/DBへは接続しない）。

## データソース

| ソース | 由来 | 使う範囲 | 個人情報 |
|---|---|---|---|
| `municipality-history` (`~/work/adoyose-workspace/municipality-history/data/estat-haichi.csv`) | e-Stat（政府統計）、自治体変遷 4,491行、1970〜2024 | 全件 | なし |
| `address-lore` (`~/work/adoyose-workspace/address-lore/catalog/index.json`) | 『番地の謎』(今尾恵介) + パーサ設計知見、54エントリ | `usage=human-hint` の prose 系（地誌トリビア向き） | なし |
| Wikipedia / Wikidata | 各市区町村の人口・面積・特産品・由来など | 段階的に拡充（下記） | 地名・統計のみ、個人名は扱わない |

**明示的に使わないもの**: nanori-parser（実在人名データ、非公開方針）、adoyoseの`address_corpus`/`api_key`
（利用者入力・秘密情報）、japan-map-viewer（private化済み・vacant-service系の商用データを含むため連携見送り）。

## Wikipedia/Wikidata 取り込み方針

- **事実の抽出であって文章の転載ではない**: Wikipedia日本語版はCC BY-SA。人口・面積・由来などの
  事実（ファクト）は著作権保護の対象外だが、文章表現をそのまま使う場合はライセンス継承・出典表示が要る。
  → クイズ文は事実ベースで書き起こし、出典に `"source": "Wikipedia"` + 記事名 + 取得日を残す。
- 優先度: Wikidata SPARQL（CC0・構造化データなので機械的に安全に使える。人口/面積/隣接自治体等）
  → 不足分だけ Wikipedia REST API の summary から人手/LLM要約で補う。
- **段階的に拡充**: 初回は都道府県庁所在地・政令指定都市・同名/合成地名に関わる市区町村など
  「クイズのネタになる市区町村」から着手し、全1,741市区町村を無差別クロールしない
  （行儀の良いレート制限と優先順位付けのため）。

## 設問カテゴリと元データ

| カテゴリ | 元データ |
|---|---|
| 同名地名（例: 府中市は東京都の他にどこ？） | municipality-history（市区町村名の重複検出） |
| 自治体変遷推理（合併理由文から市を当てる／タイムライン並べ替え） | municipality-history |
| 消えた市町村 | municipality-history（廃止レコード） |
| 合成地名（例: 西東京市＝田無市＋保谷市） | municipality-history（改正事由テキスト解析） |
| 難読地名 | municipality-history（ふりがな列）＋ address-lore |
| 住所地誌トリビア（京都通り名・条丁目など） | address-lore |
| ご当地トリビア（人口・特産品・由来） | Wikipedia/Wikidata（段階拡充） |

## データパイプライン

```
scripts/extract-municipality-data.mjs  → data/municipality-changes.json（4,491件そのまま構造化）
scripts/extract-lore-data.mjs          → data/lore-entries.json（address-loreの該当エントリ）
scripts/fetch-wikidata-municipalities.mjs → data/municipality-master.json（現存自治体・人口・面積、Wikidata）
scripts/build-quiz-sets.mjs            → public/data/quiz/*.json（上記から設問セットを機械生成）
```

`npm run build:data` で一括実行。生成物は `data/`（中間データ）と `public/data/quiz/`
（実行時にfrontendがfetchする最終データ）にコミットする
（外部ソースの原本リポジトリが手元にない環境でも `npm run build && npm start` だけで動かすため）。
`public/` 配下に置くのは、Viteでバンドルに埋め込まず実行時fetchにするため
（`all.json` が1.8MBあり、JSバンドルに含めるとロードが重くなる）。

### 既存マスタの誤データの暫定除外（#23）

`scripts/quiz-exclusions.mjs` に、北方領土6村と廃止済み5自治体のコード・名前・理由を置く。
`build-quiz-sets.mjs` は全カテゴリの生成後、選択肢・正解（合成地名は「・」区切り）に
対象名・コードがある設問、および対象コードを出典参照に持つ設問を丸ごと除外する。
入力マスタを間引かないので、乱数の消費順や順位グループは変わらず、残す設問の内容・順序を保つ。
`all.json` も除外後の各カテゴリから作る。

選択肢に自治体コードが無いため、同名の歴史的自治体（鳥取県の旧泊村など）も暫定的に除外する。
赤泊村・小泊村などの部分一致は除外しない。Wikidata再取得・取得処理の修正・古宇郡泊村の復元・
provenance整備は #21 に残し、マスタ自体は変更しない。

ネットワークを使わず、コミット済みの入力だけで再生成するコマンドは
`node scripts/build-quiz-sets.mjs`。この用途では fetch も行う `npm run build:data` を使わない。
`npm test` は全quiz JSONの除外条件とミックス索引の整合性を含む全テストを実行する。
CIは依存不要の `node --test test/quiz-exclusions.test.mjs` で除外処理・生成物を検査する。
既存Git依存kazuは匿名取得できないため、全テスト・再生成差分ゼロ・ビルドは
依存取得可能なローカル環境で検証してPRに記録する。CI用の資格情報や公開範囲は変更しない。

## スキーマ（例）

```jsonc
// data/municipality-changes.json の1件
{
  "code": "01100",
  "prefecture": "北海道",
  "district": "札幌市",
  "districtKana": "さっぽろし",
  "municipality": "",
  "municipalityKana": "",
  "effectiveDate": "1972-04-01",
  "reason": "札幌市(01201)の札幌市(01100)への政令指定都市施行\n中央区(01101)...の新設"
}
```

```jsonc
// public/data/quiz/same-name.json の1問（実際の生成結果）
{
  "type": "same-name",
  "id": "same-name-府中市-東京都",
  "prompt": "「府中市」は広島県の他にどこにある？",
  "choices": ["栃木県", "高知県", "東京都", "和歌山県"],
  "answer": "東京都",
  "source": { "dataset": "wikidata-municipality-master", "refs": ["132063", "342084"] },
  "meta": { "name": "府中市", "givenPref": "広島県" }
}
```

## 決定論・再現性

**設問の生成**（`scripts/build-quiz-sets.mjs` とその配下）は seed 付き PRNG のみを使い、
`Math.random` は使わない。同じ入力データなら毎回同じ設問セット・選択肢の並びが生成される
（`lib/prng.mjs` の mulberry32）。※ game-engine-suite の suite-contract は住所ドメインには
直接は適用しないが、決定論方針は流用する（テスト容易性のため）。

**実行時のセッション選択**（`src/quiz-engine.js` の `buildSession`）も seed を受け取れば決定論的
（デイリークイズ等に使える）。ただし通常プレイでは `App.jsx` が `Math.random()` を混ぜたseedを渡し、
毎回違う問題セットになるようにしている（同じ問題ばかり出るとプレイ体験として単調なため） — ここは
意図的な使い分けで、生成ロジック自体の非決定性ではない。

## デプロイ

volta-platform に docker composeで登録（tetsugo/kamishibaiと同型）。
`deploy/docker-compose.yml` + `volta.service.json`。
