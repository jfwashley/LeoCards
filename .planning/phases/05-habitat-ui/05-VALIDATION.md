---
phase: 05
slug: habitat-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 05-01-01 | 01 | 1 | HAB-02, HAB-03 | smoke | `npx vitest run` | ✅ (existing tests) | ⬜ pending |
| 05-02-01 | 02 | 1 | HAB-02 | unit | `npx vitest run src/components/tiger-sprite.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | HAB-02 | unit | `npx vitest run src/components/tiger-sprite.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | HAB-03 | unit | `npx vitest run src/components/habitat-layers.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | HAB-03 | unit | `npx vitest run src/components/habitat-layers.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/tiger-sprite.test.ts` — stubs for HAB-02 mood→texture mapping and transition direction logic
- [ ] `src/components/habitat-layers.test.ts` — stubs for HAB-03 level→layers mapping and decay alpha calculation

*Existing infrastructure covers framework install — Vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tiger sprite renders visually correct mood pose | HAB-02 | PixiJS canvas pixel output not testable in node | Open /habitat page, verify tiger matches computed mood |
| Habitat background layers visually change per level | HAB-03 | Canvas rendering not testable in node | Compare Level 1 vs Level 5 vs Level 10 in browser |
| Scene runs at consistent frame rate on mobile | HAB-02/03 | Performance testing requires real device | Open /habitat on mid-range phone, check for jank |
| Ticker pauses when tab is hidden | HAB-02/03 | Requires browser visibility API interaction | Switch tabs, verify CPU drops via DevTools |
| Mini widget renders and links to /habitat | HAB-02 | Requires browser interaction | Click dashboard widget, verify navigation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
