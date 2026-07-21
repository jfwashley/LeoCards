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

// Subject import — after all vi.mock calls
import { POST } from "@/app/api/translate/route";

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

beforeEach(() => {
  vi.clearAllMocks();
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
