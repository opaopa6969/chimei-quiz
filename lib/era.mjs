// 西暦→和暦（元号）の簡易変換。市町村変遷の年代感（「平成の大合併」等）を
// triviaで伝えるためのもの。厳密な改元日（1月・7月中の切り替わり等）は無視し、
// 年単位の近似で十分とする。
const ERAS = [
  { name: "令和", start: 2019 },
  { name: "平成", start: 1989 },
  { name: "昭和", start: 1926 },
  { name: "大正", start: 1912 },
  { name: "明治", start: 1868 },
];

export function toEraLabel(dateStr) {
  const year = Number(dateStr.slice(0, 4));
  if (!Number.isFinite(year)) return "";
  const era = ERAS.find((e) => year >= e.start);
  if (!era) return `${year}年`;
  const eraYear = year - era.start + 1;
  const eraYearLabel = eraYear === 1 ? "元" : eraYear;
  return `${era.name}${eraYearLabel}年（${year}年）`;
}

export function isHeiseiMerger(dateStr) {
  const year = Number(dateStr.slice(0, 4));
  return year >= 2003 && year <= 2010; // 「平成の大合併」の主要期間
}
