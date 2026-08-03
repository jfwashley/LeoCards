import type { TigerMood } from "@leocards/domain/habitat";

// ============================================================
// Mood rank mapping — used to determine transition direction
// ============================================================

const MOOD_RANK: Record<TigerMood, number> = {
  sad: 0,
  neutral: 1,
  happy: 2,
  excited: 3,
};

/**
 * Determines the type of mood transition animation to use.
 *
 * Per D-06:
 * - Happier shift (newMood rank > prevMood rank): "bounce" (spring animation)
 * - Sadder shift (newMood rank < prevMood rank): "crossfade" (~0.5s fade)
 * - Same mood: "none" (instant swap, no animation)
 */
export function getMoodTransitionType(
  prevMood: TigerMood,
  newMood: TigerMood,
): "bounce" | "crossfade" | "none" {
  const prevRank = MOOD_RANK[prevMood];
  const newRank = MOOD_RANK[newMood];

  if (newRank > prevRank) return "bounce";
  if (newRank < prevRank) return "crossfade";
  return "none";
}

// ============================================================
// Habitat layer definitions — additive layers per level (D-09)
// ============================================================

/**
 * Returns the ordered list of layer names to render for a given habitat level.
 *
 * Layers are additive: each level adds one or more new elements on top of
 * the existing set. Layer order is back-to-front (first = farthest back).
 *
 * Per D-12: Level 1 = bare grass + single tree (minimal but welcoming).
 * Per D-09: Levels 2-10 progressively add trees, rocks, water, flowers, animals.
 */
export function getLayersForLevel(level: number): string[] {
  const layers: string[] = ["layer-sky", "layer-hills", "layer-grass-base"];

  // Level 1+: single tree (D-12)
  if (level >= 1) layers.push("layer-tree-1");
  // Level 2+: rock cluster
  if (level >= 2) layers.push("layer-rocks-1");
  // Level 3+: second tree
  if (level >= 3) layers.push("layer-tree-2");
  // Level 4+: flower patch
  if (level >= 4) layers.push("layer-flowers-1");
  // Level 5+: small pond
  if (level >= 5) layers.push("layer-water-1");
  // Level 6+: first companion animal
  if (level >= 6) layers.push("layer-animal-1");
  // Level 7+: third tree
  if (level >= 7) layers.push("layer-tree-3");
  // Level 8+: second flower patch
  if (level >= 8) layers.push("layer-flowers-2");
  // Level 9+: second companion animal
  if (level >= 9) layers.push("layer-animal-2");
  // Level 10: expanded water feature
  if (level >= 10) layers.push("layer-water-2");

  return layers;
}

// ============================================================
// Decay alpha — fade factor for level-added layers (D-13)
// ============================================================

/**
 * Returns an alpha value (0.0–1.0) for fading layer-added elements during habitat decay.
 *
 * Formula: Math.max(0, (quality - 0.5) * 2)
 *
 * Examples:
 *   quality 1.0 → alpha 1.0 (fully visible)
 *   quality 0.75 → alpha 0.5 (half visible)
 *   quality 0.5 → alpha 0.0 (fully faded)
 *   quality 0.10 → alpha 0.0 (at floor — fully faded)
 *
 * Per D-13: Higher-level elements gradually disappear as quality drops.
 */
export function getDecayAlpha(quality: number): number {
  return Math.max(0, (quality - 0.5) * 2);
}

// ============================================================
// Tiger positioning (D-04)
// ============================================================

/**
 * Three random positions for tiger placement on mount.
 * x is a normalized value (0-1) representing position along scene width.
 *
 * Per D-04: center-bottom, 30% from left, 25% from right (x=0.75).
 */
export const TIGER_POSITIONS = [{ x: 0.5 }, { x: 0.3 }, { x: 0.75 }] as const;

/**
 * Returns a random tiger position from the three defined positions (D-04).
 * Called once on component mount via useState lazy initializer.
 */
export function getTigerPosition(): { x: number } {
  const index = Math.floor(Math.random() * TIGER_POSITIONS.length);
  return TIGER_POSITIONS[index] as { x: number };
}

// ============================================================
// Tiger facing direction (D-05)
// ============================================================

/**
 * Returns a random facing direction for the tiger on mount.
 *
 * Per D-05: random left/right facing direction per page load.
 * -1 = facing left (scaleX = -1 flips the sprite)
 * +1 = facing right (scaleX = 1, default)
 */
export function getTigerFacing(): -1 | 1 {
  return Math.random() < 0.5 ? -1 : 1;
}
