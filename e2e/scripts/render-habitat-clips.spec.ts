// e2e/scripts/render-habitat-clips.spec.ts — Phase 13.1 Plan VIDEO-01.
//
// Captures a SEQUENCE of PNG frames for each (level 1..9) × (mood) habitat
// scene, to be encoded into looping webm/mp4 clips by the orchestrator
// (scripts/render-habitat-clips.mjs). Mirrors render-habitat-posters.spec.ts
// but with three differences:
//   (a) adds a MOOD dimension (excited|happy|neutral|sad) via ?devMood=,
//   (b) keeps AMBIENT animation RUNNING — reducedMotion: "no-preference"
//       (poster mode froze it with "reduce"); the camera is locked instead
//       via the dev-only ?capture=video affordance (auto-orbit frozen, ambient
//       on),
//   (c) captures a frame SEQUENCE (not one shot) into
//       e2e/scripts/.tmp/clips/l{N}-{mood}/frame-####.png.
//
// Capture settings (documented in SUMMARY):
//   • 24 fps × 5 s = 120 frames per clip. Per-frame canvas screenshots in
//     headless Chromium are the bottleneck; 24 fps keeps the per-clip wall
//     time reasonable while still reading as smooth ambient motion. The
//     orchestrator encodes at the same 24 fps so playback speed is correct.
//   • Camera locked to a fixed flattering isometric angle (theta = π/4, the
//     scene's default 45° view) via window.__habitatSetTheta.
//
// This spec writes ONLY to .tmp/clips/ — the orchestrator owns encoding +
// the final write to public/habitat/clips/.
//
// Prereqs:
//   • `npm run dev` running on http://localhost:3000 (NODE_ENV !== "production"
//     so the dev capture affordances exist per habitat-3d-canvas.tsx).
//
// Scope control: the orchestrator passes CLIP_LEVELS / CLIP_MOODS env vars so
// the de-risk pass can render a single l5-happy clip before the full 36-clip
// batch. Absent the env vars, the spec renders all 9×4 = 36 combinations.

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "playwright/test";
import { signUpWithDeck } from "../helpers";

const ALL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const ALL_MOODS = ["excited", "happy", "neutral", "sad"] as const;
type Mood = (typeof ALL_MOODS)[number];

// Allow the orchestrator to narrow scope (de-risk single-clip pass).
function parseLevels(): number[] {
  const raw = process.env.CLIP_LEVELS;
  if (!raw) return [...ALL_LEVELS];
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 9);
}
function parseMoods(): Mood[] {
  const raw = process.env.CLIP_MOODS;
  if (!raw) return [...ALL_MOODS];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Mood => (ALL_MOODS as readonly string[]).includes(s));
}

const LEVELS = parseLevels();
const MOODS = parseMoods();

// 24 fps × 5 s. (See header note on the fps choice.)
const FPS = 24;
const DURATION_S = 5;
const FRAME_COUNT = FPS * DURATION_S; // 120
const FRAME_INTERVAL_MS = Math.round(1000 / FPS); // ~42 ms

// Fixed flattering isometric camera angle (scene default 45° view).
const FIXED_THETA = Math.PI / 4;

const TMP_DIR = path.resolve(__dirname, ".tmp");
const CLIPS_DIR = path.join(TMP_DIR, "clips");

const READY_SELECTOR =
  'canvas[data-testid="habitat-3d-canvas"][data-ready="true"]';
const CANVAS_SELECTOR = '[data-testid="habitat-3d-canvas"]';

test.describe("Phase 13.1 VIDEO-01 — habitat ambient clip frame capture", () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    // Ambient MUST run — do NOT freeze with reducedMotion: "reduce".
    contextOptions: { reducedMotion: "no-preference" },
  });
  // 36 clips × 120 frames × ~42 ms ≈ long; give the whole batch ample time.
  test.setTimeout(60 * 60 * 1000);

  test("Capture frame sequences for level×mood matrix", async ({ page }) => {
    fs.mkdirSync(CLIPS_DIR, { recursive: true });
    await signUpWithDeck(page, "French");

    for (const level of LEVELS) {
      for (const mood of MOODS) {
        const clipName = `l${level}-${mood}`;
        const outDir = path.join(CLIPS_DIR, clipName);
        fs.mkdirSync(outDir, { recursive: true });

        const url = `/habitat?snapshot=true&devLevel=${level}&devMood=${mood}&capture=video`;
        await page.goto(url, { timeout: 60_000 });
        await page
          .waitForLoadState("networkidle", { timeout: 30_000 })
          .catch(() => {});
        await page.waitForSelector(READY_SELECTOR, { timeout: 60_000 });

        const canvas = page.locator(CANVAS_SELECTOR);

        // Assert the right (level, mood) was injected before we capture.
        await expect(canvas).toHaveAttribute("data-mood", mood);
        await expect(canvas).toHaveAttribute("data-level", String(level));

        // Lock the camera to the fixed flattering angle. In capture-video mode
        // auto-orbit is frozen, so this theta holds for the whole sequence.
        await page.evaluate((theta) => {
          const w = window as unknown as {
            __habitatSetTheta?: (n: number) => void;
          };
          w.__habitatSetTheta?.(theta);
        }, FIXED_THETA);

        // Let ambient settle one beat so the first frame isn't mid-mount.
        await page.waitForTimeout(200);

        for (let i = 0; i < FRAME_COUNT; i++) {
          const framePath = path.join(
            outDir,
            `frame-${String(i).padStart(4, "0")}.png`,
          );
          await canvas.screenshot({
            path: framePath,
            type: "png",
            omitBackground: false,
          });
          await page.waitForTimeout(FRAME_INTERVAL_MS);
        }

        // Sanity: every frame landed.
        const written = fs
          .readdirSync(outDir)
          .filter((f) => f.endsWith(".png"));
        expect(written.length).toBe(FRAME_COUNT);
        const firstFrame = path.join(outDir, "frame-0000.png");
        expect(fs.existsSync(firstFrame)).toBe(true);
        expect(fs.statSync(firstFrame).size).toBeGreaterThan(0);
      }
    }
  });
});
