# Phase 9: Image Upload & Deck Selection - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

From the existing add-card flow, a user can pick a single valid image (JPG/PNG/WebP, ~5MB cap), preview it, replace or cancel it, and choose the target deck — all **before** any extraction happens. No vision/extraction (Phase 10), no review/commit (Phase 11). UI hint: yes.

Requirements covered: IMG-01, IMG-02, IMG-03, IMG-04, IMG-05.

</domain>

<decisions>
## Implementation Decisions

### Entry point & flow shape
- **D-01:** The image feature is a **mode toggle on the existing `/deck/new-card` page** ("Type a word" vs "From image") — not a separate route or modal. Reuses the page's existing deck list + native-language server setup.
- **D-02:** The image mode is a **stepped flow**: Step 1 = pick/preview the image; Step 2 = confirm the target deck. (User chose stepped over a single combined screen.)
- **D-03:** Progression to Phase 10 extraction is via an **explicit "Extract" button**, disabled until a valid image AND a deck are set. No auto-advance on image selection (avoids accidental API spend). Mirrors the explicit "Save" pattern in `TranslationForm`.

### Image picker & preview UX
- **D-04:** File selection supports **click-to-open picker + drag-and-drop + clipboard paste** (screenshots via Ctrl+V).
- **D-05:** Preview is a **medium contained thumbnail** — scaled to fit a fixed max box (~`max-h-64`) inside a card, aspect ratio preserved (handles both tall and wide images without dominating the screen).
- **D-06:** Replace/cancel: an **X overlay on the thumbnail** clears the image back to the empty picker (full back-out), plus a **"Choose different image"** button that re-opens the picker directly (swap). Satisfies success criterion 4.

### Validation & error UX
- **D-07:** Invalid files (wrong type or >5MB) are **rejected immediately on selection**, client-side, before entering the preview state — never previewed. Satisfies IMG-03 ("rejected before upload").
- **D-08:** Errors are shown as an **inline message in/below the drop zone**, reusing the existing inline-error pattern from `TranslationForm` (`translationError`). No toast/banner infra (none exists today).
- **D-09:** Error copy is **specific and friendly** — names the actual rule violated and how to fix it (e.g. "That image is 7MB — please pick one under 5MB"; "JPG, PNG, or WebP only — that file is a HEIC").

### Deck selector reuse
- **D-10:** **Reuse the existing `DeckSwitcher` component as-is**, including its inline create-deck affordance (gives a no-deck user an escape hatch without leaving the flow).
- **D-11:** Default pre-selected deck = **`?deck=` param if present, else `decks[0]`** — identical logic to the current `new-card/page.tsx`. Satisfies success criterion 5.
- **D-12:** The deck selector lives in **Step 2**, shown alongside a recap thumbnail of the chosen image and the Extract button.

### Claude's Discretion
- Exact toggle UI (tabs vs segmented control vs button pair) — pick what's consistent with existing UI primitives.
- Component/file decomposition, client/server boundary, and how the stepped state is modeled (the codebase uses `useReducer` for `TranslationForm` — a similar reducer is a reasonable analog but not mandated).
- Drop-zone visual styling and the precise back-navigation between Step 2 and Step 1.

### Folded Todos
None — no pending todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

No external specs or ADRs — requirements are fully captured in the decisions above plus the roadmap/requirements entries below. Downstream agents should read these planning files:

### Phase definition
- `.planning/ROADMAP.md` §"Phase 9: Image Upload & Deck Selection" — goal, dependencies (Phase 2, Phase 8), success criteria.
- `.planning/REQUIREMENTS.md` — requirements IMG-01 through IMG-05.
- `.planning/PROJECT.md` §"Current Milestone: v2.0 Image-to-Flashcards" — scope guardrail (image feature only, no art pass; extracted words treated like manual cards).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/deck-switcher.tsx` — `DeckSwitcher` (Radix `Select` + inline create-deck). Reuse directly (D-10). Props: `decks: DeckOption[]`, `activeDeckId`, `onDeckChange`, `nativeLang`.
- `src/components/translation-form.tsx` — reference for the established client-component pattern: `useReducer` state machine, zod validation, lucide-react icons, inline error string rendering. Image flow should follow the same conventions (D-08).
- `src/components/ui/*` — available primitives: `button, card, dialog, input, label, select, form`. **No file-upload/dropzone component exists** — the picker (D-04/D-05/D-06) is net-new UI.

### Established Patterns
- Add-card destination is the server component `src/app/(protected)/deck/new-card/page.tsx`: awaits session, reads `?deck=` searchParam, `Promise.all([getUserDecks, getUserNativeLanguage])`, computes `activeDeck = decks.find(id === requestedDeckId) ?? decks[0]`, redirects to `/dashboard` if no decks. The image toggle (D-01) plugs into this same page; default-deck logic (D-11) already exists here.
- Deck/lang labels: `LANGUAGE_LABELS` map (`en/fr/es`) lives in the new-card page; `FLAG_MAP` in `DeckSwitcher`.
- Tailwind CSS; Next.js 16 App Router; server actions in `src/lib/deck-actions.ts` (`saveCard`, `createDeck`).

### Integration Points
- `new-card/page.tsx` is the single integration seam — add a client-side mode toggle that swaps between `<TranslationForm>` and the new image flow component, passing the same `decks` / `activeDeck` / `nativeLang` data already fetched server-side.
- The Extract button (D-03) is the documented hand-off point to Phase 10 — Phase 9 leaves it wired to a no-op / placeholder; Phase 10 connects the endpoint.

</code_context>

<specifics>
## Specific Ideas

- ~5MB size cap and JPG/PNG/WebP allow-list are hard validation rules (IMG-02, IMG-03).
- Error copy should state the offending value and the allowed limit, not a generic message (D-09).
- Clipboard-paste of screenshots is explicitly wanted (D-04) — a common real flow for "snap a page of vocab".

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Extraction = Phase 10, review/commit = Phase 11, cute 2D illustrated art pass = still deferred per PROJECT.md.)

</deferred>

---

*Phase: 09-image-upload-deck-selection*
*Context gathered: 2026-05-18*
