# Phase 11: Review & Commit - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

The final v2.0 phase. Build an editable review experience from Phase 10's extracted words (`image-upload-flow.tsx` reducer `state.extractWords` — target-language, verbatim) so the user prunes/edits words, gets each kept word DeepL-translated (editable), and commits the kept ones as cards into the already-selected deck via the existing `saveCard` pipeline — with duplicate segregation and a zero-write cancel.

**In scope:** the review/edit UI, dedupe segregation, the two-step translate+edit, the commit + success summary, cancel. Requirements RVW-01..RVW-05.
**Out of scope:** extraction (Phase 10 ✓), image picker/deck selection (Phase 9 ✓), the offline eval dataset (deferred — `10-HUMAN-UAT.md`). No art pass.

</domain>

<decisions>
## Implementation Decisions

### Review UI & flow placement
- **D-01:** The review list is a **separate `<ReviewList>`-style component** rendered by `image-upload-flow.tsx` on `EXTRACT_SUCCESS`, on the same page (NOT a new route; NOT inlined into the flow reducer's render branches). Flow state (`extractWords`, selected deck, image context) is piped in as props. Keeps Phase 9/10 single-page context for Back/Cancel.
- **D-02:** Per-word **row model:** checkbox (kept by default) + inline-editable text field + an X to remove the row entirely; plus **select-all / select-none** controls. Directly satisfies RVW-02.
- **D-03:** **All extracted words start kept (checked).** If the user removes/unchecks all (none kept), the Confirm action is **disabled** with a hint + a way back to the image. Optimises the common "extraction mostly good" case.

### Dedupe segregation & translation timing
- **D-04:** **Dedupe runs BEFORE translation.** Words that already exist in one of the user's decks are segregated into a **separate "Already learned" list at the bottom** — marked already learned, **NOT translated, NOT committed, NOT user-overridable**. Only genuinely-new words proceed. (This is the locked RVW-05 policy: duplicates are *both* flagged AND skipped.)
- **D-05:** **Duplicate-match key:** the extracted (target-language) word compared against existing cards' **`back`** field, **only in the user's decks whose `language` == this deck's language**, **case-insensitive + trimmed**. ("any deck" = any *same-language* deck — cross-language comparison is noise.)
- **D-06:** **Two-step flow.** Step A: prune/edit the **new (non-duplicate)** word list (no translations yet). On "Next": DeepL-translate the kept words. Step B: a second **editable** list (word + editable translation) before final commit.
- **D-07:** **Per-word translation failure** → that row shows an inline error and the user can manually type the translation (or skip that word); other words proceed. A failed translation NEVER blocks the batch. Mirrors manual-add resilience.

### Translation direction & edit
- **D-08:** **Direction = target→native.** The extracted word IS the target-language term → card **`back`**. DeepL-translate it target→native to produce the **`front`**. `saveCard(deckId, front=native[translated, editable], back=target[extracted, editable], source)`. Use existing `/api/translate` with `sourceLang = deck.language`, `targetLang = user's nativeLanguage`.
- **D-09:** In Step B **both fields are editable** per row (native `front` + target `back`) — identical affordance to `TranslationForm`'s two editable inputs. Literally satisfies RVW-03 "exactly like a manual card add".
- **D-10:** Native language comes from the **existing `getUserNativeLanguage`** setting (same source the manual `/deck/new-card` page uses). No new input/prompt.
- **D-11:** **Add a new `"image"` value** to the card `source` union (currently `"manual" | "wordlist"`). The DB `cards.source` column is free `text` — **NO migration**; this is a TypeScript-type change only (`saveCard` signature + any `source`-typed code). Gives clean provenance vs manual/wordlist.

### Commit, summary & cancel
- **D-12:** **Commit = sequential `saveCard` calls, continue-on-failure.** Neon HTTP driver has no transactions — insert kept cards one-by-one; if an insert fails, keep going, collect per-word outcomes. No rollback. Failures are surfaced for manual retry.
- **D-13:** **Success summary (RVW-04):** show counts — **"N added, M already-learned (skipped), K failed"** — then a primary action that takes the user to the deck (or dashboard) where the new cards are. Full transparency incl. segregated duplicates + failures.
- **D-14:** **Cancel (RVW-05):** Cancel at any step discards everything with **zero DB writes** and returns to the add-card start / dashboard. Nothing is persisted until Confirm, so **no confirm dialog** is needed. The "already learned" list is informational only.

### Claude's Discretion
- Exact component name/file path and decomposition (`ReviewList` + row subcomponent etc.).
- Whether translation reuses the client `/api/translate` fetch pattern from `TranslationForm` directly or a small shared helper (must reuse the existing route + DeepL rate limiter, not a new endpoint).
- Step A→B transition mechanics inside the flow (new reducer states/actions vs local component state) — follow the established `useReducer` convention.
- Whether the dedupe card lookup is a new `deck-queries` function or composed from existing queries (must be ownership-scoped like existing queries).
- Loading/disabled affordances during translate + commit (follow Phase 10's in-flight pattern / UI-SPEC tone).

### Folded Todos
None — no pending todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The hand-off + pipeline to reuse (the analogs)
- `src/components/image-upload-flow.tsx` — `EXTRACT_SUCCESS` + `state.extractWords: string[] | null` is the Phase-10→11 hand-off this phase consumes/replaces (currently a transitional stub).
- `src/components/translation-form.tsx` — THE manual add-card analog: debounced `/api/translate` fetch + editable native/target fields + `handleSave → saveCard(..., "manual")`. Step B must mirror this affordance (RVW-03/D-09).
- `src/lib/deck-actions.ts` — `saveCard(deckId, front, back, source)` (front=native, back=target; verifies deck ownership; `revalidatePath`). Widen `source` to include `"image"` (D-11).
- `src/app/api/translate/route.ts` — DeepL pipeline + existing rate limiter; `{ text, sourceLang, targetLang }` (en|fr|es), bidirectional. Reuse for D-08 (do NOT add a new translate endpoint).
- `src/lib/deck-queries.ts` — ownership-scoped card/deck query patterns; basis for the same-language-deck dedupe lookup (D-04/D-05).
- `src/db/schema.ts` — `cards` (`front` native, `back` target, `source` free text), `decks.language`. Confirms no migration for D-11.

### Phase context
- `.planning/phases/10-vision-extraction-endpoint/10-CONTEXT.md` — D-05 (words biased to deck target language), D-06 (verbatim, dedupe/cleanup deferred to *this* phase).
- `.planning/PROJECT.md` — constraint: Neon HTTP driver, no transactions (drives D-12); DeepL auto-translate, editable, is the established add-card model.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TranslationForm` translate+save logic (debounced `/api/translate` → editable fields → `saveCard`) — Step B is essentially this, per row, in the target→native direction.
- `saveCard` server action — the commit primitive (one insert per call + `revalidatePath`). Sequential loop for the batch (D-12).
- `/api/translate` route + its DeepL rate limiter — reuse as-is for translations.
- `deck-queries` ownership-scoped patterns — analog for the same-language-deck dedupe query.

### Established Patterns
- `image-upload-flow.tsx` `useReducer` (spread-and-override, never mutate) — extend or compose for review/translate/commit states.
- Client→server: server actions (`saveCard`) for writes; `fetch("/api/translate")` for translation; `auth.api.getSession` enforced inside server action.
- Per-language decks; `cards.source` is free text (TS union is the only constraint).

### Integration Points
- `image-upload-flow.tsx` `EXTRACT_SUCCESS` → render `<ReviewList words={state.extractWords} deck=… />`.
- New: `source` union widened to `"manual" | "wordlist" | "image"` (saveCard + callers).
- New: a same-language-deck duplicate lookup (likely a `deck-queries` addition) feeding the "already learned" segregation.

</code_context>

<specifics>
## Specific Ideas

- The "already learned" bottom list is a deliberate teaching/transparency touch — segregate, label, never commit, never override (D-04).
- Cost discipline continues from Phase 10: translate ONLY non-duplicate kept words (D-04/D-06), reuse the existing rate-limited DeepL route.
- "Exactly like a manual card add" (RVW-03) is taken literally — Step B = `TranslationForm`'s two-editable-field model per row (D-09).
- Honest to Neon's no-transaction reality: continue-on-failure + a summary that reports failures rather than pretending atomicity (D-12/D-13).

</specifics>

<deferred>
## Deferred Ideas

- Force-adding an "already learned" duplicate (override) — explicitly rejected (D-04/D-14).
- Confirm-on-cancel dialog — rejected; nothing persists pre-Confirm (D-14).
- Lemmatization/dedup *within* the extracted batch itself (e.g. "chien"/"chiens") — out of scope; the user prunes manually in Step A (consistent with Phase 10 D-06). Could be a future enhancement.
- Bulk auto-retry of failed inserts/translations — not in scope; failures are surfaced for manual handling (D-12/D-07).
- Large-list virtualization (>50 rows) — extraction is capped at ~50 (Phase 10 D-08), so not needed now.

</deferred>

---

*Phase: 11-review-commit*
*Context gathered: 2026-05-19*
