#!/usr/bin/env node
// municipality-history (e-Stat由来, 廃置分合等) の estat-haichi.csv を
// data/municipality-changes.json に構造化して書き出す。
//
// ソースrepoは本repoの外（別途 clone した municipality-history）にあるので、
// 環境変数か既定の候補パスから見つける。無ければエラーで教える。
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseCsvObjects } from "../lib/csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "municipality-changes.json");

const CANDIDATES = [
  process.env.MUNICIPALITY_HISTORY_CSV,
  path.join(process.env.HOME ?? "", "work/adoyose-workspace/municipality-history/data/estat-haichi.csv"),
].filter(Boolean);

const srcPath = CANDIDATES.find((p) => existsSync(p));
if (!srcPath) {
  console.error(
    "estat-haichi.csv が見つかりません。MUNICIPALITY_HISTORY_CSV で明示するか、\n" +
    "~/work/adoyose-workspace/municipality-history を clone してください。\n" +
    "候補: " + CANDIDATES.join(", ")
  );
  process.exit(1);
}

const raw = readFileSync(srcPath, "utf8");
const rows = parseCsvObjects(raw);

const changes = rows.map((r, idx) => ({
  code: r["標準地域コード"],
  prefecture: r["都道府県"],
  district: r["政令市・郡・支庁・振興局等"],
  districtKana: r["政令市・郡・支庁・振興局等（ふりがな）"],
  municipality: r["市区町村"],
  municipalityKana: r["市区町村（ふりがな）"],
  effectiveDate: r["廃置分合等施行年月日"],
  reason: r["改正事由"],
  // 表示名: district と municipality のうち埋まっている方を優先（郡・支庁行は district のみのことが多い）
  name: r["市区町村"] || r["政令市・郡・支庁・振興局等"],
  nameKana: r["市区町村（ふりがな）"] || r["政令市・郡・支庁・振興局等（ふりがな）"],
  _row: idx,
}));

writeFileSync(
  OUT_PATH,
  JSON.stringify({ source: "e-Stat 廃置分合等一覧 (municipality-history)", srcFile: path.basename(srcPath), count: changes.length, changes }, null, 2) + "\n"
);

console.log(`municipality-changes.json: ${changes.length}件 -> ${OUT_PATH}`);
