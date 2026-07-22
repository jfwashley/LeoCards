"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { HBack } from "@/components/daybreak/h-back";
import { HDecayCard } from "@/components/daybreak/h-decay-card";
import { HProgCard } from "@/components/daybreak/h-prog-card";
import { HTop } from "@/components/daybreak/h-top";
import { HabitatCelebration } from "@/components/habitat-celebration";
import { HabitatVideo } from "@/components/habitat-video";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { HabitatState, TigerMood } from "@/lib/habitat-engine";
import { moodTint } from "@/lib/habitat-tint";

// localStorage cache key for offline support (Pattern 8 from RESEARCH.md)
const CACHE_KEY = "leocards:habitat-state";

// Phase 999.1: validate the cached habitat-state with a hand-written type guard
// instead of zod. habitat-scene was the only zod consumer on /habitat, and it
// pulled the entire ~263 KB zod chunk onto the route just to validate one
// localStorage object — pure main-thread cost on mobile. The shape is small and
// fully knowable; a guard is equivalent for "is this cached blob still usable".
const MOODS: readonly TigerMood[] = ["excited", "happy", "neutral", "sad"];

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidHabitatState(v: unknown): v is HabitatState {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isFiniteNum(o.level) &&
    Number.isInteger(o.level) &&
    o.level >= 1 &&
    o.level <= 9 &&
    isFiniteNum(o.quality) &&
    o.quality >= 0.1 &&
    o.quality <= 1 &&
    typeof o.mood === "string" &&
    MOODS.includes(o.mood as TigerMood) &&
    isFiniteNum(o.learnedCardCount) &&
    Number.isInteger(o.learnedCardCount) &&
    o.learnedCardCount >= 0 &&
    isFiniteNum(o.effectiveCardCount) &&
    Number.isInteger(o.effectiveCardCount) &&
    o.effectiveCardCount >= 0 &&
    typeof o.isDecaying === "boolean" &&
    (o.minutesSinceActivity === null || isFiniteNum(o.minutesSinceActivity)) &&
    (o.nextLevelThreshold === null || isFiniteNum(o.nextLevelThreshold))
  );
}

// Wrapper dimensions — single source of truth. Carries the intrinsic 16/9 size
// BEFORE the video/poster paint so the hand-off is CLS=0. <HabitatVideo>
// absolutely-positions its poster + video inside this wrapper.
const WRAPPER_STYLE = {
  aspectRatio: "16/9",
  maxHeight: "min(70vh, 400px)",
  position: "relative" as const,
};

// Phase 13.1-VIDEO-02: the live Three.js canvas has been replaced by a
// pre-rendered ambient loop clip (<HabitatVideo>). <HabitatVideo> owns its own
// poster (the LCP candidate) and its own reduced-motion still.
//
// Phase 13.1-VIDEO-03: dev-only capture mount. The offline clip render pipeline
// (scripts/render-habitat-clips.mjs) needs the LIVE Three.js canvas to record.
// This is gated by `process.env.NODE_ENV !== "production"` so `next build`
// dead-code-eliminates the dynamic import — three.js never enters the
// PRODUCTION client bundle and real users always get <HabitatVideo>. It only
// mounts when the dev-only `?capture=video` flag is present (see captureMode).
const HabitatCanvasCapture =
  process.env.NODE_ENV !== "production"
    ? dynamic(() => import("@/components/habitat-3d-canvas"), { ssr: false })
    : null;

// ============================================================
// HabitatScene
// ============================================================

export function HabitatScene({
  habitatState,
  // D-09 repair: consume celebratingLevel on mount via lazy useState initializer.
  // The prop was previously prefixed with underscore to mark it unused — now wired.
  celebratingLevel = null,
}: {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}) {
  const reducedMotion = usePrefersReducedMotion();

  // D-09: lazy init fires on mount only — avoids the "prop-change never fires" pitfall.
  const [showCelebration, setShowCelebration] = useState(
    () => celebratingLevel != null && celebratingLevel > 0,
  );
  // D-07: auto-settle after 2500ms; mount-only effect (intentionally empty deps).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only — showCelebration is read from lazy init on mount; re-running on change would restart the timer incorrectly
  useEffect(() => {
    if (!showCelebration) return;
    const t = setTimeout(() => setShowCelebration(false), 2500);
    return () => clearTimeout(t);
  }, []); // intentionally empty — fires once on mount only

  const [state, setState] = useState<HabitatState>(habitatState);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  const prevLevelRef = useRef(habitatState.level);

  // Plan 13.1-VIDEO-03: dev-only — detect `?capture=video` to mount the live
  // canvas for the clip render pipeline. SSR-safe (defaults false; set after
  // mount, so no hydration mismatch). Tree-shaken in production.
  const [captureMode, setCaptureMode] = useState(false);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("capture") === "video"
    ) {
      setCaptureMode(true);
    }
  }, []);

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

  // Level tracking: keep prevLevelRef in sync (D-02 data layer untouched)
  useEffect(() => {
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
      // Try cached data with type guard validation
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        const parsed: unknown = cached ? JSON.parse(cached) : null;
        if (isValidHabitatState(parsed)) {
          setState(parsed);
          setOffline(true);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    }
  }

  // Error state (D-13/D-23): Daybreak-styled error + HBack header
  if (error) {
    return (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, #FFEAC0, #FFF6E8, #FBF0DB)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 3,
            padding: "8px 18px 0",
            flex: "none",
          }}
        >
          <HBack />
        </div>
        <div
          style={{
            ...WRAPPER_STYLE,
            position: "relative",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 28,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              fontWeight: 700,
              color: "#4A331C",
            }}
          >
            We couldn&rsquo;t load your habitat.
          </span>
          <span
            style={{
              fontSize: 14.5,
              color: "#9C8467",
              lineHeight: 1.5,
              maxWidth: 250,
            }}
          >
            Check your connection and try again.
          </span>
          <Button onClick={retry}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/*
        Phase 13.1-VIDEO-02:
          The aspect-ratio wrapper carries the intrinsic 16/9 size so CLS=0
          holds before anything paints. <HabitatVideo> renders its own poster
          (the LCP candidate) + the autoplaying ambient loop clip (or a static
          still under prefers-reduced-motion), both absolutely positioned
          inside this wrapper. The old SSR <Image> poster + dynamic Three.js
          canvas + canvasReady fade machinery are gone.
      */}
      <div
        className="w-full rounded-lg overflow-hidden"
        style={WRAPPER_STYLE}
        data-testid="habitat-scene-wrapper"
      >
        {/* Pre-rendered ambient loop clip (poster = LCP candidate). In dev
            capture mode we mount the live Three.js canvas instead so the clip
            render pipeline can record it (tree-shaken from production). */}
        {captureMode && HabitatCanvasCapture ? (
          <HabitatCanvasCapture habitatState={state} />
        ) : (
          <HabitatVideo habitatState={state} />
        )}

        {/* D-05 / D-11: mood tint — CSS sibling layer over the untouched decayFilter.
            position:absolute; inset:0; pointer-events:none so chrome stays clickable (Pitfall 6).
            zIndex 1 = above video, below chrome (HTop is z-3, cards are z-3). */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            background:
              state.level >= 9 && !state.isDecaying
                ? "radial-gradient(circle at 72% 26%, rgba(255,200,110,0.28), transparent 55%)"
                : moodTint(state.mood, state.isDecaying, state.level),
          }}
        />

        {/* D-13: Daybreak chrome — HTop (HBack | HMoodChip | HLevelBadge) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            zIndex: 2,
          }}
        >
          <HTop mood={state.mood} level={state.level} />

          {/* Bottom section: offline banner + cards */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* D-13: Daybreak offline banner */}
            {offline && (
              <div
                data-testid="habitat-offline-banner"
                style={{
                  margin: "4px 16px 0",
                  padding: "10px 14px",
                  borderRadius: 13,
                  background: "rgba(74,51,28,0.82)",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  flex: "none",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "2px solid #FFE0A8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFE0A8",
                    fontSize: 12,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  !
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#FFF6E9" }}
                >
                  You&rsquo;re offline &mdash; showing last known state.
                </span>
              </div>
            )}

            {/* D-03: "Motion paused" label for reduced-motion users (HabScreen line 94) */}
            {reducedMotion && (
              <div
                data-testid="habitat-motion-paused"
                style={{
                  position: "relative",
                  zIndex: 3,
                  alignSelf: "center",
                  marginBottom: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#9C8467",
                  background: "rgba(255,255,255,0.8)",
                  padding: "5px 12px",
                  borderRadius: 999,
                }}
              >
                &#9208; Motion paused
              </div>
            )}

            {/* D-10: bottom card switch — decay card when isDecaying, progress card otherwise */}
            {state.isDecaying ? (
              <HDecayCard />
            ) : (
              <HProgCard
                level={state.level}
                effectiveCardCount={state.effectiveCardCount}
                nextLevelThreshold={state.nextLevelThreshold}
              />
            )}
          </div>
        </div>

        {/* D-07/D-09: celebration overlay — absolute, above everything (zIndex 20) */}
        {showCelebration && celebratingLevel !== null && (
          <HabitatCelebration
            celebratingLevel={celebratingLevel}
            onSettle={() => setShowCelebration(false)}
          />
        )}
      </div>
    </div>
  );
}
