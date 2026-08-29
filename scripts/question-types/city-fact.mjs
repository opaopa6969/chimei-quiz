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
    // 同値タイのスキップ: winner と同じ値の別要素が slice 内にあると正解が一意に定まらない
    // （例: 人口0人の福島県避難指示区域町村が4件並ぶ等）。そういうグループは出題しない。
    // issue #6: 63件の同値タイ問題がこの判定で除去される。
    // 比較は表示文字列（meta と同一の formatValue 結果）で行う — 数値は違うが
    // フォーマット後（人口密度の四捨五入等）で同文字列になるケースも「プレイヤーにとって同値」と
    // みなす（meta 文字列で比較するissue #6の受け入れ条件そのまま）。
    const winnerDisplay = formatValue(winner[key], unit);
    if (slice.some((m) => m !== winner && formatValue(m[key], unit) === winnerDisplay)) continue;
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
      // 全国順位のレンジも添える（g番目のグループ=ソート済みリストのg*4+1位〜g*4+4位相当）。
      // 単なる数値比較より「全国トップ10前後」等の相対的な位置づけが分かった方が印象に残る。
      trivia: `${label}比較: ${slice.map((m) => `${m.name} ${formatValue(m[key], unit)}`).join(" / ")}（全国${direction === "desc" ? "上位" : "下位"}${g * groupSize + 1}〜${g * groupSize + groupSize}位相当）`,
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
    // 同値タイの除去: winner と同じ値の要素が他にあれば、それを誤答に混ぜると正解が
    // 一意でなくなる（issue #6: 福島県人口・昇順で楢葉町=0人 と 葛尾村=0人 が同値）。
    // winner と同値の要素を候補から除外してから pickN する。
    // 比較は表示文字列（formatValue 結果）で行う — rankQuestions と同じ基準。
    const winnerDisplay = formatValue(winner[key], unit);
    const candidates = sorted.slice(1).filter((m) => formatValue(m[key], unit) !== winnerDisplay);
    if (candidates.length < 3) continue; // 3件の誤答が揃わなければ県としては出題しない
    const others = pickN(candidates, 3, rng);
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
      trivia: `${pref}内の${label}${direction === "desc" ? "上位" : "下位"}: ${sorted
        .slice(0, 4)
        .map((m) => `${m.name} ${formatValue(m[key], unit)}`)
        .join(" / ")}（${pref}には市区町村が${list.length}ある）`,
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
