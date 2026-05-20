import type { UserId } from "@/db/schema";

// ============================================================
// Constants — exported for transparency and use in tests/UI
// ============================================================

/** 2-day grace period (D-01): no decay within 48 hours of last activity */
export const GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;

/** 5% quality decay per day after grace period (D-02) */
export const DECAY_RATE_PER_DAY = 0.05;

/** Decay floor: quality never drops below 10% (D-03) */
export const DECAY_FLOOR = 0.1;

/**
 * Effective-card-count thresholds for habitat levels 2-10 (D-07, D-10).
 *
 * Nine entries: index `i` = effective-card-count needed to reach level `i + 2`.
 * - Index 0 (5)   → level 2
 * - Index 1 (15)  → level 3
 * - Index 2 (30)  → level 4
 * - Index 3 (50)  → level 5
 * - Index 4 (80)  → level 6
 * - Index 5 (120) → level 7
 * - Index 6 (170) → level 8
 * - Index 7 (230) → level 9
 * - Index 8 (300) → level 10 (D-10: max)
 *
 * "Effective cards" = Math.floor(quality × learnedCardCount), so decay
 * lowers the effective count and can drop the user back down a level.
 */
export const LEVEL_THRESHOLDS = [
  5, 15, 30, 50, 80, 120, 170, 230, 300,
] as const;

/** "Excited" mood window: 60 minutes after completing a study session (D-13) */
export const EXCITED_WINDOW_MINUTES = 60;

// ============================================================
// Types
// ============================================================

export type TigerMood = "excited" | "happy" | "neutral" | "sad";

/**
 * Raw facts fetched from the DB — inputs to the pure computation functions.
 * No derived state is stored; everything flows from these facts.
 */
export interface HabitatFacts {
  userId: UserId;
  /** null = user has never completed a study session (D-04: no decay) */
  lastActivityAt: Date | null;
  /** Cards with masteryRound >= 3 across all of the user's decks */
  learnedCardCount: number;
}

/**
 * Fully computed habitat state — derived at request time, never stored.
 * Matches the D-15 API response shape.
 */
export interface HabitatState {
  /** Habitat level 1-10 (D-07, D-08, D-10) */
  level: number;
  /** Quality score 0.10-1.0 (D-03 floor) */
  quality: number;
  /** Tiger's current mood (D-11) */
  mood: TigerMood;
  /** Raw learned card count for display */
  learnedCardCount: number;
  /**
   * Math.floor(quality * learnedCardCount) — what actually drives level calculation.
   * Uses Math.floor to avoid float boundary issues (see Pitfall 1 in research).
   */
  effectiveCardCount: number;
  /** true when user is past the grace period and quality is decaying */
  isDecaying: boolean;
  /** Minutes since last activity; null if user has never studied */
  minutesSinceActivity: number | null;
  /** Learned cards needed for the next level; null when already at level 10 */
  nextLevelThreshold: number | null;
}

// ============================================================
// computeQuality
// ============================================================

/**
 * Computes habitat quality (0.10 - 1.0) based on time since last activity.
 *
 * - null lastActivityAt (new user): quality 1.0 — no decay before first session (D-04)
 * - Within 48h grace period: quality 1.0 (D-01)
 * - After grace period: 5% decay per day, floored at 10% (D-02, D-03)
 *
 * Uses pure millisecond arithmetic — no calendar day math to avoid DST issues.
 *
 * @param lastActivityAt - Timestamp of the user's last study session, or null
 * @param now - Current time (explicit parameter — no Date.now() calls inside)
 */
export function computeQuality(lastActivityAt: Date | null, now: Date): number {
  if (lastActivityAt === null) return 1.0; // D-04: new user

  const elapsedMs = now.getTime() - lastActivityAt.getTime();

  if (elapsedMs <= GRACE_PERIOD_MS) return 1.0; // D-01: within grace period

  // Convert the time past grace to fractional days for the decay calculation
  const msPastGrace = elapsedMs - GRACE_PERIOD_MS;
  const daysPastGrace = msPastGrace / (24 * 60 * 60 * 1000);

  const decayed = 1.0 - daysPastGrace * DECAY_RATE_PER_DAY;
  return Math.max(DECAY_FLOOR, decayed); // D-03: floor at 10%
}

// ============================================================
// habitatLevel
// ============================================================

/**
 * Derives the habitat level (1-10) from the effective card count.
 *
 * LEVEL_THRESHOLDS defines the minimum effectiveCardCount to reach each level
 * above 1. Level 1 is the default (welcoming starter habitat, D-08).
 *
 * Examples:
 *   0-4 cards  → level 1
 *   5-14 cards → level 2
 *   ...
 *   400+ cards → level 10 (D-10: max)
 *
 * @param effectiveCardCount - Math.floor(quality * learnedCardCount)
 */
export function habitatLevel(effectiveCardCount: number): number {
  // Start at level 1 (D-08: new users begin at level 1)
  let level = 1;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && effectiveCardCount >= threshold) {
      level = i + 2; // threshold[0]=5 means level 2, threshold[1]=15 means level 3, etc.
    } else {
      break; // Thresholds are monotonically increasing — no need to check further
    }
  }

  return Math.min(10, level); // D-10: max level 10
}

// ============================================================
// classifyMood
// ============================================================

/**
 * Classifies the tiger's mood based on quality and recency of activity (D-11, D-12).
 *
 * Priority:
 * 1. excited: within 60 minutes of study (D-13), regardless of quality
 * 2. happy: quality >= 0.75
 * 3. neutral: quality >= 0.40
 * 4. sad: quality < 0.40
 *
 * @param quality - Current habitat quality (0.10 - 1.0)
 * @param minutesSinceActivity - Minutes since last study session; null if never studied
 */
export function classifyMood(
  quality: number,
  minutesSinceActivity: number | null,
): TigerMood {
  // D-13: "excited" window — 60 minutes after completing a study session
  if (
    minutesSinceActivity !== null &&
    minutesSinceActivity <= EXCITED_WINDOW_MINUTES
  ) {
    return "excited";
  }

  // D-12: mood combines quality AND recency (recency handled above for excited)
  if (quality >= 0.75) return "happy";
  if (quality >= 0.4) return "neutral";
  return "sad";
}

// ============================================================
// computeHabitatState
// ============================================================

/**
 * Orchestrates all habitat computations to produce the full HabitatState.
 *
 * This is the primary entry point for callers. It composes computeQuality,
 * habitatLevel, and classifyMood into a single typed result.
 *
 * @param facts - Raw DB facts (lastActivityAt, learnedCardCount)
 * @param now - Current time (explicit parameter — no Date.now() inside)
 */
export function computeHabitatState(
  facts: HabitatFacts,
  now: Date,
): HabitatState {
  const { lastActivityAt, learnedCardCount } = facts;

  // Compute quality from decay rules
  const quality = computeQuality(lastActivityAt, now);

  // effectiveCardCount drives level — uses Math.floor to avoid float boundary issues
  const effectiveCardCount = Math.floor(quality * learnedCardCount);

  // Derive level from effective card count
  const level = habitatLevel(effectiveCardCount);

  // Compute minutes since last activity for mood and UI
  const minutesSinceActivity =
    lastActivityAt !== null
      ? Math.floor((now.getTime() - lastActivityAt.getTime()) / (60 * 1000))
      : null;

  // Classify tiger's mood
  const mood = classifyMood(quality, minutesSinceActivity);

  // isDecaying: past grace period AND user has started studying (lastActivityAt not null)
  const isDecaying =
    lastActivityAt !== null &&
    now.getTime() - lastActivityAt.getTime() > GRACE_PERIOD_MS;

  // nextLevelThreshold: find the first threshold that exceeds effectiveCardCount
  // LEVEL_THRESHOLDS[i] represents the threshold to reach level i+2
  // So if we're at level L, we need LEVEL_THRESHOLDS[L-1] for next level
  let nextLevelThreshold: number | null = null;
  if (level < 10) {
    // level is 1-9, so the threshold for the next level is LEVEL_THRESHOLDS[level-1]
    nextLevelThreshold = LEVEL_THRESHOLDS[level - 1] ?? null;
  }

  return {
    level,
    quality,
    mood,
    learnedCardCount,
    effectiveCardCount,
    isDecaying,
    minutesSinceActivity,
    nextLevelThreshold,
  };
}
