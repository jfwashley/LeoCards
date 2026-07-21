---
phase: 26
slug: performance-batch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-21
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit/component) + Playwright (e2e) + scripts/qa-run.mjs (core-journey harness) |
| **Config file** | vitest.config.ts / playwright.config.ts |
| **Quick run command** | `npx vitest run <touched test files>` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~90 seconds (full vitest) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched test files>`
- **After every plan wave:** Run `npx tsc --noEmit && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green; `npm run qa:run` green for study/SRS-touching waves (17-CONTEXT D-10)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner) | — | — | PERF-07..11 | — | — | unit | `npx vitest run` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] (filled by planner — expected: db.batch round-trip-count assertion mock update in study/complete route.test.ts; NEW translate route test file; saveImageCards multi-row rewrite of deck-actions tests)

*Existing infrastructure covers the frameworks; no new framework installs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Saving your progress…" feels shorter | PERF-07 | D-02: timing gates on save paths flake — proof is round-trip count; stopwatch note goes in summary | Before/after study-commit stopwatch observation |
| Prod response header on clips | PERF-11 | Vercel prod serving differs from dev | `curl -I` a `/habitat/clips/*` URL post-deploy, check `Cache-Control: public, max-age=31536000, immutable` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
