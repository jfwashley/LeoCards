---
phase: 3
slug: study-engine-and-study-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | STUDY-03 | unit | `npx vitest run src/lib/study-engine.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | STUDY-05 | unit | `npx vitest run src/lib/study-engine.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | STUDY-01 | unit | `npx vitest run src/lib/study-engine.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | STUDY-04 | integration | `npx vitest run src/app/api/study/complete.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | STUDY-02 | manual | N/A (swipe gesture) | N/A | ⬜ pending |
| 03-03-02 | 03 | 2 | STUDY-06 | manual | N/A (card stack visual) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/study-engine.test.ts` — stubs for card selection, mastery progression, resurface logic
- [ ] `src/app/api/study/complete.test.ts` — stubs for batch commit, transaction integrity

*Existing vitest infrastructure covers framework needs — no new framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Swipe right/left grades card | STUDY-02 | Gesture interaction requires browser | Open /study, swipe right on card, verify grade recorded |
| 3D card flip animation | STUDY-02 | Visual animation quality | Open /study, tap card, verify smooth 3D flip |
| Card stack visual thins | STUDY-06 | Visual feedback, not a progress bar | Study through cards, observe stack edges reduce |
| Session end tiger emoji | N/A | Visual placeholder | Complete session, verify 🐯 appears with stats |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
