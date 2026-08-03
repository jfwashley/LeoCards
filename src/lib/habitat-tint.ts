// CSS mood-driven ambient-light tint helper (D-05).
// Sourced from design/handoff-daybreak/daybreak-habitat-scene.jsx MOOD/SKY palettes.
//
// Returns an rgba() string to use as the CSS background of the absolute
// tint overlay div (position:absolute; inset:0; pointer-events:none; z-index:1).
// The existing decayFilter on <HabitatVideo> is composited separately (D-11).
//
// Covers exactly the 4 engine moods (excited/happy/neutral/sad) plus:
// - isDecaying → flat grey wash (D-11)
// - level >= 9  → golden-hour rgba overlay (radial gradient applied by caller, D-05)
// D-14: NO sleeping/napping/night-cycle tint — only these 4 moods + decay + golden-hour.

import type { TigerMood } from "@leocards/domain/habitat";

export function moodTint(
  mood: TigerMood,
  isDecaying: boolean,
  level: number,
): string {
  // isDecaying takes priority (D-11): grey wash composited over the existing decay filter
  if (isDecaying) return "rgba(120,120,130,0.10)";
  // Golden-hour (L9 cap, D-12): warm amber radial tint — caller may layer a full radial-gradient
  if (level >= 9) return "rgba(255,200,110,0.22)";
  // 4-mood map sourced from handoff MOOD palette (daybreak-habitat-scene.jsx lines 7–16)
  const map: Record<TigerMood, string> = {
    excited: "rgba(242,179,58,0.12)", // amber gold (#F2B33A)
    happy: "rgba(62,155,95,0.10)", // fresh green (#3E9B5F)
    neutral: "rgba(183,169,143,0.10)", // muted warm beige (#B7A98F)
    sad: "rgba(124,147,176,0.12)", // cool blue-grey (#7C93B0)
  };
  return map[mood] ?? "rgba(0,0,0,0)";
}
