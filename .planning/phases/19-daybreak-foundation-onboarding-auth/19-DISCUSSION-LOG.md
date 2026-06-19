# Phase 19 Discussion Log

**Date:** 2026-06-19
**Phase:** 19 — Daybreak Foundation + Onboarding & Auth

> Human-reference record of the discuss-phase session. Not consumed by downstream agents (they read CONTEXT.md).

## Gray areas presented

The handoff settled most of the "what"; three genuine HOW decisions surfaced. User chose to discuss all three.

### Area 1 — Component strategy
- **Options presented:** (a) Dedicated Daybreak primitives (TField/TBtn/Pill/Card) reused across all screens; (b) Restyle shadcn Input/Button inline per-screen (as the Login spike does).
- **Selected:** (a) Dedicated primitives. → **D-01/D-02**
- **Note:** Refactor the existing Login spike to compose the new primitives; keep LionFace + AuthCard/DaybreakAuthScene.

### Area 2 — Welcome flow & language
- **Options presented:** (a) Dedicated `/welcome` route, language choice moved there; (b) Keep inline on `/dashboard`, just restyle to 3-step; (c) Hybrid — native at signup, target in welcome.
- **Selected:** (a) Dedicated `/welcome`, language moves there. → **D-03/D-04/D-05**
- **Note:** signup drops its language field; native+target chosen in welcome step 3; 0-deck users on /dashboard redirect to /welcome.

### Area 3 — Mini-habitat preview (welcome step 2)
- **Options presented:** (a) Lightweight Daybreak teaser now; (b) Static still now; (c) Pull full habitat scene forward.
- **Selected:** (a) Lightweight teaser. → **D-06**
- **Note:** Subtle motion, reduced-motion safe; full habitat reuse deferred to Phase 24.

## Deferred ideas
- Full habitat-scene reuse for welcome preview → Phase 24.
- Account/Settings redesign → future milestone.
- Commissioned Leo art / brand mark → future (CSS placeholder ships).

## Claude's discretion
- Primitive file layout/prop shapes; native-language persistence wiring post-signup; whether to commit the spike before refactoring; language-dropdown component choice.
