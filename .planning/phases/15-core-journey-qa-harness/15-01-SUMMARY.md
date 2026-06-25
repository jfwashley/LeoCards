---
phase: 15-core-journey-qa-harness
plan: "01"
subsystem: qa-harness
tags: [qa, time-shift, signed-cookie, srs, habitat, security]
dependency_graph:
  requires: []
  provides: [readQaTimeOffset, POST /api/debug/time-shift, TIME_SHIFT_COOKIE]
  affects: [study/complete, habitat, debug/state, e2e/14-qa-parity]
tech_stack:
  added: []
  patterns: [HMAC-SHA256 signed cookie, QA-gated endpoint (cheatEnabled before auth)]
key_files:
  created:
    - src/app/api/debug/time-shift/route.ts
    - src/app/api/debug/__tests__/time-shift.test.ts
  modified:
    - src/lib/debug-cheat.ts
    - src/app/api/study/complete/route.ts
    - src/app/api/habitat/route.ts
    - src/app/api/debug/state/route.ts
    - e2e/14-qa-parity.spec.ts
    - src/app/api/debug/__tests__/state.test.ts
decisions:
  - "time-shift is harness-only; does NOT refresh QA_MODE_COOKIE (visual badge concept unrelated)"
  - "offsetMs capped to 30 days by zod (.max(30*24*60*60*1000)) to prevent overflow/tampering (T-15-03)"
  - "readQaTimeOffset() returns 0 when cheatEnabled() false — zero offset leaves new Date() unchanged in production"
  - "state.test.ts needed readQaTimeOffset mock added (Rule 1 auto-fix)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-25"
  tasks_completed: 3
  files_changed: 8
---

# Phase 15 Plan 01: QA Time-Shift Affordance Summary

QA-gated HMAC-SHA256 signed cookie endpoint and three pipeline read-points that allow instant multi-hour/multi-day SRS/habitat simulation without real wall-clock waits.

## What Was Built

### New exports in `src/lib/debug-cheat.ts` (lines 41, 234, 250, 288)

| Export | Line | Description |
|--------|------|-------------|
| `TIME_SHIFT_COOKIE` | 41 | Cookie name `"leo-qa-time-offset"` |
| `signTimeOffset(offsetMs: number): string` | 234 | HMAC-SHA256 signs `{ offsetMs }` payload; throws if secret unset |
| `verifyTimeOffset(raw): number \| null` | 250 | Constant-time verify + zod schema check; returns number or null |
| `readQaTimeOffset(): Promise<number>` | 288 | Reads + verifies cookie; returns 0 when `cheatEnabled()` false |

### New route `src/app/api/debug/time-shift/route.ts`

**Gate order** (mirrors `cheat/route.ts` exactly): `cheatEnabled()→404 (before auth)` → `auth.api.getSession→401` → `rate-limit→429` → `body parse (zod)→400` → `checkSecret→403` → set/delete cookie.

**Response shapes:**
- `POST { secret, offsetMs }` → `200 { ok: true }`
- `POST { secret, clear: true }` → `200 { ok: true, cleared: true }`
- Feature disabled → `404 { error: "Not found" }` (fires before auth — D-05)
- No session → `401 { error: "Unauthorized" }`
- Wrong secret → `403 { error: "Forbidden" }`
- Bad body → `400 { error: "Invalid input" }`

Cookie attributes: `httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 604800`.

### Vitest tests `src/app/api/debug/__tests__/time-shift.test.ts`

11 tests across 5 describe blocks covering all gate-order behaviors. Key assertions:
- `mockGetSession` NOT called when `cheatEnabled()` is false (D-05 proof)
- `signTimeOffset` called with the exact `offsetMs` on happy path

### Threaded callsites (final line numbers after imports added)

| File | Line | Pattern |
|------|------|---------|
| `src/app/api/study/complete/route.ts` | 173 | `const offset = await readQaTimeOffset(); const now = new Date(Date.now() + offset);` |
| `src/app/api/habitat/route.ts` | 39 | `const offset = await readQaTimeOffset();` → `new Date(Date.now() + offset)` into `computeHabitatState` |
| `src/app/api/debug/state/route.ts` | 65 | `const offset = await readQaTimeOffset();` → `new Date(Date.now() + offset)` into `computeHabitatState` |

### Extended e2e assertion `e2e/14-qa-parity.spec.ts` (lines 91-95)

Inside the existing `if (featureDisabled) { … }` block, after the `cheatRes` check:
```ts
const timeShiftRes = await page.request.post("/api/debug/time-shift", {
  data: { secret: "anything", offsetMs: 86400000 },
});
expect(timeShiftRes.status()).toBe(404);
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] state.test.ts mock missing readQaTimeOffset**
- **Found during:** Wave gate (full Vitest run)
- **Issue:** `src/app/api/debug/__tests__/state.test.ts` mocked `@/lib/debug-cheat` but did not include `readQaTimeOffset`. After Task 3 threaded the callsite into `debug/state/route.ts`, 6 tests in `state.test.ts` threw "No readQaTimeOffset export is defined on the @/lib/debug-cheat mock."
- **Fix:** Added `readQaTimeOffset: vi.fn().mockResolvedValue(0)` to the `vi.mock("@/lib/debug-cheat")` factory in `state.test.ts`. Zero offset preserves real-time behavior in unit tests.
- **Files modified:** `src/app/api/debug/__tests__/state.test.ts`
- **Commit:** 16942fb

## Wave Gate Results

- **Scoped biome** (all 7 touched files): PASSED (no errors)
- **Full `tsc --noEmit`**: PASSED (exit 0)
- **Full `npx vitest run`**: PASSED — 2090 tests pass, 6 skipped, 0 failed
  - 3 timeout flakes (`signup-payload`, `card-edit-dialog`, `deck-switcher`) appeared under parallel load but passed when rerun in isolation; confirmed pre-existing, unrelated to this plan
- **e2e**: Orchestrator-owned — `e2e/14-qa-parity.spec.ts` modified with new assertion; live Playwright run deferred to execute-phase

## Threat Surface

No new untrusted network surfaces introduced beyond what was already in the threat model. All five threats (T-15-01 through T-15-05) mitigated as planned:
- T-15-01: HMAC-SHA256 with `timingSafeEqual` in `verifyTimeOffset`
- T-15-02: `readQaTimeOffset()` returns 0 when `cheatEnabled()` is false
- T-15-03: `z.number().int().min(0).max(30*24*60*60*1000)` on `offsetMs`
- T-15-04: Route returns only `{ok:true}` / `{ok:true,cleared:true}`, no echo
- T-15-05: `auth.api.getSession` required before any cookie write

## Known Stubs

None. All functionality is fully wired: the cookie is signed/verified, the three callsites read it, and the e2e assertion is in place.

## Self-Check: PASSED

All created files confirmed on disk:
- `src/app/api/debug/time-shift/route.ts` — FOUND
- `src/app/api/debug/__tests__/time-shift.test.ts` — FOUND
- `src/lib/debug-cheat.ts` — FOUND

All task commits verified in git log:
- `14552d5` (Task 1: debug-cheat helpers) — FOUND
- `a94acfa` (Task 2: time-shift route + tests) — FOUND
- `251f89f` (Task 3: thread callsites + e2e) — FOUND
- `16942fb` (Rule 1 fix: state.test.ts mock) — FOUND
