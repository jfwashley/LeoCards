---
phase: 15-core-journey-qa-harness
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/lib/debug-cheat.ts
  - src/app/api/debug/time-shift/route.ts
  - src/app/api/study/complete/route.ts
  - src/app/api/habitat/route.ts
  - src/app/api/debug/state/route.ts
  - src/app/api/debug/__tests__/time-shift.test.ts
  - scripts/qa-lib.mjs
  - scripts/qa-run.mjs
  - scripts/qa-01-learn-card.mjs
  - scripts/qa-02-mastery.mjs
  - scripts/qa-03-resume.mjs
  - scripts/qa-04-habitat.mjs
  - scripts/qa-05-decay.mjs
  - e2e/14-qa-parity.spec.ts
  - package.json
  - .gitignore
  - src/app/api/debug/__tests__/state.test.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues
---

# Phase 15: Code Review Report

**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 15 adds a QA-gated HMAC-SHA256 signed time-shift affordance (`POST /api/debug/time-shift` + `readQaTimeOffset`), threads it into three pipeline callsites, and delivers five journey scripts exercising the full SRS/habitat pipeline. The security model is well-conceived: gate order is correct (404 before auth when secret is unset), constant-time comparison is used throughout, the cookie is signed, and production absence is e2e-proven.

One critical finding stands out: the `verifyTimeOffset` schema permits negative `offsetMs` values. The route's Zod `min(0)` guard prevents negative offsets from being signed via the normal code path, but a signed cookie containing a negative offset would pass `verifyTimeOffset`'s less-restrictive schema and then cause `new Date(Date.now() + offset)` to compute a date in the past — meaning any server-issued cookie, if its payload were ever mutated (or if the route had a future regression relaxing the min bound), would silently shift `now` backwards. The fix is a one-line tightening of `verifyTimeOffset`'s schema to match the route's constraint. Three Warnings cover a QA-harness logic issue in qa-03 (the `nowForComparison` ternary evaluates to `new Date()` in both branches, making it dead code), a missing module-level `_timeShiftCookie` clear on `qa-run` re-entry risk, and an unchecked `setTimeShift` return value in qa-05's finally path.

---

## Critical Issues

### CR-01: `verifyTimeOffset` schema permits negative offsets — `new Date(Date.now() + offset)` can silently go backwards

**File:** `src/lib/debug-cheat.ts:274`

**Issue:** The Zod schema in `verifyTimeOffset` is `z.object({ offsetMs: z.number() })` — no `min(0)` constraint. By contrast, the route's body schema at `src/app/api/debug/time-shift/route.ts:35` applies `.int().min(0).max(30*24*60*60*1000)` before signing. If a signed cookie were somehow produced containing a negative `offsetMs` (e.g., via a future route regression, a direct call to `signTimeOffset(-86400000)` from a test helper, or a researcher crafting the cookie against a leaked secret), `verifyTimeOffset` would return the negative number, and all three callsites would compute `new Date(Date.now() + offset)` as a past date. This would cause the SRS engine and habitat engine to see a `now` in the past, silently corrupting cooldown computation, decay calculation, and level-up detection for the authenticated user's data — with no error surfaced to the caller.

The threat model registers T-15-03 as "mitigated" via the route's Zod validation, but that mitigation only covers the signing path. The *verification* path — which is the trust boundary that actually matters, since it reads an untrusted cookie value — has no equivalent bound. A defence-in-depth principle requires the validator to reject values that would never be legitimately issued.

**Fix:** Tighten the schema in `verifyTimeOffset` to mirror the route's constraint exactly:

```typescript
// src/lib/debug-cheat.ts line 274 — replace:
const parsed = z.object({ offsetMs: z.number() }).safeParse(json);

// with:
const parsed = z
  .object({ offsetMs: z.number().int().min(0).max(30 * 24 * 60 * 60 * 1000) })
  .safeParse(json);
```

This makes the validator fail-closed on any out-of-range cookie value regardless of how it was produced, and aligns the verify path with the sign path as intended by the threat model.

---

## Warnings

### WR-01: `nowForComparison` ternary is dead code — time-shift-aware comparison never fires (qa-03 Phase B)

**File:** `scripts/qa-03-resume.mjs:285-292`

**Issue:** The comment at line 285 says "with time-shift, use the shifted time", but the code evaluates identically in both branches:

```javascript
const nowForComparison = shifted
  ? new Date()   // branch A — real wall-clock now
  : new Date();  // branch B — also real wall-clock now
```

Both branches return the current wall-clock `new Date()`. The comment acknowledges the intent was to use `Date.now() + minShiftMs`, but the variable `minShiftMs` is out of scope at this point (it was `await`-ed inside the `if (fastPath)` block above and not captured). As a result, when the time-shift fast path is used and the graded card's `cooldownUntil` is a value in the *real* future (e.g. 1 minute from now, which is ~60s from Phase B's start), the comparison `cooldownUntilDate <= nowForComparison` will evaluate as `false` (the date is still in the real future), causing the assertion at line 334 to throw even though the card's cooldown is expired in the *virtual* future.

This is a correctness defect in the journey script that will cause QAJ-03 to produce a false FAIL when the fast-path shift does not happen to clear a cooldown that is already expired at real wall-clock time (e.g. if Phase B runs more than 1 minute after Phase A — normal in the orchestrator's sequential run).

**Why it doesn't always manifest:** The orchestrator runs Phase A and Phase B back-to-back. In the fast path, `setTimeShift(+minShiftMs)` with `minShiftMs >= 90_000ms` shifts the server's virtual clock by at least 90 seconds past the 1-minute cooldown. The server returns `cooldownUntil` as the ISO value it stored — but once the shift is applied server-side, the *server*'s readState computation returns the card as due (it sees virtual now > cooldownUntil). The `cooldownUntil` field in the response is the stored ISO timestamp, not updated. So the client-side comparison `cooldownUntilDate <= nowForComparison` is comparing the stored `cooldownUntil` (~1 min from Phase A start) against the real wall-clock `new Date()` (seconds after Phase A). This comparison fails unless enough real time has elapsed. In a rapid orchestrated run, it will consistently fail.

**Fix:** Capture `minShiftMs` in the outer scope so it can be used for the comparison, or simply trust the server's authoritative response: if the server returned `cooldownUntil` as null or a past value (real clock), treat it as due; otherwise treat it as cooling. The simplest correct fix:

```javascript
// In Phase B, hoist minShiftMs out of the if (fastPath) block:
let minShiftMs = 0;
if (fastPath) {
  const now = Date.now();
  const resumeAfterMs = new Date(resumeAfter).getTime();
  minShiftMs = Math.max(resumeAfterMs - now + 1000, 90_000);
  await setTimeShift(BASE, freshToken, SECRET, minShiftMs);
  shifted = true;
  console.log(`[QAJ-03] fast-path: time-shift applied (+${minShiftMs}ms to jump past cooldown)`);
} else {
  // real-wait check ...
}

// Then compute the virtual now correctly:
const nowForComparison = shifted
  ? new Date(Date.now() + minShiftMs)
  : new Date();
```

---

### WR-02: Module-level `_timeShiftCookie` state persists across qa-run sequential invocations if a child process shares the module

**File:** `scripts/qa-lib.mjs:66`, `scripts/qa-run.mjs:169`

**Issue:** `qa-lib.mjs` holds `_timeShiftCookie` as module-level state. In the current orchestrator design, `qa-run.mjs` spawns each journey script as a separate child process via `spawnSync`, so each child gets its own module instance and there is no cross-journey state bleed. However, the module is documented as a shared library ("Usage: `import { provision, ... } from './qa-lib.mjs'`"), which invites future users to import multiple journeys into a single process. If that ever happens, a `setTimeShift` call in journey N that does not reach its `clearTimeShift` (due to a process signal or uncaught exception outside the finally block) will leave `_timeShiftCookie` polluted for all subsequent journeys in that process, causing them to silently forward a stale time-shift cookie to all HTTP calls including `readState`, `gradeSession`, and `readHabitat`.

Additionally, `qa-05-decay.mjs` uses a `try/finally` pattern that calls `clearTimeShift` only when `decayShifted || pauseShifted` is true. If `setTimeShift` itself throws (e.g., the server is down), `decayShifted` stays false and the module state `_timeShiftCookie` will have been partially mutated (the fetch was attempted but did not capture the cookie). This is fine for the current spawnSync design but becomes a latent issue if the library is ever used in-process.

**Fix:** Add a `resetTimeShiftState()` exported function that clears `_timeShiftCookie`, and call it at the top of each journey script's `run()` function as a defensive reset. This is a one-liner and eliminates the cross-invocation risk:

```javascript
// qa-lib.mjs — add:
export function resetTimeShiftState() {
  _timeShiftCookie = "";
}
```

This also helps the case where qa-lib is tested or used in integration contexts that import it directly.

---

### WR-03: `setTimeShift` return value is silently discarded in qa-05's PAUSE SEGMENT

**File:** `scripts/qa-05-decay.mjs:286`

**Issue:** At line 286, the PAUSE SEGMENT calls `await setTimeShift(BASE_URL, sessionToken, SECRET, FOUR_DAYS_MS)` without assigning or checking its return value. `setTimeShift` in `qa-lib.mjs` throws on a non-`ok` HTTP response, so a server-side failure will surface as a throw — but only if the HTTP status is not `2xx`. If the server returns `200 { ok: false }` (which the route currently never does but is a possible future state), the call silently succeeds without setting `_timeShiftCookie`, and all subsequent `readState` calls in the PAUSE SEGMENT will query without the time-shift cookie, meaning the habitat `isDecaying` and `quality` assertions will pass against real (unshifted) state rather than the simulated 4-day future. The test would appear to PASS while actually asserting the wrong state.

More concretely: the `setTimeShift` helper's success check is `if (!res.ok)` (line 337 of qa-lib.mjs), which catches HTTP error codes but not a body-level `{ ok: false }` response. And if `timeShiftVal` capture fails (line 347: `setCookies.join("; ").match(/leo-qa-time-offset=([^;]+)/)?.[1]` returning undefined) — which can happen if Next.js omits the Set-Cookie on a `secure` cookie over HTTP in development — `_timeShiftCookie` is silently left as `""`. The function returns without throwing, and all subsequent reads see the unshifted clock.

**Fix:** Check the return value of `setTimeShift` at line 286 and assert the expected `ok: true` shape, and add a defensive log/throw when `_timeShiftCookie` is empty after `setTimeShift` completes successfully:

```javascript
// qa-05-decay.mjs line 286 — replace:
await setTimeShift(BASE_URL, sessionToken, SECRET, FOUR_DAYS_MS);

// with:
const shiftResult = await setTimeShift(BASE_URL, sessionToken, SECRET, FOUR_DAYS_MS);
if (!shiftResult.ok) {
  throw new Error(`[QAJ-05] setTimeShift returned ok=false: ${JSON.stringify(shiftResult)}`);
}
```

And in `qa-lib.mjs setTimeShift`, add after line 350:
```javascript
if (!timeShiftVal) {
  // Cookie not captured — likely server not sending Set-Cookie over plain HTTP
  console.warn("[qa-lib] WARNING: leo-qa-time-offset cookie not received in Set-Cookie response. Requests may not forward the shift.");
}
```

---

## Info

### IN-01: `verifyTimeOffset` re-encodes base64url to standard base64 but `signTimeOffset` could skip the re-encoding step — minor inconsistency with existing functions

**File:** `src/lib/debug-cheat.ts:268-272`

**Issue:** The decode path in `verifyTimeOffset` manually converts base64url back to standard base64 (`payloadB64.replace(/-/g, "+").replace(/_/g, "/")`) before passing to `Buffer.from(..., "base64")`. Node's `Buffer.from` accepts base64url directly via the `"base64url"` encoding argument (Node 14+). All three `verify*` functions in this file use the manual replace approach, which is consistent within this module, but `Buffer.from(str, "base64url")` is cleaner. Not a bug; not worth a refactor now, but worth noting for future crypto helper maintenance.

**Fix:** Optional — no change required. If modernising: replace the replace+decode pair with `Buffer.from(payloadB64, "base64url")` in `verifyOverride`, `verifyQaMode`, and `verifyTimeOffset`.

---

### IN-02: qa-01/qa-02 redundant `DEBUG_CHEAT_SECRET` env guard — already enforced by `qa-lib.mjs` module-load guard

**File:** `scripts/qa-01-learn-card.mjs:40-44`, `scripts/qa-02-mastery.mjs:36-40` (and qa-03/04/05 similarly)

**Issue:** Every journey script checks `process.env.DEBUG_CHEAT_SECRET` and exits 1 if unset. However, importing `qa-lib.mjs` already causes a module-load guard that calls `process.exit(1)` when `DEBUG_CHEAT_SECRET` is missing (qa-lib.mjs lines 44-50). The journey-script check therefore never fires — by the time the journey script runs its own guard, `qa-lib.mjs` has already exited the process. The per-script guard is dead code. This is a minor documentation confuser (two guards, one of which never executes) but causes no incorrect behavior.

**Fix:** Remove the per-script `DEBUG_CHEAT_SECRET` guard; the module-level guard in qa-lib.mjs is sufficient and runs first. Alternatively, keep one script-level guard as documentation and note that it is pre-empted by the library import, but this is lower value. Not a regression risk either way.

---

## Verdict

The Phase 15 implementation is architecturally sound: the security model is correctly layered (404-before-auth, HMAC signing, constant-time comparison, cookie attributes), the three pipeline callsites are correctly threaded, and the journey scripts are well-structured. One defect warrants a fix before the harness can be relied upon in CI: the `verifyTimeOffset` schema does not enforce the same numeric bounds as the signing path (CR-01), which is a defence-in-depth gap at the trust boundary that reads attacker-influenceable cookie values. WR-01 is the most practically impactful issue: the `nowForComparison` dead-code in qa-03 Phase B means the time-shift fast-path cooldown assertion will produce false FAILs in normal orchestrated runs where Phase B begins within 60 seconds of Phase A. Fix CR-01 and WR-01 before running this harness as a CI gate.

---

_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
