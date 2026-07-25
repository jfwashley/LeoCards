---
phase: 18-field-validation-guardrails
reviewed: 2026-07-25T13:27:59Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - scripts/perf-recert.mjs
  - scripts/measure-cwv-lib.mjs
  - scripts/__tests__/measure-cwv-lib.test.ts
  - src/app/layout.tsx
  - package.json
  - AGENTS.md
findings:
  critical: 1
  warning: 5
  info: 7
  total: 13
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-07-25T13:27:59Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the Phase 18 field-validation-guardrails changes: the new `perf-recert.mjs` orchestrator, the new gate-evaluation functions (`evaluateGates`/`deriveExceptionGate`) in `measure-cwv-lib.mjs` plus their vitest coverage, the SpeedInsights mount in the root layout, the `perf:recert` npm script, and the AGENTS.md cadence section. Cross-file contracts were verified against `scripts/measure-cwv.mjs` (artifact naming `${slug}-{preset}-runs.json`, `medians` key, `PHASE_OUT_DIR` handling), `.planning/phases/18-field-validation-guardrails/18-baseline-thresholds.json` (shape matches `resolveThresholds`), `e2e/13-perf.spec.ts` (the `instant-nav` grep matches the describe title; `PERF_PROD_BUILD` skip guard confirmed), `e2e/perf-markers.ts`, and `playwright.config.ts` (`webServer: undefined`, `baseURL` localhost:3000).

The overall architecture is sound — compose-via-spawn, atomic writes, report-on-failure, and env-override validation are all correctly implemented. However, the review found one Critical gap: the nav-gate half trusts that whatever answers on port 3000 is the prod server it just started, so a pre-existing server (dev server or a stale leaked prod server) is silently certified instead. Several Warnings cluster around a single theme: the script rigorously guards against malformed `GATE_*` env vars (T-18-03b) but leaves the same silently-disables-the-gate failure class open through other inputs (baseline JSON shape, empty route set, CLS-scale rounding, zero-CLS baselines).

`src/app/layout.tsx`, `package.json`, and `AGENTS.md` are clean — the SpeedInsights mount follows the documented Next.js App Router pattern, the dependency is in the correct (runtime) section, and the AGENTS.md section accurately mirrors the script's behaviour.

## Critical Issues

### CR-01: Nav-gate half can certify against the wrong server — no port-3000 preflight, server-spawn failures silently swallowed

**File:** `scripts/perf-recert.mjs:341-352, 409-427`
**Issue:** The nav-gate half spawns `npm run start` with `stdio: "ignore"` and no `exit`/`error` listener, then declares the server "up" as soon as *anything* responds at `http://localhost:3000` (`waitForServer` returns true on any response, from any server). If port 3000 is already occupied when the run starts:

1. **Stale leaked prod server** (from a previous run whose kill failed, or a manual `npm run start`): `next start` fails with "port in use", the failure is invisible (`stdio: "ignore"`), `waitForServer` immediately succeeds against the *old build*, and the gate produces a **false PASS certifying code that was never measured**. The freshly built `.next` output is never served.
2. **Running dev server** (an everyday state in this repo — AGENTS.md's own e2e section assumes dev servers on 3000): the gate runs against `next dev` with `PERF_PROD_BUILD=1` asserted, producing a false FAIL — directly violating the phase's core design principle ("red must mean a real regression, never noise", 18-CONTEXT.md D-09/line 105).

`e2e/perf-markers.ts` confirms `PERF_PROD_BUILD=1` is trusted blindly ("must be set … by whatever wrapper script runs `next build && next start`") — the wrapper is the sole party responsible for that guarantee, and this wrapper does not enforce it.

**Fix:**
```js
// Before spawning the server: fail loud if ANYTHING already answers on :3000.
let alreadyUp = false;
try {
  await fetch(NAV_GATE_SERVER_URL);
  alreadyUp = true;
} catch {
  /* port free — expected */
}
if (alreadyUp) {
  return {
    status: "FAIL",
    detail:
      `something is already serving ${NAV_GATE_SERVER_URL} — stop it first ` +
      "(a stale server here would be certified in place of the fresh build)",
  };
}

// After spawning: detect early child death instead of polling a dead server.
let serverExited = false;
serverChild.on("exit", () => {
  serverExited = true;
});
// ...and inside waitForServer's loop (or before returning up=true), check
// serverExited and fail loud if the child died before responding.
```

## Warnings

### WR-01: Baseline-thresholds shape is never validated — a missing/typo'd gate key or bad `driftPct` silently disables that gate

**File:** `scripts/perf-recert.mjs:531-540` (and `scripts/measure-cwv-lib.mjs:310-321`)
**Issue:** The script's entire T-18-03b rationale (lines 96-101) is that a NaN threshold makes `median > NaN` always false, *silently disabling* the gate — and it guards that class rigorously for `GATE_*` env vars. But the same failure class is wide open through `18-baseline-thresholds.json`: if a route's `gates` block loses or renames a key (e.g. `"perf"` instead of `"score"`), `resolveThresholds` passes `undefined` through, and in `evaluateGates` `medians.score < undefined` is `false` — that gate is silently disabled with a green run. Likewise a non-numeric `"driftPct"` yields `driftPct / 100 === NaN` and `> NaN` is always false, silently disabling every drift warning. The committed baseline is currently well-formed, so this is latent — but the file is the single mutable input the whole gate hangs off.
**Fix:** After the overlay in the step-2 validation loop, assert every resolved threshold is finite, and validate `driftPct`:
```js
for (const [route, cfg] of Object.entries(baseline.routes)) {
  const t = resolveThresholds({ ...cfg.gates, ...cfg.exceptions });
  for (const key of ["lcp", "tbt", "cls", "score"]) {
    if (!Number.isFinite(t[key])) {
      throw new Error(
        `baseline thresholds for ${route} missing/non-finite "${key}" — ` +
          "a non-finite threshold silently disables the gate (T-18-03b class)",
      );
    }
  }
}
if (!Number.isFinite(driftPct)) throw new Error("driftPct is not finite");
```

### WR-02: Empty `routes` object produces a vacuous overall PASS with zero routes evaluated

**File:** `scripts/perf-recert.mjs:537, 562`
**Issue:** If `baseline.routes` is `{}` (or every entry is removed in a bad edit), the validation loop is a no-op, `runCwvHalf` returns zero rows, `anyCwvHardFail` is `false`, and — provided the spawn and nav gate succeed — the run reports overall **PASSED** with an *empty* CWV table. The header comment (line 100-101) explicitly claims to mirror measure-cwv.mjs's `ROUTES.length === 0` fail-loud guard, but no such guard exists here. (`routes` missing entirely does throw via `Object.entries(undefined)` — only the empty-object case slips through.)
**Fix:**
```js
if (Object.keys(baseline.routes).length === 0) {
  throw new Error(
    "baseline.routes is empty — refusing to report a vacuous PASS " +
      "(mirrors measure-cwv.mjs's ROUTES.length === 0 guard)",
  );
}
```

### WR-03: Minute-granularity `runId` lets a same-minute rerun overwrite the previous run's report — violating the D-07 "never overwritten" evidence-trail invariant

**File:** `scripts/perf-recert.mjs:197-205, 544-552, 586-594`
**Issue:** `formatRunId` resolves to the minute (`recert-YYYY-MM-DD-HHmm`). A run that fails fast (e.g. `npm run build` failure, baseline parse error) followed by an immediate retry within the same minute produces the *same* runId: `writeTextAtomic`/`writeJsonAtomic` `rename` over the existing `${runId}.md`/`${runId}.json`, destroying the FAILED report that D-07 and AGENTS.md line 29 declare "part of the evidence trail, never re-edited". The shared `measurements/${runId}/cwv` directory additionally means a retry whose measure-cwv fails early can read back *stale artifacts from the first run* and evaluate them as fresh.
**Fix:** Include seconds in the runId (`-${hh}${mm}${ss}`), and/or fail loud if `${runId}.md` already exists before writing.

### WR-04: `deriveExceptionGate` rounds to an integer, producing a broken (0 or near-0) gate for CLS-scale metrics

**File:** `scripts/measure-cwv-lib.mjs:355`
**Issue:** `Math.round(median * (1 + headroomPct / 100))` is correct for millisecond metrics but silently destroys sub-1 metrics: CLS is one of the four gated metrics and the function is documented as metric-generic ("the route's fresh baseline median *for this metric*"). `deriveExceptionGate(0.08)` returns `0` — an exception gate that is *impossible to pass* (any CLS > 0 hard-fails), the inverse of D-11's "green on day one" contract. `deriveExceptionGate(0.6)` returns `1`, a gate 10x looser than the 0.1 absolute gate. Nothing in code, JSDoc, or tests restricts the function to ms metrics.
**Fix:** Round to a metric-appropriate precision, e.g.:
```js
const raw = median * (1 + headroomPct / 100);
return raw >= 1 ? Math.round(raw) : Math.round(raw * 1000) / 1000;
```
(or document + throw for sub-1 inputs if CLS exceptions are intentionally unsupported).

### WR-05: CLS drift warnings are dead on arrival — the `before > 0` guard plus all-zero committed CLS baselines means a CLS regression can never warn

**File:** `scripts/measure-cwv-lib.mjs:327` (with `18-baseline-thresholds.json`)
**Issue:** The drift loop skips any metric whose baseline is `0` (`before > 0` guard — a reasonable div-by-zero defence in isolation). But every committed route baseline has `cls: 0`, so the CLS drift warning can *never* fire: a regression from 0 to 0.09 stays under the 0.1 absolute gate and produces neither a failure nor a warning — silent. D-09 requires "each metric's delta vs the locked Phase 18 baseline; deltas >~15% worse surface as a loud WARNING". As shipped, the entire CLS drift channel is dead in practice from day one.
**Fix:** Special-case a zero baseline:
```js
if (before === 0 && after > 0) {
  warnings.push(`${key.toUpperCase()} drifted from 0 to ${after} vs baseline`);
} else if (before > 0 && (after - before) / before > driftPct / 100) { ... }
```

## Info

### IN-01: `killProcessTree` POSIX branch only signals the shell/npm wrapper

**File:** `scripts/perf-recert.mjs:362-375, 412-416`
**Issue:** The server is spawned with `shell: true`, so on POSIX `child.pid` is the shell's pid; `child.kill("SIGTERM")` signals the shell, and the actual `next start` process can survive — the exact leak the function's own comment describes for Windows. Windows (the current dev platform) is handled correctly via `taskkill /t`.
**Fix:** Spawn with `detached: true` on POSIX and kill the process group (`process.kill(-child.pid, "SIGTERM")`).

### IN-02: `waitForServer` fetch has no per-attempt timeout

**File:** `scripts/perf-recert.mjs:341-352`
**Issue:** A socket that accepts the connection but stalls lets a single `fetch` hang far beyond the 90s deadline (Node's default fetch timeouts are minutes) — the deadline is only checked between attempts.
**Fix:** Pass `AbortSignal.timeout(2000)` (or similar) to each `fetch` attempt.

### IN-03: `ROUTE_FILTER` is forwarded unmodified to the spawned measure-cwv.mjs

**File:** `scripts/perf-recert.mjs:234-237`
**Issue:** `env: { ...process.env, PHASE_OUT_DIR: ... }` forwards a leftover `ROUTE_FILTER` from the operator's shell, silently narrowing the measurement to a subset of routes; the non-measured routes then FAIL with a misattributed "measurement artifact missing" message. Fail-loud outcome, but the diagnosis points at the wrong cause.
**Fix:** Delete `ROUTE_FILTER` from the child env (the re-cert must always cover all baseline routes), or fail loud if it is set.

### IN-04: Report claims "measure-cwv.mjs exit: non-zero" when the CWV half never ran; a malformed `GATE_*` abort skips the report entirely

**File:** `scripts/perf-recert.mjs:524, 492, 122`
**Issue:** (a) `cwvSpawnOk` initialises to `false`, so an abort before the spawn (e.g. missing baseline file) writes a report stating "measure-cwv.mjs exit: non-zero (see above)" though it never executed. (b) `resolveOverride` calls `process.exit(1)` from *inside* the try block — `process.exit` bypasses `finally`, so a malformed `GATE_*` run writes no report at all, an inconsistency with the D-07 "even a FAILED run writes its report" convention (arguably acceptable pre-measurement, but throwing instead would reach the catch/finally and stay consistent).
**Fix:** Use a tri-state (`"not run" | "clean" | "non-zero"`) for the spawn status line; have `resolveOverride` throw rather than `process.exit`.

### IN-05: Drift check covers lcp/tbt/cls only, not "each metric" as D-09 words it

**File:** `scripts/measure-cwv-lib.mjs:324`
**Issue:** D-09 says "report each metric's delta vs the locked Phase 18 baseline"; `score` (and fcp/ttfb) are excluded from the drift loop. Low practical impact today — a >15%-worse score from the ~99 baselines would already breach the ≥90 absolute gate — but the deviation from the documented decision is undocumented in code.
**Fix:** Either add score (inverted direction: `(before - after) / before`) or note the intentional exclusion in the JSDoc.

### IN-06: The Playwright invocation runs the instant-nav gate under both projects with a retry

**File:** `scripts/perf-recert.mjs:432-441` (with `playwright.config.ts:13, 21-32`)
**Issue:** No `--project` filter, so the `instant-nav` describe runs under both `web` and `mobile` projects — roughly doubling the nav-half runtime versus the D-06 "~35-40 min serial budget" comment. `retries: 1` also applies, so a timing gate that fails once and passes on retry goes green. If both-project coverage is intended, document it; otherwise pass `--project=web` and consider `--retries=0` for the gate run.
**Fix:** `["playwright", "test", "e2e/13-perf.spec.ts", "--grep", "instant-nav", "--project=web"]` (or document the double-run as intended coverage).

### IN-07: Test coverage gaps in the new gate-evaluation suites

**File:** `scripts/__tests__/measure-cwv-lib.test.ts:330-428`
**Issue:** The `evaluateGates`/`deriveExceptionGate` suites are solid but miss: exactly-at-threshold boundaries (gates use strict `>`/`<` — a median exactly at the gate passes, untested), drift exactly at `driftPct` (strict `>` — no warning, untested), a multi-metric simultaneous-failure case, and any CLS-scale `deriveExceptionGate` input (which would have caught WR-04), plus a zero-baseline drift case (which would have caught WR-05).
**Fix:** Add boundary cases (`lcp === thresholds.lcp` passes; drift exactly +15% does not warn), a two-failure case asserting both messages, `deriveExceptionGate(0.08)`, and a `baseline.cls === 0` regression case.

---

_Reviewed: 2026-07-25T13:27:59Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
