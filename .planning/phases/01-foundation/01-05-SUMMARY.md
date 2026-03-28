---
phase: 01-foundation
plan: 05
subsystem: testing
tags: [biome, typescript, nextjs, suspense, line-endings, linting]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: login page, study-engine tests, src/ codebase

provides:
  - Suspense-wrapped login page enabling Next.js static prerender
  - Type-safe study-engine test helpers with branded CardId types
  - LF line ending enforcement via .gitattributes
  - Clean biome lint/format state across all 75 src/ files

affects: [all-phases, ci, build]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - biome-ignore suppression with genuine reason comments for intentional lint exceptions
    - Suspense boundary pattern for useSearchParams in Next.js 16 static pages

key-files:
  created:
    - .gitattributes
  modified:
    - src/app/(auth)/login/page.tsx
    - src/lib/study-engine.test.ts
    - src/db/index.ts
    - src/components/card-list.tsx
    - src/components/card-stack.tsx
    - src/components/level-up-overlay.tsx
    - src/components/study-card.tsx

key-decisions:
  - "biome-ignore with explicit reason used for noNonNullAssertion in db/index.ts — circular import constraint prevents using validated env.ts"
  - "biome-ignore for noArrayIndexKey in card-stack and level-up-overlay — static positional elements never reordered"
  - "biome-ignore for useSemanticElements in study-card — div required for CSS preserve-3d which <button> doesn't support reliably"
  - "title attribute instead of aria-label+role on card-list progress indicator — avoids useSemanticElements conflict in table cell context"
  - "biome --unsafe flag applied after safe --write pass — removed unused imports and prefixed unused parameters"

patterns-established:
  - "Suspense boundary pattern: inner component uses useSearchParams, outer default export wraps in Suspense (same as reset-password)"
  - "Test type safety: Partial<CardForSession> without widening intersection; callsites cast string literals with as CardId"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: 15min
completed: 2026-03-28
---

# Phase 01 Plan 05: Build Fix and Code Quality Summary

**Suspense boundary on login page unblocks Next.js static prerender; TypeScript strict mode and Biome lint/format all green across 75 files**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-28T23:36:00Z
- **Completed:** 2026-03-28T23:45:50Z
- **Tasks:** 2
- **Files modified:** 57

## Accomplishments

- Login page now wraps LoginForm (containing useSearchParams) in Suspense boundary, enabling static prerender at `/login`
- TypeScript strict mode passes with zero errors — fixed 12 type errors in study-engine.test.ts (branded CardId casts + noUncheckedIndexedAccess assertions)
- Biome lint and format pass with zero errors across 75 src/ files — 85+ files auto-fixed (CRLF->LF, import sorting, unused imports)
- `.gitattributes` added to prevent future CRLF issues on Windows

## Task Commits

1. **Task 1: Fix login Suspense boundary and TypeScript errors** - `2f86572` (fix)
2. **Task 2: Fix Biome lint/format violations and enforce LF line endings** - `4a3016c` (fix)

## Files Created/Modified

- `.gitattributes` - LF line ending enforcement (`* text=auto eol=lf`)
- `src/app/(auth)/login/page.tsx` - Renamed inner component to LoginForm, added Suspense-wrapping LoginPage default export
- `src/lib/study-engine.test.ts` - Removed `& { id?: string }` intersection from makeCard parameter, added `as CardId` casts at callsites, added `!` non-null assertions on index accesses, added biome-ignore suppressions for required assertions
- `src/db/index.ts` - Added biome-ignore for intentional `!` assertion (circular import constraint)
- `src/components/card-list.tsx` - Replaced aria-label+role="group" with title attribute on progress indicator div
- `src/components/card-stack.tsx` - Added biome-ignore for array index key (static positional layers)
- `src/components/level-up-overlay.tsx` - Added biome-ignore for array index key (confetti decorations)
- `src/components/study-card.tsx` - Added biome-ignore for role="button" div (preserve-3d CSS constraint)
- All other src/ files - Auto-formatted (CRLF->LF, import ordering, style normalization)

## Decisions Made

- Used biome-ignore with explicit reason comments rather than disabling rules globally — preserves lint coverage everywhere except the specific justified exceptions
- Did NOT delete biome.json from worktrees — each worktree is a full git worktree copy of the project; having biome.json is correct and expected
- Copied `.env.local` from main project to worktree to enable `npm run build` verification (worktrees don't inherit env files)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Copied .env.local to worktree to unblock npm run build**
- **Found during:** Task 1 (build verification)
- **Issue:** Worktree doesn't inherit `.env.local` from main project; build failed with "Invalid environment variables"
- **Fix:** Copied `C:/Users/jfwas/.claude/projects/C--Users-jfwas/TioCards/.env.local` to worktree directory
- **Files modified:** `.env.local` (untracked, not committed)
- **Verification:** Build completed successfully
- **Committed in:** Not committed (runtime env file, gitignored)

**2. [Rule 1 - Bug] Fixed biome --unsafe replacing required ! assertions with ?. causing TypeScript errors**
- **Found during:** Task 2 (biome verification)
- **Issue:** `biome check --write --unsafe` replaced `cooldownUntil!.getTime()` with `cooldownUntil?.getTime()` — optional chain returns `number | undefined`, breaking TypeScript arithmetic
- **Fix:** Restored `!` non-null assertions and added biome-ignore suppression comments
- **Files modified:** `src/lib/study-engine.test.ts`
- **Verification:** Both `npx tsc --noEmit` and `npx biome ci src/` exit 0
- **Committed in:** `4a3016c` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking environment issue, 1 bug from biome unsafe fix)
**Impact on plan:** Both necessary for meeting verification criteria. No scope creep.

## Issues Encountered

- Biome `noArrayIndexKey` and `useSemanticElements` suppressions required inline JSX attribute-level placement (not before the element) — placed comment inside JSX opening tag as attribute before the offending prop
- `useAriaPropsSupportedByRole` on plain div with aria-label led to adding `role="group"`, which triggered `useSemanticElements` (div with role="group" should be `<fieldset>`, invalid inside `<td>`); resolved by switching to `title` attribute

## Known Stubs

None - this plan is a code quality fix plan with no UI or data stubs.

## Next Phase Readiness

- Build, TypeScript, and Biome all green — CI gates unblocked
- Login page now statically prerenders (same pattern as reset-password)
- All 9 previously blocked UAT tests are now unblocked by the passing build

---
*Phase: 01-foundation*
*Completed: 2026-03-28*
