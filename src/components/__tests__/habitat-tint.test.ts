// habitat-tint.test.ts — Phase 24 Wave 0 (Plan 24-01 Task 1).
//
// Vitest runs in `environment: "node"` (no jsdom). These tests verify the
// moodTint helper covers the 4 engine moods, the decay grey wash, and the
// golden-hour L9 tint (HAB-02).

import { describe, expect, it } from "vitest";
import { moodTint } from "../../lib/habitat-tint";

describe("moodTint helper (HAB-02)", () => {
  it("HT1: isDecaying returns the grey wash regardless of mood/level", () => {
    const wash = moodTint("excited", true, 5);
    expect(wash).toMatch(/rgba\(120,\s*120,\s*130,/);
  });

  it("HT2: level >= 9 (not decaying) returns the golden-hour rgba distinct from any mood tint", () => {
    const golden = moodTint("happy", false, 9);
    // Must be an rgba string
    expect(golden).toMatch(/rgba\(/);
    // Must be distinct from the happy mood tint at level 5
    const happyTint = moodTint("happy", false, 5);
    expect(golden).not.toBe(happyTint);
    // isDecaying takes priority over level >= 9
    const decayingL9 = moodTint("happy", true, 9);
    expect(decayingL9).toMatch(/rgba\(120,\s*120,\s*130,/);
  });

  it("HT3: each of the 4 moods returns its own distinct rgba (not decaying, level 5)", () => {
    const excited = moodTint("excited", false, 5);
    const happy = moodTint("happy", false, 5);
    const neutral = moodTint("neutral", false, 5);
    const sad = moodTint("sad", false, 5);

    // Each must be an rgba string
    for (const tint of [excited, happy, neutral, sad]) {
      expect(tint).toMatch(/rgba\(/);
    }

    // All 4 must be distinct
    const tints = new Set([excited, happy, neutral, sad]);
    expect(tints.size).toBe(4);
  });

  it("HT4: excited tint contains amber gold channel values", () => {
    const tint = moodTint("excited", false, 5);
    // rgba(242,179,58,0.12) — amber gold from MOOD palette
    expect(tint).toMatch(/rgba\(242,\s*179,\s*58,/);
  });

  it("HT5: sad tint contains cool blue-grey channel values", () => {
    const tint = moodTint("sad", false, 5);
    // rgba(124,147,176,0.12) — cool blue-grey
    expect(tint).toMatch(/rgba\(124,\s*147,\s*176,/);
  });
});
