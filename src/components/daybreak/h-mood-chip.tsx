// HMoodChip — frosted mood pill (coloured dot + label, 4 engine moods).
// Daybreak atom for the Habitat chrome (D-13/D-14).
// Handoff: design/handoff-daybreak/daybreak-habitat.jsx lines 11-29.
// No "use client" — pure props-to-markup, RSC-safe.
// Uses cfg?.color / cfg?.label (no "!" — biome noNonNullAssertion).

import type { TigerMood } from "@/lib/habitat-engine";

// MOOD palette from daybreak-habitat.jsx lines 11-13.
const MOOD_CONFIG: Record<TigerMood, { label: string; color: string }> = {
  excited: { label: "Excited", color: "#F2B33A" },
  happy: { label: "Happy", color: "#3E9B5F" },
  neutral: { label: "Neutral", color: "#B7A98F" },
  sad: { label: "Sad", color: "#7C93B0" },
};

export function HMoodChip({ mood }: { mood: TigerMood }) {
  const cfg = MOOD_CONFIG[mood];
  return (
    <div
      data-testid="habitat-mood-chip"
      style={{
        height: 36,
        padding: "0 13px 0 11px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.86)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 3px 10px rgba(120,80,30,0.14)",
        flex: "none",
      }}
    >
      <span
        style={{
          width: 11,
          height: 11,
          borderRadius: "50%",
          background: cfg?.color ?? "#B7A98F",
          boxShadow: `0 0 0 3px ${cfg?.color ?? "#B7A98F"}33`,
        }}
      />
      <span style={{ fontSize: 14, fontWeight: 700, color: "#4A331C" }}>
        {cfg?.label ?? mood}
      </span>
    </div>
  );
}
