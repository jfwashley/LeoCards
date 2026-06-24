"use client";

// HabitatCelebration — CSS-only level-up celebration overlay.
// Perf invariant: MUST NOT import motion/react or framer-motion (Phase 13.1 — removed from /habitat).
// Confetti uses @keyframes hab-fall (globals.css) via the hab-confetti class.
// WR-01 SSR-safety: usePrefersReducedMotion defaults false on SSR; confetti flashes ~16ms
// on a reduced-motion device before hydration (same "server emits motion, swap after mount"
// pattern as habitat-video.tsx — acceptable per RESEARCH Pitfall 4).
// Handoff: design/handoff-daybreak/daybreak-habitat.jsx HabCelebrate lines 162-186.

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { H_NAME, H_NEXT } from "@/lib/habitat-names";

// Same palette as level-up-overlay.tsx lines 11-12 for cross-flow visual consistency.
const CONFETTI_COLORS = ["#F28A1F", "#F2B33A", "#3E9B5F", "#DE5F4A", "#6B4A8A"];
const CONFETTI_COUNT = 26; // handoff line 165

export function HabitatCelebration({
  celebratingLevel,
  onSettle,
}: {
  celebratingLevel: number;
  onSettle: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  // The auto-settle timer (D-07: 2500ms) is owned by the parent habitat-scene.tsx useEffect
  // and calls onSettle. This component just renders; it does not set its own timer.
  void onSettle; // prop available to parent; not used internally

  // Guard: H_NEXT has keys 1-8 only — never index H_NEXT[9] (Pitfall 5, D-12)
  const unlockEntry = celebratingLevel < 9 ? H_NEXT[celebratingLevel] : null;
  const levelName = H_NAME[celebratingLevel] ?? `Level ${celebratingLevel}`;

  return (
    <div
      data-testid="habitat-celebration"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        background:
          "radial-gradient(circle at 50% 42%, rgba(255,247,233,0.35), rgba(255,247,233,0.62))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 28,
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {/* Confetti layer — CSS animation only via .hab-confetti class (globals.css);
          hidden under reduced-motion via @media (prefers-reduced-motion) override. */}
      {!reducedMotion && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: CONFETTI_COUNT }, (_, i) => {
            const sq = i % 3 === 0;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: confetti items are positional visual decorations
                key={i}
                className="hab-confetti"
                style={{
                  position: "absolute",
                  left: `${(i * 53) % 100}%`,
                  top: "-10%",
                  width: sq ? 10 : 6,
                  height: sq ? 10 : 14,
                  background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  borderRadius: sq ? 2 : 1,
                  animation: `hab-fall 2.5s ease-in ${((i % 9) * 0.22).toFixed(2)}s forwards`,
                  transform: `rotate(${(i * 47) % 360}deg)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Level-up text */}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 17,
          fontWeight: 700,
          color: "#C96F12",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Level up!
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 62,
          fontWeight: 700,
          color: "#4A331C",
          lineHeight: 0.9,
        }}
      >
        Level {celebratingLevel}
      </span>
      <div style={{ fontSize: 14, color: "#8C7A63" }}>{levelName}</div>

      {/* What-appeared reveal — levels 1-8 only (H_NEXT has no L9 entry) */}
      {unlockEntry && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderRadius: 16,
            background: "#FFFFFF",
            boxShadow: "0 12px 30px rgba(120,80,30,0.2)",
          }}
        >
          {/* Generic medallion disc — no per-level CSS shape (Claude's Discretion) */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "#FFF1DC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#F28A1F",
              }}
            />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#4A331C" }}>
            {unlockEntry.what.charAt(0).toUpperCase() +
              unlockEntry.what.slice(1)}{" "}
            moved in!
          </span>
        </div>
      )}
      {/* L9: "Course 1 complete" (D-12, D-08) */}
      {!unlockEntry && (
        <div style={{ fontSize: 15, fontWeight: 600, color: "#8C7A63" }}>
          Course 1 complete &mdash; you grew the whole world.
        </div>
      )}
    </div>
  );
}
