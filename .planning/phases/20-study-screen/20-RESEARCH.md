# Phase 20: Study Screen - Research

**Researched:** 2026-06-20
**Domain:** Presentation-layer re-skin — study card, session chrome, end screen, level-up overlay; Daybreak design system applied to existing study components
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Ghost-peek stack — count-aware Daybreak GhostPeek. The stack behind the flashcard adopts the Daybreak GhostPeek look (same peeking-edge atom from auth-card.tsx) while keeping count-aware behavior: up to 3 peeking edges that thin out as the session nears its end. No separate progress indicator — the ghost-peek stack is the sole "cards remaining" cue.
- **D-02:** Card surface + swipe feedback restyled to Daybreak. Flashcard uses the Daybreak card surface (white #FFFFFF, radius 22, 1px border #F0E3CF, shadow `0 12px 30px rgba(160,110,40,0.16)`). Progressive swipe color feedback: green `#3E9B5F` (knew it / swipe-right), red `#DE5F4A` (still learning / swipe-left). Fixed interaction model preserved: tap/Enter/Space to flip, 3D Y-axis flip ~300ms, 300ms swipe-enable guard after flip, swipe-right = knew it / swipe-left = still learning, keyboard arrows as non-touch path.
- **D-03:** No explicit progress indicator. Count-aware ghost-peek stack (D-01) is the sole "cards remaining" cue. Declined to keep screen calm and avoid a misleading denominator.
- **D-04:** End screen = LionFace mark + restyled stats (contained scope). Replace 🐯 tiger emoji with Daybreak LionFace; restyle three stats (cards studied / % correct / learned) and "Back to deck" CTA to Daybreak (Baloo 2 display numerals, amber primary button). "Learned" stat stays the amber hero number. No mini-habitat teaser on end screen.
- **D-05:** Level-up = Soft-Clay Leo + Daybreak confetti. Level-up overlay brings in a Soft-Clay-styled Leo (from existing still/poster, NOT the animated clips), paired with Daybreak-recolored confetti + amber display type. Keeps "Your habitat grew!" beat and tap-to-dismiss.
- **D-06:** Reduced motion — confetti only (this phase). Gate level-up confetti behind `prefers-reduced-motion`: when reduced, static Soft-Clay Leo + summary still show, no falling particles. 3D card flip and swipe tilt keep current behavior this phase (reduced-motion variants for flip/swipe deferred).

### Claude's Discretion
- Top bar / session chrome restyle (the "Study session" label, "Quit session" button, quit-confirm popover) to Daybreak — exact treatment open; no progress/deck-name addition required.
- The "Saving your progress…" transition and the save-error + "Retry saving session" state — Daybreak restyle; a light Leo touch is welcome but optional.
- Exact token values, spacing, component prop shapes, and file layout — pull from the Daybreak system and existing `src/components/daybreak/*` primitives.
- Exact confetti recolor palette and the Soft-Clay Leo's placement/size within the overlay.

### Deferred Ideas (OUT OF SCOPE)
- Reduced-motion variants for card flip (crossfade) and swipe (calm/instant) — later accessibility pass.
- Mini-habitat teaser scene on the end screen — considered, declined.
- Explicit session progress indicator ("4 of 12" / progress bar) — considered, declined (D-03).
- Animated habitat clip / full habitat scene in the level-up — declined for scope/perf (Phase 24).
- The `handleLevelUpDismiss` L10 vs L9 dead-branch bug — out of scope for Phase 20 (logic preserved unchanged).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STU-01 | Study card redesigned to Daybreak — big flashcard over a ghost-peek stack, "WHAT'S THE TRANSLATION?" prompt, tap-to-reveal, swipe →/← with green/red color feedback and the hint line; QA state badge (Phase 14) still visible when QA-authed | D-01, D-02: reskin card-stack.tsx and study-card.tsx; Daybreak card surface + GhostPeek atom; swipe overlays swap to Daybreak green/red; QaStateBadge mount condition untouched |
| STU-02 | Session-result/end screen (cards studied / % correct / learned + "Back to deck" + level-up celebration hand-off) redesigned to Daybreak visual language | D-04: LionFace replaces 🐯, Baloo 2 numerals, TBtn "Back to deck"; D-05: level-up overlay gets Soft-Clay Leo + recolored confetti; D-06: confetti gated by prefers-reduced-motion |
</phase_requirements>

---

## Summary

Phase 20 is a pure presentation re-skin of the study flow to the Daybreak design system. The study engine, SRS logic, reducer, requeue, idempotent grade-commit, and QA state badge (Phase 14) are preserved byte-for-byte. All Daybreak primitives (TBtn, Card, LionFace, GhostPeek) shipped in Phase 19 are available and reused directly.

Four components need reskinning: `study-card.tsx`, `card-stack.tsx`, `study-session.tsx`, and `level-up-overlay.tsx`. The server entry `study/page.tsx` is untouched. The reskin is additive in nature — replacing Tailwind utility classes and inline styles with Daybreak equivalents, with two substantive additions: the Soft-Clay Leo asset in the level-up overlay (sourced from `public/habitat/widget-l*.webp`) and the confetti reduced-motion gate.

The hi-fi design spec for the study screen is in `hifi-shared.jsx` → `HiFiStudy()`. Key design observations verified directly from the file: the top bar centers "Study session" label with an X-button (circle border) on the left; the card uses the full-height flex area with GhostPeek at 68%/82% widths; the hint line uses `t.hintBg`/`t.hintBorder`/`t.hintText` (pillBg-like treatment, separate from the card); and arrow glyphs (← →) with the Daybreak green/red colors appear inside the card as direction cues.

**Primary recommendation:** Reskin each component in one atomic task per component; preserve all existing JS logic; use the Daybreak Card primitive + inline-style GhostPeek from auth-card.tsx for the study card surface; use `widget-l{N}.webp` for the Soft-Clay Leo in the level-up overlay (the `N` matching the level number received as prop); gate confetti via `usePrefersReducedMotion` already extracted in Phase 19.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Study card flip / swipe / keyboard | Browser (client component) | — | Pure interaction model; all behavior preserved |
| Card surface visual (Daybreak) | Browser (client component) | — | Inline styles + Tailwind classes; no server logic |
| Ghost-peek stack (count-aware) | Browser (client component) | — | Props-driven UI; no data fetching |
| Swipe color feedback (green/red) | Browser (client component) | — | `useMotionValue` / `useTransform` — already client-only |
| QA state badge mount | Browser (client component, gated by `qaMode` prop) | Server (readQaAuth in study/page.tsx RSC) | RSC passes qaMode prop; badge renders only when truthy |
| Session chrome (top bar, quit-confirm) | Browser (client component) | — | Reducer state; no server touch |
| End screen stats + "Back to deck" | Browser (client component) | — | Client state from reducer; router.push is client-only |
| Level-up confetti + Soft-Clay Leo | Browser (client component) | — | motion/react animation; static asset src only |
| Reduced-motion confetti gate | Browser (client component) | — | `usePrefersReducedMotion` hook (already in codebase) |
| Grade commit (idempotent POST) | Browser → API Route Handler | — | Preserved unchanged; not touched by this phase |
| Session assembly / auth / ownership | Server (RSC, study/page.tsx) | DB | Preserved unchanged |

---

## Standard Stack

### Core (already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` | ^12.38.0 | Card flip, swipe tilt, exit animation, confetti fall, overlay fade | Already used in study-card.tsx, study-session.tsx, level-up-overlay.tsx |
| Daybreak primitives (`src/components/daybreak/`) | Phase 19 | Card surface, GhostPeek, LionFace, TBtn — reused directly | Shipped in Phase 19; purpose-built for this milestone |
| `usePrefersReducedMotion` hook (`src/hooks/`) | Phase 19 | Gate confetti behind prefers-reduced-motion (D-06) | Extracted from habitat-video.tsx in Phase 19; SSR-safe |

### No New Packages Required

All capabilities for this phase are covered by the existing dependency tree. [VERIFIED: package.json + Phase 19 research]

---

## Package Legitimacy Audit

No new packages are introduced in this phase. Skipping audit — not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (client component — study flow)
  │
  ├─ study/page.tsx (RSC)
  │    ├─ auth check → redirect /login
  │    ├─ ownership check SEC-02 → redirect /dashboard
  │    ├─ assembleSession(rawCards) — preserved
  │    ├─ readQaAuth() → qaMode bool — preserved
  │    └─► <StudySession initialCards qaMode deckId /> (client boundary)
  │
  └─ StudySession ("use client")
       ├─ useReducer(reducer) — PRESERVED, no touch
       │    States: studying / committing / end / error
       │    Actions: FLIP_CARD / ENABLE_SWIPE / SWIPE_GRADE / TOGGLE_QUIT_CONFIRM
       │           / QUIT_SESSION / COMMIT_DONE / COMMIT_ERROR / RETRY_COMMIT
       │
       ├─ commitIdRef (stable per-session UUID, idempotency) — PRESERVED
       │
       ├─ "committing" phase → fetch POST /api/study/complete — PRESERVED
       │
       ├─ Render: studying
       │    ├─ Top bar (Daybreak chrome) ← RESKIN
       │    │    ├─ "Study session" label (Daybreak muted type)
       │    │    └─ X-circle quit button + quit-confirm popover (Daybreak)
       │    └─ Card area
       │         ├─ <CardStack remainingCount /> ← RESKIN (Daybreak GhostPeek look)
       │         ├─ <AnimatePresence>
       │         │    └─ <StudyCard card flipped swipeReady ... qaMode /> ← RESKIN
       │         │         ├─ Swipe overlays: green #3E9B5F / red #DE5F4A
       │         │         ├─ Card surface: Daybreak (radius 22, border #F0E3CF, shadow)
       │         │         ├─ Front face: prompt in ALL-CAPS spaced label style
       │         │         ├─ Back face: translation + hint pill
       │         │         └─ QaStateBadge (preserved, qaMode-gated)
       │         └─ Hint line (pill treatment — Daybreak hintBg/hintBorder)
       │
       ├─ Render: committing
       │    └─ "Saving your progress…" (Daybreak restyle — optional Leo touch)
       │
       ├─ Render: error
       │    └─ Error message + "Retry saving session" (Daybreak restyle)
       │
       └─ Render: end
            ├─ <AnimatePresence>
            │    └─ <LevelUpOverlay level onDismiss /> (when showLevelUp !== null)
            │         ├─ Soft-Clay Leo asset (widget-l{level}.webp) ← NEW ASSET
            │         ├─ Confetti (36 particles, Daybreak palette) ← RECOLOR
            │         └─ Confetti gated: usePrefersReducedMotion() ← NEW GATE
            └─ End screen
                 ├─ <LionFace size=96 /> (replaces 🐯)
                 ├─ Headline "Great work, keep it up!" (Baloo 2 display)
                 ├─ Stats row: studied / correct% / learned (Baloo 2 numerals)
                 │    └─ "learned" numeral in amber (text-primary) — PRESERVED
                 └─ <TBtn> "Back to deck" → router.push
```

### Recommended File Layout

No new files strictly required. Changes are confined to:

```
src/
└── components/
    ├── study-card.tsx          RESKIN (swipe overlays, card surface, prompt style, hint)
    ├── card-stack.tsx          RESKIN (GhostPeek look — inline styles to match auth-card.tsx pattern)
    ├── study-session.tsx       RESKIN (chrome, committing/error states, end screen)
    └── level-up-overlay.tsx    RESKIN (confetti colors, add Soft-Clay Leo img, prefers-reduced-motion gate)
```

Optional new file (if the planner elects to extract the study card surface as a sub-component):
```
src/
└── components/
    └── daybreak/
        └── study-card-surface.tsx   (optional extraction — not required)
```

---

## Open Questions Resolution

### OQ-1: D-05 Soft-Clay Leo asset — confirmed recommendation

**Finding:** `public/habitat/` contains two sets of `.webp` still images per level:
- `hero-l1.webp` … `hero-l9.webp` — large full-scene Soft-Clay posters (full habitat scene with Leo + environment)
- `widget-l1.webp` … `widget-l9.webp` — smaller, cropped versions suitable for small UI contexts
- `clips/` — ambient video clips (~1.3 MB each) — D-05 explicitly excludes these

**Recommendation:** Use `widget-l{level}.webp` at approximately 160×160px (or up to 200px) centered in the level-up overlay. The widget images are cropped habitat scenes, smaller footprint than hero images, and work well in an overlay context. Because the level-up overlay receives `level: number` as a prop, the asset is dynamically selected: `src={/habitat/widget-l${level}.webp}`.

**Rationale:** `hero-l{N}.webp` shows the full habitat scene (sky, hills, scenery) — appropriate for a full-screen habitat view but visually busy for a celebration overlay. `widget-l{N}.webp` is a tighter crop with Leo more prominent, matching the D-05 intent of "a Soft-Clay-styled Leo" (not the full habitat scene). L9 cap: if `level` exceeds 9, clamp to `Math.min(level, 9)` for the asset src.

**Size/placement:** Center the image in the overlay content block, above the "Habitat Level" label. Suggested: `width: 160px, height: 160px, object-fit: 'cover', borderRadius: 16`. No `clips/` directory is needed; this is a static `<img>` tag (or Next.js `<Image>` with fixed dimensions).

**Clips safety check confirmed:** `public/habitat/clips/` directory exists but D-05 is explicit — do not pull these into the study flow.

[VERIFIED: `public/habitat/` directory listing via Bash]

---

### OQ-2: GhostPeek vs current card-stack — recommendation

**Finding from reading both files:**

`src/components/card-stack.tsx` (current): renders up to 3 absolutely-positioned `<div>` layers behind the card, using:
- `className="absolute inset-0 rounded-xl bg-card border border-border"`
- `transform: translateY(${(i+1)*8}px) scale(${1-(i+1)*0.03})`
- `opacity` values: `[0.6, 0.35, 0.15]`
- Current colors resolve to shadcn `bg-card` / `border-border` (not Daybreak amber border)

`src/components/daybreak/auth-card.tsx` → `GhostPeek` atom: renders a single peeking-edge strip using:
- `background: "#FFFFFF"`, `borderRadius: "22px 22px 0 0"`, `border: "1px solid #F0E3CF"`, `borderBottom: "none"`
- `position: absolute, left: 50%, top, transform: translateX(-50%), width: widthPct, height: 22`
- Two peeks: top=0 at 62% opacity 0.45, top=10 at 76% opacity 0.8

**Key shape mismatch:** The auth `GhostPeek` renders only the top edge strip (height: 22px, no bottom border) — it peeks above the main card's top. The current `CardStack` renders full-height ghost cards shifted downward below the main card — a completely different visual approach.

**Recommendation for D-01 (count-aware Daybreak GhostPeek):**

The simplest Daybreak-compliant approach that preserves the count-aware behavior is to **adapt `card-stack.tsx` in place** using the Daybreak card surface tokens, rather than reusing the `GhostPeek` atom directly (which is not count-aware and only shows the top edge).

Specifically: update `card-stack.tsx` to replace `bg-card border-border rounded-xl` with the Daybreak card surface tokens (`background: "#FFFFFF"`, `border: "1px solid #F0E3CF"`, `borderRadius: 22`) and keep the existing `translateY`/`scale`/`opacity` positioning logic. The visual result will be Daybreak ghost-peek card edges (white with amber border, matching the main study card surface) — count-aware, up to 3 layers, thinning as the session progresses. This matches the `HiFiStudy` handoff (which shows ghost cards behind the main card using `GhostPeek t={t}` with the Daybreak `#FFFFFF`/`#F0E3CF` surface).

**Alternative (if planner prefers):** A study-specific `StudyCardStack` component could take the `GhostPeek` atom and render 1–3 instances with increasing top offset and decreasing widthPct — producing a "cards peeking from behind" effect. This more closely matches the auth-card visual metaphor but requires more coordination than the in-place reskin.

**The in-place reskin of `card-stack.tsx` is the lower-risk path** and stays count-aware without behavioral change.

[VERIFIED: both files read in full]

---

### OQ-3: Swipe color feedback swap — exact implementation

**Current implementation in `study-card.tsx`:**

```tsx
// Lines 41-49: two useTransform overlays, rendered as absolute inset divs z-10
const bgColorRight = useTransform(
  x,
  [0, 40, 200],
  ["rgba(0,0,0,0)", "rgba(220,252,231,0.6)", "rgba(220,252,231,0.8)"],
);
const bgColorLeft = useTransform(
  x,
  [-200, -40, 0],
  ["rgba(254,226,226,0.8)", "rgba(254,226,226,0.6)", "rgba(0,0,0,0)"],
);
```

Current colors: `rgba(220,252,231,...)` (Tailwind green-100) for right and `rgba(254,226,226,...)` (Tailwind red-100) for left.

**Daybreak swap (D-02):** Replace only the rgba color values. The `useTransform` mechanics, input ranges, the motion `x` value, and the overlay `div` structure are all preserved unchanged.

Daybreak green `#3E9B5F` → `rgba(62, 155, 95, 0.6)` / `rgba(62, 155, 95, 0.8)`
Daybreak red `#DE5F4A` → `rgba(222, 95, 74, 0.6)` / `rgba(222, 95, 74, 0.8)`

```tsx
// REPLACE (lines 41-49 of study-card.tsx):
const bgColorRight = useTransform(
  x,
  [0, 40, 200],
  ["rgba(0,0,0,0)", "rgba(62,155,95,0.6)", "rgba(62,155,95,0.8)"],
);
const bgColorLeft = useTransform(
  x,
  [-200, -40, 0],
  ["rgba(222,95,74,0.8)", "rgba(222,95,74,0.6)", "rgba(0,0,0,0)"],
);
```

The overlay `div` border-radius also changes from `rounded-xl` (12px) to match the Daybreak card radius (22px) to avoid a visual mismatch with the card corners.

**Nothing else in `handleDragEnd`, `handleKeyDown`, the swipe-enable guard, or the flip logic changes.**

[VERIFIED: study-card.tsx read in full]

---

### OQ-4: Reduced-motion confetti gate — implementation

**Current `level-up-overlay.tsx` state:**
- Confetti is always rendered (36 `motion.div` elements with `animate: {y: "110vh", opacity: 0, rotate: ...}`)
- No reduced-motion check exists

**`usePrefersReducedMotion` hook:** Extracted from `habitat-video.tsx` in Phase 19 and placed at `src/hooks/use-prefers-reduced-motion.ts`. [VERIFIED: Phase 19 PATTERNS.md — hook extraction confirmed]

**D-06 gate pattern:**

```tsx
// In level-up-overlay.tsx:
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export function LevelUpOverlay({ level, onDismiss }: LevelUpOverlayProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div className="fixed inset-0 z-50 ..." onClick={onDismiss} ...>
      {/* Confetti — only when motion is allowed (D-06) */}
      {!reduced && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
            <motion.div key={index} ... />
          ))}
        </div>
      )}
      {/* Soft-Clay Leo + content always show */}
      <div className="relative flex flex-col items-center gap-2 text-center">
        <img src={`/habitat/widget-l${Math.min(level, 9)}.webp`} ... />
        {/* stats */}
      </div>
    </motion.div>
  );
}
```

**Card flip and swipe tilt remain unchanged (D-06 explicit):** The flip uses `animate={{ rotateY: ... }}` on the face divs; the tilt comes from `useTransform(x, [-200,0,200], [-12,0,12])`. Both are preserved as-is this phase.

[VERIFIED: level-up-overlay.tsx, study-card.tsx read in full; 19-PATTERNS.md confirmed hook location]

---

### OQ-5: End screen restyle — mapping (D-04 / STU-02)

**Current end screen in `study-session.tsx` (lines 330-388):**

```tsx
<span className="text-6xl" role="img" aria-label="Tiger">🐯</span>
<h1 className="text-lg sm:text-[20px] font-semibold text-foreground">
  Great work, keep it up!
</h1>
<div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
  <div><span className="text-2xl sm:text-[28px] font-semibold text-foreground">{cardsStudied}</span><span>studied</span></div>
  <div><span className="text-2xl sm:text-[28px] font-semibold text-foreground">{correctPct}%</span><span>correct</span></div>
  <div><span className="text-2xl sm:text-[28px] font-semibold text-primary">{newlyLearned}</span><span>learned</span></div>
</div>
<Button variant="default" onClick={() => router.push(...)}>Back to deck</Button>
```

**Daybreak mapping:**

| Element | Current | Daybreak replacement |
|---------|---------|---------------------|
| `🐯` emoji (text-6xl) | Tiger emoji | `<LionFace size={80} />` from `src/components/daybreak/lion-face.tsx` |
| Headline font | `font-semibold` (Figtree) | Add `font-display` (Baloo 2) class — `className="font-display text-[20px] font-bold text-foreground"` |
| Stats numerals | `font-semibold` (Figtree 28px) | `font-display text-[32px] font-bold` (Baloo 2 — the "display numerals" treatment) |
| "studied" / "correct" / "learned" labels | `text-sm text-muted-foreground` | Unchanged — Figtree/muted is already correct Daybreak for labels |
| "learned" numeral color | `text-primary` (amber) | `text-primary` — already correct; preserved (D-04: "learned stat stays the amber hero number") |
| "Back to deck" button | shadcn `<Button variant="default">` | `<TBtn>Back to deck</TBtn>` from Daybreak primitives |
| Overall layout | `motion.div` fade-in | Keep motion entry animation; apply Daybreak `bg-background` (cream) |

**"Great work, keep it up!" copy:** Preserved unchanged per design brief. Brief note: the copy contract says the study brief predates Daybreak but its copy is still the contract — no copy change needed.

---

### OQ-6: Preservation landmines — confirmed inventory

**Preserved unchanged (planner must not touch):**

| Item | Location | Why preserved |
|------|----------|---------------|
| `reducer` function | `study-session.tsx` lines 53-154 | All session state logic — FLIP_CARD, ENABLE_SWIPE, SWIPE_GRADE, requeue, COMMIT_DONE, COMMIT_ERROR, RETRY_COMMIT |
| `computeStats` function | `study-session.tsx` lines 160-175 | Stat calculation for the end screen |
| `commitIdRef` | `study-session.tsx` lines 238-241 | Stable per-session idempotency key — WR-04 |
| `gradedRef` | `study-session.tsx` lines 244-247 | Avoids stale closure on commit effect |
| The `commit()` async effect | `study-session.tsx` lines 250-294 | POST /api/study/complete — untouched |
| 300ms swipe-enable guard | `study-session.tsx` lines 225-232 | `useEffect` → setTimeout(300ms) → dispatch ENABLE_SWIPE |
| `handleDragEnd` threshold | `study-card.tsx` lines 72-81 | velocity > 500 || offset > 80 threshold |
| `handleKeyDown` | `study-card.tsx` lines 57-70 | Enter/Space flip, Arrow grade |
| 3D flip CSS | `study-card.tsx` lines 128-168 | `transformStyle: preserve-3d`, `backfaceVisibility: hidden`, `rotateY` animate |
| `QaStateBadge` mount | `study-card.tsx` lines 111 | Renders only when `qaCardData !== null` (qaMode=true); data-qa-badge DOM attribute |
| `assembleSession` / `readQaAuth` | `study/page.tsx` | Server-side session assembly and QA auth check |
| `src/lib/study-engine.ts` | — | SRS logic |
| `src/lib/study-queries.ts` | — | DB queries |
| `POST /api/study/complete` | — | Idempotent grade commit endpoint |

**Dead branch — confirmed, do not fix:**
`handleLevelUpDismiss` in `study-session.tsx` line 216 checks `if (leveledUp === 10)` and routes to `?celebrate=10`, but the habitat caps at L9. This is the dead branch noted in D-05's deferred section. Phase 20 preserves the logic as-is.

[VERIFIED: study-session.tsx and level-up-overlay.tsx read in full]

---

## HiFiStudy Design Spec — Verified Tokens

Directly from `design/handoff-daybreak/hifi-shared.jsx` `HiFiStudy()` function:

**Top bar chrome:**
- Layout: `justifyContent: 'space-between', padding: '4px 22px 0'`
- Left: X-button circle — `width: 40, height: 40, borderRadius: 999, border: t.quitBorder` (`1.5px solid #EDDFC9`), `background: t.quitBg` (`#FFFFFF`), `color: t.ink` (`#4A331C`), `fontSize: 15`, shows `✕` glyph
- Center: "Study session" — `fontSize: 14, fontWeight: 600, color: t.muted` (`#9C8467`), `letterSpacing: 0.3`
- Right: 40px spacer (balance)

**Card area:**
- GhostPeek at top=0 widthPct="68%" opacity=0.45 and top=10 widthPct="82%" opacity=0.8
- Note: auth-card uses 62%/76%; study spec uses 68%/82% — the study card is slightly wider
- Main card: `borderRadius: 22, background: #FFFFFF, border: 1px solid #F0E3CF, boxShadow: 0 12px 30px rgba(160,110,40,0.16)`
- Inside card: `←` and `→` glyph arrows in `t.red`/`t.green` colors, `opacity: 0.5`, centered vertically at card edges
- Prompt label: `"WHAT'S THE TRANSLATION?"` — `fontSize: 12.5, fontWeight: 700, letterSpacing: 2.2, color: t.muted`
- Word: `fontFamily: t.fontDisplay` (Baloo 2), `fontSize: 42, color: t.ink, fontWeight: 700`
- "Tap to reveal" pill: `position: absolute, bottom: 22`, styled as `fontSize: 13, fontWeight: 600, color: t.pillText` (`#B4762A`), `background: t.pillBg` (`#FFF1DC`), `padding: 8px 16px, borderRadius: 999`

**Hint line (below card):**
- `fontSize: 13.5, fontWeight: 600, color: t.hintText` (`#9C8467`), `background: t.hintBg` (`#FFFFFF`), `border: t.hintBorder` (`1.5px solid #F0E3CF`), `padding: 9px 18px, borderRadius: 999`
- Content: "Swipe → if you got it · ← still learning" with → in `t.green` and ← in `t.red`

[VERIFIED: hifi-shared.jsx read in full]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Daybreak card surface | Custom div with hardcoded styles | `src/components/daybreak/card.tsx` or inline style matching `auth-card.tsx` surface | Surface tokens already live in one place; copy inline style from auth-card for study card to keep exact match |
| GhostPeek edges | New component | Adapt existing `card-stack.tsx` with Daybreak token values OR reuse `GhostPeek` from auth-card.tsx | GhostPeek atom is already defined and exported in auth-card.tsx as a named function |
| LionFace mark | SVG from scratch | `src/components/daybreak/lion-face.tsx` | Already ported from handoff; size prop controls all scaling |
| Primary button | Restyled shadcn Button | `<TBtn>` from `src/components/daybreak/t-btn.tsx` | Already built in Phase 19 |
| Reduced-motion hook | `window.matchMedia` inline | `usePrefersReducedMotion` from `src/hooks/use-prefers-reduced-motion.ts` | Already extracted in Phase 19; SSR-safe with `useState(false)` default |
| Soft-Clay Leo art | CSS-drawn scene or Three.js | `public/habitat/widget-l{N}.webp` static images | Already rendered and in the public dir; no Three.js or CDN needed |
| Confetti animation | CSS `@keyframes` | Existing `motion.div` loop in level-up-overlay.tsx | Already implemented; only the colors and a reduced-motion guard change |

---

## Common Pitfalls

### Pitfall 1: Touching the reducer or commit logic when restyling study-session.tsx

**What goes wrong:** When restyling the end screen or chrome, an implementer adds an import, changes a variable name, or restructures the JSX in a way that accidentally modifies the reducer, the `commitIdRef`, or the commit `useEffect`.

**Why it happens:** `study-session.tsx` is 483 lines long with logic and render mixed together. It is easy to modify render-adjacent code and clip the logic.

**How to avoid:** Treat lines 1-294 (types, reducer, computeStats, props, state setup, effects) as a read-only zone. Only touch the four `if (state.phase === ...)` render blocks and the `return` JSX (lines 298-483). Mark the boundary with a comment.

**Warning signs:** Any test failure in `e2e/06-study-session.spec.ts` or `e2e/study-progression.spec.ts`.

---

### Pitfall 2: GhostPeek geometry mismatch — study card vs auth card

**What goes wrong:** Reusing `GhostPeek` from `auth-card.tsx` directly without adjusting widthPct causes the peek stack to look narrower than the handoff spec. The auth card spec uses 62%/76%; the study screen spec uses 68%/82%.

**How to avoid:** When adapting card-stack.tsx or creating study-specific peek layers, use the study-screen values from `HiFiStudy`: first peek at 68% width opacity 0.45, second at 82% width opacity 0.8.

---

### Pitfall 3: `usePrefersReducedMotion` SSR hydration

**What goes wrong:** If `usePrefersReducedMotion` is imported from a file that isn't `"use client"` or is called on a server component, it throws a hydration mismatch because `useState(false)` on server vs actual device preference on client.

**How to avoid:** The hook is already `"use client"` (confirmed in Phase 19 patterns). `level-up-overlay.tsx` is already `"use client"`. Import the hook normally — no dynamic import or SSR wrapper needed.

---

### Pitfall 4: Overlay img src for level-up Leo — L9 cap

**What goes wrong:** `data.leveledUp` from `/api/study/complete` could theoretically be 10 (the dead-branch scenario noted in deferred). `public/habitat/widget-l10.webp` does not exist; the image would 404.

**How to avoid:** Always clamp the asset index: `src={`/habitat/widget-l${Math.min(level, 9)}.webp`}`. Add `alt="Leo"` and `width`/`height` attributes.

---

### Pitfall 5: The `QaStateBadge` corner breathing room

**What goes wrong:** When restyling `study-card.tsx` to use the Daybreak card surface, the absolute-positioned `QaStateBadge` could be clipped or obscured by the new border-radius (22px instead of current `rounded-xl` = 12px).

**Why it matters:** Brief hard requirement #8 — "leave breathing room so a small corner badge on a card wouldn't break the layout."

**How to avoid:** `QaStateBadge` renders via `{qaCardData && <QaStateBadge data={qaCardData} />}` inside the `motion.div` wrapper (line 111). The badge uses `data-qa-badge` attribute and positions itself in a corner. With radius 22px, inset the badge slightly more (e.g., ensure its absolute position has at least `top: 8, right: 8`). The badge component itself (not modified in Phase 20) controls its own positioning — just verify no overflow-hidden clip cuts it.

---

### Pitfall 6: `border-radius` on swipe overlay divs

**What goes wrong:** The two swipe-feedback overlay `<motion.div>` elements (lines 101-108 of study-card.tsx) use `className="absolute inset-0 rounded-xl"`. When the card surface changes from `rounded-xl` (12px) to Daybreak radius 22px, the overlay corner-radius won't match, creating a visual halo.

**How to avoid:** Change `rounded-xl` on the overlay divs to `rounded-[22px]` (or use inline `borderRadius: 22`) to match the Daybreak card radius.

---

### Pitfall 7: End screen — shadcn `<Button>` vs `<TBtn>`

**What goes wrong:** The current end screen uses shadcn `<Button variant="default">`. If left as-is while the rest of the screen gains Daybreak styling, the button will visually mismatch (different radius, shadow, height). The error screen also uses `<Button>`.

**How to avoid:** Replace both Button usages in the end and error render blocks with `<TBtn>` from Daybreak primitives. The existing `router.push()` onClick handler passes through unchanged.

---

## Code Examples

### Pattern 1: Daybreak study card surface (D-02)

```tsx
// In study-card.tsx — replace the face div className with inline style + Daybreak tokens:
// Source: auth-card.tsx AuthCard inner div + hifi-daybreak.jsx d1 theme

// Front face — replace:
//   className="absolute inset-0 bg-card border border-border rounded-xl ..."
// With inline style matching auth-card.tsx surface:
<motion.div
  className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 py-6 cursor-pointer select-none"
  style={{
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    borderRadius: 22,
    background: "#FFFFFF",
    border: "1px solid #F0E3CF",
    boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
  }}
  animate={{ rotateY: flipped ? 180 : 0 }}
  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
>
  {/* Prompt label: all-caps, letter-spaced, muted */}
  <p className="text-[12.5px] font-bold tracking-[2.2px] text-muted-foreground text-center uppercase">
    {frontPrompt}
  </p>
  {/* Word: Baloo 2 display, 42px */}
  <p className="font-display text-[42px] font-bold text-foreground text-center leading-[1.15]">
    {frontText}
  </p>
  {/* "Tap to reveal" pill */}
  {!flipped && (
    <span className="absolute bottom-[22px] text-[13px] font-semibold rounded-full px-4 py-2"
      style={{ color: "#B4762A", background: "#FFF1DC" }}>
      Tap to reveal
    </span>
  )}
</motion.div>
```

[CITED: design/handoff-daybreak/hifi-shared.jsx HiFiStudy(); design/handoff-daybreak/auth-card.tsx AuthCard surface]

---

### Pattern 2: Count-aware Daybreak CardStack (D-01)

```tsx
// src/components/card-stack.tsx — reskin in place
// Replace: className="absolute inset-0 rounded-xl bg-card border border-border"
// With: inline Daybreak card surface tokens (matching study-card surface)
// Geometry (translateY/scale/opacity) preserved unchanged

// Study screen peek widths from HiFiStudy spec (68%/82%) — different from auth (62%/76%):
// This CardStack renders full-height ghost cards shifted down (not top-edge strips).
// Update the border/bg/radius only.

export function CardStack({ remainingCount }: CardStackProps) {
  const visibleLayers = Math.min(3, remainingCount);
  if (visibleLayers === 0) return null;
  const opacities = [0.6, 0.35, 0.15];
  return (
    <>
      {Array.from({ length: visibleLayers }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            transform: `translateY(${(i + 1) * 8}px) scale(${1 - (i + 1) * 0.03})`,
            zIndex: -(i + 1),
            opacity: opacities[i],
            borderRadius: 22,
            background: "#FFFFFF",
            border: "1px solid #F0E3CF",
            boxSizing: "border-box",
          }}
        />
      ))}
    </>
  );
}
```

[CITED: design/handoff-daybreak/hifi-shared.jsx GhostPeek + HiFiStudy()]

---

### Pattern 3: Level-up overlay with Soft-Clay Leo + reduced-motion gate (D-05/D-06)

```tsx
// src/components/level-up-overlay.tsx — key changes only
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// Daybreak confetti palette (replace CONFETTI_COLORS):
const CONFETTI_COLORS = ["#F28A1F", "#3E9B5F", "#DE5F4A", "#F2B33A", "#4A331C"];

export function LevelUpOverlay({ level, onDismiss }: LevelUpOverlayProps) {
  const reduced = usePrefersReducedMotion();
  const assetLevel = Math.min(level, 9);  // L9 cap; no widget-l10.webp exists

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(255, 246, 233, 0.92)" }}  // cream bg/90 (Daybreak)
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Confetti — gated by reduced-motion (D-06) */}
      {!reduced && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
            <motion.div
              key={index}
              className="absolute top-0 w-2 h-3 rounded-sm pointer-events-none"
              style={{
                left: `${5 + (index / CONFETTI_COUNT) * 90}vw`,
                backgroundColor: CONFETTI_COLORS[index % 5],
              }}
              initial={{ y: "-10vh", opacity: 1, rotate: 0 }}
              animate={{ y: "110vh", opacity: 0, rotate: 360 * (CONFETTI_ROTATE_DIRS[index] ?? 1) }}
              transition={{ duration: 2.5, delay: (index % 8) * 0.07, ease: "easeIn" }}
            />
          ))}
        </div>
      )}

      {/* Content — always shows (static Leo + stats even in reduced-motion) */}
      <div className="relative flex flex-col items-center gap-4 text-center px-6">
        {/* Soft-Clay Leo asset (D-05) */}
        <img
          src={`/habitat/widget-l${assetLevel}.webp`}
          alt="Leo"
          width={160}
          height={160}
          style={{ borderRadius: 16, objectFit: "cover" }}
        />
        <p className="text-sm text-muted-foreground">Habitat Level</p>
        <p className="font-display text-[62px] font-bold text-primary leading-none">{level}</p>
        <p className="text-base text-foreground">
          {level >= 9 ? "A bird arrived in your habitat!" : "Your habitat grew!"}
        </p>
        <p className="text-sm text-muted-foreground mt-6">Tap anywhere to continue</p>
      </div>
    </motion.div>
  );
}
```

[CITED: design/handoff-daybreak/hifi-daybreak.jsx d1 theme; design/handoff-daybreak/README.md "accent gold #F2B33A level-9 / celebratory amber"]
[VERIFIED: public/habitat/ listing confirms widget-l1.webp … widget-l9.webp exist]

Note on `level >= 9` check: The current code uses `level === 10` for the max-level copy ("A bird arrived…"). Since habitat caps at L9, `level >= 9` is the correct condition for the max-level celebration message. This is the minimal fix to make the copy display correctly at L9 — it is incidental to the reskin and not a logic change to the reducer or commit.

---

### Pattern 4: End screen Daybreak restyle (D-04 / STU-02)

```tsx
// In study-session.tsx — render: end block (lines 330-388)
// Replace the emoji + stats + Button with:

import { LionFace } from "@/components/daybreak/lion-face";
import { TBtn } from "@/components/daybreak/t-btn";

// Inside the end render:
<LionFace size={80} />
<h1 className="font-display text-[20px] font-bold text-foreground">
  Great work, keep it up!
</h1>
<div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
  <div className="flex flex-col items-center gap-1">
    <span className="font-display text-[32px] font-bold text-foreground">{cardsStudied}</span>
    <span className="text-sm text-muted-foreground">studied</span>
  </div>
  <div className="flex flex-col items-center gap-1">
    <span className="font-display text-[32px] font-bold text-foreground">{correctPct}%</span>
    <span className="text-sm text-muted-foreground">correct</span>
  </div>
  <div className="flex flex-col items-center gap-1">
    <span className="font-display text-[32px] font-bold text-primary">{newlyLearned}</span>
    <span className="text-sm text-muted-foreground">learned</span>
  </div>
</div>
<TBtn onClick={() => router.push(`/dashboard?deck=${deckId}`)}>
  Back to deck
</TBtn>
```

[CITED: hifi-shared.jsx HiFiStudy() — "Baloo 2 numerals" per README.md]

---

### Pattern 5: Top bar chrome restyle (Claude's Discretion)

```tsx
// Daybreak study chrome — top bar
// X-button as circle with amber border, centered label, spacer right
<div
  className="flex items-center justify-between flex-none"
  style={{ padding: "4px 22px 0" }}
>
  <button
    aria-label="Quit study session"
    onClick={() => dispatch({ type: "TOGGLE_QUIT_CONFIRM" })}
    style={{
      width: 40, height: 40, borderRadius: 999,
      border: "1.5px solid #EDDFC9",
      background: "#FFFFFF",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#4A331C", fontSize: 15, cursor: "pointer",
    }}
  >
    ✕
  </button>
  <span
    className="text-[14px] font-semibold text-muted-foreground"
    style={{ letterSpacing: 0.3 }}
  >
    Study session
  </span>
  <span style={{ width: 40 }} aria-hidden="true" />
</div>
```

[CITED: hifi-shared.jsx HiFiStudy() lines 133-137]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tiger emoji 🐯 on end screen | `LionFace` CSS mark (Daybreak) | Phase 20 | Consistent with Phase 19 brand pivot: Leo the lion, not the old tiger |
| Generic Tailwind green-100 / red-100 swipe overlays | Daybreak `#3E9B5F` / `#DE5F4A` | Phase 20 | Matches Daybreak palette; red also serves as `destructive` token |
| shadcn `bg-card border-border rounded-xl` on study card | Daybreak surface (#FFFFFF, radius 22, border #F0E3CF, shadow) | Phase 20 | Visual cohesion with auth cards from Phase 19 |
| Generic confetti colors (orange, blue, green, yellow, red) | Daybreak palette (amber, green, red, accent gold, ink) | Phase 20 | Branded confetti matches the Daybreak system |
| No reduced-motion gate on confetti | Confetti gated by `prefers-reduced-motion` | Phase 20 | Accessibility: static Leo + summary still show; D-06 |
| No Soft-Clay Leo in level-up | `widget-l{N}.webp` static Soft-Clay poster | Phase 20 | D-05: the most celebratory moment in the app now has Leo imagery |

**Not changed in Phase 20 (deferred to later):**
- 3D card flip reduced-motion variant (crossfade) — accessibility pass
- Swipe tilt reduced-motion variant (calm/instant) — accessibility pass
- Full habitat scene / mini teaser on end screen — Phase 24 territory
- "4 of 12" progress indicator — declined (D-03)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `widget-l{N}.webp` images are Soft-Clay-style cropped scenes that show Leo prominently enough for an overlay context | OQ-1, Pattern 3 | If they are too wide-angle or dark, hero-l{N}.webp may be a better choice. Mitigation: implementer should visually spot-check one or two widget images before committing to this pick. The file listing confirms they exist but their visual content was not verified by reading the image. |
| A2 | `src/hooks/use-prefers-reduced-motion.ts` was created in Phase 19 and is importable | OQ-4 | If Phase 19 left the hook inline in habitat-video.tsx only, Phase 20 must extract it first (a one-line task). Phase 19 PATTERNS.md specifies extraction — assumed complete. |
| A3 | `next/image` `<Image>` component is available and usable for the widget-l{N}.webp in the overlay | Pattern 3 | If there is a Daybreak/Next.js 16 constraint on dynamic `src` in `<Image>`, a plain `<img>` tag is the safe fallback. The overlay is already client-side ("use client"), so either works. |

**If table were empty:** All claims were verified. In this case A1-A3 are low-risk assumptions that require a moment of visual/file confirmation at implementation time but do not affect architecture.

---

## Environment Availability

This phase is code/config/asset-only changes. No external services, CLI tools, or runtimes beyond the existing project stack are needed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `motion` (motion/react) | Study card swipe, confetti animation | ✓ | ^12.38.0 | — |
| `usePrefersReducedMotion` hook | D-06 confetti gate | ✓ | Phase 19 | Extract inline if not found at hooks path |
| `public/habitat/widget-l*.webp` | D-05 Soft-Clay Leo | ✓ | all 9 levels present | Fall back to `hero-l{N}.webp` if widget images prove visually unsuitable |
| Daybreak primitives (`TBtn`, `LionFace`, `Card`) | End screen, top bar, optional | ✓ | Phase 19 | — |
| Vitest + Playwright | Validation | ✓ | Vitest 4.1.1, Playwright 1.58.2 | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 (unit) + Playwright 1.58.2 (e2e) |
| Config file | `vitest.config.ts` (root), `playwright.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run && npx playwright test` |
| Targeted study e2e | `npx playwright test e2e/06-study-session.spec.ts e2e/study-progression.spec.ts e2e/14-qa-parity.spec.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STU-01 | Study session page loads, shows "Study session" label, "Quit session" button, question prompt, "Tap to reveal" | E2E | `npx playwright test e2e/06-study-session.spec.ts -k "study session shows card"` | ✅ |
| STU-01 | Tap flips card; swipe hint appears | E2E | `npx playwright test e2e/06-study-session.spec.ts -k "tapping card flips"` | ✅ |
| STU-01 | Keyboard arrow grades card | E2E | `npx playwright test e2e/06-study-session.spec.ts -k "keyboard arrows"` | ✅ |
| STU-01 | QA badge absent from customer DOM | E2E | `npx playwright test e2e/14-qa-parity.spec.ts` | ✅ |
| STU-01 | QaStateBadge renders [data-qa-badge] when qaMode=true | Unit | `npx vitest run src/components/__tests__/` (if exists) or manual QA-mode verification | ❌ Wave 0 gap (unit test) / manual QA verification |
| STU-01 | Daybreak card surface tokens (visual) | Human UAT | Open /study in browser; verify cream bg, amber border, Baloo 2 fonts, green/red swipe | Manual only |
| STU-01 | Ghost-peek stack count-aware (1→2→3 layers) | Human UAT | Study with 1, 2, 3+ remaining cards | Manual only |
| STU-02 | Quit session saves progress + retry on error | E2E | `npx playwright test e2e/06-study-session.spec.ts -k "quit session"` | ✅ |
| STU-02 | End screen shows stats + navigation to dashboard | E2E | `npx playwright test e2e/study-progression.spec.ts` | ✅ (check assertions match new copy) |
| STU-02 | "Great work" end screen visible (Daybreak: LionFace, Baloo 2) | Human UAT | Study to completion; verify LionFace visible, no emoji, Baloo 2 numerals | Manual only |
| STU-02 | Level-up overlay appears when `data.leveledUp` is non-null | E2E (conditional on leveling up in test) | `npx playwright test e2e/study-progression.spec.ts` covers level-up path | ✅ (partial — leveledUp depends on card count) |
| STU-02 | Level-up overlay shows Soft-Clay Leo + confetti | Human UAT | Trigger a level-up in dev; verify widget-l{N}.webp visible, confetti falls | Manual only |
| STU-02 | Confetti absent under prefers-reduced-motion | Assertable | `npx playwright test` with `--media prefers-reduced-motion:reduce` flag; assert confetti container absent from DOM | ❌ Wave 0 gap |
| STU-02 | Static Leo + summary still visible under prefers-reduced-motion | Assertable | Same test as above; assert img src and stats visible | ❌ Wave 0 gap |

### Behavior Preservation Tests (run to confirm nothing broken)

These tests pass TODAY and must still pass after Phase 20:

| Test | Command | What it proves |
|------|---------|----------------|
| Study reducer (studying / committing / end / error) | `npx playwright test e2e/06-study-session.spec.ts` | Reducer and state transitions untouched |
| QA badge absent from customer DOM | `npx playwright test e2e/14-qa-parity.spec.ts` | QaStateBadge mount condition preserved |
| Quit-confirm saves and retries | `e2e/06-study-session.spec.ts` "quit session" | QUIT_SESSION + commit + RETRY_COMMIT |
| Keyboard arrow grading | `e2e/06-study-session.spec.ts` "keyboard arrows" | Arrow key path preserved |
| Study progression to end screen | `e2e/study-progression.spec.ts` | Full loop + commit + end preserved |

### Sampling Rate

- **Per task commit:** `npx vitest run` (unit tests, < 30s)
- **Per wave merge:** `npx vitest run && npx playwright test e2e/06-study-session.spec.ts e2e/study-progression.spec.ts e2e/14-qa-parity.spec.ts`
- **Phase gate (before /gsd:verify-work):** Full Playwright suite green + Human UAT pixel-fidelity pass

### Wave 0 Gaps

- [ ] Reduced-motion Playwright test — `e2e/20-study-reduced-motion.spec.ts` — assert confetti container absent when `prefers-reduced-motion: reduce`; assert `img[src*="widget-l"]` and stats still visible
- [ ] Update `e2e/06-study-session.spec.ts` assertion `"Great work"` if end-screen copy is unchanged (currently `getByText(/Great work/)` — should still pass; verify after implementation)
- [ ] Verify `e2e/study-progression.spec.ts` still green after reskin (no behavior change expected, but visual assertions may need updating if any hard-coded text selectors reference the 🐯 emoji)

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Study page auth check in RSC is preserved unchanged |
| V3 Session Management | No | No new session handling; existing RSC pattern untouched |
| V4 Access Control | No | Deck ownership check (SEC-02) in study/page.tsx preserved unchanged |
| V5 Input Validation | No | No new user input; study is swipe/keyboard only |
| V6 Cryptography | No | No crypto; commitId is a client-generated UUID (existing pattern) |

Phase 20 introduces no new attack surface. The only new external resource is `public/habitat/widget-l{N}.webp` — these are static assets served from the same origin, not user-supplied URLs.

---

## Sources

### Primary (HIGH confidence)

- `src/components/study-card.tsx` — full source; swipe overlay implementation, flip mechanics, QaStateBadge mount
- `src/components/card-stack.tsx` — full source; count-aware layer geometry
- `src/components/study-session.tsx` — full source; reducer, commit, all render phases
- `src/components/level-up-overlay.tsx` — full source; current confetti colors, structure
- `src/app/(protected)/study/page.tsx` — full source; RSC entry, assembleSession, readQaAuth
- `src/components/daybreak/auth-card.tsx` — GhostPeek atom, AuthCard surface tokens
- `src/components/daybreak/card.tsx` — Daybreak card surface
- `src/components/daybreak/lion-face.tsx` — LionFace component props/API
- `src/components/daybreak/t-btn.tsx` — TBtn props/API
- `src/components/daybreak/pill.tsx` — Pill component
- `design/handoff-daybreak/hifi-shared.jsx` — HiFiStudy() design spec (full study screen)
- `design/handoff-daybreak/hifi-daybreak.jsx` — d1 theme object (all exact token values)
- `design/handoff-daybreak/README.md` — Daybreak design system documentation
- `.planning/phases/20-study-screen/20-CONTEXT.md` — locked decisions D-01..D-06
- `.planning/REQUIREMENTS.md` — STU-01, STU-02 acceptance criteria
- `public/habitat/` directory listing — confirmed widget-l1…l9.webp + hero-l1…l9.webp + clips/ present
- `e2e/06-study-session.spec.ts` — existing study e2e coverage
- `e2e/14-qa-parity.spec.ts` — QA badge parity test
- `.planning/phases/19-daybreak-foundation-onboarding-auth/19-RESEARCH.md` — Phase 19 patterns (usePrefersReducedMotion extraction)
- `.planning/phases/19-daybreak-foundation-onboarding-auth/19-PATTERNS.md` — Phase 19 file-level patterns

### Secondary (MEDIUM confidence)

- `.planning/design/UI-REDESIGN-BRIEF-login-study.md` — study flow/states/copy contract (predates Daybreak; visual tokens superseded)
- `.planning/design/habitat-art-assets.md` — confirms Soft-Clay art is Three.js/POC code (not a source for Phase 20); confirms `public/habitat/` static stills are the correct asset source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified installed; no new packages
- Architecture: HIGH — grounded in actual file reads of all 5 components and all Daybreak primitives
- Swipe color swap: HIGH — exact line numbers and rgba values from source
- Soft-Clay Leo asset: MEDIUM-HIGH — file listing confirms existence; visual content assumed suitable (A1)
- HiFiStudy design spec: HIGH — read directly from hifi-shared.jsx
- Pitfalls: HIGH — each grounded in actual code observations

**Research date:** 2026-06-20
**Valid until:** 2026-09-20 (stable libraries, pinned versions; 90 days)
