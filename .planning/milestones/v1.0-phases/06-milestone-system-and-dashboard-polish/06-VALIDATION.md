---
phase: 6
slug: milestone-system-and-dashboard-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 6 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~4 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | HAB-04 | unit | `npx vitest run src/lib/milestone-queries.test.ts` | created by task | pending |
| 06-01-02 | 01 | 1 | HAB-04 | unit | `npx vitest run --reporter=verbose` | N/A (integration) | pending |
| 06-02-01 | 02 | 2 | HAB-04 | manual | N/A -- visual overlay | N/A | pending |
| 06-02-02 | 02 | 2 | HAB-04, HAB-05 | manual | N/A -- PixiJS animation + celebrate param wiring | N/A | pending |
| 06-02-03 | 02 | 2 | HAB-04, HAB-05 | checkpoint | N/A -- human-verify | N/A | pending |
| 06-03-01 | 03 | 2 | HAB-07 | unit | `npx vitest run --reporter=verbose` | N/A (uses existing) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Task 06-01-01 creates `src/lib/milestone-queries.test.ts` as part of its TDD flow

*Existing infrastructure covers test framework -- no new dependencies needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fullscreen celebration overlay | HAB-04 | Visual UI with animation | Complete study session that causes level-up, verify overlay appears with confetti and level number, dismiss it |
| Bird fly-in animation | HAB-05 | PixiJS canvas animation | Reach level 10, dismiss overlay, verify ?celebrate=10 in URL, verify bird flies in from off-screen and remains in habitat on subsequent visits |
| Celebration exactly-once (server) | HAB-04 | Stateful UI behavior | Level up, see celebration, then complete another session without leveling up -- verify NO overlay appears. Also refresh page and verify no replay. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
