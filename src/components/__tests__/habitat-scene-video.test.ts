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

  it("VS2: habitat-scene.tsx no longer imports the live Three.js canvas (no client path to three.js)", () => {
    // Inspect only import statements — the doc-comment legitimately names the
    // module it no longer imports.
    const imports = SCENE_SRC.split("\n")
      .filter((l) => /^\s*import\b/.test(l))
      .join("\n");
    expect(imports).not.toMatch(/habitat-3d-canvas/);
    expect(imports).not.toMatch(/from\s+["']next\/dynamic["']/);
    // The canvasReady poster-fade machinery is gone (it referenced the canvas's
    // onCanvasReady readiness signal). Assert no live state binding remains.
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

  it("VS5: surrounding chrome + state logic preserved (badge, mood, level-up, offline, retry, cache)", () => {
    expect(SCENE_SRC).toMatch(/Level \{state\.level\}/); // level badge
    expect(SCENE_SRC).toMatch(/<MoodIndicator mood=\{state\.mood\}/); // mood
    expect(SCENE_SRC).toMatch(/showLevelUp/); // level-up celebration
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
