---
phase: 21
slug: dashboard-my-deck
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-21
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Skeleton created at plan-phase (step 5.5) from `21-RESEARCH.md` §"Validation Architecture".
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

> **e2e gotcha (carried from Phases 19–20):** `playwright.config.ts` has `webServer: undefined` + `baseURL: localhost:3000` — a fresh `npm run dev` must already be running on :3000. Long-running dev servers degrade; **kill + restart dev before any e2e gate.** Prefer specific/`{exact:true}` locators (generic names collide with the Next.js dev-tools button).
> **biome gotcha:** `biome ci .` is never repo-clean (~429 pre-existing errors across 334 files; git hooks disabled). Scope any biome gate to the **touched files** (`npx biome ci <files…>`), never the whole repo.

---

## Sampling Rate

- **After every task commit:** Run `npm test` (quick).
- **After every plan wave:** Run `npm test && npm run test:e2e` (full).
- **Before `/gsd:verify-work`:** Full suite must be green; `tsc --noEmit` and `biome ci <touched files>` clean.
- **Max feedback latency:** ~20s (unit); e2e on wave boundaries only.

---

## Per-Task Verification Map

> Filled after planning. One row per task; map each task to its requirement (DSH-01…DSH-07), decision (D-01…D-06), test type, and command. This phase is a **presentation-only re-skin** — most automated coverage is *behavior-preservation* (existing dashboard/deck/card/habitat unit + e2e stay green after selectors are retargeted) plus a few net-new assertable behaviors (accordion toggle, popover open + create flow, HabitatMedallion progress/L9/cooldown math). Pure visual fidelity is human UAT (see below).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | DSH-01 | — | N/A (presentation) | unit/e2e | `npm test` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Per `21-RESEARCH.md`, the dominant work is **behavior-preservation** (retarget existing specs so they survive the re-skin) plus a small set of net-new assertable behaviors:

- [ ] **e2e retargeting (behavior-preservation, not net-new features):** repair the specs the re-skin breaks — retarget literal-text/`data-slot`/`role` locators to role+accessible-name or `data-testid`, preserving each assertion's intent. Known breakers from research: `e2e/08-deck-switching.spec.ts` (loses `data-slot="select-trigger"` + `role="option"` → popover), `e2e/12-pause-cards.spec.ts` ("All cards are paused — unpause one to study." copy change), `e2e/10-mobile-responsive.spec.ts` + `e2e/01-auth-signup-login.spec.ts` ("Sign out" text → glyph icon button), `e2e/07-habitat-display.spec.ts:12` (`/\/.*cards/` → `/\d+ of \d+ cards/`), source-tag "word list"→"Curated"/"manual"→"Added by you" (grep `e2e/05-card-management` **and** `e2e/14-qa-parity` — the latter not yet grep-verified). Add changed specs to the owning plan's `files_modified`.
- [ ] **`e2e/09-language-breakdown.spec.ts` rework (feature removal, D-02):** tests 1 & 3 assert the "My Deck" heading / cross-language breakdown that this phase removes from the UI. Rewrite to assert the new "N learned" accordion header (active deck) and drop the removed-UI assertions — do NOT re-add the old UI to satisfy the stale assertions.
- [ ] **Accordion toggle (D-03):** component/e2e test asserting "Your words" is collapsed by default and expands on click (button `aria-expanded` false→true; rows + search appear only when open).
- [ ] **HabitatMedallion logic (D-05/D-06):** component test for progress-ring math, the **L9 max** branch (gold ring/badge, "Course 1 complete", no next-level line; `nextLevelThreshold === null`), and the cooldown variant (napping treatment over a still-accurate ring, progress NOT zeroed).
- [ ] **`data-testid` future-proofing:** add `data-testid="browse-words-empty"` to the empty-deck "Browse words" link (`e2e/helpers.ts:164` depends on it) and `data-testid`s to scope any new strict-mode-risky locators.

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (e2e retargeting + accordion/medallion net-new tests)
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s (unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
