import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing — mirrors src/app/api/cards/[id]/pause/route.test.ts's
// single select-then-query chain-mock convention, plus a spy replacing
// getStudyCards so the access-control ordering (never called on the
// forbidden path) is directly assertable.
// ============================================================
const { selectChain, mockGetStudyCards } = vi.hoisted(() => {
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
  };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);

  return { selectChain, mockGetStudyCards: vi.fn() };
});

vi.mock("@/db", () => ({
  db: { select: vi.fn().mockReturnValue(selectChain) },
}));

vi.mock("@/lib/study-queries", () => ({
  getStudyCards: mockGetStudyCards,
}));

import { db } from "@/db";
import type { UserId } from "@/db/schema";
import { loadStudySessionCore } from "./study";

const USER_ID = "user-1" as UserId;
const DECK_ID = "deck-1";
const NOW = new Date("2026-08-03T12:00:00.000Z");

interface RawCardFixture {
  id: string;
  front: string;
  back: string;
  masteryRound: number;
  cooldownUntil: Date | null;
  createdAt: Date;
  recallCount: number;
}

let cardSeq = 0;
function makeRawCard(overrides: Partial<RawCardFixture> = {}): RawCardFixture {
  cardSeq += 1;
  return {
    id: `card-${cardSeq}`,
    front: `front-${cardSeq}`,
    back: `back-${cardSeq}`,
    masteryRound: 0,
    cooldownUntil: null,
    createdAt: NOW,
    recallCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  cardSeq = 0;
  vi.mocked(db.select).mockReturnValue(
    selectChain as unknown as ReturnType<typeof db.select>,
  );
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
});

describe("loadStudySessionCore", () => {
  it("returns ok:false code:invalid for an empty deckId and never queries", async () => {
    const result = await loadStudySessionCore({
      userId: USER_ID,
      deckId: "",
      now: NOW,
    });

    expect(result).toEqual({ ok: false, code: "invalid" });
    expect(db.select).not.toHaveBeenCalled();
    expect(mockGetStudyCards).not.toHaveBeenCalled();
  });

  it("returns ok:false code:invalid for a missing deckId and never queries", async () => {
    const result = await loadStudySessionCore({
      userId: USER_ID,
      deckId: undefined as unknown as string,
      now: NOW,
    });

    expect(result).toEqual({ ok: false, code: "invalid" });
    expect(db.select).not.toHaveBeenCalled();
    expect(mockGetStudyCards).not.toHaveBeenCalled();
  });

  it("returns ok:false code:forbidden when the ownership query returns no row, and never calls getStudyCards", async () => {
    selectChain.where.mockResolvedValueOnce([]);

    const result = await loadStudySessionCore({
      userId: USER_ID,
      deckId: DECK_ID,
      now: NOW,
    });

    expect(result).toEqual({ ok: false, code: "forbidden" });
    expect(mockGetStudyCards).not.toHaveBeenCalled();
  });

  it("returns ok:true with the deckId echoed and cards assembled by the real session engine when the deck is owned", async () => {
    selectChain.where.mockResolvedValueOnce([{ id: DECK_ID }]);
    mockGetStudyCards.mockResolvedValueOnce([
      makeRawCard({ id: "card-1", masteryRound: 0 }),
    ]);

    const result = await loadStudySessionCore({
      userId: USER_ID,
      deckId: DECK_ID,
      now: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.data.deckId).toBe(DECK_ID);
    expect(result.data.cards).toHaveLength(1);
    expect(result.data.cards[0]).toMatchObject({
      id: "card-1",
      stage: "n2t",
    });
  });

  it("returns ok:true with cards: [] — not an error — when assembleSession yields nothing", async () => {
    selectChain.where.mockResolvedValueOnce([{ id: DECK_ID }]);
    mockGetStudyCards.mockResolvedValueOnce([]);

    const result = await loadStudySessionCore({
      userId: USER_ID,
      deckId: DECK_ID,
      now: NOW,
    });

    expect(result).toEqual({
      ok: true,
      data: { deckId: DECK_ID, cards: [] },
    });
  });

  it("serialises cooldownUntil to an ISO string when set (a past, already-due cooldown) and to null when absent, and createdAt to an ISO string", async () => {
    const pastCooldown = new Date(NOW.getTime() - 60 * 60 * 1000);
    selectChain.where.mockResolvedValueOnce([{ id: DECK_ID }]);
    mockGetStudyCards.mockResolvedValueOnce([
      makeRawCard({
        id: "card-no-cooldown",
        masteryRound: 0,
        cooldownUntil: null,
        createdAt: NOW,
      }),
      makeRawCard({
        id: "card-past-cooldown",
        masteryRound: 1,
        cooldownUntil: pastCooldown,
        createdAt: NOW,
      }),
    ]);

    const result = await loadStudySessionCore({
      userId: USER_ID,
      deckId: DECK_ID,
      now: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");

    const noCooldownCard = result.data.cards.find(
      (c) => c.id === "card-no-cooldown",
    );
    const pastCooldownCard = result.data.cards.find(
      (c) => c.id === "card-past-cooldown",
    );

    expect(noCooldownCard?.cooldownUntil).toBeNull();
    expect(pastCooldownCard?.cooldownUntil).toBe(pastCooldown.toISOString());
    expect(noCooldownCard?.createdAt).toBe(NOW.toISOString());
    expect(typeof noCooldownCard?.createdAt).toBe("string");
  });

  it("issues exactly one ownership query before any card read, resolving both id and forbidden paths from the same select", async () => {
    selectChain.where.mockResolvedValueOnce([{ id: DECK_ID }]);
    mockGetStudyCards.mockResolvedValueOnce([]);

    await loadStudySessionCore({ userId: USER_ID, deckId: DECK_ID, now: NOW });

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(selectChain.where).toHaveBeenCalledTimes(1);
    // The combined-WHERE shape itself — naming BOTH eq(decks.id, ...) AND
    // eq(decks.userId, ...) — is a static source guarantee, verified by this
    // plan's own acceptance-criteria grep against study.ts. A vi.hoisted()
    // chain mock has no SQL semantics to assert against at runtime (see
    // 28.1-04-SUMMARY.md's saveCardCore deviation for the same finding).
  });
});
