---
phase: 14-qa-observability-foundations
plan: 03
subsystem: testing
tags: [e2e, playwright, qa, parity, data-qa-badge, debug-endpoints, 404-guard]

# Dependency graph
requires:
  - phase: 14-qa-observability-foundations
    plan: 01
    provides: /api/debug/state and /api/debug/cheat 404 when DEBUG_CHEAT_SECRET unset
  - phase: 14-qa-observability-foundations
    plan: 02
    provides: QaStateBadge with [data-qa-badge] attribute, RSC gate via readQaAuth()
provides:
  - QAOB-04 gating spec: e2e/14-qa-parity.spec.ts asserting no [data-qa-badge] in customer DOM on /dashboard and /study
  - Feature-state probe pattern: probe /api/debug/state before sign-up; 404 = disabled; skip endpoint assertions with warning if enabled
  - Self-cleaning test user: signUpWithDeck/*test.local domain (cleanup-test-users.mjs removable)
affects:
  - Phase 15+: QAOB-04 spec is the regression gate for any future QA surface; CI must run it against a secret-disabled server

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Feature-state probe before sign-up (page.request before session) — detects disabled vs. enabled feature without coupling to server env vars
    - Guarded endpoint assertions in Playwright (featureDisabled flag; skip with console.warn when env not configured)
    - DOM badge-absence assertion always runs regardless of feature state (customer has no QA cookie)

key-files:
  created:
    - e2e/14-qa-parity.spec.ts
  modified: []

key-decisions:
  - "Pre-sign-up probe to /api/debug/state (no session) — probe is meaningful before user context; a 404 unambiguously means the feature is off"
  - "DOM badge-absence assertions always run (not guarded) — a customer with no QA cookie never gets a badge even if the secret is set; unconditional assertion is stronger"
  - "waitForLoadState('networkidle') on /dashboard before badge count — ensures RSC content has rendered before asserting DOM emptiness"
  - "Single test.describe / single test for QAOB-04 — the invariant is atomic (no badges + no endpoints); splitting would create false isolation"

patterns-established:
  - "Pre-auth feature-state probe: send request before signUpWithDeck; 404 = disabled; use featureDisabled flag to guard later assertions"
  - "Unconditional DOM-absence + conditional endpoint-404: separates RSC-level guarantees (always assertable) from env-level guarantees (only when provably off)"

requirements-completed: [QAOB-04]

# Metrics
duration: 25min
completed: 2026-06-17
---

# Phase 14 Plan 03: QAOB-04 Prod-Parity Gating E2E Spec Summary

**Playwright spec asserting [data-qa-badge] count === 0 on /dashboard and /study + /api/debug/* 404 when secret unset — the automated QAOB-04 guarantee that QA surface is invisible to customers**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-17T11:38:00Z
- **Completed:** 2026-06-17T12:03:13Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `e2e/14-qa-parity.spec.ts` created: feature-state probe before sign-up; DOM badge-absence assertions on /dashboard and /study (always run); endpoint-404 assertions guarded by `featureDisabled` flag
- Full assertion path verified: probe returned 404, server log confirmed `/api/debug/state?secret=anything 404` and `POST /api/debug/cheat 404` during test execution
- 2 passed (web + mobile Chromium) in 56.5s against a secret-disabled dev server
- Test users self-cleaned: 2 `*@test.local` users removed via `scripts/cleanup-test-users.mjs`

## Task Commits

1. **Task 1: Prod-parity gating e2e spec (QAOB-04)** - `6d79419` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `e2e/14-qa-parity.spec.ts` — NEW: QAOB-04 spec with feature-state probe, DOM badge-absence assertions, guarded endpoint-404 assertions, signUpWithDeck/*test.local user

## Decisions Made

- Pre-sign-up probe to `/api/debug/state` (no session cookie) — the probe is meaningful before user context is established; a 404 unambiguously means the feature is off regardless of what the session would carry
- DOM badge-absence assertions run unconditionally — a freshly-created customer with no QA cookie cannot receive a badge even if `DEBUG_CHEAT_SECRET` is set; the unconditional assertion is a stronger guarantee
- `waitForLoadState('networkidle')` on /dashboard — ensures RSC server rendering is complete before asserting badge DOM absence
- Single `test.describe` / single `test` — the QAOB-04 invariant is atomic (no badges AND no endpoints unreachable); splitting would create misleading partial coverage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatting — test function signature across lines**
- **Found during:** Task 1 post-write lint check
- **Issue:** Biome format required the test function signature to be reformatted (long string argument inline with async callback)
- **Fix:** `node_modules/@biomejs/biome/bin/biome format --write e2e/14-qa-parity.spec.ts`
- **Files modified:** `e2e/14-qa-parity.spec.ts`
- **Verification:** `biome ci e2e/14-qa-parity.spec.ts` — 0 errors
- **Committed in:** `6d79419` (Task 1 commit, format fix included)

---

**Total deviations:** 1 auto-fixed (biome formatting only — no logic changes)
**Impact on plan:** Minor formatting. No scope creep, no behavior changes.

## Issues Encountered

**Dev server warmup race:** The first server start attempt failed because the initial Turbopack on-demand compilation did not complete before the first Playwright page navigation (`/signup` returned 404 during the first run). Root cause: Next.js 16 with Turbopack uses "Ready in 277ms" to signal the server is listening, but individual routes are compiled on first request. The first e2e request arrived before the `/signup` route compiled.

**Resolution:** Restarted the dev server, allowed it to warm up by curling `/signup` 5 times before running the test, confirmed all returned 200 before proceeding. The test then passed on the first attempt. The spec itself has no changes — this is a CI runner concern. In CI the dev server should be started and warmed up before tests are run.

## User Setup Required

None — no new environment variables or external services. Running the spec requires starting the dev server with `DEBUG_CHEAT_SECRET=""` (or without setting it) on port 3000 before executing the test.

## Next Phase Readiness

- QAOB-04 is now an automated regression gate — any future change that accidentally re-exposes a QA badge or re-enables `/api/debug/*` on a secret-disabled server will be caught
- Phase 15+ CI should run `e2e/14-qa-parity.spec.ts` against a secret-disabled server to enforce the prod-parity invariant
- Phase 14 is COMPLETE: QAOB-02 (14-01), QAOB-01 (14-02), QAOB-04 (14-03) all satisfied

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. This plan only adds a test file.

## Self-Check

Files verified to exist:
- `e2e/14-qa-parity.spec.ts` — FOUND

Commits verified present:
- `6d79419` feat(14-03): QAOB-04 prod-parity gating e2e spec — FOUND

Self-check results:
- Lint (biome ci on modified files): 0 errors
- Typecheck (tsc --noEmit): 0 errors
- Playwright (web + mobile): 2 passed, 0 failed
- Full 404 assertion path: confirmed via server log (`/api/debug/state?secret=anything 404`, `POST /api/debug/cheat 404`)
- Test user cleanup: 2 `*@test.local` users deleted via cleanup-test-users.mjs

## Self-Check: PASSED

---
*Phase: 14-qa-observability-foundations*
*Completed: 2026-06-17*
