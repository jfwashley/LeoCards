import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing (mirrors pause/route.test.ts)
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
  return new Request("http://localhost/api/cards/x/unpause", {
    method: "POST",
  });
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

  mockLimiterCheck.mockReturnValue({ allowed: true });
});

describe("POST /api/cards/[id]/unpause", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq(), makeCtx());

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After header when rate-limited", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockLimiterCheck.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 30_000,
    });

    const res = await POST(makeReq(), makeCtx());

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 403 when card not owned", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    selectChain.where.mockResolvedValueOnce([]);

    const res = await POST(makeReq(), makeCtx());

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Forbidden" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("is idempotent: 200 no-op when card is already active (pausedAt === null)", async () => {
    const existingCooldown = new Date("2026-06-01T00:00:00.000Z");
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_CARD_ID, pausedAt: null, cooldownUntil: existingCooldown },
    ]);

    const res = await POST(makeReq(), makeCtx());

    expect(res.status).toBe(200);
    const body = (await res.json()) as { cooldownUntil: string | null };
    expect(body).toEqual({ cooldownUntil: existingCooldown.toISOString() });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 200 and shifts cooldownUntil forward by pause duration in a single UPDATE (no lastStudiedAt)", async () => {
    const pausedAt = new Date("2026-05-01T00:00:00.000Z");
    const cooldownUntil = new Date("2026-05-02T00:00:00.000Z"); // 1d after pausedAt
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_CARD_ID, pausedAt, cooldownUntil },
    ]);

    const before = Date.now();
    const res = await POST(makeReq(), makeCtx());
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);

    // The SET clause must contain BOTH cooldownUntil AND pausedAt: null,
    // and MUST NOT contain lastStudiedAt (Pitfall 4).
    const updateSetArg = updateChain.set.mock.calls[0]?.[0] as {
      cooldownUntil: Date | null;
      pausedAt: null;
    };
    expect(updateSetArg).toHaveProperty("cooldownUntil");
    expect(updateSetArg).toHaveProperty("pausedAt");
    expect(updateSetArg.pausedAt).toBeNull();
    expect(updateSetArg).not.toHaveProperty("lastStudiedAt");

    // The shifted cooldownUntil = original cooldownUntil + (now - pausedAt).
    // Since "now" is taken inside the handler, the shift must lie in
    // [cooldownUntil + (before - pausedAt), cooldownUntil + (after - pausedAt)].
    const shifted = updateSetArg.cooldownUntil;
    expect(shifted).toBeInstanceOf(Date);
    const shiftedMs = (shifted as Date).getTime();
    const minExpected = cooldownUntil.getTime() + (before - pausedAt.getTime());
    const maxExpected = cooldownUntil.getTime() + (after - pausedAt.getTime());
    expect(shiftedMs).toBeGreaterThanOrEqual(minExpected);
    expect(shiftedMs).toBeLessThanOrEqual(maxExpected);

    const body = (await res.json()) as { cooldownUntil: string | null };
    expect(typeof body.cooldownUntil).toBe("string");
    expect(new Date(body.cooldownUntil as string).getTime()).toBe(shiftedMs);
  });

  it("returns 200 and writes { cooldownUntil: null, pausedAt: null } when paused with NULL cooldown (NULL stays NULL)", async () => {
    const pausedAt = new Date("2026-05-01T00:00:00.000Z");
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_CARD_ID, pausedAt, cooldownUntil: null },
    ]);

    const res = await POST(makeReq(), makeCtx());

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);

    const updateSetArg = updateChain.set.mock.calls[0]?.[0] as {
      cooldownUntil: Date | null;
      pausedAt: null;
    };
    expect(updateSetArg.cooldownUntil).toBeNull();
    expect(updateSetArg.pausedAt).toBeNull();
    expect(updateSetArg).not.toHaveProperty("lastStudiedAt");

    const body = (await res.json()) as { cooldownUntil: string | null };
    expect(body).toEqual({ cooldownUntil: null });
  });
});
