---
phase: 20
slug: study-screen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-20
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Skeleton created at plan-phase (step 5.5) from `20-RESEARCH.md` §"Validation Architecture".
> Per-task rows are filled once plans exist (post-planning Nyquist pass / verify-phase).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x (unit/component, @testing-library/react 16.x) + Playwright (e2e) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test` (`vitest run`) |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | unit ~10–20s; e2e variable (Turbopack cold-compiles routes on first hit — budget 180s timeouts) |

> **e2e gotcha (carried from Phase 19):** `playwright.config.ts` has `webServer: undefined` + `baseURL: localhost:3000` — a fresh `npm run dev` must already be running on :3000. Long-running dev servers degrade; **kill + restart dev before any e2e gate.** Prefer specific/`{exact:true}` locators (generic "Next" collides with the Next.js dev-tools button).

---

## Sampling Rate

- **After every task commit:** Run `npm test` (quick).
- **After every plan wave:** Run `npm test && npm run test:e2e` (full).
- **Before `/gsd:verify-work`:** Full suite must be green; `tsc --noEmit` and `biome ci .` clean.
- **Max feedback latency:** ~20s (unit); e2e on wave boundaries only.

---

## Per-Task Verification Map

> Filled after planning. One row per task; map each task to its requirement (STU-01/STU-02), decision (D-01…D-06), test type, and command. This phase is a **presentation-only re-skin** — most automated coverage is *behavior-preservation* (existing study unit + e2e stay green) plus a small number of new assertable behaviors (reduced-motion confetti gate, QA-badge mount preserved). Pure visual fidelity is human UAT (see below).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | STU-01 | — | N/A (presentation) | unit/e2e | `npm test` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Reduced-motion confetti gate (D-06) — add a component test asserting the level-up confetti particles do **not** render under `prefers-reduced-motion: reduce` while the Soft-Clay Leo + stats still render. (Per RESEARCH.md, this is the only net-new test gap; existing study e2e covers behavior preservation.)

*Existing vitest + Playwright infrastructure otherwise covers all phase requirements (behavior preserved).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Study card matches Daybreak hi-fi (card surface, GhostPeek stack widths, ALL-CAPS prompt, amber "Tap to reveal" pill, swipe hint pill) | STU-01 / D-01, D-02 | Pixel fidelity vs `hifi-shared.jsx` HiFiStudy — not auto-checkable | Run study session; compare card + ghost-peek stack to the Daybreak hi-fi; verify green/red swipe feedback uses #3E9B5F / #DE5F4A |
| End screen matches Daybreak (LionFace not 🐯, Baloo 2 numerals, amber "learned" hero number, amber "Back to deck") | STU-02 / D-04 | Visual fidelity — human judgement | Finish a session; verify the three stats, LionFace mark, and CTA treatment |
| Level-up overlay Soft-Clay Leo (`widget-l{level}.webp`) + recolored confetti | STU-02 / D-05 | Visual fidelity + asset quality spot-check | Trigger a level-up; verify Soft-Clay Leo renders at correct level, amber confetti palette, "Your habitat grew!" beat + tap-to-dismiss |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (reduced-motion confetti test)
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s (unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
