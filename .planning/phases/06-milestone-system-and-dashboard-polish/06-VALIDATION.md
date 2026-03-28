---
phase: 6
slug: milestone-system-and-dashboard-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 6 — Validation Strategy

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
| 06-01-01 | 01 | 1 | HAB-04 | unit | `npx vitest run src/lib/habitat-engine.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | HAB-04 | unit | `npx vitest run src/lib/habitat-engine.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | HAB-04 | manual | N/A — visual overlay | N/A | ⬜ pending |
| 06-02-02 | 02 | 1 | HAB-05 | manual | N/A — PixiJS animation | N/A | ⬜ pending |
| 06-03-01 | 03 | 1 | HAB-07 | unit | `npx vitest run src/lib/habitat-queries.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add level-up detection tests to `src/lib/habitat-engine.test.ts`
- [ ] Create `src/lib/habitat-queries.test.ts` for language breakdown query tests

*Existing infrastructure covers test framework — no new dependencies needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fullscreen celebration overlay | HAB-04 | Visual UI with animation | Complete study session that causes level-up, verify overlay appears with confetti and level number, dismiss it, verify it doesn't replay on refresh |
| Bird fly-in animation | HAB-05 | PixiJS canvas animation | Reach level 10, verify bird flies in from off-screen and remains in habitat on subsequent visits |
| Celebration exactly-once | HAB-04 | Stateful UI behavior | Level up, see celebration, refresh page, verify celebration doesn't replay |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
