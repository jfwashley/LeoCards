---
phase: 14-qa-observability-foundations
plan: 01
subsystem: testing
tags: [hmac, cookies, debug, qa, env, vitest, drizzle, spaced-repetition]

# Dependency graph
requires:
  - phase: 13-qa-cheat-console
    provides: debug-cheat.ts HMAC pattern, /api/debug/cheat, /api/debug/state, /debug page
provides:
  - QA_MODE_COOKIE constant and signQaMode/verifyQaMode/readQaAuth helpers in debug-cheat.ts
  - STUDY_COOLDOWN_MINUTES env var (number, min 1, coerced via transform/pipe)
  - buildCooldownConfig() with D-09 precedence (STUDY_COOLDOWN_MINUTES > NO_COOLDOWN > dev auto-zero > prod defaults)
  - QA-mode cookie minted on every successful secret verification in /api/debug/cheat
  - /api/debug/state returns { real, forced, cards[] } with per-card SRS data from real DB
  - /debug page renders Card SRS state table sorted by learned status and cooldown
affects:
  - 14-02: badge plan needs readQaAuth() from debug-cheat.ts
  - 14-03: QAOB-04 gating test verifies 404 behavior preserved and STUDY_COOLDOWN_MINUTES unset

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HMAC-signed presence cookie (QA_MODE_COOKIE) mirroring existing signOverride/verifyOverride pattern
    - t3-env numeric coercion via z.string().transform().pipe(z.number()) for STUDY_COOLDOWN_MINUTES
    - vi.doMock() + vi.resetModules() + dynamic import for per-test env isolation with heavy route dependencies
    - Top-level vi.mock() for DB/auth/rate-limit to prevent timeout in full suite runs

key-files:
  created:
    - src/app/api/study/__tests__/cooldown-config.test.ts
  modified:
    - src/lib/debug-cheat.ts
    - src/lib/debug-cheat.test.ts
    - src/env.ts
    - src/env.test.ts
    - src/app/api/study/complete/route.ts
    - src/app/api/debug/cheat/route.ts
    - src/app/api/debug/state/route.ts
    - src/app/(protected)/debug/page.tsx

key-decisions:
  - "QA_MODE_COOKIE uses fixed-sentinel HMAC (no schema parse step) — eliminates payload injection surface (T-14-01)"
  - "buildCooldownConfig() exported from complete/route.ts for unit testability (mirrors computeCardUpdate export pattern)"
  - "QA-mode cookie set on both clear AND set paths in cheat/route.ts — any secret verification establishes QA mode (D-01/D-02)"
  - "cards query in state/route.ts verifies deck ownership before fetching (T-14-06 mitigation)"
  - "vi.doMock() with top-level DB/auth mocks chosen over module extraction — avoids restructuring the route file"

patterns-established:
  - "Server-only QA gate: readQaAuth() as the canonical boolean gate for RSC pages (Plan 02 consumes this)"
  - "Env numeric coercion: z.string().optional().transform().pipe(z.number().int().min(1).optional()) pattern"
  - "Per-test module isolation: vi.doMock() in test body + vi.resetModules() in afterEach + top-level vi.mock() for heavy deps"

requirements-completed: [QAOB-02, QAOB-03]

# Metrics
duration: 20min
completed: 2026-06-17
---

# Phase 14 Plan 01: QA Observability Foundations Summary

**HMAC-signed `leo-qa-mode` persistent cookie helpers, `STUDY_COOLDOWN_MINUTES` env var with D-09 precedence, and real-data per-card SRS table on `/api/debug/state` + `/debug` page**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-17T10:34:47Z
- **Completed:** 2026-06-17T10:55:01Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Added `QA_MODE_COOKIE`, `signQaMode()`, `verifyQaMode()`, `readQaAuth()` to `debug-cheat.ts` — Plan 02 now has a ready-to-consume server-side QA gate
- Added `STUDY_COOLDOWN_MINUTES` to `env.ts` with string-to-number coercion via `z.string().transform().pipe(z.number().int().min(1))` — D-09 precedence enforced in `buildCooldownConfig()`
- `/api/debug/cheat` now mints `leo-qa-mode` cookie on every successful secret verification (both clear and set paths) so QA mode persists independently of any habitat override
- `/api/debug/state` extended to return `cards[]` array with `{ id, word, masteryRound, direction, cooldownUntil, pausedAt, learned }` from real DB data, scoped to session user
- `/debug` page renders a compact Card SRS state table sorted unlearned-first then by cooldown

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for QA-mode cookie helpers + STUDY_COOLDOWN_MINUTES** - `c811287` (test)
2. **Task 1 GREEN: QA-mode cookie helpers + env var implementation** - `37f1352` (feat)
3. **Task 2 RED: Failing tests for buildCooldownConfig precedence** - `d7d385c` (test)
4. **Task 2 GREEN: buildCooldownConfig + QA cookie issuance in cheat/route.ts** - `f69c482` (feat)
5. **Task 3: Per-card SRS table in state/route.ts + debug/page.tsx** - `c76fc02` (feat)
6. **Style: Fix biome import ordering** - `1556f08` (style)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/debug-cheat.ts` — Added QA_MODE_COOKIE, signQaMode(), verifyQaMode(), readQaAuth() after existing helpers
- `src/lib/debug-cheat.test.ts` — Extended with QA-mode round-trip, tamper, null/empty/no-dot, and readQaAuth tests
- `src/env.ts` — Added STUDY_COOLDOWN_MINUTES with transform/pipe coercion to number (min 1)
- `src/env.test.ts` — Added STUDY_COOLDOWN_MINUTES validation and coercion tests
- `src/app/api/study/complete/route.ts` — Replaced module-level consts with exported buildCooldownConfig() implementing D-09
- `src/app/api/study/__tests__/cooldown-config.test.ts` — NEW: four precedence branch tests (vi.doMock + dynamic import pattern)
- `src/app/api/debug/cheat/route.ts` — Imported QA_MODE_COOKIE/signQaMode; added cookie set on both clear and set paths
- `src/app/api/debug/state/route.ts` — Added masteryRoundToDirection(), getFirstDeckId(), cards[] to GET response
- `src/app/(protected)/debug/page.tsx` — Added CardDebugEntry interface, cards? to DebugStateResponse, card SRS table render

## Decisions Made

- Used fixed-sentinel HMAC for QA cookie (no schema parse) — eliminates payload injection, matches T-14-01 threat mitigation
- Exported `buildCooldownConfig()` from the route file directly (not extracted to a utility) — keeps diff minimal and mirrors the `computeCardUpdate` export pattern in `study-engine.ts`
- QA-mode cookie set on the clear path too — rationale: any secret verification proves the user knows the secret, so QA mode should persist regardless of override state
- Deck ownership verified in `state/route.ts` before fetching cards — provides defense-in-depth beyond just the session check (T-14-06)
- Used `vi.doMock()` + top-level `vi.mock()` for heavy route deps — avoids the 5000ms timeout that occurs in full suite when the complete route imports DB/auth/rate-limit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cooldown-config test timed out in full vitest suite**
- **Found during:** Task 2 verification (full `npx vitest run`)
- **Issue:** The `buildCooldownConfig` test dynamically imported `complete/route.ts` which transitively imports `@/db` (Neon HTTP client), `@/lib/auth` (Better Auth initialization), and `createRateLimiter` — causing a 5000ms timeout when the full suite ran these imports in a shared module environment
- **Fix:** Added top-level `vi.mock()` declarations for `@/db`, `@/lib/auth`, `@/lib/rate-limit`, `next/headers`, `@/lib/habitat-engine`, `@/lib/habitat-queries`, and `@/lib/milestone-queries` in the cooldown-config test file to prevent DB connections; kept `vi.doMock()` per-test for `@/env` with `vi.resetModules()` in `afterEach`
- **Files modified:** `src/app/api/study/__tests__/cooldown-config.test.ts`
- **Verification:** `npx vitest run` — all 1913 tests pass (was 1 failing)
- **Committed in:** `f69c482` (part of Task 2 commit, test fix included)

**2. [Rule 2 - Missing Critical] Added deck ownership verification in state/route.ts**
- **Found during:** Task 3 implementation
- **Issue:** Plan specified scoping cards query to `session.user.id` but did not specify an explicit ownership check for the `?deck=` URL param — an attacker could provide another user's deckId to probe card counts
- **Fix:** Added a `SELECT id FROM decks WHERE id=? AND userId=?` check before fetching cards; only fetches if ownership confirmed
- **Files modified:** `src/app/api/debug/state/route.ts`
- **Verification:** Typecheck clean; T-14-06 threat mitigated
- **Committed in:** `c76fc02` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical security)
**Impact on plan:** Both fixes essential for correctness and security. No scope creep.

## Issues Encountered

None - all planned work completed. The vi.doMock timeout was caught during verification and resolved within the same task cycle.

## User Setup Required

None - no external service configuration required. STUDY_COOLDOWN_MINUTES is set via Vercel Preview env scope (per D-10); local testing uses `.env.local`. No new secrets.

## Next Phase Readiness

- `readQaAuth()` is ready for Plan 02 (QA state badges) to consume — call from RSC pages, pass boolean as prop to client badge components
- `STUDY_COOLDOWN_MINUTES` is live — set `STUDY_COOLDOWN_MINUTES=15` in `.env.local` for local QA testing
- `/debug` card table is functional — after entering secret and refreshing, all cards show SRS state
- Plan 03 (QAOB-04 gating test) depends on the 404 behavior of `/api/debug/*` endpoints when `DEBUG_CHEAT_SECRET` is unset — this is preserved and confirmed by acceptance criteria

## Self-Check

Files verified to exist:
- `src/lib/debug-cheat.ts` — FOUND
- `src/env.ts` — FOUND
- `src/app/api/study/complete/route.ts` — FOUND
- `src/app/api/study/__tests__/cooldown-config.test.ts` — FOUND
- `src/app/api/debug/cheat/route.ts` — FOUND
- `src/app/api/debug/state/route.ts` — FOUND
- `src/app/(protected)/debug/page.tsx` — FOUND

Commits verified present in git log:
- `c811287` test(14-01): RED tests — FOUND
- `37f1352` feat(14-01): QA-mode cookie helpers — FOUND
- `d7d385c` test(14-01): cooldown-config RED — FOUND
- `f69c482` feat(14-01): buildCooldownConfig + cookie issuance — FOUND
- `c76fc02` feat(14-01): per-card SRS table — FOUND
- `1556f08` style(14-01): biome import ordering — FOUND

Self-check results:
- Lint (biome): 0 errors on modified files (1 pre-existing warning in debug/page.tsx not introduced by this plan)
- Typecheck (tsc --noEmit): 0 errors
- Unit tests (npx vitest run): 1913 passed, 6 skipped, 0 failed

## Self-Check: PASSED

---
*Phase: 14-qa-observability-foundations*
*Completed: 2026-06-17*
