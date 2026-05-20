// clay-level.ts — feature-flag-additive level table.
//
// Ported from `.planning/design/animations/habitat-clay-styles.jsx`:
//   - DEFAULT_FEATURES         (:44-48)
//   - featuresForLevel(level)  (:2229-2244)
//   - LEVEL_CONFIG predicates  (:2247-2254)
//
// The designer's `LEVEL_CONFIG` is a record of predicate functions
// (`{ showElephant: (lv) => lv >= 5, ... }`). Plan 02 reshapes it into the
// per-level `Record<number, LevelConfig>` shape declared in 13-02-PLAN's
// `<interfaces>` block so consumers can do `LEVEL_CONFIG[level].sky` etc.
//
// `songbirds` is added to FeatureFlags for Level 9 to give Plans 03/04 a
// clean visibility signal. The designer's underlying birds layer is the
// ambient module gated by `showBirds(lv) => lv >= 9` — equivalent semantics.

/**
 * Scenery feature flags. Each flag is `true` once the level threshold is
 * met. Plan 04 binds decay opacity to the named feature groups in the
 * THREE.Group hierarchy that `buildClayWorld()` returns.
 */
export interface FeatureFlags {
  clouds?: boolean;
  lake?: boolean;
  lilies?: boolean;
  path?: boolean;
  trees?: boolean;
  rocks?: boolean;
  flowers?: boolean;
  grass?: boolean;
  butterflies?: boolean;
  mushrooms?: boolean;
  cave?: boolean;
  toy?: boolean;
  /** L9 — gates ambient.birds + perched-singing-birds layer */
  songbirds?: boolean;
}

/**
 * Per-level non-feature configuration. Driven by the designer's
 * `LEVEL_CONFIG` predicate map plus the variant `'golden-hour'` sky used
 * at level 9.
 */
export interface LevelConfig {
  /** L5+: elephant companion present on the mound. */
  showElephant: boolean;
  /** L7+: London-time sleep cycle drives the lion pose. */
  sleepCycle: boolean;
  /** L9 → golden-hour palette; default sky otherwise. */
  sky: "default" | "golden-hour";
}

/**
 * Designer's DEFAULT_FEATURES (all-true) used by callers that do not
 * specify a level — currently the standalone alt-style demos in the
 * designer JSX, retained here for parity.
 */
export const DEFAULT_FEATURES: Required<FeatureFlags> = {
  clouds: true,
  lake: true,
  lilies: true,
  path: true,
  trees: true,
  rocks: true,
  flowers: true,
  grass: true,
  butterflies: true,
  mushrooms: true,
  cave: true,
  toy: true,
  songbirds: true,
};

/**
 * Map a level number (1..9) to the additive feature-flag set.
 * Out-of-range values clamp to [1, 9] so callers can pass user input
 * without crashing.
 */
export function featuresForLevel(level: number): FeatureFlags {
  const lv = Math.max(1, Math.min(9, Math.floor(level)));
  return {
    clouds: true, // sky is always present
    lake: lv >= 2,
    lilies: lv >= 2,
    path: lv >= 2,
    trees: lv >= 3,
    rocks: lv >= 3,
    flowers: lv >= 4,
    grass: lv >= 4,
    butterflies: lv >= 4,
    mushrooms: lv >= 6,
    cave: lv >= 7,
    toy: lv >= 8,
    songbirds: lv >= 9,
  };
}

/**
 * Per-level companion/cycle/sky config. Plan 03's React wrapper reads
 * `LEVEL_CONFIG[level]` once at mount and again on level-change rebuild.
 */
export const LEVEL_CONFIG: Record<number, LevelConfig> = {
  1: { showElephant: false, sleepCycle: false, sky: "default" },
  2: { showElephant: false, sleepCycle: false, sky: "default" },
  3: { showElephant: false, sleepCycle: false, sky: "default" },
  4: { showElephant: false, sleepCycle: false, sky: "default" },
  5: { showElephant: true, sleepCycle: false, sky: "default" },
  6: { showElephant: true, sleepCycle: false, sky: "default" },
  7: { showElephant: true, sleepCycle: true, sky: "default" },
  8: { showElephant: true, sleepCycle: true, sky: "default" },
  9: { showElephant: true, sleepCycle: true, sky: "golden-hour" },
};
