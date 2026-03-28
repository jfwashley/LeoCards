---
phase: 05
slug: habitat-ui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | HAB-02, HAB-03 | smoke | `npx vitest run` | existing tests | pending |
| 05-01-02 | 01 | 1 | HAB-02, HAB-03 | build | `npx next build` | n/a (build check) | pending |
| 05-02-01 | 02 | 2 | HAB-02, HAB-03 | unit | `npx vitest run src/lib/__tests__/habitat-ui-utils.test.ts` | created in task (TDD) | pending |
| 05-02-02 | 02 | 2 | HAB-02, HAB-03 | build | `npx vitest run src/lib/__tests__/habitat-ui-utils.test.ts && npx next build` | created in 05-02-01 | pending |
| 05-03-01 | 03 | 3 | HAB-02, HAB-03 | build | `npx next build` | n/a (build check) | pending |
| 05-03-02 | 03 | 3 | HAB-02, HAB-03 | build | `npx next build` | n/a (build check) | pending |
| 05-03-03 | 03 | 3 | HAB-02, HAB-03 | manual | human-verify checkpoint | n/a | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

None — all automated verification uses either existing test infrastructure (Vitest suite), the build check (`npx next build`), or test files created inline by TDD tasks (Plan 02 Task 1 creates `src/lib/__tests__/habitat-ui-utils.test.ts` as part of its RED-GREEN cycle).

*Existing infrastructure covers framework install — Vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tiger sprite renders visually correct mood pose | HAB-02 | PixiJS canvas pixel output not testable in node | Open /habitat page, verify tiger matches computed mood |
| Tiger sprite appears at random position with random facing | HAB-02 | Visual canvas output, randomness | Refresh /habitat multiple times, verify position varies |
| Habitat background layers visually change per level | HAB-03 | Canvas rendering not testable in node | Compare Level 1 vs Level 5 vs Level 10 in browser |
| Scene runs at consistent frame rate on mobile | HAB-02/03 | Performance testing requires real device | Open /habitat on mid-range phone, check for jank |
| Ticker pauses when tab is hidden | HAB-02/03 | Requires browser visibility API interaction | Switch tabs, verify CPU drops via DevTools |
| Mini widget renders and links to /habitat | HAB-02 | Requires browser interaction | Click dashboard widget, verify navigation |
| Mood transitions (bounce/crossfade) animate correctly | HAB-02 | Visual animation timing | Trigger mood changes, observe transition type |
| Sparkle particles appear for excited mood | HAB-02 | Canvas particle rendering | Set mood to excited, verify sparkles visible |

Note: The pure logic behind mood transitions (`getMoodTransitionType`), layer visibility (`getLayersForLevel`), and decay alpha (`getDecayAlpha`) IS tested automatically via `src/lib/__tests__/habitat-ui-utils.test.ts` in Plan 02. Only the PixiJS rendering of those values is manual-only.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
