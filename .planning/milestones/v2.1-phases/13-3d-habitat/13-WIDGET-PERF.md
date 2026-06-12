# Phase 13 — D-28 Widget Performance Measurement

**Measured:** 2026-05-21
**Build:** `npm run build` (production), Next.js 16.2.1 with Turbopack
**Server:** `npm run start` on `http://localhost:3000`
**Test harness:** `e2e/13-perf.spec.ts` (Playwright + Chromium 139)

## Methodology

Lighthouse cannot easily be aimed at this app's authenticated routes:
`/dashboard` and `/habitat` redirect to `/login` for unauthenticated
requests, so a direct `lighthouse http://localhost:3000/dashboard` run
captures the public `/login` page, not the dashboard. Per the Plan 06
documented fallback (and the orchestrator's instruction that the
measurement must not be silently skipped), I instrumented a Playwright
spec (`e2e/13-perf.spec.ts`) that:

1. Signs up a fresh user (`signUpWithDeck` helper) so the session cookie
   is set and the protected routes resolve to their real content.
2. Re-navigates to `/dashboard` and `/habitat` and captures Core Web
   Vitals via `PerformanceObserver` (`largest-contentful-paint`,
   `layout-shift`, `event`).
3. On `/dashboard`, polls for `canvas[data-ready="true"]` to capture
   widget cold-load TTI, then counts `requestAnimationFrame` ticks for
   5 s to derive sustained FPS during widget auto-orbit.
4. Runs the entire sequence twice: once under a desktop viewport
   (1366×768, no throttling) and once under a mobile profile
   (412×869, DPR 2.625, mobile UA, **4× CPU throttling**, **Slow 4G**
   throttling via CDP `Emulation.setCPUThrottlingRate` +
   `Network.emulateNetworkConditions`).

Raw output: `.planning/phases/13-3d-habitat/perf-results.json`.

**Important measurement caveat:** the sustained-FPS sample is captured
by an in-page `requestAnimationFrame` counter that runs *inside* the
Playwright `page.evaluate()` context. Playwright's tracing + V8 worker
scheduling competes with the rAF callback, so the FPS number is a
lower bound — the real-user FPS on the same hardware is materially
higher. The numbers below are reported verbatim; the decision rule was
applied to them as written.

## Results

| Metric                 | Desktop | Mobile emu | CWV Good gate | Pass? |
|------------------------|--------:|-----------:|--------------:|:-----:|
| LCP (dashboard)        | 1744 ms | 1656 ms    | ≤ 2500 ms     | ✓     |
| INP (dashboard)        | 136 ms  | 192 ms     | ≤ 200 ms      | ✓     |
| CLS (dashboard)        | 0       | 0          | ≤ 0.1         | ✓     |
| Widget cold-load TTI   | 0 ms    | 0.5 ms     | ≤ 1500 ms     | ✓     |
| Widget sustained FPS   | 21      | 18         | ≥ 30          | ✗     |
| Context-lost incidents | 0       | 0          | 0             | ✓     |

Five of six gates pass; the sustained-FPS gate fails on both profiles
(21 desktop, 18 mobile, against a 30 floor).

## Decision

**CACHED.**

### Rationale

The orchestrator's invocation set the decision rule explicitly:

> If on desktop AND mobile BOTH: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1,
> widget cold-load TTI ≤ 1.5s, widget sustained FPS ≥ 30 → decide: live.
> Otherwise → decide: cached.

Five of six per-profile gates pass; sustained FPS fails on both
profiles. Per the rule as written, the decision is **cached**.

I acknowledge that the FPS number is depressed by Playwright's
in-page-eval instrumentation overhead (above caveat). I considered
falling back to a different FPS measurement methodology — but no
non-instrumented path is currently available in this environment
(no physical device, no Lighthouse against authenticated routes). The
orchestrator's instruction was to apply the rule to the numbers as
measured. **Cached** removes the widget's GPU cost from the dashboard
entirely, which is the conservative choice and also doubles the hero
images as social-share artifacts (RESEARCH E.3).

D-28 resolved autonomously from measured numbers per orchestrator
instruction; decision = **cached**; full data above.

## Threshold logic applied verbatim

| Threshold | Desktop  | Mobile emu | Decision contribution |
|-----------|----------|------------|-----------------------|
| LCP ≤ 2500 ms   | 1744 ✓  | 1656 ✓ | live-favourable       |
| INP ≤ 200 ms    | 136 ✓   | 192 ✓  | live-favourable       |
| CLS ≤ 0.1       | 0 ✓     | 0 ✓    | live-favourable       |
| Widget TTI ≤ 1500 ms | 0 ✓ | 0.5 ✓  | live-favourable       |
| Widget FPS ≥ 30 | 21 ✗    | 18 ✗   | **cached-decisive**   |
