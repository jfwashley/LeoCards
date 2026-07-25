---
phase: 18
slug: field-validation-guardrails
status: verified
threats_open: 0
threats_pending_execution: 2
asvs_level: 1
created: 2026-07-25
---

# Phase 18 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| npm registry → local build | Third-party package (`@vercel/speed-insights`) pulled into the production bundle | Package code, no runtime secrets |
| Vercel edge → user browser | First-party RUM script runs in every visitor's browser | Route paths, aggregate p75 CWV timing (no PII) |
| gate thresholds → evaluateGates | Threshold values decide PASS/FAIL for the perf-recert gate | Numeric gate thresholds only |
| deployed prod → baseline harness | Baseline trust depends on prod running the intended (current) code | Commit SHA / deployment state |
| DATABASE_URL → measure-cwv child | Prod DB credential provisions the `*@test.local` measurement user | Neon Postgres connection string |
| env-var gate overrides → gate evaluation | `GATE_LCP/GATE_TBT/GATE_CLS/GATE_PERF` decide whether a gate can fail | Numeric override values |
| DATABASE_URL / session tokens → spawned children | Secrets threaded between orchestrator and child processes | Neon Postgres connection string, session tokens |
| local prod-build server (port 3000) | Orchestrator-managed `next start` process must be torn down, not leaked | N/A (process lifecycle) |
| committed report artifacts (`.planning/…/measurements/`) | Reports written to disk must not embed secrets | Route metrics, exit codes only |
| Vercel dashboard (external SaaS) → comparison doc | Field data read manually from a third-party dashboard; no API on Hobby tier | Route paths, aggregate p75 timing |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-18-SC | Tampering (supply chain) | `npm install @vercel/speed-insights` | mitigate | Task 1 blocking-human legitimacy gate (npmjs.com verify) before install | closed |
| T-18-01 | Tampering / Info Disclosure | `<SpeedInsights />` third-party RUM script in every visitor's browser | accept | First-party Vercel tooling, no `postinstall`, gated by T-18-SC | closed |
| T-18-02 | Information Disclosure | Speed Insights field data (paths, timing) sent to Vercel | accept | No PII; p75 aggregate CWV only; Hobby-tier retention owned by Vercel | closed |
| T-18-03a | Tampering (gate trustworthiness) | `evaluateGates` receiving a NaN/undefined threshold | mitigate | `deriveExceptionGate` `Number.isFinite` guard + throw; D-13-1 unit tests | closed |
| T-18-04 | Denial of Service | pure gate-evaluation functions | accept | Zero I/O, zero network; no runtime attack surface | closed |
| T-18-05 | Spoofing (baseline provenance) | Stale prod deploy measured as if it were 26/27 code | mitigate | Task 1 blocking deployment-freshness gate (SHA == main HEAD) + Task 3 human sanity-check before immutable commit | closed |
| T-18-02b | Information Disclosure | `DATABASE_URL` passed to the measure-cwv child during baseline run | mitigate | Passed via `env` only, never argv/logs | closed |
| T-18-06 | Repudiation | Baseline later silently edited, breaking drift comparisons | mitigate | Committed immutable, never re-edited | closed |
| T-18-03b | Tampering (gate trustworthiness) | `GATE_LCP/GATE_TBT/GATE_CLS/GATE_PERF` env overrides | mitigate | `Number.isFinite()` validation before use; fail loud and abort before any measurement | closed |
| T-18-02c | Information Disclosure | `DATABASE_URL`/session tokens passed to spawned measure-cwv/playwright children | mitigate | Secrets via `env` only, never argv/console; never logged | closed |
| T-18-07 | Denial of Service (leaked resource) | leftover `next start` server on port 3000 | mitigate | Server child killed in `finally` regardless of pass/fail/throw | closed |
| T-18-08 | Tampering (supply chain) | new perf script imports | accept | No new dependency; imports only the local import-safe pure lib + Node builtins | closed |
| T-18-02d | Information Disclosure | committed green/red re-cert reports | mitigate | Verified no `DATABASE_URL`/token/password in committed reports before commit | closed |
| T-18-09 | Repudiation | red-path evidence | mitigate | FAILED run's dated report is the committed evidence, never re-edited | closed |
| T-18-10 | Information Disclosure | field data (route paths, timing) in the Plan 06 comparison doc | accept | PENDING-EXECUTION — Plan 06 is calendar-blocked until on/after 2026-08-08 (D-03 14-day window); re-verify when 18-06 runs | pending-execution |
| T-18-11 | Repudiation / misattribution | harness-generated events counted as real-user field data in Plan 06 | mitigate | PENDING-EXECUTION — Plan 06 is calendar-blocked until on/after 2026-08-08; re-verify when 18-06 runs | pending-execution |

*Status: open · closed · pending-execution*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|--------------|------|
| AR-18-01 | T-18-01 | `<SpeedInsights />` is a first-party Vercel RUM script; no `postinstall` script (verified `npm view scripts.postinstall` empty per 18-01-SUMMARY.md); runs on the same platform (Vercel) the app already trusts for prod infra. Residual risk is standard npm supply-chain trust, gated by T-18-SC's blocking-human legitimacy check. | Josh (via 18-01 plan approval) | 2026-07-25 |
| AR-18-02 | T-18-02 | Speed Insights field data sent to Vercel contains no PII — only route paths and aggregate p75 CWV timing. Hobby-tier data retention is owned by Vercel per D-01. | Josh (via 18-01 plan approval) | 2026-07-25 |
| AR-18-04 | T-18-04 | `evaluateGates`/`deriveExceptionGate` are pure functions with zero I/O and zero network access — no runtime DoS attack surface exists to mitigate. | Josh (via 18-02 plan approval) | 2026-07-24 |
| AR-18-08 | T-18-08 | `scripts/perf-recert.mjs` introduces no new npm dependency; it imports only `evaluateGates`/`resolveRoutes` from the local pure lib plus Node built-ins (`node:child_process`, `node:fs`, `node:path`, `node:url`) — verified by reading the script's import list. | Josh (via 18-04 plan approval) | 2026-07-25 |
| AR-18-10 | T-18-10 | Field p75 data (route paths + aggregate timing, no PII) will be safe to commit in the Plan 06 comparison doc — same rationale as AR-18-02. This entry is provisional: it must be re-confirmed against the actual Plan 06 doc contents once 18-06 executes (on/after 2026-08-08). | Josh (via 18-06 plan authoring, execution pending) | pending (plan-authored 2026-07-25) |

*Accepted risks do not resurface in future audit runs, except AR-18-10 which is explicitly flagged for re-confirmation once Plan 18-06 executes.*

---

## Pending-Execution Threats (Plan 18-06 — not yet run)

Plan 18-06 (the field-vs-lab comparison doc) is calendar-blocked by design: it cannot run until the D-03 14-day Speed Insights field-data window closes on/after **2026-08-08** (window opened 2026-07-25 per 18-01-SUMMARY.md / STATE.md). As of this audit (2026-07-25), Plan 18-06 has not executed — there is no `18-FIELD-COMPARISON.md` artifact to verify against.

| Threat ID | Category | Disposition | Why not yet verifiable |
|-----------|----------|-------------|--------------------------|
| T-18-10 | Information Disclosure | accept | The comparison doc this risk applies to does not exist yet. Cannot confirm the committed doc actually contains only route paths + aggregate timing until it is written. |
| T-18-11 | Repudiation / misattribution | mitigate | The mitigation ("doc explicitly notes event count + any harness-run inflation + Hobby-cap thinning") is a property of the not-yet-written `18-FIELD-COMPARISON.md`. Cannot grep for it in a file that doesn't exist. |

**These are not BLOCKER findings** — they reflect a plan whose execution is intentionally deferred, not a missing mitigation in shipped code. `block_on: high` does not apply to work that has not yet been executed. **Action required:** re-run this security audit against 18-06's output once it executes (on/after 2026-08-08) before Phase 18 / v3.0 is considered fully closed. Until then, treat these two threats as open items on the phase's follow-up list, not as shipped-code gaps.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Pending-Execution | Run By |
|------------|----------------|--------|------|--------------------|--------|
| 2026-07-25 | 16 | 14 | 0 | 2 | gsd-security-auditor |

---

## Verification Evidence

| Threat ID | Evidence |
|-----------|----------|
| T-18-SC | 18-01-SUMMARY.md key-decisions: "T-18-SC package-legitimacy gate resolved by Josh: @vercel/speed-insights confirmed Vercel first-party, v2.0.0, source repo vercel/speed-insights present, no postinstall script — approved before install per the blocking-human gate." Self-Check PASSED. |
| T-18-01 | AR-18-01 (Accepted Risks Log); 18-01-SUMMARY.md "no postinstall script" confirmed by Josh. |
| T-18-02 | AR-18-02 (Accepted Risks Log); `src/app/layout.tsx` renders `<SpeedInsights />` with no props — no custom data collection added. |
| T-18-03a | `scripts/measure-cwv-lib.mjs:363-369` — `deriveExceptionGate` throws on non-finite `median` (`Number.isFinite` guard). `scripts/__tests__/measure-cwv-lib.test.ts:468-476` — two throw tests (NaN, undefined). |
| T-18-04 | AR-18-04 (Accepted Risks Log). |
| T-18-05 | 18-03-SUMMARY.md Task 1: "confirmed `origin/main` == `fda0b54` and live prod serves that exact commit... before the baseline ran"; Task 3: Josh's quoted approval "Verified — reflects 26/27, commit immutable." |
| T-18-02b | `scripts/measure-cwv.mjs:106` — `process.env.DATABASE_URL` read via env only; no argv usage found; grep of committed baseline/measurement artifacts shows no embedded connection strings. |
| T-18-06 | 18-03-SUMMARY.md: "Baseline + summary + threshold table committed together as one immutable commit (`7dc0960`)... none of these three artifacts are ever re-edited after this point." |
| T-18-03b | `scripts/perf-recert.mjs:113-126` — `resolveOverride()` validates `Number.isFinite(parsed)` and calls `process.exit(1)` with a fatal message before any measurement; commit `1dfab8a`. Strengthened by fix commit `0a18f4d` (WR-01) validating the baseline-thresholds shape itself. |
| T-18-02c | `scripts/perf-recert.mjs:19-25, 63-71` (header SECURITY note) and `:239-242` (`spawnSync` env forwarding, never argv). |
| T-18-07 | `scripts/perf-recert.mjs:498-503` (`finally { killProcessTree(serverChild); }`); strengthened by fix commit `feb683c` (CR-01) adding a port-3000 preflight and early server-death detection. |
| T-18-08 | `scripts/perf-recert.mjs:73-78` import list — only `node:child_process`, `node:fs`, `node:fs/promises`, `node:path`, `node:url`, and `./measure-cwv-lib.mjs` (`evaluateGates`, `resolveRoutes`); no new `package.json` dependency added by Plan 04. AR-18-08 (Accepted Risks Log). |
| T-18-02d | Grep of `.planning/phases/18-field-validation-guardrails/measurements/` and `baseline/` for `postgres(ql)://|DATABASE_URL=|password|secret|token|bearer|@neon.tech|npg_` — zero matches. |
| T-18-09 | `measurements/recert-2026-07-25-1405.md` / `.json` committed — the FAILED red-path run's dated report, per 18-05-SUMMARY.md. |
| T-18-10, T-18-11 | See "Pending-Execution Threats" section above — Plan 18-06 has not executed. |

---

## Code Review Cross-Reference

`18-REVIEW.md` (2026-07-25) found 1 Critical + 5 Warnings, all with security relevance to this register; all were fixed prior to this audit:

- **CR-01** (fixed `feb683c`) — directly strengthens T-18-07 (nav-gate server-lifecycle trust boundary): the orchestrator now preflight-checks port 3000 before spawning and detects early child death, preventing a false PASS against a stale/leaked server or a false FAIL against a running dev server.
- **WR-01** (fixed `0a18f4d`) — extends T-18-03b's "no silent gate disablement" principle to the baseline-thresholds JSON itself (missing/non-finite gate keys, non-finite `driftPct`).
- **WR-02** (fixed `f725550`) — extends the same principle to an empty `routes` object (vacuous PASS).
- **WR-03** (fixed `558710b`) — strengthens T-18-09/D-07 evidence-trail integrity: second-granularity run IDs plus a never-overwrite guard on the report filename.
- **WR-04, WR-05** (fixed `db36658`, `29a1619`) — correctness fixes to `deriveExceptionGate` and the CLS drift-warning path; not independently threat-registered but affect T-18-03a's "gate must not silently mislabel a regression" guarantee. Regression tests added (`scripts/__tests__/measure-cwv-lib.test.ts`).

IN-01 through IN-07 (Info-level findings) remain open per the review's own scope decision — none map to a registered Phase 18 threat's disposition; they are process-quality observations (POSIX process-group kill, fetch timeout granularity, `ROUTE_FILTER` env leakage, report status wording, drift-metric coverage, Playwright project scope, test-boundary coverage), not unmitigated declared threats. Flagged here for engineering follow-up, not as a security-audit gap.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed (2 threats are `pending-execution`, not `open` — Plan 18-06 has not yet run; re-audit required once it does)
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-25 (with a mandatory follow-up re-audit required once Plan 18-06 executes on/after 2026-08-08)
