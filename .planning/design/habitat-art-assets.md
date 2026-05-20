# Habitat Art Assets — Course 1 (3D, Levels 1-10)

**Status:** Designs complete (10 assets); production wiring deferred to Phase 13
**Captured:** 2026-05-20 (updated same day: scope shifted from 2D sprites → 3D scenes)
**Owner:** Josh
**Phase:** 13 (`.planning/ROADMAP.md → Phase 13: 3D habitat`)

The habitat progresses through 10 visual states tied to effective-card count. Designs are complete and queued to replace the v1.0 placeholder PixiJS sprites with a **3D scene** per level. Renderer (Three.js / react-three-fiber direction) and asset-pipeline details to be locked in Phase 13 discuss-phase.

## Visual Progression — Levels 1 → 10

| Level | Effective cards needed | Description | Scene slot |
|------:|----------------------:|:------------|:-----------|
| 1 | 0 (starting state) | Sparse / barren — new account, nothing earned | `scene-l1` |
| 2 | 5 | First sign of life | `scene-l2` |
| 3 | 15 | Early growth | `scene-l3` |
| 4 | 30 | Establishing | `scene-l4` |
| 5 | 50 | Mid-progression | `scene-l5` |
| 6 | 80 | Lush | `scene-l6` |
| 7 | 120 | Thriving | `scene-l7` |
| 8 | 170 | Rich | `scene-l8` |
| 9 | 230 | Near-complete | `scene-l9` |
| **10** | **300** | **Endgame — Course 1 completion state** | `scene-l10` |

(Source of truth for thresholds: `src/lib/habitat-engine.ts → LEVEL_THRESHOLDS`. The engine stays 2D-aware — it only computes `level: number`, not pixel/voxel state, so it's renderer-agnostic.)

## Tech-stack shift (2D PixiJS → 3D)

v1.0 habitat: PixiJS 8.x, 2D WebGL canvas, PNG sprite atlas (`public/sprites/habitat.png` + `habitat.json`).
v3-target habitat: **3D scene** per level (Three.js / r3f / Babylon — locked in discuss-phase).

PixiJS may stay for the 80px mini-habitat widget on the dashboard (cheap, 2D thumbnail), or be replaced with a downscaled 3D render / cached screenshot. **Decision deferred to Phase 13.**

## Key Constraints (carried from 2D, still apply in 3D)

- **Effective cards, not raw cards.** Level computation uses `floor(quality × learnedCardCount)`. If habitat quality decays (5%/day after the 2-day grace), the user can drop *down* visual levels even with the same learned-card total. The 3D scene must read in both directions — every "up" transition needs a believable "down" transition.
- **Levels are derived at request time, never stored.** The habitat engine emits `HabitatState.level` (1-10). Renderer reads that and chooses the scene.
- **The `Math.min(10, level)` clamp is final.** No level 11 scene needed.
- **Non-linear pacing.** Threshold deltas grow as the user progresses (Δ: +5, +10, +15, +20, +30, +40, +50, +60, +70). The level 9 → 10 jump is the largest — endgame should feel like a reward, not an incremental tick. In 3D this is the moment for a payoff: bigger camera reveal, more density, lit-up details, etc.

## Reward layers — everything is 3D now

Decision (2026-05-20): Tiger, milestone animals, particles all become 3D actors **inside the same scene** for visual coherence rather than 2D HUD overlays.

| Layer | v1.0 | v3-target |
|-------|------|-----------|
| Habitat environment | 2D sprite atlas, additive level layers | 3D scene per level |
| Tiger | 2D mood-reactive sprite (`tiger.png`) | 3D character with mood states (excited / happy / neutral / sad) — animation channels for mood transitions |
| Milestone animals | 2D sprites appearing at card-count thresholds | 3D models entering the scene with proper depth + lighting |
| Decay overlay | PixiJS ticker dimming | Material / lighting / density modifications on the scene |
| Level-up celebration | Scale-pop 2D overlay | Camera move + particle burst + scene transition |
| Sparkle particles ("excited" mood) | 2D particle system | 3D particle system (Three.js `Points` or instanced meshes) |

This means the **art deliverables for Course 1 cover the environment AND the tiger AND the milestone animals** — significantly more than 10 background scenes. Tally the asset list with the designer before Phase 13 plans.

## Asset format expectations (target — confirm in discuss-phase)

Assumed standards pending Phase 13 discuss:

- **Format:** glTF 2.0 (`.gltf` JSON + buffers, or single-file `.glb` binary). Industry standard for web 3D; supported by Three.js, r3f, Babylon, native browser loaders.
- **Materials:** PBR (baseColor + roughness/metallic + normal maps) OR stylized toon/cel-shading if the art direction demands flat shapes. The designer's intent governs.
- **Animation:** Embedded in the glTF — skeletal animation for the tiger, keyframed transforms for environment elements (swaying trees, water, etc.), morph targets for mood blendshapes if used.
- **Polycount / texture budget:** Per-scene budget TBD, but plan for mobile-first targets (~50k tris per scene + per character is a reasonable starting point; refine after a real spike measurement).
- **Atlasing:** Don't pre-bake texture atlases — let the engine batch.

**Open: the designer should not start exporting until Phase 13 nails the renderer + asset spec.** A wrong-format export wastes their time.

## Wiring checklist (when Phase 13 kicks off)

For when the production 3D assets are ready:

1. **Renderer chosen + installed** — Three.js / r3f / Babylon (Phase 13 decision)
2. **Glob `public/scenes/` (or similar)** for `.glb` files; lazy-import per scene
3. **Replace `src/components/habitat-canvas.tsx`, `habitat-layers.tsx`, `habitat-scene.tsx`** with the new 3D scene composer; keep `HabitatState.level` consumption unchanged
4. **Mood-reactive tiger** wired to animation clips on the tiger glTF rather than the existing 2D sprite swap
5. **Milestone animal entrances** rewired from 2D sprite layer adds to glTF instance loads
6. **Mini-habitat widget** decision: downscaled 3D render OR cached 2D screenshots OR keep PixiJS thumbnail
7. **Accessibility:** respect `prefers-reduced-motion` (no camera moves, freeze ambient anims)
8. **Performance gate:** bundle delta measured; Core Web Vitals on dashboard and `/habitat` page hold; mobile WebGL target verified
9. **Fallback tier?** Decide whether to ship a 2D-screenshot fallback for low-end devices or just gate the 3D experience behind a device-class check
10. **Move** `Visual style is cute 3D illustrated habitats` from PROJECT.md `Active` to `Validated` once shipped

## Tracking

- Active requirement: `Visual style is cute 3D illustrated habitats` — `PROJECT.md → Active` (updated 2026-05-20 from 2D)
- v1.0 tech debt: `Placeholder sprite assets` — superseded by Phase 13 (full pipeline migration, not a 1:1 sprite swap)
- Phase 13 roadmap entry: `.planning/ROADMAP.md` → `Phase 13: 3D habitat`
- Future scope ("Course 2+"): explicitly **not** a current requirement; revisit only if Course 1 ships and engagement supports adding more habitats.

## Pre-Phase-13 prep that can happen now (no engineering required)

- Designer confirms intended export format (glTF 2.0 / .glb) with their tool
- Designer documents intended polycount / texture sizes per scene + per character
- Designer documents mood animation channels for the tiger (4 states minimum: excited, happy, neutral, sad; transitions between them)
- Designer documents milestone-animal list + intended entrance animations
- Designer confirms art style: PBR realism vs. stylized toon — affects shader path
