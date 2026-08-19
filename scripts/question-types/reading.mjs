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
  // 北海道 追加分（Wikipedia「北海道の難読地名一覧」からの厳選、2026-08-20）
  { name: "厚沢部町", prefecture: "北海道", kana: "あっさぶちょう" },
  { name: "南幌町", prefecture: "北海道", kana: "なんぽろちょう" },
  { name: "浦臼町", prefecture: "北海道", kana: "うらうすちょう" },
  { name: "新十津川町", prefecture: "北海道", kana: "しんとつかわちょう" },
  { name: "比布町", prefecture: "北海道", kana: "ぴっぷちょう" },
  { name: "占冠村", prefecture: "北海道", kana: "しむかっぷむら" },
  { name: "和寒町", prefecture: "北海道", kana: "わっさむちょう" },
  { name: "壮瞥町", prefecture: "北海道", kana: "そうべつちょう" },
  { name: "平取町", prefecture: "北海道", kana: "びらとりちょう" },
  { name: "士幌町", prefecture: "北海道", kana: "しほろちょう" },
  { name: "上士幌町", prefecture: "北海道", kana: "かみしほろちょう" },
  { name: "豊頃町", prefecture: "北海道", kana: "とよころちょう" },
  { name: "厚岸町", prefecture: "北海道", kana: "あっけしちょう" },
  // 青森県
  { name: "六ヶ所村", prefecture: "青森県", kana: "ろっかしょむら" },
  { name: "六戸町", prefecture: "青森県", kana: "ろくのへまち" },
  { name: "東北町", prefecture: "青森県", kana: "とうほくまち" },
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
  { name: "廿日市市", prefecture: "広島県", kana: "はつかいちし", note: "「廿」は「二十」の意。20日に市が立った町という由来とされる。" },
  { name: "八街市", prefecture: "千葉県", kana: "やちまたし", note: "明治期の下総台地開墾地の一つ。開墾順に初富・二和…と数字が入った地名が並び、8番目が「八街」。" },
  { name: "匝瑳市", prefecture: "千葉県", kana: "そうさし", note: "古代の匝瑳郡に由来する地名。「匝」「瑳」ともに日常ではほぼ使われない珍しい漢字。" },
  { name: "各務原市", prefecture: "岐阜県", kana: "かかみがはらし", note: "古代豪族「各務氏」に由来するとされる地名。" },
  { name: "潮来市", prefecture: "茨城県", kana: "いたこし", note: "元は「板来（いたこ）」の字が当てられた水郷地帯の地名。" },
  { name: "蕨市", prefecture: "埼玉県", kana: "わらびし", note: "植物のワラビに由来するとされる地名（諸説あり）。日本一面積の小さい市。" },
  { name: "邑楽町", prefecture: "群馬県", kana: "おうらまち", note: "古代の邑楽郡に由来。「おうら」という読みは古い日本語の発音の名残とされる。" },
  // 追加分（Wikipedia「◯◯地方の難読地名一覧」からの厳選、2026-08-20。近畿〜九州・沖縄）
  { name: "木曽岬町", prefecture: "三重県", kana: "きそさきちょう" },
  { name: "斑鳩町", prefecture: "奈良県", kana: "いかるがちょう", note: "聖徳太子ゆかりの地。「斑鳩」はイカルという鳥の群れる里という意味とされる。" },
  { name: "若桜町", prefecture: "鳥取県", kana: "わかさまち" },
  { name: "海士町", prefecture: "島根県", kana: "あまちょう", note: "隠岐諸島の島。「海士」で漁師を意味する言葉に由来。" },
  { name: "知夫村", prefecture: "島根県", kana: "ちぶむら" },
  { name: "神石高原町", prefecture: "広島県", kana: "じんせきこうげんちょう" },
  { name: "阿武町", prefecture: "山口県", kana: "あぶちょう" },
  { name: "土庄町", prefecture: "香川県", kana: "とのしょうちょう" },
  { name: "檮原町", prefecture: "高知県", kana: "ゆすはらちょう", note: "「檮」は「梼」の異体字で、日常ではほぼ使われない珍しい漢字。" },
  { name: "奈半利町", prefecture: "高知県", kana: "なはりちょう" },
  { name: "いちき串木野市", prefecture: "鹿児島県", kana: "いちきくしきのし", note: "2005年に市来町と串木野市が合併して誕生。ひらがな+漢字の合成地名。" },
  { name: "姶良市", prefecture: "鹿児島県", kana: "あいらし" },
  { name: "曽於市", prefecture: "鹿児島県", kana: "そおし" },
  { name: "豊見城市", prefecture: "沖縄県", kana: "とみぐすくし", note: "琉球王国時代の豊見城グスク（城）に由来。「城」を「ぐすく」と読むのは沖縄独特。" },
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
    hard.push({ name: w.name, prefecture: w.prefecture, kana: official ?? w.kana, note: w.note });
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
      trivia: triviaFor(h),
    });
  }
  return questions;
}

function triviaFor(h) {
  if (h.note) return h.note;
  if (h.prefecture === "北海道" || h.prefecture === "青森県") {
    return `${h.prefecture}の地名の多くはアイヌ語由来。「${h.kana}」も漢字の音訓読みではなく、アイヌ語の発音に漢字を当てはめたもの。`;
  }
  if (h.prefecture === "沖縄県") {
    return `沖縄県の地名は琉球方言（琉球語）由来が多い。「村」を本土のように「むら」ではなく「そん」と読むのも沖縄独特。`;
  }
  return "全国的に「難読市区町村」として知られる地名。";
}
