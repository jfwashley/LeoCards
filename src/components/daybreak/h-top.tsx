// HTop — three-slot flex row composing the Habitat chrome atoms.
// Daybreak atom (D-13): HBack (left) | HMoodChip (centre) | HLevelBadge (right).
// Handoff: design/handoff-daybreak/daybreak-habitat.jsx lines 39-47.
// No "use client" — all children are RSC-safe.

import { HBack } from "@/components/daybreak/h-back";
import { HLevelBadge } from "@/components/daybreak/h-level-badge";
import { HMoodChip } from "@/components/daybreak/h-mood-chip";
import type { TigerMood } from "@/lib/habitat-engine";

export function HTop({ mood, level }: { mood: TigerMood; level: number }) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 3,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "8px 18px 0",
        flex: "none",
      }}
    >
      <HBack />
      <HMoodChip mood={mood} />
      <HLevelBadge level={level} />
    </div>
  );
}
