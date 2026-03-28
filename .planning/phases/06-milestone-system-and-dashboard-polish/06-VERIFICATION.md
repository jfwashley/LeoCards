---
phase: 06-milestone-system-and-dashboard-polish
verified: 2026-03-28T22:30:00Z
status: gaps_found
score: 9/13 must-haves verified
gaps:
  - truth: "The dashboard displays per-language learned card counts below the 'My Deck' heading"
    status: failed
    reason: "Commit 3e23c40 (feat(06-03)) is on branch worktree-agent-a8b04436 only — never merged to master. The working tree does not contain: getLanguageBreakdown import in dashboard/page.tsx, the Promise.all call, the languageBreakdown prop on DeckView, or the rendering logic in deck-view.tsx."
    artifacts:
      - path: "src/app/(protected)/dashboard/page.tsx"
        issue: "Missing: import { getLanguageBreakdown } from '@/lib/milestone-queries'. Missing: getLanguageBreakdown call in Promise.all. Missing: languageBreakdown={languageBreakdown} prop on DeckView."
      - path: "src/components/deck-view.tsx"
        issue: "Missing: languageBreakdown field in DeckViewProps interface. Missing: languageBreakdown parameter in DeckView function. Missing: conditional render of 'French: N learned · Spanish: N learned' below h1."
    missing:
      - "Merge branch worktree-agent-a8b04436 to master, OR cherry-pick commit 3e23c40 to master"
  - truth: "When level 10 is reached, a bird sprite flies in from off-screen in the habitat scene"
    status: partial
    reason: "The fly-in animation is correctly implemented in BirdSprite and HabitatCanvas. However, the navigation chain that triggers isFirstAppearance=true is broken: HabitatWidget.Link always navigates to '/habitat' without the ?celebrate=10 query param, and HabitatScene does not accept or pass celebratingLevel to HabitatCanvas. The bird will appear at its resting position (no fly-in) even on first appearance after a level 10 unlock."
    artifacts:
      - path: "src/components/habitat-widget.tsx"
        issue: "celebratingLevel prop is accepted but never used. Link href is hardcoded to '/habitat' — when celebratingLevel === 10, should navigate to '/habitat?celebrate=10' instead."
      - path: "src/app/(protected)/habitat/page.tsx"
        issue: "Server component does not read searchParams.celebrate. Does not parse celebratingLevel. HabitatScene receives no celebratingLevel."
      - path: "src/components/habitat-scene.tsx"
        issue: "HabitatScene does not accept a celebratingLevel prop and passes no celebratingLevel to HabitatCanvas (calls <HabitatCanvas habitatState={state} /> with no celebratingLevel)."
    missing:
      - "HabitatWidget: when celebratingLevel === 10, set Link href to '/habitat?celebrate=10' instead of '/habitat'"
      - "habitat/page.tsx: accept searchParams, parse celebrate param, pass celebratingLevel to HabitatScene"
      - "HabitatScene: accept and forward celebratingLevel prop to HabitatCanvas"
  - truth: "Only languages with at least 1 learned card appear in the breakdown"
    status: failed
    reason: "Follows from the same missing-merge gap as the first truth. The getLanguageBreakdown query itself (in milestone-queries.ts) correctly filters masteryRound >= 3, but it is never called from the dashboard because the feat(06-03) commit is not on master."
    artifacts:
      - path: "src/app/(protected)/dashboard/page.tsx"
        issue: "getLanguageBreakdown is never called — see first gap."
    missing:
      - "Same fix as first gap (merge or cherry-pick 3e23c40)"
  - truth: "The format is 'French: 23 learned · Spanish: 10 learned · English: 4 learned' with middle dot separator"
    status: failed
    reason: "Rendering logic is absent from deck-view.tsx in the current working tree. Same missing-merge gap."
    artifacts:
      - path: "src/components/deck-view.tsx"
        issue: "No breakdown p tag, no .join(' · '), no LANGUAGE_LABELS mapping for counts — all absent from current working tree."
    missing:
      - "Same fix as first gap (merge or cherry-pick 3e23c40)"
  - truth: "A user with no learned cards sees no breakdown text"
    status: failed
    reason: "The conditional render (languageBreakdown.length > 0) is not present in the working tree. Same missing-merge gap."
    artifacts:
      - path: "src/components/deck-view.tsx"
        issue: "languageBreakdown.length > 0 guard absent."
    missing:
      - "Same fix as first gap (merge or cherry-pick 3e23c40)"
human_verification:
  - test: "Level-up celebration overlay appearance and behavior"
    expected: "After a study session that crosses a level threshold, a fullscreen overlay appears with confetti, the new level number, and 'Tap anywhere to continue'. Tapping dismisses it. It does not replay on refresh or on the next session at the same level."
    why_human: "Animation quality, dismiss interaction, and exactly-once behavior require browser testing. APPROVED per 06-02-SUMMARY.md (Task 3 checkpoint) — included here for record."
  - test: "Bird fly-in at level 10 via corrected navigation chain"
    expected: "After the level 10 overlay is dismissed, navigating to the habitat page (with ?celebrate=10 in URL after the navigation fix) shows the bird flying in from the right and settling in the upper-right area. On subsequent visits without ?celebrate=10, the bird appears at rest with no animation."
    why_human: "PixiJS animation quality and visual correctness of the fly-in require browser testing. Blocked until the navigation chain gap is fixed."
---

# Phase 6: Milestone System and Dashboard Polish — Verification Report

**Phase Goal:** Reaching key card-count thresholds triggers a memorable unlock moment in the habitat, new animals appear as collectibles, and the dashboard clearly shows how each language contributes to the shared habitat.

**Verified:** 2026-03-28T22:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After completing a study session that crosses a level threshold, the API response includes the new level number | VERIFIED | `route.ts` line 178: `return Response.json({ success: true, leveledUp })` where `leveledUp = newLevel` when `newLevel > prevLevel` |
| 2 | After completing a study session that does not cross a level threshold, the API response indicates no level change | VERIFIED | `let leveledUp: number \| null = null` initialized, only overwritten when `newLevel > prevLevel` |
| 3 | A user who jumps multiple levels in one session sees only the highest level reported | VERIFIED | `leveledUp = newLevel` (the post-session level, not per-threshold) per D-07 |
| 4 | Completing a session a second time at the same level does not re-trigger a level-up indication | VERIFIED | `markMilestonesSeen` uses `.onConflictDoNothing()` — DB constraint prevents duplicate rows — but more importantly, `prevLevel === newLevel` means `newLevel > prevLevel` is false so `leveledUp` stays null |
| 5 | A user can query their per-language learned card counts and only languages with progress appear | VERIFIED | `getLanguageBreakdown` in `milestone-queries.ts` filters `masteryRound >= 3` and groups by language; function exists and is tested |
| 6 | When a study session causes a level-up, a fullscreen celebration overlay appears with confetti, the new level number, and a dismiss affordance | VERIFIED | `LevelUpOverlay` rendered in `study-session.tsx` end phase when `showLevelUp !== null`; confetti 36 pieces, level displayed, "Tap anywhere to continue" present |
| 7 | Tapping anywhere on the overlay dismisses it and it does not replay on refresh | VERIFIED (human approved) | `onClick={onDismiss}` on the outer motion.div; server-side `markMilestonesSeen` + `onConflictDoNothing` prevents re-trigger; human checkpoint APPROVED 2026-03-28 |
| 8 | When level 10 is reached, a bird sprite flies in from off-screen in the habitat scene | PARTIAL | `BirdSprite` and `HabitatCanvas` are correctly wired, but the navigation chain to trigger `isFirstAppearance=true` on the `/habitat` page is broken (see Gaps) |
| 9 | The bird remains visible at its resting position on all subsequent habitat visits after level 10 | VERIFIED | `habitatState.level >= 10` check in `habitat-canvas.tsx` line 130 renders `BirdSprite` always at level 10+; `isAnimatingRef` set from initial prop only |
| 10 | Multi-level jumps show only the highest level celebration (per D-07) | VERIFIED | API returns `leveledUp = newLevel` (highest reached), not per-level; client sets `showLevelUp(data.leveledUp)` once |
| 11 | The dashboard displays per-language learned card counts below the 'My Deck' heading | FAILED | `feat(06-03)` commit `3e23c40` is on branch `worktree-agent-a8b04436` only, not merged to master; working tree missing all plan 03 changes |
| 12 | Only languages with at least 1 learned card appear in the breakdown | FAILED | Rendering absent from working tree (same root cause as #11) |
| 13 | The format is 'French: N learned · Spanish: N learned' with middle dot separator | FAILED | Rendering absent (same root cause) |

**Score:** 9/13 truths verified

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/milestone-queries.ts` | markMilestonesSeen() and getLanguageBreakdown() query functions | VERIFIED | 69 lines; both exports present; `.onConflictDoNothing()`; `gte(cards.masteryRound, 3)`; `.groupBy(decks.language)` |
| `src/lib/milestone-queries.test.ts` | Unit tests for milestone query logic | VERIFIED | 171 lines; 8 tests (5 for markMilestonesSeen, 3 for getLanguageBreakdown) |
| `src/app/api/study/complete/route.ts` | Extended POST handler with level-up detection | VERIFIED | Contains `leveledUp`, `prevLevel`, `newLevel`, `markMilestonesSeen`, response `{ success: true, leveledUp }` |
| `src/lib/study-engine.ts` | Extended SessionStats type with leveledUp field | VERIFIED | `SessionStats` at line 27-32 includes `leveledUp: number \| null` |

#### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/level-up-overlay.tsx` | Fullscreen celebration modal with confetti and level display | VERIFIED | 77 lines; `export function LevelUpOverlay`; `CONFETTI_COUNT = 36`; `bg-background/90 backdrop-blur-sm`; "Tap anywhere to continue"; "A bird arrived in your habitat!" |
| `src/components/bird-sprite.tsx` | PixiJS bird sprite with fly-in animation for level 10 | VERIFIED | 80 lines; `export function BirdSprite`; `useTick(onTick)`; `useCallback` wrapping; `useRef(isFirstAppearance)` (Pitfall 3); `sceneWidth * 0.75` rest position |
| `src/components/study-session.tsx` | Study session with level-up overlay integration | VERIFIED | Contains `LevelUpOverlay` import and render; `data.leveledUp` read; `celebrate=10` in dismiss handler |
| `src/components/habitat-canvas.tsx` | Habitat scene with conditional bird sprite at level 10 | VERIFIED | `BirdSprite` import; `habitatState.level >= 10` condition; `celebratingLevel` prop; `isFirstAppearance={celebratingLevel === 10}` |
| `src/app/(protected)/dashboard/page.tsx` | Dashboard reading celebrate query param | VERIFIED | `celebrate?: string` in searchParams type; `celebratingLevel` parsed at line 49; passed to DeckView |
| `public/sprites/habitat.json` | Sprite atlas with layer-bird frame | VERIFIED | `layer-bird` frame present at coordinates (960, 3240, 64x64) |

#### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(protected)/dashboard/page.tsx` | Dashboard calling getLanguageBreakdown and passing to DeckView | FAILED | No `getLanguageBreakdown` import; Promise.all has 3 items, not 4; no `languageBreakdown` prop on DeckView |
| `src/components/deck-view.tsx` | DeckView rendering language breakdown text | FAILED | `DeckViewProps` has no `languageBreakdown` field; no breakdown render; no `.join(' · ')` pattern |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `route.ts` | `habitat-queries.ts` | `getHabitatFacts()` calls before and after DB writes | VERIFIED | Lines 99, 167: two `getHabitatFacts` calls confirmed |
| `route.ts` | `milestone-queries.ts` | `markMilestonesSeen()` call after level-up detection | VERIFIED | Line 173: `await markMilestonesSeen(session.user.id, prevLevel, newLevel)` |
| `route.ts` | `habitat-engine.ts` | `computeHabitatState()` for before/after level comparison | VERIFIED | Lines 100, 168: `computeHabitatState(factsBefore, now).level` and `computeHabitatState(factsAfter, now).level` |

#### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `study-session.tsx` | `level-up-overlay.tsx` | Conditional render in end phase when leveledUp is non-null | VERIFIED | Lines 324-328: `<AnimatePresence>{showLevelUp !== null && <LevelUpOverlay .../>}</AnimatePresence>` |
| `study-session.tsx` | `/api/study/complete` | Reads leveledUp from API response JSON | VERIFIED | Line 267: `const data = await response.json()` then `data.leveledUp ?? null` |
| `study-session.tsx` | `dashboard/page.tsx` | router.push with ?celebrate=10 after overlay dismiss when leveledUp===10 | VERIFIED | Lines 224-226: `if (leveledUp === 10) { router.push('/dashboard?deck=${deckId}&celebrate=10') }` |
| `dashboard/page.tsx` | `habitat-canvas.tsx` | Reads searchParams.celebrate, passes celebratingLevel to HabitatCanvas | PARTIAL | Dashboard parses celebratingLevel and passes to DeckView → DeckView passes to HabitatWidget. BUT HabitatWidget ignores it (Link stays `/habitat` without param). HabitatScene and habitat/page.tsx have no celebratingLevel support. |
| `habitat-canvas.tsx` | `bird-sprite.tsx` | Conditional render when habitatState.level >= 10 | VERIFIED | Lines 130-137 in habitat-canvas.tsx: `{habitatState.level >= 10 && habitatSheet && <BirdSprite ... isFirstAppearance={celebratingLevel === 10} />}` |

#### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dashboard/page.tsx` | `milestone-queries.ts` | getLanguageBreakdown() call in Promise.all | FAILED | Import absent; function not called |
| `dashboard/page.tsx` | `deck-view.tsx` | languageBreakdown prop | FAILED | Prop not passed |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/components/level-up-overlay.tsx` | `level` prop | API response `data.leveledUp` via study-session → dispatch → state.stats | Yes — derived from DB card counts via computeHabitatState | FLOWING |
| `src/components/bird-sprite.tsx` | `isFirstAppearance` | `celebratingLevel === 10` in habitat-canvas.tsx | Wired at canvas level; broken at navigation chain (HabitatWidget / habitat page) | STATIC (celebratingLevel always null at /habitat) |
| `src/components/deck-view.tsx` | `languageBreakdown` | Not queried in working tree | N/A — call does not exist on master | DISCONNECTED |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| milestone-queries.ts exports both functions | `grep "export async function" src/lib/milestone-queries.ts` | markMilestonesSeen and getLanguageBreakdown found | PASS |
| route.ts returns leveledUp field | `grep "leveledUp" src/app/api/study/complete/route.ts` | Multiple matches including `Response.json({ success: true, leveledUp })` | PASS |
| SessionStats includes leveledUp | `grep "leveledUp" src/lib/study-engine.ts` | `leveledUp: number \| null` in type and `leveledUp: null` in computeStats return | PASS |
| layer-bird in sprite atlas | `grep "layer-bird" public/sprites/habitat.json` | Frame entry at (960,3240,64x64) found | PASS |
| Dashboard page missing getLanguageBreakdown | `grep "getLanguageBreakdown" src/app/(protected)/dashboard/page.tsx` | No matches | FAIL |
| DeckView missing languageBreakdown prop | `grep "languageBreakdown" src/components/deck-view.tsx` | No matches | FAIL |
| feat(06-03) commit on master | `git branch --contains 3e23c40` | Only on worktree-agent-a8b04436, not master | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HAB-04 | 06-01, 06-02 | Milestone thresholds trigger special unlock moments | PARTIALLY SATISFIED | Level-up detection in API (06-01) VERIFIED. Celebration overlay in study session (06-02) VERIFIED. Bird fly-in animation exists but first-appearance trigger chain broken. |
| HAB-05 | 06-02 | New animals appear in the habitat as visual milestone rewards | PARTIALLY SATISFIED | BirdSprite component exists and renders at level >= 10 correctly. Bird will appear at rest position always. Fly-in animation on first appearance does not trigger due to broken navigation chain. |
| HAB-07 | 06-01, 06-03 | Dashboard shows per-language breakdown of learned card counts | FAILED | `getLanguageBreakdown` function exists in milestone-queries.ts (06-01 VERIFIED). Dashboard integration and DeckView rendering (06-03) NOT in working tree — commit 3e23c40 not merged to master. |

All three requirement IDs declared across plans are accounted for. No orphaned requirements detected.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `public/sprites/habitat.json` | 94 | `layer-bird` frame at coordinates (960,3240) overlapping `layer-water-2` — bird texture is a fragment of the habitat background, not an actual bird graphic | Warning | Bird will render as a habitat background fragment, not a recognizable bird. Documented as intentional dev placeholder in 06-02-SUMMARY.md. Requires final art before production. |
| `src/components/habitat-widget.tsx` | 54 | `<Link href="/habitat">` hardcoded without celebrate param when celebratingLevel is 10 | Blocker | Bird fly-in on first appearance never triggers. celebratingLevel prop is silently dropped. |

---

### Human Verification Required

#### 1. Level-Up Celebration Overlay

**Test:** Complete a study session that causes a level-up (may require temporarily lowering LEVEL_THRESHOLDS in habitat-engine.ts). Observe the overlay, dismiss it, then complete another session at the same level.
**Expected:** Fullscreen overlay with falling confetti, level number in primary color, "Tap anywhere to continue". Tapping dismisses. Second session at same level shows no overlay.
**Why human:** Animation quality, interaction feel, and exactly-once behavior cannot be verified statically. APPROVED per 06-02-SUMMARY.md checkpoint on 2026-03-28.

#### 2. Bird Fly-In at Level 10 (Blocked — requires navigation chain fix first)

**Test:** After fixing the navigation chain gaps, reach level 10 in a study session. Observe the overlay, dismiss it, and verify arrival at /habitat?celebrate=10.
**Expected:** Bird flies in from the right side over ~1 second and settles at upper-right area (~75% width, 30% height). On subsequent /habitat visits without ?celebrate=10, the bird is present at rest with no fly-in.
**Why human:** PixiJS animation quality and visual correctness require browser testing. Currently blocked by broken navigation chain.

---

### Gaps Summary

**Root cause 1 — feat(06-03) not on master (3 truths blocked, HAB-07 blocked):**

Commit `3e23c40` (`feat(06-03): add per-language learned card breakdown to dashboard`) was created and exists in git history but only on the worktree branch `worktree-agent-a8b04436`. It was never merged to `master`. The docs commit `72d8ebe` closed out the plan with a SUMMARY but did not include the code changes. The fix is a single cherry-pick or merge: `git cherry-pick 3e23c40`. This would add the `getLanguageBreakdown` import to `dashboard/page.tsx`, the Promise.all call, the DeckView prop, and the rendering logic in `deck-view.tsx`.

**Root cause 2 — Bird fly-in navigation chain broken (HAB-04/HAB-05 partial):**

The plan intended: study-session → `/dashboard?celebrate=10` → DeckView → HabitatWidget → `/habitat?celebrate=10` → HabitatScene → HabitatCanvas → BirdSprite with `isFirstAppearance=true`. The chain breaks at HabitatWidget: the Link always navigates to `/habitat` without the `?celebrate=10` param. Additionally, `habitat/page.tsx` does not read `searchParams.celebrate`, and `HabitatScene` does not accept `celebratingLevel`. Three files need changes:

1. `src/components/habitat-widget.tsx` — use a button or conditional href: when `celebratingLevel === 10`, navigate to `/habitat?celebrate=10`
2. `src/app/(protected)/habitat/page.tsx` — accept `searchParams: Promise<{ celebrate?: string }>`, parse `celebratingLevel`, pass to `HabitatScene`
3. `src/components/habitat-scene.tsx` — accept `celebratingLevel?: number | null` prop, forward it to `HabitatCanvas`

The bird will still appear at rest without the fly-in (level >= 10 check in HabitatCanvas works correctly), so HAB-05 ("new animals appear") is partially satisfied — the bird is present, but the memorable fly-in first-appearance moment is lost.

---

_Verified: 2026-03-28T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
