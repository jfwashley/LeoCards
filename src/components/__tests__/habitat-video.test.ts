// habitat-video.test.ts — Phase 13.1 Plan VIDEO-02 Task 1.
//
// Vitest runs in `environment: "node"` (no jsdom — see vitest.config.ts), so
// we follow the prevailing repo pattern (habitat-3d-canvas*.test.ts): exercise
// the pure exported helpers directly, and source-grep the JSX for invariants
// that can't be reached without a DOM (autoplay attrs, source ORDER,
// reduced-motion still path).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clampLevel,
  clipBasename,
  decayFilter,
  mp4Src,
  posterSrc,
  webmSrc,
} from "../habitat-video";

const MOODS = ["excited", "happy", "neutral", "sad"] as const;

function src(): string {
  return readFileSync(join(__dirname, "..", "habitat-video.tsx"), "utf8");
}

describe("HabitatVideo helpers (Plan VIDEO-02 Task 1)", () => {
  it("V1: clipBasename is l{N}-{mood} for every level × mood", () => {
    for (let lv = 1; lv <= 9; lv++) {
      for (const m of MOODS) {
        expect(clipBasename(lv, m)).toBe(`l${lv}-${m}`);
      }
    }
  });

  it("V2: level is clamped to [1,9] (and floored)", () => {
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(-5)).toBe(1);
    expect(clampLevel(10)).toBe(9);
    expect(clampLevel(100)).toBe(9);
    expect(clampLevel(5.9)).toBe(5);
    expect(clipBasename(0, "happy")).toBe("l1-happy");
    expect(clipBasename(99, "sad")).toBe("l9-sad");
  });

  it("V3: webm source comes from the webm path; mp4 from the mp4 path", () => {
    expect(webmSrc(5, "happy")).toBe("/habitat/clips/l5-happy.webm");
    expect(mp4Src(5, "happy")).toBe("/habitat/clips/l5-happy.mp4");
    expect(webmSrc(3, "excited")).toBe("/habitat/clips/l3-excited.webm");
    expect(mp4Src(9, "neutral")).toBe("/habitat/clips/l9-neutral.mp4");
  });

  it("V4: poster points at hero-l{N}.webp (the LCP candidate)", () => {
    for (let lv = 1; lv <= 9; lv++) {
      expect(posterSrc(lv)).toBe(`/habitat/hero-l${lv}.webp`);
    }
    expect(posterSrc(0)).toBe("/habitat/hero-l1.webp");
    expect(posterSrc(50)).toBe("/habitat/hero-l9.webp");
  });

  it("V5: decay filter changes with quality (full at 1.0, dim+desaturated toward floor)", () => {
    // quality 1.0 → no change
    expect(decayFilter(1)).toBe("none");
    // a neglected world is desaturated + dimmed
    const low = decayFilter(0.1);
    expect(low).toMatch(/saturate\(0\.100\)/);
    expect(low).toMatch(/brightness\(0\.640\)/);
    // monotonic: lower quality → lower saturation + lower brightness
    const satOf = (s: string) =>
      Number(s.match(/saturate\(([\d.]+)\)/)?.[1] ?? "1");
    const brightOf = (s: string) =>
      Number(s.match(/brightness\(([\d.]+)\)/)?.[1] ?? "1");
    const f7 = decayFilter(0.7);
    const f4 = decayFilter(0.4);
    expect(satOf(f7)).toBeGreaterThan(satOf(f4));
    expect(brightOf(f7)).toBeGreaterThan(brightOf(f4));
    expect(satOf(f4)).toBeGreaterThan(satOf(low));
  });

  it("V6: decay filter clamps quality to the [0.1,1] engine band", () => {
    // below floor clamps to 0.1 behaviour; above 1 clamps to none
    expect(decayFilter(0)).toBe(decayFilter(0.1));
    expect(decayFilter(1.5)).toBe("none");
  });
});

describe("HabitatVideo JSX invariants (source grep)", () => {
  it("V7: <video> is autoPlay + muted + loop + playsInline + preload=metadata", () => {
    const s = src();
    expect(s).toMatch(/<video[\s\S]*?>/);
    expect(s).toMatch(/\bautoPlay\b/);
    expect(s).toMatch(/\bmuted\b/);
    expect(s).toMatch(/\bloop\b/);
    expect(s).toMatch(/\bplaysInline\b/);
    // VIDEO-03 LCP fix: clip drops to preload="metadata" so it doesn't compete
    // with the preloaded priority poster for the Slow-4G LCP-window bandwidth.
    expect(s).toMatch(/preload="metadata"/);
  });

  it("V7b: poster is a priority next/image LCP candidate (rendered on all paths)", () => {
    const s = src();
    // The shared `Poster` element carries `priority` (emits <link rel=preload>)
    // and is returned for BOTH the reduced-motion path and beneath the video.
    expect(s).toMatch(/const\s+Poster\s*=/);
    expect(s).toMatch(/\bpriority\b/);
    expect(s).toMatch(/src=\{poster\}/);
  });

  it("V8: <source> order is webm FIRST, mp4 SECOND (codec preference)", () => {
    const s = src();
    const webmIdx = s.indexOf('type="video/webm"');
    const mp4Idx = s.indexOf('type="video/mp4"');
    expect(webmIdx).toBeGreaterThan(-1);
    expect(mp4Idx).toBeGreaterThan(-1);
    expect(webmIdx).toBeLessThan(mp4Idx);
  });

  it("V9: reduced-motion returns the still poster only (no autoplaying <video>)", () => {
    const s = src();
    // The reduced-motion branch returns the shared `Poster` still — no <video>.
    expect(s).toMatch(/if\s*\(\s*reducedMotion\s*\)/);
    expect(s).toMatch(/data-testid="habitat-video-still"/);
    // Slice the reduced-motion branch body to the start of the <video> JSX below
    // it; the branch must return Poster and NOT contain an autoplaying <video>.
    const branchStart = s.indexOf("if (reducedMotion)");
    const branchEnd = s.indexOf("<video", branchStart);
    const branch = s.slice(branchStart, branchEnd);
    expect(branch).not.toMatch(/autoPlay/);
    expect(branch).toMatch(/return\s+Poster/);
  });

  it("V10: the decay filter is applied to BOTH the video and the still", () => {
    const s = src();
    // `filter` derived from decayFilter(quality) is spread/used in both styles.
    expect(s).toMatch(/const\s+filter\s*=\s*decayFilter\(quality\)/);
    // applied to the still
    expect(s).toMatch(/objectFit:\s*"cover",\s*filter\s*\}/);
    // applied to the video (via FILL_STYLE spread + filter)
    expect(s).toMatch(/\.\.\.FILL_STYLE,\s*filter\s*\}/);
  });

  it("V11: component does NOT import three.js or the habitat-3d canvas/lib", () => {
    const s = src();
    // Inspect only `import ... from "..."` statements — the doc-comment header
    // legitimately *names* the modules it no longer imports.
    const imports = s
      .split("\n")
      .filter((l) => /^\s*import\b/.test(l))
      .join("\n");
    expect(imports).not.toMatch(/from\s+["']three["']/);
    expect(imports).not.toMatch(/habitat-3d-canvas/);
    expect(imports).not.toMatch(/habitat-3d\//);
  });
});
