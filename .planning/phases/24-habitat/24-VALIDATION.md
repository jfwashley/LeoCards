---
phase: 24
slug: habitat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-24
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 24-RESEARCH.md § Validation Architecture. Per-task IDs are filled once plans exist (planner references this file).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (node environment — no jsdom by default) |
| **Config file** | `vitest.config.ts` (repo root) |
| **Quick run command** | `npx vitest run src/components/__tests__/habitat-video.test.ts src/lib/__tests__/habitat-names.test.ts` |
| **Full suite command** | `npx vitest run` |
| **e2e command** | `npx playwright test e2e/07-habitat-display.spec.ts e2e/13-habitat-3d.spec.ts e2e/13-habitat-states.spec.ts e2e/24-habitat-celebration.spec.ts` |
| **Estimated runtime** | unit ~seconds; e2e per-project (web→mobile) on a fresh harness-managed dev server |

---

## Sampling Rate

- **After every task commit:** `npx vitest run` (full unit suite — seconds)
- **After every plan wave:** `npx vitest run` + the habitat e2e specs above (per-project: `--project=web` then `--project=mobile`)
- **Before `/gsd:verify-work`:** Full unit + full habitat e2e must be green
- **Max feedback latency:** < 30 seconds (unit)

---

## Per-Requirement Verification Map

Task IDs are assigned at planning; rows below bind each requirement to its test type + command (from 24-RESEARCH.md § Phase Requirements → Test Map).

| Requirement | Behavior | Test Type | Automated Command | File | Status |
|-------------|----------|-----------|-------------------|------|--------|
| HAB-01 | Video wrapper keeps 16/9 aspect ratio + max-height (contained card) | unit (source) | `npx vitest run src/components/__tests__/habitat-scene-video.test.ts` | ✅ exists | ⬜ pending |
| HAB-01 | `H_NAME` returns correct level name 1–9 | unit | `npx vitest run src/lib/__tests__/habitat-names.test.ts` | ❌ W0 | ⬜ pending |
| HAB-01 | `H_NEXT` returns unlock for 1–8, undefined at L9 | unit | `npx vitest run src/lib/__tests__/habitat-names.test.ts` | ❌ W0 | ⬜ pending |
| HAB-02 | `moodTint` returns correct wash per mood | unit | `npx vitest run src/components/__tests__/habitat-tint.test.ts` | ❌ W0 | ⬜ pending |
| HAB-02 | L9 golden-hour tint distinct from mood tint | unit | same | ❌ W0 | ⬜ pending |
| HAB-02 | `isDecaying` adds the grey wash | unit | same | ❌ W0 | ⬜ pending |
| HAB-03 | pct = effectiveCardCount / nextLevelThreshold × 100, capped 100 | unit | `npx vitest run src/components/__tests__/habitat-prog-card.test.ts` | ❌ W0 | ⬜ pending |
| HAB-03 | pct = 100 + "Course 1 complete" when `nextLevelThreshold === null` | unit | same | ❌ W0 | ⬜ pending |
| HAB-04 | `celebratingLevel` triggers celebration on mount | unit (source) | `npx vitest run src/components/__tests__/habitat-scene-video.test.ts` | ✅ extend | ⬜ pending |
| HAB-04 | No confetti under reduced-motion; "Motion paused" label present | unit (source) | `npx vitest run src/components/__tests__/habitat-celebration.test.ts` | ❌ W0 | ⬜ pending |
| HAB-04 | Mobile freeze: pause timer set for mobile, not desktop | unit (logic) | `npx vitest run src/components/__tests__/habitat-video.test.ts` | ✅ extend | ⬜ pending |
| HAB-05 | /habitat shows mood chip + level badge | e2e | `npx playwright test e2e/07-habitat-display.spec.ts` | ✅ retarget | ⬜ pending |
| HAB-05 | Level-up celebration fires on `?celebrate=N` | e2e | `npx playwright test e2e/24-habitat-celebration.spec.ts` | ❌ W0 | ⬜ pending |
| HAB-05 | Offline banner appears when offline | manual | network throttle | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

New test files to create before implementation:
- [ ] `src/lib/__tests__/habitat-names.test.ts` — H_NAME / H_NEXT constants (HAB-01, HAB-03)
- [ ] `src/components/__tests__/habitat-tint.test.ts` — mood tint helper + golden-hour + decay wash (HAB-02)
- [ ] `src/components/__tests__/habitat-prog-card.test.ts` — pct formula + card-content derivation incl. L9 (HAB-03)
- [ ] `src/components/__tests__/habitat-celebration.test.ts` — confetti gate + "Motion paused" + auto-settle timer (HAB-04/05)
- [ ] `e2e/24-habitat-celebration.spec.ts` — navigate `/habitat?celebrate=5`, assert overlay appears then disappears ~3s (HAB-05)

Existing test files to extend:
- `src/components/__tests__/habitat-video.test.ts` — mobile freeze logic (isMobile branch, IntersectionObserver, pause timer)
- `src/components/__tests__/habitat-scene-video.test.ts` — source-grep that `celebratingLevel` is consumed (not `_celebratingLevel`)
- `e2e/07-habitat-display.spec.ts` — retarget `getByText("Level")` → `getByTestId("habitat-level-badge")`, mood → `getByTestId("habitat-mood-chip")`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Offline banner / cached scene | HAB-05 | Requires real network-loss simulation | DevTools → Network → Offline, reload /habitat, confirm cached scene + banner |
| Mobile play-then-freeze feel | HAB-04 | Subjective timing/feel + real device | On mobile viewport, confirm clip plays then freezes to still; tune freeze window |
| Pixel fidelity vs Daybreak mock | HAB-01..05 | Visual judgment | Compare overlays/tint to `design/handoff-daybreak/LeoCards Daybreak Habitat.html` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
