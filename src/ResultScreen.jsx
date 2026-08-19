import React from "react";

export function ResultScreen({ result, onRetry, onBackToStart }) {
  return (
    <div className="screen result-screen">
      <h1>🏁 結果発表</h1>
      <div className="result-score">{result.score}<span className="unit">pt</span></div>
      <div className="result-sub">
        <span>{result.total}問中プレイ</span>
        <span>最大コンボ {result.maxCombo}</span>
      </div>
      <div className="result-actions">
        <button className="start-btn" onClick={onRetry}>もう一度</button>
        <button className="ghost-btn" onClick={onBackToStart}>カテゴリ選択へ</button>
      </div>
    </div>
  );
}
