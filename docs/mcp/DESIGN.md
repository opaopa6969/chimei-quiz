# chimei-quiz MCP 化設計（Phase 2）

## 1. namespace と種別

- **namespace**: `chimei-quiz`
- **種別**: `skill-only`（サーバを持たない）

Phase 1 調査（`docs/mcp/survey.json`）で `skill-only` と判定した。このリポジトリの核心はブラウザで遊ぶクイズゲームであり、エージェントが呼びたい操作（入力→出力が定義された副作用付き処理）は存在しない。`server.js` は `dist/` の静的配信のみで API エンドポイントを持たない。

一方、データパイプライン（Wikidata / municipality-history / address-lore から 3,099 問を機械生成する手順）とクイズ設問設計のノウハウは、他の地名・住所系サービスと組み合わせる際に有用な手続き知識になる。これを **3 つの skill** として配る。

**skill-only だから MCP サーバは立てない。** 既存の `server.js`（port 8094, docker）はクイズゲームの静的配信のままで変更しない。skill は volta-mcp リポジトリの `docs/skills/chimei-quiz__<name>/SKILL.md` に置いて push する（SPEC-skills-over-mcp §7 方法 C）。

### Phase 1 からの判定変更

Phase 1 の `survey.json` は resource（spec/guide/municipality-master/municipality-changes/quiz-data）の配信も想定していたが、これらを MCP resource として配るには MCP サーバ（Streamable HTTP `/mcp`）が必要になり、`skill-only` 判定と矛盾する。また:

- `all.json` が 3MB・`municipality-master.json` が 315KB・`municipality-changes.json` が 1.6MB と大きく、MCP resource として全件配信するとトークンを大量消費する。
- 自治体マスター・変遷データは `municipality-history` リポジトリが `library-serve` で MCP 化される予定（割当表 #22, namespace `mstats`）であり、データの正本はそちらに寄せるべき。

したがって **resource は配らず、skill のみ配る** ことに確定する。Phase 1 の open_questions Q1（全件配信か検索ツールか）は「どちらもしない」で解消。Q2（データ正本の所在）は municipality-history 側に寄せる方針で暫定進行。

## 2. tools 表

**tool なし。** skill-only なので MCP サーバを持たず、tool を登録しない。

## 3. resources 表

**resource なし。** 理由は §1 で述べたとおり。クイズデータのメタデータ（カテゴリ別問題数・スキーマ）は skill 本文内に簡潔に記述し、実データは当リポジトリの `public/data/quiz/*.json` を直接読んでもらう形をとる。

## 4. prompts / skills

3 つの skill を配る。すべて volta-mcp リポジトリの `docs/skills/` に配置する（SPEC-skills-over-mcp §7 方法 C）。

| name | locality | 用途 | applies_when | requires | min_role |
|---|---|---|---|---|---|
| `build-quiz-data` | `repo` | Wikidata SPARQL + municipality-history + address-lore から設問セットをビルドする手順 | `repo.name: chimei-quiz` | filesystem（ローカル clone） | MEMBER |
| `question-pattern-design` | `repo` | 設問パターン設計のノウハウ（共通スキーマ・distractor 戦略・難易度算出） | `repo.name: chimei-quiz` | なし | VIEWER |
| `compose-quiz-from-data` | `service` | 自治体データから新設問カテゴリを企画・実装する手順 | なし（地名・住所系サービス全般） | なし | MEMBER |

### build-quiz-data
`npm run build:data` の前提・手順・決定論的生成の仕組み（seed PRNG）・トラップ（難読地名の自動抽出失敗とキュレーションへの切り替え）を含む。`municipality-history` と `address-lore` のローカル clone（`~/work/adoyose-workspace/` 配下、環境変数で上書き可）が前提。

### question-pattern-design
QuestionType 共通スキーマ・distractor 生成戦略（sameCategoryPool / geographicNeighbor / nearYear / readingConfusion）・難易度算出・ミックス出題の設計方針。このリポジトリで蓄えた設計判断（何が自動生成できて何が手作業になるか）を参照データとして共有する。

### compose-quiz-from-data
自治体データ（municipality-history / municipality-master / address-lore）から新しいクイズ設問カテゴリを企画・実装する手順。既存 9 カテゴリの設計判断を参照にして、新しいデータソースからクイズを作る方法を示す。locality は `service`（地名・住所系サービス全般で利用可能）。

## 5. 組み合わせ例

1. **変遷推理クイズの生成**: `mstats__population` で自治体データを取得 → `build-quiz-data` skill に従い `timeline-reason` 設問を生成 → `adoyose__normalize` で関連住所を正規化して周辺情報を補足
2. **人口ランキングクイズ動画**: `mstats__population` で人口トップ 10 を取得 → `compose-quiz-from-data` でクイズ設問を企画 → `kamishibai` で「日本の市人口ランキングクイズ」動画を生成 → `index` で公開
3. **難読地名の可視化**: `question-pattern-design` で難読地名の設計方針を参照 → `jmap__buildings_query` で該当地名の建物フットプリントを取得して可視化

## 6. 依存と協調

issue-hub（`opaopa6969/issue-hub`、ラベル `mcp-coordination`）で協調を取る。

| 相手 repo | 方向 | 能力 | 現状 | issue で合意したいこと |
|---|---|---|---|---|
| municipality-history | depends_on | 自治体変遷履歴データ（estat-haichi.csv） | library-serve 計画あり（namespace `mstats`） | データ正本を mstats 側に寄せる方針の確認。chimei-quiz 側はクイズ生成 skill のみに絞る |
| address-lore | depends_on | 住所知識エントリ（番地の謎） | library-serve 計画あり（namespace `lore`, port 9244） | ビルド時に読む `catalog/index.json` のスキーマ安定性。lore が MCP 化された後は resource 経由で読めるか |
| adoyose | provides_to | 地名・自治体データのコンテキスト提供 | MCP バックエンドあり（namespace `adoyose`） | chimei-quiz の自治体データが adoyose の住所正規化結果に付与する素材になりうるが、現状は chimei-quiz 側に API が無いため提供入口は未実装。需要があれば将来 wrap に変更 |

**暫定方針**: 相手の返答を待たず、上記方針で実装を進める。確定したら合わせる。

## 7. 非対応にした候補

| 候補 | 理由 |
|---|---|
| クイズデータの MCP resource 配信 | データサイズが大きく（all.json 3MB）、トークン大量消費。municipality-history が library-serve で MCP 化されるためデータ正本はそちらに寄せる |
| クイズ検索 tool | skill-only 判定を維持。エージェントがクイズを検索して嬉しいユースケースが現状想定できない |
| デイリークイズ seed 取得 tool | クイズゲーム本体をエージェントから操作する需要が想定できない |
| 既存 server.js への MCP エンドポイント追加 | 静的配信サーバに MCP を混ぜると複雑化。skill-only なら不要 |

## 8. 参加方法

- **manifest**: 既存の `volta.service.json` は変更しない（クイズゲームの静的配信そのまま）。
- **ポート**: 既存 port 8094（docker, `chimei-quiz.unlaxer.org`）。MCP 用の新規ポートは不要（skill-only のため）。
- **ホスト**: `192.168.1.50`（prod, 既存）
- **runtime**: docker（既存）
- **auth**: public（既存）
- **MCP 参加方法**: volta-mcp リポジトリの `docs/skills/chimei-quiz__<name>/SKILL.md` に commit & push。ファサードが `docs/skills/` を同梱 skill として配信（SPEC-skills-over-mcp §7 方法 C）。
- **`mcp` 項**: `volta.service.json` に `mcp` 項を追加しない（skill-only で MCP サーバを持たないため。`mcp.enabled: false` とも書かない — 単に MCP バックエンドとして登録しない）。

## 9. テスト方針

skill-only なので MCP サーバの e2e テスト（healthz → tools/list → tool call）は不要。

代わりに:

1. **skill の形式検証**: 各 SKILL.md の frontmatter が `name` / `description` / `volta.namespace` / `volta.version` / `volta.locality` を持つことを確認。
2. **skill__list での確認**: push 後に `skill__list(namespace="chimei-quiz")` で 3 つの skill が一覧に現れることを確認。
3. **skill__resolve での確認**: `skill__resolve(goal="クイズデータをビルドする", context={repo:{name:"chimei-quiz"}})` で `build-quiz-data` が返ることを確認。
4. **既存テストの維持**: `npm test`（`node --test test/`）が通ることを確認（MCP 化で既存コードは変更しないので、回帰がないことを確認）。
