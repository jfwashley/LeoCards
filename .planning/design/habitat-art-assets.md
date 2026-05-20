# Habitat Art Assets — Course 1 (Levels 1-10)

**Status:** Designs complete (10 assets); production wiring TBD
**Captured:** 2026-05-20
**Owner:** Josh

The habitat progresses through 10 visual states tied to effective-card count. Designs are complete and queued for replacement of the v1.0 placeholder sprites (`public/sprites/habitat.png`).

## Visual Progression — Levels 1 → 10

| Level | Effective cards needed | Description | Asset slot |
|------:|----------------------:|:------------|:-----------|
| 1 | 0 (starting state) | Sparse / barren — new account, nothing earned | `habitat-l1.*` |
| 2 | 5 | First sign of life | `habitat-l2.*` |
| 3 | 15 | Early growth | `habitat-l3.*` |
| 4 | 30 | Establishing | `habitat-l4.*` |
| 5 | 50 | Mid-progression | `habitat-l5.*` |
| 6 | 80 | Lush | `habitat-l6.*` |
| 7 | 120 | Thriving | `habitat-l7.*` |
| 8 | 170 | Rich | `habitat-l8.*` |
| 9 | 230 | Near-complete | `habitat-l9.*` |
| **10** | **300** | **Endgame — Course 1 completion state** | `habitat-l10.*` |

(Source of truth for thresholds: `src/lib/habitat-engine.ts → LEVEL_THRESHOLDS`. Edit there if thresholds shift.)

## Key Constraints

- **Effective cards, not raw cards.** Level computation uses `floor(quality × learnedCardCount)`. If habitat quality decays (5%/day after the 2-day grace), the user can drop *down* visual levels even with the same learned-card total. Art must read in both directions — every "up" transition needs a believable "down" transition.
- **Levels are derived at request time, never stored.** Don't bake level into asset metadata; just render the current level state from `HabitatState.level`.
- **The Math.min(10, level) clamp is final.** No level 11 art needed.
- **Non-linear pacing.** Threshold deltas grow as the user progresses (Δ: +5, +10, +15, +20, +30, +40, +50, +60, +70). The level 9 → 10 jump is the largest — endgame should feel like a reward, not an incremental tick.

## Independent reward layers (do not bake into habitat art)

These overlay the habitat scene at runtime and should remain as separate sprite layers:

- **Tiger sprite** — `public/sprites/tiger.png` (mood-reactive: excited / happy / neutral / sad per `classifyMood`)
- **Milestone animals** — appear at separate card-count milestones (Phase 6), independent from habitat level
- **Decay overlay** — quality < 1.0 dims the scene via PixiJS ticker fading
- **Level-up celebration** — scale-pop overlay fired on level transitions
- **Sparkle particles** — burst on the "excited" mood window (60 min after a study session)

So Course 1's 10 habitat art assets cover the *environment* state only. Tiger, animals, particles, and overlays are composed on top by the PixiJS scene.

## File format expectations

To match the existing pipeline (`public/sprites/habitat.json` + `habitat.png`):
- **Format:** PNG with transparency, or WebP for size (whichever the PixiJS atlas loader is configured for — confirm in `habitat-scene.tsx` / `habitat-layers.tsx` before delivery)
- **Atlas:** Likely a single sprite atlas (one PNG + JSON manifest mapping `habitat-l1` … `habitat-l10` to atlas coordinates). v1.0 uses this pattern with `habitat.json`.
- **Resolution:** Match the canvas viewport (full habitat scene + mini-widget at 80px on the dashboard). Source assets ideally at 2× for retina scaling.
- **Layering:** Habitat art renders behind the tiger and overlays; design for it being a backdrop, not the focus.

## Wiring checklist (when assets land)

When the production art is delivered:

1. Drop assets into `public/sprites/` (replacing `habitat.png` + `habitat.json`)
2. Update the atlas manifest to expose `habitat-l1` … `habitat-l10` frame names
3. Update `src/components/habitat-layers.tsx` to swap the placeholder layer-by-level logic for the new asset keys
4. Update `src/components/habitat-scene.tsx` PixiJS scene composition if layering / transitions need changes
5. Manual QA pass: progress an account through levels via DB-direct card mastery increments; verify transitions both up and down (decay)
6. Move `Visual style is cute 2D illustrated` from PROJECT.md `Active` to `Validated` once shipped

## Tracking

- Active requirement: `Visual style is cute 2D illustrated (currently placeholder sprites)` — see `PROJECT.md → Active`
- v1.0 tech debt: `Placeholder sprite assets (tiger, habitat layers, bird) — not production art`
- Future scope ("Course 2+"): explicitly **not** a current requirement; revisit only if Course 1 art ships and engagement supports adding more habitats.
