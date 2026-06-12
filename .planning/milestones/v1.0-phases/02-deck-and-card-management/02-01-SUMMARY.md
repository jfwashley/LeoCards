---
phase: 02-deck-and-card-management
plan: 01
subsystem: database
tags: [drizzle, deepl, wordlist, schema-migration, next-js, vitest]

requires:
  - phase: 01-foundation
    provides: Next.js app, Drizzle + Neon schema, Better Auth, env.ts Zod validation pattern

provides:
  - Drizzle migration removing unique(userId,language) from decks table
  - decks.name column and user.nativeLanguage column
  - POST /api/translate DeepL proxy route (auth-gated)
  - 6 word list JSON files (en-fr, en-es, fr-en, fr-es, es-en, es-fr) with 265 entries each
  - src/lib/wordlist.ts loader with getWordList, filterWords, getCategories
  - deepl-node and use-debounce installed
  - shadcn Select and Dialog components added

affects: [02-02, 02-03, 02-04, 02-05]

tech-stack:
  added: [deepl-node@1.24.0, use-debounce@10.1.0]
  patterns:
    - DeepL client instantiated inside handler (not module scope) to prevent env leakage
    - Dynamic JSON import map for lazy word list loading
    - Target lang mapping en -> en-US for DeepL API compatibility

key-files:
  created:
    - src/app/api/translate/route.ts
    - src/data/wordlists/schema.ts
    - src/data/wordlists/en-fr.json
    - src/data/wordlists/en-es.json
    - src/data/wordlists/fr-en.json
    - src/data/wordlists/fr-es.json
    - src/data/wordlists/es-en.json
    - src/data/wordlists/es-fr.json
    - src/lib/wordlist.ts
    - src/lib/wordlist.test.ts
    - drizzle/0000_blue_johnny_storm.sql
    - src/components/ui/dialog.tsx
  modified:
    - src/db/schema.ts
    - src/env.ts
    - src/app/(auth)/signup/page.tsx
    - package.json

key-decisions:
  - "DeepL target language 'en' mapped to 'en-US' (DeepL requires specific English variant codes)"
  - "DeepL client instantiated inside POST handler — not at module scope — avoids env access at import time"
  - "Word lists stored as static JSON files (not DB seed) — version-controlled, editable, zero migration risk"
  - "nativeLanguage field added to signup form as plain HTML select (not shadcn Select) for simplicity"
  - "db:migrate not run automatically — requires DATABASE_URL env var from user (see user_setup)"

patterns-established:
  - "Route Handler pattern: await headers() passed to auth.api.getSession for session check"
  - "Dynamic import map pattern for lazy JSON loading"

requirements-completed: [DECK-02, DECK-06]

duration: 45min
completed: 2026-03-24
---

# Phase 2 Plan 01: Foundation Data Layer Summary

**Drizzle schema migration (decks.name, user.nativeLanguage, removed unique constraint), DeepL proxy route, and 6 word list JSON files with 1,590 entries covering 14 categories at A1/A2/B1 CEFR levels**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-24T14:00:00Z
- **Completed:** 2026-03-24T14:45:00Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Schema migration removing unique(userId, language) constraint from decks, adding name (decks) and nativeLanguage (user) columns — Drizzle migration SQL generated
- POST /api/translate route proxying to DeepL with auth check, Zod validation, and en->en-US target lang mapping
- 6 word list JSON files (265 entries each) covering all 14 categories at A1/A2/B1 CEFR levels with 24 passing unit tests
- deepl-node, use-debounce installed; shadcn Select and Dialog added; nativeLanguage picker added to signup form

## Task Commits

1. **Task 1: Schema migration + deps + signup** - `eee1baf` (feat)
2. **Task 2: DeepL translation proxy** - `4ce801d` (feat)
3. **Task 3: Word list data + loader + tests** - `a8c4882` (feat)

## Files Created/Modified

- `src/db/schema.ts` - Added nativeLanguage to user, name to decks, removed decks unique constraint
- `src/env.ts` - Added DEEPL_API_KEY to server schema
- `src/app/(auth)/signup/page.tsx` - Added native language select field (en/fr/es)
- `src/app/api/translate/route.ts` - POST proxy to DeepL, auth-gated, Zod-validated
- `src/data/wordlists/schema.ts` - WordEntry, WordList, CATEGORIES, CefrLevel types
- `src/data/wordlists/en-fr.json` - 265 English-to-French entries
- `src/data/wordlists/en-es.json` - 265 English-to-Spanish entries
- `src/data/wordlists/fr-en.json` - 265 French-to-English entries
- `src/data/wordlists/fr-es.json` - 265 French-to-Spanish entries
- `src/data/wordlists/es-en.json` - 265 Spanish-to-English entries
- `src/data/wordlists/es-fr.json` - 265 Spanish-to-French entries
- `src/lib/wordlist.ts` - getWordList (dynamic import), filterWords, getCategories
- `src/lib/wordlist.test.ts` - 24 passing unit tests
- `drizzle/0000_blue_johnny_storm.sql` - Full schema migration SQL
- `src/components/ui/dialog.tsx` - shadcn Dialog component
- `src/components/ui/select.tsx` - shadcn Select component (pre-existed, verified)
- `package.json` - Added deepl-node, use-debounce

## Decisions Made

- DeepL target language "en" mapped to "en-US" (DeepL requires specific English variant codes for target)
- DeepL client instantiated inside the POST handler, not at module scope — prevents env access at import time and avoids cold-start issues
- Word lists stored as static JSON files rather than DB seed — version-controlled, editable without migrations, and deterministic
- nativeLanguage added to signup form using plain HTML select for simplicity; Better Auth's signUp.email doesn't accept arbitrary fields so nativeLanguage is collected at signup but stored separately after account creation (future plan)
- db:migrate step not run — requires live DATABASE_URL credential. Migration SQL is generated and correct; user must run `npm run db:migrate` with database credentials configured

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in translate route**
- **Found during:** Task 2 (DeepL translation proxy route)
- **Issue:** `TARGET_LANG_MAP[targetLang]` typed as `TargetLanguageCode | undefined` — TypeScript rejected it as translateText argument
- **Fix:** Added `as deepl.TargetLanguageCode` cast (safe: map covers all 3 valid enum values)
- **Files modified:** src/app/api/translate/route.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 4ce801d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 type bug)
**Impact on plan:** Minor type cast fix. No scope creep.

## Issues Encountered

- `npm run db:migrate` requires DATABASE_URL env var — no .env file present in worktree. Migration SQL is correct and ready; user must configure database credentials and run the migration manually.

## User Setup Required

**DEEPL_API_KEY must be set before the translate route works:**

1. Go to deepl.com -> Account -> API Keys
2. Free tier key ends with `:fx`
3. Add to `.env.local`:
   ```
   DEEPL_API_KEY=your-key-here
   ```
4. Run schema migration (requires DATABASE_URL):
   ```bash
   npm run db:migrate
   ```

## Known Stubs

None — no stubs that block this plan's goal. The word list data is complete and all loader functions work. The nativeLanguage field is collected in the signup form but not yet persisted to the database (Better Auth doesn't support arbitrary fields in signUp.email) — this is tracked as a known limitation for a future plan.

## Next Phase Readiness

- Schema migration SQL ready to apply once database credentials are configured
- Translation proxy and word lists are fully wired and testable
- Next plans can use getWordList, filterWords, getCategories from src/lib/wordlist.ts
- POST /api/translate ready for integration by card entry form in plan 02

---
*Phase: 02-deck-and-card-management*
*Completed: 2026-03-24*
