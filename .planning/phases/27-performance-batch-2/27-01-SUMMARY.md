---
phase: 27-performance-batch-2
plan: 01
subsystem: auth
tags: [better-auth, react-cache, nextjs-rsc, session-management, vitest]

# Dependency graph
requires:
  - phase: 25-my-account
    provides: "/account page + account-actions.ts (requestEmailChange, deleteAccount) this plan's D-04 exception targets"
provides:
  - "src/lib/auth-session.ts: cache()-wrapped getSession()/getSessionFresh() session accessor contract"
  - "session.cookieCache config in src/lib/auth.ts (5-min TTL)"
  - "All non-consolidation RSC call sites (layout, study, habitat, welcome, new-card, account, account-actions) swapped to the new accessors"
  - "PERF-12..PERF-23 requirements minted in REQUIREMENTS.md"
affects: [27-02, 27-03, 27-04, dashboard, browse, study, habitat, welcome, account]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React cache() zero-arg session accessor (first cache() usage in this codebase)"
    - "better-auth session.cookieCache with a disableCookieCache per-call bypass for revocation-sensitive paths"

key-files:
  created:
    - src/lib/auth-session.ts
    - src/lib/__tests__/auth-session.test.ts
  modified:
    - .planning/REQUIREMENTS.md
    - src/lib/auth.ts
    - src/app/(protected)/layout.tsx
    - src/app/(protected)/study/page.tsx
    - src/app/(protected)/habitat/page.tsx
    - src/app/(auth)/welcome/page.tsx
    - src/app/(protected)/deck/new-card/page.tsx
    - src/app/(protected)/account/page.tsx
    - src/lib/account-actions.ts

key-decisions:
  - "Mocked react's cache() in auth-session.test.ts with a real memoize-by-zero-args implementation, since the installed react client build's cache() is a pure passthrough (no memoization) and the react-server build's cache() also no-ops without an active AsyncLocalStorage dispatcher -- neither is exercised by a bare vitest/node test, so the test asserts auth-session.ts's CONTRACT with cache() rather than React's internal RSC dedupe machinery"
  - "Kept headers and auth imports in account-actions.ts (not removed) -- deleteAccount still needs headers() for its later auth.api.signOut({ headers: hdrs }) call"

patterns-established:
  - "Zero-argument cache()-wrapped session accessor: cache() keys on argument reference, so a zero-arg function (reading headers() internally) dedupes across every call site in one render pass"

requirements-completed: [PERF-12]

# Metrics
duration: 25min
completed: 2026-07-22
---

# Phase 27 Plan 01: Session cache dedupe + cookieCache Summary

**React `cache()`-wrapped session accessors (`getSession`/`getSessionFresh`) plus better-auth `session.cookieCache` (5-min TTL) collapse every protected-route layout+page double session lookup into one, while `/account` and its two mutation server actions bypass the cache via `disableCookieCache` so revocation always takes effect immediately.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-22T11:27:03Z
- **Tasks:** 3 completed
- **Files modified:** 10 (1 requirements doc, 2 new files, 7 source files)

## Accomplishments
- Minted PERF-12..PERF-23 (twelve new requirements) into REQUIREMENTS.md with matching traceability rows
- Created `src/lib/auth-session.ts` exporting `getSession()`/`getSessionFresh()`, both zero-arg `cache()`-wrapped
- Added `session.cookieCache: { enabled: true, maxAge: 300 }` to `src/lib/auth.ts` (explicit — this project's `drizzleAdapter` database config means better-auth's DB-less auto-default never fires)
- Swapped 5 non-consolidation RSC call sites (layout, study, habitat, welcome, new-card) to `getSession()`
- Swapped the 3 D-04 revocation-sensitive call sites (account page, `requestEmailChange`, `deleteAccount`) to `getSessionFresh()`
- Left `dashboard/page.tsx` and `deck/browse/page.tsx` untouched — owned by plans 27-04/27-03's consolidation work

## Task Commits

1. **Task 1: Mint PERF-12..PERF-23 into REQUIREMENTS.md** - `c8da48c` (docs)
2. **Task 2: Create auth-session.ts + cookieCache config + dedupe test** - `738f961` (feat)
3. **Task 3: Swap non-consolidation RSC call sites to the cached accessor** - `cc92edf` (refactor)

**Follow-up fix:** `425a59f` (fix — biome import-order in auth-session.ts, Rule 1)

_Note: no plan-metadata commit issued yet — this SUMMARY commit is the final metadata commit for this plan._

## Files Created/Modified
- `.planning/REQUIREMENTS.md` - Minted PERF-12..PERF-23 (bullets + traceability rows)
- `src/lib/auth-session.ts` - NEW: `getSession()`/`getSessionFresh()`, zero-arg `cache()`-wrapped session accessors
- `src/lib/__tests__/auth-session.test.ts` - NEW: dedupe call-count assertion + disableCookieCache presence/absence assertions
- `src/lib/auth.ts` - Added `session.cookieCache` config block (5-min TTL, default "compact" strategy)
- `src/app/(protected)/layout.tsx` - Swapped to `getSession()`, removed now-dead `auth`/`headers` imports
- `src/app/(protected)/study/page.tsx` - Swapped to `getSession()`, removed now-dead `auth`/`headers` imports
- `src/app/(protected)/habitat/page.tsx` - Swapped to `getSession()`, removed now-dead `auth`/`headers` imports
- `src/app/(auth)/welcome/page.tsx` - Swapped to `getSession()`, removed now-dead `auth`/`headers` imports
- `src/app/(protected)/deck/new-card/page.tsx` - Swapped to `getSession()`, removed now-dead `auth`/`headers` imports
- `src/app/(protected)/account/page.tsx` - Swapped to `getSessionFresh()` (D-04), removed now-dead `auth`/`headers` imports
- `src/lib/account-actions.ts` - `requestEmailChange` and `deleteAccount` swapped to `getSessionFresh()` (D-04); `auth`/`headers` imports kept (still used by `deleteAccount`'s `signOut` call)

## Decisions Made
- Mocked `react`'s `cache()` export in the test file with a real memoize-by-zero-args implementation. Verified directly against installed source (`node_modules/react/cjs/react.development.js` and `react.react-server.development.js`): the client build's `cache()` is `function(fn) { return function() { return fn.apply(null, arguments) } }` (pure passthrough, no memoization, ever), and the react-server build's `cache()` checks `ReactSharedInternals.A` (the current dispatcher) and falls back to calling `fn` directly when no dispatcher is registered. A bare vitest/node test never has an active Next.js RSC request dispatcher, so calling the REAL `cache()`-wrapped function would call the underlying `auth.api.getSession` mock twice no matter what, making a genuine `toHaveBeenCalledTimes(1)` dedupe assertion impossible against the unmocked primitive. The mock supplies a real, isolated-per-`cache()`-call memoization so the test proves auth-session.ts's own contract (call it once, share the result) — this was anticipated by the plan itself ("invoke via React cache's test-friendly path... if cache state leaks").
- Kept `headers`/`auth` imports in `account-actions.ts` rather than removing them — `deleteAccount` still calls `await headers()` (stored in `hdrs`) and `auth.api.signOut({ headers: hdrs })` after account deletion, both unrelated to the session-fetch swap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sorted imports in auth-session.ts per biome's organizeImports rule**
- **Found during:** Task 2, post-commit biome scoped check
- **Issue:** `import { cache } from "react"` was ordered before `import { headers } from "next/headers"`, violating this project's biome import-sort convention
- **Fix:** Reordered to `next/headers` before `react`, matching biome's expected sort
- **Files modified:** src/lib/auth-session.ts
- **Verification:** `npx biome check src/lib/auth-session.ts` clean; `npx tsc --noEmit` clean; `npx vitest run src/lib/__tests__/auth-session.test.ts` still 3/3 passing
- **Committed in:** 425a59f

---

**Total deviations:** 1 auto-fixed (1 bug/lint)
**Impact on plan:** Cosmetic import-order fix only, no behavior change. No scope creep.

## Issues Encountered
- React's `cache()` is a pass-through/no-op outside an active Next.js RSC request context in both installed builds (client and react-server) — a genuine per-request dedupe assertion is not directly observable in bare vitest. Resolved via a controlled mock of `react`'s `cache()` export (see Decisions Made above); this is the same limitation the plan itself flagged ("Because React cache() scopes per-request, invoke via React cache's test-friendly path or reset module state between tests").

## Next Phase Readiness
- The `getSession()`/`getSessionFresh()` accessor contract from `src/lib/auth-session.ts` is now live and ready for plans 27-03 (browse) and 27-04 (dashboard consolidation) to import alongside their own query-consolidation work
- Full `npx tsc --noEmit` clean; full `npx vitest run` green (2209 passed, 6 skipped — up from the prior 2206/6 baseline, +3 new auth-session tests)
- Manual/prod-build verification that a protected-route navigation now issues one session-table round trip (not two) is deferred to the phase-end full verification pass per the plan's own `<verification>` section (D-10 precedent)

## Self-Check: PASSED

All created files and all task/summary commit hashes verified present via `git log --oneline --all` and direct file existence checks:
- FOUND: src/lib/auth-session.ts
- FOUND: src/lib/__tests__/auth-session.test.ts
- FOUND: .planning/phases/27-performance-batch-2/27-01-SUMMARY.md
- FOUND: c8da48c, 738f961, cc92edf, 425a59f, 491d473
