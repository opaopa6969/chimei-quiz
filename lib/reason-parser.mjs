// municipality-history の「改正事由」テキストからイベントを抽出する共通パーサ。
// reasonは複数行（\n区切り）で複数イベントが並記されることがある（例:「Xが合併しYを新設\n郡の廃止」）。
// 全パターンを網羅はしないが、主要な3パターンをカバーする。
const NAME_CODE_RE = /([^、\(\)]+)\((\d{4,6})\)/g;

function namesIn(text) {
  return [...text.matchAll(NAME_CODE_RE)].map((m) => ({ name: m[1], code: m[2] }));
}

// 1行から複数のイベントを抽出する。イベントは { kind, olds: [{name,code}], new: {name,code} } の形。
export function parseReasonLine(line) {
  const events = [];

  // 「A(code)、B(code)、C(code)が合併し、D(code)を新設」
  const mergeMatch = line.match(/^(.+?)が合併し、([^、]+?)を新設$/);
  if (mergeMatch) {
    const olds = namesIn(mergeMatch[1]);
    const newOnes = namesIn(mergeMatch[2]);
    const newName = newOnes[0] ?? { name: mergeMatch[2].replace(/\(\d+\)/, ""), code: null };
    events.push({ kind: "merge", olds, new: newName, raw: line });
    return events;
  }

  // 「A(code)、B(code)がC(code)に編入」（郡の編入は対象外、市区町村名のみ）
  const absorbMatch = line.match(/^(.+?)が([^、]+?)に編入$/);
  if (absorbMatch && !line.includes("郡")) {
    const olds = namesIn(absorbMatch[1]);
    const newOnes = namesIn(absorbMatch[2]);
    const target = newOnes[0] ?? { name: absorbMatch[2].replace(/\(\d+\)/, ""), code: null };
    events.push({ kind: "absorb", olds, new: target, raw: line });
    return events;
  }

  // 「A(code)がB(code)に市制施行／町制施行」
  const seidoMatch = line.match(/^(.+?)が([^、]+?)に(市制|町制)施行$/);
  if (seidoMatch) {
    const olds = namesIn(seidoMatch[1]);
    const newOnes = namesIn(seidoMatch[2]);
    const target = newOnes[0] ?? { name: seidoMatch[2].replace(/\(\d+\)/, ""), code: null };
    events.push({ kind: "seido", olds, new: target, raw: line });
    return events;
  }

  return events;
}

export function parseReason(reason) {
  if (!reason) return [];
  return reason.split("\n").flatMap(parseReasonLine);
}

// municipality-changesは「変更のあった各コード」ごとに1行なので、同じ合併・編入イベントの
// reasonテキストが複数行（対象の町村分＋合併先自身の分）にまたがって重複出現する。
// raw文＋施行日を鍵に重複除去してから返す。
export function collectEvents(changes) {
  const seen = new Set();
  const events = [];
  for (const c of changes) {
    for (const ev of parseReason(c.reason)) {
      const key = `${c.effectiveDate}|${ev.raw}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ ...ev, effectiveDate: c.effectiveDate, prefecture: c.prefecture });
    }
  }
  return events;
}
