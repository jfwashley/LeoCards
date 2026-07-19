---
phase: 25
slug: my-account
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-19
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (unit/component, jsdom + @testing-library/react) + Playwright (e2e, web/mobile projects) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npx vitest run <touched test files>` |
| **Full suite command** | `npx vitest run` (~2079 tests) |
| **Estimated runtime** | quick ~5–20 s; full ~90–150 s |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <owning plan's test files>`
- **After every plan wave:** Run full `npx tsc --noEmit` + `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green (known parallel-load flakes: `cooldown-config.test.ts`, `bw-atoms.test.tsx` — isolate before treating a 5s-timeout as a regression)
- **Max feedback latency:** 150 seconds

---

## Per-Task Verification Map

*To be populated by the planner (gsd-planner) from the plan task breakdown.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*To be populated by the planner — Wave-0 test scaffolds per the established LeoCards pattern (Phase 24 precedent: scaffold tests may stay RED until later waves land their sources; only the wave-owned tests gate that wave).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email-change verification link lands in a real inbox (Resend send) | ACC (email change) | Requires a live inbox; e2e cannot receive email | Trigger email change with a real address; click link; assert email swapped + pending state cleared |
| Visual mock-fidelity of the Daybreak-styled /account on desktop + mobile | ACC (Daybreak styling) | No hi-fi mock exists — UI-SPEC fidelity is a human judgment | Compare rendered page against 25-UI-SPEC.md contracts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 150s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
