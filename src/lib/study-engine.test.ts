import { describe, expect, it } from "vitest";
import type { CardId } from "@/db/schema";
import {
  type CardForSession,
  type GradeEntry,
  assembleSession,
  computeCardUpdate,
  earliestCooldownEnd,
  getCardStage,
  interleave,
} from "./study-engine";

// ============================================================
// Test helpers
// ============================================================

const NOW = new Date("2026-01-15T12:00:00Z");
const PAST = new Date("2026-01-15T00:00:00Z"); // 12h ago
const FUTURE = new Date("2026-01-16T00:00:00Z"); // 12h from now

function makeCard(
  overrides: Partial<CardForSession> & { id?: string },
): CardForSession {
  return {
    id: (overrides.id ?? "card-1") as CardId,
    front: "hello",
    back: "bonjour",
    masteryRound: overrides.masteryRound ?? 0,
    cooldownUntil: overrides.cooldownUntil ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00Z"),
    isResurface: overrides.isResurface ?? false,
  };
}

function makeCards(count: number, overrides: Partial<CardForSession> = {}): CardForSession[] {
  return Array.from({ length: count }, (_, i) =>
    makeCard({ ...overrides, id: `card-${i + 1}` }),
  );
}

// ============================================================
// assembleSession
// ============================================================

describe("assembleSession", () => {
  it("returns empty array when no cards are due (all in cooldown)", () => {
    const cards = makeCards(3, { cooldownUntil: FUTURE });
    const result = assembleSession(cards, NOW);
    expect(result).toHaveLength(0);
  });

  it("returns all unlearned due cards sorted newest-first (by createdAt descending)", () => {
    const cards = [
      makeCard({ id: "card-1", createdAt: new Date("2026-01-01T00:00:00Z") }),
      makeCard({ id: "card-2", createdAt: new Date("2026-01-03T00:00:00Z") }),
      makeCard({ id: "card-3", createdAt: new Date("2026-01-02T00:00:00Z") }),
    ];
    const result = assembleSession(cards, NOW);
    expect(result.map((c) => c.id)).toEqual(["card-2", "card-3", "card-1"]);
  });

  it("includes approximately 10% learned cards as resurface (isResurface=true)", () => {
    const learning = makeCards(10, { masteryRound: 0 });
    const learned = makeCards(5, { masteryRound: 3, id: "learned" });
    // rename learned cards
    const learnedCards = learned.map((c, i) => ({
      ...c,
      id: `learned-${i}` as CardId,
    }));
    const result = assembleSession([...learning, ...learnedCards], NOW);
    const resurface = result.filter((c) => c.isResurface);
    // 10% of 10 = 1
    expect(resurface).toHaveLength(1);
  });

  it("resurface count is min 1 when at least 1 learned card exists and learning cards exist", () => {
    const learning = makeCards(2, { masteryRound: 0 });
    const learned = [makeCard({ id: "learned-1", masteryRound: 3 })];
    const result = assembleSession([...learning, ...learned], NOW);
    const resurface = result.filter((c) => c.isResurface);
    expect(resurface.length).toBeGreaterThanOrEqual(1);
  });

  it("resurface count is floor(dueLearning.length * 0.1) when > 10 learning cards", () => {
    const learning = makeCards(20, { masteryRound: 0 });
    const learnedCards = Array.from({ length: 10 }, (_, i) =>
      makeCard({ id: `learned-${i}` as CardId, masteryRound: 3 }),
    );
    const result = assembleSession([...learning, ...learnedCards], NOW);
    const resurface = result.filter((c) => c.isResurface);
    // floor(20 * 0.1) = 2
    expect(resurface).toHaveLength(2);
  });

  it("excludes cards where cooldownUntil is in the future", () => {
    const cards = makeCards(3, { cooldownUntil: FUTURE });
    const result = assembleSession(cards, NOW);
    expect(result).toHaveLength(0);
  });

  it("includes cards where cooldownUntil is null", () => {
    const cards = makeCards(3, { cooldownUntil: null });
    const result = assembleSession(cards, NOW);
    expect(result.length).toBe(3);
  });

  it("includes cards where cooldownUntil is in the past", () => {
    const cards = makeCards(3, { cooldownUntil: PAST });
    const result = assembleSession(cards, NOW);
    expect(result.length).toBe(3);
  });
});

// ============================================================
// interleave
// ============================================================

describe("interleave", () => {
  it("places 1 resurface card every 3 learning cards (interval=3)", () => {
    const learning = makeCards(9, { masteryRound: 0 });
    const resurface = makeCards(3, { masteryRound: 3 }).map((c, i) => ({
      ...c,
      id: `r-${i}` as CardId,
      isResurface: true,
    }));
    const result = interleave(learning, resurface, 3);
    // Positions 3, 7, 11 should be resurface (0-indexed: after every 3 learning)
    expect(result[3].isResurface).toBe(true);
    expect(result[7].isResurface).toBe(true);
    expect(result[11].isResurface).toBe(true);
  });

  it("returns only learning cards when no resurface cards", () => {
    const learning = makeCards(5, { masteryRound: 0 });
    const result = interleave(learning, [], 3);
    expect(result).toHaveLength(5);
    expect(result.every((c) => !c.isResurface)).toBe(true);
  });

  it("returns only resurface cards when no learning cards", () => {
    const resurface = makeCards(3, { masteryRound: 3 }).map((c, i) => ({
      ...c,
      id: `r-${i}` as CardId,
      isResurface: true,
    }));
    const result = interleave([], resurface, 3);
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.isResurface)).toBe(true);
  });

  it("handles case where resurface count exceeds learning count", () => {
    const learning = makeCards(2, { masteryRound: 0 });
    const resurface = makeCards(5, { masteryRound: 3 }).map((c, i) => ({
      ...c,
      id: `r-${i}` as CardId,
      isResurface: true,
    }));
    const result = interleave(learning, resurface, 3);
    // All learning and remaining resurface should be included
    expect(result).toHaveLength(7);
  });
});

// ============================================================
// getCardStage
// ============================================================

describe("getCardStage", () => {
  it("returns 'n2t' when masteryRound is 0 (Stage 1)", () => {
    const card = makeCard({ masteryRound: 0 });
    expect(getCardStage(card)).toBe("n2t");
  });

  it("returns 't2n' when masteryRound is 1 (Stage 2)", () => {
    const card = makeCard({ masteryRound: 1 });
    expect(getCardStage(card)).toBe("t2n");
  });

  it("returns either 'n2t' or 't2n' when masteryRound is 2 (Stage 3, random)", () => {
    const card = makeCard({ masteryRound: 2 });
    const results = new Set(
      Array.from({ length: 50 }, () => getCardStage(card)),
    );
    expect(results.has("n2t") || results.has("t2n")).toBe(true);
    expect(results.size).toBeGreaterThan(0);
  });

  it("returns either 'n2t' or 't2n' when masteryRound is 3 (resurface, random)", () => {
    const card = makeCard({ masteryRound: 3 });
    const results = new Set(
      Array.from({ length: 50 }, () => getCardStage(card)),
    );
    expect(results.has("n2t") || results.has("t2n")).toBe(true);
    expect(results.size).toBeGreaterThan(0);
  });
});

// ============================================================
// computeCardUpdate
// ============================================================

describe("computeCardUpdate", () => {
  const CARD_ID = "card-1" as CardId;

  function makeGrades(
    cardId: CardId,
    entries: Array<{ direction: "n2t" | "t2n"; correct: boolean }>,
  ): GradeEntry[] {
    return entries.map((e) => ({ cardId, ...e }));
  }

  it("advances round 0 -> 1 when 2 n2t correct + 2 t2n correct, sets 12h cooldown", () => {
    const grades = makeGrades(CARD_ID, [
      { direction: "n2t", correct: true },
      { direction: "n2t", correct: true },
      { direction: "t2n", correct: true },
      { direction: "t2n", correct: true },
    ]);
    const result = computeCardUpdate(CARD_ID, 0, grades, NOW);
    expect(result.newRound).toBe(1);
    expect(result.cooldownUntil).not.toBeNull();
    // 12h = 43200000ms
    const diffMs =
      result.cooldownUntil!.getTime() - NOW.getTime();
    expect(diffMs).toBe(12 * 3600 * 1000);
  });

  it("stays round 0 when only 1 n2t correct + 2 t2n correct (threshold not met)", () => {
    const grades = makeGrades(CARD_ID, [
      { direction: "n2t", correct: true },
      { direction: "t2n", correct: true },
      { direction: "t2n", correct: true },
    ]);
    const result = computeCardUpdate(CARD_ID, 0, grades, NOW);
    expect(result.newRound).toBe(0);
    expect(result.cooldownUntil).toBeNull();
  });

  it("advances round 1 -> 2 when 1 n2t correct + 1 t2n correct, sets 24h cooldown", () => {
    const grades = makeGrades(CARD_ID, [
      { direction: "n2t", correct: true },
      { direction: "t2n", correct: true },
    ]);
    const result = computeCardUpdate(CARD_ID, 1, grades, NOW);
    expect(result.newRound).toBe(2);
    expect(result.cooldownUntil).not.toBeNull();
    // 24h = 86400000ms
    const diffMs =
      result.cooldownUntil!.getTime() - NOW.getTime();
    expect(diffMs).toBe(24 * 3600 * 1000);
  });

  it("advances round 2 -> 3 (LEARNED) when 1 n2t correct + 1 t2n correct, no cooldown", () => {
    const grades = makeGrades(CARD_ID, [
      { direction: "n2t", correct: true },
      { direction: "t2n", correct: true },
    ]);
    const result = computeCardUpdate(CARD_ID, 2, grades, NOW);
    expect(result.newRound).toBe(3);
    expect(result.cooldownUntil).toBeNull();
  });

  it("does not advance beyond currentRound + 1 in a single session (anti-inflation)", () => {
    // Round 0 with extra grades — should only advance to round 1, not beyond
    const grades = makeGrades(CARD_ID, [
      { direction: "n2t", correct: true },
      { direction: "n2t", correct: true },
      { direction: "n2t", correct: true }, // extra
      { direction: "t2n", correct: true },
      { direction: "t2n", correct: true },
      { direction: "t2n", correct: true }, // extra
    ]);
    const result = computeCardUpdate(CARD_ID, 0, grades, NOW);
    expect(result.newRound).toBe(1); // not 2 or 3
  });

  it("recallCountDelta sums all correct grades regardless of round advancement", () => {
    const grades = makeGrades(CARD_ID, [
      { direction: "n2t", correct: true },
      { direction: "n2t", correct: false },
      { direction: "t2n", correct: true },
      { direction: "t2n", correct: false },
    ]);
    const result = computeCardUpdate(CARD_ID, 0, grades, NOW);
    // 2 correct total
    expect(result.recallCountDelta).toBe(2);
  });
});

// ============================================================
// earliestCooldownEnd
// ============================================================

describe("earliestCooldownEnd", () => {
  it("returns null when no cards have future cooldowns", () => {
    const cards = [
      makeCard({ cooldownUntil: null }),
      makeCard({ id: "card-2", cooldownUntil: PAST }),
    ];
    expect(earliestCooldownEnd(cards, NOW)).toBeNull();
  });

  it("returns the earliest future cooldownUntil date", () => {
    const soon = new Date("2026-01-15T14:00:00Z"); // 2h from now
    const later = new Date("2026-01-16T12:00:00Z"); // 24h from now
    const cards = [
      makeCard({ cooldownUntil: later }),
      makeCard({ id: "card-2", cooldownUntil: soon }),
    ];
    expect(earliestCooldownEnd(cards, NOW)).toEqual(soon);
  });

  it("ignores past cooldown dates", () => {
    const cards = [
      makeCard({ cooldownUntil: PAST }),
      makeCard({ id: "card-2", cooldownUntil: FUTURE }),
    ];
    expect(earliestCooldownEnd(cards, NOW)).toEqual(FUTURE);
  });
});
