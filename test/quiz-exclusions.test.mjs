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

test("city-factの解説ランキングだけに除外自治体が出る設問も丸ごと除外する", () => {
  const questions = excludedNames.flatMap((name) => [
    `${name} 1人 / 札幌市 2人`,
    `札幌市 1人 / ${name} 2人 / 函館市 3人`,
    `札幌市 1人 / ${name} 2人`,
  ].map((ranking) => ({
    type: "city-fact", choices: ["札幌市", "函館市"], answer: "札幌市",
    source: { refs: ["011002"] }, trivia: `北海道内の人口上位: ${ranking}`,
  })));
  assert.deepEqual(excludeMunicipalityQuestions(questions), []);
});

test("解説にある赤泊村・小泊村と、他カテゴリの歴史的な自治体名は保持する", () => {
  const questions = [
    { type: "city-fact", choices: ["新潟市"], answer: "新潟市",
      trivia: "人口比較: 赤泊村 1人 / 小泊村 2人 / 新潟市 3人" },
    { type: "vanished", choices: ["さいたま市"], answer: "さいたま市",
      trivia: "旧自治体: 浦和市 / 大宮市 / 与野市" },
  ];
  assert.deepEqual(excludeMunicipalityQuestions(questions), questions);
});

const quizDir = new URL("../public/data/quiz/", import.meta.url);
const sets = readdirSync(quizDir).filter((name) => name.endsWith(".json")).map((name) => [
  name, JSON.parse(readFileSync(new URL(name, quizDir), "utf8")),
]);

for (const [name, set] of sets) {
  test(`${name}: choices・answer・コード参照・現在ランキングに除外自治体が無い`, () => {
    assert.equal(set.count, set.questions.length);
    assert.ok(set.questions.length > 0);
    for (const question of set.questions) {
      const values = [...question.choices, ...[question.answer].flat()];
      for (const value of values) {
        assert.ok(!value.split("・").some((part) => excluded.has(part)), `${question.id}: ${value}`);
      }
      assert.ok(!question.source?.refs?.some((ref) => excludedCodes.includes(ref)), question.id);
      if (question.type === "city-fact") {
        for (const municipality of excludedNames) {
          assert.doesNotMatch(question.trivia ?? "", new RegExp(`(?:^|[:：/]\\s*)${municipality} `), question.id);
        }
      }
    }
  });
}

test("city-factとallに旧自治体の解説ランキング3問を残さない", () => {
  const removedIds = [
    "city-fact-pref-population-desc-埼玉県",
    "city-fact-pref-areaKm2-asc-栃木県",
    "city-fact-pref-areaKm2-asc-静岡県",
  ];
  for (const name of ["city-fact.json", "all.json"]) {
    const set = sets.find(([file]) => file === name)[1];
    assert.ok(!set.questions.some((question) => removedIds.includes(question.id)), name);
  }
});

test("all.jsonは除外済みカテゴリを同じ順序・内容で連結する", () => {
  const all = sets.find(([name]) => name === "all.json")[1];
  const byType = new Map(sets.filter(([name]) => name !== "all.json").map(([, set]) => [set.type, set.questions]));
  const typeOrder = ["same-name", "vanished", "timeline-reason", "portmanteau", "reading",
    "city-fact", "lore-trivia", "parser-structure", "district-reading"];
  assert.deepEqual(all.questions, typeOrder.flatMap((type) => byType.get(type)));
});
