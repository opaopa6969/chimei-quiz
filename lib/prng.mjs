// seed付き決定論PRNG（mulberry32）。Math.randomは使わない — 同seed・同入力なら常に同出力。
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 文字列seed → 32bit整数（FNV-1aハッシュ）
export function seedFromString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function makePrng(seed) {
  return mulberry32(typeof seed === "string" ? seedFromString(seed) : seed);
}

// Fisher-Yatesシャッフル（破壊的ではなくコピーを返す）
export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 配列からn件を重複無しで決定論抽出
export function pickN(arr, n, rng) {
  return shuffle(arr, rng).slice(0, n);
}
