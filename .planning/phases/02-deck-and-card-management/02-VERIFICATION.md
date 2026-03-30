---
phase: 02-deck-and-card-management
verified: 2026-03-24T16:00:00Z
status: human_needed
score: 17/18 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 11/18
  gaps_closed:
    - "User can browse word list categories and see words with native + target translations"
    - "User can filter words by CEFR difficulty level (A1, A2, B1)"
    - "User can add a word from the list to their deck with a + button"
    - "User can remove a previously added word with a - button"
    - "Words already in the deck show a checkmark indicator"
    - "User can type a word in either language field and see auto-translation after 500ms"
    - "User can edit the auto-translated result before saving"
    - "User can save a manually entered card and the form clears for another entry"
    - "Browse words and Add a card links pass the active deck context"
  gaps_remaining:
    - "nativeLanguage is persisted for new users at signup (remains PARTIAL — collected but not passed to signUp.email)"
  regressions: []
human_verification:
  - test: "Visit /deck/browse from dashboard, browse categories, add and remove a word"
    expected: "All 14 category pills visible, words show native/target/CEFR, + adds word to deck (checkmark appears), checkmark removes word"
    why_human: "UI interaction, optimistic state updates, and per-row loading states cannot be verified programmatically"
  - test: "Type a word in the native field on /deck/new-card, wait 500ms"
    expected: "Target field shows skeleton shimmer then fills with DeepL translation; editing the translated text is possible before saving"
    why_human: "Real DeepL API call with live debounce timing; requires DEEPL_API_KEY to be set"
  - test: "Save a card on /deck/new-card, return to dashboard"
    expected: "Success message 'Card saved.' appears, form clears, saved card visible in card list with 'manual' source indicator"
    why_human: "Full end-to-end flow across pages requires browser verification"
---

# Phase 2: Deck and Card Management Verification Report

**Phase Goal:** Users can populate their decks — browsing pre-made word lists, manually entering words with auto-translation, and managing their saved cards.
**Verified:** 2026-03-24T16:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after cherry-pick of orphaned plan 04 commits (f8ec330, 25e6d3e) into master

## Re-Verification Summary

The previous verification found 7 failed and 1 partial truths, all rooted in plan 04's feature code (word list browser + manual card entry) being absent from master. The orphaned commits (`4cc9cc0`, `0ad23a3`) have now been cherry-picked and appear in master as `f8ec330` and `25e6d3e`. All 4 missing files now exist and pass artifact verification. The deck-view.tsx link fix (adding `?deck=` param) was included in the cherry-pick. The one remaining issue — nativeLanguage not persisting at signup — was present in the previous verification and is unchanged.

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                              | Status     | Evidence                                                                                                      |
|----|------------------------------------------------------------------------------------|------------|---------------------------------------------------------------------------------------------------------------|
| 1  | Schema allows multiple decks per user per language (no unique constraint)         | VERIFIED   | schema.ts decks table has no unique constraint on (userId, language)                                          |
| 2  | decks table has a name column                                                      | VERIFIED   | schema.ts: `name: text("name").notNull()`                                                                     |
| 3  | user table has nativeLanguage column with default 'en'                             | VERIFIED   | schema.ts: `nativeLanguage: text("nativeLanguage").notNull().default("en")`                                   |
| 4  | nativeLanguage is persisted for new users at signup                                | PARTIAL    | Field collected in form but not passed to signUp.email() (line 50 comment confirms); all users default to "en" |
| 5  | DeepL translation proxy returns translated text without exposing API key           | VERIFIED   | src/app/api/translate/route.ts: auth-gated POST, uses env.DEEPL_API_KEY server-side                           |
| 6  | Word list data exists for all 6 language pairs with category and CEFR annotations | VERIFIED   | 6 JSON files, 280 words each, 14 categories, A1/A2/B1 levels                                                 |
| 7  | A deck can be created with auto-generated name '{Language} #{n}'                  | VERIFIED   | deck-actions.ts createDeck() counts existing decks and generates name                                         |
| 8  | A card can be added/edited/deleted with ownership verification                     | VERIFIED   | saveCard, editCard, deleteCard all check auth and deck ownership                                              |
| 9  | User with no decks sees first-visit language picker                                | VERIFIED   | dashboard/page.tsx renders FirstVisitPicker when decks.length === 0                                           |
| 10 | User can switch between decks via header dropdown                                  | VERIFIED   | DeckSwitcher with shadcn Select, onDeckChange via router.push                                                 |
| 11 | User can see all cards as a searchable list                                        | VERIFIED   | CardList with real-time client-side search filter                                                             |
| 12 | User can edit a card via edit dialog with save and delete                          | VERIFIED   | CardEditDialog with editCard/deleteCard server actions, inline delete confirmation                            |
| 13 | User can browse word list categories and see words with native + target translations | VERIFIED  | /deck/browse page exists, WordListBrowser loaded; 14 CATEGORIES pills rendered, data from getWordList         |
| 14 | User can filter words by CEFR difficulty level (A1, A2, B1)                       | VERIFIED   | difficultyFilter state + ["All","A1","A2","B1"] pill buttons wired to filterWords()                           |
| 15 | User can add a word from the list to their deck with a + button                    | VERIFIED   | handleAdd() calls addWordToCard(); Plus icon shown when word not in deck                                      |
| 16 | User can remove a previously added word with a - button                            | VERIFIED   | handleRemove() calls removeWordFromDeck(); CheckCheck icon shown when word in deck                            |
| 17 | Words already in the deck show a checkmark indicator                               | VERIFIED   | deckWords Set (client-side, seeded from existingWords prop); isInDeck() check per row                         |
| 18 | User can type a word and receive auto-translation after 500ms                      | VERIFIED   | useDebounceCallback(translateFrom, 500); fetch to /api/translate; skeleton shimmer on receiving field         |
| 19 | User can edit the auto-translated result before saving                             | VERIFIED   | Both Input fields remain editable after translation; translation does not overwrite if activeField changed    |
| 20 | User can save a manually entered card; form clears                                 | VERIFIED   | handleSave() calls saveCard(), clears fields, shows "Card saved." success message with auto-dismiss           |
| 21 | Browse words and Add a card links pass active deck context                         | VERIFIED   | deck-view.tsx lines 62/68: `/deck/browse?deck=${activeDeckId}` and `/deck/new-card?deck=${activeDeckId}`      |

**Score:** 17/18 truths verified (PARTIAL: 1)

---

### Required Artifacts

| Artifact                                          | Plan  | Status     | Details                                                                                       |
|---------------------------------------------------|-------|------------|-----------------------------------------------------------------------------------------------|
| `src/db/schema.ts`                                | 02-01 | VERIFIED   | nativeLanguage on user, name on decks, no unique constraint on decks                         |
| `src/env.ts`                                      | 02-01 | VERIFIED   | DEEPL_API_KEY in server Zod schema                                                            |
| `src/app/api/translate/route.ts`                  | 02-01 | VERIFIED   | POST handler, auth-gated, Zod-validated, DeepL proxy                                         |
| `src/data/wordlists/en-fr.json`                   | 02-01 | VERIFIED   | 280 words, 14 categories, A1/A2/B1                                                            |
| `src/data/wordlists/en-es.json`                   | 02-01 | VERIFIED   | 280 words                                                                                     |
| `src/data/wordlists/fr-en.json`                   | 02-01 | VERIFIED   | 280 words                                                                                     |
| `src/data/wordlists/fr-es.json`                   | 02-01 | VERIFIED   | 280 words                                                                                     |
| `src/data/wordlists/es-en.json`                   | 02-01 | VERIFIED   | 280 words                                                                                     |
| `src/data/wordlists/es-fr.json`                   | 02-01 | VERIFIED   | 280 words                                                                                     |
| `src/data/wordlists/schema.ts`                    | 02-01 | VERIFIED   | WordEntry, WordList, CefrLevel, CATEGORIES exported                                           |
| `src/lib/wordlist.ts`                             | 02-01 | VERIFIED   | getWordList, filterWords, getCategories exported                                              |
| `src/lib/deck-actions.ts`                         | 02-02 | VERIFIED   | 6 server actions with "use server", auth, ownership checks, revalidatePath                    |
| `src/lib/deck-queries.ts`                         | 02-02 | VERIFIED   | 4 read queries, no "use server" directive                                                     |
| `src/lib/deck-actions.test.ts`                    | 02-02 | VERIFIED   | Unit tests present with 21+ test cases                                                        |
| `src/app/(protected)/dashboard/page.tsx`          | 02-03 | VERIFIED   | Server component, loads decks/cards, renders FirstVisitPicker or DeckView                    |
| `src/components/app-header.tsx`                   | 02-03 | VERIFIED   | "use client", LeoCards wordmark, DeckSwitcher, LogoutButton                                  |
| `src/components/deck-switcher.tsx`                | 02-03 | VERIFIED   | "use client", shadcn Select, __new__ deck creation, flag emojis                              |
| `src/components/first-visit-picker.tsx`           | 02-03 | VERIFIED   | "use client", language picker, createDeck call, loading/error states                         |
| `src/components/deck-view.tsx`                    | 02-03 | VERIFIED   | "use client", AppHeader + CardList, URL-param deck switching, correct ?deck= params on links |
| `src/components/card-list.tsx`                    | 02-03 | VERIFIED   | "use client", search bar, empty state, no-results state, Pencil edit button                  |
| `src/components/card-edit-dialog.tsx`             | 02-03 | VERIFIED   | "use client", EditForm sub-component, delete confirmation, editCard/deleteCard                |
| `src/app/(protected)/deck/browse/page.tsx`        | 02-04 | VERIFIED   | Server component at /deck/browse; loads word list + existing words in parallel; 65 lines      |
| `src/components/word-list-browser.tsx`            | 02-04 | VERIFIED   | "use client", 14 category pills, CEFR filter, +/- toggle, optimistic Set; 276 lines          |
| `src/app/(protected)/deck/new-card/page.tsx`      | 02-04 | VERIFIED   | Server component at /deck/new-card; loads deck + language info; 59 lines                     |
| `src/components/translation-form.tsx`             | 02-04 | VERIFIED   | "use client", useDebounceCallback(500ms), activeField ref, skeleton shimmer, saveCard; 215 lines |

---

### Key Link Verification

| From                                          | To                        | Via                                   | Status     | Details                                                                    |
|-----------------------------------------------|---------------------------|---------------------------------------|------------|----------------------------------------------------------------------------|
| `src/app/api/translate/route.ts`              | `deepl-node`              | `new deepl.DeepLClient()`             | VERIFIED   | Uses env.DEEPL_API_KEY inside handler                                      |
| `src/env.ts`                                  | `DEEPL_API_KEY`           | Zod server schema                     | VERIFIED   | `DEEPL_API_KEY: z.string().min(1)` in server block                         |
| `src/app/(protected)/dashboard/page.tsx`      | `src/lib/deck-queries.ts` | getUserDecks, getDeckCards            | VERIFIED   | Both functions imported and called                                         |
| `src/components/deck-switcher.tsx`            | `src/lib/deck-actions.ts` | createDeck server action              | VERIFIED   | Imports and calls createDeck                                               |
| `src/components/card-edit-dialog.tsx`         | `src/lib/deck-actions.ts` | editCard and deleteCard               | VERIFIED   | Imports both; calls on save and delete                                     |
| `src/components/card-list.tsx`                | `src/components/card-edit-dialog.tsx` | setEditCard on Pencil click | VERIFIED   | onClick triggers setEditCard(card)                                         |
| `src/lib/deck-actions.ts`                     | `src/db/schema.ts`        | Drizzle insert/update/delete          | VERIFIED   | All 6 actions use db operations                                            |
| `src/lib/deck-actions.ts`                     | `auth.api.getSession`     | Session check in every action         | VERIFIED   | All 6 actions call auth.api.getSession                                     |
| `src/lib/deck-queries.ts`                     | `src/db/schema.ts`        | Drizzle select queries                | VERIFIED   | All 4 queries use db.select                                                |
| `src/components/deck-view.tsx`                | `/deck/browse`            | Browse words link with ?deck= param   | VERIFIED   | Line 62: `/deck/browse?deck=${activeDeckId}` (gap closed)                  |
| `src/components/deck-view.tsx`                | `/deck/new-card`          | Add a card link with ?deck= param     | VERIFIED   | Line 68: `/deck/new-card?deck=${activeDeckId}` (gap closed)                |
| `src/app/(protected)/deck/browse/page.tsx`    | `src/lib/wordlist.ts`     | getWordList for loading word data     | VERIFIED   | Line 6 imports, line 45 calls getWordList(nativeLang, activeDeck.language) |
| `src/app/(protected)/deck/browse/page.tsx`    | `src/lib/deck-queries.ts` | getDeckCardWords for existing words   | VERIFIED   | Line 5 imports, line 46 calls getDeckCardWords(activeDeck.id)              |
| `src/components/word-list-browser.tsx`        | `src/lib/deck-actions.ts` | addWordToCard, removeWordFromDeck     | VERIFIED   | Line 10 imports both; lines 79 and 115 call them                           |
| `src/components/translation-form.tsx`         | `/api/translate`          | fetch POST for DeepL translation      | VERIFIED   | Line 50: `fetch("/api/translate", { method: "POST", ... })`                |
| `src/components/translation-form.tsx`         | `src/lib/deck-actions.ts` | saveCard server action on submit      | VERIFIED   | Line 11 imports saveCard, line 114 calls it                                |

---

### Data-Flow Trace (Level 4)

| Artifact                    | Data Variable  | Source                              | Produces Real Data                              | Status        |
|-----------------------------|----------------|-------------------------------------|-------------------------------------------------|---------------|
| `dashboard/page.tsx`        | decks          | getUserDecks(session.user.id)       | DB query: db.select().from(decks).where(...)    | FLOWING       |
| `dashboard/page.tsx`        | cards          | getDeckCards(activeDeck.id)         | DB query: db.select().from(cards).where(...)    | FLOWING       |
| `card-list.tsx`             | cards (prop)   | Passed from dashboard server component | Real data from DB query                      | FLOWING       |
| `card-edit-dialog.tsx`      | card (prop)    | Set from CardList editCard state     | Real card row from DB-loaded list              | FLOWING       |
| `deck-switcher.tsx`         | decks (prop)   | Passed from DeckView, loaded in dashboard | Real data from DB query                   | FLOWING       |
| `word-list-browser.tsx`     | words (prop)   | getWordList() server-side in browse/page.tsx | JSON file import — real static word data | FLOWING       |
| `word-list-browser.tsx`     | existingWords  | getDeckCardWords() server-side      | DB query: cards WHERE deckId AND source="wordlist" | FLOWING  |
| `word-list-browser.tsx`     | deckWords      | Client-side Set seeded from existingWords | Optimistic state over real DB-backed seed | FLOWING  |
| `translation-form.tsx`      | targetText / nativeText | POST /api/translate → DeepL response | Real DeepL API call (requires DEEPL_API_KEY) | FLOWING (external dep) |

---

### Behavioral Spot-Checks

| Behavior                               | Command                                               | Result                              | Status |
|----------------------------------------|-------------------------------------------------------|-------------------------------------|--------|
| translate route exports only POST      | grep "export" src/app/api/translate/route.ts          | Only POST exported                  | PASS   |
| deck-actions has "use server"          | head -1 src/lib/deck-actions.ts                       | `"use server"`                      | PASS   |
| deck-queries has no "use server"       | head -5 src/lib/deck-queries.ts                       | No "use server" directive           | PASS   |
| word list has 280 entries per file     | grep -c '"id"' on all 6 files                         | 280 per file (confirmed)            | PASS   |
| plan 04 commits in master              | git merge-base --is-ancestor f8ec330 HEAD             | ANCESTOR                            | PASS   |
| plan 04 commits in master              | git merge-base --is-ancestor 25e6d3e HEAD             | ANCESTOR                            | PASS   |
| browse page exists                     | ls src/app/(protected)/deck/browse/page.tsx           | File exists                         | PASS   |
| new-card page exists                   | ls src/app/(protected)/deck/new-card/page.tsx         | File exists                         | PASS   |
| word-list-browser.tsx exists           | ls src/components/word-list-browser.tsx               | File exists                         | PASS   |
| translation-form.tsx exists            | ls src/components/translation-form.tsx                | File exists                         | PASS   |
| word-list-browser uses CEFR filter     | grep "A1\|A2\|B1" word-list-browser.tsx               | ["All","A1","A2","B1"] filter present | PASS  |
| word-list-browser uses CheckCheck icon | grep "CheckCheck" word-list-browser.tsx               | Imported and rendered               | PASS   |
| translation-form uses 500ms debounce   | grep "useDebounceCallback" translation-form.tsx       | useDebounceCallback(translateFrom, 500) | PASS |
| translation-form has activeField ref   | grep "activeField" translation-form.tsx               | useRef + all 4 uses present         | PASS   |
| translation-form has skeleton shimmer  | grep "animate-pulse" translation-form.tsx             | Two shimmer divs present            | PASS   |
| deck-view links include ?deck= param   | grep "deck/browse\|deck/new-card" deck-view.tsx       | Both hrefs include ?deck=${activeDeckId} | PASS |

---

### Requirements Coverage

| Requirement | Source Plans  | Description                                                            | Status            | Evidence                                                                                         |
|-------------|---------------|------------------------------------------------------------------------|-------------------|--------------------------------------------------------------------------------------------------|
| DECK-01     | 02-02, 02-04  | User can browse built-in word list and add words to deck               | SATISFIED         | /deck/browse page, WordListBrowser with +/- toggle, addWordToCard/removeWordFromDeck wired       |
| DECK-02     | 02-01, 02-04  | User can manually enter a word and receive auto-translated result       | SATISFIED         | /deck/new-card page, TranslationForm with 500ms debounced DeepL translation                      |
| DECK-03     | 02-04         | User can review and edit auto-translated result before saving          | SATISFIED         | Both Input fields editable after translation; activeField prevents overwrite on switch           |
| DECK-04     | 02-02, 02-03  | User can edit translation on any saved card                            | SATISFIED         | CardEditDialog calls editCard server action; ownership-verified                                  |
| DECK-05     | 02-02, 02-03  | User can delete a card from their deck                                 | SATISFIED         | CardEditDialog calls deleteCard with inline confirmation "Delete this card?" / "This can't be undone." |
| DECK-06     | 02-01 through 02-03 | User can manage decks for French, Spanish, and English independently | PARTIALLY SATISFIED | Multiple decks per language work; auto-names generated; nativeLanguage defaults to "en" for all users (never persisted at signup) |

---

### Anti-Patterns Found

| File                                     | Line | Pattern                                                                      | Severity | Impact                                                                                           |
|------------------------------------------|------|------------------------------------------------------------------------------|----------|--------------------------------------------------------------------------------------------------|
| `src/app/(auth)/signup/page.tsx`         | 50   | `// nativeLanguage is stored in onboarding flow after signup` — no such flow exists | Warning  | All users default to nativeLang="en"; first-visit picker and deck-switcher always exclude English as a learning option regardless of signup selection |

---

### Human Verification Required

Plan 02-03 human verification was approved by the user (documented in SUMMARY). Plan 02-04 human verification was previously invalidated (approved against a worktree, not master). Now that the code is in master, the following need human testing in a live browser:

#### 1. Word List Browser — Categories, Filter, and Toggle

**Test:** Click "Browse words" from the dashboard. Browse categories, click CEFR filters, add a word, remove it.
**Expected:** 14 category pills visible and clickable; words display native/target/CEFR badge; clicking "+" adds word to deck (row highlights, CheckCheck icon appears); clicking CheckCheck removes word (row reverts to normal).
**Why human:** Optimistic UI state transitions, per-row loading states, and auto-dismiss error handling require live browser interaction.

#### 2. Bidirectional Translation with 500ms Debounce

**Test:** Navigate to /deck/new-card, type a word in the native language field, wait just over 500ms.
**Expected:** Target field shows a skeleton shimmer while translating, then fills with DeepL translation. Reversing direction (typing in target field first) also works. Edited translations are preserved before saving.
**Why human:** Real DeepL API call with live debounce timing; requires DEEPL_API_KEY to be configured; browser-observable skeleton shimmer.

#### 3. Save Card Flow End-to-End

**Test:** On /deck/new-card, fill both fields (or let auto-translate fill one), click "Save card", then click "Back to my deck".
**Expected:** "Card saved." message appears briefly and form clears. Returning to dashboard shows the new card in the card list with "manual" source indicator.
**Why human:** Full cross-page flow requiring browser navigation and live DB write.

---

## Gaps Summary

All gaps from the previous verification have been closed by the cherry-pick of plan 04 commits:

- src/app/(protected)/deck/browse/page.tsx — now present and verified (commit f8ec330)
- src/components/word-list-browser.tsx — now present and verified (commit f8ec330)
- src/app/(protected)/deck/new-card/page.tsx — now present and verified (commit 25e6d3e)
- src/components/translation-form.tsx — now present and verified (commit 25e6d3e)
- deck-view.tsx links now include ?deck= param — confirmed in place

**One known limitation remains** (unchanged from previous verification): nativeLanguage is collected on the signup form but never passed to Better Auth's `signUp.email()`. All users default to "en" in the database. This affects DECK-06 (partial) but does not block the core goal of browsing, entering, and managing cards. The word list browser will serve the correct language pair (based on the deck's target language vs. the user's stored nativeLanguage), but new users who selected French or Spanish as their native language will have their native language treated as English until this is fixed.

The phase goal — "Users can populate their decks — browsing pre-made word lists, manually entering words with auto-translation, and managing their saved cards" — is now structurally complete. All critical paths are wired. Human verification is the remaining step to confirm live browser behavior.

---

_Verified: 2026-03-24T16:00:00Z_
_Re-verification: Yes (gap closure after cherry-pick)_
_Verifier: Claude (gsd-verifier)_
