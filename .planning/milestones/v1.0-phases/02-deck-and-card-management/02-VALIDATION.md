---
phase: 2
slug: deck-and-card-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-schema | 01 | 1 | DECK-06 | unit | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 2-01-translate | 01 | 1 | DECK-02 | integration | `npx vitest run src/lib/translate` | ❌ W0 | ⬜ pending |
| 2-01-wordlist | 01 | 1 | DECK-01 | unit | `npx vitest run src/lib/wordlist` | ❌ W0 | ⬜ pending |
| 2-02-crud | 02 | 2 | DECK-04, DECK-05 | integration | `npx vitest run src/app/api/deck` | ❌ W0 | ⬜ pending |
| 2-03-ui | 03 | 3 | DECK-01, DECK-02, DECK-03 | e2e | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/translate.test.ts` — stubs for DeepL translation proxy (DECK-02)
- [ ] `src/lib/wordlist.test.ts` — stubs for word list data loading (DECK-01)

*Existing vitest infrastructure from Phase 1 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bidirectional live translation UX | DECK-02, DECK-03 | Requires live DeepL API key + browser interaction | Type word in either field, verify other updates after ~500ms debounce |
| Word list browse + add flow | DECK-01 | Visual UX verification | Browse categories, click +, verify checkmark appears and card is in deck |
| Card edit modal | DECK-04 | Visual UX verification | Click card row, verify modal opens with editable fields, save changes |
| Card delete with confirmation | DECK-05 | Visual UX verification | Open edit modal, click Delete, verify confirmation dialog, confirm deletion |
| Deck switcher dropdown | DECK-06 | Visual UX verification | Create multiple decks, switch between them via header dropdown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
