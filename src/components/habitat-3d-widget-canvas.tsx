"use client";

// habitat-3d-widget-canvas.tsx — Plan 13-05 (R8 / D-28 live-3D arm).
//
// 80×80 Three.js dashboard widget. Reuses the SAME scene-graph modules as
// the full-page <HabitatCanvas> (no fork):
//
//   buildSceneHost  — same renderer/camera/scene scaffolding
//   buildClayWorld  — same island/lake/trees/etc
//   featuresForLevel — same per-level feature flags
//   buildLionStorybook — same Leo rig
//   applyMood       — same per-frame mood binding (R8 "mood-reactive")
//   updateWorld     — same ambient anim driver
//   applyLionWalk   — same walk cycle
//
// Differences from <HabitatCanvas>:
//
//   1. Smaller renderer (80×80 instead of viewport-scaled).
//   2. NO drag/touch/keyboard interaction. The parent <Link> in
//      habitat-widget.tsx owns the click-to-/habitat navigation per
//      Phase 5 D-16 — listeners on the inner canvas would intercept that
//      click. So we do NOT call `attachOrbit` (which registers
//      mousedown/touchstart) — we inline a minimal auto-orbit-only camera
//      driver.
//   3. Auto-orbit at HALF speed (0.06 rad/s vs 0.12) so the widget reads
//      as "ambient motion" rather than competing with the main canvas.
//   4. No HUD overlay — the parent <HabitatWidget> shell owns the level
//      badge + progress bar.
//   5. NO decay tint at 80px — too small to differentiate visually
//      (per plan's <action> step "widget: true ... drop decay reactivity").
//      Mood reactivity IS kept (lion walk speed / head droop) since those
//      animate the dominant visual element.
//
// Threats (Plan 13-05 register):
//   T-13-20 — second WebGL context: webglcontextlost handler hides the
//             canvas (display:none); parent progress bar remains visible.
//   T-13-21 — RAF leak on unmount: disposedRef + cancelAnimationFrame +
//             world.dispose + renderer.dispose + scene.traverse cleanup.
//   T-13-22 — info disclosure: nothing the parent doesn't already show.
//   T-13-23 — click bubbles to <Link> by design (D-16). No click listener.
//
// AGENTS.md: this is browser-only client code, reached via
// `dynamic({ ssr: false })` from habitat-widget.tsx. No Next.js API
// changes.

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import {
  applyLionWalk,
  type LionState,
  updateWorld,
} from "@/lib/habitat-3d/clay-animation";
import { buildLionStorybook } from "@/lib/habitat-3d/clay-characters";
import { featuresForLevel, LEVEL_CONFIG } from "@/lib/habitat-3d/clay-level";
import { buildClayWorld } from "@/lib/habitat-3d/clay-world";
import { applyMood, type MoodAnimState } from "@/lib/habitat-3d/mood-decay";
import { buildSceneHost } from "@/lib/habitat-3d/scene-host";
import type { HabitatState } from "@/lib/habitat-engine";

// ---------------------------------------------------------------------------
// matchMedia stub plumbing (test-only) — mirrors habitat-3d-canvas.tsx so the
// React hook can be exercised deterministically in node-env vitest. Public
// helpers prefixed `__` so consumers know they are test-only.
// ---------------------------------------------------------------------------

type MatchMediaLike = {
  matches: boolean;
  media: string;
  addEventListener?: (t: string, l: (e: MediaQueryListEvent) => void) => void;
  removeEventListener?: (
    t: string,
    l: (e: MediaQueryListEvent) => void,
  ) => void;
};
let __widgetMatchMediaStub: ((q: string) => MatchMediaLike) | null = null;
export function __setWidgetMatchMediaStub(
  fn: (q: string) => MatchMediaLike,
): void {
  __widgetMatchMediaStub = fn;
}
export function __resetWidgetMatchMediaStub(): void {
  __widgetMatchMediaStub = null;
}

function readMatchMedia(query: string): MatchMediaLike | null {
  if (__widgetMatchMediaStub) return __widgetMatchMediaStub(query);
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null;
  }
  return window.matchMedia(query) as unknown as MatchMediaLike;
}

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
// mountHabitatWidgetScene — pure factory (no React)
// ---------------------------------------------------------------------------

export interface MountHabitatWidgetSceneOpts {
  canvas: HTMLCanvasElement;
  wrapper: HTMLDivElement;
  habitatState: HabitatState;
  reducedMotion: boolean;
  /** Override the 80×80 default for tests. */
  size?: number;
  /** Auto-orbit angular velocity (rad/s). Default 0.06 = half of main canvas. */
  autoSpeed?: number;
  /**
   * Per-frame state ref. Lets the canvas read the latest mood without
   * remounting (only `level` triggers a scene rebuild). If omitted, the
   * initial habitatState is used for every frame.
   */
  stateRef?: { current: HabitatState };
  /**
   * Per-frame mood-animation state. Persists D-06 transition channels
   * across frames. The React shell owns the ref so it survives Strict-Mode
   * double-mount + the multi-canvas case (widget + main canvas mounted
   * concurrently — see T-13-20).
   */
  moodStateRef?: { current: MoodAnimState };
}

export interface MountedHabitatWidgetScene {
  /** Idempotent teardown: cancels RAF, removes listeners, disposes GL. */
  dispose: () => void;
  /** Read current camera azimuth — used by tests + parity with main canvas. */
  getTheta: () => number;
  /**
   * Test-only: advance the simulation by `dt` seconds without waiting for
   * a real RAF tick. Production code never calls this — the RAF loop runs
   * automatically.
   */
  tickForTest: (dt: number) => void;
}

const DEFAULT_WIDGET_SIZE = 80;
const DEFAULT_WIDGET_AUTOSPEED = 0.06; // half of main-canvas 0.12

export function mountHabitatWidgetScene(
  opts: MountHabitatWidgetSceneOpts,
): MountedHabitatWidgetScene {
  const { canvas, wrapper, habitatState, reducedMotion } = opts;

  const size = opts.size ?? DEFAULT_WIDGET_SIZE;
  const autoSpeed = opts.autoSpeed ?? DEFAULT_WIDGET_AUTOSPEED;

  // -- 1. scene host + world (REUSE — no fork) -------------------------------
  // Explicit isMobile:true so buildSceneHost picks the lower-poly quality
  // scalar (Q=0.55). Two WebGL contexts on one page is the threat T-13-20
  // worst case; keeping the widget cheap mitigates it pre-emptively.
  const ctx = buildSceneHost(canvas, size, size, { isMobile: true });
  // Set explicit pixel size on the canvas element so jsdom/screenshots and
  // CSS-sized layouts agree on geometry.
  canvas.width = size;
  canvas.height = size;
  // Pull the canvas out of layout flow nudges from focus rings.
  canvas.style.display = "block";

  const level = Math.max(1, Math.min(9, Math.floor(habitatState.level)));
  const features = featuresForLevel(level);
  const cfg = LEVEL_CONFIG[level] ??
    LEVEL_CONFIG[1] ?? { sky: "default" as const };
  const world = buildClayWorld(ctx, features, { sky: cfg.sky });

  // -- 1b. Leo rig (required so applyMood has a target) ----------------------
  const lionRig = buildLionStorybook(world.mat);
  ctx.scene.add(lionRig.root);
  (world as unknown as { lionRig: typeof lionRig }).lionRig = lionRig;
  if (ctx.scene.fog) {
    (world as unknown as { fog: THREE.Fog }).fog = ctx.scene.fog as THREE.Fog;
  }
  (world as unknown as { sky: typeof world.skyMat }).sky = world.skyMat;

  // -- 2. inline auto-orbit (NO drag listeners — D-16 click must bubble) -----
  //
  // We deliberately do NOT use `attachOrbit` here because it registers
  // `mousedown` + `touchstart` on the canvas, which would either steal the
  // parent <Link>'s click (D-16) or require attaching a `stopPropagation`
  // workaround the plan explicitly forbids. The widget needs only the
  // azimuth-rotation slice of attachOrbit; that's ~10 LOC.
  const camera = ctx.camera;
  const lookY = 1;
  const tx = 0;
  const ty = lookY;
  const tz = 0;
  let theta = Math.atan2(camera.position.x - tx, camera.position.z - tz);
  const radius = Math.hypot(camera.position.x - tx, camera.position.z - tz);
  const phi = Math.atan2(camera.position.y - ty, radius);
  const r3d = Math.hypot(radius, camera.position.y - ty);

  function applyOrbitPosition() {
    camera.position.x = tx + Math.cos(phi) * r3d * Math.sin(theta);
    camera.position.z = tx + Math.cos(phi) * r3d * Math.cos(theta);
    camera.position.y = ty + Math.sin(phi) * r3d;
    camera.lookAt(tx, ty, tz);
  }
  applyOrbitPosition();

  function advanceOrbit(dt: number) {
    if (reducedMotion) return;
    theta += autoSpeed * dt;
    applyOrbitPosition();
  }

  // -- 3. mood state ---------------------------------------------------------
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

  // -- 4. RAF loop -----------------------------------------------------------
  const disposedRef = { current: false };
  let raf = 0;
  let last =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  function runFrame(now: number, dt: number) {
    advanceOrbit(dt);
    // Mood reactivity (R8 "mood-reactive"). Decay intentionally NOT applied
    // — at 80px the material tint deltas are imperceptible and would only
    // burn GPU. Mood drives walk speed + head droop, which IS visible
    // even on the lion-only 80px crop.
    const liveState = opts.stateRef?.current ?? habitatState;
    applyMood(world, liveState.mood, moodState, now);
    lionState.speedMul = moodState.speedMul;
    updateWorld(world, dt, now / 1000, { reducedMotion });
    applyLionWalk(lionRig, world.lionCurve, dt, now / 1000, lionState);
    const droop = (lionRig.headG.userData.moodDroop as number | undefined) ?? 0;
    lionRig.headG.rotation.x += droop;
    const bounce =
      (lionRig.root.userData.moodBounce as number | undefined) ?? 0;
    lionRig.root.position.y += bounce;
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  const tick = (now: number) => {
    if (disposedRef.current) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    runFrame(now, dt);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  canvas.setAttribute("data-ready", "true");

  // -- 5. webgl context loss → hide canvas (T-13-20) -------------------------
  const onLost = (e: Event) => {
    e.preventDefault();
    if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
    canvas.setAttribute("data-ready", "false");
    canvas.style.display = "none";
  };
  const onRestored = () => {
    last = typeof performance !== "undefined" ? performance.now() : Date.now();
    canvas.style.display = "block";
    canvas.setAttribute("data-ready", "true");
    raf = requestAnimationFrame(tick);
  };
  canvas.addEventListener?.("webglcontextlost", onLost);
  canvas.addEventListener?.("webglcontextrestored", onRestored);

  // -- 6. wrapper is non-focusable — parent <Link> owns focus per D-16 -------
  wrapper.tabIndex = -1;

  // -- 7. dispose ------------------------------------------------------------
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposedRef.current = true;
    if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
    canvas.removeEventListener?.("webglcontextlost", onLost);
    canvas.removeEventListener?.("webglcontextrestored", onRestored);
    world.dispose?.();
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
  };

  return {
    dispose,
    getTheta: () => theta,
    tickForTest: (dt: number) => {
      const now = last + dt * 1000;
      last = now;
      runFrame(now, dt);
    },
  };
}

// ---------------------------------------------------------------------------
// React component (default export — consumed by `next/dynamic`)
// ---------------------------------------------------------------------------

export interface HabitatWidgetCanvasProps {
  habitatState: HabitatState;
}

export default function HabitatWidgetCanvas({
  habitatState,
}: HabitatWidgetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Only level triggers a rebuild — mood flows through stateRef per-frame.
  const sceneLevel = Math.max(1, Math.min(9, Math.floor(habitatState.level)));

  const stateRef = useRef<HabitatState>(habitatState);
  stateRef.current = habitatState;

  const moodStateRef = useRef<MoodAnimState>({
    speedMul: 1.5,
    headDroop: 0,
    sparkleOn: false,
    bounceUntil: 0,
    prevMood: null,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: sceneLevel required to trigger remount on level change
  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    const handle = mountHabitatWidgetScene({
      canvas: canvasRef.current,
      wrapper: wrapperRef.current,
      habitatState: stateRef.current,
      reducedMotion,
      stateRef,
      moodStateRef,
    });
    return () => handle.dispose();
  }, [sceneLevel, reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "80px" }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        data-testid="habitat-3d-widget-canvas"
        width={80}
        height={80}
        style={{
          width: "80px",
          height: "80px",
          display: "block",
          margin: "0 auto",
        }}
      />
    </div>
  );
}
