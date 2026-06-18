import { beforeEach, describe, expect, it, vi } from "vitest";

// QAOB-03 / T-14-06 — /api/debug/state route: user/deck scoping unit tests.
//
// Gate order under test (mirrors route.ts exactly):
//   1. cheatEnabled()  → 404 if DEBUG_CHEAT_SECRET unset (fires before auth)
//   2. auth.api.getSession() → 401 if no session
//   3. checkSecret(?secret) → 403 if wrong secret
//   4. deck ownership: deck must belong to session.user.id → empty cards[] if not owned
//   5. cards query capped at 200 rows (.limit(200))
//
// Mocking strategy mirrors src/app/api/study/__tests__/cooldown-config.test.ts and
// src/app/api/cards/[id]/unpause/route.test.ts — top-level vi.mock() + vi.hoisted().
//
// DB chain strategy: db.select() returns a NEW chain per call (via a factory queue),
// so the two sequential selects (ownership check, card fetch) resolve independently.

// ============================================================
// Hoisted mock plumbing (runs before any vi.mock factory)
// ============================================================

const {
  mockGetSession,
  mockDbSelect,
  mockCheatEnabled,
  mockCheckSecret,
  mockGetHabitatFacts,
  mockComputeHabitatState,
  mockVerifyOverride,
  mockCookiesGet,
  setSelectResults,
  restoreQueueImpl,
} = vi.hoisted(() => {
  // Builds a fresh, self-referencing Drizzle select chain that resolves
  // .limit() with the supplied rows. Independent per db.select() call so the
  // ownership query and the card-fetch query return different data.
  function makeChain(rows: unknown[]) {
    const chain = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn().mockResolvedValue(rows),
    };
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    return chain;
  }

  // Per-test queue: each db.select() call pops the next chain factory.
  let queue: Array<() => ReturnType<typeof makeChain>> = [];

  function setSelectResults(...rowSets: unknown[][]) {
    queue = rowSets.map((rows) => () => makeChain(rows));
  }

  // The queue-draining implementation. Exposed so beforeEach can reinstall
  // it after a test that overrides mockDbSelect.mockImplementation().
  function queueImpl() {
    const factory = queue.shift();
    return factory ? factory() : makeChain([]);
  }

  function restoreQueueImpl() {
    mockDbSelect.mockImplementation(queueImpl);
  }

  const mockDbSelect = vi.fn().mockImplementation(queueImpl);

  const mockGetSession = vi.fn();
  const mockCheatEnabled = vi.fn();
  const mockCheckSecret = vi.fn();
  const mockGetHabitatFacts = vi.fn();
  const mockComputeHabitatState = vi.fn();
  const mockVerifyOverride = vi.fn();
  const mockCookiesGet = vi.fn();

  return {
    mockGetSession,
    mockDbSelect,
    mockCheatEnabled,
    mockCheckSecret,
    mockGetHabitatFacts,
    mockComputeHabitatState,
    mockVerifyOverride,
    mockCookiesGet,
    setSelectResults,
    restoreQueueImpl,
    makeChain,
  };
});

// ============================================================
// Top-level mocks (hoisted by Vitest — evaluated before imports)
// ============================================================

vi.mock("@/env", () => ({
  env: { DEBUG_CHEAT_SECRET: "test-secret-at-least-16-chars-long" },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({ get: mockCookiesGet }),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/db", () => ({
  db: { select: mockDbSelect },
}));

// Mock debug-cheat so cheatEnabled() and checkSecret() are independently
// controllable without depending on env.DEBUG_CHEAT_SECRET at import time.
vi.mock("@/lib/debug-cheat", () => ({
  cheatEnabled: mockCheatEnabled,
  checkSecret: mockCheckSecret,
  verifyOverride: mockVerifyOverride,
  CHEAT_COOKIE: "leo-habitat-cheat",
}));

vi.mock("@/lib/habitat-queries", () => ({
  getHabitatFacts: mockGetHabitatFacts,
}));

vi.mock("@/lib/habitat-engine", () => ({
  computeHabitatState: mockComputeHabitatState,
}));

// Subject import — after all vi.mock() declarations
import { GET } from "@/app/api/debug/state/route";
import { db } from "@/db";

// ============================================================
// Fixtures
// ============================================================

const AUTHED_USER_ID = "user-owner-001";
const OWNED_DECK_ID = "deck-owned-aaa";
const FOREIGN_DECK_ID = "deck-foreign-bbb";
const VALID_SECRET = "test-secret-at-least-16-chars-long";

function makeReq(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/debug/state");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

function makeSession(userId = AUTHED_USER_ID) {
  return { user: { id: userId, email: "qa@example.com", name: "QA" } };
}

function makeCardRow(
  overrides: {
    id?: string;
    front?: string;
    masteryRound?: number;
    cooldownUntil?: Date | null;
    pausedAt?: Date | null;
  } = {},
) {
  return {
    id: overrides.id ?? "card-001",
    front: overrides.front ?? "bonjour",
    masteryRound: overrides.masteryRound ?? 0,
    cooldownUntil: overrides.cooldownUntil ?? null,
    pausedAt: overrides.pausedAt ?? null,
  };
}

// ============================================================
// Per-test reset
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Reinstall the queue-based implementation on mockDbSelect.
  // vi.clearAllMocks() clears .mock.calls/.results but does NOT reset
  // implementations — however a previous test may have called
  // mockDbSelect.mockImplementation() directly, so we always reinstall here.
  restoreQueueImpl();
  // Reset the queue to empty (all db.select() calls → [])
  setSelectResults();

  // Happy-path defaults
  mockCheatEnabled.mockReturnValue(true);
  mockCheckSecret.mockReturnValue(true);
  mockGetSession.mockResolvedValue(makeSession());
  mockGetHabitatFacts.mockResolvedValue({});
  mockComputeHabitatState.mockReturnValue({
    level: 1,
    mood: "happy",
    quality: 0.5,
  });
  mockVerifyOverride.mockReturnValue(null);
  mockCookiesGet.mockReturnValue(undefined);
});

// ============================================================
// Tests
// ============================================================

describe("GET /api/debug/state — QAOB-03 / T-14-06", () => {
  // -------------------------------------------------------
  // Behavior 1: 404 when cheatEnabled() returns false
  // Gate fires BEFORE auth — confirmed by asserting getSession not called.
  // -------------------------------------------------------
  describe("cheatEnabled() guard (fires before auth)", () => {
    it("returns 404 when cheatEnabled() is false, auth is not reached", async () => {
      mockCheatEnabled.mockReturnValue(false);
      mockGetSession.mockResolvedValue(null); // would 401 if auth ran

      const res = await GET(makeReq({ secret: VALID_SECRET }));

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Not found");
      // The cheat guard must fire BEFORE session is fetched
      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // Behavior 2: 401 when no authenticated session
  // -------------------------------------------------------
  describe("session auth guard", () => {
    it("returns 401 when there is no authenticated session", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await GET(makeReq({ secret: VALID_SECRET }));

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Unauthorized");
      // DB must NOT be touched before auth passes
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // Behavior 3 & 4: deck-ownership scoping (T-14-06)
  // A ?deck= belonging to a DIFFERENT user must produce cards:[].
  // The route verifies ownership via: WHERE decks.id = ? AND decks.userId = session.user.id
  // -------------------------------------------------------
  describe("deck-ownership scoping (T-14-06)", () => {
    it("returns cards:[] when the ownership check finds no row (foreign deck)", async () => {
      // Ownership query → no row (deck does not belong to authed user)
      setSelectResults([]); // ownership check returns empty → ownedDeck undefined

      const res = await GET(
        makeReq({ secret: VALID_SECRET, deck: FOREIGN_DECK_ID }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        real: unknown;
        forced: unknown;
        cards: unknown[];
      };
      // T-14-06 critical assertion: cross-user deck silently returns empty cards
      expect(body.cards).toEqual([]);
    });

    it("calls db.select() for the ownership check when a ?deck param is supplied", async () => {
      // Ownership query → no row
      setSelectResults([]);

      await GET(makeReq({ secret: VALID_SECRET, deck: FOREIGN_DECK_ID }));

      // The ownership db.select() must have been invoked
      expect(db.select).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // Behavior 4 (continued): cards returned when deck IS owned
  // -------------------------------------------------------
  describe("cards[] returned when session user owns the deck", () => {
    it("maps card rows including word, masteryRound, direction, learned fields", async () => {
      const fakeCard = makeCardRow({
        id: "card-001",
        front: "bonjour",
        masteryRound: 1,
      });
      // Two db.select() calls: ownership check → owned, then card fetch → [fakeCard]
      setSelectResults(
        [{ id: OWNED_DECK_ID }], // ownership: found → ownedDeck truthy
        [fakeCard], // card fetch
      );

      const res = await GET(
        makeReq({ secret: VALID_SECRET, deck: OWNED_DECK_ID }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        real: unknown;
        forced: unknown;
        cards: Array<{
          id: string;
          word: string;
          masteryRound: number;
          direction: string;
          cooldownUntil: string | null;
          pausedAt: string | null;
          learned: boolean;
        }>;
      };
      expect(body.cards).toHaveLength(1);
      // biome-ignore lint/style/noNonNullAssertion: length asserted above
      const card0 = body.cards[0]!;
      expect(card0.id).toBe("card-001");
      expect(card0.word).toBe("bonjour");
      expect(card0.masteryRound).toBe(1);
      // masteryRound=1 → direction "t2n" per masteryRoundToDirection()
      expect(card0.direction).toBe("t2n");
      expect(card0.learned).toBe(false);
    });

    it("marks a card as learned:true when masteryRound >= 3", async () => {
      const learnedCard = makeCardRow({ masteryRound: 3 });
      setSelectResults(
        [{ id: OWNED_DECK_ID }], // ownership
        [learnedCard], // cards
      );

      const res = await GET(
        makeReq({ secret: VALID_SECRET, deck: OWNED_DECK_ID }),
      );

      const body = (await res.json()) as {
        cards: Array<{ learned: boolean; direction: string }>;
      };
      expect(body.cards).toHaveLength(1);
      // biome-ignore lint/style/noNonNullAssertion: length asserted above
      const card0 = body.cards[0]!;
      expect(card0.learned).toBe(true);
      // masteryRound >= 2 → direction "either"
      expect(card0.direction).toBe("either");
    });
  });

  // -------------------------------------------------------
  // Behavior 5: result set capped at 200 rows
  // Verify that the limit argument passed to the cards query is exactly 200.
  // Strategy: let the ownership chain resolve normally, but use a custom
  // cards chain with a spy so we can assert the exact limit() argument.
  // -------------------------------------------------------
  describe("cards[] capped at 200 rows", () => {
    it("calls .limit(200) on the cards fetch — not a higher value", async () => {
      // Build chains manually so we can spy on the cards chain's limit()
      function makeChainLocal(rows: unknown[]) {
        const chain = {
          from: vi.fn(),
          where: vi.fn(),
          orderBy: vi.fn(),
          limit: vi.fn().mockResolvedValue(rows),
        };
        chain.from.mockReturnValue(chain);
        chain.where.mockReturnValue(chain);
        chain.orderBy.mockReturnValue(chain);
        return chain;
      }

      const ownedDeckChain = makeChainLocal([{ id: OWNED_DECK_ID }]);
      const cardsChain = makeChainLocal([]);
      const spyCardsLimit = vi.spyOn(cardsChain, "limit");

      // Override mockDbSelect just for this test to return chains in order
      let callCount = 0;
      mockDbSelect.mockImplementation(() => {
        callCount += 1;
        return callCount === 1 ? ownedDeckChain : cardsChain;
      });

      await GET(makeReq({ secret: VALID_SECRET, deck: OWNED_DECK_ID }));

      // The cards chain's limit must have been called with exactly 200
      expect(spyCardsLimit).toHaveBeenCalledWith(200);
      // Must NOT be called with anything greater than 200 (over-exposure guard)
      for (const [n] of spyCardsLimit.mock.calls as [number][]) {
        expect(n).toBeLessThanOrEqual(200);
      }
    });
  });

  // -------------------------------------------------------
  // Happy path: full response shape
  // -------------------------------------------------------
  describe("happy path — all guards pass, owned deck, two cards", () => {
    it("returns { real, forced, cards } with correct shape", async () => {
      const fakeReal = { level: 3, mood: "happy", quality: 0.8 };
      mockComputeHabitatState.mockReturnValue(fakeReal);
      mockVerifyOverride.mockReturnValue(null);

      const card1 = makeCardRow({ id: "c1", front: "chat", masteryRound: 0 });
      const card2 = makeCardRow({
        id: "c2",
        front: "chien",
        masteryRound: 2,
        cooldownUntil: new Date("2026-06-18T12:00:00Z"),
      });
      setSelectResults(
        [{ id: OWNED_DECK_ID }], // ownership
        [card1, card2], // cards
      );

      const res = await GET(
        makeReq({ secret: VALID_SECRET, deck: OWNED_DECK_ID }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        real: typeof fakeReal;
        forced: unknown;
        cards: unknown[];
      };
      expect(body.real).toEqual(fakeReal);
      expect(body.forced).toBeNull();
      expect(body.cards).toHaveLength(2);
    });
  });
});
