---
phase: 9
slug: image-upload-deck-selection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-18
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `vitest.config.ts` (project root) — `environment: "node"` |
| **Quick run command** | `npx vitest run src/lib/image-validation.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds (validation file); full suite per existing baseline |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/image-validation.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-W0-01 | TBD | 0 | IMG-02, IMG-03 | — | Reject disallowed MIME types and >5MB before any preview/network | unit | `npx vitest run src/lib/image-validation.test.ts` | ❌ W0 | ⬜ pending |
| 9-XX-01 | TBD | 1+ | IMG-02 | — | `validateImageFile` accepts JPG/PNG/WebP, rejects others | unit | `npx vitest run src/lib/image-validation.test.ts` | ❌ W0 | ⬜ pending |
| 9-XX-02 | TBD | 1+ | IMG-03 | — | `validateImageFile` rejects >5MB, accepts ≤5MB, error names rule+value | unit | `npx vitest run src/lib/image-validation.test.ts` | ❌ W0 | ⬜ pending |
| 9-XX-03 | TBD | 1+ | IMG-01 | — | Mode toggle renders both Type/From-image modes | manual | visual inspection | — | ⬜ pending |
| 9-XX-04 | TBD | 1+ | IMG-05 | — | Preview renders; replace + cancel work | manual | visual inspection | — | ⬜ pending |
| 9-XX-05 | TBD | 1+ | IMG-04 | — | Deck pre-selected to ?deck= else decks[0] | manual | visual inspection | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/image-validation.test.ts` — covers IMG-02 (type allow-list: JPG/PNG/WebP accepted, others rejected) and IMG-03 (size cap: >5MB rejected, ≤5MB accepted, error message names the rule and the offending value)

*No framework install gap — Vitest 4.1.1 already installed and configured (`vitest.config.ts`, `environment: "node"`). Node 20+ WHATWG File API lets tests construct `File` objects without browser APIs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Extract words from image" mode toggle visible/usable in add-card flow | IMG-01 | UI render + interaction, no pure logic | Open `/deck/new-card`, confirm a "Type a word" / "From image" toggle; switching shows the image flow |
| Preview thumbnail renders; replace + cancel before extraction | IMG-05 | DOM/visual behavior (objectURL, X-overlay, Choose-different) | Pick an image → see contained thumbnail; click X → back to empty picker; pick again → "Choose different image" re-opens picker |
| Deck pre-selected to active deck before extraction | IMG-04 | Server-component prop wiring + DeckSwitcher render | Navigate from a specific deck (`?deck=<id>`) → image flow Step 2 shows that deck pre-selected; no param → first deck |
| Drag-and-drop and clipboard paste (Ctrl+V) select an image | IMG-01/IMG-05 | Browser DataTransfer / paste event behavior | Drag a JPG onto the drop zone; separately copy a screenshot and Ctrl+V on the flow — both populate the preview |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`src/lib/image-validation.test.ts`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
