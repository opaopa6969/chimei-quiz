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
npm run build:data   # Wikidata/municipality-history/address-loreからdata/quiz/*.jsonを生成
npm start             # http://localhost:8090 でプレイ画面（実装中）
```

`build:data` はネットワークアクセス（Wikidata Query Service）と、`municipality-history` /
`address-lore` のローカルclone（`~/work/adoyose-workspace/` 配下、環境変数で上書き可）を要する。
生成物 `data/*.json` はrepoにコミット済みなので、`npm start` だけならネット接続不要。

## ドキュメント

- [docs/design.md](docs/design.md) — データソース・パイプライン・スキーマ
- [docs/question-patterns.md](docs/question-patterns.md) — 設問タイプの構造化設計
- [docs/presentation.md](docs/presentation.md) — 出題演出（Remotion）の設計方針

## デプロイ

volta-platform（自宅サーバ）にdocker composeで登録。`deploy/`, `volta.service.json` 参照。
