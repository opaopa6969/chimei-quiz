// ご当地トリビア（日本一クイズ）。municipality-master.json（Wikidata由来の人口・面積）から機械生成する。
// 「次のうち人口が一番多いのは？」のような、同カテゴリの値を比較させる形式。
//
// 何度も遊べるように、というリクエストで拡張: 「多い方」だけでなく「少ない方」（過疎最多クイズ等）、
// 人口密度（population/areaKm2）も追加し、比較対象グループの数も増やした。
import { makePrng, shuffle, pickN } from "../../lib/prng.mjs";

function rankQuestions(items, key, label, unit, rng, { groups = 60, groupSize = 4, direction = "desc" } = {}) {
  const sorted = [...items]
    .filter((m) => m[key] != null)
    .sort((a, b) => (direction === "desc" ? b[key] - a[key] : a[key] - b[key]));
  const verb = direction === "desc" ? "多い" : "少ない";
  const questions = [];
  for (let g = 0; g < groups && g * groupSize + groupSize <= sorted.length; g++) {
    const slice = sorted.slice(g * groupSize, g * groupSize + groupSize);
    const winner = slice.reduce((a, b) =>
      direction === "desc" ? (a[key] > b[key] ? a : b) : (a[key] < b[key] ? a : b)
    );
    questions.push({
      type: "city-fact",
      id: `city-fact-${key}-${direction}-${winner.code}`,
      prompt: `次のうち${label}が一番${verb}のは？`,
      choices: shuffle(slice.map((m) => m.name), rng),
      answer: winner.name,
      distractorStrategy: "sameCategoryPool",
      tags: ["city-fact", key, direction],
      // 降順(多い方)の上位＝有名な大都市同士の比較は易しい。それ以外は無名同士の比較になり難しめ。
      difficulty: direction === "desc" && g < 3 ? 0.2 : 0.55,
      source: { dataset: "wikidata-municipality-master", refs: slice.map((m) => m.code) },
      meta: Object.fromEntries(slice.map((m) => [m.name, `${formatValue(m[key], unit)}`])),
      trivia: `${label}比較: ${slice.map((m) => `${m.name} ${formatValue(m[key], unit)}`).join(" / ")}`,
    });
  }
  return questions;
}

function formatValue(v, unit) {
  if (unit === "人/km²") {
    // 過疎地は1人/km²未満になることがあり、四捨五入すると軒並み「0人/km²」になって
    // 数値の意味が消えてしまう（実際に双葉町等で発生した）。1未満は小数2桁で見せる。
    return v < 1 ? `${v.toFixed(2)}${unit}` : `${Math.round(v).toLocaleString("ja-JP")}${unit}`;
  }
  return `${v.toLocaleString("ja-JP")}${unit}`;
}

// 都道府県ごとに「県内で一番人口が多い/少ない市はどれ？」「面積が一番広い/狭いのは？」
function prefectureExtremeQuestions(municipalities, key, label, unit, direction, rng) {
  const byPref = new Map();
  for (const m of municipalities) {
    if (m[key] == null) continue;
    if (!byPref.has(m.prefecture)) byPref.set(m.prefecture, []);
    byPref.get(m.prefecture).push(m);
  }
  const questions = [];
  for (const [pref, list] of byPref) {
    if (list.length < 4) continue;
    const sorted = [...list].sort((a, b) => (direction === "desc" ? b[key] - a[key] : a[key] - b[key]));
    const winner = sorted[0];
    const others = pickN(sorted.slice(1), 3, rng);
    const choices = shuffle([winner.name, ...others.map((m) => m.name)], rng);
    const cmpWord = direction === "desc" ? "多い" : "少ない";
    questions.push({
      type: "city-fact",
      id: `city-fact-pref-${key}-${direction}-${pref}`,
      prompt: `${pref}で${label}が一番${cmpWord}市区町村は？`,
      choices,
      answer: winner.name,
      distractorStrategy: "sameCategoryPool",
      tags: ["city-fact", "pref-extreme", key, direction, pref],
      difficulty: 0.4,
      source: { dataset: "wikidata-municipality-master", refs: [winner.code] },
      trivia: `${pref}内の${label}: ${sorted
        .slice(0, 4)
        .map((m) => `${m.name} ${formatValue(m[key], unit)}`)
        .join(" / ")}`,
    });
  }
  return questions;
}

export function generate(municipalities, seed) {
  const rng = makePrng(seed ?? "city-fact");
  const withDensity = municipalities
    .filter((m) => m.population != null && m.areaKm2 != null && m.areaKm2 > 0)
    .map((m) => ({ ...m, density: m.population / m.areaKm2 }));

  return [
    ...rankQuestions(municipalities, "population", "人口", "人", rng, { direction: "desc" }),
    ...rankQuestions(municipalities, "population", "人口", "人", rng, { direction: "asc" }),
    ...rankQuestions(municipalities, "areaKm2", "面積", "km²", rng, { direction: "desc" }),
    ...rankQuestions(municipalities, "areaKm2", "面積", "km²", rng, { direction: "asc" }),
    ...rankQuestions(withDensity, "density", "人口密度", "人/km²", rng, { direction: "desc" }),
    ...rankQuestions(withDensity, "density", "人口密度", "人/km²", rng, { direction: "asc" }),
    ...prefectureExtremeQuestions(municipalities, "population", "人口", "人", "desc", rng),
    ...prefectureExtremeQuestions(municipalities, "population", "人口", "人", "asc", rng),
    ...prefectureExtremeQuestions(municipalities, "areaKm2", "面積", "km²", "desc", rng),
    ...prefectureExtremeQuestions(municipalities, "areaKm2", "面積", "km²", "asc", rng),
  ];
}
