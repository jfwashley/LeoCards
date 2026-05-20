---
phase: 13-3d-habitat
discussed: 2026-05-20
mode: discuss (default, 4 areas)
---

# Phase 13 — Discussion Log

Human-reference record of the discuss-phase Q&A. Not consumed by downstream agents (researcher / planner read CONTEXT.md).

## Area Selection

**Q:** Which gray areas do you want to discuss for Phase 13?
**Options presented (multiSelect):**
1. Interactivity level — backdrop vs. light vs. full
2. Scene architecture — 10 separate scenes vs. additive packs vs. morphing
3. Mini dashboard widget — live 3D vs. cached image vs. hybrid vs. drop
4. Tiger idle in 3D (revisit D-02) — skeletal idle vs. static vs. ambient float vs. defer

**User selected:** All four.

---

## Area 1: Interactivity Level

**Q:** How interactive should the habitat be?
**Options:**
- Backdrop only — look, don't touch
- Light interactivity — tap to pet / inspect
- Full interactivity — orbit + zoom + tap
- Decide after a Three.js spike

**User answer (freeform):** *"orbit only, camera rotates around an island only"*

**Interpretation:**
- Camera can rotate (orbit azimuthally), so not pure backdrop
- "Island" frames the habitat as a self-contained volumetric scene — viewable from any angle, no implicit "back"
- "Only" excludes zoom, pan, and tap interactions
- Sits BETWEEN "Backdrop only" and "Full interactivity" — a custom middle option not in the list

**→ Locked as D-26 in CONTEXT.md.**

---

## Area 2: Scene Architecture

**Q:** How are the 10 island scenes structured?
**Options:**
- A: 10 separate island `.glb` files, swap entirely per level
- B: 1 base island + 9 additive content packs
- C: 1 island that morphs (same geometry transforms)
- D: Decide post-spike

**User answer:** *"Whichever is the most technically feasible and doesn't affect performance. I just simply have the 10 separate islands so you are able to understand which assets live in which level."*

**Interpretation:**
- User defers implementation structure to technical judgment
- The 10 separately-designed islands are content reference, not implementation constraint
- Hard constraint: must not affect performance

**→ Locked as D-27 in CONTEXT.md. Researcher to evaluate options A/B/C against measured perf.**

---

## Area 3: Mini Dashboard Widget

**Q:** Mini widget on the dashboard — what does it show?
**Options:**
- A: Live 3D render at 80px, slowly auto-orbits
- B: Cached pre-rendered image per level (10 hero shots)
- C: Hybrid (cached image + tiny live tiger overlay)
- D: Drop the mini widget entirely — link only

**User answer:** *"I would like it to be the live 3D render at 80 px, slowly auto-rotating, but if that's going to be a hard thing to do with performance in mind, then I would sacrifice for it to be a cache-pre-rendered image per level."*

**Interpretation:**
- Clear preference: A (live 3D)
- Clear fallback: B (cached images)
- Hybrid and drop options implicitly rejected

**→ Locked as D-28 in CONTEXT.md. Researcher measures before locking; pre-render pipeline planned either way.**

---

## Area 4: Tiger Idle in 3D (revisit D-02)

**Q:** Tiger idle behavior in 3D — revisit D-02?
**Options:**
- A: Add subtle skeletal idle (breathing, tail flick)
- B: Keep D-02 literal — fully static pose
- C: Static pose + slight ambient float / sway
- D: Defer — designer prototypes both, we A/B feel

**User answer:** *"defer"*

**Interpretation:** Choose option D — sketch-checkpoint mid-phase.

**→ Locked as D-29 in CONTEXT.md. Plan a mid-Phase-13 sketch checkpoint where designer rigs one mood with both treatments; team A/Bs before committing remaining work.**

---

## Notes

- No scope-creep redirects occurred.
- No carry-forward decisions were contradicted; all v1.0 D-01–D-25 still apply except where Phase 13 revisits them (D-02, D-09, D-11, D-25).
- Discussion completed in 4 single-question turns (one per area). No deep-dives requested.

## Status

Discussion complete 2026-05-20. CONTEXT.md written. Ready for `/gsd-plan-phase 13` or `/gsd-spec-phase 13` (if falsifiable requirements wanted first) or `/gsd-spike` for renderer de-risk.
