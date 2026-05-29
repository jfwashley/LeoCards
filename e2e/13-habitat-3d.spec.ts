// 13-habitat-3d.spec.ts — REWRITTEN for Phase 13.1 Plan VIDEO-02.
//
// Phase 13 originally tested the LIVE Three.js canvas on /habitat: SPEC R4
// (drag-orbit, no zoom/pan), R5 (keyboard nudges theta), R6 (reduced-motion
// freezes the canvas). VIDEO-02 swapped /habitat to a pre-rendered video clip;
// the live canvas now exists ONLY behind `?capture=video` for the build-time
// renderer. So:
//
//   • R4 (drag-orbit) and R5 (keyboard theta) are RETIRED — interactive orbit
//     is no longer a product feature on the user-facing page. Those assertions
//     described a path that no longer ships to users.
//   • The user-facing assertions are now VIDEO-based: /habitat renders a
//     <video> with the right clip src + hero poster, and NOT a <canvas>.
//   • R6 reduced-motion: the still poster <img> is shown, no <video> autoplays,
//     and still NO <canvas>.
//
// The `render-habitat-clips.spec.ts` renderer (which drives the live canvas
// under ?capture=video) is untouched — that affordance is the build-time
// pipeline and is deliberately preserved.

import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

const CANVAS_SELECTOR = '[data-testid="habitat-3d-canvas"]';
const VIDEO_SELECTOR = '[data-testid="habitat-video"]';
const STILL_SELECTOR = '[data-testid="habitat-video-still"]';

async function gotoHabitat(
  page: import("playwright/test").Page,
): Promise<void> {
  await page.goto("/habitat");
  await page
    .waitForLoadState("networkidle", { timeout: 30_000 })
    .catch(() => {});
}

test.describe("Habitat — user-facing video (VIDEO-02)", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("renders a <video> ambient clip and NOT a <canvas>", async ({
    page,
  }) => {
    await gotoHabitat(page);

    // A <video> is present and visible.
    const video = page.locator(VIDEO_SELECTOR);
    await expect(video).toHaveCount(1, { timeout: 15_000 });

    // It has a poster (the hero LCP candidate) and webm-first sources.
    const poster = await video.getAttribute("poster");
    expect(poster).toMatch(/\/habitat\/hero-l[1-9]\.webp$/);

    const sources = await video.locator("source").evaluateAll((els) =>
      els.map((e) => ({
        src: (e as HTMLSourceElement).src,
        type: (e as HTMLSourceElement).type,
      })),
    );
    expect(sources.length).toBe(2);
    expect(sources[0]?.type).toBe("video/webm");
    expect(sources[0]?.src).toMatch(
      /\/habitat\/clips\/l[1-9]-(excited|happy|neutral|sad)\.webm$/,
    );
    expect(sources[1]?.type).toBe("video/mp4");
    expect(sources[1]?.src).toMatch(
      /\/habitat\/clips\/l[1-9]-(excited|happy|neutral|sad)\.mp4$/,
    );

    // The live Three.js canvas must NOT exist on the user-facing page.
    expect(await page.locator(CANVAS_SELECTOR).count()).toBe(0);

    // Autoplay-safe attributes (mobile autoplay requires muted + playsInline).
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
    expect(await video.evaluate((v: HTMLVideoElement) => v.loop)).toBe(true);
  });
});

test.describe("Habitat — reduced-motion shows the still, no canvas (13.1 SPEC R4)", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("reduced-motion: still poster <img>, no autoplaying <video>, no <canvas>", async ({
    page,
  }) => {
    await signUpWithDeck(page, "French");
    await page.goto("/habitat");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});

    // The still poster <img> IS the experience (the LCP candidate).
    const still = page.locator(STILL_SELECTOR);
    await expect(still).toHaveCount(1, { timeout: 15_000 });
    const src = await still.getAttribute("src");
    // next/image may proxy, but `unoptimized` emits the direct path.
    expect(src).toMatch(/hero-l[1-9]\.webp/);

    // No autoplaying <video> and no live <canvas> under reduced-motion.
    expect(await page.locator(VIDEO_SELECTOR).count()).toBe(0);
    expect(await page.locator(CANVAS_SELECTOR).count()).toBe(0);
  });
});
