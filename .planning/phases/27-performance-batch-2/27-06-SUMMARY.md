---
phase: 27-performance-batch-2
plan: 06
subsystem: api
tags: [abortcontroller, lru-cache, deepl, translation, react, race-condition]

# Dependency graph
requires:
  - phase: 26-performance-batch
    provides: "texts[] array mode + one-retry batched fan-out on /api/translate (PERF-09), runTranslationFanOut in review-list.tsx"
provides:
  - "AbortController-based stale-response race fix in translation-form.tsx (PERF-19)"
  - "In-memory bounded LRU cache (src/lib/translation-cache.ts) in front of DeepL, wired into both texts[] and singular branches of /api/translate (PERF-23)"
  - "Client-side word dedupe within a single translation fan-out batch (review-list.tsx)"
affects: [27-performance-batch-2 (remaining plans), any future translate-path work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single AbortController ref per component, aborted+recreated at the start of every new async fire — composes with, does not replace, existing guard logic"
    - "Duck-typed AbortError check (`'name' in err && err.name === 'AbortError'`) instead of `instanceof Error`, since DOMException doesn't reliably share a realm/prototype chain with the ambient Error"
    - "Bounded Map-based LRU (delete+re-set on hit/set for cheap insertion-order eviction) mirroring rate-limit.ts's module-scope-singleton convention"
    - "vi.resetModules() + per-test dynamic re-import to isolate a module-scope cache singleton across tests in the same file"

key-files:
  created:
    - src/lib/translation-cache.ts
    - src/components/translation-form.test.tsx
  modified:
    - src/components/translation-form.tsx
    - src/app/api/translate/route.ts
    - src/app/api/translate/__tests__/route.test.ts
    - src/components/review-list.tsx
    - src/components/review-list.test.ts

key-decisions:
  - "Cache checks/sets per-item inside the texts[] branch (not a single joined-array key), so a partial cache hit still short-circuits the cached subset and only calls DeepL for the actual misses"
  - "review-list.tsx's runTranslationFanOut edited even though not listed in this plan's files_modified frontmatter — the task's own <action> text explicitly required client-side dedupe there; treated as Rule 2 (task-mandated, not scope creep)"
  - "route.test.ts restructured to re-import the route module fresh per test (vi.resetModules) since the new module-scope translationCache singleton would otherwise leak state across tests in the same file"

patterns-established:
  - "Server-side translation LRU: bounded Map, sourceLang:targetLang:text key, 5000 entries / 1h TTL, module-scope singleton alongside the existing rate limiter"

requirements-completed: [PERF-19, PERF-23]

# Metrics
duration: 25min
completed: 2026-07-22
---

# Phase 27 Plan 06: Translation race fix + LRU cache Summary

**AbortController kills stale same-direction translation responses in translation-form.tsx, and a bounded in-memory LRU (plus client-side fan-out dedupe) cuts repeated DeepL calls on the same word.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-22T12:23:16Z
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- Fixed the translation-form stale-response race: typing "cha" → "chat" no longer lets a slow first DeepL response overwrite the newer translation — a single `AbortController` ref aborts the previous in-flight request on every new fire, composed with (not replacing) the existing `activeField` field-switch guard
- `AbortError` is a silent no-op, never surfacing the "Translation unavailable" error
- Added `src/lib/translation-cache.ts` — a bounded, TTL'd, Map-based LRU cache keyed `sourceLang:targetLang:text`, wired into both the `texts[]` and singular `text` branches of `/api/translate` ahead of the existing auth → rate-limit → try/catch skeleton
- Added client-side word dedupe inside `runTranslationFanOut` (review-list.tsx) — a repeated word across rows in the same image-extraction batch is now sent to `/api/translate` only once

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: AbortController stale-response race fix**
   - `299edbc` test(27-06): add failing test for translation-form AbortController race (PERF-19)
   - `44fcd2b` feat(27-06): fix translation-form stale-response race with AbortController (PERF-19)
2. **Task 2: Translation LRU cache + client fan-out dedupe**
   - `2fcd600` test(27-06): add failing test for translate route LRU cache (PERF-23)
   - `f261cac` test(27-06): add failing test for fan-out client-side word dedupe (PERF-23)
   - `7820e71` feat(27-06): dedupe repeated words within a translation fan-out batch (PERF-23)
   - `206a890` feat(27-06): add translation LRU cache in front of DeepL (PERF-23)

_Note: Task 2 split its RED/GREEN pairs across two related sub-behaviors (server cache, client dedupe) that both serve PERF-23 but touch different files — each got its own RED-then-GREEN pair rather than one combined commit per phase._

## Files Created/Modified
- `src/lib/translation-cache.ts` - new bounded Map-based LRU cache factory (`createTranslationCache`), mirrors rate-limit.ts's convention
- `src/components/translation-form.tsx` - AbortController ref added to `translateFrom`; AbortError treated as silent no-op
- `src/components/translation-form.test.tsx` - new file; 3 tests covering the stale-response race, AbortError silence, and the pre-existing field-switch guard
- `src/app/api/translate/route.ts` - module-scope `translationCache` singleton; cache check/set added to both the `texts[]` and singular `text` branches
- `src/app/api/translate/__tests__/route.test.ts` - 3 new LRU tests; restructured to re-import the route module per test (`vi.resetModules`) for cache isolation
- `src/components/review-list.tsx` - `runTranslationFanOut` now dedupes duplicate words before building the batch request body, then maps translations back onto rows by word
- `src/components/review-list.test.ts` - 1 new test proving the dedupe (duplicate word sent once, both rows still receive the correct translation)

## Decisions Made
- Cache the `texts[]` array branch per-item (not as one joined key) so a batch with a mix of cached and uncached words only calls DeepL for the actual misses, preserving the exact `catch → 502` shape on any DeepL failure among the misses
- Edited `review-list.tsx`/`review-list.test.ts` even though the plan's `files_modified` frontmatter list omitted them — the task's own `<action>` text explicitly requires "client-side dedupe within the fan-out (`runTranslationFanOut`)", which only exists in that file. Treated as in-scope task work (the frontmatter list appears to be a stale omission, not an intentional exclusion), not a Rule 4 architectural change — it's a same-shape addition to an existing exported helper, no new files, no schema/API changes.
- Restructured `route.test.ts` to dynamically re-import `POST` fresh in `beforeEach` via `vi.resetModules()` — the new module-scope `translationCache` singleton would otherwise persist across all `it()` blocks in the file, causing later tests (e.g. the frozen-contract "array happy path" test) to silently get cache hits from earlier tests' fixture words ("chien") and fail with polluted results. This is a Rule 1 fix (a genuine test-isolation bug introduced by adding module-scope state), verified by re-running the full file (8/8 pass) after the change.
- Fixed the AbortError detection to be duck-typed (`'name' in err && err.name === 'AbortError'`) rather than `err instanceof Error` — a jsdom-environment `DOMException` constructed via the global `DOMException` did not satisfy `instanceof Error` reliably in the test's realm, which would have silently defeated the silent-no-op behavior in production for any runtime where `AbortError` isn't a plain `Error` subclass instance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test-isolation bug from the new module-scope translation cache singleton**
- **Found during:** Task 2 (LRU cache implementation)
- **Issue:** Adding a module-scope `translationCache` singleton to `route.ts` caused cross-test pollution in `route.test.ts` — a static top-level `import { POST }` meant the cache persisted across every `it()` block in the file, so a later test using the same fixture word ("chien") as an earlier test got a stale cache hit instead of the value its own mock configured, producing wrong array results.
- **Fix:** Converted the subject import to a `let POST` re-imported fresh via `vi.resetModules()` + dynamic `import()` inside `beforeEach`, giving every test a brand-new, empty cache instance.
- **Files modified:** `src/app/api/translate/__tests__/route.test.ts`
- **Verification:** Full `route.test.ts` re-run: 8/8 tests pass (was 7/8 with the "array happy path" test polluted).
- **Committed in:** `206a890` (part of Task 2's GREEN commit)

**2. [Rule 1 - Bug] AbortError not reliably detected via `instanceof Error`**
- **Found during:** Task 1 (AbortController fix, GREEN phase)
- **Issue:** The initial implementation checked `err instanceof Error && err.name === "AbortError"`. In the jsdom test environment, a `DOMException` constructed from the global `DOMException` did not satisfy `instanceof Error`, causing the "AbortError never surfaces an error" test to fail even with the abort-handling logic otherwise correct.
- **Fix:** Switched to a duck-typed check (`err !== null && typeof err === "object" && "name" in err && err.name === "AbortError"`), which works regardless of the exception object's prototype chain/realm.
- **Files modified:** `src/components/translation-form.tsx`
- **Verification:** `npx vitest run src/components/translation-form.test.tsx` — all 3 tests pass.
- **Committed in:** `44fcd2b` (Task 1's GREEN commit)

**3. [Rule 2 - Missing Critical] Client-side fan-out dedupe added to review-list.tsx (file not in plan's files_modified list)**
- **Found during:** Task 2 (re-reading the task's own `<action>` text)
- **Issue:** The plan's frontmatter `files_modified` list omits `src/components/review-list.tsx`, but the task's `<action>` explicitly requires "Add client-side dedupe within the fan-out (`runTranslationFanOut`)" — a function that only exists in that file.
- **Fix:** Implemented the dedupe in `runTranslationFanOut` (collapse duplicate words into one `texts[]` entry, map translations back by word) and added a covering test.
- **Files modified:** `src/components/review-list.tsx`, `src/components/review-list.test.ts`
- **Verification:** `npx vitest run src/components/review-list.test.ts` — 31/31 pass (30 pre-existing + 1 new), plus `src/components/__tests__/review-list-commit-guard.test.tsx` unaffected.
- **Committed in:** `f261cac` (RED), `7820e71` (GREEN)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 2 missing-critical-functionality per the task's own action text)
**Impact on plan:** All three necessary for correctness (test isolation, real AbortError detection) or for actually completing PERF-23 as the task describes it (the fan-out dedupe). No scope creep beyond what the task text itself specified.

## Issues Encountered
- The original test design for the field-switch-guard test (Task 1, test 3) assumed the user could type directly into the target field while a native→target translation was in flight — but the component renders the receiving field as a non-input "translating…" shimmer while `isTranslating` is true, so there's no `<input>` to fire a change event on. Redesigned the test to use the swap control (`⇅`, always clickable regardless of translation state) to reassign `activeField` instead, which correctly isolates the pre-existing guard from the new AbortController behavior without needing timer advancement (no abort race).
- Confirmed (again) the known pre-existing flake: `cooldown-config.test.ts`'s `STUDY_COOLDOWN_MINUTES=15` test times out intermittently (since Phase 15-04) — unrelated to this plan, not chased, per project gotcha note.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PERF-19 and PERF-23 are both shipped and test-proven (count/round-trip assertions, no timing gates, per D-09)
- Full `npx tsc --noEmit` clean; scoped `biome check` clean across all 7 touched files (one pre-existing, out-of-scope `noExplicitAny` warning at `review-list.test.ts:342` untouched)
- Full `npx vitest run`: 2222 passed / 6 skipped / 1 pre-existing flake (`cooldown-config.test.ts`, unrelated)
- 27-02, 27-03, 27-04, 27-07..10 remain unexecuted in Phase 27 (performance-batch-2)

## Self-Check: PASSED

All 8 created/modified files verified present on disk; all 6 task commit hashes (`299edbc`, `44fcd2b`, `2fcd600`, `f261cac`, `7820e71`, `206a890`) verified present in `git log`.

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*
