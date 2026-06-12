---
phase: 10
slug: vision-extraction-endpoint
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-19
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.1` (`vitest.config.ts`, `environment: node`) |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/lib/image-validation.test.ts src/lib/image-constants.test.ts src/app/api/extract/__tests__/extract.unit.test.ts src/app/api/extract/__tests__/extract-reducer.test.ts` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Eval suite command** | `RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts` (requires ANTHROPIC_API_KEY + manual fixtures) |
| **Estimated runtime** | quick ~5s; full per existing baseline; eval suite manual/optional |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/lib/image-validation.test.ts` (regression gate — confirm D-12 refactor didn't break Phase 9's 8 tests)
- **After every plan wave:** `npm test` (full suite)
- **Before `/gsd-verify-work`:** full suite green + `npm run typecheck` + `npm run lint`
- **Eval gate (optional, pre-production):** `RUN_EXTRACTION_EVALS=true` eval suite — requires API key + curated fixtures
- **Max feedback latency:** 30 seconds (unit/quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-W0-01 | TBD | 0 | D-12 | — | constants single-source, Phase 9 unchanged | unit | `npx vitest run src/lib/image-constants.test.ts src/lib/image-validation.test.ts` | ✅ | ✅ green |
| 10-W0-02 | TBD | 0 | EXT-01,EXT-05 | T-guard | route guard sequence (auth/limit/size/mime) with mocked SDK | unit | `npx vitest run src/app/api/extract/__tests__/extract.unit.test.ts` | ✅ | ✅ green |
| 10-W0-03 | TBD | 0 | EXT-02,EXT-03,EXT-04 | — | reducer actions: in-flight/no-words/error-preserves-state | unit | `npx vitest run src/app/api/extract/__tests__/extract-reducer.test.ts` | ✅ | ✅ green |
| 10-W0-04 | TBD | 0 | EXT-01,EXT-03 | — | eval harness skeleton (gated RUN_EXTRACTION_EVALS) | live-eval | `RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts` | ✅ | ✅ skeleton exists; live run manual-only |
| 10-XX-01 | TBD | 1+ | EXT-01 | — | valid image+auth → `{ words }` | unit (mocked SDK) | `...extract.unit.test.ts` | ✅ | ✅ green |
| 10-XX-02 | TBD | 1+ | EXT-05 | T-authz/T-dos | 401 unauth · 413 oversized · 415 bad-magic-bytes · 429 rate-limited | unit | `...extract.unit.test.ts` | ✅ | ✅ green |
| 10-XX-03 | TBD | 1+ | EXT-02 | — | Extract button disabled while `extracting:true` (no double-submit) | unit (reducer) | `...extract-reducer.test.ts` | ✅ | ✅ green |
| 10-XX-04 | TBD | 1+ | EXT-03 | — | `{words:[]}` → `EXTRACT_NO_WORDS`; no-text fixtures return `[]` | unit + live-eval | `...extract-reducer.test.ts` / eval | ✅ | ✅ unit green; eval part manual-only |
| 10-XX-05 | TBD | 1+ | EXT-04 | — | non-2xx preserves file/previewUrl/selectedDeckId; Try-again recalls | unit (reducer) | `...extract-reducer.test.ts` | ✅ | ✅ green |
| 10-XX-06 | TBD | 1+ | EXT-01,EXT-03 | — | hallucination precision / target-language purity / no-words correctness on reference set | live-eval + manual tutor | eval suite + manual rubric | ✅ | manual-only (see 10-HUMAN-UAT.md) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/image-constants.ts` + `src/lib/image-constants.test.ts` — `ALLOWED_IMAGE_TYPES` + `MAX_IMAGE_BYTES` exported with correct values (D-12); pure re-export, Phase 9 import updated
- [x] `src/app/api/extract/__tests__/extract.unit.test.ts` — EXT-01 / EXT-05 guard sequence (mocked AI SDK + mocked auth + mocked rate limiter): 200 happy, 401, 413, 415 (bad magic bytes), 429, 502 (NoObjectGeneratedError), 504 (abort)
- [x] `src/app/api/extract/__tests__/extract-reducer.test.ts` — EXT-02/03/04 reducer actions: extracting flag, EXTRACT_NO_WORDS, error preserves file/previewUrl/selectedDeckId
- [x] `src/app/api/extract/__tests__/extract-eval.test.ts` — eval harness skeleton, gated by `RUN_EXTRACTION_EVALS=true`; must exist even with empty fixtures
- [ ] `src/app/api/extract/__tests__/fixtures/` — 20 reference images (**MANUAL: Joshua curates** — FR/ES/EN menus, signs, textbook, food labels, handwriting, blank/no-text, multilingual) — *outstanding, tracked in 10-HUMAN-UAT.md*
- [ ] `src/app/api/extract/__tests__/reference-labels.json` — ground-truth word lists (**MANUAL: Joshua + FR/ES tutor**) — *skeleton file exists; population tracked in 10-HUMAN-UAT.md*

**Existing regression gate — DO NOT BREAK:** `src/lib/image-validation.test.ts` (8 tests) must stay green after the D-12 constants refactor.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reference image set + ground-truth labels | EXT-01/EXT-03 eval | Requires real photos + FR/ES tutor judgment; cannot be auto-generated | Joshua curates 20 images across 10 scenario types; Joshua + tutor author `reference-labels.json` |
| Target-language purity / hallucination precision / yield quality | AI-SPEC §5 (EXT-01) | Subjective rubric dims; LLM-judge + tutor calibration | Run eval suite; manual rubric spreadsheet pass per AI-SPEC §5 |
| Live loading/error UX on the real device (≤30s spinner, Try-again, no-words, status copy) | EXT-02/03/04 | Real network + real Anthropic latency; browser-only | Manual browser walkthrough on `/deck/new-card` image flow after a real extraction |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (constants, route unit, reducer unit, eval skeleton)
- [x] No watch-mode flags
- [x] Feedback latency < 30s (quick command)
- [x] `nyquist_compliant: true` set in frontmatter (after Wave 0 lands)

**Approval:** verified 2026-06-12

---

## Validation Audit 2026-06-12

| Metric | Count |
|--------|-------|
| Requirements total | 5 (EXT-01..05) + D-12 |
| Automated coverage | 5 (route-guard unit, reducer unit, constants unit; eval skeleton in place) |
| Manual-only | 2 (reference-set live eval + tutor rubric; live UX walkthrough) — tracked in 10-HUMAN-UAT.md (status: partial, blocked on real photos + FR/ES tutor) |
| Gaps found | 0 |
| Resolved | n/a (tests pre-existing; bookkeeping flip) |
| Escalated | 0 |

Retroactive audit (carried v2.0 debt): the validation draft was never updated after execution. Verified 2026-06-12 — quick-command unit suites green (within the 340-pass run across phases 9–11); `extract-eval.test.ts` skeleton present and correctly gated behind `RUN_EXTRACTION_EVALS`. The live eval run remains manual-only and is tracked in `10-HUMAN-UAT.md`, not here.
