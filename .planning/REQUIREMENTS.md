# Requirements: LeoCards v4.0 Daybreak (UI redesign)

**Defined:** 2026-06-19
**Milestone goal:** Replace LeoCards' utilitarian UI with the warm, cohesive "Daybreak" design system across every primary screen — friendly, mobile-first, anchored by Leo the lion.

**Source of truth:** `design/handoff-daybreak/` (README + hi-fi mocks + wireframes). Each screen also has a blue-sky brief in `design/ui-redesign-requirements-*.md`.

**Nature:** This is a **visual/UX redesign** — existing behavior, data, and routes are preserved; only the presentation layer changes. "Recreate the mocks pixel-faithfully in our Next.js 16 / React 19 / Tailwind v4 + shadcn stack" (handoff guidance).

## v4.0 Requirements

### Design System (DSY) — shared foundation, reused by every screen

- [x] **DSY-01**: The Daybreak tokens (cream `#FFF6E9` / amber `#F28A1F` palette, type scale, spacing, radii, shadows) and fonts (Baloo 2 display + Figtree body) are applied app-wide via the theme system. *(Prototyped in the spike: `src/app/globals.css`, `src/app/layout.tsx`.)*
- [x] **DSY-02**: Shared Daybreak components exist and are reused across screens: the flat-geometric Leo `LionFace` mark, labeled field, primary button (with spinner/disabled state), pill/chip, and card surface — matching the handoff atoms. *(Prototyped: `src/components/daybreak/`.)*
- [x] **DSY-03**: Every redesigned screen is mobile-first single-column, one-hand reachable, touch targets ≥44px, with inline per-field validation (red border + helper after submit, never toasts) and a single full-width primary action that shows a spinner + disables the form while submitting.

### Onboarding & Auth (ONB)

- [x] **ONB-01**: Login is redesigned to Daybreak — brand block + habitat-flashcard card (sunrise scene + form) over ghost-peek edges + "Sign up" cross-link. *(Done in the spike — verified against the mock.)*
- [x] **ONB-02**: Signup ("Create your account": Name, Email, Password min-8 with helper) is redesigned to Daybreak, covering default, per-field validation, "account with this email already exists", and submitting states. No language field (chosen in welcome).
- [x] **ONB-03**: Forgot password ("Reset your password": explainer + Email + "Send reset link") is redesigned, including the privacy-safe sent confirmation ("If an account exists, we've sent a link…" — never reveals registration) and invalid-email/submitting states.
- [x] **ONB-04**: Reset password ("Set a new password": New + Confirm, min-8, "Passwords do not match") is redesigned, including the expired/invalid-link dead-end ("Request a new link" → Forgot) and submitting states.
- [x] **ONB-05**: First-visit welcome is a dedicated 3-step flow — (1) Meet Leo, (2) the promise with an animated mini-habitat preview, (3) choose native + target languages via dropdowns (target list excludes the chosen native) — that creates the first deck and routes to Dashboard, with "creating…" and error (picks preserved) states.
- [x] **ONB-06**: The shared empty states match Daybreak — empty deck (Leo + "Your deck is empty" + Browse words / Add a card) and no-search-results ("No words match '…'" + Clear search).

### Study (STU)

- [x] **STU-01**: The study card is redesigned to Daybreak — big flashcard over a ghost-peek stack, prompt ("WHAT'S THE TRANSLATION?"), tap-to-reveal, swipe →/← with green/red color feedback and the "Swipe → if you got it · ← still learning" hint — preserving the QA state badge (Phase 14) when QA-authed.
- [ ] **STU-02**: The study-session result/end screen (cards studied · % correct · learned + "Back to deck", plus the level-up celebration hand-off) is redesigned to the Daybreak visual language.

### Dashboard — "My Deck" (DSH)

- [ ] **DSH-01**: Persistent app header — Leo + "LeoCards" wordmark, a deck picker (active-language chip, switch decks, and create-a-new-deck inline language picker with a per-language "creating…" state), and logout.
- [ ] **DSH-02**: Habitat hero medallion — Leo on a sunrise disc with a conic progress ring + level badge, "Habitat · Level N", "X of Y cards to Level N+1" (no next-threshold at max), linking to the Habitat screen.
- [ ] **DSH-03**: Action line — full-width "Start studying" primary (dims when nothing due) + a status row that adapts (e.g. "12 due" / "0 due" / "Resting · 2h 15m" live countdown / "All paused") with "Add a card" alongside.
- [ ] **DSH-04**: "Your words" is a tap-to-expand inline accordion (height/opacity transition, **not** a swipe gesture) showing a count when collapsed and a search field + word rows when open, including a no-search-results state.
- [ ] **DSH-05**: Word row — native term (bold) + translation + source tag (Curated / Added by you / Paused) + a 3-segment mastery meter (green + check at 3/3) + pause/resume and edit actions; paused rows read de-emphasised but present.
- [ ] **DSH-06**: Edit-card modal — editable native/target fields, Save / Discard, and Delete with a confirmation step ("Delete this card? This can't be undone."), plus inline save/delete error states.
- [ ] **DSH-07**: Dashboard covers all states in Daybreak — cards-due, none-due, resting (cooldown), all-paused, empty deck, brand-new-user first-visit, and search-active-no-results.

### Add a Card (ADC)

- [ ] **ADC-01**: A single Add-a-Card destination with a segmented toggle ("Type a word | From an image"), a persistent context line ("EN → ES · saves to your Spanish deck"), and a "‹ My deck" escape.
- [ ] **ADC-02**: Type-a-word — two linked native/target fields with an auto-translate badge between them (typing either side auto-fills the other with a shimmer/"Translating…" pending state; both sides editable; Save unlocks only when both are filled; success shows a "Card saved" banner and clears for the next), covering empty, translating, translate-fail, save-fail, and saved states.
- [ ] **ADC-03**: From-an-image — a full-screen stepper (Pick → Confirm+deck → Extracting → Review words → Check translations → Result) with a drop zone (browse/paste, file-type validation), calm long-wait progress (up to ~30s, cancelable), an editable keep/exclude review list ("already in your deck · skipped", "keep at least one"), editable translation pairs, and result outcomes (success / partial counts / all-failed). Nothing is saved until the explicit "Add N cards" commit.

### Browse Words (BRW)

- [ ] **BRW-01**: Topic-tiles landing — 14 category cards (Greetings … Work) each with a geometric amber icon on a medallion + word count.
- [ ] **BRW-02**: Word list per topic — back-to-topics + topic header, a CEFR LEVEL tile row (All / A1 / A2 / B1) as its own section, and the EN→ES context line.
- [ ] **BRW-03**: Word row — English primary / Spanish beneath (with an "ES" marker) + a CEFR level chip + a trailing circular toggle (outlined **+** to add, filled amber **✓** when in deck); in-deck rows get a warm tint; add/remove is optimistic & instant with row-local per-row error recovery that never loses scroll position.
- [ ] **BRW-04**: Browse covers its states — full list, level-filtered, and empty result ("No words at this level" + "Show all levels").

### Habitat (HAB)

- [ ] **HAB-01**: The habitat is a living, flat-geometric scene whose elements stack cumulatively by level (L1 bare mound → L2 lake/lilies → L3 trees/rocks → L4 flowers/grass/butterflies → L5 elephant → L6 mushrooms → L7 cave → L8 toys → L9 songbirds + golden-hour), driven by the learned-card count — keeping the level-by-level composition from the handoff.
- [ ] **HAB-02**: Mood is expressed three independent ways and is independent of level — Leo's seated expression, the ambient light, and a mood chip label (Excited / Happy / Neutral / Sad).
- [ ] **HAB-03**: A bottom progress card shows "Level N · <name>", a progress bar, and the named next unlock ("Next at L6: mushrooms"); at L9 it reads "Course 1 complete". Overlays: back button + level badge.
- [ ] **HAB-04**: Ambient motion (Leo breathing, water shimmer, cloud drift, butterfly float, sun glow) is **light on mobile** and **fully paused under `prefers-reduced-motion`** (static scene + "Motion paused").
- [ ] **HAB-05**: Habitat covers its states in Daybreak — new-user L1 (sparse/inviting), mid L5 (default), lush L9, level-up celebration (~2.5s confetti then settles), decaying/sad (desaturated, encouraging "Leo misses you"), offline (cached banner, scene still shown), error (friendly + Try again), and reduced-motion.

## Future Requirements (deferred)

- **Account / Settings page** redesign — not in this handoff batch; future.
- **Commissioned Leo art / real brand mark** + monoline topic-icon set — the CSS-drawn placeholders ship as-is this milestone; swap later while keeping the Daybreak palette.
- **v3.0 carryover** (separate future milestone): Core-Journey QA harness (QAJ-01..06) + Performance (PERF-01..06) — see `milestones/v3.0-REQUIREMENTS.md`.

## Out of Scope

- **Backend / business-logic changes** — this is a presentation-layer redesign; SRS engine, auth, translation, extraction, and habitat-state computation are preserved unchanged (any logic touch is incidental glue only).
- **New product features** beyond restyling the existing screens — the redesign reinterprets current functionality, it doesn't add capabilities.
- **Live client-side 3D on `/habitat`** — remains out (pre-rendered/CSS approach stands; redesign restyles the surface, not the render strategy).
- **Desktop-bespoke layouts** — mobile-first; desktop is the same single-column design centered/scaled, not a separate grid.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DSY-01 | Phase 19 | Complete |
| DSY-02 | Phase 19 | Complete |
| DSY-03 | Phase 19 | Complete |
| ONB-01 | Phase 19 | Complete |
| ONB-02 | Phase 19 | Complete |
| ONB-03 | Phase 19 | Complete |
| ONB-04 | Phase 19 | Complete |
| ONB-05 | Phase 19 | Complete |
| ONB-06 | Phase 19 | Complete |
| STU-01 | Phase 20 | Complete |
| STU-02 | Phase 20 | Pending |
| DSH-01 | Phase 21 | Pending |
| DSH-02 | Phase 21 | Pending |
| DSH-03 | Phase 21 | Pending |
| DSH-04 | Phase 21 | Pending |
| DSH-05 | Phase 21 | Pending |
| DSH-06 | Phase 21 | Pending |
| DSH-07 | Phase 21 | Pending |
| ADC-01 | Phase 22 | Pending |
| ADC-02 | Phase 22 | Pending |
| ADC-03 | Phase 22 | Pending |
| BRW-01 | Phase 23 | Pending |
| BRW-02 | Phase 23 | Pending |
| BRW-03 | Phase 23 | Pending |
| BRW-04 | Phase 23 | Pending |
| HAB-01 | Phase 24 | Pending |
| HAB-02 | Phase 24 | Pending |
| HAB-03 | Phase 24 | Pending |
| HAB-04 | Phase 24 | Pending |
| HAB-05 | Phase 24 | Pending |
