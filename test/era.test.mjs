import { test } from "node:test";
import assert from "node:assert/strict";
import { toEraLabel, isHeiseiMerger } from "../lib/era.mjs";

test("toEraLabel: 令和元年（2019）の境界", () => {
  assert.equal(toEraLabel("2019-01-01"), "令和元年（2019年）");
  assert.equal(toEraLabel("2019-05-01"), "令和元年（2019年）");
  assert.equal(toEraLabel("2020-01-01"), "令和2年（2020年）");
});

test("toEraLabel: 平成元年（1989）の境界", () => {
  assert.equal(toEraLabel("1989-01-08"), "平成元年（1989年）");
  assert.equal(toEraLabel("1990-01-01"), "平成2年（1990年）");
  // 1988年は昭和
  assert.ok(toEraLabel("1988-12-31").startsWith("昭和"));
});

test("toEraLabel: 明治元年（1868）の境界", () => {
  assert.equal(toEraLabel("1868-01-01"), "明治元年（1868年）");
  // 1867年は元号リスト外 → 西暦そのまま
  assert.equal(toEraLabel("1867-01-01"), "1867年");
});

test("toEraLabel: 数値で無効な日付文字列は空文字を返す（異常系）", () => {
  assert.equal(toEraLabel("xxxx"), "");
  assert.equal(toEraLabel("abcd"), "");
});

test("isHeiseiMerger: 平成の大合併期間（2003-2010）の境界値", () => {
  assert.equal(isHeiseiMerger("2002-12-31"), false);
  assert.equal(isHeiseiMerger("2003-01-01"), true);
  assert.equal(isHeiseiMerger("2010-12-31"), true);
  assert.equal(isHeiseiMerger("2011-01-01"), false);
});

test("isHeiseiMerger: 期間内の代表年", () => {
  assert.equal(isHeiseiMerger("2005-04-01"), true);
  assert.equal(isHeiseiMerger("2008-10-01"), true);
});
