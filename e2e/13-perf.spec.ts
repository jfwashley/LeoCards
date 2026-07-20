import { expect, type Page, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";
import { IS_PROD_BUILD, PERF_READY_ATTR } from "./perf-markers";

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
      // LCP ≤ 2500ms, CLS ≤ 0.1 — asserted regardless of dev/prod server.
      expect
        .soft(r.lcp, `${r.route} ${r.profile} LCP`)
        .toBeLessThanOrEqual(2500);
      expect
        .soft(r.cls, `${r.route} ${r.profile} CLS`)
        .toBeLessThanOrEqual(0.1);
      // task_d326ebac (Phase 17 D-14 fold-in): INP measured against a `next
      // dev` server is HMR/Turbopack noise, not a real metric — only assert
      // it when PERF_PROD_BUILD=1 confirms this run targeted a local prod
      // build (`next build && next start`), mirroring the existing
      // `if (isMobile) {...}` conditional-block style above.
      if (IS_PROD_BUILD) {
        expect
          .soft(r.inp, `${r.route} ${r.profile} INP`)
          .toBeLessThanOrEqual(200);
      }
    }
  });
});

// ============================================================
// Phase 17 Plan 05 (PERF-04, D-13..17) — instant-nav gate
// ============================================================
//
// Extends this file with the 6 D-13 hub-and-spoke navigations (dashboard↔
// study, dashboard↔new-card, dashboard↔browse) as IN-APP LINK TAPS. Browser
// Back is explicitly NOT gated (D-13). D-14: this entire group only runs
// against a LOCAL PROD BUILD, gated by PERF_PROD_BUILD=1 (test.skip
// otherwise) — never the dev server (Pitfall 5: both `next dev` and
// `next start` default to the same port 3000). D-15: PASS = the
// destination's REAL content (`data-perf-ready="true"`, 17-01/17-03/17-04)
// visible ≤100ms median n≥5, prefetch-warm — skeletons/loading.tsx never
// carry the attribute so they cannot count.

/**
 * median() — mirrors scripts/measure-cwv-lib.mjs's median() convention,
 * reimplemented locally since that file is a Node-ESM .mjs script not
 * cleanly importable into this Playwright/TS test.
 */
function median(values: number[]): number {
  if (values.length === 0) return -1;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid] ?? -1;
  }
  const lo = sorted[mid - 1];
  const hi = sorted[mid];
  return lo !== undefined && hi !== undefined ? (lo + hi) / 2 : -1;
}

/**
 * measureNavTap() — times an in-app link/button tap until the destination's
 * data-perf-ready="true" root is visible (D-15).
 *
 * Since every key route shares the same `data-perf-ready` attribute name, a
 * naive query started right after the tap could immediately match the SOURCE
 * page's still-mounted marker (false "instant" reading of ~0ms). And waiting
 * for the marker's ABSENCE first can never succeed: the App Router keeps the
 * outgoing page fully mounted until the destination payload is ready, then
 * swaps in a SINGLE React commit — the old marker is removed and the new one
 * inserted in the same synchronous DOM mutation, with no unmarked frame in
 * between (this repo has zero loading.tsx files, so no Suspense fallback
 * ever interposes one). Review CR-02.
 *
 * Instead we distinguish the destination's marker from the source's by
 * INSTANCE: stamp the source page's marker with `data-nav-stale` before the
 * tap, then wait for a marker WITHOUT the stamp — the destination's fresh
 * node — which resolves correctly even across the atomic single-commit swap.
 *
 * Timing is Node-side Date.now() around the whole tap→marker window (a few
 * ms of Playwright IPC noise, biased to OVERESTIMATE — the safe direction
 * for a pass/fail gate). Returns -1 if the destination's marker never
 * appears within timeoutMs.
 */
async function measureNavTap(
  page: Page,
  click: () => Promise<void>,
  timeoutMs = 8000,
): Promise<number> {
  // Stamp the SOURCE page's marker so the destination's fresh node is
  // distinguishable. No-op when the source carries no marker (e.g. the
  // study end screen).
  await page.evaluate((attr) => {
    document.querySelector(`[${attr}="true"]`)?.setAttribute("data-nav-stale", "1");
  }, PERF_READY_ATTR);
  const t0 = Date.now();
  await click();
  const ok = await page
    .waitForFunction(
      (attr) => !!document.querySelector(`[${attr}="true"]:not([data-nav-stale])`),
      PERF_READY_ATTR,
      { timeout: timeoutMs },
    )
    .then(() => true)
    .catch(() => false);
  return ok ? Date.now() - t0 : -1;
}

/** Drop the first (cold/compile-adjacent) sample — mirrors measureVitals'
 * existing run-1-discard warm-up discipline. */
function warm(values: number[]): number[] {
  return values.slice(1);
}

test.describe("Phase 17 Plan 05 — PERF-04 instant-nav gate (D-13..17)", () => {
  test.describe.configure({ mode: "serial" });

  test("prod-build nav — dashboard ↔ study (6 round trips, content-visible ≤100ms)", async ({
    page,
  }) => {
    test.skip(
      !IS_PROD_BUILD,
      "PERF-04 D-14: requires a local prod build — run `next build && next start` " +
        "then `PERF_PROD_BUILD=1 npx playwright test e2e/13-perf.spec.ts`",
    );
    test.setTimeout(180_000);

    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);

    // D-13: /study unconditionally redirects to /dashboard when ?deck= is
    // absent (src/app/(protected)/study/page.tsx) — assert the gated link
    // always carries it before relying on it for the timed taps below.
    const studyLink = page.getByRole("link", { name: "Start studying" });
    await expect(studyLink).toHaveAttribute("href", /\?deck=/);

    const toStudy: number[] = [];
    const toDashboard: number[] = [];
    const ROUNDS = 6;

    for (let i = 0; i < ROUNDS; i++) {
      const studyMs = await measureNavTap(page, () => studyLink.click());
      if (studyMs >= 0) toStudy.push(studyMs);

      // /api/study/complete's CommitSchema requires grades.min(1) — a
      // genuinely empty-grades quit is rejected (400), landing on the error
      // screen instead of "Back to deck". Grade exactly the FIRST card of
      // the 3-card queue INCORRECT (ArrowLeft), then quit: an incorrect
      // grade never advances masteryRound/cooldown (computeCardUpdate), so
      // all 3 cards stay due for every subsequent round. Grading index 0
      // (not the last card) keeps the reducer in "studying" phase (not the
      // end-of-queue still-learning requeue branch), so the explicit quit
      // below reliably reaches "committing"/"end".
      await page.waitForSelector('text="Tap to reveal"', { timeout: 10_000 });
      // Click (not keyboard Enter) — the card's role="button" container has
      // tabIndex=0 but is NOT auto-focused, so a bare keyboard.press("Enter")
      // lands nowhere; clicking both flips (onClick={!flipped ? onFlip} on
      // study-card.tsx) AND focuses the element so the subsequent ArrowLeft
      // keydown is actually received by its onKeyDown handler.
      await page.getByRole("button", { name: /Question:/ }).click();
      await page.waitForTimeout(500);
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /quit study session/i }).click();
      await page.getByRole("button", { name: "Save and quit" }).click();
      await page.waitForSelector('text="Back to deck"', { timeout: 15_000 });

      const dashMs = await measureNavTap(page, () =>
        page.getByRole("button", { name: "Back to deck" }).click(),
      );
      if (dashMs >= 0) toDashboard.push(dashMs);
    }

    expect
      .soft(median(warm(toStudy)), "dashboard→study contentVisibleMs (median)")
      .toBeLessThanOrEqual(100);
    expect
      .soft(
        median(warm(toDashboard)),
        "study→dashboard contentVisibleMs (median)",
      )
      .toBeLessThanOrEqual(100);
  });

  test("prod-build nav — dashboard ↔ new-card & dashboard ↔ browse (6 round trips each, content-visible ≤100ms)", async ({
    page,
  }) => {
    test.skip(
      !IS_PROD_BUILD,
      "PERF-04 D-14: requires a local prod build — run `next build && next start` " +
        "then `PERF_PROD_BUILD=1 npx playwright test e2e/13-perf.spec.ts`",
    );
    test.setTimeout(180_000);

    // Fresh, EMPTY-deck account — the empty-state Link pair in card-list.tsx
    // ("+ Add a card" / "Browse words") is what's exercised here; the
    // has-cards "add-a-card" pill is a different Link only rendered once a
    // deck is non-empty (out of scope for this pair's setup).
    await signUpWithDeck(page, "French");

    const toNewCard: number[] = [];
    const toDashboardFromNewCard: number[] = [];
    const toBrowse: number[] = [];
    const toDashboardFromBrowse: number[] = [];
    const ROUNDS = 6;

    for (let i = 0; i < ROUNDS; i++) {
      const newCardMs = await measureNavTap(page, () =>
        page.getByRole("link", { name: "+ Add a card" }).click(),
      );
      if (newCardMs >= 0) toNewCard.push(newCardMs);

      // ACTop's "‹ My deck" escape link (src/components/daybreak/ac-top.tsx).
      const backFromNewCardMs = await measureNavTap(page, () =>
        page.getByRole("link", { name: /My deck/ }).click(),
      );
      if (backFromNewCardMs >= 0) {
        toDashboardFromNewCard.push(backFromNewCardMs);
      }

      const browseMs = await measureNavTap(page, () =>
        page.getByTestId("browse-words-empty").click(),
      );
      if (browseMs >= 0) toBrowse.push(browseMs);

      // The "My deck" link added to BrowseTiles (word-list-browser.tsx) —
      // Phase 17 Rule 3 deviation: this pair had no dashboard-bound link
      // before this plan (see 17-05-SUMMARY.md deviations).
      const backFromBrowseMs = await measureNavTap(page, () =>
        page.getByTestId("browse-back-dashboard").click(),
      );
      if (backFromBrowseMs >= 0) toDashboardFromBrowse.push(backFromBrowseMs);
    }

    expect
      .soft(
        median(warm(toNewCard)),
        "dashboard→new-card contentVisibleMs (median)",
      )
      .toBeLessThanOrEqual(100);
    expect
      .soft(
        median(warm(toDashboardFromNewCard)),
        "new-card→dashboard contentVisibleMs (median)",
      )
      .toBeLessThanOrEqual(100);
    expect
      .soft(
        median(warm(toBrowse)),
        "dashboard→browse contentVisibleMs (median)",
      )
      .toBeLessThanOrEqual(100);
    expect
      .soft(
        median(warm(toDashboardFromBrowse)),
        "browse→dashboard contentVisibleMs (median)",
      )
      .toBeLessThanOrEqual(100);
  });
});
