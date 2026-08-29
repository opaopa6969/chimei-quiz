#!/usr/bin/env node
// Wikidata SPARQLから日本の基礎自治体一覧（地方公共団体コード P429 を持つアイテム）を取得し、
// data/municipality-master.json に保存する。
//
// P429（地方公共団体コード）は市区町村・東京都特別区には付くが、政令市の行政区（中央区等）には
// 付かない — これで「区」ノイズを自然に除外できる（同名地名クイズの問題1の対策）。
// また一度も廃置分合していない安定した市（府中市等）もWikidataには載っているので問題2も解決する。
//
// CC0（Wikidataのライセンス）なので機械的にそのまま使ってよい。出典として明記はする。
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "municipality-master.json");

const SPARQL = `
SELECT ?item ?itemLabel ?code ?population ?areaAmount ?areaUnit ?prefLabel WHERE {
  ?item wdt:P429 ?code.
  # 政令指定都市の行政区（Q137773「日本の区」）は除外。東京都特別区（Q5327704）は自治体として残す。
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q137773 }
  # 支庁・振興局（Q850450、北海道の広域行政機関。基礎自治体ではない）も除外。
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q850450 }
  OPTIONAL { ?item wdt:P1082 ?population. }
  # 面積は単位（km²/m²等）がアイテムによって不統一なので、量とその単位を別々に取得して
  # JS側で正規化する。単純に wdt:P2046 で数値だけ取ると、m²で入力された値がkm²扱いになる
  # 単位バグが発生する（実際に早川町等41件で発覚した。詳細はfixupArea参照）。
  OPTIONAL {
    ?item p:P2046 ?areaStmt.
    ?areaStmt psv:P2046 ?areaNode.
    ?areaNode wikibase:quantityAmount ?areaAmount.
    ?areaNode wikibase:quantityUnit ?areaUnit.
  }
  # 都道府県(Q50337)まで1ホップ（市の場合）/ 2ホップ（町村→郡→都道府県の場合）で辿る
  OPTIONAL {
    { ?item wdt:P131 ?pref. ?pref wdt:P31 wd:Q50337. }
    UNION
    { ?item wdt:P131/wdt:P131 ?pref. ?pref wdt:P31 wd:Q50337. }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
}
`;

// Wikidataの単位QID → km²への倍率
const AREA_UNIT_TO_KM2 = {
  "http://www.wikidata.org/entity/Q712226": 1, // square kilometre
  "http://www.wikidata.org/entity/Q25343": 1e-6, // square metre
  "http://www.wikidata.org/entity/Q35852": 0.01, // hectare
};

function normalizeAreaKm2(amount, unitUri) {
  if (amount == null) return null;
  const value = Number(amount);
  if (!unitUri) return value; // 単位不明はそのまま（従来通り）
  const factor = AREA_UNIT_TO_KM2[unitUri];
  if (factor == null) {
    console.warn(`[fetch-wikidata-municipalities] 未知の面積単位: ${unitUri} (amount=${amount})`);
    return value;
  }
  return value * factor;
}

// 全国地方公共団体コードの先頭2桁 → 都道府県。北海道は振興局を挟んで3ホップ必要なケースがあり
// SPARQL側のprefLabel取得が一部抜けるので、コード先頭2桁からの補完で確実に埋める。
const PREF_BY_CODE_PREFIX = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];
const ALL_PREFECTURE_NAMES = new Set(PREF_BY_CODE_PREFIX);

const url = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(SPARQL) + "&format=json";

const res = await fetch(url, {
  headers: {
    "User-Agent": "chimei-quiz/0.1 (https://github.com/opaopa6969/chimei-quiz; data build script)",
    Accept: "application/sparql-results+json",
  },
});
if (!res.ok) {
  console.error(`Wikidata query failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const json = await res.json();

// 同じ地方公共団体コードが複数バインディングになることがある（?pref が複数解決する等）ので
// codeをキーに最初の1件だけ採用する。
const byCode = new Map();
for (const b of json.results.bindings) {
  const code = b.code?.value;
  if (!code || byCode.has(code)) continue;
  byCode.set(code, {
    code,
    name: b.itemLabel?.value ?? "",
    prefecture: b.prefLabel?.value ?? "",
    population: b.population ? Number(b.population.value) : null,
    areaKm2: normalizeAreaKm2(b.areaAmount?.value, b.areaUnit?.value),
    wikidataId: b.item?.value?.split("/").pop() ?? null,
  });
}

const municipalitiesWithPref = [...byCode.values()]
  .map((m) => {
    if (m.prefecture) return m;
    const idx = Number(m.code.slice(0, 2)) - 1;
    return { ...m, prefecture: PREF_BY_CODE_PREFIX[idx] ?? "" };
  })
  // 都道府県自体のレコード（P429を持つ都道府県アイテムが紛れ込む。名前が都道府県名そのもの）は除外
  .filter((m) => !ALL_PREFECTURE_NAMES.has(m.name));

// name|prefecture 単位で重複するレコードを1件に絞る（issue #11）。
// 例: 「泊村|北海道」が古宇郡泊村(014036)と積丹郡泊村(016969)で2件残る。
// どちらも P429 を持つ別の Wikidata アイテムだが、自治体名としては同一表記なので
// クイズデータとしては1件にしないと city-fact 等で同名が4択に2回並ぶ。
// 優先順位: (1) population/areaKm2 が揃っている方 (2) 人口が大きい方 (3) code 昇順
const score = (x) =>
  (x.population != null ? 1 : 0) +
  (x.areaKm2 != null ? 1 : 0) +
  (x.population ?? 0) / 1e8;
const byNamePref = new Map();
for (const m of municipalitiesWithPref) {
  const key = `${m.name}|${m.prefecture}`;
  const prev = byNamePref.get(key);
  if (!prev) {
    byNamePref.set(key, m);
    continue;
  }
  const keep = score(m) > score(prev) ? m : prev;
  const drop = keep === prev ? m : prev;
  console.warn(
    `[fetch-wikidata-municipalities] name|prefecture 重複を解消: ${key} で ${drop.code}(${drop.wikidataId}) を捨てて ${keep.code}(${keep.wikidataId}) を採用`
  );
  byNamePref.set(key, keep);
}

const municipalities = [...byNamePref.values()].sort((a, b) => a.code.localeCompare(b.code));

writeFileSync(
  OUT_PATH,
  JSON.stringify(
    {
      source: "Wikidata SPARQL (P429 地方公共団体コード, CC0)",
      fetchedVia: "query.wikidata.org/sparql",
      count: municipalities.length,
      municipalities,
    },
    null,
    2
  ) + "\n"
);
console.log(`municipality-master.json: ${municipalities.length}件 -> ${OUT_PATH}`);
