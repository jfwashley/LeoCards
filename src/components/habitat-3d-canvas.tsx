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
// setupGestureGate — Plan 13.1-02 (R3/R4)
// ---------------------------------------------------------------------------
//
// Defers Three.js canvas mount until the user produces a real input gesture
// on the page. Listens for pointerdown / touchstart / keydown / wheel on the
// document plus scroll on the window (scroll does not bubble from window to
// document in all browsers).
//
// Contract:
//   • `reducedMotion: true` → attach NO listeners; return a no-op cleanup.
//     `onGesture` is NEVER invoked. This is the hard lockout from Phase 13.1
//     SPEC R4.
//   • Otherwise → attach passive listeners; on the FIRST event fired, call
//     `onGesture()` exactly once and synchronously detach every listener so
//     subsequent events are dropped.
//
// Hard rule: gesture-only mount, no idle or timer fallbacks. Attempt #1 added
// an idle-callback fallback that fired inside Lighthouse's trace window and
// spiked TBT — see `13-PERF-FIX-ATTEMPT-1.md`. If the user never produces a
// gesture, the canvas never mounts; that is the CWV-pass contract.

export interface SetupGestureGateOpts {
  document: Document;
  window: Window;
  onGesture: () => void;
  reducedMotion: boolean;
}

const GESTURE_DOC_EVENTS = ["pointerdown", "touchstart", "keydown", "wheel"];
const GESTURE_WIN_EVENT = "scroll";

export function setupGestureGate(opts: SetupGestureGateOpts): () => void {
  const { document: doc, window: win, onGesture, reducedMotion } = opts;
  // R4 hard lockout: reduced-motion users never get a canvas, full stop.
  if (reducedMotion) return () => {};

  let fired = false;
  // Single shared handler — same identity for add/remove on every event.
  const handler: EventListener = (_e: Event) => {
    if (fired) return;
    fired = true;
    cleanup();
    onGesture();
  };

  const cleanup = () => {
    for (const ev of GESTURE_DOC_EVENTS) {
      doc.removeEventListener?.(ev, handler);
    }
    win.removeEventListener?.(GESTURE_WIN_EVENT, handler);
  };

  for (const ev of GESTURE_DOC_EVENTS) {
    doc.addEventListener?.(ev, handler, { passive: true });
  }
  win.addEventListener?.(GESTURE_WIN_EVENT, handler, { passive: true });

  return cleanup;
}

// ---------------------------------------------------------------------------
// setupHintTimer — Plan 13.1-03 (R5)
// ---------------------------------------------------------------------------
//
// Schedules the "Tap to animate" mount-hint to appear 2000 ms after the
// poster paints, IFF the user has not gestured and is not reduced-motion.
// Pure factory so the timer logic is testable in the project's node-env
// Vitest (no jsdom). The React `useEffect` in <HabitatCanvas> delegates to
// this factory.
//
// Hard rule: the hint timer is visibility-only. It MUST NOT call
// `setCanvasMounted` / `setGestured` / `mountHabitatScene`. Test H6 pins
// this via source-grep on the factory body. The gesture gate (Plan 02) is
// the only path that mounts the canvas.

export const HINT_COPY = "Tap to animate";
export const HINT_DELAY_MS = 2000;

export interface SetupHintTimerOpts {
  reducedMotion: boolean;
  canvasMounted: boolean;
  delayMs: number;
  setHintVisible: (v: boolean) => void;
}

export function setupHintTimer(opts: SetupHintTimerOpts): () => void {
  const { reducedMotion, canvasMounted, delayMs, setHintVisible } = opts;
  // R4 hard lockout: reduced-motion users never see a hint.
  if (reducedMotion) return () => {};
  // Canvas already mounted: no need to advertise the gesture gate.
  if (canvasMounted) return () => {};
  const id = setTimeout(() => {
    setHintVisible(true);
  }, delayMs);
  return () => {
    clearTimeout(id);
  };
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
  /**
   * Plan 13.1-VIDEO-01 (dev-only capture mode): when true, the camera is
   * LOCKED (auto-orbit frozen via orbit `reducedMotion`) while AMBIENT
   * animation keeps RUNNING (world `updateWorld` is called with
   * reducedMotion=false). Used by the offline video-clip render pipeline to
   * bake looping ambient clips with a fixed, flattering camera angle. Has no
   * effect in production (the URL flag that sets it is NODE_ENV-gated).
   */
  captureVideo?: boolean;
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
  // Plan 13.1-VIDEO-01: in capture-video mode the camera is locked (auto-orbit
  // frozen) but ambient motion still runs. We freeze the orbit by passing
  // reducedMotion:true to attachOrbit ONLY; the world's updateWorld is called
  // below with the live (non-frozen) reducedMotion so ambient keeps animating.
  const captureVideo = opts.captureVideo === true;
  const orbitReducedMotion = captureVideo ? true : reducedMotion;
  const orbit = attachOrbit(canvas, ctx.camera, {
    reducedMotion: orbitReducedMotion,
  });

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

    // Plan 13.1-VIDEO-01: capture-video mode forces ambient ON (reducedMotion
    // false) even if the OS prefers reduced motion — the baked clip must show
    // breathing/blinking/butterflies/water shimmer. Production paths are
    // unaffected (captureVideo is only set via a NODE_ENV-gated URL flag).
    const worldReducedMotion = captureVideo ? false : reducedMotion;
    updateWorld(world, dt, now / 1000, { reducedMotion: worldReducedMotion });
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
  /**
   * Phase 13.1-04: parent (HabitatScene) owns the SSR poster and needs to fade
   * it out the moment the Three.js canvas signals data-ready. Optional so
   * existing tests and the snapshot-mode harness keep working.
   */
  onCanvasReady?: () => void;
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

// Dev-only snapshot-mode escape hatch: when `?snapshot=true` is on the URL we
// bypass BOTH the gesture gate and the reduced-motion lockout so deterministic
// e2e capture (Plan 04 mood/decay baselines) still works. NODE_ENV !== "production"
// gate → tree-shaken from production bundles.
function readSnapshotMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("snapshot") === "true";
}

// Plan 13.1-VIDEO-01 dev-only capture-mode reader. `?capture=video` (alongside
// `?snapshot=true`) locks the camera + keeps ambient running so the offline
// render pipeline can bake looping clips. NODE_ENV-gated → tree-shaken from
// production bundles, never affects real users.
function readCaptureVideoMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("capture") === "video";
}

export default function HabitatCanvas({
  habitatState,
  // celebratingLevel is plumbed for API parity with the v1.0 PixiJS canvas;
  // Plan 03 does not bind level-up celebration to the 3D scene yet (the
  // overlay lives in `habitat-scene.tsx`).
  celebratingLevel: _celebratingLevel = null,
  onCanvasReady,
}: HabitatCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Apply dev URL override if present (snapshot mode for Plan 04 Playwright).
  const effectiveState = readDevOverride(habitatState);

  // Snapshot-mode escape hatch (dev-only, NODE_ENV-gated above): when set,
  // ignore the gesture gate AND reduced-motion lockout so Phase 13 e2e specs
  // capturing mood/decay baselines still mount the canvas deterministically.
  const snapshotMode = readSnapshotMode();

  // Plan 13.1-VIDEO-01: dev-only capture-video mode (camera locked, ambient on).
  const captureVideoMode = readCaptureVideoMode();

  // R3 gesture gate: canvas does NOT mount until the first user gesture.
  // R4 reduced-motion lockout: reducedMotion users never mount the canvas.
  // Snapshot mode (dev-only) forces immediate mount for deterministic capture.
  const [gestured, setGestured] = useState(false);
  const canvasMounted = snapshotMode || (!reducedMotion && gestured);

  // R5: subtle "Tap to animate" hint, fades in 2s after the poster paints.
  // Visibility is owned by the hint-timer effect below; it is cleared
  // automatically the moment `canvasMounted` flips true (the guard in the
  // JSX `&& !canvasMounted` makes the overlay vanish in the same render
  // pass that paints the canvas).
  const [hintVisible, setHintVisible] = useState(false);

  // Clamp level to [1, 9] — only level triggers a scene rebuild
  // (D-30 / designer's `tweaksRef` pattern). mood/quality flow via stateRef.
  const sceneLevel = Math.max(1, Math.min(9, Math.floor(effectiveState.level)));

  // Keep the latest state in a ref so the per-frame update closure can read
  // the current mood/quality without re-running the mount effect.
  const stateRef = useRef<HabitatState>(effectiveState);
  stateRef.current = effectiveState;

  // Plan 13-04: mood-anim state ref — survives Strict-Mode double-mount.
  const moodStateRef = useRef<MoodAnimState>({
    speedMul: 1.5,
    headDroop: 0,
    sparkleOn: false,
    bounceUntil: 0,
    prevMood: null,
  });

  // R3: attach the gesture gate once, only when the canvas is NOT already
  // mounted and reduced-motion is off. The gate fires `setGestured(true)` on
  // the first qualifying event, then detaches all listeners synchronously.
  // Gesture-only mount: no idle or timer fallback. Gestureless users stay on
  // the poster forever — that is the price of CWV pass.
  useEffect(() => {
    if (canvasMounted) return;
    if (reducedMotion) return;
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }
    const cleanup = setupGestureGate({
      document,
      window,
      onGesture: () => setGestured(true),
      reducedMotion: false,
    });
    return cleanup;
  }, [canvasMounted, reducedMotion]);

  // R5: hint-timer effect. Schedules `setHintVisible(true)` 2s after mount
  // IFF the user has not yet gestured and is not reduced-motion. Cleanup
  // (re-run on gesture / canvasMounted flip / reducedMotion change) cancels
  // the pending timer. The factory is pure — it MUST NOT mount the canvas.
  useEffect(() => {
    // Clear any stale hint state when the canvas mounts.
    if (canvasMounted) {
      setHintVisible(false);
      return;
    }
    return setupHintTimer({
      reducedMotion,
      canvasMounted,
      delayMs: HINT_DELAY_MS,
      setHintVisible,
    });
  }, [canvasMounted, reducedMotion]);

  // Mount the Three.js scene only once `canvasMounted` flips true.
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
      captureVideo: captureVideoMode,
    });
    // Phase 13.1-04: notify parent so it can fade its SSR poster out.
    // mountHabitatScene sets data-ready="true" synchronously before returning.
    onCanvasReady?.();
    return () => handle.dispose();
  }, [
    canvasMounted,
    sceneLevel,
    reducedMotion,
    onCanvasReady,
    captureVideoMode,
  ]);

  // Phase 13.1-04 SSR-POSTER-FIX:
  //   The SSR poster + the aspect-ratio sized outer wrapper now live in
  //   `<HabitatScene>` (parent). This component only paints the absolutely-
  //   positioned <canvas> + hint overlay layered ON TOP of the parent's
  //   poster. R6 (CLS=0) is preserved because the parent's wrapper already
  //   carries intrinsic dimensions in the initial SSR HTML.
  //
  //   R4 reduced-motion lockout: when reducedMotion is true (and snapshot
  //   mode is off), this component renders NOTHING — the parent's SSR
  //   poster is the full, accessible representation. No tabIndex, no key
  //   handler, no Three.js bundle is mounted.
  if (reducedMotion && !canvasMounted) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
      style={{
        position: "absolute",
        inset: 0,
      }}
    >
      {canvasMounted ? (
        <canvas
          ref={canvasRef}
          data-testid="habitat-3d-canvas"
          // Plan 13.1-VIDEO-01: expose the effective mood/level on the canvas so
          // the offline clip-render spec can assert the correct (level, mood)
          // was injected before capturing frames. Harmless static attributes in
          // production (they just reflect the live habitat state).
          data-mood={effectiveState.mood}
          data-level={sceneLevel}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            borderRadius: "0.5rem",
          }}
        />
      ) : null}
      {/* R5: subtle "Tap to animate" hint. Fades in 2s after the poster
          paints if no gesture detected. aria-hidden + pointerEvents:none
          so it cannot absorb input or imply interactivity to AT users; the
          parent's SSR poster (role="img"-equivalent via alt) labels the
          scene. The hint sits inside this absolute layer so it positions
          relative to the same wrapper the canvas will fill. */}
      {!reducedMotion && hintVisible && !canvasMounted ? (
        <div
          data-testid="habitat-canvas-hint"
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "8%",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            background: "rgba(0,0,0,0.55)",
            color: "white",
            fontSize: "0.75rem",
            pointerEvents: "none",
            opacity: 0.85,
            transition: "opacity 200ms ease-out",
          }}
        >
          {HINT_COPY}
        </div>
      ) : null}
    </div>
  );
}
