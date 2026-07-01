---
phase: 16
slug: performance-baseline-measure
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-01
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (unit, env=node, default include collects `scripts/__tests__/**`) + `node --check` (ESM syntax gate for `scripts/*.mjs` — these are outside tsconfig) |
| **Config file** | vitest.config.ts (only `e2e/**` excluded) |
| **Quick run command** | `node --check <touched .mjs> && npx biome ci <touched files>` |
| **Full suite command** | `npx vitest run` (+ `npx tsc --noEmit` at wave gates) |
| **Estimated runtime** | quick <5 s · full vitest ~60 s · tsc ~30 s |

---

## Sampling Rate

- **After every task commit:** Run `node --check` on touched `.mjs` + scoped `npx biome ci <files>`; for 16-01 Task 2 also `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts`
- **After every plan wave:** Run full `npx tsc --noEmit` + full `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | PERF-01, PERF-02 | T-16-SC | Lib is pure — no `process.env`/network/`process.exit`/top-level await | syntax + grep | `node --check scripts/measure-cwv-lib.mjs` + purity greps | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | PERF-01, PERF-02 | — | Tests have ZERO network I/O (fixture-driven) | unit | `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 2 | PERF-01 | plan-02 `<threat_model>` (cookie/secret handling) | Inlined `signUp` sends `Origin: https://leocards.vercel.app`; session token never logged; NO qa-lib import (`grep -c "qa-lib"` = 0) | syntax + grep | `node --check scripts/measure-cwv.mjs` | ❌ | ⬜ pending |
| 16-02-02 | 02 | 2 | PERF-01 | plan-02 `<threat_model>` (login-shell guard) | Redirect guard throws if any LH run lands on `/login` — no silent shell baseline | syntax + grep | `node --check scripts/measure-cwv.mjs` | ❌ | ⬜ pending |
| 16-02-03 | 02 | 2 | PERF-01, PERF-02 | plan-02 `<threat_model>` (self-clean) | `finally`-block cleanup via cleanup-test-users.mjs `%@test.local`; npm scripts wired | syntax + JSON guard | `node --check scripts/measure-cwv.mjs` + `node -e` package.json guard | ❌ | ⬜ pending |
| 16-03-01 | 03 | 3 | PERF-01, PERF-02 | plan-03 `<threat_model>` (prod-DB residue) | Fresh `npm run build` → `npm run measure:cwv` against warm prod; 13 artifacts produced; zero `*test.local` residue | artifact | `test -s` per report/JSON artifact | ❌ | ⬜ pending |
| 16-03-02 | 03 | 3 | PERF-02 | — | Human plausibility review of baseline numbers before freezing | manual | `<human-check>` (see Manual-Only below) | — | ⬜ pending |
| 16-03-03 | 03 | 3 | PERF-02 | — | Baseline committed as the immutable Phase-17 before-reference | CLI | `git status --porcelain` clean after commit | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/__tests__/measure-cwv-lib.test.ts` — unit tests for all 7 lib exports (median, computeMedians, extractMetrics, getBundleKb, classifyBottleneck, renderRouteReport incl. chunkPaths fingerprint listing, renderSummary) — created in 16-01 Task 2
- [ ] `scripts/__tests__/fixtures/route-bundle-stats.fixture.json` — bundle-stats fixture mirroring `.next/diagnostics/route-bundle-stats.json` shape — created in 16-01 Task 2
- [x] Framework install — none needed (vitest already configured; lighthouse@13.3.0 + puppeteer-core@24.43.1 already installed; zero new packages per T-16-SC)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Baseline plausibility before freeze | PERF-02 | Lab medians need human sanity-check against 13-PERF-REAL priors (e.g. /habitat-era numbers) and obvious-anomaly screening (a 0ms LCP or 100 Perf on the heaviest route signals a login-shell or cache artifact) before the baseline becomes the immutable Phase-17 reference | Plan 16-03 Task 2 checkpoint: review the 4 per-route reports + cross-route summary; approve or reject the run |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (8/8 mapped above; 16-03-02 is an intentional human checkpoint)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (both W0 files created by 16-01 Task 2 before any harness code exists)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-01
