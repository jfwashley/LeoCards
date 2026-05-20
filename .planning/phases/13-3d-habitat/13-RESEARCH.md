# Phase 13: 3D Habitat — Research

**Researched:** 2026-05-20
**Domain:** Three.js 0.160 migration into Next.js 16 + React 19 app; designer-JSX-to-TypeScript port; PixiJS removal
**Confidence:** HIGH on porting plan and integration shape; MEDIUM on perf gate methodology and decay strategy (no measurement yet, decay not in designer code)

## Summary

The designer artifacts at `.planning/design/animations/habitat-clay-styles.jsx` are already a near-1:1 port target for the Next.js codebase: the JSX file defines a single React component, `ClayHabitatLevel({ width, height, level, tweaks, companionMode, variant })`, that accepts the exact inputs Phase 13 needs to wire to `HabitatState.{level,mood,quality}`. The biggest porting challenges are (a) lifting `THREE.*` and `React.*` from CDN globals to ESM imports, (b) replacing the in-browser `<HabitatCanvas>` React wrapper from `habitats-shared.jsx` with the existing v1.0 `<HabitatScene>` / `<HabitatWidget>` shells that already do `dynamic({ ssr: false })`, and (c) implementing the bits the designer code does NOT yet have: mood-driven character animation channels, decay visuals (`quality < 1.0`), `prefers-reduced-motion` respect, and keyboard orbit.

The renderer choice and code-split point are already proven by v1.0 (PixiJS uses the same `dynamic({ ssr:false })` pattern verified for Next.js 16 in `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`). Three.js 0.160 is a 6-release-old pin (latest is 0.184 [VERIFIED: `npm view three version` returned `0.184.0`]); the SPEC locks 0.160 because the designer wrote against it, and there is no upgrade pressure inside Phase 13. The v1.0 PixiJS surface is larger than the SPEC's named-file list — 6 PixiJS files exist in `src/components/`, not 3 — flagged below.

**Primary recommendation:** Break Phase 13 into 6 sequential plans: (1) ESM port of scene scaffolding, (2) ESM port of clay world + character builders, (3) React shell rewire (`<HabitatScene>` + `<HabitatWidget>` internals), (4) Mood + decay binding to `HabitatState`, (5) Accessibility (reduced-motion + keyboard orbit), (6) Mini-widget perf gate (D-28) + CWV verification + PixiJS removal. Phase 12 (Pause cards) ships first because it's smaller, independent, and de-risks the schedule before this larger migration.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-26** Orbit-only camera around an island; no zoom, no pan, no tap-to-interact. Azimuthal orbit (Y axis); auto-orbit after 1.2s idle at ~0.12 rad/s. Keyboard + touch equivalents required for accessibility.
- **D-27** 9 designer islands = content reference; structure is **single base scene + feature-flag additive** (resolved by artifact inspection — `featuresForLevel(level)` already implements this in `habitat-clay-styles.jsx:2229`). Hard CWV "Good" gate on dashboard + `/habitat`.
- **D-28** Mini-widget target = live 3D at 80px, auto-orbit, mood-reactive. **Fallback = cached pre-rendered hero image per level** if measurement shows CWV "Good" cannot be held. Researcher MUST measure before locking the branch.
- **D-29** Tiger idle behavior = mid-phase A/B checkpoint OR closed if existing designer code (walk/blink/ear-twitch already implemented) is judged sufficient. See section I below — recommendation: **close D-29; existing idle is rich enough.**

Plus Phase 5: D-01, D-03, D-04, D-05, D-06, D-07, D-08, D-10, D-12, D-14, D-15, D-17, D-18, D-19, D-20, D-21, D-22, D-23, D-24 all carry forward unchanged.

### Claude's Discretion

- Module boundaries inside `src/lib/habitat-3d/` (file count and split — recommended below)
- Exact decay-rendering technique (Three.js material APIs — proposal in section C)
- Reduced-motion implementation hook (React `useEffect` + `matchMedia` standard pattern — proposed in section D)
- Keyboard orbit key handling (focus target, ArrowLeft/Right wiring — proposed in section D)
- Build-time hero-image render pipeline (only invoked if D-28 measurement fails — proposed in section E)
- Bundle code-split granularity (single chunk for `three` + scene modules vs. split — recommended single dynamic chunk in section B)

### Deferred Ideas (OUT OF SCOPE)

- Course 2+ habitat themes
- Full interactivity (zoom, pan, tap-to-interact, drag-to-rotate-objects)
- Per-level visual-diff coverage across all 9 levels × 4 moods × 3 decay tiers (~108 screenshots); Phase 13 verifies binding at ONE level (recommended: level 5 with elephant per SPEC)
- 2D fallback tier for low-end devices (only revisit if D-28 measurement implies it)
- Storybook integration for 3D scenes
- Designer asset polish iteration — designs are "production-ready"
- Phase 12 (Pause cards) — independent; sequencing recommendation in section H

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R1 | All 9 habitat levels render in 3D end-to-end | Section A — `featuresForLevel(level)` + `LEVEL_CONFIG` already cover all 9; Plan 2 wires the ports; Plan 3 binds `HabitatState.level` |
| R2 | Renderer = plain Three.js 0.160.x, npm + ESM | Section A.3 (CDN globals to lift); Plan 1 installs `three@0.160.x`; Section G covers version pinning |
| R3 | Scene reads `HabitatState`, no other inputs | Section A — `ClayHabitatLevel`'s prop shape already matches (`level`, `tweaks`, `companionMode`, `variant`); Plan 3 maps `state.{level,mood,quality}` to these |
| R4 | Camera orbit per D-26 | Section A.4 — `attachOrbit()` in `habitats-shared.jsx:30-88` already implements this; port verbatim |
| R5 | Keyboard arrow-key orbit | Section D — proposed hook into the canvas wrapper; modifies `attachOrbit` to expose theta nudge |
| R6 | `prefers-reduced-motion` respected | Section D — `window.matchMedia('(prefers-reduced-motion: reduce)')` standard pattern; gates auto-orbit + ambient anims |
| R7 | Mood + decay drive visible scene differences | Section C — mood: bind to existing animation channels; decay: material darkening + fog + selective feature opacity (proposal) |
| R8 | Mini-widget D-28 perf-gated live 3D vs. cached image | Section E — Lighthouse mobile emulation + WebGL context audit; cached-image pipeline via headless Node + JSDOM-WebGL not viable, recommend Playwright screenshot at build time |
| R9 | CWV "Good" on dashboard + `/habitat` | Section E.2 — Lighthouse runs committed to `13-PERF.md`; LCP/INP/CLS thresholds per SPEC |
| R10 | v1.0 PixiJS habitat code removed | Section F — **6 files** depend on `pixi.js`/`@pixi/react`, NOT the 3 named in SPEC; flag below |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Habitat state computation (level/mood/quality) | API / Backend | — | Already locked in `src/lib/habitat-engine.ts` + `src/app/api/habitat/route.ts`; Phase 13 does not touch this tier |
| 3D scene rendering (WebGL canvas, RAF loop) | Browser / Client | — | WebGL is browser-only; SSR-disabled via `dynamic({ ssr:false })` from a `"use client"` parent (v1.0 already proves this works) |
| Scene composition (`ClayHabitatLevel`, `buildClayWorld`) | Browser / Client | — | Three.js scene-graph mutation runs in `useEffect` after mount; pure client work |
| State-to-scene binding | Frontend Server (SSR) | Browser / Client | `HabitatState` flows from server component (`/habitat` page) into the client component as a prop; client component re-renders the scene when props change |
| Pre-rendered widget hero images (fallback path) | Build pipeline | CDN / Static | Generated at build time, served as static assets from `public/habitat/widget-l{1..9}.webp`; falls back to `next/image` |
| Lighthouse + WebGL perf measurement | Build / CI | — | Out-of-band measurement during Plan 6; results committed to `.planning/phases/13-3d-habitat/13-{WIDGET-,}PERF.md` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `three` | `0.160.x` | WebGL renderer + scene-graph + cameras + materials | Locked by designer artifacts; SPEC R2 [VERIFIED: designer imports `THREE.WebGLRenderer`, `THREE.PerspectiveCamera`, `THREE.MeshToonMaterial` in `habitats-shared.jsx:7,20` and `habitat-clay-styles.jsx:35,68`]. Latest is 0.184.0 [VERIFIED: `npm view three version`] — SPEC explicitly pins 0.160 per the designer; no upgrade in scope. |
| `@types/three` | `^0.160.x` | TypeScript types matching the runtime version | Required for clean TS port; pair the type-package minor with the runtime minor [CITED: https://github.com/three-types/three-ts-types]. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none beyond `three`) | — | — | SPEC constraint: "No new heavy dependencies — Three.js is the budget. No drei, no three-stdlib unless a specific module is strictly necessary." Designer code uses no helpers beyond core Three.js (verified — no `OrbitControls`, no `GLTFLoader` references in `habitats-shared.jsx` or `habitat-clay-styles.jsx`). Orbit is hand-rolled in `attachOrbit()` (`habitats-shared.jsx:30`). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain Three.js | `@react-three/fiber` | r3f gives declarative scene composition but adds ~30KB and an extra abstraction layer. Designer chose plain Three.js; SPEC locks the renderer; not in scope to reconsider. |
| Hand-rolled `attachOrbit` | `three/examples/jsm/controls/OrbitControls.js` | OrbitControls supports zoom + pan by default — exactly what D-26 disallows. Disabling them is possible (`enableZoom = false`, `enablePan = false`), but the designer's hand-rolled orbit is azimuth-only by construction and uses ~15 lines. Keep the designer's version. |
| Designer's local RAF loop | `next/three` or community Next.js + Three.js boilerplate | None of the community packages add value over the v1.0 `dynamic({ ssr:false })` pattern that already works in this repo. |

**Installation:**
```bash
npm install three@^0.160.0 @types/three@^0.160.0
npm uninstall pixi.js @pixi/react
```

**Version verification:** Three.js latest as of research date is **0.184.0** [VERIFIED: `npm view three version`]. SPEC pins 0.160.x [CITED: SPEC R2, line 36-39]. Use `three@^0.160.0` to allow patch updates within 0.160 but not jump to 0.161+ which would deviate from the designer's tested version. `@types/three` is published in lockstep on each three.js release [CITED: https://www.npmjs.com/package/@types/three].

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Server (Next.js 16 server component: /habitat/page.tsx, /dashboard/page)   │
│  ─ auth.api.getSession() → userId                                            │
│  ─ habitatQueries → HabitatFacts → computeHabitatState() → HabitatState     │
└───────────────────────────┬─────────────────────────────────────────────────┘
                            │ props (HabitatState)
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Client shell ("use client"):                                                │
│   ─ <HabitatScene> (full page)        ─ <HabitatWidget> (80px dashboard)    │
│   ─ Owns: localStorage cache, retry/offline, level-up overlay, mood label   │
│   ─ Uses: dynamic(() => import('./habitat-3d-canvas'), { ssr: false })      │
└───────────────────────────┬─────────────────────────────────────────────────┘
                            │ HabitatState (level, mood, quality)
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Lazy client chunk (NEW): src/components/habitat-3d-canvas.tsx              │
│   ─ <HabitatCanvas /> from scene-host (the React wrapper, ported)           │
│   ─ Receives state via props, threads it into buildScene's update() closure │
└───────────────────────────┬─────────────────────────────────────────────────┘
                            │ buildScene(canvas, w, h) called once on mount
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  src/lib/habitat-3d/ (NEW, pure TS, no React)                                │
│   ─ scene-host.ts         (from habitats-shared.jsx)                         │
│   ─ clay-world.ts         (from buildClayWorld in clay-styles.jsx)           │
│   ─ clay-characters.ts    (lion/elephant/bunny/giraffe builders)             │
│   ─ clay-animation.ts     (applyLionWalk/Sleep/Extras, animateElephant)      │
│   ─ clay-ambient.ts       (buildStorybookAmbient, sleep bubbles, drinking FX)│
│   ─ feature-flags.ts      (featuresForLevel, LEVEL_CONFIG)                   │
│   ─ mood-decay.ts         (NEW — binds HabitatState.mood/quality to scene)   │
└─────────────────────────────────────────────────────────────────────────────┘

Camera input ─────────────────────────────────────────────────────────────┐
  mouse drag / touch swipe / NEW: keyboard ArrowLeft/Right                │
  prefers-reduced-motion → freeze auto-orbit, freeze ambient anims        │
                                                                          ▼
                                                          attachOrbit() in scene-host
                                                          (mutates camera.position each tick)
```

### Recommended Project Structure

```
src/
├── lib/
│   └── habitat-3d/                          # NEW — pure TS, no React, port target
│       ├── scene-host.ts                    # buildSceneHost + attachOrbit (from habitats-shared.jsx:6-88)
│       ├── clay-world.ts                    # buildClayWorld (from clay-styles.jsx:50-606)
│       ├── clay-characters.ts               # buildLion*, buildBunny, buildElephant, buildGiraffe (clay-styles.jsx:1370-2114)
│       ├── clay-animation.ts                # applyLionWalk/Sleep/Extras, animateElephant (clay-styles.jsx:641-1036)
│       ├── clay-ambient.ts                  # buildStorybookAmbient, buildSleepBubbles, drinkingFX (clay-styles.jsx:720-1368)
│       ├── feature-flags.ts                 # featuresForLevel + LEVEL_CONFIG (clay-styles.jsx:2229-2254)
│       ├── mood-decay.ts                    # NEW — maps HabitatState.{mood,quality} to scene knobs
│       ├── palette.ts                       # CLAY color dict + _toonGrad (clay-styles.jsx:19-40)
│       └── types.ts                         # SceneContext, WorldOpts, CharacterRig, etc.
└── components/
    ├── habitat-scene.tsx                    # KEEP — rewire internals only (lines 58, 200 swap to new canvas)
    ├── habitat-widget.tsx                   # KEEP — rewire internals only (lines 11, 58 swap to new widget canvas OR <img> fallback)
    ├── habitat-3d-canvas.tsx                # NEW — replaces habitat-canvas.tsx; HabitatCanvas React shell + ClayHabitatLevel render
    └── habitat-3d-widget-canvas.tsx         # NEW — replaces habitat-widget-canvas.tsx; 80px variant

DELETED:
    src/components/habitat-canvas.tsx
    src/components/habitat-layers.tsx
    src/components/habitat-widget-canvas.tsx
    src/components/tiger-sprite.tsx          # ⚠ NOT in SPEC list — see flag in section F
    src/components/sparkle-particles.tsx     # ⚠ NOT in SPEC list — see flag in section F
    src/components/bird-sprite.tsx           # ⚠ NOT in SPEC list — see flag in section F
    public/sprites/habitat.png
    public/sprites/habitat.json
    public/sprites/tiger.png
    public/sprites/tiger.json
```

### Pattern 1: Dynamic-import the WebGL-touching client component

**What:** Wrap the Three.js-using component behind `next/dynamic` with `ssr: false`, called from a `"use client"` parent.

**When to use:** Any module that touches `window`, `document`, or WebGL on import.

**Example (already proven in v1.0):**
```typescript
// src/components/habitat-scene.tsx (existing pattern, lines 1, 58)
"use client";
import dynamic from "next/dynamic";

// Phase 13 swap: '@/components/habitat-canvas' → '@/components/habitat-3d-canvas'
const HabitatCanvas = dynamic(() => import("@/components/habitat-3d-canvas"), {
  ssr: false,
  loading: () => <HabitatLoadingSpinner />,
});
```

**Source:** Verified valid in Next.js 16 per `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:62-72`: *"`ssr: false` option will only work for Client Components, move it into Client Components ensure the client code-splitting working properly."* v1.0 `habitat-scene.tsx:1-2,58-61` already follows this pattern correctly.

### Pattern 2: Build-once, update-per-frame (designer's existing pattern)

**What:** `buildScene(canvas, w, h)` returns `{ renderer, scene, camera, update(dt, t) }`. Build runs in `useEffect` on mount; the returned `update` closure is called every frame and reads live state through refs.

**When to use:** Three.js scenes that don't need React to drive sub-tree composition.

**Example:** `habitat-clay-styles.jsx:2265-2364` — `ClayHabitatLevel` uses `React.useCallback` for `buildScene`, captures `level` and `tweaksRef` in closure, and the inner `update(dt, t)` reads from refs each frame. Port directly to TS.

### Pattern 3: IntersectionObserver-gated render loop (designer's existing pattern)

**What:** Don't start the RAF loop until the canvas is in the viewport; pause when scrolled off.

**Source:** `habitats-shared.jsx:166-189`. Already implemented — Phase 13 inherits this for free. Saves GPU when habitat is below the fold (relevant for the mini-widget on a long dashboard).

### Pattern 4: visibilitychange tab-hidden pause

**Source:** `habitats-shared.jsx:137-139`. Already implemented; matches Phase 5 D-22 carry-forward. Note: when tab is hidden, the loop switches to a 100ms `setInterval` instead of stopping cold — this is questionable for battery (consider stopping entirely in Plan 1's port).

### Anti-Patterns to Avoid

- **Building scene in render body, not effect:** Three.js construction MUST be in `useEffect` to avoid running during SSR or under React 18/19 Strict Mode double-render. Designer code already does this (`HabitatCanvas` effect at `habitats-shared.jsx:102`). Don't refactor this away.
- **Forgetting `renderer.dispose()` + geometry/material traversal:** Designer code has the right pattern (`habitats-shared.jsx:198-208`). Port verbatim — leaking GPU resources across re-mounts is the #1 Three.js + React bug under Strict Mode.
- **Mounting two canvases without disposing the first:** React 19 Strict Mode mounts → unmounts → remounts in dev. Without proper cleanup the second mount inherits a WebGL context the first didn't release. Designer's `disposedRef` + cleanup (`habitats-shared.jsx:104, 190-211`) handles this correctly.
- **Passing changing `buildScene` callback identity:** The designer's `structKey` pattern (`clay-styles.jsx:2263, 2364`) memoizes via `useCallback([structKey])` so a tweak that doesn't change structure doesn't tear down the scene. Port the pattern; don't reintroduce inline functions.
- **Loading Three.js into the main bundle:** ALWAYS dynamic-import the canvas component (Pattern 1). Three.js is ~150KB gzip per the ecosystem norm [CITED: bundlephobia.com shows three@0.160.0 at ~165KB minified + gzipped; the SPEC R2 acceptance specifically requires Three.js be a separate chunk, not inlined].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebGL context creation | Don't write a custom WebGL renderer | `THREE.WebGLRenderer` | Already done in `habitats-shared.jsx:7`. |
| Catmull-Rom curves for lion path | Don't roll your own interpolator | `THREE.CatmullRomCurve3` | Already used at `clay-styles.jsx:558-566`. |
| Toon shading gradient | Don't write a custom shader | `THREE.MeshToonMaterial + DataTexture` | Already implemented in `_toonGrad` at `clay-styles.jsx:32-40`. |
| Mobile device detection | Don't ship a UA-string library | Inline `window.innerWidth < 768` | Designer uses this; matches existing v1.0 patterns. |
| Reduced-motion detection | Don't poll, don't roll | `window.matchMedia('(prefers-reduced-motion: reduce)')` + `addEventListener('change', ...)` | Standard MDN pattern [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion]. |
| Hero-image generation pipeline | Don't write a headless WebGL renderer in Node | Use Playwright (already a dev dep in `package.json:56`) to load `/habitat?level=N&snapshot=true` and screenshot it | Playwright is already installed; headless Chromium = real WebGL = identical to runtime; no SwiftShader/JSDOM-canvas gymnastics. |
| Hand-rolled orbit | Don't extend `OrbitControls` | Keep the designer's `attachOrbit()` | Already azimuth-only by construction; OrbitControls would require disabling 5+ defaults to match D-26. |
| Material darkening for decay | Don't write a post-process pass | `material.color.lerp()` + `scene.fog` + per-feature `material.opacity` | Cheap, no extra render targets. See section C. |

**Key insight:** The designer code already side-steps the major Three.js pitfalls (orbit, toon shading, mobile scaling, cleanup, visibility). Phase 13's bug surface is almost entirely in the **wiring** — getting `HabitatState` to drive scene-level mutations without rebuilding the scene unnecessarily — not in the Three.js itself.

## Runtime State Inventory

Phase 13 is a **renderer migration**, not a rename — but there are runtime/asset concerns worth listing explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — habitat state is computed-on-read from `learnedCardCount` + `lastActivityAt` in Neon. No 3D-scene cache, no rendered artifacts in DB. | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no API keys touched | None |
| Build artifacts / installed packages | `package-lock.json` will need `pixi.js`, `@pixi/react`, and any pixi sub-deps removed; new entries for `three`, `@types/three`. Also: any cached Vercel build artifacts referencing the old PixiJS chunk will be invalidated on next build. | `npm uninstall pixi.js @pixi/react`; `npm install three@^0.160.0 @types/three@^0.160.0`; commit updated `package-lock.json` |
| localStorage cache | `habitat-scene.tsx:11` caches `HabitatState` under key `"leocards:habitat-state"`. The cache shape is unchanged by Phase 13 (still `HabitatState`); no migration needed. | None |
| Static `public/sprites/*` | `public/sprites/habitat.{png,json}` and `public/sprites/tiger.{png,json}` exist and are referenced by v1.0 components — and only v1.0 components, per the grep below. Delete on Phase 13 ship. | Delete in Plan 6 alongside PixiJS code |

**Static asset reference audit** (for SPEC acceptance criterion "grep -r `sprites/habitat\|sprites/tiger` returns matches only in to-be-deleted habitat code"):

[VERIFIED via Grep, results above] 18 files reference the sprite paths. Outside `.planning/` and the doomed `habitat-*-canvas.tsx`, **none** of the references are in production code that survives Phase 13. Safe to delete.

## Common Pitfalls

### Pitfall 1: WebGL context loss on the dashboard with two canvases

**What goes wrong:** Chrome caps WebGL contexts per page at ~16. Putting a 3D widget on the dashboard ADDS a second WebGL context to any page that already has one (today none — dashboard is PixiJS Canvas2D-ish via `pixi.js@8` which can be either WebGL or Canvas2D; `@pixi/react@8` defaults to WebGL). When the cap is hit (relevant on mobile Safari which historically caps lower, around 4-8), the browser discards the oldest context and fires `webglcontextlost` on its canvas.

**Why it happens:** Each `<canvas>` with a `getContext('webgl2')` consumes one context. Multiple canvases × multiple tabs × multiple devtools panels stack quickly.

**How to avoid:**
- Listen for `webglcontextlost` on both canvases; pause RAF and show the loading skeleton until `webglcontextrestored` fires [CITED: https://www.khronos.org/webgl/wiki/HandlingContextLost].
- Prefer the cached-image branch of D-28 if perf testing on real mobile shows context churn.
- Single dashboard context: ensure the v1.0 widget canvas is fully torn down before the new one mounts (designer's cleanup at `habitats-shared.jsx:190-211` does this if Plan 3 calls into it correctly).

**Warning signs:** Black widget on mobile after a page navigation; console warning `THREE.WebGLRenderer: Context Lost.`

### Pitfall 2: React 19 Strict Mode double-effect causes leaked scenes in dev

**What goes wrong:** In development, React 19 (`react@19.2.4` per `package.json:39`) mounts the component, unmounts it, and remounts it on the same render pass. Without the disposedRef pattern, two scenes get built and the first is never disposed.

**How to avoid:** The designer's `disposedRef` + cleanup pattern at `habitats-shared.jsx:104, 190-211` is correct. Port it as-is. Verify in Plan 1 by checking dev console for `[HabitatCanvas] loop error` repetitions — if you see them after a tab switch, the disposedRef wiring broke during the port.

### Pitfall 3: `pixi.js` accidentally still referenced after deletion

**What goes wrong:** A stale import in a test or storybook would keep `pixi.js` in the bundle.

**How to avoid:**
- After deleting the 6 PixiJS files, `grep -rn "pixi" src/ package.json e2e/ tests/` — must return 0 matches.
- `npm ls pixi.js` — must report "(empty)".
- Webpack/Turbopack bundle analyzer: confirm no pixi chunk emitted.

### Pitfall 4: `@types/three` version mismatch with runtime

**What goes wrong:** If `@types/three@^0.184` is installed but runtime is `three@^0.160`, types describe APIs that don't exist (e.g., AgX tone mapping was added in 0.160 per release notes — already fine; newer ones may not be).

**How to avoid:** Pin both to `^0.160.0` matching exact minor.

### Pitfall 5: Decay implementation that uses post-processing pass

**What goes wrong:** A naive "darken everything" via EffectComposer adds an extra render target = ~30% more GPU time per frame. Mobile budget cannot afford it.

**How to avoid:** Mutate material properties directly (section C). The designer's flat scene of `MeshToonMaterial`s is well-suited to per-material `color.lerp` + `opacity`.

### Pitfall 6: SSR-time `import('three')` from a server component

**What goes wrong:** If `habitat-3d-canvas.tsx` is imported (statically) by a server component, Three.js evaluates at import time and trips on `window` or `document` access — even with `"use client"` on the imported file, static imports through a server-component boundary force evaluation in the SSR worker.

**How to avoid:** Always reach `habitat-3d-canvas` via `dynamic({ ssr: false })` from inside a `"use client"` parent (`habitat-scene.tsx`, `habitat-widget.tsx`). [CITED: `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:62-72,94`].

### Pitfall 7: SPEC's named-deletion file list is incomplete

**What goes wrong:** SPEC R10 names 3 PixiJS files to delete (`habitat-canvas.tsx`, `habitat-layers.tsx`, `habitat-widget-canvas.tsx`) but the grep finds **6** files importing `pixi.js`/`@pixi/react`. The other 3 (`tiger-sprite.tsx`, `sparkle-particles.tsx`, `bird-sprite.tsx`) are children of `habitat-canvas.tsx` and would be orphaned (dead exports) after Plan 6 if not also deleted.

**See section F for the full list and the flag.**

## Code Examples

### Example 1: Port `attachOrbit` and add keyboard support

```typescript
// src/lib/habitat-3d/scene-host.ts (NEW — port of habitats-shared.jsx:30-88)
// Source: .planning/design/animations/habitats-shared.jsx:30-88
import * as THREE from "three";

export interface OrbitOptions {
  lookY?: number;
  idleDelay?: number;
  autoSpeed?: number;
  reducedMotion?: boolean;     // NEW for R6 — disables auto-orbit
}

export interface OrbitHandle {
  tick: (dt: number) => void;
  dispose: () => void;
  nudgeTheta: (delta: number) => void;  // NEW for R5 — keyboard hook
}

export function attachOrbit(
  canvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  opts: OrbitOptions = {},
): OrbitHandle {
  const target = new THREE.Vector3(0, opts.lookY ?? 1, 0);
  let theta = Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
  const radius = Math.hypot(camera.position.x - target.x, camera.position.z - target.z);
  const phi = Math.atan2(camera.position.y - target.y, radius);
  const r3d = Math.hypot(radius, camera.position.y - target.y);

  let dragging = false;
  let lastX = 0;
  let lastIdle = performance.now();
  const idleDelay = opts.idleDelay ?? 1200;
  const autoSpeed = opts.autoSpeed ?? 0.12;
  const reducedMotion = opts.reducedMotion ?? false;

  // ... mouse + touch handlers from habitats-shared.jsx:43-65 unchanged ...

  function tick(dt: number) {
    const now = performance.now();
    if (!dragging && !reducedMotion && now - lastIdle > idleDelay) {
      theta += autoSpeed * dt;
    }
    camera.position.x = target.x + Math.cos(phi) * r3d * Math.sin(theta);
    camera.position.z = target.x + Math.cos(phi) * r3d * Math.cos(theta);
    camera.position.y = target.y + Math.sin(phi) * r3d;
    camera.lookAt(target);
  }

  // NEW: keyboard hook for R5 — caller wires up its own keydown listener
  function nudgeTheta(delta: number) {
    theta += delta;
    lastIdle = performance.now();
  }

  return { tick, dispose, nudgeTheta };
}
```

Then in the React shell:

```typescript
// inside HabitatCanvas effect after attachOrbit() — for R5
const onKey = (e: KeyboardEvent) => {
  if (e.key === "ArrowLeft")  orbit.nudgeTheta(-autoSpeed * 0.016);
  if (e.key === "ArrowRight") orbit.nudgeTheta( autoSpeed * 0.016);
};
canvasWrapper.tabIndex = 0;                                 // make it focusable
canvasWrapper.addEventListener("keydown", onKey);
// cleanup: canvasWrapper.removeEventListener("keydown", onKey)
```

### Example 2: Reduced-motion hook

```typescript
// src/components/habitat-3d-canvas.tsx (NEW)
"use client";
import { useEffect, useState } from "react";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
```
Source: MDN standard pattern [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion]. Pass into `attachOrbit({ reducedMotion })` and gate ambient anims (clouds, butterflies, water shimmer) by skipping the relevant lines in `updateWorld` (clay-styles.jsx:569-603) when `reducedMotion` is true.

### Example 3: Mood + decay binding (NEW logic, section C)

```typescript
// src/lib/habitat-3d/mood-decay.ts (NEW)
import * as THREE from "three";
import type { HabitatState, TigerMood } from "@/lib/habitat-engine";

interface SceneBinding {
  scene: THREE.Scene;
  leoMaterials: THREE.MeshToonMaterial[];     // tiger materials, for mood/decay color shift
  featureGroups: { [name: string]: THREE.Object3D };   // for decay opacity
  fog: THREE.Fog | null;
  setLeoMood: (mood: TigerMood) => void;      // pokes character anim state
}

// Mood: tweak animation channels (no scene rebuild).
// excited → speedMul=2.2 + sparkle particles on
// happy   → speedMul=1.5 (designer default)
// neutral → speedMul=0.9
// sad     → speedMul=0.5 + head droop offset (rotation.x +0.15)
export function applyMood(binding: SceneBinding, mood: TigerMood, state: AnimState) {
  switch (mood) {
    case "excited": state.speedMul = 2.2; state.headDroop = 0;     state.sparkleOn = true;  break;
    case "happy":   state.speedMul = 1.5; state.headDroop = 0;     state.sparkleOn = false; break;
    case "neutral": state.speedMul = 0.9; state.headDroop = 0.05;  state.sparkleOn = false; break;
    case "sad":     state.speedMul = 0.5; state.headDroop = 0.15;  state.sparkleOn = false; break;
  }
}

// Decay: quality < 1.0 fades materials toward grey-green and dims sky.
// Cheap: just mutates the toon-mat color + fog density + selective opacity.
// 3 tiers per SPEC R7: quality===1.0, 0.4<=quality<1.0, quality<0.4.
export function applyDecay(binding: SceneBinding, quality: number) {
  const decayed = new THREE.Color("#6a7560");      // dull olive
  const fresh   = new THREE.Color("#a8d77c");      // CLAY.ground
  binding.featureGroups.flowers?.traverse((o) => {
    if ((o as THREE.Mesh).material) {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (m.color) m.color.lerpColors(decayed, fresh, quality);
    }
  });
  if (binding.fog) {
    binding.fog.near = 20 + (1 - quality) * 16;      // close fog when decayed
    binding.fog.far  = 60 + (1 - quality) * 20;
  }
  // Tier-gated: hide butterflies + flowers entirely below 0.4
  if (binding.featureGroups.butterflies) {
    binding.featureGroups.butterflies.visible = quality >= 0.4;
  }
}
```

Source: Three.js Color.lerpColors documented at https://threejs.org/docs/#api/en/math/Color.lerpColors; Fog at https://threejs.org/docs/#api/en/scenes/Fog. Material.opacity / Object3D.visible are standard.

### Example 4: Build-time hero-image generation (D-28 fallback)

Run only if D-28 measurement fails. Add to `package.json` scripts:

```json
"build:hero-images": "playwright test e2e/scripts/render-hero-images.spec.ts"
```

```typescript
// e2e/scripts/render-hero-images.spec.ts (NEW, run only when D-28 falls back)
import { test } from "@playwright/test";

for (let lv = 1; lv <= 9; lv++) {
  test(`render level ${lv} hero image`, async ({ page }) => {
    await page.goto(`http://localhost:3000/habitat?devLevel=${lv}&snapshot=true`);
    await page.waitForSelector("canvas[data-ready=true]");
    // settle camera at a known orbit angle
    await page.evaluate(() => (window as any).__habitatSetTheta?.(0.9));
    await page.waitForTimeout(500);
    await page.locator("canvas").screenshot({
      path: `public/habitat/widget-l${lv}.webp`,
      type: "jpeg",          // playwright doesn't output webp directly — see note
      quality: 85,
    });
  });
}
```

**Note:** Playwright's `screenshot()` outputs PNG/JPEG, not WebP — convert with `sharp` as a post step, OR ship PNGs and accept the ~3x size. The build pipeline is only triggered if D-28 fallback is chosen, so the overhead is conditional.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `renderer.outputEncoding = sRGBEncoding` | `renderer.outputColorSpace = SRGBColorSpace` | three r152 (Apr 2023) | Designer already uses the new API at `habitats-shared.jsx:12` — already correct for 0.160. |
| `OrbitControls` everywhere | Custom orbit when you need constraints (no zoom/pan) | N/A — design choice | Designer made the right call given D-26. |
| WebGL1 default | WebGL2 default | three r163 (later than 0.160) | 0.160 still defaults to WebGL2 when available; no change needed. |
| `PCFSoftShadowMap` for cute styles | Same — still standard | — | Designer uses it at `habitats-shared.jsx:11`. |

**Deprecated/outdated:**
- The CDN UMD bundle (`unpkg.com/three@0.160.0/build/three.min.js`) used in the designer's HTML is for in-browser Babel transpilation only. Production uses ESM imports — `import * as THREE from "three"`. Designer artifact's HTML at line 17 reflects the design-time setup, NOT the production target.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The designer's idle behavior (walk/blink/ear-twitch/tail-flick already in `clay-styles.jsx:796-878, 885-971`) is rich enough to close D-29 without an A/B sketch | Section I | If Josh wants something different, Plan 4 grows by ~1 mid-phase checkpoint |
| A2 | Decay rendering = material color lerp + fog tightening + selective feature hiding will be visually distinct enough across the 3 required tiers (`quality===1.0`, `0.40-1.0`, `<0.40`) per SPEC R7 | Section C, Example 3 | If too subtle, Plan 4 adds a post-processing tier — but that adds GPU cost and may threaten the CWV gate |
| A3 | The 6-PixiJS-file deletion scope I identified (not 3 per SPEC) is the correct read of "v1.0 PixiJS habitat code removed" | Section F | If SPEC truly meant 3, the other 3 become dead code; either is a bad outcome — flag for plan-discuss |
| A4 | Three.js bundles separately from the main chunk under Next.js 16 with the existing `dynamic({ ssr:false })` pattern, hitting the SPEC R2 acceptance | Pattern 1 | If Turbopack inlines it (unlikely — webpack/turbopack code-split dynamic imports by default), Plan 6 needs a `next.config.mjs` adjustment |
| A5 | Playwright headless Chromium produces visually identical WebGL output to user-Chrome for the hero-image fallback | Section E.3 | Cosmetic only — fallback images may look slightly off but are still recognizable |
| A6 | The designer's IntersectionObserver-gated build (build-on-first-viewport-entry, `habitats-shared.jsx:167-187`) plays nicely with the dashboard's 80px widget which is above the fold | Pattern 3 | Above-fold widgets build immediately, so this is fine — verify in Plan 6 measurement |
| A7 | Phase 12 (Pause cards) is genuinely independent of Phase 13 — no shared file edits | Section H | If they touch overlapping components (e.g., dashboard layout), order matters; haven't read Phase 12 SPEC |

## Open Questions

1. **D-29 mid-phase A/B checkpoint — close or keep?**
   - What we know: designer code at `clay-styles.jsx:796-878` (walk + blink) and `:885-971` (ear twitch, brow micro-raise, tail tuft secondary motion, dust puffs under planted paws) is well beyond "no idle" or "minimal".
   - What's unclear: whether Josh's "production-ready" intent specifically includes these as the chosen treatment.
   - Recommendation: **planner asks Josh up-front in Plan 1 kickoff: "designer code includes walk/blink/ear-twitch/tail — confirm this is the answer for D-29 so we can close the A/B checkpoint?"** If yes → drop the mid-phase checkpoint, close D-29. If no → schedule A/B in Plan 4.

2. **Mid-phase D-28 perf gate — at what point in the plan sequence?**
   - What we know: D-28 requires measurement before deciding live vs. cached. Measurement needs at least Plan 2 + Plan 3 to be complete (so a real widget renders).
   - Recommendation: Plan 6 = perf-gate + PixiJS-removal + CWV verification, gated *behind* Plans 1-5. If Plan 6 measurement says live-3D widget fails CWV, the cached-image build-time pipeline IS itself Plan 6.5 (or rolled into Plan 6).

3. **Should `LEVEL_TITLES` / `HUD_STREAK` (in `clay-styles.jsx:2399-2420`) be ported?**
   - What we know: They're labels for designer HUD overlay. v1.0 has its own level badge / streak UI in `habitat-scene.tsx:193-198`.
   - Recommendation: DON'T port — let the designer's HUD die with the JSX wrapper. v1.0's React HUD is already correct and bigger-picture-integrated.

4. **The designer's `companionMode` / `variant` props — exposed to runtime or hard-coded?**
   - `companionMode = 'meadow' | 'lakeside'` only affects level 5 elephant placement (designer's two variants of level 5 in the HTML at `Leo Habitat - All 9 Levels (Final v2).html:112-117`).
   - `variant = 'default' | 'golden-hour'` only affects level 9 sky (HTML at line 130).
   - Neither maps to `HabitatState` directly. Recommendation: hard-code per level — level 5 → `meadow`, level 9 → `golden-hour` — and document the choice. If we ever want runtime toggling, that's Course 2+ territory.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `three` npm package | Renderer | (to be installed in Plan 1) | `0.160.x` per SPEC | — (hard requirement) |
| `@types/three` npm package | TS types | (to be installed in Plan 1) | `0.160.x` matching | — |
| Playwright | Hero image gen (D-28 fallback) + E2E specs | ✓ | `1.58.2` per `package.json:56` | — (already a dev dep) |
| Lighthouse | CWV measurement | ✓ (via `npx lighthouse`) | latest on demand | — |
| WebGL2 (browser runtime) | Three.js | Browser-side; assumed available on every supported device | — | Three.js falls back to WebGL1 automatically; if WebGL is completely unavailable, the loading skeleton stays visible (acceptable) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None (Three.js auto-fallback for WebGL1 is built-in).

## Section A — JSX-to-TS Porting Plan

### A.1 Entry point(s)

The designer's JSX file exposes 4 React components via `window.*` (the CDN-globals style):

| Component | Source line | Purpose | Phase 13 use |
|-----------|-------------|---------|--------------|
| `ClayChibi` | `clay-styles.jsx:2159` | Chibi-style level (uses `buildLionChibi` + `buildBunny`) | DROP — not selected |
| `ClayStorybookV2` | `clay-styles.jsx:2163` | Storybook style with `buildLionStorybook` + `buildElephant` ambient | DROP — single-level only, replaced by `ClayHabitatLevel` |
| `ClayMascot` | `clay-styles.jsx:2222` | Mascot style with `buildLionMascot` + `buildGiraffe` | DROP — not selected |
| **`ClayHabitatLevel`** | **`clay-styles.jsx:2257-2397`** | **Level-aware Storybook (default = level 1) — picks features per level, places elephant for L5, cave + sleep for L7, golden-hour sky for L9 variant** | **THIS IS THE ONE.** Port this. |

The `LEVEL_TITLES`, `HUD_STREAK`, and `ALL_UNLOCKS` constants are HUD-only / design-time and do NOT come along.

### A.2 Prop API of `ClayHabitatLevel`

From `clay-styles.jsx:2257`:
```jsx
ClayHabitatLevel({ width, height, level = 1, tweaks = {}, companionMode = 'meadow', variant = 'default' })
```

| Prop | Type | Source from `HabitatState`? | Phase 13 mapping |
|------|------|------|------|
| `width` / `height` | number | NO — layout | From parent component (`<HabitatScene>` / `<HabitatWidget>` measures container) |
| `level` | 1-9 | YES — `state.level` | Direct |
| `tweaks` | `{ walkSpeed?, lakeScale?, napDemo?, pollenOn?, petalsOn?, birdsOn? }` | Partly | Hard-code production defaults: `{ walkSpeed: 1.5, lakeScale: 1.3, napDemo: false }`. Drop `pollenOn/petalsOn/birdsOn` overrides (use level-derived defaults from `LEVEL_CONFIG`). `napDemo` stays off (production uses real London time per `_londonSecondsSinceMidnight`, not demo 60s loop). |
| `companionMode` | `'meadow' \| 'lakeside'` | NO | Hard-code `'meadow'` for the production scene; `'lakeside'` is the designer's alt variant of L5 — defer if Josh wants it later |
| `variant` | `'default' \| 'golden-hour'` | Indirect — driven by `level === 9` | Map `variant = level === 9 ? 'golden-hour' : 'default'` |

**No new props are needed for the SPEC R3 acceptance.** Mood and quality are injected via a NEW separate prop on the React shell (e.g., `mood`, `quality`) that the wrapper threads into the `update(dt, t)` closure via a ref — same pattern the designer already uses for `tweaksRef` (`clay-styles.jsx:2258-2259`).

### A.3 Global dependencies to lift to ESM

| Global in designer code | Source line | ESM replacement |
|--------|------|------|
| `const { useEffect, useRef, useState } = React;` | `habitats-shared.jsx:3` | `import { useEffect, useRef, useState } from "react";` |
| Bare `THREE.WebGLRenderer`, `THREE.Scene`, ... | throughout both files | `import * as THREE from "three";` (or named imports — but star is cleaner given >50 distinct THREE.* references) |
| `Object.assign(window, { HabitatCanvas, ... })` | `habitats-shared.jsx:350-353` | DROP — replace with named `export`s |
| `window.ClayChibi = ClayChibi; ...` | `clay-styles.jsx:2422-2425` | DROP — replace with named `export` for `ClayHabitatLevel` only |
| `<script type="text/babel" data-presets="env,react">` in HTML | `Leo Habitat - All 9 Levels (Final v2).html:24` | DROP — Next.js/SWC compiles TSX natively |

**No `Math.random()` issues** — used only for blink intervals and dust selection (`clay-styles.jsx:871, 876, 885+`); deterministic geometry uses `_mulberry32(0xC0FFEE)` already.

### A.4 CDN-only assumptions that break in npm/ESM

| Assumption | Where | Resolution |
|--------|------|------|
| `<script src="unpkg.com/three@0.160.0/build/three.min.js">` providing UMD `THREE` global | HTML line 17 | Replace with `import * as THREE from "three"`. `three@0.160.0` ships ESM in `package.json#exports` [VERIFIED: standard three.js package layout]. |
| `@babel/standalone` in-browser transpilation of JSX | HTML line 16 | Next.js SWC transpiles TSX natively — drop entirely. Acceptance criterion in SPEC R2 (`grep -r "babel/standalone" src/ public/` returns no matches) — easy. |
| `<script type="text/babel">` loading order | HTML lines 19-23 (design-canvas, habitats-shared, tweaks-panel, habitat-clay-styles) | Replace with ES module dependency graph — `clay-world.ts` imports from `scene-host.ts`, etc. Order is enforced by `import` statements at the top of each file. |
| `React`, `ReactDOM`, `createRoot` from UMD globals | HTML lines 14-15, 25 | `<HabitatScene>` is the production entry point; this design-time root doesn't ship. |
| Inline `TWEAK_DEFAULTS` constant edited by `tweaks-panel.jsx` | HTML lines 27-31 | Hard-code in `src/lib/habitat-3d/clay-world.ts`. Don't ship `TweaksPanel`. |

### A.5 Recommended module breakdown

Citing line ranges of `habitat-clay-styles.jsx`:

| New TS module | Lines ported | Approx LOC |
|--------|------|------|
| `src/lib/habitat-3d/scene-host.ts` | `habitats-shared.jsx:6-88` (`buildSceneHost`, `attachOrbit`) | ~90 |
| `src/lib/habitat-3d/palette.ts` | `clay-styles.jsx:19-40` (`CLAY`, `_toonGrad`) + `habitats-shared.jsx:329-347` (material helpers) | ~50 |
| `src/lib/habitat-3d/clay-world.ts` | `clay-styles.jsx:50-606` (`buildClayWorld`, including the inline curveDisk, ground helper, paths, lake, trees, rocks, flowers, butterflies, mushrooms, toys, lion path) | ~580 |
| `src/lib/habitat-3d/clay-animation.ts` | `clay-styles.jsx:608-720` (sleep cycle) + `:780-971` (walk + storybook extras) + `:973-1036` (elephant anim) | ~310 |
| `src/lib/habitat-3d/clay-ambient.ts` | `clay-styles.jsx:720-781` (sleep bubbles) + `:1038-1078` (drinking FX) + `:1079-1368` (storybook ambient — pollen, petals, birds) | ~340 |
| `src/lib/habitat-3d/clay-characters.ts` | `clay-styles.jsx:1370-1511` (chibi lion) + `:1512-1559` (bunny) + `:1560-1733` (mascot lion) + `:1734-1831` (giraffe) + `:1832-2026` (storybook lion) + `:2027-2114` (elephant) | ~700 — note: chibi lion + bunny + mascot lion + giraffe can be dropped since only the Storybook lion + elephant are used by `ClayHabitatLevel`. Trimming saves ~250 LOC. **Recommendation: port only `buildLionStorybook` and `buildElephant`** (and `buildBunny`/etc. become Course 2+ work, not Phase 13). |
| `src/lib/habitat-3d/feature-flags.ts` | `clay-styles.jsx:44-48` (`DEFAULT_FEATURES`) + `:2229-2254` (`featuresForLevel`, `LEVEL_CONFIG`) | ~40 |
| `src/lib/habitat-3d/mood-decay.ts` | NEW — see section C | ~80 |
| `src/lib/habitat-3d/types.ts` | NEW — interfaces for `WorldOpts`, `SceneContext`, `CharacterRig`, `OrbitHandle` | ~60 |
| `src/components/habitat-3d-canvas.tsx` | Port of `habitat-clay-styles.jsx:2257-2397` (`ClayHabitatLevel`) + the React wrapper from `habitats-shared.jsx:91-252` (`HabitatCanvas`) merged into one TSX file | ~250 |
| `src/components/habitat-3d-widget-canvas.tsx` | Slim variant — same `<ClayHabitatLevel>` at smaller size + `widget={true}` flag to disable HUD | ~80 |

Total: ~2500 LOC ported / new. ~250 LOC of unused alternative character builders dropped.

## Section B — Next.js 16 + Three.js Integration

### B.1 Dynamic-import + SSR-disabled pattern is unchanged

[VERIFIED via `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:62-72`] — `dynamic({ ssr: false })` works exactly as in older Next.js versions, BUT must be called from inside a `"use client"` parent. v1.0 `habitat-scene.tsx:1-2,58-61` and `habitat-widget.tsx:1-3,11-19` already do this correctly. Phase 13 just swaps the inner import string.

**No Next.js 16-specific gotcha for Three.js.** The lazy-loading docs explicitly mention `window` API access as a use case for `ssr: false` (line 262-272 of the same doc, Pages router section): *"useful if an external dependency or component relies on browser APIs like `window`."*

### B.2 Bundle code-split

Three.js is ~165KB gzip [CITED: bundlephobia.com/package/three@0.160.0]. Goal per SPEC R2 acceptance: "the production bundle contains Three.js as a dynamically-imported chunk, not inlined into the main bundle."

**How to verify after Plan 6:**
- `npm run build` and inspect `.next/static/chunks/` for a chunk named like `pages-…habitat…` or a numbered chunk that's >100KB.
- Or `next build` output table — Three.js chunks show up in the "First Load JS shared by all" section as separate entries.
- The dynamic-import boundary creates the split point automatically. No `next.config.mjs` changes needed.

### B.3 Strict Mode double-mount

React 19.2 Strict Mode in dev runs effects twice. Three.js cleanup must be tight:
- `renderer.dispose()` after the scene
- Traverse + dispose all geometries + materials
- Cancel any `requestAnimationFrame` IDs
- Remove all event listeners (`mousedown`, `touchstart`, `keydown`, `visibilitychange`, IntersectionObserver)

Designer code at `habitats-shared.jsx:190-211` already covers `renderer.dispose()` + the geometry/material traversal + observer disconnect. Port the pattern verbatim and ADD:
- `canvasWrapper.removeEventListener("keydown", onKey)` (R5)
- `mediaQuery.removeEventListener("change", onChange)` (R6)

## Section C — Mood + Decay Implementation Strategy

### C.1 What designer code already gives us for character animation

Verified by reading `clay-styles.jsx:796-971`:

| Behavior | Where | Mood-bindable? |
|----------|-------|---------------|
| Walk along Catmull-Rom curve with adjustable speed (`speedMul`) | `:817` | YES — speedMul becomes mood-bound |
| Trot cadence (leg + torso bobbing) | `:842-849` | Implicitly via speedMul |
| Tail swing (`leo.tailRoot.rotation.y/z`) | `:862-865` | Already automatic |
| Head sway + slight pitch | `:866-869` | Add mood-based offset (sad → head droop) |
| Eye blink with random interval | `:870-877` | Already automatic |
| Pupil tracking elephant in front of Leo | `:885-971` | Already automatic |
| Ear twitch (looked at line 885+ — uses `state.earTwitchT`) | `:885+` | Already automatic |
| Dust puffs under planted paws at trot speed | `:885+` | Already automatic |
| Sleep cycle (cave anchor lerp, breathing, legs tucked, eyes shut) | `:641-720` | Triggered by `state.sleeping` — Phase 13 leaves this on the L7+ London-time schedule |

**Verdict:** Existing idle is more than rich enough — supports recommendation A1 (close D-29).

### C.2 Mood binding (R7)

Per the existing `state` object passed through the update loop (`clay-styles.jsx:2318, 2340-2362`), add a new field `state.mood: TigerMood` that:

1. Modulates `state.speedMul` (already used at line 813) — excited=2.2, happy=1.5, neutral=0.9, sad=0.5
2. Adds a constant `headDroop` offset to `leo.headG.rotation.x` (line 868) — excited=0, happy=0, neutral=0.05, sad=0.15
3. Enables/disables sparkles for excited (NEW — port the existing `state.dustPool` pattern from `clay-styles.jsx:2318`, but tagged "sparkle" with the CLAY pink palette — matches D-07 "excited mood = bounce loop + sparkle particles")

Mood transitions per D-06:
- Sadder shift (excited → happy, happy → neutral, neutral → sad): lerp `speedMul` and `headDroop` over ~0.5s (crossfade)
- Happier shift: snap the new value and add a 0.3s `leo.root.position.y` bounce (`Math.sin(t * 6) * 0.15` for the first 0.3s after mood change)

### C.3 Decay strategy (R7)

Designer code does NOT implement decay [VERIFIED: grep `decay\|quality` in `clay-styles.jsx` returns no semantic matches]. Proposal:

**Three tiers per SPEC R7:**

| `quality` | Visual |
|----------|--------|
| `1.0` (pristine) | No change — designer's baseline |
| `0.4 ≤ quality < 1.0` | (a) Lerp `CLAY.ground` and `CLAY.flowerA/B/C` toward dull olive (`#6a7560`); (b) Tighten fog (`fog.near = 20 + (1-q)*16`, `fog.far = 60 + (1-q)*20`); (c) Slow butterfly speed by `0.3 + q*0.7` factor |
| `quality < 0.4` | (a+b+c above at full strength) plus (d) Hide butterflies group (`obj.visible = false`); (e) Hide flowers group; (f) Sky color shifts toward `#a8b5b8` (grey-blue) instead of `CLAY.sky` |

**Why this works:**
- All mutations are O(1) per-frame — set `material.color`, `fog.near`, `obj.visible`. No new render passes.
- Uses three.js APIs already in scene: `Color.lerpColors` [CITED: https://threejs.org/docs/#api/en/math/Color.lerpColors], `Fog.near/far`, `Object3D.visible`.
- Visually distinct enough to pass SPEC R7 — flowers gone + dull palette + tight fog reads as "the habitat is fading."
- Designer's existing IntersectionObserver + visibilitychange guards keep the cost bounded.

**Coupling to v1.0 D-13** ("Decay visual = elements fade out. Higher-level elements gradually disappear as quality drops — reverse of the additive progression"): the per-feature hiding (butterflies, then flowers, then ...) at quality<0.4 IS the reverse-additive progression. Matches.

**Cheap escape hatch:** if measurement in Plan 6 shows this is too subtle for the screenshots, escalate by adding `material.opacity` modulation on the `flowers` and `trees` groups for an additional ~5% GPU cost. Documented in Plan 4 as an open knob.

## Section D — Reduced-Motion + Keyboard Accessibility

### D.1 `prefers-reduced-motion` (R6)

Standard MDN pattern [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion]:

```typescript
const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
const reduced = mq.matches;
mq.addEventListener("change", (e) => setReduced(e.matches));
```

When `reduced === true`:
1. Pass `reducedMotion: true` into `attachOrbit()` → freezes auto-orbit (Example 1 above)
2. Skip `updateWorld()`'s cloud drift (`clay-styles.jsx:598-602`), butterfly orbit (`:590-597`), water shimmer (`:570`), lily bob (`:571`) — gate the `if (reducedMotion) return;` early in `updateWorld`
3. For level-up celebrations (D-20 carry-forward): replace the `motion.div` scale-pop in `habitat-scene.tsx:218-231` with an opacity-only fade. v1.0 already uses framer-motion; configure `transition.duration = reducedMotion ? 0 : 0.6`.
4. Tiger walk: keep it (walking IS the character's identity — freezing it makes him look broken). Designer's walk cycle is small motion (`clay-styles.jsx:842-849`); test with Josh if this needs more gating.

### D.2 Keyboard arrow-key orbit (R5)

**Where to attach:** The `<div>` wrapper around `<canvas>` (`habitats-shared.jsx:215-251`). Make it `tabIndex={0}` so it's focusable; show a visible focus ring via Tailwind `focus:ring-2 focus:ring-primary`.

**Hook into `attachOrbit`:** Add the `nudgeTheta(delta)` method shown in Example 1 above. Pressing ArrowLeft = `nudgeTheta(-0.12 * 0.016)` (one frame's worth of auto-orbit speed = matches D-26 acceptance "same `autoSpeed` as the auto-rotate"). Pressing-and-holding triggers keydown repeatedly per the OS — natural continuation.

**Acceptance criterion (SPEC R5)** — "focus the canvas, press ArrowRight, assert camera transform changes; press ArrowRight again, assert further change" — directly testable in Playwright via `page.keyboard.press('ArrowRight')` and reading `camera.position` via `page.evaluate`.

## Section E — Mini-Widget D-28 Perf Gate

### E.1 "CWV Good on dashboard with live 3D widget" — what to measure

**Methodology — committed plan for Plan 6:**

1. **Lighthouse desktop + mobile emulation.** Per SPEC R9: "all three thresholds met for both routes on a desktop AND a mobile emulation profile." Run `npx lighthouse http://localhost:3000/dashboard --preset=desktop` and `--preset=perf` (mobile default). Use `--throttling-method=devtools` for repeatability. Commit JSON output to `13-PERF.md`.
2. **Real-device measurement (mid-tier Android).** Per CONTEXT.md open Q2: "mobile WebGL frame rate floor (60fps target on mid-tier Android?)" — measure on at least one physical device (Pixel 6/7, Samsung A-series, or similar) via Chrome DevTools remote inspection. Record cold-load TTI + sustained FPS during widget auto-orbit.
3. **Compare against CWV "Good"** thresholds explicitly in SPEC R9: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.

**Live-vs-cached decision rule:** If desktop AND mobile-emulation AND real-device all pass CWV Good with the live 3D widget enabled → ship live. Otherwise → ship cached image (section E.3).

### E.2 WebGL context cap risk (CONTEXT.md open Q7)

[CITED: https://www.khronos.org/webgl/wiki/HandlingContextLost] — browsers cap WebGL contexts per page (Chrome: 16; Safari mobile: lower, often 4-8). Today the dashboard has one canvas (the PixiJS widget); Phase 13 keeps it at one (just changes the renderer). The full `/habitat` page also has one canvas. So normal browsing = 1-2 contexts, far from the cap.

**The risk is multi-tab + devtools + browser-internal canvases (offscreen renderers).** Mitigation:
- Listen for `webglcontextlost` event and show the cached loading skeleton instead of a broken canvas
- The cached-image fallback IS the safety net — if D-28 chooses live and a real user trips the cap, they see a static frame, not nothing
- Document the listener pattern in Plan 3:
  ```typescript
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    // show loading skeleton until restored
  });
  canvas.addEventListener("webglcontextrestored", () => {
    // rebuild scene
  });
  ```

### E.3 Cached-image fallback build pipeline

If D-28 falls back to cached: generate 9 hero images at `public/habitat/widget-l{1..9}.webp`.

**Three options:**

| Approach | Pros | Cons |
|----------|------|------|
| **Headless Three.js render in Node script** (e.g., `node-gl`, `@petamoriken/float16` for puppeteer-less rendering) | No browser dependency | Complex setup; headless GL doesn't match browser WebGL output exactly; would need to ship `node-gl` build deps |
| **Playwright page-render** (recommended) | Already a dev dep (`package.json:56`); real Chromium WebGL = identical to user; trivial to script | Build-time slow (~3s/level × 9 = 30s); Playwright outputs PNG/JPEG, WebP requires `sharp` post-process |
| **Manual designer export** | Designer-authored composition | Doesn't scale; not reproducible from code |

**Recommendation: Playwright (option 2).** Spec file at `e2e/scripts/render-hero-images.spec.ts` (sketched in Example 4); run only when D-28 measurement triggers fallback. Add to a separate npm script (`build:hero-images`) so it doesn't run on every CI build.

## Section F — v1.0 PixiJS Deprecation Surface

### F.1 All PixiJS-dependent files

[VERIFIED via Grep for `pixi|@pixi` in `src/`]:

| File | Imports PixiJS | Status per SPEC | Status per research |
|------|----------------|-----------------|----------------------|
| `src/components/habitat-canvas.tsx` | yes | SPEC R10 names: DELETE | DELETE |
| `src/components/habitat-layers.tsx` | yes | SPEC R10 names: DELETE | DELETE |
| `src/components/habitat-widget-canvas.tsx` | yes | SPEC R10 names: DELETE | DELETE |
| `src/components/tiger-sprite.tsx` | yes | **NOT named in SPEC** | **DELETE — only imported by `habitat-canvas.tsx:9`; orphaned after R10** ⚠ |
| `src/components/sparkle-particles.tsx` | yes | **NOT named in SPEC** | **DELETE — only imported by `habitat-canvas.tsx:8`; orphaned** ⚠ |
| `src/components/bird-sprite.tsx` | yes | **NOT named in SPEC** | **DELETE — only imported by `habitat-canvas.tsx:6`; orphaned** ⚠ |

### 🚩 FLAG: SPEC R10 file list is incomplete

SPEC R10 (lines 122-123) names 3 PixiJS files for deletion. The grep finds **6 PixiJS-dependent files**. The other 3 (`tiger-sprite.tsx`, `sparkle-particles.tsx`, `bird-sprite.tsx`) are ONLY imported by `habitat-canvas.tsx` (verified: their only import sites are in `habitat-canvas.tsx:6,8,9`). After R10's named deletions, they become dead exports.

**Recommendation for planner:**
1. Treat the 3 additional files as in-scope for Plan 6 (PixiJS removal) — orphaned dead code SHOULD die with its parent.
2. Update the Phase 13 acceptance checklist (in the planner's WORK.md or by adding a note in `13-SPEC.md` via `/gsd-update-spec` if the workflow supports it).
3. Final acceptance grep `grep -rn "pixi" src/ package.json` per SPEC line 121 will catch this — if all 6 files exist after Plan 6, the grep won't return 0.

### F.2 `package.json` removal scope

[VERIFIED via `package.json:25,38`]:

| Package | Action |
|---------|--------|
| `"@pixi/react": "^8.0.5"` | REMOVE |
| `"pixi.js": "^8.17.1"` | REMOVE |

No `@pixi/*` sub-packages, no other dependencies coupled. Clean removal.

### F.3 Sprite asset references

[VERIFIED via Grep for `sprites/habitat|sprites/tiger`]: 18 files total reference these paths. The source-code references are in the doomed PixiJS components only. The remaining references are all in `.planning/` (specs, research, plans) — they're historical documentation and stay.

### F.4 `habitat-engine.ts` PixiJS coupling

[VERIFIED via `Read` on `src/lib/habitat-engine.ts`] — the file is 247 lines of pure TypeScript with imports only from `@/db/schema`. No `pixi`, no DOM, no canvas references. **Zero coupling.** Confirms SPEC R10 boundary that the engine survives unchanged.

## Section G — Three.js 0.160 Quirks

### G.1 What's already in 0.160

| API | Designer use | Version it landed | Notes |
|-----|--------------|-------------------|-------|
| `outputColorSpace` (replacing `outputEncoding`) | `habitats-shared.jsx:12` | r152 (Apr 2023) | Designer uses the new name — already correct |
| `ACESFilmicToneMapping` | `habitats-shared.jsx:13` | long-standing | Stable |
| `MeshToonMaterial` + `gradientMap` (toon shading) | `habitats-shared.jsx:336`, `clay-styles.jsx:68` | long-standing | Stable |
| `DataTexture` for the toon gradient | `clay-styles.jsx:35-40` | long-standing | Stable |
| `CatmullRomCurve3` | `clay-styles.jsx:558` | long-standing | Stable |
| `PCFSoftShadowMap` | `habitats-shared.jsx:11` | long-standing | Stable |
| `HemisphereLight` | `clay-styles.jsx:96` | long-standing | Stable |
| Shadow camera bounds + `shadow.radius` | `clay-styles.jsx:87-93` | long-standing | Stable |
| `BufferGeometry` + `Float32BufferAttribute` | `clay-styles.jsx:227-229` | long-standing | Stable |
| Inline `ShaderMaterial` for sky gradient | `clay-styles.jsx:72-80` | long-standing | Stable |

[CITED: https://github.com/mrdoob/three.js/releases/tag/r160 — release notes mention shadow map disposal improvements + AgX tone mapping addition + removal of unspecified deprecated code; nothing in the designer code uses removed APIs]

### G.2 r160 → r184 changes that would matter if we upgraded

None of these affect Phase 13 (we're pinning 0.160 per SPEC), but for awareness:
- AgX tone mapping became default in r161 examples (designer uses ACES — unaffected)
- Various WebGPU work began in r161-170 (we're WebGL — unaffected)
- BatchedMesh stabilized (designer doesn't use — unaffected)

### G.3 React 19 + Three.js 0.160 — double-mount under Strict Mode

Standard pattern (already correct in designer code at `habitats-shared.jsx:104, 190-211`):

```typescript
useEffect(() => {
  const disposed = { current: false };
  // ... build scene, set up loop ...
  return () => {
    disposed.current = true;
    // ... renderer.dispose(); traverse + dispose; remove listeners ...
  };
}, [deps]);
```

The `disposed.current` flag inside the RAF callback prevents the second mount's loop from racing with the first mount's cleanup. [CITED: https://react.dev/reference/react/StrictMode — Strict Mode doc covers the rationale]

## Section H — Phase 12 vs. Phase 13 Sequencing

**Recommendation: Phase 12 first, then Phase 13.**

Rationale:
- Phase 12 (Pause cards) is a feature addition; Phase 13 is a renderer migration. Smaller, lower-risk work ships first.
- They are independent (CONTEXT.md confirms: "Phase 12 (Pause cards) and Phase 13 are independent").
- Phase 13's 6 plans, mid-phase D-28 perf gate, and full-screen visual-diff acceptance criteria mean it will take materially longer (estimate: 2-3x Phase 12's scope based on file count).
- Shipping Phase 12 first puts a deliverable in users' hands sooner — schedule risk reduction.
- No file overlap that I can detect — Phase 12 likely touches `src/components/study-session.tsx` or new pause-related routes; Phase 13 touches the habitat surface. Verify when Phase 12's SPEC is read by the planner (Phase 12 SPEC not consulted in this research).

If the planner sees overlap that I missed, swap the order. Otherwise: 12 → 13.

## Section I — D-29 Reassessment

[VERIFIED via reading `clay-styles.jsx:796-878` and `:885-971`]

Designer-implemented character idle behaviors:
- Walk along Catmull-Rom path with speed-modulated trot cadence (`:796-849`)
- Tail swing — root rotation + secondary tuft motion (`:862-865, :885+`)
- Head sway + slight pitch (`:866-869`)
- Eye blink with random ~2.5-4s interval (`:870-877`)
- Ear twitch (search confirmed `state.earTwitchT` usage in `:885+`)
- Pupil tracking — pupils follow elephant when it's in Leo's forward cone (`:888-971`)
- Dust puffs under planted paws at trot speed
- Brow micro-raise
- Sleep cycle (L7+): cave-anchored lerp, breathing, eyes shut, legs tucked (`:641-720`)

**This is well beyond "subtle skeletal idle (breathing, tail flick)" — it's a fully animated character.** The D-29 A/B was between (A) subtle skeletal idle, (B) fully static, (C) static + ambient float. The designer shipped (A++) — far past what was speccible without seeing the code.

**Recommendation: close D-29; existing idle is sufficient.** Planner should confirm with Josh in Plan 1 kickoff with a single-sentence question. If Josh confirms: drop the mid-phase A/B checkpoint, save ~1 day of designer iteration time. If Josh declines: the A/B checkpoint stands and Plan 4 grows accordingly.

## Section J — Plan Breakdown Recommendation

Recommended 6-plan breakdown (planner can override):

| # | Plan name | Scope | Depends on | Why this grain |
|---|-----------|-------|------------|----------------|
| 1 | **Three.js + ESM port of scene scaffolding** | `npm install three @types/three`; `npm uninstall pixi.js @pixi/react`; port `habitats-shared.jsx` → `src/lib/habitat-3d/scene-host.ts` + `palette.ts`; type the OrbitHandle/SceneContext interfaces; add `nudgeTheta` (R5 prep); add `reducedMotion` flag plumbing (R6 prep) | — | Smallest first-shippable unit; lets Plan 2 do its work against typed interfaces |
| 2 | **Port clay world + Storybook lion + elephant builders** | `clay-styles.jsx:50-606` → `clay-world.ts`; `:608-720,796-971,973-1036` → `clay-animation.ts`; `:720-781,1038-1078,1079-1368` → `clay-ambient.ts`; only `buildLionStorybook` + `buildElephant` from `:1370-2114` → `clay-characters.ts`; `:2229-2254` → `feature-flags.ts`. Pure TS, no React. | Plan 1 | Bulk of LOC; isolated to lib/; can be unit-tested with a dummy canvas in Vitest if needed |
| 3 | **React shell rewire (`<HabitatScene>` + new `habitat-3d-canvas.tsx`)** | Port `ClayHabitatLevel` (`clay-styles.jsx:2257-2397`) + the HabitatCanvas React wrapper (`habitats-shared.jsx:91-252`) merged into `src/components/habitat-3d-canvas.tsx`; swap `habitat-scene.tsx:58` to import from the new file; verify `/habitat` page renders L1 by default; keyboard orbit (R5) wired here | Plan 2 | First user-visible delivery; verifies R1/R2/R3/R4/R5 end-to-end at one level |
| 4 | **Mood + decay binding to `HabitatState`** | New `mood-decay.ts`; wire `state.mood` to animation channels (section C.2); wire `state.quality` to materials/fog/visible (section C.3); reduced-motion completes here (R6); unit tests + the 28 reference screenshots at level 5 (R7); D-29 confirmation question to Josh; rebuild on `level` change verified across all 9 levels (R1 final verification) | Plan 3 | Closes R6, R7; verifies R1 across the full level range; D-29 closure happens here |
| 5 | **Mini-widget shell rewire** | New `habitat-3d-widget-canvas.tsx` (80px variant, no HUD); swap `habitat-widget.tsx:11` to import from the new file; verify dashboard renders the widget against the current user's level + mood | Plan 3 (can run parallel to Plan 4) | Independent of mood/decay (widget can ship without decay first); de-risks D-28 measurement |
| 6 | **D-28 perf gate + CWV verification + PixiJS removal** | Lighthouse runs (desktop + mobile + real device) → `13-PERF.md` + `13-WIDGET-PERF.md`; if D-28 fallback triggered, build hero-image pipeline + ship `<img>`-based widget; delete all 6 PixiJS files (not 3); delete sprite assets; final acceptance grep `grep -rn "pixi" src/ package.json` = 0; final acceptance grep `grep -r "babel/standalone" src/ public/` = 0; verify Three.js code-split via `next build` output | Plans 1, 2, 3, 4, 5 | Final gate; everything must be green |

**Dependency graph:**
```
Plan 1 ──► Plan 2 ──► Plan 3 ─┬─► Plan 4 ─┐
                              └─► Plan 5 ─┴─► Plan 6
```

Plans 4 and 5 are parallel after Plan 3. Plan 6 gates everything.

**Open knobs for the planner:**
- Plan 4's "28 reference screenshots" (SPEC R7) could be split off into its own Plan 4.5 if Plan 4 gets too large.
- Plan 6 has high variance: if D-28 measurement passes → simple PixiJS deletion + Lighthouse confirmation (~half a day). If D-28 fails → adds the hero-image pipeline + asset generation + the widget conversion to `<img>` mode (~1-2 days).

## Sources

### Primary (HIGH confidence)
- `.planning/design/animations/habitats-shared.jsx` — full read (354 lines) — scene scaffolding, orbit, React wrapper
- `.planning/design/animations/habitat-clay-styles.jsx` — structural read (2425 lines; targeted reads of lines 1-100, 550-720, 796-900, 2116-2425) — world builder, level config, entry component
- `.planning/design/animations/Leo Habitat - All 9 Levels (Final v2).html` — full read (163 lines) — design-time entry
- `.planning/phases/13-3d-habitat/13-SPEC.md` — full — locked requirements
- `.planning/phases/13-3d-habitat/13-CONTEXT.md` — full — D-26 through D-29
- `.planning/design/habitat-art-assets.md` — full — threshold map + asset mapping
- `.planning/phases/05-habitat-ui/05-CONTEXT.md` — full — Phase 5 carry-forwards
- `src/lib/habitat-engine.ts` — full (247 lines) — `HabitatState` shape; no PixiJS coupling confirmed
- `src/components/habitat-scene.tsx` — full (234 lines) — existing React shell + dynamic-import pattern
- `src/components/habitat-widget.tsx` — full (77 lines) — existing mini-widget shell
- `src/components/habitat-widget-canvas.tsx` — partial — confirms PixiJS surface
- `package.json` — full — confirms `pixi.js@^8.17.1`, `@pixi/react@^8.0.5`, `next@16.2.1`, `react@19.2.4`, `playwright@^1.58.2`; no `three` yet
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` — full — confirms `dynamic({ ssr: false })` pattern unchanged in Next.js 16, and the "use client" parent requirement

### Secondary (MEDIUM confidence)
- `https://github.com/mrdoob/three.js/releases/tag/r160` (via WebFetch) — r160 release notes
- `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion` — reduced-motion standard pattern
- `https://www.khronos.org/webgl/wiki/HandlingContextLost` — WebGL context-loss API
- `https://threejs.org/docs/#api/en/math/Color.lerpColors` — color lerp API for decay
- `https://threejs.org/docs/#api/en/scenes/Fog` — fog API for decay
- `npm view three version` (via Bash) — confirmed latest is 0.184.0; SPEC pins 0.160

### Tertiary (LOW confidence — informational only)
- `https://bundlephobia.com/package/three@0.160.0` — three.js bundle size (~165KB gzip; not verified live, training estimate)
- `https://www.npmjs.com/package/@types/three` — @types/three release cadence

## Metadata

**Confidence breakdown:**
- Standard stack (Three.js 0.160, no helpers): HIGH — locked by SPEC + designer code
- Architecture (port plan, module layout, Next.js integration): HIGH — verified against codebase + Next.js docs
- Mood + decay strategy: MEDIUM — mood is well-supported by existing animation channels; decay is a proposal, will be validated only by Plan 4 screenshots
- Pitfalls: HIGH — designer code already side-steps the major ones; Pitfall 7 (SPEC file list incompleteness) flagged
- D-28 perf gate methodology: MEDIUM — Lighthouse methodology is standard; the live-vs-cached decision can only be made post-measurement
- D-29 closure recommendation: HIGH — verified by direct read of designer animation code

**Research date:** 2026-05-20
**Valid until:** 2026-06-19 (30 days — Three.js + Next.js are stable; mood/decay proposal may need revision after Plan 4 visual review)
