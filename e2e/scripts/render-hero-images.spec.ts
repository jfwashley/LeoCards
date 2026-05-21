// e2e/scripts/render-hero-images.spec.ts — Phase 13 Plan 06 Task 3.
//
// D-28 resolved CACHED — generate 9 hero images (one per level) for the
// dashboard widget to display as a static <img>.
//
// Workflow:
//   1. Sign up a fresh user (auth gate).
//   2. For each level 1..9:
//      a. Navigate to /habitat?devLevel=N&snapshot=true
//      b. Wait for canvas[data-ready=true]
//      c. Lock theta via window.__habitatSetTheta(0.9) (Plan 03 dev affordance)
//      d. Allow 800ms settle (mirrors 13-habitat-states.spec.ts)
//      e. Screenshot the canvas, save as PNG.
//   3. Post-process each PNG to a 160×160 WebP via sharp, written to
//      public/habitat/widget-l{N}.webp.
//
// Run via: `npx playwright test e2e/scripts/render-hero-images.spec.ts`.
//
// Per RESEARCH section E.3 + Plan 04 Task 3: capture (Playwright) is split
// from post-process (sharp) so the in-browser cost stays low.

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "playwright/test";
import sharp from "sharp";
import { signUpWithDeck } from "../helpers";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const OUT_DIR = path.resolve(__dirname, "..", "..", "public", "habitat");

const CANVAS_SELECTOR = '[data-testid="habitat-3d-canvas"]';
const READY_SELECTOR =
  'canvas[data-testid="habitat-3d-canvas"][data-ready="true"]';

test.describe("Phase 13 Plan 06 — hero-image render (D-28 = cached)", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test.setTimeout(900_000);

  test("Render 9 widget-l{N}.webp images from /habitat snapshots", async ({
    page,
  }) => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    await signUpWithDeck(page, "French");

    for (const level of LEVELS) {
      const url = `/habitat?devLevel=${level}&snapshot=true`;
      await page.goto(url, { timeout: 60_000 });
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await page.waitForSelector(READY_SELECTOR, { timeout: 60_000 });
      await page.evaluate(() => {
        const w = window as unknown as {
          __habitatSetTheta?: (n: number) => void;
        };
        w.__habitatSetTheta?.(0.9);
      });
      await page.waitForTimeout(800);

      const buf = await page.locator(CANVAS_SELECTOR).screenshot();

      // Post-process to 160×160 (2× the 80px widget display = DPR-friendly) WebP.
      const out = path.join(OUT_DIR, `widget-l${level}.webp`);
      await sharp(buf)
        .resize(160, 160, { fit: "cover", position: "center" })
        .webp({ quality: 82 })
        .toFile(out);
      expect(fs.existsSync(out)).toBe(true);
    }
  });
});
