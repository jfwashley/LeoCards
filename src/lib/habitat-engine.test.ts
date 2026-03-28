import { describe, expect, it } from "vitest";
import type { UserId } from "@/db/schema";
import {
  type HabitatFacts,
  type HabitatState,
  DECAY_FLOOR,
  GRACE_PERIOD_MS,
  LEVEL_THRESHOLDS,
  classifyMood,
  computeHabitatState,
  computeQuality,
  habitatLevel,
} from "./habitat-engine";

// ============================================================
// Test helpers
// ============================================================

const NOW = new Date("2026-01-15T12:00:00Z");

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}

function daysAgo(d: number): Date {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);
}

function makeFacts(overrides: Partial<HabitatFacts> = {}): HabitatFacts {
  return {
    userId: "user-1" as UserId,
    lastActivityAt: null,
    learnedCardCount: 0,
    ...overrides,
  };
}

// ============================================================
// computeQuality
// ============================================================

describe("computeQuality", () => {
  it("returns 1.0 when lastActivityAt is null (new user, D-04)", () => {
    expect(computeQuality(null, NOW)).toBe(1.0);
  });

  it("returns 1.0 when activity was 0 hours ago (just studied)", () => {
    expect(computeQuality(hoursAgo(0), NOW)).toBe(1.0);
  });

  it("returns 1.0 when activity was 24 hours ago (within grace)", () => {
    expect(computeQuality(hoursAgo(24), NOW)).toBe(1.0);
  });

  it("returns 1.0 when activity was exactly 48 hours ago (grace boundary, D-01)", () => {
    const exactly48h = new Date(NOW.getTime() - GRACE_PERIOD_MS);
    expect(computeQuality(exactly48h, NOW)).toBe(1.0);
  });

  it("returns 0.95 when activity was 3 days ago (1 day past grace, D-02)", () => {
    expect(computeQuality(daysAgo(3), NOW)).toBeCloseTo(0.95, 5);
  });

  it("returns 0.90 when activity was 4 days ago (2 days past grace)", () => {
    expect(computeQuality(daysAgo(4), NOW)).toBeCloseTo(0.90, 5);
  });

  it("returns 0.10 when activity was 100 days ago (floor at D-03)", () => {
    expect(computeQuality(daysAgo(100), NOW)).toBe(DECAY_FLOOR);
  });

  it("returns 0.10 when activity was 365 days ago (floor holds)", () => {
    expect(computeQuality(daysAgo(365), NOW)).toBe(DECAY_FLOOR);
  });

  it("handles sub-day precision correctly (2.5 days = still in grace)", () => {
    // 2.5 days = 60 hours; grace is 48h, so this is 12h past grace → 5% * (0.5 day) = 0.025 decay
    const twoAndHalfDaysAgo = new Date(NOW.getTime() - 2.5 * 24 * 60 * 60 * 1000);
    const quality = computeQuality(twoAndHalfDaysAgo, NOW);
    // 0.5 days past grace: 1.0 - 0.5 * 0.05 = 0.975
    expect(quality).toBeCloseTo(0.975, 5);
  });
});

// ============================================================
// habitatLevel
// ============================================================

describe("habitatLevel", () => {
  it("returns 1 when effectiveCardCount is 0 (D-08: new users start at level 1)", () => {
    expect(habitatLevel(0)).toBe(1);
  });

  it("returns 1 when effectiveCardCount is 4 (below first threshold of 5)", () => {
    expect(habitatLevel(4)).toBe(1);
  });

  it("returns 2 when effectiveCardCount is 5 (at first threshold, D-07)", () => {
    expect(habitatLevel(5)).toBe(2);
  });

  it("returns 2 when effectiveCardCount is 14 (just below second threshold)", () => {
    expect(habitatLevel(14)).toBe(2);
  });

  it("returns 3 when effectiveCardCount is 15 (at second threshold)", () => {
    expect(habitatLevel(15)).toBe(3);
  });

  it("returns 4 when effectiveCardCount is 30 (threshold[2]=30)", () => {
    expect(habitatLevel(30)).toBe(4);
  });

  it("returns 5 when effectiveCardCount is 50 (threshold[3]=50)", () => {
    expect(habitatLevel(50)).toBe(5);
  });

  it("returns 6 when effectiveCardCount is 80 (threshold[4]=80)", () => {
    expect(habitatLevel(80)).toBe(6);
  });

  it("returns 7 when effectiveCardCount is 120 (threshold[5]=120)", () => {
    expect(habitatLevel(120)).toBe(7);
  });

  it("returns 8 when effectiveCardCount is 170 (threshold[6]=170)", () => {
    expect(habitatLevel(170)).toBe(8);
  });

  it("returns 9 when effectiveCardCount is 230 (threshold[7]=230)", () => {
    expect(habitatLevel(230)).toBe(9);
  });

  it("returns 9 when effectiveCardCount is 299 (just below max threshold)", () => {
    expect(habitatLevel(299)).toBe(9);
  });

  it("returns 10 when effectiveCardCount is 300 (threshold[8]=300)", () => {
    expect(habitatLevel(300)).toBe(10);
  });

  it("returns 10 when effectiveCardCount is 400 (max, threshold[9]=400 — D-10)", () => {
    expect(habitatLevel(400)).toBe(10);
  });

  it("returns 10 (max) when effectiveCardCount is 1000 (D-10: capped at 10)", () => {
    expect(habitatLevel(1000)).toBe(10);
  });

  it("exports LEVEL_THRESHOLDS with 10 entries", () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(10);
    expect(LEVEL_THRESHOLDS[0]).toBe(5);
    expect(LEVEL_THRESHOLDS[9]).toBe(400);
  });
});

// ============================================================
// classifyMood
// ============================================================

describe("classifyMood", () => {
  it("returns 'excited' when minutesSinceActivity is 0 (D-13)", () => {
    expect(classifyMood(1.0, 0)).toBe("excited");
  });

  it("returns 'excited' when minutesSinceActivity is exactly 60 (boundary)", () => {
    expect(classifyMood(0.5, 60)).toBe("excited");
  });

  it("returns 'excited' when minutesSinceActivity is 30 (regardless of quality)", () => {
    expect(classifyMood(0.1, 30)).toBe("excited");
  });

  it("returns 'happy' when quality >= 0.75 and minutesSinceActivity > 60", () => {
    expect(classifyMood(0.75, 61)).toBe("happy");
  });

  it("returns 'happy' when quality = 1.0 and minutesSinceActivity is 120", () => {
    expect(classifyMood(1.0, 120)).toBe("happy");
  });

  it("returns 'happy' when quality >= 0.75 and minutesSinceActivity is null (new user)", () => {
    expect(classifyMood(1.0, null)).toBe("happy");
  });

  it("returns 'neutral' when quality is 0.74 and minutesSinceActivity > 60", () => {
    expect(classifyMood(0.74, 61)).toBe("neutral");
  });

  it("returns 'neutral' when quality = 0.40 and minutesSinceActivity > 60", () => {
    expect(classifyMood(0.40, 200)).toBe("neutral");
  });

  it("returns 'neutral' when quality >= 0.40 and minutesSinceActivity is null", () => {
    expect(classifyMood(0.50, null)).toBe("neutral");
  });

  it("returns 'sad' when quality = 0.39 and minutesSinceActivity > 60", () => {
    expect(classifyMood(0.39, 200)).toBe("sad");
  });

  it("returns 'sad' when quality = 0.10 (floor) and minutesSinceActivity > 60", () => {
    expect(classifyMood(0.10, 500)).toBe("sad");
  });

  it("returns 'sad' when quality < 0.40 and minutesSinceActivity is null", () => {
    expect(classifyMood(0.30, null)).toBe("sad");
  });
});

// ============================================================
// computeHabitatState
// ============================================================

describe("computeHabitatState", () => {
  it("new user (null lastActivityAt, 0 learned): level 1, quality 1.0, mood happy, isDecaying false", () => {
    const facts = makeFacts({ lastActivityAt: null, learnedCardCount: 0 });
    const state: HabitatState = computeHabitatState(facts, NOW);

    expect(state.level).toBe(1);
    expect(state.quality).toBe(1.0);
    expect(state.mood).toBe("happy");
    expect(state.isDecaying).toBe(false);
    expect(state.minutesSinceActivity).toBeNull();
    expect(state.learnedCardCount).toBe(0);
    expect(state.effectiveCardCount).toBe(0);
    expect(state.nextLevelThreshold).toBe(5); // next level (2) needs 5 cards
  });

  it("active user (just studied, 50 learned): mood excited, level 5", () => {
    // quality = 1.0 (just studied), effective = floor(1.0 * 50) = 50 -> level 5
    const facts = makeFacts({ lastActivityAt: hoursAgo(0), learnedCardCount: 50 });
    const state = computeHabitatState(facts, NOW);

    expect(state.quality).toBe(1.0);
    expect(state.effectiveCardCount).toBe(50);
    expect(state.level).toBe(5);
    expect(state.mood).toBe("excited"); // 0 minutes since activity
    expect(state.isDecaying).toBe(false);
  });

  it("decayed user (10 days inactive, 100 learned): quality 0.60, level 5, mood neutral", () => {
    // daysPastGrace = 10 - 2 = 8; quality = 1.0 - 8 * 0.05 = 0.60
    // effective = floor(0.60 * 100) = 60 -> level 5 (50 <= 60 < 80)
    const facts = makeFacts({ lastActivityAt: daysAgo(10), learnedCardCount: 100 });
    const state = computeHabitatState(facts, NOW);

    expect(state.quality).toBeCloseTo(0.60, 5);
    expect(state.effectiveCardCount).toBe(60);
    expect(state.level).toBe(5);
    expect(state.mood).toBe("neutral"); // quality 0.60 >= 0.40, < 0.75
    expect(state.isDecaying).toBe(true);
    expect(state.nextLevelThreshold).toBe(80); // need 80 for level 6
  });

  it("effectiveCardCount uses Math.floor (not round or ceil)", () => {
    // quality = 1.0 (recent), learnedCards = 14 -> effective = floor(1.0 * 14) = 14 -> level 2
    const facts = makeFacts({ lastActivityAt: hoursAgo(1), learnedCardCount: 14 });
    const state = computeHabitatState(facts, NOW);
    expect(state.effectiveCardCount).toBe(14);
    expect(state.level).toBe(2);
  });

  it("isDecaying is false when within grace period and lastActivityAt is not null", () => {
    const facts = makeFacts({ lastActivityAt: daysAgo(1), learnedCardCount: 10 });
    const state = computeHabitatState(facts, NOW);
    expect(state.isDecaying).toBe(false);
    expect(state.quality).toBe(1.0);
  });

  it("isDecaying is true when past grace period", () => {
    const facts = makeFacts({ lastActivityAt: daysAgo(5), learnedCardCount: 20 });
    const state = computeHabitatState(facts, NOW);
    expect(state.isDecaying).toBe(true);
  });

  it("minutesSinceActivity is null when lastActivityAt is null", () => {
    const facts = makeFacts({ lastActivityAt: null });
    const state = computeHabitatState(facts, NOW);
    expect(state.minutesSinceActivity).toBeNull();
  });

  it("minutesSinceActivity is correct when lastActivityAt is set", () => {
    const facts = makeFacts({ lastActivityAt: hoursAgo(2) }); // 2 hours = 120 minutes
    const state = computeHabitatState(facts, NOW);
    expect(state.minutesSinceActivity).toBeCloseTo(120, 0);
  });

  it("nextLevelThreshold is null when at level 10 (max, D-10)", () => {
    // Need 400+ effective cards to reach level 10
    const facts = makeFacts({ lastActivityAt: hoursAgo(1), learnedCardCount: 500 });
    const state = computeHabitatState(facts, NOW);
    expect(state.level).toBe(10);
    expect(state.nextLevelThreshold).toBeNull();
  });

  it("deeply decayed user (30 days, 400 learned): quality floored at 0.10, mood sad", () => {
    // daysPastGrace = 30 - 2 = 28; quality = 1.0 - 28 * 0.05 = -0.40 -> floor at 0.10
    // effective = floor(0.10 * 400) = 40 -> level 4 (30 <= 40 < 50)
    const facts = makeFacts({ lastActivityAt: daysAgo(30), learnedCardCount: 400 });
    const state = computeHabitatState(facts, NOW);

    expect(state.quality).toBe(0.10);
    expect(state.effectiveCardCount).toBe(40);
    expect(state.level).toBe(4);
    expect(state.mood).toBe("sad"); // quality 0.10 < 0.40
    expect(state.isDecaying).toBe(true);
  });

  it("learnedCardCount is preserved in state output", () => {
    const facts = makeFacts({ lastActivityAt: null, learnedCardCount: 42 });
    const state = computeHabitatState(facts, NOW);
    expect(state.learnedCardCount).toBe(42);
  });
});
