// habitat-scene-ssr-poster.test.ts — Phase 13.1 Plan 04 (SSR-POSTER-FIX)
//
// Root-cause of the LCP regression observed on Vercel preview
// `leocards-raczdfq76` (mobile /habitat LCP = 4717 ms, Lighthouse
// "NO LCP DETAILS"): the <Image priority fill> poster lived inside the
// dynamic({ssr:false}) boundary, so it never appeared in the SSR HTML the
// browser receives — no early LCP candidate, no preload <link> at first
// paint. Compounding that, the poster was wrapped in a `motion.div
// initial={{opacity:0}}` which would disqualify it even if it had moved up.
//
// This Plan-04 file restructures the boundaries so the poster + the
// aspect-ratio wrapper live in `<HabitatScene>` (a "use client" component
// that DOES SSR-render initial markup), while the dynamic Three.js canvas
// stays inside `habitat-3d-canvas.tsx` behind `ssr:false`.
//
// Vitest is configured for `environment: "node"` so we cannot render React
// components here. Instead we source-grep `habitat-scene.tsx` to pin the
// new boundary invariants. Three assertions, all critical:
//
//   S1 — poster <Image src="hero-l${level}.webp" priority fill> exists at
//        module scope of habitat-scene.tsx (NOT habitat-3d-canvas.tsx).
//   S2 — the poster is NOT wrapped in a `motion.div initial={{opacity:0}}`
//        wrapper (that would disqualify the SSR LCP candidate). The
//        poster's parent wrapper carries the aspect-ratio sizing only.
//   S3 — the aspect-ratio sized wrapper (16/9, maxHeight min(70vh,400px))
//        lives in habitat-scene.tsx so CLS=0 holds in SSR HTML.
//   S4 — habitat-3d-canvas.tsx no longer imports `next/image` nor renders
//        the `hero-l{N}.webp` poster (responsibility moved to parent).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCENE_SRC = readFileSync(
  join(__dirname, "..", "habitat-scene.tsx"),
  "utf8",
);
const CANVAS_SRC = readFileSync(
  join(__dirname, "..", "habitat-3d-canvas.tsx"),
  "utf8",
);

describe("Phase 13.1-04 SSR-POSTER-FIX", () => {
  it("S1: habitat-scene.tsx renders <Image src=`/habitat/hero-l${level}.webp` priority fill>", () => {
    // The Image import.
    expect(SCENE_SRC).toMatch(/import\s+Image\s+from\s+["']next\/image["']/);
    // The poster src is a hero-l${N}.webp expression.
    // biome-ignore lint/suspicious/noTemplateCurlyInString: asserting source contains a ${...} expression
    expect(SCENE_SRC).toMatch(/hero-l\$\{sceneLevel\}\.webp/);
    // `priority` is present (Next 16 still supports it, deprecated in favour
    // of `preload` — keeping `priority` preserves the prior LCP signal until
    // a follow-up plan migrates to `preload`).
    expect(SCENE_SRC).toMatch(/priority/);
    // `fill` is present so the <img> can absolutely-position inside the
    // aspect-ratio wrapper.
    expect(SCENE_SRC).toMatch(/\bfill\b/);
  });

  it("S2: the SSR poster is NOT wrapped in an opacity-0 motion.div (LCP candidate disqualifier)", () => {
    // Find the `<Image src={`/habitat/hero-l...` block.
    // biome-ignore lint/suspicious/noTemplateCurlyInString: locating a ${...} substring in source
    const imgIdx = SCENE_SRC.indexOf("hero-l${sceneLevel}");
    expect(imgIdx).toBeGreaterThan(-1);
    // Look backwards 600 chars for the nearest enclosing JSX wrapper.
    const before = SCENE_SRC.slice(Math.max(0, imgIdx - 600), imgIdx);
    // The poster MUST NOT be inside a `motion.div initial={{opacity: 0}}`
    // ancestor. Pattern: any `motion.div` followed (within the lookback) by
    // `initial={{ opacity: 0` and no closing `>` before the poster.
    // Stricter form: no `initial={{ opacity: 0` in the 600-char lookback
    // (the only opacity animation in the file should belong to the
    // offline/level-up overlays which appear AFTER the poster in source).
    expect(before).not.toMatch(/motion\.div[\s\S]*initial=\{\{\s*opacity:\s*0/);
    // The poster's own style binds opacity to canvasReady (not 0 at SSR).
    const after = SCENE_SRC.slice(imgIdx, imgIdx + 600);
    expect(after).toMatch(/opacity:\s*canvasReady\s*\?\s*0\s*:\s*1/);
  });

  it("S3: the aspect-ratio sized wrapper (16/9, maxHeight min(70vh,400px)) lives in habitat-scene.tsx", () => {
    expect(SCENE_SRC).toMatch(/aspectRatio:\s*["']16\/9["']/);
    expect(SCENE_SRC).toMatch(/maxHeight:\s*["']min\(70vh,\s*400px\)["']/);
    // And the wrapper has data-testid so future RTL/Playwright assertions
    // can target it deterministically.
    expect(SCENE_SRC).toMatch(/data-testid=["']habitat-scene-wrapper["']/);
  });

  it("S4: habitat-3d-canvas.tsx no longer imports next/image or renders the hero-l{N}.webp poster", () => {
    expect(CANVAS_SRC).not.toMatch(
      /import\s+Image\s+from\s+["']next\/image["']/,
    );
    expect(CANVAS_SRC).not.toMatch(/hero-l\$\{.+?\}\.webp/);
    expect(CANVAS_SRC).not.toMatch(/hero-l\d\.webp/);
  });

  it("S5: habitat-scene.tsx passes onCanvasReady so the parent fades the poster on data-ready", () => {
    // Parent owns the canvasReady state and the fade-out trigger.
    expect(SCENE_SRC).toMatch(
      /onCanvasReady=\{?\s*\(?\s*\)?\s*=>\s*setCanvasReady\(true\)\s*\}?/,
    );
    expect(SCENE_SRC).toMatch(/const\s+\[canvasReady,\s*setCanvasReady\]/);
    // The canvas component declares the prop in its interface.
    expect(CANVAS_SRC).toMatch(/onCanvasReady\?:\s*\(\)\s*=>\s*void/);
    // And calls it in the mount effect.
    expect(CANVAS_SRC).toMatch(/onCanvasReady\?\.\(\)/);
  });

  it("S6: gesture-gate hard rule still holds — no requestIdleCallback / setTimeout-mount fallback in canvas source", () => {
    expect(CANVAS_SRC).not.toMatch(/requestIdleCallback/);
    expect(CANVAS_SRC).not.toMatch(
      /setTimeout[\s\S]{0,80}(setCanvasMounted|setGestured|mountHabitatScene)/,
    );
  });
});
