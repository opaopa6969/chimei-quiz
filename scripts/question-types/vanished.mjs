// 消えた市町村クイズ。
// municipality-history の改正事由テキスト（merge/absorb/seidoイベント）から
// 「合併・編入・市制施行で名前が変わった旧市町村名」を集め、それが
// municipality-master（Wikidata現存自治体一覧）に無ければ「消えた市町村」として採用する。
//
// name だけで現存判定すると、過去に存在した同名の別県の自治体（例: 沖縄県「東村」は現存するが、
// 群馬県等にもかつて同名の「東村」があり廃止済み）を「現存する」と誤判定して見逃すことがある
// （reading.mjs で見つかった同種のバグ、詳細はそちら参照）。市町村合併は都道府県内で完結するため、
// name+施行時の都道府県 で判定する。
import { collectEvents } from "../../lib/reason-parser.mjs";
import { sameCategoryPool } from "./distractors.mjs";
import { makePrng, shuffle, pickN } from "../../lib/prng.mjs";

export function findVanished(changes, currentKeys) {
  const events = collectEvents(changes);
  const vanishedMap = new Map(); // "name|prefecture" -> {name, prefecture, lastDate, reasonRaw}

  for (const ev of events) {
    for (const old of ev.olds) {
      const key = `${old.name}|${ev.prefecture}`;
      if (currentKeys.has(key)) continue; // 今も同じ県に同名の自治体が存在するなら「消えた」とは言えない
      if (!/[市町村]$/.test(old.name)) continue; // 郡・支庁等の上位区分は対象外
      const prev = vanishedMap.get(key);
      if (!prev || ev.effectiveDate > prev.lastDate) {
        vanishedMap.set(key, {
          name: old.name,
          prefecture: ev.prefecture,
          lastDate: ev.effectiveDate,
          becameName: ev.new.name,
          raw: ev.raw,
        });
      }
    }
  }
  return [...vanishedMap.values()];
}

export function generate(changes, currentMunicipalities, seed) {
  const rng = makePrng(seed ?? "vanished");
  const currentKeys = new Set(currentMunicipalities.map((m) => `${m.name}|${m.prefecture}`));
  const vanished = findVanished(changes, currentKeys);
  const currentNameList = currentMunicipalities.map((m) => m.name);

  const questions = [];
  for (const v of vanished) {
    const distractors = sameCategoryPool(currentNameList, new Set([v.name]), 3, rng);
    const choices = shuffle([v.name, ...distractors], rng);

    questions.push({
      type: "vanished",
      id: `vanished-${v.name}-${v.prefecture}`,
      prompt: "次のうち、現在は存在しない市町村はどれ？",
      choices,
      answer: v.name,
      distractorStrategy: "sameCategoryPool",
      tags: ["vanished", v.prefecture, v.lastDate.slice(0, 4)],
      difficulty: 0.6, // 消滅は基本的に難しめ（存在しないものを選ぶ形式のため）
      source: { dataset: "municipality-history", refs: [v.raw] },
      meta: { prefecture: v.prefecture, lastDate: v.lastDate, becameName: v.becameName },
      trivia: `${v.prefecture}${v.name}は${v.lastDate}に${v.becameName}になった。${v.raw.replace(/\n/g, " / ")}`,
    });
  }
  return questions;
}
