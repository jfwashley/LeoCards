// 13-habitat-3d.spec.ts — Plan 13-03 Task 3
//
// Covers SPEC R4 (orbit only — no zoom, no pan), R5 (keyboard nudges
// theta), and R6 (prefers-reduced-motion freezes auto-orbit).
//
// Hooks consumed:
//   window.__habitatCameraPos() → { x, y, z, theta }
//   window.__habitatSetTheta(n)
// Attached by `habitat-3d-canvas.tsx` in non-production builds (NODE_ENV
// !== "production"). `npm run dev` runs Next.js in development by default
// so these are present.
//
// All tests follow the repo's existing pattern: fresh-user signup via the
// shared `signUpWithDeck` helper, then navigate to `/habitat` and wait for
// `canvas[data-ready="true"]` (the readiness signal Plan 03 attaches).

import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

const CANVAS_SELECTOR = '[data-testid="habitat-3d-canvas"]';
const READY_SELECTOR =
  'canvas[data-testid="habitat-3d-canvas"][data-ready="true"]';

async function readCameraPos(page: import("playwright/test").Page): Promise<{
  x: number;
  y: number;
  z: number;
  theta: number;
} | null> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __habitatCameraPos?: () => {
        x: number;
        y: number;
        z: number;
        theta: number;
      };
    };
    return w.__habitatCameraPos ? w.__habitatCameraPos() : null;
  });
}

async function gotoHabitat(
  page: import("playwright/test").Page,
): Promise<void> {
  await page.goto("/habitat");
  await page
    .waitForLoadState("networkidle", { timeout: 30_000 })
    .catch(() => {});
  // Phase 13.1-02 gesture gate: the Three.js canvas no longer mounts on
  // page load — it waits for a real user input event. Synthesize one so the
  // existing R4/R5/R6 acceptance assertions still find the canvas. This is
  // a TEST-ONLY shim; the component itself remains gesture-gated.
  await page.evaluate(() => {
    document.dispatchEvent(new PointerEvent("pointerdown"));
  });
  // Wait for the 3D canvas to mark itself ready.
  await page.waitForSelector(READY_SELECTOR, { timeout: 30_000 });
}

test.describe("Habitat 3D — R4 / R5 / R6 acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("R4: drag orbits the camera; scroll wheel + right-click do NOTHING", async ({
    page,
  }) => {
    await gotoHabitat(page);

    const pre = await readCameraPos(page);
    expect(pre).not.toBeNull();
    const startTheta = pre?.theta ?? 0;

    // --- drag horizontally → orbit MUST change theta ---
    const canvas = page.locator(CANVAS_SELECTOR);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const postDrag = await readCameraPos(page);
    expect(postDrag).not.toBeNull();
    expect(Math.abs((postDrag?.theta ?? 0) - startTheta)).toBeGreaterThan(0.05);

    // Snapshot AFTER drag — wait past the idle window (1200ms) so the
    // camera is stable for the no-zoom / no-pan assertions. We use
    // setTheta to lock theta to a known value so any subsequent drift is
    // attributable to the user input we are about to fire.
    await page.evaluate(() => {
      const w = window as unknown as {
        __habitatSetTheta?: (n: number) => void;
      };
      w.__habitatSetTheta?.(1.0);
    });
    await page.waitForTimeout(50);
    const baseline = await readCameraPos(page);

    // --- wheel deltaY=120 should NOT change camera DISTANCE (no zoom) ---
    // Auto-orbit can still rotate the camera between snapshots, so we
    // compare the camera's distance from the look-at target (= radius)
    // rather than per-axis position. Zoom would change the radius;
    // azimuth-only orbit cannot.
    const distOf = (p: { x: number; y: number; z: number }) =>
      Math.hypot(p.x, p.y - 1, p.z); // lookY = 1 (matches scene-host default)
    const distBaseline = distOf(baseline ?? { x: 0, y: 0, z: 0 });
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(150);
    const afterWheel = await readCameraPos(page);
    const distAfterWheel = distOf(afterWheel ?? { x: 0, y: 0, z: 0 });
    expect(distAfterWheel).toBeCloseTo(distBaseline, 2);

    // --- right-click drag should NOT pan ---
    await page.evaluate(() => {
      const w = window as unknown as {
        __habitatSetTheta?: (n: number) => void;
      };
      w.__habitatSetTheta?.(1.0);
    });
    await page.waitForTimeout(50);
    const baseline2 = await readCameraPos(page);
    const distBaseline2 = distOf(baseline2 ?? { x: 0, y: 0, z: 0 });
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 200, cy + 100, { steps: 10 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(150);
    const afterRight = await readCameraPos(page);
    // Right-click is not bound. Auto-orbit may still rotate the camera
    // between snapshots, so we compare radius (= no pan) and Y (= no
    // vertical pan) — both invariant under azimuth-only orbit.
    const distAfterRight = distOf(afterRight ?? { x: 0, y: 0, z: 0 });
    expect(distAfterRight).toBeCloseTo(distBaseline2, 2);
    expect(afterRight?.y).toBeCloseTo(baseline2?.y ?? 0, 2);
  });

  test("R5: ArrowRight advances theta; ArrowLeft retreats", async ({
    page,
  }) => {
    await gotoHabitat(page);

    // Focus the wrapper div (the focus ring lives on it; the canvas itself
    // is not the focus target). The wrapper is the parent of the canvas.
    await page.locator(CANVAS_SELECTOR).evaluate((c) => {
      const wrapper = c.parentElement as HTMLDivElement | null;
      wrapper?.focus();
    });

    // Lock theta to a known value so the assertions are deterministic
    // (auto-orbit and any prior drag are discarded).
    await page.evaluate(() => {
      const w = window as unknown as {
        __habitatSetTheta?: (n: number) => void;
      };
      w.__habitatSetTheta?.(0.5);
    });
    await page.waitForTimeout(50);
    const before = await readCameraPos(page);
    const t0 = before?.theta ?? 0;

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
    const after1 = await readCameraPos(page);
    expect((after1?.theta ?? 0) - t0).toBeGreaterThan(0);

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(50);
    const after2 = await readCameraPos(page);
    expect((after2?.theta ?? 0) - (after1?.theta ?? 0)).toBeLessThan(0);
  });
});

test.describe("Habitat 3D — R6 prefers-reduced-motion (13.1 SPEC R4 hard lockout)", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("R6: reduced-motion never mounts the 3D canvas; poster IS the experience", async ({
    page,
  }) => {
    // Phase 13.1 SPEC R4 (supersedes Phase 13 R6): prefers-reduced-motion
    // users get the static poster only, regardless of form factor. The
    // canvas must NEVER mount — even after a synthesized gesture.
    await signUpWithDeck(page, "French");
    await page.goto("/habitat");
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});

    // Poster IS the LCP candidate — assert its presence.
    await page.waitForSelector('img[alt^="Tiger habitat level"]', {
      timeout: 10_000,
    });

    // Dispatch every gate event the gesture gate listens for. None of them
    // should mount the canvas under reduced-motion.
    await page.evaluate(() => {
      document.dispatchEvent(new PointerEvent("pointerdown"));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      document.dispatchEvent(new WheelEvent("wheel"));
      window.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(2_000);

    // Canvas element must NOT exist; the poster must remain visible at
    // full opacity (style sets opacity:1 when canvasMounted is false).
    const canvasCount = await page.locator(CANVAS_SELECTOR).count();
    expect(canvasCount).toBe(0);
    const dev = await readCameraPos(page);
    expect(dev).toBeNull(); // dev affordances are attached only by mountHabitatScene
  });
});
