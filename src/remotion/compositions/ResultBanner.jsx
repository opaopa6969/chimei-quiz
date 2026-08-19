// 正誤演出（全設問タイプ共通）。正解時はコンボ数に応じて演出が派手になる。
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export function ResultBanner({ correct, combo = 0, answerLabel, scoreGained = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 10, stiffness: 140 } });
  const shake = correct ? 0 : Math.sin(frame * 3) * interpolate(frame, [0, 10], [6, 0], { extrapolateRight: "clamp" });
  const comboOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scoreOpacity = interpolate(frame, [14, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: correct ? "radial-gradient(circle,#1fae72,#0b6b46)" : "radial-gradient(circle,#c94848,#7a1f1f)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          transform: `scale(${scale}) translateX(${shake}px)`,
          fontSize: 76,
          color: "white",
          fontWeight: 900,
          fontFamily: '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif',
          textShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        {correct ? "せいかい！" : "ざんねん…"}
      </div>
      {!correct && answerLabel && (
        <div style={{ opacity: comboOpacity, color: "white", fontSize: 26, marginTop: 12 }}>
          正解は「{answerLabel}」
        </div>
      )}
      {correct && combo > 1 && (
        <div style={{ opacity: comboOpacity, color: "#ffe066", fontSize: 30, fontWeight: 700, marginTop: 12 }}>
          {combo}連続コンボ！
        </div>
      )}
      {correct && (
        <div style={{ opacity: scoreOpacity, color: "white", fontSize: 22, marginTop: 8 }}>+{scoreGained}pt</div>
      )}
    </AbsoluteFill>
  );
}
