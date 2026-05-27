// scene-host.ts — ESM port of the designer's three.js scaffolding.
//
// Ported from:
//   .planning/design/animations/habitats-shared.jsx:6-88   (buildSceneHost + attachOrbit)
// Plan 13-01 NEW additions (RESEARCH section H, Example 1):
//   - OrbitOptions.reducedMotion           (R6)
//   - OrbitHandle.nudgeTheta(delta)        (R5)
//   - OrbitHandle.getTheta()/setTheta()    (test + Plan 06 hero-image)
//   - attachViewportGate                   (IntersectionObserver helper for Plan 03)
//   - attachVisibilityPause                (visibilitychange helper for Plan 03)
//
// This module is browser-only: it touches `performance.now()` and DOM
// events. The SSR boundary is established by Plan 03 via
// `dynamic({ ssr: false })`. Do NOT import this file from server code.
//
// D-26 / SPEC R4: NO zoom, NO pan, NO pinch. The designer's hand-rolled
// orbit is azimuth-only by construction — `OrbitControls` is intentionally
// not used.

import {
  ACESFilmicToneMapping,
  Color,
  Fog,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import type { OrbitHandle, OrbitOptions, SceneContext } from "./types";

// ---------- Scene scaffolding (port of habitats-shared.jsx:6-29) -----------

export interface BuildSceneHostOpts {
  exposure?: number;
  bg?: string;
  fog?: string;
  fogNear?: number;
  fogFar?: number;
  fov?: number;
  camDist?: number;
  camHeight?: number;
  lookY?: number;
  /** Override the isMobile heuristic for tests / hero-image builds. */
  isMobile?: boolean;
}

/**
 * Build the renderer + scene + camera triple plus the mobile/desktop
 * quality scalar. Returns a `SceneContext` for Plans 02-05.
 *
 * Port of `habitats-shared.jsx:6-29`. The `Q` scalar comes from
 * `habitat-clay-styles.jsx:53` (`Q = isMobile ? 0.55 : 1`).
 */
export function buildSceneHost(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  opts: BuildSceneHostOpts = {},
): SceneContext {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  renderer.setPixelRatio(Math.min(dpr, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;

  const scene = new Scene();
  scene.background = new Color(opts.bg ?? "#1a1a1a");
  if (opts.fog) {
    scene.fog = new Fog(opts.fog, opts.fogNear ?? 20, opts.fogFar ?? 50);
  }

  const camera = new PerspectiveCamera(
    opts.fov ?? 30,
    width / height,
    0.1,
    200,
  );
  const camDist = opts.camDist ?? 18;
  const camHeight = opts.camHeight ?? 9;
  camera.position.set(camDist, camHeight, camDist);
  camera.lookAt(0, opts.lookY ?? 1, 0);

  // isMobile heuristic — explicit override wins for tests + hero-image
  // builds (RESEARCH Pitfall 7 — never assume the window is the canvas).
  const inferredMobile =
    opts.isMobile ??
    (width < 768 || (typeof window !== "undefined" && window.innerWidth < 768));
  const isMobile = Boolean(inferredMobile);

  // Plan 13.1 Opt 3: slow-CPU detection — when the device has 4 or fewer
  // logical cores (navigator.hardwareConcurrency) OR 4 GB or less of RAM
  // (navigator.deviceMemory, where exposed), push the mobile quality scalar
  // from 0.55 → 0.4. Both APIs are feature-detected so unsupported browsers
  // fall back to the standard mobile/desktop values. Desktop never receives
  // the slow-CPU adjustment because we already give it Q=1.
  const Q = isMobile ? (isSlowDevice() ? 0.4 : 0.55) : 1;

  return {
    renderer,
    scene,
    camera,
    canvas,
    width,
    height,
    isMobile,
    Q,
  };
}

// ---------------------------------------------------------------------------
// Plan 13.1 Opt 3 — slow-CPU detection.
//
// Both navigator.hardwareConcurrency (HC) and navigator.deviceMemory (DM)
// are widely supported on Chromium-based mobile browsers (Chrome Android,
// Samsung Internet, Edge mobile). Safari iOS exposes HC but not DM.
// Either signal alone qualifies the device as "slow"; we OR them together.
//
// Test affordance: __setSlowDeviceStub lets specs deterministically pin
// the result without faking navigator. Pairs with __setMobileStub in
// habitat-3d-canvas.tsx.
// ---------------------------------------------------------------------------

let __slowDeviceStub: (() => boolean) | null = null;
export function __setSlowDeviceStub(fn: () => boolean): void {
  __slowDeviceStub = fn;
}
export function __resetSlowDeviceStub(): void {
  __slowDeviceStub = null;
}

export function isSlowDevice(): boolean {
  if (__slowDeviceStub) return __slowDeviceStub();
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const hc =
    typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 0;
  const dm = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 0;
  // hc==0 / dm==0 means the API didn't return a useful value; we don't
  // count those as "slow" — only positive values that fall below threshold.
  const hcSlow = hc > 0 && hc <= 4;
  const dmSlow = dm > 0 && dm <= 4;
  return hcSlow || dmSlow;
}

// ---------- Hand-rolled orbit (port of habitats-shared.jsx:30-88) ---------
//
// Drag rotates around Y, auto-rotates when idle. Azimuth-only by design —
// no zoom, no pan, no pinch (D-26 / SPEC R4).

/**
 * Minimal canvas-like surface — accepts the real `HTMLCanvasElement` in
 * production and a stub in tests (node environment, no DOM).
 */
type OrbitCanvas = Pick<
  HTMLCanvasElement,
  "addEventListener" | "removeEventListener" | "style"
>;

type PointerEventLike = {
  clientX: number;
  touches?: ArrayLike<{ clientX: number }>;
};

export function attachOrbit(
  canvas: OrbitCanvas,
  camera: PerspectiveCamera,
  opts: OrbitOptions = {},
): OrbitHandle {
  const lookY = opts.lookY ?? 1;
  const target = new Vector3(0, lookY, 0);

  let theta = Math.atan2(
    camera.position.x - target.x,
    camera.position.z - target.z,
  );
  const radius = Math.hypot(
    camera.position.x - target.x,
    camera.position.z - target.z,
  );
  const phi = Math.atan2(camera.position.y - target.y, radius);
  const r3d = Math.hypot(radius, camera.position.y - target.y);

  let dragging = false;
  let lastX = 0;
  let lastIdle = performance.now();
  const idleDelay = opts.idleDelay ?? 1200;
  const autoSpeed = opts.autoSpeed ?? 0.12;
  const reducedMotion = opts.reducedMotion === true;

  function readClientX(e: PointerEventLike): number {
    if (e.touches && e.touches.length > 0) {
      const t = e.touches[0];
      if (t) return t.clientX;
    }
    return e.clientX;
  }

  const onDown = (e: Event) => {
    dragging = true;
    lastX = readClientX(e as unknown as PointerEventLike);
    canvas.style.cursor = "grabbing";
  };
  const onMove = (e: Event) => {
    if (!dragging) return;
    const x = readClientX(e as unknown as PointerEventLike);
    const dx = x - lastX;
    lastX = x;
    theta -= dx * 0.008;
    lastIdle = performance.now();
  };
  const onUp = () => {
    dragging = false;
    canvas.style.cursor = "grab";
    lastIdle = performance.now();
  };

  // Canvas-local listeners: only pointer-start events. Move/end attach to
  // window so a drag that leaves the canvas keeps tracking.
  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("touchstart", onDown, { passive: true });

  // Window listeners — guarded so the module is importable in node tests
  // that do not provide a global `window`.
  const w: typeof globalThis & {
    addEventListener?: typeof window.addEventListener;
    removeEventListener?: typeof window.removeEventListener;
  } = globalThis;
  const hasWindow =
    typeof w.addEventListener === "function" &&
    typeof w.removeEventListener === "function";
  if (hasWindow) {
    w.addEventListener?.("mousemove", onMove);
    w.addEventListener?.("mouseup", onUp);
    w.addEventListener?.("touchmove", onMove, { passive: true });
    w.addEventListener?.("touchend", onUp);
  }

  canvas.style.cursor = "grab";

  function applyPosition() {
    camera.position.x = target.x + Math.cos(phi) * r3d * Math.sin(theta);
    camera.position.z = target.x + Math.cos(phi) * r3d * Math.cos(theta);
    camera.position.y = target.y + Math.sin(phi) * r3d;
    camera.lookAt(target);
  }

  function tick(dt: number) {
    const now = performance.now();
    if (!reducedMotion && !dragging && now - lastIdle > idleDelay) {
      theta += autoSpeed * dt;
    }
    applyPosition();
  }

  function dispose() {
    canvas.removeEventListener("mousedown", onDown);
    canvas.removeEventListener("touchstart", onDown);
    if (hasWindow) {
      w.removeEventListener?.("mousemove", onMove);
      w.removeEventListener?.("mouseup", onUp);
      w.removeEventListener?.("touchmove", onMove);
      w.removeEventListener?.("touchend", onUp);
    }
  }

  function nudgeTheta(delta: number) {
    theta += delta;
    lastIdle = performance.now();
    applyPosition();
  }

  function getTheta() {
    return theta;
  }

  function setTheta(next: number) {
    theta = next;
    applyPosition();
  }

  return { tick, dispose, nudgeTheta, getTheta, setTheta };
}

// ---------- Helpers for Plan 03 React wrapper -----------------------------

/**
 * Build-on-first-visible + pause-when-off-screen helper. Plan 03's React
 * wrapper wires this; the helper exists here so the contract is colocated
 * with the scene module.
 *
 * Ported pattern from `habitats-shared.jsx:166-188`.
 */
export interface ViewportGateOpts {
  threshold?: number;
  /** Called the first time `target` becomes visible. */
  onFirstVisible: () => void;
  /** Called every time `target` leaves the viewport (pause RAF). */
  onLeave?: () => void;
  /** Called when `target` re-enters after first build (resume RAF). */
  onReenter?: () => void;
}

export function attachViewportGate(
  target: Element,
  opts: ViewportGateOpts,
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    // SSR / node — call onFirstVisible eagerly so build-time hero-image
    // generation does not stall waiting for a viewport event that will
    // never fire.
    opts.onFirstVisible();
    return () => {};
  }
  let firstBuilt = false;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!firstBuilt) {
            firstBuilt = true;
            opts.onFirstVisible();
          } else {
            opts.onReenter?.();
          }
        } else {
          opts.onLeave?.();
        }
      }
    },
    { threshold: opts.threshold ?? 0.01 },
  );
  io.observe(target);
  return () => io.disconnect();
}

/**
 * Pause-on-hidden helper. Plan 03 may use either this (poll-friendly) or
 * the simpler "stop the loop entirely" pattern (RESEARCH Pattern 4 — note
 * about battery on mobile).
 *
 * Ported pattern from `habitats-shared.jsx:137-139`.
 */
export interface VisibilityPauseOpts {
  onHidden: () => void;
  onVisible: () => void;
}

export function attachVisibilityPause(opts: VisibilityPauseOpts): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }
  const handler = () => {
    if (document.hidden) opts.onHidden();
    else opts.onVisible();
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

// Re-export the types so consumers can `import { OrbitHandle } from
// "@/lib/habitat-3d/scene-host"` without reaching into types.ts directly.
export type { OrbitHandle, OrbitOptions, SceneContext } from "./types";
