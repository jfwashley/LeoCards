---
phase: 27-performance-batch-2
plan: 03
subsystem: ui
tags: [nextjs, rsc, performance, browse]

# Dependency graph
requires:
  - phase: 27-performance-batch-2 (27-01)
    provides: src/lib/auth-session.ts cache()-wrapped getSession()/getSessionFresh() accessors
provides:
  - Server-side Browse topic filtering (PERF-15) — topic-detail RSC payload cut from ~280 words to ~15-25
  - shapeBrowseData() pure helper as the reusable pattern for future RSC branch-shaping tests
affects: [phase-18-recert]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extract pure branch-shaping helper (shapeBrowseData) out of an async RSC so data-shaping logic is unit-testable without a session/DB harness"

key-files:
  created:
    - "src/app/(protected)/deck/browse/__tests__/browse-page.test.ts"
  modified:
    - "src/app/(protected)/deck/browse/page.tsx"

key-decisions:
  - "Extracted shapeBrowseData(words, requestedTopic) as a discriminated union ({kind:\"detail\",topic,words} | {kind:\"picker\",categoryCounts}) rather than a single object with optional fields, so TypeScript narrows the topic string and each branch's payload without a non-null assertion"
  - "Opportunistically swapped getUserNativeLanguage(session.user.id) DB round trip for session.user.nativeLanguage ?? \"en\" (same pattern already proven in /account page.tsx, Phase 25-04) since the file was already open for the getSession swap"

patterns-established:
  - "Pattern: pure data-shaping helper extraction for RSC branch logic testability (mirrors this project's existing extract-eval.test.ts / extract-reducer.test.ts precedent for API routes)"

requirements-completed: [PERF-15]

# Metrics
duration: 15min
completed: 2026-07-22
---

# Phase 27 Plan 03: Server-side Browse topic filtering Summary

**Browse topic-detail RSC payload cut from ~280 words to the requested topic's ~15-25 word subset via an extracted, unit-tested `shapeBrowseData` helper; getSession swapped to the cached 27-01 accessor.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-22T15:10:00+01:00
- **Completed:** 2026-07-22T15:18:17+01:00
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- PERF-15 shipped: `browse/page.tsx`'s topic-detail (BrowseList) branch now serializes only `filterWords(wordList.words, { category: requestedTopic })` instead of the full ~280-word wordlist; `categoryCounts` is only computed on the topic-picker (BrowseTiles) branch, never on topic-detail
- New `shapeBrowseData()` pure helper makes the branch-shaping logic unit-testable in isolation from the RSC's session/DB dependencies — first Wave-0 test coverage for this page
- `getSession()` from `@/lib/auth-session` (27-01) replaces the raw `auth.api.getSession({headers: await headers()})` call, gaining per-request dedup + cookie-cache benefit
- Opportunistic win: `nativeLang` now reads `session.user.nativeLanguage ?? "en"` directly, eliminating the separate `getUserNativeLanguage` DB round trip

## Task Commits

1. **Task 1: Write browse-page data-shaping test (Wave 0)** - `a5e5843` (test) — RED
2. **Task 2: Filter server-side + swap to cached getSession** - `33ccdf0` (feat) — GREEN

_TDD-style RED→GREEN sequence for this plan's single feature, per Wave 0 gap._

## Files Created/Modified
- `src/app/(protected)/deck/browse/__tests__/browse-page.test.ts` - New data-shaping tests: topic-detail subset length + no categoryCounts; topic-picker categoryCounts + no word subset
- `src/app/(protected)/deck/browse/page.tsx` - Extracted `shapeBrowseData`; swapped `auth.api.getSession` → `getSession()`; swapped `getUserNativeLanguage` DB call → `session.user.nativeLanguage ?? "en"`

## Decisions Made
- `shapeBrowseData` returns a discriminated union (`kind: "detail" | "picker"`) rather than a single shape with optional fields, so the render logic and the `topic` string narrow cleanly under `noUncheckedIndexedAccess`/strict mode without a non-null assertion (matches this project's established no-`!` convention).
- Applied the opportunistic `session.user.nativeLanguage` swap the plan flagged as optional — the pattern was already proven safe and tsc-clean in `/account/page.tsx` (Phase 25-04), so there was no new risk in reusing it here.

## Deviations from Plan

None - plan executed exactly as written (including the one plan-flagged opportunistic swap, which was taken).

## Issues Encountered

None. `npx tsc --noEmit` clean; scoped `npx biome check` clean (one auto-formatting pass applied to the new `Object.fromEntries`/`CATEGORIES.map` call, no logic change); full `npx vitest run` showed 2234 passed / 6 skipped / 1 failed — the 1 failure (`image-upload-flow-extract-errors.test.tsx`, a 5s timeout) is the pre-existing documented full-suite flake from prior phases (26-04, 27-08), unrelated to this plan's files, and passes in isolation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PERF-15 fully satisfied; `browse/page.tsx` now on the 27-01 `getSession()` accessor, consistent with the other 5 non-consolidation RSC call sites
- Remaining Phase 27 plans (27-04, 27-07, 27-10) are unblocked by this plan; no new blockers introduced
- Manual/informal verification (prod-build RSC payload size comparison, per plan's `<verification>` section) deferred to the orchestrator's e2e/verification gate, consistent with this project's established static-only executor policy

## Self-Check: PASSED

- FOUND: src/app/(protected)/deck/browse/__tests__/browse-page.test.ts
- FOUND: src/app/(protected)/deck/browse/page.tsx
- FOUND: .planning/phases/27-performance-batch-2/27-03-SUMMARY.md
- FOUND: a5e5843 (test commit)
- FOUND: 33ccdf0 (feat commit)

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*
