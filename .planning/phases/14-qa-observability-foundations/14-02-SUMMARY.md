---
phase: 14-qa-observability-foundations
plan: 02
subsystem: testing
tags: [qa, badges, srs, react, client-component, countdown, vitest, cookies, rsc]

# Dependency graph
requires:
  - phase: 14-qa-observability-foundations
    plan: 01
    provides: readQaAuth() boolean gate from debug-cheat.ts (HMAC-signed leo-qa-mode cookie)
provides:
  - QaStateBadge client component with live cooldown countdown (qa-state-badge.tsx)
  - formatCd() and buildTokens() exported pure utilities, unit-tested
  - qaMode prop threading: study/page.tsx -> StudySession -> CardStack -> StudyCard -> QaStateBadge
  - qaMode prop threading: dashboard/page.tsx -> DeckView -> CardList -> QaStateBadge
  - cooldownUntil field on CardRow (optional, QA-only — null for customers)
  - 12 new unit tests for formatCd() and buildTokens() token assembly
affects:
  - 14-03: QAOB-04 Playwright gating test can now assert [data-qa-badge] absent without QA cookie

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Hydration-safe countdown via lazy useState(() => ...) + useEffect interval (mirrors deck-view.tsx CountdownTimer)
    - RSC QA gate: readQaAuth() in server component, boolean prop threaded to client component, badge absent for customers (never CSS-hidden)
    - Adaptive interval granularity: 60s ticks normally, 10s when < 5min remaining (D-06)
    - buildTokens() extracted and exported for unit testability without DOM (avoids testing-library overhead)
    - qaMode prop chain: RSC gate -> client component tree -> leaf badge (prop omission = no DOM element)

key-files:
  created:
    - src/components/qa-state-badge.tsx
    - src/components/__tests__/qa-state-badge.test.ts
  modified:
    - src/app/(protected)/study/page.tsx
    - src/components/study-session.tsx
    - src/components/card-stack.tsx
    - src/components/study-card.tsx
    - src/app/(protected)/dashboard/page.tsx
    - src/components/deck-view.tsx
    - src/components/card-list.tsx
    - src/components/card-edit-dialog.tsx

key-decisions:
  - "buildTokens() extracted and exported from qa-state-badge.tsx for pure unit testing — avoids testing-library DOM overhead, 12 unit tests with zero mocks"
  - "SessionCard lacks pausedAt (paused cards filtered before session) — use null in study-card.tsx; browse rows use card.pausedAt from CardRow"
  - "CardList derives browse stage from masteryRound (0/2/3 → n2t, 1 → t2n) since no per-session stage in browse context; learned (R3) shows L regardless"
  - "CardStack.tsx accepts qaMode?: boolean for prop-chain compliance even though it only renders visual layer stacks (not StudyCard)"
  - "Biome noNonNullAssertion fixed in useEffect: captured data.cooldownUntil in local const before the guard check"
  - "Desktop table tr gets relative class; absolute badge positioned top-1 right-1 within the relative container"

patterns-established:
  - "QA gate pattern: readQaAuth() in RSC -> boolean prop -> leaf component conditional render (never CSS-hidden)"
  - "Adaptive countdown interval: 60s/10s split at 5min threshold for QA short-cooldown observability"

requirements-completed: [QAOB-01]

# Metrics
duration: 21min
completed: 2026-06-17
---

# Phase 14 Plan 02: QaStateBadge Summary

**Per-card SRS state badge (R1·t2n·cd:14m) with live countdown on study cards and dashboard card-list rows, gated at RSC layer via readQaAuth() so the badge is provably absent from customer DOM**

## Performance

- **Duration:** 21 min
- **Started:** 2026-06-17T11:02:12Z
- **Completed:** 2026-06-17T11:23:47Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- New `QaStateBadge` client component with `data-qa-badge` attribute, `absolute top-1 right-1` overlay, and adaptive live countdown (60s/10s granularity)
- `formatCd()` and `buildTokens()` exported pure utilities, 12 unit tests green with zero mocks
- `qaMode` prop chain: study/page.tsx → StudySession → CardStack → StudyCard → QaStateBadge; dashboard/page.tsx → DeckView → CardList → QaStateBadge
- Badge absent from customer DOM at RSC level (prop omitted when `readQaAuth()` returns false) — satisfies QAOB-04 requirement
- `CardRow` extended with `cooldownUntil?: Date | null`; dashboard maps it from existing `studyCards` (no extra DB query)
- TDD RED/GREEN cycle followed for Task 1 (test first, then implementation)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for QaStateBadge formatCd + buildTokens** - `c81dbc4` (test)
2. **Task 1 GREEN: QaStateBadge client component** - `e883d14` (feat)
3. **Task 2: Wire QaStateBadge into study surface** - `7c49c06` (feat)
4. **Task 3: Wire QaStateBadge into dashboard card-list rows** - `fa8a6ca` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/components/qa-state-badge.tsx` — NEW: "use client" component, QaCardData interface, formatCd(), buildTokens(), QaStateBadge with data-qa-badge + hydration-safe lazy useState
- `src/components/__tests__/qa-state-badge.test.ts` — NEW: 12 unit tests for formatCd() and buildTokens() token assembly cases (R0·n2t, R1·t2n·cd:22m, R3·L, R1·t2n·P)
- `src/app/(protected)/study/page.tsx` — Added readQaAuth import, await readQaAuth(), qaMode={qaMode} on StudySession
- `src/components/study-session.tsx` — Added qaMode?: boolean prop (default false), thread to CardStack + StudyCard
- `src/components/card-stack.tsx` — Added qaMode?: boolean prop for prop-chain compliance
- `src/components/study-card.tsx` — Added qaMode? prop, build qaCardData when true, render <QaStateBadge> guarded by qaCardData &&
- `src/app/(protected)/dashboard/page.tsx` — Added readQaAuth import, await readQaAuth(), cooldownUntil in cardRows gated on qaMode, qaMode={qaMode} on DeckView
- `src/components/deck-view.tsx` — Extended local CardRow with cooldownUntil?, added qaMode?: boolean prop, forward to CardList
- `src/components/card-list.tsx` — Added QaStateBadge import, qaMode?: boolean prop, relative on row containers, <QaStateBadge> guarded by qaMode &&
- `src/components/card-edit-dialog.tsx` — Extended CardRow with cooldownUntil?: Date | null

## Decisions Made

- `buildTokens()` extracted and exported as a pure function for unit testability without DOM. This is cleaner than `@testing-library/react` for pure logic tests.
- `SessionCard` (study surface) lacks `pausedAt` — paused cards are filtered before the session is assembled, so `null` is always correct for study badges.
- `CardList` browse rows derive stage from masteryRound (0/2/3 → "n2t", 1 → "t2n") since they have no per-session stage. Learned cards (R3) show "L" which replaces the direction token entirely — the derived stage is cosmetic in that case.
- `CardStack.tsx` receives `qaMode?: boolean` for prop-chain completeness per acceptance criteria, even though the component only renders visual layer indicators (not StudyCard itself).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome noNonNullAssertion in qa-state-badge.tsx useEffect**
- **Found during:** Task 3 lint run (biome ci)
- **Issue:** Used `data.cooldownUntil!.getTime()` inside a `if (!data.cooldownUntil) return` guard — TypeScript sees it as safe but biome flags non-null assertions
- **Fix:** Captured `const target = data.cooldownUntil` before the guard, used `target.getTime()` in the tick closure (no non-null assertion needed)
- **Files modified:** `src/components/qa-state-badge.tsx`
- **Verification:** `npx biome ci src/components/qa-state-badge.tsx` — 0 errors
- **Committed in:** `fa8a6ca` (Task 3 commit)

**2. [Rule 1 - Bug] Biome import ordering in study-card.tsx**
- **Found during:** Task 3 lint run
- **Issue:** Separate `import { QaStateBadge }` and `import type { QaCardData }` lines from same module in wrong order (value before type)
- **Fix:** `npx biome check --write` auto-fixed to merge type import first, then value import
- **Files modified:** `src/components/study-card.tsx`
- **Verification:** `npx biome ci src/components/study-card.tsx` — 0 errors
- **Committed in:** `fa8a6ca` (Task 3 commit)

**3. [Rule 1 - Bug] Biome formatting on card-list.tsx and study-session.tsx**
- **Found during:** Task 3 lint run
- **Issue:** Biome formatting required after structural JSX changes (return statements in mapped arrays)
- **Fix:** `npx biome format --write` on affected files
- **Files modified:** `src/components/card-list.tsx`, `src/components/study-session.tsx`, `src/app/(protected)/study/page.tsx`
- **Verification:** `npx biome ci` — 0 errors on modified files
- **Committed in:** `fa8a6ca` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (all biome lint/format — no logic changes)
**Impact on plan:** Minor formatting and non-null assertion style fixes only. No scope creep, no behavior changes.

## Issues Encountered

None — all planned work completed. Biome lint fixes were caught during verification and resolved within the same task cycle.

## User Setup Required

None — no external service configuration required. The badge is visible immediately after entering the secret on `/debug` (QA-mode cookie is set by Plan 01's `/api/debug/cheat` route).

## Next Phase Readiness

- `QaStateBadge` with `[data-qa-badge]` attribute is live — Plan 03 (QAOB-04) can now write the Playwright gating test asserting `page.locator('[data-qa-badge]').count() === 0` without QA cookie
- Both study session and dashboard card-list rows render badges when QA-authed
- Customers provably receive no badge DOM element (RSC-level gate via prop omission)
- `STUDY_COOLDOWN_MINUTES=15` in `.env.local` will produce live `cd:15m` → `cd:14m` countdown visible on the badge

## Self-Check

Files verified to exist:
- `src/components/qa-state-badge.tsx` — FOUND
- `src/components/__tests__/qa-state-badge.test.ts` — FOUND
- `src/app/(protected)/study/page.tsx` — FOUND (modified)
- `src/components/study-session.tsx` — FOUND (modified)
- `src/components/card-stack.tsx` — FOUND (modified)
- `src/components/study-card.tsx` — FOUND (modified)
- `src/app/(protected)/dashboard/page.tsx` — FOUND (modified)
- `src/components/deck-view.tsx` — FOUND (modified)
- `src/components/card-list.tsx` — FOUND (modified)
- `src/components/card-edit-dialog.tsx` — FOUND (modified)

Commits verified:
- `c81dbc4` test(14-02): RED — FOUND
- `e883d14` feat(14-02): GREEN — FOUND
- `7c49c06` feat(14-02): study surface wiring — FOUND
- `fa8a6ca` feat(14-02): dashboard card-list wiring — FOUND

Self-check results:
- Lint (biome ci on modified files): 0 errors
- Typecheck (tsc --noEmit): 0 errors
- Unit tests (npx vitest run): 1925 passed, 6 skipped, 0 failed
- qa-state-badge.test.ts specifically: 12 passed, 0 failed

## Self-Check: PASSED

---
*Phase: 14-qa-observability-foundations*
*Completed: 2026-06-17*
