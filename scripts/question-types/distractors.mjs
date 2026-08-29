// 誤答（distractor）生成の共通戦略。docs/question-patterns.md 参照。
// geographicNeighbor（隣接都道府県）は隣接関係データが要るので今は未実装 — TODO。
import { pickN } from "../../lib/prng.mjs";

const ALL_PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

// 都道府県プールから、除外集合に無いものをn件選ぶ
export function sameCategoryPoolPrefectures(exclude, n, rng) {
  const pool = ALL_PREFECTURES.filter((p) => !exclude.has(p));
  return pickN(pool, n, rng);
}

// 値プールから、除外集合に無いものをn件選ぶ（汎用版）
// pool には同名異県の自治体（「南部町」が山梨・静岡・和歌山に3件等）のように
// 同値が複数含まれ得る。ユニーク化せずに pickN（shuffle+slice）に渡すと
// 同じ名前が2回選ばれ、4択が実質3択になる不具合があった（issue #2）。
// そのため先に pool をユニーク化してから除外・抽出する。
export function sameCategoryPool(pool, exclude, n, rng) {
  const filtered = [...new Set(pool)].filter((v) => !exclude.has(v));
  return pickN(filtered, n, rng);
}

// 読みクイズ用の誤答戦略。「東村」の正解が「ひがしそん」なのに、誤答が「さがみはらし」
// 「みのぶちょう」のような全然関係ない読みだと、消去法で一発で分かってしまい難読クイズとして
// 機能しない、とユーザーから指摘があった（実例）。
// 対策1: 末尾の行政区分（市/町/村/区）が同じ読みだけを誤答プールに絞る（村の問題には村の読みだけ）。
// 対策2: 「町」は「まち/ちょう」、「村」は「むら/そん」で読みが割れる。正解と同じ表記で
//   別の読み方をでっち上げた「引っ掛け」を1つ混ぜる（例: ひがしそん → ひがしむら）。
const SUFFIX_KANJI_CLASS = [
  { suffix: "市", readings: ["し"] },
  { suffix: "区", readings: ["く"] },
  { suffix: "町", readings: ["ちょう", "まち"] },
  { suffix: "村", readings: ["そん", "むら"] },
];

function classify(name) {
  return SUFFIX_KANJI_CLASS.find((c) => name.endsWith(c.suffix)) ?? null;
}

// 正解の kana が持つ末尾読み（ちょう/まち/そん/むら）を、同クラスの別の読みに挿げ替えた誤答。
// 例: name="東村", kana="ひがしそん" → cls=村(そん/むら) → "ひがしむら" を返す。生成できなければnull。
function swapSuffixReading(name, kana) {
  const cls = classify(name);
  if (!cls || cls.readings.length < 2) return null;
  const matched = cls.readings.find((r) => kana.endsWith(r));
  if (!matched) return null;
  const alt = cls.readings.find((r) => r !== matched);
  return kana.slice(0, -matched.length) + alt;
}

// name/kana のペア配列から、正解と同じ行政区分（市/町/村/区）の読みだけに絞ったプールを作る。
// 同クラスの候補が少なすぎる場合は全体プールにフォールバックする。
export function readingConfusion(correctName, correctKana, pool, n, rng) {
  const cls = classify(correctName);
  const samClassPool = cls ? pool.filter(({ name }) => name.endsWith(cls.suffix)).map((p) => p.kana) : [];
  const basePool = samClassPool.length >= n ? samClassPool : pool.map((p) => p.kana);

  const swapped = swapSuffixReading(correctName, correctKana);
  const rest = pickN(
    basePool.filter((k) => k !== correctKana && k !== swapped),
    swapped ? n - 1 : n,
    rng
  );
  return swapped ? [swapped, ...rest] : rest;
}
