import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing (mirrors src/app/api/cards/[id]/pause/route.test.ts)
// ============================================================
const {
  mockGetSession,
  mockLimiterCheck,
  mockLoadDashboardCore,
  mockReadHabitatOverride,
  mockReadQaAuth,
  mockReadQaTimeOffset,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockLimiterCheck: vi.fn(),
  mockLoadDashboardCore: vi.fn(),
  mockReadHabitatOverride: vi.fn(),
  mockReadQaAuth: vi.fn(),
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

// The core's own DB behavior is covered by src/lib/core/dashboard.test.ts —
// this file mocks it wholesale and owns only the HTTP concerns.
vi.mock("@/lib/core/dashboard", () => ({
  loadDashboardCore: mockLoadDashboardCore,
}));

vi.mock("@/lib/debug-cheat", () => ({
  readHabitatOverride: mockReadHabitatOverride,
  readQaAuth: mockReadQaAuth,
  readQaTimeOffset: mockReadQaTimeOffset,
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

const FAKE_USER_ID = "user-abc-123";

function makeReq(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/dashboard");
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const SAMPLE_DASHBOARD_DATA = {
  needsOnboarding: false,
  decks: [{ id: "deck-1", name: "French #1", language: "fr" }],
  activeDeckId: "deck-1",
  nativeLanguage: "en",
  cards: [],
  hasDueCards: false,
  dueCount: 0,
  earliestCooldownEnd: null,
  allPaused: false,
  sleeping: false,
  habitat: {
    level: 1,
    quality: 1,
    mood: "happy",
    learnedCardCount: 0,
    effectiveCardCount: 0,
    isDecaying: false,
    minutesSinceActivity: null,
    nextLevelThreshold: 5,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLimiterCheck.mockReturnValue({ allowed: true });
  mockReadHabitatOverride.mockResolvedValue(null);
  mockReadQaAuth.mockResolvedValue(false);
  mockReadQaTimeOffset.mockResolvedValue(0);
});

describe("GET /api/dashboard", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await GET(makeReq());

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockLoadDashboardCore).not.toHaveBeenCalled();
  });

  it("returns 429 with a numeric Retry-After header when rate-limited", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: FAKE_USER_ID, nativeLanguage: "en" },
    });
    mockLimiterCheck.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 30_000,
    });

    const res = await GET(makeReq());

    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number.isNaN(Number(retryAfter))).toBe(false);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Too many requests" });
    expect(mockLoadDashboardCore).not.toHaveBeenCalled();
  });

  it("returns 403 when the core reports forbidden", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: FAKE_USER_ID, nativeLanguage: "en" },
    });
    mockLoadDashboardCore.mockResolvedValueOnce({
      ok: false,
      code: "forbidden",
    });

    const res = await GET(makeReq());

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "forbidden" });
  });

  it("returns 200 with the core's data verbatim and no wrapper key on the happy path", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: FAKE_USER_ID, nativeLanguage: "en" },
    });
    mockLoadDashboardCore.mockResolvedValueOnce({
      ok: true,
      data: SAMPLE_DASHBOARD_DATA,
    });

    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    // biome-ignore lint/suspicious/noExplicitAny: Response.json's body is untyped at the call site.
    const body = (await res.json()) as any;
    expect(body).toEqual(SAMPLE_DASHBOARD_DATA);
    expect(body).toHaveProperty("needsOnboarding");
    expect(body.data).toBeUndefined();
  });

  it("forwards ?deck= to the core as requestedDeckId", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: FAKE_USER_ID, nativeLanguage: "en" },
    });
    mockLoadDashboardCore.mockResolvedValueOnce({
      ok: true,
      data: SAMPLE_DASHBOARD_DATA,
    });

    await GET(makeReq({ deck: "deck-xyz" }));

    expect(mockLoadDashboardCore).toHaveBeenCalledWith(
      expect.objectContaining({ requestedDeckId: "deck-xyz" }),
    );
  });

  it("omits requestedDeckId when no ?deck= param is present", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: FAKE_USER_ID, nativeLanguage: "en" },
    });
    mockLoadDashboardCore.mockResolvedValueOnce({
      ok: true,
      data: SAMPLE_DASHBOARD_DATA,
    });

    await GET(makeReq());

    // biome-ignore lint/suspicious/noExplicitAny: mock.calls is untyped for a vi.fn() with no generic.
    const callArg = mockLoadDashboardCore.mock.calls[0]?.[0] as any;
    expect(callArg.requestedDeckId).toBeUndefined();
  });
});
