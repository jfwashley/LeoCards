import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyBottleneck,
  computeMedians,
  extractMetrics,
  getBundleKb,
  median,
  resolveOutDir,
  resolveRoutes,
} from "../measure-cwv-lib.mjs";

// Fixture is read with readFileSync + JSON.parse (not a JSON import
// assertion) for robustness across vitest/TS config variations.
const fixturePath = fileURLToPath(
  new URL("./fixtures/route-bundle-stats.fixture.json", import.meta.url),
);
const stats = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("median", () => {
  it("returns the true middle-of-sorted value for an odd-length array", () => {
    expect(median([300, 100, 200, 400, 500])).toBe(300);
  });

  it("returns the only value for a single-element array", () => {
    expect(median([42])).toBe(42);
  });

  it("returns the upper-of-two-middle value for an even-length array (index Math.floor(length / 2))", () => {
    expect(median([10, 20, 30, 40])).toBe(30);
  });
});

describe("computeMedians", () => {
  it("reduces 5 per-run metric objects to correct per-key medians", () => {
    const runs = [
      {
        lcp: 2000,
        tbt: 100,
        cls: 0.01,
        fcp: 800,
        ttfb: 200,
        score: 90,
        bootupTime: 500,
      },
      {
        lcp: 2200,
        tbt: 150,
        cls: 0.02,
        fcp: 900,
        ttfb: 220,
        score: 88,
        bootupTime: 600,
      },
      {
        lcp: 1900,
        tbt: 90,
        cls: 0.0,
        fcp: 750,
        ttfb: 180,
        score: 92,
        bootupTime: 450,
      },
      {
        lcp: 2500,
        tbt: 200,
        cls: 0.03,
        fcp: 1000,
        ttfb: 250,
        score: 85,
        bootupTime: 700,
      },
      {
        lcp: 2100,
        tbt: 120,
        cls: 0.015,
        fcp: 850,
        ttfb: 210,
        score: 89,
        bootupTime: 550,
      },
    ];

    const medians = computeMedians(runs);

    // Sorted lcp values: [1900, 2000, 2100, 2200, 2500] -> middle = 2100
    expect(medians.lcp).toBe(2100);
    // Sorted tbt values: [90, 100, 120, 150, 200] -> middle = 120
    expect(medians.tbt).toBe(120);
  });
});

describe("extractMetrics", () => {
  /** Build a minimal, valid lhr; override individual audits or the score. */
  function makeLhr(
    overrides: {
      audits?: Record<
        string,
        { numericValue?: number; scoreDisplayMode?: string }
      >;
      score?: number | null;
    } = {},
  ) {
    return {
      audits: {
        "largest-contentful-paint": { numericValue: 2100 },
        "total-blocking-time": { numericValue: 120 },
        "cumulative-layout-shift": { numericValue: 0.01 },
        "first-contentful-paint": { numericValue: 850 },
        "server-response-time": { numericValue: 210 },
        "bootup-time": { numericValue: 550 },
        ...overrides.audits,
      },
      categories: {
        performance: {
          score: overrides.score === undefined ? 0.89 : overrides.score,
        },
      },
    };
  }

  it("extracts all seven metrics from a valid lhr (score rounded to 0-100)", () => {
    expect(extractMetrics(makeLhr())).toEqual({
      lcp: 2100,
      tbt: 120,
      cls: 0.01,
      fcp: 850,
      ttfb: 210,
      score: 89,
      bootupTime: 550,
    });
  });

  it("accepts a legitimate zero metric value (CLS 0)", () => {
    const lhr = makeLhr({
      audits: { "cumulative-layout-shift": { numericValue: 0 } },
    });
    expect(extractMetrics(lhr).cls).toBe(0);
  });

  it("throws naming the audit when numericValue is undefined (errored audit)", () => {
    const lhr = makeLhr({
      audits: {
        "largest-contentful-paint": { scoreDisplayMode: "error" },
      },
    });
    expect(() => extractMetrics(lhr)).toThrow(/largest-contentful-paint/);
    expect(() => extractMetrics(lhr)).toThrow(/scoreDisplayMode: error/);
  });

  it("throws when numericValue is non-finite (NaN)", () => {
    const lhr = makeLhr({
      audits: { "server-response-time": { numericValue: Number.NaN } },
    });
    expect(() => extractMetrics(lhr)).toThrow(/server-response-time/);
  });

  it("throws when the performance score is null instead of coercing to 0", () => {
    const lhr = makeLhr({ score: null });
    expect(() => extractMetrics(lhr)).toThrow(/performance score is null/);
  });

  it("throws when a required audit key is missing entirely", () => {
    const lhr = makeLhr();
    delete (lhr.audits as Record<string, unknown>)["bootup-time"];
    expect(() => extractMetrics(lhr)).toThrow(/bootup-time/);
  });
});

describe("getBundleKb", () => {
  it("returns kb and chunks for a known route", () => {
    const result = getBundleKb(stats, "/deck/new-card");
    expect(result.kb).toBe(Math.round(1111000 / 1024));
    expect(result.chunks).toBe(0);
  });

  it("throws for an unknown route", () => {
    expect(() => getBundleKb(stats, "/nonexistent-route")).toThrow();
  });

  it("throws when firstLoadUncompressedJsBytes is non-finite instead of reporting NaN KB", () => {
    const malformed = [
      {
        route: "/dashboard",
        firstLoadUncompressedJsBytes: Number.NaN,
        firstLoadChunkPaths: [],
      },
    ];
    expect(() => getBundleKb(malformed, "/dashboard")).toThrow(
      /firstLoadUncompressedJsBytes/,
    );
  });

  it("throws when the byte field is missing entirely (renamed stats shape)", () => {
    const malformed = [
      { route: "/dashboard", firstLoadChunkPaths: [] },
    ] as unknown as Parameters<typeof getBundleKb>[0];
    expect(() => getBundleKb(malformed, "/dashboard")).toThrow(
      /firstLoadUncompressedJsBytes/,
    );
  });
});

describe("classifyBottleneck", () => {
  it("classifies as 'bundle' when bundleKb is high with high bootupTime", () => {
    const metrics = { ttfb: 50, tbt: 50, bootupTime: 1900 };
    const result = classifyBottleneck(metrics, 750);
    expect(result.class).toBe("bundle");
  });

  it("classifies as 'RSC waterfall' when ttfb dominates", () => {
    const metrics = { ttfb: 390, tbt: 50, bootupTime: 100 };
    const result = classifyBottleneck(metrics, 100);
    expect(result.class).toBe("RSC waterfall");
  });

  it("classifies as 'hydration' when tbt dominates", () => {
    const metrics = { ttfb: 50, tbt: 790, bootupTime: 100 };
    const result = classifyBottleneck(metrics, 100);
    expect(result.class).toBe("hydration");
  });
});

describe("resolveRoutes (Phase 17 D-09)", () => {
  it("returns the 4 key routes when filterArg is null", () => {
    expect(resolveRoutes(null)).toEqual([
      "/dashboard",
      "/study",
      "/deck/new-card",
      "/deck/browse",
    ]);
  });

  it("returns the 4 key routes when filterArg is undefined", () => {
    expect(resolveRoutes(undefined)).toEqual([
      "/dashboard",
      "/study",
      "/deck/new-card",
      "/deck/browse",
    ]);
  });

  it("returns the comma-separated intersection with the 4 key routes", () => {
    expect(resolveRoutes("/dashboard,/study")).toEqual([
      "/dashboard",
      "/study",
    ]);
  });

  it("ignores whitespace around comma-separated entries", () => {
    expect(resolveRoutes(" /dashboard , /study ")).toEqual([
      "/dashboard",
      "/study",
    ]);
  });

  it("returns exactly ['/habitat'] for a /habitat-only filter (union-addable, NOT a subset filter)", () => {
    // A plain subset filter against the 4 key routes would return [] here —
    // /habitat is explicitly a UNION-addable opt-in for the D-11 spot-check,
    // not a member of the 4 key routes.
    expect(resolveRoutes("/habitat")).toEqual(["/habitat"]);
  });

  it("appends /habitat as an addable union member alongside key routes", () => {
    expect(resolveRoutes("/dashboard,/habitat")).toEqual([
      "/dashboard",
      "/habitat",
    ]);
  });

  it("ignores an unrecognized route that is neither a key route nor /habitat", () => {
    expect(resolveRoutes("/dashboard,/not-a-real-route")).toEqual([
      "/dashboard",
    ]);
  });

  it("returns an empty array for an empty-string filterArg's non-key, non-habitat entries", () => {
    expect(resolveRoutes("/not-a-real-route")).toEqual([]);
  });
});

describe("resolveOutDir (Phase 17 D-09)", () => {
  const root = "/repo-root";

  it("defaults to the Phase-17 measurements directory when phaseOutDir is null", () => {
    const result = resolveOutDir(root, null);
    expect(result).toContain("17-performance-optimization");
    expect(result).toContain("measurements");
  });

  it("defaults to the Phase-17 measurements directory when phaseOutDir is undefined", () => {
    const result = resolveOutDir(root, undefined);
    expect(result).toContain("17-performance-optimization");
  });

  it("NEVER contains the immutable Phase 16 baseline path substring by default (T-17-01-01)", () => {
    const result = resolveOutDir(root, null);
    expect(result).not.toContain("16-performance-baseline-measure/baseline");
    expect(result).not.toContain("16-performance-baseline-measure\\baseline");
  });

  it("honors an explicit phaseOutDir override", () => {
    const result = resolveOutDir(root, "custom/out/dir");
    expect(result).toBe(path.join(root, "custom", "out", "dir"));
  });

  it("throws when an explicit override targets the immutable Phase 16 baseline directory (T-17-01-01 / WR-04)", () => {
    expect(() =>
      resolveOutDir(
        root,
        ".planning/phases/16-performance-baseline-measure/baseline",
      ),
    ).toThrow(/immutable Phase 16 baseline/);
  });

  it("throws for a ../-relative override that resolves into the frozen baseline (WR-04)", () => {
    expect(() =>
      resolveOutDir(
        root,
        "sub/../.planning/phases/16-performance-baseline-measure/baseline/nested",
      ),
    ).toThrow(/immutable Phase 16 baseline/);
  });
});
