import { test } from "node:test";
import assert from "node:assert/strict";
import { sameCategoryPool, sameCategoryPoolPrefectures } from "../scripts/question-types/distractors.mjs";
import { makePrng } from "../lib/prng.mjs";

test("sameCategoryPool: 同名異県の自治体が pool に複数含まれても重複して選ばれない（issue #2）", () => {
  // 「南部町」が山梨・静岡・和歌山の3県にまたがって存在する状況を再現。
  // currentNameList には同名が3回入るが、ユニーク化により1回だけ選ばれるべき。
  const pool = ["富士河口湖町", "中津川市", "南部町", "南部町", "南部町", "甲府市", "函館市"];
  const exclude = new Set(["富士河口湖町", "中津川市"]);
  const rng = makePrng("test-dup");
  const picked = sameCategoryPool(pool, exclude, 3, rng);
  const uniq = new Set(picked);
  assert.equal(picked.length, uniq.size, "選ばれた選択肢に重複がないこと");
  assert.equal(picked.length, 3, "3件選ばれること");
  assert.ok(!picked.includes("富士河口湖町"), "除外集合の要素は選ばれない");
  assert.ok(!picked.includes("中津川市"), "除外集合の要素は選ばれない");
});

test("sameCategoryPool: 選ばれた要素はすべて pool に含まれる", () => {
  const pool = ["A市", "B市", "C市", "D市", "E市"];
  const exclude = new Set(["A市"]);
  const rng = makePrng("test-basic");
  const picked = sameCategoryPool(pool, exclude, 3, rng);
  for (const v of picked) {
    assert.ok(pool.includes(v), `${v} は pool に含まれる`);
  }
  assert.equal(picked.length, 3);
});

test("sameCategoryPool: 同 seed で決定論的に同じ結果を返す", () => {
  const pool = ["A", "B", "C", "D", "E", "F", "G"];
  const exclude = new Set(["A"]);
  const r1 = sameCategoryPool(pool, exclude, 3, makePrng("seed-x"));
  const r2 = sameCategoryPool(pool, exclude, 3, makePrng("seed-x"));
  assert.deepEqual(r1, r2);
});

test("sameCategoryPoolPrefectures: 除外集合外の都道府県をn件選ぶ", () => {
  const exclude = new Set(["東京都", "神奈川県"]);
  const picked = sameCategoryPoolPrefectures(exclude, 3, makePrng("pref-test"));
  assert.equal(picked.length, 3);
  for (const p of picked) {
    assert.ok(!exclude.has(p), "除外集合の要素は選ばれない");
  }
  const uniq = new Set(picked);
  assert.equal(picked.length, uniq.size, "重複がない");
});
