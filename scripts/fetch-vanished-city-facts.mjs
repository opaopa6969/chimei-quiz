#!/usr/bin/env node
// vanished（消えた市町村）のうち「市」だった約50件について、Wikipedia REST APIの
// page/summary から「何で有名だったか・どんな街だったか」の概要を取得する。
// 1543件全部（町村まで含む）はWikipediaへの配慮上クロールしない —
// まず規模の大きい「市」だけに絞る（docs/question-patterns.md参照）。
//
// vanished.mjsのfindVanishedを直接呼んでリストを作る（public/data/quiz/vanished.jsonを
// 経由すると「build-quiz-sets.mjsが先に必要→そのvanished.jsonがこのfactsを必要とする」
// という循環になるため）。
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { findVanished } from "./question-types/vanished.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "vanished-city-facts.json");
const DATA_DIR = path.join(__dirname, "..", "data");

const { changes } = JSON.parse(readFileSync(path.join(DATA_DIR, "municipality-changes.json"), "utf8"));
const { municipalities } = JSON.parse(readFileSync(path.join(DATA_DIR, "municipality-master.json"), "utf8"));
const currentKeys = new Set(municipalities.map((m) => `${m.name}|${m.prefecture}`));
const vanished = findVanished(changes, currentKeys);

const cities = [];
const seen = new Set();
for (const v of vanished) {
  if (!v.name.endsWith("市")) continue;
  const key = `${v.name}|${v.prefecture}`;
  if (seen.has(key)) continue;
  seen.add(key);
  cities.push({ name: v.name, prefecture: v.prefecture });
}

async function fetchSummary(title) {
  const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "chimei-quiz/0.1 (https://github.com/opaopa6969/chimei-quiz; data build script)" },
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.type === "disambiguation") return null;
  return json;
}

const facts = [];
for (const c of cities) {
  let summary = await fetchSummary(c.name);
  if (!summary?.extract) summary = await fetchSummary(`${c.name} (${c.prefecture})`);
  if (!summary?.extract) {
    console.warn(`[fetch-vanished-city-facts] 見つからず（スキップ）: ${c.name}（${c.prefecture}）`);
    continue;
  }
  facts.push({ name: c.name, prefecture: c.prefecture, extract: summary.extract });
  console.log(`OK ${c.name}: ${summary.extract.slice(0, 40)}...`);
  await new Promise((r) => setTimeout(r, 120)); // Wikipediaへの負荷に配慮
}

writeFileSync(
  OUT_PATH,
  JSON.stringify(
    { source: "Wikipedia REST API (page/summary)", fetchedAt: "build-time", count: facts.length, facts },
    null,
    2
  ) + "\n"
);
console.log(`vanished-city-facts.json: ${facts.length}/${cities.length}件 -> ${OUT_PATH}`);
