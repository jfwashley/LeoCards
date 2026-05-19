# Extraction Eval Fixtures

**Manual curation required — see 10-AI-SPEC.md Section 5 for the authoritative reference dataset spec.**

This directory must contain **20 reference images** before the eval suite can run
(`RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts`).

Images are committed to the repo as-is (small JPEG/PNG/WebP preferred; base64 `.txt` acceptable).
Each image is paired with ground-truth entries in `../reference-labels.json`.

---

## File Naming Convention

```
<nn>-<scenario-slug>.<ext>
```

Examples: `01-fr-menu-printed.jpg`, `18-blank-no-text.png`

The number prefix (`01`–`20`) corresponds to the scenario slot in the table below.

---

## Required Scenario Slots (20 images)

| #    | Filename prefix     | Scenario                                        | Language(s) in Image | Target Language | Eval Focus |
|------|---------------------|-------------------------------------------------|----------------------|-----------------|------------|
| 01   | `01-fr-menu-a`      | French restaurant menu (clear, printed)         | FR + EN headings     | fr              | Purity — critical path |
| 02   | `02-fr-menu-b`      | French restaurant menu (different style/section)| FR + EN headings     | fr              | Purity — critical path |
| 03   | `03-fr-menu-c`      | French restaurant menu (desserts/drinks section)| FR + EN headings     | fr              | Purity — critical path |
| 04   | `04-es-sign-a`      | Spanish street sign / public signage            | ES                   | es              | Orthographic faithfulness (ñ, á, é) |
| 05   | `05-es-sign-b`      | Spanish street sign / public signage            | ES                   | es              | Orthographic faithfulness |
| 06   | `06-fr-textbook-a`  | French textbook page excerpt                    | FR                   | fr              | Yield quality, verbatim form |
| 07   | `07-fr-textbook-b`  | French textbook page excerpt                    | FR                   | fr              | Yield quality, verbatim form |
| 08   | `08-fr-en-packaging-a` | Food/product packaging (bilingual FR/EN)     | FR + EN              | fr              | Language mixing failure mode |
| 09   | `09-fr-en-packaging-b` | Food/product packaging (bilingual FR/EN)     | FR + EN              | fr              | Language mixing failure mode |
| 10   | `10-fr-handwritten-a`  | Handwritten French café specials board       | FR (handwriting)     | fr              | Handwriting misread failure mode |
| 11   | `11-fr-handwritten-b`  | Handwritten French café specials board       | FR (handwriting)     | fr              | Handwriting misread failure mode |
| 12   | `12-fr-dense-label-a`  | Dense food label (nutritional info, allergens) | FR                 | fr              | Noise rejection (over-extraction) |
| 13   | `13-fr-dense-label-b`  | Dense food label (nutritional info, allergens) | FR                 | fr              | Noise rejection (over-extraction) |
| 14   | `14-sparse-sign-a`  | Sparse street sign (2–4 words)                 | FR or ES             | fr or es        | Yield quality (under-extraction) |
| 15   | `15-sparse-sign-b`  | Sparse street sign (2–4 words)                 | FR or ES             | fr or es        | Yield quality (under-extraction) |
| 16   | `16-en-only-a`      | English-only image (tested with FR target)      | EN                   | fr              | No-words correctness (EXT-03) + purity |
| 17   | `17-en-only-b`      | English-only image (tested with FR target)      | EN                   | fr              | No-words correctness (EXT-03) + purity |
| 18   | `18-blank-no-text-a`| Blank / no text (solid colour or landscape)     | none                 | fr              | No-words correctness (EXT-03) — **expected: []** |
| 19   | `19-blank-no-text-b`| Blank / no text (solid colour or landscape)     | none                 | fr              | No-words correctness (EXT-03) — **expected: []** |
| 20   | `20-multilingual`   | Multilingual tourist menu (FR/EN/ES)            | FR + EN + ES         | fr              | Language mixing failure mode |

---

## Image Guidelines

- **Format:** JPEG or PNG strongly preferred. WebP acceptable. Keep files small (resize to
  ≤ 1024 px on the long edge before committing — reduces test latency and API token cost).
- **Privacy (T-10-14):** Do NOT include images with identifiable faces, vehicle registration
  plates, or other personal data. Text-focused images only (menus, signs, packaging, textbook pages).
  If an image incidentally contains a person, crop or choose a different image.
- **No-text images (18–19):** Use a solid-colour JPEG or a simple landscape with no visible text.
  The ground-truth label for these is `[]` (empty array).
- **Handwriting (10–11):** Choose clearly legible handwriting if possible. The ground-truth labels
  should reflect what is actually legible, not the "correct" spelling of a misread word.

---

## Ground-Truth Labels (reference-labels.json)

After curating the images, populate `../reference-labels.json`:

```json
{
  "01-fr-menu-a.jpg": {
    "targetLanguage": "fr",
    "expectedWords": ["boeuf", "entrée", "boisson", "poulet", "saumon"]
  },
  "18-blank-no-text-a.png": {
    "targetLanguage": "fr",
    "expectedWords": []
  }
}
```

- `targetLanguage`: BCP-47 code matching what will be sent in the API call body.
- `expectedWords`: exact printed forms including all diacritics (é, è, ê, ñ, etc.).
  For code-based dimensions (D3 orthographic, D4 verbatim), these are the strings the
  eval asserts must appear in the model's returned word list.
  For images 18–19, this MUST be `[]`.
- You do NOT need to list every word in the image — list the key words you want the model
  to return correctly. The eval checks membership (every expected word must be present),
  not set equality (extra words are flagged by the tutor, not failed by code).

---

## Running the Eval After Curation

```bash
# Requires ANTHROPIC_API_KEY in your environment
RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts
```

The eval suite will:
1. Load all entries from `reference-labels.json`
2. Read the corresponding image file from this `fixtures/` directory
3. POST to the live `/api/extract` route (real Anthropic API call)
4. Assert code-based dimensions (D3/D4/D5a) automatically
5. Print results for manual tutor rubric review (D1/D2/D5b)
