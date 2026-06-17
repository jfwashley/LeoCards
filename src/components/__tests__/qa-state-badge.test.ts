import { describe, expect, it } from "vitest";

// Import the pure utility functions directly — no env/DOM mocks needed.
// buildTokens is a pure helper exported for unit testability (per plan action).
import {
  buildTokens,
  formatCd,
} from "@/components/qa-state-badge";
import type { QaCardData } from "@/components/qa-state-badge";

// ============================================================
// formatCd — pure millisecond-to-string formatting
// ============================================================

describe("formatCd", () => {
  it("returns '' when ms is 0 (expired)", () => {
    expect(formatCd(0)).toBe("");
  });

  it("returns '' when ms is negative", () => {
    expect(formatCd(-1000)).toBe("");
  });

  it("returns '14m' for 14 minutes in ms", () => {
    expect(formatCd(14 * 60_000)).toBe("14m");
  });

  it("returns '1h30m' for 90 minutes in ms", () => {
    expect(formatCd(90 * 60_000)).toBe("1h30m");
  });

  it("rounds partial minutes up (ceil)", () => {
    // 14 min 1 sec → ceil to 15m
    expect(formatCd(14 * 60_000 + 1_000)).toBe("15m");
  });

  it("returns '1m' for < 1 min remaining", () => {
    expect(formatCd(30_000)).toBe("1m");
  });
});

// ============================================================
// buildTokens — state code token assembly
// ============================================================

describe("buildTokens", () => {
  function makeCard(overrides: Partial<QaCardData> = {}): QaCardData {
    return {
      masteryRound: 0,
      stage: "n2t",
      cooldownUntil: null,
      pausedAt: null,
      ...overrides,
    };
  }

  it("R0·n2t — round 0, no cooldown, not paused", () => {
    const tokens = buildTokens(makeCard({ masteryRound: 0, stage: "n2t" }), "");
    expect(tokens.join("·")).toBe("R0·n2t");
  });

  it("R1·t2n·cd:22m — round 1, active cooldown 22 min", () => {
    const tokens = buildTokens(makeCard({ masteryRound: 1, stage: "t2n" }), "22m");
    expect(tokens.join("·")).toBe("R1·t2n·cd:22m");
  });

  it("R3·L — round 3 (learned), replaces direction token", () => {
    // masteryRound >= 3 → direction replaced by 'L'
    const tokens = buildTokens(makeCard({ masteryRound: 3, stage: "n2t" }), "");
    expect(tokens.join("·")).toBe("R3·L");
  });

  it("R1·t2n·P — paused card", () => {
    const tokens = buildTokens(
      makeCard({ masteryRound: 1, stage: "t2n", pausedAt: new Date() }),
      "",
    );
    expect(tokens.join("·")).toBe("R1·t2n·P");
  });

  it("R2·t2n·cd:1h15m·P — all tokens present", () => {
    const tokens = buildTokens(
      makeCard({ masteryRound: 2, stage: "t2n", pausedAt: new Date() }),
      "1h15m",
    );
    expect(tokens.join("·")).toBe("R2·t2n·cd:1h15m·P");
  });

  it("omits cd token when cdLabel is empty string", () => {
    const tokens = buildTokens(makeCard({ masteryRound: 1, stage: "t2n" }), "");
    expect(tokens.join("·")).toBe("R1·t2n");
  });
});
