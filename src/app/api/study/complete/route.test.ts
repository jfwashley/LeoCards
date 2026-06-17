import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// WR-04 — idempotency of the study-complete write path.
//
// The Neon HTTP driver has no transactions, so a partial write followed by the
// client "Retry saving session" button re-POSTs the FULL grade batch. These
// tests assert the replay does not double-apply.
//
// The DB is mocked (no real Neon connection), but the mock faithfully models the
// two Postgres primitives the fix relies on, so "does not double-apply" is a real
// assertion rather than a structural one:
//   - recall_events: a Map keyed on the row id models PRIMARY KEY uniqueness.
//     `.onConflictDoNothing()` only inserts ids not already present — exactly what
//     ON CONFLICT DO NOTHING does for a replayed row with a deterministic id.
//   - cards: a Map models row state. The guarded UPDATE
//       WHERE id = ? AND (lastCommitId IS NULL OR lastCommitId <> ?)
//     is modeled as "apply only when the stored lastCommitId differs from the
//     incoming commitId", i.e. Postgres `IS DISTINCT FROM` semantics.
//   - the cards SELECT returns the CURRENT (post-write) masteryRound, so a replay
//     re-reads the already-advanced round — the only thing stopping a second
//     advance is the guard, which is what we are testing.
// study-engine is left REAL so computeCardUpdate genuinely drives the rounds.
// ============================================================

const h = vi.hoisted(() => ({
  // id -> row : models the recall_events PRIMARY KEY
  recallEventStore: new Map<string, { id: string }>(),
  // cardId -> applied state
  cardStore: new Map<
    string,
    { masteryRound: number; lastCommitId: string; recallCountWrites: number }
  >(),
  // cardId -> seed masteryRound the DB starts at (populated per test)
  knownCards: new Map<string, number>(),
  onConflictDoNothingCalls: { count: 0 },
  getSession: vi.fn(),
  limiterCheck: vi.fn(),
  getHabitatFacts: vi.fn(),
  computeHabitatState: vi.fn(),
  markMilestonesSeen: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/env", () => ({
  env: { STUDY_COOLDOWN_MINUTES: undefined, STUDY_NO_COOLDOWN: undefined },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: h.getSession } },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ check: h.limiterCheck })),
}));

vi.mock("@/lib/habitat-queries", () => ({
  getHabitatFacts: h.getHabitatFacts,
}));

vi.mock("@/lib/habitat-engine", () => ({
  computeHabitatState: h.computeHabitatState,
}));

vi.mock("@/lib/milestone-queries", () => ({
  markMilestonesSeen: h.markMilestonesSeen,
}));

// Replace the SQL operators with capturable descriptors so the mock can read the
// cardId and recognise the guard out of the UPDATE's WHERE clause. `sql` and
// `inArray` are kept real (the increment + the IN filter are untouched here).
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (col: unknown, val: unknown) => ({ __op: "eq", col, val }),
    ne: (col: unknown, val: unknown) => ({ __op: "ne", col, val }),
    isNull: (col: unknown) => ({ __op: "isNull", col }),
    or: (...args: unknown[]) => ({ __op: "or", args }),
    and: (...args: unknown[]) => ({ __op: "and", args }),
  };
});

type WhereDesc = { args?: Array<{ val?: string }> };

vi.mock("@/db", () => ({
  db: {
    // Route on the projection shape: the card-states SELECT projects masteryRound.
    select: (projection: Record<string, unknown>) => ({
      from: () => ({
        where: () => {
          if (projection && "masteryRound" in projection) {
            return Promise.resolve(
              [...h.knownCards.keys()].map((id) => ({
                id,
                masteryRound:
                  h.cardStore.get(id)?.masteryRound ?? h.knownCards.get(id),
              })),
            );
          }
          // deck-ownership SELECT — any non-empty row means "owned"
          return Promise.resolve([{ id: "deck-1" }]);
        },
      }),
    }),
    // recall_events uses onConflictDoNothing; habitat_metadata uses onConflictDoUpdate.
    insert: () => ({
      values: (rows: Array<{ id: string }>) => ({
        onConflictDoNothing: () => {
          h.onConflictDoNothingCalls.count++;
          for (const r of rows) {
            if (!h.recallEventStore.has(r.id)) h.recallEventStore.set(r.id, r);
          }
          return Promise.resolve();
        },
        onConflictDoUpdate: () => Promise.resolve(),
      }),
    }),
    // cards UPDATE — apply only when the stored commitId differs (IS DISTINCT FROM).
    update: () => ({
      set: (payload: { masteryRound: number; lastCommitId: string }) => ({
        where: (desc: WhereDesc) => {
          const cardId = desc?.args?.[0]?.val;
          if (cardId === undefined) return Promise.resolve();
          const incoming = payload.lastCommitId;
          const existing = h.cardStore.get(cardId);
          if (!existing || existing.lastCommitId !== incoming) {
            h.cardStore.set(cardId, {
              masteryRound: payload.masteryRound,
              lastCommitId: payload.lastCommitId,
              recallCountWrites: (existing?.recallCountWrites ?? 0) + 1,
            });
          }
          return Promise.resolve();
        },
      }),
    }),
  },
}));

import { POST, recallEventId } from "./route";

const CARD_ID = "card-1";
const COMMIT_A = "11111111-1111-1111-1111-111111111111";
const COMMIT_B = "22222222-2222-2222-2222-222222222222";

// Two grades that satisfy round 0 (n2t) AND round 1 (t2n), so a replayed batch
// that re-reads the advanced round WOULD advance again if it were not guarded.
const TWO_DIRECTION_GRADES = [
  { cardId: CARD_ID, direction: "n2t" as const, correct: true },
  { cardId: CARD_ID, direction: "t2n" as const, correct: true },
];

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/study/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  h.recallEventStore.clear();
  h.cardStore.clear();
  h.knownCards.clear();
  h.onConflictDoNothingCalls.count = 0;
  h.getSession.mockReset().mockResolvedValue({ user: { id: "user-1" } });
  h.limiterCheck.mockReset().mockReturnValue({ allowed: true });
  h.getHabitatFacts.mockReset().mockResolvedValue({});
  h.computeHabitatState.mockReset().mockReturnValue({ level: 1 });
  h.markMilestonesSeen.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/study/complete — happy path", () => {
  it("inserts one recall_event per grade (deterministic ids) and advances the card", async () => {
    h.knownCards.set(CARD_ID, 0);

    const res = await post({
      deckId: "deck-1",
      commitId: COMMIT_A,
      grades: TWO_DIRECTION_GRADES,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, leveledUp: null });

    // Deterministic ids derived from the commitId + index.
    expect([...h.recallEventStore.keys()].sort()).toEqual(
      [recallEventId(COMMIT_A, 0), recallEventId(COMMIT_A, 1)].sort(),
    );
    expect(h.onConflictDoNothingCalls.count).toBe(1);

    const card = h.cardStore.get(CARD_ID);
    expect(card?.masteryRound).toBe(1); // round 0 -> 1 (n2t satisfied)
    expect(card?.lastCommitId).toBe(COMMIT_A);
    expect(card?.recallCountWrites).toBe(1);
  });
});

describe("POST /api/study/complete — replay safety (WR-04)", () => {
  it("replaying the same commitId does not double-apply", async () => {
    h.knownCards.set(CARD_ID, 0);
    const body = {
      deckId: "deck-1",
      commitId: COMMIT_A,
      grades: TWO_DIRECTION_GRADES,
    };

    const first = await post(body);
    expect(first.status).toBe(200);
    expect(h.cardStore.get(CARD_ID)?.masteryRound).toBe(1);

    // The retry path re-POSTs the FULL batch with the SAME commitId.
    const second = await post(body);
    expect(second.status).toBe(200);

    // No duplicate recall_events (deterministic ids + ON CONFLICT DO NOTHING).
    expect(h.recallEventStore.size).toBe(2);
    // masteryRound did NOT double-advance: a re-read of round 1 + a correct t2n
    // would advance to 2 absent the guard.
    expect(h.cardStore.get(CARD_ID)?.masteryRound).toBe(1);
    // recallCount increment applied exactly once (the guarded UPDATE was a no-op).
    expect(h.cardStore.get(CARD_ID)?.recallCountWrites).toBe(1);
  });

  it("scopes idempotency to commitId: a genuinely new session re-applies", async () => {
    h.knownCards.set(CARD_ID, 0);

    await post({
      deckId: "deck-1",
      commitId: COMMIT_A,
      grades: TWO_DIRECTION_GRADES,
    });
    expect(h.cardStore.get(CARD_ID)?.masteryRound).toBe(1);

    // A new session sends a NEW commitId — the guard must NOT suppress it.
    await post({
      deckId: "deck-1",
      commitId: COMMIT_B,
      grades: TWO_DIRECTION_GRADES,
    });

    expect(h.cardStore.get(CARD_ID)?.masteryRound).toBe(2); // 1 -> 2 (t2n satisfied)
    expect(h.cardStore.get(CARD_ID)?.recallCountWrites).toBe(2);
    expect(h.recallEventStore.size).toBe(4); // distinct ids per commit
  });
});

describe("POST /api/study/complete — validation", () => {
  it("returns 400 and writes nothing when commitId is missing", async () => {
    h.knownCards.set(CARD_ID, 0);

    const res = await post({
      deckId: "deck-1",
      grades: [{ cardId: CARD_ID, direction: "n2t", correct: true }],
    });

    expect(res.status).toBe(400);
    expect(h.recallEventStore.size).toBe(0);
    expect(h.cardStore.size).toBe(0);
  });
});

describe("recallEventId", () => {
  it("is deterministic and unique per (commitId, index)", () => {
    expect(recallEventId(COMMIT_A, 0)).toBe(recallEventId(COMMIT_A, 0));
    expect(recallEventId(COMMIT_A, 0)).not.toBe(recallEventId(COMMIT_A, 1));
    expect(recallEventId(COMMIT_A, 0)).not.toBe(recallEventId(COMMIT_B, 0));
  });
});
