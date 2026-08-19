// 汎用の出題イントロ演出。設問文がタイプライター風に表示される。
// vanished/timeline-reason/portmanteau/reading/city-fact/lore-trivia の既定演出（専用演出が無いタイプ全部）。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const THEME = {
  "same-name": { bg: "linear-gradient(135deg,#0b3d2e,#0f5c43)", emoji: "🗺️" },
  vanished: { bg: "linear-gradient(135deg,#2b2118,#4a3627)", emoji: "👻" },
  "timeline-reason": { bg: "linear-gradient(135deg,#1a2440,#2c3d6b)", emoji: "🕰️" },
  portmanteau: { bg: "linear-gradient(135deg,#3a1f4d,#5c3480)", emoji: "🧩" },
  reading: { bg: "linear-gradient(135deg,#402417,#6b3d24)", emoji: "📖" },
  "city-fact": { bg: "linear-gradient(135deg,#0e3a4a,#166a85)", emoji: "🏙️" },
  "lore-trivia": { bg: "linear-gradient(135deg,#332a12,#5c4a1f)", emoji: "📚" },
  "parser-structure": { bg: "linear-gradient(135deg,#1f2e33,#37545c)", emoji: "🧵" },
  "district-reading": { bg: "linear-gradient(135deg,#4a1f3d,#7a3560)", emoji: "🔍" },
};
const DEFAULT_THEME = { bg: "linear-gradient(135deg,#1b1f2a,#2e3550)", emoji: "❓" };

export function QuestionIntro({ prompt, type }) {
  const frame = useCurrentFrame();
  const theme = THEME[type] ?? DEFAULT_THEME;

  const charsToShow = Math.floor(
    interpolate(frame, [6, 48], [0, [...prompt].length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const visibleText = [...prompt].slice(0, charsToShow).join("");
  const emojiScale = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const caretOn = frame % 20 < 10;

  return (
    <AbsoluteFill style={{ background: theme.bg, justifyContent: "center", alignItems: "center", padding: 60 }}>
      <div style={{ fontSize: 72, transform: `scale(${emojiScale})`, marginBottom: 24 }}>{theme.emoji}</div>
      <div
        style={{
          fontSize: 42,
          color: "white",
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.5,
          fontFamily:
            '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif',
          textShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        {visibleText}
        <span style={{ opacity: caretOn ? 1 : 0 }}>▍</span>
      </div>
    </AbsoluteFill>
  );
}
