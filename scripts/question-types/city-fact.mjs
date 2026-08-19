// ご当地トリビア（日本一クイズ）。municipality-master.json（Wikidata由来の人口・面積）から機械生成する。
// 「次のうち人口が一番多いのは？」のような、同カテゴリの値を比較させる形式。
import { makePrng, shuffle, pickN } from "../../lib/prng.mjs";

function rankQuestions(items, key, label, unit, rng, groupSize = 4, groups = 12) {
  const sorted = [...items].filter((m) => m[key] != null).sort((a, b) => b[key] - a[key]);
  const questions = [];
  for (let g = 0; g < groups && g * groupSize + groupSize <= sorted.length; g++) {
    const slice = sorted.slice(g * groupSize, g * groupSize + groupSize);
    const winner = slice.reduce((a, b) => (a[key] > b[key] ? a : b));
    questions.push({
      type: "city-fact",
      id: `city-fact-${key}-${winner.code}`,
      prompt: `次のうち${label}が一番多いのは？`,
      choices: shuffle(slice.map((m) => m.name), rng),
      answer: winner.name,
      distractorStrategy: "sameCategoryPool",
      tags: ["city-fact", key],
      difficulty: g < 3 ? 0.2 : 0.6, // 上位（有名）ほど易しい
      source: { dataset: "wikidata-municipality-master", refs: slice.map((m) => m.code) },
      meta: Object.fromEntries(slice.map((m) => [m.name, `${m[key]}${unit}`])),
      trivia: `${label}比較: ${slice.map((m) => `${m.name} ${m[key]?.toLocaleString("ja-JP")}${unit}`).join(" / ")}`,
    });
  }
  return questions;
}

// 都道府県ごとに「県内で一番人口が多い市はどれ？」
function prefectureTopQuestions(municipalities, rng) {
  const byPref = new Map();
  for (const m of municipalities) {
    if (m.population == null) continue;
    if (!byPref.has(m.prefecture)) byPref.set(m.prefecture, []);
    byPref.get(m.prefecture).push(m);
  }
  const questions = [];
  for (const [pref, list] of byPref) {
    if (list.length < 4) continue;
    const sorted = [...list].sort((a, b) => b.population - a.population);
    const winner = sorted[0];
    const others = pickN(sorted.slice(1), 3, rng);
    const choices = shuffle([winner.name, ...others.map((m) => m.name)], rng);
    questions.push({
      type: "city-fact",
      id: `city-fact-pref-top-${pref}`,
      prompt: `${pref}で一番人口が多い市区町村は？`,
      choices,
      answer: winner.name,
      distractorStrategy: "sameCategoryPool",
      tags: ["city-fact", "pref-top", pref],
      difficulty: 0.35,
      source: { dataset: "wikidata-municipality-master", refs: [winner.code] },
    });
  }
  return questions;
}

export function generate(municipalities, seed) {
  const rng = makePrng(seed ?? "city-fact");
  return [
    ...rankQuestions(municipalities, "population", "人口", "人", rng),
    ...rankQuestions(municipalities, "areaKm2", "面積", "km²", rng),
    ...prefectureTopQuestions(municipalities, rng),
  ];
}
