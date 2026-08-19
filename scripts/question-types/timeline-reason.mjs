// 自治体変遷推理クイズ。
// municipality-history の merge/absorb イベントから、
// 「この合併／編入で誕生・変化した先はどこ？」を当てさせる。
import { collectEvents } from "../../lib/reason-parser.mjs";
import { sameCategoryPool } from "./distractors.mjs";
import { makePrng, shuffle } from "../../lib/prng.mjs";
import { toEraLabel, isHeiseiMerger } from "../../lib/era.mjs";

export function generate(changes, currentMunicipalities, seed) {
  const rng = makePrng(seed ?? "timeline-reason");
  const events = collectEvents(changes);
  const currentNameList = currentMunicipalities.map((m) => m.name);
  const questions = [];

  for (const ev of events) {
    if (ev.olds.length === 0 || !ev.new.name) continue;
    const oldsLabel = ev.olds.map((o) => o.name).join("・");

    if (ev.kind === "merge") {
      const distractors = sameCategoryPool(currentNameList, new Set([ev.new.name, ...ev.olds.map((o) => o.name)]), 3, rng);
      const choices = shuffle([ev.new.name, ...distractors], rng);
      questions.push({
        type: "timeline-reason",
        id: `timeline-merge-${ev.new.name}-${ev.effectiveDate}`,
        prompt: `${oldsLabel}が合併して誕生したのは？`,
        choices,
        answer: ev.new.name,
        distractorStrategy: "sameCategoryPool",
        tags: ["timeline-reason", "merge", ev.prefecture, ev.effectiveDate.slice(0, 4)],
        difficulty: difficultyOf(ev),
        source: { dataset: "municipality-history", refs: [ev.raw] },
        trivia: triviaFor(ev),
      });
    } else if (ev.kind === "absorb") {
      const distractors = sameCategoryPool(currentNameList, new Set([ev.new.name, ...ev.olds.map((o) => o.name)]), 3, rng);
      const choices = shuffle([ev.new.name, ...distractors], rng);
      questions.push({
        type: "timeline-reason",
        id: `timeline-absorb-${oldsLabel}-${ev.effectiveDate}`,
        prompt: `「${oldsLabel}」が編入されたのはどこ？`,
        choices,
        answer: ev.new.name,
        distractorStrategy: "sameCategoryPool",
        tags: ["timeline-reason", "absorb", ev.prefecture, ev.effectiveDate.slice(0, 4)],
        difficulty: difficultyOf(ev),
        source: { dataset: "municipality-history", refs: [ev.raw] },
        trivia: triviaFor(ev),
      });
    }
  }
  return questions;
}

// 平成の大合併(2003-2010)は知名度が高く易しめ、合併対象が多いほど有名な合併の傾向があるので易しめにする。
function difficultyOf(ev) {
  const year = Number(ev.effectiveDate.slice(0, 4));
  const heisei = year >= 2003 && year <= 2010;
  const base = heisei ? 0.4 : 0.6;
  const scaleCount = Math.max(0, 0.2 - ev.olds.length * 0.03);
  return Math.max(0, Math.min(1, base + scaleCount));
}

function triviaFor(ev) {
  const eraNote = toEraLabel(ev.effectiveDate);
  const heiseiNote = isHeiseiMerger(ev.effectiveDate) ? "「平成の大合併」（2003〜2010年）の一つ。" : "";
  return `${eraNote}、${ev.prefecture}。${heiseiNote}${ev.raw.replace(/\n/g, " / ")}`;
}
