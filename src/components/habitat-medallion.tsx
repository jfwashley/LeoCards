"use client";

import { LionFace } from "@/components/daybreak/lion-face";
import { LEVEL_THRESHOLDS } from "@/lib/habitat-engine";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HabitatMedallionProps {
  level: number; // 1-9 (engine caps at 9)
  learnedCardCount: number;
  nextLevelThreshold: number | null; // null at L9 (engine confirmed line 262)
  sleeping?: boolean; // true during cooldown state (D-06)
  size?: number; // default 132 for the hero card
}

// ---------------------------------------------------------------------------
// Progress ratio — mirrors habitat-widget.tsx lines 27-41
// ---------------------------------------------------------------------------

function progressRatio(
  level: number,
  learnedCardCount: number,
  nextLevelThreshold: number | null,
): number {
  // L9 max → full ring
  if (nextLevelThreshold === null) return 1;
  const prevThreshold = level >= 2 ? (LEVEL_THRESHOLDS[level - 2] ?? 0) : 0;
  const range = nextLevelThreshold - prevThreshold;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (learnedCardCount - prevThreshold) / range));
}

// ---------------------------------------------------------------------------
// HabitatMedallion
// ---------------------------------------------------------------------------

export function HabitatMedallion({
  level,
  learnedCardCount,
  nextLevelThreshold,
  sleeping = false,
  size = 132,
}: HabitatMedallionProps) {
  // D-05: canonical max-level signal is nextLevelThreshold === null (level >= 9).
  // The mock's dead branch (gold when level exceeds 9) is NOT replicated here.
  const isMaxLevel = nextLevelThreshold === null;

  const deg = progressRatio(level, learnedCardCount, nextLevelThreshold) * 360;

  // D-06 OVERRIDE: when sleeping the ring keeps the REAL accurate value.
  // The mock greys the ring to #F3E3C6 when sleeping — we override that.
  const ringBackground = isMaxLevel
    ? "#F2B33A" // gold solid at max level (D-05)
    : `conic-gradient(#F28A1F ${deg}deg, #F3E3C6 ${deg}deg)`; // amber progress arc

  // Inner disc: dim when sleeping (D-06)
  const innerOpacity = sleeping ? 0.45 : 1;

  // Badge: sleeping → tan dot; max → gold; normal → amber
  const badgeBackground = sleeping
    ? "#C9B79A"
    : isMaxLevel
      ? "#F2B33A"
      : "#F28A1F";

  const badgeContent = sleeping ? "•" : level;

  return (
    <div
      data-testid="habitat-medallion"
      data-max-level={String(isMaxLevel)}
      data-sleeping={String(!!sleeping)}
      style={{ width: size, height: size, position: "relative", flex: "none" }}
    >
      {/* Outer conic-gradient ring */}
      <div
        data-testid="medallion-ring"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: ringBackground,
        }}
      />

      {/* Inner sunrise disc (inset 6px from the ring) */}
      <div
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: "50%",
          background: "linear-gradient(180deg, #FFE7BC 0%, #FFFDF8 78%)",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {/* Sun dot — dimmed when sleeping */}
        <div
          style={{
            position: "absolute",
            right: "22%",
            top: "15%",
            width: size * 0.15,
            height: size * 0.15,
            borderRadius: "50%",
            background: "#FFC95C",
            opacity: innerOpacity,
          }}
        />

        {/* LionFace + optional sleeping z-mark */}
        <div
          style={{
            marginBottom: size * 0.05,
            position: "relative",
            opacity: innerOpacity,
          }}
        >
          <LionFace
            size={size * 0.56}
            mane="#E8973B"
            face="#FFD9A6"
            muzzle="#FFF1DC"
            ink="#4A331C"
          />
          {sleeping && (
            <span
              style={{
                position: "absolute",
                right: -size * 0.05,
                top: -size * 0.05,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: size * 0.17,
                color: "#B4762A",
              }}
            >
              z
            </span>
          )}
        </div>
      </div>

      {/* Level badge — bottom-right */}
      <div
        style={{
          position: "absolute",
          right: -2,
          bottom: -2,
          minWidth: size * 0.3,
          height: size * 0.3,
          padding: "0 5px",
          borderRadius: 999,
          background: badgeBackground,
          color: "#FFF",
          border: "3px solid #FFF6E9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: size * 0.19,
          boxSizing: "border-box",
        }}
      >
        {badgeContent}
      </div>
    </div>
  );
}
