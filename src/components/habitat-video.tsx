"use client";

// habitat-video.tsx — Phase 13.1 Plan VIDEO-02.
//
// The user-facing /habitat scene now plays a PRE-RENDERED ambient loop clip
// (baked build-time from the live Three.js canvas in Plan VIDEO-01) instead of
// mounting a live WebGL scene. This is the client half of the three.js → video
// migration: after this component ships, NOTHING in client code imports
// `habitat-3d-canvas.tsx` or `src/lib/habitat-3d/*`, so three.js (~504 KB)
// leaves the client bundle entirely.
//
// Design:
//   • Clip selection: `l${level}-${mood}` (level clamped to [1,9]). 36 baked
//     pairs cover every level × mood. webm (VP9) first, mp4 (H.264) fallback.
//   • Poster: `hero-l${level}.webp` — the SAME instant LCP candidate the SSR
//     poster played before. The <video poster> shows it until the first frame
//     decodes; under reduced-motion it IS the whole experience (no autoplay).
//   • Decay overlay: a CSS `filter` derived from `quality` desaturates + dims
//     the world as it decays (a neglected tiger's habitat looks washed-out and
//     cold). Filter-only → zero layout impact, CLS=0.
//   • Reduced-motion: SSR-safe. Server + first client render emit the <video>
//     markup (so there is never CLS and the markup is deterministic); after
//     mount, if `prefers-reduced-motion: reduce` matches, swap to the still
//     poster <img> — no autoplaying motion for reduced-motion users.
//   • CLS=0: the parent wrapper (habitat-scene.tsx) carries the intrinsic
//     16/9 size; the video/still are `position:absolute; inset:0` inside it.

import Image from "next/image";
import { useEffect, useState } from "react";
import type { HabitatState } from "@/lib/habitat-engine";

// ---------------------------------------------------------------------------
// Pure helpers (exported for node-env Vitest — no jsdom in this repo)
// ---------------------------------------------------------------------------

/** Clamp a habitat level into the renderable [1,9] band. */
export function clampLevel(level: number): number {
  return Math.max(1, Math.min(9, Math.floor(level)));
}

/**
 * Baked-clip basename for a given level × mood, e.g. `l5-happy`.
 * Matches `public/habitat/clips/l{N}-{mood}.{webm,mp4}` (Plan VIDEO-01).
 */
export function clipBasename(
  level: number,
  mood: HabitatState["mood"],
): string {
  return `l${clampLevel(level)}-${mood}`;
}

/** Poster path for a level — the LCP candidate (Plan 04 hero images). */
export function posterSrc(level: number): string {
  return `/habitat/hero-l${clampLevel(level)}.webp`;
}

/** webm source URL (preferred). */
export function webmSrc(level: number, mood: HabitatState["mood"]): string {
  return `/habitat/clips/${clipBasename(level, mood)}.webm`;
}

/** mp4 source URL (fallback). */
export function mp4Src(level: number, mood: HabitatState["mood"]): string {
  return `/habitat/clips/${clipBasename(level, mood)}.mp4`;
}

/**
 * Decay filter derived from `quality` (0.1 – 1.0).
 *
 * quality 1.0 → no change (`none`). As quality drops toward the 0.1 floor the
 * world progressively desaturates and dims so a neglected habitat reads as
 * washed-out / cold without becoming unreadable:
 *
 *   saturate(q)              — full colour at 1.0 → 10 % colour at the floor
 *   brightness(0.6 + 0.4·q)  — full brightness at 1.0 → 0.64 at the floor
 *
 * `q` is clamped to [0.1, 1.0] to match the engine's DECAY_FLOOR. Returns a
 * valid CSS `filter` string; never affects layout (filter-only).
 */
export function decayFilter(quality: number): string {
  const q = Math.max(0.1, Math.min(1, quality));
  if (q >= 0.999) return "none";
  const sat = q.toFixed(3);
  const bright = (0.6 + 0.4 * q).toFixed(3);
  return `saturate(${sat}) brightness(${bright})`;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// ---------------------------------------------------------------------------
// usePrefersReducedMotion — SSR-safe (defaults false on server + first render)
// ---------------------------------------------------------------------------

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// HabitatVideo
// ---------------------------------------------------------------------------

const FILL_STYLE = {
  position: "absolute" as const,
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  display: "block" as const,
};

export function HabitatVideo({ habitatState }: { habitatState: HabitatState }) {
  const { level, mood, quality } = habitatState;
  const reducedMotion = usePrefersReducedMotion();

  const filter = decayFilter(quality);
  const poster = posterSrc(level);
  const altLevel = clampLevel(level);

  // Phase 13.1-VIDEO-03 LCP FIX: the poster is ALWAYS rendered as an explicit
  // `next/image priority` (bottom layer). `priority` emits a `<link rel=preload
  // as=image>` in <head>, making the ~4 KB webp the unambiguous, prioritised LCP
  // candidate that paints immediately — independent of video load. The old
  // `<video poster>` attribute gave NO preload and Lighthouse reported "LCP
  // element: none" (LCP got gated behind hydration → ~3 s on mobile).
  //
  // The poster sits permanently underneath; the autoplaying clip (top layer,
  // later in DOM) simply covers it once frames decode. `preload="metadata"`
  // (not "auto") keeps the clip from competing with the poster for the Slow-4G
  // LCP-window bandwidth. Under reduced-motion the clip is omitted entirely and
  // the poster IS the experience.
  const Poster = (
    <Image
      src={poster}
      alt={`Tiger habitat level ${altLevel}`}
      fill
      unoptimized
      priority
      sizes="(max-width: 768px) 100vw, 720px"
      data-testid="habitat-video-still"
      style={{ objectFit: "cover", filter }}
    />
  );

  if (reducedMotion) {
    return Poster;
  }

  return (
    <>
      {Poster}
      <video
        key={clipBasename(level, mood)}
        data-testid="habitat-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={`Tiger habitat level ${altLevel}`}
        style={{ ...FILL_STYLE, filter }}
      >
        <source src={webmSrc(level, mood)} type="video/webm" />
        <source src={mp4Src(level, mood)} type="video/mp4" />
      </video>
    </>
  );
}
