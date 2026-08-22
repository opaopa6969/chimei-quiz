# chimei-quiz

日本の地名・自治体まわりの雑学クイズゲーム。同名地名（「府中市は東京都の他にどこ？」）、
消えた市町村、合成地名（「西東京市は元々何市町村？」）、自治体変遷推理、難読地名、
ご当地トリビア（人口・面積の日本一）など、公開データからほぼ全問を機械生成する。

## データソース

すべて公開データ。実在個人の氏名・住所などの非公開データは一切使わない（詳細は
[docs/design.md](docs/design.md#データソース)）。

| ソース | 由来 |
|---|---|
| Wikidata SPARQL | 現存する全基礎自治体（人口・面積付き、CC0） |
| municipality-history | e-Stat由来、自治体変遷履歴（1970〜2024、4,491行） |
| address-lore | 『番地の謎』(今尾恵介) 由来の住所知識エントリ |

## セットアップ

```bash
npm install
npm run dev            # 開発サーバー http://localhost:8094 （Vite、ホットリロード）

# 本番相当
npm run build           # dist/ にビルド
npm start                # http://localhost:8094 （server.jsがdist/を配信）
```

設問データ（`public/data/quiz/*.json`）はコミット済みなので、上記だけならネット接続不要。
データを作り直す場合のみ:

```bash
npm run build:data   # Wikidata/municipality-history/address-loreからpublic/data/quiz/*.jsonを再生成
```

`build:data` はネットワークアクセス（Wikidata Query Service）と、`municipality-history` /
`address-lore` のローカルclone（`~/work/adoyose-workspace/` 配下、環境変数で上書き可）を要する。

## ゲームの中身

- Remotion（`@remotion/player`）で出題演出を出してから4択に答える形式
- カテゴリ（同名地名・消えた市町村・自治体変遷推理・合成地名・難読地名・ご当地トリビア・
  住所地誌トリビア・ぜんぶミックス）と問題数（5/10/20問）を選んでスタート
- コンボ・難易度ボーナス込みのスコア制

**注記**: ブラウザでの実際の見た目・Remotion演出の描画結果はheadless環境では確認できていない
（`npm run build` の成功・ロジックのユニットテスト・静的配信の疎通は確認済み）。

## ドキュメント

- [docs/design.md](docs/design.md) — データソース・パイプライン・スキーマ
- [docs/question-patterns.md](docs/question-patterns.md) — 設問タイプの構造化設計
- [docs/presentation.md](docs/presentation.md) — 出題演出（Remotion）の設計方針

## MCP

volta-mcp（MCP ファサード `https://mcp.unlaxer.org/mcp`）に **skill-only** で参加。MCP サーバは持たず、3 つの skill を配る:

| skill | locality | 用途 |
|---|---|---|
| `build-quiz-data` | repo | 設問データのビルド手順（Wikidata + municipality-history + address-lore） |
| `question-pattern-design` | repo | 設問パターン設計のノウハウ |
| `compose-quiz-from-data` | service | データから新設問カテゴリを企画する手順 |

skill は [volta-mcp](https://github.com/opaopa6969/volta-mcp) の `docs/skills/chimei-quiz__<name>/SKILL.md` に配置。`skill__list(namespace="chimei-quiz")` / `skill__resolve(goal="クイズデータをビルドする")` で参照可能。

詳細は [docs/mcp/DESIGN.md](docs/mcp/DESIGN.md)・[docs/mcp/STATUS.md](docs/mcp/STATUS.md)。

## デプロイ

volta-platform（自宅サーバ）にdocker composeで登録。`deploy/`, `volta.service.json` 参照。
