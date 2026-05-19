---
phase: 10-vision-extraction-endpoint
plan: "04"
type: human-uat
status: partial
created: 2026-05-19
tracker: canonical — referenced in STATE.md + 10-04-SUMMARY.md
spec-ref: 10-AI-SPEC.md §5
---

# Phase 10: Human UAT — Extraction Eval Reference Dataset

**Status: PARTIAL — eval scaffolding committed; manual dataset curation deferred.**

The functional extraction endpoint (EXT-01..EXT-05) is complete and all unit tests pass (vitest
1733 passed / 1 skipped / 0 failures). The outstanding items below are offline quality-assurance
for the AI extraction eval (10-AI-SPEC.md §5) and are NOT blockers for Phase 11 or production
deploy. They require real photos and a language-tutor review that cannot be produced or
synthesized in-session.

---

## Pending Manual Eval Items

### Item 1 — Curate 20 reference images into the fixtures directory

**Status:** PENDING

**Who:** Joshua (product owner)

**Location:** `src/app/api/extract/__tests__/fixtures/`

**Instructions:** See `src/app/api/extract/__tests__/fixtures/README.md` for the full curation
guide. The required image set covers 20 scenarios:

| Slots | Image Type | Language(s) in Image | Target Language | Eval Focus |
|-------|------------|---------------------|-----------------|------------|
| 1–3   | French restaurant menu (clear, printed) | FR + EN headings | fr | Language purity (critical) |
| 4–5   | Spanish street signs / public signage | ES | es | Diacritic faithfulness (ñ, á, é) |
| 6–7   | French textbook page excerpt | FR | fr | Yield quality, verbatim form |
| 8–9   | Food/product packaging (bilingual FR/EN) | FR + EN | fr | Language mixing failure mode |
| 10–11 | Handwritten French café specials board | FR (handwriting) | fr | Handwriting misread failure mode |
| 12–13 | Dense food label (nutritional info, allergen codes) | FR | fr | Noise rejection (over-extraction) |
| 14–15 | Sparse street sign (2–4 words) | FR or ES | fr/es | Yield quality (under-extraction) |
| 16–17 | English-only image (tested with FR target) | EN | fr | No-words correctness + purity |
| 18–19 | Blank / no text (solid colour, landscape photo) | none | fr | No-words correctness (EXT-03) |
| 20    | Multilingual tourist menu (FR/EN/ES) | FR + EN + ES | fr | Language mixing failure mode |

**Privacy note:** Images must not contain faces, vehicle registration plates, or other personal
data (REQUIREMENTS.md — T-10-14 transient-processing privacy posture).

**Expected outcome:** 20 real photo files placed into `fixtures/` using the naming convention in
README.md (e.g. `fr-menu-clear-01.jpg`). The fixture directory currently contains only the
README; no images are committed.

---

### Item 2 — Author real ground-truth labels in reference-labels.json with FR/ES tutor

**Status:** PENDING

**Who:** Joshua + FR/ES language tutor (A1–B1 teaching experience)

**Location:** `src/app/api/extract/__tests__/reference-labels.json`

**Instructions:** The file currently contains a template with placeholder `_schema` and `_slots`
meta-keys (prefixed `_` so the eval test skips them). For each of the 20 fixture images, add a
real entry with the exact ground-truth words visible in the image:

```json
{
  "fr-menu-clear-01.jpg": {
    "targetLanguage": "fr",
    "expectedWords": ["boeuf", "entrée", "boisson", "plat", "dessert"]
  }
}
```

**Tutor responsibilities (per 10-AI-SPEC.md §5 — Dimensions 1, 2, 5b):**
- Verify each ground-truth word is a valid target-language vocabulary item (not noise, not wrong language)
- Flag any proper nouns, allergen codes, or typographic strings that should be excluded
- For handwriting images (slots 10–11): confirm the exact legible surface form

**Expected outcome:** All 20 image slots have real `expectedWords` arrays; the two no-text
images (slots 18–19) have confirmed `expectedWords: []`. The `_schema` and `_slots` meta-keys
can be removed once real data is in place.

---

### Item 3 — Run the live eval suite and complete the manual rubric

**Status:** PENDING (depends on Items 1 and 2)

**Who:** Joshua (runs the command); FR/ES tutor (completes manual rubric for D1/D2/D5b)

**Command:**
```bash
RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts
```

**What this runs (from `extract-eval.test.ts`):**

| Test | Dimension | Type | Pass Criteria |
|------|-----------|------|---------------|
| D5a: no-text images return empty array | D5 (yield quality) | Code-based | `words.length === 0` for slots 18–19 |
| D3: diacritic faithfulness — every expected word present | D3 (orthographic) | Code-based | Every `expectedWord` is in the returned words array |
| D4: verbatim surface form — no silent normalisation | D4 (verbatim form) | Code-based | Every `expectedWord` is in the returned words array (membership check, not set equality) |
| D1/D2/D5b: manual rubric logger | D1/D2/D5b | Manual review trigger | Logs each extraction result for tutor + product-owner review; does not auto-assert |

**Manual rubric (D1/D2/D5b) — to complete after the run:**

| Dimension | Reviewer | What to Check |
|-----------|----------|---------------|
| D1: Target-language purity | FR/ES tutor | Every returned word is in the declared target language; flag non-target words |
| D2: Word identity — real headword vs. noise | FR/ES tutor | No prices, allergen codes, table numbers, QR fragments, or brand-name strings |
| D5b: Yield quality — useful density | Joshua + tutor | Count visible target-language words in each image; returned count should be 50–150% of that count |

**Expected outcome:**
- D3 and D4 code assertions pass for all 20 images (green vitest output)
- D5a assertion passes (no-text images return `[]`)
- D1/D2/D5b manual rubric completed and results recorded (a simple spreadsheet or written notes is sufficient at this scale — see 10-AI-SPEC.md §5 "Eval Tooling")

---

## How to Signal Completion

When all three items are done:

1. Commit the real fixture images and updated `reference-labels.json` to `src/app/api/extract/__tests__/`
2. Commit the eval run output (or a brief text summary) to this directory as `10-EVAL-RESULTS.md`
3. Update this file's `status` frontmatter from `partial` to `complete`

The eval results will then satisfy the offline quality-assurance requirement in 10-AI-SPEC.md §5
and close the validation debt recorded in STATE.md.

---

## Spec Reference

Full eval strategy, rubric dimensions, reference dataset composition, and measurement approach:
**10-AI-SPEC.md §5** (Evaluation Strategy)

Fixture curation guide: `src/app/api/extract/__tests__/fixtures/README.md`
