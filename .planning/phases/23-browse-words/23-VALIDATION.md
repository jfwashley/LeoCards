---
phase: 23
slug: browse-words
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-23
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from 23-RESEARCH.md §Validation Architecture at plan time; the
> Per-Task Verification Map is completed with real task IDs after the planner runs.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit + rendered-component via jsdom + @testing-library/react) · Playwright (e2e) |
| **Config file** | `vitest.config.ts` · `playwright.config.ts` |
| **Quick run command** | `npx vitest run` (scope to touched files during execution) |
| **Full suite command** | `npx vitest run` then `npx playwright test` |
| **Estimated runtime** | unit ~seconds (scoped) / full unit ~tens of seconds; e2e per-spec ~1–2 min |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched test files>`
- **After every plan wave:** Run `npx vitest run` (full unit) + the relevant `npx playwright test e2e/03-word-list-browser.spec.ts`
- **Before `/gsd:verify-work`:** Full unit suite green + Browse e2e green (restart a fresh dev server before the e2e batch — project lesson)
- **Max feedback latency:** < 30 seconds for the scoped unit loop

---

## Per-Task Verification Map

> Populated with concrete task IDs after planning. Requirement-level seed below
> (from 23-RESEARCH.md §Validation Architecture) — the Nyquist auditor maps each
> planned task onto these rows.

| Requirement | Validates | Test Type | Automated Command | Notes |
|-------------|-----------|-----------|-------------------|-------|
| BRW-01 | Topic-tiles landing: 14 category tiles, medallion icons, real per-pair counts | rendered-component + e2e | `npx vitest run` / `npx playwright test e2e/03-word-list-browser.spec.ts` | Counts computed from `getWordList` (D-07), not mock placeholders |
| BRW-02 | Per-topic list: back-to-topics nav, topic header, CEFR level-tile row, context line | rendered-component + e2e | `npx vitest run` / `npx playwright test e2e/03-…` | `?topic=` routing (D-01); two-step nav (landing → topic) |
| BRW-03 | Row A (native-on-top + target marker), circular toggle, **optimistic add/remove, row-local error, scroll-stable** | **rendered-component (MANDATORY)** + e2e | `npx vitest run` / `npx playwright test e2e/03-…` | Project lesson: optimistic/inline UI needs a rendered-component test, NOT reducer-only. Covers D-05 orientation + D-06 spinner/error-no-layout-shift |
| BRW-04 | States: full list (All), level-filtered, empty result ("No words at this level" + "Show all levels" reset) | rendered-component | `npx vitest run` | Empty-state reset returns CEFR → All (D-09) |
| D-03 (entry) | "Browse words ›" link on Add-a-Card landing header (type + image-Pick, not stepper) | rendered-component + e2e | `npx vitest run` / Add-a-Card spec | Open question A2 — confirm image-Pick `ACTop` presence before testing that path |

---

## Wave 0 Requirements

- [x] Vitest + jsdom + @testing-library/react — already installed (Phase 19); rendered-component tests use the `@vitest-environment jsdom` docblock + `afterEach(cleanup)` pattern.
- [x] Playwright — configured; `e2e/03-word-list-browser.spec.ts` exists and must be retargeted off literal/CSS-class locators (L-06 — see RESEARCH.md §e2e audit) before/with the re-skin.

*Existing infrastructure covers all phase requirements — no new framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel/visual fidelity vs the Daybreak mock | BRW-01..04 | Visual match to `daybreak-browse.jsx` + boards is not assertable in unit/e2e | UI auditor / human UAT against `design/handoff-daybreak/LeoCards Daybreak Browse Words.html` |

*All behavioral logic has automated verification; only visual fidelity is manual.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
