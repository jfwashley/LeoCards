---
phase: 07-backend-security-and-quality-fixes
plan: "03"
subsystem: security
tags:
  - rate-limiting
  - email
  - logging
  - documentation
dependency_graph:
  requires:
    - 07-02
  provides:
    - SEC-08
    - SEC-09
    - SEC-10
  affects:
    - src/lib/auth.ts
    - src/lib/rate-limit.ts
    - src/app/api/translate/route.ts
    - src/app/api/study/complete/route.ts
    - src/db/index.ts
tech_stack:
  added: []
  patterns:
    - In-memory sliding-window rate limiter (single-server)
    - .catch() error logging without await (timing-safe)
key_files:
  created:
    - src/lib/rate-limit.ts
  modified:
    - src/lib/auth.ts
    - src/db/index.ts
    - src/app/api/translate/route.ts
    - src/app/api/study/complete/route.ts
decisions:
  - Email failure logging uses .catch() not try/catch — preserves no-await timing-attack protection
  - Rate limiter is in-memory (not Redis) — appropriate for single-server v1
  - Cleanup interval 5 min prevents unbounded Map growth without per-request overhead
metrics:
  duration: "5min"
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_changed: 5
---

# Phase 7 Plan 3: Defense-in-Depth Hardening Summary

Defense-in-depth hardening: email error logging via `.catch()`, in-memory sliding-window rate limiting on `/api/translate` (30/min) and `/api/study/complete` (10/min), and Neon HTTP driver documentation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Log email failures and document DB driver | cc49270 | src/lib/auth.ts, src/db/index.ts |
| 2 | Add rate limiting to translate and study/complete routes | ce4641d | src/lib/rate-limit.ts, src/app/api/translate/route.ts, src/app/api/study/complete/route.ts |

## What Was Built

### Task 1: Email Failure Logging (SEC-08)

`src/lib/auth.ts` — replaced `void resend.emails.send()` with `.catch()` that logs to `console.error`. The function still returns immediately without awaiting (preserving timing-attack protection), but failures are now visible in server logs.

`src/db/index.ts` — added a multi-line documentation comment explaining why the Neon HTTP driver requires no pool configuration (stateless HTTP queries, one-shot HTTPS per request, ideal for serverless/edge).

### Task 2: API Rate Limiting (SEC-09)

`src/lib/rate-limit.ts` — new utility implementing an in-memory sliding-window rate limiter. Each `createRateLimiter` instance maintains a `Map<userId, timestamps[]>`. Periodic cleanup every 5 minutes prevents memory leaks. Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.

`src/app/api/translate/route.ts` — module-scoped `translateLimiter` (30 req/min per user). After auth check, calls `translateLimiter.check(session.user.id)` and returns 429 with `Retry-After` header if exceeded.

`src/app/api/study/complete/route.ts` — module-scoped `studyCompleteLimiter` (10 req/min per user). Same pattern as translate route.

## Verification

- `npx tsc --noEmit` — passed with no errors
- `npx next build` — completed successfully, all routes compiled
- auth.ts has `.catch(console.error)` instead of `void`
- rate-limit.ts exports `createRateLimiter`
- translate/route.ts creates limiter and checks before processing
- study/complete/route.ts creates limiter and checks before processing
- db/index.ts has multi-line comment explaining Neon HTTP driver

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality is fully wired.

## Self-Check: PASSED
