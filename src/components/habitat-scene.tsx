"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
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

// Wrapper dimensions — single source of truth shared by the SSR poster wrapper
// and the dynamic-imported canvas loading spinner so the hand-off is CLS=0.
const WRAPPER_STYLE = {
  aspectRatio: "16/9",
  maxHeight: "min(70vh, 400px)",
  position: "relative" as const,
};

// Phase 13.1-04: no loading-spinner fallback. The dynamic-imported canvas
// chunk only fetches AFTER a user gesture, and even then the SSR poster
// below remains visible underneath until `canvasReady` flips. A spinner
// would visually fight the poster and is no longer the LCP candidate.

// SSR-safe: ssr:false only works inside "use client" modules (Next.js 16 rule).
// Phase 13.1-04: the OUTER wrapper + SSR poster live in <HabitatScene> (this
// file). The dynamic canvas now renders only the absolutely-positioned <canvas>
// + hint overlay on top of the parent-owned poster.
const HabitatCanvas = dynamic(() => import("@/components/habitat-3d-canvas"), {
  ssr: false,
  // No loading fallback: the SSR poster already occupies the wrapper, so an
  // additional spinner would visually fight the poster. The dynamic chunk only
  // fetches after a user gesture, by which point the poster has long since
  // painted.
  loading: () => null,
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
    <div className="absolute top-3 right-3 text-sm font-normal text-muted-foreground flex items-center gap-2 z-10">
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
  // Phase 13.1-04: parent owns the SSR poster, so parent also owns the
  // poster-fade trigger. The canvas signals readiness via `onCanvasReady`.
  const [canvasReady, setCanvasReady] = useState(false);
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
        style={WRAPPER_STYLE}
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

  // Clamp level for poster filename — keeps the SSR <img src> in [1,9].
  const sceneLevel = Math.max(1, Math.min(9, Math.floor(state.level)));

  return (
    <div className="relative w-full">
      {/*
        Phase 13.1-04 SSR-POSTER-FIX:
          The aspect-ratio wrapper + <Image priority fill> poster live OUTSIDE
          the dynamic({ssr:false}) boundary so they appear in the server-rendered
          HTML. This is the LCP candidate. The motion.div opacity-0 wrapper that
          used to wrap the canvas+overlays is GONE — opacity-0 disqualifies the
          element as an LCP candidate at SSR time, which broke the Phase 13.1-02
          attempt (Lighthouse reported "NO LCP DETAILS" on the Vercel preview).

          R6 CLS=0: wrapper carries intrinsic size BEFORE either the SSR poster
          or the (later) Three.js canvas paints.
      */}
      <div
        className="w-full rounded-lg overflow-hidden"
        style={WRAPPER_STYLE}
        data-testid="habitat-scene-wrapper"
      >
        {/* Level badge overlay (D-15, UI-SPEC) — z-10 so it sits above poster + canvas */}
        <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full z-10">
          Level {state.level}
        </div>

        {/* Mood indicator overlay (D-15, UI-SPEC) */}
        <MoodIndicator mood={state.mood} />

        {/*
          R2 LCP candidate: SSR-rendered <Image priority fill>. Lives at the
          parent level (NOT inside dynamic({ssr:false})), so the <img> + the
          preload <link> Next.js injects appear in the document the browser
          receives. Opacity is NEVER 0 at SSR time — the parent controls the
          fade-out via canvasReady, which can only flip true after hydration.
        */}
        {/*
          Phase 13.1-04 Opt A: `unoptimized` makes Next emit a plain <img>
          with `src="/habitat/hero-l{N}.webp"` instead of routing through
          `/_next/image?url=...` (Vercel image-optimization Lambda). The
          static webp at ~25 KB is already correctly sized + encoded; the
          proxy added 100-300 ms Lambda cold-start to mobile LCP for zero
          byte savings. Direct CDN delivery is strictly faster.

          `priority` is preserved so Next still injects the preload <link>
          in <head> (now pointing at the direct asset path, not the proxy).
        */}
        <Image
          src={`/habitat/hero-l${sceneLevel}.webp`}
          alt={`Tiger habitat level ${sceneLevel}`}
          fill
          priority
          unoptimized
          sizes="(max-width: 768px) 100vw, 720px"
          style={{
            objectFit: "cover",
            transition: "opacity 200ms ease-out",
            opacity: canvasReady ? 0 : 1,
            pointerEvents: canvasReady ? "none" : "auto",
          }}
        />

        {/*
          Dynamic Three.js canvas. The component absolutely-positions its own
          <canvas> over our poster. It owns the gesture gate, hint timer, and
          dev affordances. It calls `onCanvasReady` when data-ready flips to
          "true" so we can fade the SSR poster out.
        */}
        <HabitatCanvas
          habitatState={state}
          celebratingLevel={celebratingLevel}
          onCanvasReady={() => setCanvasReady(true)}
        />
      </div>

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
