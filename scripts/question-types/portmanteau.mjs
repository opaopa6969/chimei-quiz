// 合成地名クイズ（西東京市＝田無市＋保谷市、のような「新設合併で全く新しい名前が付いた」ケース）。
// mergeイベントのうち、新設名が旧地名のどれとも一致しない（存続合併ではなく完全新命名）ものを対象にする。
//
// 注: 「文字を組み合わせた」厳密な合成地名（例: 音韻由来）かどうかまでは機械判定していない —
// ここでは「合併で全く新しい名前が付いた」ケース全般をポートマントー枠として扱う。
import { makePrng, shuffle, pickN } from "../../lib/prng.mjs";
import { collectEvents } from "../../lib/reason-parser.mjs";

export function findBrandNewMerges(changes) {
  const events = collectEvents(changes);
  return events.filter(
    (ev) => ev.kind === "merge" && ev.olds.length >= 2 && !ev.olds.some((o) => o.name === ev.new.name)
  );
}

export function generate(changes, seed) {
  const rng = makePrng(seed ?? "portmanteau");
  const brandNew = findBrandNewMerges(changes);
  const questions = [];

  for (const ev of brandNew) {
    const oldsLabel = ev.olds.map((o) => o.name).join("・");
    const distractorPool = brandNew.filter((e) => e !== ev).map((e) => e.olds.map((o) => o.name).join("・"));
    const distractors = pickN(distractorPool, 3, rng);
    const choices = shuffle([oldsLabel, ...distractors], rng);

    questions.push({
      type: "portmanteau",
      id: `portmanteau-${ev.new.name}-${ev.effectiveDate}`,
      prompt: `「${ev.new.name}」は元々何市町村の合併？`,
      choices,
      answer: oldsLabel,
      distractorStrategy: "sameCategoryPool",
      tags: ["portmanteau", ev.prefecture, ev.effectiveDate.slice(0, 4)],
      difficulty: 0.7,
      source: { dataset: "municipality-history", refs: [ev.raw] },
      trivia: `${ev.effectiveDate}、${ev.prefecture}: ${oldsLabel}が合併し「${ev.new.name}」が誕生した。`,
    });
  }
  return questions;
}
