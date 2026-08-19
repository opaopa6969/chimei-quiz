// 同名地名クイズ（府中型）。
// municipality-master.json（Wikidata由来の現存基礎自治体一覧）から、
// 名前が2県以上にまたがるものを同名地名として検出する。
//
// municipality-history（廃置分合の変更履歴）は「一度も変更のない自治体」が載らないため
// 使えなかった（府中市のような同名地名の主役が抜け落ちる）。詳細はdocs/design.md参照。
import { sameCategoryPoolPrefectures } from "./distractors.mjs";
import { makePrng, shuffle } from "../../lib/prng.mjs";

export function findSameNameGroups(municipalities) {
  const byName = new Map();
  for (const m of municipalities) {
    if (!byName.has(m.name)) byName.set(m.name, []);
    byName.get(m.name).push(m);
  }
  return [...byName.entries()]
    .map(([name, list]) => ({ name, list, prefectures: [...new Set(list.map((x) => x.prefecture))] }))
    .filter((g) => g.prefectures.length >= 2);
}

export function generate(municipalities, seed) {
  const rng = makePrng(seed ?? "same-name");
  const groups = findSameNameGroups(municipalities);
  const questions = [];

  for (const g of groups) {
    // 一致した都道府県それぞれを正解にした問題を1問ずつ作る（府中なら東京都版・広島県版の2問）
    for (const answerPref of g.prefectures) {
      const givenPrefs = g.prefectures.filter((p) => p !== answerPref);
      const givenPref = givenPrefs[0]; // 3県以上またぐ稀ケースは先頭のみ出題文に使う
      const exclude = new Set(g.prefectures);
      const distractors = sameCategoryPoolPrefectures(exclude, 3, rng);
      const choices = shuffle([answerPref, ...distractors], rng);

      questions.push({
        type: "same-name",
        id: `same-name-${g.name}-${answerPref}`,
        prompt: `「${g.name}」は${givenPref}の他にどこにある？`,
        choices,
        answer: answerPref,
        distractorStrategy: "sameCategoryPool",
        tags: ["same-name", ...g.prefectures],
        difficulty: difficultyOf(g),
        source: { dataset: "wikidata-municipality-master", refs: g.list.map((x) => x.code) },
        meta: { name: g.name, givenPref },
        trivia: triviaOf(g),
      });
    }
  }
  return questions;
}

// 一致件数が多い(=有名)ほど易しい。2件一致がデフォルトの難度。
function difficultyOf(g) {
  const n = g.prefectures.length;
  return Math.max(0, Math.min(1, 1 - (n - 2) * 0.25));
}

// 各地の人口を添えて「同じ名前でもこんなに違う」を見せる周辺知識
function triviaOf(g) {
  const parts = g.list.map((m) => {
    const pop = m.population != null ? `人口約${m.population.toLocaleString("ja-JP")}人` : "人口データなし";
    return `${m.prefecture}${m.name}（${pop}）`;
  });
  return `全国に${g.prefectures.length}箇所の「${g.name}」: ${parts.join(" / ")}`;
}
