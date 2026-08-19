// 同名地名クイズ専用演出。簡易日本地図（都道府県は点で表示、精密なポリゴンではない。
// docs/presentation.md参照）上で、出題された都道府県のピンが明滅してからプロンプトが出る。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PREFECTURE_COORDS, MAP_VIEWBOX } from "../../prefecture-coords";

export function SameNameMap({ prompt, name, givenPref }) {
  const frame = useCurrentFrame();
  const given = PREFECTURE_COORDS[givenPref];

  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(frame / 8));
  const zoom = interpolate(frame, [0, 40], [1, 2.2], { extrapolateRight: "clamp" });
  const focusX = given ? given.x : MAP_VIEWBOX.width / 2;
  const focusY = given ? given.y : MAP_VIEWBOX.height / 2;
  // ズームの中心を出題県にするための平行移動（拡大しても対象が画面中央に留まるように）
  const tx = MAP_VIEWBOX.width / 2 - focusX * zoom;
  const ty = MAP_VIEWBOX.height / 2 - focusY * zoom;

  const promptOpacity = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg,#0b3d2e,#0f5c43)" }}>
      <svg
        viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
        style={{ width: "100%", height: "75%" }}
      >
        <g transform={`translate(${tx} ${ty}) scale(${zoom})`}>
          {Object.entries(PREFECTURE_COORDS).map(([pref, { x, y }]) => {
            const isGiven = pref === givenPref;
            return (
              <circle
                key={pref}
                cx={x}
                cy={y}
                r={isGiven ? 3.2 * pulse : 1.6}
                fill={isGiven ? "#ffe066" : "rgba(255,255,255,0.35)"}
                stroke={isGiven ? "#fff" : "none"}
                strokeWidth={isGiven ? 0.6 : 0}
              />
            );
          })}
        </g>
      </svg>
      <div
        style={{
          opacity: promptOpacity,
          textAlign: "center",
          color: "white",
          fontWeight: 700,
          fontSize: 34,
          padding: "0 40px",
          fontFamily: '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif',
          textShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        {prompt}
      </div>
    </AbsoluteFill>
  );
}
