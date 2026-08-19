#!/usr/bin/env node
// 日本郵便の公式郵便番号データ（utf_ken_all.csv、町丁目レベルの正式読み仮名）から、
// district-reading-list.mjs のキュレーションリストにマッチする行だけを抽出し、
// data/district-readings.json に保存する。
//
// 12万行超の全国データをそのままrepoにコミットするのは重すぎるので、
// キュレーションリストで既に選んだ町丁目名の読み仮名照合・実在確認にだけ使う
// （municipality-master同様、「正しい読みの出典」として公式データを優先する設計）。
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../lib/csv.mjs";
import { CURATED_DISTRICT_READINGS } from "./question-types/district-reading-list.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "district-readings.json");
const URL = "https://www.post.japanpost.jp/service/search/zipcode/download/utf/zip/utf_ken_all.zip";

function kataToHira(str) {
  return str.replace(/[ァ-ヶ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0x60));
}

const tmpDir = mkdtempSync(path.join(tmpdir(), "ken-all-"));
try {
  const res = await fetch(URL);
  if (!res.ok) {
    console.error(`ダウンロード失敗: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const zipPath = path.join(tmpDir, "utf_ken_all.zip");
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", tmpDir]);

  const csvPath = path.join(tmpDir, "utf_ken_all.csv");
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  // 列: 0=全国地方公共団体コード,1=旧郵便番号,2=郵便番号,3=都道府県カナ,4=市区町村カナ,
  //     5=町域カナ,6=都道府県,7=市区町村,8=町域, 9-14=各種フラグ
  const byNameCity = new Map();
  for (const r of rows) {
    const [, , , , , townKana, , city, town] = r;
    if (!town || !city) continue;
    byNameCity.set(`${town}|${city}`, townKana);
  }

  const matched = [];
  for (const w of CURATED_DISTRICT_READINGS) {
    const townKana = byNameCity.get(`${w.name}|${w.city}`);
    if (!townKana) {
      console.warn(`[fetch-postal-towns] 見つからず（スキップ）: ${w.name}（${w.city}）`);
      continue;
    }
    matched.push({
      officialName: w.name,
      popularName: w.popularName ?? null,
      prefecture: w.prefecture,
      city: w.city,
      kana: kataToHira(townKana),
      trivia: w.trivia ?? "",
    });
  }

  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        source: "日本郵便 郵便番号データ (utf_ken_all.csv)",
        fetchedFrom: URL,
        count: matched.length,
        districts: matched,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`district-readings.json: ${matched.length}/${CURATED_DISTRICT_READINGS.length}件 -> ${OUT_PATH}`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
