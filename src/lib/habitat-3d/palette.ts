// CLAY color palette + toon-gradient texture helper.
// Ported verbatim from `.planning/design/animations/habitat-clay-styles.jsx:19-40`.
// Per Phase 5 carry-forward D-01 (cute cartoon art style) the palette is
// locked — do NOT recolor.

import { DataTexture, NearestFilter, RedFormat } from "three";
import type { SceneContext } from "./types";

/**
 * Designer-locked clay palette. Source: habitat-clay-styles.jsx:19-30.
 * All values are CSS hex color strings; consumed by `Color(...)` and
 * inline DOM styling alike.
 */
export const CLAY = {
  sky: "#cfe6f0",
  skyTop: "#a8d2e6",
  cloud: "#fbfaf6",
  ground: "#a8d77c",
  groundAlt: "#9bcf6a",
  groundDeep: "#6fb04a",
  groundShadow: "#5a8f3a",
  soil: "#c89a6e",
  soilDeep: "#8a6647",
  path: "#d6c39a",
  water: "#7ec8d6",
  waterDeep: "#3e8fa6",
  lily: "#7fb84d",
  lilyFlower: "#fbfaf6",
  flowerA: "#f8c8d8",
  flowerB: "#fffbe8",
  flowerC: "#c9a8e8",
  mushroomCap: "#e4644a",
  mushroomStem: "#fbfaf6",
  butterflyA: "#f0a3c0",
  butterflyB: "#e8b4f0",
  butterflyC: "#c9a8e8",
  toy: "#e85a8a",
  toyStripe: "#fff5e6",
} as const;

export type ClayColor = keyof typeof CLAY;

/**
 * Build a toon-shaded gradient texture for `MeshToonMaterial`.
 * Ported from `habitat-clay-styles.jsx:32-40` (rename: `_toonGrad` →
 * `toonGrad`; underscore convention is JS-only).
 *
 * @param steps Number of toon bands. Default 3.
 * @returns A `DataTexture` ready to assign as `material.gradientMap`.
 */
export function toonGrad(steps = 3): DataTexture {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    data[i] = Math.round(((i + 1) / steps) * 255);
  }
  const tex = new DataTexture(data, steps, 1, RedFormat);
  tex.needsUpdate = true;
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  return tex;
}

// ---------------------------------------------------------------------------
// Plan 13.1 Opt 3 — per-scene toon-gradient cache.
//
// Building a fresh DataTexture per material burns ~1 KB of GPU memory + an
// upload per material. clay-world already calls toonGrad once and shares the
// instance via the mat() factory, but ANY future code path that needs a
// toon gradient inside the same SceneContext should reuse the same texture
// for a given `steps` count. This WeakMap-backed cache makes that contract
// explicit and free for callers to opt into.
//
// The map is keyed on SceneContext so multiple concurrent scenes (e.g.
// future widget + page coexistence) cannot accidentally share GPU textures
// across renderer instances. Disposal is automatic when the SceneContext
// is GC'd (WeakMap).
// ---------------------------------------------------------------------------

const _toonGradCache: WeakMap<
  SceneContext,
  Map<number, DataTexture>
> = new WeakMap();

/**
 * Scene-scoped toon-gradient lookup. Returns the same DataTexture instance
 * for the same `(ctx, steps)` pair across the lifetime of the SceneContext.
 *
 * Use this instead of `toonGrad(steps)` whenever a SceneContext is in
 * scope — saves GPU uploads on multi-material scenes.
 */
export function toonGradFor(ctx: SceneContext, steps = 3): DataTexture {
  let inner = _toonGradCache.get(ctx);
  if (!inner) {
    inner = new Map<number, DataTexture>();
    _toonGradCache.set(ctx, inner);
  }
  const cached = inner.get(steps);
  if (cached) return cached;
  const tex = toonGrad(steps);
  inner.set(steps, tex);
  return tex;
}
