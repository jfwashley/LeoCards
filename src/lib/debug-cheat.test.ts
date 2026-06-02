import { beforeEach, describe, expect, it, vi } from "vitest";

// Isolate the signing logic from @/env's full schema + next/headers runtime.
vi.mock("@/env", () => ({
  env: { DEBUG_CHEAT_SECRET: "test-secret-at-least-16-chars-long" },
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

import {
  cheatEnabled,
  checkSecret,
  signOverride,
  verifyOverride,
} from "./debug-cheat";

describe("debug-cheat — signed override cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cheatEnabled() is true when the secret is set", () => {
    expect(cheatEnabled()).toBe(true);
  });

  it("sign → verify round-trips the override", () => {
    const o = { level: 9, mood: "sad" as const, quality: 0.2 };
    const cookie = signOverride(o);
    expect(verifyOverride(cookie)).toEqual(o);
  });

  it("round-trips a partial override (level only)", () => {
    const cookie = signOverride({ level: 5 });
    expect(verifyOverride(cookie)).toEqual({ level: 5 });
  });

  it("rejects a tampered payload (signature mismatch)", () => {
    const cookie = signOverride({ level: 3 });
    const [, sig] = cookie.split(".");
    // Swap in a different payload but keep the old signature.
    const forgedPayload = Buffer.from(JSON.stringify({ level: 9 }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(verifyOverride(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const cookie = signOverride({ level: 3 });
    const [payload] = cookie.split(".");
    expect(verifyOverride(`${payload}.deadbeef`)).toBeNull();
  });

  it("rejects malformed / missing values", () => {
    expect(verifyOverride(undefined)).toBeNull();
    expect(verifyOverride("")).toBeNull();
    expect(verifyOverride("no-dot")).toBeNull();
    expect(verifyOverride("a.b.c")).toBeNull();
  });

  it("rejects a validly-signed but schema-invalid payload (level out of range)", () => {
    const cookie = signOverride({ level: 99 } as unknown as { level: number });
    expect(verifyOverride(cookie)).toBeNull();
  });

  it("treats an all-empty override as no override", () => {
    const cookie = signOverride({});
    expect(verifyOverride(cookie)).toBeNull();
  });

  it("checkSecret is constant-time-correct: matches only the exact secret", () => {
    expect(checkSecret("test-secret-at-least-16-chars-long")).toBe(true);
    expect(checkSecret("wrong")).toBe(false);
    expect(checkSecret("")).toBe(false);
    expect(checkSecret(null)).toBe(false);
    expect(checkSecret(undefined)).toBe(false);
  });
});
