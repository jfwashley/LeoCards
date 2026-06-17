import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COOLDOWN_MS } from "@/lib/study-engine";

// Test all four STUDY_COOLDOWN_MINUTES precedence branches (D-09) for
// buildCooldownConfig() exported from the study/complete route.
//
// Because buildCooldownConfig reads env and process.env.NODE_ENV at call time,
// we use vi.resetModules() + dynamic import per branch to get a fresh module
// evaluation with the right mock values.

describe("buildCooldownConfig — STUDY_COOLDOWN_MINUTES precedence (D-09)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("STUDY_COOLDOWN_MINUTES=15 returns { 0: 900000, 1: 900000, 2: null }", async () => {
    vi.mock("@/env", () => ({
      env: {
        STUDY_COOLDOWN_MINUTES: 15,
        STUDY_NO_COOLDOWN: undefined,
      },
    }));
    const { buildCooldownConfig } = await import(
      "@/app/api/study/complete/route"
    );
    expect(buildCooldownConfig()).toEqual({ 0: 900000, 1: 900000, 2: null });
  });

  it("STUDY_COOLDOWN_MINUTES=15 AND STUDY_NO_COOLDOWN='true' — minutes wins (D-09)", async () => {
    vi.mock("@/env", () => ({
      env: {
        STUDY_COOLDOWN_MINUTES: 15,
        STUDY_NO_COOLDOWN: "true",
      },
    }));
    const { buildCooldownConfig } = await import(
      "@/app/api/study/complete/route"
    );
    // Minutes wins over NO_COOLDOWN
    expect(buildCooldownConfig()).toEqual({ 0: 900000, 1: 900000, 2: null });
  });

  it("STUDY_COOLDOWN_MINUTES unset + STUDY_NO_COOLDOWN='true' returns { 0: 0, 1: 0, 2: null }", async () => {
    vi.mock("@/env", () => ({
      env: {
        STUDY_COOLDOWN_MINUTES: undefined,
        STUDY_NO_COOLDOWN: "true",
      },
    }));
    vi.stubEnv("NODE_ENV", "production");
    const { buildCooldownConfig } = await import(
      "@/app/api/study/complete/route"
    );
    expect(buildCooldownConfig()).toEqual({ 0: 0, 1: 0, 2: null });
  });

  it("STUDY_COOLDOWN_MINUTES unset + production mode returns DEFAULT_COOLDOWN_MS", async () => {
    vi.mock("@/env", () => ({
      env: {
        STUDY_COOLDOWN_MINUTES: undefined,
        STUDY_NO_COOLDOWN: undefined,
      },
    }));
    vi.stubEnv("NODE_ENV", "production");
    const { buildCooldownConfig } = await import(
      "@/app/api/study/complete/route"
    );
    expect(buildCooldownConfig()).toEqual(DEFAULT_COOLDOWN_MS);
  });
});
