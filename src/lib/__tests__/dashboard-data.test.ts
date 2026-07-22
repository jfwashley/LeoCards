import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardId, DeckId, UserId } from "@/db/schema";

// ============================================================
// PERF-16 — dashboard data-pass consolidation.
//
// Wave 0 (RED until Task 2): the dashboard currently fetches a deck's cards
// TWICE (getDeckCards all-columns + getStudyCards subset), stitches them
// with a per-row `studyCards.find()` (O(n^2)), and issues a separate
// getUserNativeLanguage query for a field better-auth already returns on
// session.user. This test asserts the consolidated contract via
// count/shape assertions only — never timing (D-09):
//   1. getDeckCards is called exactly once per render; getStudyCards is
//      never called (the study subset is derived in JS from the single
//      fetch instead).
//   2. getUserNativeLanguage is never called — nativeLanguage resolves
//      from session.user.nativeLanguage.
//   3. The JS-derived study subset (deriveStudySubset, a pure helper in
//      study-queries.ts) equals what getStudyCards' own query/shape would
//      have produced for the same fixture (fixture-based equality, proving
//      no behavior change).
// ============================================================

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserDecks: vi.fn(),
  getDeckCards: vi.fn(),
  getUserNativeLanguage: vi.fn(),
  getStudyCards: vi.fn(),
  getHabitatFacts: vi.fn(),
  readHabitatOverride: vi.fn(),
  readQaAuth: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: h.redirect,
}));

// Pre-refactor call path (auth.api.getSession) — mocked so Task 1's RED run
// against the CURRENT page.tsx doesn't hit real better-auth/DB.
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: h.getSession } },
}));

// Post-refactor call path (27-01's cached accessor) — same underlying mock
// fn/session fixture as @/lib/auth above, so this test needs no edits
// between RED (Task 1) and GREEN (Task 2).
vi.mock("@/lib/auth-session", () => ({
  getSession: h.getSession,
  getSessionFresh: h.getSession,
}));

vi.mock("@/lib/deck-queries", () => ({
  getUserDecks: h.getUserDecks,
  getDeckCards: h.getDeckCards,
  getUserNativeLanguage: h.getUserNativeLanguage,
}));

// Partial mock: keep the REAL deriveStudySubset (the pure helper this plan
// introduces) while replacing getStudyCards with a spy — proves the
// consolidated dashboard path never calls the old two-query function.
vi.mock("@/lib/study-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/study-queries")>();
  return {
    ...actual,
    getStudyCards: h.getStudyCards,
  };
});

vi.mock("@/lib/habitat-queries", () => ({
  getHabitatFacts: h.getHabitatFacts,
}));

vi.mock("@/lib/debug-cheat", () => ({
  readHabitatOverride: h.readHabitatOverride,
  readQaAuth: h.readQaAuth,
}));

import DashboardPage from "@/app/(protected)/dashboard/page";
import { deriveStudySubset } from "@/lib/study-queries";

const USER_ID = "user-1" as UserId;
const DECK_ID = "deck-1" as DeckId;

function buildCards() {
  const d1 = new Date("2026-01-01T00:00:00Z");
  const d2 = new Date("2026-01-02T00:00:00Z");
  const d3 = new Date("2026-01-03T00:00:00Z");

  return [
    {
      id: "card-a" as CardId,
      deckId: DECK_ID,
      front: "chat",
      back: "cat",
      source: "manual",
      recallCount: 2,
      masteryRound: 1,
      cooldownUntil: null,
      lastStudiedAt: null,
      lastCommitId: null,
      pausedAt: null,
      createdAt: d1,
      updatedAt: d1,
    },
    // Paused — masteryRound 3 pre-pause, must be EXCLUDED from the derived
    // study subset (mirrors getStudyCards' isNull(pausedAt) filter).
    {
      id: "card-b" as CardId,
      deckId: DECK_ID,
      front: "chien",
      back: "dog",
      source: "manual",
      recallCount: 5,
      masteryRound: 3,
      cooldownUntil: new Date("2026-06-01T00:00:00Z"),
      lastStudiedAt: d2,
      lastCommitId: "commit-1",
      pausedAt: d2,
      createdAt: d2,
      updatedAt: d2,
    },
    {
      id: "card-c" as CardId,
      deckId: DECK_ID,
      front: "oiseau",
      back: "bird",
      source: "wordlist",
      recallCount: 0,
      masteryRound: 0,
      cooldownUntil: null,
      lastStudiedAt: null,
      lastCommitId: null,
      pausedAt: null,
      createdAt: d3,
      updatedAt: d3,
    },
  ];
}

describe("deriveStudySubset (PERF-16 — pure query-layer helper)", () => {
  it("filters out paused cards and projects the same columns getStudyCards selects", () => {
    const allCards = buildCards();
    const subset = deriveStudySubset(allCards);

    expect(subset).toHaveLength(2);
    expect(subset.map((c) => c.id).sort()).toEqual(["card-a", "card-c"]);

    const cardA = subset.find((c) => c.id === "card-a");
    expect(cardA).toEqual({
      id: "card-a",
      front: "chat",
      back: "cat",
      masteryRound: 1,
      cooldownUntil: null,
      createdAt: allCards[0]?.createdAt,
      recallCount: 2,
    });
  });

  it("returns an empty array when every card is paused", () => {
    const allCards = buildCards().map((c) => ({
      ...c,
      pausedAt: new Date("2026-01-01T00:00:00Z"),
    }));
    expect(deriveStudySubset(allCards)).toEqual([]);
  });
});

describe("DashboardPage data pass (PERF-16 — consolidation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.getSession.mockResolvedValue({
      user: { id: USER_ID, nativeLanguage: "en" },
    });
    h.getUserDecks.mockResolvedValue([
      { id: DECK_ID, userId: USER_ID, language: "fr", name: "French" },
    ]);
    h.getDeckCards.mockResolvedValue(buildCards());
    h.getUserNativeLanguage.mockResolvedValue("en");
    h.getStudyCards.mockResolvedValue([]);
    h.getHabitatFacts.mockResolvedValue({
      userId: USER_ID,
      lastActivityAt: null,
      learnedCardCount: 0,
    });
    h.readHabitatOverride.mockResolvedValue(null);
    h.readQaAuth.mockResolvedValue(false);
  });

  it("issues exactly ONE card-fetching query (getDeckCards); getStudyCards is never called", async () => {
    await DashboardPage({ searchParams: Promise.resolve({}) });

    expect(h.getDeckCards).toHaveBeenCalledTimes(1);
    expect(h.getStudyCards).not.toHaveBeenCalled();
  });

  it("resolves native language from the session, never calling getUserNativeLanguage", async () => {
    await DashboardPage({ searchParams: Promise.resolve({}) });

    expect(h.getUserNativeLanguage).not.toHaveBeenCalled();
  });
});
