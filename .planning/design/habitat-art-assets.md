# Habitat Art Assets — Course 1 (3D, Levels 1-9)

**Status:** Designer artifacts delivered (Claude Design / Three.js POC code at `.planning/design/animations/`); production integration deferred to Phase 13
**Last updated:** 2026-05-20 (3D pivot + 9-level reconciliation)
**Owner:** Josh
**Phase:** 13 (`.planning/ROADMAP.md → Phase 13: 3D habitat`)

The habitat progresses through **9 visual states** tied to effective-card count. Designer has delivered working Three.js POC code for all 9 levels in `.planning/design/animations/`. Level 9 is the endgame state for Course 1 — songbirds + golden-hour sky.

## Visual Progression — Levels 1 → 9

Threshold map (from `src/lib/habitat-engine.ts → LEVEL_THRESHOLDS`):

| Level | Effective cards | Unlock | Source (designer code) |
|------:|----------------:|:-------|:-----------------------|
| 1 | 0 (starting) | Just Leo on the mound | `habitat-clay-styles.jsx → featuresForLevel(1)` |
| 2 | 5 | Lake + lilies + path | `featuresForLevel(2)` |
| 3 | 15 | Trees + rocks | `featuresForLevel(3)` |
| 4 | 30 | Flowers + grass + butterflies | `featuresForLevel(4)` |
| 5 | 50 | Elephant companion | `featuresForLevel(5)` + `LEVEL_CONFIG.showElephant` |
| 6 | 80 | Mushrooms | `featuresForLevel(6)` |
| 7 | 120 | Cave + sleep cycle starts | `featuresForLevel(7)` |
| 8 | 170 | Toys | `featuresForLevel(8)` |
| **9** | **230** | **Endgame — Songbirds + golden-hour sky** | `featuresForLevel(9)` (note: sky variant flag in `worldOpts.sky`) |

Source of truth: `src/lib/habitat-engine.ts → LEVEL_THRESHOLDS` (8 entries gating levels 2-9, `Math.min(9, level)` cap). `featuresForLevel()` in the designer's `habitat-clay-styles.jsx` defines unlock content by level number; this mapping is the canonical contract Phase 13 carries forward.

## What the Designer Delivered

`.planning/design/animations/` contains:

| File | Size | Role |
|------|------|------|
| `Leo Habitat - All 9 Levels (Final v2).html` | 6.6 KB | **Canonical entry point.** Loads the 4 JSX files via Babel-standalone CDN. |
| `habitats-shared.jsx` | 12 KB | Scene scaffolding: WebGLRenderer setup, hand-rolled orbit camera, animation loop. |
| `habitat-clay-styles.jsx` | **92 KB** | **The main file.** All 9 level definitions, feature flags, animation logic, lighting, Soft Clay palette. Exposes `ClayHabitatLevel({ level, tweaks, companionMode, variant })`. |
| `design-canvas.jsx` | 50 KB | Figma-style artboard wrapper for in-browser design review (not production code). |
| `tweaks-panel.jsx` | 26 KB | Live tweaks UI for designer iteration (not production code). |
| `habitat-clay.jsx` | 29 KB | Earlier clay iteration (superseded by `-styles.jsx`). |
| `habitat-clay-v1.jsx` | 10 KB | First clay iteration (superseded). |
| `habitat-lowpoly.jsx` | 9 KB | Alternative style exploration (not chosen). |
| `habitat-voxel.jsx` | 9 KB | Alternative style exploration (not chosen). |
| `uploads/*.png` | — | Designer reference images. |

The Phase 13 production code lifts from **`habitats-shared.jsx` + `habitat-clay-styles.jsx`** specifically. The other JSX files are explorations or wrappers, not assets to port.

## Tech Stack — Locked by the Artifacts

**Renderer:** Plain **Three.js 0.160.0** — confirmed by `habitats-shared.jsx` which imports `THREE.WebGLRenderer`, `THREE.PerspectiveCamera`, etc. directly. **NOT** react-three-fiber. This collapses the "renderer choice" question from Phase 13's open items — there is no choice; Three.js is locked.

**Why this is good news for integration:**
- Three.js is well-supported by Next.js (dynamic import + `ssr: false`, same SSR pattern v1.0 uses for PixiJS)
- No additional framework abstraction layer to maintain (react-three-fiber would add @react-three/* dependencies)
- Designer's code ports nearly 1:1 — wrap in a React component, swap `useEffect` for `useEffect` (it's already there), wire `HabitatState.level` to the `level` prop on `<ClayHabitatLevel>`

**What still needs conversion:**
- CDN UMD bundles (`unpkg.com/three@0.160.0/build/three.min.js`) → npm install `three` + ESM imports
- `@babel/standalone` in-browser transpilation → use the project's existing Next.js/SWC pipeline
- Direct THREE manipulations on a canvas ref → standard React component lifecycle with proper cleanup
- `TWEAK_DEFAULTS` global object → React props or a settings context
- `ALL_UNLOCKS` array (in the HTML) → derive from `src/lib/habitat-engine.ts → LEVEL_THRESHOLDS` to keep one source of truth

## Camera = Orbit (matches D-26)

Verified: `habitats-shared.jsx → attachOrbit()` implements exactly D-26:

- **Azimuthal orbit** (theta around Y axis): drag rotates; theta only, phi locked
- **No zoom, no pan**: radius `r3d` is set once at init; never changes
- **Auto-orbit on idle**: after `idleDelay` (default 1.2s of no interaction), camera auto-rotates at `autoSpeed` (0.12 rad/s)
- **Touch + mouse support**: built in

D-26's "keyboard equivalent for accessibility" still needs adding — the designer's orbit handles mouse + touch but not arrow keys. Phase 13 task.

## What's Already Built (Designer Code Verified)

From reading `habitat-clay-styles.jsx`:

- ✓ All 9 level definitions via `featuresForLevel(level)` (feature-flag additive — matches D-09 in code)
- ✓ Soft Clay color palette (named `CLAY` dictionary) — locked stylistic direction
- ✓ Toon-grad shading (`_toonGrad()`) — cute cartoon style (D-01 satisfied)
- ✓ Deterministic RNG (`_mulberry32`) — same geometry across rebuilds
- ✓ Mobile quality scaling (`Q = isMobile ? 0.55 : 1`) — designer thought about perf
- ✓ Sleep cycle for level 7+ (`napDemo` tweak; `walkSpeed` controls Leo's motion)
- ✓ Sky variants (`worldOpts.sky` — golden-hour for level 9)
- ✓ Companion modes (`companionMode` prop)
- ✓ Variant prop for style A/B testing

## What's NOT in the Designer Code (Phase 13 tasks)

- Wiring to `HabitatState.level` from `habitat-engine.ts`
- Wiring to `HabitatState.mood` for tiger mood transitions (D-06: bounce up, crossfade down)
- Wiring to `HabitatState.quality` for decay visual (D-13)
- Milestone-animal entrance animations (separate from level unlocks per Phase 6 design)
- Sparkle particles for "excited" mood (D-07)
- Level-up celebration camera move + scale pop (D-20)
- localStorage cache for offline (D-24) — currently the v1.0 PixiJS version handles this
- `prefers-reduced-motion` respect — neither v1.0 nor designer code handles this yet
- Mini-widget (D-28): live 3D at 80px or cached image fallback
- Keyboard equivalent for orbit (accessibility, D-26 follow-up)
- Production bundler integration (npm `three` + ESM)

## D-29 Tiger Idle — Designer Already Made a Call

The designer's `habitat-clay-styles.jsx` includes character animation logic (`walkSpeed`, ear twitch, blink intervals — searched via grep). That means the **D-29 A/B checkpoint may already be resolved** — Josh said "production-ready" and the code already has subtle idle behavior baked in. Phase 13 should:

1. **Confirm Josh is happy with the existing idle behavior in the designer code** before planning a separate A/B sketch
2. If yes: D-29 is closed, "subtle skeletal idle" wins, drop the planned mid-phase checkpoint
3. If no: A/B checkpoint stands as originally specced

## Wiring Checklist for Phase 13

When implementation kicks off:

1. **Install** `three` 0.160.x via npm; remove the CDN UMD reference
2. **Create** `src/lib/habitat-3d/` directory; port `habitats-shared.jsx` → `src/lib/habitat-3d/scene-host.ts`
3. **Port** `habitat-clay-styles.jsx` → `src/lib/habitat-3d/clay-world.ts` + `src/lib/habitat-3d/clay-level.ts`
4. **Component** `<ClayHabitatLevel level={state.level} mood={state.mood} quality={state.quality} />` — replaces `<HabitatScene>` PixiJS internals; same `dynamic({ ssr: false })` pattern as v1.0
5. **Mini widget** (`<HabitatWidgetCanvas>`): use same wrapper; pass `widget={true}` prop to enable auto-orbit, smaller renderer size; perf-measure (D-28 gate) before locking live vs. cached
6. **Mood wiring**: tap into existing `walkSpeed` + new animation channels for the 4 moods (excited / happy / neutral / sad) — D-06 transitions
7. **Decay wiring**: dim materials / fade scenery elements as `quality` drops below 1.0 — matches v1.0 D-13
8. **Accessibility**: add arrow-key orbit + `prefers-reduced-motion` handling (freeze auto-orbit, skip celebratory camera moves)
9. **Remove** v1.0 PixiJS habitat code: `habitat-canvas.tsx`, `habitat-layers.tsx`, `habitat-widget-canvas.tsx`, `public/sprites/habitat.{png,json}`, `public/sprites/tiger.{png,json}`
10. **Move** `Visual style is cute 3D illustrated habitats` from PROJECT.md `Active` to `Validated` on ship

## Tracking

- Active requirement: `Visual style is cute 3D illustrated habitats` — `PROJECT.md → Active` (updated 2026-05-20: 2D → 3D; 10 → 9 levels)
- v1.0 tech debt: `Placeholder sprite assets` — superseded by Phase 13 (full pipeline migration)
- Phase 13 roadmap entry: `.planning/ROADMAP.md → Phase 13: 3D habitat`
- Phase 13 CONTEXT: `.planning/phases/13-3d-habitat/13-CONTEXT.md` (decisions D-26..D-29)
- Designer source code: `.planning/design/animations/`
- Future scope ("Course 2+"): explicitly **not** a current requirement; revisit only after Course 1 ships.

## Pre-Phase-13 prep (designer)

Most prep is already done — the artifacts are in-repo. Remaining:

- Confirm whether the in-code idle behavior (`walkSpeed`, blink/ear-twitch timing) is the final answer for D-29, or whether a formal A/B checkpoint is still desired
- If milestone animals need to enter the scene over time (not just be present at their unlock level), confirm intended entrance animations
- For decay visuals: confirm intended look at quality < 1.0 (the designer code doesn't currently implement decay — that's Phase 13 implementation work)
