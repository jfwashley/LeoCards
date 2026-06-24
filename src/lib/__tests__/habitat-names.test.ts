// habitat-names.test.ts — Phase 24 Wave 0 (Plan 24-01 Task 1).
//
// Vitest runs in `environment: "node"` (no jsdom — see vitest.config.ts), so
// we follow the prevailing repo pattern: import pure data exports and assert
// directly. These tests are the canonical HAB-01 / HAB-03 verify gate.

import { describe, expect, it } from "vitest";
import { H_NAME, H_NEXT } from "../habitat-names";

describe("H_NAME and H_NEXT constants (HAB-01/HAB-03)", () => {
  it("HN1: H_NAME has string entries for levels 1–9", () => {
    const expectedNames: Record<number, string> = {
      1: "Bare mound",
      2: "Lakeside",
      3: "Woodland",
      4: "Meadow",
      5: "Savanna",
      6: "Glade",
      7: "Den",
      8: "Playground",
      9: "Golden hour",
    };
    for (let lv = 1; lv <= 9; lv++) {
      expect(H_NAME[lv]).toBe(expectedNames[lv]);
    }
  });

  it("HN2: H_NEXT has entries for levels 1–8, and H_NEXT[9] is undefined (Pitfall 5 guard)", () => {
    for (let lv = 1; lv <= 8; lv++) {
      expect(H_NEXT[lv]).toBeDefined();
      expect(typeof H_NEXT[lv]?.what).toBe("string");
      expect(H_NEXT[lv]?.what?.length ?? 0).toBeGreaterThan(0);
    }
    // L9 has no next entry — callers must guard with nextLevelThreshold === null (D-12)
    expect(H_NEXT[9]).toBeUndefined();
  });

  it("HN3: H_NEXT[level].at equals level+1 for levels 1–8", () => {
    for (let lv = 1; lv <= 8; lv++) {
      expect(H_NEXT[lv]?.at).toBe(lv + 1);
    }
  });
});
