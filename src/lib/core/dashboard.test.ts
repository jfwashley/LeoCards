import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before vi.mock factories — reuses the mocked-query-module
// shape from src/lib/__tests__/dashboard-data.test.ts (the 27-04 PERF-16
// regression test), scoped to what loadDashboardCore itself imports.
const {
  mockGetUserDecks,
  mockGetDeckCards,
  mockGetHabitatFacts,
  mockGetStudyCards,
} = vi.hoisted(() => ({
  mockGetUserDecks: vi.fn(),
  mockGetDeckCards: vi.fn(),
  mockGetHabitatFacts: vi.fn(),
  mockGetStudyCards: vi.fn(),
}));

vi.mock("@/lib/deck-queries", () => ({
  getUserDecks: mockGetUserDecks,
  getDeckCards: mockGetDeckCards,
}));

vi.mock("@/lib/habitat-queries", () => ({
  getHabitatFacts: mockGetHabitatFacts,
}));

// Partial mock: keep the REAL deriveStudySubset (so the composition under
// test is exercised end-to-end, including its filtering/shape) while
// replacing getStudyCards with a spy — proves loadDashboardCore never falls
// back to the old two-query path (PERF-16 regression guard).
vi.mock("@/lib/study-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/study-queries")>();
  return {
    ...actual,
    getStudyCards: mockGetStudyCards,
  };
});

import { computeHabitatState } from "@leocards/domain/habitat";
import { assembleSession } from "@leocards/domain/study";
import type { UserId } from "@/db/schema";
import { deriveStudySubset } from "@/lib/study-queries";
import { loadDashboardCore } from "./dashboard";

type LoadDashboardCoreInput = Parameters<typeof loadDashboardCore>[0];

const USER_ID = "user-1" as UserId;
const DECK_A_ID = "deck-a";
const DECK_B_ID = "deck-b";
const NOW = new Date("2026-08-03T12:00:00.000Z");

const EMPTY_HABITAT_FACTS = {
  userId: USER_ID,
  lastActivityAt: null,
  learnedCardCount: 0,
};

interface DeckFixture {
  id: string;
  userId: string;
  language: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

function makeDeckRow(
  id: string,
  overrides: Partial<DeckFixture> = {},
): DeckFixture {
  return {
    id,
    userId: USER_ID,
    language: "fr",
    name: "French #1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

interface CardFixture {
  id: string;
  deckId: string;
  front: string;
  back: string;
  source: string;
  recallCount: number;
  masteryRound: number;
  cooldownUntil: Date | null;
  lastStudiedAt: Date | null;
  lastCommitId: string | null;
  pausedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

let cardSeq = 0;
function makeCardRow(overrides: Partial<CardFixture> = {}): CardFixture {
  cardSeq += 1;
  return {
    id: `card-${cardSeq}`,
    deckId: DECK_A_ID,
    front: `front-${cardSeq}`,
    back: `back-${cardSeq}`,
    source: "manual",
    recallCount: 0,
    masteryRound: 0,
    cooldownUntil: null,
    lastStudiedAt: null,
    lastCommitId: null,
    pausedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<LoadDashboardCoreInput> = {},
): LoadDashboardCoreInput {
  return {
    userId: USER_ID,
    nativeLanguage: "en",
    now: NOW,
    qaMode: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  cardSeq = 0;
});

describe("loadDashboardCore", () => {
  describe("zero decks", () => {
    it("returns needsOnboarding true with empty-state fields, a populated habitat, and issues no getDeckCards call", async () => {
      const facts = {
        userId: USER_ID,
        lastActivityAt: null,
        learnedCardCount: 7,
      };
      mockGetUserDecks.mockResolvedValueOnce([]);
      mockGetHabitatFacts.mockResolvedValueOnce(facts);

      const result = await loadDashboardCore(baseInput());

      const expectedHabitat = computeHabitatState(facts, NOW);

      expect(result).toEqual({
        ok: true,
        data: {
          needsOnboarding: true,
          decks: [],
          activeDeckId: null,
          nativeLanguage: "en",
          cards: [],
          hasDueCards: false,
          dueCount: 0,
          earliestCooldownEnd: null,
          allPaused: false,
          sleeping: false,
          habitat: expectedHabitat,
        },
      });
      expect(mockGetDeckCards).not.toHaveBeenCalled();
    });
  });

  describe("populated dashboard — call counts (PERF-16)", () => {
    it("returns needsOnboarding false and calls getDeckCards exactly once with the active deck id", async () => {
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([makeCardRow()]);

      const result = await loadDashboardCore(baseInput());

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.needsOnboarding).toBe(false);
      expect(mockGetDeckCards).toHaveBeenCalledTimes(1);
      expect(mockGetDeckCards).toHaveBeenCalledWith(DECK_A_ID);
    });

    it("never calls getStudyCards — the study subset is derived in JS from the single fetch", async () => {
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([makeCardRow()]);

      await loadDashboardCore(baseInput());

      expect(mockGetStudyCards).not.toHaveBeenCalled();
    });
  });

  describe("active deck resolution", () => {
    it("selects the deck matching requestedDeckId when it belongs to the caller", async () => {
      mockGetUserDecks.mockResolvedValueOnce([
        makeDeckRow(DECK_A_ID),
        makeDeckRow(DECK_B_ID, { name: "French #2" }),
      ]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([]);

      const result = await loadDashboardCore(
        baseInput({ requestedDeckId: DECK_B_ID }),
      );

      expect(mockGetDeckCards).toHaveBeenCalledWith(DECK_B_ID);
      if (result.ok) expect(result.data.activeDeckId).toBe(DECK_B_ID);
    });

    it("falls back to the first deck when requestedDeckId matches nothing owned by the caller", async () => {
      mockGetUserDecks.mockResolvedValueOnce([
        makeDeckRow(DECK_A_ID),
        makeDeckRow(DECK_B_ID),
      ]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([]);

      const result = await loadDashboardCore(
        baseInput({ requestedDeckId: "unowned-or-missing-id" }),
      );

      expect(mockGetDeckCards).toHaveBeenCalledWith(DECK_A_ID);
      if (result.ok) expect(result.data.activeDeckId).toBe(DECK_A_ID);
    });
  });

  describe("card row shaping — paused masking + qaMode gating", () => {
    it("masks a paused card to masteryRound 0 and cooldownUntil null regardless of its stored values", async () => {
      const pausedAt = new Date("2026-08-01T00:00:00.000Z");
      const futureCooldown = new Date("2026-08-10T00:00:00.000Z");
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "card-paused",
          masteryRound: 2,
          cooldownUntil: futureCooldown,
          pausedAt,
        }),
      ]);

      // qaMode true on purpose: proves the paused mask wins even when
      // qaMode would otherwise expose a stored cooldown.
      const result = await loadDashboardCore(baseInput({ qaMode: true }));

      if (result.ok) {
        expect(result.data.cards).toEqual([
          expect.objectContaining({
            id: "card-paused",
            masteryRound: 0,
            cooldownUntil: null,
            pausedAt: pausedAt.toISOString(),
          }),
        ]);
      } else {
        throw new Error("expected ok result");
      }
    });

    it("with qaMode false, returns null cooldownUntil for an unpaused card with a stored cooldown", async () => {
      const futureCooldown = new Date("2026-08-10T00:00:00.000Z");
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "card-1",
          masteryRound: 1,
          cooldownUntil: futureCooldown,
          pausedAt: null,
        }),
      ]);

      const result = await loadDashboardCore(baseInput({ qaMode: false }));

      if (result.ok) {
        expect(result.data.cards[0]?.cooldownUntil).toBeNull();
      } else {
        throw new Error("expected ok result");
      }
    });

    it("with qaMode true, returns the stored cooldown as an ISO string for an unpaused card", async () => {
      const futureCooldown = new Date("2026-08-10T00:00:00.000Z");
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "card-1",
          masteryRound: 1,
          cooldownUntil: futureCooldown,
          pausedAt: null,
        }),
      ]);

      const result = await loadDashboardCore(baseInput({ qaMode: true }));

      if (result.ok) {
        expect(result.data.cards[0]?.cooldownUntil).toBe(
          futureCooldown.toISOString(),
        );
      } else {
        throw new Error("expected ok result");
      }
    });
  });

  describe("derived session flags", () => {
    it("dueCount equals assembleSession(...)'s output length and hasDueCards is dueCount > 0", async () => {
      // 10 unpaused due cards + 3 unpaused learned cards engages the
      // resurface/interleave path, so this proves equality against the
      // real engine rather than a hand count.
      const dueCards = Array.from({ length: 10 }, (_, i) =>
        makeCardRow({
          id: `due-${i}`,
          masteryRound: 0,
          cooldownUntil: null,
          pausedAt: null,
        }),
      );
      const learnedCards = Array.from({ length: 3 }, (_, i) =>
        makeCardRow({
          id: `learned-${i}`,
          masteryRound: 3,
          cooldownUntil: null,
          pausedAt: null,
        }),
      );
      const allCards = [...dueCards, ...learnedCards];

      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce(allCards);

      const result = await loadDashboardCore(baseInput());

      // deriveStudySubset is called for real here (unmocked) so its param
      // type expects the branded CardId shape from @/db/schema — the plain
      // CardFixture.id string is a runtime-equivalent stand-in, cast at
      // this single call site rather than branding every fixture literal.
      const expectedSession = assembleSession(
        deriveStudySubset(
          allCards as unknown as Parameters<typeof deriveStudySubset>[0],
        ).map((c) => ({
          id: c.id,
          front: c.front,
          back: c.back,
          masteryRound: c.masteryRound,
          cooldownUntil: c.cooldownUntil,
          createdAt: c.createdAt,
          isResurface: false,
        })),
        NOW,
      );

      if (result.ok) {
        expect(expectedSession.length).toBeGreaterThan(0);
        expect(result.data.dueCount).toBe(expectedSession.length);
        expect(result.data.hasDueCards).toBe(expectedSession.length > 0);
      } else {
        throw new Error("expected ok result");
      }
    });

    it("hasDueCards is false and dueCount is 0 when nothing is due", async () => {
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "learned-1",
          masteryRound: 3,
          cooldownUntil: null,
          pausedAt: null,
        }),
      ]);

      const result = await loadDashboardCore(baseInput());

      if (result.ok) {
        expect(result.data.dueCount).toBe(0);
        expect(result.data.hasDueCards).toBe(false);
      } else {
        throw new Error("expected ok result");
      }
    });

    it("earliestCooldownEnd is an ISO string for the earliest active cooldown", async () => {
      const soonCooldown = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
      const laterCooldown = new Date(NOW.getTime() + 5 * 60 * 60 * 1000);
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "cd-1",
          masteryRound: 1,
          cooldownUntil: laterCooldown,
          pausedAt: null,
        }),
        makeCardRow({
          id: "cd-2",
          masteryRound: 1,
          cooldownUntil: soonCooldown,
          pausedAt: null,
        }),
      ]);

      const result = await loadDashboardCore(baseInput());

      if (result.ok) {
        expect(result.data.earliestCooldownEnd).toBe(
          soonCooldown.toISOString(),
        );
      } else {
        throw new Error("expected ok result");
      }
    });

    it("earliestCooldownEnd is null when no cooldown is active", async () => {
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "due-1",
          masteryRound: 0,
          cooldownUntil: null,
          pausedAt: null,
        }),
      ]);

      const result = await loadDashboardCore(baseInput());

      if (result.ok) {
        expect(result.data.earliestCooldownEnd).toBeNull();
      } else {
        throw new Error("expected ok result");
      }
    });

    it("allPaused is true when cards exist, nothing is due, there is no cooldown, and every card is paused", async () => {
      const pausedAt = new Date("2026-08-01T00:00:00.000Z");
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "p-1",
          masteryRound: 2,
          cooldownUntil: null,
          pausedAt,
        }),
        makeCardRow({
          id: "p-2",
          masteryRound: 1,
          cooldownUntil: null,
          pausedAt,
        }),
      ]);

      const result = await loadDashboardCore(baseInput());

      if (result.ok) {
        expect(result.data.allPaused).toBe(true);
        expect(result.data.hasDueCards).toBe(false);
        expect(result.data.earliestCooldownEnd).toBeNull();
      } else {
        throw new Error("expected ok result");
      }
    });

    it("allPaused is false when at least one card is unpaused", async () => {
      const pausedAt = new Date("2026-08-01T00:00:00.000Z");
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "p-1",
          masteryRound: 2,
          cooldownUntil: null,
          pausedAt,
        }),
        makeCardRow({
          id: "due-1",
          masteryRound: 0,
          cooldownUntil: null,
          pausedAt: null,
        }),
      ]);

      const result = await loadDashboardCore(baseInput());

      if (result.ok) {
        expect(result.data.allPaused).toBe(false);
      } else {
        throw new Error("expected ok result");
      }
    });

    it("sleeping is true when earliestCooldownEnd is set and nothing is due", async () => {
      const futureCooldown = new Date(NOW.getTime() + 3 * 60 * 60 * 1000);
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "cd-1",
          masteryRound: 1,
          cooldownUntil: futureCooldown,
          pausedAt: null,
        }),
      ]);

      const result = await loadDashboardCore(baseInput());

      if (result.ok) {
        expect(result.data.sleeping).toBe(true);
        expect(result.data.hasDueCards).toBe(false);
        expect(result.data.earliestCooldownEnd).toBe(
          futureCooldown.toISOString(),
        );
      } else {
        throw new Error("expected ok result");
      }
    });

    it("sleeping is false when cards are due even if a cooldown also exists", async () => {
      const futureCooldown = new Date(NOW.getTime() + 3 * 60 * 60 * 1000);
      mockGetUserDecks.mockResolvedValueOnce([makeDeckRow(DECK_A_ID)]);
      mockGetHabitatFacts.mockResolvedValueOnce(EMPTY_HABITAT_FACTS);
      mockGetDeckCards.mockResolvedValueOnce([
        makeCardRow({
          id: "cd-1",
          masteryRound: 1,
          cooldownUntil: futureCooldown,
          pausedAt: null,
        }),
        makeCardRow({
          id: "due-1",
          masteryRound: 0,
          cooldownUntil: null,
          pausedAt: null,
        }),
      ]);

      const result = await loadDashboardCore(baseInput());

      if (result.ok) {
        expect(result.data.sleeping).toBe(false);
        expect(result.data.hasDueCards).toBe(true);
      } else {
        throw new Error("expected ok result");
      }
    });
  });
});
