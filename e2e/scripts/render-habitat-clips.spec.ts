// e2e/scripts/render-habitat-clips.spec.ts — Phase 13.1 Plan VIDEO-01.
//
// REAL-TIME capture of the live Three.js /habitat WebGL canvas for each
// (level 1..9) × (mood) scene, into ONE intermediate `*.raw.webm` per clip.
// The orchestrator (scripts/render-habitat-clips.mjs) re-encodes each raw
// webm into a seamless-looping public webm (VP9) + mp4 (H.264).
//
// ── Why this replaces per-frame screenshots ───────────────────────────────
// The previous approach took a `page.locator(canvas).screenshot()` per frame
// (120 round-trips/clip) → ~10.8 min/clip → ~6.5h for 36 clips. Unviable.
//
// This version records the canvas IN-PAGE via the browser's MediaRecorder API
// over `canvas.captureStream(30)`. The recorder runs in real time for ~5.5s
// regardless of clip — so capture is ~6s/clip wall-time. The WebGL canvas is
// ACTIVELY RENDERING in `?capture=video` mode (the RAF ambient loop keeps
// ticking via updateWorld), so captureStream pulls live frames; no
// preserveDrawingBuffer needed.
//
// Differences from render-habitat-posters.spec.ts:
//   (a) adds a MOOD dimension (excited|happy|neutral|sad) via ?devMood=,
//   (b) keeps AMBIENT animation RUNNING — reducedMotion: "no-preference"
//       (poster mode froze it with "reduce"); the camera is locked instead
//       via the dev-only ?capture=video affordance (auto-orbit frozen, ambient
//       on),
//   (c) records a real-time MediaRecorder stream (not a frame sequence) into
//       e2e/scripts/.tmp/clips/l{N}-{mood}.raw.webm.
//
// Capture settings (documented in SUMMARY):
//   • captureStream(30) → 30fps source. MediaRecorder VP9 @ 2.5 Mbps. The raw
//     webm is an INTERMEDIATE; the orchestrator's ffmpeg pass controls final
//     size/quality. Record ~5500 ms so the orchestrator can trim a clean ~5s
//     and still have headroom for the tail→head xfade loop.
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

// Real-time MediaRecorder capture settings.
const CAPTURE_FPS = 30; // captureStream fps
const RECORD_MS = 5500; // record ~5.5s; orchestrator trims to a clean ~5s
const RECORD_BITRATE = 2_500_000; // VP9 intermediate bitrate (ffmpeg controls final size)

// Fixed flattering isometric camera angle (scene default 45° view).
const FIXED_THETA = Math.PI / 4;

const TMP_DIR = path.resolve(__dirname, ".tmp");
const CLIPS_DIR = path.join(TMP_DIR, "clips");

const READY_SELECTOR =
  'canvas[data-testid="habitat-3d-canvas"][data-ready="true"]';
const CANVAS_SELECTOR = '[data-testid="habitat-3d-canvas"]';

// In-page recorder. Runs entirely in the browser context: grabs the live
// WebGL canvas, captures its MediaStream, records VP9 for `recordMs`, then
// returns the resulting webm as a base64 data-URL string. Resolves null on
// any failure so the spec can surface a clear assertion message.
async function recordCanvasInPage(
  page: import("playwright/test").Page,
  recordMs: number,
  fps: number,
  bitrate: number,
): Promise<string | null> {
  return page.evaluate(
    ({ recordMs, fps, bitrate }) =>
      new Promise<string | null>((resolve) => {
        const canvas = document.querySelector<HTMLCanvasElement>(
          'canvas[data-testid="habitat-3d-canvas"]',
        );
        if (!canvas || typeof canvas.captureStream !== "function") {
          resolve(null);
          return;
        }
        // Prefer vp9; fall back to vp8/default if the build lacks it.
        const candidates = [
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
        ];
        const mimeType =
          candidates.find(
            (m) =>
              typeof MediaRecorder !== "undefined" &&
              MediaRecorder.isTypeSupported(m),
          ) ?? "";
        if (!mimeType) {
          resolve(null);
          return;
        }
        let stream: MediaStream;
        try {
          stream = canvas.captureStream(fps);
        } catch {
          resolve(null);
          return;
        }
        let rec: MediaRecorder;
        try {
          rec = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: bitrate,
          });
        } catch {
          resolve(null);
          return;
        }
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        };
        // Timeslice so we get periodic dataavailable events even on long runs.
        rec.start(250);
        setTimeout(() => {
          if (rec.state !== "inactive") rec.stop();
        }, recordMs);
      }),
    { recordMs, fps, bitrate },
  );
}

test.describe("Phase 13.1 VIDEO-01 — habitat ambient clip capture (MediaRecorder)", () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    // Ambient MUST run — do NOT freeze with reducedMotion: "reduce".
    contextOptions: { reducedMotion: "no-preference" },
  });
  // 36 clips × ~6s capture + nav each; generous batch ceiling.
  test.setTimeout(60 * 60 * 1000);

  test("Capture MediaRecorder clips for level×mood matrix", async ({
    page,
  }) => {
    fs.mkdirSync(CLIPS_DIR, { recursive: true });
    await signUpWithDeck(page, "French");

    for (const level of LEVELS) {
      for (const mood of MOODS) {
        const clipName = `l${level}-${mood}`;
        const rawPath = path.join(CLIPS_DIR, `${clipName}.raw.webm`);

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
        // auto-orbit is frozen, so this theta holds for the whole recording.
        await page.evaluate((theta) => {
          const w = window as unknown as {
            __habitatSetTheta?: (n: number) => void;
          };
          w.__habitatSetTheta?.(theta);
        }, FIXED_THETA);

        // Let ambient settle one beat so the recording doesn't start mid-mount.
        await page.waitForTimeout(300);

        const dataUrl = await recordCanvasInPage(
          page,
          RECORD_MS,
          CAPTURE_FPS,
          RECORD_BITRATE,
        );
        expect(
          dataUrl,
          `${clipName}: MediaRecorder returned no data (canvas/captureStream/MediaRecorder unavailable)`,
        ).toBeTruthy();

        // Decode the base64 data-URL → bytes and write the raw webm.
        const base64 = (dataUrl as string).replace(
          /^data:video\/webm;base64,/,
          "",
        );
        const buf = Buffer.from(base64, "base64");
        fs.writeFileSync(rawPath, buf);

        // Sanity: a real WebGL recording is comfortably larger than an empty
        // container. < 8 KB almost certainly means black/empty frames.
        const bytes = fs.statSync(rawPath).size;
        expect(
          bytes,
          `${clipName}: raw webm only ${bytes} B — likely black/empty capture`,
        ).toBeGreaterThan(8 * 1024);
        console.log(
          `[capture] ${clipName}.raw.webm ${(bytes / 1024).toFixed(1)} KB`,
        );
      }
    }
  });
});
