# Requirements: LeoCards — v2.0 Image-to-Flashcards

**Defined:** 2026-05-18
**Core Value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.

## v2.0 Requirements

Requirements for the Image-to-Flashcards milestone. Each maps to a roadmap phase.

### Image Upload (IMG)

- [x] **IMG-01**: User can choose an image file from the add-card flow and see an "extract words from image" entry point
- [x] **IMG-02
**: User can upload one image at a time in JPG, PNG, or WebP format
- [x] **IMG-03
**: User is shown a clear, friendly error when a file is the wrong type or exceeds the ~5MB size limit (rejected before upload)
- [x] **IMG-04**: User selects which deck the extracted words will be added to before extraction (defaults to the active deck)
- [x] **IMG-05**: User sees a preview/thumbnail of the chosen image and can replace or cancel it before extraction

### Word Extraction (EXT)

- [x] **EXT-01
**: User can trigger extraction and Claude vision returns the vocabulary words found in the image
- [x] **EXT-02
**: User sees a loading state while extraction is in progress and the request cannot be double-submitted
- [x] **EXT-03
**: User sees a clear message when no words could be found in the image, with the option to try another image
- [x] **EXT-04
**: User sees a graceful, recoverable error if the vision request fails or times out (no lost deck selection)
- [x] **EXT-05
**: The vision extraction endpoint is protected by the existing in-memory rate limiter and rejects oversized/invalid payloads server-side

### Review & Commit (RVW)

- [x] **RVW-01
**: User sees the extracted words in an editable review list before anything is added to the deck
- [x] **RVW-02
**: User can edit the text of any extracted word and remove or toggle off words they don't want
- [x] **RVW-03
**: Each kept word is auto-translated via the existing DeepL pipeline and the translation is editable, exactly like manual card add
- [x] **RVW-04
**: User confirms and the kept words are added as cards to the selected deck, then sees a success summary (count added)
- [x] **RVW-05
**: User can cancel the review without adding any cards, and duplicate words already in the deck are flagged or skipped

## Future Requirements

Deferred to a later release. Tracked but not in this roadmap.

### Image (IMG)

- **IMG-F1**: Multi-image batch upload in a single extraction session
- **IMG-F2**: Live camera capture (mobile) instead of file upload

### Extraction (EXT)

- **EXT-F1**: Language auto-detection / per-word source-language tagging when an image mixes languages

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cute 2D illustrated visual style / production sprite art | Remains a deferred Active requirement; not part of v2.0's image feature |
| Pronunciation / audio extraction from images | Audio is out of scope project-wide for now |
| OCR of handwriting as a guaranteed accuracy target | Best-effort via vision LLM; no accuracy SLA committed |
| Bulk image-to-deck without a review step | Confirmed UX decision: review & edit is mandatory before commit |
| Storing/retaining uploaded images after extraction | Privacy + scope; images are processed transiently, not persisted |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMG-01 | Phase 9 | Complete |
| IMG-02 | Phase 9 | Complete |
| IMG-03 | Phase 9 | Complete |
| IMG-04 | Phase 9 | Complete |
| IMG-05 | Phase 9 | Complete |
| EXT-01 | Phase 10 | Complete |
| EXT-02 | Phase 10 | Complete |
| EXT-03 | Phase 10 | Complete |
| EXT-04 | Phase 10 | Complete |
| EXT-05 | Phase 10 | Complete |
| RVW-01 | Phase 11 | Pending |
| RVW-02 | Phase 11 | Pending |
| RVW-03 | Phase 11 | Pending |
| RVW-04 | Phase 11 | Pending |
| RVW-05 | Phase 11 | Pending |
