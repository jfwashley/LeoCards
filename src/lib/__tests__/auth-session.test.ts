import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before vi.mock factories — declare all shared mocks here,
// mirroring src/app/api/translate/__tests__/route.test.ts's convention.
const { mockGetSession } = vi.hoisted(() => {
  return { mockGetSession: vi.fn() };
});

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

// React's own `cache()` is a real dedupe-boundary primitive scoped to an
// active Next.js RSC request (AsyncLocalStorage-backed dispatcher). Outside
// that request context — i.e. in this bare vitest/node environment — both
// the client build's `cache()` (a pure passthrough) and the react-server
// build's `cache()` (a no-op when no dispatcher is registered) call the
// wrapped function on every invocation with no memoization at all. This
// mock supplies a simple, real memoize-by-zero-args implementation so the
// tests below exercise auth-session.ts's actual CONTRACT with cache()
// (call it once, share the result) rather than asserting on React internals
// that this environment cannot exercise. Each `cache(fn)` call gets its own
// isolated cache instance, matching real cache() semantics.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T): T => {
      let hasCached = false;
      let cached: ReturnType<T>;
      return ((...args: never[]) => {
        if (!hasCached) {
          cached = fn(...args) as ReturnType<T>;
          hasCached = true;
        }
        return cached;
      }) as T;
    },
  };
});

describe("auth-session", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ user: { id: "user-123" } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes getSession() across multiple calls within one request (cache())", async () => {
    const { getSession } = await import("@/lib/auth-session");

    await getSession();
    await getSession();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("getSessionFresh() passes query.disableCookieCache === true", async () => {
    const { getSessionFresh } = await import("@/lib/auth-session");

    await getSessionFresh();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    const callArg = mockGetSession.mock.calls[0]?.[0];
    expect(callArg?.query?.disableCookieCache).toBe(true);
  });

  it("getSession() (non-fresh) calls auth.api.getSession WITHOUT disableCookieCache", async () => {
    const { getSession } = await import("@/lib/auth-session");

    await getSession();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    const callArg = mockGetSession.mock.calls[0]?.[0];
    expect(callArg?.query?.disableCookieCache).toBeUndefined();
  });
});
