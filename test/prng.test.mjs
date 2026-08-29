import { test } from "node:test";
import assert from "node:assert/strict";
import { makePrng, shuffle, pickN, mulberry32, seedFromString } from "../lib/prng.mjs";

test("shuffle: 空配列を渡しても例外を投げず空配列を返す（Fisher-Yatesの i>0 ループ境界）", () => {
  const rng = makePrng("empty");
  const out = shuffle([], rng);
  assert.deepEqual(out, []);
});

test("shuffle: 1要素配列はそのまま返す（ループが回らず範囲外アクセスしない）", () => {
  const rng = makePrng("single");
  const out = shuffle(["only"], rng);
  assert.deepEqual(out, ["only"]);
});

test("shuffle: 元配列を破壊せずコピーを返す（非破壊的）", () => {
  const orig = [1, 2, 3, 4, 5];
  const rng = makePrng("copy");
  shuffle(orig, rng);
  assert.deepEqual(orig, [1, 2, 3, 4, 5]);
});

test("pickN: nが配列長を超えても配列長までしか返さない（境界）", () => {
  const rng = makePrng("over");
  const out = pickN([1, 2, 3], 10, rng);
  assert.equal(out.length, 3);
  assert.deepEqual([...out].sort(), [1, 2, 3]);
});

test("pickN: n=0は空配列（境界）", () => {
  const rng = makePrng("zero");
  const out = pickN([1, 2, 3], 0, rng);
  assert.deepEqual(out, []);
});

test("pickN: 戻り値に重複がない（抽出而非サンプリング）", () => {
  const rng = makePrng("uniq");
  const out = pickN([1, 2, 3, 4, 5, 6, 7], 5, rng);
  assert.equal(out.length, new Set(out).size);
});

test("mulberry32: 同seedなら同系列（決定論）", () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  assert.deepEqual(seqA, seqB);
  for (const v of seqA) {
    assert.ok(v >= 0 && v < 1, `出力は [0,1) の範囲: ${v}`);
  }
});

test("seedFromString: 文字列が異なれば高確率で異なるハッシュになる", () => {
  const h1 = seedFromString("alpha");
  const h2 = seedFromString("beta");
  assert.notEqual(h1, h2);
});

test("makePrng: 数値seedと文字列seedの両方を受け付ける（型分岐の回帰）", () => {
  const fromNum = mulberry32(42);
  const fromStr = makePrng("42");
  assert.equal(typeof fromNum(), "number");
  assert.equal(typeof fromStr(), "number");
});
