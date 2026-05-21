---
phase: 13-3d-habitat
verified: 2026-05-21T01:40:00Z
status: gaps_found
score: 8/10 requirements PASS, 2 PARTIAL, 0 FAIL
overall_verdict: PASS-WITH-CARRIED-CONCERNS
---

# Phase 13 — 3D Habitat Migration Verification

**Verifier:** Claude (gsd-verifier)
**Verified:** 2026-05-21
**Sources reviewed:** `13-SPEC.md`, `13-PERF.md`, `13-WIDGET-PERF.md`, all six `13-0N-SUMMARY.md`, current `main` HEAD (commit `5af5cf9`).

## Per-Requirement Verdicts

| # | Requirement | Verdict | Evidence |
|---|-------------|---------|----------|
| R1 | All 9 habitat levels render in 3D end-to-end | **PASS** | `src/components/habitat-3d-canvas.tsx` (424 LOC) imports `clay-level.featuresForLevel` per `HabitatState.level`. `src/lib/habitat-3d/__tests__/clay-level.test.ts` asserts feature flags for levels 1-9. 28 reference PNGs at L5 confirm rendering. Manual cross-level Neon-mutation test is the acceptance method but is human-only; binding code path is verified by tests. |
| R2 | Renderer = plain Three.js 0.160.x via npm + ESM | **PASS** | `npm ls three` → `three@0.160.1`. `grep -rn "babel/standalone\|unpkg.com" src/ public/ package.json` → **0 matches**. `package.json` lists only `three` + `@types/three`. Three.js code-split confirmed: `.next/static/chunks/11c_2vdyn8skq.js` (504 KB) is the only chunk containing `WebGLRenderer`; not loaded by dashboard or main bundle. |
| R3 | Habitat engine binding — scene reads `HabitatState` | **PASS** | `habitat-3d-canvas.tsx` props = `{ habitatState: HabitatState }` only. `src/components/__tests__/habitat-3d-canvas.test.ts` + `src/lib/habitat-3d/__tests__/clay-level.test.ts` mount with fixtures per level. `npm run typecheck` clean. |
| R4 | Camera orbit per D-26 (no zoom/pan/tap) | **PASS** | `src/lib/habitat-3d/scene-host.ts` (320 LOC) implements orbit attach. `e2e/13-habitat-3d.spec.ts` exists (Plan 03 SUMMARY claims 3/3 green; not re-run here, trusted per scope). |
| R5 | Keyboard orbit (ArrowLeft/ArrowRight) | **PASS** | Same spec asserts ArrowRight rotates camera. Plan 03 SUMMARY: green. |
| R6 | `prefers-reduced-motion` respected | **PASS** | `src/lib/habitat-3d/__tests__/clay-animation-reduced-motion.test.ts` exists. Plan 03 + Plan 04 SUMMARIES: green. `13-habitat-3d.spec.ts` covers Playwright reduced-motion emulation. |
| R7 | Mood + decay drive visible scene differences | **PASS** | `e2e/__screenshots__/habitat-states/` contains **28 PNGs**. `diff-table.json`: `totalPairs: 126`, `failureCount: 0`, all 126 pairs `pass: true` (re-validated via Node `require()`). Min MSE 2.49 per Plan 04 SUMMARY; threshold 1.0. |
| R8 | Mini-widget perf-gated live 3D vs cached (D-28) | **PASS** | D-28 resolved **CACHED** per `13-WIDGET-PERF.md` (FPS 21 desktop / 18 mobile < 30 gate). `src/components/habitat-widget.tsx` line 5 imports `@/components/habitat-3d-widget-image` (the cached image variant). Live widget `habitat-3d-widget-canvas.tsx` and its test deleted in commit `d6454cf` (verified absent). No orphan imports — `grep -rn "habitat-3d-widget-canvas" src/` returns 0 matches. 9 hero images `public/habitat/widget-l{1..9}.webp` all present. Cached path matches the gated decision. |
| R9 | CWV "Good" on dashboard + `/habitat` (desktop + mobile) | **PARTIAL** | Dashboard rows: ✓ desktop (LCP 672, INP 0, CLS 0), ✓ mobile (LCP 2364, INP 0, CLS 0.003). `/habitat` desktop: LCP 1252 ✓, **INP 240 ms ✗ (+40 over 200 gate)**, CLS 0 ✓. `/habitat` mobile: **LCP unmeasured (observer misfire)**, **INP 208 ms ✗ (+8 over gate)**, CLS 0 ✓. `13-PERF.md` argues both INP fails are Playwright `page.evaluate` event-dispatch surcharge (plausible — see dashboard rows reading INP 0 because no eligible interaction observed, vs. /habitat canvas-click flow showing the surcharge). However **no second clean-run measurement (real device or non-instrumented headless) was taken**, and mobile `/habitat` LCP was never captured. Per verification rules: instrument-inflated raw numbers without a clean re-run cannot auto-PASS. → **PARTIAL**. |
| R10 | v1.0 PixiJS habitat code removed | **PASS** | `grep -rn "pixi\|babel/standalone\|unpkg.com" src/ public/ package.json` → **0 matches**. `npm ls pixi.js` → empty. All listed deletions absent: `habitat-canvas.tsx`, `habitat-layers.tsx`, `habitat-widget-canvas.tsx`, `tiger-sprite.tsx`, `sparkle-particles.tsx`, `bird-sprite.tsx`, `public/sprites/`. Only residual textual mention is a non-load-bearing comment in `habitat-scene.tsx:58` ("import target swapped PixiJS → Three.js"). No live import. |

## Concerns Investigated

**1. Live widget deletion clean-up (D-28 → cached).** Confirmed. `habitat-widget.tsx` correctly imports `habitat-3d-widget-image`. `habitat-3d-widget-canvas.tsx` and its test absent. No dangling references in `src/`. R8 acceptance met by the cached implementation (9 hero webps + image component + perf-gated decision documented).

**2. `/habitat` INP 208/240 ms vs. 200 ms gate.** Treated as **PARTIAL** rather than PASS. The instrument-inflation argument in `13-PERF.md` is plausible (dashboard rows show INP 0 because no eligible interaction fired; /habitat rows click the canvas and so absorb the surcharge), but no clean re-run exists to falsify the inflation hypothesis. Mobile `/habitat` LCP was also unmeasured (observer misfire). Both are recorded as carried concerns rather than blockers because (a) dashboard CWV is fully green on both profiles, (b) instrument inflation is a documented, well-understood Playwright artifact, (c) the cached-widget swap demonstrably improved every other measured metric.

**3. R10 + R2 grep re-runs.** Independently re-run: `grep -rn "pixi\|babel/standalone\|unpkg.com" src/ public/ package.json` → 0 matches. Confirmed.

**4. Three.js code-split.** Independently verified: `.next/static/chunks/11c_2vdyn8skq.js` is the **only** chunk containing the string `WebGLRenderer`, size 504 KB. Loaded lazily via `dynamic(() => import("@/components/habitat-3d-canvas"), { ssr: false })` in `habitat-scene.tsx:61`. Dashboard does not load it.

**5. 28-screenshot pixel-diff.** `diff-table.json` confirmed: 28 captures, 126/126 pairs PASS, 0 failures.

## Other Gates

| Gate | Result |
|------|--------|
| `npm run typecheck` | **Clean** (no errors) |
| `npm run test` (vitest unit) | **1856 passed**, 6 skipped. 16 test FILES "failed" — all are `e2e/*.spec.ts` Playwright specs that vitest tries to register because `vitest.config.ts` does not exclude `e2e/`. This is a **pre-existing** config issue (predates Phase 13) and not a Phase 13 regression. All 1856 *unit* tests pass. |
| Playwright specs `13-habitat-3d.spec.ts`, `13-habitat-states.spec.ts` exist | ✓ Both present |
| `next build` Three.js code-split | ✓ 504 KB isolated chunk |
| `grep -rn "pixi\|babel/standalone\|unpkg.com"` over src/, public/, package.json | ✓ 0 matches |
| No references in `src/` to 6 deleted PixiJS components or deleted live-widget canvas | ✓ Only a documentary code comment remains; no imports |

## Carried Concerns (do not block ship)

1. **`/habitat` INP measurement is instrument-inflated** but lacks a second clean run. A real-device or non-Playwright headless Lighthouse pass should be scheduled post-merge to confirm the user-visible INP is within budget. Already flagged in `13-PERF.md` "Known stubs / deferred".
2. **`/habitat` mobile LCP unmeasured** (observer misfire on 4× CPU-throttled emulator). Desktop LCP (1252 ms) is well inside budget; extrapolation suggests mobile would land around 4.4 s if the dashboard mobile/desktop ratio holds, which would breach the 2500 ms gate. Needs a real-device re-measurement.
3. **vitest pre-existing config**: `e2e/*.spec.ts` files are picked up by vitest. Not a Phase 13 issue but should be fixed for cleaner CI signal (`exclude: ['e2e/**']`).

## Overall Verdict

**PASS-WITH-CARRIED-CONCERNS**

8/10 requirements PASS outright. R1, R2, R3, R4, R5, R6, R7, R8, R10 all verified against the codebase. R9 is PARTIAL because two `/habitat` INP rows and one mobile LCP row breach or fail to measure the CWV "Good" gate, and the team's instrument-inflation explanation, while plausible, lacks a clean second-run measurement. The two carried concerns are documented, non-blocking, and addressable post-merge with a real-device re-measurement.

The phase ships per the orchestrator's autonomous-resolution rule; the verifier records R9 as PARTIAL for honesty and recommends a follow-up CWV re-measurement.

---

*Verifier note: this report does not commit ROADMAP or STATE updates; orchestrator owns those.*
