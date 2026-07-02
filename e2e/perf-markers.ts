import type { Page } from "playwright/test";

/**
 * Phase 17 (D-15) — the content-visible marker convention.
 *
 * Each key route exposes ONE data attribute on its real-content root that
 * appears only when real (non-skeleton) data is painted:
 *
 *   data-perf-ready="true"
 *
 * PERF-04's instant-nav gate (Wave 5) polls for [data-perf-ready="true"] as
 * the D-15 "real content visible" signal — skeletons/loading.tsx NEVER
 * carry this attribute, so a route that is still showing a DaybreakShimmer
 * fallback will not (incorrectly) count as "ready".
 *
 * This module only scaffolds the constant + poll helper. Wave 3/Wave 4 add
 * `data-perf-ready="true"` to each key route's real-content root — no route
 * is instrumented yet by this plan.
 */
export const PERF_READY_ATTR = "data-perf-ready";

/**
 * Poll a page until an element carrying `[data-perf-ready="true"]` appears
 * in the DOM, or the timeout elapses. Adapts the existing poll-until-marker
 * idiom from e2e/13-perf.spec.ts (lines 142-151, the widget cold-load-TTI
 * loop) to the generic per-route content-visible marker instead of a
 * canvas `data-ready` attribute.
 *
 * @param page - the Playwright page to poll.
 * @param timeoutMs - maximum time to wait before giving up (default 8000,
 *   matching the existing widget-TTI poll's deadline).
 * @returns the elapsed time in ms until the marker appeared, or -1 if the
 *   timeout elapsed without the marker appearing (mirrors the existing
 *   widget-TTI loop's -1 sentinel).
 */
export async function waitForPerfReady(
  page: Page,
  timeoutMs = 8000,
): Promise<number> {
  return page.evaluate(
    async (args) => {
      const { attr, deadlineMs } = args;
      const t0 = performance.now();
      let readyMs = -1;
      const deadline = t0 + deadlineMs;
      while (performance.now() < deadline) {
        const el = document.querySelector(`[${attr}="true"]`);
        if (el) {
          readyMs = performance.now() - t0;
          break;
        }
        await new Promise((r) => setTimeout(r, 16));
      }
      return readyMs;
    },
    { attr: PERF_READY_ATTR, deadlineMs: timeoutMs },
  );
}

/**
 * Phase 17 (D-14 + task_d326ebac) — the prod-build detection signal.
 *
 * `playwright.config.ts` has `baseURL: "http://localhost:3000"` and
 * `webServer: undefined` — the SAME port a `next start` prod build would
 * also use by default (Pitfall 5). Nothing in the current config
 * distinguishes a `next dev` server from a `next start` prod build at the
 * Playwright layer, so an explicit env signal is required: PERF_PROD_BUILD
 * must be set to "1" by whatever wrapper script runs `next build && next
 * start` before invoking the prod-only assertions.
 *
 * Wave 4 wraps the D-14 nav gate + the task_d326ebac INP assertion in this
 * flag so they only run against a confirmed prod build, never a dev
 * server.
 */
export const IS_PROD_BUILD = process.env.PERF_PROD_BUILD === "1";
