import React, { useCallback, useState } from "react";
import { StartScreen } from "./StartScreen.jsx";
import { GameScreen } from "./GameScreen.jsx";
import { ResultScreen } from "./ResultScreen.jsx";
import { loadQuestions, buildSession, todaySeed } from "./quiz-engine.js";

export function App() {
  const [stage, setStage] = useState("start"); // "start" | "loading" | "playing" | "result" | "error"
  const [sessionQuestions, setSessionQuestions] = useState(null);
  const [lastConfig, setLastConfig] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const start = useCallback(async ({ type, count }) => {
    setStage("loading");
    setLastConfig({ type, count });
    try {
      const questions = await loadQuestions(type);
      const seed = `${type}-${count}-${todaySeed()}-${Math.floor(Math.random() * 1e9)}`;
      const session = buildSession(questions, count, seed);
      if (session.length === 0) throw new Error("この カテゴリには出題できる問題がありません");
      setSessionQuestions(session);
      setStage("playing");
    } catch (err) {
      setErrorMessage(err.message ?? String(err));
      setStage("error");
    }
  }, []);

  const finish = useCallback((result) => {
    setFinalResult(result);
    setStage("result");
  }, []);

  const retry = useCallback(() => {
    if (lastConfig) start(lastConfig);
  }, [lastConfig, start]);

  const backToStart = useCallback(() => {
    setStage("start");
    setSessionQuestions(null);
    setFinalResult(null);
  }, []);

  if (stage === "start") return <StartScreen onStart={start} />;
  if (stage === "loading") return <div className="screen center-msg">読み込み中…</div>;
  if (stage === "error")
    return (
      <div className="screen center-msg">
        <p>{errorMessage}</p>
        <button className="start-btn" onClick={backToStart}>戻る</button>
      </div>
    );
  if (stage === "playing" && sessionQuestions)
    return <GameScreen questions={sessionQuestions} onFinish={finish} />;
  if (stage === "result" && finalResult)
    return <ResultScreen result={finalResult} onRetry={retry} onBackToStart={backToStart} />;

  return null;
}
