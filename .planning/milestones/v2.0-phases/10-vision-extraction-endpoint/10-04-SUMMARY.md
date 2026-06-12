---
phase: 10-vision-extraction-endpoint
plan: "04"
subsystem: testing
tags: [vitest, anthropic, eval, reference-dataset, vision, fixtures, deferred]

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
    - .planning/phases/10-vision-extraction-endpoint/10-HUMAN-UAT.md
  modified:
    - src/app/api/extract/__tests__/extract-eval.test.ts
    - src/app/api/extract/route.ts

key-decisions:
  - "claude-sonnet-4-6 verified current 2026-05-19 via ai-sdk.dev playground — no id update needed"
  - "D3/D4 eval uses membership check not set equality — extra words are D2 (tutor dimension), not code-asserted"
  - "reference-labels.json template ships with _schema and _slots meta-keys (prefixed _) so eval filter skips them until real data replaces them"
  - "Eval reference dataset curation DEFERRED — requires real photos + FR/ES tutor; cannot be synthesized. Tracked in 10-HUMAN-UAT.md."

patterns-established:
  - "Vitest 4 timeout option: it(name, { timeout: N }, fn) — second arg position required"

requirements-completed: [EXT-01, EXT-03]

duration: 15min
completed: 2026-05-19
---

# Phase 10 Plan 04: Vision Extraction Eval Scaffolding Summary

**Model ID verified (claude-sonnet-4-6 current 2026-05-19); eval scaffolding committed. Eval reference-dataset curation DEFERRED — manual work outstanding, tracked in 10-HUMAN-UAT.md. The eval has NOT run and is NOT claimed as passed.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-19T13:16:00Z
- **Completed:** 2026-05-19 (plan finalized with deferred eval noted)
- **Tasks completed:** 1 of 3; Tasks 2 and 3 deferred (scaffolding for Task 2 committed)
- **Files modified:** 4 (+ 1 planning artifact: 10-HUMAN-UAT.md)

## Task Status

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | Verify claude-sonnet-4-6 model ID | COMPLETE | `0ec35ba` |
| 2 | Curate 20 reference images + author ground-truth labels | DEFERRED — scaffolding committed (`1254043`), manual curation outstanding; tracked in 10-HUMAN-UAT.md | `1254043` (scaffolding only) |
| 3 | Run live eval + complete manual rubric | DEFERRED — depends on Task 2; no images or labels exist yet; eval has NOT run | — |

## Accomplishments

**Task 1 (COMPLETE):**
- Verified `claude-sonnet-4-6` is the current Sonnet-tier vision-capable model ID against ai-sdk.dev provider docs (2026-05-19); comment updated in route.ts from ASSUMED-latest to "verified 2026-05-19"

**Task 2 scaffolding (COMMITTED — manual curation outstanding):**
- Created `fixtures/README.md` with 20 scenario slots, naming convention, image guidelines, privacy note, and ground-truth label schema
- Created `reference-labels.json` template with all 20 slot shapes; images 18–19 pre-populated with `[]` (D5a no-text ground truth) — all other slots contain placeholder text, not real labels
- Rewrote `extract-eval.test.ts` from skeleton to full assertion wiring: D5a (`toEqual([])`), D3/D4 membership assertions with failure logging, D1/D2/D5b manual rubric logger; skip-safe (4 tests skipped, exit 0 without `RUN_EXTRACTION_EVALS=true`)

**Eval status:** The eval suite has NOT been run against real images. No eval results exist. The fixtures directory contains only README.md — no reference images have been committed.

## Task Commits

1. **Task 1: Verify model ID** — `0ec35ba` (chore)
2. **Task 2 scaffolding** — `1254043` (feat — eval wiring + fixture scaffold; curation deferred)
3. **Plan finalization** — docs commit (10-HUMAN-UAT.md + SUMMARY update + STATE/ROADMAP)

## Files Created/Modified

- `src/app/api/extract/route.ts` — updated ASSUMED-latest comment to "verified 2026-05-19: claude-sonnet-4-6 current"
- `src/app/api/extract/__tests__/fixtures/README.md` — 20 scenario slots, naming convention, image guidelines, ground-truth label schema, run command
- `src/app/api/extract/__tests__/reference-labels.json` — template with exact schema shape; slots 18–19 have `expectedWords: []`; all other slots are placeholders, not real ground-truth
- `src/app/api/extract/__tests__/extract-eval.test.ts` — full D3/D4/D5a code assertions + D1/D2/D5b rubric logger; Vitest 4 API (options as 2nd arg); skip-safe without env var
- `.planning/phases/10-vision-extraction-endpoint/10-HUMAN-UAT.md` — canonical tracker for 3 outstanding manual eval items

## Decisions Made

- `claude-sonnet-4-6` confirmed current as of 2026-05-19 — no route change required
- D3/D4 membership check (not set equality): extra returned words are the D2 dimension (tutor judgment), not a code assertion failure
- Template `reference-labels.json` uses `_schema` / `_slots` meta-keys (underscore prefix) so the eval test filters them out until real data lands
- Eval reference-dataset curation DEFERRED: requires Joshua to source 20 real photos covering the 10-AI-SPEC.md §5 scenario set + FR/ES tutor review for ground-truth labels; this cannot be synthesized or fabricated

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest 4 API: `it()` options must be second argument, not third**
- **Found during:** Task 2 scaffolding (eval test wiring)
- **Issue:** Wrote `it(name, fn, { timeout })` — this signature was removed in Vitest 4 (`TypeError: Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4`)
- **Fix:** Moved options object to second position: `it(name, { timeout }, fn)` for all three it() calls with timeouts
- **Files modified:** `src/app/api/extract/__tests__/extract-eval.test.ts`
- **Committed in:** `1254043` (Task 2 scaffolding commit)

### Planned Tasks Deferred

**Task 2: Manual reference dataset curation — DEFERRED**
- **Reason:** Requires Joshua to source 20 real photos matching the scenario matrix in 10-AI-SPEC.md §5, and a FR/ES language tutor to author + calibrate ground-truth labels. This is genuine manual labor; it cannot be automated, synthesized, or approximated with fake data.
- **What was committed:** Full scaffolding (fixtures/README.md, reference-labels.json template, extract-eval.test.ts with complete assertion wiring). The eval infrastructure is complete and will execute correctly once real data is placed in fixtures/.
- **Tracker:** `.planning/phases/10-vision-extraction-endpoint/10-HUMAN-UAT.md` (3 pending items)

**Task 3: Live eval run + manual rubric — DEFERRED**
- **Reason:** Depends on Task 2. No images exist; no labels exist; running the eval now would only confirm the 4 tests skip (exit 0), which is already verified.
- **Tracker:** Same — 10-HUMAN-UAT.md Item 3

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug); 2 tasks deferred (manual dataset + live eval run)
**Impact on functional plan:** None. EXT-01..EXT-05 are satisfied by the route and client code (10-02 and 10-03). The deferred eval is offline quality-assurance (10-AI-SPEC.md §5), not a functional dependency.

## Known Stubs

- `reference-labels.json` — template only; no real ground-truth labels exist beyond the pre-populated `[]` for no-text image slots 18–19. Placeholder `_schema` and `_slots` keys will be replaced when Joshua completes curation.
- `fixtures/` — directory exists with README.md only. No reference images committed. The eval will skip all tests as long as `RUN_EXTRACTION_EVALS` is not set (exit 0, safe for CI).

## Validation Debt

Tracked in: `.planning/phases/10-vision-extraction-endpoint/10-HUMAN-UAT.md`

Three outstanding manual items:
1. Curate 20 reference images into `src/app/api/extract/__tests__/fixtures/` (per README.md)
2. Author real ground-truth in `reference-labels.json` with FR/ES tutor calibration
3. Run `RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts` and complete the D1/D2/D5b manual rubric

This debt is non-blocking for Phase 11. The functional extraction feature is accepted as-is.

## Phase 10 Functional Completion

- Phase 10 functional plans (10-01, 10-02, 10-03) and Task 1 of 10-04: COMPLETE
- All unit tests: 1733 passed / 1 skipped / 0 failures (vitest, 2026-05-19)
- tsc: clean
- EXT-01, EXT-02, EXT-03, EXT-04, EXT-05: functionally satisfied
- Eval reference-dataset: deferred (see 10-HUMAN-UAT.md)

---

## Self-Check

**Files created/committed:**
- `src/app/api/extract/route.ts` — modified in `0ec35ba` ✓
- `src/app/api/extract/__tests__/fixtures/README.md` — created in `1254043` ✓
- `src/app/api/extract/__tests__/reference-labels.json` — created in `1254043` ✓
- `src/app/api/extract/__tests__/extract-eval.test.ts` — modified in `1254043` ✓
- `.planning/phases/10-vision-extraction-endpoint/10-HUMAN-UAT.md` — created in finalization commit

**Commits verified:** `0ec35ba` (Task 1), `1254043` (Task 2 scaffolding)

**Eval status accurately documented:** The eval has NOT run. No pass/fail result is claimed. Deferred items are tracked in 10-HUMAN-UAT.md.

## Self-Check: PASSED

*Phase: 10-vision-extraction-endpoint*
*Plan finalized: 2026-05-19 — functionally closed with deferred eval-validation debt*
