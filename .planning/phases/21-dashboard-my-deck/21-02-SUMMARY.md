---
phase: 21-dashboard-my-deck
plan: "02"
subsystem: ui
tags: [base-ui, popover, daybreak, deck-switcher, app-header, logout, e2e-retarget]

# Dependency graph
requires:
  - phase: 21-dashboard-my-deck
    plan: "01"
    provides: "src/components/ui/popover.tsx — PopoverContent, PopoverTrigger, Popover wrapper"

provides:
  - "src/components/deck-switcher.tsx — Popover-based deck picker with LangChip pill trigger, deck list with active marker, inline create flow; createDeck + state logic preserved"
  - "src/components/app-header.tsx — Daybreak TopBar: LionFace size=27 + LeoCards wordmark + DeckSwitcher + logout glyph"
  - "src/components/logout-button.tsx — icon-only LogoutGlyph button with aria-label='Sign out'"
  - "src/components/__tests__/deck-switcher.test.tsx — 3 unit tests: trigger pill, popover opens with deck list, new-deck-row reveals create chips"

affects:
  - e2e/08-deck-switching.spec.ts (Select selectors → data-testid deck-picker-trigger/new-deck-row/deck-option-fr)
  - e2e/10-mobile-responsive.spec.ts (getByText("Sign out") → role+name)
  - e2e/01-auth-signup-login.spec.ts (3x getByText("Sign out").click() → role+name)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Popover-based deck picker: Popover > PopoverTrigger (data-testid) > PopoverContent; showPicker state governs inline create sub-section only (separate from Popover open state)"
    - "LangChip local component: width=size+7, height=size, bg #FFF1DC, border #F0E3CF, radius 6, bold #B4762A — matches Daybreak mock lines 56-60"
    - "LogoutGlyph: pure DOM/CSS glyph from mock lines 18-26; aria-label on the wrapping button (not the glyph div)"

key-files:
  created:
    - src/components/__tests__/deck-switcher.test.tsx
  modified:
    - src/components/deck-switcher.tsx
    - src/components/app-header.tsx
    - src/components/logout-button.tsx
    - e2e/08-deck-switching.spec.ts
    - e2e/10-mobile-responsive.spec.ts
    - e2e/01-auth-signup-login.spec.ts

key-decisions:
  - "onOpenChange on Popover resets showPicker+error on close — keeps inline create state clean across re-opens"
  - "Active-dot marker uses role=img + aria-label='active deck' (biome useAriaPropsSupportedByRole requires role on span for aria-label)"
  - "Pre-existing biome warnings in e2e/01 (unused testEmail import) and e2e/10 (noNonNullAssertion) are out-of-scope — not introduced by this plan's edits"

# Metrics
duration: 30min
completed: 2026-06-21
---

# Phase 21 Plan 02: Daybreak TopBar + Popover Deck Picker Summary

**Popover-based deck picker with LangChip pill trigger replacing the Select, Daybreak TopBar with LionFace + glyph logout button, and e2e specs retargeted from Select selectors to data-testid / role+name**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-21T15:45:00Z
- **Completed:** 2026-06-21T16:00:00Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- Rewrote `DeckSwitcher` render layer: replaced `Select`/`SelectContent`/`SelectItem` with `Popover` + `PopoverContent` from Plan 01 wrapper; added local `LangChip`, `Chevron`, `PlusGlyph` components matching the Daybreak mock; all state/handlers (`creatingLang`, `showPicker`, `error`, `learningLanguages`, `handleCreateDeck`, `handleValueChange`) preserved verbatim; `FLAG_MAP` and all flag emoji removed
- Added `data-testid="deck-picker-trigger"`, `data-testid="new-deck-row"`, `data-testid="deck-option-{lang}"` on the popover trigger, new-deck row, and each deck button
- Created `deck-switcher.test.tsx` (3 tests: trigger pill renders active lang code; popover opens with deck options + new-deck-row; clicking new-deck-row reveals create language buttons) — all pass
- Restyled `AppHeader`: replaced `🐯` emoji with `<LionFace size={27} />` + `"LeoCards"` wordmark in `var(--font-display)`, 21px/700/#4A331C; TopBar gap 8 (brand) / 9 (right cluster) per mock
- Restyled `LogoutButton`: replaced "Sign out" text with `LogoutGlyph` (DOM/CSS per mock lines 18-26) inside a 36×36 pill button with `aria-label="Sign out"`, border 1.5px #EDDFC9, radius 10 — `authClient.signOut()` + `router.push("/login")` preserved
- Retargeted 3 e2e spec files: `08-deck-switching.spec.ts` (3× select-trigger → deck-picker-trigger, 2× role=option → new-deck-row, 1× role=option → deck-option-fr), `10-mobile-responsive.spec.ts` (line 40 getByText → role+name), `01-auth-signup-login.spec.ts` (3× getByText("Sign out").click() → role+name)
- Gates: tsc clean, 2001/2001 unit tests pass, biome clean on all 5 authored source files

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert DeckSwitcher to Popover deck picker** - `bd5ee51` (feat)
2. **Task 2: Restyle AppHeader TopBar + logout glyph** - `4051d55` (feat)
3. **Task 3: Retarget e2e specs** - `ff93ec5` (feat)
4. **Rule 1 auto-fix: biome format + aria-label** - `37663ab` (fix)

## Files Created/Modified

- `src/components/deck-switcher.tsx` — Replaced Select render with Popover; added LangChip/Chevron/PlusGlyph; preserved all state/handlers; added required testids; removed FLAG_MAP
- `src/components/__tests__/deck-switcher.test.tsx` — New: 3 unit tests for Popover deck picker behavior
- `src/components/app-header.tsx` — Replaced tiger emoji + old wordmark with LionFace + var(--font-display) wordmark
- `src/components/logout-button.tsx` — Replaced text "Sign out" button with LogoutGlyph icon button + aria-label
- `e2e/08-deck-switching.spec.ts` — Retargeted all Select-era selectors to data-testid equivalents
- `e2e/10-mobile-responsive.spec.ts` — Retargeted 1× getByText("Sign out") to role+name
- `e2e/01-auth-signup-login.spec.ts` — Retargeted 3× getByText("Sign out").click() to role+name

## Decisions Made

- Popover `onOpenChange` resets `showPicker` and `error` on close, keeping inline create state tidy across re-opens
- Active-deck dot uses `role="img" aria-label="active deck"` — biome `useAriaPropsSupportedByRole` requires a role on `<span>` elements for aria-label to be valid
- Pre-existing biome issues in `e2e/01` (unused `testEmail` import) and `e2e/10` (`noNonNullAssertion` at lines 92/115) are excluded from this plan's scope — they exist in code this plan did not author

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `aria-label` on `<span>` without role**
- **Found during:** biome gate (after Task 1 + 2 commits)
- **Issue:** The active-deck dot indicator was `<span aria-label="active" />` — biome's `useAriaPropsSupportedByRole` rule flags aria-label on a generic span (no inherent ARIA role to support the attribute)
- **Fix:** Added `role="img"` to the span so the aria-label is valid; updated aria-label text to `"active deck"` for clarity
- **Files modified:** src/components/deck-switcher.tsx
- **Commit:** 37663ab

**2. [Rule 1 - Bug] Biome formatting corrections**
- **Found during:** biome gate (first run)
- **Issue:** Bracket/line-break style diffs across 5 authored files
- **Fix:** `npx biome format --write` on the 5 source/test/e2e files I authored
- **Files modified:** all 5 authored files
- **Commit:** 37663ab

---

**Total deviations:** 2 auto-fixed (both Rule 1 — new lint/format issues introduced by this plan's edits)
**Impact on plan:** Trivially fixable; zero behavior change.

## Issues Encountered

None beyond the biome fixes above. The Popover wrapper from Plan 01 consumed cleanly.

## Known Stubs

None — all deck picker behavior is wired to real state/handlers and the actual `createDeck` server action. The UI renders from the `decks` prop (real data).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `createDeck` server action and `authClient.signOut()` paths are unchanged — only the render layer changed. This matches the threat model (T-21-02-E: accept/preserved; T-21-02-S: accept/preserved).

## e2e Retarget Verification (Static)

Grep results confirming no stale selectors remain:
- `grep -rc 'data-slot="select-trigger"' e2e/` → 0 across all files ✓
- `grep -rn 'getByText("Sign out")' e2e/*.ts` → NO MATCHES ✓
- `e2e/08-deck-switching.spec.ts` uses `getByTestId("deck-picker-trigger")`, `getByTestId("new-deck-row")`, `getByTestId("deck-option-fr")` ✓
- Full e2e run is the Wave 2 boundary gate (owned by orchestrator, after fresh `npm run dev`)

## Self-Check

- [x] `src/components/deck-switcher.tsx` exists, has `FLAG_MAP: 0`, `ui/select: 0`, `ui/popover: ≥1`, `createDeck: ≥2`, `deck-picker-trigger: 1`, `new-deck-row: 1`, `deck-option-`: 1
- [x] `src/components/__tests__/deck-switcher.test.tsx` exists with `// @vitest-environment jsdom` docblock
- [x] `src/components/app-header.tsx` has `LionFace: ≥1`, tiger emoji: 0, `font-display: ≥1`
- [x] `src/components/logout-button.tsx` has `aria-label="Sign out": 1`, `authClient.signOut(): 1`, `router.push: 1`
- [x] Commits bd5ee51, 4051d55, ff93ec5, 37663ab all in git log
- [x] `npx vitest run src/components/__tests__/deck-switcher.test.tsx` → 3/3 pass
- [x] `npm test` → 2001/2001 pass (109 files)
- [x] `npx tsc --noEmit` → clean
- [x] `npx biome ci` on 5 authored files → clean

## Self-Check: PASSED

---
*Phase: 21-dashboard-my-deck*
*Completed: 2026-06-21*
