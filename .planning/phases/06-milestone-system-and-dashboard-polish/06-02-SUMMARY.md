---
phase: 06-milestone-system-and-dashboard-polish
plan: "02"
subsystem: ui
tags: [level-up, celebration, bird-sprite, pixi, confetti, study-session, habitat-canvas]
dependency_graph:
  requires: ["06-01"]
  provides: [LevelUpOverlay, BirdSprite, level-up-celebration-flow, bird-at-level-10]
  affects: [study-session, habitat-canvas, dashboard, deck-view, habitat-widget]
tech_stack:
  added: []
  patterns: [useTick-with-useCallback, lazy-useState-initializer, AnimatePresence-exit, query-param-threading]
key_files:
  created:
    - src/components/level-up-overlay.tsx
    - src/components/bird-sprite.tsx
  modified:
    - src/components/study-session.tsx
    - src/components/habitat-canvas.tsx
    - src/app/(protected)/dashboard/page.tsx
    - src/components/deck-view.tsx
    - src/components/habitat-widget.tsx
    - public/sprites/habitat.json
decisions:
  - "computeStats returns leveledUp: null as base; overwritten by API data.leveledUp in dispatch call"
  - "celebratingLevel threaded through DeckView and HabitatWidget to reach HabitatCanvas"
  - "layer-bird frame added at unused atlas coordinates (960,3240) as placeholder for dev"
  - "CONFETTI_ROTATE_DIRS pre-computed array to avoid Math.random() during render cycles"
metrics:
  duration: ~25 minutes
  completed_date: "2026-03-28"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 8
---

# Phase 6 Plan 2: Level-Up Celebration and Bird Sprite Summary

**One-liner:** 36-piece confetti LevelUpOverlay with useTick BirdSprite fly-in at level 10, wired via ?celebrate=10 query param through study-session -> dashboard -> habitat-canvas.

## What Was Built

**LevelUpOverlay** (`src/components/level-up-overlay.tsx`): Fullscreen motion.div overlay with 36 confetti pieces (CONFETTI_COLORS, staggered easeIn fall), level number in primary color, conditional copy ("A bird arrived!" at level 10 vs "Your habitat grew!" otherwise), and "Tap anywhere to continue" dismiss. Follows motion/react (not framer-motion) per codebase convention.

**BirdSprite** (`src/components/bird-sprite.tsx`): PixiJS component following TigerSprite pattern exactly — useTick + useCallback wrapper, useRef(isFirstAppearance) to capture animation intent on mount (never re-read from props), lazy useState initializer for SSR safety. Cubic ease-out fly-in over 60 frames from sceneWidth+100 to restX (sceneWidth*0.75). Guard returns null if layer-bird texture missing.

**Study session integration**: LevelUpOverlay renders in end phase when showLevelUp is non-null. commit() reads data.leveledUp from API response and sets it. handleLevelUpDismiss: clears overlay, navigates to /dashboard?deck=X&celebrate=10 when level 10.

**Habitat canvas integration**: BirdSprite renders when habitatState.level >= 10. celebratingLevel prop threads from HabitatCanvas -> Scene. isFirstAppearance={celebratingLevel === 10}.

**Dashboard wiring**: celebrate query param parsed in dashboard/page.tsx, celebratingLevel threaded through DeckView -> HabitatWidget -> eventually HabitatCanvas on the full habitat page.

**Sprite atlas**: layer-bird frame added to public/sprites/habitat.json at coordinates (960, 3240, 64x64) as dev placeholder. Final art is a separate polish task.

## Decisions Made

1. `computeStats` updated to return `leveledUp: null` to satisfy the `SessionStats` type contract (Plan 01 added `leveledUp` as required field). The API response overwrites it in the dispatch call.
2. `celebratingLevel` threaded through `DeckView` and `HabitatWidget` since `HabitatCanvas` is not rendered directly from the dashboard page — the full scene lives at `/habitat`. The prop chain is complete; bird fly-in triggers correctly when user visits `/habitat?celebrate=10` after being redirected.
3. Pre-computed `CONFETTI_ROTATE_DIRS` array (deterministic, index-based) avoids `Math.random()` during render which could cause hydration issues.
4. `layer-bird` frame uses existing atlas coordinates (960, 3240) which overlap with `layer-water-2` area — this is a placeholder. The guard `if (!sheet.textures["layer-bird"]) return null` prevents rendering issues if texture is missing or empty.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed computeStats missing leveledUp field**
- **Found during:** Task 2 TypeScript check
- **Issue:** `computeStats` returned `{ cardsStudied, correctCount, newlyLearned }` which is missing the required `leveledUp: number | null` field added to `SessionStats` in Plan 01
- **Fix:** Added `leveledUp: null` to the return value; the API response data overwrites it in the dispatch spread
- **Files modified:** src/components/study-session.tsx
- **Commit:** edae078

### Out-of-Scope Discoveries

None deferred.

## Known Stubs

- `public/sprites/habitat.json` `layer-bird` frame points to coordinates that overlap with `layer-water-2` region in `habitat.png` — the bird texture will be a fragment of the habitat background, not an actual bird. This is an intentional dev placeholder; final art will replace the texture before the `layer-bird` coordinates are corrected.
- `src/components/bird-sprite.tsx` guard `if (!sheet.textures["layer-bird"]) return null` will prevent crashes if the frame produces an invalid texture, but the rendered sprite will not look like a bird until final art is provided.

## Checkpoint Status

Task 3 (human verification) APPROVED by user on 2026-03-28.
- Level-up overlay displays correctly with confetti and dismisses on tap
- Bird fly-in animation works at level 10 via ?celebrate=10
- Confirmed neither replays on subsequent visits/sessions

## Self-Check

**Created files exist:**
- src/components/level-up-overlay.tsx: FOUND
- src/components/bird-sprite.tsx: FOUND

**Commits exist:**
- 2d2b449: feat(06-02): create LevelUpOverlay, BirdSprite, and bird placeholder in atlas — FOUND
- edae078: feat(06-02): integrate LevelUpOverlay and BirdSprite into session and habitat — FOUND

## Self-Check: PASSED
