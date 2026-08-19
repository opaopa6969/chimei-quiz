import React, { useMemo, useState, useCallback } from "react";
import { Player } from "@remotion/player";
import { ResultBanner } from "./remotion/compositions/ResultBanner";
import { pickIntroComponent, introProps } from "./remotion/pick-intro.js";
import { scoreFor } from "./quiz-engine.js";

const FPS = 30;
const INTRO_FRAMES = 75; // 2.5秒
const RESULT_FRAMES = 60; // 2秒

export function GameScreen({ questions, onFinish }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("intro"); // "intro" | "choices" | "result"
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastResult, setLastResult] = useState(null); // { correct, answerLabel, scoreGained }
  const [answered, setAnswered] = useState(null); // クリックされた選択肢（連打防止）

  const question = questions[index];
  const IntroComponent = useMemo(() => pickIntroComponent(question), [question]);
  const introInputProps = useMemo(() => introProps(question), [question]);

  const handleChoice = useCallback(
    (choice) => {
      if (answered) return;
      setAnswered(choice);
      const correct = choice === question.answer;
      const gained = correct ? scoreFor(question, combo) : 0;
      const nextCombo = correct ? combo + 1 : 0;

      setLastResult({ correct, answerLabel: question.answer, scoreGained: gained, combo: nextCombo });
      setScore((s) => s + gained);
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setPhase("result");
    },
    [answered, combo, question]
  );

  const handleResultEnded = useCallback(() => {
    if (index + 1 >= questions.length) {
      onFinish({ score: score + (lastResult?.scoreGained ?? 0), maxCombo, total: questions.length });
      return;
    }
    setIndex((i) => i + 1);
    setPhase("intro");
    setAnswered(null);
    setLastResult(null);
  }, [index, questions.length, onFinish, score, lastResult, maxCombo]);

  return (
    <div className="screen game-screen">
      <div className="hud">
        <span>問題 {index + 1} / {questions.length}</span>
        <span>スコア {score}</span>
        <span>コンボ {combo}</span>
      </div>

      <div className="player-wrap">
        {phase === "intro" && (
          <Player
            key={`intro-${question.id}`}
            component={IntroComponent}
            inputProps={introInputProps}
            durationInFrames={INTRO_FRAMES}
            fps={FPS}
            compositionWidth={800}
            compositionHeight={420}
            style={{ width: "100%", borderRadius: 16 }}
            autoPlay
            loop={false}
            controls={false}
            onEnded={() => setPhase("choices")}
          />
        )}
        {phase === "choices" && (
          <div className="prompt-static">{question.prompt}</div>
        )}
        {phase === "result" && lastResult && (
          <Player
            key={`result-${question.id}`}
            component={ResultBanner}
            inputProps={lastResult}
            durationInFrames={RESULT_FRAMES}
            fps={FPS}
            compositionWidth={800}
            compositionHeight={420}
            style={{ width: "100%", borderRadius: 16 }}
            autoPlay
            loop={false}
            controls={false}
            onEnded={handleResultEnded}
          />
        )}
      </div>

      {phase === "choices" && (
        <div className="choices">
          {question.choices.map((c) => (
            <button key={c} className="choice-btn" onClick={() => handleChoice(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
