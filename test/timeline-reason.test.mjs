import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generate } from "../scripts/question-types/timeline-reason.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 誤答プールは「現存自治体名」。どのテストでも正解と衝突しない適当な名前を十分な数だけ用意する。
const CURRENT = ["A市", "B市", "C町", "D村", "E市", "F町", "G村", "H市"].map((name) => ({
  name,
  prefecture: "テスト県",
}));

function changeRow(reason, { effectiveDate = "2005-10-11", prefecture = "北海道" } = {}) {
  return { effectiveDate, prefecture, reason };
}

function gen(rows, seed = "test-seed") {
  return generate(rows, CURRENT, seed);
}

test("merge: 正解名を含む旧自治体が無ければ従来どおり「が合併して誕生したのは？」のまま（正常系）", () => {
  const qs = gen([changeRow("田無市(132012)、保谷市(132021)が合併し、西東京市(132292)を新設")]);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].prompt, "田無市・保谷市が合併して誕生したのは？");
  assert.equal(qs[0].answer, "西東京市");
});

test("merge: 正解と同名の旧自治体は問題文から外し「と合併して誕生したのは？」になる（issue #20）", () => {
  const qs = gen([changeRow("釧路市(012068)、阿寒町(016586)、音別町(016594)が合併し、釧路市(012068)を新設")]);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].prompt, "阿寒町・音別町と合併して誕生したのは？");
  assert.equal(qs[0].answer, "釧路市");
  assert.ok(!qs[0].prompt.includes("釧路市"));
});

test("merge: 隠した後に残る旧自治体が1件でも出題される（境界値）", () => {
  const qs = gen([changeRow("士別市(012135)、朝日町(014516)が合併し、士別市(012135)を新設")]);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].prompt, "朝日町と合併して誕生したのは？");
  assert.equal(qs[0].answer, "士別市");
});

test("merge: 完全一致でなく部分文字列として正解を含む旧自治体も外す（上那賀町→那賀町、境界値）", () => {
  const qs = gen([
    changeRow("鷲敷町(363812)、相生町(363821)、上那賀町(363839)、木沢村(363847)、木頭村(363855)が合併し、那賀町(363685)を新設"),
  ]);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].prompt, "鷲敷町・相生町・木沢村・木頭村と合併して誕生したのは？");
  assert.ok(!qs[0].prompt.includes("上那賀町"));
  assert.ok(!qs[0].prompt.includes(qs[0].answer));
});

test("merge: 全ての旧自治体名が正解を含む場合は出題しない（失敗系）", () => {
  const yubetsu = gen([changeRow("上湧別町(015555)、湧別町(015563)が合併し、湧別町(015598)を新設")]);
  assert.equal(yubetsu.length, 0);
  const arita = gen([changeRow("有田町(414018)、西有田町(413844)が合併し、有田町(414018)を新設")]);
  assert.equal(arita.length, 0);
});

test("absorb: 編入の問題文は変更しない（正常系・回帰）", () => {
  const qs = gen([changeRow("亀田市(012041)が函館市(012025)に編入")]);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].prompt, "「亀田市」が編入されたのはどこ？");
  assert.equal(qs[0].answer, "函館市");
});

test("olds が空・新自治体名が無いイベントはスキップする（異常系）", () => {
  assert.equal(gen([changeRow("")]).length, 0);
  assert.equal(gen([changeRow("郡の区域変更")]).length, 0);
  assert.equal(gen([{ effectiveDate: "2005-10-11", prefecture: "北海道", reason: null }]).length, 0);
});

test("隠した旧自治体名も誤答の除外集合に残す（表示していない名前が選択肢に出ない）", () => {
  const qs = gen([changeRow("釧路市(012068)、阿寒町(016586)、音別町(016594)が合併し、釧路市(012068)を新設")]);
  for (const name of ["阿寒町", "音別町"]) {
    assert.ok(!qs[0].choices.includes(name), `${name} が選択肢に混入している`);
  }
  assert.ok(qs[0].choices.includes("釧路市"));
  assert.equal(new Set(qs[0].choices).size, 4);
});

test("同じseedなら同じ結果になる（決定論）", () => {
  const rows = [
    changeRow("釧路市(012068)、阿寒町(016586)、音別町(016594)が合併し、釧路市(012068)を新設"),
    changeRow("田無市(132012)、保谷市(132021)が合併し、西東京市(132292)を新設", { effectiveDate: "2001-01-21" }),
  ];
  assert.deepEqual(gen(rows, "same"), gen(rows, "same"));
});

test("不変条件: 実データから生成した全設問で prompt に answer が含まれない", () => {
  const dataDir = path.join(__dirname, "..", "data");
  const { changes } = JSON.parse(readFileSync(path.join(dataDir, "municipality-changes.json"), "utf8"));
  const { municipalities } = JSON.parse(readFileSync(path.join(dataDir, "municipality-master.json"), "utf8"));
  const qs = generate(changes, municipalities, "timeline-reason");

  const leaked = qs.filter((q) => q.prompt.includes(q.answer));
  assert.deepEqual(
    leaked.map((q) => q.id),
    [],
    `正解が問題文に露出している設問が残っている: ${leaked.length}件`
  );
  // 修正前は741問中189問が露出していた。出題不能な2件だけ減って739問になる。
  assert.equal(qs.length, 739);
  assert.equal(qs.filter((q) => q.id.startsWith("timeline-absorb-")).length, 257);
});
