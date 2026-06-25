import { beforeEach, describe, expect, it, vi } from "vitest";

// Phase 15 / D-05 — /api/debug/time-shift route: gate-order unit tests.
//
// Gate order under test (mirrors route.ts exactly):
//   0. cheatEnabled()             → 404 if DEBUG_CHEAT_SECRET unset (fires BEFORE auth)
//   1. auth.api.getSession()      → 401 if no session
//   2. rate limit                 → 429 if exceeded (not tested here — mirrors cheat tests)
//   3. body parse/zod             → 400 if bad body
//   4. checkSecret()              → 403 if wrong secret
//   5a. clear:true branch         → deletes TIME_SHIFT_COOKIE, returns { ok: true, cleared: true }
//   5b. offsetMs happy path       → calls signTimeOffset(offsetMs), sets cookie, returns { ok: true }
//
// Mocking strategy mirrors src/app/api/debug/__tests__/state.test.ts:
//   - vi.hoisted() for mock factories
//   - top-level vi.mock() for module substitution
//   - beforeEach reset to happy-path defaults

// ============================================================
// Hoisted mock plumbing (runs before any vi.mock factory)
// ============================================================

const {
  mockGetSession,
  mockCheatEnabled,
  mockCheckSecret,
  mockSignTimeOffset,
  mockCookiesSet,
  mockCookiesDelete,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockCheatEnabled = vi.fn();
  const mockCheckSecret = vi.fn();
  const mockSignTimeOffset = vi.fn().mockReturnValue("signed-token");
  const mockCookiesSet = vi.fn();
  const mockCookiesDelete = vi.fn();

  return {
    mockGetSession,
    mockCheatEnabled,
    mockCheckSecret,
    mockSignTimeOffset,
    mockCookiesSet,
    mockCookiesDelete,
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
  cookies: vi
    .fn()
    .mockResolvedValue({ set: mockCookiesSet, delete: mockCookiesDelete }),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/debug-cheat", () => ({
  cheatEnabled: mockCheatEnabled,
  checkSecret: mockCheckSecret,
  signTimeOffset: mockSignTimeOffset,
  TIME_SHIFT_COOKIE: "leo-qa-time-offset",
}));

// Rate limiter — always allowed by default
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn().mockReturnValue({
    check: vi.fn().mockReturnValue({ allowed: true, retryAfterMs: 0 }),
  }),
}));

// Subject import — after all vi.mock() declarations
import { POST } from "@/app/api/debug/time-shift/route";

// ============================================================
// Fixtures
// ============================================================

const VALID_SECRET = "test-secret-at-least-16-chars-long";
const ONE_DAY_MS = 86_400_000;

function makeReq(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/debug/time-shift", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeSession(userId = "user-001") {
  return { user: { id: userId, email: "qa@test.local", name: "QA Tester" } };
}

// ============================================================
// Per-test reset
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Reinstall stable return values for mockSignTimeOffset after clearAllMocks
  mockSignTimeOffset.mockReturnValue("signed-token");

  // Happy-path defaults
  mockCheatEnabled.mockReturnValue(true);
  mockCheckSecret.mockReturnValue(true);
  mockGetSession.mockResolvedValue(makeSession());
});

// ============================================================
// Tests
// ============================================================

describe("POST /api/debug/time-shift — Phase 15 D-05", () => {
  // -------------------------------------------------------
  // Gate 0: 404 when cheatEnabled() is false (before auth)
  // -------------------------------------------------------
  describe("cheatEnabled() guard (fires before auth)", () => {
    it("returns 404 when cheatEnabled() is false", async () => {
      mockCheatEnabled.mockReturnValue(false);
      mockGetSession.mockResolvedValue(null); // would 401 if auth ran

      const res = await POST(
        makeReq({ secret: VALID_SECRET, offsetMs: ONE_DAY_MS }),
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Not found");
    });

    it("does NOT call auth.api.getSession when cheatEnabled() is false", async () => {
      mockCheatEnabled.mockReturnValue(false);

      await POST(makeReq({ secret: VALID_SECRET, offsetMs: ONE_DAY_MS }));

      // Cheat guard fires BEFORE auth — confirm session check is skipped (D-05)
      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // Gate 1: 401 when no authenticated session
  // -------------------------------------------------------
  describe("session auth guard", () => {
    it("returns 401 when there is no authenticated session", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await POST(
        makeReq({ secret: VALID_SECRET, offsetMs: ONE_DAY_MS }),
      );

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Unauthorized");
    });
  });

  // -------------------------------------------------------
  // Gate 3: 403 when checkSecret returns false
  // -------------------------------------------------------
  describe("secret gate", () => {
    it("returns 403 when checkSecret() returns false", async () => {
      mockCheckSecret.mockReturnValue(false);

      const res = await POST(
        makeReq({ secret: "wrong-secret", offsetMs: ONE_DAY_MS }),
      );

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Forbidden");
    });
  });

  // -------------------------------------------------------
  // Gate 2 (body validation): 400 on bad body shapes
  // -------------------------------------------------------
  describe("body validation", () => {
    it("returns 400 when neither offsetMs nor clear:true is supplied", async () => {
      const res = await POST(makeReq({ secret: VALID_SECRET }));

      expect(res.status).toBe(400);
    });

    it("returns 400 when offsetMs exceeds 30 days", async () => {
      const res = await POST(
        makeReq({
          secret: VALID_SECRET,
          offsetMs: 30 * 24 * 60 * 60 * 1000 + 1, // 1ms over limit
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------
  // Clear branch: deletes cookie, returns { ok: true, cleared: true }
  // -------------------------------------------------------
  describe("clear:true branch", () => {
    it("deletes TIME_SHIFT_COOKIE and returns { ok: true, cleared: true }", async () => {
      const res = await POST(makeReq({ secret: VALID_SECRET, clear: true }));

      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; cleared: boolean };
      expect(body.ok).toBe(true);
      expect(body.cleared).toBe(true);
      expect(mockCookiesDelete).toHaveBeenCalledWith("leo-qa-time-offset");
    });

    it("does NOT call signTimeOffset on the clear branch", async () => {
      await POST(makeReq({ secret: VALID_SECRET, clear: true }));

      expect(mockSignTimeOffset).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // Happy path: signs + sets cookie, returns { ok: true }
  // -------------------------------------------------------
  describe("happy path — set offset", () => {
    it("calls signTimeOffset with the supplied offsetMs", async () => {
      await POST(makeReq({ secret: VALID_SECRET, offsetMs: ONE_DAY_MS }));

      expect(mockSignTimeOffset).toHaveBeenCalledWith(ONE_DAY_MS);
    });

    it("sets the TIME_SHIFT_COOKIE with the signed value", async () => {
      await POST(makeReq({ secret: VALID_SECRET, offsetMs: ONE_DAY_MS }));

      expect(mockCookiesSet).toHaveBeenCalledWith(
        "leo-qa-time-offset",
        "signed-token",
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        }),
      );
    });

    it("returns { ok: true } on success", async () => {
      const res = await POST(
        makeReq({ secret: VALID_SECRET, offsetMs: ONE_DAY_MS }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
      expect((body as { cleared?: boolean }).cleared).toBeUndefined();
    });
  });
});
