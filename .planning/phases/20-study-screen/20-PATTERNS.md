# Phase 20: Study Screen - Pattern Map

**Mapped:** 2026-06-20
**Files analyzed:** 5 files (4 modified + 1 read-only)
**Analogs found:** 4 / 4 modifiable files (all have strong codebase analogs; read-only file confirmed unchanged)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/study-card.tsx` | component/client | event-driven (flip + swipe + keyboard) | `src/components/daybreak/auth-card.tsx` (card surface + GhostPeek inline styles) | exact (surface) + role-match (interaction) |
| `src/components/card-stack.tsx` | component/client | transform (count-aware visual) | `src/components/daybreak/auth-card.tsx` `GhostPeek` atom | role-match (adapt in place; geometry preserved) |
| `src/components/study-session.tsx` | component/controller | event-driven (reducer + async commit) | `src/components/daybreak/lion-face.tsx`, `src/components/daybreak/t-btn.tsx` | exact (primitives imported); PRESERVE zone documented below |
| `src/components/level-up-overlay.tsx` | component/client | event-driven (animation + dismiss) | `src/components/daybreak/auth-card.tsx` (inline-style pattern); `src/hooks/use-prefers-reduced-motion.ts` (reduced-motion gate) | exact |
| `src/app/(protected)/study/page.tsx` | page/RSC | request-response (auth + assembly) | itself | **READ-ONLY — no changes** |

---

## PRESERVE / Do-Not-Touch Zone

The following regions are **frozen for Phase 20**. The executor must treat them as read-only. Any test failure in `e2e/06-study-session.spec.ts`, `e2e/study-progression.spec.ts`, or `e2e/14-qa-parity.spec.ts` is a signal that the PRESERVE zone was accidentally modified.

| Item | File | Lines | Why frozen |
|------|------|-------|------------|
| All type declarations + reducer (`reducer` fn) | `study-session.tsx` | 14–154 | Full session state machine — FLIP_CARD, ENABLE_SWIPE, SWIPE_GRADE, requeue, COMMIT_DONE, COMMIT_ERROR, RETRY_COMMIT |
| `computeStats` function | `study-session.tsx` | 160–175 | Stat calculation feeding end screen; must not drift |
| Props interface `StudySessionProps` | `study-session.tsx` | 181–185 | Consumed by `study/page.tsx`; signature must not change |
| `showLevelUp` state + `handleLevelUpDismiss` (incl. dead `=== 10` branch) | `study-session.tsx` | 198–219 | Dead branch noted in deferred — preserve as-is this phase |
| 300ms swipe-enable `useEffect` | `study-session.tsx` | 225–232 | UX guard; behavioral, not visual |
| `commitIdRef` + lazy-init | `study-session.tsx` | 238–241 | Idempotency key (WR-04) |
| `gradedRef` + phase-guard | `study-session.tsx` | 244–248 | Stale-closure avoidance for commit effect |
| `commit()` async effect | `study-session.tsx` | 250–294 | `POST /api/study/complete` — untouched |
| `handleKeyDown` | `study-card.tsx` | 57–70 | Enter/Space flip, Arrow grade — behavioral |
| `handleDragEnd` threshold | `study-card.tsx` | 72–81 | velocity > 500 \|\| offset > 80 threshold |
| 3D flip CSS (`transformStyle: preserve-3d`, `backfaceVisibility`, `rotateY` animate) | `study-card.tsx` | 115–177 | 3D flip mechanic — keep exactly, only wrap/style classes change |
| `QaStateBadge` mount + `qaCardData` build | `study-card.tsx` | 27–37, 111 | `{qaCardData && <QaStateBadge ... />}` — renders only when QA-authed |
| `src/lib/study-engine.ts` | (untouched) | — | SRS logic |
| `src/lib/study-queries.ts` | (untouched) | — | DB queries |
| `POST /api/study/complete` | (untouched) | — | Idempotent grade commit |
| `src/app/(protected)/study/page.tsx` | (read-only) | 1–67 | Auth, SEC-02 ownership check, `assembleSession`, `readQaAuth` — entire file |

**Safe edit zone in `study-session.tsx`:** Lines 299–483 only — the four `if (state.phase === ...)` render blocks and their return JSX. The boundary is immediately before `// Render: committing` (line 297).

---

## Pattern Assignments

### `src/components/study-card.tsx` (component, event-driven)

**Analogs:**
- `src/components/daybreak/auth-card.tsx` — card surface inline-style tokens (lines 184–208)
- `src/components/daybreak/card.tsx` — same surface tokens as standalone component
- `src/components/daybreak/auth-card.tsx` `GhostPeek` atom — border-radius + border color reference

**What changes (presentation only):**

**1. Swipe overlay colors (lines 40–49) — D-02**

Current code to REPLACE:
```tsx
// study-card.tsx lines 40–49 — REPLACE these rgba values only
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

Replace with Daybreak palette (D-02: green `#3E9B5F` / red `#DE5F4A`):
```tsx
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

**2. Swipe overlay border-radius (lines 101–108) — Pitfall 6**

Current overlay divs use `rounded-xl` (12px). Change to `rounded-[22px]` to match Daybreak card radius:
```tsx
// lines 101–108: change className on both overlay divs
<motion.div
  className="absolute inset-0 rounded-[22px] pointer-events-none z-10"
  style={{ backgroundColor: bgColorRight }}
/>
<motion.div
  className="absolute inset-0 rounded-[22px] pointer-events-none z-10"
  style={{ backgroundColor: bgColorLeft }}
/>
```

**3. Card face surfaces (lines 129–168) — D-02**

Replace `className="absolute inset-0 bg-card border border-border rounded-xl ..."` on both face `motion.div` elements with inline Daybreak surface styles. Pattern sourced from `auth-card.tsx` lines 184–194 (the inner card div):

```tsx
// Front face — replace the className surface tokens with:
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
```

```tsx
// Back face — same surface, same backfaceVisibility trick:
<motion.div
  className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 py-6 select-none"
  style={{
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    rotateY: -180,
    borderRadius: 22,
    background: "#FFFFFF",
    border: "1px solid #F0E3CF",
    boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
  }}
  animate={{ rotateY: flipped ? 0 : -180 }}
  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
>
```

**4. Front face content restyle — D-02 HiFiStudy spec**

Per `hifi-shared.jsx` HiFiStudy():
- Prompt label: all-caps, 12.5px, 700 weight, letter-spacing 2.2, muted color
- Word: `font-display` (Baloo 2), 42px, 700 weight, ink color
- "Tap to reveal" pill: amber pill at bottom-22px with `#B4762A` text / `#FFF1DC` bg

```tsx
// Replace lines 138–146 front face content:
<p className="text-[12.5px] font-bold tracking-[2.2px] text-muted-foreground text-center uppercase">
  {frontPrompt}
</p>
<p className="font-display text-[42px] font-bold text-foreground text-center leading-[1.15]">
  {frontText}
</p>
{!flipped && (
  <span
    className="absolute bottom-[22px] text-[13px] font-semibold rounded-full px-4 py-2"
    style={{ color: "#B4762A", background: "#FFF1DC" }}
  >
    Tap to reveal
  </span>
)}
```

**5. Back face content + arrow cues — D-02 HiFiStudy spec**

```tsx
// Replace lines 160–167 back face content:
<p className="font-display text-[42px] font-bold text-foreground text-center leading-[1.15]">
  {backText}
</p>
{swipeReady && (
  <p className="text-[13px] font-semibold text-center" style={{ color: "#9C8467" }}>
    <span style={{ color: "#DE5F4A" }}>←</span>
    {" "}still learning · got it{" "}
    <span style={{ color: "#3E9B5F" }}>→</span>
  </p>
)}
```

**6. QaStateBadge breathing room — Pitfall 5**

No change to the mount condition (`{qaCardData && <QaStateBadge data={qaCardData} />}` at line 111). Verify the badge's own absolute positioning (`top`/`right`) leaves at least 8px inset from the Daybreak 22px corner — the badge component controls its own position so only overflow-hidden clips need checking. The outer `motion.div` wrapper has no `overflow-hidden`, so this is safe.

**Imports to add:**
```tsx
// No new imports needed — motion/react already imported at line 3
```

---

### `src/components/card-stack.tsx` (component, transform)

**Analog:** `src/components/daybreak/auth-card.tsx` `GhostPeek` atom (lines 39–67) — extract its border/bg/radius tokens; `src/components/daybreak/card.tsx` — same surface tokens.

**HiFiStudy spec:** Study-screen GhostPeek uses `widthPct="68%"` at opacity 0.45 and `widthPct="82%"` at opacity 0.8 — **different from auth-card's 62%/76%** (Pitfall 2). The study stack renders full-height ghost cards shifted DOWN (not top-edge strips), so the widthPct values from the spec apply as conceptual sizing reference but the geometry stays `translateY`/`scale`/`opacity` as-is.

**What changes: replace only the className on the layer divs (line 20)**

Current (line 20):
```tsx
className="absolute inset-0 rounded-xl bg-card border border-border"
```

Replace with inline Daybreak card surface tokens (no className, just style prop addition):
```tsx
// biome-ignore lint/suspicious/noArrayIndexKey: static positional layers, never reordered
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
```

Full component after reskin (lines 1–30 — small file, full replacement safe):
```tsx
"use client";

interface CardStackProps {
  remainingCount: number;
}

export function CardStack({ remainingCount }: CardStackProps) {
  const visibleLayers = Math.min(3, remainingCount);

  if (visibleLayers === 0) return null;

  const opacities = [0.6, 0.35, 0.15];

  return (
    <>
      {Array.from({ length: visibleLayers }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static positional layers, never reordered
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

**Token sources:** `auth-card.tsx` lines 184–194 (background, border, borderRadius); `card.tsx` lines 14–20 (same tokens confirmed).

---

### `src/components/study-session.tsx` (component/controller, event-driven)

**PRESERVE zone: lines 1–294 (all logic, types, reducer, effects). Touch ONLY lines 297–483.**

**Analogs for the four render blocks:**
- `src/components/daybreak/lion-face.tsx` — `LionFace` component (end screen, replaces 🐯)
- `src/components/daybreak/t-btn.tsx` — `TBtn` component (end screen + error screen, replaces `Button`)
- `src/components/daybreak/auth-card.tsx` `GhostPeek` inline-style pattern — top bar X-button circle style

**Imports to ADD (after line 9 `import { Button } from "@/components/ui/button"`)**:
```tsx
import { LionFace } from "@/components/daybreak/lion-face";
import { TBtn } from "@/components/daybreak/t-btn";
```

**Imports to REMOVE:** `import { Button } from "@/components/ui/button"` (line 9) — replaced by `TBtn` in both error and end render blocks. Verify the quit-confirm popover buttons (studying render) also migrate to avoid the shadcn Button mismatch (Pitfall 7).

**Render: committing block (lines 300–306) — Claude's Discretion**

Current:
```tsx
<div className="min-h-screen bg-background flex items-center justify-center">
  <p className="text-sm text-muted-foreground">Saving your progress...</p>
</div>
```

Daybreak restyle (light Leo touch optional):
```tsx
<div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
  <LionFace size={48} />
  <p className="text-sm text-muted-foreground">Saving your progress…</p>
</div>
```

**Render: error block (lines 312–324) — Pitfall 7**

Replace `<Button variant="default" ...>` with `<TBtn>`:
```tsx
if (state.phase === "error") {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4 sm:px-8">
      <LionFace size={56} />
      <p className="text-base text-center text-foreground">{state.message}</p>
      <TBtn
        style={{ maxWidth: 280 }}
        onClick={() => dispatch({ type: "RETRY_COMMIT" })}
      >
        Retry saving session
      </TBtn>
    </div>
  );
}
```

**Render: end block (lines 330–388) — D-04**

Full replacement of the end block render. Pattern sourced from `lion-face.tsx` (LionFace props API), `t-btn.tsx` (TBtn API), `hifi-shared.jsx` HiFiStudy() (Baloo 2 numerals spec):

```tsx
if (state.phase === "end") {
  const { cardsStudied, correctCount, newlyLearned } = state.stats;
  const correctPct =
    cardsStudied > 0 ? Math.round((correctCount / cardsStudied) * 100) : 0;

  return (
    <>
      <AnimatePresence>
        {showLevelUp !== null && (
          <LevelUpOverlay
            level={showLevelUp}
            onDismiss={handleLevelUpDismiss}
          />
        )}
      </AnimatePresence>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-6 sm:gap-8 px-4 sm:px-8 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* LionFace replaces 🐯 emoji (D-04) */}
          <LionFace size={80} />
          <h1 className="font-display text-[20px] font-bold text-foreground">
            Great work, keep it up!
          </h1>
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-[32px] font-bold text-foreground">
                {cardsStudied}
              </span>
              <span className="text-sm text-muted-foreground">studied</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-[32px] font-bold text-foreground">
                {correctPct}%
              </span>
              <span className="text-sm text-muted-foreground">correct</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {/* "learned" numeral stays amber (text-primary) — D-04 */}
              <span className="font-display text-[32px] font-bold text-primary">
                {newlyLearned}
              </span>
              <span className="text-sm text-muted-foreground">learned</span>
            </div>
          </div>
          {/* TBtn replaces shadcn Button (Pitfall 7) */}
          <TBtn
            style={{ maxWidth: 280 }}
            onClick={() => router.push(`/dashboard?deck=${deckId}`)}
          >
            Back to deck
          </TBtn>
        </motion.div>
      </div>
    </>
  );
}
```

**Render: studying block — top bar (lines 413–449) — Claude's Discretion**

Pattern sourced from `hifi-shared.jsx` HiFiStudy() top bar spec (verified: X-circle 40×40, `#EDDFC9` border, `#4A331C` ink, centered "Study session" label, 40px spacer right). The quit-confirm popover moves to Daybreak card surface (using `daybreak/card.tsx` or inline surface tokens):

```tsx
{/* Top bar — Daybreak chrome */}
<div
  className="flex items-center justify-between flex-none"
  style={{ padding: "4px 22px 0" }}
>
  <button
    aria-label="Quit study session"
    onClick={() => dispatch({ type: "TOGGLE_QUIT_CONFIRM" })}
    style={{
      width: 40,
      height: 40,
      borderRadius: 999,
      border: "1.5px solid #EDDFC9",
      background: "#FFFFFF",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#4A331C",
      fontSize: 15,
      cursor: "pointer",
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

{/* Quit-confirm popover — Daybreak card surface */}
{showQuitConfirm && (
  <div
    className="mx-4 sm:mx-6"
    style={{
      borderRadius: 18,
      background: "#FFFFFF",
      border: "1px solid #F0E3CF",
      boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}
  >
    <p className="text-sm text-foreground">
      Quit session? Your progress so far will be saved.
    </p>
    <div className="flex gap-2 justify-end">
      <button
        className="h-9 px-4 text-sm font-semibold rounded-[10px] border text-foreground"
        style={{ borderColor: "#EDDFC9", background: "#FFFFFF" }}
        onClick={() => dispatch({ type: "TOGGLE_QUIT_CONFIRM" })}
      >
        Keep studying
      </button>
      <TBtn
        style={{ width: "auto", height: 36, padding: "0 16px", fontSize: 14, borderRadius: 10 }}
        onClick={() => dispatch({ type: "QUIT_SESSION" })}
      >
        Save and quit
      </TBtn>
    </div>
  </div>
)}
```

**Hint line below card (line 475–479) — D-02 HiFiStudy spec**

Current:
```tsx
{showSwipeHint && (
  <p className="text-sm text-muted-foreground text-center">
    Swipe right if correct, left if still learning
  </p>
)}
```

Daybreak hint pill (sourced from `hifi-shared.jsx` HiFiStudy() hint spec: `#9C8467` text, `#FFFFFF` bg, `1.5px solid #F0E3CF` border, `9px 18px` padding, `999` radius):
```tsx
{showSwipeHint && (
  <div
    className="text-[13.5px] font-semibold"
    style={{
      color: "#9C8467",
      background: "#FFFFFF",
      border: "1.5px solid #F0E3CF",
      padding: "9px 18px",
      borderRadius: 999,
    }}
  >
    Swipe{" "}
    <span style={{ color: "#3E9B5F" }}>→</span>
    {" "}if you got it ·{" "}
    <span style={{ color: "#DE5F4A" }}>←</span>
    {" "}still learning
  </div>
)}
```

---

### `src/components/level-up-overlay.tsx` (component/client, event-driven)

**Analogs:**
- `src/hooks/use-prefers-reduced-motion.ts` — exact hook to import (verified at lines 1–25; SSR-safe, `"use client"`)
- `src/components/daybreak/auth-card.tsx` — inline-style pattern (cream bg: `rgba(255,246,233,0.92)`)
- `public/habitat/widget-l{1–9}.webp` — Soft-Clay Leo asset (D-05); confirmed present for all 9 levels

**What changes:**

**1. Import the reduced-motion hook (D-06)**

Add import after `import { motion } from "motion/react"`:
```tsx
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
```

**2. Recolor confetti (line 9)**

Current:
```tsx
const CONFETTI_COLORS = ["#F97316", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
```

Replace with Daybreak palette:
```tsx
const CONFETTI_COLORS = ["#F28A1F", "#3E9B5F", "#DE5F4A", "#F2B33A", "#4A331C"];
```

**3. Add `usePrefersReducedMotion` call and gate confetti (D-06)**

Inside the component, before the return:
```tsx
export function LevelUpOverlay({ level, onDismiss }: LevelUpOverlayProps) {
  const reduced = usePrefersReducedMotion();
  const assetLevel = Math.min(level, 9); // L9 cap — widget-l10.webp does not exist (Pitfall 4)
```

Gate the confetti `<div>` with `{!reduced && ...}`:
```tsx
{/* Confetti — only when motion is allowed (D-06) */}
{!reduced && (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
      <motion.div
        // biome-ignore lint/suspicious/noArrayIndexKey: confetti items are positional visual decorations, never reordered
        key={index}
        className="absolute top-0 w-2 h-3 rounded-sm pointer-events-none"
        style={{
          left: `${5 + (index / CONFETTI_COUNT) * 90}vw`,
          backgroundColor: CONFETTI_COLORS[index % 5],
        }}
        initial={{ y: "-10vh", opacity: 1, rotate: 0 }}
        animate={{
          y: "110vh",
          opacity: 0,
          rotate: 360 * (CONFETTI_ROTATE_DIRS[index] ?? 1),
        }}
        transition={{
          duration: 2.5,
          delay: (index % 8) * 0.07,
          ease: "easeIn",
        }}
      />
    ))}
  </div>
)}
```

**4. Add Soft-Clay Leo asset (D-05)**

Inside the content div (after the confetti gate, always renders):
```tsx
{/* Content — always shows (static Leo + stats even in reduced-motion) */}
<div className="relative flex flex-col items-center gap-4 text-center px-6">
  {/* Soft-Clay Leo (D-05) */}
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
    {level >= 9
      ? "A bird arrived in your habitat!"
      : "Your habitat grew!"}
  </p>
  <p className="text-sm text-muted-foreground mt-6">Tap anywhere to continue</p>
</div>
```

Note: `level >= 9` is used instead of `level === 10` (the dead branch from the current code). This is the minimal copy fix that makes the max-level message display correctly at L9 without touching the reducer or commit logic — it is incidental to the reskin and is the correct condition given the L9 habitat cap.

> ⚠ SCOPE-FENCE OVERRIDE (Phase 20): The `level >= 9` change above (and in Pitfall P4) is **DECLINED** for Phase 20 per 20-CONTEXT Deferred. Phase 20 is presentation-only — preserve `level === 10` **verbatim**; do not implement this `level >= 9` example. The dead-branch fix is a separate non-Daybreak logic ticket.

**5. Overlay background color**

Current: `className="fixed inset-0 z-50 ... bg-background/90 backdrop-blur-sm"`

Replace with Daybreak cream (matches Daybreak `--background: #fff6e9` at 92% opacity):
```tsx
className="fixed inset-0 z-50 flex flex-col items-center justify-center"
style={{ background: "rgba(255, 246, 233, 0.92)" }}
```

Remove `backdrop-blur-sm` — not part of the Daybreak spec; cream overlay is sufficient.

---

### `src/app/(protected)/study/page.tsx` (page/RSC, request-response)

**READ-ONLY. No changes.** Verified full file (lines 1–67): auth check, SEC-02 deck-ownership query, `assembleSession`, `readQaAuth`, and `<StudySession initialCards qaMode deckId />` mount. All preserved byte-for-byte.

---

## Shared Patterns

### Daybreak Card Surface
**Source:** `src/components/daybreak/auth-card.tsx` lines 184–194 (inner card div) + `src/components/daybreak/card.tsx` lines 14–20 (confirmed identical)
**Apply to:** `study-card.tsx` face divs, `card-stack.tsx` layer divs, quit-confirm popover

```tsx
// Inline style — use on any surface that must match the Daybreak card
style={{
  borderRadius: 22,
  background: "#FFFFFF",
  border: "1px solid #F0E3CF",
  boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
  boxSizing: "border-box",
}}
```

### Daybreak Primary Button (TBtn)
**Source:** `src/components/daybreak/t-btn.tsx` lines 8–33
**Apply to:** `study-session.tsx` end screen "Back to deck", error screen "Retry saving session", quit-confirm "Save and quit"

```tsx
import { TBtn } from "@/components/daybreak/t-btn";
// Usage — width override for non-full-width contexts:
<TBtn style={{ maxWidth: 280 }} onClick={handler}>Label</TBtn>
// Usage — small variant in popover:
<TBtn style={{ width: "auto", height: 36, padding: "0 16px", fontSize: 14, borderRadius: 10 }} onClick={handler}>
  Label
</TBtn>
```

### LionFace Mark
**Source:** `src/components/daybreak/lion-face.tsx` lines 17–115
**Apply to:** `study-session.tsx` end screen (size 80), committing state (size 48, optional), error state (size 56, optional)

```tsx
import { LionFace } from "@/components/daybreak/lion-face";
// Default colors are correct for study context (same as auth-card usage):
<LionFace size={80} />
// No override needed — default mane="#E8973B" face="#FFD9A6" muzzle="#FFF1DC" ink="#4A331C"
```

### Reduced-Motion Gate
**Source:** `src/hooks/use-prefers-reduced-motion.ts` lines 9–25 (verified — hook exists, `"use client"`, SSR-safe)
**Apply to:** `level-up-overlay.tsx` confetti only (D-06)

```tsx
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
// Inside component:
const reduced = usePrefersReducedMotion();
// Gate confetti (NOT the static Leo or stats):
{!reduced && <div>...confetti...</div>}
```

### Daybreak Display Type (Baloo 2)
**Source:** `src/app/globals.css` — `font-display` class maps to `var(--font-display)` (Baloo 2)
**Apply to:** `study-session.tsx` end screen headline + stat numerals; `level-up-overlay.tsx` level numeral; `study-card.tsx` front/back word text

```tsx
// Baloo 2 display numeral (stats):
className="font-display text-[32px] font-bold text-foreground"
// Baloo 2 large word (card face):
className="font-display text-[42px] font-bold text-foreground text-center leading-[1.15]"
// Baloo 2 level number (overlay):
className="font-display text-[62px] font-bold text-primary leading-none"
```

### motion/react Import Pattern
**Source:** `src/components/study-session.tsx` line 3, `src/components/level-up-overlay.tsx` line 3
**Apply to:** All animated components in this phase (all are already `"use client"` and already import from `motion/react`)

```tsx
import { AnimatePresence, motion } from "motion/react";
// or subset:
import { motion } from "motion/react";
```

---

## No Analog Found

All files to be modified have strong codebase analogs. No file is greenfield.

| File | Reason for "partial" |
|------|----------------------|
| `src/components/study-card.tsx` front face layout | No existing Daybreak flashcard face with the all-caps prompt + 42px Baloo 2 word + "Tap to reveal" pill; sourced from `hifi-shared.jsx` HiFiStudy() spec directly |

---

## Key Pitfalls to Reference in Planning

| # | Pitfall | Guard |
|---|---------|-------|
| P1 | Touching reducer or commit logic when editing `study-session.tsx` | Edit only lines 297–483; treat lines 1–294 as read-only |
| P2 | GhostPeek widths: auth uses 62%/76%, study spec uses 68%/82% | `card-stack.tsx` adapts in-place (geometry unchanged); `widthPct` values are documented for reference but the translateY/scale geometry handles sizing |
| P3 | `usePrefersReducedMotion` SSR hydration | Already `"use client"` confirmed; import normally — no dynamic import needed |
| P4 | L9 cap — `widget-l10.webp` does not exist | Always `Math.min(level, 9)` for asset src; use `level >= 9` for max-level copy |
| P5 | QaStateBadge corner breathing at radius 22 | No overflow-hidden on outer wrapper; badge self-positions — no change needed, just verify visually |
| P6 | Swipe overlay border-radius mismatch at card corners | Change `rounded-xl` → `rounded-[22px]` on both overlay divs |
| P7 | `<Button>` vs `<TBtn>` visual mismatch | Replace ALL `<Button variant="default">` usages in the four render blocks with `<TBtn>`; the quit-confirm secondary button becomes a plain styled `<button>` |

---

## Metadata

**Analog search scope:** `src/components/`, `src/components/daybreak/`, `src/hooks/`, `src/app/(protected)/study/`, `design/handoff-daybreak/`
**Files read:** 11 source files (5 target + 6 analogs)
**Pattern extraction date:** 2026-06-20
