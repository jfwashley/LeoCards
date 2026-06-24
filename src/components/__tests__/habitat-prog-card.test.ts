// habitat-prog-card.test.ts — Phase 24 Wave 0 (Plan 24-01 Task 1).
//
// Vitest runs in `environment: "node"` (no jsdom). Source-grep the
// h-prog-card.tsx component for the pct formula identifiers and the L9
// "Course 1 complete" branch (HAB-03).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PROG_CARD_SRC = readFileSync(
  join(__dirname, "..", "daybreak", "h-prog-card.tsx"),
  "utf8",
);

describe("HProgCard source invariants (HAB-03)", () => {
  it("HP1: pct formula references effectiveCardCount and nextLevelThreshold", () => {
    expect(PROG_CARD_SRC).toMatch(/effectiveCardCount/);
    expect(PROG_CARD_SRC).toMatch(/nextLevelThreshold/);
  });

  it("HP2: pct formula uses Math.round and Math.min (capped at 100)", () => {
    expect(PROG_CARD_SRC).toMatch(/Math\.round/);
    expect(PROG_CARD_SRC).toMatch(/Math\.min/);
  });

  it("HP3: L9 max branch checks nextLevelThreshold === null (D-12)", () => {
    expect(PROG_CARD_SRC).toMatch(/nextLevelThreshold\s*===\s*null/);
  });

  it("HP4: L9 branch renders 'Course 1 complete' copy (D-12)", () => {
    expect(PROG_CARD_SRC).toMatch(/Course 1 complete/);
  });
});
