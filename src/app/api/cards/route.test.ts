import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing (mirrors src/app/api/dashboard/route.test.ts —
// the core's own DB/ownership behavior is covered by
// src/lib/core/decks.test.ts, so this file mocks it wholesale and owns
// only the HTTP concerns).
// ============================================================
const { mockGetSession, mockLimiterCheck, mockSaveCardCore } = vi.hoisted(
  () => ({
    mockGetSession: vi.fn(),
    mockLimiterCheck: vi.fn(),
    mockSaveCardCore: vi.fn(),
  }),
);

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ check: mockLimiterCheck })),
}));

vi.mock("@/lib/core/decks", () => ({
  saveCardCore: mockSaveCardCore,
}));

import { POST } from "./route";

const FAKE_USER_ID = "user-abc-123";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/cards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeMalformedReq(): Request {
  return new Request("http://localhost/api/cards", {
    method: "POST",
    body: "{not-valid-json",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLimiterCheck.mockReturnValue({ allowed: true });
});

describe("POST /api/cards", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await POST(
      makeReq({ deckId: "deck-1", front: "chat", back: "cat" }),
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockSaveCardCore).not.toHaveBeenCalled();
  });

  it("returns 429 with a numeric Retry-After header when rate-limited", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockLimiterCheck.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 30_000,
    });

    const res = await POST(
      makeReq({ deckId: "deck-1", front: "chat", back: "cat" }),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Too many requests" });
    expect(mockSaveCardCore).not.toHaveBeenCalled();
  });

  it("returns 400 on malformed JSON body", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });

    const res = await POST(makeMalformedReq());

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Invalid input" });
    expect(mockSaveCardCore).not.toHaveBeenCalled();
  });

  it("returns 400 when the body fails schema validation (front over 500 chars)", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });

    const res = await POST(
      makeReq({ deckId: "deck-1", front: "a".repeat(501), back: "cat" }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Invalid input" });
    expect(mockSaveCardCore).not.toHaveBeenCalled();
  });

  it("returns 403 when the core reports forbidden", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockSaveCardCore.mockResolvedValueOnce({ ok: false, code: "forbidden" });

    const res = await POST(
      makeReq({ deckId: "deck-1", front: "chat", back: "cat" }),
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "forbidden" });
  });

  it("returns 200 with the core's data verbatim, calling the core with the session's user id (not a client-supplied one)", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: FAKE_USER_ID } });
    mockSaveCardCore.mockResolvedValueOnce({
      ok: true,
      data: { id: "card-99" },
    });

    const res = await POST(
      makeReq({
        deckId: "deck-1",
        front: "chat",
        back: "cat",
        userId: "attacker-supplied-id",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string };
    expect(body).toEqual({ id: "card-99" });

    expect(mockSaveCardCore).toHaveBeenCalledTimes(1);
    const callArg = mockSaveCardCore.mock.calls[0]?.[0] as { userId: string };
    expect(callArg.userId).toBe(FAKE_USER_ID);
  });
});
