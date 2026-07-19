import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing — queue-based select chain mirrors
// src/app/api/debug/__tests__/state.test.ts exactly (each db.select() call
// pops the next factory so the scan / targetUser / clash lookups can each
// resolve independently within a single GET invocation).
// ============================================================

const {
  mockDbSelect,
  mockDbUpdate,
  mockDbDelete,
  updateChain,
  deleteChain,
  setSelectResults,
  restoreQueueImpl,
} = vi.hoisted(() => {
  function makeSelectChain(rows: unknown[]) {
    const chain = { from: vi.fn(), where: vi.fn().mockResolvedValue(rows) };
    chain.from.mockReturnValue(chain);
    return chain;
  }

  let queue: Array<() => ReturnType<typeof makeSelectChain>> = [];
  function setSelectResults(...rowSets: unknown[][]) {
    queue = rowSets.map((rows) => () => makeSelectChain(rows));
  }
  function selectQueueImpl() {
    const factory = queue.shift();
    return factory ? factory() : makeSelectChain([]);
  }
  function restoreQueueImpl() {
    mockDbSelect.mockImplementation(selectQueueImpl);
  }

  const mockDbSelect = vi.fn().mockImplementation(selectQueueImpl);

  const updateChain = {
    set: vi.fn(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  updateChain.set.mockReturnValue(updateChain);
  const mockDbUpdate = vi.fn().mockReturnValue(updateChain);

  const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
  const mockDbDelete = vi.fn().mockReturnValue(deleteChain);

  return {
    mockDbSelect,
    mockDbUpdate,
    mockDbDelete,
    updateChain,
    deleteChain,
    setSelectResults,
    restoreQueueImpl,
  };
});

vi.mock("@/db", () => ({
  db: { select: mockDbSelect, update: mockDbUpdate, delete: mockDbDelete },
}));

// Subject import — after all vi.mock() declarations
import { NextRequest } from "next/server";
import { GET } from "./route";

// ============================================================
// Fixtures
// ============================================================

const USER_ID = "user-verify-1";
const NEW_EMAIL = "new@example.com";
const GOOD_TOKEN = "good-token-abc";
const ORIGIN = "http://localhost:3000";

function makeReq(token?: string): NextRequest {
  const url = new URL(`${ORIGIN}/api/account/verify-email`);
  if (token !== undefined) url.searchParams.set("token", token);
  return new NextRequest(url);
}

function pendingRow(
  overrides: Partial<{
    identifier: string;
    value: string;
    expiresAt: Date;
  }> = {},
) {
  return {
    id: "verif-1",
    identifier: `change-email:${USER_ID}`,
    value: JSON.stringify({ token: GOOD_TOKEN, newEmail: NEW_EMAIL }),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function userRow(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: USER_ID,
    name: "Test User",
    email: "old@example.com",
    emailVerified: false,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    nativeLanguage: "en",
    ...overrides,
  };
}

// ============================================================
// Per-test reset
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  restoreQueueImpl();
  setSelectResults();

  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockResolvedValue(undefined);
  deleteChain.where.mockResolvedValue(undefined);
});

// ============================================================
// Tests
// ============================================================

describe("GET /api/account/verify-email — D-07 verification", () => {
  it("redirects to expired when no token is provided", async () => {
    const res = await GET(makeReq());

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/account?verified=expired`,
    );
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it("redirects to expired when the token matches no pending row", async () => {
    setSelectResults([pendingRow()]); // scan returns a row, but token differs

    const res = await GET(makeReq("wrong-token"));

    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/account?verified=expired`,
    );
  });

  it("redirects to expired when the matching row has already expired", async () => {
    setSelectResults([pendingRow({ expiresAt: new Date(Date.now() - 1000) })]);

    const res = await GET(makeReq(GOOD_TOKEN));

    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/account?verified=expired`,
    );
  });

  it("redirects to expired and deletes the row when the target user no longer exists", async () => {
    setSelectResults(
      [pendingRow()], // scan
      [], // targetUser lookup — user was deleted before the click
    );

    const res = await GET(makeReq(GOOD_TOKEN));

    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/account?verified=expired`,
    );
    expect(mockDbDelete).toHaveBeenCalled();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("redirects to expired and deletes the row when the new email was claimed by someone else since the request (race)", async () => {
    setSelectResults(
      [pendingRow()], // scan
      [userRow()], // targetUser found
      [userRow({ id: "someone-else", email: NEW_EMAIL })], // clash — different id
    );

    const res = await GET(makeReq(GOOD_TOKEN));

    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/account?verified=expired`,
    );
    expect(mockDbDelete).toHaveBeenCalled();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("applies the email update, deletes the row (single-use), and redirects to success on the happy path", async () => {
    setSelectResults(
      [pendingRow()], // scan
      [userRow()], // targetUser found
      [], // no clash — new email is free
    );

    const res = await GET(makeReq(GOOD_TOKEN));

    expect(mockDbUpdate).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ email: NEW_EMAIL }),
    );
    expect(mockDbDelete).toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      `${ORIGIN}/account?verified=success`,
    );
  });
});
