# LeoCards — UI Redesign Requirements
## Dashboard ("My Deck")

**Purpose:** Reference for designing new mocks of the Dashboard. This documents what the screen must *do* and *show* — its content, actions, and states. It deliberately avoids prescribing visual form. **This is a blue-sky brief:** where it describes a concept (e.g. "how close the user is to the next level", "how far a card is through mastery"), the designer should invent the representation. Nothing here dictates a specific component, chart, bar, dot, or layout.

**Product context:** LeoCards is a language-learning flashcard app with a gamified hook — studying grows a virtual tiger habitat that levels up. Mascot is a tiger (currently the 🐯 emoji; a real brand mark is an open opportunity). Mobile-first, also used on desktop. See the companion doc `ui-redesign-requirements-login-study.md` for the shared visual baseline — note that baseline (including the orange) is a reference only, **not mandatory**.

---

## What this screen is

The **home screen after login** and the hub the whole app hangs off. The user lands here to: see their tiger/habitat status, see their vocabulary deck, start a study session, and add or manage cards. Everything else (study, habitat, add-card, browse) is reached from here.

A user can have **multiple decks** — one per language they're learning (English, French, Spanish today). The dashboard always shows **one active deck** at a time, with a way to switch between them or create a new one.

---

## Content & functionality the design must accommodate

### 1. Global app chrome (persistent header)
Present on the dashboard and other logged-in screens — design it as the app's top-level frame.
- **Brand presence** — logo / wordmark / mascot (currently emoji + "LeoCards").
- **Deck switcher** — shows the active deck (language name + a language indicator, currently a flag emoji). Lets the user:
  - switch to another of their decks, and
  - **create a new deck** by picking a language they aren't already learning (a short inline picker of available languages; each can be in a brief "creating…" loading state).
- **Logout** control.

> The header must work when the user has just one deck (switcher still usable) and when they have several.

### 2. Habitat status summary
A compact summary of the user's habitat that **links through to the full Habitat screen**. It must communicate:
- **Current habitat level** (an integer; today 1–10, where 10 is a milestone/max).
- **How close the user is to the next level** — i.e. progress between the previous threshold and the next one. *(Form is open: this is currently a progress bar, but the designer should ideate — it could be the habitat itself growing, a ring, a meter, the tiger's state, anything.)*
- **A sense of the count driving it** — how many cards "learned" vs the threshold for the next level (e.g. 14 of 20). At max level there is no next threshold.
- A visual hook to the habitat/tiger world — this is the emotional/identity element on an otherwise utilitarian screen and a key place for brand expression.

> "Learned" has a specific meaning — see the Mastery model below. Leveling the habitat is the reward for learning cards.

### 3. Deck overview / heading
- The deck's identity ("My Deck" today — could be the deck/language name).
- **Learning stats** — a per-language summary of how many cards the user has learned (e.g. "French: 14 learned · Spanish: 6 learned"). Should gracefully handle one language or several, and the zero case.

### 4. Primary actions
The main things a user does from here. The design should make the **study action the clear primary** when available:
- **Start studying** — the headline call to action. Only meaningful when the active deck has cards that are **due** to study right now.
- **Cooldown state** — when the deck has cards but none are due yet (the app spaces out reviews), study is unavailable and the user instead sees **when the next cards become available** (a live countdown, e.g. "Next cards in 2h 15m", that resolves to "available now" when the time passes). *Design both the "ready to study" and "waiting / on cooldown" treatments.*
- **Browse words** — go to the curated word-list browser to add vocabulary.
- **Add a card** — go to the add-a-card flow (manual or from a photo).

### 5. The card list
The user's vocabulary in the active deck. For each card the design must show:
- The **two sides** of the card — the word in the user's native language and in the target language (column/pairing concept).
- **Source** — whether the card came from the curated word list or was added manually (and a "Paused" indicator when paused — see below).
- **Mastery progress** — how far the card is through being learned. *(Mastery is 3 rounds; see model below. Currently shown as 3 dots, but the representation is fully open — design something that reads at a glance across a long list.)*
- **Per-card actions:**
  - **Pause / resume** — a paused card is excluded from study. Paused cards should read as visually de-emphasised but still present.
  - **Edit** — opens the edit-card modal (below).

List behaviours to support:
- **Search / filter** the user's cards by typing (matches either side). Include a clear/reset affordance and a "no matches" state.
- The list can be **long** — design for scannability and for both a wide (desktop) and narrow (mobile, one-handed) layout. Today it's a table on desktop and stacked cards on mobile; the responsive approach is the designer's call.

### 6. Edit-card modal
Triggered from a card's Edit action. Contains:
- Editable **native word** and **target word** fields.
- **Save changes** (primary) and **Discard changes**.
- A **Delete card** action that requires a confirmation step ("Delete this card? This can't be undone." → Delete / Keep card).
- Inline error states for failed save / failed delete.

---

## States the design must cover
1. **Active, cards due** — habitat summary + deck + prominent "Start studying" + populated card list.
2. **Active, on cooldown** — same, but study replaced by the "next cards in …" waiting treatment.
3. **All cards paused** — deck has cards but none are studyable; communicate this and point the user to unpause one.
4. **Empty deck** — deck exists but has no cards yet: an inviting empty state that pushes the user toward Browse words / Add a card.
5. **Brand-new user (no deck yet)** — a first-visit moment asking which language they want to learn, with the habitat summary already present above it. *(This is the first-run entry; if you'd rather treat it as its own onboarding screen, flag it — it's lightweight today.)*
6. **Search active with no results.**
7. **In-flight / error feedback** for pause-toggle and deck-creation actions.

---

## Domain concepts the designer should understand (so the representations make sense)

- **Mastery model:** a card is learned through **3 rounds**. It's also studied in **two directions** (native→target and target→native) on different rounds. A card becomes **"learned"** (and counts toward the habitat level) after completing all 3. So per-card progress is "0–3 of 3", and the dashboard's stats and habitat level are driven by how many cards have reached the learned state. The redesign should make "where is this card on its journey to learned" feel intuitive.
- **Spaced reviews / cooldown:** after studying, cards go on a timed cooldown before they're due again. This is why "Start studying" is sometimes a countdown instead. It's a feature (healthy spacing), not an error — the waiting state should feel encouraging, not like a lockout.
- **Decks = languages:** decks map 1:1 to a target language. Switching deck switches the whole dashboard context (its cards, stats, study button).

---

## Requirements / constraints (must hold regardless of visual direction)
- Touch targets ≥ 44px; fully usable one-handed on mobile.
- The active deck context must be unambiguous at all times (which language am I looking at?).
- "Start studying" must be the visually dominant action whenever cards are due.
- Destructive actions (delete card) must require confirmation.
- Paused cards must remain visible but clearly distinct from active ones.
- The habitat summary must be tappable and lead to the full Habitat screen.

---

## Explicitly open for ideation (blue sky — please reinterpret, don't copy)
- **How habitat level & progress-to-next-level are visualised** — not necessarily a bar.
- **How per-card mastery is represented** — not necessarily dots.
- **How the card list is structured responsively** — not necessarily table-vs-stacked.
- **How the cooldown / "come back later" moment feels** — opportunity to make waiting delightful and tie it to the tiger/habitat.
- **Overall layout, hierarchy, and how much the habitat/tiger is woven into the hub** vs kept to its own screen.
- **The whole visual language** — palette, type, the mascot treatment. The current warm-orange theme and emoji are a starting reference only.

## Out of scope for this mock
The study/swipe screen, the full habitat screen, add-a-card, browse-words, and the auth screens — covered separately or in later batches. The dashboard should *link* to them but you don't need to design them here.
