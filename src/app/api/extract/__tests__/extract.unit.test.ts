import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before vi.mock factories — use it to create shared mocks
const { mockGetSession, mockLimiterCheck, mockGenerateText } = vi.hoisted(() => {
  return {
    mockGetSession: vi.fn(),
    mockLimiterCheck: vi.fn(),
    mockGenerateText: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn().mockReturnValue({ check: mockLimiterCheck }),
}));

vi.mock("ai", () => ({
  generateText: mockGenerateText,
  Output: { object: vi.fn().mockReturnValue({}) },
  NoObjectGeneratedError: { isInstance: vi.fn().mockReturnValue(false) },
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue({}),
}));

vi.mock("@/env", () => ({
  env: { ANTHROPIC_API_KEY: "test-key" },
}));

// Subject import — after all vi.mock calls (route does not exist yet; RED until 10-02 ships)
import { POST } from "@/app/api/extract/route";

// --- Request factories ---

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRequestRaw(text: string) {
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text,
  });
}

// Minimal valid JPEG data-URL: starts with JPEG magic bytes (FF D8 FF E0)
const VALID_JPEG_DATA_URL =
  "data:image/jpeg;base64," + btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0));

// Minimal valid PNG data-URL: starts with PNG magic bytes (89 50 4E 47)
const VALID_PNG_DATA_URL =
  "data:image/png;base64," + btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0));

// Bad magic bytes: declared as PNG but starts with JPEG bytes
const BAD_MAGIC_DATA_URL =
  "data:image/png;base64," + btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0));

// Oversized base64 string: > 7MB decoded (~9.4MB string)
const OVERSIZED_BASE64_DATA_URL =
  "data:image/jpeg;base64," + "A".repeat(9_800_000);

// Valid request body shape
const VALID_BODY = {
  image: VALID_JPEG_DATA_URL,
  mimeType: "image/jpeg",
  deckId: "deck-1",
  targetLanguage: "fr",
};

// --- Mock helpers ---

function mockSession(userId = "user-123") {
  mockGetSession.mockResolvedValue({ user: { id: userId } });
}

function mockNoSession() {
  mockGetSession.mockResolvedValue(null);
}

function mockAllowed() {
  mockLimiterCheck.mockReturnValue({ allowed: true });
}

function mockRateLimited() {
  mockLimiterCheck.mockReturnValue({ allowed: false, retryAfterMs: 30_000 });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// POST /api/extract — guard sequence + happy path
// ============================================================

describe("POST /api/extract", () => {
  it("returns 401 for unauthenticated request", async () => {
    mockNoSession();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 429 with Retry-After for rate-limited user", async () => {
    mockSession();
    mockRateLimited();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 for invalid JSON body", async () => {
    mockSession();
    mockAllowed();
    const res = await POST(makeRequestRaw("this is not json{{{"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 for missing required fields", async () => {
    mockSession();
    mockAllowed();
    const res = await POST(makeRequest({ image: VALID_JPEG_DATA_URL })); // missing mimeType, deckId, targetLanguage
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 413 for oversized payload", async () => {
    mockSession();
    mockAllowed();
    const res = await POST(
      makeRequest({ ...VALID_BODY, image: OVERSIZED_BASE64_DATA_URL }),
    );
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 415 for disallowed MIME type", async () => {
    mockSession();
    mockAllowed();
    const res = await POST(
      makeRequest({ ...VALID_BODY, mimeType: "image/gif", image: VALID_JPEG_DATA_URL }),
    );
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 415 for bad magic bytes (declared PNG but JPEG bytes)", async () => {
    mockSession();
    mockAllowed();
    const res = await POST(
      makeRequest({ ...VALID_BODY, mimeType: "image/png", image: BAD_MAGIC_DATA_URL }),
    );
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 503 when ANTHROPIC_API_KEY is absent", async () => {
    // Re-mock @/env with no key for this specific test
    vi.doMock("@/env", () => ({ env: { ANTHROPIC_API_KEY: undefined } }));
    mockSession();
    mockAllowed();
    // Re-import the route with the new mock — dynamic import
    const { POST: POST_NO_KEY } = await import("@/app/api/extract/route");
    const res = await POST_NO_KEY(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
    vi.doUnmock("@/env");
  });

  it("returns 200 { words } for valid request", async () => {
    mockSession();
    mockAllowed();
    mockGenerateText.mockResolvedValue({ output: { words: ["chien", "chat"], detectedLanguage: "fr" } });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ words: expect.arrayContaining(["chien", "chat"]) });
  });

  it("returns 200 { words: [] } for no-words result (EXT-03)", async () => {
    mockSession();
    mockAllowed();
    mockGenerateText.mockResolvedValue({ output: { words: [] } });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.words).toEqual([]);
  });

  it("returns 504 on AbortError", async () => {
    mockSession();
    mockAllowed();
    const abortErr = new Error("The operation was aborted");
    abortErr.name = "AbortError";
    mockGenerateText.mockRejectedValue(abortErr);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 502 on generic vision error", async () => {
    mockSession();
    mockAllowed();
    mockGenerateText.mockRejectedValue(new Error("Connection reset by peer"));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });
});
