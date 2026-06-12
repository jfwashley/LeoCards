---
phase: 13-3d-habitat
plan: 05
subsystem: habitat-3d
tags: [three.js, widget, dashboard, dynamic-import, mood-reactive, webgl-context-loss]
dependency_graph:
  requires:
    - "13-03 (mountHabitatScene pattern + dispose semantics)"
    - "13-04 (applyMood + MoodAnimState)"
    - "13-02 (buildClayWorld, buildLionStorybook, featuresForLevel)"
  provides:
    - "src/components/habitat-3d-widget-canvas.tsx (live 3D dashboard widget at 80px)"
    - "mountHabitatWidgetScene factory — REUSES Plan 02/04 modules; no fork"
  affects:
    - "Plan 13-06 (cleanup): now owns the decision to delete habitat-widget-canvas.tsx (v1.0 PixiJS) AND owns the D-28 perf measurement to decide live-vs-cached"
tech_stack:
  added: []
  patterns:
    - "Two concurrent WebGL contexts per dashboard session (widget + future main canvas) — within the 8–16 context budget every browser supports"
    - "Inline auto-orbit-only camera driver (10 LOC) instead of attachOrbit, to avoid registering mousedown/touchstart on the canvas (D-16: click must bubble to parent <Link>)"
    - "Decay deliberately NOT applied at 80px (Plan 04 applyDecay skipped) — material tint deltas are imperceptible at this size and would only burn GPU. Mood reactivity IS kept since walk speed + head droop are the dominant visual"
    - "Renderer flagged isMobile:true unconditionally → Q=0.55 quality scalar pre-emptively keeps the widget cheap (T-13-20 mitigation)"
key_files:
  created:
    - "src/components/habitat-3d-widget-canvas.tsx (387 LOC, includes mountHabitatWidgetScene factory + React shell)"
    - "src/components/__tests__/habitat-3d-widget-canvas.test.tsx (412 LOC, 9 vitest tests)"
  modified:
    - "src/components/habitat-widget.tsx (+3/-3 — dynamic-import target swapped + prop shape widened to habitatState)"
decisions:
  - "D-43: Inline auto-orbit instead of `attachOrbit`. The plan suggested a `useHabitat3dScene` hook extraction, but that hook would still call `attachOrbit` which registers mousedown/touchstart on the canvas. Test 3 forbids those listeners (D-16: parent <Link> click must not be intercepted). The 10-LOC inline orbit avoids the listener registration entirely and keeps the existing main-canvas `attachOrbit` untouched (lower-risk than refactoring it to accept an `interactive: false` flag). Future Plan 13.x can revisit if a second widget-style canvas appears."
  - "D-44: No shared `useHabitat3dScene` hook extraction (plan <action> step 1). The two canvases share scene-graph helpers (buildSceneHost, buildClayWorld, featuresForLevel, applyMood, buildLionStorybook, updateWorld, applyLionWalk) but diverge on (a) orbit driver, (b) wrapper keyboard listeners, (c) decay application, (d) dev affordances, (e) canvas dimensions. A shared hook would carry 6+ flag knobs to switch between the two configurations; two small factories are clearer. The hard requirement — 'no fork of scene-graph modules' — is satisfied: zero scene-graph code is duplicated."
  - "D-45: Pixel size set explicitly via canvas.width/height (not only via buildSceneHost width/height args). This guarantees the rendered canvas matches the 80x80 CSS box even if React re-renders the shell. Style display:block + margin:0 auto centers the canvas inside the 100%-wide wrapper."
metrics:
  duration_minutes: ~25
  tasks_completed: 2
  files_touched: 3
  commits: 2
  completed_at: "2026-05-21"
---

# Phase 13 Plan 05: 3D dashboard widget (R8) Summary

Ported the dashboard mini-widget from PixiJS to Three.js. The dashboard now
mounts a live 80×80 3D scene rendering the user's current level + mood,
auto-orbiting at half the main canvas's rate. Closes R8's live-3D arm; the
perf measurement / cached-fallback decision (D-28) is Plan 06.

## Tasks executed

| Task | Description | Commit |
|------|-------------|--------|
| 1    | `habitat-3d-widget-canvas.tsx` + `mountHabitatWidgetScene` factory + 9 vitest tests | `f55ac04` |
| 2    | `habitat-widget.tsx` dynamic-import target swapped + prop shape widened to `habitatState` | `dcbf397` |

## Components created / modified

| Component | Status | Change |
|-----------|--------|--------|
| `habitat-3d-widget-canvas.tsx` | CREATED | 80×80 Three.js scene, auto-orbit only, mood-reactive |
| `habitat-widget.tsx` | MODIFIED | swap dynamic import + prop shape widening (3 lines) |
| `habitat-widget-canvas.tsx` | UNCHANGED | v1.0 PixiJS file still on disk (Plan 06 owns cleanup) |

## Swap diff (habitat-widget.tsx)

```diff
- const HabitatWidgetCanvas = dynamic(
-   () => import("@/components/habitat-widget-canvas"),
+ const HabitatWidgetCanvas = dynamic(
+   () => import("@/components/habitat-3d-widget-canvas"),
    {
      ssr: false,
      ...
    },
  );

- const { level, learnedCardCount, nextLevelThreshold, mood } = habitatState;
+ const { level, learnedCardCount, nextLevelThreshold } = habitatState;

- <HabitatWidgetCanvas mood={mood} />
+ <HabitatWidgetCanvas habitatState={habitatState} />
```

The outer `<Link href={celebratingLevel ? '/habitat?celebrate=...' : '/habitat'}>`
and the progress-bar markup at lines 49-72 are unchanged. D-16 click navigation
preserved.

## Scene-graph reuse confirmation (NO fork)

`mountHabitatWidgetScene` imports and calls the SAME modules used by
`mountHabitatScene` in `habitat-3d-canvas.tsx`:

| Module | Used by main canvas | Used by widget | Same import path |
|--------|---------------------|----------------|------------------|
| `buildSceneHost`       | ✅ | ✅ | `@/lib/habitat-3d/scene-host` |
| `buildClayWorld`       | ✅ | ✅ | `@/lib/habitat-3d/clay-world` |
| `featuresForLevel`     | ✅ | ✅ | `@/lib/habitat-3d/clay-level` |
| `LEVEL_CONFIG`         | ✅ | ✅ | `@/lib/habitat-3d/clay-level` |
| `buildLionStorybook`   | ✅ | ✅ | `@/lib/habitat-3d/clay-characters` |
| `applyMood`            | ✅ | ✅ | `@/lib/habitat-3d/mood-decay` |
| `MoodAnimState`        | ✅ | ✅ | `@/lib/habitat-3d/mood-decay` |
| `updateWorld`          | ✅ | ✅ | `@/lib/habitat-3d/clay-animation` |
| `applyLionWalk`        | ✅ | ✅ | `@/lib/habitat-3d/clay-animation` |
| `LionState`            | ✅ | ✅ | `@/lib/habitat-3d/clay-animation` |
| `attachOrbit`          | ✅ | ❌ (inline auto-orbit) | — |
| `applyDecay`           | ✅ | ❌ (skipped at 80px) | — |
| `buildElephant`        | ✅ | ❌ (not needed at 80px) | — |
| `animateElephant`      | ✅ | ❌ | — |

Zero scene-graph code duplicated. The widget differs only in (a) inline
auto-orbit (10 LOC, no drag listeners), (b) decay skipped, (c) no elephant
rig, (d) 80×80 dimensions, (e) no dev affordances or keyboard handler.

## Mood reactivity confirmation

Per-frame inside the widget's RAF loop:

```ts
const liveState = opts.stateRef?.current ?? habitatState;
applyMood(world, liveState.mood, moodState, now);  // ← R8 mood-reactivity
lionState.speedMul = moodState.speedMul;
updateWorld(world, dt, now / 1000, { reducedMotion });
applyLionWalk(lionRig, world.lionCurve, dt, now / 1000, lionState);
const droop = (lionRig.headG.userData.moodDroop as number | undefined) ?? 0;
lionRig.headG.rotation.x += droop;
const bounce = (lionRig.root.userData.moodBounce as number | undefined) ?? 0;
lionRig.root.position.y += bounce;
```

`stateRef.current = habitatState` runs on every React render so mood updates
flow into the widget without remounting the scene. Test 7 verifies `applyMood`
is invoked each frame with the live mood value.

## Dispose semantics

`mountHabitatWidgetScene` returns `{ dispose, getTheta, tickForTest }`.
`dispose()`:

1. Sets `disposedRef.current = true` so the next RAF callback early-returns
   (prevents the Strict-Mode double-mount race).
2. Calls `cancelAnimationFrame(raf)`.
3. Removes `webglcontextlost` + `webglcontextrestored` listeners on the canvas.
4. Calls `world.dispose?.()` (frees the ClayWorld's per-feature groups).
5. Traverses `ctx.scene` and disposes every geometry + material it finds
   (covers the lion rig and anything `buildClayWorld` attached directly to
   the scene).
6. Calls `ctx.renderer.dispose()` to free the WebGL context. This is the key
   T-13-20 mitigation: when the dashboard unmounts, the widget's context is
   released so the budget for the next view's main canvas is unaffected.

Test 9 verifies `dispose()` is idempotent and that both `renderer.dispose` and
`world.dispose` are called exactly once.

The widget canvas wrapper is `tabIndex={-1}` (not focusable) — the parent
`<Link>` in `habitat-widget.tsx` is the keyboard/focus target per D-16.

## WebGL context-loss handling (T-13-20)

```ts
const onLost = (e: Event) => {
  e.preventDefault();
  cancelAnimationFrame(raf);
  canvas.setAttribute("data-ready", "false");
  canvas.style.display = "none";  // ← parent progress bar remains
};
const onRestored = () => {
  canvas.style.display = "block";
  canvas.setAttribute("data-ready", "true");
  raf = requestAnimationFrame(tick);
};
```

When the second WebGL context is evicted (rare; happens when the user has
several tabs open with WebGL apps), the widget canvas hides itself and the
parent `<HabitatWidget>` shell (level badge + progress bar at
`habitat-widget.tsx:60-71`) carries the dashboard UI without a black square.
On restore, the canvas is unhidden and the RAF loop resumes. Test 8 verifies
the loss path.

## Unit test count

9 vitest tests, all green:

| # | Test name | What it pins |
|---|-----------|--------------|
| 1 | mounts at 80×80, renders, data-ready=true | buildSceneHost called with (canvas, 80, 80) |
| 2 | auto-orbit advances theta at ~0.06 rad/s | half-speed orbit |
| 3 | does NOT register mousedown/touchstart | D-16 click bubble preserved |
| 4 | does NOT register click/pointerdown | D-16 click bubble preserved |
| 5 | new level → new feature flags | level-driven rebuild correct |
| 6 | reducedMotion freezes orbit | R6 carry-forward |
| 7 | applyMood invoked each frame | R8 mood-reactive |
| 8 | webglcontextlost hides canvas | T-13-20 mitigation |
| 9 | dispose() idempotent + cleans up | T-13-21 mitigation |

## Verification

| Check | Status | Detail |
|-------|--------|--------|
| `npm run test` (vitest unit suite) | 1865 passed, 6 skipped | +9 over Plan 04 baseline (1856) |
| `npm run typecheck` | clean | full project |
| `biome ci` on 3 touched files | clean | 0 errors |

(The vitest "14 failed files" are the `e2e/*.spec.ts` files which import
`@playwright/test`. Vitest's default `include` pattern picks them up;
they're a pre-existing condition out-of-scope for this plan. `npm run test:e2e`
runs them under Playwright.)

## Deviations from plan

| Rule | Description |
|------|-------------|
| D-43 (design substitution) | The plan suggested a shared `useHabitat3dScene` hook (Task 1 <action> step 1). I instead created a sibling factory `mountHabitatWidgetScene`. The hook would still have called `attachOrbit`, which registers mousedown/touchstart on the canvas — Test 3 forbids these listeners (D-16). Refactoring `attachOrbit` to accept `interactive: false` would touch the main canvas's contract for a single use site; a 10-LOC inline auto-orbit in the widget is lower-risk. The hard requirement — "no fork of scene-graph modules" — is satisfied. |
| D-44 (scope) | No refactor of `habitat-3d-canvas.tsx` (plan <action> step 1 note: "the existing `habitat-3d-canvas.tsx` should be refactored to call this hook too. This refactor is a small follow-up inside this task"). Skipped because the hook itself was skipped per D-43. Main canvas behaviour unchanged. |

## Concerns for Plan 06 D-28 measurement

- **Two WebGL contexts simultaneously is the steady-state** when the user is
  on the dashboard. Modern browsers cap at 8–16 contexts, so two is well
  within budget — but mid-tier laptops with integrated graphics may show
  noticeable jank during scroll if the dashboard is below the fold and the
  widget keeps animating. Plan 06 should consider adding an
  IntersectionObserver-driven pause on the widget when it scrolls out of
  view (the `attachViewportGate` helper already exists in `scene-host.ts`
  — not wired here to keep this plan tight).
- **Same-tab dashboard → /habitat navigation:** the widget's `dispose()`
  will fire on route change (parent unmount), then the full-page canvas
  will spin up. There's a sub-second window where both contexts exist.
  Plan 06's perf budget should explicitly allow for that overlap.
- **No mood transition smoothing across remounts:** when the user navigates
  back to the dashboard, the widget starts with `prevMood: null` so the
  first frame applies the current mood instantly (no D-06 transition).
  This matches the main canvas behaviour and is correct — the transition is
  for in-session mood changes, not for resumed sessions.

## Known stubs

None.

## Self-Check: PASSED

- `src/components/habitat-3d-widget-canvas.tsx` — FOUND (387 LOC, ≥100 min)
- `src/components/__tests__/habitat-3d-widget-canvas.test.tsx` — FOUND (9 tests passing)
- `src/components/habitat-widget.tsx` — MODIFIED (3 lines, dynamic import + prop shape)
- `src/components/habitat-widget-canvas.tsx` — STILL ON DISK (Plan 06 owns deletion)
- commit `f55ac04` — FOUND (`feat(13-05): 3D dashboard widget`)
- commit `dcbf397` — FOUND (`feat(13-05): swap dashboard widget canvas to Three.js`)
