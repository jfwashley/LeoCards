---
phase: 19-daybreak-foundation-onboarding-auth
plan: "05"
subsystem: ui
tags: [react, tailwind, daybreak, design-system, empty-states, lion-face]

requires:
  - phase: 19-daybreak-foundation-onboarding-auth
    plan: "01"
    provides: LionFace component (lion-face.tsx) + Daybreak CSS tokens (--db-pill-bg, --db-btn-shadow, --primary, --foreground, --background)

provides:
  - Daybreak empty-deck state in card-list.tsx (ObEmptyDeck): Leo medallion 110px #FFF1DC, heading "Your deck is empty", body copy, Browse words primary link + Add a card ghost link
  - Daybreak no-search-results state in card-list.tsx (ObNoSearch): Leo medallion 96px #F3E3C6, heading "No words match {query}", body copy, Clear search ghost button calling setQuery("")
  - Both empty states exercised by e2e/02-first-visit-deck-creation.spec.ts (owned by 19-04)

affects:
  - e2e/02-first-visit-deck-creation.spec.ts (19-04) — both empty-state behavioral assertions target these exact strings
  - Phase 21 DSH-* dashboard redesign (card table/rows left untouched; scope guard honored)

tech-stack:
  added: []
  patterns:
    - LionFace medallion: rounded-full container (fixed px size, inline background color) wrapping <LionFace> with standard Daybreak lion props
    - Ghost button in card-list: inline style (background var(--background), border 1.5px solid #EDDFC9, height px) + Tailwind rounded-[14px] + font-display font-bold
    - Primary link styled as Daybreak button: bg-primary text-primary-foreground shadow-[var(--db-btn-shadow)] rounded-[14px] using Link component

key-files:
  created: []
  modified:
    - src/components/card-list.tsx — empty-deck + no-search-results blocks restyled to Daybreak; LionFace imported; all other behavior/props/exports unchanged

key-decisions:
  - "Used Link (not button) for Browse words to keep it an accessible link role — e2e spec uses getByRole('link', { name: 'Browse words' })"
  - "Used Link (not button) for + Add a card — routes to /deck/new-card (no deck param; falls back to decks[0]) since card-list does not receive deck ID"
  - "Clear search in empty no-results state is a real <button type=button> (not a div) — e2e spec uses getByRole('button', { name: 'Clear search' })"
  - "Ghost button/link style uses inline style for background+border (same pattern as auth-card.tsx) and Tailwind for layout/radius/font"
  - "No words match heading uses &ldquo;/&rdquo; HTML entities matching the handoff curly-quote rendering"

patterns-established:
  - "Daybreak medallion pattern: <div className='rounded-full flex items-center justify-center' style={{ width: N, height: N, background: '#XXXXXX' }}><LionFace size={M} mane='#E8973B' face='#FFD9A6' muzzle='#FFF1DC' ink='#4A331C' /></div>"
  - "Ghost action in Daybreak: border 1.5px solid #EDDFC9, background var(--background), rounded-[14px], font-display font-bold"

requirements-completed: [ONB-06]

duration: 10min
completed: 2026-06-20
---

# Phase 19 Plan 05: Daybreak Empty-State Restyle Summary

**Two shared empty states in card-list.tsx restyled to Daybreak ObEmptyDeck/ObNoSearch — Leo medallions, Baloo 2 headings, amber primary + ghost action buttons — with card table/rows untouched**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-20T12:20:00Z
- **Completed:** 2026-06-20T12:30:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced the bare "Your deck is empty" block with the Daybreak ObEmptyDeck layout: 110px #FFF1DC Leo medallion (LionFace size=66), font-display heading "Your deck is empty", body "Add a few words and Leo's habitat starts to grow.", and an 80%-width column with a primary amber "Browse words" link to `/deck/browse` and a ghost "+ Add a card" link to `/deck/new-card`
- Replaced the plain "No cards match …" block with the Daybreak ObNoSearch layout: 96px #F3E3C6 Leo medallion (LionFace size=56), font-display heading interpolating the live query as `No words match "…"`, body "Try a different spelling, or clear the search.", and a ghost "Clear search" `<button>` whose onClick calls `setQuery("")`
- Verified scope guard: card table, mobile card rows, search bar (including its existing X/Clear button), QA badge, CardEditDialog, all props and exports — all untouched
- `npx tsc --noEmit` exits 0; 1956 unit tests pass (6 skipped); no regressions

## Exact Strings Produced (e2e contract with 19-04)

| State | String/Role | e2e selector satisfied |
|-------|-------------|------------------------|
| Empty deck | "Your deck is empty" (h2) | `getByText("Your deck is empty")` |
| Empty deck | "Browse words" (`<Link href="/deck/browse">`) | `getByRole("link", { name: "Browse words" })` |
| Empty deck | "+ Add a card" (`<Link href="/deck/new-card">`) | `getByRole("link", { name: /add a card/i })` |
| No results | "No words match …" (h2, live query) | `getByText(/No words match/)` |
| No results | "Clear search" (`<button>`) | `getByRole("button", { name: "Clear search" })` |

## Task Commits

1. **Task 1: Restyle empty-deck + no-search-results to Daybreak (ONB-06)** — `86956a0` (feat)

**Plan metadata:** (committed with SUMMARY below)

## Files Created/Modified

- `src/components/card-list.tsx` — empty-deck branch (cards.length === 0) and no-results branch (filtered.length === 0 && query) restyled to Daybreak; `LionFace` import added from `@/components/daybreak/lion-face`; all other content unchanged

## Decisions Made

- **Browse words = Link, not button** — the e2e spec (02-first-visit-deck-creation.spec.ts) asserts `getByRole("link", { name: "Browse words" })`, confirming it must be a semantic link. Used `<Link href="/deck/browse">` styled as a button.
- **+ Add a card route = /deck/new-card** — card-list does not receive a deck ID prop. Used `/deck/new-card` without a `?deck=` param; the new-card page falls back to `decks[0]`, which is the only deck in a fresh empty state.
- **Clear search = real `<button>`** — must satisfy `getByRole("button", { name: "Clear search" })` in e2e. Used `<button type="button">` (not a div or span).
- **Curly quotes in "No words match"** — used `&ldquo;` / `&rdquo;` HTML entities to match the handoff design's typographic rendering.
- **Ghost style: inline + Tailwind** — followed the auth-card.tsx precedent of using inline styles for background/border where CSS vars or hex literals are needed, Tailwind for layout/radius/typography.

## Deviations from Plan

None — plan executed exactly as written. Both empty-state blocks restyled per ObEmptyDeck/ObNoSearch spec; scope guard fully honored; tsc exits 0; unit suite green.

## Issues Encountered

None.

## Known Stubs

None — both empty states render live React state (query string, cards array length). No hardcoded empty data, placeholder text, or TODO markers.

## Threat Flags

None — presentation-only restyle; no new network endpoints, auth paths, file access patterns, or schema changes introduced. The `No words match "{query}"` interpolation uses normal JSX text children (React auto-escapes); no `dangerouslySetInnerHTML` used (T-19-05-XSS mitigated per plan).

## Next Phase Readiness

- ONB-06 empty-state presentation complete; ready for behavioral verification via `e2e/02-first-visit-deck-creation.spec.ts` (owned by 19-04, Wave 3 companion plan)
- Card table / mobile rows / search chrome remain untouched; DSH-04/05 (Phase 21) can proceed without conflicts
- LionFace medallion pattern established (see patterns-established) — reusable for future Daybreak surfaces

---
*Phase: 19-daybreak-foundation-onboarding-auth*
*Completed: 2026-06-20*

## Self-Check: PASSED

Files verified:
- src/components/card-list.tsx: FOUND
- .planning/phases/19-daybreak-foundation-onboarding-auth/19-05-SUMMARY.md: FOUND (this file)

Commits verified:
- 86956a0: feat(19-05): restyle empty-deck + no-search-results states to Daybreak (ONB-06)

String assertions verified (grep counts):
- "Your deck is empty": 1
- "Browse words": 2 (once in empty-deck, once in the Link href comment area)
- "No words match": 1
- "Clear search": 3 (search bar X button aria-label + no-results button label + button text)
- "lion-face": 1 (import)
- "CardEditDialog": 2 (import + usage)
- "QaStateBadge": 3 (import + 2 usages)
- React.memo export: preserved
- CardListProps: preserved
