import { describe, expect, it } from "vitest";
import {
  getDecayAlpha,
  getLayersForLevel,
  getMoodTransitionType,
  getTigerFacing,
  getTigerPosition,
  TIGER_POSITIONS,
} from "@/lib/habitat-ui-utils";

describe("getMoodTransitionType", () => {
  it("returns 'bounce' for sad -> happy (happier shift)", () => {
    expect(getMoodTransitionType("sad", "happy")).toBe("bounce");
  });

  it("returns 'bounce' for neutral -> happy (happier shift)", () => {
    expect(getMoodTransitionType("neutral", "happy")).toBe("bounce");
  });

  it("returns 'bounce' for sad -> excited (happier shift)", () => {
    expect(getMoodTransitionType("sad", "excited")).toBe("bounce");
  });

  it("returns 'bounce' for sad -> neutral (happier shift)", () => {
    expect(getMoodTransitionType("sad", "neutral")).toBe("bounce");
  });

  it("returns 'bounce' for happy -> excited (happier shift)", () => {
    expect(getMoodTransitionType("happy", "excited")).toBe("bounce");
  });

  it("returns 'crossfade' for happy -> sad (sadder shift)", () => {
    expect(getMoodTransitionType("happy", "sad")).toBe("crossfade");
  });

  it("returns 'crossfade' for happy -> neutral (sadder shift)", () => {
    expect(getMoodTransitionType("happy", "neutral")).toBe("crossfade");
  });

  it("returns 'crossfade' for excited -> sad (sadder shift)", () => {
    expect(getMoodTransitionType("excited", "sad")).toBe("crossfade");
  });

  it("returns 'crossfade' for excited -> neutral (sadder shift)", () => {
    expect(getMoodTransitionType("excited", "neutral")).toBe("crossfade");
  });

  it("returns 'none' for happy -> happy (same mood)", () => {
    expect(getMoodTransitionType("happy", "happy")).toBe("none");
  });

  it("returns 'none' for neutral -> neutral (same mood)", () => {
    expect(getMoodTransitionType("neutral", "neutral")).toBe("none");
  });

  it("returns 'none' for sad -> sad (same mood)", () => {
    expect(getMoodTransitionType("sad", "sad")).toBe("none");
  });

  it("returns 'none' for excited -> excited (same mood)", () => {
    expect(getMoodTransitionType("excited", "excited")).toBe("none");
  });
});

describe("getLayersForLevel", () => {
  it("level 1 returns 4 layers including base and tree-1", () => {
    const layers = getLayersForLevel(1);
    expect(layers).toContain("layer-sky");
    expect(layers).toContain("layer-hills");
    expect(layers).toContain("layer-grass-base");
    expect(layers).toContain("layer-tree-1");
    expect(layers).toHaveLength(4);
  });

  it("level 5 includes all level-1 layers plus level-specific layers", () => {
    const layers = getLayersForLevel(5);
    // Level 1 layers
    expect(layers).toContain("layer-sky");
    expect(layers).toContain("layer-hills");
    expect(layers).toContain("layer-grass-base");
    expect(layers).toContain("layer-tree-1");
    // Level 2-5 additions
    expect(layers).toContain("layer-rocks-1");
    expect(layers).toContain("layer-tree-2");
    expect(layers).toContain("layer-flowers-1");
    expect(layers).toContain("layer-water-1");
    expect(layers).toHaveLength(8);
  });

  it("level 10 returns all 13 layers", () => {
    const layers = getLayersForLevel(10);
    expect(layers).toHaveLength(13);
    expect(layers).toContain("layer-sky");
    expect(layers).toContain("layer-hills");
    expect(layers).toContain("layer-grass-base");
    expect(layers).toContain("layer-tree-1");
    expect(layers).toContain("layer-rocks-1");
    expect(layers).toContain("layer-tree-2");
    expect(layers).toContain("layer-flowers-1");
    expect(layers).toContain("layer-water-1");
    expect(layers).toContain("layer-animal-1");
    expect(layers).toContain("layer-tree-3");
    expect(layers).toContain("layer-flowers-2");
    expect(layers).toContain("layer-animal-2");
    expect(layers).toContain("layer-water-2");
  });

  it("level 1 does NOT include layer-rocks-1", () => {
    const layers = getLayersForLevel(1);
    expect(layers).not.toContain("layer-rocks-1");
  });
});

describe("getDecayAlpha", () => {
  it("returns 1.0 at quality 1.0 (no decay)", () => {
    expect(getDecayAlpha(1.0)).toBe(1.0);
  });

  it("returns 0.5 at quality 0.75 (half faded)", () => {
    expect(getDecayAlpha(0.75)).toBeCloseTo(0.5);
  });

  it("returns 0.0 at quality 0.5 (fully faded)", () => {
    expect(getDecayAlpha(0.5)).toBe(0.0);
  });

  it("returns 0.0 at quality 0.10 (floor quality = fully faded)", () => {
    expect(getDecayAlpha(0.1)).toBe(0.0);
  });

  it("returns 0.0 for quality below 0.5 (clamps at 0)", () => {
    expect(getDecayAlpha(0.3)).toBe(0.0);
  });
});

describe("getTigerPosition", () => {
  it("returns a position from TIGER_POSITIONS", () => {
    const pos = getTigerPosition();
    expect(TIGER_POSITIONS).toContainEqual(pos);
  });

  it("returns a position with an x property", () => {
    const pos = getTigerPosition();
    expect(typeof pos.x).toBe("number");
  });

  it("x is one of the three valid values", () => {
    const validX = [0.5, 0.3, 0.75];
    const pos = getTigerPosition();
    expect(validX).toContain(pos.x);
  });
});

describe("getTigerFacing", () => {
  it("returns -1 or 1", () => {
    const facing = getTigerFacing();
    expect([-1, 1]).toContain(facing);
  });
});

describe("TIGER_POSITIONS constant", () => {
  it("has 3 positions", () => {
    expect(TIGER_POSITIONS).toHaveLength(3);
  });

  it("contains center, left, and right positions", () => {
    const xValues = TIGER_POSITIONS.map((p) => p.x);
    expect(xValues).toContain(0.5);
    expect(xValues).toContain(0.3);
    expect(xValues).toContain(0.75);
  });
});
