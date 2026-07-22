---
phase: 27
slug: performance-batch-2
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit/component) + Playwright (e2e) + scripts/qa-run.mjs (SRS correctness) |
| **Config file** | vitest.config.ts / playwright.config.ts |
| **Quick run command** | `npx vitest run <touched test files>` |
| **Full suite command** | `npm test` (full vitest), e2e batches per project, `npm run qa:run` after study/SRS waves |
| **Estimated runtime** | ~90 seconds (full vitest) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` scoped to touched test files
- **After every plan wave:** Run full vitest; `qa:run` after any wave touching study/SRS paths (items 8, 12, 17 — 17 D-10)
- **Before `/gsd:verify-work`:** Full suite must be green; full `tsc --noEmit` AFTER the e2e wave (Phase 23 lesson)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

*(Filled by planner — per D-09 all proofs are count/round-trip/source assertions, never timing gates in tests; perf wall-time observations are prod-build-only informal notes per D-10.)*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| — | — | — | PERF-12..23 | — | — | unit/e2e | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Research identified four coverage gaps needing new test files before/alongside implementation:

- [ ] session-lookup dedupe/cookieCache tests (item 8 / PERF-12) — no existing auth-session test file
- [ ] `translation-form.tsx` stale-response race tests (item 15 / PERF-19) — no existing test file
- [ ] dashboard query-layer consolidation tests (item 12 / PERF-16) — no existing query-layer test file
- [ ] browse-page data-shaping tests (item 11 / PERF-15) — no existing test file

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Haiku extraction quality parity | PERF-17 (item 13) | Phase 10 eval reference-set is incomplete carried debt (D-05) | Manual side-by-side on a few real photos vs claude-sonnet-4-6 output |
| Streaming threshold decision | PERF-17 (item 13) | D-06: median end-to-end extraction wall-time on real photos, prod-like build | Stopwatch median; if > ~4s on Haiku, streaming lands same phase |
| Blur-removal visual check | PERF-22 (item 18) | Pixel-level judgment over video | Eyeball habitat overlays at prod build; trivially revertible |
| Neon index db:push | PERF-18 (item 14) | Hosted-DB write gated on Josh's explicit authorization (D-08) | `npm run db:push` with DATABASE_URL exported (not auto-loaded from .env.local) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
