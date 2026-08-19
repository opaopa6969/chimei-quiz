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
export function sameCategoryPool(pool, exclude, n, rng) {
  const filtered = pool.filter((v) => !exclude.has(v));
  return pickN(filtered, n, rng);
}
