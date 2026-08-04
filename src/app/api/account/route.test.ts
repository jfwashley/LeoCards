import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing (mirrors src/app/api/dashboard/route.test.ts — the
// core's own composition is covered by src/lib/core/account.test.ts, so
// this file mocks it wholesale and owns only the HTTP concerns).
// ============================================================
const { mockGetSession, mockLimiterCheck, mockLoadAccountCore } = vi.hoisted(
  () => ({
    mockGetSession: vi.fn(),
    mockLimiterCheck: vi.fn(),
    mockLoadAccountCore: vi.fn(),
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

vi.mock("@/lib/core/account", () => ({
  loadAccountCore: mockLoadAccountCore,
}));

import { GET } from "./route";

const FAKE_USER_ID = "user-abc-123";

const SESSION_USER = {
  id: FAKE_USER_ID,
  name: "Ada Lovelace",
  email: "ada@example.com",
  createdAt: new Date("2026-01-15T10:30:00.000Z"),
  nativeLanguage: "fr",
};

const SAMPLE_ACCOUNT_DATA = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  createdAt: "2026-01-15T10:30:00.000Z",
  nativeLanguage: "fr",
  pendingEmail: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLimiterCheck.mockReturnValue({ allowed: true });
});

describe("GET /api/account", () => {
  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockLoadAccountCore).not.toHaveBeenCalled();
  });

  it("reads the session with disableCookieCache: true — the revocation-sensitive fresh read", async () => {
    mockGetSession.mockResolvedValueOnce({ user: SESSION_USER });
    mockLoadAccountCore.mockResolvedValueOnce({
      ok: true,
      data: SAMPLE_ACCOUNT_DATA,
    });

    await GET();

    expect(mockGetSession).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ disableCookieCache: true }),
      }),
    );
  });

  it("returns 429 with a numeric Retry-After header when rate-limited", async () => {
    mockGetSession.mockResolvedValueOnce({ user: SESSION_USER });
    mockLimiterCheck.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 15_000,
    });

    const res = await GET();

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("15");
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Too many requests" });
    expect(mockLoadAccountCore).not.toHaveBeenCalled();
  });

  it("returns 403 when the core reports forbidden", async () => {
    mockGetSession.mockResolvedValueOnce({ user: SESSION_USER });
    mockLoadAccountCore.mockResolvedValueOnce({
      ok: false,
      code: "forbidden",
    });

    const res = await GET();

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "forbidden" });
  });

  it("returns 200 with the core's data verbatim and no wrapper key on the happy path", async () => {
    mockGetSession.mockResolvedValueOnce({ user: SESSION_USER });
    mockLoadAccountCore.mockResolvedValueOnce({
      ok: true,
      data: SAMPLE_ACCOUNT_DATA,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    // biome-ignore lint/suspicious/noExplicitAny: Response.json's body is untyped at the call site.
    const body = (await res.json()) as any;
    expect(body).toEqual(SAMPLE_ACCOUNT_DATA);
    expect(body.data).toBeUndefined();
  });
});
