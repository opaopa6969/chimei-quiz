// 難読地名クイズ。
// municipality-history に付いている「ふりがな」列を使い、漢字文字数に対してかな文字数が
// 多い（＝素直な音読み訓読みでは説明しづらい）ものを難読候補としてスコアリングする。
// 辞書ベースの正確な難読判定ではなく、あくまで機械的なランキング — 上位が全部「本当に難読」とは
// 限らないが、クイズのネタ抽出としては十分に機能する。
import { makePrng, shuffle, pickN } from "../../lib/prng.mjs";

const SUFFIX_KANJI = /[市区町村]$/;
const SUFFIX_KANA = /(し|く|ちょう|まち|むら|そん)$/;

function coreKanji(name) {
  return name.replace(SUFFIX_KANJI, "");
}
function coreKana(kana) {
  return kana.replace(SUFFIX_KANA, "");
}

function readingScore(name, kana) {
  const k = [...coreKanji(name)].length;
  const y = [...coreKana(kana)].length;
  if (k === 0) return 0;
  let score = y / k; // 比率が高いほど「1文字が長く読まれている」＝難読の目安
  if (/[っゃゅょ]/.test(kana)) score += 0.3; // 促音・拗音は読み間違えやすい
  return score;
}

// municipality-changesから (name -> kana) の対応を作り、現存自治体名に絞る
export function buildReadingMap(changes, currentMunicipalities) {
  const currentNames = new Set(currentMunicipalities.map((m) => m.name));
  const map = new Map();
  for (const c of changes) {
    if (!c.municipality || !c.municipalityKana) continue;
    if (!currentNames.has(c.municipality)) continue;
    map.set(c.municipality, c.municipalityKana);
  }
  return map;
}

export function generate(changes, currentMunicipalities, seed, topN = 60) {
  const rng = makePrng(seed ?? "reading");
  const readingMap = buildReadingMap(changes, currentMunicipalities);

  const scored = [...readingMap.entries()]
    .map(([name, kana]) => ({ name, kana, score: readingScore(name, kana) }))
    .sort((a, b) => b.score - a.score);

  const hard = scored.slice(0, topN);
  const easyPool = scored.slice(topN); // 誤答（それっぽい読み）の元ネタ

  const questions = [];
  for (const h of hard) {
    // 誤答の読みは「読みやすい地名プール」からかな部分だけ拝借して、それっぽい誤答を作る
    const distractorKanas = pickN(
      easyPool.map((e) => e.kana),
      3,
      rng
    );
    const choices = shuffle([h.kana, ...distractorKanas], rng);

    questions.push({
      type: "reading",
      id: `reading-${h.name}`,
      prompt: `「${h.name}」の読み方は？`,
      choices,
      answer: h.kana,
      distractorStrategy: "readingConfusion",
      tags: ["reading"],
      difficulty: Math.max(0, Math.min(1, h.score / 3)),
      source: { dataset: "municipality-history", refs: [h.name] },
    });
  }
  return questions;
}
