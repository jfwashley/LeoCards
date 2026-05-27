// mood-decay.ts — Plan 13-04 (R7).
//
// Binds `HabitatState.mood` and `HabitatState.quality` to visible scene
// changes WITHOUT rebuilding the scene. Called per frame from the RAF
// loop in habitat-3d-canvas.tsx.
//
// Design notes (RESEARCH section C + Phase 5 D-06 carry-forward):
//
//   • Mood drives Leo's animation channels (speedMul, headDroop, sparkleOn)
//     and a position-bounce on root.y. The clay-animation walk driver
//     reads `state.speedMul` directly; this module writes that channel,
//     and writes `headG.userData.moodDroop` + `root.userData.moodBounce`
//     as out-of-band offsets the walk driver applies.
//
//   • D-06 transition policy:
//       - "happier" mood shift (e.g. sad → happy)  → snap + bounce (300ms)
//       - "sadder"  mood shift (e.g. happy → neutral) → crossfade (~500ms)
//     We track `prevMood` per-instance (in MoodAnimState) — NOT module-
//     scoped — so React 18+ Strict Mode double-mount and any future
//     multi-canvas scenario stay isolated.
//
//   • Decay (R7):
//       - lerp flower/grass material colors toward dull olive proportional
//         to (1 - quality)
//       - tighten fog (near + far) proportional to (1 - quality)
//       - hide butterflies + flowers below q < 0.4 (tier-2 visibility cull)
//       - tint sky shader uniform when tier-2
//     All decay is per-material / per-uniform mutation — NO EffectComposer
//     / post-processing (RESEARCH Pitfall 5: GPU-cheap path).
//
//   • Idempotency: applyDecay(world, 1.0) restores baseline color +
//     visibility, because every mutated material caches its baseline in
//     `material.userData.baseColor` (recorded on first touch).
//
//   • Sparkles: clay-ambient owns the pool. This module flips
//     `state.sparkleOn` only; the canvas-side wiring (clay-ambient.spawn)
//     is the future hook. Plan 04 wires the flag into a userData flag on
//     the lion root so a future pass can read it; the unit tests assert
//     `state.sparkleOn` directly.

import {
  Color,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type ShaderMaterial,
} from "three";
import type { TigerMood } from "@/lib/habitat-engine";
import type { ClayWorld } from "./clay-world";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MoodAnimState {
  /** Lion walk speed multiplier. Designer default for "happy" = 1.5. */
  speedMul: number;
  /** Offset (radians) added to `leo.headG.rotation.x` — 0..0.15. */
  headDroop: number;
  /** Sparkle pool toggle (excited mood only). */
  sparkleOn: boolean;
  /** performance.now() timestamp at which the D-06 bounce ends (0 = inactive). */
  bounceUntil: number;
  /** Last mood applied — per-instance to avoid module-scope leakage. */
  prevMood: TigerMood | null;
  /** D-06 crossfade target (only populated during a "sadder" transition). */
  targetSpeedMul?: number;
  /** D-06 crossfade target (only populated during a "sadder" transition). */
  targetHeadDroop?: number;
}

// ---------------------------------------------------------------------------
// Mood — RESEARCH section C.1 + Phase 5 D-06
// ---------------------------------------------------------------------------

const MOOD_TARGETS: Record<
  TigerMood,
  { speedMul: number; headDroop: number; sparkleOn: boolean }
> = {
  excited: { speedMul: 2.2, headDroop: 0, sparkleOn: true },
  happy: { speedMul: 1.5, headDroop: 0, sparkleOn: false },
  neutral: { speedMul: 0.9, headDroop: 0.05, sparkleOn: false },
  sad: { speedMul: 0.5, headDroop: 0.15, sparkleOn: false },
};

const BOUNCE_MS = 300;

// Mood ordering for "happier vs sadder" detection. Index higher = happier.
const MOOD_ORDER: Record<TigerMood, number> = {
  sad: 0,
  neutral: 1,
  happy: 2,
  excited: 3,
};

function isHappierShift(prev: TigerMood, next: TigerMood): boolean {
  return MOOD_ORDER[next] > MOOD_ORDER[prev];
}

/**
 * Mood mutator — no scene rebuild. Called every frame from RAF tick.
 *
 * Channels written:
 *   - state.speedMul  → read by clay-animation.applyLionWalk
 *   - state.headDroop → exposed via leo.headG.userData.moodDroop
 *   - state.sparkleOn → exposed via leo.root.userData.moodSparkleOn
 *   - leo.root.userData.moodBounce → D-06 happier-shift bounce offset
 */
export function applyMood(
  world: ClayWorld,
  mood: TigerMood,
  state: MoodAnimState,
  now: number,
): void {
  const target = MOOD_TARGETS[mood];

  if (state.prevMood === null) {
    // First call: snap to target.
    state.speedMul = target.speedMul;
    state.headDroop = target.headDroop;
    state.sparkleOn = target.sparkleOn;
    state.bounceUntil = 0;
    state.targetSpeedMul = undefined;
    state.targetHeadDroop = undefined;
  } else if (state.prevMood !== mood) {
    if (isHappierShift(state.prevMood, mood)) {
      // D-06: snap + bounce.
      state.speedMul = target.speedMul;
      state.headDroop = target.headDroop;
      state.sparkleOn = target.sparkleOn;
      state.bounceUntil = now + BOUNCE_MS;
      state.targetSpeedMul = undefined;
      state.targetHeadDroop = undefined;
    } else {
      // D-06: crossfade — stash targets and lerp in subsequent ticks.
      state.targetSpeedMul = target.speedMul;
      state.targetHeadDroop = target.headDroop;
      state.sparkleOn = target.sparkleOn;
    }
  } else {
    // Same mood as last tick: continue any in-progress crossfade.
    if (state.targetSpeedMul !== undefined) {
      // Lerp ~0.5s — at 60fps that's ~0.032 per frame; use 0.08 per call
      // for snappy convergence (Test 6 asserts 3 calls show progressive
      // change, not snap).
      state.speedMul += (state.targetSpeedMul - state.speedMul) * 0.25;
      if (Math.abs(state.targetSpeedMul - state.speedMul) < 0.01) {
        state.speedMul = state.targetSpeedMul;
        state.targetSpeedMul = undefined;
      }
    }
    if (state.targetHeadDroop !== undefined) {
      state.headDroop += (state.targetHeadDroop - state.headDroop) * 0.25;
      if (Math.abs(state.targetHeadDroop - state.headDroop) < 0.005) {
        state.headDroop = state.targetHeadDroop;
        state.targetHeadDroop = undefined;
      }
    }
  }

  state.prevMood = mood;

  // -- Expose channels to clay-animation via userData --
  const lion = world.featureGroups.lion as
    | (Group & {
        userData: { headG?: Group; root?: Group };
      })
    | undefined;
  // The actual rig is referenced via featureGroups.lion in newer ports OR
  // via a sibling reference on world.userData; both are tolerated.
  const leoRoot =
    (
      world as unknown as {
        lionRig?: { root: Group; headG: Group };
      }
    ).lionRig?.root ?? lion;
  const leoHead =
    (
      world as unknown as {
        lionRig?: { root: Group; headG: Group };
      }
    ).lionRig?.headG ?? (lion?.userData?.headG as Group | undefined);

  if (leoHead) {
    leoHead.userData.moodDroop = state.headDroop;
  }
  if (leoRoot) {
    leoRoot.userData.moodSparkleOn = state.sparkleOn;
    if (now < state.bounceUntil) {
      const phase = (state.bounceUntil - now) / BOUNCE_MS; // 1 → 0
      const amp = phase; // ease-out
      // 6 half-cycles over the bounce window.
      leoRoot.userData.moodBounce =
        Math.sin((1 - phase) * Math.PI * 6) * 0.15 * amp;
    } else {
      leoRoot.userData.moodBounce = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Decay — RESEARCH section C.3
// ---------------------------------------------------------------------------

const COLOR_DECAYED = new Color("#6a7560"); // dull olive
const COLOR_SKY_DECAYED_TOP = new Color("#a8b5b8");
const COLOR_SKY_DECAYED_BOT = new Color("#c8cdcc");
const TIER2_QUALITY = 0.4;

/** Type guard for an Object3D that exposes a `material` (a Mesh). */
function meshMaterial(o: Object3D): MeshStandardMaterial | null {
  const m = (o as Mesh).material;
  if (!m) return null;
  if (Array.isArray(m)) return null;
  return m as unknown as MeshStandardMaterial;
}

/** Ensure baseColor is cached so applyDecay is idempotent (T-13-16). */
function ensureBaseColor(m: MeshStandardMaterial): Color | null {
  if (!m.color) return null;
  const ud = m.userData as { baseColor?: Color };
  if (!ud.baseColor) {
    ud.baseColor = m.color.clone();
  }
  return ud.baseColor;
}

interface FogLike {
  near?: number;
  far?: number;
  userData?: { baseNear?: number; baseFar?: number };
}

interface SkyShaderLike {
  uniforms?: {
    top?: { value: Color };
    bot?: { value: Color };
    color1?: { value: Color };
  };
  userData?: {
    baseTop?: Color;
    baseBot?: Color;
  };
}

interface WorldWithDecayTargets {
  featureGroups: Record<string, Group | undefined>;
  fog?: FogLike;
  sky?: SkyShaderLike;
  skyMat?: ShaderMaterial & SkyShaderLike;
}

/**
 * Decay mutator — material color + fog + visibility. Called every frame.
 *
 * Idempotent: `applyDecay(world, 1.0)` restores baselines.
 */
export function applyDecay(world: ClayWorld, quality: number): void {
  const q = Math.max(0, Math.min(1, quality));
  const t = 1 - q;
  const tier2 = q < TIER2_QUALITY;
  const w = world as unknown as WorldWithDecayTargets;

  // -- Material color lerp on flowers + grass --
  const colorGroups = ["flowers", "grass"];
  for (const name of colorGroups) {
    const g = w.featureGroups[name];
    if (!g) continue;
    g.traverse((o) => {
      const m = meshMaterial(o);
      if (!m) return;
      const base = ensureBaseColor(m);
      if (!base) return;
      // Lerp toward decayed olive.
      m.color.copy(base).lerp(COLOR_DECAYED, t);
    });
  }

  // -- Fog tightening --
  // Look up baseline on world.skyMat.userData OR a sibling `fog` ref.
  const fog =
    w.fog ??
    ((world as unknown as { sceneFog?: FogLike }).sceneFog as
      | FogLike
      | undefined);
  if (fog) {
    if (!fog.userData) fog.userData = {};
    const ud = fog.userData;
    if (ud.baseNear === undefined) ud.baseNear = fog.near ?? 36;
    if (ud.baseFar === undefined) ud.baseFar = fog.far ?? 80;
    // Tighten by up to ~40% / 25% at q=0.
    fog.near = ud.baseNear - t * (ud.baseNear * 0.4);
    fog.far = ud.baseFar - t * (ud.baseFar * 0.25);
  }

  // -- Tier-2 visibility cull --
  if (w.featureGroups.butterflies) {
    w.featureGroups.butterflies.visible = !tier2;
  }
  if (w.featureGroups.flowers) {
    w.featureGroups.flowers.visible = !tier2;
  }

  // -- Sky tint (tier-2 only) --
  const sky = w.skyMat ?? w.sky;
  if (sky?.uniforms) {
    if (!sky.userData) sky.userData = {};
    const ud = sky.userData;
    const topU = sky.uniforms.top;
    const botU = sky.uniforms.bot;
    if (topU?.value && !ud.baseTop) ud.baseTop = topU.value.clone();
    if (botU?.value && !ud.baseBot) ud.baseBot = botU.value.clone();

    if (tier2) {
      if (topU?.value && ud.baseTop) {
        topU.value.copy(ud.baseTop).lerp(COLOR_SKY_DECAYED_TOP, 0.65);
      }
      if (botU?.value && ud.baseBot) {
        botU.value.copy(ud.baseBot).lerp(COLOR_SKY_DECAYED_BOT, 0.65);
      }
      if (sky.uniforms.color1?.value && ud.baseTop) {
        sky.uniforms.color1.value
          .copy(ud.baseTop)
          .lerp(COLOR_SKY_DECAYED_TOP, 0.65);
      }
    } else {
      if (topU?.value && ud.baseTop) topU.value.copy(ud.baseTop);
      if (botU?.value && ud.baseBot) botU.value.copy(ud.baseBot);
      if (sky.uniforms.color1?.value && ud.baseTop) {
        sky.uniforms.color1.value.copy(ud.baseTop);
      }
    }
  }
}
