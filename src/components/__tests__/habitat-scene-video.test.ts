// habitat-scene-video.test.ts — Phase 13.1 Plan VIDEO-02.
//
// Replaces habitat-scene-ssr-poster.test.ts (deleted). That file pinned the
// Phase 13.1-04 architecture where the SSR <Image> poster + the dynamic
// Three.js canvas + the `canvasReady` poster-fade lived in habitat-scene.tsx.
// VIDEO-02 removed all of that: the live canvas is replaced by a pre-rendered
// clip (<HabitatVideo>), which now OWNS the poster (the LCP candidate). The
// invariants worth pinning therefore changed — this file asserts the NEW
// boundary so a regression can't silently re-import three.js into the client.
//
// Vitest runs in `environment: "node"` (no jsdom), so we source-grep both
// habitat-scene.tsx and habitat-video.tsx.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCENE_SRC = readFileSync(
  join(__dirname, "..", "habitat-scene.tsx"),
  "utf8",
);
const VIDEO_SRC = readFileSync(
  join(__dirname, "..", "habitat-video.tsx"),
  "utf8",
);

describe("Phase 13.1-VIDEO-02 — scene swapped to video", () => {
  it("VS1: habitat-scene.tsx renders <HabitatVideo habitatState={state} /> and imports it", () => {
    expect(SCENE_SRC).toMatch(
      /import\s*\{\s*HabitatVideo\s*\}\s*from\s*["']@\/components\/habitat-video["']/,
    );
    expect(SCENE_SRC).toMatch(/<HabitatVideo\s+habitatState=\{state\}\s*\/>/);
  });

  it("VS2: the live Three.js canvas is imported ONLY behind a NODE_ENV dev gate (tree-shaken from production)", () => {
    // Phase 13.1-VIDEO-03: the clip render pipeline needs the live canvas, so
    // habitat-scene mounts it via a dynamic import GATED by
    // `process.env.NODE_ENV !== "production"` → dead-code-eliminated in
    // `next build` (verified separately: `grep WebGLRenderer .next/static/chunks`
    // is empty). Production users always get <HabitatVideo>; no client path to
    // three.js ships. Assert the gate co-occurs with the dynamic canvas import.
    expect(SCENE_SRC).toMatch(
      /process\.env\.NODE_ENV\s*!==\s*["']production["']/,
    );
    expect(SCENE_SRC).toMatch(
      /dynamic\(\s*\(\)\s*=>\s*import\(\s*["']@\/components\/habitat-3d-canvas["']\s*\)/,
    );
    // The canvasReady poster-fade machinery stays gone — the capture canvas is
    // mounted WITHOUT an onCanvasReady binding.
    expect(SCENE_SRC).not.toMatch(/\[canvasReady,\s*setCanvasReady\]/);
    expect(SCENE_SRC).not.toMatch(/onCanvasReady=/);
  });

  it("VS3: the SSR poster <Image> moved out of the scene — the video owns the poster now", () => {
    // The scene no longer renders the hero-l{N}.webp poster directly.
    expect(SCENE_SRC).not.toMatch(/hero-l\$\{sceneLevel\}\.webp/);
    // HabitatVideo carries the poster (LCP candidate).
    expect(VIDEO_SRC).toMatch(/hero-l\$\{clampLevel\(level\)\}\.webp/);
  });

  it("VS4: CLS=0 wrapper (16/9, maxHeight min(70vh,400px)) stays in habitat-scene.tsx", () => {
    expect(SCENE_SRC).toMatch(/aspectRatio:\s*["']16\/9["']/);
    expect(SCENE_SRC).toMatch(/maxHeight:\s*["']min\(70vh,\s*400px\)["']/);
    expect(SCENE_SRC).toMatch(/data-testid=["']habitat-scene-wrapper["']/);
  });

  it("VS5: surrounding chrome + state logic preserved (Daybreak chrome, celebration, offline, retry, cache)", () => {
    // Phase 24 re-skin: HTop replaces the old badge + MoodIndicator
    expect(SCENE_SRC).toMatch(/<HTop mood=\{state\.mood\}/); // Daybreak chrome
    // showCelebration replaces showLevelUp (D-09 repair)
    expect(SCENE_SRC).toMatch(/showCelebration/); // level-up celebration
    expect(SCENE_SRC).toMatch(/offline/); // offline indicator
    expect(SCENE_SRC).toMatch(/async function retry\(/); // error/retry
    expect(SCENE_SRC).toMatch(/localStorage\.setItem\(CACHE_KEY/); // cache
  });

  it("VS6: the video element is autoplay-safe and webm-first (consumption contract)", () => {
    expect(VIDEO_SRC).toMatch(/\bautoPlay\b/);
    expect(VIDEO_SRC).toMatch(/\bmuted\b/);
    expect(VIDEO_SRC).toMatch(/\bplaysInline\b/);
    const webmIdx = VIDEO_SRC.indexOf('type="video/webm"');
    const mp4Idx = VIDEO_SRC.indexOf('type="video/mp4"');
    expect(webmIdx).toBeGreaterThan(-1);
    expect(webmIdx).toBeLessThan(mp4Idx);
  });
});

// Phase 24 extensions — celebration trigger wiring (HAB-04 D-09)
describe("Phase 24 — celebratingLevel wiring in habitat-scene.tsx", () => {
  it("VS7: habitat-scene.tsx consumes 'celebratingLevel' (NOT the dead '_celebratingLevel' prefix)", () => {
    // D-09 repair: the dead `_celebratingLevel` prefix must be replaced by `celebratingLevel`.
    // A test for the active prop name keeps the repair from regressing.
    expect(SCENE_SRC).toMatch(/\bcelebratingLevel\b/);
    // The underscore-prefixed dead variant must NOT appear (it signalled "intentionally unused")
    expect(SCENE_SRC).not.toMatch(/_celebratingLevel/);
  });
});

// Phase 27-08 (PERF-22) — offline banner blur removal. habitat-scene.tsx is a
// "use client" component with heavy dependencies (HabitatVideo, dynamic
// three.js import, localStorage cache); a full DOM render here would require
// mocking most of the module. A source-level assertion is the acceptable
// regression guard per this plan's task (a rendered-DOM assertion would be
// awkward for this file, unlike the 3 simpler daybreak atoms covered in
// h-habitat-overlays-no-blur.test.tsx).
describe("Phase 27-08 — offline banner has no backdrop-filter blur (PERF-22)", () => {
  it("VS8: the offline banner's inline style no longer sets backdropFilter", () => {
    const bannerBlock = SCENE_SRC.slice(
      SCENE_SRC.indexOf('data-testid="habitat-offline-banner"'),
      SCENE_SRC.indexOf('data-testid="habitat-offline-banner"') + 400,
    );
    expect(bannerBlock).not.toMatch(/backdropFilter/);
    // The near-solid background stays untouched — only the blur was removed.
    expect(bannerBlock).toMatch(/background:\s*"rgba\(74,51,28,0\.82\)"/);
  });

  it("VS9: no WebkitBackdropFilter or backdrop-filter survives anywhere in habitat-scene.tsx", () => {
    expect(SCENE_SRC).not.toMatch(/backdropFilter/);
    expect(SCENE_SRC).not.toMatch(/WebkitBackdropFilter/);
    expect(SCENE_SRC).not.toMatch(/backdrop-blur/);
  });
});
