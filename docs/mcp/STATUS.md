# chimei-quiz MCP 化ステータス（Phase 2）

## 判定

**skill-only**（割当表 #75, namespace `chimei-quiz`, port —）。MCP サーバを持たず、3 つの skill のみ配る。

## 完了したこと

| 項目 | 状態 | 備考 |
|---|---|---|
| Phase 1 調査（survey.json / SURVEY.md） | done | 2026-08-21 |
| DESIGN.md | done | docs/mcp/DESIGN.md |
| skill 作成（3 件） | done | build-quiz-data / question-pattern-design / compose-quiz-from-data |
| skill commit & push（volta-mcp） | done | commit b6de2ec, push to main |
| 既存テスト（npm test） | pass | 11/11 tests |
| healthz 200 確認 | pass | https://chimei-quiz.unlaxer.org/healthz → "ok" |
| gateway_routes_diff | 変更なし | chimei-quiz に関する diff 0 件（skill-only なので新規ルート不要） |
| svc_get 確認 | 既存サービス | port 8094, docker, hostname chimei-quiz.unlaxer.org, mcp 項なし（期待どおり） |
| README MCP 節 | done | 追加済み |

## deploy 差分（dry-run 記録）

### svc_add
skill-only で MCP サーバを持たないため、`svc_add` は不要。既存の `volta.service.json`（port 8094, docker）は変更なし。

### gateway_routes_diff
```
既存 routing: 99 件 / services.json から導出: 93 件
マージ後: 99 件
変更: なし（chimei-quiz は既存ルートが維持、新規ルート不要）
```

自分の 1 件以外を含まないため、停止条件には該当しない。

## volta への参加状況

### skill（volta-mcp docs/skills/ に配置）
3 つの SKILL.md を `docs/skills/chimei-quiz__<name>/SKILL.md` に配置して push 済み（commit b6de2ec）。

| name | locality | min_role | applies_when |
|---|---|---|---|
| `build-quiz-data` | repo | MEMBER | repo.name: chimei-quiz |
| `question-pattern-design` | repo | VIEWER | repo.name: chimei-quiz |
| `compose-quiz-from-data` | service | MEMBER | （なし・地名住所系全般） |

### skill__list での認識
push 直後は `skill__list(namespace="chimei-quiz")` で認識されなかった。これは prod 側の volta-mcp プロセスが push されたコミットを pull していないため。次回の volta-mcp deploy サイクルで `docs/skills/` が読み込まれ、`skill__list` に現れる予定。

### catalog__backend_status
chimei-quiz は MCP バックエンド（namespace）を持たない（skill-only）。したがって `catalog__backend_status` に namespace `chimei-quiz` は出ない（期待どおり）。

### 既存サービス
- hostname: `chimei-quiz.unlaxer.org`
- port: 8094（docker）
- healthz: `https://chimei-quiz.unlaxer.org/healthz` → 200 "ok"
- `mcp` 項: なし（skill-only なので MCP サーバを立てない）

## issue-hub 協調

issue-broker の `submit_feedback` は prod 側の gh CLI が見つからず（`gh: not found`）作成できなかった。内容は dry-run で確認済み。次の 3 件を保留:

| # | target_repo | title | 状態 |
|---|---|---|---|
| 1 | municipality-history | [mcp] chimei-quiz ↔ mstats: 自治体変遷データの正本所在とビルド時依存 | dry-run 済み・作成保留（gh CLI 不在） |
| 2 | address-lore | [mcp] chimei-quiz ↔ lore: 住所知識エントリのビルド時依存と MCP 化後の連携 | dry-run 済み・作成保留（gh CLI 不在） |
| 3 | adoyose | [mcp] chimei-quiz ↔ adoyose: 地名・自治体データのコンテキスト提供（将来検討） | dry-run 済み・作成保留（gh CLI 不在） |

gh CLI が利用可能な環境で `confirm: true` で再実行すれば作成される。暫定方針は DESIGN.md §6 に記載。

## 未決事項

1. **volta-mcp の deploy**: push した skill が `skill__list` に現れるには prod 側の volta-mcp プロセスが pull する必要がある。次回 deploy サイクルで反映される。
2. **issue-hub への協調 issue 登録**: gh CLI が prod 側にないため保留。手動で `gh issue create -R opaopa6969/issue-hub` するか、gh CLI をインストール後に `submit_feedback(confirm=true)` で再実行。
3. **データ正本の所在**: municipality-history（mstats）が MCP 化された後、自治体変遷データの正本を mstats 側に寄せる方針。相手の返答を待たず暫定進行。
4. **address-lore MCP 化後の連携**: lore（namespace）が MCP 化された後、`catalog/index.json` のスキーマ互換性を確認する。

## 残作業

- なし（skill-only で MCP サーバを持たないため、実装・テスト・deploy は完了）。
- volta-mcp 側の deploy は別セッション（volta-mcp の Phase 2 または次回 deploy サイクル）で反映される。
