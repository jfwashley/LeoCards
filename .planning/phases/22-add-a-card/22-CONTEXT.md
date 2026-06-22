# Phase 22: Add a Card - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-skin the existing **Add-a-Card destination** (`/deck/new-card`) to the Daybreak design system — both the **type-a-word** flow and the **from-an-image** stepper — across every state the mock draws: type (empty / translating / translate-fail / save-fail / saved) and image (pick / drag-over / file-error / confirm+deck / extracting / no-words / extract-error / review words / translating / check translations / result success / result partial / all-failed).

**Presentation-layer only.** The pipelines are **preserved unchanged**: the DeepL translate call (`/api/translate`), the Claude-vision extraction (`/api/extract`), the bidirectional auto-translate (debounced, either side), the dedupe-against-learned-words check, the keep/exclude + select-all/none review, per-row translate-fail tolerance, the in-flight translate-cancel, and the batched per-row-tolerant commit (`saveImageCards`). This phase restyles the surface and adds **one tiny guard** (D-03) — nothing else in the flow's behavior changes. Builds on the Daybreak foundation + primitives shipped in Phase 19 and reuses the Phase 21 deck picker.

Requirements: **ADC-01, ADC-02, ADC-03**.

</domain>

<decisions>
## Implementation Decisions

### Field / pair orientation (ADC-02 / ADC-03)
- **D-01:** **⚠ Mixed orientation by design — "lead with the source field."** In the image flow's **Check translations** step, keep the mock's ordering: **target (ES) bold on top, native (EN) beneath** (`ACPairRow` in `daybreak-addcard.jsx`) — because those words were *extracted from the image in the target language*, so the target word is the trusted anchor the user is verifying. In **type-a-word**, fields stay **native-first** (English label first, then Spanish — `ACField` order in `ACTypeScreen`), matching what the user typed. The unifying rule is *lead with the source field* (typed input in type-mode; extracted word in image-mode). **This is intentional and is a documented exception to Phase 21 D-04's app-wide native-on-top rule — it applies only to the image Check-translations pairs.** Downstream UI checker / `gsd-ui-auditor` must **NOT** "correct" the image pairs to native-on-top, and must **NOT** "correct" the type-a-word fields to target-on-top. Both orientations are deliberate.

### Deck selector on the image Confirm step (ADC-01)
- **D-02:** **Full-width "Add words to" field row that reuses the Phase 21 deck picker.** On the **Confirm + deck** step, render the deck selector as the mock's **full-width field-style row** (`ACDeckSelect`: LangChip + full deck name + down-chevron + "Defaults to your active deck · change it or create a new one"), **not** the compact `ES ▾` header pill. Reuse the **Phase 21 `DeckSwitcher` popover internals** (`deck-switcher.tsx` — already imported by `image-upload-flow.tsx`), including the **inline `+ New deck` create flow** (per-language chips + creating/error states). **Creating a new deck must work inside this flow** (ADC-01 requirement, brief §B). Only the *trigger* presentation changes from a pill to a full-width field row; the popover/list/create logic is the Phase 21 component.

### Extraction Cancel (ADC-03)
- **D-03:** **Restyle the wait screens only — no new abort path.** The Extracting and Translating screens get the calm Daybreak progress treatment (`ACProgress`: LionFace in a sunrise disc + indeterminate amber bar + honest "up to 30 seconds" copy). The **Cancel** button on the Extracting screen **returns to the Confirm screen with the picked image + chosen deck preserved** (the reducer already preserves `file` / `previewUrl` / `selectedDeckId` — see the "D-16 preservation" comment in `image-upload-flow.tsx`), plus a **one-line `cancelled` ref guard** so a late-resolving extraction result is **ignored** (the exact pattern `review-list.tsx` already uses for translate-cancel via `cancelled.current`). **Do NOT** wire the existing 35s-timeout `AbortController` to the Cancel button, **do NOT** add `EXTRACT_CANCEL` network logic — keep the extraction pipeline untouched. The image flow's **Translating** step already has a working cancel; just restyle it to match the Daybreak progress. This satisfies "cancelable" from the user's side with zero pipeline change and no stale-result bug.

### Stepper structure & navigation (ADC-01 / ADC-03)
- **D-04:** **Match the mock's navigation model.** The **Pick** screen keeps the **segmented toggle** ("Type a word | From an image") + the persistent **context line** (LangChip EN → ES · "saves to your Spanish deck") + the top-left **"‹ My deck"** escape. From **Confirm** onward, the toggle is **replaced** by the **5-dot stepper** (`ACFlowTop` / `ACStepper`) and the flow-top controls: **Back = previous step**, **Re-pick** (on Confirm) = back to the dropzone, **Cancel = safe exit to My deck** (discards the in-progress image flow, saves nothing). **No** separate persistent "My deck" link during the stepper steps — Cancel is the escape. Nothing is committed until the explicit **"Add N cards"** action on the Check-translations step.
- **D-05:** **5-dot stepper = Image · Extract · Review · Translate · Add** (`AC_STAGES` in `daybreak-addcard.jsx`). The ROADMAP's "six-step stepper (Pick, Confirm+deck, Extracting, Review words, Check translations, Result)" enumerates the *conceptual* steps; the mock implements them as **five progress dots** where **Pick is pre-stepper** (it shows the toggle, no dots) and **Pick + Confirm both live under the "Image" dot**, and **Result lives under the "Add" dot**. This is the intended mapping — do **not** flag a "missing 6th dot."

### Copy bound to the real pipeline, not the mock's placeholders
- **D-06:** **File-size copy = 5 MB (the real enforced limit), NOT the mock's "10 MB."** `image-upload-flow.tsx:119` already enforces/communicates **"under 5MB"**, and behavior is preserved, so the restyled drop-zone / file-error copy uses **5 MB**. The mock board's "under 10 MB" string is a placeholder — ignore it. Accepted types stay **JPG · PNG · WebP** (magic-byte validated server-side in `extract/route.ts`).
- **D-07:** **Mode label is "From an image"** (ROADMAP/REQUIREMENTS/mock), replacing the current code's **"From image"** (`new-card-mode-toggle.tsx`). This is a copy change → triggers the L-06 e2e selector audit.

### Carried forward from Phases 19–21 (locked — not re-litigated)
- **L-01:** **Leo, not tiger; no emoji.** `LionFace` for any mascot moment (the calm-progress disc, no-words empty, result success); text `LangChip` ("EN"/"ES") for the context line + deck rows — never flag emoji. (Phase 19/20/21.)
- **L-02:** **Behavior preserved, surface only**, composing Daybreak primitives (`TField`/`TBtn`/`Pill`/`Card`/`LionFace`). Confirmed already-present behaviors to preserve untouched: bidirectional debounced auto-translate, dedupe-against-learned ("already learned" surfacing + non-blocking dedupe-fail), select-all/none, keep/exclude/edit/remove, per-row translate-fail manual entry, in-flight translate-cancel, batched per-row-tolerant commit with added/skipped/failed counts. The only sanctioned behavior touch is D-03's one-line cancelled-guard. (Phase 19/20/21 pattern; REQUIREMENTS "Out of Scope".)
- **L-06:** **Audit `e2e/*.spec.ts` for literal-text Playwright locators before restyling**, and retarget to role+accessible-name or `data-testid` (preserving behavioral intent, never re-adding old copy). Known at-risk specs: **`e2e/04-manual-card-entry.spec.ts`** and **`e2e/11-phase9-image-upload.spec.ts`**. Known at-risk strings: the toggle labels (`"From image"` → **"From an image"**, `"Type a word"`), `"Save card"`, the extract/review/translate/result copy, file-error copy, deck-selector copy. Grep the **whole** `e2e/` dir for each changed string (the stale literal often lives in more than the obvious spec) and watch for strict-mode multi-match. Add changed specs to the owning plan's `files_modified`.

### Claude's Discretion
- **Exact Daybreak token values, spacing, radii, prop shapes, file layout, and component decomposition** — pull from the Daybreak system + existing `src/components/daybreak/*` primitives. Whether the new atoms (segmented toggle, stepper, drop zone, calm-progress, review row, pair row, result card) become shared `daybreak/*` primitives or page-local components is the planner's call (Browse Words in Phase 23 may reuse the row/segmented patterns — build shareable if cheap).
- **How the type-a-word "saved — add another" rhythm is realized** (banner + form clear + focus return) — follow the mock's "Card saved — add another." banner (`ACBanner`) + reset; keep it fast for adding several in a row. Focus management is discretion.
- **Whether the Pick → stepper transition is a route change or in-page conditional render** — preserve current single-page (`/deck/new-card`) behavior; in-page state transition is expected (no new routes), but the exact mechanism is discretion.
- **The drop-zone's responsive treatment** (the mock's fixed phone-shell proportions are a reference, not a requirement) and the precise result-screen partial/all-failed layout copy mapping — pull from the mock boards.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Add-a-Card design contract (content / states / copy — the blue-sky brief)
- `design/ui-redesign-requirements-add-card.md` — the authoritative brief: both modes' content, behaviors, the full state inventory (type: empty/translating/translate-fail/saving/saved/save-fail; image steps A–F + every outcome state), and the hard constraints (≥44px targets, languages+deck unambiguous, nothing saved until explicit commit, honest long-waits, recoverable+work-preserving errors, fast add-several rhythm). **Treat its flows/states/copy as the contract; its visual tokens are reference-only — superseded by Daybreak.**

### Add-a-Card visual contract (Daybreak hi-fi — recreate faithfully, EXCEPT D-01/D-06 notes)
- `design/handoff-daybreak/daybreak-addcard.jsx` — the locked atoms: `ACContext` (lang/deck line), `ACSeg` (segmented toggle), `ACTop` / `ACFlowTop` / `ACStepper` (`AC_STAGES`), `ACField` + `ACLinkBadge` (type-mode linked fields + swap), `ACDrop` (drop zone), `ACThumb`, `ACDeckSelect` (full-width deck field — **D-02**), `ACProgress` (calm long-wait), `ACReviewRow`, `ACPairRow` (**target-on-top — D-01**), `ACBanner`, `ACBtn`.
- `design/handoff-daybreak/daybreak-addcard-boards.jsx` — board-for-board states: `ACTypeEmpty/Translating/Errors/Saved`, `ACPick/ACPickOver`, `ACConfirm`, `ACExtracting`, `ACNoWords`, `ACReview`, `ACTranslating`, `ACCheck`, `ACResultSuccess`, `ACResultPartial` (incl. the all-failed variant). **Note: the board's "under 10 MB" string is a placeholder — real limit is 5 MB (D-06).**
- `design/handoff-daybreak/LeoCards Daybreak Add a Card.html` — renders the artboards (all states) for visual reference.
- `design/handoff-daybreak/wireframes/LeoCards Add-a-Card Wireframes.html` + `wf-addcard.jsx` + `wf-addcard-boards.jsx` — the structural wireframes the hi-fi mock is built on.

### Daybreak design system (tokens + primitives — shipped Phase 19)
- `design/handoff-daybreak/README.md` §"Design System — Daybreak tokens" + §"Shared components" — palette, type, spacing, radii, shadows.
- `design/handoff-daybreak/hifi-daybreak.jsx` — the `d1` theme object (exact token values; `at = window.d1Theme`).
- `design/handoff-daybreak/hifi-shared.jsx` — `LionFace`, `TField`, `TBtn`, `Pill`, `Card` references (ported into `src/components/daybreak/*` in Phase 19).

### Requirements, roadmap & prior context
- `.planning/ROADMAP.md` §"Phase 22: Add a Card" — goal + 3 success criteria.
- `.planning/REQUIREMENTS.md` — **ADC-01, ADC-02, ADC-03** (the requirements this phase satisfies).
- `.planning/phases/21-dashboard-my-deck/21-CONTEXT.md` — the **Phase 21 deck picker** reused here (D-01 deck-switcher popover + inline create) and the **D-04 native-on-top** rule that D-01 above carves a documented exception to.
- `.planning/phases/20-study-screen/20-CONTEXT.md` — the re-skin pattern (preserve behavior, restyle surface) + the e2e-selector / dead-branch lessons.
- `.planning/phases/19-daybreak-foundation-onboarding-auth/19-CONTEXT.md` — Daybreak primitive strategy + the 0-deck→`/welcome` routing.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/daybreak/{lion-face,t-btn,t-field,pill,card,auth-card}.tsx` — Daybreak primitives. The toggle, fields, buttons, banners, deck field, review/pair rows, and result cards compose these.
- `src/components/deck-switcher.tsx` (`DeckSwitcher`, `DeckOption`) — the Phase 21 dropdown-popover deck picker with inline `+ New deck` create; **already imported by `image-upload-flow.tsx`** — reuse for the D-02 deck field (re-trigger as a full-width row).
- `src/components/review-list.tsx` — already owns dedupe (`loading-dedupe`, `AlreadyLearnedRow`, `dedupeError` non-blocking), keep/exclude (`TOGGLE_WORD`, `SELECT_NONE`/select-all), bulk translate fan-out (`translateFanOut` → `translating` step + `cancelled.current` cancel), the editable pairs (`step-b`), and the batched commit (`commitReviewRows` → `committing`/`success` with `addedCount`/`failedCount`/`skippedCount`). **Preserve all of it — restyle only.**

### Screens / components to redesign (presentation only — preserve behavior)
- `src/app/(protected)/deck/new-card/page.tsx` — server entry (auth, `getUserDecks`, `getUserNativeLanguage`, 0-deck→`/dashboard` redirect, `?deck=` param). Wrap in the Daybreak background/shell; no behavior change.
- `src/components/new-card-mode-toggle.tsx` — replace the two shadcn `Button`s with the Daybreak **segmented toggle** (`ACSeg`) + add the persistent **context line** (`ACContext`) + the **"‹ My deck"** escape (`ACTop`); label **"From an image"** (D-07). Keep the `useState<"type"|"image">` switch.
- `src/components/translation-form.tsx` — restyle to Daybreak **native-first** linked fields (`ACField` + `ACLinkBadge` swap badge), the **shimmer/"Translating…"** pending treatment, the soft translate-fail ("Translation unavailable — enter manually."), Save locked until both filled, and the **"Card saved — add another."** banner + reset. **Preserve** the bidirectional debounced `translateFrom` (`/api/translate`) and save logic untouched.
- `src/components/image-upload-flow.tsx` — restyle Pick (`ACDrop` + drag-over + file-error), Confirm (`ACThumb` + Remove/Change + `ACDeckSelect` D-02), Extracting (`ACProgress` + restyled Cancel — **D-03**), no-words/extract-error (`ACNoWords` + work-preserving Try-again). **Preserve** the `pick`/`deck` reducer, file/deck preservation, `/api/extract` call + 35s timeout `AbortController`; add **only** the D-03 one-line `cancelled` guard.
- `src/components/review-list.tsx` — restyle the Review list (`ACReviewRow` + select all/none + "Already in your deck · skipped" chips + "keep at least one" guard), the Translating progress (`ACProgress`, **D-03**), the Check-translations pairs (`ACPairRow` — **target-on-top, D-01** — + per-row fail), the **"Add N cards"** commit, and the Result states (`ACResultSuccess` / `ACResultPartial` / all-failed). Behavior preserved.

### Integration Points (preserved unchanged)
- `POST /api/translate` (DeepL, debounced from `translation-form.tsx` and fanned out in `review-list.tsx`).
- `POST /api/extract` (`src/app/api/extract/route.ts` — Claude vision; auth + rate-limit + magic-byte type validation + ~30s server budget; **5 MB** limit, JPG/PNG/WebP).
- `saveImageCards(deckId, rows)` (batched, per-row-tolerant commit) + the manual single-card save in `translation-form.tsx`.
- `createDeck` via the reused `DeckSwitcher` (inline new-deck create on the Confirm step — D-02).
- `getUserDecks` / `getUserNativeLanguage` (`src/lib/deck-queries.ts`) on the page entry.

### Established Patterns
- Daybreak tokens via Tailwind semantic classes (`bg-background`, `text-foreground`, `text-primary`) + `--db-*` CSS vars; display text uses `font-display` (Baloo 2); `daybreak/*` atoms use inline styles for exact token values.
- Animation via `motion/react` (shimmer/pending field, indeterminate progress bar, step transitions).
- Cancel/late-result guard: the `cancelled.current` ref pattern in `review-list.tsx` — the model for D-03.
- Reducer-driven multi-step flows (`image-upload-flow.tsx`, `review-list.tsx`) — restyle the rendered surface per step; do not restructure the reducers.

</code_context>

<specifics>
## Specific Ideas

- **Context line (every type/pick screen):** `LangChip EN → LangChip ES · saves to your **Spanish deck**` (`ACContext`). The destination deck must stay unambiguous throughout both modes.
- **Calm long-wait (Extracting):** LionFace in a sunrise disc + indeterminate amber bar; copy "Reading your image…" / "This can take up to 30 seconds. Hang tight — your lion is sniffing out the words." (Translating: "Translating N words…" / "Almost there. You'll be able to check and fix each one.")
- **Review step:** "N words found" + Select all / None; kept-word rows with checkbox + edit + remove; excluded rows struck-through + muted; "Already in your deck · skipped" muted struck-through chips; primary "Translate N words"; guard "Keep at least one word to continue."
- **Check translations (D-01):** each pair = ES (target) field on top, EN (native) field beneath, both editable; per-row fail → red EN field + "Translation unavailable — enter manually."; primary **"Add N cards"** (count reflects what commits).
- **Result:** success = LionFace + "N cards added!" + "Go to my deck"; partial = card with Added (green ✓) / Already learned (muted –) / Couldn't add (red !) counts; all-failed = "Couldn't add cards — please try again." + Try again / Back to deck.
- **Type-mode saved:** "Card saved — add another." banner + form clears + "Last card added just now." helper; Save shows a disabled state until both fields filled.

</specifics>

<deferred>
## Deferred Ideas

- **True abort-the-AI-call extraction Cancel** (`AbortController` wired to the Cancel button + `EXTRACT_CANCEL`) — considered, declined for this phase in favour of D-03's restyle-only + late-result guard (keeps it a clean re-skin). Promote only if a real need to free the in-flight vision call appears.
- **Live camera capture / multi-image batch upload** — already project-level Out of Scope (IMG-F1/IMG-F2); not revisited here.
- **⚠ Flag for the team (not Phase 22 work):** the mock board's **"under 10 MB"** file-size string contradicts the shipped **5 MB** enforcement (D-06 uses 5 MB). If the product intent is actually 10 MB, that's a non-Daybreak logic change to `/api/extract` + `image-upload-flow.tsx`, not a re-skin — raise separately. (Mirrors the L9-vs-L10 mock-vs-engine drift flagged in Phases 20–21.)

### Reviewed Todos (not folded)
None — `todo.match-phase 22` returned no matches; the open Phase 21 carry-forward todos (DSH-03 Browse-words link) belong to Phase 21, not here.

</deferred>

---

*Phase: 22-add-a-card*
*Context gathered: 2026-06-22*
