// habitat-celebration.test.ts — Phase 24 Wave 0 (Plan 24-01 Task 1).
//
// Vitest runs in `environment: "node"` (no jsdom). Source-grep the
// HabitatCelebration component for CSS-animation + motion/react exclusion
// invariants (HAB-04/HAB-05).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CELEBRATION_SRC = readFileSync(
  join(__dirname, "..", "habitat-celebration.tsx"),
  "utf8",
);

describe("HabitatCelebration invariants (HAB-04/HAB-05)", () => {
  it("HC1: does NOT import motion/react or framer-motion", () => {
    const imports = CELEBRATION_SRC.split("\n")
      .filter((l) => /^\s*import\b/.test(l))
      .join("\n");
    expect(imports).not.toMatch(/motion\/react/);
    expect(imports).not.toMatch(/framer-motion/);
  });

  it("HC2: confetti is gated on !reducedMotion and uses the hab-confetti class", () => {
    expect(CELEBRATION_SRC).toMatch(/reducedMotion/);
    expect(CELEBRATION_SRC).toMatch(/hab-confetti/);
  });

  it("HC3: data-testid='habitat-celebration' is present", () => {
    expect(CELEBRATION_SRC).toMatch(/data-testid="habitat-celebration"/);
  });

  it("HC4: auto-settle timer is 2500ms in habitat-scene.tsx (D-07)", () => {
    // The auto-settle timer lives in habitat-scene.tsx (called from useEffect),
    // not in the celebration component itself.
    const SCENE_SRC = readFileSync(
      join(__dirname, "..", "habitat-scene.tsx"),
      "utf8",
    );
    expect(SCENE_SRC).toMatch(/setTimeout\(.*2500/);
  });
});
