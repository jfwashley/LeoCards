---
phase: 03-study-engine-and-study-ui
plan: "03"
subsystem: ui
tags: [motion, framer-motion, react, next-js, flashcard, animation, swipe, study-session]

requires:
  - phase: 03-01
    provides: study-engine pure functions (assembleSession, earliestCooldownEnd, SessionCard types)
  - phase: 03-02
    provides: getStudyCards query, POST /api/study/complete route

provides:
  - Full-screen study experience at /study route with Motion 12 animations
  - StudySession component with useReducer state machine
  - StudyCard with 3D flip (rotateY) and swipe-to-grade gesture
  - CardStack layered visual progress indicator
  - DeckView Study button with active/disabled+countdown states
  - CardList mastery progress dots (3 dots per card row)

affects: [04-habitat-dashboard, 05-pixi-tiger]

tech-stack:
  added: ["motion@^12.38.0 (motion/react)"]
  patterns:
    - "useReducer state machine for multi-phase session flow (studying -> committing -> end/error)"
    - "AnimatePresence mode=popLayout for card exit animations keyed by card.id+index"
    - "motion.div rotateY with backfaceVisibility hidden for 3D CSS flip"
    - "motion drag=x with dragConstraints and onDragEnd for swipe-to-grade"
    - "setInterval countdown timer with router.refresh() when cooldown expires"
    - "Branded type cast (deckId as DeckId) for Drizzle eq() comparisons"

key-files:
  created:
    - src/app/(protected)/study/page.tsx
    - src/components/study-session.tsx
    - src/components/study-card.tsx
    - src/components/card-stack.tsx
  modified:
    - src/components/deck-view.tsx
    - src/components/card-list.tsx
    - src/components/card-edit-dialog.tsx
    - src/app/(protected)/dashboard/page.tsx
    - src/app/api/study/complete/route.ts
    - src/components/translation-form.tsx
    - src/lib/study-engine.ts

key-decisions:
  - "motion/react (not framer-motion) is the correct import path for Motion 12"
  - "useReducer state machine phases: studying | committing | end | error — clean transitions, no ad-hoc useState"
  - "300ms swipe enable delay implemented via useEffect watching flipped state change"
  - "AnimatePresence key={card.id+currentIndex} triggers exit animation on index advance"
  - "DeckView gets hasDueCards + earliestCooldownEnd as server-computed props — no client-side DB calls"
  - "masteryRound added as optional field to CardRow for backward compat — existing callers unaffected"

patterns-established:
  - "Pattern 1: Full-screen client state machine — Server Component fetches data, passes to client component with useReducer"
  - "Pattern 2: Session commit on both quit and natural end — reducer transitions to committing phase in both code paths"
  - "Pattern 3: Study button computed server-side — dashboard page calls assembleSession to determine hasDueCards"

requirements-completed: [STUDY-01, STUDY-02, STUDY-04, STUDY-05, STUDY-06]

duration: 13min
completed: 2026-03-27
---

# Phase 3 Plan 03: Study UI Summary

**Full-screen flashcard study experience with Motion 12 3D flip, swipe-to-grade, card stack visual, session end screen, DeckView Study button with countdown, and CardList mastery progress dots**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-27T22:56:04Z
- **Completed:** 2026-03-27T23:09:00Z
- **Tasks:** 2 of 3 (Task 3 is human verification checkpoint)
- **Files modified:** 11

## Accomplishments
- Built complete study session UI: /study page (Server Component), StudySession (useReducer state machine), StudyCard (3D flip + swipe gesture), CardStack (layered visual progress)
- Session end screen with tiger emoji, 3 stats (studied/correct%/learned), "Back to deck" CTA with motion entrance
- Quit-and-save flow: inline confirmation with "Keep studying" / "Save and quit", commits partial grades to /api/study/complete
- DeckView: "Start studying" (primary button) + "Next cards in Xh Ym" disabled countdown with setInterval refresh
- CardList: 3 mastery progress dots per card row (bg-primary filled, border-border empty, w-2 h-2 rounded-full)
- Dashboard page: computes hasDueCards and earliestCooldownEnd server-side, includes masteryRound in cardRows

## Task Commits

1. **Task 1: Install Motion 12 + study page, session, card, stack components** - `87b54d9` (feat)
2. **Task 2: DeckView Study button + countdown, CardList mastery dots, dashboard props** - `2811e17` (feat)
3. **Task 3: Human verify** — awaiting checkpoint

## Files Created/Modified
- `src/app/(protected)/study/page.tsx` - Server Component: reads ?deck= param, assembles session, redirects if empty
- `src/components/study-session.tsx` - useReducer state machine: studying/committing/end/error phases, quit confirmation, session end screen
- `src/components/study-card.tsx` - 3D rotateY flip, motion drag swipe-to-grade, keyboard nav (Enter/Space/ArrowLeft/ArrowRight)
- `src/components/card-stack.tsx` - Layered CSS stack behind active card (max 3 layers, opacity 0.6/0.35/0.15)
- `src/components/deck-view.tsx` - Added Study button (active + disabled+countdown states), hasDueCards/earliestCooldownEnd props
- `src/components/card-list.tsx` - Added mastery progress dots column with 3 dots per card row
- `src/components/card-edit-dialog.tsx` - Added masteryRound?: number to CardRow interface
- `src/app/(protected)/dashboard/page.tsx` - Computes study awareness props, includes masteryRound in cardRows
- `src/app/api/study/complete/route.ts` - Fixed DeckId branded type cast (Rule 1)
- `src/components/translation-form.tsx` - Fixed useDebounceCallback -> useDebouncedCallback import (Rule 1)
- `src/lib/study-engine.ts` - Fixed TypeScript strict array access in shuffleTake/interleave (Rule 1)

## Decisions Made
- motion/react import path (not framer-motion) confirmed as correct for Motion 12
- useReducer state machine chosen over multiple useState hooks for clean phase transitions
- DeckView Study button placement: first in the header actions row, primary variant for Start studying, muted+disabled for countdown
- masteryRound optional on CardRow to avoid breaking existing consumers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useDebounceCallback import in translation-form.tsx**
- **Found during:** Task 1 verification (next build)
- **Issue:** translation-form.tsx imported `useDebounceCallback` but use-debounce exports `useDebouncedCallback` — build failure
- **Fix:** Changed to `import { useDebouncedCallback as useDebounceCallback } from "use-debounce"`
- **Files modified:** src/components/translation-form.tsx
- **Verification:** TypeScript and compilation pass after fix
- **Committed in:** 87b54d9 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed DeckId branded type cast in study complete route**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `eq(decks.id, deckId)` — plain string not assignable to branded `DeckId` type
- **Fix:** Added `deckId as DeckId` cast and imported `DeckId` type
- **Files modified:** src/app/api/study/complete/route.ts
- **Verification:** TypeScript passes
- **Committed in:** 87b54d9 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed TypeScript strict array access in study-engine.ts**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** Destructuring swap `[copy[i], copy[j]] = [copy[j], copy[i]]` fails with strict array indexing; also `learning[li]` and `resurface[ri]` potentially undefined
- **Fix:** Replaced destructuring swap with explicit tmp variable; added undefined guards before push
- **Files modified:** src/lib/study-engine.ts
- **Verification:** TypeScript passes
- **Committed in:** 87b54d9 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug fixes for pre-existing issues from Plans 01/02)
**Impact on plan:** Pre-existing bugs that blocked build verification. All fixes are minimal and correct. No scope creep.

## Issues Encountered
- next build fails during static page data collection due to placeholder DATABASE_URL (no real DB in worktree environment). TypeScript check and compilation both pass — this is a pre-existing infrastructure constraint, not a code issue. Added .env.local with placeholder DEEPL_API_KEY to unblock TypeScript validation phase of build.

## Known Stubs
None — all study data is wired from real DB queries via getStudyCards/assembleSession.

## Next Phase Readiness
- Complete study flow ready for human verification (Task 3 checkpoint)
- Phase 04 (Habitat Dashboard) can proceed once Task 3 is approved
- study/page.tsx → /api/study/complete → habitat_metadata.lastActivityAt update (set in route.ts Plan 02) feeds habitat progression

---
*Phase: 03-study-engine-and-study-ui*
*Completed: 2026-03-27*
