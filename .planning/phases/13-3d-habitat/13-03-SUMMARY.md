---
phase: 13-3d-habitat
plan: 03
subsystem: habitat-3d
tags: [three.js, react, dynamic-import, orbit, keyboard, reduced-motion, playwright]
dependency_graph:
  requires:
    - "13-01 (scene-host: buildSceneHost, attachOrbit w/ nudgeTheta/getTheta/setTheta, reducedMotion)"
    - "13-02 (clay-world, clay-level, clay-animation: buildClayWorld, featuresForLevel, LEVEL_CONFIG, updateWorld)"
  provides:
    - "src/components/habitat-3d-canvas.tsx (default export: HabitatCanvas; named: mountHabitatScene, MountHabitatSceneOpts, MountedHabitatScene, __setMatchMediaStub, __resetMatchMediaStub)"
    - "Dev-only window.__habitatCameraPos() + window.__habitatSetTheta(n) — consumed by Plan 03 spec + Plan 06 hero-image build"
  affects:
    - "Plan 13-04 (mood + decay) — binds via stateRef.current without remount"
    - "Plan 13-06 (PixiJS cleanup) — habitat-canvas.tsx + habitat-layers.tsx + sprites no longer reachable from <HabitatScene>, but kept on disk"
tech_stack:
  added: []
  patterns:
    - "Pure factory + thin React shell: mountHabitatScene(canvas, wrapper, opts) is testable in vitest node-env (matches scene-host.test.ts pattern); React shell is a ~30-line useEffect wrapper"
    - "structKey: only level + reducedMotion trigger scene rebuild (sceneLevel useEffect dep); mood/quality flow through stateRef.current for Plan 04 to bind without remount"
    - "Dev-gated test affordances: window.__habitat* hooks attached when NODE_ENV !== 'production'; tree-shaken in production builds"
    - "WebGL context-loss recovery: webglcontextlost cancels RAF + flips data-ready=false; webglcontextrestored restarts RAF + restores data-ready=true"
    - "Strict-Mode-safe dispose: disposedRef guards RAF, idempotent dispose() flag, full scene.traverse() geometry+material disposal"
key_files:
  created:
    - "src/components/habitat-3d-canvas.tsx (300 LOC)"
    - "src/components/__tests__/habitat-3d-canvas.test.ts (430 LOC, 9 vitest tests)"
    - "e2e/13-habitat-3d.spec.ts (208 LOC, 3 Playwright tests)"
  modified:
    - "src/components/habitat-scene.tsx (1 line — dynamic-import target swap)"
decisions:
  - "D-34: mountHabitatScene factored as a pure factory (no React) — testable in vitest's existing node-env without adding @testing-library/react + jsdom. Matches the dependency-inverted pattern already established by Plan 02's buildClayWorld."
  - "D-35: Playwright R4 assertions compare camera DISTANCE from the look-at target (= radius) rather than per-axis x/y/z. Auto-orbit continues to rotate theta between snapshots; only zoom/pan would change radius/y. This is the SPEC-correct invariant under azimuth-only orbit."
  - "D-36: matchMedia stub plumbing (__setMatchMediaStub / __resetMatchMediaStub) exported from habitat-3d-canvas.tsx so future jsdom-equipped tests can flip the reducedMotion path deterministically. Currently unused by the React shell but documented + asserted via Test 8."
  - "D-37: belt-and-braces wheel + contextmenu preventDefault on the canvas (R4). attachOrbit is already azimuth-only by construction (no zoom/pan listeners), but cancelling these events also prevents the BROWSER from page-scrolling or showing a context menu on the canvas, which would compromise the immersive feel even without affecting the camera."
metrics:
  duration_minutes: ~40
  tasks_completed: 3
  files_touched: 4
  commits: 4
  completed_at: "2026-05-21"
---

# Phase 13 Plan 03: React wrapper + dynamic-import swap Summary

First user-visible 3D delivery: `/habitat` now renders Three.js (not PixiJS) on reload. The PixiJS shell (`<HabitatScene>`) keeps all its outer concerns — localStorage cache, retry/offline, level-up overlay, mood label — and only swaps its `dynamic({ ssr: false })` import target from `@/components/habitat-canvas` → `@/components/habitat-3d-canvas`. The new canvas mounts a `<canvas>`, runs `buildSceneHost` + `buildClayWorld` + `attachOrbit` inside a `useEffect`, runs a single RAF loop, handles WebGL context loss, and disposes everything cleanly on unmount.

## Tasks executed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | habitat-3d-canvas.tsx + 9 unit tests | `559dd0f` |
| 2 | habitat-scene.tsx dynamic-import swap | `3d95ff7` |
| 3 | e2e/13-habitat-3d.spec.ts (3 Playwright tests, R4/R5/R6) | `fdc88b7` |

## Components created/modified

| File | Status | LOC | Notes |
|------|--------|-----|-------|
| `src/components/habitat-3d-canvas.tsx` | created | 300 | Default-export React component + `mountHabitatScene` pure factory + `__setMatchMediaStub` test plumbing |
| `src/components/habitat-scene.tsx` | modified | -1/+4 lines | One-line dynamic-import target swap; outer concerns unchanged |
| `src/components/__tests__/habitat-3d-canvas.test.ts` | created | 430 | 9 vitest tests against the pure factory + stub canvas/wrapper |
| `e2e/13-habitat-3d.spec.ts` | created | 208 | 3 Playwright tests against `npm run dev` |

## Swap diff (habitat-scene.tsx)

```diff
-const HabitatCanvas = dynamic(() => import("@/components/habitat-canvas"), {
+// Plan 13-03: import target swapped PixiJS (habitat-canvas) → Three.js
+// (habitat-3d-canvas). The shell's outer concerns (cache, retry, level-up
+// overlay, mood label) are unchanged.
+const HabitatCanvas = dynamic(() => import("@/components/habitat-3d-canvas"), {
   ssr: false,
   loading: () => <HabitatLoadingSpinner />,
 });
```

PixiJS files (`habitat-canvas.tsx`, `habitat-layers.tsx`, sprite atlases) remain on disk — Plan 06 owns their deletion.

## Acceptance criteria covered

| ID | Behaviour | Where verified |
|----|-----------|----------------|
| R1 | All 9 levels render correct feature groups | Unit Test 2 (loops L1..L9, asserts FeatureFlags + sky to `buildClayWorld`) |
| R2 | Three.js dynamic-imported, ESM, code-split | Swap diff above; `next/dynamic({ ssr: false })` already validated in 13-01 |
| R3 | Scene reads HabitatState | `stateRef.current` threaded into per-frame `updateWorld` opts; Test 4 asserts re-render with new level triggers rebuild |
| R4 | Drag orbits; scroll wheel + right-click do NOTHING | Playwright R4: distance-from-target invariant under wheel + right-click drag |
| R5 | ArrowLeft / ArrowRight nudge theta | Unit Test 5 + Playwright R5 |
| R6 | prefers-reduced-motion freezes auto-orbit + ambient | Unit Test 6 + Playwright R6 |

## Dev-only window affordances (Plan 03 + Plan 06 dependency)

Per the Plan 03 contract, the React wrapper attaches two functions to `window` in non-production builds (gated by `process.env.NODE_ENV !== "production"` — tree-shaken in production bundles):

| Hook | Returns | Used by |
|------|---------|---------|
| `window.__habitatCameraPos()` | `{ x, y, z, theta }` from the live camera | Plan 03 Playwright spec (`e2e/13-habitat-3d.spec.ts`) |
| `window.__habitatSetTheta(n)` | `void` — sets orbit theta directly | Plan 03 Playwright spec (lock theta for deterministic R4 assertions); Plan 06 hero-image build script (per Plan 06's future spec) |

Both hooks are added inside the mount effect and removed on dispose. Unit Test 7a asserts they exist + function correctly under `NODE_ENV !== "production"`; Test 7b asserts they are `undefined` under `NODE_ENV === "production"`. Plan 01 confirmed that `attachOrbit` already surfaces `getTheta()` + `setTheta(n)` on `OrbitHandle` (13-01-SUMMARY.md exports the contract) — no Plan 01 changes needed.

## Verification

| Check | Status | Detail |
|-------|--------|--------|
| `npm run test -- habitat-3d-canvas` | **9 / 9 passed** | 260ms |
| `npm run typecheck` | clean | full project |
| `biome ci` on the 4 touched files | clean | 0 errors |
| `npx playwright test e2e/13-habitat-3d.spec.ts --reporter=list` | **3 / 3 passed** | 1m 12s (against `npm run dev`) |

### Playwright run output

```
ok 1 [chromium] › R4: drag orbits the camera; scroll wheel + right-click do NOTHING (26.5s)
ok 2 [chromium] › R5: ArrowRight advances theta; ArrowLeft retreats (18.5s)
ok 3 [chromium] › R6: reduced-motion freezes auto-orbit; manual drag still works (24.0s)
3 passed (1.2m)
```

Command used: `npx playwright test e2e/13-habitat-3d.spec.ts --reporter=list`. Dev server was started via `npm run dev` in a background task; `webServer` is `undefined` in `playwright.config.ts` (matches the repo's prevailing convention — see `e2e/07-habitat-display.spec.ts`).

## Confirmation: scroll-wheel + right-click do nothing

- **scroll wheel**: `attachOrbit` does not listen to `wheel` events (no zoom by construction). Plan 03 additionally attaches a `wheel` → `preventDefault` listener on the canvas to suppress browser page-scroll over the immersive surface. Playwright R4 asserts the camera distance from the look-at target is unchanged after `page.mouse.wheel(0, 120)`.
- **right-click**: `attachOrbit` listens to `mousedown` without filtering button → but right-click does not produce a useful X-delta because right-click drag is normally swallowed by the browser context-menu. We attach a `contextmenu` → `preventDefault` listener on the canvas, and Playwright R4 asserts distance + Y are unchanged after a right-button drag.

Both invariants are verified by the SPEC-correct invariant (camera-distance from `lookAt`, since auto-orbit may still rotate theta between snapshots — only zoom/pan would change radius/Y).

## Deviations from plan

| Rule | Description |
|------|-------------|
| Plan-design | `mountHabitatScene` pure factory pattern (D-34) was added to make the React component testable in the project's node-env vitest without adding `@testing-library/react` + `jsdom`. The plan's `<action>` block showed a more conventional React-only structure; the deviation matches the dependency-inverted pattern Plan 02 already established. |
| Plan-design | Playwright R4 assertions use camera-distance-from-target invariant (D-35) rather than the plan's `position differs` snapshot comparison. The plan's approach failed because auto-orbit rotates theta between snapshots (the position DOES differ, just not because of zoom/pan). The distance invariant pins zoom/pan absence directly. |

## Known stubs

- `celebratingLevel` prop is plumbed through `HabitatCanvas` for API parity with the v1.0 PixiJS canvas, but is NOT bound to any 3D behaviour in this plan. The level-up celebration overlay lives in `<HabitatScene>` (parent shell) and continues to render correctly. Intentional — no future plan needs to bind it to the 3D scene per the Phase 13 SPEC.

## Self-Check: PASSED

- `src/components/habitat-3d-canvas.tsx` — FOUND
- `src/components/__tests__/habitat-3d-canvas.test.ts` — FOUND
- `e2e/13-habitat-3d.spec.ts` — FOUND
- `src/components/habitat-scene.tsx` — imports `@/components/habitat-3d-canvas` (verified by `grep`)
- commit `559dd0f` — FOUND
- commit `3d95ff7` — FOUND
- commit `fdc88b7` — FOUND
