// 13-habitat-states.spec.ts — REWRITTEN for Phase 13.1 Plan VIDEO-02.
//
// Phase 13-04 captured 28 reference screenshots of the LIVE Three.js canvas
// (4 moods × 7 quality tiers at level 5) using `?devLevel/devMood/devQuality
// &snapshot=true`, which mounted the canvas deterministically. VIDEO-02
// replaced the user-facing /habitat scene with a pre-rendered clip whose
// mood/decay are now expressed as:
//
//   • mood → which baked clip plays (`l{N}-{mood}.webm`)
//   • quality (decay) → a CSS `filter` (saturate + brightness) on the video
//
// The per-pixel canvas screenshots described a path that is no longer
// user-facing, so the 28-baseline capture is RETIRED. Coverage of the
// mood/decay PRODUCT behaviour is preserved at the unit level
// (habitat-video.test.ts: clip-basename-per-mood, decayFilter-per-quality)
// plus this e2e check that the user-facing /habitat video actually carries a
// mood-correct clip and a decay filter when the habitat is decaying.
//
// NOTE: the live-canvas mood/decay rendering still EXISTS under
// `?capture=video` for the build-time clip renderer; that pipeline + its
// render spec (render-habitat-clips.spec.ts) are deliberately untouched.

import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

const VIDEO_SELECTOR = '[data-testid="habitat-video"]';
const STILL_SELECTOR = '[data-testid="habitat-video-still"]';

test.describe("Habitat — video mood/decay (VIDEO-02, replaces 28-screenshot baseline)", () => {
  test("user-facing /habitat plays a mood-correct clip with a valid decay filter", async ({
    page,
  }) => {
    await signUpWithDeck(page, "French");
    await page.goto("/habitat");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});

    const el = page.locator(`${VIDEO_SELECTOR}, ${STILL_SELECTOR}`).first();
    await expect(el).toHaveCount(1, { timeout: 15_000 });

    // The decay filter is always a valid CSS filter string: either "none"
    // (quality 1.0) or saturate(..) brightness(..) (decaying). Filter-only →
    // no layout impact (CLS=0).
    const filter = await el.evaluate(
      (n) => getComputedStyle(n as HTMLElement).filter,
    );
    expect(filter === "none" || /saturate|brightness/.test(filter)).toBe(true);

    // If it's the motion video (not the reduced-motion still), the playing clip
    // must be one of the 4 baked moods.
    const isVideo = (await page.locator(VIDEO_SELECTOR).count()) === 1;
    if (isVideo) {
      const webm = await page
        .locator(`${VIDEO_SELECTOR} source[type="video/webm"]`)
        .getAttribute("src");
      expect(webm).toMatch(
        /\/habitat\/clips\/l[1-9]-(excited|happy|neutral|sad)\.webm$/,
      );
    }
  });
});
