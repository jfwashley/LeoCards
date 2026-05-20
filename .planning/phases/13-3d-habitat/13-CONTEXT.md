---
phase: 13-3d-habitat
phase_number: 13
discussed: 2026-05-20
discussion_mode: discuss
status: ready_for_research
spec_loaded: false
---

# Phase 13 — 3D Habitat: Context

## Domain

Migrate the habitat render pipeline from v1.0's PixiJS 2D sprite atlases to a 3D scene per habitat level (Course 1: levels 1–10). Tiger, milestone animals, and particles become 3D actors composed inside the same scene rather than 2D HUD overlays. Decision direction: cute-stylized illustrated 3D (not PBR realism).

This is a **renderer migration**, not a 1:1 asset swap. PixiJS-based habitat code (`habitat-scene.tsx`, `habitat-layers.tsx`, `habitat-canvas.tsx`, `habitat-widget-canvas.tsx`) gets replaced; the habitat engine (`src/lib/habitat-engine.ts`) is renderer-agnostic and stays intact.

## Canonical Refs

Required reading for researcher + planner before acting:

- `.planning/ROADMAP.md` — Phase 13 entry with the 9 open questions
- `.planning/PROJECT.md` — Active requirement: "cute 3D illustrated habitats"
- `.planning/design/habitat-art-assets.md` — Per-level threshold table + asset slot mapping + 3D-pivot rationale
- `.planning/phases/05-habitat-ui/05-CONTEXT.md` — v1.0 habitat-UI decisions (D-01 through D-25); many carry forward to Phase 13
- `src/lib/habitat-engine.ts` — Renderer-agnostic level computation (`LEVEL_THRESHOLDS`, `HabitatState`)
- `src/components/habitat-widget.tsx` — Current dashboard mini-widget React shell (stays; canvas internals get replaced)
- `src/components/habitat-scene.tsx` — Current full-page scene shell (stays; PixiJS internals get replaced)
- `src/components/habitat-canvas.tsx` — Current PixiJS canvas mount point (to be replaced)
- `src/components/habitat-layers.tsx` — Current PixiJS additive layer logic (to be replaced)
- `src/components/habitat-widget-canvas.tsx` — Current PixiJS mini-widget canvas (to be replaced or fallback per D-28)

No external standards / ADRs exist in-repo beyond the above.

## Carried Forward from Phase 5 (Habitat UI, v1.0)

These v1.0 decisions remain in force for Phase 13 — do NOT re-decide:

| Phase 5 ID | Decision | Phase 13 status |
|------------|----------|-----------------|
| D-01 | Cute cartoon art style (round, expressive, Duolingo-owl-style) | Carries — translates to stylized 3D, NOT PBR realism |
| D-03 | Tiger is small mascot size (15-20% of scene); habitat is the star | Carries |
| D-04 | Tiger randomly appears at one of 3 positions per page load (instant, no walking) | Carries — positions are scene-space, not screen-space |
| D-05 | Random left/right facing direction per page load | Carries — mirror the tiger model |
| D-06 | Mood transition direction: bounce for happier, crossfade for sadder | Carries — implemented via animation blending instead of sprite swap |
| D-07 | Excited mood = bounce loop + sparkle particles | Carries — particles become 3D (Three.js Points or instanced) |
| D-08 | Savanna / grassland environment | Carries — but now as an "island" form (see D-26) |
| D-10 | Static daytime sky — no mood-reactive sky | Carries |
| D-12 | Level 1 = bare grass + single tree | Carries — designer's level 1 island design must match |
| D-14 | Two views: full /habitat page + mini dashboard widget | Carries |
| D-15 | Full /habitat page: 60-70% viewport height, full-width, minimal overlay (level badge + mood indicator) | Carries |
| D-16 | Mini widget: tiny canvas + CSS progress bar, clickable, navigates to /habitat | Carries (with D-28 update on canvas type) |
| D-17 | Fixed aspect ratio, scale to fit container, mobile-optimized | Carries |
| D-18 | Spinner / loading indicator while assets load | Carries — now glTF instead of sprite-sheet load |
| D-19 | Scene fades in from loading state over ~0.5s | Carries |
| D-20 | Level-up: new elements fade in with scale-pop animation | Carries — in 3D, becomes a camera move + scale anim |
| D-21 | Fetch habitat state once on page load, no auto-refresh | Carries |
| D-22 | Render loop pauses when browser tab is hidden | Carries — Three.js render loop instead of PixiJS ticker |
| D-23 | Generic "Something went wrong" + retry on error | Carries |
| D-24 | Offline: show last cached API response + indicator | Carries |

**Decisions revisited or replaced in this phase:** D-02 (static pose), D-09 (additive layers), D-11 (parallax depth), D-25 (mini widget canvas type).

## Decisions Locked This Discussion

### D-26: Camera = orbit-only around an island habitat

User answer (paraphrased): *"Orbit only, camera rotates around an island only."*

- Camera azimuthally orbits the scene center (around the vertical axis)
- **No zoom, no pan, no tap-to-interact** — orbit is the only interaction
- Habitat scene is authored as a **roundish island** (volumetric, viewable from all angles) — NOT a 2D-vista-with-depth diorama
- Every camera angle must read; designer cannot rely on a "back side" that won't be seen
- Orbit must have a keyboard and touch equivalent for accessibility (left/right arrow keys; swipe) — researcher to confirm pattern
- Replaces v1.0's implicit "front-facing static camera" assumption

**Implication for D-04** (tiger at one of 3 positions): those 3 positions are in scene-space (around the island); orbit just changes which angle the user views them from.

### D-27: 9 designer islands = content reference; structure already feature-flag-additive in code

User answer (paraphrased): *"Whichever is the most technically feasible and doesn't affect performance. I just simply have the [9] separate islands so you are able to understand which assets live in which level."*

**Resolved by artifact inspection (2026-05-20):** The designer's `habitat-clay-styles.jsx` already implements scene composition via `featuresForLevel(level)` returning a feature-flag object (`lake`, `lilies`, `path`, `trees`, `rocks`, `flowers`, `grass`, `butterflies`, `mushrooms`, `cave`, `toy`, etc.). This is effectively **one base scene + feature-flag additive** (option B from the original discuss) — locked by what the designer built.

- Implementation structure: **single base scene + level-gated feature flags** (one TypeScript module per logical concern; `buildClayWorld()` consumes a `features` object that level number maps to)
- Total: 9 scene states reachable from one base — NOT 9 separate `.glb` files
- **Hard constraint:** Core Web Vitals "Good" thresholds (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) on both dashboard and /habitat page
- Mobile quality scaling already implemented (`Q = isMobile ? 0.55 : 1`) — porter preserves this
- Researcher's role here narrows from "pick a structure" to "measure the ported version against the perf gate"

### D-28: Mini dashboard widget — live 3D target, cached-image fallback

User answer (paraphrased): *"Live 3D render at 80px, slowly auto-rotating; if perf bad, fall back to cached pre-rendered image per level."*

- **Target (preferred):** Live WebGL 3D canvas at 80px on the dashboard, slowly auto-orbiting (no user input on the widget), mood-reactive (tiger animates), decay-reactive (materials shift)
- **Fallback (if perf bad):** Cached pre-rendered "hero angle" image per level (10 images, one per level), generated by a build-time pipeline. Static; does NOT react to mood or decay
- **Researcher MUST measure before locking** — cold-load TTI on dashboard, mobile frame rate, WebGL context count limit (browsers cap ~16 contexts)
- Either way, the **pre-render image pipeline gets planned** as the safety net (the cached images double as social-share artifacts and email-template imagery for free)
- **Rejected:** Hybrid (cached image + 2D tiger overlay), drop-widget-entirely

### D-29: Tiger idle behavior — deferred to mid-phase A/B checkpoint

User answer: *"defer"*

- Decision between (A) subtle skeletal idle (breathing, tail flick), (B) fully static D-02-literal, (C) static pose + slight ambient float — is genuinely subjective and cheaper to compare visually than to argue in text
- Plan a **mid-Phase-13 sketch checkpoint**:
  - Designer rigs ONE mood (probably "neutral" or "happy") with both treatments side-by-side
  - Team views the comparison live (or via short looped video clips)
  - Lock the call before designer commits to rigging the remaining 3 moods
- This is a **plan-level checkpoint** inside Phase 13, NOT a blocker for discuss-phase exit
- v1.0 D-02 ("static pose, no idle") is **provisionally suspended pending this checkpoint** — don't reaffirm it without the A/B

## Decisions Already Locked Outside This Discussion

Captured in the 2026-05-20 design/PROJECT.md update + the artifact-inspection update:

- **Tiger + milestone animals + particles = 3D actors in the same scene** (not 2D HUD overlays). Locked when the user chose "Everything 3D (most coherent visually)" earlier in this session.
- **Renderer = plain Three.js 0.160.x.** Locked by what the designer built (`.planning/design/animations/habitats-shared.jsx`). NOT react-three-fiber, NOT Babylon.
- **Assets are CODE, not files.** The designer artifacts are working Three.js JSX. No glTF / `.glb` pipeline needed. Phase 13 lifts the JSX into the Next.js codebase as TypeScript modules.
- **9-level system, not 10.** Level 1 = starting (Leo on the mound); level 9 = endgame (songbirds + golden-hour). Aligned the engine's `LEVEL_THRESHOLDS` to match designer's `ALL_UNLOCKS` (commit landed same day).
- **Soft Clay art direction.** Locked by `habitat-clay-styles.jsx` (selected by designer over `habitat-lowpoly.jsx` and `habitat-voxel.jsx` explorations).
- **Course 2+ is NOT a current requirement.** Explicitly out of scope; Course 1 only.

## Open for Researcher (Not User-Decision)

Most original "open for researcher" items were closed by the artifact discovery. Remaining:

1. **Decay rendering strategy** — designer code does NOT yet implement decay (quality < 1.0 visual). Researcher proposes: fade individual feature elements? desaturate materials? darken sky? Couples to v1.0 D-13.
2. **Performance budget verification** — measure the ported Three.js scene against CWV "Good" (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) on dashboard + /habitat page; mobile WebGL frame rate floor (60fps target on mid-tier Android?).
3. **Low-end device strategy** — designer code already has `Q = isMobile ? 0.55 : 1` quality scaling. Researcher decides if that's sufficient or if we need additional capability-gate / 2D-fallback tier.
4. **`prefers-reduced-motion` handling** — freeze auto-orbit on mini-widget, freeze ambient anims, skip level-up camera moves. Standard a11y pattern; researcher confirms hook + scope.
5. **v1.0 PixiJS code deprecation strategy** — assume full removal (no fallback tier needed) unless (3) tips us toward a 2D fallback.
6. **Phase 12 sequencing** — Phase 12 (Pause cards) and Phase 13 are independent. Researcher confirms execution order recommendation (probably 12 first since 13 is the bigger lift).
7. **Mini-widget WebGL context cost on dashboard (D-28 measurement)** — does adding a second WebGL canvas on the dashboard hit Chrome's ~16-context cap or trigger context-lost recycling on mobile? Decides D-28's live-3D vs. cached-image branch.
8. **Keyboard orbit for accessibility (D-26 follow-up)** — designer code has mouse + touch orbit but no keyboard equivalent. Standard pattern (arrow keys = +/- theta) — researcher confirms.
9. **D-29 reassessment** — designer code already has subtle character animation (walk, blink, ear twitch). Phase 13 should confirm with Josh whether the existing idle behavior IS the answer (and D-29 is closed), or whether the A/B sketch checkpoint still stands.

## Out-of-Scope / Deferred Ideas

Captured during discussion; not part of Phase 13:

- **Course 2+** (additional habitat themes beyond savanna island): explicitly NOT a current requirement; revisit only after Course 1 ships and engagement data supports it.
- **Full interactivity** (orbit + zoom + tap-to-interact): rejected in D-26. Could become a future phase if engagement data shows users want to "play" with the habitat.
- **Live camera capture for image-to-flashcards (IMG-F2)** and **multi-image batch (IMG-F1)**: already deferred from v2.0; unrelated to Phase 13.

## Deferred to Phase 13 Mid-Phase Checkpoints (planned)

- **Tiger idle A/B sketch** (D-29) — sketch checkpoint before committing remaining-mood animation work.
- **Live-widget vs cached-image perf gate** (D-28) — measurement checkpoint after first level's ported scene lands, before scaling to all 9.

## Acceptance Hints for Planner

(Not falsifiable yet — SPEC.md not generated. These guide the planner's thinking.)

- All 9 habitat levels render in 3D via plain Three.js (renderer locked by existing artifacts)
- Habitat engine output (`HabitatState.level`) drives scene selection unchanged from v1.0 — engine is renderer-agnostic
- Orbit-only camera; no zoom, no pan, no tap-to-interact (D-26)
- Mini widget either ships live 3D or cached images, per measurement gate (D-28)
- Tiger + animal moods + sparkle particles all 3D in-scene
- v1.0 dashboard + /habitat page Core Web Vitals NOT regressed (hard gate from D-27)
- `prefers-reduced-motion` respected — no auto-orbit on widget, no ambient anims, no celebratory camera moves
- Accessibility: keyboard + touch equivalents for orbit
- v1.0 PixiJS habitat code removed (or kept only as a feature-flagged fallback per researcher's call)

## Status

- **CONTEXT.md complete:** 2026-05-20
- **Next step (recommended):** `/gsd-plan-phase 13` — researcher gathers framework intel + benchmarks, planner breaks Phase 13 into plans with the open-for-researcher items resolved.
- Alternative: `/gsd-spec-phase 13` first if you want falsifiable requirements (P13-01..N) locked before the planner runs.
- Alternative: `/gsd-spike` — port one level (e.g., level 5 with the elephant companion) into the Next.js codebase first to verify integration approach and measure the perf gate, before scaling to all 9.
