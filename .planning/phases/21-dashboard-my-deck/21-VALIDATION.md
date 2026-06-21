---
phase: 21
slug: dashboard-my-deck
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-21
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Skeleton created at plan-phase (step 5.5) from `21-RESEARCH.md` §"Validation Architecture".
> Per-task rows filled at planning (post-planning Nyquist pass).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x (unit/component, @testing-library/react 16.x) + Playwright (e2e) |
| **Config file** | `vitest.config.ts` (environment: node — component tests need `// @vitest-environment jsdom` docblock), `playwright.config.ts` |
| **Quick run command** | `npm test` (`vitest run`) |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | unit ~10–20s; e2e variable (Turbopack cold-compiles routes on first hit — budget 180s timeouts) |

> **e2e gotcha (carried from Phases 19–20):** `playwright.config.ts` has `webServer: undefined` + `baseURL: localhost:3000` — a fresh `npm run dev` must already be running on :3000. Long-running dev servers degrade; **kill + restart dev before any e2e gate.** Prefer specific/`{exact:true}` locators (generic names collide with the Next.js dev-tools button).
> **biome gotcha:** `biome ci .` is never repo-clean (~429 pre-existing errors across 334 files; git hooks disabled). Scope any biome gate to the **touched files** (`npx biome ci <files…>`), never the whole repo.
> **component-test convention:** copy `src/components/__tests__/level-up-overlay.test.tsx` — `// @vitest-environment jsdom` docblock, `afterEach(cleanup)`, `vi.mock("@/hooks/use-prefers-reduced-motion")`, `@testing-library/react`.

---

## Sampling Rate

- **After every task commit:** Run the task's component test (or `npm test` quick).
- **After every plan wave:** Run `npm test` (full unit) + the e2e specs the wave touched (after a fresh `npm run dev`).
- **Before `/gsd:verify-work`:** Full suite green; `tsc --noEmit` and `npx biome ci <touched files>` clean.
- **Max feedback latency:** ~20s (unit); e2e on wave boundaries only.

---

## Per-Task Verification Map

> This phase is a **presentation-only re-skin** — coverage is *behavior-preservation* (existing dashboard/deck/card/habitat unit + e2e stay green after selectors are retargeted) plus a few net-new assertable behaviors (popover open + create, HabitatMedallion progress/L9/cooldown math, accordion toggle, native-on-top rows, status-row state machine, edit-modal flow). Pure visual fidelity is human UAT (below).

| Task ID | Plan | Wave | Requirement | Decision | Threat Ref | Test Type | Automated Command | Status |
|---------|------|------|-------------|----------|------------|-----------|-------------------|--------|
| 21-01-01 | 01 | 1 | DSH-01 | — | T-21-01-T | unit (typecheck) | `npx tsc --noEmit` | ⬜ pending |
| 21-01-02 | 01 | 1 | DSH-02 | D-02 | T-21-01-I | unit (behavior-preservation) | `npx tsc --noEmit` (no `languageBreakdown` refs) | ⬜ pending |
| 21-01-03 | 01 | 1 | DSH-01/02 | D-02 | — | gate | `npx tsc --noEmit && npm test && npx biome ci <3 files>` | ⬜ pending |
| 21-02-01 | 02 | 2 | DSH-01 | D-01 | T-21-02-E | unit | `npx vitest run src/components/__tests__/deck-switcher.test.tsx` | ⬜ pending |
| 21-02-02 | 02 | 2 | DSH-01 | D-01, L-01 | T-21-02-S | unit (typecheck) | `npx tsc --noEmit` (app-header / logout-button) | ⬜ pending |
| 21-02-03 | 02 | 2 | DSH-01 | L-06 | — | e2e (retarget) | `npm run test:e2e -- e2e/08-deck-switching.spec.ts e2e/10-mobile-responsive.spec.ts e2e/01-auth-signup-login.spec.ts` (wave gate) | ⬜ pending |
| 21-03-01 | 03 | 1 | DSH-02 | D-05, D-06 | T-21-03-T | unit (net-new) | `npx vitest run src/components/habitat-medallion.test.tsx` | ⬜ pending |
| 21-03-02 | 03 | 1 | DSH-02 | D-05, D-06 | T-21-03-T | unit (net-new) | `npx vitest run src/components/habitat-medallion.test.tsx` | ⬜ pending |
| 21-04-01 | 04 | 2 | DSH-02/03/07 | L-05, D-06 | T-21-04-T | unit (net-new) | `npx vitest run src/components/deck-view.test.tsx` | ⬜ pending |
| 21-04-02 | 04 | 2 | DSH-02/03/07 | L-06, D-02 | — | e2e (rewrite/retarget) | `npm run test:e2e -- e2e/09-language-breakdown.spec.ts e2e/12-pause-cards.spec.ts e2e/07-habitat-display.spec.ts` (wave gate) | ⬜ pending |
| 21-05-01 | 05 | 1 | DSH-04/05 | D-03, D-04 | T-21-05-I | unit (net-new) | `npx vitest run src/components/card-list.test.tsx` | ⬜ pending |
| 21-05-02 | 05 | 1 | DSH-06 | — | T-21-05-E | unit (net-new) | `npx vitest run src/components/card-edit-dialog.test.tsx` | ⬜ pending |
| 21-05-03 | 05 | 1 | DSH-04/07 | L-06 | — | e2e (retarget) | `npm run test:e2e -- e2e/05-card-management.spec.ts e2e/02-first-visit-deck-creation.spec.ts` (overall gate) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Per `21-RESEARCH.md`, the dominant work is **behavior-preservation** (retarget existing specs so they survive the re-skin) plus a small set of net-new assertable behaviors. All addressed by the plans above:

- [x] **e2e retargeting (behavior-preservation):** distributed across plans — Plan 02 owns `08-deck-switching` (Select→Popover testids), `10-mobile-responsive` + `01-auth-signup-login` ("Sign out" → role+name); Plan 04 owns `12-pause-cards` ("All paused"), `09-language-breakdown` (feature-removal rewrite), `07-habitat-display` (`.bg-secondary.rounded-full` → medallion testid + `/\d+ of \d+ cards/`); Plan 05 owns `05-card-management` + `02-first-visit-deck-creation` (search inside accordion + pre-existing "No cards match" fix) + `helpers.ts` (`browse-words-empty` testid). **Resolved open question:** grep confirmed `14-qa-parity.spec.ts` does NOT reference "word list"/"manual"/source-tag copy — no retarget needed there.
- [x] **`e2e/09-language-breakdown.spec.ts` rework (feature removal, D-02):** Plan 04 Task 2 rewrites tests 1 & 3 to assert the new "N learned" accordion header (`/\d+ learned/` / `data-testid="words-accordion-header"`, added by Plan 05) + the habitat hero, dropping the removed "My Deck" assertions.
- [x] **Accordion toggle (D-03):** Plan 05 `card-list.test.tsx` — collapsed-by-default (aria-expanded false), expands on click (search + rows appear only when open).
- [x] **HabitatMedallion logic (D-05/D-06):** Plan 03 `habitat-medallion.test.tsx` — progress-ring math, the L9 max branch (gold ring/badge, "Course 1 complete", no next-line; `nextLevelThreshold === null`), and the cooldown variant (ring NOT zeroed/greyed — D-06 guard).
- [x] **Status-row state machine (DSH-03):** Plan 04 `deck-view.test.tsx` — due/none/cooldown ("Resting · countdown")/all-paused; "Browse words" absent, "Add a card" present.
- [x] **Native-on-top rows + source tags + mastery (DSH-05, D-04):** Plan 05 `card-list.test.tsx` — front-before-back DOM order, Curated/Added-by-you/Paused, 3-bar meter green+check at 3/3.
- [x] **Edit-modal flow (DSH-06):** Plan 05 `card-edit-dialog.test.tsx` — TField/TBtn render + Save→editCard + delete-confirm→deleteCard.
- [x] **`data-testid` future-proofing:** Plan 05 adds `data-testid="browse-words-empty"` (empty-deck link, helper depends on it), `words-accordion-header`, `words-search-input`; Plan 02 adds `deck-picker-trigger`/`new-deck-row`/`deck-option-{lang}`; Plan 03 adds `habitat-medallion`; Plan 04 adds `add-a-card`.

*Existing vitest + Playwright infrastructure otherwise covers all phase requirements (behavior preserved). `getLanguageBreakdown`'s own unit tests in `milestone-queries` are retained — the function stays; only its UI consumer is removed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Persistent header matches Daybreak (LionFace + wordmark not 🐯, compact deck pill, logout glyph) | DSH-01 / D-01 | Pixel fidelity vs `daybreak-dashboard.jsx` TopBar | Load dashboard; compare header to the mock; open the deck popover; verify the `+ New deck` chips + per-language creating/error states |
| Habitat hero medallion (LionFace on sunrise disc, conic progress ring, level badge, "Habitat · Level N", "X of Y cards to Level N+1", "View habitat →") | DSH-02 / D-05, D-06 | Visual fidelity + state coverage — not auto-checkable | Compare to the mock at a mid level; check L9 (gold + "Course 1 complete", no next-level line) and cooldown (napping Leo over a real progress ring; countdown only in the status row) |
| Action line (amber "Start studying" / dimmed when none due; status row "12 due"/"0 due"/"Resting · 2h 15m"/"All paused"; "Add a card"; no "Browse words") | DSH-03 / L-05 | Visual + state fidelity | Cycle the four states; verify "Browse words" is gone from the populated action line but present in the empty-deck state |
| "Your words" rows — Daybreak styling with **native bold on top / target beneath** (D-04 deliberate override), source tag (Curated/Added by you/Paused), 3-bar mastery (green + check at 3/3), pause+edit icons; paused rows de-emphasised | DSH-04, DSH-05 / D-03, D-04 | Visual fidelity + the intentional handoff deviation | Expand "Your words"; confirm native-on-top (NOT the mock's target-on-top), the mastery meter, and the de-emphasised paused rows |
| Edit-card modal restyled to Daybreak (TField/TBtn), Save/Discard/Delete-with-confirm + error states preserved | DSH-06 | Visual fidelity (behavior is auto-covered) | Open edit; verify Daybreak surface; exercise delete-confirm and a save/delete error |
| All seven DSH-07 states render in Daybreak | DSH-07 | Visual state coverage | Walk cards-due, none-due, resting, all-paused, empty-deck, brand-new-user (= empty-deck), search-no-results |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (every plan task carries an automated command; e2e retarget tasks are gated at wave boundaries with the net-new unit tests providing per-task feedback)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (each plan interleaves unit tests with the retarget tasks)
- [x] Wave 0 covers all MISSING references (e2e retargeting + accordion/medallion/status/rows/modal net-new tests)
- [x] No watch-mode flags
- [x] Feedback latency < 20s (unit)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned (per-task statuses pending execution)
