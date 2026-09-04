---
title: 新設合併設問の正解露出修正 仕様
status: implementation-ready
date: 2026-09-05
decision: ../decisions/2026-09-05-timeline-reason-answer-leak.md
---

# 新設合併設問の正解露出修正 仕様

## 利用者価値

自治体変遷推理カテゴリを10問遊ぶと、期待値で2〜3問は問題文を読むだけで正解できてしまう状態を解消する。
「阿寒町・音別町がどこに合併したか」という、この設問タイプが本来問うている知識だけが問われるようになる。

## 変更対象

`scripts/question-types/timeline-reason.mjs` の `generate()` の `merge` 分岐のみ。

## ロジック

```js
// 新設合併では、新自治体名が旧自治体名のどれかと同一になることがある（吸収的新設合併）。
// 例: 釧路市・阿寒町・音別町 → 釧路市。この旧自治体名を問題文にそのまま出すと正解が露出する。
// 「上那賀町 → 那賀町」のように完全一致ではなく部分文字列として含む場合もあるため includes で判定する。
const visibleOlds = ev.olds.filter((o) => !o.name.includes(ev.new.name));
if (visibleOlds.length === 0) continue; // 全ての旧名が正解を含む（上湧別町・湧別町 → 湧別町）ので出題不能
const visibleLabel = visibleOlds.map((o) => o.name).join("・");
const prompt =
  visibleOlds.length === ev.olds.length
    ? `${visibleLabel}が合併して誕生したのは？`
    : `${visibleLabel}と合併して誕生したのは？`;
```

`choices` / `answer` / `id` / `tags` / `difficulty` / `source` / `trivia` および誤答の除外集合
（`new Set([ev.new.name, ...ev.olds.map((o) => o.name)])`、隠した分も含めて全 olds を除外する）は変更しない。

## 期待される結果

| 指標 | 変更前 | 変更後 |
|---|---|---|
| timeline-reason 設問数 | 741 | 739 |
| `prompt.includes(answer)` が真の設問 | 189 | 0 |
| absorb 分岐の設問数 | 257 | 257（不変） |
| 全設問数（all.json） | 3,851 | 3,849 |

出題不能としてスキップされる2件: `[上湧別町・湧別町] → 湧別町`、`[有田町・西有田町] → 有田町`。

## データ再生成

`node scripts/build-quiz-sets.mjs` のみを実行する（`npm run build:data` は実行しない）。
入力の `data/*.json` はすべてコミット済みなので、ネットワークにも外部cloneにも依存せず、
同じ入力から同じ出力がバイト単位で再現する。

## 受け入れ条件

1. 生成された timeline-reason 設問のうち、`prompt` に `answer` を部分文字列として含むものが 0 件である。
2. `timeline-merge-釧路市-2005-10-11` の問題文が「阿寒町・音別町と合併して誕生したのは？」になり、
   正解が `釧路市` のままである。
3. `timeline-merge-那賀町-2005-03-01` の問題文から `上那賀町` が消える。
4. 正解名を含む旧自治体が無い通常の新設合併は、従来どおり「…が合併して誕生したのは？」のままである。
5. `absorb` 由来の設問（`timeline-absorb-*`）の問題文・件数が変わらない。
6. 同じ seed で 2 回生成すると同じ結果になる（決定論）。
7. 既存の 48 テストが通り、`npm run build` が成功する。

## テスト

`test/timeline-reason.test.mjs` を新設する。

- 正常系: 正解名を含む旧名が無い merge は文面が変わらない。
- 正常系: absorb は文面が変わらない。
- 境界値: 隠した後に残る旧自治体が1件（`[士別市・朝日町] → 士別市`）でも出題される。
- 境界値: 部分文字列一致（`上那賀町` と `那賀町`）でも隠される。
- 失敗系: 全ての旧名が正解を含む（`[上湧別町・湧別町] → 湧別町`）場合は出題されない。
- 異常系: `olds` が空、`new.name` が空のイベントは従来どおりスキップされる。
- 不変条件: 生成した全設問で `prompt.includes(answer)` が偽である。
- 決定論: 同じ seed で 2 回呼ぶと同一結果。
