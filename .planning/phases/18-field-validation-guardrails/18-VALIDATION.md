---
phase: 18
slug: field-validation-guardrails
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit, `scripts/__tests__/`) + Playwright (e2e) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npx vitest run scripts/__tests__/` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~60 seconds (unit) / minutes (e2e, prod-build-gated) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run scripts/__tests__/`
- **After every plan wave:** Run full unit suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(filled by planner)_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure (vitest + `scripts/__tests__/` + Playwright e2e) covers all phase requirements — the D-13 gate-evaluator tests extend the existing `measure-cwv-lib` test file pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel dashboard Speed Insights toggle + p75 readout | PERF-05 | External SaaS dashboard, no API on Hobby tier | Josh enables Speed Insights in Vercel dashboard; reads per-route p75 after the 14-day window |
| Live red-path demo against deployed prod | PERF-06 | Requires real prod run with env-override thresholds | Run re-cert command with impossible threshold override (e.g. `GATE_TBT=10`); confirm red table + non-zero exit; commit output as evidence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
