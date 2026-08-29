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

test("parseReasonLine: 空文字列はイベントを返さない（異常系）", () => {
  assert.deepEqual(parseReasonLine(""), []);
});

test("parseReasonLine: 郡の廃止は対象外で空配列（郡除外分岐の回帰）", () => {
  assert.deepEqual(parseReasonLine("稗貫郡(03340)の廃止"), []);
  // 「郡」文字を含む編入は対象外
  assert.deepEqual(parseReasonLine("A郡(01234)がB市(05678)に編入"), []);
});

test("parseReasonLine: 複数自治体が1市に編入されるケースでoldsが全件抽出される（回帰）", () => {
  const line = "戸井町(01339)、恵山町(01340)、椴法華村(01341)、南茅部町(01342)が函館市(01202)に編入";
  const [ev] = parseReasonLine(line);
  assert.equal(ev.kind, "absorb");
  assert.deepEqual(
    ev.olds.map((o) => o.name),
    ["戸井町", "恵山町", "椴法華村", "南茅部町"]
  );
  assert.equal(ev.new.name, "函館市");
});

test("parseReason: null/undefinedは空配列（異常系）", () => {
  assert.deepEqual(parseReason(null), []);
  assert.deepEqual(parseReason(undefined), []);
});

test("parseReason: 改行無し1行も1イベントとして抽出する", () => {
  const events = parseReason("登別町(01577)が登別市(01230)に市制施行");
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, "seido");
});

test("collectEvents: 異なる施行日なら同じrawでも別イベントとして保持する（重複除去キーの回帰）", () => {
  const raw = "A町(01234)がB市(05678)に編入";
  const changes = [
    { effectiveDate: "2004-12-01", prefecture: "北海道", reason: raw },
    { effectiveDate: "2005-12-01", prefecture: "北海道", reason: raw },
  ];
  const events = collectEvents(changes);
  assert.equal(events.length, 2);
  assert.equal(events[0].effectiveDate, "2004-12-01");
  assert.equal(events[1].effectiveDate, "2005-12-01");
});
