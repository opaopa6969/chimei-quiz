// 町丁目・字レベルの難読地名クイズ。data/district-readings.json
// （日本郵便の公式郵便番号データで実在確認・読み仮名照合済み）から生成する。
// reading.mjs（市区町村レベル）の対象外だった粒度を補うカテゴリ。
import { makePrng, shuffle, pickN } from "../../lib/prng.mjs";

export function generate(districts, seed) {
  const rng = makePrng(seed ?? "district-reading");
  const questions = [];

  for (const d of districts) {
    const pool = districts.filter((x) => x !== d).map((x) => x.kana);
    const distractors = pickN(pool, 3, rng);
    const choices = shuffle([d.kana, ...distractors], rng);

    const triviaParts = [];
    if (d.popularName && d.popularName !== d.officialName) {
      triviaParts.push(`一般には「${d.popularName}」として知られる。`);
    }
    if (d.trivia) triviaParts.push(d.trivia);

    questions.push({
      type: "district-reading",
      id: `district-reading-${d.officialName}-${d.city}`,
      prompt: `「${d.officialName}」（${d.prefecture}${d.city}）の読み方は？`,
      choices,
      answer: d.kana,
      distractorStrategy: "curatedHardReadings",
      tags: ["district-reading", d.prefecture],
      difficulty: 0.75, // 町丁目レベルは市区町村より一段難しい
      source: { dataset: "日本郵便 郵便番号データ", refs: [`${d.officialName}(${d.city})`] },
      trivia: triviaParts.join(" "),
    });
  }
  return questions;
}
