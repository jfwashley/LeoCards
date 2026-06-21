# Phase 21: Dashboard — "My Deck" - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-skin the existing **Dashboard ("My Deck")** to the Daybreak design system across all seven DSH states: the persistent **app header** (DSH-01), the **habitat hero medallion** (DSH-02), the **Option-D action line** (DSH-03), and the **"Your words" inline accordion** with word rows, search, and the edit-card modal (DSH-04/05/06) — covering cards-due, none-due, resting/cooldown, all-paused, empty-deck, brand-new-user, and search-no-results (DSH-07).

**Presentation-layer only.** The SRS due/cooldown computation (`assembleSession` / `earliestCooldownEnd`), deck switching + creation (`createDeck`), card pause/resume/edit/delete server actions, the habitat-state engine (`computeHabitatState`, L9 cap), the live countdown + `router.refresh` on expiry, and the QA state badge (Phase 14) are all **preserved unchanged**. Builds on the Daybreak foundation + primitives shipped in Phase 19.

Requirements: **DSH-01, DSH-02, DSH-03, DSH-04, DSH-05, DSH-06, DSH-07**.

</domain>

<decisions>
## Implementation Decisions

### Persistent Header & Deck Picker (DSH-01)
- **D-01:** **Deck picker = dropdown popover from a compact pill.** Replace the shadcn `Select` in `deck-switcher.tsx` with a Daybreak popover anchored to the compact `ES ▾` LangChip pill (the pill itself shows only the LangChip language code + chevron, per the mock — not the deck name). Tapping it opens a popover that lists all decks with their **full language names** and a check/marker on the active one, plus a **`+ New deck`** row that expands **inline to language chips** (languages the user isn't already learning), each chip showing its own per-language **`creating…` spinner + error** state. Reuses the existing `createDeck` action and the current create/error logic from `deck-switcher.tsx` — only the surface/affordance changes. **Flag emojis (🇬🇧🇫🇷🇪🇸) are replaced by the text `LangChip`** ("EN"/"FR"/"ES"), consistent with the Daybreak no-emoji rule. Header brand: the 🐯 in `app-header.tsx` → `LionFace` + "LeoCards" wordmark; logout → the Daybreak logout glyph.

### Heading & Learning Stats
- **D-02:** **Drop the `My Deck` heading and the cross-language "learned" breakdown — match the mock.** The Daybreak dashboard has no standalone "My Deck" heading and no `getLanguageBreakdown` line ("French: 14 · Spanish: 6 learned"). The active deck's learned count instead surfaces in the **"Your words" accordion header** ("N learned"); deck identity lives in the picker pill + hero. `getLanguageBreakdown` becomes unused — the planner should drop the fetch from `dashboard/page.tsx` and the `languageBreakdown` prop threaded through `DeckView`. (See Deferred — multi-deck motivation could revisit this later.)

### "Your words" Accordion (DSH-04 / DSH-05)
- **D-03:** **Collapsed by default; tap to expand.** "Your words" starts collapsed on load (matches the mock's default screen — habitat hero + "Start studying" stay above the fold). Expansion is a **height/opacity transition, not a swipe gesture** (DSH-04). The **search field lives inside the expanded panel** (you expand to search). No persisted open/closed state and no auto-expand-on-type. Today's always-visible list (`card-list.tsx`) is wrapped in this accordion.
- **D-04:** **⚠ Word-row orientation — DELIBERATE OVERRIDE of the handoff.** Keep **native term bold on top / target translation muted beneath** — the *opposite* of `daybreak-dashboard.jsx`'s `CardRow` (which puts the target `t` bold on top, native `n` beneath). Rationale: internally consistent with the rest of the app (the edit dialog's "Native word" field first, today's desktop table). **Adopt the Daybreak row *styling*** — source tag (Curated / Added by you / Paused), the 3-bar mastery meter (amber bars, green + check at 3/3), and the pause+edit icon buttons — but **not** the mock's target-first ordering. **This is intended, not a defect:** downstream UI checker/`gsd-ui-auditor` must NOT "correct" the row back to target-on-top to match the mock.

### Habitat Hero Medallion (DSH-02)
- **D-05:** **L9 = max level → gold treatment + "Course 1 complete".** The engine caps the habitat at **L9** (the mock's `level >= 10` gold branch is dead code here — same class of bug as the L10 dead branch flagged in Phase 20). At max level: gold medallion ring + gold level badge, subtitle reads **"Course 1 complete"**, and the "X of Y cards to Level N+1" line is **hidden** (no next threshold; `nextLevelThreshold === null`). Retarget the mock's `>= 10` checks to the real L9 cap. Copy aligns with Phase 24's **HAB-03** ("at L9 it reads 'Course 1 complete'").
- **D-06:** **Cooldown hero = napping Leo *over* live progress.** During the resting/cooldown state only, the hero shows the napping treatment (dimmed medallion + `z` + a "recharging" cue) **while keeping the conic progress ring accurate and the "X of Y cards to Level N+1" line visible** — i.e. NOT the mock's fully-greyed `progress: 0` version. The napping personality and the real progress coexist in the same hero. The countdown ("Resting · 2h 15m") stays **only** in the action-line status row — do **not** duplicate it on the hero. (None-due and all-paused states keep the normal progress hero, no nap.)

### Carried forward from Phases 19–20 (locked — not re-litigated)
- **L-01:** **Leo, not tiger; no emoji.** `LionFace` everywhere the 🐯 currently appears; text `LangChip` replaces flag emojis. (Phase 19/20.)
- **L-02:** **Behavior preserved, surface only**, reusing Daybreak primitives (`TField`/`TBtn`/`Pill`/`Card`/`LionFace`). Any logic touch is incidental glue. (Phase 19/20 pattern; REQUIREMENTS "Out of Scope".)
- **L-03:** **Brand-new-user state == empty-deck state.** 0-deck users already redirect to `/welcome` (Phase 19 D-05), so the dashboard never renders a "no deck" case — DSH-07's "brand-new-user first-visit" resolves to the **empty-deck** state. The empty-deck and no-search-results states are **already Daybreak-styled** in `card-list.tsx` (Phase 19 ONB-06) — reuse/verify, do not rebuild.
- **L-04 (DSH-02 locked todo):** Replace the legacy 80px `.webp` thumbnail (`habitat-widget.tsx` → `habitat-3d-widget-image.tsx`) with the `HabitatHero` + `HabitatMedallion` (LionFace on a sunrise disc + conic progress ring + level badge). (ROADMAP/STATE carry-forward.)
- **L-05 (DSH-03 locked todo):** Remove the **"Browse words"** link from the populated-deck action line (`deck-view.tsx` ~L195). The Daybreak action line is **Start studying + status + Add a card** only; "Browse words" stays **solely** in the empty-deck state (`card-list.tsx`). (ROADMAP/STATE carry-forward.)
- **L-06 (process — Phase 20 lesson):** Before restyling, the planner must **audit `e2e/*.spec.ts` for literal-text Playwright locators** tied to any copy/chrome this phase changes, and retarget them to role+accessible-name or `data-testid` (preserving behavioral intent, never re-adding old copy). Known at-risk strings: `"My Deck"` heading (removed, D-02), `"Browse words"` (removed from action line, L-05), source-tag copy `"word list"` → **"Curated"** / `"manual"` → **"Added by you"**, the cooldown CTA `"Next cards in …"` → **"Resting · …"**, and the `"All cards are paused — unpause one to study."` message → the **"All paused"** status. Grep the **whole** `e2e/` dir for each changed string (the stale literal often lives in more than the obvious spec) and watch for strict-mode multi-match. Add changed specs to the owning plan's `files_modified`.

### Claude's Discretion
- **Whether `HabitatMedallion` is a shared `src/components/daybreak/` primitive or a dashboard-local component** — planner's call (Phase 24 has its own full scene + badge overlay, so reuse is not guaranteed; build shareable if cheap).
- **Edit-card modal restyle (DSH-06):** re-skin the shadcn `Dialog` in `card-edit-dialog.tsx` to Daybreak (`TField`/`TBtn`, Daybreak surface), **preserving** the Save / Discard / Delete-with-inline-confirm ("Delete this card? This can't be undone." → Delete / Keep card) flow and the save/delete error states. The mock doesn't draw the modal — follow the Daybreak system.
- **The accordion's open-panel scroll treatment:** the mock's bottom mask-fade is an artifact of the fixed phone-shell; on the real responsive page, letting the page scroll naturally is fine — mask-fade optional.
- Exact token values, spacing, prop shapes, file layout, and the precise status-row copy mapping — pull from the Daybreak system and existing `src/components/daybreak/*` primitives.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard design contract (visual source of truth — recreate faithfully, EXCEPT the D-04 row override)
- `design/handoff-daybreak/daybreak-dashboard.jsx` — the locked dashboard mock: `TopBar`, `HabitatHero` + `HabitatMedallion` (conic ring, level badge, `sleeping` variant), `ActionLine` + `StudyButton` + `StatusText` (due / none / cooldown / paused), `WordsAccordion`, `CardRow`, `Mastery`, `SourceTag`, `LangChip`, `IconBtn`, and the `Db*` state screens (due/none/resting/paused/words-open). **NOTE: D-04 overrides its `CardRow` target-on-top ordering → keep native on top.**
- `design/handoff-daybreak/LeoCards Daybreak Dashboard.html` — renders the dashboard artboards (all states) for visual reference.
- `design/ui-redesign-requirements-dashboard.md` — the blue-sky brief: content/actions/states + the **Mastery model** (3 rounds, two directions, "learned" = 3/3 → feeds habitat) and **cooldown** domain concepts the representations must respect.

### Daybreak design system (tokens + primitives — already shipped in Phase 19)
- `design/handoff-daybreak/README.md` §"Design System — Daybreak tokens" + §"Shared components" — palette, type, spacing, radii, shadows.
- `design/handoff-daybreak/hifi-daybreak.jsx` — the `d1` theme object (exact token values).
- `design/handoff-daybreak/hifi-shared.jsx` — `LionFace`, `TField`, `TBtn`, `Pill`, `Card` references (ported into `src/components/daybreak/*` in Phase 19).

### Requirements, roadmap & prior context
- `.planning/ROADMAP.md` §"Phase 21: Dashboard — 'My Deck'" — goal + 5 success criteria + the **DSH-02 / DSH-03 UAT carry-forward** with precise current-code targets.
- `.planning/REQUIREMENTS.md` — **DSH-01..DSH-07** (the requirements this phase satisfies).
- `.planning/phases/19-daybreak-foundation-onboarding-auth/19-CONTEXT.md` — Daybreak primitive strategy (D-01/D-02) + the 0-deck→`/welcome` routing (D-05) + ONB-06 empty/no-search states.
- `.planning/phases/20-study-screen/20-CONTEXT.md` — the re-skin pattern (preserve behavior, restyle surface) + the e2e-selector / dead-branch lessons.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/daybreak/{lion-face,t-btn,t-field,pill,card,auth-card}.tsx` — Daybreak primitives (LionFace mark, primary button, labeled field, pill/chip, card surface). The header brand, deck pill, action buttons, edit modal, and word rows all compose these.
- `src/components/card-list.tsx` empty-deck (`Your deck is empty` + Leo medallion + Browse words / Add a card) and no-search-results (`No words match "…"` + Clear search) states are **already Daybreak** (ONB-06) — keep them; the accordion wraps the populated list above them.
- `src/components/qa-state-badge.tsx` (`QaStateBadge`) + `readQaAuth()` — must stay intact and render only when QA-authed (preserve from `card-list.tsx`).

### Screens / components to redesign (presentation only — preserve behavior)
- `src/app/(protected)/dashboard/page.tsx` — server entry; provides `decks`, `cardRows` (front/back/source/masteryRound/pausedAt/cooldownUntil), `hasDueCards`, `earliestCooldownEnd`, `habitatState`, `celebratingLevel`, `qaMode`. Keeps the 0-deck→`/welcome` redirect. **Drop `getLanguageBreakdown`** (D-02).
- `src/components/deck-view.tsx` — client orchestrator: composes header + hero + action line + list. **Remove the `My Deck` heading + breakdown (D-02); remove "Browse words" from the action line (L-05);** restyle "Start studying" / `CountdownTimer` / "Add a card"; fold the "All cards are paused" message into the action-line status (D-06 sibling).
- `src/components/app-header.tsx` — restyle to the Daybreak `TopBar` (LionFace + wordmark, compact deck pill, logout glyph); drop the 🐯.
- `src/components/deck-switcher.tsx` — convert to the dropdown popover + inline create flow (D-01); flag emoji → `LangChip`.
- `src/components/card-list.tsx` — wrap the populated list in the "Your words" accordion (D-03); restyle rows to Daybreak `CardRow` styling with **native-on-top** (D-04); source-tag copy → Curated / Added by you / Paused; 3-bar mastery meter; search inside the accordion; preserve QA badge + optimistic pause toggle.
- `src/components/card-edit-dialog.tsx` — Daybreak restyle, behavior preserved (Claude's discretion above).
- `src/components/habitat-widget.tsx` + `src/components/habitat-3d-widget-image.tsx` — replace with `HabitatHero` + `HabitatMedallion` (conic ring, level badge, L9-max gold + napping-cooldown variants — D-05/D-06).

### Integration Points (preserved unchanged)
- `src/lib/deck-actions.ts` (`createDeck`, `editCard`, `deleteCard`); `POST /api/cards/[id]/pause|unpause` (optimistic toggle + `router.refresh`).
- `src/lib/habitat-engine.ts` (`computeHabitatState`, `LEVEL_THRESHOLDS`, **L9 cap**); `src/lib/habitat-queries.ts`.
- `src/lib/study-engine.ts` (`assembleSession`, `earliestCooldownEnd`); `src/lib/study-queries.ts`; `src/lib/deck-queries.ts`.
- The `CountdownTimer` (60s tick + `router.refresh()` when cooldown expires) in `deck-view.tsx` — keep the logic, restyle the surface.

### Established Patterns
- Daybreak tokens via Tailwind semantic classes (`bg-background`, `text-foreground`, `text-primary`) + `--db-*` CSS vars; display text uses `font-display` (Baloo 2); `daybreak/*` atoms use inline styles for exact token values.
- Animation via `motion/react` (use for the accordion height/opacity transition).
- Optimistic pause toggle: `useTransition` + a `pendingCardIds` set, `router.refresh()` on success.

</code_context>

<specifics>
## Specific Ideas

- **Status-row mapping (per the mock's `StatusText`):** due → "12 due" (amber dot); none → "0 due" (outline dot); cooldown → napping-Leo glyph + "Resting · {countdown}"; all-paused → pause glyph + "All paused". The live countdown reuses today's `CountdownTimer` value, re-labeled.
- **Mastery meter:** the mock's `Mastery` uses 3 vertical bars (amber) that turn **green + check at 3/3**, mapping 1:1 to `masteryRound` 0–3. Paused rows render at `step: 0` / de-emphasised (opacity ~0.55) but present.
- **Source tag copy:** Curated (`source === 'wordlist'`), Added by you (`manual`), Paused (when `pausedAt`).
- **Action line is "Option D":** full-width "Start studying" (amber when due / dimmed `#F4E7D2` when not) above a row of [status · "Add a card"].
- The cooldown napping touch should feel **encouraging, not a lockout** (brief's framing) — D-06 keeps progress visible so it reads as "recharging," not "blocked."

</specifics>

<deferred>
## Deferred Ideas

- **Cross-language "learned" breakdown** (e.g. "French: 14 · Spanish: 6") — dropped now to match the mock (D-02); could return if multi-deck motivation becomes a goal (e.g. show only with 2+ decks).
- **Bottom-sheet deck picker** — considered for D-01, declined in favour of the dropdown popover (closer to current logic, no new primitive).
- **Remember accordion open/closed state across visits (localStorage)** — considered for D-03, declined (collapsed default).
- **Account / Settings page** — separate future milestone (not in this handoff batch); unchanged from Phase 19.
- **⚠ Flag for the team (not Phase 21 work):** the L9-vs-L10 inconsistency recurs — the mock hard-codes `level >= 10` as max while the engine caps at L9 (D-05 retargets it for the medallion). The broader legacy "level 10" copy/logic (also flagged in Phase 20's `level-up-overlay` dead branch and the habitat design doc) should be reconciled in a non-Daybreak logic ticket.

</deferred>

---

*Phase: 21-dashboard-my-deck*
*Context gathered: 2026-06-21*
