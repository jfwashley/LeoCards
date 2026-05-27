// e2e/scripts/render-habitat-posters.spec.ts — Phase 13.1 Plan 01 Task 1.
//
// Renders the nine /habitat scenes at full LCP-candidate resolution
// (1280×720 — matches the canvas wrapper's aspectRatio: "16/9") into raw
// PNGs at e2e/scripts/.tmp/hero-l{1..9}.png. The orchestrator script
// (scripts/render-habitat-posters.mjs) owns the PNG → webp conversion +
// 20–100 KB size-budget validation + the final write to public/habitat/.
//
// This spec intentionally writes ONLY to .tmp/. It must NOT touch
// public/ — that's the orchestrator's responsibility.
//
// Prereqs:
//   • `npm run dev` running on http://localhost:3000 (NODE_ENV !== "production"
//     so `window.__habitatSetTheta` exists per habitat-3d-canvas.tsx).
//   • Fresh user is signed up per-run via the standard auth fixture.

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "playwright/test";
import { signUpWithDeck } from "../helpers";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const TMP_DIR = path.resolve(__dirname, ".tmp");

const READY_SELECTOR =
  'canvas[data-testid="habitat-3d-canvas"][data-ready="true"]';
const CANVAS_SELECTOR = '[data-testid="habitat-3d-canvas"]';

test.describe("Phase 13.1 Plan 01 — full-resolution /habitat poster render", () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    contextOptions: { reducedMotion: "reduce" },
  });
  test.setTimeout(900_000);

  test("Render 9 hero-l{N}.png posters at 1280×720", async ({ page }) => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    await signUpWithDeck(page, "French");

    for (const level of LEVELS) {
      const url = `/habitat?snapshot=true&devLevel=${level}`;
      await page.goto(url, { timeout: 60_000 });
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
      await page.waitForSelector(READY_SELECTOR, { timeout: 60_000 });

      // Lock orbit at a deterministic angle so the screenshot is reproducible.
      await page.evaluate(() => {
        const w = window as unknown as {
          __habitatSetTheta?: (n: number) => void;
        };
        w.__habitatSetTheta?.(0);
      });
      // One RAF tick so the locked theta is reflected in the rendered frame.
      await page.waitForTimeout(64);

      const out = path.join(TMP_DIR, `hero-l${level}.png`);
      await page.locator(CANVAS_SELECTOR).screenshot({
        path: out,
        type: "png",
        omitBackground: false,
      });

      expect(fs.existsSync(out)).toBe(true);
      expect(fs.statSync(out).size).toBeGreaterThan(0);
    }
  });
});
