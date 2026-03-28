"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import type { HabitatState, TigerMood } from "@/lib/habitat-engine";

// Loading spinner shown while PixiJS and sprite assets initialize (D-18)
function HabitatLoadingSpinner() {
  return (
    <div className="w-full flex items-center justify-center" style={{ aspectRatio: "16/9", maxHeight: "70vh" }}>
      <svg
        className="animate-spin h-10 w-10 text-orange-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-label="Loading habitat"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

// SSR-safe: ssr:false only works inside "use client" modules (Next.js 16 rule)
const HabitatCanvas = dynamic(
  () => import("@/components/habitat-canvas"),
  {
    ssr: false,
    loading: () => <HabitatLoadingSpinner />,
  }
);

// ============================================================
// Mood indicator helpers
// ============================================================

const MOOD_LABELS: Record<TigerMood, string> = {
  excited: "Excited",
  happy: "Happy",
  neutral: "Neutral",
  sad: "Sad",
};

// Tailwind color classes for each mood dot (UI-SPEC)
const MOOD_DOT_CLASSES: Record<TigerMood, string> = {
  excited: "bg-primary",          // orange — --primary hsl(24 95% 53%)
  happy: "bg-emerald-500",        // green
  neutral: "bg-amber-400",        // amber
  sad: "bg-slate-400",            // slate
};

interface MoodIndicatorProps {
  mood: TigerMood;
}

function MoodIndicator({ mood }: MoodIndicatorProps) {
  return (
    <div className="absolute top-3 right-3 text-sm font-normal text-muted-foreground flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${MOOD_DOT_CLASSES[mood]}`} />
      {MOOD_LABELS[mood]}
    </div>
  );
}

// ============================================================
// HabitatScene
// ============================================================

export function HabitatScene({ habitatState }: { habitatState: HabitatState }) {
  return (
    // D-19: scene fades in from loading state over ~0.5s
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Level badge overlay (D-15, UI-SPEC) */}
      <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full z-10">
        Level {habitatState.level}
      </div>

      {/* Mood indicator overlay (D-15, UI-SPEC) */}
      <MoodIndicator mood={habitatState.mood} />

      <HabitatCanvas habitatState={habitatState} />
    </motion.div>
  );
}
