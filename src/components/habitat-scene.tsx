"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import type { HabitatState, TigerMood } from "@/lib/habitat-engine";

// localStorage cache key for offline support (Pattern 8 from RESEARCH.md)
const CACHE_KEY = "leocards:habitat-state";

// Zod schema for validating cached habitat state from localStorage
const HabitatStateSchema = z.object({
  level: z.number().int().min(1).max(9),
  quality: z.number().min(0.1).max(1),
  mood: z.enum(["excited", "happy", "neutral", "sad"]),
  learnedCardCount: z.number().int().nonnegative(),
  effectiveCardCount: z.number().int().nonnegative(),
  isDecaying: z.boolean(),
  minutesSinceActivity: z.number().nullable(),
  nextLevelThreshold: z.number().nullable(),
});

// Loading spinner shown while PixiJS and sprite assets initialize (D-18)
function HabitatLoadingSpinner() {
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ aspectRatio: "16/9", maxHeight: "min(70vh, 400px)" }}
    >
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
const HabitatCanvas = dynamic(() => import("@/components/habitat-canvas"), {
  ssr: false,
  loading: () => <HabitatLoadingSpinner />,
});

// ============================================================
// Mood indicator helpers
// ============================================================

const MOOD_LABELS: Record<TigerMood, string> = {
  excited: "Excited",
  happy: "Happy",
  neutral: "Neutral",
  sad: "Sad",
};

const MOOD_DOT_CLASSES: Record<TigerMood, string> = {
  excited: "bg-primary",
  happy: "bg-emerald-500",
  neutral: "bg-amber-400",
  sad: "bg-slate-400",
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

export function HabitatScene({
  habitatState,
  celebratingLevel = null,
}: {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}) {
  const [state, setState] = useState<HabitatState>(habitatState);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef(habitatState.level);

  // Sync state when prop changes (BP3)
  useEffect(() => {
    setState(habitatState);
  }, [habitatState]);

  // On mount: cache the server-provided state to localStorage (D-24 offline support)
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(habitatState));
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, [habitatState]);

  // Level-up detection: when state.level increases, show celebration for 2.5s (D-20)
  useEffect(() => {
    if (state.level > prevLevelRef.current) {
      setShowLevelUp(true);
      prevLevelRef.current = state.level;
      const timer = setTimeout(() => setShowLevelUp(false), 2500);
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = state.level;
  }, [state.level]);

  // Retry function for error recovery — tries fresh API fetch, falls back to cache (D-23, D-24)
  async function retry() {
    setError(false);
    try {
      const res = await fetch("/api/habitat");
      if (!res.ok) throw new Error("API error");
      const data: HabitatState = await res.json();
      setState(data);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
      setOffline(false);
    } catch {
      // Try cached data with Zod validation
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = HabitatStateSchema.parse(JSON.parse(cached));
          setState(parsed as HabitatState);
          setOffline(true);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    }
  }

  // Error state (D-23): shows when API fails and no cached data available
  if (error) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center bg-card rounded-lg border"
        style={{ aspectRatio: "16/9", maxHeight: "min(70vh, 400px)" }}
      >
        <p className="text-lg font-semibold mb-2">Something went wrong</p>
        <p className="text-sm text-muted-foreground mb-4">
          We couldn&apos;t load your habitat. Check your connection and try
          again.
        </p>
        <Button onClick={retry}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* D-19: scene fades in from loading state over ~0.5s */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Level badge overlay (D-15, UI-SPEC) */}
        <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full z-10">
          Level {state.level}
        </div>

        {/* Mood indicator overlay (D-15, UI-SPEC) */}
        <MoodIndicator mood={state.mood} />

        <HabitatCanvas
          habitatState={state}
          celebratingLevel={celebratingLevel}
        />
      </motion.div>

      {/* Offline indicator (D-24): shows when displaying cached data */}
      {offline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm text-sm text-muted-foreground px-4 py-2 rounded-full border"
        >
          You&apos;re offline — showing last known state
        </motion.div>
      )}

      {/* Level-up celebration overlay (D-20): shown for 2.5s after leveling up */}
      {showLevelUp && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="text-xl sm:text-[28px] font-semibold text-primary drop-shadow-lg">
            Level {state.level}!
          </span>
        </motion.div>
      )}
    </div>
  );
}
