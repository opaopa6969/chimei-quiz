// 難読地名クイズ。
//
// 以前は「かな文字数÷漢字文字数」の比率で機械的にスコアリングしていたが、これは
// 「下関市＝しものせきし」のような、単に訓読みの文字数が多いだけの普通に読める地名まで
// 難読扱いしてしまう欠陥があった（下＝しも、関＝せき、はどちらもごく一般的な訓読み。
// 比率だけでは「一般的な読みの組み合わせかどうか」を判定できない）。
//
// そこで方式を変更: 実際に「難読地名」として広く知られる市区町村を手作業でキュレーションし
// （北海道・沖縄のアイヌ語/琉球語由来の自治体名が中心、当て字・特殊な音便が多い）、
// municipality-master（現存自治体）に実在するものだけを採用する。読み仮名は
// municipality-history（e-Stat公式）にデータがあればそちらを優先し、キュレーションリストの
// 手打ち分と食い違えば警告を出す（正確性のため公式データを信頼する）。
//
// 注意: name だけで municipality-history を引くと、過去に存在した同名の別自治体
// （例: 沖縄県「東村」＝ひがしそん、は現存するが、群馬県等にもかつて「東村」＝あずまむら、
// があり廃止済み）を誤って拾うことがある。そのため name+prefecture で照合する
// （このバグは実際にユーザー報告「下関市が難読は変」の調査中に発見・修正した）。
import { makePrng, shuffle, pickN } from "../../lib/prng.mjs";

// { name, prefecture, kana } — kanaは公式データが無い場合のフォールバック。
// 北海道・沖縄の町村はアイヌ語/琉球語由来で「一般的な音訓では読めない」ものが大半、
// 本州の数件は全国的に「難読市」として知られるもの。
const CURATED_HARD_READINGS = [
  // 北海道（アイヌ語由来）
  { name: "長万部町", prefecture: "北海道", kana: "おしゃまんべちょう" },
  { name: "音威子府村", prefecture: "北海道", kana: "おといねっぷむら" },
  { name: "弟子屈町", prefecture: "北海道", kana: "てしかがちょう" },
  { name: "倶知安町", prefecture: "北海道", kana: "くっちゃんちょう" },
  { name: "積丹町", prefecture: "北海道", kana: "しゃこたんちょう" },
  { name: "蘭越町", prefecture: "北海道", kana: "らんこしちょう" },
  { name: "寿都町", prefecture: "北海道", kana: "すっつちょう" },
  { name: "島牧村", prefecture: "北海道", kana: "しままきむら" },
  { name: "神恵内村", prefecture: "北海道", kana: "かもえないむら" },
  { name: "妹背牛町", prefecture: "北海道", kana: "もせうしちょう" },
  { name: "秩父別町", prefecture: "北海道", kana: "ちっぷべつちょう" },
  { name: "訓子府町", prefecture: "北海道", kana: "くんねっぷちょう" },
  { name: "陸別町", prefecture: "北海道", kana: "りくべつちょう" },
  { name: "剣淵町", prefecture: "北海道", kana: "けんぶちちょう" },
  { name: "幌加内町", prefecture: "北海道", kana: "ほろかないちょう" },
  { name: "中札内村", prefecture: "北海道", kana: "なかさつないむら" },
  { name: "新冠町", prefecture: "北海道", kana: "にいかっぷちょう" },
  { name: "様似町", prefecture: "北海道", kana: "さまにちょう" },
  { name: "遠軽町", prefecture: "北海道", kana: "えんがるちょう" },
  { name: "木古内町", prefecture: "北海道", kana: "きこないちょう" },
  { name: "喜茂別町", prefecture: "北海道", kana: "きもべつちょう" },
  { name: "留寿都村", prefecture: "北海道", kana: "るすつむら" },
  { name: "真狩村", prefecture: "北海道", kana: "まっかりむら" },
  { name: "標茶町", prefecture: "北海道", kana: "しべちゃちょう" },
  { name: "白糠町", prefecture: "北海道", kana: "しらぬかちょう" },
  { name: "羅臼町", prefecture: "北海道", kana: "らうすちょう" },
  { name: "中標津町", prefecture: "北海道", kana: "なかしべつちょう" },
  { name: "猿払村", prefecture: "北海道", kana: "さるふつむら" },
  { name: "枝幸町", prefecture: "北海道", kana: "えさしちょう" },
  { name: "雄武町", prefecture: "北海道", kana: "おうむちょう" },
  { name: "興部町", prefecture: "北海道", kana: "おこっぺちょう" },
  { name: "西興部村", prefecture: "北海道", kana: "にしおこっぺむら" },
  { name: "湧別町", prefecture: "北海道", kana: "ゆうべつちょう" },
  { name: "津別町", prefecture: "北海道", kana: "つべつちょう" },
  { name: "佐呂間町", prefecture: "北海道", kana: "さろまちょう" },
  { name: "名寄市", prefecture: "北海道", kana: "なよろし" },
  { name: "中頓別町", prefecture: "北海道", kana: "なかとんべつちょう" },
  { name: "浜頓別町", prefecture: "北海道", kana: "はまとんべつちょう" },
  { name: "幌延町", prefecture: "北海道", kana: "ほろのべちょう" },
  // 青森県
  { name: "六ヶ所村", prefecture: "青森県", kana: "ろっかしょむら" },
  // 沖縄県（村を「そん」と読む点も難読ポイント）
  { name: "今帰仁村", prefecture: "沖縄県", kana: "なきじんそん" },
  { name: "北谷町", prefecture: "沖縄県", kana: "ちゃたんちょう" },
  { name: "読谷村", prefecture: "沖縄県", kana: "よみたんそん" },
  { name: "座間味村", prefecture: "沖縄県", kana: "ざまみそん" },
  { name: "南風原町", prefecture: "沖縄県", kana: "はえばるちょう" },
  { name: "中城村", prefecture: "沖縄県", kana: "なかぐすくそん" },
  { name: "北中城村", prefecture: "沖縄県", kana: "きたなかぐすくそん" },
  { name: "恩納村", prefecture: "沖縄県", kana: "おんなそん" },
  { name: "金武町", prefecture: "沖縄県", kana: "きんちょう" },
  { name: "宜野座村", prefecture: "沖縄県", kana: "ぎのざそん" },
  { name: "東村", prefecture: "沖縄県", kana: "ひがしそん" },
  { name: "大宜味村", prefecture: "沖縄県", kana: "おおぎみそん" },
  { name: "国頭村", prefecture: "沖縄県", kana: "くにがみそん" },
  { name: "伊江村", prefecture: "沖縄県", kana: "いえそん" },
  { name: "与那原町", prefecture: "沖縄県", kana: "よなばるちょう" },
  { name: "八重瀬町", prefecture: "沖縄県", kana: "やえせちょう" },
  { name: "渡嘉敷村", prefecture: "沖縄県", kana: "とかしきそん" },
  { name: "粟国村", prefecture: "沖縄県", kana: "あぐにそん" },
  { name: "渡名喜村", prefecture: "沖縄県", kana: "となきそん" },
  { name: "南大東村", prefecture: "沖縄県", kana: "みなみだいとうそん" },
  { name: "北大東村", prefecture: "沖縄県", kana: "きただいとうそん" },
  { name: "伊平屋村", prefecture: "沖縄県", kana: "いへやそん" },
  { name: "伊是名村", prefecture: "沖縄県", kana: "いぜなそん" },
  // 本州（全国的に「難読市」として知られるもの）
  { name: "廿日市市", prefecture: "広島県", kana: "はつかいちし" },
  { name: "八街市", prefecture: "千葉県", kana: "やちまたし" },
  { name: "匝瑳市", prefecture: "千葉県", kana: "そうさし" },
  { name: "各務原市", prefecture: "岐阜県", kana: "かかみがはらし" },
  { name: "潮来市", prefecture: "茨城県", kana: "いたこし" },
  { name: "蕨市", prefecture: "埼玉県", kana: "わらびし" },
  { name: "邑楽町", prefecture: "群馬県", kana: "おうらまち" },
];

// municipality-changesから ("name|prefecture" -> kana) の対応を作る（誤答プール・公式読みの照合用）。
// name だけをキーにすると、過去に存在した同名の別県の自治体を誤って拾うことがあるため
// prefectureも含めて一意にする。
export function buildReadingMap(changes, currentMunicipalities) {
  const currentKeys = new Set(currentMunicipalities.map((m) => `${m.name}|${m.prefecture}`));
  const map = new Map();
  for (const c of changes) {
    if (!c.municipality || !c.municipalityKana) continue;
    const key = `${c.municipality}|${c.prefecture}`;
    if (!currentKeys.has(key)) continue;
    map.set(key, c.municipalityKana);
  }
  return map;
}

export function generate(changes, currentMunicipalities, seed) {
  const rng = makePrng(seed ?? "reading");
  const currentKeys = new Set(currentMunicipalities.map((m) => `${m.name}|${m.prefecture}`));
  const officialKana = buildReadingMap(changes, currentMunicipalities);

  const hard = [];
  for (const w of CURATED_HARD_READINGS) {
    const key = `${w.name}|${w.prefecture}`;
    if (!currentKeys.has(key)) continue; // 廃置分合等で名前が変わり現存しない場合はスキップ
    const official = officialKana.get(key);
    if (official && official !== w.kana) {
      console.warn(`[reading] 読み不一致: ${w.name}(${w.prefecture}) キュレーション=${w.kana} 公式=${official} → 公式を採用`);
    }
    hard.push({ name: w.name, prefecture: w.prefecture, kana: official ?? w.kana });
  }

  const hardKeys = new Set(hard.map((h) => `${h.name}|${h.prefecture}`));
  const easyPool = [...officialKana.entries()]
    .filter(([key]) => !hardKeys.has(key))
    .map(([, kana]) => kana);

  const questions = [];
  for (const h of hard) {
    const distractors = pickN(easyPool, 3, rng);
    const choices = shuffle([h.kana, ...distractors], rng);

    questions.push({
      type: "reading",
      id: `reading-${h.name}-${h.prefecture}`,
      prompt: `「${h.name}」の読み方は？`,
      choices,
      answer: h.kana,
      distractorStrategy: "curatedHardReadings",
      tags: ["reading", h.prefecture],
      difficulty: 0.6,
      source: { dataset: "curated-hard-readings + municipality-history", refs: [`${h.name}(${h.prefecture})`] },
    });
  }
  return questions;
}
