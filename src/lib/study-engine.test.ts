import { describe, expect, it } from "vitest";
import type { CardId } from "@/db/schema";
import {
  assembleSession,
  type CardForSession,
  computeCardUpdate,
  computeUnpauseUpdate,
  earliestCooldownEnd,
  type GradeEntry,
  getCardStage,
  interleave,
} from "./study-engine";

// ============================================================
// Test helpers
// ============================================================

const NOW = new Date("2026-01-15T12:00:00Z");
const PAST = new Date("2026-01-15T00:00:00Z"); // 12h ago
const FUTURE = new Date("2026-01-16T00:00:00Z"); // 12h from now

function makeCard(overrides: Partial<CardForSession>): CardForSession {
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

function makeCards(
  count: number,
  overrides: Partial<CardForSession> = {},
): CardForSession[] {
  return Array.from({ length: count }, (_, i) =>
    makeCard({ ...overrides, id: `card-${i + 1}` as CardId }),
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
      makeCard({
        id: "card-1" as CardId,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }),
      makeCard({
        id: "card-2" as CardId,
        createdAt: new Date("2026-01-03T00:00:00Z"),
      }),
      makeCard({
        id: "card-3" as CardId,
        createdAt: new Date("2026-01-02T00:00:00Z"),
      }),
    ];
    const result = assembleSession(cards, NOW);
    expect(result.map((c) => c.id)).toEqual(["card-2", "card-3", "card-1"]);
  });

  it("includes approximately 10% learned cards as resurface (isResurface=true)", () => {
    const learning = makeCards(10, { masteryRound: 0 });
    const learned = makeCards(5, { masteryRound: 3, id: "learned" as CardId });
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
    const learned = [makeCard({ id: "learned-1" as CardId, masteryRound: 3 })];
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
    expect(result[3]?.isResurface).toBe(true);
    expect(result[7]?.isResurface).toBe(true);
    expect(result[11]?.isResurface).toBe(true);
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

  // REGRESSION (2026-05-29): a real session presents a round-0 card ONCE in the
  // n2t direction and grades it once. The card MUST advance on that single
  // correct n2t — the old `2 n2t + 2 t2n` threshold made this impossible, so
  // every card was permanently stuck at round 0 and nothing ever became learned.
  it("advances round 0 -> 1 on a SINGLE correct n2t (realistic session), sets 12h cooldown", () => {
    const grades = makeGrades(CARD_ID, [{ direction: "n2t", correct: true }]);
    const result = computeCardUpdate(CARD_ID, 0, grades, NOW);
    expect(result.newRound).toBe(1);
    const diffMs = (result.cooldownUntil as Date).getTime() - NOW.getTime();
    expect(diffMs).toBe(12 * 3600 * 1000);
  });

  it("stays round 0 when the single n2t grade is INCORRECT", () => {
    const grades = makeGrades(CARD_ID, [{ direction: "n2t", correct: false }]);
    const result = computeCardUpdate(CARD_ID, 0, grades, NOW);
    expect(result.newRound).toBe(0);
    expect(result.cooldownUntil).toBeNull();
  });

  it("advances round 1 -> 2 on a SINGLE correct t2n (the round-1 direction), 24h cooldown", () => {
    const grades = makeGrades(CARD_ID, [{ direction: "t2n", correct: true }]);
    const result = computeCardUpdate(CARD_ID, 1, grades, NOW);
    expect(result.newRound).toBe(2);
    const diffMs = (result.cooldownUntil as Date).getTime() - NOW.getTime();
    expect(diffMs).toBe(24 * 3600 * 1000);
  });

  it("advances round 2 -> 3 (LEARNED) on a single correct in EITHER direction, no cooldown", () => {
    // Round 2 is presented in a random direction — a single correct in whichever
    // direction was shown must complete it.
    const n2t = computeCardUpdate(
      CARD_ID,
      2,
      makeGrades(CARD_ID, [{ direction: "n2t", correct: true }]),
      NOW,
    );
    expect(n2t.newRound).toBe(3);
    expect(n2t.cooldownUntil).toBeNull();
    const t2n = computeCardUpdate(
      CARD_ID,
      2,
      makeGrades(CARD_ID, [{ direction: "t2n", correct: true }]),
      NOW,
    );
    expect(t2n.newRound).toBe(3);
  });

  it("full progression 0 -> 3 across single-grade sessions reaches LEARNED", () => {
    let round = 0;
    const stages: Array<"n2t" | "t2n"> = ["n2t", "t2n", "n2t"]; // round 0,1,2 presentation
    for (let i = 0; i < 3; i++) {
      const r = computeCardUpdate(
        CARD_ID,
        round,
        makeGrades(CARD_ID, [
          { direction: stages[i] as "n2t" | "t2n", correct: true },
        ]),
        NOW,
      );
      round = r.newRound;
    }
    expect(round).toBe(3); // LEARNED (counts toward habitat learnedCardCount)
  });

  it("does not advance beyond currentRound + 1 in a single session (anti-inflation)", () => {
    const grades = makeGrades(CARD_ID, [
      { direction: "n2t", correct: true },
      { direction: "n2t", correct: true }, // extra correct in same session
    ]);
    const result = computeCardUpdate(CARD_ID, 0, grades, NOW);
    expect(result.newRound).toBe(1); // not 2 or 3
  });

  it("respects a cooldown override (QA dev/preview zeroes cooldowns)", () => {
    const grades = makeGrades(CARD_ID, [{ direction: "n2t", correct: true }]);
    const result = computeCardUpdate(CARD_ID, 0, grades, NOW, {
      0: 0,
      1: 0,
      2: null,
    });
    expect(result.newRound).toBe(1);
    expect(result.cooldownUntil).toBeNull(); // zeroed → immediately due again
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
      makeCard({ id: "card-2" as CardId, cooldownUntil: PAST }),
    ];
    expect(earliestCooldownEnd(cards, NOW)).toBeNull();
  });

  it("returns the earliest future cooldownUntil date", () => {
    const soon = new Date("2026-01-15T14:00:00Z"); // 2h from now
    const later = new Date("2026-01-16T12:00:00Z"); // 24h from now
    const cards = [
      makeCard({ cooldownUntil: later }),
      makeCard({ id: "card-2" as CardId, cooldownUntil: soon }),
    ];
    expect(earliestCooldownEnd(cards, NOW)).toEqual(soon);
  });

  it("ignores past cooldown dates", () => {
    const cards = [
      makeCard({ cooldownUntil: PAST }),
      makeCard({ id: "card-2" as CardId, cooldownUntil: FUTURE }),
    ];
    expect(earliestCooldownEnd(cards, NOW)).toEqual(FUTURE);
  });
});

// ============================================================
// computeUnpauseUpdate
// ============================================================

describe("computeUnpauseUpdate", () => {
  it("leaves NULL cooldown NULL", () => {
    const pausedAt = new Date("2026-01-10T00:00:00Z");
    const now = new Date("2026-01-15T00:00:00Z");
    expect(computeUnpauseUpdate(pausedAt, null, now)).toEqual({
      cooldownUntil: null,
      pausedAt: null,
    });
  });

  it("shifts future cooldown forward by exact pause duration", () => {
    const pausedAt = new Date("2026-01-10T00:00:00Z");
    const cooldownUntil = new Date("2026-01-11T00:00:00Z"); // due 1d after pause
    const now = new Date("2026-01-15T00:00:00Z"); // 5d after pause
    const result = computeUnpauseUpdate(pausedAt, cooldownUntil, now);
    expect(result.pausedAt).toBeNull();
    expect(result.cooldownUntil?.toISOString()).toBe(
      "2026-01-16T00:00:00.000Z",
    );
  });

  it("shifts past cooldown forward too (overdue card stays overdue by same amount)", () => {
    const pausedAt = new Date("2026-01-10T00:00:00Z");
    const cooldownUntil = new Date("2026-01-09T00:00:00Z"); // overdue by 1d at pause
    const now = new Date("2026-01-15T00:00:00Z");
    const result = computeUnpauseUpdate(pausedAt, cooldownUntil, now);
    expect(result.cooldownUntil?.toISOString()).toBe(
      "2026-01-14T00:00:00.000Z",
    );
  });

  it("zero-duration pause leaves cooldown unchanged", () => {
    const t = new Date("2026-01-10T00:00:00Z");
    const cooldown = new Date("2026-01-11T00:00:00Z");
    expect(
      computeUnpauseUpdate(t, cooldown, t).cooldownUntil?.toISOString(),
    ).toBe(cooldown.toISOString());
  });
});
