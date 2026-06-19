# LeoCards — UI Redesign Requirements
## Browse Words

**Purpose:** Reference for designing new mocks of the Browse Words screen. It documents what the screen must *do* and *show* — content, filtering, actions, and states — and deliberately avoids prescribing visual form. **This is a blue-sky brief:** where it names a current control or layout, the designer should feel free to reinvent it. Nothing here dictates a specific component or arrangement.

**Product context:** LeoCards is a language-learning flashcard app. Alongside adding your own cards, the app ships a **curated vocabulary list** per language pair — common words grouped by topic and difficulty — so a learner can quickly stock their deck without typing anything. Mobile-first, also used on desktop. See the companion docs for the shared visual baseline — that baseline (incl. the orange and 🐯 emoji) is reference only, **not mandatory**.

---

## What this is

Reached from the Dashboard ("Browse words"). It presents the **curated word list for the active deck's language pair** (e.g. English → French) and lets the user **add words to their deck — or remove them — with a single tap per word**. It's the fastest way to build a deck, and the counterpart to the type/image "Add a card" flow.

The list is **pre-translated** (both sides are already known), so unlike Add-a-Card there's no typing or translation step — this screen is about **browsing and selecting**.

Core ideas to preserve:
- The user always knows **which language pair** they're browsing (native → target).
- Each word clearly shows whether it's **already in their deck** or not, and toggling that is instant.
- The catalogue is sizeable, so **finding the right words** (by topic and by difficulty) matters.

---

## Content & functionality the design must accommodate

### Screen identity & exit
- A clear heading ("Browse Words") and a **back to my deck** link/escape, always present.

### Browsing & filtering
The catalogue is organised on two axes the user filters by:
- **Topic / category** — there are **14 categories**: Greetings, Numbers, Colors, Days & Months, Food & Drink, Family, Body, Animals, Clothing, Home, Weather, Shopping, Travel, Work. The user picks one category at a time to view its words. *(Currently a horizontally-scrolling row of pills; the designer should ideate — could be a grid of topic tiles, a menu, icons per topic, etc. There are enough categories that scannability matters.)*
- **Difficulty (CEFR level)** — filter by **All / A1 / A2 / B1** (beginner → lower-intermediate). Combined with the category selection.

### The word list
A list of words for the selected category + difficulty. For each word, show:
- The word on **both sides** — native language and target language (the pairing).
- Its **difficulty level** (A1 / A2 / B1) as a small indicator. *(May be de-prioritised/hidden on the smallest screens.)*
- A clear **in-deck vs not-in-deck** status and a **single control to toggle it**:
  - **Not in deck →** an "add" affordance.
  - **In deck →** a distinct "added / in your deck" state that also acts as the "remove" control.
  - Rows already in the deck should read as visually distinct from ones not yet added.
- **Column/section context** so it's obvious which side is the native language and which is the target.

### Add / remove behaviour
- Tapping add/remove is **optimistic and instant** — the row updates immediately while the change saves in the background.
- Per-word **loading** state while the change is in flight.
- Per-word **error** state if it fails ("Failed. Try again."), shown against that specific row, recoverable, and **without losing the user's place** in the list.

---

## States the design must cover
1. **Default browse** — a category selected, difficulty "All", list of words with mixed in-deck / not-in-deck rows.
2. **Filtered to a difficulty** — same, narrowed by CEFR level.
3. **Empty result** — no words for the chosen category + difficulty combination ("No words in this category at this level.").
4. **Per-word: not added / added / adding (loading) / failed.**
5. **A long list** — the common case; design for fast scanning and for both wide (desktop) and narrow (one-handed mobile) layouts.

---

## Domain concepts the designer should understand
- **Curated, pre-translated catalogue:** unlike Add-a-Card, words here come with both languages already filled in — the only action is add/remove. No editing or translating on this screen.
- **CEFR levels:** A1 (beginner) → A2 → B1 (lower-intermediate). It's a difficulty ladder; learners often start at A1. The redesign can lean into this as a sense of progression if useful.
- **"In deck" ≠ "learned":** adding a word here just puts the card in the deck; the learning/mastery happens later in study. So the status here is membership ("is this in my deck?"), not progress.
- **Deck = language pair:** the list shown is always for the active deck's native→target pair; switching decks elsewhere changes which catalogue appears.

---

## Requirements / constraints (must hold regardless of visual direction)
- Touch targets ≥ 44px; fully usable one-handed on mobile, including category/difficulty switching and per-row add/remove.
- The native → target language direction must be unambiguous.
- Add/remove must feel **instant** (optimistic), with graceful, row-local error recovery.
- Switching category or difficulty must not lose the user's filter context or scroll sense unexpectedly.
- A word's in-deck status must be obvious at a glance across a long list.
- A way back to the deck is always present.

---

## Explicitly open for ideation (blue sky — reinterpret, don't copy)
- **How the 14 categories are presented and navigated** — pills, tiles, icons, a menu; not necessarily a scrolling pill row.
- **How difficulty filtering combines with category** — segmented control, chips, a progression metaphor, etc.
- **How each word row looks** and how add / added / remove are represented — not necessarily a +/✓ icon button.
- **How "in deck" rows are distinguished** from not-yet-added ones.
- **The responsive structure** of the list — not necessarily the current header-row layout.
- **The whole visual language** — palette, type, mascot treatment; current theme is a starting reference only.

## Out of scope for this mock
The type/image Add-a-Card flow, editing an existing card (Dashboard's edit modal), the study/swipe screen, the Habitat screen, and auth. This screen should return the user *to* the Dashboard deck, but you don't need to design those here.
