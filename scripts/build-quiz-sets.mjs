#!/usr/bin/env node
// data/municipality-changes.json / data/lore-entries.json から
// data/quiz/*.json に設問セットを機械生成する。docs/question-patterns.md 参照。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as sameName from "./question-types/same-name.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const QUIZ_DIR = path.join(DATA_DIR, "quiz");

const { municipalities } = JSON.parse(readFileSync(path.join(DATA_DIR, "municipality-master.json"), "utf8"));

mkdirSync(QUIZ_DIR, { recursive: true });

const sameNameQuestions = sameName.generate(municipalities, "same-name-v1");
writeFileSync(
  path.join(QUIZ_DIR, "same-name.json"),
  JSON.stringify({ type: "same-name", count: sameNameQuestions.length, questions: sameNameQuestions }, null, 2) + "\n"
);
console.log(`quiz/same-name.json: ${sameNameQuestions.length}問`);

// TODO: timeline-reason / vanished / portmanteau / reading / lore-trivia / city-fact
