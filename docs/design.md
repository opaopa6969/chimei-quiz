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
scripts/fetch-wikidata-facts.mjs       → data/city-facts.json（段階拡充、要ネット接続）
scripts/build-quiz-sets.mjs            → data/quiz/*.json（上記から設問セットを機械生成）
```

`npm run build:data` で一括実行。生成物は `data/` 配下にコミットする
（外部ソースの原本リポジトリが手元にない環境でも `npm start` だけで動かすため）。

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
// data/quiz/same-name.json の1問
{
  "type": "same-name",
  "id": "same-name-fuchu",
  "prompt": "府中市は東京都の他にどこにある？",
  "choices": ["広島県", "京都府", "福岡県", "静岡県"],
  "answer": "広島県",
  "source": "municipality-history"
}
```

## 決定論・再現性

クイズの出題順・選択肢シャッフルは seed 付き PRNG を使う（`Math.random` は使わない）。
同じ seed なら同じ問題セットが再現される（デイリークイズの日付seedにも使える）。
※ game-engine-suite の suite-contract は住所ドメインには直接は適用しないが、
決定論方針は流用する（テスト容易性のため）。

## デプロイ

volta-platform に docker composeで登録（tetsugo/kamishibaiと同型）。
`deploy/docker-compose.yml` + `volta.service.json`。
