// clay-level.test.ts — pins SPEC R1 acceptance: feature flags per level.
// Tests the additive level table ported from the designer's
// `featuresForLevel` + `LEVEL_CONFIG` (habitat-clay-styles.jsx:2229-2254).

import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURES,
  featuresForLevel,
  LEVEL_CONFIG,
} from "../clay-level";

describe("featuresForLevel", () => {
  it("L1: just Leo on the mound (no level-gated scenery)", () => {
    const f = featuresForLevel(1);
    expect(f.lake).toBe(false);
    expect(f.lilies).toBe(false);
    expect(f.path).toBe(false);
    expect(f.trees).toBe(false);
    expect(f.rocks).toBe(false);
    expect(f.flowers).toBe(false);
    expect(f.grass).toBe(false);
    expect(f.butterflies).toBe(false);
    expect(f.mushrooms).toBe(false);
    expect(f.cave).toBe(false);
    expect(f.toy).toBe(false);
    expect(f.songbirds).toBe(false);
    // clouds is structural sky scenery, always present.
    expect(f.clouds).toBe(true);
  });

  it("L2: lake + lilies + path", () => {
    const f = featuresForLevel(2);
    expect(f.lake).toBe(true);
    expect(f.lilies).toBe(true);
    expect(f.path).toBe(true);
    expect(f.trees).toBe(false);
  });

  it("L3: L2 ∪ { trees, rocks }", () => {
    const f = featuresForLevel(3);
    expect(f.lake).toBe(true);
    expect(f.lilies).toBe(true);
    expect(f.path).toBe(true);
    expect(f.trees).toBe(true);
    expect(f.rocks).toBe(true);
    expect(f.flowers).toBe(false);
  });

  it("L4: L3 ∪ { flowers, grass, butterflies }", () => {
    const f = featuresForLevel(4);
    expect(f.trees).toBe(true);
    expect(f.flowers).toBe(true);
    expect(f.grass).toBe(true);
    expect(f.butterflies).toBe(true);
    expect(f.mushrooms).toBe(false);
  });

  it("L5: L4 (visual change is Elephant via LEVEL_CONFIG.showElephant)", () => {
    const f5 = featuresForLevel(5);
    const f4 = featuresForLevel(4);
    expect(f5).toEqual(f4);
    expect(LEVEL_CONFIG[5]?.showElephant).toBe(true);
    expect(LEVEL_CONFIG[4]?.showElephant).toBe(false);
  });

  it("L6: L4 ∪ { mushrooms }", () => {
    const f = featuresForLevel(6);
    expect(f.mushrooms).toBe(true);
    expect(f.flowers).toBe(true);
    expect(f.cave).toBe(false);
  });

  it("L7: L6 ∪ { cave } and sleepCycle on", () => {
    const f = featuresForLevel(7);
    expect(f.mushrooms).toBe(true);
    expect(f.cave).toBe(true);
    expect(f.toy).toBe(false);
    expect(LEVEL_CONFIG[7]?.sleepCycle).toBe(true);
  });

  it("L8: L7 ∪ { toy }", () => {
    const f = featuresForLevel(8);
    expect(f.cave).toBe(true);
    expect(f.toy).toBe(true);
    expect(f.songbirds).toBe(false);
  });

  it("L9: L8 ∪ { songbirds } and sky = golden-hour", () => {
    const f = featuresForLevel(9);
    expect(f.toy).toBe(true);
    expect(f.songbirds).toBe(true);
    expect(LEVEL_CONFIG[9]?.sky).toBe("golden-hour");
  });

  it("additive: featuresForLevel(N+1) is a superset of featuresForLevel(N) for N=1..8", () => {
    for (let n = 1; n <= 8; n++) {
      const cur = featuresForLevel(n) as Record<string, boolean | undefined>;
      const next = featuresForLevel(n + 1) as Record<
        string,
        boolean | undefined
      >;
      for (const k of Object.keys(cur)) {
        if (cur[k] === true) {
          expect(next[k]).toBe(true);
        }
      }
    }
  });

  it("boundary: featuresForLevel(0) clamps to L1; featuresForLevel(10) clamps to L9", () => {
    expect(featuresForLevel(0)).toEqual(featuresForLevel(1));
    expect(featuresForLevel(10)).toEqual(featuresForLevel(9));
    // also negative / huge
    expect(featuresForLevel(-5)).toEqual(featuresForLevel(1));
    expect(featuresForLevel(999)).toEqual(featuresForLevel(9));
  });

  it("DEFAULT_FEATURES has every flag true", () => {
    for (const v of Object.values(DEFAULT_FEATURES)) {
      expect(v).toBe(true);
    }
  });
});
