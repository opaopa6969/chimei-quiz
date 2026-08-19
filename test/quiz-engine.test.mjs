import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSession, buildMixedSession, scoreFor } from "../src/quiz-engine.js";

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

test("buildMixedSession: 1カテゴリが大量にあっても偏らず均等に混ざる（vanished問題）", () => {
  // vanishedが全体の90%を占めるような極端な偏りを再現
  const questions = [
    ...Array.from({ length: 900 }, (_, i) => ({ type: "vanished", id: `v${i}` })),
    ...Array.from({ length: 50 }, (_, i) => ({ type: "same-name", id: `s${i}` })),
    ...Array.from({ length: 50 }, (_, i) => ({ type: "reading", id: `r${i}` })),
  ];
  const session = buildMixedSession(questions, 9, "seed-mix");
  const counts = {};
  for (const q of session) counts[q.type] = (counts[q.type] ?? 0) + 1;
  // 単純ランダムなら vanished が9問中8問前後になるはずだが、均等分配なら各type 3問ずつになる
  assert.equal(counts["vanished"], 3);
  assert.equal(counts["same-name"], 3);
  assert.equal(counts["reading"], 3);
});

test("buildMixedSession: 同じseedなら同じ結果（決定論）", () => {
  const questions = [
    ...Array.from({ length: 10 }, (_, i) => ({ type: "a", id: `a${i}` })),
    ...Array.from({ length: 10 }, (_, i) => ({ type: "b", id: `b${i}` })),
  ];
  const x = buildMixedSession(questions, 6, "seed-Z");
  const y = buildMixedSession(questions, 6, "seed-Z");
  assert.deepEqual(x.map((q) => q.id), y.map((q) => q.id));
});
