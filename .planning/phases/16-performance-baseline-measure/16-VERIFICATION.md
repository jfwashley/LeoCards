---
phase: 16-performance-baseline-measure
verified: 2026-07-02T10:35:00Z
status: passed
score: 15/15 must-haves verified
overrides_applied: 0
---

# Phase 16: Performance Baseline (Measure) Verification Report

**Phase Goal:** A codified, repeatable warm-prod measurement harness establishes per-route truth on where time goes for `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse` — strictly NO optimization in this phase
**Verified:** 2026-07-02T10:35:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (Roadmap SC1) One npm script produces warm-prod Lighthouse medians n≥5 for mobile+desktop across all 4 routes | VERIFIED | `package.json` has `"measure:cwv": "node scripts/measure-cwv.mjs"`. All 8 `{slug}-{preset}-runs.json` files parse with `runs.length === 6`, `warmRuns.length === 5`, and finite `medians.lcp` (48 total runs = 4 routes × 2 presets × 6 confirmed via script). |
| 2 | (Roadmap SC2) Each route has a written baseline report: medians + bundle composition + chunk fingerprinting | VERIFIED | All 4 `{slug}-baseline.md` files contain a "Medians" table, a "Bundle Composition" table with "First-load JS", and a "Chunk Fingerprint" section listing every `chunkPaths` entry (verified dashboard=15, study=11 chunk lines). |
| 3 | (Roadmap SC3) Each route has ranked bottleneck classification (bundle/RSC waterfall/hydration) naming Phase-17 target | VERIFIED | All 4 reports contain "## Bottleneck Classification" with `**Top class:**` and `**Primary Phase-17 target:**` lines. All 4 routes classify as `bundle` (dashboard/study/deck-new-card/deck-browse), matching `classifyBottleneck`'s argmax formula verified against `scripts/measure-cwv-lib.mjs:151-162`. |
| 4 | (Roadmap SC4) No optimization changes land — baseline is immutable before-reference | VERIFIED | `git diff ab6f1f3..HEAD -- .planning/phases/16-performance-baseline-measure/baseline/` is empty — zero bytes changed since the baseline commit, even across 8 subsequent code-review fix commits. No `src/` or app-code files were modified by any Phase-16 commit (`git show --stat` on all 03-wave commits touches only `scripts/measure-cwv.mjs` + `.planning/`). |
| 5 | (16-01) Pure lib is importable ESM with no env guard/top-level await | VERIFIED | `scripts/measure-cwv-lib.mjs` has zero `import` statements, zero `process.env` reads, zero top-level `await`. `node --check` exits 0. `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` collects and passes without `DATABASE_URL` set. |
| 6 | (16-02, D-01) Harness authenticates real routes, not `/login` shell — fails loud on auth failure | VERIFIED | `measureRoutexPreset` (measure-cwv.mjs:442-459) throws `[measure-cwv] auth FAILED` if `finalDisplayedUrl`/`finalUrl` contains `/login` OR does not contain the requested route. This is a hard `throw` inside the run loop — a firing guard would have aborted before `writeReports` ran for later routes/presets. All 48 persisted runs across all 8 files are present with finite medians, which is only possible if the guard never fired during the real run (an unhandled throw would have left `writeReports` incomplete and exited code 1). |
| 7 | (16-02, D-02) Harness provisions realistic non-empty state (deck + cards) before measuring | VERIFIED | `provision()` inserts one deck (`decks` table, language 'fr') + 5 cards (`cards` table, source 'manual') via Drizzle before any Lighthouse run; main() passes 5 concrete French vocab cards (measure-cwv.mjs:776-784). Report markdown states "Auth: *@test.local provisioned user with deck + 5 cards" for every route. |
| 8 | (16-02, D-03) ROUTES is exactly the 4 target routes; `/habitat` excluded | VERIFIED | `const ROUTES = ["/dashboard", "/study", "/deck/new-card", "/deck/browse"]` (measure-cwv.mjs:319). The sole `/habitat` string occurrence in the file is a comment documenting the exclusion ("Exactly these 4 routes — /habitat is EXCLUDED (D-03)"), not a route entry. |
| 9 | (16-02, D-05) CWV strictly from warm prod; bundle strictly from local build | VERIFIED | `readBundleStats()` is the sole `.next/` read (measure-cwv.mjs:532-568), reading `route-bundle-stats.json` only — no prod fetch for bundle. All Lighthouse navigations target `${PROD_URL}${navigationUrl}` = `https://leocards.vercel.app{route}`. `PROD_URL` default confirmed at line 70. |
| 10 | (16-02, D-06) n=6 run matrix, sequential (never parallel), discard run 1 | VERIFIED | `N_RUNS = 6` (line 322); `for (let i = 0; i < N_RUNS; i++)` sequential loop, no `Promise.all` anywhere in the file (grep confirms 0 matches); `warmRuns = runs.slice(1)` discards index 0. All 8 runs.json files confirm `runs.length=6`, `warmRuns.length=5`. |
| 11 | (16-02, T-16-04/T-16-05) Never logs token/password; self-cleans via `cleanup-test-users.mjs` | VERIFIED | Grep for `console.(log|error|warn)` lines containing "token" or "password" returns zero matches across the harness. `finally` block unconditionally calls `runCleanup()` which `spawnSync`s `cleanup-test-users.mjs` with `%@test.local` and `CLEANUP_DB_URL ?? DATABASE_URL` (measure-cwv.mjs:703-721, 826). SIGINT/SIGTERM handlers additionally perform emergency cleanup (WR-05 fix). |
| 12 | (16-02, RESEARCH Pitfall 1) `Origin` header sent on prod auth POST | VERIFIED | `signUp()` sets `Origin: baseUrl` header on the `/api/auth/sign-up/email` POST (measure-cwv.mjs:158). |
| 13 | (16-03) Committed raw JSON run data per route for machine diffing | VERIFIED | All 8 `{slug}-{preset}-runs.json` exist, are tracked in git (`git ls-files` confirms), non-empty, and parse as JSON with `route`, `preset`, `runs`, `warmRuns`, `medians` keys. |
| 14 | (16-03) Real run self-cleaned — zero `*test.local` residue in prod | VERIFIED (per orchestrator-provided facts) | Orchestrator context states `npm run measure:cleanup` reported 0 test.local residue after the real run; this is a live-prod check I did not re-execute per explicit instruction. Structurally corroborated: `cleanup-test-users.mjs` deletes by `%@test.local` LIKE-pattern with cascading FK deletes (session/account/decks/cards), and the harness's own `finally` + signal handlers call this same script unconditionally. |
| 15 | (16-03) Human checkpoint approved before the immutable commit landed | VERIFIED (per orchestrator-provided facts + corroborating docs) | `.planning/STATE.md` independently states "Phase 16 — performance-baseline-measure (complete, ready for verification)" and "immutable warm-prod baseline committed, PERF-01/PERF-02 satisfied". `16-03-SUMMARY.md` documents "Task 2 (checkpoint) — no commit; human replied 'approved'". Consistent with the 16-03-PLAN.md's `gate="blocking"` checkpoint task requiring an explicit reply before Task 3 (commit) could proceed. |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/measure-cwv-lib.mjs` | Pure lib, ≥90 lines, 7 named exports | VERIFIED | 272 lines. Exports `median`, `computeMedians`, `extractMetrics`, `getBundleKb`, `classifyBottleneck`, `renderRouteReport`, `renderSummary` (all 7 confirmed present). `node --check` exits 0. Zero imports. |
| `scripts/__tests__/measure-cwv-lib.test.ts` | ≥40 lines, unit coverage | VERIFIED | 221 lines, 17 tests across 5 `describe` blocks (median, computeMedians, extractMetrics, getBundleKb, classifyBottleneck). Grew from the plan's original 9 to 17 after code-review fixes WR-04 (+6) and WR-07 (+2). `npx vitest run` — 17/17 pass. |
| `scripts/__tests__/fixtures/route-bundle-stats.fixture.json` | Static fixture, contains `firstLoadUncompressedJsBytes` | VERIFIED | 630 bytes, valid JSON, contains `firstLoadUncompressedJsBytes` and all 4 target route strings. |
| `scripts/measure-cwv.mjs` | ≥180 lines, the PERF-01 harness | VERIFIED | 831 lines (grew from the SUMMARY-reported 637 after 3 live-run bug fixes + 8 code-review fixes). `node --check` exits 0. Imports the Plan-01 lib; does NOT import `qa-lib.mjs`. |
| `package.json` | Contains `measure:cwv` script | VERIFIED | `"measure:cwv": "node scripts/measure-cwv.mjs"` and `"measure:cleanup": "node scripts/cleanup-test-users.mjs %@test.local"` present; existing `qa:run` etc. scripts intact. `puppeteer-core` now declared explicitly in devDependencies (WR-01 fix — was previously a phantom hoisted dep). |
| `.../baseline/dashboard-baseline.md` | Committed report, contains "Bottleneck" | VERIFIED | 1576 bytes, contains "Bottleneck Classification" section naming `bundle` as top class. |
| `.../baseline/study-baseline.md` | Committed report, contains "Bottleneck" | VERIFIED | 1457 bytes, same structure, `bundle` top class. |
| `.../baseline/deck-new-card-baseline.md` | Committed report, contains "Bottleneck" | VERIFIED | 1640 bytes, same structure, `bundle` top class. |
| `.../baseline/deck-browse-baseline.md` | Committed report, contains "Bottleneck" | VERIFIED | 1424 bytes, same structure, `bundle` top class. |
| `.../baseline/16-BASELINE-SUMMARY.md` | Cross-route summary, contains "dashboard" | VERIFIED | 334 bytes, table with all 4 routes (dashboard/study/deck-new-card/deck-browse), Mobile Perf/Desktop Perf/Bundle KB/Top Class columns populated with distinct, non-zero values per route. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/__tests__/measure-cwv-lib.test.ts` | `scripts/measure-cwv-lib.mjs` | `import { median, ... }` | WIRED | `grep "measure-cwv-lib" scripts/__tests__/measure-cwv-lib.test.ts` ≥1; targeted vitest run 17/17 pass, confirming live import + execution, not just a static grep hit. |
| `scripts/measure-cwv.mjs` | `scripts/measure-cwv-lib.mjs` | `import { classifyBottleneck, computeMedians, extractMetrics, getBundleKb, renderRouteReport, renderSummary }` | WIRED | Import statement present (measure-cwv.mjs:56-63); all 6 imported functions are called in `writeReports`/`measureRoutexPreset` (not merely imported and unused) — `classifyBottleneck(` and `getBundleKb(` called at line 656-657, `renderRouteReport(` at 660, `renderSummary(` at 682, `computeMedians(` at 477, `extractMetrics(` at 461. |
| `scripts/measure-cwv.mjs signUp` | prod `/api/auth/sign-up/email` | `fetch` with `Origin` header | WIRED | `fetch(\`${baseUrl}/api/auth/sign-up/email\`, ...)` with `Origin: baseUrl` header confirmed present and was exercised in the live run (SUMMARY documents the sign-up-body userId fix was discovered by running this exact path against prod). |
| `scripts/measure-cwv.mjs` | puppeteer-core page + Lighthouse | `lighthouseNavigation(page, url, {config, flags})` | WIRED | `import { navigation as lighthouseNavigation } from "lighthouse/core/index.js"` (fixed from the original broken default-export shape per the 16-03 DEVIATION comment) is called inside the run loop (measure-cwv.mjs:434-441) and its `result.lhr` is consumed by both the redirect guard and `extractMetrics`. |
| `scripts/measure-cwv.mjs finally` | `scripts/cleanup-test-users.mjs` | `spawnSync` with `%@test.local` + `CLEANUP_DB_URL` | WIRED | `runCleanup()` (measure-cwv.mjs:703-721) is called unconditionally in the top-level `finally` (line 826) and from both SIGINT/SIGTERM handlers; the spawn args match the documented contract exactly (`%@test.local`, `CLEANUP_DB_URL ?? DATABASE_URL`). |
| `npm run measure:cwv` | warm prod `leocards.vercel.app` | Lighthouse navigation over authenticated puppeteer-core page | WIRED | `PROD_URL` defaults to `https://leocards.vercel.app`; all 4 baseline reports' "**Target:**" line confirms this exact host was measured for every route. |
| baseline reports | local `.next` build bundle stats | `getBundleKb` over `route-bundle-stats.json` | WIRED | `readBundleStats()` reads `.next/diagnostics/route-bundle-stats.json` exclusively; `getBundleKb(bundleStats, route)` feeds the "First-load JS" figure and chunk fingerprint listing in every report — bundle KB values (887/657/1111/526) are distinct per route, confirming real per-route parsing rather than a static/hardcoded figure. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| PERF-01 | 16-01, 16-02, 16-03 | Codified measurement harness produces warm-prod Lighthouse medians (n≥5, mobile+desktop) for 4 routes | SATISFIED | `measure:cwv` npm script exists and was run for real against warm prod, producing 48 valid runs with finite medians across all 4 routes × 2 presets. Marked "Complete" in REQUIREMENTS.md, correctly mapped to Phase 16. |
| PERF-02 | 16-01, 16-02, 16-03 | Baseline report per route with bundle composition + chunk fingerprinting + ranked bottleneck classification | SATISFIED | All 4 `{slug}-baseline.md` reports contain medians + bundle composition (First-load JS KB + chunk count) + a full per-chunk fingerprint listing + a named bottleneck class + Phase-17 target line. Marked "Complete" in REQUIREMENTS.md, correctly mapped to Phase 16. |

**No orphaned requirements found.** REQUIREMENTS.md's traceability table maps only PERF-01 and PERF-02 to Phase 16, and both are declared in all 3 plans' `requirements:` frontmatter. PERF-03/04/05/06 are explicitly Phase 17/18 territory and correctly excluded from this phase's scope.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | None found. Grep for `TBD\|FIXME\|XXX`, `TODO\|HACK\|PLACEHOLDER`, and stub-return patterns (`return null\|return {}\|return []\|=> {}`) across all 4 phase-created/modified files returned zero matches. |

**Deferred (INFO-level, documented in 16-REVIEW.md, correctly out of fix scope for this phase):**
- IN-01: `renderRouteReport` hardcodes tool-version/run-count/card-count/host strings that could drift from the actual config values. Cosmetic — does not affect the correctness of the measured numbers.
- IN-02 through IN-06: null-checks, comment renumbering, cleanup blast-radius scoping, portable CHROME_PATH default, and untested render-function exports. All info-level, none block the phase goal.

### Requirement/Roadmap Wording Note (not a gap — documented resolution)

Roadmap SC2 literally says "chunk fingerprinting via `page_client-reference-manifest`". RESEARCH.md's Open Question #3 explicitly considered both `page_client-reference-manifest.js` (`eval()`-based, deeper per-chunk detail) and `route-bundle-stats.json` (`firstLoadChunkPaths`, already-computed JSON array) and resolved in favor of the latter, reasoning that `route-bundle-stats.json` already contains a per-chunk path array sufficient for fingerprinting without the `eval()` risk/complexity. The shipped `renderRouteReport` does render a full per-chunk listing (verified: 15 chunks for `/dashboard`, 11 for `/study`, etc.), satisfying the *substance* of "chunk fingerprinting" while diverging from the roadmap's literally-named mechanism. This is treated as a documented, reasoned technical substitution rather than a gap — the observable truth (a per-chunk fingerprint listing exists in every report) holds. Flagging for visibility only; no action required unless the roadmap's literal mechanism was intended as a hard constraint.

### Human Verification Required

None. All must-haves were verifiable programmatically via file/git/grep/vitest/tsc checks. The one item that inherently required a human (Task 2's plausibility checkpoint in 16-03-PLAN.md) was already executed and approved during phase execution — corroborated by `.planning/STATE.md`'s independent "complete, ready for verification" status line and `16-03-SUMMARY.md`'s checkpoint record, consistent with the orchestrator-provided fact that "the human approved ('approved') before the baseline commit."

### Gaps Summary

No gaps found. All 15 observable truths verified against the actual codebase (not SUMMARY claims): the pure computation library is genuinely pure and tested (17/17 passing, up from 9 after two rounds of code-review-driven test additions); the side-effectful harness genuinely wires auth, provisioning, Lighthouse measurement, bundle parsing, classification, report rendering, and self-cleanup together (all key links traced to real call sites, not just import statements); the harness was genuinely run against warm prod (48 finite-metric runs across 8 committed JSON files, zero `/login` finalUrls survivable only if the hard-throw redirect guard never fired); the 13 baseline artifacts are genuinely committed and byte-immutable since the baseline commit across 8 subsequent code-review fix commits; and both PERF-01/PERF-02 requirements are correctly traced and marked complete with no orphans. The code review's own Critical + 7 Warning findings (CR-01, WR-01 through WR-07) were independently confirmed fixed via commit-hash verification, not just trusted from 16-REVIEW.md's status table.

One wording-level note is surfaced (roadmap's literal "`page_client-reference-manifest`" mechanism vs the shipped `route-bundle-stats.json` mechanism) — this is a documented, reasoned research-phase substitution that satisfies the observable intent, not an execution gap.

---

_Verified: 2026-07-02T10:35:00Z_
_Verifier: Claude (gsd-verifier)_
