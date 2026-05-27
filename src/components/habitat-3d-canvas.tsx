"use client";

// habitat-3d-canvas.tsx — Plan 13-03 (R1/R2/R3/R4/R5/R6).
//
// First user-visible 3D delivery. Mounts a Three.js scene via
// `buildSceneHost` + `buildClayWorld`, attaches the hand-rolled azimuth-only
// orbit, runs a single RAF loop, and disposes everything cleanly on
// unmount (React Strict-Mode-safe).
//
// Design notes:
//   • `mountHabitatScene()` is a pure factory (no React) — testable in the
//     project's node-env Vitest the same way `attachOrbit` is tested in
//     `scene-host.test.ts`. The React shell is a thin wrapper that calls
//     this factory inside `useEffect`.
//   • Only `level` triggers a scene rebuild (`structKey`). `mood`/`quality`
//     flow into the per-frame update closure via `stateRef` (Plan 04 binds
//     these to materials).
//   • R4 (D-26): drag-only orbit; scroll wheel + right-click do NOTHING.
//     The `attachOrbit` import is azimuth-only by construction (no
//     OrbitControls); we additionally cancel `wheel` and `contextmenu`
//     events on the canvas as belt-and-braces.
//   • R5: ArrowLeft / ArrowRight nudge theta on the wrapper div.
//   • R6: `prefers-reduced-motion: reduce` is plumbed into `attachOrbit`
//     (freezes auto-orbit) and into `updateWorld` (freezes ambient).
//   • Dev-only `window.__habitatCameraPos` and `window.__habitatSetTheta`
//     hooks are attached in non-production builds for Playwright (Plan 03)
//     and the hero-image build script (Plan 06).
//   • WebGL context loss is handled per RESEARCH section E.2: cancel RAF +
//     flip `data-ready` to "false" on loss; restart RAF + restore
//     `data-ready` on restore.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import {
  animateElephant,
  applyLionWalk,
  type LionState,
  updateWorld,
} from "@/lib/habitat-3d/clay-animation";
import {
  buildElephant,
  buildLionStorybook,
} from "@/lib/habitat-3d/clay-characters";
import { featuresForLevel, LEVEL_CONFIG } from "@/lib/habitat-3d/clay-level";
import { buildClayWorld } from "@/lib/habitat-3d/clay-world";
import {
  applyDecay,
  applyMood,
  type MoodAnimState,
} from "@/lib/habitat-3d/mood-decay";
import { attachOrbit, buildSceneHost } from "@/lib/habitat-3d/scene-host";
import type { HabitatState } from "@/lib/habitat-engine";

// ---------------------------------------------------------------------------
// Plan 13.1 Opt 1 — defer Three.js init past LCP.
//
// On /habitat we render `public/habitat/widget-l{N}.webp` as the initial LCP
// element via next/image. The live Three.js canvas mounts only after BOTH
//   (a) the viewport is reached (IntersectionObserver), AND
//   (b) the main thread is idle (requestIdleCallback / 200ms fallback) OR a
//       user gesture fires (pointerdown / keydown / scroll).
// Then we fade the poster out over ≤200ms and reveal the canvas.
//
// For users whose system asks for reduced motion AND who are on a mobile
// form-factor, we never mount the canvas — the poster is the experience.
// Desktop reduced-motion users still get the canvas with the auto-orbit
// frozen (Plan 04 behavior preserved).
//
// All deferral logic lives in the React shell; the pure `mountHabitatScene`
// factory below is unchanged so unit tests + Playwright + screenshot specs
// continue to drive it the same way.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// matchMedia stub plumbing (test-only)
// ---------------------------------------------------------------------------
//
// `usePrefersReducedMotion` reads `window.matchMedia` in the browser. In
// node-env tests we expose a stub setter so the React hook can be exercised
// deterministically. Plan 03 Task 1 Test 6 / Test 8 use these.

type MatchMediaLike = {
  matches: boolean;
  media: string;
  addEventListener?: (t: string, l: (e: MediaQueryListEvent) => void) => void;
  removeEventListener?: (
    t: string,
    l: (e: MediaQueryListEvent) => void,
  ) => void;
};
let __matchMediaStub: ((q: string) => MatchMediaLike) | null = null;
export function __setMatchMediaStub(fn: (q: string) => MatchMediaLike): void {
  __matchMediaStub = fn;
}
export function __resetMatchMediaStub(): void {
  __matchMediaStub = null;
}

function readMatchMedia(query: string): MatchMediaLike | null {
  if (__matchMediaStub) return __matchMediaStub(query);
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null;
  }
  return window.matchMedia(query) as unknown as MatchMediaLike;
}

// ---------------------------------------------------------------------------
// usePrefersReducedMotion — RESEARCH Example 2
// ---------------------------------------------------------------------------

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = readMatchMedia("(prefers-reduced-motion: reduce)");
    if (!mql) return;
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// mountHabitatScene — pure factory (no React)
// ---------------------------------------------------------------------------

export interface MountHabitatSceneOpts {
  canvas: HTMLCanvasElement;
  wrapper: HTMLDivElement;
  habitatState: HabitatState;
  reducedMotion: boolean;
  /**
   * Width/height override for tests / hero-image builds. Production reads
   * `wrapper.clientWidth/Height` (which is 0 in jsdom but accepted in real
   * DOM).
   */
  width?: number;
  height?: number;
  /**
   * Plan 13-04: per-frame state ref. Lets the canvas read the latest
   * mood/quality without remounting the scene (only `level` triggers a
   * rebuild). If omitted, the initial habitatState is used for every frame.
   */
  stateRef?: { current: HabitatState };
  /**
   * Plan 13-04: per-frame mood-animation state. Persists D-06 transition
   * channels across frames. The React shell owns the ref so it survives
   * Strict-Mode double-mount.
   */
  moodStateRef?: { current: MoodAnimState };
}

export interface MountedHabitatScene {
  /** Idempotent teardown: cancels RAF, removes listeners, disposes GL. */
  dispose: () => void;
}

const KEY_NUDGE = 0.12 * 0.016; // autoSpeed × 16ms ≈ one frame of auto-orbit

export function mountHabitatScene(
  opts: MountHabitatSceneOpts,
): MountedHabitatScene {
  const { canvas, wrapper, habitatState, reducedMotion } = opts;

  const w = opts.width ?? (wrapper.clientWidth || 960);
  const h = opts.height ?? (wrapper.clientHeight || 540);

  // -- 1. scene host + world + orbit -----------------------------------------
  const ctx = buildSceneHost(canvas, w, h, {});
  const level = Math.max(1, Math.min(9, Math.floor(habitatState.level)));
  const features = featuresForLevel(level);
  const cfg = LEVEL_CONFIG[level] ??
    LEVEL_CONFIG[1] ?? { sky: "default" as const };
  const world = buildClayWorld(ctx, features, { sky: cfg.sky });
  const orbit = attachOrbit(canvas, ctx.camera, { reducedMotion });

  // -- 1b. characters (Plan 13-04: required for applyMood to bind to Leo) ----
  // buildLionStorybook returns a rig; we mount its root into ctx.scene so it
  // renders. The elephant is L5+ only (per LEVEL_CONFIG.elephant).
  const lionRig = buildLionStorybook(world.mat);
  ctx.scene.add(lionRig.root);
  const elephantRig = level >= 5 ? buildElephant(world.mat) : null;
  if (elephantRig) {
    elephantRig.position.set(4.5, 0, 3.5);
    ctx.scene.add(elephantRig);
  }
  // Expose rigs + fog on the world ref so mood-decay can find them.
  (world as unknown as { lionRig: typeof lionRig }).lionRig = lionRig;
  if (elephantRig) {
    (world as unknown as { elephantRig: typeof elephantRig }).elephantRig =
      elephantRig;
  }
  if (ctx.scene.fog) {
    (world as unknown as { fog: THREE.Fog }).fog = ctx.scene.fog as THREE.Fog;
  }
  (world as unknown as { sky: typeof world.skyMat }).sky = world.skyMat;

  // Lion + mood state (Plan 13-04).
  const lionState: LionState = {
    u: 0,
    speedMul: 1.5,
    sleeping: false,
    wasSleeping: false,
  };
  const moodState: MoodAnimState = opts.moodStateRef?.current ?? {
    speedMul: 1.5,
    headDroop: 0,
    sparkleOn: false,
    bounceUntil: 0,
    prevMood: null,
  };
  if (opts.moodStateRef) opts.moodStateRef.current = moodState;

  // -- 2. wrapper keyboard handler (R5) --------------------------------------
  wrapper.tabIndex = 0;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      orbit.nudgeTheta(-KEY_NUDGE);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      orbit.nudgeTheta(KEY_NUDGE);
      e.preventDefault();
    }
  };
  wrapper.addEventListener("keydown", onKey);

  // -- 3. R4 belt-and-braces: cancel scroll-zoom + right-click ---------------
  const onWheel = (e: Event) => e.preventDefault();
  const onContextMenu = (e: Event) => e.preventDefault();
  canvas.addEventListener?.("wheel", onWheel, { passive: false });
  canvas.addEventListener?.("contextmenu", onContextMenu);

  // -- 4. RAF loop + WebGL context-loss handling -----------------------------
  const disposedRef = { current: false };
  let raf = 0;
  let last =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const tick = (now: number) => {
    if (disposedRef.current) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    orbit.tick(dt);

    // Plan 13-04: per-frame mood + decay binding (no scene rebuild).
    const liveState = opts.stateRef?.current ?? habitatState;
    applyMood(world, liveState.mood, moodState, now);
    applyDecay(world, liveState.quality);
    lionState.speedMul = moodState.speedMul;

    updateWorld(world, dt, now / 1000, { reducedMotion });
    applyLionWalk(lionRig, world.lionCurve, dt, now / 1000, lionState);

    // Apply mood-driven head-droop and bounce on top of the walk driver.
    const droop = (lionRig.headG.userData.moodDroop as number | undefined) ?? 0;
    lionRig.headG.rotation.x += droop;
    const bounce =
      (lionRig.root.userData.moodBounce as number | undefined) ?? 0;
    lionRig.root.position.y += bounce;

    if (elephantRig) {
      animateElephant(elephantRig, dt, now / 1000);
    }

    ctx.renderer.render(ctx.scene, ctx.camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // Signal "ready" for screenshot tooling + e2e (R7, used by Plan 03 spec).
  canvas.setAttribute("data-ready", "true");

  const onLost = (e: Event) => {
    e.preventDefault();
    if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
    canvas.setAttribute("data-ready", "false");
  };
  const onRestored = () => {
    last = typeof performance !== "undefined" ? performance.now() : Date.now();
    raf = requestAnimationFrame(tick);
    canvas.setAttribute("data-ready", "true");
  };
  canvas.addEventListener?.("webglcontextlost", onLost);
  canvas.addEventListener?.("webglcontextrestored", onRestored);

  // -- 5. dev-only test affordances (R7 / Plan 06 hero-image) ----------------
  // process.env.NODE_ENV is the standard Next.js convention; the check is
  // tree-shaken in production bundles.
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__habitatCameraPos = () => ({
      x: ctx.camera.position.x,
      y: ctx.camera.position.y,
      z: ctx.camera.position.z,
      theta: orbit.getTheta?.() ?? 0,
    });
    (window as unknown as Record<string, unknown>).__habitatSetTheta = (
      n: number,
    ) => {
      orbit.setTheta?.(n);
    };
  }

  // -- 6. dispose ------------------------------------------------------------
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposedRef.current = true;
    if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
    wrapper.removeEventListener("keydown", onKey);
    canvas.removeEventListener?.("wheel", onWheel);
    canvas.removeEventListener?.("contextmenu", onContextMenu);
    canvas.removeEventListener?.("webglcontextlost", onLost);
    canvas.removeEventListener?.("webglcontextrestored", onRestored);
    orbit.dispose();
    world.dispose?.();
    // Traverse + dispose geometries/materials (designer pattern).
    ctx.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      const g = (o as THREE.Mesh).geometry;
      if (g && typeof g.dispose === "function") g.dispose();
      if (Array.isArray(m)) {
        for (const mm of m) mm.dispose?.();
      } else if (m && typeof (m as THREE.Material).dispose === "function") {
        (m as THREE.Material).dispose();
      }
    });
    if (typeof ctx.renderer.dispose === "function") ctx.renderer.dispose();
    if (isDev && typeof window !== "undefined") {
      delete (window as unknown as Record<string, unknown>).__habitatCameraPos;
      delete (window as unknown as Record<string, unknown>).__habitatSetTheta;
    }
  };

  return { dispose };
}

// ---------------------------------------------------------------------------
// React component (default export — consumed by `next/dynamic`)
// ---------------------------------------------------------------------------

export interface HabitatCanvasProps {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}

// Dev-only URL override (Plan 13-04 Task 3 snapshot affordance).
// Gated by NODE_ENV — tree-shaken in production.
function readDevOverride(initial: HabitatState): HabitatState {
  if (process.env.NODE_ENV === "production") return initial;
  if (typeof window === "undefined") return initial;
  const params = new URLSearchParams(window.location.search);
  if (params.get("snapshot") !== "true") return initial;
  const lvl = params.get("devLevel");
  const mood = params.get("devMood");
  const q = params.get("devQuality");
  return {
    ...initial,
    level: lvl
      ? Math.max(1, Math.min(9, parseInt(lvl, 10) || 1))
      : initial.level,
    mood:
      mood === "excited" ||
      mood === "happy" ||
      mood === "neutral" ||
      mood === "sad"
        ? mood
        : initial.mood,
    quality: q ? Math.max(0, Math.min(1, parseFloat(q))) : initial.quality,
  };
}

// ---------------------------------------------------------------------------
// Plan 13.1 Opt 1 — mobile-form-factor detection (test-overridable)
// ---------------------------------------------------------------------------
//
// The "static-poster-only" reduced-motion path applies ONLY when the user
// is on a mobile form factor AND prefers reduced motion. Desktop reduced-
// motion users still get the canvas (Plan 04 behavior: auto-orbit frozen).

let __mobileStub: (() => boolean) | null = null;
export function __setMobileStub(fn: () => boolean): void {
  __mobileStub = fn;
}
export function __resetMobileStub(): void {
  __mobileStub = null;
}

function isMobileFormFactor(): boolean {
  if (__mobileStub) return __mobileStub();
  if (typeof window === "undefined") return false;
  // Heuristic: viewport < 768px OR coarse pointer (touch device).
  if (window.innerWidth < 768) return true;
  if (typeof window.matchMedia === "function") {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  }
  return false;
}

export default function HabitatCanvas({
  habitatState,
  // celebratingLevel is plumbed for API parity with the v1.0 PixiJS canvas;
  // Plan 03 does not bind level-up celebration to the 3D scene yet (the
  // overlay lives in `habitat-scene.tsx`).
  celebratingLevel: _celebratingLevel = null,
}: HabitatCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Plan 13.1 Opt 1: gate canvas mount on viewport + idle/gesture.
  const [canvasMounted, setCanvasMounted] = useState(false);
  const [posterHidden, setPosterHidden] = useState(false);

  // Apply dev URL override if present (snapshot mode for Plan 04 Playwright).
  const effectiveState = readDevOverride(habitatState);

  // Clamp level to [1, 9] — only level + reducedMotion trigger a scene
  // rebuild (D-30 / designer's `tweaksRef` pattern at
  // `habitat-clay-styles.jsx:2258`). mood/quality intentionally omitted —
  // Plan 04 binds them via stateRef without rebuilding.
  const sceneLevel = Math.max(1, Math.min(9, Math.floor(effectiveState.level)));

  // Keep the latest state in a ref so the per-frame update closure can read
  // the current mood/quality without re-running the mount effect.
  const stateRef = useRef<HabitatState>(effectiveState);
  stateRef.current = effectiveState;

  // Plan 13-04: mood-anim state ref — survives Strict-Mode double-mount and
  // multi-canvas scenarios because each <HabitatCanvas> instance owns its own.
  const moodStateRef = useRef<MoodAnimState>({
    speedMul: 1.5,
    headDroop: 0,
    sparkleOn: false,
    bounceUntil: 0,
    prevMood: null,
  });

  // -- Plan 13.1 Opt 1: viewport + idle/gesture gate -----------------------
  //
  // We do NOT mount the canvas until BOTH the wrapper is intersecting AND
  // either requestIdleCallback fires or a user gesture is detected. Mobile +
  // reduced-motion users skip the canvas entirely.
  //
  // biome-ignore lint/correctness/useExhaustiveDependencies: reducedMotion gates the effect re-run; sceneLevel triggers remount via downstream effect
  useEffect(() => {
    if (!wrapperRef.current) return;

    // Mobile + reduced-motion → never mount the canvas; poster IS the
    // experience for the entire session.
    const mobile = isMobileFormFactor();
    if (reducedMotion && mobile) {
      return;
    }

    const target = wrapperRef.current;
    let gestureBound = false;
    let idleScheduled = false;
    let viewportSeen = false;
    let cleaned = false;

    const cleanup: Array<() => void> = [];

    const tryMount = () => {
      if (cleaned) return;
      if (!viewportSeen) return;
      cleaned = true;
      for (const fn of cleanup) fn();
      setCanvasMounted(true);
    };

    // (a) viewport gate.
    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              viewportSeen = true;
              tryMount();
            }
          }
        },
        { threshold: 0.01 },
      );
      io.observe(target);
      cleanup.push(() => io.disconnect());
    } else {
      viewportSeen = true;
    }

    // (b) idle OR gesture, whichever fires first.
    const onGesture = () => {
      tryMount();
    };
    const bindGestures = () => {
      if (gestureBound) return;
      gestureBound = true;
      window.addEventListener("pointerdown", onGesture, { once: true });
      window.addEventListener("keydown", onGesture, { once: true });
      window.addEventListener("scroll", onGesture, {
        once: true,
        passive: true,
      });
      cleanup.push(() => {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
        window.removeEventListener("scroll", onGesture);
      });
    };

    type IdleWindow = typeof window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout?: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      idleScheduled = true;
      const id = w.requestIdleCallback(() => tryMount(), { timeout: 1500 });
      cleanup.push(() => {
        if (typeof w.cancelIdleCallback === "function")
          w.cancelIdleCallback(id);
      });
    } else {
      const t = setTimeout(() => tryMount(), 200);
      idleScheduled = true;
      cleanup.push(() => clearTimeout(t));
    }

    // Bind gestures only if idle isn't immediate (still gives gesture-first
    // wakeup if the user touches the page before idle resolves).
    if (idleScheduled) bindGestures();

    return () => {
      cleaned = true;
      for (const fn of cleanup) fn();
    };
  }, [reducedMotion]);

  // -- Three.js mount/dispose effect (only runs once canvasMounted=true) ---
  //
  // biome-ignore lint/correctness/useExhaustiveDependencies: sceneLevel required to trigger remount on level change
  useEffect(() => {
    if (!canvasMounted) return;
    if (!canvasRef.current || !wrapperRef.current) return;
    const handle = mountHabitatScene({
      canvas: canvasRef.current,
      wrapper: wrapperRef.current,
      habitatState: stateRef.current,
      reducedMotion,
      stateRef,
      moodStateRef,
    });
    // Cross-fade: hide the poster shortly after the canvas mounts so it has
    // a chance to render its first frame.
    const fade = setTimeout(() => setPosterHidden(true), 50);
    return () => {
      clearTimeout(fade);
      handle.dispose();
      setPosterHidden(false);
    };
  }, [canvasMounted, sceneLevel, reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      className="w-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg relative"
      style={{ aspectRatio: "16/9", maxHeight: "min(70vh, 400px)" }}
      role="img"
      aria-label="Tiger habitat 3D scene"
    >
      {/*
       * Plan 13.1 Opt 1: static poster — primary LCP element.
       *
       * Sized via `fill` so it always matches the wrapper's box (zero CLS
       * when the canvas swaps in). `priority` marks it as the LCP candidate
       * so the browser fetches it eagerly. The hero images live at
       * public/habitat/widget-l{1..9}.webp (Plan 06 generated).
       */}
      <Image
        src={`/habitat/widget-l${sceneLevel}.webp`}
        alt={`Lion habitat level ${sceneLevel}`}
        fill
        preload
        sizes="(max-width: 768px) 100vw, 70vw"
        style={{
          objectFit: "cover",
          opacity: posterHidden ? 0 : 1,
          transition: "opacity 200ms ease-out",
          pointerEvents: "none",
        }}
        data-testid="habitat-3d-poster"
      />
      <canvas
        ref={canvasRef}
        data-testid="habitat-3d-canvas"
        data-mounted={canvasMounted ? "true" : "false"}
        style={{
          width: "100%",
          height: "100%",
          display: canvasMounted ? "block" : "none",
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  );
}
