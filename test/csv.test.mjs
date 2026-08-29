import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseCsvObjects } from "../lib/csv.mjs";

test("parseCsv: 空文字列は空配列（異常系）", () => {
  assert.deepEqual(parseCsv(""), []);
});

test("parseCsv: 改行無しの単一行を正しくパースする（末尾改行無し拾い）", () => {
  assert.deepEqual(parseCsv("a,b,c"), [["a", "b", "c"]]);
});

test("parseCsv: クオート内の改行を1フィールドとして扱う（RFC4180）", () => {
  assert.deepEqual(parseCsv('"x\ny",b'), [["x\ny", "b"]]);
});

test("parseCsv: クオート内のエスケープクオート（\"\"）を1個の\"に戻す", () => {
  assert.deepEqual(parseCsv('"a""b",c'), [['a"b', "c"]]);
});

test("parseCsv: CRLF改行をLF相当で行分割する（\\rは無視）", () => {
  assert.deepEqual(parseCsv("a,b\r\nc,d"), [["a", "b"], ["c", "d"]]);
});

test("parseCsv: 末尾改行がある場合に空行を生成しない", () => {
  assert.deepEqual(parseCsv("a,b\n"), [["a", "b"]]);
});

test("parseCsv: 空クオートフィールドを空文字として保持する", () => {
  assert.deepEqual(parseCsv('"",b'), [["", "b"]]);
});

test("parseCsv: 1行目が空行のみのファイルは空配列（空行フィルタ）", () => {
  assert.deepEqual(parseCsv("\n\n"), []);
});

test("parseCsvObjects: ヘッダより本体行が短い場合、欠損列は空文字で埋める（異常系）", () => {
  const out = parseCsvObjects("h1,h2\nv1");
  assert.deepEqual(out, [{ h1: "v1", h2: "" }]);
});

test("parseCsvObjects: ヘッダより本体行が長い場合、余剰列は無視される", () => {
  const out = parseCsvObjects("h1\nv1,v2");
  assert.deepEqual(out, [{ h1: "v1" }]);
});
