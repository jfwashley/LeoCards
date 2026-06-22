---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Daybreak
status: ready_to_plan
stopped_at: Phase 21 complete (5/5) — ready to discuss Phase 22
last_updated: 2026-06-22T12:09:01.269Z
last_activity: 2026-06-21 -- Phase 21 Plan 04 executed (HabitatHero wiring + Option-D action line + StatusText 4-state machine + e2e retargets 09/12/07; 2011 tests green)
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 49
  completed_plans: 12
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-19 — v4.0 Daybreak UI redesign started)

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 22 — add a card

## Current Position

Phase: 22
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-22

Progress: [████████░░] 75%

## Shipped Milestones

- ✅ v1.0 MVP (2026-04-15) — Phases 1-8, 25 plans, 23 requirements satisfied
- ✅ v2.0 Image-to-Flashcards (2026-05-20) — Phases 9-11, 10 plans, 15 requirements satisfied
- ✅ v2.1 Living Habitat (2026-05-29, closed 2026-06-12) — Phases 12-13.2, 14 plans
- ⏸ v3.0 Performance & QA (partial) — Phase 14 shipped (QAOB-01..04); Phases 15-18 deferred

## Accumulated Context

### Decisions

- Daybreak spike (pre-Phase 19): Tailwind tokens in globals.css, Baloo 2 + Figtree in layout.tsx, src/components/daybreak/ (LionFace + auth scene/card), auth shell, redesigned Login — all verified against the mock. Phase 19 formalizes and extends this foundation.
- Phase 19 Plan 01: jsdom + @testing-library/react installed as Wave 0 dev deps (were not present). Per-file @vitest-environment jsdom docblock chosen over global env change. afterEach(cleanup) required for test isolation in @testing-library/react without jest globals. DSY-01 baseline confirmed — no edits to globals.css or layout.tsx needed.
- Phases 15-18 are reserved for the deferred v3.0 Performance & QA work; do not reuse those numbers for Daybreak.
- Habitat (Phase 24) is last: richest visual, most perf-sensitive, must stay light on mobile + pause under prefers-reduced-motion.
- [Phase ?]: Phase 19 Plan 03: Privacy-safe confirmation and expired-link dead-end patterns established for Forgot/Reset auth screens
- [Phase ?]: 19-04: Language pick mandatory — Skip on steps 1+2 jumps to step 3, not dashboard
- [Phase ?]: 19-04: Playwright test timeout 60s→180s; networkidle removed from waitForCompilation (HMR WebSocket blocks networkidle)
- [Phase ?]: 19-04: D-04 ordering — updateUser before createDeck ensures nativeLanguage persisted even if deck creation fails
- [Phase ?]: 19-04: T-19-04-INJ — z.enum(['en','fr','es']) validates at call site before authClient.updateUser
- [Phase ?]: Adapted card-stack.tsx in place with Daybreak surface tokens rather than reusing GhostPeek atom (auth GhostPeek renders top-edge strips h:22px, not full-height ghost cards; in-place reskin is lower-risk)
- [Phase ?]: Added data-testid=card-back-hint to back-face swipe cue to scope Playwright locator away from below-card showSwipeHint pill in study-session.tsx (avoids strict-mode multi-match)
- [21-01]: popover.tsx exports PopoverContent convenience wrapper (Portal>Positioner>Popup) in addition to the six required primitives — reduces boilerplate for Plan 02 deck-switcher consumer
- [21-01]: HabitatWidget import removed from dashboard/page.tsx as dead code after D-02 removal; Plans 03/04 own the habitat hero swap
- [21-03]: D-05 canonical max-level signal is nextLevelThreshold === null (level >= 9), NOT the mock's dead level >= 10 branch
- [21-03]: D-06 sleeping ring keeps the real conic-gradient (accurate degrees); overrides mock's #F3E3C6 greyed solid
- [21-03]: jsdom normalises hex→rgb() in element.style.background — tests use toMatch(/rgb\\(\\d+,\\s*\\d+,\\s*\\d+\\)/) not literal hex comparisons
- [21-03]: vitest auto-hoists vi.mock() — imports can be sorted per biome organizeImports without breaking mock behaviour

### Pending Todos

- ~~**[→ Phase 21 / DSH-02] Dashboard habitat hero medallion**~~ — DONE in Plan 03: `HabitatMedallion` + `HabitatHero` created; Plan 04 wires them into deck-view.tsx.
- ~~**[→ Phase 21 / DSH-04/05] "Your words" accordion + Daybreak rows**~~ — DONE in Plan 05: collapsed accordion, height/opacity motion, D-04 native-on-top, SourceTag, MasteryMeter, testids.
- **[→ Phase 21 / DSH-03] Remove "Browse words" from the populated-deck action line** (`deck-view.tsx` ~L195) — keep it only in the empty-deck state (`card-list.tsx`). Phase 19 UAT carry-forward.

### Blockers/Concerns

None at roadmap creation. Note: Phase 24 (Habitat) has a performance constraint — ambient motion must be light on mobile and fully paused under prefers-reduced-motion; verify against CWV gates at phase completion.

## Carried Tech Debt

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2.0 UAT | 10-HUMAN-UAT.md (offline vision eval reference-set) | Partial | v2.0 close |
| v2.0 UAT | 11-HUMAN-UAT.md (live browser walkthrough) | Partial | v2.0 close |
| v3.0 QA | QAJ-01..06 Core-journey QA harness (Phases 15-16) | Deferred | v3.0 partial close |
| v3.0 Perf | PERF-01..06 Performance baseline + opt + field (Phases 16-18) | Deferred | v3.0 partial close |

## Session Continuity

Last session: 2026-06-21T16:15:00.000Z
Stopped at: Phase 21 Plan 04 complete (all 5 plans done — 01, 02, 03, 04, 05)
Resume file: None — Phase 21 complete; next: Phase 22
