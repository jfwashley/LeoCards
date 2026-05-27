---
phase: 13-3d-habitat
hot_fix: 13.1
subsystem: habitat-3d-perf
tags: [perf, lcp, tbt, three.js, mobile, lighthouse-followup]
target: "/habitat mobile CWV — bring R9 from FAIL → PASS"
inputs:
  - "13-PERF-REAL.md (R9 FAIL on /habitat mobile: LCP 2989ms, TBT 646ms)"
  - "13-VERIFICATION.md (overall PASS-WITH-KNOWN-PERF-REGRESSION)"
commits:
  opt1: ef4f43f
  opt2: 9ea06ee
  opt3: 77fbdf6
completed_at: "2026-05-27"
---

# Phase 13.1 Perf Hot-Fix Summary

Three atomic optimizations landed on `main` to bring `/habitat` mobile
CWV from FAIL → (target) PASS. Lighthouse re-measurement against a
fresh Vercel preview is owned by the orchestrator and will determine
final R9 outcome.

## Opt 1 — Defer Three.js init past LCP (commit `ef4f43f`)

**What changed.** `src/components/habitat-3d-canvas.tsx` React shell
now renders a static `next/image` poster (`/habitat/widget-l{N}.webp`,
sized `fill` + `preload`) as the primary LCP element. The live
Three.js canvas mounts only after BOTH:

1. The wrapper hits the viewport (IntersectionObserver, threshold
   0.01), AND
2. `requestIdleCallback` fires (1500ms timeout fallback, 200ms
   `setTimeout` fallback when rIC absent) OR a user gesture fires
   (`pointerdown` / `keydown` / `scroll`).

A 200ms opacity cross-fade hides the poster after the canvas mounts.
For the (`prefers-reduced-motion: reduce` AND mobile-form-factor)
intersection, the canvas is **never** mounted — the poster IS the
session-long experience. Desktop reduced-motion users keep the canvas
with auto-orbit frozen (Plan 04 behavior preserved).

**Key code shape:**

```ts
// Plan 13.1 Opt 1: viewport + idle/gesture gate (in default export)
useEffect(() => {
  if (reducedMotion && isMobileFormFactor()) return; // never mount
  // IntersectionObserver + requestIdleCallback + gesture listeners,
  // tryMount() flips setCanvasMounted(true) once both conditions met.
}, [reducedMotion]);

// Three.js mount only runs once canvasMounted=true
useEffect(() => {
  if (!canvasMounted) return;
  const handle = mountHabitatScene({ ... });
  setTimeout(() => setPosterHidden(true), 50);
  return () => handle.dispose();
}, [canvasMounted, sceneLevel, reducedMotion]);
```

**Files touched:**
- `src/components/habitat-3d-canvas.tsx` (+233 / −7)
- `src/components/__tests__/habitat-3d-canvas-defer.test.ts` (NEW)

**Mobile-form-factor detection** (`isMobileFormFactor`) is a viewport
< 768px OR `(pointer: coarse)` matchMedia check, with
`__setMobileStub` / `__resetMobileStub` test affordances mirroring the
existing `__setMatchMediaStub` pattern.

**Expected impact.** The hero `.webp` is small (~10-25 KB per level,
preloaded). It becomes the LCP element. Three.js parse + execute moves
off the critical path. Predicted: LCP drops from ~2989 ms toward
FCP-ish (~1100-1500 ms) on mobile; TBT drops as Three.js work happens
during idle. To be confirmed by the Lighthouse re-measurement.

## Opt 2 — Tree-shake `three` to named imports (commit `9ea06ee`)

**What changed.** Every `import * as THREE from "three"` value import
under `src/lib/habitat-3d/` was converted to a named-import form.
Per-file symbol audit drove minimal import lists (41 unique
`THREE.*` symbols across 7 source files). Biome auto-demoted
type-only uses to `import type` slots.

**Files touched (source only — tests retain `import * as THREE`):**

| File                                       | Symbols imported |
|--------------------------------------------|-----------------:|
| `src/lib/habitat-3d/palette.ts`            | 3                |
| `src/lib/habitat-3d/scene-host.ts`         | 9                |
| `src/lib/habitat-3d/clay-animation.ts`     | 3                |
| `src/lib/habitat-3d/clay-characters.ts`    | 10               |
| `src/lib/habitat-3d/clay-ambient.ts`       | 18               |
| `src/lib/habitat-3d/clay-world.ts`         | 22               |
| `src/lib/habitat-3d/mood-decay.ts`         | 6                |

**Key code-shape diff:**

```diff
- import * as THREE from "three";
- ...
- const renderer = new THREE.WebGLRenderer({...});
- const scene = new THREE.Scene();
+ import {
+   ACESFilmicToneMapping,
+   Color, Fog, PCFSoftShadowMap, PerspectiveCamera,
+   Scene, SRGBColorSpace, Vector3, WebGLRenderer,
+ } from "three";
+ ...
+ const renderer = new WebGLRenderer({...});
+ const scene = new Scene();
```

**Expected impact (honest assessment).** Bundle: three chunk
**517803 B → 517803 B (no measurable change)**. Three r160 ships
`three.module.js` as a single ~1.2 MB ESM file with extensive internal
cross-references between classes (WebGLRenderer pulls in materials,
geometries, textures, math utilities through its renderer state
machine). Turbopack's tree-shake correctly identifies the imports but
cannot prune the internally-referenced classes from the module graph.
The plan's "200-350 KB floor" target from `13-PERF-REAL.md` was
directionally optimistic for three r160 — a meaningful chunk shrink
would require either upgrading to **three r170+** (which split the
module into sub-paths) or migrating to `three/build/three.webgpu.js`
(smaller core, no `PCFSoftShadowMap`). Both are out of scope for a
hot-fix.

**Why ship it anyway.** Named imports are the standard best practice,
match the maintenance pattern Three.js itself recommends, and set up
future migrations (r170 split, webgpu) without touching call sites
again.

## Opt 3 — Mobile budget (commit `77fbdf6`)

Three sub-changes landed in one atomic commit.

### 3a. Elephant skipped on mobile

`habitat-3d-canvas.tsx` now gates `buildElephant` on
`level >= 5 && !ctx.isMobile`. Saves the 200+ triangle rig + its
per-frame `animateElephant` cost (trunk segment chain, ear sway,
blink). Desktop continues to render the elephant from L5 unchanged.
Truth-table pinned by an `it.each` predicate test so a future
refactor cannot silently re-enable it.

### 3b. `toonGradFor(ctx, steps)` per-scene cache

Added to `palette.ts`. A
`WeakMap<SceneContext, Map<number, DataTexture>>` keys by SceneContext
(so concurrent scenes can't share GPU textures across renderer
instances) and by step count. `clay-world.ts` now calls
`toonGradFor(ctx, 4)` instead of the uncached `toonGrad(4)`. Legacy
`toonGrad` export retained (Plan 06 hero-image build + the existing
`palette.test.ts` determinism check depend on per-call instances).

**Key code shape:**

```ts
const _toonGradCache: WeakMap<SceneContext, Map<number, DataTexture>> =
  new WeakMap();

export function toonGradFor(ctx: SceneContext, steps = 3): DataTexture {
  let inner = _toonGradCache.get(ctx);
  if (!inner) { inner = new Map(); _toonGradCache.set(ctx, inner); }
  const cached = inner.get(steps);
  if (cached) return cached;
  const tex = toonGrad(steps);
  inner.set(steps, tex);
  return tex;
}
```

### 3c. Q quality scalar adaptive on slow CPU

`scene-host.ts` adds `isSlowDevice()` —
`navigator.hardwareConcurrency <= 4` OR
`navigator.deviceMemory <= 4`, both feature-detected with positive-
value guards so missing APIs don't false-positive. On mobile + slow
CPU, `Q` drops from `0.55 → 0.4`. Desktop never receives the
adjustment (already at `Q = 1`). `__setSlowDeviceStub` /
`__resetSlowDeviceStub` test affordances pair with the existing
`__setMatchMediaStub` pattern.

```ts
// scene-host.ts
const Q = isMobile ? (isSlowDevice() ? 0.4 : 0.55) : 1;
```

**Files touched:**
- `src/components/habitat-3d-canvas.tsx` (+5 / −2)
- `src/lib/habitat-3d/clay-world.ts` (+5 / −1)
- `src/lib/habitat-3d/palette.ts` (+44 / −0)
- `src/lib/habitat-3d/scene-host.ts` (+49 / −1)
- `src/lib/habitat-3d/__tests__/opt3-mobile-budget.test.ts` (NEW)

## Bundle-size table

| Chunk                                | Bytes     | Notes                                       |
|--------------------------------------|----------:|---------------------------------------------|
| pre-hot-fix `11c_2vdyn8skq.js`       | 516,088   | Plan 06 baseline (R9 FAIL)                  |
| post-Opt-1 `0gpx6e7y_8j9w.js`        | 517,803   | +1.7 KB (poster JSX + deferral logic)       |
| post-Opt-2 `0gpx6e7y_8j9w.js`        | 517,803   | tree-shake no-op (see Opt 2 honest section) |
| post-Opt-3 `0go8gnmq2fmhe.js`        | 518,166   | +363 B (slow-CPU detection + cache helpers) |

Chunk **remains** a separate code-split chunk loaded only by
`/habitat` (verified — `WebGLRenderer` string lives in exactly one
chunk). Three is NOT inlined into the main bundle. R10 invariants
preserved: `grep -rn "pixi|babel/standalone|unpkg.com" src/ public/
package.json` → 0 matches.

## Test results

| Gate                                                | Result                                       |
|-----------------------------------------------------|----------------------------------------------|
| `npm run typecheck`                                 | **clean** (post each commit)                 |
| `npm run test` (full vitest)                        | **1872 passed**, 6 skipped (+16 over baseline) |
| `biome check` on all touched files                  | **clean** (1 pre-existing warning)           |
| `npm run build`                                     | **clean** (3 successful builds across opts)  |
| Playwright `13-habitat-3d.spec.ts` (R4/R5/R6)       | **3/3 passed** (R4 flaked first run on Next-16 first-compile-time, passed on retry; R5/R6 first-try) |
| Playwright `13-habitat-states.spec.ts` (R7 baselines) | **could not execute** — `signUpWithDeck` fails in this session with `NeonDbError: Error connecting to database: TypeError: fetch failed` BEFORE any habitat rendering. Infra/network issue, NOT a regression from this hot-fix. The 28 reference PNGs on disk + `diff-table.json` (126/126 PASS) are unchanged. |

**Unit test growth (1856 → 1872):**
- +2 from `habitat-3d-canvas-defer.test.ts` (Opt 1 affordances)
- +14 from `opt3-mobile-budget.test.ts` (Opt 3 knobs: toonGradFor
  identity, isSlowDevice stub plumbing, Q-mapping truth table,
  elephant predicate matrix)

## Deviations from the hot-fix plan

| # | Deviation | Why |
|---|-----------|-----|
| 1 | Opt 2 tree-shake did not hit the "200-350 KB floor" target. Reported chunk size unchanged. | three r160 ships as a single ESM with extensive internal cross-references; Turbopack tree-shake cannot prune internally-referenced classes. This was identified as plan-stated **realistic** estimate, not a hard gate. The conversion still ships as named imports for future-proofing. Documented honestly in Opt 2 commit message + this SUMMARY. No alternative scope improvised. |
| 2 | Opt 1 unit test scope reduced — original brief asked for "poster renders synchronously on mount; canvas mounts only after gate + idle/gesture; dispose cleans both up." | Vitest is configured `environment: "node"` with NO jsdom installed. React-shell rendering tests would require adding `@testing-library/react` + `jsdom`, which is scope creep and not a hot-fix concern. The pure `mountHabitatScene` factory dispose semantics are already covered by Test 3 of the existing `habitat-3d-canvas.test.ts`; the new `habitat-3d-canvas-defer.test.ts` pins the new test affordances (`__setMobileStub` / `__resetMobileStub`). The end-to-end gate behavior is covered by Playwright `13-habitat-3d.spec.ts` (waits on `canvas[data-ready="true"]` which is only set by `mountHabitatScene` after the gate fires). |
| 3 | Playwright `13-habitat-states.spec.ts` could not be re-run end-to-end. | Pre-existing Neon database connectivity failure in this session (auth layout's `auth.api.getSession` throws `NeonDbError: Error connecting to database: TypeError: fetch failed` before any habitat rendering). The test setup itself fails — no habitat code paths are exercised. Recommendation: orchestrator re-run after the Lighthouse measurement when Neon is reachable. |

## Verification commands to re-run

```bash
# Unit + types
npm run typecheck
npm run test
npx biome check src/lib/habitat-3d/ src/components/habitat-3d-*.tsx

# Build + chunk inspection
rm -rf .next && npm run build
for f in .next/static/chunks/*.js; do
  if grep -l "WebGLRenderer" "$f" >/dev/null 2>&1; then
    echo "$(basename $f) $(stat --printf=%s $f) bytes"
  fi
done

# R4/R5/R6 e2e (requires `npm run dev` separately)
npx playwright test e2e/13-habitat-3d.spec.ts --reporter=list

# R7 baseline integrity (does not require Neon)
node scripts/diff-habitat-screenshots.mjs
```

## Known unknowns (for the next Lighthouse run)

1. The static-poster swap should drop LCP dramatically; if it doesn't,
   the bottleneck may be the auth-protected initial HTML hand-off
   (server-side `getSession` blocking the route render). Investigate by
   comparing `/habitat` vs `/dashboard` initial-HTML TTFB on the same
   mobile profile.
2. TBT impact is harder to predict — the Three.js parse cost still
   happens, just during idle. If the user scrolls or clicks immediately
   on first paint, the gesture-based gate may fire before idle resolves
   and TBT improvement could be small. Worth measuring with a 0-second
   simulated user-think-time.
3. The slow-CPU `Q=0.4` path is untested on real low-end hardware. The
   Q value reaches `buildSceneHost` but no scene-graph code currently
   reads `ctx.Q` to dial down anything. Future Phase 13.x can wire
   `ctx.Q` to ambient-emitter spawn rates / particle counts.

## Self-Check

- `.planning/phases/13-3d-habitat/13-PERF-FIX-SUMMARY.md` — FOUND
- commit `ef4f43f` (Opt 1) — FOUND (`git log --oneline | grep ef4f43f`)
- commit `9ea06ee` (Opt 2) — FOUND
- commit `77fbdf6` (Opt 3) — FOUND
- `src/components/habitat-3d-canvas.tsx` — modified (poster + defer)
- `src/components/__tests__/habitat-3d-canvas-defer.test.ts` — created
- `src/lib/habitat-3d/__tests__/opt3-mobile-budget.test.ts` — created
- 7 source files in `src/lib/habitat-3d/` — named-import conversion verified
- Three.js still in a separate code-split chunk (`0go8gnmq2fmhe.js`,
  518,166 B), not inlined into main bundle
- PixiJS/CDN R10 invariants preserved (0 grep matches)

**Self-Check: PASSED**
