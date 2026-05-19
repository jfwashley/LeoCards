---
phase: 10
slug: vision-extraction-endpoint
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 10-W0-01 | TBD | 0 | D-12 | — | constants single-source, Phase 9 unchanged | unit | `npx vitest run src/lib/image-constants.test.ts src/lib/image-validation.test.ts` | ❌ W0 | ⬜ pending |
| 10-W0-02 | TBD | 0 | EXT-01,EXT-05 | T-guard | route guard sequence (auth/limit/size/mime) with mocked SDK | unit | `npx vitest run src/app/api/extract/__tests__/extract.unit.test.ts` | ❌ W0 | ⬜ pending |
| 10-W0-03 | TBD | 0 | EXT-02,EXT-03,EXT-04 | — | reducer actions: in-flight/no-words/error-preserves-state | unit | `npx vitest run src/app/api/extract/__tests__/extract-reducer.test.ts` | ❌ W0 | ⬜ pending |
| 10-W0-04 | TBD | 0 | EXT-01,EXT-03 | — | eval harness skeleton (gated RUN_EXTRACTION_EVALS) | live-eval | `RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-01 | TBD | 1+ | EXT-01 | — | valid image+auth → `{ words }` | unit (mocked SDK) | `...extract.unit.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-02 | TBD | 1+ | EXT-05 | T-authz/T-dos | 401 unauth · 413 oversized · 415 bad-magic-bytes · 429 rate-limited | unit | `...extract.unit.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-03 | TBD | 1+ | EXT-02 | — | Extract button disabled while `extracting:true` (no double-submit) | unit (reducer) | `...extract-reducer.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-04 | TBD | 1+ | EXT-03 | — | `{words:[]}` → `EXTRACT_NO_WORDS`; no-text fixtures return `[]` | unit + live-eval | `...extract-reducer.test.ts` / eval | ❌ W0 | ⬜ pending |
| 10-XX-05 | TBD | 1+ | EXT-04 | — | non-2xx preserves file/previewUrl/selectedDeckId; Try-again recalls | unit (reducer) | `...extract-reducer.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-06 | TBD | 1+ | EXT-01,EXT-03 | — | hallucination precision / target-language purity / no-words correctness on reference set | live-eval + manual tutor | eval suite + manual rubric | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/image-constants.ts` + `src/lib/image-constants.test.ts` — `ALLOWED_IMAGE_TYPES` + `MAX_IMAGE_BYTES` exported with correct values (D-12); pure re-export, Phase 9 import updated
- [ ] `src/app/api/extract/__tests__/extract.unit.test.ts` — EXT-01 / EXT-05 guard sequence (mocked AI SDK + mocked auth + mocked rate limiter): 200 happy, 401, 413, 415 (bad magic bytes), 429, 502 (NoObjectGeneratedError), 504 (abort)
- [ ] `src/app/api/extract/__tests__/extract-reducer.test.ts` — EXT-02/03/04 reducer actions: extracting flag, EXTRACT_NO_WORDS, error preserves file/previewUrl/selectedDeckId
- [ ] `src/app/api/extract/__tests__/extract-eval.test.ts` — eval harness skeleton, gated by `RUN_EXTRACTION_EVALS=true`; must exist even with empty fixtures
- [ ] `src/app/api/extract/__tests__/fixtures/` — 20 reference images (**MANUAL: Joshua curates** — FR/ES/EN menus, signs, textbook, food labels, handwriting, blank/no-text, multilingual)
- [ ] `src/app/api/extract/__tests__/reference-labels.json` — ground-truth word lists (**MANUAL: Joshua + FR/ES tutor**)

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (constants, route unit, reducer unit, eval skeleton)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (quick command)
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 lands)

**Approval:** pending
