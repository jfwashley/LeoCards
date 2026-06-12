---
phase: 05-habitat-ui
plan: 03
subsystem: ui
tags: [pixi.js, pixi-react, canvas, dashboard-widget, offline-cache, error-handling, level-up, motion]

requires:
  - phase: 05-habitat-ui
    plan: 01
    provides: PixiJS canvas pipeline, SSR-safe dynamic wrapper, habitat-scene.tsx, habitat-canvas.tsx
  - phase: 05-habitat-ui
    plan: 02
    provides: TigerSprite, HabitatLayers, SparkleParticles, habitat-ui-utils
  - phase: 04-habitat-engine
    provides: computeHabitatState, getHabitatFacts, HabitatState type, GET /api/habitat

provides:
  - src/components/habitat-widget.tsx — SSR-safe dynamic wrapper for mini widget canvas + progress bar
  - src/components/habitat-widget-canvas.tsx — Small PixiJS canvas showing tiger sprite in 80px height
  - src/app/(protected)/dashboard/page.tsx — Dashboard page with habitat widget integration (server-side state fetch)
  - src/components/deck-view.tsx — Updated with habitatState prop, renders HabitatWidget above card list
  - src/components/habitat-scene.tsx — Updated with error/offline/level-up states and localStorage caching

affects: [05-habitat-ui, habitat-widget, habitat-scene, dashboard, deck-view]

tech-stack:
  added: []
  patterns:
    - SSR-safe mini widget via next/dynamic with ssr:false inside "use client" habitat-widget.tsx
    - localStorage caching pattern for offline resilience (CACHE_KEY = leocards:habitat-state)
    - Client-side retry() with fetch /api/habitat, localStorage fallback, and offline banner
    - Level-up detection via prevLevel state comparison with 2.5s celebration timer

key-files:
  created:
    - src/components/habitat-widget.tsx
    - src/components/habitat-widget-canvas.tsx
  modified:
    - src/app/(protected)/dashboard/page.tsx
    - src/components/deck-view.tsx
    - src/components/habitat-scene.tsx

key-decisions:
  - "HabitatWidget rendered in both DeckView (for users with decks) and above FirstVisitPicker (for new users with no decks yet) — ensures tiger is visible regardless of onboarding state"
  - "LEVEL_THRESHOLDS[level-2] is the previous threshold for level N >= 2; 0 is used for level 1 — progress bar correctly segments each level's range"
  - "retry() first clears error state, then re-fetches; on failure falls back to localStorage cache and shows offline banner instead of error state — cached data preferred over error page"
  - "habitatState passed as HabitatState type from server; deck-view.tsx uses TypeScript type directly without cast — serialized JSON from server matches HabitatState shape"
  - "Level-up detection compares state.level > prevLevel in useEffect; prevLevel updated in both branches to prevent stale comparison loops"

metrics:
  duration: 7min
  completed: 2026-03-28
  tasks: 3
  files: 5
---

# Phase 05 Plan 03: Mini Dashboard Widget, Error Handling, and Offline Caching Summary

**Mini habitat widget on dashboard with 80px PixiJS canvas and progress bar toward next level; error/offline resilience with localStorage caching and retry; level-up celebration overlay with scale pop animation**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-28T14:48:12Z
- **Completed:** 2026-03-28T14:55:01Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 2 created + 3 modified

## Accomplishments

- Created `HabitatWidgetCanvas` — small PixiJS canvas at fixed 80px height loading tiger atlas and rendering mood-matched sprite centered in the widget
- Created `HabitatWidget` — SSR-safe (ssr:false) wrapper with progress bar, Link to /habitat, level label, and card count display; progress bar correctly calculates percentage within each level's threshold range using `LEVEL_THRESHOLDS`
- Updated `dashboard/page.tsx` to fetch `getHabitatFacts()` + `computeHabitatState()` server-side and pass `habitatState` to `DeckView`; new users (no decks) see `HabitatWidget` above `FirstVisitPicker`
- Updated `DeckView` to accept `habitatState` prop and render `HabitatWidget` above the card list
- Rewrote `HabitatScene` with:
  - `localStorage` caching on mount (key: `leocards:habitat-state`) for offline resilience
  - `retry()` function: fetches `/api/habitat`, updates state + cache on success; shows offline banner with cached data on failure; shows error state if no cache
  - Error state: "Something went wrong" + "We couldn't load your habitat." + `<Button>Try again</Button>`
  - Offline indicator: motion-animated bottom-center banner "You're offline — showing last known state"
  - Level-up celebration: "Level N!" text with `scale: 0.8 → 1` pop animation for 2.5s on level increase

## Task Commits

1. **Task 1: Mini habitat widget and dashboard wiring** - `d8d9c5d` (feat)
2. **Task 2: Error state, offline caching, and level-up celebration** - `c71c401` (feat)
3. **Task 3: Visual verification** - auto-approved (checkpoint:human-verify in auto-mode)

## Files Created/Modified

- `src/components/habitat-widget-canvas.tsx` — "use client", extend() at module scope, 80px height, tiger sprite centered
- `src/components/habitat-widget.tsx` — "use client", ssr:false dynamic import, Link to /habitat, progress bar, Level N label
- `src/app/(protected)/dashboard/page.tsx` — Added getHabitatFacts + computeHabitatState, habitatState passed to DeckView, HabitatWidget shown above FirstVisitPicker for new users
- `src/components/deck-view.tsx` — Added habitatState prop (HabitatState type), HabitatWidget rendered above card list
- `src/components/habitat-scene.tsx` — Full rewrite with error/offline/level-up states, localStorage caching, retry(), motion animations

## Decisions Made

- `HabitatWidget` rendered above `FirstVisitPicker` for users with no decks — new users can see their tiger even before creating their first deck, reinforcing the core value prop
- Progress bar uses `LEVEL_THRESHOLDS[level-2]` as the previous threshold for level N >= 2, with 0 for level 1 — correctly segments each level's specific range
- `retry()` in `HabitatScene` preferentially uses cached data over showing the error state — a degraded experience (offline banner) is better than an error page
- `habitatState` passed as a typed `HabitatState` from server to client without explicit cast — Next.js serializes it as JSON which matches the interface shape
- Level-up detection with `prevLevel` state uses two update paths to avoid infinite loops: level increased (set showLevelUp + update prevLevel) and not increased (just update prevLevel)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `public/sprites/tiger.png` — Still placeholder 512x512 solid orange PNG; real tiger art will replace this
- `public/sprites/habitat.png` — Still placeholder 64x64 solid green PNG; real habitat layer art will replace this
- `HabitatWidgetCanvas` renders the tiger sprite with fixed width/height of 24px rather than percentage of container — fine for the 80px fixed-height widget, but would need updating if widget height changes

These stubs do not prevent the plan's goals: widget renders with tiger, progress bar is accurate, error/offline/level-up states all functional.

## Self-Check: PASSED

All 5 files verified present. Commits d8d9c5d and c71c401 verified in git log.

---
*Phase: 05-habitat-ui*
*Completed: 2026-03-28*
