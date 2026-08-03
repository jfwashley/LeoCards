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
//     poster <img> — no autoplaying motion for reduced-motion users. The
//     scene's "Motion paused" pill (habitat-scene.tsx) can set `forceMotion`
//     to opt back into motion explicitly (2026-08-03): the prop neutralises
//     the media query here, so the full normal pipeline (autoplay, recovery,
//     freeze tier) applies while it is on.
//   • Autoplay recovery: browsers pause silent autoplaying videos on their own
//     (hidden-tab optimisation, OS sleep/wake) and strict autoplay policies
//     block them outright — none of which auto-recovers reliably, leaving a
//     frozen still until reload. visibilitychange + first-gesture listeners
//     retry play(). Incidental gestures never resume the designed D-03/D-04
//     freeze — only an explicit tap on the scene (Option 3, 2026-08-03) or a
//     tab return wakes it for another ~10s cycle.
//   • CLS=0: the parent wrapper (habitat-scene.tsx) carries the intrinsic
//     16/9 size; the video/still are `position:absolute; inset:0` inside it.

import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
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

export function HabitatVideo({
  habitatState,
  forceMotion = false,
}: {
  habitatState: HabitatState;
  forceMotion?: boolean;
}) {
  const { level, mood, quality } = habitatState;
  const prefersReducedMotion = usePrefersReducedMotion();
  // An explicit user opt-in (the scene's "Motion paused" toggle) overrides the
  // media query; everything downstream keys off the effective value.
  const reducedMotion = prefersReducedMotion && !forceMotion;

  // D-03/D-04 freeze tier + autoplay recovery — attach ref to <video>.
  const videoRef = useRef<HTMLVideoElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: level+mood intentionally added even though not read in body — <video key={clipBasename(level,mood)}> remounts on changes; deps force re-bind to new node (WR-01)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    let freezeTimer: ReturnType<typeof setTimeout> | null = null;
    // True only while the D-03/D-04 freeze tier has paused the video ON
    // PURPOSE. Distinguishes "we froze it" from browser-initiated pauses
    // (hidden-tab silent-video optimisation, OS sleep/wake, autoplay-policy
    // block) so the recovery listeners below never undo the designed freeze.
    let frozenByDesign = false;
    // Mirrors the latest IntersectionObserver callback; desktop has no
    // observer and is always eligible to play (D-03: keep looping).
    let inView = !isMobile;

    const freeze = () => {
      freezeTimer = null; // null out after firing so the guard reflects reality (WR-02)
      frozenByDesign = true;
      video.pause();
    };
    const scheduleFreeze = () => {
      if (freezeTimer !== null) clearTimeout(freezeTimer);
      freezeTimer = setTimeout(freeze, 10_000); // ~2 loops (D-04: tuning knob)
    };

    // Single playback entry point. Gate scheduleFreeze on successful play so a
    // rejected autoplay-policy promise doesn't arm a freeze timer against a
    // never-started video (WR-02). Rejection is not terminal: the visibility
    // and gesture listeners below retry (Pitfall 3, T-24-03-PLAY).
    const tryPlay = () => {
      frozenByDesign = false;
      video
        .play()
        .then(isMobile ? scheduleFreeze : undefined)
        .catch(() => {});
    };

    let observer: IntersectionObserver | null = null;
    if (isMobile) {
      observer = new IntersectionObserver(
        ([entry]) => {
          inView = entry?.isIntersecting ?? false;
          if (inView) {
            tryPlay();
          } else {
            if (freezeTimer !== null) {
              clearTimeout(freezeTimer);
              freezeTimer = null;
            } // null out so guard stays accurate (WR-02)
            video.pause(); // offscreen: pause immediately
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(video);
    }

    // Recovery 1 — tab shown again (also fires after OS sleep/wake). Browsers
    // pause silent autoplaying videos in hidden tabs and their auto-resume can
    // be dropped; without this the clip stays a frozen still until reload.
    // Returning to the tab counts as a fresh viewing session, so a designed
    // freeze is re-armed too (same semantics as scrolling away and back).
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !inView) return;
      tryPlay();
    };

    // Recovery 2 — first user gesture. Strict autoplay policies (enterprise
    // AutoplayAllowed=false, blocker extensions) reject play() until a gesture
    // grants transient activation; pointerdown/keydown carry it. Must NOT
    // resume the designed freeze — waking it is the scene tap's job below.
    const onGesture = () => {
      if (!video.paused || frozenByDesign || !inView) return;
      tryPlay();
    };

    // Option 3 (2026-08-03): resume-on-tap — a tap on the habitat scene wakes
    // a DESIGNED freeze for another ~10s cycle. `click`, not pointerdown, so a
    // touch-scroll that merely starts on the scene never wakes it; scoped to
    // the video's rect and to non-interactive targets so buttons/links inside
    // the scene chrome keep their own meaning.
    const onSceneClick = (e: MouseEvent) => {
      if (!frozenByDesign || !video.paused || !inView) return;
      const target = e.target as Element | null;
      if (
        target?.closest("button, a, input, select, textarea, [role='button']")
      )
        return;
      const r = video.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        return;
      tryPlay();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    window.addEventListener("click", onSceneClick);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("click", onSceneClick);
      if (freezeTimer !== null) clearTimeout(freezeTimer);
    };
  }, [reducedMotion, level, mood]);

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
        ref={videoRef}
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
