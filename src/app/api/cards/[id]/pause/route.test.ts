import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing (mirrors src/lib/deck-actions.test.ts)
// ============================================================
const { mockGetSession, mockLimiterCheck, selectChain, updateChain } =
  vi.hoisted(() => {
    const selectChain = {
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn(),
    };
    selectChain.from.mockReturnValue(selectChain);
    selectChain.innerJoin.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);

    const updateChain = {
      set: vi.fn(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    updateChain.set.mockReturnValue(updateChain);

    const mockGetSession = vi.fn();
    const mockLimiterCheck = vi.fn();

    return { mockGetSession, mockLimiterCheck, selectChain, updateChain };
  });

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ check: mockLimiterCheck })),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue(updateChain),
  },
}));

import { db } from "@/db";
import { POST } from "./route";

const FAKE_USER_ID = "user-abc-123";
const FAKE_CARD_ID = "card-def-789";

function makeCtx(id: string = FAKE_CARD_ID) {
  return { params: Promise.resolve({ id }) };
}

// biome-ignore lint/suspicious/noExplicitAny: NextRequest is a thin Request subclass; tests pass a plain Request and cast.
function makeReq(): any {
  return new Request("http://localhost/api/cards/x/pause", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(db.select).mockReturnValue(
    selectChain as unknown as ReturnType<typeof db.select>,
  );
  vi.mocked(db.update).mockReturnValue(
    updateChain as unknown as ReturnType<typeof db.update>,
  );

  selectChain.from.mockReturnValue(selectChain);
  selectChain.innerJoin.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockResolvedValue(undefined);

  // default: allowed
  mockLimiterCheck.mockReturnValue({ allowed: true });
});

describe("POST /api/cards/[id]/pause", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    // biome-ignore lint/suspicious/noExplicitAny: route handler ctx shape
    const res = await POST(makeReq(), makeCtx() as any);

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
    expect(db.select).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After header when rate-limited", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockLimiterCheck.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 30_000,
    });

    // biome-ignore lint/suspicious/noExplicitAny: route handler ctx shape
    const res = await POST(makeReq(), makeCtx() as any);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Too many requests" });
    expect(db.select).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 403 when card is not owned (ownership join empty)", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    selectChain.where.mockResolvedValueOnce([]);

    // biome-ignore lint/suspicious/noExplicitAny: route handler ctx shape
    const res = await POST(makeReq(), makeCtx() as any);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Forbidden" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("is idempotent: 200 no-op when already paused (no db.update)", async () => {
    const existingPausedAt = new Date("2026-05-10T12:00:00.000Z");
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_CARD_ID, pausedAt: existingPausedAt, cooldownUntil: null },
    ]);

    // biome-ignore lint/suspicious/noExplicitAny: route handler ctx shape
    const res = await POST(makeReq(), makeCtx() as any);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { pausedAt: string };
    expect(body).toEqual({ pausedAt: existingPausedAt.toISOString() });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 200 and writes pausedAt=now when card is owned and active", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_CARD_ID, pausedAt: null, cooldownUntil: null },
    ]);

    const before = Date.now();
    // biome-ignore lint/suspicious/noExplicitAny: route handler ctx shape
    const res = await POST(makeReq(), makeCtx() as any);
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);

    // The SET clause must include pausedAt as a Date roughly equal to "now"
    const setArg = updateChain.set.mock.calls[0]?.[0] as {
      pausedAt: Date;
    };
    expect(setArg).toHaveProperty("pausedAt");
    expect(setArg.pausedAt).toBeInstanceOf(Date);
    expect(setArg.pausedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(setArg.pausedAt.getTime()).toBeLessThanOrEqual(after);

    const body = (await res.json()) as { pausedAt: string };
    expect(typeof body.pausedAt).toBe("string");
    expect(new Date(body.pausedAt).toISOString()).toBe(body.pausedAt);
  });
});
