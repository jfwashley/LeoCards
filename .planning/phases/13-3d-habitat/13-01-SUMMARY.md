---
phase: 13-3d-habitat
plan: 01
subsystem: habitat-3d
tags: [three.js, scene-host, orbit, scaffolding, esm-port]
dependency_graph:
  requires: []
  provides:
    - "src/lib/habitat-3d/scene-host.ts (buildSceneHost, attachOrbit, attachViewportGate, attachVisibilityPause)"
    - "src/lib/habitat-3d/palette.ts (CLAY, toonGrad)"
    - "src/lib/habitat-3d/types.ts (SceneContext, OrbitOptions, OrbitHandle, WorldOpts)"
  affects:
    - "Plans 13-02..13-05 import from src/lib/habitat-3d/*"
tech_stack:
  added:
    - "three@0.160.1 (runtime)"
    - "@types/three@0.160.0 (types)"
  patterns:
    - "Pure-TS ESM scene scaffolding — no React, no DOM-coupled state (Plan 03 owns the React wrapper)"
    - "Stub-canvas testing in node env (no jsdom required) — performance.now mocked via vi.spyOn"
key_files:
  created:
    - "src/lib/habitat-3d/scene-host.ts"
    - "src/lib/habitat-3d/palette.ts"
    - "src/lib/habitat-3d/types.ts"
    - "src/lib/habitat-3d/__tests__/install.test.ts"
    - "src/lib/habitat-3d/__tests__/palette.test.ts"
    - "src/lib/habitat-3d/__tests__/scene-host.test.ts"
  modified:
    - "package.json"
    - "package-lock.json"
decisions:
  - "D-29: closed (close-d29) — designer idle is sufficient; saves ~1 day of Plan 04 iteration"
  - "Mousemove/mouseup attach to window (not canvas) — faithful to designer code; drag tracking continues if pointer leaves canvas"
  - "Test 6 asserts canvas listener set is exactly {mousedown, touchstart} — the operational D-26 / SPEC R4 lock"
metrics:
  duration_minutes: ~12
  tasks_completed: 4
  files_touched: 8
  completed_at: "2026-05-20"
---

# Phase 13 Plan 01: Three.js scaffolding + ESM port Summary

ESM port of the designer's three.js scaffolding (`habitats-shared.jsx:6-88` + the palette/material helpers from `habitat-clay-styles.jsx:19-40`) into pure-TypeScript modules under `src/lib/habitat-3d/`, with R5 (`nudgeTheta`) and R6 (`reducedMotion`) surfaces pre-wired so Plans 02-05 can consume the contracts without retrofitting.

## D-29 decision — closed (close-d29)

**Decision: close-d29 — designer idle is sufficient.**

> Josh (`/gsd-execute-phase 13`): _"Run all waves fully autonomous. Going on your recommendation."_

Rationale (recorded verbatim from execution prompt):

> "Closed autonomously during full-phase execution per user's 'going on your recommendation' instruction. The designer code at `.planning/design/animations/habitat-clay-styles.jsx:796-971` already implements walk + blink + ear twitch + brow micro-raise + tail tuft + pupil tracking + dust puffs — substantially richer than any of the original A/B options. RESEARCH section I A1 and the plan itself note this. Closing saves ~1 day of Plan 04 iteration. If Josh later disagrees, Plan 04 amendment cost is bounded."

Plan 04 should now drop its planned mid-phase A/B sketch and proceed directly to porting the designer's idle animation system as-is.

## Tasks executed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | D-29 confirmation | (pre-resolved by orchestrator — see above) |
| 2 | `npm install three@^0.160.0 @types/three@^0.160.0` + install.test.ts | `4057c94` |
| 3 | Port `palette.ts` (CLAY + toonGrad) + `types.ts` (contracts) + palette.test.ts | `6ffb6de` |
| 4 | Port `scene-host.ts` (buildSceneHost + attachOrbit + R5/R6) + scene-host.test.ts | `d6d557e` |

## Dependency install

**Exact three version installed: `three@0.160.1`** (`@types/three@0.160.0`).

`npm audit --omit=dev` summary:

```
20 vulnerabilities (12 moderate, 8 high, 0 critical)
```

**None of the 20 vulnerabilities are in `three` or `@types/three`.** They are all pre-existing transitives (vite via vitest devDep, `@hono/node-server` < 1.19.13, `@xmldom/xmldom` <= 0.8.12, etc.) carried over from Phase 12 baseline. `grep -i three` against the audit report returns zero matches. T-13-01 / T-13-02 in the plan's threat model are therefore mitigated: the pin is exact (`^0.160.0`), the lockfile is committed with integrity hashes, and the new packages introduce no new advisories.

## Exported symbols (for Plans 02-05 to import)

From `src/lib/habitat-3d/scene-host.ts`:

- **Functions**
  - `buildSceneHost(canvas, width, height, opts?) → SceneContext`
  - `attachOrbit(canvas, camera, opts?) → OrbitHandle`
  - `attachViewportGate(target, opts) → () => void` (IntersectionObserver helper)
  - `attachVisibilityPause(opts) → () => void` (visibilitychange helper)
- **Types (re-exported from `./types`)**
  - `SceneContext`
  - `OrbitOptions` (includes new `reducedMotion?: boolean` — R6)
  - `OrbitHandle` (includes new `nudgeTheta`, `getTheta`, `setTheta` — R5)
- **Type local to scene-host.ts**
  - `BuildSceneHostOpts`
  - `ViewportGateOpts`
  - `VisibilityPauseOpts`

From `src/lib/habitat-3d/palette.ts`:

- `CLAY` (24-key designer-locked hex palette, `as const`)
- `ClayColor` (keyof typeof CLAY)
- `toonGrad(steps = 3) → THREE.DataTexture`

From `src/lib/habitat-3d/types.ts`:

- `SceneContext`, `OrbitOptions`, `OrbitHandle`, `WorldOpts`

## Verification

| Check | Status |
|-------|--------|
| `npm ls three` | `three@0.160.1` |
| `npm ls @types/three` | `@types/three@0.160.0` |
| `npm run test -- src/lib/habitat-3d/` | 14 passed / 0 failed (3 files) |
| `npm run typecheck` | clean |
| `npm run lint` on habitat-3d files | clean (full-repo lint has 87 pre-existing errors, none in habitat-3d) |
| `grep -rn "OrbitControls" src/` | no matches (D-26 / SPEC R4 lock holds) |
| PixiJS deps still present | yes (`pixi.js`, `@pixi/react` retained — Plan 06 owns deletion) |

## Deviations from plan

**None.** All four tasks executed exactly as written. The pre-resolved D-29 decision short-circuited Task 1's interactive prompt per the orchestrator's instruction; the decision rationale was logged verbatim and is captured above.

## Test environment note (non-deviation)

Vitest in this repo is configured with `environment: "node"` and no jsdom is installed. The scene-host tests are therefore written to drive `attachOrbit` with a **stub canvas object** (just `addEventListener` / `removeEventListener` / `style`) and a `vi.spyOn(performance, "now")` mock — exercising the orbit math, idle-resume branch, `nudgeTheta` idle-reset, `reducedMotion` freeze, and the canvas-listener allowlist without needing a real DOM. Plan 03's React wrapper will get jsdom (or `@testing-library/react`) coverage when it lands.

## Pre-existing issues observed (NOT in scope of this plan)

- Full-repo `npm run test` shows 12 "failed" test files which are all `e2e/*.spec.ts` Playwright specs being collected by vitest's default `include`. These pre-date Phase 13 (Phase 12 SUMMARY notes the same 1786-unit-test green count under the same condition) and run correctly via `npm run test:e2e`. Logged here for future cleanup, not fixed this plan.
- Full-repo `npm run lint` shows 87 errors / 48 warnings, all in files outside `src/lib/habitat-3d/`. Carryover from prior phases.

## Self-Check: PASSED

- `src/lib/habitat-3d/scene-host.ts` — FOUND
- `src/lib/habitat-3d/palette.ts` — FOUND
- `src/lib/habitat-3d/types.ts` — FOUND
- `src/lib/habitat-3d/__tests__/install.test.ts` — FOUND
- `src/lib/habitat-3d/__tests__/palette.test.ts` — FOUND
- `src/lib/habitat-3d/__tests__/scene-host.test.ts` — FOUND
- commit `4057c94` — FOUND
- commit `6ffb6de` — FOUND
- commit `d6d557e` — FOUND
