---
phase: 05-habitat-ui
plan: 02
subsystem: ui
tags: [pixi.js, pixi-react, canvas, sprites, mood-transitions, parallax, particles]

requires:
  - phase: 05-habitat-ui
    plan: 01
    provides: PixiJS canvas pipeline, sprite atlases, SSR-safe dynamic wrapper, habitat-canvas skeleton

provides:
  - src/lib/habitat-ui-utils.ts — pure functions for mood transitions, level layers, decay alpha, tiger positioning
  - src/lib/__tests__/habitat-ui-utils.test.ts — 28 unit tests for all utility functions
  - src/components/tiger-sprite.tsx — mood-reactive tiger with random position/facing, bounce + crossfade transitions
  - src/components/habitat-layers.tsx — level-gated additive background layers with decay alpha and parallax
  - src/components/sparkle-particles.tsx — continuous sparkle particle burst for excited mood
  - src/components/habitat-canvas.tsx — updated to wire TigerSprite + HabitatLayers + SparkleParticles with ResizeObserver
  - src/components/habitat-scene.tsx — updated to add Level badge and mood indicator overlays

affects: [05-habitat-ui, tiger-sprite, habitat-layers, sparkle-particles, habitat-canvas, habitat-scene]

tech-stack:
  added: []
  patterns:
    - useTick with useCallback wrapper to prevent Pitfall 3 (re-registration every frame)
    - BounceAnimator/CrossfadeAnimator as render-nothing sub-components housing ticker loops
    - Lazy useState initializer for random tiger position/facing (avoids SSR hydration mismatch, Pitfall 7)
    - ResizeObserver on canvas container div to track scene dimensions for percentage-based sprite placement
    - useRef for per-frame animation state (bounceFrameRef, crossfadeFrameRef) to avoid setState in useTick
    - getDecayAlpha formula: Math.max(0, (quality - 0.5) * 2) — fully faded at quality <= 0.5

key-files:
  created:
    - src/lib/habitat-ui-utils.ts
    - src/lib/__tests__/habitat-ui-utils.test.ts
    - src/components/tiger-sprite.tsx
    - src/components/habitat-layers.tsx
    - src/components/sparkle-particles.tsx
  modified:
    - src/components/habitat-canvas.tsx
    - src/components/habitat-scene.tsx

key-decisions:
  - "useTick callbacks wrapped in useCallback per Pitfall 3 — prevents re-registration on every render"
  - "BounceAnimator and CrossfadeAnimator are render-nothing sub-components so useTick lifecycle is tied to animation active state"
  - "Lazy useState initializer for tiger position/facing — prevents SSR/hydration mismatch (Pitfall 7)"
  - "ResizeObserver tracks container dimensions and passes sceneWidth/sceneHeight to TigerSprite and HabitatLayers for percentage-based layout"
  - "TickerCallback type is (ticker: Ticker) => void not (delta: number) => void — fixed from plan spec"
  - "pixiGraphics draw prop uses DrawCallback = (graphics: Graphics) => void — typed correctly"
  - "Base layers (sky, hills, grass-base) never decay; level-added layers apply decay with resilience gradient"
  - "Higher-index level layers decay more strongly; older layers are more resilient (D-13 gradient)"

metrics:
  duration: 16min
  completed: 2026-03-28
  tasks: 2
  files: 7
---

# Phase 05 Plan 02: Tiger Sprite, Habitat Layers, and Sparkle Particles Summary

**Mood-reactive tiger sprite with random positioning and bounce/crossfade transitions, level-gated additive habitat layers with decay fading and parallax, and sparkle particle burst for excited mood — all wired into the PixiJS canvas with level badge and mood indicator overlays**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-03-28T14:29:28Z
- **Completed:** 2026-03-28T14:45:02Z
- **Tasks:** 2
- **Files modified:** 2 modified + 5 created

## Accomplishments

- Implemented pure utility library (`habitat-ui-utils.ts`) with 28 passing unit tests:
  - `getMoodTransitionType`: "bounce" for happier shifts, "crossfade" for sadder shifts, "none" for same
  - `getLayersForLevel`: 4 layers at level 1, 13 layers at level 10 (D-09)
  - `getDecayAlpha`: `Math.max(0, (quality - 0.5) * 2)` formula per D-13
  - `getTigerPosition` / `getTigerFacing`: random placement helpers with lazy initializers

- Created `TigerSprite` component with mood-to-texture mapping, random position/facing on mount, and per-frame ticker animations:
  - "bounce" mood transitions: spring-like y-offset using `Math.sin(t * 0.15) * 8 * decay` over 24 frames
  - "crossfade" mood transitions: alpha tween old→new texture over 30 frames
  - Lazy `useState` initializer prevents SSR/hydration mismatch (Pitfall 7)

- Created `HabitatLayers` component:
  - `getLayersForLevel` drives layer list for current level
  - Base layers (sky, hills, grass-base) always render at alpha 1.0 — never decay
  - Level-added layers apply decay with resilience gradient: most recent layer decays most (D-13)
  - Parallax: background 2% shift, mid-ground 5% shift, foreground anchored — driven by mousemove

- Created `SparkleParticles` component:
  - 10 orange particles (`0xF97316`) continuously emitted and respawned when `active === true`
  - Per-frame physics: upward velocity + slight horizontal drift, alpha fade over 40 frames
  - `useTick` with `useCallback` per Pitfall 3

- Updated `HabitatCanvas` to load both atlases and render `HabitatLayers` → `TigerSprite` → `SparkleParticles` in order
- Updated `HabitatScene` to add level badge overlay and mood indicator overlay with colored dots per mood

## Task Commits

1. **Task 1: Habitat UI utility functions with tests** - `0d62ecf` (feat)
2. **Task 2: Tiger sprite, habitat layers, sparkle particles, and canvas wiring** - `097e989` (feat)

## Files Created/Modified

- `src/lib/habitat-ui-utils.ts` — Pure functions: getMoodTransitionType, getLayersForLevel, getDecayAlpha, getTigerPosition, getTigerFacing, TIGER_POSITIONS
- `src/lib/__tests__/habitat-ui-utils.test.ts` — 28 unit tests for all pure functions
- `src/components/tiger-sprite.tsx` — Mood-reactive tiger with bounce/crossfade transitions and random placement
- `src/components/habitat-layers.tsx` — Additive level layers with decay alpha and parallax mouse offset
- `src/components/sparkle-particles.tsx` — Orange sparkle particle burst for excited mood
- `src/components/habitat-canvas.tsx` — Updated: wires TigerSprite + HabitatLayers + SparkleParticles, ResizeObserver for scene dimensions
- `src/components/habitat-scene.tsx` — Updated: adds Level badge overlay and mood indicator overlay

## Decisions Made

- `useTick` callbacks must be wrapped in `useCallback` — @pixi/react does not memoize them; without memoization, ticker re-registers every frame (Pitfall 3)
- `BounceAnimator` and `CrossfadeAnimator` are render-nothing sub-components so their mount/unmount controls ticker lifecycle
- Lazy `useState(() => getTigerPosition())` prevents SSR hydration mismatch for random values (Pitfall 7)
- `TickerCallback` receives a `Ticker` object (not `number`) — the plan spec had `(delta: number)` which required a Rule 1 type fix
- `pixiGraphics` draw prop type is `DrawCallback = (graphics: Graphics) => void` per @pixi/react types — typed correctly from the library

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TickerCallback parameter type**
- **Found during:** Task 2 build (TypeScript type check)
- **Issue:** Plan spec described useTick callback as `(delta: number) => void` but the actual PixiJS 8.x `TickerCallback<T>` type is `(this: T, ticker: Ticker) => any` — callbacks receive a `Ticker` object, not a raw delta number
- **Fix:** Imported `Ticker` type from `pixi.js` and typed all useTick callback parameters as `(ticker: Ticker) => void`; accessed `ticker.deltaTime` instead of raw delta
- **Files modified:** `src/components/tiger-sprite.tsx`, `src/components/sparkle-particles.tsx`
- **Commit:** `097e989`

**2. [Rule 1 - Bug] Fixed pixiGraphics draw callback type**
- **Found during:** Task 2 build (TypeScript type check)
- **Issue:** Inline object type for draw callback was incompatible with @pixi/react's `DrawCallback = (graphics: Graphics) => void`
- **Fix:** Imported `Graphics` from `pixi.js` and typed the draw callback parameter as `(g: Graphics) => void`
- **Files modified:** `src/components/sparkle-particles.tsx`
- **Commit:** `097e989`

## Issues Encountered

- Pre-existing build failure on `/signup` due to missing `DEEPL_API_KEY` environment variable in the build environment — confirmed pre-existing (same as Plan 01 summary). TypeScript compilation passes with no errors on new files. This is a deployment-time environment issue.

## Known Stubs

- `public/sprites/tiger.png` — Still placeholder 512x512 solid orange PNG; real tiger sprite art will replace this along with updated tiger.json frame coordinates
- `public/sprites/habitat.png` — Still placeholder 64x64 solid green PNG; real habitat layer art will replace this
- Sparkle particle positions are relative to a fixed center-of-scene tiger reference point (`sceneWidth * 0.5, sceneHeight * 0.75`); ideally they should track the actual random TigerSprite position. A callback ref or shared context could wire them together in a future plan if needed.

These stubs do not prevent this plan's goals: utility functions tested, tiger mood-reactive rendering wired, habitat layers additive by level, sparkle particles active for excited mood.

## Next Phase Readiness

- Utility functions tested and exported — Plan 03 (habitat widget or milestones) can import directly
- TigerSprite, HabitatLayers, SparkleParticles all render inside the existing @pixi/react Application tree
- Level badge and mood indicator overlays visible on /habitat page
- The pre-existing build error on /signup (missing DEEPL_API_KEY env var) needs environment variables set before production deployment

## Self-Check: PASSED

All 7 files verified present. Commits 0d62ecf and 097e989 verified in git log.
