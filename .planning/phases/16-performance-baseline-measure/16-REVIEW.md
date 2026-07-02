---
phase: 16-performance-baseline-measure
reviewed: 2026-07-02T09:50:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/measure-cwv-lib.mjs
  - scripts/measure-cwv.mjs
  - scripts/__tests__/measure-cwv-lib.test.ts
  - scripts/__tests__/fixtures/route-bundle-stats.fixture.json
  - package.json
findings:
  critical: 1
  warning: 7
  info: 6
  total: 14
status: issues_found
fixed_at: 2026-07-02T10:10:00Z
fix_scope: critical_warning
fix_status: all_fixed
fixes:
  fixed: 8
  deferred: 6
---

# Phase 16: Code Review Report

**Reviewed:** 2026-07-02T09:50:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the Phase-16 CWV baseline harness: the pure lib (`measure-cwv-lib.mjs`), the side-effectful harness (`measure-cwv.mjs`), its unit test + fixture, and the `package.json` script additions. Cross-referenced against `scripts/qa-lib.mjs` (inlined-helper parity), `scripts/cleanup-test-users.mjs` (cleanup contract), `src/db/schema.ts` (insert columns + FK cascades), `package-lock.json` (dependency provenance), and the phase's D-01..D-07 decisions in 16-CONTEXT.md/16-RESEARCH.md.

**Verified clean (explicitly checked, no findings):**

- **Secret handling:** session token, password, and DATABASE_URL never reach logs, error messages, or artifacts. A grep of all 13 committed baseline artifacts for `session_token`, `postgres://`, `DATABASE_URL`, `__Secure-better-auth`, and the `CWV-{hex}` password pattern found zero matches. Raw-runs JSON contains numbers only.
- **Median / discard-run-1 math:** `runs.slice(1)` discards exactly run 0; `computeMedians` over the 5 warm runs is correct for the shipped odd-length case; classifier formula matches 16-RESEARCH.md lines 607-609 verbatim (spec, not a bug); routes match D-03 exactly.
- **Cleanup wiring:** `CLEANUP_DB_URL ?? DATABASE_URL` fallback matches `cleanup-test-users.mjs`'s required env; the `%@test.local` pattern passes its domain guard; schema FKs cascade user → session/account/decks → cards, so user deletion is sufficient.
- **Inlined qa-lib helpers:** `extractSessionCookie` is verbatim as claimed; the `signUp`/`provision` deviations (Origin header, userId-from-signup-body) are consistent with the documented live-run fixes. Insert columns match `decks`/`cards` schema (all notNull satisfied).
- **Redirect guard:** traced through the `/study`-without-deck redirect, `/login` shell, and encoded-redirect cases — all fail loud.
- **Toolchain:** `npm run typecheck` clean; `vitest run scripts/__tests__/measure-cwv-lib.test.ts` 9/9 pass; fixture assertions (`Math.round(1111000/1024)`, `chunks: 0`) verified.

**Key concern:** the phase's own hard requirement — "no *test.local residue in prod, cleanup on ALL failure paths" (T-16-05) — is not actually guaranteed. Three distinct paths defeat it: an unguarded `browser.close()` in the `finally` (CR-01), no signal handling on a ~1-hour run (WR-05), and no detection of a DATABASE_URL/prod-DB mismatch, where cleanup sweeps the wrong database and reports success (WR-06).

## Fix Round 1 (2026-07-02)

All Critical + Warning findings fixed; Info findings deferred (out of fix scope). The committed baseline artifacts under `baseline/` were not touched — no measured number was altered or re-derived, and the `median()` selection math is deliberately unchanged (WR-03 was a documentation lie, not a math bug).

| Finding | Status | Commit |
|---------|--------|--------|
| CR-01 | Fixed | `563c1b8` |
| WR-01 | Fixed | `c91bf84` |
| WR-02 | Fixed | `fbffcee` |
| WR-03 | Fixed (docs/test-title only — math untouched) | `c7c18e7` |
| WR-04 | Fixed (+6 unit tests) | `3753dfb` |
| WR-05 | Fixed | `d87d514` |
| WR-06 | Fixed | `ec07cf7` |
| WR-07 | Fixed (+2 unit tests) | `092aee6` |
| IN-01..IN-06 | Deferred — Info out of fix scope | — |

Verification: `node --check` on both harness files, scoped `biome ci` on all touched files, `tsc --noEmit`, and full `vitest run` (2106 passed; sole failure was the known parallel-load flake `cooldown-config.test.ts`, which passes 4/4 in isolation) — all clean. WR-01 lockfile diff confirmed to be the one-line explicit-dep re-link only. Note: WR-05 (signal handlers) and WR-06 (same-DB guard) change live-prod-run paths that cannot be exercised without a real `measure:cwv` run (forbidden in this round) — verified by inspection, syntax/type checks, and unchanged happy-path behavior; the next live baseline run will exercise them.

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01: Unguarded `await browser.close()` in `finally` can abort before cleanup runs — *test.local residue left in prod

**Status:** Fixed in `563c1b8` — both `browser.close()` (top-level finally) and `page.close()` (measureRoutexPreset finally) wrapped in try/catch log-and-continue; cleanup reachable on every path.
**File:** `scripts/measure-cwv.mjs:675-677` (cleanup at 679-694 never reached)
**Issue:** The top-level `finally` awaits `browser.close()` *before* spawning `cleanup-test-users.mjs`. If the browser connection is already dead — a crashed/killed Chrome is one of the most likely reasons the harness entered the `catch` path in the first place — puppeteer's `close()` can reject ("Protocol error" / "Connection closed"). That rejection propagates out of the `finally` as an unhandled top-level error, so the cleanup `spawnSync` **never executes** and `process.exit(exitCode)` at line 697 is never reached. Result: the provisioned `cwv+*@test.local` user, deck, and cards remain in the production database — directly violating the comment on line 679 ("ALWAYS run cleanup regardless of measurement outcome") and T-16-05. A hanging `close()` (another known puppeteer failure mode) similarly stalls cleanup indefinitely. Secondary instance of the same pattern: `measureRoutexPreset`'s `finally { await page.close(); }` (lines 435-437) — a throw there still reaches the outer catch (cleanup runs), but it *replaces* the original diagnostic error with an opaque close error.
**Fix:**
```js
} finally {
  if (browser) {
    try {
      await browser.close();
    } catch (closeErr) {
      console.error(
        `[measure-cwv] browser.close() failed (continuing to cleanup): ${closeErr.message}`,
      );
    }
  }
  // ...spawnSync cleanup unchanged
```
Apply the same try/catch (log-and-continue) to `await page.close()` in `measureRoutexPreset` so a close failure cannot mask the loop's real error.

### Warnings

#### WR-01: `puppeteer-core` is an undeclared (phantom) dependency

**Status:** Fixed in `c91bf84` — pinned `"puppeteer-core": "^24.43.1"` in devDependencies (exact version already resolved in package-lock.json); lockfile diff was the one-line explicit-dep re-link, no version churn.
**File:** `scripts/measure-cwv.mjs:53`; `package.json:57-72` (devDependencies)
**Issue:** This phase introduces the codebase's only direct `import puppeteer from "puppeteer-core"`, but `puppeteer-core` appears nowhere in `package.json`. It resolves today only because `lighthouse@13.3.0` declares `puppeteer-core: ^24.43.0` as its own dependency and npm hoists it (verified in `package-lock.json`: root has no entry; `node_modules/lighthouse` deps do). A lighthouse upgrade that drops/changes that dep, an `npm dedupe`, or a stricter package manager (pnpm) breaks the harness with `ERR_MODULE_NOT_FOUND`. The report renderer even hardcodes "puppeteer-core 24.43.1" as part of the recorded methodology — a version the project does not control.
**Fix:** Declare it explicitly in `devDependencies`:
```json
"puppeteer-core": "^24.43.1",
```

#### WR-02: `PROD_URL` override is broken by hardcoded cookie domain

**Status:** Fixed in `fbffcee` — `PROD_HOST = new URL(PROD_URL).hostname` feeds `injectCookie`; HTTPS-only restriction of the `__Secure-` prefix documented at the constant.
**File:** `scripts/measure-cwv.mjs:276-286` (`injectCookie`), `scripts/measure-cwv.mjs:69`
**Issue:** `PROD_URL` is documented as a configurable env var (header lines 13, 625), but `injectCookie` hardcodes `domain: "leocards.vercel.app"`. Against any other origin (e.g., a Vercel preview deployment — the natural use for this knob), the cookie never matches the target host, every run lands on `/login`, and the guard throws — but only *after* a signup + deck + 5 card inserts have already been provisioned against that origin. The knob cannot work for anything except the default value it exists to override. (Note also: the `__Secure-` prefix + `secure: true` additionally restrict valid overrides to HTTPS origins — worth documenting.)
**Fix:**
```js
const PROD_HOST = new URL(PROD_URL).hostname;
// in injectCookie:
domain: PROD_HOST,
```

#### WR-03: `median()` even-length contract is documented backwards (JSDoc + test title both wrong)

**Status:** Fixed in `c7c18e7` — JSDoc + test title corrected to "upper of the two middle values (index `Math.floor(length / 2)`)" with an explicit do-not-"fix"-the-code warning. Selection MATH deliberately unchanged (changing it would silently redefine future baselines); the optional empty-input guard was intentionally NOT added (wording-only scope).
**File:** `scripts/measure-cwv-lib.mjs:33-35,40-43`; `scripts/__tests__/measure-cwv-lib.test.ts:27-29`
**Issue:** The JSDoc claims even-length arrays return "the lower-of-the-two-middle value (Math.floor behavior)", and the test is titled the same — but `sorted[Math.floor(length / 2)]` selects the **upper** middle element. For `[10, 20, 30, 40]` the middle pair is {20, 30}; the code returns 30 (upper), and the test asserts 30 while its title says "lower". The implementation is correct for the shipped odd-length case (5 warm runs), but the misdocumented invariant is a trap: any future `N_RUNS` change producing an even warm-run count invites a maintainer to trust the doc, or "fix" the code to match it — silently shifting every subsequent baseline relative to Phase 16's numbers. Secondary: `median([])` silently returns `undefined` (no guard), which would propagate as `undefined`/NaN into reports if a future caller passes an empty array.
**Fix:** Correct the JSDoc to "the upper of the two middle values (index `Math.floor(length/2)`)" and retitle the test accordingly; optionally add `if (values.length === 0) throw new Error("median: empty input");`.

#### WR-04: `extractMetrics` performs no validation — errored Lighthouse audits produce a silent garbage baseline

**Status:** Fixed in `3753dfb` — every metric must be a finite number and the perf score finite, else a descriptive error names the audit and its scoreDisplayMode; behavior unchanged for valid input (incl. CLS 0). 6 new unit tests cover happy path + all throwing paths.
**File:** `scripts/measure-cwv-lib.mjs:65-75`
**Issue:** All seven extractions are unguarded. On real prod runs under simulated throttling, Lighthouse occasionally marks an audit errored (e.g., NO_LCP / NO_FCP): `numericValue` is then `undefined`, and `lhr.categories.performance.score` is `null` when any metric audit fails. Consequences: `Math.round(null * 100)` yields **0** (a silently wrong score, not a crash), and `undefined` metric values flow into `computeMedians`, where the sort comparator returns NaN (unspecified ordering) and the median may be `undefined` — rendering literally as "undefined" or dragging medians to garbage in the committed report. This is exactly the "garbage-but-green baseline" failure class the redirect guard (D-01/T-16-07) exists to prevent, entering through a different door. The harness only fails loud if the audit *key* is missing entirely (TypeError).
**Fix:**
```js
export function extractMetrics(lhr) {
  const num = (id) => {
    const v = lhr.audits[id]?.numericValue;
    if (!Number.isFinite(v))
      throw new Error(`Lighthouse audit "${id}" has no numeric value (scoreDisplayMode: ${lhr.audits[id]?.scoreDisplayMode})`);
    return v;
  };
  const perfScore = lhr.categories.performance.score;
  if (perfScore == null)
    throw new Error("Lighthouse performance score is null — a metric audit errored");
  return {
    lcp: num("largest-contentful-paint"),
    tbt: num("total-blocking-time"),
    cls: num("cumulative-layout-shift"),
    fcp: num("first-contentful-paint"),
    ttfb: num("server-response-time"),
    score: Math.round(perfScore * 100),
    bootupTime: num("bootup-time"),
  };
}
```

#### WR-05: No SIGINT/SIGTERM handling — Ctrl-C during the ~1-hour run leaves prod residue with no recovery hint

**Status:** Fixed in `d87d514` — cleanup extracted into shared `runCleanup()`; `process.once` handlers for SIGINT (exit 130) and SIGTERM (exit 143) best-effort reap and print the manual recovery command, which is also in the startup banner and the cleanup-failure path.
**File:** `scripts/measure-cwv.mjs:630-697`
**Issue:** The `finally` only covers thrown errors. 48 sequential Lighthouse runs take on the order of an hour; an operator interrupt (Ctrl-C) mid-run is one of the *most likely* termination modes, and it kills the process without running cleanup — `cwv+*@test.local` user/deck/cards persist in prod. `measure:cleanup` exists as the designed manual recovery, but the harness never mentions it: nothing is printed at startup or on interrupt telling the operator to run it, so the residue silently outlives the run.
**Fix:** Register a signal handler that performs the same synchronous cleanup (safe: `spawnSync` completes inside the handler):
```js
function emergencyCleanup(signal) {
  console.error(`\n[measure-cwv] ${signal} received — reaping *@test.local before exit`);
  spawnSync(process.execPath, [path.join(ROOT, "scripts", "cleanup-test-users.mjs"), "%@test.local"], {
    stdio: "inherit",
    env: { ...process.env, CLEANUP_DB_URL: process.env.CLEANUP_DB_URL ?? process.env.DATABASE_URL },
  });
  process.exit(130);
}
process.once("SIGINT", () => emergencyCleanup("SIGINT"));
```
(SIGINT covers Ctrl-C on Windows; SIGTERM is a no-op there.) At minimum, print the `npm run measure:cleanup` recovery command in the startup banner.

#### WR-06: No detection of DATABASE_URL / prod-DB mismatch — cleanup sweeps the wrong database and reports success while the prod user persists

**Status:** Fixed in `ec07cf7` — immediately after sign-up, the returned userId is selected via DATABASE_URL; zero rows aborts with a mismatch error (incl. manual prod-side recovery guidance) before any deck/card insert or Lighthouse run.
**File:** `scripts/measure-cwv.mjs:198-239` (provision), `scripts/measure-cwv.mjs:680-694` (cleanup env)
**Issue:** The harness spans two trust domains that are assumed — never verified — to be the same database: `signUp` creates the user through the **prod deployment** (PROD_URL), while deck/card inserts and cleanup go through **DATABASE_URL** directly. If an operator exports the wrong Neon URL (dev/branch DB — an easy mistake), the sequence is: prod user + session + account rows created in the real prod DB → deck insert fails the `decks.userId → user.id` FK against the other DB (loud, good) → `finally` cleanup runs against that same *wrong* DB, prints "matched 0 test user(s) … nothing to delete", and the harness exits **claiming cleanup succeeded** while the *test.local user permanently remains in prod. This defeats the "no residue in prod" guarantee on a plausible operator-error path, with actively misleading output.
**Fix:** Verify same-DB visibility immediately after signup, before creating more rows:
```js
import { user } from "../src/db/schema.ts"; // alongside cards, decks
import { eq } from "drizzle-orm";
// after signUp():
const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
if (rows.length === 0)
  throw new Error(
    `[measure-cwv] DATABASE_URL does not contain just-created user ${email} — ` +
      "it points at a DIFFERENT database than the prod deployment. " +
      `Cleanup CANNOT reach prod: manually delete ${email} from the prod auth DB.`,
  );
```

#### WR-07: Bundle-stats freshness is documented as required but never enforced — stale `.next/` silently corrupts the bundle table and bottleneck classification

**Status:** Fixed in `092aee6` — missing stats file fails with "run `npm run build` first"; mtime older than the HEAD commit timestamp fails loud (rebuild clears the gate, no config knobs; skipped with a warning only when git yields no timestamp). Secondary `getBundleKb` non-finite-bytes guard added with 2 unit tests.
**File:** `scripts/measure-cwv.mjs:489-495` (`readBundleStats`), consumed at 583-584
**Issue:** The header (lines 22-25) and JSDoc (Pitfall 6) require a fresh `npm run build` so local bundle stats match the deployed commit — but nothing checks it. `readBundleStats` fails fast only when the file is *absent*; a stale `.next/` from an older commit parses fine and silently produces wrong first-load KB, wrong chunk fingerprints, and — because `bundle.kb` feeds `classifyBottleneck` — potentially a wrong Phase-17 optimization target in the committed, immutable baseline. Same silent-garbage class as WR-04, affecting the report's other half. Secondary: the parsed shape is trusted blindly — a renamed `firstLoadUncompressedJsBytes` field yields `Math.round(undefined / 1024)` = NaN KB in the report rather than an error.
**Fix:** After reading, compare the stats file's mtime against the HEAD commit timestamp and fail (or loudly warn) when the build predates it:
```js
const { mtimeMs } = await stat(statsPath);
const headTime = Number(spawnSync("git", ["log", "-1", "--format=%ct"], { cwd: ROOT }).stdout) * 1000;
if (mtimeMs < headTime)
  throw new Error("[measure-cwv] .next/diagnostics/route-bundle-stats.json predates HEAD — run `npm run build` first (Pitfall 6)");
```
And in `getBundleKb`, guard `Number.isFinite(item.firstLoadUncompressedJsBytes)` before dividing.

### Info

#### IN-01: Report renderer hardcodes methodology claims owned elsewhere (versions, run count, card count, target host)

**File:** `scripts/measure-cwv-lib.mjs:153-160`
**Issue:** "Lighthouse 13.3.0, puppeteer-core 24.43.1", "6 per preset", "deck + 5 cards", and `https://leocards.vercel.app` are baked into `renderRouteReport`, while the actual values live in `package-lock.json`, `N_RUNS`, the provision call, and `PROD_URL` respectively. Any drift (lockfile refresh under `^13.3.0`, N_RUNS change, PROD_URL override per WR-02) makes future baselines misstate their own methodology.
**Fix:** Thread `baseUrl`, `nRuns`, `cardCount`, and tool versions (read from `package-lock.json` or `lighthouse/package.json`) into the render input instead of hardcoding.

#### IN-02: `lighthouseNavigation` result is not null-checked

**File:** `scripts/measure-cwv.mjs:406-421`
**Issue:** Lighthouse's `navigation()` is typed as possibly returning `undefined`; `result.lhr` would then throw an opaque `TypeError: Cannot read properties of undefined` — a poor diagnostic for a harness whose design goal is loud, attributable failures.
**Fix:** `if (!result?.lhr) throw new Error(\`[measure-cwv] Lighthouse returned no result for ${route} run ${i}\`);`

#### IN-03: Stale comment numbering and duplicate provisioning logs

**File:** `scripts/measure-cwv.mjs:206-234, 650`
**Issue:** `provision()`'s step comments run 1, 2, 4 — residue of qa-lib's removed step 3 ("resolve userId"), dropped by the documented deviation but never renumbered. Additionally "provisioned … deck …" is logged twice: inside `provision()` (line 219) and again in main (line 650).
**Fix:** Renumber the comments; drop one of the two duplicate log lines.

#### IN-04: Cleanup blast radius — always reaps ALL `%@test.local` users, including other tools' concurrent sessions

**File:** `scripts/measure-cwv.mjs:684-694`
**Issue:** The `finally` sweeps every `%@test.local` user even when this run provisioned nothing (e.g., `readBundleStats` failed before provision). A concurrently running Phase-15 `qa-run.mjs` session would have its `qa+*@test.local` user deleted mid-flight, breaking it mysteriously. This mirrors the existing `qa:cleanup` convention, so it is accepted practice — but the harness knows its exact minted email and could scope deletion to it.
**Fix:** When provision succeeded, pass the specific email as the pattern (`cleanup-test-users.mjs` accepts a full address — `LIKE` with no wildcard is an exact match and the `*test.local` guard passes); fall back to the broad sweep only when the email is unknown.

#### IN-05: Committed user-specific absolute path as CHROME_PATH default

**File:** `scripts/measure-cwv.mjs:70-72`
**Issue:** The default `C:\Users\jfwas\AppData\Local\ms-playwright\chromium-1208\...` is machine-specific; every other machine/CI must set CHROME_PATH. Mitigated by the env override and `launchBrowser`'s helpful error, but a committed personal path is a portability smell.
**Fix:** Derive from Playwright's install (`ms-playwright` under the OS-appropriate cache dir) or leave CHROME_PATH required with the current descriptive error.

#### IN-06: Untested lib exports — `extractMetrics`, `renderRouteReport`, `renderSummary`

**File:** `scripts/__tests__/measure-cwv-lib.test.ts`
**Issue:** 4 of 7 lib exports are covered. `extractMetrics` is the riskiest omission — it is the exact function with the unguarded accesses in WR-04, and a small errored-audit lhr fixture would have surfaced that gap. The render functions are deterministic string builders that would pin the report format cheaply.
**Fix:** Add a minimal lhr fixture (happy path + one errored audit once WR-04 lands) and snapshot-style assertions for the two render functions.

---

_Reviewed: 2026-07-02T09:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
