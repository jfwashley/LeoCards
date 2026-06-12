# Phase 2: Deck and Card Management - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Full card CRUD for three languages, pre-made word list browser, auto-translate manual card entry, and deck switching. Users can populate their decks by browsing categorized word lists or manually entering words with bidirectional live translation. The dashboard stub from Phase 1 is replaced by the deck management view.

</domain>

<decisions>
## Implementation Decisions

### Deck model (SCHEMA CHANGE REQUIRED)
- Users can create multiple decks, including multiple decks for the same target language
- The existing `unique(userId, language)` constraint on the `decks` table must be REMOVED to allow this
- A `name` column must be ADDED to the `decks` table — auto-generated as "{Language} #{n}" (e.g., "French #1", "French #2")
- Each deck is tied to a single target language (the language being learned)
- The user's native language is set at the app level and is always the base/source language for all decks
- Decks cannot be renamed or deleted in v1

### Native language at signup
- Users choose their native language during signup from: English, French, Spanish
- This is an app-level setting, not per-deck
- The native language is always the source language for translations and the "front" side of cards
- The `user` table will need a `nativeLanguage` column (or similar) — schema migration required

### Deck switcher (header dropdown)
- shadcn Select component in the app header
- Shows current deck as flag emoji + auto-name (e.g., 🇫🇷 French #1)
- Dropdown lists all user's decks with flag + name
- "+ New deck" item at the bottom of the dropdown triggers deck creation
- Deck creation flow: language picker showing available languages excluding user's native language

### First-visit experience
- When a new user first visits the deck page with no decks, show a language picker: "What language do you want to learn first?"
- Auto-create a deck for the chosen language
- Subsequent decks created via the header dropdown "+ New deck"

### Dashboard replacement
- `/dashboard` route becomes the deck management view (replaces the Phase 1 stub)
- The deck view is the primary authenticated experience for Phase 2

### Word list browser
- Pre-made word lists organized by topic/category (Greetings, Numbers, Food & Drink, Travel, Family, Weather, Shopping, Colors, Days/Months, Body, Animals, Clothing, Home, Work — standard A1–B1)
- Difficulty filter alongside categories (A1, A2, B1)
- Same category structure across all three languages
- Each word row shows both the native language word and the target language translation inline
- +/- toggle button per word: "+" to add to deck, changes to checkmark + "−" to remove after adding
- Words already in the user's deck show checkmark + minus button
- No search bar — browse only
- 10–100 words per category depending on the topic's breadth

### Manual card entry
- Separate page (e.g., `/deck/new-card` or similar)
- Two fields side by side: native language field and target language field
- Bidirectional translation: typing in either field auto-translates to the other via DeepL
- Live/debounced translation (~500ms after user stops typing)
- User can edit either field before saving
- "Save card" button commits the card to the active deck
- After saving: form clears, user stays on page to add more cards
- Success feedback (inline "Card saved!" message or similar)

### Card list display
- Simple list/table in the deck view
- Cards sorted by review queue order (due for review next = top of list)
- Search bar at the top: searches both native and target language words
- Contains-match from first character typed (not prefix-only)
- Each row shows: native word, target translation, source indicator (manual/wordlist), action buttons

### Card editing
- Edit via modal/dialog
- Click a card row (or edit icon) to open an edit modal
- Both front (native) and back (target) fields editable in the modal
- Delete button available inside the edit modal
- Deletion requires a confirmation dialog ("Delete this card?") before removing

### Claude's Discretion
- Header layout beyond deck switcher + logout (nav links, spacing, etc.)
- Exact visual design of card list rows and edit modal
- Word list data format and storage approach (JSON files, DB seed, etc.)
- Specific Tailwind classes and component composition
- DeepL API integration details (rate limiting, error handling, caching)
- Empty deck state messaging when deck exists but has no cards

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Deck & Card Management — DECK-01 through DECK-06 define the full scope

### Schema
- `src/db/schema.ts` — Current Drizzle schema with `decks` and `cards` tables. SCHEMA CHANGES NEEDED: remove unique(userId, language) constraint, add `name` column to decks, add `nativeLanguage` column to user table

### Stack decisions
- `.planning/research/SUMMARY.md` §Recommended Stack — DeepL for translation, Drizzle + Neon for DB

### Phase 1 patterns
- `.planning/phases/01-foundation/01-CONTEXT.md` — Auth page patterns, inline error convention, env var discipline
- `.planning/phases/01-foundation/01-UI-SPEC.md` — shadcn/ui design system, warm orange/amber preset, spacing scale, typography

### Project instructions
- `CLAUDE.md` and `AGENTS.md` — Next.js version has breaking changes; read `node_modules/next/dist/docs/` before writing code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/` — shadcn Button, Input, Label, Form, Card components
- `src/components/logout-button.tsx` — Logout button pattern for header
- `src/lib/auth-client.ts` — Auth client for session checks
- `src/lib/auth.ts` — Server-side auth for protected routes

### Established Patterns
- react-hook-form + Zod for form validation (from auth pages)
- Inline field errors below the specific field (not banners/toasts)
- Protected routes via `src/proxy.ts` and server-side session check in `(protected)/layout.tsx`
- Zod-validated env vars via `src/env.ts` — new env vars (DEEPL_API_KEY) must be added here

### Integration Points
- `src/app/(protected)/dashboard/page.tsx` — Currently a stub, will become the deck view
- `src/app/(protected)/layout.tsx` — Protected layout with server-side session validation
- `src/db/schema.ts` — Schema migrations needed for deck model changes
- `src/env.ts` — Must add DEEPL_API_KEY to server schema

</code_context>

<specifics>
## Specific Ideas

- Flag emojis for deck identification: 🇫🇷 French, 🇪🇸 Spanish, 🇬🇧 English
- Bidirectional translation is a key UX innovation — user types in either field, the other updates live
- The word list browser should feel like shopping — browse categories, add items to your deck with a satisfying +/- toggle
- Review queue sort order on the card list gives users a sense of what's coming in their next study session
- Native language selection at signup changes the DB model — needs a migration for the user table

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-deck-and-card-management*
*Context gathered: 2026-03-23*
