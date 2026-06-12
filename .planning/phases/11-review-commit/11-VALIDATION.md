---
phase: 11
slug: review-commit
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-19
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.1` (`vitest.config.ts`, `environment: node`, `setupFiles: ["./src/test-setup.ts"]`) |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/components/review-list.test.ts src/lib/deck-actions.test.ts` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | quick ~5s; full per existing baseline |

`test-setup.ts` sets a dummy `DATABASE_URL` so `neon()` doesn't crash on import (applies to all tests).

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/components/review-list.test.ts src/lib/deck-actions.test.ts`
- **After every plan wave:** `npm test` (full suite) + `npm run typecheck`
- **Before `/gsd-verify-work`:** full suite green + `npx tsc --noEmit` + `npx biome check`
- **Max feedback latency:** 30 seconds (quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-W0-01 | TBD | 0 | RVW-05a | — | `isDuplicate` case/trim correctness | unit (pure) | `npx vitest run src/components/review-list.test.ts -t "dedupe"` | ✅ | ✅ green |
| 11-W0-02 | TBD | 0 | RVW-01,02 | — | `reviewListReducer` step-A transitions/interactions | unit (reducer) | `...review-list.test.ts -t "reviewListReducer"` | ✅ | ✅ green |
| 11-W0-03 | TBD | 0 | RVW-03 | — | translation fan-out: per-row success/failure mapping | unit (async) | `...review-list.test.ts -t "translation fan-out"` | ✅ | ✅ green |
| 11-W0-04 | TBD | 0 | RVW-04 | T-authz | batch commit: mixed outcomes, continue-on-failure, accurate counts | unit (mocked saveCard) | `...review-list.test.ts -t "batch commit"` | ✅ | ✅ green |
| 11-W0-05 | TBD | 0 | RVW-05b | T-authz | cancel at Step A & B: onCancel called, zero saveCard | unit (spy) | `...review-list.test.ts -t "cancel"` | ✅ | ✅ green |
| 11-W0-06 | TBD | 0 | RVW-05a, D-11 | T-authz | `getSameLanguageDeckBackWords` ownership + same-language filter + lowercased/trimmed Set | unit (mocked auth+db) | `npx vitest run src/lib/deck-actions.test.ts -t "getSameLanguageDeckBackWords"` | ✅ | ✅ green |
| 11-XX-01 | TBD | 1+ | D-11 | — | `saveCard` accepts `"image"` source (type) | typecheck | `npx tsc --noEmit` | n/a | ✅ green |
| 11-XX-02 | TBD | 1+ | RVW-01..05 | — | full ReviewList wired into image-upload-flow EXTRACT_SUCCESS; suite green | unit+typecheck+lint | `npm test && npx tsc --noEmit && npx biome check` | ✅ | ✅ green |
| 11-XX-03 | TBD | 1+ | RVW-01..05 | — | browser walkthrough: Step A prune → translate → Step B edit → commit → summary; already-learned section; cancel | manual | visual inspection | — | manual-only (see 11-HUMAN-UAT.md) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/components/review-list.test.ts` — `reviewListReducer` (all actions: Step A toggle/edit/remove/select-all/none, Step B transitions, commit outcomes), `isDuplicate` pure fn (case-insensitive + trim), translation fan-out (per-row success/failure), batch-commit orchestration (mocked `saveCard`, continue-on-failure, count accuracy), cancel spies (Step A & B → `onCancel`, zero `saveCard`)
- [x] `src/lib/deck-actions.test.ts` — `getSameLanguageDeckBackWords` (mock `auth.api.getSession` + `db` per the `extract.unit.test.ts` mock pattern): ownership check, `deck.language` filter, trimmed-lowercase Set output
- [x] Type gate: `saveCard` source union widened to include `"image"` — caught by `npx tsc --noEmit`

**Existing regression gates — DO NOT BREAK:** the full prior suite (Phases 1–10) must stay green; `src/lib/image-validation.test.ts` (8) and the Phase 10 extract tests (12 + 6) included.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full ReviewList rendering & interaction (checkbox/edit/remove, Step A→B transition, two-editable-field rows) | RVW-01/02/03 | Browser DOM/interaction only | After a real extraction on `/deck/new-card`, prune words, Next, edit translations, confirm |
| Already-learned section (same-language dedupe) shows real duplicates, non-interactive, excluded from commit | RVW-05 | Needs live DB with existing same-language cards | Add a known word manually, re-extract an image containing it, verify it lands in the bottom list |
| End-to-end card creation visible in deck + success summary counts (added/already-learned/failed) | RVW-04 | Requires live Neon + DeepL | Complete a commit; verify cards in dashboard and the summary numbers |
| Cancel discards with zero writes | RVW-05 | Browser + DB inspection | Cancel mid-flow; confirm no new cards |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (review-list.test.ts, deck-actions.test.ts, type gate)
- [x] No watch-mode flags
- [x] Feedback latency < 30s (quick)
- [x] `nyquist_compliant: true` set after Wave 0 lands

**Approval:** verified 2026-06-12

---

## Validation Audit 2026-06-12

| Metric | Count |
|--------|-------|
| Requirements total | 5 (RVW-01..05) + D-11 |
| Automated coverage | 5 (review-list reducer/fan-out/commit/cancel units, deck-actions unit, type gate) |
| Manual-only | 4 (live browser walkthrough rows) — tracked in 11-HUMAN-UAT.md (status: partial, blocked on real DeepL + billing-enabled Anthropic keys) |
| Gaps found | 2 (infrastructure, both fixed during this audit) |
| Resolved | 2 |
| Escalated | 0 |

Retroactive audit (carried v2.0 debt): the validation draft was never updated after execution. Verified 2026-06-12 — `npm test` 1892 passed / 0 failed, `npx tsc --noEmit` clean, `npx biome ci src/` 0 errors. Two infrastructure gaps found and fixed during the audit: (1) bare `vitest run` was collecting Playwright e2e specs (19 file-level collection errors) — added `e2e/**` to vitest.config.ts exclude; (2) biome formatting/import-sort drift in 8 files — auto-fixed via `biome check --write`. The live 6-step browser walkthrough remains manual-only, tracked in `11-HUMAN-UAT.md`.
