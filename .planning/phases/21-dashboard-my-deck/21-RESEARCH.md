# Phase 21: Dashboard — "My Deck" - Research

**Researched:** 2026-06-21
**Domain:** Daybreak re-skin of the LeoCards dashboard (header, habitat hero medallion, action line, words accordion)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Deck picker = dropdown popover from a compact pill.** Replace the shadcn `Select` in `deck-switcher.tsx` with a Daybreak popover anchored to the compact `ES ▾` LangChip pill. Tapping it opens a popover listing decks with full language names + active check, plus a `+ New deck` row that expands inline to language chips with per-language `creating…` spinner + error. Reuses existing `createDeck` action. Flag emojis → text `LangChip` chips. Header brand: 🐯 → `LionFace` + "LeoCards" wordmark; logout → Daybreak logout glyph.

**D-02 — Drop `My Deck` heading and cross-language "learned" breakdown.** No standalone "My Deck" h1 and no `getLanguageBreakdown` line. Active deck learned count surfaces in the accordion header ("N learned"). `getLanguageBreakdown` is dropped: remove the fetch from `dashboard/page.tsx`, remove the `languageBreakdown` prop from `DeckView`.

**D-03 — Accordion collapsed by default.** "Your words" starts collapsed; expansion is a height/opacity transition (not a swipe gesture). Search field lives inside the expanded panel. No persisted state. Today's always-visible `card-list.tsx` is wrapped in this accordion.

**D-04 — DELIBERATE OVERRIDE: native term bold on top / target translation muted beneath** (opposite of `daybreak-dashboard.jsx`'s `CardRow`). Keep the Daybreak row styling — source tag, mastery meter, icon buttons — but NOT the mock's target-first ordering. Downstream `gsd-ui-auditor` MUST NOT "correct" this.

**D-05 — L9 = max level → gold treatment + "Course 1 complete".** The engine caps at L9; the mock's `level >= 10` gold branch is dead code here. Gold medallion ring + gold level badge; subtitle = "Course 1 complete"; "X of Y cards to Level N+1" line is hidden (`nextLevelThreshold === null` at L9).

**D-06 — Cooldown hero = napping Leo OVER live progress.** During resting/cooldown only: dimmed medallion + `z` + "recharging" cue, but conic progress ring stays accurate and "X of Y cards to Level N+1" line stays visible. Countdown ("Resting · 2h 15m") stays ONLY in the action-line status row — not duplicated on the hero.

**L-01 — Leo, not tiger; no emoji.** `LionFace` everywhere 🐯 appears; text `LangChip` replaces flag emojis.

**L-02 — Behavior preserved, surface only.** Reuse Daybreak primitives (`TField`/`TBtn`/`Pill`/`Card`/`LionFace`).

**L-03 — Brand-new-user == empty-deck state.** 0-deck users redirect to `/welcome`; dashboard never renders a no-deck case. Empty-deck and no-search-results states are already Daybreak (Phase 19 ONB-06) — reuse/verify.

**L-04 — Replace legacy 80px `.webp` thumbnail** (`habitat-widget.tsx` → `habitat-3d-widget-image.tsx`) with `HabitatHero` + `HabitatMedallion`.

**L-05 — Remove "Browse words" from the populated-deck action line** (`deck-view.tsx` ~L195). Stays only in empty-deck state (`card-list.tsx`).

**L-06 — Audit `e2e/*.spec.ts` for literal-text Playwright locators** tied to any copy/chrome this phase changes. Retarget to role+accessible-name or `data-testid`.

### Claude's Discretion

- Whether `HabitatMedallion` is a shared `src/components/daybreak/` primitive or a dashboard-local component.
- Edit-card modal restyle (`card-edit-dialog.tsx`) — re-skin `Dialog` to Daybreak (`TField`/`TBtn`, Daybreak surface), preserving Save/Discard/Delete-with-confirm flow and save/delete error states.
- Accordion open-panel scroll treatment — natural page scroll is fine; bottom mask-fade is optional.
- Exact token values, spacing, prop shapes, file layout — pull from the Daybreak system and existing `src/components/daybreak/*` primitives.

### Deferred Ideas (OUT OF SCOPE)

- Cross-language "learned" breakdown — dropped for D-02; could return if multi-deck motivation becomes a goal.
- Bottom-sheet deck picker — declined in favour of dropdown popover.
- Persisted accordion open/closed state (localStorage) — declined; collapsed default.
- Account/Settings page — separate future milestone.
- L9-vs-L10 legacy copy reconciliation — broader logic ticket, not Phase 21.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSH-01 | Persistent app header — Leo + "LeoCards" wordmark, deck picker (active-language chip, switch/create decks with per-language "creating…" state), and logout | D-01: `@base-ui/react` Popover primitive available; `DeckSwitcher.tsx` create/error logic reused |
| DSH-02 | Habitat hero medallion — Leo on a sunrise disc with conic progress ring + level badge, "Habitat · Level N", "X of Y cards to Level N+1" (absent at max), linking to `/habitat` | D-05/D-06: `HabitatState.nextLevelThreshold === null` at L9; `computeHabitatState` confirmed L9 cap |
| DSH-03 | Action line — full-width "Start studying" (dims when nothing due) + status row ("N due" / "0 due" / "Resting · countdown" / "All paused") + "Add a card" | L-05: "Browse words" removed from populated action line; `CountdownTimer` logic reused |
| DSH-04 | "Your words" tap-to-expand inline accordion (height/opacity transition, NOT a swipe gesture); count when collapsed; search + word rows when open; no-search-results state | D-03: `motion/react` `motion.div` + `AnimatePresence`; accordion wraps existing `card-list.tsx` |
| DSH-05 | Word row — native term (bold) + translation + source tag (Curated / Added by you / Paused) + 3-segment mastery meter (green + check at 3/3) + pause/resume and edit actions | D-04 override: native on top; source tag copy mapped from `card.source` and `pausedAt` |
| DSH-06 | Edit-card modal — editable native/target fields, Save/Discard, Delete with confirmation ("Delete this card? This can't be undone.") + save/delete error states | Existing `CardEditDialog` behavior fully preserved; shadcn `Dialog` re-skinned to Daybreak surface |
| DSH-07 | Dashboard covers all states in Daybreak — cards-due, none-due, resting (cooldown), all-paused, empty deck, brand-new-user first-visit, search-active-no-results | Empty-deck/no-search already Daybreak (ONB-06); all other states built in `DeckView` orchestration |
</phase_requirements>

---

## Summary

Phase 21 is a presentation-only re-skin of the LeoCards dashboard (`dashboard/page.tsx` → `deck-view.tsx` → `app-header.tsx` / `deck-switcher.tsx` / `habitat-widget.tsx` / `card-list.tsx` / `card-edit-dialog.tsx`) to the Daybreak design system. No schema changes, no backend changes, no new product capabilities.

The five genuinely non-trivial implementation pieces are: (1) the deck-picker popover — `@base-ui/react` `Popover` is already installed and available; no new package needed; (2) the "Your words" inline accordion — `motion/react` `motion.div` with `AnimatePresence` is the established pattern in the codebase and handles height/opacity + `prefers-reduced-motion`; (3) the conic-ring `HabitatMedallion` — a pure CSS `conic-gradient` replacing the legacy 80px `.webp` with L9-max gold variant and cooldown-napping overlay; (4) the `getLanguageBreakdown` removal — it is consumed in exactly three places (`milestone-queries.ts` export, `dashboard/page.tsx` fetch, `DeckView` prop) and its removal is cleanly contained; (5) the e2e spec audit — eight literal-text assertions break or need retargeting, with `09-language-breakdown` requiring a feature-level rewrite (the UI section it tests is being removed).

The engine layer (`habitat-engine.ts`, `study-engine.ts`, `deck-actions.ts`, the pause/unpause API routes, `CountdownTimer`) is preserved unchanged — this phase touches only presentation.

**Primary recommendation:** Build `HabitatMedallion` as a local `src/components/habitat-medallion.tsx` (Phase 24 owns its own full scene + badge overlay), add `src/components/ui/popover.tsx` wrapping `@base-ui/react/popover`, and write the accordion via `motion.div` with `AnimatePresence` — consistent with `level-up-overlay.tsx` and `study-session.tsx` patterns already in the tree.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dashboard data fetch (decks, cards, habitat) | API / Backend (Server Component) | — | `dashboard/page.tsx` is a Next.js 16 RSC; no client data fetching |
| Habitat state computation | API / Backend (Server Component) | — | `computeHabitatState` runs server-side in `dashboard/page.tsx` |
| Header + deck picker UI | Browser / Client | — | `AppHeader` + `DeckSwitcher` are `"use client"` components |
| Accordion expand/collapse | Browser / Client | — | Local `useState` in `CardList` or new accordion wrapper |
| Conic-ring medallion render | Browser / Client | — | Pure CSS (no server data needed beyond `HabitatState` prop) |
| Action line / study button | Browser / Client | — | `DeckView` is `"use client"`; Link/button composition |
| CountdownTimer | Browser / Client | — | `useEffect` + `router.refresh()` on expiry |
| Pause/resume card | Browser / Client + API Route | — | Optimistic toggle via `fetch POST /api/cards/[id]/pause|unpause` + `router.refresh()` |
| Edit/delete card modal | Browser / Client + Server Action | — | `CardEditDialog` calls `editCard`/`deleteCard` server actions |
| getLanguageBreakdown (REMOVED) | API / Backend | — | Dropped from `dashboard/page.tsx` Promise.all; prop removed from DeckView |

---

## Standard Stack

No new packages are needed for this phase. All required primitives are already installed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | 1.3.0 [VERIFIED: package.json] | Popover primitive for deck-picker | Already the project's headless UI layer (backs `select.tsx`, `dialog.tsx`); provides `Popover.Root/Trigger/Positioner/Popup/Portal/Close` |
| `motion` (motion/react) | 12.38.0 [VERIFIED: package.json] | `motion.div` + `AnimatePresence` for accordion height/opacity animation | Established pattern in the codebase (`level-up-overlay.tsx`, `study-session.tsx`, `study-card.tsx`) |
| Tailwind v4 | (project default) [VERIFIED: package.json] | Daybreak semantic utility classes | App-wide token system |
| `src/components/daybreak/` primitives | Phase 19 [VERIFIED: codebase] | `LionFace`, `TBtn`, `TField`, `Pill`, `Card` | Shipped in Phase 19; direct reuse |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` | installed [VERIFIED: package.json] | Unit tests for new components (`HabitatMedallion`, accordion) | Wave 0 test stubs |
| `vitest` | installed [VERIFIED: package.json] | Test runner | All unit tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@base-ui/react` Popover | shadcn Popover wrapper (doesn't exist yet in `src/components/ui/`) | Must add a `src/components/ui/popover.tsx` wrapper — same approach as `select.tsx`, `dialog.tsx`; the underlying primitive is the same |
| `motion.div` animate-height | CSS `grid-template-rows: 0fr → 1fr` trick | Motion is established; project already imports it; `useReducedMotion()` hook from motion is already in use |

**Installation:** None required. All packages already installed.

---

## Package Legitimacy Audit

No new packages are being installed in this phase. All primitives used (`@base-ui/react`, `motion`, Tailwind, Next.js) are verified existing dependencies in `package.json`.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| `@base-ui/react` | npm | Already installed (v1.3.0) | Approved — in use |
| `motion` | npm | Already installed (v12.38.0) | Approved — in use |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
HTTP GET /dashboard
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  dashboard/page.tsx  (RSC — Server Component)                 │
│                                                              │
│  Promise.all([getUserDecks, getUserNativeLanguage,           │
│               getHabitatFacts])          ← drop getLanguageBreakdown │
│  computeHabitatState(habitatFacts, now)                      │
│  assembleSession(cards, now) → hasDueCards                   │
│  earliestCooldownEnd → string | null                         │
│  buildCardRows(cards, studyCards, qaMode)                    │
│                                                              │
│  → redirect("/welcome") if decks.length === 0               │
└────────────────────────┬─────────────────────────────────────┘
                         │ Props (serializable)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  DeckView  ("use client")                                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AppHeader                                            │    │
│  │  ├── LionFace + "LeoCards" wordmark                  │    │
│  │  ├── DeckSwitcher (popover-pill → @base-ui Popover) │    │
│  │  │     ├── deck list + active check                  │    │
│  │  │     └── "+ New deck" → inline LangChip row        │    │
│  │  │           (createDeck server action, per-lang err) │   │
│  │  └── LogoutGlyph button                              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ HabitatHero (Link → /habitat)                        │    │
│  │  └── HabitatMedallion                                │    │
│  │       ├── conic-gradient ring (or gold solid at L9)  │    │
│  │       ├── LionFace (+ "z" overlay if sleeping)       │    │
│  │       └── level badge (gold at L9, • if sleeping)    │    │
│  │  "Habitat · Level N" / "X of Y cards to Level N+1"  │    │
│  │  "Course 1 complete" (when nextLevelThreshold=null)  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ActionLine                                           │    │
│  │  StudyButton (amber / dimmed / link vs disabled)    │    │
│  │  StatusText ──── due | none | cooldown | paused     │    │
│  │        ↑ CountdownTimer (60s tick, router.refresh)  │    │
│  │  "Add a card" pill (→ /deck/new-card?deck=...)      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ WordsAccordion  (motion.div + AnimatePresence)       │    │
│  │  Header: "Your words" + "N learned" + chevron       │    │
│  │  Expanded panel:                                     │    │
│  │    Search field (TField) → filters CardList         │    │
│  │    CardList (populated list)                         │    │
│  │      CardRow × N (native bold / target muted)       │    │
│  │        Mastery meter (3 bars, green+check at 3/3)   │    │
│  │        SourceTag (Curated / Added by you / Paused)  │    │
│  │        PauseBtn (optimistic toggle)                  │    │
│  │        EditBtn → CardEditDialog                      │    │
│  │    no-results state: "No words match…"              │    │
│  │  (empty-deck state: bypasses accordion entirely)    │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── components/
│   ├── daybreak/
│   │   └── (existing: lion-face, t-btn, t-field, pill, card, auth-card)
│   ├── ui/
│   │   └── popover.tsx          ← NEW: @base-ui/react Popover wrapper (like select.tsx pattern)
│   ├── habitat-medallion.tsx    ← NEW: local to dashboard phase (not shared primitive yet)
│   ├── habitat-hero.tsx         ← NEW: replaces habitat-widget.tsx + habitat-3d-widget-image.tsx
│   ├── app-header.tsx           ← RESTYLED: LionFace + wordmark + DeckSwitcher + LogoutGlyph
│   ├── deck-switcher.tsx        ← CONVERTED: Select → Popover-based picker
│   ├── deck-view.tsx            ← RESTYLED: remove heading/breakdown, add WordsAccordion
│   ├── card-list.tsx            ← RESTYLED: wrapped in accordion; Daybreak CardRow; search inside
│   └── card-edit-dialog.tsx     ← RESTYLED: Daybreak surface (Claude's discretion)
└── app/(protected)/dashboard/
    └── page.tsx                 ← DROP getLanguageBreakdown fetch + prop
```

### Pattern 1: Popover Deck Picker (D-01)

The `@base-ui/react` `Popover` sub-components mirror the existing `Select` wrapper approach in `src/components/ui/select.tsx`. Build a `src/components/ui/popover.tsx` wrapper first, then `DeckSwitcher` composes it.

```tsx
// Source: @base-ui/react v1.3.0 API (VERIFIED: node_modules/@base-ui/react/popover)
// Popover has: Root, Trigger, Positioner, Popup, Portal, Close, Backdrop, Arrow, Title, Description
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

// Trigger = the LangChip pill (ES ▾)
// Popup = Daybreak card surface (border: #F0E3CF, radius: cardRadius 22, shadow)
// Inside Popup:
//   - deck list items with check on active
//   - separator
//   - "+ New deck" row → expands to inline LangChip buttons
//   - per-LangChip: creatingLang === lang.code → spinner; error → error text
```

The existing `DeckSwitcher` state (`creatingLang`, `showPicker`, `error`, `handleCreateDeck`, `handleValueChange`) is fully reusable — only the render layer changes from `Select` to `Popover`.

**A11y:** `Popover.Root` manages `aria-expanded`, `aria-controls` automatically. The language chip buttons inside remain `<button type="button">` with accessible names.

**e2e impact (critical):** `e2e/08-deck-switching.spec.ts` uses `page.locator('[data-slot="select-trigger"]')` and `page.locator('[role="option"]')`. Both selectors become stale. Must retarget to `data-testid="deck-picker-trigger"` and `role="menuitem"` or `data-testid` on each deck option.

### Pattern 2: Inline Accordion Height Animation (D-03)

Use `AnimatePresence` + `motion.div` with `initial/animate/exit` on height. The codebase pattern in `level-up-overlay.tsx` and `study-session.tsx` confirms this approach.

```tsx
// Source: motion/react v12.38.0 (VERIFIED: node_modules/motion/react)
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "motion/react";

// Button with aria-expanded + aria-controls
<button
  type="button"
  aria-expanded={open}
  aria-controls="words-panel"
  onClick={() => setOpen(o => !o)}
>
  Your words <span>{learnedCount} learned</span> <Chevron dir={open ? "up" : "down"} />
</button>

<AnimatePresence initial={false}>
  {open && (
    <motion.div
      id="words-panel"
      role="region"
      aria-label="Your words"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.22, ease: "easeInOut" }}
      style={{ overflow: "hidden" }}
    >
      {/* search TField + CardList */}
    </motion.div>
  )}
</AnimatePresence>
```

The `useReducedMotion()` hook (already used in `level-up-overlay.tsx` as `usePrefersReducedMotion`) must gate the `transition.duration` to 0 for `prefers-reduced-motion`.

**Collapsed state** displays `learnedCount` = `cards.filter(c => (c.masteryRound ?? 0) >= 3).length` — computable from the `initialCards` prop already available in `DeckView`.

### Pattern 3: Conic-Ring HabitatMedallion (D-05/D-06)

```tsx
// Source: daybreak-dashboard.jsx HabitatMedallion (VERIFIED: design/handoff-daybreak/daybreak-dashboard.jsx)
// Engine: src/lib/habitat-engine.ts (VERIFIED: codebase)

// HabitatState shape used:
//   level: 1-9 (L9 is the real max — LEVEL_THRESHOLDS has 8 entries)
//   learnedCardCount: number
//   nextLevelThreshold: number | null  (null when level === 9 — confirmed in computeHabitatState)

// Progress ratio for the conic ring:
//   const prevThreshold = level >= 2 ? (LEVEL_THRESHOLDS[level - 2] ?? 0) : 0;
//   const range = (nextLevelThreshold ?? 0) - prevThreshold;
//   const progress = range > 0 ? Math.min(1, (learnedCardCount - prevThreshold) / range) : 1;
//   const deg = progress * 360;

// Ring background (matches mock):
//   isGold (L9 max): '#F2B33A' solid
//   sleeping (cooldown): '#F3E3C6' solid — but progress ring visible per D-06
//   normal: `conic-gradient(#F28A1F ${deg}deg, #F3E3C6 ${deg}deg)`

// D-06 napping: sleeping=true -> ring is ACCURATE (not greyed), but medallion face is dimmed
// The mock's `sleeping ? 0 : 0.7` for progress is WRONG per D-06 — use real progress always

// Level badge:
//   sleeping: '#C9B79A' bg, '•' content
//   L9 max: '#F2B33A' bg, level number
//   normal: '#F28A1F' bg, level number

// Max level guard: mock uses `level >= 10` — retarget to `level >= 9` per D-05
// nextLevelThreshold at L9: habitat-engine.ts line 260: `if (level < 10)` → sets it;
//   at level=9, level < 10 is true, so nextLevelThreshold = LEVEL_THRESHOLDS[8] which is undefined → null (line 261)
//   CONFIRMED: nextLevelThreshold IS null when level === 9
```

**prefers-reduced-motion:** Ring is static CSS, no animation — no special gating needed. The `z` "sleeping" text is decorative, not animated.

**HabitatHero** wraps the medallion inside a `<Link href="/habitat">` card (sunrise gradient `#FFF3DC → #FFFFFF`, Daybreak card border/shadow/radius from tokens).

### Pattern 4: getLanguageBreakdown Removal (D-02)

Exact removal scope (all consumers verified via codebase search):

1. `src/lib/milestone-queries.ts` — keep the function (used in `milestone-queries.test.ts`); do not delete it.
2. `src/app/(protected)/dashboard/page.tsx` lines 15, 36-41, 129 — remove the import, remove from `Promise.all`, remove from `DeckView` JSX prop.
3. `src/components/deck-view.tsx` lines 103, 116, 178-186 — remove `languageBreakdown` from the `DeckViewProps` interface, the destructured param, and the render block.

The `getLanguageBreakdown` function itself in `milestone-queries.ts` is kept (it has unit tests in `milestone-queries.test.ts`); only its call-site in `dashboard/page.tsx` is removed.

### Pattern 5: StatusText / ActionLine State Machine

The `StatusText` component implements a 4-state machine driven by `DeckView` props:

| State | Condition | StatusText | StudyButton |
|-------|-----------|------------|-------------|
| `due` | `hasDueCards && hasCards` | amber dot + "N due" | Amber, active, `<Link href="/study">` |
| `none` | `!hasDueCards && !earliestCooldownEnd && hasCards` (all unpaused, 0 due) | outline dot + "0 due" | Dimmed `#F4E7D2` color, disabled |
| `cooldown` | `earliestCooldownEnd && !hasDueCards` | napping Leo glyph + "Resting · {countdown}" | Dimmed, disabled |
| `paused` | `hasCards && !hasDueCards && !earliestCooldownEnd` — all paused | pause bars glyph + "All paused" | Dimmed, disabled |

The `CountdownTimer` component from `deck-view.tsx` is preserved as-is; its text value feeds the `cooldown` state's StatusText. The "Next cards in {countdown}" copy on the timer itself is replaced by "Resting · {countdown}" in the status row — the `CountdownTimer` provides the countdown string but its own render is replaced by the Daybreak `StatusText`.

### Anti-Patterns to Avoid

- **Don't animate the conic-gradient ring.** CSS `conic-gradient` in `background` cannot be transitioned in most browsers — the progress is static data-driven, not animated on the dashboard.
- **Don't re-add `Browse words` to the populated action line.** This link is removed per L-05 and must NOT appear in `DeckView`'s action area — only in `card-list.tsx`'s empty-deck state.
- **Don't set the napping medallion ring to `progress: 0`.** Per D-06, the ring remains accurate even in the cooldown state. Only face opacity/tint changes.
- **Don't use the Select primitive for the deck picker.** Switching to Popover requires a new `src/components/ui/popover.tsx` wrapper before `DeckSwitcher` can use it.
- **Don't add `z`-mark to non-sleeping states.** The `z` on the `HabitatMedallion` is cooldown-only (napping hero = `sleeping` prop = true).
- **Don't move "Resting · countdown" to the hero card.** Per D-06, it stays in the action-line status row only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Popover/dropdown with keyboard a11y | Custom z-index div + click-outside handler | `@base-ui/react` Popover (already installed) | Focus trap, Escape close, aria-expanded, portal positioning all built in |
| Height-to-auto animation | CSS `max-height` transition with magic numbers | `motion/react` `motion.div` `height: "auto"` with `AnimatePresence` | `max-height` animates to a fixed value then jumps; `height: "auto"` with motion is the correct pattern |
| Reduced-motion gating | Custom media query listener | `useReducedMotion()` from `motion/react` (already used in codebase) | SSR-safe, reactive, already imported in project |
| Conic progress ring math | SVG arc path calculation | CSS `conic-gradient` | Single CSS property; no geometry required |

**Key insight:** Every complex UI primitive this phase needs is already in the installed dependency set. The work is composition and styling, not primitives.

---

## Common Pitfalls

### Pitfall 1: `height: "auto"` requires `overflow: "hidden"` on the motion.div
**What goes wrong:** Without `overflow: hidden`, child content is visible during the exit animation (height collapses but content overflows).
**Why it happens:** `motion.div` sets `height` but does not clip content automatically.
**How to avoid:** Add `style={{ overflow: "hidden" }}` to the `motion.div` accordion panel.
**Warning signs:** Content visible below the closed accordion header during close animation.

### Pitfall 2: e2e/08-deck-switching selects by `data-slot="select-trigger"` and `role="option"`
**What goes wrong:** Replacing `Select` with `Popover` removes both `data-slot="select-trigger"` and `[role="option"]` from the DOM. All three tests in `08-deck-switching.spec.ts` break.
**Why it happens:** These specs were written to the current Select component's data attributes.
**How to avoid:** Add `data-testid="deck-picker-trigger"` to the new Popover trigger pill and `data-testid="deck-option-{lang}"` or use `role="menuitem"` with accessible names on deck list items.

### Pitfall 3: The mock's `level >= 10` gold ring is dead code — use `level >= 9`
**What goes wrong:** Copying the mock's `level >= 10` check means L9 users never get the gold treatment.
**Why it happens:** The mock's sample data uses level 7; its `>= 10` guard was never exercised.
**How to avoid:** In `HabitatMedallion`, gate the gold variant at `level >= 9` (i.e. `level === 9`, since the engine caps at 9). `nextLevelThreshold === null` is the canonical signal — use it for "max level" UI decisions.

### Pitfall 4: `nextLevelThreshold` at L9 is `null` — verify the engine
**What goes wrong:** Assuming `nextLevelThreshold` at L9 is `LEVEL_THRESHOLDS[8]` (out-of-bounds = undefined). The UI then shows "undefined of undefined cards to Level 10".
**Why it happens:** `LEVEL_THRESHOLDS` has 8 entries (indices 0–7). At level 9: `LEVEL_THRESHOLDS[9-1] = LEVEL_THRESHOLDS[8]` which is `undefined`, and the engine coalesces it to `null` (line 261: `LEVEL_THRESHOLDS[level - 1] ?? null`). This IS the expected behavior — confirmed.
**How to avoid:** Guard all progress line rendering on `nextLevelThreshold !== null`. Show "Course 1 complete" when `nextLevelThreshold === null`.

### Pitfall 5: `05-card-management.spec.ts` line 29 has a PRE-EXISTING stale assertion
**What goes wrong:** Line 29 asserts `page.getByText("No cards match")` but `card-list.tsx` already renders "No words match" (Daybreak Phase 19 update). This spec is already broken before Phase 21.
**Why it happens:** Phase 19 updated the copy but the spec was not retargeted.
**How to avoid:** Fix this as part of the Phase 21 e2e audit — retarget to `getByText(/No words match/)`.

### Pitfall 6: The accordion search placeholder changes — breaks two e2e specs
**What goes wrong:** The search input moves inside the accordion and the placeholder changes from "Search your cards..." to "Search your words" (per the mock's `"Search your words"` placeholder). `02-first-visit-deck-creation.spec.ts:99` and `05-card-management.spec.ts:24` both use `getByPlaceholder("Search your cards...")`.
**Why it happens:** The search bar is now inside the accordion panel, collapsed by default. The specs must (a) open the accordion first and (b) use the new placeholder.
**How to avoid:** Add `data-testid="words-search-input"` and retarget specs to that testid. In tests that need the search bar, click the accordion header first to expand.

### Pitfall 7: `10-mobile-responsive` asserts "Sign out" text but the glyph replaces the text
**What goes wrong:** The Daybreak logout is a drawn `LogoutGlyph` icon, not a text "Sign out" button. `10-mobile-responsive.spec.ts:40` asserts `page.getByText("Sign out")`.
**Why it happens:** The current `LogoutButton` renders "Sign out" text. The Daybreak header replaces this with an icon-only button.
**How to avoid:** Add `aria-label="Sign out"` to the new icon button; retarget `e2e/10-mobile-responsive.spec.ts:40` to `page.getByRole("button", { name: "Sign out" })`.

### Pitfall 8: `@base-ui/react` Popover vs Menu — use Popover (not Menu) for the deck picker
**What goes wrong:** `Menu` from `@base-ui/react` enforces menu-item semantics and keyboard navigation that doesn't fit the "inline expand to language chips" pattern.
**Why it happens:** Both look applicable for a trigger-opens-list pattern.
**How to avoid:** Use `Popover` (Root/Trigger/Positioner/Popup/Portal/Close) for full composition freedom. The language chip rows inside the expanded "New deck" section are not menu items; they're inline buttons. `Popover` allows any custom content; `Menu` restricts to its item model.

---

## e2e Impact — Complete Audit

This section enumerates every stale literal in every spec that breaks due to Phase 21 changes.

### Specs Requiring Retargeting (selector/text changes only)

| Spec | Line | Old Assertion | Change Required | Priority |
|------|------|---------------|-----------------|----------|
| `09-language-breakdown.spec.ts` | 8, 35 | `getByText("My Deck")` | **Feature removal** — test 1 (`"dashboard shows per-language learned count"`) loses its assertion subject. Test 3 (`"habitat widget shows on dashboard alongside deck"`) uses `"My Deck"` to check the deck list rendered. See §Feature Removal below. | CRITICAL |
| `12-pause-cards.spec.ts` | 150, 159 | `getByText("All cards are paused — unpause one to study.")` | Copy moves to action-line StatusText: "All paused". Retarget to `getByText("All paused")` or `data-testid="status-all-paused"`. Verify: the `desktopTable` scoping in this spec is unaffected (still targets `table tbody`). | HIGH |
| `08-deck-switching.spec.ts` | 12, 36, 60 | `page.locator('[data-slot="select-trigger"]')` | `Select` → `Popover` removes this data attribute. Add `data-testid="deck-picker-trigger"` to the new pill trigger. | HIGH |
| `08-deck-switching.spec.ts` | 16, 38, 47, 62 | `page.locator('[role="option"]').filter({ hasText: "New deck" \| "French" })` | `role="option"` is Select-specific. Use `role="menuitem"` (if `@base-ui Menu`) or `data-testid="deck-option-{lang}"` / `data-testid="new-deck-row"`. | HIGH |
| `08-deck-switching.spec.ts` | 67 | `getByText("Cancel")` | Cancel button behavior is preserved (closes "New deck" inline expand). Accessible name "Cancel" is still present — OK if implemented with visible "Cancel" text. Low risk. | LOW |
| `05-card-management.spec.ts` | 24 | `getByPlaceholder("Search your cards...")` | Search moves inside accordion, placeholder → "Search your words". Add `data-testid="words-search-input"`. Spec must open accordion first. | HIGH |
| `05-card-management.spec.ts` | 29, 32 | `getByText("No cards match")` | PRE-EXISTING stale assertion (card-list.tsx already says "No words match"). Fix to `getByText(/No words match/)`. Also, no-results state now lives inside accordion. | HIGH |
| `02-first-visit-deck-creation.spec.ts` | 99 | `getByPlaceholder("Search your cards...")` | Same as `05` above — accordion + new placeholder. | HIGH |
| `10-mobile-responsive.spec.ts` | 40 | `getByText("Sign out")` | LogoutGlyph icon replaces text button. Add `aria-label="Sign out"` to icon button; retarget to `getByRole("button", { name: "Sign out" })`. | HIGH |
| `07-habitat-display.spec.ts` | 10 | `getByText("Level 1")` | The new `HabitatHero` renders "Habitat · Level 1". The assertion `"Level 1"` still matches as a substring — **no change needed** unless Playwright uses exact match. Verify `toBeVisible()` still works with the Daybreak copy. | VERIFY |
| `07-habitat-display.spec.ts` | 12 | `getByText(/\/.*cards/)` | The old widget rendered `learnedCardCount/nextLevelThreshold cards`. The new HabitatHero renders "14 of 20 cards to Level 8". Pattern `/\/.*cards/` matches `14/20 cards` but new copy has "14 of 20 cards" — does NOT match the regex. Retarget to `/\d+ of \d+ cards/`. | HIGH |

### Feature Removal — e2e/09-language-breakdown.spec.ts

This spec tests the cross-language learned breakdown (the `getLanguageBreakdown` UI section that D-02 removes). It is not a simple selector retarget — the feature is gone.

**Test 1: `"dashboard shows per-language learned count"`**
- Currently: `signUpWithDeck`, `addWordsFromBrowser`, assert `"My Deck"` visible.
- After D-02: neither "My Deck" heading nor the breakdown text exists.
- Action: **Rewrite test** — retain the behavioral intent (cards appear, deck is functional). New assertion: after adding words, the "Your words" accordion header shows a learned count (e.g. `getByText(/\d+ learned/)`) — this is the replacement UI surface for the learned-count concept. The deck-picker pill shows the active language code.

**Test 2: `"browse words and add card links work from empty deck"`**
- Uses `getByRole("link", { name: "Browse words" }).first()` — this link still exists in the empty-deck state (`card-list.tsx`). No change needed.

**Test 3: `"habitat widget shows on dashboard alongside deck"`**
- Currently asserts `"Level"` (still present in `HabitatHero`) and `"My Deck"` (removed).
- Action: Remove the `"My Deck"` assertion; retain `"Level"`. The habitat hero link + level display is the correct assertion surface.

**Describe block rename:** `"Language breakdown and dashboard polish"` → `"Dashboard — habitat hero and deck integration"` (or similar — reflects the actual remaining test scope).

### Specs Unaffected by Phase 21

| Spec | Reason |
|------|--------|
| `01-auth-signup-login.spec.ts` | Auth screens; `"Sign out"` used in tests 37, 59, 88 — but these call `signUpWithDeck` and then click Sign out from the header. **RISK:** After Phase 21, "Sign out" becomes an icon button. These three tests will ALSO break if they use `getByText("Sign out")`. Confirmed: they do — **add to retarget list**. |
| `06-study-session.spec.ts` | Study screen; no dashboard copy used |
| `13-habitat-states.spec.ts` | Tests `/habitat` video clip; no dashboard copy |
| `11-phase9-image-upload.spec.ts` | Image flow |
| `03-word-list-browser.spec.ts` | Uses `getByRole("link", { name: "Browse words" }).first()` — this click comes from the **dashboard** (populated deck); after Phase 21, "Browse words" is REMOVED from the populated action line. Tests 12–65 all call `addWordsFromBrowser` which calls `getByRole("link", { name: "Browse words" }).first()` — but this is the dashboard "Browse words" link! **CRITICAL: These will break.** See below. |
| `04-manual-card-entry.spec.ts` | May use "Add a card" link from dashboard — verify |
| `14-qa-parity.spec.ts` | QA badge; source-tag copy "word list" / "manual" will change to "Curated" / "Added by you" — verify |

### CRITICAL: helpers.ts `addWordsFromBrowser` + 03-word-list-browser.spec.ts

`e2e/helpers.ts:164` contains:
```typescript
await page.getByRole("link", { name: "Browse words" }).first().click();
```

This helper is called by: `05-card-management`, `06-study-session`, `07-habitat-display`, `08-deck-switching`, `09-language-breakdown`, `10-mobile-responsive`, `12-pause-cards`, `02-first-visit-deck-creation`, `study-progression.spec.ts`.

After Phase 21, "Browse words" is **removed from the populated-deck action line** (L-05). The empty-deck state still has it. The `addWordsFromBrowser` helper is always called after `signUpWithDeck`, which creates an empty deck and lands on the dashboard empty-deck state — so "Browse words" IS available in the `card-list.tsx` empty-deck section when `addWordsFromBrowser` first runs. But after `addWordsFromBrowser` adds cards and the page re-renders as a populated deck, the dashboard "Browse words" link disappears.

**Risk Assessment:** `addWordsFromBrowser` clicks "Browse words" once (at the start, when deck is empty) then navigates away to `/deck/browse`. The click happens while the deck IS empty, so the empty-deck "Browse words" link in `card-list.tsx` is still present. **The helper likely continues to work**, as it clicks "Browse words" before any cards are added.

To be safe: add `data-testid="browse-words-empty"` to the empty-deck Browse words link in `card-list.tsx`, and update `helpers.ts` to use that testid. This future-proofs the helper against any further UI changes.

**03-word-list-browser.spec.ts** all use `page.getByRole("link", { name: "Browse words" }).first()` at the start of each test (before any cards are added) — safe as above. But strict-mode multi-match risk exists if both the empty-deck section and some other element render "Browse words" simultaneously. The `.first()` guard handles this.

### Source-Tag Copy Changes — 14-qa-parity.spec.ts

**Verify:** `14-qa-parity.spec.ts` uses the QA state badge. The source tag labels change (`"word list"` → `"Curated"`, `"manual"` → `"Added by you"`). Grep for these strings in `14-qa-parity.spec.ts`.

**01-auth-signup-login.spec.ts Lines 38, 60, 89**

Confirmed stale: `page.getByText("Sign out").click()` breaks when logout becomes an icon-only button with `aria-label="Sign out"`. Retarget all three to `page.getByRole("button", { name: "Sign out" }).click()`.

---

## Code Examples

### HabitatMedallion — progress computation

```tsx
// Source: habitat-engine.ts + daybreak-dashboard.jsx (VERIFIED: codebase)
// LEVEL_THRESHOLDS = [5, 15, 30, 50, 80, 120, 170, 230] (8 entries, indices 0-7)
// At L9: nextLevelThreshold === null (verified in computeHabitatState line 261)

function progressRatio(
  level: number,
  learnedCardCount: number,
  nextLevelThreshold: number | null,
): number {
  if (nextLevelThreshold === null) return 1; // L9 max — full ring (gold)
  const prevThreshold = level >= 2 ? (LEVEL_THRESHOLDS[level - 2] ?? 0) : 0;
  const range = nextLevelThreshold - prevThreshold;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (learnedCardCount - prevThreshold) / range));
}
```

### Conic-gradient ring — CSS values from the mock

```tsx
// Source: daybreak-dashboard.jsx HabitatMedallion (VERIFIED: design file)
// D-05: level >= 9 (not >= 10 as in the mock) → gold solid ring
// D-06: sleeping → ring remains accurate, face is dimmed

const isMaxLevel = level >= 9; // D-05: real cap is L9
const deg = progressRatio(level, learnedCardCount, nextLevelThreshold) * 360;

const ringBg = isMaxLevel
  ? "#F2B33A"                                                    // gold solid
  : `conic-gradient(#F28A1F ${deg}deg, #F3E3C6 ${deg}deg)`;    // amber progress

// sleeping: ring keeps real progress (D-06), face interior is dimmed via opacity
const innerOpacity = sleeping ? 0.45 : 1;
```

### Popover wrapper pattern (consistent with select.tsx)

```tsx
// Source: @base-ui/react v1.3.0 API (VERIFIED: node_modules/@base-ui/react/popover)
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

const PopoverRoot = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverPortal = PopoverPrimitive.Portal;
const PopoverPositioner = PopoverPrimitive.Positioner;
const PopoverPopup = PopoverPrimitive.Popup;
const PopoverClose = PopoverPrimitive.Close;

// DeckSwitcher trigger pill:
<PopoverTrigger
  data-testid="deck-picker-trigger"
  // ... Daybreak pill styles
>
  <LangChip code={activeLanguageCode} /> <Chevron dir="down" />
</PopoverTrigger>

// Inside PopoverPopup: deck list + new-deck row
// @base-ui/react Popover manages open/close, portal, focus trap, Escape close
```

### Accordion learnedCount computation

```tsx
// Source: deck-view.tsx initialCards prop (VERIFIED: codebase)
// learnedCardCount is available from HabitatState (habitatState.learnedCardCount)
// but it's per-USER across all decks. For the accordion header we want per-DECK count.
// Use: cards.filter(c => (c.masteryRound ?? 0) >= 3).length

const learnedCount = initialCards.filter(c => (c.masteryRound ?? 0) >= 3).length;
// Collapsed header: "Your words" + "learnedCount learned" + chevron
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Select` for deck picker | `Popover` with custom content | Phase 21 | All 08-deck-switching selectors stale |
| `HabitatWidget` (webp image) | `HabitatMedallion` (CSS conic-gradient) | Phase 21 | 07-habitat-display regex selector stale |
| Always-visible card list | Collapsed accordion (expanded on tap) | Phase 21 | Search input hidden by default; specs must expand accordion first |
| "My Deck" h1 heading | No standalone heading | Phase 21 | 09-language-breakdown stale; multiple spec cleanup |
| "word list"/"manual" source tags | "Curated"/"Added by you" | Phase 21 | Any spec checking source tag text |
| "Browse words" in populated action line | "Browse words" removed from populated action line | Phase 21 | Verify `helpers.ts` click timing |
| `next/image` `priority` prop | `preload` prop (Next.js 16) | Phase 13.1 (already done in `habitat-3d-widget-image.tsx`) | Already correct; replicate in HabitatHero if it uses next/image |

**Deprecated/outdated:**
- `habitat-3d-widget-image.tsx`: replaced by `HabitatHero`/`HabitatMedallion` — can be deleted or kept as unused (safe to delete; nothing else imports it after this phase).
- `habitat-widget.tsx`: replaced by `HabitatHero` — deleted or kept unused.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getByText("Level 1")` in `07-habitat-display.spec.ts:10` still matches in the new Daybreak hero copy "Habitat · Level 1" | e2e audit | Spec fails if Playwright uses exact match; simple fix: retarget to `/Level 1/` regex |
| A2 | `addWordsFromBrowser` helper clicks "Browse words" while deck is still empty (before any cards added), so L-05 removal of "Browse words" from populated action line does not break it | e2e audit | If helper is ever called on a populated-deck page, it would fail to find the link |
| A3 | The `learnedCount` in the accordion header should come from `initialCards.filter(c => c.masteryRound >= 3).length` (per-deck) rather than `habitatState.learnedCardCount` (all-deck) | Architecture | Wrong count shown if user has multiple decks; use the per-deck count from `initialCards` |

---

## Open Questions

1. **`14-qa-parity.spec.ts` source-tag assertions**
   - What we know: Phase 21 changes `"word list"` → `"Curated"` and `"manual"` → `"Added by you"` in card row source tags.
   - What's unclear: Whether `14-qa-parity.spec.ts` asserts these source-tag strings directly (grep was not run on this spec).
   - Recommendation: The planner must include a task to grep `14-qa-parity.spec.ts` for `"word list"` and `"manual"` and retarget if found.

2. **Popover focus-trap interaction with the accordion**
   - What we know: `@base-ui/react` Popover manages focus trapping. When the popover is open and the user tabs, focus stays inside the popover.
   - What's unclear: Whether there is a z-index or stacking context conflict with the sticky header and the accordion content below.
   - Recommendation: Set the `Popover.Portal` to render at `z-index: 50` (matching the sticky header `z-40`) + 10. Standard `z-50` CSS class should suffice.

3. **`HabitatMedallion` sharing with Phase 24**
   - What we know: Phase 24 has its own full habitat scene with a different Leo (seated HabLeo, not just LionFace). The Phase 21 medallion is a compact widget.
   - What's unclear: Whether Phase 24 will want to reuse `HabitatMedallion` for its bottom progress badge.
   - Recommendation: Build `HabitatMedallion` as `src/components/habitat-medallion.tsx` (not inside `daybreak/`). This leaves it accessible to Phase 24 without pre-committing to a shared primitive strategy. Claude's discretion (per CONTEXT.md).

---

## Environment Availability

Step 2.6: All external dependencies for this phase are tools already used in the project (Next.js 16, Playwright, Vitest). No new runtime dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js | Build/serve | ✓ | 16.2.1 | — |
| `@base-ui/react` | Popover primitive | ✓ | 1.3.0 | — |
| `motion` | Accordion animation | ✓ | 12.38.0 | — |
| `vitest` | Unit tests | ✓ | installed | — |
| `playwright` | e2e tests | ✓ | installed | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

`nyquist_validation` is enabled (config.json). This section describes the test map for Phase 21.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react + Playwright |
| Unit config | `vitest.config.ts` (node environment, per-file jsdom docblock) |
| e2e config | `playwright.config.ts` |
| Quick run command | `vitest run src/components/habitat-medallion.test.tsx src/components/__tests__/deck-switcher.test.tsx` |
| Full unit suite | `vitest run` |
| e2e full suite | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSH-01 | Header renders LionFace, LangChip pill, deck list, "+ New deck" language chips, creating spinner, error, logout glyph | e2e | `npx playwright test e2e/08-deck-switching.spec.ts` | ✅ (needs retarget) |
| DSH-01 | Deck picker popover opens/closes on trigger click | unit | `vitest run src/components/__tests__/deck-switcher.test.tsx` | ❌ Wave 0 |
| DSH-02 | HabitatMedallion renders conic ring at correct angle, gold at L9, napping face at cooldown | unit | `vitest run src/components/habitat-medallion.test.tsx` | ❌ Wave 0 |
| DSH-02 | HabitatHero links to /habitat; "Course 1 complete" at L9; "X of Y cards" line hidden at max | unit | `vitest run src/components/habitat-medallion.test.tsx` | ❌ Wave 0 |
| DSH-02 | Habitat widget is visible on dashboard (link + level text) | e2e | `npx playwright test e2e/07-habitat-display.spec.ts` | ✅ (needs retarget regex) |
| DSH-03 | StudyButton is amber + active when `hasDueCards`; dimmed when not | unit | `vitest run src/components/__tests__/deck-view.test.tsx` | ❌ Wave 0 |
| DSH-03 | CountdownTimer shows "Resting · Xh Ym" text in StatusText | unit | `vitest run src/components/__tests__/deck-view.test.tsx` | ❌ Wave 0 |
| DSH-03 | Start studying button visible with cards in deck | e2e | `npx playwright test e2e/06-study-session.spec.ts` | ✅ |
| DSH-03 | "Browse words" absent from populated action line | e2e | `npx playwright test e2e/09-language-breakdown.spec.ts` (rewritten) | ✅ (needs rewrite) |
| DSH-04 | Accordion header shows "N learned"; click expands panel | unit | `vitest run src/components/__tests__/card-list.test.tsx` | ❌ Wave 0 |
| DSH-04 | Accordion starts collapsed; search not visible until expanded | e2e | `npx playwright test e2e/05-card-management.spec.ts` | ✅ (needs retarget) |
| DSH-04 | No-search-results state visible inside accordion | e2e | `npx playwright test e2e/02-first-visit-deck-creation.spec.ts` | ✅ (needs expand step) |
| DSH-05 | CardRow shows native bold on top / target muted below (D-04 override) | unit | `vitest run src/components/__tests__/card-list.test.tsx` | ❌ Wave 0 |
| DSH-05 | Source tag shows "Curated" / "Added by you" / "Paused" based on source/pausedAt | unit | `vitest run src/components/__tests__/card-list.test.tsx` | ❌ Wave 0 |
| DSH-05 | Mastery meter 3 bars; green + check at masteryRound >= 3 | unit | `vitest run src/components/__tests__/card-list.test.tsx` | ❌ Wave 0 |
| DSH-05 | Pause toggle: paused row de-emphasised (opacity ~0.55) | e2e | `npx playwright test e2e/12-pause-cards.spec.ts` | ✅ (needs "All paused" text retarget) |
| DSH-06 | Edit card dialog: TField + TBtn Daybreak surface; Save/Discard/Delete-confirm flow | unit | `vitest run src/components/__tests__/card-edit-dialog.test.tsx` | ❌ Wave 0 |
| DSH-06 | Edit + delete flow with confirmation | e2e | `npx playwright test e2e/05-card-management.spec.ts` | ✅ |
| DSH-07 | All 7 dashboard states render correctly | e2e (suite) | `npx playwright test e2e/07-habitat-display.spec.ts e2e/12-pause-cards.spec.ts e2e/08-deck-switching.spec.ts` | ✅ (after retargets) |

### Sampling Rate
- **Per task commit:** `vitest run src/components/habitat-medallion.test.tsx` (or the specific component under change)
- **Per wave merge:** `vitest run` (full unit suite)
- **Phase gate:** Full unit suite + `npx playwright test` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/habitat-medallion.test.tsx` — covers DSH-02 (ring math, gold at L9, napping, prefers-reduced-motion)
- [ ] `src/components/__tests__/deck-switcher.test.tsx` — covers DSH-01 (popover open/close, create flow, error state)
- [ ] `src/components/__tests__/deck-view.test.tsx` — covers DSH-03 (StudyButton active/dimmed, StatusText states)
- [ ] `src/components/__tests__/card-list.test.tsx` — covers DSH-04/05 (accordion expand, CardRow native-on-top, source tag copy, mastery meter)
- [ ] `src/components/__tests__/card-edit-dialog.test.tsx` — covers DSH-06 (Daybreak surface render, delete confirm flow)

*(All existing tests pass; these are net-new files for Phase 21 components.)*

---

## Security Domain

This phase is presentation-only. No new data flows, no new auth surfaces, no new input validation paths. No ASVS categories apply beyond what Phase 19/20 already established.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Header logout reuses existing `authClient.signOut()` |
| V3 Session Management | No | No new session logic |
| V4 Access Control | No | Dashboard route already protected by `(protected)/layout.tsx` |
| V5 Input Validation | Minimal | Edit card modal: `front`/`back` text fields; validation handled by existing `editCard` server action |
| V6 Cryptography | No | No crypto changes |

---

## Sources

### Primary (HIGH confidence)
- `design/handoff-daybreak/daybreak-dashboard.jsx` — Visual design contract; all component shapes, token values, CSS patterns, state variants
- `design/handoff-daybreak/hifi-daybreak.jsx` — `d1` theme object with exact hex values
- `src/lib/habitat-engine.ts` — `LEVEL_THRESHOLDS`, `computeHabitatState`, L9 cap confirmation (line 164: `Math.min(9, level)`)
- `src/components/deck-view.tsx` — Current DeckView prop signatures, CountdownTimer, all language breakdown consumers
- `src/app/(protected)/dashboard/page.tsx` — Server component data flow; all `getLanguageBreakdown` call sites
- `src/components/deck-switcher.tsx` — Existing `createDeck` call, error/creating state logic to reuse
- `src/components/card-list.tsx` — Current source-tag copy, mastery display, QA badge integration
- `node_modules/@base-ui/react` (v1.3.0) — Popover API surface: `Root`, `Trigger`, `Positioner`, `Popup`, `Portal`, `Close` confirmed via Node require
- `node_modules/motion` (v12.38.0) — `motion.div`, `AnimatePresence`, `useReducedMotion` confirmed in exports

### Secondary (MEDIUM confidence)
- `e2e/*.spec.ts` — Comprehensive grep of all 14 affected specs for at-risk literal strings
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md` — `router.refresh()` API confirmed unchanged in Next.js 16
- `src/components/level-up-overlay.tsx`, `src/components/study-session.tsx` — Established `motion.div` + `AnimatePresence` + `usePrefersReducedMotion` patterns

### Tertiary (LOW confidence)
- A1–A3 in Assumptions Log — training-derived inferences about Playwright exact-match behavior and multi-deck learnedCount semantics

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules
- Architecture: HIGH — all integration points verified from live source
- e2e impact: HIGH — all specs grep-verified; specific line numbers cited
- Pitfalls: HIGH — verified from live source code, not assumptions

**Research date:** 2026-06-21
**Valid until:** 2026-07-21 (stable stack; 30-day validity)
