# LeoCards — UI Redesign Requirements
## Add a Card

**Purpose:** Reference for designing new mocks of the Add-a-Card experience. It documents what the flow must *do* and *show* — content, steps, actions, and states — and deliberately avoids prescribing visual form. **This is a blue-sky brief:** where it describes a concept or a current implementation detail, the designer should feel free to reinvent the representation, structure, and layout. Nothing here dictates a specific component, control, or screen count.

**Product context:** LeoCards is a language-learning flashcard app; a "card" is a word/phrase pair — the same meaning in the user's **native** language and their **target** (learning) language. Users build a deck by adding cards. Mobile-first, also used on desktop. See the companion docs for the shared visual baseline — that baseline (incl. the orange and the 🐯 emoji) is reference only, **not mandatory**.

---

## What this is

The flow for **adding new cards to the active deck**, reached from the Dashboard ("Add a card"). There are **two ways to add cards**, and the user chooses between them:

1. **Type a word** — type a word in either language; the app auto-translates the other side.
2. **From an image** — upload/paste a photo or screenshot; the app extracts words from it, the user reviews them, and they're added in bulk.

Both modes live under one "Add a Card" destination today, switched by a toggle. Whether they stay one screen with a switch, become two entry points, or something else, is **open for the designer**. A "back to my deck" escape must always be present.

A core idea to preserve: the user always knows **which two languages** they're working in (e.g. English ↔ French) and **which deck** the cards land in.

---

# Mode 1: Type a word

A fast, single-card path. The essence: **two linked fields** (native + target). The user types in one, the app fills the other.

### Content & behaviour
- Clear screen identity ("Add a Card") and a **back to my deck** link.
- **Two text fields** — one for the native language, one for the target language, each labelled with its language name (e.g. "English", "French").
- **Auto-translation:** when the user types in one field and pauses, the app translates into the *other* field automatically. While that translation is in flight, the receiving field shows a **loading/pending treatment** (don't let the user think it's just empty).
- The user can **edit either side freely** — auto-translation is a convenience, not a lock. Either field can be the one they type into.
- **Save** — adds the card to the deck. Only available once **both** sides have content.
- After a successful save, the form **clears and confirms** ("Card saved.") so the user can immediately add another — this is designed for adding several in a row.

### States to cover
- **Empty / default.**
- **Translating** — one side filled, the other resolving (pending treatment on the receiving field).
- **Translation failed** — auto-translate unavailable; tell the user they can just type it manually ("Translation unavailable. Enter manually."). This is a soft, recoverable state — not a hard error.
- **Saving** — in-progress, controls disabled.
- **Saved** — brief success confirmation; form reset for the next card.
- **Save failed** — recoverable error ("Couldn't save card. Try again.").

---

# Mode 2: From an image

A bulk path: get a photo of a vocab list / sign / page / screenshot, pull words out of it, review, and add many at once. This is a **multi-step flow with several states** — the most complex part of the design.

The flow today moves through: **pick image → confirm image + choose deck → extract → review words → check translations → done.** The designer can re-sequence or combine these, but every piece of content and every state below needs a home.

### Step A — Pick an image
- An **upload affordance** that supports three input methods: click-to-browse, **drag-and-drop**, and **paste from clipboard** (e.g. a screenshot). Communicate all three.
- A **drag-over** state (the target reacts when a file is dragged onto it).
- **File validation errors** shown inline (wrong type / too large). Accepted types are JPG, PNG, WebP.

### Step B — Confirm image & choose deck
- A **preview/thumbnail** of the chosen image.
- **Remove / choose a different image.**
- A **deck selector** — confirm which deck (= which target language) the extracted words go into. Defaults to the active deck; can be changed. (Reuses the deck switcher; new decks can be created here too.)
- **Extract words** — the action that kicks off processing.

### Step C — Extracting (processing)
- A clear **in-progress state**: extraction can take **up to ~30 seconds**, so the wait must be communicated honestly and feel intentional (this is an AI vision call). Controls that could interrupt it are disabled during this time.
- **Outcomes from extraction:**
  - **Words found** → go to review (Step D).
  - **No words found** → a friendly empty result ("No words found in this image. Try a photo with clearer text, or choose a different image.") with a path back to pick another image.
  - **Error** → friendly, specific recovery copy with a **Try again** action. Error reasons the design should accommodate (the wording differs per case): too many requests / rate-limited, image too large, unsupported file type, timed out, service temporarily unavailable, generic failure, expired session, network error. The image and chosen deck are **preserved** so retry is one tap.

### Step D — Review extracted words
The extracted words are shown as an **editable list** so the user curates before anything is saved:
- Each word can be **kept or excluded** (toggle), **edited** (fix OCR mistakes), or **removed**.
- **Select all / select none** bulk controls.
- An **"Already learned" section** — words the user already has in a deck for that language are surfaced separately, shown as skipped (not addable), so they understand why those aren't included.
- A guard: **at least one word must be kept** to continue ("Keep at least one word to continue.").
- Continue → **translate** the kept words.
- Cancel is always available.
- Possible non-blocking notice: the de-duplication check against learned words can fail ("Could not load learned words.") — the flow should still proceed.

### Step E — Check translations
- The kept words are auto-translated (target → native) in bulk; show a **"Translating N words…"** progress state with the ability to cancel.
- Then a **review list of pairs** — each row has the native and target text, both **editable**, so the user can correct any translation before committing.
- Per-row **translation-failed** state ("Translation unavailable — enter manually.") that the user can fill in manually — individual failures must not block the rest.
- **Add N cards** — the commit action (count reflects how many will be added). Back (to the word list) and Cancel available.

### Step F — Committing & result
- A **committing** state ("Adding N cards to your deck…").
- A **result/summary** state reporting the outcome with counts: **N added**, plus secondary notes where relevant — **N already learned (skipped)** and **N failed**. Cover three shapes: all succeeded, partial (some skipped/failed), and **all failed** ("Couldn't add cards — please try again.").
- A clear exit: **Go to my deck** (or Back to deck on failure).

---

## Requirements / constraints (must hold regardless of visual direction)
- Touch targets ≥ 44px; both modes fully usable one-handed on mobile, including the editable review lists.
- The active **languages and destination deck** must be unambiguous throughout both modes.
- **Nothing is saved until the user explicitly commits** — review/edit always precedes adding (especially in the image flow).
- Long-running steps (extraction up to ~30s, bulk translation) must have honest, reassuring progress states — never a frozen-looking screen.
- Errors are **recoverable and specific**, and must **preserve the user's work** (chosen image, deck, edited words) so retry never means starting over.
- The "type a word" mode is optimised for **adding several cards in a row** — keep that rhythm fast.
- A way back to the deck is always present; cancelling mid-flow must be safe.

---

## Explicitly open for ideation (blue sky — reinterpret, don't copy)
- **How the two modes are presented and switched** — one screen with a toggle, two entry points, a single adaptive flow, etc.
- **How the multi-step image flow is structured** — number of screens/steps, whether steps combine, how progress through them is shown.
- **The auto-translate interaction** — how the linked fields and the "filling in" moment feel.
- **The review and translate lists** — how editing, keeping/excluding, and the "already learned" items are represented, especially on mobile.
- **The waiting moments** (extraction, bulk translation) — a chance to make a ~30s wait feel intentional and on-brand rather than a dead spinner.
- **The success/summary moment** — how added/skipped/failed counts are celebrated or reported.
- **The whole visual language** — palette, type, mascot treatment; current theme is a starting reference only.

## Out of scope for this mock
Editing an *existing* card (that's the Dashboard's edit-card modal), the Browse-words list, the study/swipe screen, the Habitat screen, and auth. The flow should return the user *to* the Dashboard deck on completion, but you don't need to design those screens here.
