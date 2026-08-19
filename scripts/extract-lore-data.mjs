#!/usr/bin/env node
// address-lore の catalog/index.json から、クイズのネタになりそうなエントリを
// data/lore-entries.json に書き出す。parser-token/normalization-rule のような
// 機械利用専用エントリ（機械可読な正規表現・区切り語彙）はクイズには向かないので除外せず残しつつ、
// quizFriendly フラグで区別する（生成側は quizFriendly=true だけを使う）。
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "lore-entries.json");

const CANDIDATES = [
  process.env.ADDRESS_LORE_INDEX,
  path.join(process.env.HOME ?? "", "work/adoyose-workspace/address-lore/catalog/index.json"),
].filter(Boolean);

const srcPath = CANDIDATES.find((p) => existsSync(p));
if (!srcPath) {
  console.error(
    "address-lore/catalog/index.json が見つかりません。ADDRESS_LORE_INDEX で明示するか、\n" +
    "~/work/adoyose-workspace/address-lore を clone してください。\n" +
    "候補: " + CANDIDATES.join(", ")
  );
  process.exit(1);
}

const idx = JSON.parse(readFileSync(srcPath, "utf8"));
const rawEntries = idx.entries ?? idx;

// クイズ向き: 人間向けの雑学・地誌プロファイル・座標系系（機械可読な正規表現ルールそのものは除く）
const QUIZ_FRIENDLY_CATEGORIES = new Set(["region-profile", "coordinate-system", "historical-reference"]);

const entries = rawEntries.map((e) => ({
  id: e.id,
  term: e.term,
  category: e.category,
  usage: e.usage,
  region: e.region ?? null,
  hierarchy_level: e.hierarchy_level ?? null,
  datatype: e.datatype,
  payload: e.payload,
  source: e.source ?? null,
  confidence: e.confidence ?? null,
  tags: e.tags ?? [],
  excerpt: e.excerpt ?? "",
  quizFriendly: e.usage !== "machine" && QUIZ_FRIENDLY_CATEGORIES.has(e.category),
}));

const quizFriendlyCount = entries.filter((e) => e.quizFriendly).length;

writeFileSync(
  OUT_PATH,
  JSON.stringify(
    { source: "address-lore (今尾恵介『番地の謎』+ パーサ設計知見)", count: entries.length, quizFriendlyCount, entries },
    null,
    2
  ) + "\n"
);

console.log(`lore-entries.json: ${entries.length}件（うちクイズ向き ${quizFriendlyCount}件） -> ${OUT_PATH}`);
