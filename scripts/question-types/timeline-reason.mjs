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
      // 新設合併では、新自治体名が旧自治体名のどれかと同一になることがある（吸収的新設合併）。
      // 例: 釧路市・阿寒町・音別町 → 釧路市。旧自治体名をそのまま列挙すると正解が問題文に露出し、
      // 読むだけで解ける（741問中189問＝25.5%が該当していた、issue #20）。
      // 同じmergeイベントを扱う portmanteau.mjs は findBrandNewMerges で同じケースを弾いている。
      //
      // 判定に === ではなく includes を使うのは、完全一致しないのに正解が現れるケースがあるため。
      // 例: 「鷲敷町・相生町・上那賀町・木沢村・木頭村が合併して誕生したのは？」→ 那賀町
      // （上那賀町 が 那賀町 を部分文字列として含む）。includes なら
      // 「生成した全設問で prompt.includes(answer) が偽」を不変条件として保証できる。
      const visibleOlds = ev.olds.filter((o) => !o.name.includes(ev.new.name));
      // 全ての旧名が正解を含むイベント（上湧別町・湧別町 → 湧別町 / 有田町・西有田町 → 有田町）は
      // どう書いても答えが問題文に出るので出題できない。
      if (visibleOlds.length === 0) continue;
      const visibleLabel = visibleOlds.map((o) => o.name).join("・");
      // 旧自治体を隠したときは「が」ではなく「と」にする。正解の自治体も合併の当事者だったことを示し、
      // 「隠された当事者がいる」と読めるようにするため。
      const mergePrompt =
        visibleOlds.length === ev.olds.length
          ? `${visibleLabel}が合併して誕生したのは？`
          : `${visibleLabel}と合併して誕生したのは？`;

      // 誤答の除外集合は隠した分も含めて全oldsを使う（表示していない自治体名が誤答に出ると紛らわしいため）。
      const distractors = sameCategoryPool(currentNameList, new Set([ev.new.name, ...ev.olds.map((o) => o.name)]), 3, rng);
      const choices = shuffle([ev.new.name, ...distractors], rng);
      questions.push({
        type: "timeline-reason",
        id: `timeline-merge-${ev.new.name}-${ev.effectiveDate}`,
        prompt: mergePrompt,
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
