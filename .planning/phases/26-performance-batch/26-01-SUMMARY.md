---
phase: 26-performance-batch
plan: 01
subsystem: api
tags: [deepl, translation, zod, rate-limiting, react, vitest]

# Dependency graph
requires: []
provides:
  - "Additive texts[] array mode on /api/translate (frozen singular text/translation contract unchanged)"
  - "First-ever test coverage for /api/translate (route.test.ts)"
  - "runTranslationFanOut in review-list.tsx rewritten to one batched fetch + one retry + per-word fallback"
affects: [26-performance-batch (remaining plans), 18-performance-recert]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive Zod schema extension with .refine() mutual-exclusivity guard, keeping an existing field frozen for a second untouched caller"
    - "Client-side single-retry-then-fallback pattern for a batched network call (attemptBatch helper called up to twice, null-coalesced)"

key-files:
  created:
    - src/app/api/translate/__tests__/route.test.ts
  modified:
    - src/app/api/translate/route.ts
    - src/components/review-list.tsx
    - src/components/review-list.test.ts

key-decisions:
  - "Array branch placed before the singular branch in route.ts POST handler; both wrapped in their own try/catch returning the same 502 on DeepL failure"
  - "runTranslationFanOut collapsed to a single requestBody string reused across both attemptTranslationBatch calls (attempt + one retry), avoiding duplicate JSON.stringify"
  - "Removed the now-unused singular TranslationResponseSchema from review-list.tsx (translation-form.tsx keeps its own separate copy per Pitfall 4 — not consolidated)"

patterns-established:
  - "Array-mode additive API extension: optional new field + .refine() exclusivity guard + independent .max() abuse-guard bound, singular contract untouched byte-for-byte"

requirements-completed: [PERF-09]

duration: 12min
completed: 2026-07-21
---

# Phase 26 Plan 01: DeepL Translation Batching Summary

**Fixes the live >30-word 429 bug by replacing review-list.tsx's per-word `/api/translate` fan-out with one batched DeepL array request (additive `texts[]` mode, singular contract frozen); first-ever test coverage for the route.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-21T23:19:00Z (approx, per STATE.md session continuity)
- **Completed:** 2026-07-21T23:27:00Z
- **Tasks:** 3 (Task 1 TDD RED, Task 2 GREEN, Task 3 GREEN)
- **Files modified:** 4 (1 new)

## Accomplishments

- **Live bug fixed:** `runTranslationFanOut` now issues exactly ONE `fetch("/api/translate")` carrying `{ texts: string[] }` instead of one fetch per word. A 50-word extraction now spends exactly 1 of the route's 30/min rate-limit slots instead of up to 50 — the deterministic ">30 words in one minute → 429 → 'Translation unavailable' on every remaining word" failure is gone.
- **Additive, backward-compatible route extension:** `/api/translate`'s Zod schema gained an optional `texts: string[].max(50)` field and a `.refine()` mutual-exclusivity guard, while the existing `text: string` field (now `.optional()`) and its `{ translation }` response shape are untouched — `translation-form.tsx`'s manual live-translate caller and `e2e/04-manual-card-entry.spec.ts` were not modified and remain unaffected.
- **First-ever coverage for `/api/translate`:** new `src/app/api/translate/__tests__/route.test.ts` covers the previously-untested singular regression path, the new array happy path (order-preserved), the `.max(50)` rejection (51-item array → 400), and the text/texts mutual-exclusivity guard (both or neither → 400).
- **D-04 retry-then-fallback:** on a failed or non-ok batch response, `runTranslationFanOut` retries the whole batch exactly once; if the retry also fails, every row falls back to the pre-existing verbatim `"Translation unavailable — enter manually."` placeholder — zero new UI states.
- **D-05 confirmed, no chunking added:** re-verified the extraction word cap is triple-enforced in `src/app/api/extract/route.ts` — Zod `.max(50)` at line 23, the AI prompt instruction "Return at most 50 words" at line 172, and the defensive `words.slice(0, 50)` at line 205 — so a single DeepL batch (max 50 texts/request) always suffices; no client-side chunking logic was needed.

## Before/After (informal observation, D-verification)

**Before:** A 40-word image extraction fired 40 sequential `fetch("/api/translate")` calls. The route's 30/min-per-user rate limiter allowed the first 30 through; requests 31-40 received `429 Too Many Requests`, and `Promise.allSettled` mapped every rejected/non-ok result to `"Translation unavailable — enter manually."` — 10 of 40 words landed in step-b with no translation, deterministically, every time an extraction exceeded 30 words.

**After:** The same 40-word extraction now fires exactly ONE `fetch("/api/translate")` with `{ texts: [...40 words] }`. The route calls `client.translateText(texts, sourceLang, targetLangCode)` (DeepL's native array overload, order-preserved) in a single round trip, spending 1 of 30 rate-limit slots. All 40 words return translated in one response; the 429/placeholder failure mode is unreachable for any extraction ≤50 words (the extraction endpoint's own hard cap).

## Task Commits

Each task was committed atomically:

1. **Task 1 (Wave 0): First-ever /api/translate test file + review-list fan-out RED** - `8e4e9a7` (test)
2. **Task 2: Additive texts[] array mode on /api/translate** - `27d9577` (feat)
3. **Task 3: One batched fetch + retry + fallback in runTranslationFanOut** - `627857c` (fix)

**Plan metadata:** (this commit, docs)

_TDD gate sequence confirmed in git log: test(26-01) → feat(26-01) → fix(26-01), in order._

## Files Created/Modified

- `src/app/api/translate/__tests__/route.test.ts` - NEW. Singular regression, array happy path, `.max(50)` rejection, mutual-exclusivity coverage for `/api/translate` (5 tests, all green).
- `src/app/api/translate/route.ts` - Zod schema extended (optional `text`, new optional `texts: string[].max(50)`, `.refine()` exclusivity guard); new array branch calling `client.translateText(texts, ...)` returning `{ translations }`, placed before the untouched singular branch.
- `src/components/review-list.tsx` - `runTranslationFanOut` rewritten around a new `attemptTranslationBatch` helper: one batched fetch, one automatic retry on failure, index-zipped results, verbatim placeholder fallback on total failure. Removed the now-unused singular `TranslationResponseSchema` (translation-form.tsx keeps its own separate copy).
- `src/components/review-list.test.ts` - "translation fan-out" describe block rewritten to assert the batched contract: 1-call happy path, retry-then-succeed, retry-then-fallback (both thrown-error and non-ok-response variants), and a total-failure "never throws" case.

## Decisions Made

- Array branch placed BEFORE the singular branch in the route handler, each with its own try/catch returning the same 502 "Translation service unavailable" on DeepL failure — matches 26-PATTERNS.md's prescribed shape exactly.
- `runTranslationFanOut` reuses a single `requestBody` string across both the initial attempt and the one retry (built once via `JSON.stringify`), avoiding redundant serialization while keeping the retry byte-for-byte identical to the original request.
- Deviated from 26-PATTERNS.md's illustrative `vi.fn().mockImplementation(() => ({...}))` shape for the `deepl-node` DeepLClient test mock — an arrow function cannot be invoked via `new`, which is required since `route.ts` does `new deepl.DeepLClient(...)`. Used a regular `function DeepLClient(this: {...})` constructor-style mock instead (Rule 1 — the pattern-doc's illustrative snippet was a bug when exercised against real `new` semantics).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] deepl-node test mock used an arrow function as a `new`-invoked constructor**
- **Found during:** Task 1 verification (`npx vitest run` on the new route test file)
- **Issue:** 26-PATTERNS.md's illustrative `vi.mock("deepl-node", ...)` shape used `DeepLClient: vi.fn().mockImplementation(() => ({...}))`. `route.ts` calls `new deepl.DeepLClient(env.DEEPL_API_KEY)`; `vi.fn()` forwards `new` calls to its `mockImplementation` via `new impl(...)`, and arrow functions cannot be used as constructors — every test hit `TypeError: ... is not a constructor`.
- **Fix:** Replaced the arrow-function implementation with a regular `function DeepLClient(this: {...}) { this.translateText = mockTranslateText; }`, which supports `new`.
- **Files modified:** `src/app/api/translate/__tests__/route.test.ts`
- **Verification:** All 5 route tests pass (2 initially RED as expected pending Task 2, then 5/5 green after Task 2 landed).
- **Committed in:** `8e4e9a7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule-1 bug in a new test file, not production code).
**Impact on plan:** No scope creep — pure test-infrastructure fix required to make the Wave-0 test file executable at all; production behavior and the plan's documented interfaces are unaffected.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None - no external service configuration required. Zero new dependencies (per 26-RESEARCH.md's Package Legitimacy Audit: N/A).

## Next Phase Readiness

- **This plan is independently deployable (Wave 1).** It touches only `/api/translate` (additive) and `review-list.tsx`'s client-side fan-out — `translation-form.tsx` and `e2e/04-manual-card-entry.spec.ts` (the manual live-translate regression guardrail) are untouched. Josh can push this to prod ahead of the rest of Phase 26 to fix the live bug immediately (main auto-deploys prod per PROJECT.md).
- Scoped verification (`npx vitest run src/app/api/translate/__tests__/route.test.ts src/components/review-list.test.ts`) is green: 32 passed, 2 skipped (pre-existing, unrelated `describe.skip` cancel-path placeholder). Scoped `biome ci` on all four touched files is clean except one pre-existing, out-of-scope `noExplicitAny` warning at `review-list.test.ts:342` (not introduced by this plan).
- Remaining Phase 26 plans (PERF-07, PERF-08, PERF-10, PERF-11) are unblocked and independent of this plan's changes.
- Orchestrator wave gate still owed: full `npx tsc --noEmit` + full `npx vitest run` + the `e2e/04-manual-card-entry.spec.ts` regression check against a freshly-restarted dev server.

## Known Stubs

None.

## Threat Flags

None — the new `texts[]` surface and its `.max(50)` mitigation were fully anticipated by this plan's own `<threat_model>` (T-26-01/02/03/04); no new unanticipated surface was introduced.

---
*Phase: 26-performance-batch*
*Completed: 2026-07-21*

## Self-Check: PASSED

All created/modified files verified present on disk; all four commit hashes (8e4e9a7, 27d9577, 627857c, 01278e0) verified present in git log.
