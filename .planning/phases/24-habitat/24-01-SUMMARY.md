---
phase: 24-habitat
plan: 01
subsystem: ui
tags: [vitest, playwright, css-animation, typescript, constants]

# Dependency graph
requires:
  - phase: 23-browse
    provides: Daybreak design system, node-env Vitest test patterns, biome config
provides:
  - src/lib/habitat-names.ts — H_NAME (levels 1–9) and H_NEXT (levels 1–8) pure data constants, RSC-safe
  - src/lib/habitat-tint.ts — moodTint(mood, isDecaying, level) pure helper returning rgba string
  - globals.css @keyframes hab-fall + .hab-confetti reduced-motion override
  - Wave-0 test scaffold: 5 new test files + 3 existing extended, e2e spec for celebration
affects:
  - 24-02: consumes H_NAME/H_NEXT, moodTint; data tests now GREEN as TDD gate
  - 24-03: celebration e2e spec provides automated verify for ?celebrate=N wiring

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure data modules: no imports, no use client, RSC-safe constant files"
    - "node-env Vitest source-grep pattern for JSX invariants"
    - "CSS-only @keyframes for habitat animation (no motion/react on /habitat route)"
    - "biome-safe: map[mood] ?? fallback instead of non-null assertion"

key-files:
  created:
    - src/lib/habitat-names.ts
    - src/lib/habitat-tint.ts
    - src/lib/__tests__/habitat-names.test.ts
    - src/components/__tests__/habitat-tint.test.ts
    - src/components/__tests__/habitat-prog-card.test.ts
    - src/components/__tests__/habitat-celebration.test.ts
    - e2e/24-habitat-celebration.spec.ts
  modified:
    - src/app/globals.css
    - src/components/__tests__/habitat-video.test.ts
    - src/components/__tests__/habitat-scene-video.test.ts
    - e2e/07-habitat-display.spec.ts

key-decisions:
  - "moodTint extracted to src/lib/habitat-tint.ts (not inlined in habitat-scene.tsx) for testability — habitat-tint.test.ts can import and call it directly"
  - "H_NEXT has keys 1-8 only (no L9 entry); moodTint uses map[mood] ?? 'rgba(0,0,0,0)' (no non-null assertion per biome noNonNullAssertion)"
  - "e2e/07-habitat-display.spec.ts selectors retargeted in this wave (not Wave 3) to avoid breakage: getByTestId('habitat-level-badge') + getByTestId('habitat-mood-chip')"
  - "href! non-null assertion in 07-habitat-display.spec.ts replaced with href ?? '/habitat' for biome compliance"

patterns-established:
  - "Wave-0 scaffold: create test files before source — tests execute (RED on missing) and commit first"
  - "Source-grep tests: readFileSync + regex assertions for JSX files that cannot be component-rendered in node env"
  - "CSS-only animation: @keyframes in globals.css, .hab-confetti class, prefers-reduced-motion override"

requirements-completed: [HAB-01, HAB-02, HAB-03, HAB-04]

# Metrics
duration: 45min
completed: 2026-06-24
---

# Phase 24 Plan 01: Habitat Wave-0 Foundation Summary

**H_NAME/H_NEXT pure constants + moodTint helper (GREEN, 8 unit tests) + @keyframes hab-fall in globals.css + full Nyquist test scaffold (5 new files, 3 extended) covering all HAB requirements**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-06-24T12:45:00Z
- **Completed:** 2026-06-24T12:54:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- `H_NAME` and `H_NEXT` constants extracted verbatim from the handoff design file as a pure RSC-safe data module (no imports, no hooks) — feeds Waves 2–3
- `moodTint(mood, isDecaying, level)` helper covering all 4 engine moods + decay grey wash + golden-hour L9 tint — unit-green (5 assertions)
- `@keyframes hab-fall` (confetti fall animation) + `@media (prefers-reduced-motion: reduce) .hab-confetti { animation: none }` override added to globals.css — CSS-only, zero JS
- 5 new Wave-0 test files created; 3 existing habitat test files extended with Phase 24 assertions; all execute under vitest/playwright (RED on missing Wave 2–3 sources is intentional)
- `e2e/07-habitat-display.spec.ts` selector retargets from text-based to `data-testid` anchors (habitat-level-badge, habitat-mood-chip) ahead of the re-skin

## Task Commits

1. **Task 1: Wave-0 test scaffold — 5 new files + 3 extended** — `c7f3ae3` (test)
2. **Task 2: Constants module + moodTint helper + hab-fall keyframe** — `22e949e` (feat)

## Files Created/Modified

- `src/lib/habitat-names.ts` — H_NAME (Record 1–9 level names) and H_NEXT (Record 1–8 level unlocks, no L9 entry), pure data, RSC-safe
- `src/lib/habitat-tint.ts` — `moodTint(mood, isDecaying, level): string` — decay→grey, L9→golden-hour, 4 moods→distinct rgba values
- `src/app/globals.css` — @keyframes hab-fall + prefers-reduced-motion .hab-confetti override appended
- `src/lib/__tests__/habitat-names.test.ts` — HN1/HN2/HN3: asserts H_NAME[1-9], H_NEXT[1-8], H_NEXT[9]===undefined, H_NEXT[n].at===n+1
- `src/components/__tests__/habitat-tint.test.ts` — HT1-HT5: asserts decay grey wash, L9 golden-hour distinct, 4 moods distinct, specific rgba values for excited/sad
- `src/components/__tests__/habitat-prog-card.test.ts` — HP1-HP4: source-grep h-prog-card.tsx for pct formula identifiers and L9 "Course 1 complete" copy (RED until Wave 2)
- `src/components/__tests__/habitat-celebration.test.ts` — HC1-HC4: no motion/react import, confetti gated on !reducedMotion, data-testid="habitat-celebration", 2500ms timer in habitat-scene.tsx (RED until Wave 2–3)
- `e2e/24-habitat-celebration.spec.ts` — ?celebrate=5 overlay appears + disappears after 3.2s (RED until Wave 3)
- `src/components/__tests__/habitat-video.test.ts` — V12-V16 added: IntersectionObserver, innerWidth<768, video.pause(), setTimeout, play().catch (RED until Wave 2)
- `src/components/__tests__/habitat-scene-video.test.ts` — VS7 added: celebratingLevel present, _celebratingLevel absent (RED until Wave 2)
- `e2e/07-habitat-display.spec.ts` — Selector retargets: getByText("Level") → getByTestId("habitat-level-badge"); mood text → getByTestId("habitat-mood-chip"); href! → href ?? "/habitat"

## Decisions Made

- `moodTint` extracted to its own module (`habitat-tint.ts`) rather than staying inline in `habitat-scene.tsx` — enables direct unit testing without source-grep; cleaner import story for Wave 2
- e2e/07-habitat-display.spec.ts retargeted in Wave 0 (not deferred to Wave 3) because the breaking selector change happens in Wave 2/3 and the testid anchors need to match before those components land

## Deviations from Plan

None — plan executed exactly as written. The `href!` → `href ?? "/habitat"` substitution in e2e/07 was a biome `noNonNullAssertion` compliance fix consistent with project rules (not a plan deviation).

## Issues Encountered

One minor biome formatting issue in `habitat-names.test.ts` (extra parentheses around `expect(...)` call) fixed inline before commit — rule 1 auto-fix, not tracked as a deviation.

## Known Stubs

None — this plan creates pure data + test infrastructure only. No UI components, no data bindings, no placeholders.

## Threat Flags

No new threat surface introduced. All new files are pure data constants, a pure function, CSS, and test files. The threat register accepts T-24-01-XSS / T-24-01-CSS / T-24-01-SC as accepted/N-A per the plan's threat model.

## Next Phase Readiness

- Wave-0 foundation complete: H_NAME, H_NEXT, moodTint all green and importable by Waves 2–3
- All Wave 2–3 plans have automated RED tests providing verify gates before implementation
- `npx tsc --noEmit` passes; biome clean on all touched files
- e2e/07 selectors pre-retargeted to avoid breakage when HTop atoms land in Wave 2

---
*Phase: 24-habitat*
*Completed: 2026-06-24*
