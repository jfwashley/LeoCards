---
phase: 05-habitat-ui
plan: 01
subsystem: ui
tags: [pixi.js, pixi-react, canvas, sprites, ssr, next-dynamic, motion]

requires:
  - phase: 04-habitat-engine
    provides: computeHabitatState, getHabitatFacts, HabitatState type, GET /api/habitat

provides:
  - pixi.js 8.x and @pixi/react v8 installed and configured
  - public/sprites/tiger.json spritesheet atlas (5 frames + animated excited sequence)
  - public/sprites/habitat.json spritesheet atlas (13 habitat layer frames)
  - src/components/habitat-scene.tsx — SSR-safe dynamic wrapper with ssr:false gate
  - src/components/habitat-canvas.tsx — @pixi/react Application with scene skeleton and ticker visibility control
  - src/app/(protected)/habitat/page.tsx — server component shell fetching habitat state from DB

affects: [05-habitat-ui, habitat-widget, tiger-sprite, habitat-layers]

tech-stack:
  added: [pixi.js@8.x, "@pixi/react@8.x"]
  patterns:
    - SSR-safe PixiJS via next/dynamic with ssr:false inside "use client" wrapper
    - extend() called at module scope before any JSX using pixi classes
    - Assets.load() inside Application tree (not before) per Pitfall 5
    - VisibilityController render-nothing component using useApplication() for ticker pause

key-files:
  created:
    - public/sprites/tiger.json
    - public/sprites/tiger.png
    - public/sprites/habitat.json
    - public/sprites/habitat.png
    - src/components/habitat-scene.tsx
    - src/components/habitat-canvas.tsx
    - src/app/(protected)/habitat/page.tsx
  modified:
    - package.json

key-decisions:
  - "ssr:false must be inside a \"use client\" module — Next.js 16 disallows it in Server Components"
  - "Assets.load() called inside <Application> tree, not before, to avoid Pitfall 5 (no PixiJS context)"
  - "extend() called at habitat-canvas.tsx module scope so pixi JSX elements are registered before render"
  - "habitat/page.tsx calls getHabitatFacts() directly — no HTTP round-trip to /api/habitat"
  - "VisibilityController is a render-nothing component inside Application tree using useApplication() hook"
  - "Placeholder PNGs generated programmatically with Node.js — real art replaces only the PNG/JSON files"

patterns-established:
  - "Pattern: SSR-safe PixiJS — habitat-scene.tsx is \"use client\" + dynamic(ssr:false); habitat-canvas.tsx is the actual canvas"
  - "Pattern: Ticker visibility — VisibilityController inside Application tree listens to visibilitychange"
  - "Pattern: Atlas loading — Promise.all inside useEffect in Scene component, sheets held in useState"

requirements-completed: [HAB-02, HAB-03]

duration: 25min
completed: 2026-03-28
---

# Phase 05 Plan 01: Habitat UI Foundation Summary

**PixiJS 8.x canvas pipeline with SSR-safe dynamic loading, placeholder sprite atlases, ticker visibility control, and server-side habitat state fetch via direct DB query**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-28T14:20:00Z
- **Completed:** 2026-03-28T14:45:00Z
- **Tasks:** 2
- **Files modified:** 7 created + 2 modified (package.json, package-lock.json)

## Accomplishments

- Installed pixi.js 8.x and @pixi/react v8; both importable in Node.js environment
- Created placeholder sprite atlases: tiger.json (5 frames + animated excited sequence), habitat.json (13 habitat layer frames matching UI-SPEC naming convention)
- Built SSR-safe canvas pipeline: habitat-scene.tsx wraps habitat-canvas.tsx with next/dynamic ssr:false — PixiJS never touches server rendering
- Implemented VisibilityController render-nothing component that pauses/resumes ticker on visibilitychange (D-22)
- /habitat page fetches habitat state server-side via getHabitatFacts() + computeHabitatState() — no HTTP round-trip

## Task Commits

1. **Task 1: Install PixiJS + create placeholder sprite atlases** - `e1e38bd` (feat)
2. **Task 2: SSR-safe PixiJS wrapper, canvas skeleton, and /habitat page** - `02291fe` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `public/sprites/tiger.json` — Tiger sprite atlas with 5 frames and animated excited sequence
- `public/sprites/tiger.png` — Placeholder 512x512 orange PNG (real art replaces this)
- `public/sprites/habitat.json` — Habitat layer atlas with 13 frames (layer-sky through layer-water-2)
- `public/sprites/habitat.png` — Placeholder 64x64 green PNG (real art replaces this)
- `src/components/habitat-scene.tsx` — "use client" dynamic wrapper: ssr:false gate + Motion fade-in (D-19) + loading spinner (D-18)
- `src/components/habitat-canvas.tsx` — @pixi/react Application: extend() at module scope, Scene component loads atlases via Assets.load, VisibilityController pauses ticker (D-22)
- `src/app/(protected)/habitat/page.tsx` — Server component: fetches habitat state directly from DB, renders HabitatScene

## Decisions Made

- `ssr: false` must live inside a `"use client"` module per Next.js 16 docs — habitat-scene.tsx is the "use client" boundary, habitat-canvas.tsx is the actual canvas
- `Assets.load()` called inside the `<Application>` tree (in Scene component's useEffect), not before — avoids Pitfall 5 where PixiJS assets are loaded without a valid renderer context
- `extend()` called at module scope in habitat-canvas.tsx to register Container, Sprite, Graphics before any JSX renders
- habitat/page.tsx calls `getHabitatFacts()` and `computeHabitatState()` directly — consistent with dashboard pattern, avoids HTTP round-trip
- Placeholder PNGs generated programmatically with Node.js deflate — valid PNG format, real art only requires replacing PNG + JSON coordinates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing build failure on `/signup` due to missing `DEEPL_API_KEY` environment variable in the build environment — confirmed pre-existing (present before any changes in this plan). TypeScript compilation for new files passes with no errors. This is a deployment-time environment issue, not a code issue.

## Known Stubs

- `public/sprites/tiger.png` — Placeholder 512x512 solid orange PNG; real tiger sprite art will replace this
- `public/sprites/habitat.png` — Placeholder 64x64 solid green PNG; real habitat layer art will replace this
- The Scene component in habitat-canvas.tsx renders only the `tiger/happy.png` frame as a fixed placeholder — tiger mood selection, habitat layers, and full scene composition are planned for Phase 05 Plan 02

These stubs do not prevent the plan's goal (PixiJS rendering pipeline established, SSR safety verified, ticker control implemented).

## Next Phase Readiness

- PixiJS canvas pipeline established and type-safe — Plan 02 can add TigerSprite (mood-reactive) and HabitatLayers (level-based) components
- Sprite atlas naming conventions defined and locked (tiger/happy.png, layer-sky, etc.)
- /habitat page route exists and fetches live habitat state from DB
- The pre-existing build error on /signup (missing DEEPL_API_KEY env var) needs environment variables set before production deployment

## Self-Check: PASSED

All created files verified present. Commits e1e38bd and 02291fe verified in git log.

---
*Phase: 05-habitat-ui*
*Completed: 2026-03-28*
