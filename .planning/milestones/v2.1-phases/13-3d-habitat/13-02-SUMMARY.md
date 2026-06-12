---
phase: 13-3d-habitat
plan: 02
subsystem: habitat-3d
tags: [three.js, scene-graph, port, esm, feature-flags, characters, ambient]
dependency_graph:
  requires:
    - "13-01 (scene-host + palette + types)"
  provides:
    - "src/lib/habitat-3d/clay-level.ts (featuresForLevel, LEVEL_CONFIG, DEFAULT_FEATURES, FeatureFlags, LevelConfig)"
    - "src/lib/habitat-3d/clay-world.ts (buildClayWorld → ClayWorld with featureGroups + updateWorld + dispose)"
    - "src/lib/habitat-3d/clay-characters.ts (buildLionStorybook, buildElephant, rigMaterials, LionStorybookRig, ElephantRig)"
    - "src/lib/habitat-3d/clay-ambient.ts (buildSleepBubbles, buildElephantDrinkingFX, buildStorybookAmbient)"
    - "src/lib/habitat-3d/clay-animation.ts (applyLionWalk/Sleep/Extras, animateElephant, getSleepState, updateWorld proxy)"
  affects:
    - "Plan 13-03 (React wrapper) imports buildClayWorld + character + ambient + animation surfaces"
    - "Plan 13-04 (mood + decay) binds opacity to ClayWorld.featureGroups[name]"
tech_stack:
  added: []
  patterns:
    - "Dependency-inversion: buildClayWorld takes a SceneContext (built upstream by buildSceneHost) instead of constructing its own renderer — lets tests stub the renderer and lets Plan 03 own the mount lifecycle"
    - "DOM-free clay-* modules: procedural DataTexture replaces the designer's canvas-Z glyph for sleep bubbles; Plan 03 may inject a richer texture via opts.bubbleTexture"
    - "Named featureGroups keyed by feature name — Plan 04 mood/decay layer can fade individual scenery layers without traversing the scene graph"
    - "reducedMotion (SPEC R6) plumbed at the updateWorld layer — Plan 03's React wrapper just flips the flag"
key_files:
  created:
    - "src/lib/habitat-3d/clay-level.ts"
    - "src/lib/habitat-3d/clay-world.ts"
    - "src/lib/habitat-3d/clay-characters.ts"
    - "src/lib/habitat-3d/clay-ambient.ts"
    - "src/lib/habitat-3d/clay-animation.ts"
    - "src/lib/habitat-3d/__tests__/clay-level.test.ts"
    - "src/lib/habitat-3d/__tests__/clay-characters.test.ts"
    - "src/lib/habitat-3d/__tests__/clay-world.test.ts"
  modified: []
decisions:
  - "D-30: hard-code companionMode='meadow' inside buildClayWorld. Sanity-grep on .planning/design/animations/habitat-clay-styles.jsx confirmed `companionMode` is consumed ONLY by the L5 elephant placement; lakeside belonged to the alt-style demo wrappers Phase 13 drops. Re-introducing companionMode is a one-line additional opt if Phase 13.x needs it."
  - "D-31: 'songbirds' kept in FeatureFlags (per the Plan 02 <interfaces> contract). The designer gates birds via LEVEL_CONFIG.showBirds(lv) ≥ 9; we surface the same signal under FeatureFlags for downstream symmetry with the other feature gates."
  - "D-32: clay-ambient.buildSleepBubbles uses a procedural DataTexture instead of the designer's canvas-baked 'Z' glyph to keep the module DOM-free. opts.bubbleTexture lets Plan 03 inject a real canvas texture once a DOM is available."
  - "D-33: dependency-inversion of buildClayWorld — caller passes a SceneContext (built upstream) instead of buildClayWorld constructing its own renderer. Enables Vitest stubs + cleaner ownership of the renderer's lifecycle in Plan 03."
metrics:
  duration_minutes: ~18
  tasks_completed: 3
  files_touched: 8
  commits: 3
  completed_at: "2026-05-20"
---

# Phase 13 Plan 02: Clay world + characters + ambient + animation Summary

Pure-TypeScript port of the designer's `habitat-clay-styles.jsx` core: the additive level table (`featuresForLevel`), the world builder (`buildClayWorld`) with named feature groups, the two character rigs (Storybook lion + Elephant), the ambient effects (pollen / petals / birds / songbirds / sleep bubbles / drinking ripples / dust puffs), and the lion + elephant animation drivers. All modules are pure scene-graph: no React, no `window`/`document`, no DOM coupling.

## Tasks executed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | clay-level.ts + 12 unit tests pinning SPEC R1 (L1..L9 + additive + boundary) | `2eb96c6` |
| 2 | clay-characters.ts (Storybook lion + Elephant only) + 4 rig-shape tests | `8081e92` |
| 3 | clay-world.ts + clay-ambient.ts + clay-animation.ts + 15 world tests | `4925701` |

## Public exports (Plan 03 will consume)

**`src/lib/habitat-3d/clay-level.ts`**
- `featuresForLevel(level: number): FeatureFlags`
- `LEVEL_CONFIG: Record<number, LevelConfig>`
- `DEFAULT_FEATURES: Required<FeatureFlags>`
- types: `FeatureFlags`, `LevelConfig`

**`src/lib/habitat-3d/clay-world.ts`**
- `buildClayWorld(ctx: SceneContext, features: FeatureFlags, opts?: WorldOpts): ClayWorld`
- `gY(x, z): number` (ground-surface helper)
- types: `ClayWorld`, `ClayMatFactory`
- `ClayWorld` fields: `root`, `featureGroups` (lake / lilies / path / trees / rocks / flowers / grass / butterflies / mushrooms / cave / clouds / toys), `mat`, `lionCurve`, `updateWorld(dt, t, opts?)`, `dispose()`, `skyMat`

**`src/lib/habitat-3d/clay-characters.ts`**
- `buildLionStorybook(mat, seed?): LionStorybookRig` (channels: `root`, `torso`, `headG`, `legs.{FL,FR,BL,BR}`, `tailRoot`, `tailTuft`, `eyes[]`, `ears.{L,R}`, `brows.{L,R}`, `smile`, `legBaseY`, `materials[]`)
- `buildElephant(mat): ElephantRig` (THREE.Group with typed `userData`: `bodyG`, `headG`, `trunkRoot`, `trunkSegs[6]`, `earL/R`, `eyes[2]`, `blinkT`)
- `rigMaterials(rig): THREE.Material[]`
- type: `MatFactory`, `LionStorybookRig`, `ElephantRig`, `LionEyeRef`

**`src/lib/habitat-3d/clay-ambient.ts`**
- `buildSleepBubbles(scene, opts?): SleepBubblesHandle`
- `buildElephantDrinkingFX(scene, mat): DrinkingFXHandle`
- `buildStorybookAmbient(scene, mat, opts?): StorybookAmbientHandle`
- types: `SleepBubblesHandle`, `DrinkingFXHandle`, `StorybookAmbientHandle`, `StorybookAmbientOpts`, `DustPool`

**`src/lib/habitat-3d/clay-animation.ts`**
- `applyLionWalk(leo, lionCurve, dt, t, state)`
- `applyLionSleep(leo, dt, t, state)`
- `applyLionExtras(leo, elephant, dt, t, state)`
- `animateElephant(elephant, dt, t, opts?)`
- `getSleepState(demoMode, demoSeconds): SleepStateInfo`
- `updateWorld(world, dt, t, opts?)` (proxy to `world.updateWorld`)
- types: `LionState`, `CaveAnchor`, `SleepStateInfo`, `ElephantAnimOpts`

## Feature-group composition

`buildClayWorld()` composes the world root as a `THREE.Group` containing the always-on island + sky + lights, plus per-feature sub-groups added only when the corresponding `FeatureFlags` bit is set. Plan 04 binds decay opacity to these handles:

| Level | featureGroups present (beyond clouds + island + lights) |
|-------|---------------------------------------------------------|
| L1    | (none) |
| L2    | lake, lilies, path |
| L3    | + trees, rocks |
| L4    | + flowers, grass, butterflies |
| L5    | (same as L4; elephant added by Plan 03 via LEVEL_CONFIG[5].showElephant) |
| L6    | + mushrooms |
| L7    | + cave (sleepCycle on via LEVEL_CONFIG[7]) |
| L8    | + toys |
| L9    | + songbirds (perched + flying birds in clay-ambient); sky → golden-hour |

## Character builders ported

| Builder | Source lines | Status |
|---------|--------------|--------|
| `buildLionStorybook` | `habitat-clay-styles.jsx:1832-2025` | Ported |
| `buildElephant` | `habitat-clay-styles.jsx:2027-2113` | Ported |
| `buildLionChibi` | `:1370-1511` | DROPPED (RESEARCH A.5) |
| `buildBunny` | `:1512-1559` | DROPPED |
| `buildLionMascot` | `:1560-1733` | DROPPED |
| `buildGiraffe` | `:1734-1831` | DROPPED |

The `clay-characters.test.ts` `no excluded builders` test asserts the dropped builders are NOT exported.

## LOC tally

| File | LOC |
|------|-----|
| clay-world.ts | 925 |
| clay-ambient.ts | 634 |
| clay-characters.ts | 587 |
| clay-animation.ts | 444 |
| clay-level.ts | 112 |
| __tests__/clay-world.test.ts | 149 |
| __tests__/clay-level.test.ts | 123 |
| __tests__/clay-characters.test.ts | 99 |
| **Total** | **3073** |

Designer source ported (`habitat-clay-styles.jsx` lines 1-1368 + 1832-2113 + 2229-2254) ≈ 1700 LOC of behavioural JS expanded into 2702 LOC of typed TS (additional type declarations, biome formatting, doc comments).

Designer source NOT ported (dropped per RESEARCH A.5): `:1370-1831` (chibi + bunny + mascot + giraffe builders) + `:2116-2228` (ClayChibi / ClayStorybookV2 / ClayMascot wrappers) + `:2256-2425` (ClayHabitatLevel React wrapper + LEVEL_TITLES + HUD_STREAK + window.* exports) ≈ 800 LOC dropped — comfortably above the RESEARCH 600 LOC trim target.

## Verification

| Check | Status |
|-------|--------|
| `npx vitest run src/lib/habitat-3d/` | **45 passed / 0 failed** (6 files) |
| `npm run typecheck` | clean |
| `npx biome ci src/lib/habitat-3d` | clean (0 errors) |
| `grep -rn "from \"react\"" src/lib/habitat-3d/` | no matches |
| `grep -rn "\bwindow\\.\|\bdocument\\." src/lib/habitat-3d/clay-*.ts` | no matches (Task 3 Test 5 asserts this in CI) |
| `grep -rn "buildLionChibi\|buildBunny\|buildLionMascot\|buildGiraffe" src/lib/habitat-3d/` | no matches |

Repo-wide lint debt (87 pre-existing errors, all outside habitat-3d) is unchanged — out of scope per the execution contract.

## Deviations from designer code

All deviations are non-behavioural and serve the Plan 02 contract (no DOM in clay-*, dependency-inverted scene context, biome compliance):

1. **`buildClayWorld` takes a `SceneContext` instead of constructing its own renderer** (D-33). The designer calls `buildSceneHost(canvas, w, h, ...)` inline at `habitat-clay-styles.jsx:62`; we invert the dependency so Plan 03's React wrapper owns renderer lifecycle and tests can stub the renderer. Functional behaviour identical.

2. **`companionMode='meadow'` and `variant = level === 9 ? "golden-hour" : "default"` hard-coded** (D-30). RESEARCH Open Q 4. Pre-port sanity grep confirmed `companionMode='lakeside'` is consumed ONLY by alt-style demo wrappers Phase 13 drops; `variant` consumed ONLY by the L9 sky shader. Documented in `clay-world.ts` top-of-file comment.

3. **`buildSleepBubbles` uses a procedural `DataTexture` instead of `document.createElement('canvas')`** (D-32). The designer bakes a "Z" glyph into a CanvasTexture; we substitute a soft white blob to keep the module DOM-free. Plan 03 may inject a richer texture via `opts.bubbleTexture` once a DOM is available.

4. **`LEVEL_CONFIG` reshape**: designer ships `{ showElephant: (lv) => lv >= 5, ... }` (function predicates). Plan 02 ships `Record<number, LevelConfig>` per the plan `<interfaces>` block. Semantically equivalent; consumers read `LEVEL_CONFIG[5].showElephant`.

5. **`songbirds` flag added to `FeatureFlags`** (D-31). The designer gates birds via `LEVEL_CONFIG.showBirds(lv) >= 9` (separate predicate map). Plan 02 surfaces the same signal under `FeatureFlags.songbirds` for downstream symmetry — buildClayWorld itself does NOT consume it (birds live in `clay-ambient`), but Plan 03's wrapper will pass it to `buildStorybookAmbient`.

6. **`updateWorld` accepts `{ reducedMotion }`**: new opt-in flag (SPEC R6). The designer code has no reducedMotion gate; we added one at the world-update layer per Plan 02 Task 3 Test 4. Butterflies + cloud drift are skipped when `reducedMotion` is true.

7. **`LEVEL_TITLES`, `HUD_STREAK`, and the JSX wrapper not ported** (RESEARCH Open Q 3). The designer's HUD dies with the JSX wrapper; v1.0's React HUD is already correct.

## Self-Check: PASSED

- `src/lib/habitat-3d/clay-level.ts` — FOUND
- `src/lib/habitat-3d/clay-world.ts` — FOUND
- `src/lib/habitat-3d/clay-characters.ts` — FOUND
- `src/lib/habitat-3d/clay-ambient.ts` — FOUND
- `src/lib/habitat-3d/clay-animation.ts` — FOUND
- `src/lib/habitat-3d/__tests__/clay-level.test.ts` — FOUND
- `src/lib/habitat-3d/__tests__/clay-characters.test.ts` — FOUND
- `src/lib/habitat-3d/__tests__/clay-world.test.ts` — FOUND
- commit `2eb96c6` — FOUND
- commit `8081e92` — FOUND
- commit `4925701` — FOUND
