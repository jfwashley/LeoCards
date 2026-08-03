import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing (mirrors src/app/api/dashboard/route.test.ts)
// ============================================================
const {
  mockGetSession,
  mockLimiterCheck,
  mockLoadStudySessionCore,
  mockReadQaTimeOffset,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockLimiterCheck: vi.fn(),
  mockLoadStudySessionCore: vi.fn(),
  mockReadQaTimeOffset: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ check: mockLimiterCheck })),
}));

// The core's own DB/assembly behavior is covered by src/lib/core/study.test.ts
// — this file mocks it wholesale and owns only the HTTP concerns.
vi.mock("@/lib/core/study", () => ({
  loadStudySessionCore: mockLoadStudySessionCore,
}));

vi.mock("@/lib/debug-cheat", () => ({
  readQaTimeOffset: mockReadQaTimeOffset,
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

const FAKE_USER_ID = "user-abc-123";

function makeReq(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/study");
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const SAMPLE_SESSION_DATA = {
  deckId: "deck-1",
  cards: [
    {
      id: "card-1",
      front: "chat",
      back: "cat",
      masteryRound: 0,
      cooldownUntil: null,
      createdAt: "2026-08-03T12:00:00.000Z",
      isResurface: false,
      stage: "n2t",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLimiterCheck.mockReturnValue({ allowed: true });
  mockReadQaTimeOffset.mockResolvedValue(0);
});

describe("GET /api/study", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await GET(makeReq({ deck: "deck-1" }));

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockLoadStudySessionCore).not.toHaveBeenCalled();
  });

  it("returns 429 with a numeric Retry-After header when rate-limited", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockLimiterCheck.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 30_000,
    });

    const res = await GET(makeReq({ deck: "deck-1" }));

    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number.isNaN(Number(retryAfter))).toBe(false);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Too many requests" });
    expect(mockLoadStudySessionCore).not.toHaveBeenCalled();
  });

  it('returns 400 with body { error: "invalid" } when ?deck= is missing', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockLoadStudySessionCore.mockResolvedValueOnce({
      ok: false,
      code: "invalid",
    });

    const res = await GET(makeReq());

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "invalid" });
  });

  it('returns 403 with body { error: "forbidden" } and no card data when the core reports forbidden', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockLoadStudySessionCore.mockResolvedValueOnce({
      ok: false,
      code: "forbidden",
    });

    const res = await GET(makeReq({ deck: "foreign-deck" }));

    expect(res.status).toBe(403);
    // biome-ignore lint/suspicious/noExplicitAny: Response.json's body is untyped at the call site.
    const body = (await res.json()) as any;
    expect(body).toEqual({ error: "forbidden" });
    expect(body.cards).toBeUndefined();
  });

  it("returns 200 with the core's data verbatim and no wrapper key on the happy path", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockLoadStudySessionCore.mockResolvedValueOnce({
      ok: true,
      data: SAMPLE_SESSION_DATA,
    });

    const res = await GET(makeReq({ deck: "deck-1" }));

    expect(res.status).toBe(200);
    // biome-ignore lint/suspicious/noExplicitAny: Response.json's body is untyped at the call site.
    const body = (await res.json()) as any;
    expect(body).toEqual(SAMPLE_SESSION_DATA);
    expect(body.data).toBeUndefined();
  });

  it("returns 200 with cards: [] on an empty session — never a 404, never a redirect", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockLoadStudySessionCore.mockResolvedValueOnce({
      ok: true,
      data: { deckId: "deck-1", cards: [] },
    });

    const res = await GET(makeReq({ deck: "deck-1" }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { deckId: string; cards: unknown[] };
    expect(body).toEqual({ deckId: "deck-1", cards: [] });
  });

  it("passes the deck query parameter and the QA time-shifted now to the core", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockReadQaTimeOffset.mockResolvedValueOnce(5000);
    mockLoadStudySessionCore.mockResolvedValueOnce({
      ok: true,
      data: SAMPLE_SESSION_DATA,
    });

    const before = Date.now();
    await GET(makeReq({ deck: "deck-1" }));
    const after = Date.now();

    // biome-ignore lint/suspicious/noExplicitAny: mock.calls is untyped for a vi.fn() with no generic.
    const callArg = mockLoadStudySessionCore.mock.calls[0]?.[0] as any;
    expect(callArg.deckId).toBe("deck-1");
    expect(callArg.now).toBeInstanceOf(Date);
    expect(callArg.now.getTime()).toBeGreaterThanOrEqual(before + 5000);
    expect(callArg.now.getTime()).toBeLessThanOrEqual(after + 5000);
  });
});
