---
phase: 27-performance-batch-2
plan: 05
subsystem: ui
tags: [react, react.memo, useDeferredValue, useCallback, optimistic-ui, card-list]

# Dependency graph
requires:
  - phase: 17-performance-optimization
    provides: CSS @keyframes accordion pattern (panelMounted/open state machine, safety-net setTimeout convention) that this plan extends with a rows-mount tween gate
  - phase: 20-24 (Daybreak / word-list-browser.tsx)
    provides: BrowseList's optimistic-Set state machine and BWWordRow's React.memo row extraction, both copied verbatim in shape here
provides:
  - Optimistic pause/resume toggle in card-list.tsx (flip-before-POST, rollback-on-error, coalesced trailing router.refresh())
  - CardListRow — a React.memo-wrapped row component receiving primitives + stable useCallback handlers
  - useDeferredValue-based search filtering, consistent no-results messaging
  - Deferred row-mount gate (rowsMounted) tied to the accordion open tween's animationend/safety-net timer
affects: [phase-18-recert, any future card-list.tsx work, e2e/12-pause-cards.spec.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic-Map override pattern for a single boolean field (paused), analogous to BrowseList's optimistic-Set but keyed per-card with rollback + auto-clearing error"
    - "Stable-callback memoized row extraction: parent computes derived primitives per item in its .map(), never passes the raw array/object down"
    - "useCallback dependency on a specific hook-returned METHOD (router.refresh) rather than the whole hook-returned OBJECT (router), to keep a callback referentially stable when the object itself may not be"
    - "Deferred CSS-tween-gated mount: reuse the existing open/panelMounted timer-plus-animationend convention, add a second rowsMounted gate keyed off the SAME accordion animation lifecycle"

key-files:
  created: []
  modified:
    - src/components/card-list.tsx
    - src/components/card-list.test.tsx

key-decisions:
  - "Named the extracted memoized row CardListRow, not CardRow — card-list.tsx already imports a type named CardRow from card-edit-dialog.tsx; reusing the name would have shadowed/collided with that import"
  - "Row receives primitive fields (id/front/back/source/masteryRound/cooldownUntil/paused/pending/error/qaMode) plus two stable useCallback handlers (onTogglePause, onEdit), never the raw card object or array — exact BWWordRow shape"
  - "handleTogglePause and handleEditCard take a cardId (not the full card), so they can be memoized with narrow/empty dependency arrays; handleEditCard looks up the full card via cards.find(...) only when actually invoked"
  - "scheduleRefresh depends on router.refresh (the method) rather than router (the object) — the test's useRouter mock returns a fresh object literal every render, which would otherwise make handleTogglePause unstable every render and defeat CardListRow's memoization for ALL rows, not just the toggled one"
  - "QaStateBadge's pausedAt: Date | null contract is satisfied with `paused ? new Date(0) : null` — the badge's own buildTokens only checks pausedAt truthiness, never reads the timestamp value, so a boolean-derived marker Date is a safe, minimal-diff bridge rather than widening QaStateBadge's prop type"
  - "Row mounting is deferred via a NEW rowsMounted state (not by reusing panelMounted) so the search bar / no-results / rows can each independently reach the DOM at the moment appropriate for each: search bar mounts immediately with the panel, rows wait for the open tween (260ms safety net matching the existing close-side convention, or the section's onAnimationEnd, whichever fires first)"
  - "filtered's useMemo and the no-results message both key off deferredQuery, not the immediate query state, so the two never show mismatched content for one keystroke's worth of lag"

patterns-established:
  - "Pattern: optimistic single-field override Map + auto-clearing error Map + shared debounce timer for coalescing a side-effecting refresh call — reusable for any other card-list-style optimistic toggle in this codebase"
  - "Pattern: tween-gated deferred mount — extend an EXISTING CSS-keyframe accordion's open/close state machine with an additional boolean state (here rowsMounted) rather than introducing a second independent animation lifecycle"

requirements-completed: [PERF-13, PERF-20]

# Metrics
duration: 20min
completed: 2026-07-22
---

# Phase 27 Plan 05: Optimistic Pause Toggle + Memoized CardRow + Deferred Search Summary

**Pause/resume in card-list.tsx now flips instantly (optimistic, with rollback + coalesced router.refresh()); search rows are React.memo-extracted with useCallback-stable handlers and a useDeferredValue-filtered query, and row mounting waits for the accordion's open tween to finish.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-22T12:36:48+01:00 (prior plan close-out)
- **Completed:** 2026-07-22T12:53:00+01:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- PERF-13: `togglePause` → `handleTogglePause` is now optimistic — the pause/resume icon flips synchronously before the POST resolves, rolls back with a visible transient error on failure/network-error (auto-clears after 3s, mirroring `word-list-browser.tsx`'s `BrowseList` optimistic-Set pattern), and still calls `router.refresh()` on success (Pitfall 2 preserved verbatim). Rapid repeated toggles across one or many rows coalesce into exactly one trailing `router.refresh()` via a shared 400ms debounce timer.
- PERF-20: extracted `CardListRow`, a `React.memo`-wrapped row component mirroring `BWWordRow`'s exact shape (primitive props + stable `useCallback` handlers, never the raw array). Wrapped the search `query` state in `useDeferredValue`; the `filtered` `useMemo` and the no-results message both key off the deferred value. Row mounting is now gated on a new `rowsMounted` state that flips true once the accordion's open CSS tween completes (`onAnimationEnd`, with a 260ms safety-net timer for prefers-reduced-motion/jsdom, mirroring the existing close-side convention).
- Outer `CardList` remains wrapped in `React.memo`; drag/swipe study-card physics untouched (17 D-05 carve-out respected — this plan never touched study-card files).

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1+2 RED (combined test file):** `e19c4ef` (test) — failing tests for optimistic flip/rollback/refresh-coalescing (Task 1) and memo render-count/deferred-filter assertions (Task 2), plus updated existing row-visibility tests to await the new deferred row mount
2. **Task 1+2 GREEN (combined implementation):** `1d7badf` (feat) — optimistic pause state machine, `CardListRow` extraction, `useDeferredValue` search, tween-gated row mount

_Note: both tasks share one RED and one GREEN commit since they land in the same two files (`card-list.tsx`/`card-list.test.tsx`) and are tightly coupled — the memo extraction (Task 2) is what makes Task 1's optimistic per-row props/callbacks meaningful to test for stability, and Task 1's new state (optimisticPausedIds, errorCardIds) had to exist before Task 2's row props could be finalized. Both tasks' `<behavior>`/`<acceptance_criteria>` are independently verified in the test file's two dedicated `describe` blocks._

**Plan metadata:** (this commit) `docs(27-05): complete optimistic pause + memoized CardRow plan`

## Files Created/Modified
- `src/components/card-list.tsx` — optimistic pause/resume state machine (`optimisticPausedIds`, `errorCardIds`, `scheduleRefresh`, `rollbackPause`, `handleTogglePause`), extracted `CardListRow` (`React.memo`), `useDeferredValue`-based search, `rowsMounted` tween-gated mount state
- `src/components/card-list.test.tsx` — added `describe` blocks for both PERF-13 (flip/rollback/refresh/coalescing) and PERF-20 (render-count/deferred-filter); hoisted a shared `mockRouterRefresh` spy so refresh-count assertions are observable across renders; added an `expandAndWaitForRows()` helper and updated 4 existing tests to await it

## Decisions Made
See `key-decisions` in frontmatter above. Most consequential: naming the extracted row `CardListRow` (not `CardRow`, to avoid colliding with the existing `CardRow` type import from `card-edit-dialog.tsx`), and depending `scheduleRefresh` on `router.refresh` (the method) rather than `router` (the object) so `handleTogglePause` stays referentially stable across renders even though this file's `useRouter` test mock returns a fresh object literal every call — without this, CardListRow's `React.memo` would never bail out on ANY parent re-render (including plain search keystrokes), defeating PERF-20 for every row, not just the one being toggled.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Avoided a real naming collision the plan's own action text didn't anticipate**
- **Found during:** Task 2 (extracting the memoized row)
- **Issue:** The plan's action text suggests extracting "a `React.memo` row (`CardRow` or similar)" — but `card-list.tsx` already has `import type { CardRow } from "@/components/card-edit-dialog"` in active use for the `cards`/`editCard` prop types. Naming the new component `CardRow` would shadow that import and break `tsc`.
- **Fix:** Named the extracted component `CardListRow` instead (the plan's own "or similar" phrasing anticipated this).
- **Files modified:** `src/components/card-list.tsx`
- **Verification:** `npx tsc --noEmit` clean; the imported `CardRow` type is still used unmodified for `cards`/`editCard`.
- **Committed in:** `1d7badf` (Task 1+2 GREEN commit)

**2. [Rule 1 - Bug] Router-object instability would have silently defeated the memoization this plan exists to add**
- **Found during:** Task 1 implementation, verifying Task 2's render-count test
- **Issue:** The test file's `useRouter` mock (and, per Next.js's own `use-router.md` docs, no explicit guarantee is made for the real implementation either) returns a new object literal on every call. A naive `useCallback(..., [router])` for the refresh-scheduling helper would recreate `handleTogglePause` on every `CardList` re-render — including a pure search keystroke — which would make `CardListRow`'s memoized `onTogglePause` prop appear "changed" every time, defeating `React.memo` for every row on every keystroke, not just PERF-13's own toggle.
- **Fix:** Depend on `router.refresh` (the individual method, confirmed stable in both the test mock and per Next's docs describing it as a stable navigation method) instead of the `router` object itself.
- **Files modified:** `src/components/card-list.tsx`
- **Verification:** Task 2's "does not re-render a row whose props are unchanged when typing in the search box" test passes.
- **Committed in:** `1d7badf` (Task 1+2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs that would have broken correctness/the plan's own stated goal if not caught)
**Impact on plan:** Both fixes were necessary for the plan's stated behavior (a working memoization boundary, a non-colliding component name) with zero scope creep — no files outside `files_modified` were touched.

## Issues Encountered
None beyond the two deviations above. Full project `npx vitest run` shows 2215 passed / 6 skipped, with one unrelated pre-existing timeout failure in `src/app/api/study/__tests__/cooldown-config.test.ts` (documented in STATE.md since Phase 15-04 as pre-existing, not caused by this plan — confirmed untouched, unrelated file).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PERF-13 and PERF-20 are both shipped and unit-test-proven; `npx tsc --noEmit` and scoped `biome check` are clean on both modified files.
- Deferred to the orchestrator's e2e gate (per this plan's own `<verification>` block): `e2e/12-pause-cards.spec.ts` against a restarted prod-parity dev server — this plan's optimistic-flip + deferred-row-mount changes are exactly the kind of timing-sensitive behavior that benefits from a real-browser pass (grep the spec for LOCAL helpers per the project's e2e retarget gotcha before running).
- No architectural changes, no new dependencies, no schema changes — safe to proceed to the next plan in Phase 27's wave.

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*
