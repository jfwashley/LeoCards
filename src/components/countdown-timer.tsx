"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LionFace } from "@/components/daybreak/lion-face";

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "<1m";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "<1m";
}

// Isolated countdown component — re-renders every 60s without affecting parent.
// Returns the countdown string for the status row.
//
// Phase 17 (D-06): extracted from deck-view.tsx verbatim so this genuinely
// reactive leaf (useState/useEffect/router.refresh) can be imported directly
// by a Server Component (dashboard/page.tsx) without dragging the rest of the
// dashboard's static shell into a client boundary.
export function CountdownTimer({
  earliestCooldownEnd,
  hasDueCards,
}: {
  earliestCooldownEnd: string;
  hasDueCards: boolean;
}) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<string>(() => {
    const ms = new Date(earliestCooldownEnd).getTime() - Date.now();
    return formatCountdown(ms);
  });

  useEffect(() => {
    if (hasDueCards) return;

    function recompute() {
      const ms = new Date(earliestCooldownEnd).getTime() - Date.now();
      if (ms <= 0) {
        router.refresh();
        return;
      }
      setCountdown(formatCountdown(ms));
    }

    recompute();
    const interval = setInterval(recompute, 60000);
    return () => clearInterval(interval);
  }, [earliestCooldownEnd, hasDueCards, router]);

  // Render the "Resting · {countdown}" status text in-line
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14.5,
        fontWeight: 600,
        color: "#8A6235",
      }}
    >
      <span style={{ position: "relative", display: "inline-flex" }}>
        <LionFace
          size={22}
          mane="#E8973B"
          face="#FFD9A6"
          muzzle="#FFF1DC"
          ink="#4A331C"
        />
        <span
          style={{
            position: "absolute",
            right: -5,
            top: -4,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 12,
            color: "#B4762A",
          }}
        >
          z
        </span>
      </span>
      Resting &middot; {countdown}
    </span>
  );
}
