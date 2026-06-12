# Phase 13: 3D Habitat — Specification

**Created:** 2026-05-20
**Ambiguity score:** 0.13 (gate: ≤ 0.20)
**Requirements:** 10 locked
**Locks taken:** D-26, D-27, D-28, D-29 (CONTEXT.md), + 9-level reconciliation (commit `fa5cbac`)

## Goal

Replace LeoCards' v1.0 PixiJS 2D habitat with the existing 3D habitat designs (Three.js POC code at `.planning/design/animations/`) ported into the Next.js codebase. All 9 habitat levels render as 3D scenes; tiger and milestone animals are 3D actors in the same scene; orbit-only camera; CWV "Good" perf gate maintained on both dashboard and `/habitat` page.

## Background

**Current state (v1.0, shipped 2026-04-15):**
- 2D habitat rendered with PixiJS 8.x: `habitat-scene.tsx`, `habitat-canvas.tsx`, `habitat-layers.tsx`, `habitat-widget-canvas.tsx`
- Placeholder 2D sprite atlases at `public/sprites/habitat.{png,json}` + `public/sprites/tiger.{png,json}`
- Renderer-agnostic habitat engine at `src/lib/habitat-engine.ts` (level computation, mood classification, decay model — all pure functions, stays unchanged)
- Habitat shown in two places: `<HabitatScene>` on `/habitat` (full page, 60-70% viewport) and `<HabitatWidget>` on the dashboard (80px mini)

**What changed 2026-05-20 to enable Phase 13:**
- Josh delivered production-ready 3D designs as Three.js POC code (`.planning/design/animations/`)
- Renderer locked: **plain Three.js 0.160.x** (NOT react-three-fiber; designer code imports `THREE.*` directly)
- 9-level system reconciled in code (`fa5cbac`): `LEVEL_THRESHOLDS` collapsed from 9 entries to 8; max level 10 → 9; level 9 = endgame at 230+ effective cards
- Camera orbit + auto-orbit-on-idle (D-26) already implemented in `habitats-shared.jsx`
- Soft Clay style chosen over lowpoly + voxel explorations

**Delta to deliver:** lift `habitats-shared.jsx` + `habitat-clay-styles.jsx` into the Next.js codebase as TypeScript modules, wire to `HabitatState.{level,mood,quality}`, replace the PixiJS components, and verify the perf gate.

## Requirements

### 1. **All 9 habitat levels render in 3D end-to-end**
- Current: `/habitat` page renders PixiJS 2D layers via `<HabitatCanvas>` / `<HabitatLayers>`. No 3D code in the codebase.
- Target: `/habitat` page renders a Three.js scene whose visible content matches `featuresForLevel(state.level)` for the user's current `HabitatState.level` (1-9).
- Acceptance: Manual verification — sign in as a test user, mutate `learnedCardCount` directly in Neon to land at effective-card-count values { 0, 5, 15, 30, 50, 80, 120, 170, 230 } in turn; reload `/habitat`; each visit shows the correct level's scene per the unlock table in `.planning/design/habitat-art-assets.md`.

### 2. **Renderer = plain Three.js 0.160.x, installed via npm + ESM**
- Current: no Three.js in `package.json`; designer artifacts use UMD CDN bundles + `@babel/standalone`.
- Target: `three@^0.160.x` added to `dependencies`; designer JSX ported to TypeScript modules using ESM imports; Babel-standalone is NOT shipped to production.
- Acceptance: `grep -r "babel/standalone" src/ public/` returns no matches; `npm ls three` shows the installed version; the production bundle contains Three.js as a dynamically-imported chunk, not inlined into the main bundle.

### 3. **Habitat engine binding — scene reads `HabitatState`, no other inputs**
- Current: `<HabitatScene>` accepts `habitatState: HabitatState` from the server (already correct).
- Target: the new 3D scene component accepts the same `HabitatState` and derives ALL visible state from it (`level`, `mood`, `quality`). No new props; no parallel state stores; no client-side fetches that aren't in v1.0.
- Acceptance: TypeScript compile + a focused unit test that mounts the new component with `HabitatState` fixtures at each level (1-9) and asserts the right feature flags are set on the scene root.

### 4. **Camera orbit per D-26 — no zoom, no pan, no tap-to-interact**
- Current: PixiJS scene has no camera (orthographic 2D); no orbit.
- Target: Three.js `PerspectiveCamera` with the orbit-only interaction model from `habitats-shared.jsx → attachOrbit()`. Mouse drag and touch swipe rotate the camera around the Y axis only. After 1.2s of no interaction, the camera auto-orbits at a slow rate (~0.12 rad/s). Pinch-zoom, scroll-wheel zoom, and right-click pan are explicitly disabled. Tap on any in-scene object does not trigger a behavior.
- Acceptance: Playwright spec that loads `/habitat`, asserts the camera transform after a drag is different from the initial transform; verifies no transform change on scroll wheel events; verifies no transform change on right-click drag.

### 5. **Keyboard equivalent for orbit (accessibility for D-26)**
- Current: designer code has mouse + touch orbit only; no keyboard.
- Target: when the `/habitat` page (or the mini-widget) has keyboard focus, the **Left** and **Right** arrow keys orbit the camera at the same `autoSpeed` as the auto-rotate (no acceleration). Holding the key continues to rotate; releasing stops.
- Acceptance: Playwright spec — focus the canvas, press ArrowRight, assert the camera transform changes; press ArrowRight again, assert further change.

### 6. **`prefers-reduced-motion` respected**
- Current: no `prefers-reduced-motion` handling in v1.0 habitat code.
- Target: when the browser reports `prefers-reduced-motion: reduce`, (a) auto-orbit is disabled (camera holds the initial position; user can still manually orbit), (b) ambient scene animations (clouds drifting, butterfly flight, water shimmer) are paused or frozen, (c) level-up celebration camera moves are replaced by an instant cut.
- Acceptance: Playwright spec sets `media: [{ name: "prefers-reduced-motion", value: "reduce" }]`, loads `/habitat`, waits 3 seconds, asserts the camera transform has not changed (no auto-orbit occurred).

### 7. **Mood + decay states drive visible scene differences**
- Current: PixiJS sprite swap per mood; decay = fade scenery elements (Phase 5 D-13).
- Target: the 3D scene reads `HabitatState.mood` and `HabitatState.quality` and renders a visibly distinct state for each of the 4 moods (`excited / happy / neutral / sad`) and at least 3 decay tiers (`quality === 1.0`, `0.40 ≤ quality < 1.0`, `quality < 0.40`).
- Acceptance: 28 reference screenshots committed under `e2e/__screenshots__/habitat-states/` — for one chosen level (recommend level 5 with the elephant for visual variety), 4 mood states × (3 decay tiers + the pristine 4-mood baseline) covering each combo, plus 4 mood-only states at quality=1.0. Each must be visibly distinct from its neighbors. Note: full 70-image coverage across all 9 levels is **out of scope for Phase 13**; just verify the binding logic at one level.

### 8. **Mini-widget on dashboard — perf-gated live 3D vs. cached image (D-28)**
- Current: 80px PixiJS canvas with mood-reactive tiger sprite + CSS progress bar.
- Target: as part of Phase 13, **measure** dashboard cold-load TTI and INP with a 80px Three.js canvas auto-orbiting the user's current level. If both metrics stay within CWV "Good" thresholds (LCP ≤ 2.5s, INP ≤ 200ms) on a representative mid-tier Android device, ship the live-3D widget. Otherwise, ship a pre-rendered hero image per level (9 images at `public/habitat/widget-l{1..9}.{webp,png}`, generated by a build-time script that mounts the scene and saves a screenshot).
- Acceptance: a measurement report committed at `.planning/phases/13-3d-habitat/13-WIDGET-PERF.md` showing the measured numbers and the decision; the implementation matches that decision; the dashboard Core Web Vitals are measured (Lighthouse run committed at same path) and pass CWV "Good".

### 9. **`/habitat` page and dashboard Core Web Vitals stay in "Good" tier**
- Current: v1.0 dashboard and `/habitat` page (assumed in Good tier; not formally measured in the audit trail).
- Target: after Phase 13 ships, both pages pass CWV "Good" thresholds on the same measurement methodology:
  - Largest Contentful Paint (LCP) ≤ **2.5s**
  - Interaction to Next Paint (INP) ≤ **200ms**
  - Cumulative Layout Shift (CLS) ≤ **0.1**
- Acceptance: Lighthouse run on the dashboard route and the `/habitat` route, results committed at `.planning/phases/13-3d-habitat/13-PERF.md`, all three thresholds met for both routes on a desktop AND a mobile emulation profile.

### 10. **v1.0 PixiJS habitat code removed (no dead 2D path)**
- Current: `src/components/habitat-canvas.tsx`, `habitat-layers.tsx`, `habitat-widget-canvas.tsx`, plus placeholder sprites at `public/sprites/{habitat,tiger}.{png,json}`.
- Target: those files deleted. The `<HabitatScene>` and `<HabitatWidget>` shells (which contain SSR-safe dynamic-import logic) are kept and rewired to the new 3D internals. PixiJS-related dependencies removed from `package.json`.
- Acceptance: `git status` shows the listed files deleted; `grep -rn "pixi" src/ package.json` returns no matches; the production bundle no longer contains PixiJS.

## Boundaries

**In scope:**
- All 9 levels rendering correctly in 3D from `HabitatState.level` (R1)
- npm-installed Three.js, no CDN UMD, no Babel-standalone in production (R2)
- Habitat-engine binding (level, mood, quality) (R3)
- Orbit-only camera with auto-orbit, keyboard support, reduced-motion respect (R4, R5, R6)
- Mood + decay state binding verified at one level (R7) — NOT the full 70-image matrix
- Mini-widget perf gate measurement + the gated implementation (R8)
- CWV "Good" gate on dashboard and `/habitat` (R9)
- Full PixiJS removal (R10)

**Out of scope:**
- **Course 2+** (additional habitat themes beyond Soft Clay savanna island) — explicitly deferred; revisit only after Course 1 ships and engagement data supports it
- **Full interactivity** (zoom, pan, tap-to-interact, drag-to-rotate-objects-in-scene) — rejected in D-26
- **Per-level visual-diff coverage across all 9 levels × 4 moods × 3 decay tiers** (~108 reference screenshots) — Phase 13 verifies binding logic at ONE level; broader regression coverage is its own follow-up phase if needed
- **Course 2 / Course 3 art** — not commissioned, not in scope
- **2D fallback tier for low-end devices** — assumed unnecessary; if D-28 measurement shows otherwise, we revisit, but Phase 13 does NOT pre-build a fallback
- **Storybook integration for the 3D scenes** — useful for designer iteration but not a Phase 13 deliverable
- **D-29 mid-phase A/B sketch checkpoint** — likely closed because the designer code already includes subtle character idle (walk/blink/ear-twitch). Phase 13 confirms with Josh on first port; if Josh confirms the existing idle is good, D-29 is closed. If Josh wants a fresh A/B, that becomes a mid-phase checkpoint per the original plan.
- **Designer asset polish iteration** — Josh said "production-ready"; the port assumes the existing visuals are final
- **Phase 12 (Pause cards) work** — Phase 13 is independent; sequencing recommendation deferred to planner

## Constraints

- **Renderer locked:** plain Three.js 0.160.x (no react-three-fiber, no Babylon, no Three.js major-version bump unless designer code requires it)
- **Asset source:** the JSX in `.planning/design/animations/` is the source of truth; if Phase 13 needs to deviate from what's there, it raises a checkpoint with Josh, not improvises
- **9-level system:** locked by `src/lib/habitat-engine.ts → LEVEL_THRESHOLDS` (commit `fa5cbac`); Phase 13 does NOT add a 10th level
- **Orbit-only camera:** locked by D-26; Phase 13 does NOT add zoom or pan even if it would feel nice
- **Mobile-first perf:** designer's `Q = isMobile ? 0.55 : 1` quality scaling is retained; Phase 13 may extend but not remove it
- **No new heavy dependencies:** Three.js is the budget. No drei, no three-stdlib unless a specific module is strictly necessary (called out + justified in the plan)
- **Database driver constraint carries forward:** Neon HTTP, no transactions — unchanged (Phase 13 doesn't touch the DB layer)

## Acceptance Criteria

- [ ] `npm ls three` shows version `^0.160.0` (or whatever 0.160.x the designer code requires)
- [ ] `grep -r "babel/standalone\|unpkg.com" src/ public/` returns no matches
- [ ] `grep -rn "pixi" src/ package.json` returns no matches
- [ ] Files deleted: `src/components/habitat-canvas.tsx`, `src/components/habitat-layers.tsx`, `src/components/habitat-widget-canvas.tsx`, `public/sprites/habitat.png`, `public/sprites/habitat.json`, `public/sprites/tiger.png`, `public/sprites/tiger.json`
- [ ] Files created: `src/lib/habitat-3d/scene-host.ts` (ported from `habitats-shared.jsx`), `src/lib/habitat-3d/clay-world.ts` + `src/lib/habitat-3d/clay-level.ts` (ported from `habitat-clay-styles.jsx`), `src/components/habitat-3d-canvas.tsx` (replaces `habitat-canvas.tsx`), `src/components/habitat-3d-widget-canvas.tsx` (replaces `habitat-widget-canvas.tsx`)
- [ ] Unit test: at each level 1-9, the scene root has the correct feature-flag composition per `featuresForLevel(level)`
- [ ] Playwright spec (`e2e/13-habitat-3d.spec.ts`): camera orbits on drag; no zoom on scroll wheel; no pan on right-drag; ArrowRight rotates the camera; `prefers-reduced-motion: reduce` halts auto-orbit
- [ ] 28 reference screenshots at one level capturing mood + decay state diffs, committed under `e2e/__screenshots__/habitat-states/`
- [ ] `.planning/phases/13-3d-habitat/13-WIDGET-PERF.md` exists with measured TTI + INP numbers and the live-vs-cached decision
- [ ] `.planning/phases/13-3d-habitat/13-PERF.md` exists with Lighthouse reports for dashboard + `/habitat`, all three CWV "Good" thresholds met on both routes (desktop + mobile emulation)
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean (biome)
- [ ] `npm run test` shows all unit tests green
- [ ] `npm run test:e2e` shows the new Phase 13 spec passing along with the existing suite (no regressions)

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.92 | 0.75 | ✓ | "Port designs → production; all 9 levels in 3D" — concrete and measurable |
| Boundary Clarity   | 0.85 | 0.70 | ✓ | Explicit out-of-scope list (Course 2+, full interactivity, broader regression coverage, fallback tier, D-29 sketch) |
| Constraint Clarity | 0.82 | 0.65 | ✓ | Renderer locked, level count locked, CWV "Good" thresholds explicit, no new heavy deps |
| Acceptance Criteria| 0.88 | 0.70 | ✓ | 14 checkbox criteria, each pass/fail; grep + file existence + Lighthouse numbers |
| **Ambiguity**      | **0.13** | ≤0.20 | ✓ | Comfortably below gate |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective    | Question summary | Decision locked |
|-------|----------------|------------------|-----------------|
| 1 | Researcher | If only ONE level shipped in 3D, would Phase 13 be done? | **All 9 must ship in 3D** — no partial release |
| 1 | Simplifier | What's the hard "do not regress" perf threshold? | **CWV "Good" thresholds** (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) on dashboard + `/habitat` |
| 2 | Boundary Keeper | How should mood + decay states be verified? | **Visual diff** with reference screenshots — **but scoped to one level for Phase 13**, not all 9 |
| 2 | Failure Analyst | How does the D-29 tiger-idle A/B checkpoint resolve? | **Defer to mid-phase** (but likely closed by existing designer code; Phase 13 to confirm with Josh) |
| Mid | Discovery | What do the Claude.ai designs actually contain? | **Three.js JSX (not glTF); 9 levels (not 10); plain Three.js (not r3f); Soft Clay style locked** — engine reconciled in commit `fa5cbac`; SPEC rewritten against the artifacts |

## Locks Carried From Discuss-Phase

These are NOT re-decided — they came from `13-CONTEXT.md` and remain binding:

- **D-26** Orbit-only camera around an island; no zoom, no pan, no tap-to-interact
- **D-27** 9 designer islands = content reference; structure is single base scene + feature-flag additive (resolved post-artifact)
- **D-28** Mini-widget target = live 3D; fallback = cached image gated on measurement
- **D-29** Tiger idle = mid-phase checkpoint OR closed if existing designer code suffices

Plus Phase 5 D-01, D-03, D-04, D-05, D-06, D-07, D-08, D-10, D-12, D-14, D-15, D-17, D-18, D-19, D-20, D-21, D-22, D-23, D-24 — all carry forward.

---

*Phase: 13-3d-habitat*
*Spec created: 2026-05-20*
*Next step: `/gsd-plan-phase 13` — planner breaks Phase 13 into plans grounded in the locked requirements above*
