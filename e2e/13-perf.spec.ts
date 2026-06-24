import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

/**
 * Phase 13 Plan 06 — Core Web Vitals + widget perf measurement.
 *
 * Lighthouse cannot trivially measure authenticated routes in this environment
 * (the production server lives behind a /login redirect; running Lighthouse
 * directly against /dashboard captures the public /login page, not the dashboard).
 * Per Plan 06's documented fallback, we instrument with `performance.mark` +
 * PerformanceObserver and run under Chromium via Playwright with both desktop
 * and mobile emulation profiles, which is the orchestrator-sanctioned substitute
 * when headless Lighthouse cannot run against the authenticated routes.
 *
 * Captures per (route × profile):
 *   - LCP (largest-contentful-paint)
 *   - CLS (cumulative layout shift)
 *   - INP / FID approximation (first-input + scheduled interaction)
 *   - Widget cold-load TTI (first frame data-ready=true)
 *   - Sustained FPS during 5s of auto-orbit
 *
 * Writes the consolidated CWV table to `.planning/phases/13-3d-habitat/13-PERF.md`
 * and the widget-specific D-28 table to `13-WIDGET-PERF.md`.
 */

interface VitalsResult {
  route: string;
  profile: "desktop" | "mobile";
  lcp: number; // ms
  cls: number;
  inp: number; // ms (worst-interaction)
  widgetColdLoadTti?: number; // /dashboard only
  widgetSustainedFps?: number; // /dashboard only
}

async function measureVitals(
  page: import("playwright/test").Page,
  route: string,
  profile: "desktop" | "mobile",
): Promise<VitalsResult> {
  await page.goto(route, { waitUntil: "domcontentloaded" });

  // Wait for the page to stabilize so LCP can settle.
  await page
    .waitForLoadState("networkidle", { timeout: 45_000 })
    .catch(() => {});

  // For habitat, wait for the canvas to be data-ready so LCP candidate is realised.
  if (route === "/habitat") {
    await page
      .waitForSelector('canvas[data-ready="true"]', { timeout: 30_000 })
      .catch(() => {});
  }
  // Extra dwell so PerformanceObserver entries flush.
  await page.waitForTimeout(1500);

  // Simulate one interaction so INP has a sample.
  // For /dashboard we click the habitat widget (link); for /habitat we click
  // the canvas (no-op, but produces an input frame).
  try {
    if (route === "/dashboard") {
      // Tab to first interactive element instead of navigating away.
      await page.keyboard.press("Tab");
      await page.waitForTimeout(50);
      await page.keyboard.press("Tab");
    } else {
      await page.locator("body").click({ position: { x: 5, y: 5 } });
    }
  } catch {
    // ignore
  }

  // Give 2s for the interaction to settle.
  await page.waitForTimeout(2000);

  const vitals = await page.evaluate(async () => {
    return await new Promise<{ lcp: number; cls: number; inp: number }>(
      (resolve) => {
        let lcp = 0;
        let cls = 0;
        let inp = 0;

        // LCP
        try {
          const lcpObs = new PerformanceObserver((entries) => {
            for (const e of entries.getEntries()) {
              // @ts-expect-error renderTime/loadTime on LCP entry
              const t = (e.renderTime || e.loadTime || e.startTime) as number;
              if (t > lcp) lcp = t;
            }
          });
          lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
        } catch {}

        // CLS
        try {
          const clsObs = new PerformanceObserver((entries) => {
            for (const e of entries.getEntries()) {
              // @ts-expect-error layout-shift entry
              if (!e.hadRecentInput) cls += (e.value as number) ?? 0;
            }
          });
          clsObs.observe({ type: "layout-shift", buffered: true });
        } catch {}

        // INP via event timing
        try {
          const inpObs = new PerformanceObserver((entries) => {
            for (const e of entries.getEntries()) {
              const d = (e as PerformanceEventTiming).duration ?? 0;
              if (d > inp) inp = d;
            }
          });
          inpObs.observe({
            type: "event",
            buffered: true,
            durationThreshold: 16,
          } as PerformanceObserverInit & { durationThreshold: number });
        } catch {}

        // Collect for 1.5s.
        setTimeout(() => resolve({ lcp, cls, inp }), 1500);
      },
    );
  });

  const result: VitalsResult = {
    route,
    profile,
    lcp: Math.round(vitals.lcp),
    cls: Math.round(vitals.cls * 1000) / 1000,
    inp: Math.round(vitals.inp),
  };

  // Dashboard-only widget perf
  if (route === "/dashboard") {
    const widget = await page.evaluate(async () => {
      const t0 = performance.now();
      // Wait up to 8s for widget canvas data-ready=true
      let ttiMs = -1;
      const deadline = t0 + 8000;
      while (performance.now() < deadline) {
        const cv = document.querySelector(
          'canvas[data-ready="true"]',
        ) as HTMLCanvasElement | null;
        if (cv) {
          ttiMs = performance.now() - t0;
          break;
        }
        await new Promise((r) => setTimeout(r, 16));
      }

      // Sustained FPS over 5s
      let frames = 0;
      const fpsStart = performance.now();
      const fpsDeadline = fpsStart + 5000;
      await new Promise<void>((resolve) => {
        function tick() {
          frames += 1;
          if (performance.now() < fpsDeadline) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(tick);
      });
      const fpsElapsed = (performance.now() - fpsStart) / 1000;
      const fps = frames / fpsElapsed;

      return { ttiMs, fps };
    });
    result.widgetColdLoadTti = widget.ttiMs;
    result.widgetSustainedFps = Math.round(widget.fps);
  }

  return result;
}

test.describe.configure({ mode: "serial" });

test.describe("Phase 13 Plan 06 — CWV + widget perf", () => {
  const results: VitalsResult[] = [];

  for (const profile of ["desktop", "mobile"] as const) {
    const viewport =
      profile === "desktop"
        ? { width: 1366, height: 768 }
        : { width: 412, height: 869 };
    const deviceScaleFactor = profile === "desktop" ? 1 : 2.625;
    const userAgent =
      profile === "mobile"
        ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
        : undefined;
    const isMobile = profile === "mobile";

    test(`${profile} — /dashboard + /habitat`, async ({ browser }) => {
      test.setTimeout(180_000);
      const ctx = await browser.newContext({
        viewport,
        deviceScaleFactor,
        userAgent,
        isMobile,
        hasTouch: isMobile,
      });
      const page = await ctx.newPage();

      // Sign up without throttling (slowing down auth/db is not the perf surface
      // being measured).
      await signUpWithDeck(page, "French");

      // Apply CPU + network throttling only for the measurement passes on mobile
      // emulation profile.
      const cdp = await ctx.newCDPSession(page);
      if (isMobile) {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await cdp.send("Network.enable");
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 150,
          downloadThroughput: (1.6 * 1024 * 1024) / 8,
          uploadThroughput: (750 * 1024) / 8,
        });
      }

      const dash = await measureVitals(page, "/dashboard", profile);
      results.push(dash);

      const habitat = await measureVitals(page, "/habitat", profile);
      results.push(habitat);

      await ctx.close();
    });
  }

  test.afterAll(async () => {
    // Write outputs.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const out = path.join(
      ".planning",
      "phases",
      "13-3d-habitat",
      "perf-results.json",
    );
    try {
      await fs.writeFile(out, JSON.stringify(results, null, 2), "utf8");
    } catch (err) {
      // Diagnostic artifact only: the 13-3d-habitat dir was archived with v2.1,
      // so this write may ENOENT. Never fail the perf suite on the side-effect —
      // the CWV thresholds are asserted in the separate test() below.
      console.warn(`[13-perf] perf-results.json write skipped: ${err}`);
    }
  });

  // Assert all CWV pass — Plan 06 hard gate.
  test("CWV thresholds", () => {
    for (const r of results) {
      // LCP ≤ 2500ms, CLS ≤ 0.1, INP ≤ 200ms.
      expect
        .soft(r.lcp, `${r.route} ${r.profile} LCP`)
        .toBeLessThanOrEqual(2500);
      expect
        .soft(r.cls, `${r.route} ${r.profile} CLS`)
        .toBeLessThanOrEqual(0.1);
      expect
        .soft(r.inp, `${r.route} ${r.profile} INP`)
        .toBeLessThanOrEqual(200);
    }
  });
});
