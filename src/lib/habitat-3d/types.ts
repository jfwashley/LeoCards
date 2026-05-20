// Shared type definitions for the habitat-3d module. Plans 02-05 import
// from here; this file is the contract for the 3D habitat scaffolding.
//
// Created by Plan 13-01 (3D habitat migration). See:
//   .planning/phases/13-3d-habitat/13-SPEC.md (R2/R4/R5/R6)
//   .planning/phases/13-3d-habitat/13-01-PLAN.md <interfaces>

import type * as THREE from "three";

/**
 * Output of `buildSceneHost`: the renderer + scene + camera triple plus the
 * mobile/desktop quality scalar. Ported from
 * `habitats-shared.jsx:6-29` (return shape) plus the designer's `Q` scalar
 * convention from `habitat-clay-styles.jsx:53` (`Q = isMobile ? 0.55 : 1`).
 */
export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  isMobile: boolean;
  /** Designer's quality scalar — Q = isMobile ? 0.55 : 1. */
  Q: number;
}

/**
 * Options accepted by `attachOrbit`. R5 adds `nudgeTheta` (handle method);
 * R6 adds the `reducedMotion` flag that freezes auto-orbit for users who
 * prefer reduced motion.
 */
export interface OrbitOptions {
  /** Y component of the camera look-at target. Default 1 (per habitats-shared.jsx:31). */
  lookY?: number;
  /** How long (ms) after the last user interaction before auto-orbit resumes. Default 1200ms. */
  idleDelay?: number;
  /** Auto-orbit angular velocity in radians per second. Default 0.12 rad/s. */
  autoSpeed?: number;
  /** R6: when true, auto-orbit is skipped entirely. User drag still works. */
  reducedMotion?: boolean;
}

/**
 * Handle returned by `attachOrbit`. Plans 02-05 use this to drive the camera
 * each frame, dispose listeners, and (R5) accept keyboard nudges.
 */
export interface OrbitHandle {
  /** Advance the orbit by `dt` seconds (called from the RAF loop). */
  tick: (dt: number) => void;
  /** Remove all event listeners. Idempotent. */
  dispose: () => void;
  /** R5: keyboard handler delta, one frame's worth of `autoSpeed`. Resets idle timer. */
  nudgeTheta: (delta: number) => void;
  /** Read-only theta access for tests + Playwright assertions. */
  getTheta: () => number;
  /**
   * Test-only absolute setter — used by Plan 03 dev-gated window affordance
   * and Plan 06 hero-image build script. NEVER called from production code.
   */
  setTheta: (theta: number) => void;
}

/**
 * Per-level world opts. Plan 02 builds the world; Plan 05 may flip
 * `sky: "golden-hour"` for the Level 9 v2 variant.
 */
export interface WorldOpts {
  sky?: "default" | "golden-hour";
}
