import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before vi.mock factories — declare all shared mocks here
const { mockGetSession, mockLimiterCheck, mockTranslateText } = vi.hoisted(
  () => {
    return {
      mockGetSession: vi.fn(),
      mockLimiterCheck: vi.fn(),
      mockTranslateText: vi.fn(),
    };
  },
);

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn().mockReturnValue({ check: mockLimiterCheck }),
}));

vi.mock("@/env", () => ({
  env: { DEEPL_API_KEY: "test-key" },
}));

// Mock the deepl-node client itself — translateText is configured per test
// to return either a single TextResult ({text}) or a TextResult[]. A regular
// function (not an arrow function) is required here: vi.fn() forwards `new`
// calls to the mockImplementation via `new impl(...)`, which throws
// "is not a constructor" if impl is an arrow function.
vi.mock("deepl-node", () => ({
  DeepLClient: vi.fn().mockImplementation(function DeepLClient(this: {
    translateText: typeof mockTranslateText;
  }) {
    this.translateText = mockTranslateText;
  }),
}));

// Subject import — module-scope `let`, re-imported fresh in beforeEach via
// vi.resetModules(). The route now holds a module-scope translation-cache
// singleton (PERF-23); a static top-level import would let that cache leak
// state across tests within this file (e.g. a "chien" translation cached
// by one test silently short-circuiting DeepL in a later test that expects
// a fresh call). Re-importing after resetModules re-runs the route's
// module body, giving every test a brand-new, empty cache instance.
let POST: typeof import("@/app/api/translate/route").POST;

// --- Request factory ---

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Mock helpers ---

function mockSession(userId = "user-123") {
  mockGetSession.mockResolvedValue({ user: { id: userId } });
}

function mockAllowed() {
  mockLimiterCheck.mockReturnValue({ allowed: true });
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  ({ POST } = await import("@/app/api/translate/route"));
});

describe("POST /api/translate", () => {
  it("singular text regression: returns 200 with {translation: string} (frozen contract used by translation-form.tsx)", async () => {
    mockSession();
    mockAllowed();
    mockTranslateText.mockResolvedValue({ text: "dog" });

    const res = await POST(
      makeRequest({ text: "chien", sourceLang: "fr", targetLang: "en" }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ translation: "dog" });
  });

  it("array happy path: returns 200 with {translations: string[]} in the same order as input", async () => {
    mockSession();
    mockAllowed();
    mockTranslateText.mockResolvedValue([
      { text: "dog" },
      { text: "cat" },
      { text: "house" },
    ]);

    const res = await POST(
      makeRequest({
        texts: ["chien", "chat", "maison"],
        sourceLang: "fr",
        targetLang: "en",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ translations: ["dog", "cat", "house"] });
  });

  it("oversized array (51 items) is rejected with 400 (.max(50) bound)", async () => {
    mockSession();
    mockAllowed();

    const texts = Array.from({ length: 51 }, (_, i) => `word${i}`);
    const res = await POST(
      makeRequest({ texts, sourceLang: "fr", targetLang: "en" }),
    );

    expect(res.status).toBe(400);
  });

  it("mutual exclusivity: both text AND texts present returns 400", async () => {
    mockSession();
    mockAllowed();

    const res = await POST(
      makeRequest({
        text: "chien",
        texts: ["chat"],
        sourceLang: "fr",
        targetLang: "en",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("mutual exclusivity: NEITHER text nor texts present returns 400", async () => {
    mockSession();
    mockAllowed();

    const res = await POST(makeRequest({ sourceLang: "fr", targetLang: "en" }));

    expect(res.status).toBe(400);
  });
});

// ============================================================
// LRU cache (PERF-23) — item 19
// ============================================================

describe("POST /api/translate — LRU cache (PERF-23)", () => {
  it("a repeated identical request hits the cache — DeepL translateText is called exactly once across 2 calls", async () => {
    mockSession();
    mockAllowed();
    mockTranslateText.mockResolvedValue({ text: "hello-translated" });

    const body = {
      text: "cache-test-alpha",
      sourceLang: "fr",
      targetLang: "en",
    };

    const res1 = await POST(makeRequest(body));
    expect(res1.status).toBe(200);
    expect(await res1.json()).toEqual({ translation: "hello-translated" });

    const res2 = await POST(makeRequest(body));
    expect(res2.status).toBe(200);
    expect(await res2.json()).toEqual({ translation: "hello-translated" });

    expect(mockTranslateText).toHaveBeenCalledTimes(1);
  });

  it("a request with a different key (different text) is a cache miss and still calls DeepL", async () => {
    mockSession();
    mockAllowed();
    mockTranslateText.mockResolvedValue({ text: "beta-translated" });

    await POST(
      makeRequest({
        text: "cache-test-beta-one",
        sourceLang: "fr",
        targetLang: "en",
      }),
    );
    await POST(
      makeRequest({
        text: "cache-test-beta-two",
        sourceLang: "fr",
        targetLang: "en",
      }),
    );

    expect(mockTranslateText).toHaveBeenCalledTimes(2);
  });

  it("the 502-on-DeepL-failure response shape is unchanged for a cache miss", async () => {
    mockSession();
    mockAllowed();
    mockTranslateText.mockRejectedValueOnce(new Error("DeepL down"));

    const res = await POST(
      makeRequest({
        text: "cache-test-gamma",
        sourceLang: "fr",
        targetLang: "en",
      }),
    );

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "Translation service unavailable" });
  });
});
