import React, { useState } from "react";
import { CATEGORIES } from "./quiz-engine.js";

export function StartScreen({ onStart }) {
  const [type, setType] = useState("same-name");
  const [count, setCount] = useState(10);

  return (
    <div className="screen start-screen">
      <h1>🗾 chimei-quiz</h1>
      <p className="lead">日本の地名・自治体まわりの雑学クイズ。カテゴリを選んでスタート。</p>

      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <button
            key={c.type}
            className={`category-card ${type === c.type ? "selected" : ""}`}
            onClick={() => setType(c.type)}
          >
            <div className="category-emoji">{c.emoji}</div>
            <div className="category-label">{c.label}</div>
            <div className="category-desc">{c.desc}</div>
          </button>
        ))}
      </div>

      <div className="count-picker">
        {[5, 10, 20].map((n) => (
          <button key={n} className={`count-btn ${count === n ? "selected" : ""}`} onClick={() => setCount(n)}>
            {n}問
          </button>
        ))}
      </div>

      <button className="start-btn" onClick={() => onStart({ type, count })}>
        スタート
      </button>
    </div>
  );
}
