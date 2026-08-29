import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReasonLine, collectEvents, parseReason } from "../lib/reason-parser.mjs";

test("parseReasonLine: 合併イベントを抽出できる", () => {
  const line = "花巻市(03205)、大迫町(03341)、石鳥谷町(03342)、東和町(03361)が合併し、花巻市を新設";
  const [ev] = parseReasonLine(line);
  assert.equal(ev.kind, "merge");
  assert.deepEqual(
    ev.olds.map((o) => o.name),
    ["花巻市", "大迫町", "石鳥谷町", "東和町"]
  );
  assert.equal(ev.new.name, "花巻市");
});

test("parseReasonLine: 編入イベントを抽出できる（郡は対象外）", () => {
  const line = "亀田市(01232)が函館市(01202)に編入";
  const [ev] = parseReasonLine(line);
  assert.equal(ev.kind, "absorb");
  assert.equal(ev.olds[0].name, "亀田市");
  assert.equal(ev.new.name, "函館市");

  assert.deepEqual(parseReasonLine("稗貫郡(03340)の廃止"), []);
});

test("parseReasonLine: 市制施行イベントを抽出できる", () => {
  const line = "登別町(01577)が登別市(01230)に市制施行";
  const [ev] = parseReasonLine(line);
  assert.equal(ev.kind, "seido");
  assert.equal(ev.olds[0].name, "登別町");
  assert.equal(ev.new.name, "登別市");
});

test("collectEvents: 同一イベントが複数CSV行に重複記載されても1件に重複除去される", () => {
  const raw = "戸井町(01339)、恵山町(01340)が函館市(01202)に編入";
  const changes = [
    { effectiveDate: "2004-12-01", prefecture: "北海道", reason: raw },
    { effectiveDate: "2004-12-01", prefecture: "北海道", reason: raw }, // 対象町村側の行として重複記載される想定
  ];
  const events = collectEvents(changes);
  assert.equal(events.length, 1);
});

test("parseReason: CRLF（\\r\\n）改行が含まれていても各行の\\rが除去され正しくパースされる", () => {
  const reason = "花巻市(03205)、大迫町(03341)が合併し、花巻市を新設\r\n登別町(01577)が登別市(01230)に市制施行";
  const events = parseReason(reason);
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, "merge");
  assert.equal(events[1].kind, "seido");
});
