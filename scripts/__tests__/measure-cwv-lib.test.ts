import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyBottleneck,
  computeMedians,
  getBundleKb,
  median,
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

describe("getBundleKb", () => {
  it("returns kb and chunks for a known route", () => {
    const result = getBundleKb(stats, "/deck/new-card");
    expect(result.kb).toBe(Math.round(1111000 / 1024));
    expect(result.chunks).toBe(0);
  });

  it("throws for an unknown route", () => {
    expect(() => getBundleKb(stats, "/nonexistent-route")).toThrow();
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
