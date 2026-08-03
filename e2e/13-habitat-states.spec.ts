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

// Autoplay recovery — browsers pause silent autoplaying clips on their own
// (hidden-tab optimisation, OS sleep/wake) and strict autoplay policies block
// them outright; neither auto-recovers, which left /habitat frozen on a still
// until reload. habitat-video.tsx now retries play() on visibilitychange and
// on the first user gesture. The designed D-03/D-04 mobile freeze is woken
// ONLY by an explicit tap on the scene (Option 3, 2026-08-03) or a tab
// return — incidental gestures elsewhere never wake it.
test.describe("Habitat — autoplay recovery (visibility + gesture)", () => {
  const isPaused = (v: SVGElement | HTMLElement) =>
    (v as HTMLVideoElement).paused;

  test("desktop: a browser-initiated pause is recovered by a user gesture", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "desktop-only — under 768px the freeze tier owns pause semantics",
    );
    await signUpWithDeck(page, "French");
    await page.goto("/habitat");
    const video = page.locator(VIDEO_SELECTOR);
    await expect(video).toHaveCount(1, { timeout: 15_000 });
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 10_000 })
      .toBe(false);

    // Simulate a browser-initiated pause (what the hidden-tab silent-video
    // optimisation or a dropped sleep/wake resume leaves behind).
    await video.evaluate((v) => (v as HTMLVideoElement).pause());
    await expect.poll(() => video.evaluate(isPaused)).toBe(true);

    // Any real pointerdown (empty page area — nothing clickable) must resume.
    await page.mouse.move(640, 600);
    await page.mouse.down();
    await page.mouse.up();
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 5_000 })
      .toBe(false);
  });

  test("desktop: a browser-initiated pause is recovered on visibilitychange", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "desktop-only — under 768px the freeze tier owns pause semantics",
    );
    await signUpWithDeck(page, "French");
    await page.goto("/habitat");
    const video = page.locator(VIDEO_SELECTOR);
    await expect(video).toHaveCount(1, { timeout: 15_000 });
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 10_000 })
      .toBe(false);

    await video.evaluate((v) => (v as HTMLVideoElement).pause());
    await expect.poll(() => video.evaluate(isPaused)).toBe(true);

    // The page is visible in-test, so dispatching visibilitychange exercises
    // the same listener + visibility guard a real tab return goes through.
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 5_000 })
      .toBe(false);
  });

  test("mobile: designed freeze ignores gestures outside the scene but re-arms on tab return", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      "mobile-only — freeze tier is active under 768px",
    );
    await signUpWithDeck(page, "French");
    await page.goto("/habitat");
    const video = page.locator(VIDEO_SELECTOR);
    await expect(video).toHaveCount(1, { timeout: 15_000 });
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 10_000 })
      .toBe(false);

    // D-03/D-04: the freeze tier pauses after ~10s of viewing.
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 15_000 })
      .toBe(true);

    // A tap on the page BELOW the scene must not wake the designed freeze
    // (and a touch-scroll never produces a click at all).
    await page.touchscreen.tap(206, 700);
    await page.waitForTimeout(750);
    expect(await video.evaluate(isPaused)).toBe(true);

    // But returning to the tab is a fresh viewing session — clip re-plays.
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 5_000 })
      .toBe(false);
  });

  test("mobile: a tap on the habitat scene wakes the designed freeze (Option 3)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      "mobile-only — freeze tier is active under 768px",
    );
    await signUpWithDeck(page, "French");
    await page.goto("/habitat");
    const video = page.locator(VIDEO_SELECTOR);
    await expect(video).toHaveCount(1, { timeout: 15_000 });
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 10_000 })
      .toBe(false);

    // Wait out the designed freeze…
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 15_000 })
      .toBe(true);

    // …then tap the scene itself. (206,130) is the empty band between HTop
    // and the bottom cards — inside the video's rect, no interactive target.
    await page.touchscreen.tap(206, 130);
    await expect
      .poll(() => video.evaluate(isPaused), { timeout: 5_000 })
      .toBe(false);
  });
});

// Reduced-motion opt-in (2026-08-03): the still poster stays the default, but
// the "Motion paused" pill is a toggle — an explicit tap mounts and plays the
// clip, tapping again returns to the still. Covers Windows users whose OS
// "Animation effects" toggle maps to prefers-reduced-motion.
test.describe("Habitat — reduced-motion opt-in", () => {
  test("still by default; the pill toggles motion on and back off", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signUpWithDeck(page, "French");
    await page.goto("/habitat");

    const still = page.locator(STILL_SELECTOR);
    const video = page.locator(VIDEO_SELECTOR);
    const pill = page.locator('[data-testid="habitat-motion-paused"]');

    // Default: still poster only, no video element, pill invites a tap.
    await expect(pill).toBeVisible({ timeout: 15_000 });
    await expect(video).toHaveCount(0);
    await expect(still).toHaveCount(1);
    await expect(pill).toHaveAttribute("aria-pressed", "false");

    // Opt in: video mounts and plays.
    await pill.click();
    await expect(video).toHaveCount(1);
    await expect(pill).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused), {
        timeout: 5_000,
      })
      .toBe(false);

    // Opt back out: video unmounts, still remains.
    await pill.click();
    await expect(video).toHaveCount(0);
    await expect(still).toHaveCount(1);
    await expect(pill).toHaveAttribute("aria-pressed", "false");
  });
});
