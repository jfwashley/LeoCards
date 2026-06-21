---
phase: 21-dashboard-my-deck
plan: "04"
subsystem: ui
tags: [daybreak, deck-view, habitat-hero, action-line, status-state-machine, e2e-retarget, vitest, dsah-02, dsah-03, dsah-07]

dependency_graph:
  requires:
    - phase: 21-dashboard-my-deck/03
      provides: HabitatHero + HabitatMedallion (data-testid="habitat-medallion") wired in here
    - phase: 21-dashboard-my-deck/01
      provides: languageBreakdown + HabitatWidget removed from DeckView props and page.tsx
    - phase: 21-dashboard-my-deck/05
      provides: words-accordion-header testid + "N learned" copy (e2e/09 test 1 depends on it)
  provides:
    - DeckView Daybreak body (HabitatHero + Option-D action line + StatusText 4-state machine)
    - data-testid="add-a-card" on the populated pill (e2e/04 relies on accessible "Add a card" link name)
    - deck-view.test.tsx (10 unit tests covering all action-line states)
    - e2e/09-language-breakdown.spec.ts (rewired for D-02 removal; asserts words-accordion-header + habitat-medallion)
    - e2e/12-pause-cards.spec.ts (retargeted "All paused" status-row copy)
    - e2e/07-habitat-display.spec.ts (retargeted to habitat-medallion testid + /\d+ of \d+ cards/)
  affects:
    - 21-VALIDATION.md (21-04-01 and 21-04-02 rows)
    - Wave-2 e2e boundary gate (09 / 12 / 07 now run with dev server after all Wave-2 plans land)

tech-stack:
  added: []
  patterns:
    - "Option-D action line: full-width StudyButton (Link when due, aria-disabled div when not) + status row with StatusText + Add-a-card pill"
    - "StatusText 4-state machine: due (amber dot+dueCount) / none (outline dot+0 due) / cooldown (LionFace+z+CountdownTimer) / all-paused (pause bars+All paused)"
    - "allPaused guard: initialCards.every(c => c.pausedAt !== null) to distinguish none-due from all-paused (both use !hasDueCards && !earliestCooldownEnd)"
    - "CountdownTimer renders Resting status text inline (not a standalone disabled button)"

key-files:
  created:
    - src/components/deck-view.test.tsx
  modified:
    - src/components/deck-view.tsx
    - e2e/09-language-breakdown.spec.ts
    - e2e/12-pause-cards.spec.ts
    - e2e/07-habitat-display.spec.ts

key-decisions:
  - "allPaused distinguished from none-due by initialCards.every(c => c.pausedAt !== null) — avoids showing All paused when there are eligible-but-uncooled cards"
  - "CountdownTimer reused as-is for interval+router.refresh; its returned JSX changed to render the Resting status text inline (not the old disabled button)"
  - "dueCount derived client-side from non-paused non-cooldown cards as proxy (hasDueCards is authoritative server flag; display count is best-effort)"
  - "noNonNullAssertion warning on e2e/07 line 25 (href!) is pre-existing and out of scope per CLAUDE.md scope boundary rule"

requirements-completed: [DSH-02, DSH-03, DSH-07]

metrics:
  duration: "~30 min"
  completed_date: "2026-06-21"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase 21 Plan 04: Daybreak DeckView — HabitatHero + Option-D Action Line Summary

**One-liner:** Daybreak DeckView with HabitatHero (DSH-02 wiring, sleeping=true during cooldown), Option-D action line (full-width StudyButton + 4-state StatusText + Add-a-card pill), and three e2e specs retargeted for the Daybreak re-skin.

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-06-21
- **Tasks:** 2/2
- **Files modified:** 5 (1 new)

## Task Commits

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Wire HabitatHero + Option-D action line + StatusText state machine | 4513f4f | done |
| 2 | Retarget e2e — 09 rewrite, 12, 07 (L-06) | 51af669 | done |

## Accomplishments

**Task 1 — deck-view.tsx rewrite:**
- Replaced `HabitatWidget` import with `HabitatHero`; passes `sleeping={Boolean(earliestCooldownEnd && !hasDueCards)}` per DSH-02/D-06
- Built `PlusGlyph` (inline CSS, matches mock) and `StatusText` (4-state: due/none/cooldown/all-paused)
- `CountdownTimer` component preserved verbatim for the 60s interval + `router.refresh()` on expiry; its JSX changed from the old disabled button to render the "Resting · {countdown}" inline status span (LionFace+z napping glyph)
- Option-D action line: `hasDueCards` renders an active amber `<Link href="/study?deck=...">` (58px, radius 14, shadow); else renders a dimmed `<div aria-disabled="true">` (bg #F4E7D2, color #B49B78)
- "Add a card" pill: `<Link>` with `data-testid="add-a-card"` (height 40, radius 12, border 1.5px #EDDFC9, PlusGlyph + "Add a card")
- "Browse words" removed from populated view (L-05); "All cards are paused — unpause one to study." folded into "All paused" StatusText branch (D-06 sibling)
- 10 unit tests in `deck-view.test.tsx` covering all 5 action-line behaviors (due/none/cooldown/all-paused/browse-absent-add-present)

**Task 2 — e2e retargets:**
- `e2e/09-language-breakdown.spec.ts`: renamed describe to "Dashboard — habitat hero and deck integration"; test 1 asserts `data-testid="words-accordion-header"` + `/\d+ learned/` (Plan 05 accordion); test 3 asserts `/Level \d+/` + `getByTestId("habitat-medallion")` instead of removed "My Deck"
- `e2e/12-pause-cards.spec.ts`: replaced `"All cards are paused — unpause one to study."` with `"All paused"` at lines 150 and 159; updated line-20 doc comment
- `e2e/07-habitat-display.spec.ts`: retargeted `.bg-secondary.rounded-full` → `getByTestId("habitat-medallion")`; retargeted `/\/.*cards/` → `/\d+ of \d+ cards/`; loosened `"Level 1"` → `/Level 1/` regex

## Gates

| Gate | Result |
|------|--------|
| `npx vitest run src/components/deck-view.test.tsx` | 10/10 PASS |
| `npx tsc --noEmit` | CLEAN |
| `npm test` (full unit suite) | 2011/2011 PASS (6 expected skips) |
| `npx biome ci deck-view.tsx deck-view.test.tsx` | CLEAN |
| `npx biome ci 09/12/07 e2e files` | 1 pre-existing warning (noNonNullAssertion in 07 line 25 — out of scope) |
| `grep -c "HabitatWidget" deck-view.tsx` | 0 |
| `grep -c "Browse words" deck-view.tsx` | 0 |
| `grep -c "All cards are paused" deck-view.tsx` | 0 |
| `grep -c "All paused" deck-view.tsx` | 1 |
| `grep -c "Resting" deck-view.tsx` | 2 |
| `grep -c "router.refresh" deck-view.tsx` | 1 |
| `grep -c "add-a-card" deck-view.tsx` | 1 |
| `grep -rc "My Deck" e2e/` | 0 (all spec files) |
| `grep -rc "All cards are paused" e2e/` | 0 (all spec files) |
| `grep -rc "bg-secondary.rounded-full" e2e/` | 0 (all spec files) |
| `grep -c "habitat-medallion" e2e/07` | 2 |
| `grep -c "learned" e2e/09` | 3 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `allPaused` logic — none-due vs all-paused disambiguation**
- **Found during:** Task 1 (first test run)
- **Issue:** Initial `allPaused = hasCards && !hasDueCards && !earliestCooldownEnd` was identical to the none-due condition. Test fixture with unpaused cards triggered the "All paused" branch when it should show "0 due".
- **Fix:** Added `initialCards.every((c) => c.pausedAt !== null)` guard, matching the semantic intent of the original "All cards are paused" paragraph condition.
- **Files modified:** `src/components/deck-view.tsx`
- **Verification:** Tests 2 and 4 both pass; none-due shows "0 due", all-paused shows "All paused"
- **Committed in:** 4513f4f (Task 1)

**2. [Rule 1 - Bug] Fixed HabitatState fixture — spurious `currentXp` property**
- **Found during:** Task 1 (tsc after test pass)
- **Issue:** Test fixture used `currentXp: 0` which does not exist on `HabitatState`; tsc error TS2353.
- **Fix:** Replaced with correct fields: `quality`, `effectiveCardCount`, `isDecaying`, `minutesSinceActivity`.
- **Files modified:** `src/components/deck-view.test.tsx`
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** 4513f4f (Task 1)

**3. [Rule 1 - Format] Biome format fixes on deck-view.tsx + deck-view.test.tsx**
- **Found during:** Task 1 biome gate
- **Issue:** Inline JSX attributes split across lines differently from biome's preferred format.
- **Fix:** `npx biome format --write` on both files.
- **Files modified:** `src/components/deck-view.tsx`, `src/components/deck-view.test.tsx`
- **Committed in:** 4513f4f (Task 1 commit was re-staged after format)

**4. [Rule 1 - Format] Biome format fixes on e2e/07 and e2e/12**
- **Found during:** Task 2 biome gate
- **Issue:** Multi-line chained calls reformatted by biome; e2e/07 also had `waitForLoadState` spread across lines.
- **Fix:** `npx biome format --write` on 3 e2e files.
- **Files modified:** `e2e/07-habitat-display.spec.ts`, `e2e/12-pause-cards.spec.ts`
- **Committed in:** 51af669 (Task 2)

### Out-of-Scope Pre-existing Issue

- `e2e/07-habitat-display.spec.ts` line 25: `noNonNullAssertion` biome warning on `href!` — pre-existing, not introduced by this plan. Logged to deferred-items per CLAUDE.md scope boundary rule.

## Known Stubs

None — `DeckView` receives live server-computed props (`hasDueCards`, `earliestCooldownEnd`, `habitatState`). The `dueCount` proxy (counting non-paused non-cooldown cards from `initialCards`) is a display best-effort, not a stub; the authoritative gate is `hasDueCards` (server-side). No placeholder text or empty data flows to rendering.

## Threat Flags

No new threat surface — this plan is presentation-only. `StudyButton` gating (link vs dimmed) is visual only; the actual study session authorization is unchanged on the server. `CountdownTimer` interval behavior is identical to the pre-plan implementation.

## Self-Check

**Files created/modified:**
- [x] src/components/deck-view.tsx — EXISTS
- [x] src/components/deck-view.test.tsx — EXISTS
- [x] e2e/09-language-breakdown.spec.ts — EXISTS
- [x] e2e/12-pause-cards.spec.ts — EXISTS
- [x] e2e/07-habitat-display.spec.ts — EXISTS

**Commits verified:**
- [x] 4513f4f — feat(21-04): Task 1 HabitatHero + Option-D action line
- [x] 51af669 — feat(21-04): Task 2 e2e retargets

## Self-Check: PASSED
