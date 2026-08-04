import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// Hoisted mock plumbing (mirrors src/lib/core/dashboard.test.ts's
// query-module mocking shape, scoped to what loadAccountCore itself
// imports).
// ============================================================
const { mockGetPendingEmailChange } = vi.hoisted(() => ({
  mockGetPendingEmailChange: vi.fn(),
}));

vi.mock("@/lib/account-queries", () => ({
  getPendingEmailChange: mockGetPendingEmailChange,
}));

import type { UserId } from "@/db/schema";
import { loadAccountCore } from "./account";

const USER_ID = "user-1" as UserId;
const CREATED_AT = new Date("2026-01-15T10:30:00.000Z");

type LoadAccountCoreInput = Parameters<typeof loadAccountCore>[0];

function baseInput(
  overrides: Partial<LoadAccountCoreInput> = {},
): LoadAccountCoreInput {
  return {
    userId: USER_ID,
    name: "Ada Lovelace",
    email: "ada@example.com",
    createdAt: CREATED_AT,
    nativeLanguage: "fr",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPendingEmailChange.mockResolvedValue(null);
});

describe("loadAccountCore", () => {
  it("returns the given nativeLanguage code unchanged", async () => {
    const result = await loadAccountCore(baseInput({ nativeLanguage: "es" }));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.nativeLanguage).toBe("es");
  });

  it("normalises a null nativeLanguage to 'en'", async () => {
    const result = await loadAccountCore(baseInput({ nativeLanguage: null }));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.nativeLanguage).toBe("en");
  });

  it("normalises an undefined nativeLanguage to 'en'", async () => {
    const result = await loadAccountCore(
      baseInput({ nativeLanguage: undefined }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.nativeLanguage).toBe("en");
  });

  it("returns createdAt serialised as an ISO string", async () => {
    const result = await loadAccountCore(baseInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.createdAt).toBe(CREATED_AT.toISOString());
    }
  });

  it("returns pendingEmail as the pending address when getPendingEmailChange resolves a row", async () => {
    mockGetPendingEmailChange.mockResolvedValueOnce({
      newEmail: "new@example.com",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await loadAccountCore(baseInput());

    expect(mockGetPendingEmailChange).toHaveBeenCalledWith(
      USER_ID,
      "ada@example.com",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.pendingEmail).toBe("new@example.com");
  });

  it("returns pendingEmail as null when getPendingEmailChange resolves null", async () => {
    mockGetPendingEmailChange.mockResolvedValueOnce(null);

    const result = await loadAccountCore(baseInput());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.pendingEmail).toBeNull();
  });

  it("returns exactly the five AccountResponse fields and no others", async () => {
    const result = await loadAccountCore(baseInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.data).sort()).toEqual(
        ["createdAt", "email", "name", "nativeLanguage", "pendingEmail"].sort(),
      );
    }
  });

  it("passes name and email through unchanged and does not resolve a session itself", async () => {
    const result = await loadAccountCore(
      baseInput({ name: "Grace Hopper", email: "grace@example.com" }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Grace Hopper");
      expect(result.data.email).toBe("grace@example.com");
    }
  });
});
