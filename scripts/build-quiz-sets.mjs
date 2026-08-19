#!/usr/bin/env node
// data/municipality-changes.json / data/municipality-master.json / data/lore-entries.json から
// data/quiz/*.json に設問セットを機械生成する。docs/question-patterns.md 参照。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as sameName from "./question-types/same-name.mjs";
import * as vanished from "./question-types/vanished.mjs";
import * as timelineReason from "./question-types/timeline-reason.mjs";
import * as portmanteau from "./question-types/portmanteau.mjs";
import * as reading from "./question-types/reading.mjs";
import * as cityFact from "./question-types/city-fact.mjs";
import * as loreTrivia from "./question-types/lore-trivia.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
// 生成した設問セットは実行時にfetchするので public/ 配下に置く（バンドルに埋め込まない）。
const QUIZ_DIR = path.join(__dirname, "..", "public", "data", "quiz");

const { changes } = JSON.parse(readFileSync(path.join(DATA_DIR, "municipality-changes.json"), "utf8"));
const { municipalities } = JSON.parse(readFileSync(path.join(DATA_DIR, "municipality-master.json"), "utf8"));
const { entries: loreEntries } = JSON.parse(readFileSync(path.join(DATA_DIR, "lore-entries.json"), "utf8"));

mkdirSync(QUIZ_DIR, { recursive: true });

const SETS = {
  "same-name": sameName.generate(municipalities, "same-name-v1"),
  vanished: vanished.generate(changes, municipalities, "vanished-v1"),
  "timeline-reason": timelineReason.generate(changes, municipalities, "timeline-reason-v1"),
  portmanteau: portmanteau.generate(changes, "portmanteau-v1"),
  reading: reading.generate(changes, municipalities, "reading-v1"),
  "city-fact": cityFact.generate(municipalities, "city-fact-v1"),
  "lore-trivia": loreTrivia.generate(loreEntries, "lore-trivia-v1"),
};

let total = 0;
for (const [name, questions] of Object.entries(SETS)) {
  writeFileSync(
    path.join(QUIZ_DIR, `${name}.json`),
    JSON.stringify({ type: name, count: questions.length, questions }, null, 2) + "\n"
  );
  console.log(`quiz/${name}.json: ${questions.length}問`);
  total += questions.length;
}

// 全設問セットをまとめた索引（ミックス出題・デイリークイズのseed選抜に使う）
const allQuestions = Object.values(SETS).flat();
writeFileSync(
  path.join(QUIZ_DIR, "all.json"),
  JSON.stringify({ count: allQuestions.length, questions: allQuestions }, null, 2) + "\n"
);
console.log(`合計: ${total}問`);
