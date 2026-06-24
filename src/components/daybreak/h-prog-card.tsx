// HProgCard — bottom progress card (Level N · name, amber bar, H_NEXT unlock).
// Daybreak atom (HAB-03, D-03, D-12).
// Handoff: design/handoff-daybreak/daybreak-habitat.jsx lines 50-73.
// At L9 (nextLevelThreshold === null): "Course 1 complete — you grew the whole world."
// No "use client" — pure props-to-markup, RSC-safe.

import { H_NAME, H_NEXT } from "@/lib/habitat-names";

export function HProgCard({
  level,
  effectiveCardCount,
  nextLevelThreshold,
}: {
  level: number;
  effectiveCardCount: number;
  nextLevelThreshold: number | null;
}) {
  const isMax = nextLevelThreshold === null;
  // Guard: treat null OR 0 denominator as max (WR-03 — isValidHabitatState only
  // checks isFiniteNum, not > 0; a future 0 threshold would produce Infinity%).
  // Math.max(0, …) also defends against a negative effectiveCardCount.
  const pct =
    isMax || !nextLevelThreshold
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            Math.round((effectiveCardCount / nextLevelThreshold) * 100),
          ),
        );
  // Guard: H_NEXT has keys 1-8 only — never access H_NEXT[9] (Pitfall 5, D-12)
  const nx = level < 9 ? H_NEXT[level] : null;

  return (
    <div
      data-testid="habitat-prog-card"
      style={{
        position: "relative",
        zIndex: 3,
        margin: "0 16px 18px",
        padding: "15px 17px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(6px)",
        boxShadow: "0 10px 28px rgba(120,80,30,0.18)",
        border: "1px solid rgba(255,255,255,0.7)",
        display: "flex",
        flexDirection: "column",
        gap: 11,
        flex: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            color: "#4A331C",
            whiteSpace: "nowrap",
          }}
        >
          Level {level} &middot; {H_NAME[level]}
        </span>
        {nx ? (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#9C8467",
              flex: "none",
            }}
          >
            {pct}% to L{level + 1}
          </span>
        ) : null}
      </div>
      {nx ? (
        <>
          {/* Progress bar: amber gradient fill */}
          <div
            style={{
              height: 12,
              borderRadius: 7,
              background: "#F1E6D2",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 7,
                background: "linear-gradient(90deg, #F28A1F, #F2B33A)",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {/* Generic icon disc — no per-level CSS shapes (Claude's Discretion) */}
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: "#FFF1DC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  border: "2px solid #F28A1F",
                  borderRadius: "50%",
                }}
              />
            </span>
            <span style={{ fontSize: 14, color: "#4A331C" }}>
              Next at L{nx.at}:{" "}
              <span style={{ fontWeight: 700, color: "#C96F12" }}>
                {nx.what}
              </span>
            </span>
          </div>
        </>
      ) : (
        /* L9 max — "Course 1 complete" copy (D-12) */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontSize: 14,
            color: "#4A331C",
          }}
        >
          &#10024; Course 1 complete &mdash; you grew the whole world.
        </div>
      )}
    </div>
  );
}
