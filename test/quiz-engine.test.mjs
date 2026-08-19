import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSession, scoreFor } from "../src/quiz-engine.js";

test("buildSession: 同じseedなら同じ順序・同じ問題が選ばれる（決定論）", () => {
  const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}` }));
  const a = buildSession(questions, 5, "seed-A");
  const b = buildSession(questions, 5, "seed-A");
  assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id));
});

test("buildSession: seedが違えば（高確率で）違う並びになる", () => {
  const questions = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}` }));
  const a = buildSession(questions, 30, "seed-A");
  const b = buildSession(questions, 30, "seed-B");
  assert.notDeepEqual(
    a.map((q) => q.id),
    b.map((q) => q.id)
  );
});

test("buildSession: countが問題総数を超えても全件までしか返さない", () => {
  const questions = Array.from({ length: 3 }, (_, i) => ({ id: `q${i}` }));
  const s = buildSession(questions, 100, "seed");
  assert.equal(s.length, 3);
});

test("scoreFor: 難易度・コンボが高いほどスコアが増える", () => {
  const easy = { difficulty: 0.1 };
  const hard = { difficulty: 0.9 };
  assert.ok(scoreFor(hard, 0) > scoreFor(easy, 0));
  assert.ok(scoreFor(easy, 5) > scoreFor(easy, 0));
});

test("scoreFor: コンボボーナスは上限(10)で頭打ち", () => {
  const q = { difficulty: 0.5 };
  assert.equal(scoreFor(q, 10), scoreFor(q, 999));
});
