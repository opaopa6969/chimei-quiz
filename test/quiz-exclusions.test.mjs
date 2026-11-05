import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { excludeMunicipalityQuestions } from "../scripts/quiz-exclusions.mjs";

// 実装の除外リストとは独立した、issue #23の11自治体。
const excludedNames = ["色丹村", "泊村", "留夜別村", "留別村", "紗那村", "蘂取村",
  "浦和市", "岩舟町", "宮城村", "竜洋町", "植木町"];
const excludedCodes = ["016951", "016969", "016977", "016985", "016993", "017001",
  "112046", "093670", "103055", "224839", "433853"];
const excluded = new Set([...excludedNames, ...excludedCodes]);

test("除外対象の正解・誤答・合成地名・コード参照を出題しない", () => {
  const questions = [
    { choices: ["浦和市", "大宮市"], answer: "浦和市" },
    { choices: ["高山市", "留別村"], answer: "高山市" },
    { choices: ["浦和市・大宮市・与野市", "田無市・保谷市"], answer: "田無市・保谷市" },
    { choices: ["016951", "014036"], answer: "014036" },
    { choices: ["北海道", "東京都"], answer: "北海道", source: { refs: ["016969"] } },
  ];
  assert.deepEqual(excludeMunicipalityQuestions(questions), []);
});

test("赤泊村・小泊村は保持し、残す設問の内容と順序を変えない", () => {
  const keep = [
    { choices: ["赤泊村", "小泊村"], answer: "赤泊村" },
    { choices: ["中里町・小泊村", "田無市・保谷市"], answer: "中里町・小泊村" },
  ];
  const questions = [keep[0], { choices: ["植木町"], answer: "植木町" }, keep[1]];
  const original = structuredClone(questions);
  assert.deepEqual(excludeMunicipalityQuestions(questions), keep);
  assert.deepEqual(questions, original);
});

const quizDir = new URL("../public/data/quiz/", import.meta.url);
const sets = readdirSync(quizDir).filter((name) => name.endsWith(".json")).map((name) => [
  name, JSON.parse(readFileSync(new URL(name, quizDir), "utf8")),
]);

for (const [name, set] of sets) {
  test(`${name}: 全設問のchoices・answer・コード参照に除外自治体が無い`, () => {
    assert.equal(set.count, set.questions.length);
    assert.ok(set.questions.length > 0);
    for (const question of set.questions) {
      const values = [...question.choices, ...[question.answer].flat()];
      for (const value of values) {
        assert.ok(!value.split("・").some((part) => excluded.has(part)), `${question.id}: ${value}`);
      }
      assert.ok(!question.source?.refs?.some((ref) => excludedCodes.includes(ref)), question.id);
    }
  });
}

test("all.jsonは除外済みカテゴリを同じ順序・内容で連結する", () => {
  const all = sets.find(([name]) => name === "all.json")[1];
  const byType = new Map(sets.filter(([name]) => name !== "all.json").map(([, set]) => [set.type, set.questions]));
  const typeOrder = ["same-name", "vanished", "timeline-reason", "portmanteau", "reading",
    "city-fact", "lore-trivia", "parser-structure", "district-reading"];
  assert.deepEqual(all.questions, typeOrder.flatMap((type) => byType.get(type)));
});
