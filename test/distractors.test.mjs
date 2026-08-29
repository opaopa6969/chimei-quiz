import { test } from "node:test";
import assert from "node:assert/strict";
import { sameCategoryPool, sameCategoryPoolPrefectures, readingConfusion } from "../scripts/question-types/distractors.mjs";
import { makePrng, shuffle } from "../lib/prng.mjs";

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

test("readingConfusion: 同じ読みを持つ別自治体が pool に複数含まれても重複して選ばれない（issue #10）", () => {
  // 伊達市=だてし が北海道・福島県の2件、北斗市=ほくとし が2件等、異なる自治体が
  // 同じ kana を持つケースを再現。ユニーク化により同じ kana が2回選ばれない。
  const pool = [
    { name: "伊達市", kana: "だてし" },
    { name: "伊達市", kana: "だてし" },
    { name: "北斗市", kana: "ほくとし" },
    { name: "北斗市", kana: "ほくとし" },
    { name: "佐久市", kana: "さくし" },
    { name: "飯野市", kana: "いいのし" },
  ];
  // 100 seed で検証（issue の受け入れ条件「複数 seed で重複 choices が0件」をテスト化）
  for (let s = 0; s < 100; s++) {
    const rng = makePrng(`reading-test-${s}`);
    const correctName = "匝瑳市";
    const correctKana = "そうさし";
    const distractors = readingConfusion(correctName, correctKana, pool, 3, rng);
    const choices = shuffle([correctKana, ...distractors], rng);
    const uniq = new Set(choices);
    assert.equal(choices.length, uniq.size, `seed ${s}: 選択肢に重複がないこと (choices=${JSON.stringify(choices)})`);
    assert.equal(distractors.length, 3, `seed ${s}: 誤答が3件選ばれること`);
    assert.ok(!distractors.includes(correctKana), `seed ${s}: 正解と同じ kana は誤答に含まれない`);
  }
});
