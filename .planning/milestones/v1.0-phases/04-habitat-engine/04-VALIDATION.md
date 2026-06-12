---
phase: 4
slug: habitat-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | HAB-01, HAB-06 | unit | `npx vitest run src/lib/habitat-engine.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | HAB-01 | integration | `npx tsc --noEmit src/lib/habitat-queries.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | HAB-01, HAB-06 | integration | `npx tsc --noEmit src/app/api/habitat/route.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/habitat-engine.test.ts` — stubs for decay computation, mood classification, level derivation, recovery, edge cases

*Existing vitest infrastructure covers framework needs — no new framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GET /api/habitat returns correct state for active user | HAB-01 | Requires auth session + real DB | Login, study cards, fetch /api/habitat, verify JSON |
| Decay appears after 2+ days inactivity | HAB-06 | Time-based behavior | Manually set lastActivityAt to 5 days ago in DB, fetch /api/habitat |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
