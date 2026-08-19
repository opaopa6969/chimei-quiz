// 出題セッションの組み立て・スコア計算。純粋関数中心（Reactの状態管理はApp側）。
import { makePrng, shuffle } from "../lib/prng.mjs";

export const CATEGORIES = [
  { type: "same-name", label: "同名地名", emoji: "🗺️", desc: "「府中市」はどことどこ？" },
  { type: "vanished", label: "消えた市町村", emoji: "👻", desc: "今はもう無い市町村を当てる" },
  { type: "timeline-reason", label: "自治体変遷推理", emoji: "🕰️", desc: "合併・編入の顛末を当てる" },
  { type: "portmanteau", label: "合成地名", emoji: "🧩", desc: "新設市名の元ネタを当てる" },
  { type: "reading", label: "難読地名", emoji: "📖", desc: "この地名、読める？" },
  { type: "city-fact", label: "ご当地トリビア", emoji: "🏙️", desc: "人口・面積の日本一" },
  { type: "lore-trivia", label: "住所地誌トリビア", emoji: "📚", desc: "住所の書き方にまつわる雑学" },
  { type: "parser-structure", label: "住所構造クイズ", emoji: "🧵", desc: "免・条丁目・地割…地域特殊な住所の仕組み" },
  { type: "district-reading", label: "町丁目の激レア難読", emoji: "🔍", desc: "神木本町、読める？（市区町村レベルより激辛）" },
  { type: "all", label: "ぜんぶミックス", emoji: "🎲", desc: "全カテゴリからランダム出題" },
];

export async function loadQuestions(type) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/quiz/${type}.json`);
  if (!res.ok) throw new Error(`設問データの読み込みに失敗しました: ${type}`);
  const data = await res.json();
  return data.questions;
}

// seedから決定論的にN問選ぶ（同じseedなら毎回同じセッションになる）
export function buildSession(questions, count, seed) {
  const rng = makePrng(seed);
  return shuffle(questions, rng).slice(0, Math.min(count, questions.length));
}

// 「ぜんぶミックス」用: typeを均等に混ぜてN問選ぶ（ラウンドロビン）。
// vanished(1543問)がall.jsonの半分近くを占めるため、単純に buildSession で
// フラットにランダム抽出すると「消えた市町村ばかり出る」と体感されてしまう
// （実際にユーザーから指摘があった）。カテゴリごとに先にシャッフルしてから
// 1問ずつ順番に取り出すことで、問題数に差があっても偏りなく混ざる。
export function buildMixedSession(questions, count, seed) {
  const rng = makePrng(seed);
  const byType = new Map();
  for (const q of questions) {
    if (!byType.has(q.type)) byType.set(q.type, []);
    byType.get(q.type).push(q);
  }
  const shuffledByType = [...byType.values()].map((qs) => shuffle(qs, rng));

  const picked = [];
  for (let i = 0; picked.length < count; i++) {
    let addedAny = false;
    for (const qs of shuffledByType) {
      if (i >= qs.length) continue;
      picked.push(qs[i]);
      addedAny = true;
      if (picked.length >= count) break;
    }
    if (!addedAny) break; // 全カテゴリ使い切った
  }
  return shuffle(picked, rng); // 出題順（カテゴリの並び）もシャッフルする
}

// 正解スコア: 基礎点 + 難易度ボーナス + コンボボーナス
export function scoreFor(question, comboBeforeThisAnswer) {
  const base = 100;
  const difficultyBonus = Math.round((question.difficulty ?? 0.5) * 100);
  const comboBonus = Math.min(comboBeforeThisAnswer, 10) * 20;
  return base + difficultyBonus + comboBonus;
}

export function todaySeed() {
  // ビルド時計算不要・実行時のDateはOK（ブラウザ側コードなのでWorkflow制約の対象外）
  return new Date().toISOString().slice(0, 10);
}
