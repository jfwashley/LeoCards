---
phase: 10-vision-extraction-endpoint
plan: "01"
subsystem: ai-sdk-deps + shared-constants + test-scaffolds
tags: [ai-sdk, env, image-constants, vitest, nyquist, wave-0]
dependency-graph:
  requires: [09-01, 09-02]
  provides: [ai-sdk-deps, ANTHROPIC_API_KEY-env, image-constants-module, wave-0-test-scaffolds]
  affects: [10-02, 10-03]
tech-stack:
  added: [ai@6.0.185, "@ai-sdk/anthropic@3.0.78"]
  patterns: [vi.hoisted+vi.mock, describe.skipIf gating, TDD-RED scaffolds, shared-constants-module]
key-files:
  created:
    - src/lib/image-constants.ts
    - src/lib/image-constants.test.ts
    - src/app/api/extract/__tests__/extract.unit.test.ts
    - src/app/api/extract/__tests__/extract-reducer.test.ts
    - src/app/api/extract/__tests__/extract-eval.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/env.ts
    - src/lib/image-validation.ts
decisions:
  - "ai@6.0.185 and @ai-sdk/anthropic@3.0.78 installed at exact pinned versions (no ^) to match D-04 threat mitigation T-10-01"
  - "ANTHROPIC_API_KEY added as .optional() in env.ts server+runtimeEnv blocks only — never client block (T-10-02)"
  - "D-12 constants refactor: new image-constants.ts module; image-validation.ts is a pure re-export swap with zero behavior change"
  - "Nyquist scaffolds import not-yet-existing subjects (extract/route and imageFlowReducer export) — intentionally RED until 10-02/10-03 ship"
  - "eval test uses describe.skipIf(!RUN_EVALS) pattern — exits 0 when RUN_EXTRACTION_EVALS unset; no live API calls in normal CI"
metrics:
  duration: "5 min"
  completed: "2026-05-19"
  tasks: 3
  files: 8
---

# Phase 10 Plan 01: Wave 0 Foundations (AI SDK + Shared Constants + Test Scaffolds) Summary

One-liner: AI SDK v6 installed at exact pins, ANTHROPIC_API_KEY wired as optional server env, ALLOWED_IMAGE_TYPES/MAX_IMAGE_BYTES extracted to shared module, and four Nyquist test scaffolds created (3 RED awaiting subjects, 1 green-when-skipped eval harness).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install AI SDK deps + add ANTHROPIC_API_KEY env binding | 8439820 | package.json, package-lock.json, src/env.ts |
| 2 | Create shared image-constants module + test, refactor image-validation (D-12) | 7fc62a3 | src/lib/image-constants.ts, src/lib/image-constants.test.ts, src/lib/image-validation.ts |
| 3 | Create route/reducer/eval test scaffolds (Nyquist Wave 0) | cc55e3f | src/app/api/extract/__tests__/*.test.ts (3 files) |

## Verification Results

- `npx vitest run src/lib/image-validation.test.ts` — 8/8 PASS (Phase 9 regression gate intact)
- `npx vitest run src/lib/image-constants.test.ts` — 3/3 PASS
- `npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts` — 1 skipped, exit 0 (RUN_EXTRACTION_EVALS unset)
- `npm run typecheck` — passes for production files; expected TS errors only in RED scaffold tests (import subjects not yet created)
- `extract.unit.test.ts` and `extract-reducer.test.ts` — intentionally RED (Nyquist pattern; subjects ship in 10-02 and 10-03)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] npm installed deps with `^` caret prefix instead of exact version**
- **Found during:** Task 1 verification
- **Issue:** `npm install ai@6.0.185 @ai-sdk/anthropic@3.0.78` added `"^6.0.185"` and `"^3.0.78"` to package.json; plan requires exact pins without `^` (T-10-01 threat mitigation)
- **Fix:** Manually edited package.json to remove `^` from both entries, re-ran `npm install` to update lockfile
- **Files modified:** package.json, package-lock.json
- **Commit:** 8439820 (included in same task commit)

**2. [Out of scope - pre-existing] 18 Biome lint errors in unrelated files**
- Pre-existing lint errors in `e2e/*.spec.ts`, `src/db/index.ts`, `drizzle.config.ts`, `src/app/api/study/complete/route.ts`, `src/app/api/translate/route.ts` — none in files created or modified by this plan
- Logged to deferred-items per scope boundary rule; not fixed

## Known Stubs

None — this plan creates test scaffolds only, not UI components with data rendering.

## Threat Flags

None — the two trust boundaries in this plan's threat model (T-10-01 dependency install, T-10-02 ANTHROPIC_API_KEY server-only) were both mitigated:
- T-10-01: exact pins enforced in package.json (no `^`)
- T-10-02: key in `server:` block only, `.optional()` prevents startup crash

## Self-Check: PASSED

All created files verified on disk. All 3 task commits verified in git log.

| Check | Result |
|-------|--------|
| src/lib/image-constants.ts | FOUND |
| src/lib/image-constants.test.ts | FOUND |
| src/app/api/extract/__tests__/extract.unit.test.ts | FOUND |
| src/app/api/extract/__tests__/extract-reducer.test.ts | FOUND |
| src/app/api/extract/__tests__/extract-eval.test.ts | FOUND |
| Commit 8439820 (Task 1) | FOUND |
| Commit 7fc62a3 (Task 2) | FOUND |
| Commit cc55e3f (Task 3) | FOUND |
