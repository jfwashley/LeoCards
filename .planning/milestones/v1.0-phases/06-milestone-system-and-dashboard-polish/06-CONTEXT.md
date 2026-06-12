# Phase 6: Milestone System and Dashboard Polish - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Level-up celebrations when the habitat progresses through its 10-level system, a bird sprite appearing at level 10 as the ultimate reward, and a per-language learned card breakdown on the dashboard. No separate milestone/threshold system — the existing level progression IS the milestone system.

</domain>

<decisions>
## Implementation Decisions

### Milestone System
- **D-01:** No separate milestone threshold system. The existing 10-level habitat progression (driven by learned card count + quality) already serves as the reward/progression mechanic.
- **D-02:** HAB-04 (milestone unlock moments) maps to level-up celebrations within the existing level system.
- **D-03:** HAB-05 (new animals at milestones) maps to a single bird appearing at level 10. Levels 1-9 already have visual rewards via habitat layers (trees, rocks, flowers, water, animals in the spritesheet).

### Level-Up Celebration
- **D-04:** Fullscreen overlay celebration — modal overlay with confetti, level number, and what was unlocked. User taps/clicks to dismiss.
- **D-05:** Celebration triggers after study session completes (after progress saves successfully). The natural reward moment.
- **D-06:** Exactly-once guarantee — once dismissed, never replays. Use `milestones_seen` table (already in schema) to track which level-ups have been celebrated.
- **D-07:** If user levels up multiple times in one session, show the highest level-up celebration only. Lower level-ups are silently marked as seen.

### Bird at Level 10
- **D-08:** A single bird sprite appears in the habitat at level 10 as the ultimate reward.
- **D-09:** Bird flies in from off-screen (animated entrance) when the level 10 celebration triggers.
- **D-10:** Bird remains visible in all subsequent habitat visits once level 10 is reached.

### Dashboard Language Breakdown
- **D-11:** Simple text below deck header showing per-language learned card counts. E.g., "French: 23 learned · Spanish: 10 learned · English: 4 learned".
- **D-12:** Only show languages that have at least one learned card — no zero-count entries.

### Claude's Discretion
- Confetti/particle implementation approach in the celebration overlay
- Exact bird sprite design and positioning in the habitat scene
- Query optimization for per-language learned card counts
- Level-up detection logic (compare before/after state in study/complete response)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Habitat Engine
- `src/lib/habitat-engine.ts` — Level computation (`computeLevel`), quality calculation, HabitatState type
- `src/lib/habitat-engine.test.ts` — Existing test patterns for habitat logic

### Habitat UI
- `src/components/habitat-canvas.tsx` — PixiJS Application setup, Scene component, useRendererSize hook
- `src/components/habitat-layers.tsx` — LEVEL_LAYERS mapping, sprite rendering per level
- `src/components/habitat-scene.tsx` — Client component wrapper with dynamic import
- `src/components/tiger-sprite.tsx` — Sprite animation patterns
- `src/components/sparkle-particles.tsx` — Existing particle effect pattern

### Study Flow
- `src/app/api/study/complete/route.ts` — Session commit endpoint (where level-up detection would occur)
- `src/components/study-session.tsx` — Study session UI with committing/end states

### Database
- `src/db/schema.ts` — `milestones_seen` table (already defined), `cards` table with `masteryRound`
- `src/lib/habitat-queries.ts` — Existing habitat data queries

### Dashboard
- `src/components/deck-view.tsx` — Current deck display component
- `src/app/(protected)/dashboard/page.tsx` — Dashboard server component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `milestones_seen` DB table: Already defined with userId + milestone unique constraint — ready for level-up tracking
- `SparkleParticles` component: Existing PixiJS particle effect — could inform celebration particle design
- `HabitatLayers`: LEVEL_LAYERS map defines which sprites appear at each level — bird would extend this at level 10
- `habitat-engine.ts`: `computeLevel()` pure function — level-up detection can compare before/after calls

### Established Patterns
- Compute-on-read: All habitat state derived from raw DB facts at request time
- PixiJS sprites: Loaded via Assets.load() inside Application tree, positioned with sceneWidth/sceneHeight percentages
- Study session: useReducer state machine with phases (studying → committing → end → error)
- Motion/React: Available for React-layer animations (celebration overlay)

### Integration Points
- Study session end screen (`study-session.tsx`): Where celebration overlay would render after successful commit
- `/api/study/complete` response: Could return `leveledUp: true, newLevel: N` to trigger client-side celebration
- `/api/habitat` route: Could return per-language breakdown data
- Dashboard page: Server component that queries deck and card data

</code_context>

<specifics>
## Specific Ideas

- Bird flies in from off-screen at level 10 — animated entrance, not just a fade-in
- Celebration is a fullscreen overlay (modal) with confetti, not just an in-canvas effect
- Language breakdown is simple text, not cards or progress bars — keeps dashboard clean

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-milestone-system-and-dashboard-polish*
*Context gathered: 2026-03-28*
