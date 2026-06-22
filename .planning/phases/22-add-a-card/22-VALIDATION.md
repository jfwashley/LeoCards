---
phase: 22
slug: add-a-card
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 22 is a **presentation-only Daybreak re-skin** of an existing feature — the
> validation strategy is dominated by **keeping existing e2e specs green after selector
> retargeting** (L-06) plus a small number of new behavior guards (D-03 Cancel, D-07 label).
> Full detail lives in `22-RESEARCH.md` § "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (e2e) + Vitest (unit, jsdom) |
| **Config file** | `playwright.config.ts` (`webServer: undefined`, baseURL :3000, workers:1, timeout 180s, retries:1) · `vitest.config.ts` |
| **Quick run command** | `npx playwright test --project=web e2e/04-manual-card-entry.spec.ts` |
| **Full suite command** | `npx playwright test --project=web` then `npx playwright test --project=mobile` (per-project batches — never both in one call) |
| **Estimated runtime** | ~60s quick; full suite minutes (Turbopack cold-compiles routes on first hit) |

**Pre-req:** a fresh `npm run dev` (harness-managed background process) must be running on :3000 before any e2e gate — kill + restart to avoid the degraded-server timeout cascade.

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --project=web e2e/04-manual-card-entry.spec.ts` (< 60s)
- **After every plan wave:** Run `npx playwright test --project=web e2e/04-manual-card-entry.spec.ts e2e/11-phase9-image-upload.spec.ts e2e/09-language-breakdown.spec.ts`
- **Before `/gsd:verify-work`:** Full web + mobile suites green (per-project batches)
- **Max feedback latency:** ~60 seconds (quick run)

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. This map is finalized during planning — each plan
> task carries its own `<acceptance_criteria>` with the concrete automated command. Requirement→behavior mapping below is the contract the planner must satisfy.

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| ADC-01 | Segmented toggle ("Type a word \| From an image"), context line, working "My deck" escape | e2e | `npx playwright test --project=web e2e/11-phase9-image-upload.spec.ts` |
| ADC-01 | New-deck create works inside the image Confirm deck field (reused DeckSwitcher) | e2e / manual | `e2e/11-phase9-image-upload.spec.ts` (+ manual UAT for create) |
| ADC-02 | Save disabled until both fields filled; "Card saved — add another." + form clear on success | e2e | `npx playwright test --project=web e2e/04-manual-card-entry.spec.ts` |
| ADC-02 | Bidirectional auto-translate fires (shimmer) or shows soft-fail manual entry | e2e | `e2e/04-manual-card-entry.spec.ts` |
| ADC-03 | File pick → Confirm (thumbnail + ACDeckSelect + Extract) → stepper steps render | e2e | `e2e/11-phase9-image-upload.spec.ts` (post-retarget) |
| ADC-03 | Cancel on Extracting returns to Confirm with image + deck preserved (D-03) | e2e (new) | new test in `e2e/11-phase9-image-upload.spec.ts` |
| ADC-03 | "Add N cards" commit → Result screen (success / partial / all-failed counts) | manual UAT | needs live DeepL + Claude-vision keys |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Retarget broken locators in `e2e/11-phase9-image-upload.spec.ts` (~9 locators incl. structural flow change + `max-h-64` inline-style break) — role+accessible-name or `data-testid`, behavior-preserving
- [ ] Retarget at-risk literals in `e2e/04-manual-card-entry.spec.ts` ("Save card"/"Save", "Card saved", "Add a Card")
- [ ] Audit + add `data-testid` for low-risk hits in `e2e/09-language-breakdown.spec.ts`, `e2e/10-mobile-responsive.spec.ts`
- [ ] New e2e: Cancel on Extracting → returns to Confirm with image + deck preserved (D-03 guard)
- [ ] New e2e: "From an image" label visible after toggle switch (D-07 regression guard)
- [ ] Unit test for the one-line `cancelled.current` guard added to `image-upload-flow.tsx` (D-03)

*Existing reducer unit tests (`reviewListReducer`, `imageFlowReducer`) test behavior, not presentation — they should stay green untouched.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel/visual fidelity to Daybreak boards across all states | ADC-01/02/03 | Visual fidelity can't be auto-asserted (verifier returns `human_needed` for UI phases) | Compare each rendered state to `design/handoff-daybreak/daybreak-addcard-boards.jsx` + the Add-a-Card HTML render → record in `22-HUMAN-UAT.md` |
| Full image→extract→translate→commit happy path with real counts | ADC-03 | Needs live DeepL + Claude-vision API keys + a real image | Upload a multi-word image, extract, review, translate, "Add N cards", confirm Result counts |
| Inline "+ New deck" create from the image Confirm deck field | ADC-01 | Creates real deck rows | Create a deck mid-flow, confirm words save to it |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (e2e retargets + D-03/D-07 new tests)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
