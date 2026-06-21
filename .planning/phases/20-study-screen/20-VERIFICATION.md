---
phase: 20-study-screen
verified: 2026-06-21T01:15:00Z
status: human_needed
score: 11/11 code-verifiable must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Study card front face visually matches HiFiStudy — Daybreak card surface (radius 22, #FFFFFF, #F0E3CF border, soft amber shadow), ALL-CAPS 'WHAT'S THE TRANSLATION?' prompt (12.5px, tracking 2.2px, muted), 42px Baloo 2 word, amber 'Tap to reveal' pill at bottom"
    expected: "Card front matches hifi-shared.jsx HiFiStudy() card area exactly in a browser at 390px width"
    why_human: "CSS rendering, font loading (Baloo 2 display weight), and shadow appearance cannot be verified by grep"
  - test: "Ghost-peek stack shows 1–3 Daybreak white cards behind the active card, layers visually thinning as the session nears its end (count-aware), and no progress indicator (no '4 of 12' counter or progress bar) is present"
    expected: "Stack layers visible behind card with white/amber-border surface, diminishing count of layers as cards are graded; no numeric count shown"
    why_human: "Layer stacking, translateY/scale visual geometry, and absence of extra UI elements require browser rendering"
  - test: "Swipe-right feedback overlay turns Daybreak green (#3E9B5F) progressively; swipe-left feedback turns Daybreak red (#DE5F4A) progressively"
    expected: "Green rgba(62,155,95) appears on right-swipe; red rgba(222,95,74) appears on left-swipe; old green-100/red-100 overlays are gone"
    why_human: "Motion/animation color feedback on gesture requires manual interaction in a browser"
  - test: "Back face shows the back-face swipe cue ('← still learning · got it →') with red ← and green → after flip + 300ms guard, and the card-back-hint test id is scoped (not the below-card hint pill)"
    expected: "After flip, the back-face cue appears with directional colors; the separate below-card showSwipeHint pill appears on first-flip-only; both are visually distinct"
    why_human: "Visual distinction between back-face cue and below-card hint pill, timing of 300ms guard, requires browser interaction"
  - test: "End screen: LionFace icon visible (no tiger emoji), three stats in Baloo 2 32px, 'learned' numeral is amber, 'Back to deck' is the Daybreak TBtn (amber)"
    expected: "End screen matches HiFiStudy() end state — LionFace mark, display-font numerals, amber hero number, amber button; no mini-habitat teaser"
    why_human: "Visual rendering of Daybreak primitives LionFace and TBtn, and absence of teaser, requires browser"
  - test: "Level-up overlay: static Soft-Clay Leo (widget-l{level}.webp image visible at ~160x160), Daybreak-recolored confetti (amber #F28A1F, green #3E9B5F, red #DE5F4A, gold #F2B33A, ink #4A331C) falling, cream overlay background (not dark), tap anywhere to dismiss"
    expected: "Overlay shows Leo image from public/habitat/widget-l{N}.webp, colorful confetti falling, cream rgba(255,246,233,0.92) bg, dismisses on tap"
    why_human: "Confetti animation, image rendering, overlay opacity, and tap-to-dismiss behavior require browser"
  - test: "Under prefers-reduced-motion: the level-up overlay shows Leo + 'Your habitat grew!' text + level numeral, but no confetti particles fall"
    expected: "Setting 'prefers-reduced-motion: reduce' in browser suppresses confetti; Leo and summary still visible"
    why_human: "Media query behavior and visual absence of animation require browser testing with reduced-motion enabled"
  - test: "Study session chrome: X-circle quit button (top-left, 40x40, #EDDFC9 border, white bg, ✕ glyph), centered 'Study session' label, 40px spacer right; Daybreak quit-confirm popover (white card, #F0E3CF border, soft shadow) with 'Keep studying' and 'Save and quit' actions"
    expected: "Top bar matches HiFiStudy() chrome spec; popover styled as Daybreak card surface"
    why_human: "Visual rendering of the Daybreak chrome layout requires browser"
---

# Phase 20: Study Screen Verification Report

**Phase Goal:** Study card and session result screen in Daybreak.
**Verified:** 2026-06-21T01:15:00Z
**Status:** human_needed (all code-verifiable must-haves VERIFIED; 8 visual items require human UAT)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-01: ghost-peek stack adopts Daybreak card surface (radius 22, #FFFFFF, #F0E3CF border) with count-aware geometry (Math.min(3, remainingCount), 3 layers, opacities, translateY/scale) as sole remaining-cards cue | ✓ VERIFIED | card-stack.tsx: `borderRadius: 22` (grep 1), `#F0E3CF` (grep 1), `Math.min(3, remainingCount)` present, `opacities = [0.6, 0.35, 0.15]`, `translateY(${(i+1)*8}px) scale(${1-(i+1)*0.03})` — no shadcn `rounded-xl bg-card border-border` (grep 0) — no count text, no progress bar |
| 2 | D-02: flashcard uses Daybreak surface (radius 22, #FFFFFF, #F0E3CF border, amber shadow) and Daybreak swipe colors green #3E9B5F / red #DE5F4A | ✓ VERIFIED | study-card.tsx: `borderRadius: 22` on both faces (grep 2), `rgba(62,155,95` (grep 1), `rgba(222,95,74` (grep 1), `rounded-[22px]` on overlays (grep 2), `border: "1px solid #F0E3CF"`, `boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)"` — no `bg-card` or `border-border` (grep 0) |
| 3 | D-02: fixed interaction model preserved byte-for-byte — tap/Enter/Space flip, 3D Y-axis flip 300ms, 300ms swipe-enable guard, swipe-right=knew it/swipe-left=still learning, keyboard arrows, velocity>500\|\|offset>80 threshold | ✓ VERIFIED | study-card.tsx: `handleKeyDown` (lines 57-70), `handleDragEnd` (lines 72-81), `Math.abs(velocity.x) > 500 \|\| Math.abs(offset.x) > 80` (line 78), `swipeReady` guard (line 76), `rotateY` animate with `duration: 0.3` (lines 139/171), `transformStyle: "preserve-3d"` (line 117) — all confirmed present and unmodified |
| 4 | D-03: no new progress indicator added — count-aware ghost-peek stack is the sole remaining-cards cue | ✓ VERIFIED | card-stack.tsx has no text nodes, no "N of M" string, no progress bar element — renders only the positional layer `<div>` elements. study-session.tsx render zone adds no numeric count display |
| 5 | QaStateBadge mount condition preserved exactly: `{qaCardData && <QaStateBadge .../>}`, not clipped by radius 22 | ✓ VERIFIED | study-card.tsx line 111: `{qaCardData && <QaStateBadge data={qaCardData} />}` — grep 1. Outer `motion.div` has no `overflow-hidden` that would clip the badge. `qaCardData` build (lines 30-37) unchanged |
| 6 | D-04: end screen replaces 🐯 with LionFace, Baloo 2 32px stat numerals, amber 'learned' hero (text-primary), TBtn for 'Back to deck', no mini-habitat teaser | ✓ VERIFIED | study-session.tsx: `LionFace size={80}` (grep 1), `font-display text-[32px] font-bold text-foreground` on studied/correct stats (lines 364/370), `font-display text-[32px] font-bold text-primary` on learned (line 377), `TBtn ... Back to deck` + `router.push(\`/dashboard?deck=${deckId}\`)` (line 386) — no 🐯 (grep 0), no shadcn Button import (grep 0), no mini-habitat teaser block |
| 7 | D-05: level-up overlay shows static Soft-Clay Leo (widget-l{level}.webp, L9-clamped via Math.min(level,9)), Daybreak confetti palette, cream bg, tap-to-dismiss; no clips/ | ✓ VERIFIED | level-up-overlay.tsx: `<img src={\`/habitat/widget-l${assetLevel}.webp\`} alt="Leo"` (line 83-89), `Math.min(level, 9)` (line 35), `CONFETTI_COLORS = ["#F28A1F", "#3E9B5F", "#DE5F4A", "#F2B33A", "#4A331C"]` (line 11), `style={{ background: "rgba(255, 246, 233, 0.92)" }}` (line 40), `onClick={onDismiss}` (line 41) — widget-l1..9.webp all confirmed present in public/habitat/ |
| 8 | D-06: confetti gated behind usePrefersReducedMotion — under reduced motion no falling particles, static Leo + level summary always render | ✓ VERIFIED | level-up-overlay.tsx: `const reduced = usePrefersReducedMotion()` (line 34), `{!reduced && (<div data-testid="confetti-layer">...36 particles...</div>)}` (lines 48-77), content block (lines 79-104) renders unconditionally — Wave 0 test 12/12 passes (confirmed by SUMMARY + TDD RED b29e041 → GREEN 072a997 commit sequence) |
| 9 | Wave 0 D-06 component test (level-up-overlay.test.tsx) asserts: confetti absent/present per reduced flag, Leo img always present, L9 asset clamp | ✓ VERIFIED | level-up-overlay.test.tsx: 12 test cases (`it(` grep count = 12), `// @vitest-environment jsdom` (line 1), `vi.mock("@/hooks/use-prefers-reduced-motion")`, Case A/B/C all present — `data-testid="confetti-layer"` and `data-confetti-particle` hooks match component |
| 10 | study-session.tsx PRESERVE zone (lines 1-294: reducer, computeStats, props, showLevelUp/handleLevelUpDismiss incl. dead `=== 10` branch, 300ms swipe-enable effect, commitIdRef, gradedRef, commit() POST /api/study/complete) is untouched | ✓ VERIFIED | study-session.tsx lines 1-296 read: reducer (lines 54-155), computeStats (lines 161-175), StudySessionProps (lines 182-186), `handleLevelUpDismiss` with `leveledUp === 10` dead branch (lines 214-220), 300ms swipe effect (lines 226-233), commitIdRef lazy-init (lines 239-242), gradedRef + phase-guard (lines 246-248), commit() POST effect (lines 251-295) — all intact. `grep -c "leveledUp === 10"` = 1 |
| 11 | Existing study e2e (06-study-session, study-progression, 14-qa-parity) stays green; e2e locators retargeted: getByTestId("card-back-hint") in 06/12; getByRole("button",{name:/quit study session/i}) in 06/10 | ✓ VERIFIED | e2e/06-study-session.spec.ts: line 23 `getByRole("button", { name: /quit study session/i })`, line 37 `getByTestId("card-back-hint")`, line 71 `getByRole("button", { name: /quit study session/i })`, line 72 `getByText("Quit session?")` preserved. e2e/12-pause-cards.spec.ts line 80 `getByTestId("card-back-hint")`. e2e/10-mobile-responsive.spec.ts line 72 `getByRole(...)`. No stale `getByText(/Swipe right/)` or `getByText("Quit session")` (non-?) remain. SUMMARY reports 14/14 green on core specs (fresh dev server) |

**Score:** 11/11 code-verifiable truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/study-card.tsx` | Daybreak-skinned flashcard: card surface, ALL-CAPS prompt, 42px Baloo 2 word, amber pill, green/red swipe overlays; flip/swipe/keyboard logic preserved | ✓ VERIFIED | 197 lines; all key tokens present (rgba(62,155,95), rgba(222,95,74), borderRadius:22 x2, rounded-[22px] x2, card-back-hint testid, qaCardData mount, handleKeyDown, handleDragEnd, velocity/offset thresholds) |
| `src/components/card-stack.tsx` | Count-aware ghost-peek stack reskinned to Daybreak card surface; geometry preserved | ✓ VERIFIED | 34 lines; borderRadius:22, #F0E3CF, Math.min(3,remainingCount), opacities, translateY/scale — no shadcn classes |
| `src/components/level-up-overlay.tsx` | Daybreak level-up: static Soft-Clay Leo (widget-l{N}.webp, L9-clamped), recolored confetti, prefers-reduced-motion gate, cream overlay | ✓ VERIFIED | 107 lines; usePrefersReducedMotion (grep 2), widget-l (grep 3), Math.min(level,9), #F28A1F, data-testid="confetti-layer", level===10 preserved (grep 2), level>=9 only in comment |
| `src/components/study-session.tsx` | Daybreak session chrome (X-circle quit, centered label, quit-confirm), committing/error restyle, end screen with LionFace + Baloo 2 numerals + TBtn; PRESERVE zone lines 1-294 untouched | ✓ VERIFIED | 538 lines; daybreak/lion-face import, daybreak/t-btn import, LionFace size={80}, font-display text-[32px] x3, text-primary on learned, aria-label="Quit study session", leveledUp===10 preserved, no 🐯, no @/components/ui/button |
| `src/components/__tests__/level-up-overlay.test.tsx` | Wave 0 D-06 component test: confetti absent under reduced motion, Leo+summary always present | ✓ VERIFIED | 119 lines; // @vitest-environment jsdom, vi.mock usePrefersReducedMotion, 12 it() test cases, afterEach(cleanup), Case A/B/C all present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/study-card.tsx` | swipe feedback overlay | useTransform on motion x value with Daybreak green/red rgba | ✓ WIRED | `rgba(62,155,95` present (line 43), `rgba(222,95,74` present (line 47-48); input ranges `[0,40,200]`/`[-200,-40,0]` unchanged |
| `src/components/study-card.tsx` | QaStateBadge | qaCardData-gated mount (preserved) | ✓ WIRED | Line 111: `{qaCardData && <QaStateBadge data={qaCardData} />}` |
| `src/components/card-stack.tsx` | Daybreak card surface tokens | inline style on layer divs | ✓ WIRED | `borderRadius: 22`, `background: "#FFFFFF"`, `border: "1px solid #F0E3CF"`, `boxSizing: "border-box"` all present inline on each layer div |
| `src/components/level-up-overlay.tsx` | public/habitat/widget-l{N}.webp | img src with Math.min(level,9) clamp | ✓ WIRED | `<img src={\`/habitat/widget-l${assetLevel}.webp\`}` (line 84); `assetLevel = Math.min(level, 9)` (line 35); all widget-l1..9.webp present in public/habitat/ |
| `src/components/level-up-overlay.tsx` | src/hooks/use-prefers-reduced-motion.ts | import + gate confetti with {!reduced && ...} | ✓ WIRED | `import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"` (line 4); `const reduced = usePrefersReducedMotion()` (line 34); `{!reduced && (<div data-testid="confetti-layer">...` (line 48) |
| `src/components/study-session.tsx` | src/components/daybreak/lion-face.tsx | import { LionFace } — end screen replaces 🐯 | ✓ WIRED | Line 7: `import { LionFace } from "@/components/daybreak/lion-face"` — used at lines 307 (committing), 319 (error), 358 (end screen LionFace size={80}) |
| `src/components/study-session.tsx` | src/components/daybreak/t-btn.tsx | import { TBtn } — Back to deck / Retry / Save and quit | ✓ WIRED | Line 8: `import { TBtn } from "@/components/daybreak/t-btn"` — used at lines 321 (retry), 384 (back to deck), 480 (save and quit) |

### Data-Flow Trace (Level 4)

Not applicable — these components render props/state passed down from existing study-session data (SessionCard, SessionStats), all of which originate from the unchanged RSC entry (`study/page.tsx`) and server-side `POST /api/study/complete`. The phase is presentation-only; no new data sources introduced.

### Behavioral Spot-Checks

Per the `<testing_note>` in the verification target: Playwright e2e requires a manually-managed dev server on :3000. Not re-run. Evidence relied upon:

| Behavior | Evidence | Status |
|----------|----------|--------|
| TypeScript compilation | `npx tsc --noEmit` exits 0 (run during verification) | ✓ PASS |
| Study card flip, swipe, keyboard, quit, QA-badge parity (06 + study-progression + 14-qa-parity) | SUMMARY 20-01: 14/14 on fresh dev server (PIDs documented) | ✓ PASS (from execution record) |
| Stale e2e selector retargets (06 line ~37, 12 line ~80) | Code inspection confirms `getByTestId("card-back-hint")` in both files; no `/Swipe right/` or `getByText(/still learning/)` remaining | ✓ PASS |
| D-06 Wave 0 component test (12 cases) | Code inspection confirms test file structure; SUMMARY 20-02 reports 12/12; TDD commit sequence RED b29e041 → GREEN 072a997 confirmed in git log | ✓ PASS |
| Full vitest unit suite | SUMMARY 20-02: 1968/1974 tests pass, 105/106 files; 1 pre-existing skip unrelated to phase 20 | ✓ PASS (from execution record) |
| Quit-control selector retargets (06 lines ~23/~71, 10 line ~72) | Code inspection confirms `getByRole("button", { name: /quit study session/i })` in all three locations; aria-label="Quit study session" verified in study-session.tsx line 426 | ✓ PASS |

### Probe Execution

Not applicable — no probe scripts declared in this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STU-01 | 20-01 | Study card redesigned to Daybreak — flashcard over ghost-peek stack, prompt, tap-to-reveal, swipe with green/red feedback, QA state badge preserved | ✓ SATISFIED | study-card.tsx fully reskinned (Daybreak surface, swipe colors, ALL-CAPS prompt, Baloo 2 42px, amber pill); card-stack.tsx Daybreak surface with count-aware geometry; QaStateBadge mount unchanged |
| STU-02 | 20-02 | Study-session result/end screen + level-up celebration redesigned to Daybreak | ✓ SATISFIED | study-session.tsx: LionFace end screen, Baloo 2 32px stats, amber learned hero, TBtn; level-up-overlay.tsx: static Soft-Clay Leo + Daybreak confetti + prefers-reduced-motion gate |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| level-up-overlay.tsx | 96 | Comment reference to "level >= 9" | Info | Comment-only — explains why the `level === 10` condition was NOT changed to `level >= 9` (scope fence per CONTEXT Deferred). Not a logic change. Not a blocker. |
| level-up-overlay.tsx | 82-83 | `biome-ignore lint/performance/noImgElement` | Info | Intentional — dynamic template-literal src with Math.min clamp is unsupported by next/image. Matches project precedent in image-upload-flow.tsx. Justification comment present. |

No TBD, FIXME, or XXX markers found in any phase-20 modified file. No unreferenced debt markers.

### Human Verification Required

The following items require browser-based UAT. These are all visual/behavioral concerns that cannot be verified by code inspection.

#### 1. Study card front face visual fidelity

**Test:** Open the study session with a card. Observe the front face before flipping.
**Expected:** White card with radius-22 corners, warm amber shadow, ALL-CAPS muted prompt ("WHAT'S THE TRANSLATION?", tracking visible), 42px Baloo 2 word, and an amber "Tap to reveal" pill anchored at bottom — matching hifi-shared.jsx HiFiStudy() card area.
**Why human:** CSS shadow, font rendering (Baloo 2 loaded via layout.tsx), pill positioning all require visual inspection.

#### 2. Ghost-peek stack visual geometry

**Test:** Start a study session with multiple cards. Observe the ghost layers behind the active card before and after grading.
**Expected:** 1–3 white Daybreak-border layers behind the card, visually shifting down/scaling out; layer count decrements as cards are graded; no numeric counter or progress bar anywhere on screen.
**Why human:** translateY/scale rendering, count-aware layer change, and absence of UI elements require browser interaction.

#### 3. Swipe color feedback

**Test:** After flipping a card and waiting 300ms, drag right and left slowly.
**Expected:** Right-drag shows a progressively deepening Daybreak green (#3E9B5F) overlay; left-drag shows Daybreak red (#DE5F4A). No green-100/red-100 colors.
**Why human:** Motion animation and color requires user gesture and visual inspection.

#### 4. Back-face hint and below-card pill distinction

**Test:** Flip a card. Observe the back face and the area below the card.
**Expected:** Back-face shows "← still learning · got it →" with red ← and green →. Below the card (first-flip-only), a separate hint pill reads "Swipe → if you got it · ← still learning" in a muted style. These are visually distinct — the back-face cue is inside the card; the pill is external.
**Why human:** Visual distinctness between two elements at the same time requires browser.

#### 5. End screen visual fidelity (D-04)

**Test:** Complete a study session. Observe the end screen.
**Expected:** LionFace icon (flat-geometric Leo), headline "Great work, keep it up!" in Baloo 2, three stat numerals in Baloo 2 32px, "learned" numeral visually amber (text-primary), amber TBtn "Back to deck". No tiger emoji, no mini-habitat teaser.
**Why human:** LionFace SVG rendering, Baloo 2 font loading, TBtn amber appearance require browser.

#### 6. Level-up overlay visual fidelity (D-05)

**Test:** Trigger a level-up (or mock the overlay by setting showLevelUp to a non-null value in dev tools). Observe the overlay.
**Expected:** Cream overlay background (warm, not dark/blur), Soft-Clay Leo image (widget-l{N}.webp, ~160×160, rounded), level numeral in large Baloo 2, "Your habitat grew!" text, Daybreak-colored confetti falling (amber, green, red, gold, ink), "Tap anywhere to continue" label. Tapping dismisses.
**Why human:** Image rendering, confetti animation colors and motion, tap-to-dismiss require browser.

#### 7. Reduced-motion confetti gate in browser (D-06)

**Test:** Enable "prefers-reduced-motion: reduce" in browser DevTools (Rendering > Emulate CSS media feature). Trigger the level-up overlay.
**Expected:** No confetti particles render or animate. Leo image and level summary ("Your habitat grew!", level numeral) remain visible. Overlay can still be dismissed by tapping.
**Why human:** CSS media query behavior at runtime requires browser testing with the media feature emulated.

#### 8. Daybreak session chrome visual fidelity

**Test:** Start a study session. Observe the top bar and tap the X-circle.
**Expected:** Top-left: circular white button (40×40, #EDDFC9 border, ✕ glyph). Center: "Study session" label (14px, semibold, muted). Top-right: invisible 40px spacer (no extra element). Tapping ✕ shows a Daybreak card popover ("Quit session? Your progress so far will be saved.") with "Keep studying" and "Save and quit" (amber) buttons.
**Why human:** Layout of top bar, popover card surface appearance, button sizes require browser.

### Gaps Summary

No code-verifiable gaps found. All 11 must-have truths are VERIFIED by code inspection and grep. The 8 items above require human UAT because they address visual rendering, animation behavior, and browser-level CSS — not anything that can be falsified by reading code.

---

_Verified: 2026-06-21T01:15:00Z_
_Verifier: Claude (gsd-verifier)_
