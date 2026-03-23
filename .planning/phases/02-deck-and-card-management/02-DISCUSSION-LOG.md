# Phase 2: Deck and Card Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 02-deck-and-card-management
**Areas discussed:** Word list browser, Manual card entry flow, Deck navigation & layout, Card management

---

## Word List Browser

| Option | Description | Selected |
|--------|-------------|----------|
| By topic/category | Groups like Greetings, Food, Travel, Numbers, etc. | ✓ (with difficulty filter) |
| Single alphabetical list | All A1–B1 words in one flat list with search/filter | |
| By difficulty level | A1 words first, then A2, then B1 | |

**User's choice:** By topic/category with difficulty filter options alongside
**Notes:** User wanted both category organization AND difficulty filtering

| Option | Description | Selected |
|--------|-------------|----------|
| One at a time with + button | Each word row has an add button. Instant feedback | ✓ (with minus to undo) |
| Batch select then add | Checkboxes on each word, 'Add selected' button | |
| Add entire category at once | One button per category | |

**User's choice:** One at a time with +/- toggle — after adding, the + becomes a minus for easy undo

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, search bar at top | Type-ahead search across all categories | |
| No, browse only | Navigate by category only | ✓ |

**User's choice:** No search, browse only

| Option | Description | Selected |
|--------|-------------|----------|
| Show checkmark + minus button | Already-added words show green checkmark and minus | ✓ |
| Dim already-added words | Grayed out with no action button | |
| No distinction | All words look the same | |

**User's choice:** Show checkmark + minus button for already-added words

| Option | Description | Selected |
|--------|-------------|----------|
| Show both word + translation inline | Each row shows word and translation side by side | ✓ |
| Show word only, translation after add | Translation revealed after adding | |

**User's choice:** Show both word + translation inline. 10-100 words per category.

| Option | Description | Selected |
|--------|-------------|----------|
| Standard language-learning topics | Greetings, Numbers, Food & Drink, Travel, etc. | ✓ |
| Specific categories in mind | User describes exact list | |
| You decide | Claude picks appropriate categories | |

**User's choice:** Standard language-learning topics (A1-B1 essentials)

Same categories across all three languages (consistent experience).

---

## Manual Card Entry Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline form on deck page | Compact form at top of deck view | |
| Modal/dialog | Click 'Add card' button to open dialog | |
| Separate page | Dedicated route with full-page form | ✓ |

**User's choice:** Separate page for manual card entry

| Option | Description | Selected |
|--------|-------------|----------|
| Inline preview with edit + save | Translation appears below, editable inline | ✓ |
| Two-step: translate then review | First step translation, second step edit form | |
| Auto-save with undo | Saved automatically with undo toast | |

**User's choice:** Inline preview with edit + save

| Option | Description | Selected |
|--------|-------------|----------|
| Clear form, stay on page | Form resets for next card. Success message. | ✓ |
| Redirect to deck view | Navigate back to deck | |
| Show card preview then clear | Brief preview before clearing | |

**User's choice:** Clear form, stay on page for adding multiple cards

**Translation direction:** User provided detailed custom input — bidirectional two-field design. Both native and target language fields on the same page. Typing in either field auto-translates to the other.

| Option | Description | Selected |
|--------|-------------|----------|
| Live/debounced translation | Updates ~500ms after typing stops | ✓ |
| Click to translate | Manual translate button | |
| Translate on blur | Fires when leaving field | |

**User's choice:** Live/debounced translation

**Native language:** English, French, Spanish as options. Chosen during signup. Always the source language.

---

## Deck Navigation & Layout

**User provided detailed custom deck model:**
- Multiple decks allowed, even same language
- Each deck tied to a single target language
- Native language is app-level, always source language
- Header dropdown with flag + name, + New deck option
- Auto-named: "{Language} #{n}"

| Option | Description | Selected |
|--------|-------------|----------|
| Replace dashboard stub | /dashboard becomes deck view | ✓ |
| New /decks route | Separate route | |
| Sidebar navigation | Full app shell with sidebar | |

**User's choice:** Replace dashboard stub with deck view

| Option | Description | Selected |
|--------|-------------|----------|
| Both rename and delete | Full deck management | |
| Delete only | No rename | |
| Neither for v1 | Decks permanent once created | ✓ |

**User's choice:** No rename or delete for v1

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt to create first deck | Friendly empty state with language picker | ✓ |
| Auto-create default deck | Auto-pick a language | |
| Show empty deck view | User discovers dropdown | |

**User's choice:** Ask user to pick language on first visit, then auto-create that deck

Header dropdown: shadcn Select with flag + name. Header layout beyond switcher + logout is Claude's discretion.

---

## Card Management

| Option | Description | Selected |
|--------|-------------|----------|
| Simple list/table | Rows with front, back, source, actions | ✓ |
| Card grid | Visual card tiles | |
| Grouped by category/source | Cards under section headers | |

**User's choice:** Simple list/table

| Option | Description | Selected |
|--------|-------------|----------|
| Inline edit | Click text to edit in place | |
| Edit modal/dialog | Click to open modal | ✓ |
| Edit page | Navigate to edit route | |

**User's choice:** Edit modal/dialog

**Delete:** Available inside the edit modal, with confirmation dialog.

**Sort order:** Custom — cards sorted by review queue order (due for review next = top).

**Search:** Contains-match search bar, both native and target language words, results from first character typed.

---

## Claude's Discretion

- Header layout beyond deck switcher + logout
- Exact visual design of card list rows and edit modal
- Word list data format and storage
- DeepL API integration details
- Empty deck state messaging

## Deferred Ideas

None — discussion stayed within phase scope.
