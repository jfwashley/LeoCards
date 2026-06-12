---
phase: 05-habitat-ui
verified: 2026-03-28T14:58:00Z
status: gaps_found
score: 11/13 must-haves verified
gaps:
  - truth: "Dashboard shows a mini habitat widget with the tiger and a progress bar toward next level"
    status: partial
    reason: "Widget canvas requests 'tiger/excited.png' but atlas only has 'tiger/excited/01.png' and 'tiger/excited/02.png'. When mood is excited the tiger sprite silently vanishes from the widget — texture lookup returns undefined and the null-guard bails."
    artifacts:
      - path: "src/components/habitat-widget-canvas.tsx"
        issue: "MOOD_TEXTURE map at line 13 has excited: 'tiger/excited.png' — this frame does not exist in public/sprites/tiger.json. Valid key is 'tiger/excited/01.png'."
    missing:
      - "Fix MOOD_TEXTURE in habitat-widget-canvas.tsx: change excited: 'tiger/excited.png' to excited: 'tiger/excited/01.png'"
human_verification:
  - test: "Navigate to /habitat in a browser with a logged-in account"
    expected: "PixiJS canvas renders at 16:9 aspect ratio up to 70vh, tiger sprite visible at a random horizontal position, habitat background layers render, level badge shows in top-left, mood indicator shows in top-right"
    why_human: "PixiJS WebGL rendering cannot be verified programmatically — visual output requires a real browser"
  - test: "Open /habitat, switch to another browser tab, switch back"
    expected: "No console errors, canvas continues rendering normally after returning — ticker pause/resume works"
    why_human: "Visibility API behavior requires a real browser with tab switching"
  - test: "Open /habitat, refresh three or more times"
    expected: "Tiger appears at different horizontal positions (center, left, or right) and sometimes faces different directions across refreshes"
    why_human: "Random positioning requires visual observation over multiple loads"
  - test: "Open DevTools Network, throttle to Offline, navigate to /habitat and trigger retry"
    expected: "Offline banner 'You're offline — showing last known state' appears if cache exists; error card 'Something went wrong' with 'Try again' button appears if no cache"
    why_human: "Network throttling and offline state require browser DevTools interaction"
  - test: "On the dashboard, verify the mini habitat widget"
    expected: "Widget card appears with an 80px PixiJS canvas showing a small tiger, progress bar below showing 'Level N' and 'X/Y cards', entire card is a clickable link to /habitat"
    why_human: "Visual widget rendering and click navigation require a real browser"
---

# Phase 5: Habitat UI Verification Report

**Phase Goal:** Users can see their tiger and his habitat rendered and animated in the browser — mood state visible, habitat background matching progression level, scene performance acceptable on mid-range devices.
**Verified:** 2026-03-28T14:58:00Z
**Status:** gaps_found (1 defect, 5 items require human visual verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths are organized by which plan introduced them.

#### Plan 01 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PixiJS canvas renders inside the /habitat page without SSR crash | ✓ VERIFIED | `habitat-scene.tsx` line 1 `"use client"` + `dynamic(..., { ssr: false })` at line 42; `habitat/page.tsx` is a server component with no `"use client"` |
| 2 | Placeholder sprites load via Assets.load and display on canvas | ✓ VERIFIED | `habitat-canvas.tsx` lines 55-67: `Assets.load<Spritesheet>` for both atlases inside `useEffect` inside `<Application>` tree; both JSON atlas files present and valid |
| 3 | PixiJS ticker pauses when browser tab is hidden | ✓ VERIFIED | `habitat-canvas.tsx` lines 18-36: `VisibilityController` uses `useApplication()`, adds `visibilitychange` listener, calls `app.ticker.stop()` / `app.ticker.start()` |

#### Plan 02 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 4 | Tiger sprite displays the correct mood pose matching engine output | ✓ VERIFIED | `tiger-sprite.tsx`: `getMoodTexture()` maps all 4 moods to correct atlas frames; `pixiSprite` renders `currentTexture`; wired in `habitat-canvas.tsx` line 91-96 |
| 5 | Tiger appears at one of 3 random positions with random facing direction | ✓ VERIFIED | `tiger-sprite.tsx` lines 62-63: `useState(() => getTigerPosition())` and `useState(() => getTigerFacing())`; `TIGER_POSITIONS = [{x:0.5},{x:0.3},{x:0.75}]` in utils |
| 6 | Happier mood transitions use a bounce animation; sadder use crossfade | ✓ VERIFIED | `tiger-sprite.tsx` lines 92-127: `getMoodTransitionType` drives `setIsBouncing` / `setIsCrossfading`; `BounceAnimator` and `CrossfadeAnimator` run `useTick` with `useCallback` |
| 7 | Excited mood shows sparkle particles around the tiger | ✓ VERIFIED | `sparkle-particles.tsx`: 10 orange (`0xF97316`) particles with `useTick` animation; wired in `habitat-canvas.tsx` line 99-103 with `active={habitatState.mood === "excited"}` |
| 8 | Habitat background layers increase additively as level rises from 1 to 10 | ✓ VERIFIED | `habitat-layers.tsx`: calls `getLayersForLevel(level)`; `habitat-ui-utils.ts`: level 1 = 4 layers, level 10 = 13 layers; 28 unit tests all pass |
| 9 | Decaying habitat shows faded layers proportional to quality drop | ✓ VERIFIED | `habitat-layers.tsx` lines 97-110: base layers always alpha 1.0; level-added layers apply `getDecayAlpha(quality)` with resilience gradient |

#### Plan 03 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 10 | Dashboard shows a mini habitat widget with the tiger and a progress bar | ✗ PARTIAL | Widget exists, wired, progress bar correct — but `habitat-widget-canvas.tsx` line 13 has `excited: "tiger/excited.png"` which does not exist in the atlas (only `"tiger/excited/01.png"` exists). Tiger vanishes silently when mood is excited. |
| 11 | Clicking the mini widget navigates to /habitat | ✓ VERIFIED | `habitat-widget.tsx` line 53: `<Link href="/habitat" className="block">` wraps entire `<Card>` |
| 12 | Error state shows a retry button when /api/habitat fails | ✓ VERIFIED | `habitat-scene.tsx` lines 145-158: error branch renders "Something went wrong" + "We couldn't load your habitat" + `<Button onClick={retry}>Try again</Button>` |
| 13 | Offline state shows last cached habitat data with an offline indicator | ✓ VERIFIED | `habitat-scene.tsx` lines 9-10 (`CACHE_KEY`), lines 95-101 (`localStorage.setItem`), lines 130-138 (`localStorage.getItem` fallback in retry), lines 176-185 ("You're offline — showing last known state" banner) |

**Score:** 12/13 truths verified (1 partial)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/habitat-scene.tsx` | SSR-safe dynamic wrapper with `ssr: false` | ✓ VERIFIED | 204 lines; `"use client"` line 1; `ssr: false` line 45; `motion/react` line 5; all error/offline/level-up states present |
| `src/components/habitat-canvas.tsx` | @pixi/react Application with `extend()` and scene skeleton | ✓ VERIFIED | 154 lines; `extend({ Container, Sprite, Graphics })` at module scope line 14; `Assets.load` in `useEffect`; `VisibilityController` present |
| `src/app/(protected)/habitat/page.tsx` | Server component shell fetching habitat state | ✓ VERIFIED | 24 lines; imports `getHabitatFacts`; calls `computeHabitatState`; no `"use client"` |
| `public/sprites/tiger.json` | Tiger sprite atlas with `tiger/happy.png` | ✓ VERIFIED | Valid PixiJS spritesheet JSON; all 5 frames present including `tiger/excited/01.png` and `tiger/excited/02.png` |
| `public/sprites/habitat.json` | Habitat layer atlas with `layer-sky` | ✓ VERIFIED | 13 frames from `layer-sky` through `layer-water-2`; correct 960x540 dimensions |
| `src/components/tiger-sprite.tsx` | Tiger sprite with mood-to-texture mapping, random position | ✓ VERIFIED | 209 lines; imports `getMoodTransitionType`, `getTigerPosition`, `getTigerFacing`; `pixiSprite` JSX; `useCallback` on tick handlers |
| `src/components/habitat-layers.tsx` | Level-gated additive background layers with `LEVEL_LAYERS` | ✓ VERIFIED | 128 lines; `LEVEL_LAYERS` constant exported; imports `getLayersForLevel`, `getDecayAlpha`; parallax `mousemove` listener |
| `src/components/sparkle-particles.tsx` | Sparkle particle effect referencing `excited` | ✓ VERIFIED | 131 lines; `ORANGE_COLOR = 0xF97316`; `useTick(onTick)` with `useCallback`; `active` prop gates rendering |
| `src/lib/habitat-ui-utils.ts` | Pure functions for mood transitions, layers, decay | ✓ VERIFIED | 138 lines; exports `getMoodTransitionType`, `getLayersForLevel`, `getDecayAlpha`, `getTigerPosition`, `getTigerFacing`, `TIGER_POSITIONS` |
| `src/lib/__tests__/habitat-ui-utils.test.ts` | Unit tests for habitat UI pure logic | ✓ VERIFIED | 173 lines; 28 tests, all passing (vitest run confirmed) |
| `src/components/habitat-widget.tsx` | SSR-safe wrapper with progress bar and `/habitat` link | ✓ VERIFIED | 77 lines; `ssr: false`; `<Link href="/habitat">`; progress bar with `bg-primary`; `Level {level}` text |
| `src/components/habitat-widget-canvas.tsx` | Small PixiJS canvas showing tiger thumbnail | ✗ STUB (partial) | 65 lines; `extend(...)` at module scope; `height: "80px"`; BUT `MOOD_TEXTURE.excited = "tiger/excited.png"` is an invalid atlas key — texture is `undefined` at runtime, tiger invisible when excited |
| `src/app/(protected)/dashboard/page.tsx` | Dashboard page with `HabitatWidget` integration | ✓ VERIFIED | Imports `computeHabitatState`, `getHabitatFacts`; `habitatState` computed server-side; `HabitatWidget` rendered in both `decks.length === 0` and deck view paths |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `habitat/page.tsx` | `habitat-scene.tsx` | `import and render HabitatScene` | ✓ WIRED | `import { HabitatScene }` line 5; `<HabitatScene habitatState={habitatState} />` line 21 |
| `habitat-scene.tsx` | `habitat-canvas.tsx` | `next/dynamic with ssr: false` | ✓ WIRED | `dynamic(() => import("@/components/habitat-canvas"), { ssr: false, ... })` lines 42-48 |
| `habitat-canvas.tsx` | `public/sprites/tiger.json` | `Assets.load` | ✓ WIRED | `Assets.load<Spritesheet>("/sprites/tiger.json")` line 56 |

#### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `habitat-canvas.tsx` | `tiger-sprite.tsx` | renders `TigerSprite` | ✓ WIRED | `import { TigerSprite }` line 7; `<TigerSprite mood={habitatState.mood} ...>` lines 91-96 |
| `habitat-canvas.tsx` | `habitat-layers.tsx` | renders `HabitatLayers` | ✓ WIRED | `import { HabitatLayers }` line 8; `<HabitatLayers level={habitatState.level} ...>` lines 82-88 |
| `tiger-sprite.tsx` | `habitat-ui-utils.ts` | imports `getMoodTransitionType` | ✓ WIRED | `import { getMoodTransitionType, getTigerFacing, getTigerPosition }` line 6 |
| `habitat-layers.tsx` | `habitat-ui-utils.ts` | imports `getLayersForLevel` | ✓ WIRED | `import { getDecayAlpha, getLayersForLevel }` line 5 |

#### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dashboard/page.tsx` | `habitat-widget.tsx` | import and render `HabitatWidget` | ✓ WIRED | `import { HabitatWidget }` line 13; rendered in both code paths (lines 39 and 107) |
| `habitat-widget.tsx` | `habitat-widget-canvas.tsx` | `next/dynamic with ssr: false` | ✓ WIRED | `dynamic(() => import("@/components/habitat-widget-canvas"), { ssr: false, ... })` lines 10-18 |
| `habitat-widget.tsx` | `/habitat` | `Next.js Link wrapping the entire card` | ✓ WIRED | `<Link href="/habitat" className="block">` line 53 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `habitat/page.tsx` | `habitatState` | `getHabitatFacts(session.user.id)` → `computeHabitatState(facts, new Date())` | Yes — DB query via `habitat-queries.ts` | ✓ FLOWING |
| `dashboard/page.tsx` | `habitatState` | `getHabitatFacts(session.user.id as UserId)` in `Promise.all`, then `computeHabitatState` | Yes — same DB query pattern | ✓ FLOWING |
| `habitat-canvas.tsx` | `tigerSheet`, `habitatSheet` | `Assets.load("/sprites/tiger.json")` + `Assets.load("/sprites/habitat.json")` | Yes — real sprite atlases on disk | ✓ FLOWING |
| `habitat-widget-canvas.tsx` | `texture` | `Assets.load("/sprites/tiger.json")` → `tigerSheet.textures[MOOD_TEXTURE[mood]]` | Partial — returns `undefined` when `mood === "excited"` (key mismatch) | ⚠️ HOLLOW for excited mood |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit tests pass (pure logic) | `npx vitest run src/lib/__tests__/habitat-ui-utils.test.ts` | 28 tests passed, 0 failed | ✓ PASS |
| Next.js TypeScript compilation | `npx next build` (compilation phase) | `Compiled successfully in 8.2s` | ✓ PASS |
| Build data collection | `npx next build` (page data phase) | Fails on `DEEPL_API_KEY` missing from `.env.local` — pre-existing env gap unrelated to Phase 05 | ? SKIP (env issue predates this phase) |
| Atlas JSON valid for tiger | tiger.json contains `tiger/happy.png`, `tiger/neutral.png`, `tiger/sad.png`, `tiger/excited/01.png` | All frames confirmed | ✓ PASS |
| Atlas JSON valid for habitat | habitat.json contains all 13 layer frames | All 13 frames (`layer-sky` through `layer-water-2`) confirmed | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| HAB-02 | 05-01, 05-02, 05-03 | Tiger displays different mood states (happy, neutral, sad) based on recent activity | ✓ SATISFIED | `tiger-sprite.tsx`: mood-to-texture mapping; `habitat-scene.tsx`: mood indicator overlay; `habitat-engine.ts` mood flows through `computeHabitatState` to UI |
| HAB-03 | 05-01, 05-02, 05-03 | Habitat environment gradually improves as total learned cards increase | ✓ SATISFIED | `habitat-layers.tsx` + `habitat-ui-utils.ts`: level 1 = 4 layers, level 10 = 13 layers; `habitat-widget.tsx` progress bar shows `learnedCardCount / nextLevelThreshold` |

Both phase requirements are satisfied. No orphaned requirements found — REQUIREMENTS.md traceability table maps only HAB-02 and HAB-03 to Phase 5.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/habitat-widget-canvas.tsx` | 13 | `excited: "tiger/excited.png"` — atlas frame does not exist; only `"tiger/excited/01.png"` is defined | ⚠️ Warning | Tiger sprite is invisible in the widget when mood is `excited`. The `if (!texture) return null` guard silently hides the tiger rather than erroring, making this easy to miss. |

No TODO/FIXME/placeholder comments found in phase files. No empty handler stubs. No hardcoded empty arrays/objects flowing to rendering.

**Note on build failure:** The `DEEPL_API_KEY` missing from `.env.local` causes `next build` to fail at page data collection, but TypeScript compilation succeeds cleanly. This env gap predates Phase 05 (it affects `/login` and `/_not-found` routes, not any habitat route) and is not a Phase 05 artifact.

---

### Human Verification Required

#### 1. Full habitat scene rendering

**Test:** Log in, navigate to `/habitat`
**Expected:** PixiJS canvas fills the page width at 16:9 aspect ratio (max 70vh height), tiger sprite is visible at one of 3 positions, background layers are visible, level badge appears top-left, mood indicator appears top-right with colored dot
**Why human:** WebGL/Canvas rendering output cannot be verified programmatically

#### 2. Tab visibility ticker pause

**Test:** Open `/habitat`, switch to another tab for several seconds, switch back
**Expected:** Canvas continues rendering normally after returning; no console errors about stopped tickers
**Why human:** Browser Visibility API behavior requires real tab interaction

#### 3. Tiger position randomization

**Test:** Refresh `/habitat` three or more times in succession
**Expected:** Tiger appears at visibly different horizontal positions (left ~30%, center ~50%, right ~75%) across refreshes; facing direction also varies
**Why human:** Random positioning requires visual observation over multiple loads

#### 4. Dashboard mini widget

**Test:** Navigate to the dashboard while logged in
**Expected:** A card with an 80px PixiJS canvas showing a small tiger, a progress bar with "Level N" label and "X/Y cards" count, entire card clickable and navigates to `/habitat`
**Why human:** Visual widget rendering and click navigation require a real browser

#### 5. Offline/error state behavior

**Test:** Open DevTools Network tab, set to Offline, navigate to `/habitat`, click "Try again"
**Expected:** If localStorage cache exists: "You're offline — showing last known state" banner appears; if no cache: "Something went wrong" card with "Try again" button
**Why human:** Network throttling requires browser DevTools interaction

---

### Gaps Summary

**One code defect found:**

`src/components/habitat-widget-canvas.tsx` line 13 uses the texture key `"tiger/excited.png"` which does not exist in `public/sprites/tiger.json`. The atlas defines `"tiger/excited/01.png"` and `"tiger/excited/02.png"` for the excited animation frames. When `mood === "excited"`, `tigerSheet.textures["tiger/excited.png"]` returns `undefined`, the null check at line 36-37 (`if (!texture) return null`) fires, and the tiger sprite is not rendered in the dashboard mini widget. The fix is a single-character path correction.

**Five items require human visual verification** (standard for a WebGL/Canvas rendering phase — cannot be automated).

**Pre-existing environment gap (not a Phase 05 issue):** `DEEPL_API_KEY` is not set in `.env.local`, causing `next build` page-data collection to fail. This affects translation routes from Phase 2 and is unrelated to the habitat UI work.

---

_Verified: 2026-03-28T14:58:00Z_
_Verifier: Claude (gsd-verifier)_
