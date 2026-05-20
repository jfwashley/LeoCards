// 13-habitat-states.spec.ts — Plan 13-04 Task 3.
//
// SPEC R7 acceptance: generate 28 reference screenshots at level 5
// (4 moods × 7 quality tiers).
//
// Orchestrator instruction (autonomous mode for Phase 13): the
// human-verify checkpoint is resolved by an AUTOMATED pixel-mean-square-
// difference assertion. Distinctness is asserted by the standalone
// `scripts/diff-habitat-screenshots.mjs` script which reads the committed
// PNGs and writes `diff-table.json` next to them (run via
// `node scripts/diff-habitat-screenshots.mjs` or `npm run snapshots:diff`).
//
// This Playwright spec is responsible for CAPTURE only. The diff script
// is run separately (and from the SUMMARY-verification step) so we don't
// pay the in-browser PNG-decode cost for 28 images on every CI run.
//
// Deterministic capture: ?devLevel=5&devMood=X&devQuality=Y&snapshot=true
// is plumbed in `<HabitatCanvas>` (Plan 13-04 Task 2) — gated by NODE_ENV.
// Camera theta is locked via window.__habitatSetTheta(0.9). Reduced-motion
// emulation keeps ambient anims frozen so successive frames are stable.

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

const MOODS = ["excited", "happy", "neutral", "sad"] as const;
const QUALITIES = [1.0, 0.7, 0.5, 0.4, 0.3, 0.2, 0.1] as const;

const SNAPSHOT_DIR = path.join(__dirname, "__screenshots__", "habitat-states");

const CANVAS_SELECTOR = '[data-testid="habitat-3d-canvas"]';
const READY_SELECTOR =
  'canvas[data-testid="habitat-3d-canvas"][data-ready="true"]';

function filenameFor(mood: string, q: number): string {
  return `L5-mood-${mood}-q${q.toFixed(2)}.png`;
}

test.describe("Habitat 3D — R7 mood/quality reference screenshots", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test.setTimeout(900_000);

  test("Capture 28 deterministic baselines at level 5", async ({ page }) => {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    await signUpWithDeck(page, "French");

    let captureCount = 0;
    for (const m of MOODS) {
      for (const q of QUALITIES) {
        const url = `/habitat?devLevel=5&devMood=${m}&devQuality=${q}&snapshot=true`;
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
        // Let mood crossfade + decay lerp settle. Under reducedMotion the
        // ambient anims are frozen so successive frames are visually stable.
        await page.waitForTimeout(800);

        const buf = await page.locator(CANVAS_SELECTOR).screenshot();
        const file = filenameFor(m, q);
        fs.writeFileSync(path.join(SNAPSHOT_DIR, file), buf);
        captureCount++;
      }
    }

    expect(captureCount).toBe(28);
    // All 28 PNGs must exist on disk.
    for (const m of MOODS) {
      for (const q of QUALITIES) {
        const fp = path.join(SNAPSHOT_DIR, filenameFor(m, q));
        expect(fs.existsSync(fp)).toBe(true);
      }
    }
  });
});
