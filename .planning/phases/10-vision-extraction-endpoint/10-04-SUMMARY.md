---
phase: 10-vision-extraction-endpoint
plan: "04"
subsystem: testing
tags: [vitest, anthropic, eval, reference-dataset, vision, fixtures]

requires:
  - phase: 10-02
    provides: live /api/extract route (claude-sonnet-4-6, 12/12 unit tests green)
  - phase: 10-03
    provides: client reducer + extraction flow wired

provides:
  - "claude-sonnet-4-6 model ID verified against ai-sdk.dev provider docs (2026-05-19)"
  - "fixtures/ directory scaffold with README describing 20 scenario slots + naming convention"
  - "reference-labels.json schema template with all 20 slots; images 18-19 pre-populated []"
  - "extract-eval.test.ts: full D3/D4/D5a code-based assertions + D1/D2/D5b manual rubric logging"
  - "eval suite skip-safe (4 tests skipped, exit 0 without RUN_EXTRACTION_EVALS=true)"

affects: [10-vision-extraction-endpoint, phase-11-review-and-commit]

tech-stack:
  added: []
  patterns:
    - "Vitest 4 it() API: options as second argument (not third) — required for timeout config"
    - "Eval fixture schema: {targetLanguage, expectedWords} per filename key; meta-keys prefixed with _"
    - "D3/D4 assertion pattern: membership check (every expectedWord in returned words), not set equality"

key-files:
  created:
    - src/app/api/extract/__tests__/fixtures/README.md
    - src/app/api/extract/__tests__/reference-labels.json
  modified:
    - src/app/api/extract/__tests__/extract-eval.test.ts
    - src/app/api/extract/route.ts

key-decisions:
  - "claude-sonnet-4-6 verified current 2026-05-19 via ai-sdk.dev playground — no id update needed"
  - "D3/D4 eval uses membership check not set equality — extra words are D2 (tutor dimension), not code-asserted"
  - "reference-labels.json template ships with _schema and _slots meta-keys (prefixed _) so eval filter skips them until real data replaces them"

patterns-established:
  - "Vitest 4 timeout option: it(name, { timeout: N }, fn) — second arg position required"

requirements-completed: [EXT-01, EXT-03]

duration: 15min
completed: 2026-05-19
---

# Phase 10 Plan 04: Vision Extraction Eval Scaffolding Summary

**Model ID verified (claude-sonnet-4-6 current 2026-05-19), eval fixtures scaffolded with full D3/D4/D5a wiring, and checkpoint reached awaiting Joshua's 20-image reference dataset**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-19T13:16:00Z
- **Completed:** 2026-05-19T13:20:00Z (checkpoint reached — Task 2 in progress)
- **Tasks completed so far:** 1 of 3 (+ Task 2 scaffolding committed pre-checkpoint)
- **Files modified:** 4

## Accomplishments

- Verified `claude-sonnet-4-6` is the current Sonnet-tier vision-capable model ID against ai-sdk.dev provider docs (2026-05-19); comment updated in route.ts from ASSUMED-latest to "verified 2026-05-19"
- Created `fixtures/README.md` with 20 scenario slots, naming convention, image guidelines, privacy note (T-10-14 — no faces/plates), and ground-truth label schema
- Created `reference-labels.json` template with all 20 slot shapes; images 18–19 pre-populated with `[]` (D5a no-text ground truth)
- Rewrote `extract-eval.test.ts` from skeleton to full assertion wiring: D5a (`toEqual([])`), D3/D4 membership assertions with failure logging (T-10-15 non-weakening), D1/D2/D5b manual rubric logger; skip-safe (4 tests skipped, exit 0)

## Task Commits

1. **Task 1: Verify model ID** - `0ec35ba` (chore)
2. **Task 2 scaffolding: fixtures dir + labels template + eval wiring** - `1254043` (feat)

*(Task 2 checkpoint and Task 3 pending — awaiting Joshua's reference dataset)*

## Files Created/Modified

- `src/app/api/extract/route.ts` — updated ASSUMED-latest comment to "verified 2026-05-19: claude-sonnet-4-6 current"
- `src/app/api/extract/__tests__/fixtures/README.md` — 20 scenario slots, naming convention, image guidelines, ground-truth label schema, run command
- `src/app/api/extract/__tests__/reference-labels.json` — template with exact schema shape; slots 18–19 have `expectedWords: []`
- `src/app/api/extract/__tests__/extract-eval.test.ts` — full D3/D4/D5a code assertions + D1/D2/D5b rubric logger; Vitest 4 API (options as 2nd arg)

## Decisions Made

- `claude-sonnet-4-6` confirmed current as of 2026-05-19 — no route change required
- D3/D4 membership check (not set equality): extra returned words are the D2 dimension (tutor judgment), not a code assertion failure — this prevents noisy false positives from legitimate additional words the model returns
- Template `reference-labels.json` uses `_schema` / `_slots` meta-keys (underscore prefix) so the eval test filters them out and doesn't attempt to load non-existent fixture files until the real data lands

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest 4 API: `it()` options must be second argument, not third**
- **Found during:** Task 2 scaffolding (eval test wiring)
- **Issue:** Wrote `it(name, fn, { timeout })` — this signature was removed in Vitest 4 (`TypeError: Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4`)
- **Fix:** Moved options object to second position: `it(name, { timeout }, fn)` for all three it() calls with timeouts
- **Files modified:** `src/app/api/extract/__tests__/extract-eval.test.ts`
- **Verification:** `npx vitest run extract-eval.test.ts` → 4 tests skipped, exit 0
- **Committed in:** `1254043` (Task 2 scaffolding commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix for eval test to parse at all. No scope change.

## Issues Encountered

None beyond the Vitest 4 API deviation above.

## Model ID Verification Outcome

**Verified: claude-sonnet-4-6 is current (2026-05-19)**

Source checked: `https://ai-sdk.dev/providers/ai-sdk-providers/anthropic` (Vercel AI SDK playground lists `claude-sonnet-4-6` as a current model; AI SDK docs also reference `claude-sonnet-4-20250514` as "Claude 4 Sonnet" — a different model tier). The docs confirm `claude-sonnet-4-6` is the current Sonnet-class vision-capable model ID for `@ai-sdk/anthropic@3.x`.

No route change required. Comment updated from `ASSUMED-latest` to `verified 2026-05-19`.

## Known Stubs

- `reference-labels.json` — populated with placeholder template only; `_slots` keys use `<ext>` wildcards and `"REPLACE_WITH_EXACT_WORDS_FROM_IMAGE"` values. These are intentional: the real ground-truth labels require Joshua + FR/ES tutor curation (plan Task 2 checkpoint). The eval assertions will skip these meta-key entries (filtered by `!key.startsWith("_")`).
- `fixtures/` — directory exists but contains only README.md. The 20 reference images are the manual gap that Task 2 checkpoint resolves.

## Next Phase Readiness

- Task 3 (fill in + run live eval) is blocked on Joshua providing the 20 images and authoring real `reference-labels.json` entries.
- Once "fixtures ready" is signalled, Task 3 can run: `RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts`
- Phase 11 (Review & Commit) can start in parallel — it does not depend on the eval dataset.

---
*Phase: 10-vision-extraction-endpoint*
*Completed: 2026-05-19 (partial — checkpoint reached)*
