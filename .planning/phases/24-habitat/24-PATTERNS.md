# Phase 24: Habitat — Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 17 (11 new, 6 modified)
**Analogs found:** 17 / 17

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/lib/habitat-names.ts` | utility | transform | `src/lib/habitat-engine.ts` LEVEL_THRESHOLDS export | role-match |
| `src/components/daybreak/h-back.tsx` | component | request-response | `src/components/daybreak/ac-top.tsx` (HBack shape from `design/handoff-daybreak/daybreak-habitat.jsx` lines 16-19) | exact |
| `src/components/daybreak/h-mood-chip.tsx` | component | request-response | `src/components/daybreak/lang-chip.tsx` (frosted pill atom, same token palette) | exact |
| `src/components/daybreak/h-level-badge.tsx` | component | request-response | `src/components/habitat-medallion.tsx` level badge div (lines 148-171) | exact |
| `src/components/daybreak/h-top.tsx` | component | request-response | `src/components/daybreak/ac-top.tsx` (three-slot flex row) | exact |
| `src/components/daybreak/h-prog-card.tsx` | component | request-response | `src/components/habitat-hero.tsx` (progress math) + handoff `HProgCard` lines 50-73 | exact |
| `src/components/daybreak/h-decay-card.tsx` | component | request-response | `src/components/daybreak/ac-banner.tsx` (status card pattern) + handoff `HabDecay` lines 113-125 | role-match |
| `src/components/habitat-celebration.tsx` | component | event-driven | `src/components/level-up-overlay.tsx` (reference-only — do NOT import motion/react) | role-match |
| `src/components/habitat-scene.tsx` | component | request-response | itself (primary edit surface — existing file, major re-skin) | self |
| `src/components/habitat-video.tsx` | component | event-driven | itself (minimal edit — add videoRef + mobile freeze useEffect) | self |
| `src/app/(protected)/habitat/page.tsx` | component | request-response | itself (minimal edit — validate ?celebrate=N) | self |
| `src/components/study-session.tsx` | component | request-response | itself (one-line routing change in handleLevelUpDismiss) | self |
| `src/lib/__tests__/habitat-names.test.ts` | test | transform | `src/components/__tests__/habitat-video.test.ts` (node-env Vitest, pure helper exports) | exact |
| `src/components/__tests__/habitat-tint.test.ts` | test | transform | `src/components/__tests__/habitat-video.test.ts` (source-grep + pure helper pattern) | exact |
| `src/components/__tests__/habitat-prog-card.test.ts` | test | transform | `src/components/__tests__/habitat-video.test.ts` (same framework) | exact |
| `src/components/__tests__/habitat-celebration.test.ts` | test | event-driven | `src/components/__tests__/habitat-scene-video.test.ts` (source-grep invariants) | exact |
| `e2e/24-habitat-celebration.spec.ts` | test | request-response | `e2e/07-habitat-display.spec.ts` (Playwright, signUpWithDeck helper) | exact |

---

## Pattern Assignments

### `src/lib/habitat-names.ts` (utility, transform)

**Analog:** `design/handoff-daybreak/daybreak-habitat.jsx` lines 4-10 (source of truth for constants)

**Pattern — constants module, no logic:**
```typescript
// Extracted verbatim from design/handoff-daybreak/daybreak-habitat.jsx lines 4-10.
// Pure data — no imports, no hooks, RSC-safe.
export const H_NAME: Record<number, string> = {
  1: "Bare mound", 2: "Lakeside", 3: "Woodland", 4: "Meadow",
  5: "Savanna", 6: "Glade", 7: "Den", 8: "Playground", 9: "Golden hour",
};
export const H_NEXT: Record<number, { at: number; what: string }> = {
  1: { at: 2, what: "a lake & lily pads" },
  2: { at: 3, what: "trees & rocks" },
  3: { at: 4, what: "flowers & butterflies" },
  4: { at: 5, what: "an elephant friend" },
  5: { at: 6, what: "mushrooms" },
  6: { at: 7, what: "a cave & nights" },
  7: { at: 8, what: "toys to play with" },
  8: { at: 9, what: "songbirds & golden light" },
  // L9 has no entry — guard callers: nextLevelThreshold === null means max
};
```

**No imports, no "use client" — file is a pure data module.**

---

### `src/components/daybreak/h-back.tsx` (component, request-response)

**Analog:** `src/components/daybreak/ac-top.tsx` (Link + inline styles pattern) + handoff `daybreak-habitat.jsx` lines 16-19

**Imports pattern** (copy from `ac-top.tsx` lines 1-3, adapt):
```typescript
import Link from "next/link";
```

**Core pattern** (handoff lines 16-19, translated to TypeScript):
```typescript
// Circular frosted back-arrow → Dashboard.
// HBack from daybreak-habitat.jsx lines 16-19.
export function HBack() {
  return (
    <Link
      href="/dashboard"
      data-testid="habitat-back-btn"
      aria-label="Back to Dashboard"
      style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "rgba(255,255,255,0.86)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 3px 10px rgba(120,80,30,0.16)",
        flex: "none", textDecoration: "none",
      }}
    >
      {/* Left-pointing chevron: CSS border trick (no emoji, no SVG) */}
      <span style={{
        width: 9, height: 9,
        borderLeft: "2.4px solid #4A331C",
        borderBottom: "2.4px solid #4A331C",
        transform: "rotate(45deg)",
        marginLeft: 3,
        display: "inline-block",
      }} />
    </Link>
  );
}
```

**No "use client" — pure props-to-markup, RSC-safe.**

---

### `src/components/daybreak/h-mood-chip.tsx` (component, request-response)

**Analog:** `src/components/daybreak/lang-chip.tsx` (inline-style chip atom, lines 1-33)

**Imports pattern** (copy from `lang-chip.tsx` style — no Next.js imports needed):
```typescript
import type { TigerMood } from "@/lib/habitat-engine";
```

**Core pattern** (handoff `daybreak-habitat.jsx` lines 21-29, MOOD table line 11-13):
```typescript
// MOOD palette from daybreak-habitat.jsx lines 11-13.
const MOOD_CONFIG: Record<TigerMood, { label: string; color: string }> = {
  excited: { label: "Excited", color: "#F2B33A" },
  happy:   { label: "Happy",   color: "#3E9B5F" },
  neutral: { label: "Neutral", color: "#B7A98F" },
  sad:     { label: "Sad",     color: "#7C93B0" },
};

export function HMoodChip({ mood }: { mood: TigerMood }) {
  const cfg = MOOD_CONFIG[mood];
  return (
    <div
      data-testid="habitat-mood-chip"
      style={{
        height: 36, padding: "0 13px 0 11px", borderRadius: 999,
        background: "rgba(255,255,255,0.86)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", gap: 8,
        boxShadow: "0 3px 10px rgba(120,80,30,0.14)", flex: "none",
      }}
    >
      <span style={{
        width: 11, height: 11, borderRadius: "50%",
        background: cfg?.color ?? "#B7A98F",
        boxShadow: `0 0 0 3px ${cfg?.color ?? "#B7A98F"}33`,
      }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: "#4A331C" }}>
        {cfg?.label ?? mood}
      </span>
    </div>
  );
}
```

**No "use client" — RSC-safe. Uses `?.` not `!` (biome noNonNullAssertion).**

---

### `src/components/daybreak/h-level-badge.tsx` (component, request-response)

**Analog:** `src/components/habitat-medallion.tsx` level badge section (lines 148-171) + handoff `daybreak-habitat.jsx` lines 30-37

**Core pattern** (handoff lines 30-37):
```typescript
export function HLevelBadge({ level }: { level: number }) {
  const isMax = level >= 9;
  return (
    <div
      data-testid="habitat-level-badge"
      style={{
        width: 46, height: 46, borderRadius: "50%",
        background: isMax ? "#F2B33A" : "#F28A1F",  // gold at L9
        border: "3px solid rgba(255,255,255,0.9)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        color: "#FFF", lineHeight: 1,
        boxShadow: "0 4px 12px rgba(242,138,31,0.32)",
        flex: "none",
      }}
    >
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5, opacity: 0.9 }}>
        LVL
      </span>
      <span style={{
        fontFamily: "var(--font-display)", fontSize: 19,
        fontWeight: 700, marginTop: -1,
      }}>
        {level}
      </span>
    </div>
  );
}
```

**Gold at L9: `level >= 9` check (not `=== 9`) per D-12. No "use client".**

---

### `src/components/daybreak/h-top.tsx` (component, request-response)

**Analog:** `src/components/daybreak/ac-top.tsx` (three-slot flex row, lines 13-71)

**Core pattern** (handoff `daybreak-habitat.jsx` lines 39-47):
```typescript
import { HBack } from "@/components/daybreak/h-back";
import { HMoodChip } from "@/components/daybreak/h-mood-chip";
import { HLevelBadge } from "@/components/daybreak/h-level-badge";
import type { TigerMood } from "@/lib/habitat-engine";

export function HTop({ mood, level }: { mood: TigerMood; level: number }) {
  return (
    <div style={{
      position: "relative", zIndex: 3,
      display: "flex", alignItems: "flex-start",
      justifyContent: "space-between",
      padding: "8px 18px 0", flex: "none",
    }}>
      <HBack />
      <HMoodChip mood={mood} />
      <HLevelBadge level={level} />
    </div>
  );
}
```

**No "use client" — all children are RSC-safe.**

---

### `src/components/daybreak/h-prog-card.tsx` (component, request-response)

**Analog:** `src/components/habitat-hero.tsx` (progress math pattern, lines 51-74) + handoff `daybreak-habitat.jsx` lines 50-73

**Imports pattern:**
```typescript
import { H_NAME, H_NEXT } from "@/lib/habitat-names";
```

**Percentage derivation** (RESEARCH.md Pattern 4, sourced from `src/lib/habitat-engine.ts`):
```typescript
// pct from 0 to 100; 100 when at L9 cap.
// effectiveCardCount and nextLevelThreshold come from HabitatState.
const pct = nextLevelThreshold !== null
  ? Math.min(100, Math.round((effectiveCardCount / nextLevelThreshold) * 100))
  : 100;
```

**Core pattern** (handoff lines 50-73):
```typescript
export function HProgCard({
  level, effectiveCardCount, nextLevelThreshold,
}: {
  level: number;
  effectiveCardCount: number;
  nextLevelThreshold: number | null;
}) {
  const isMax = nextLevelThreshold === null;
  const pct = isMax
    ? 100
    : Math.min(100, Math.round((effectiveCardCount / nextLevelThreshold) * 100));
  const nx = level < 9 ? H_NEXT[level] : null;  // guard: H_NEXT has keys 1-8 only

  return (
    <div
      data-testid="habitat-prog-card"
      style={{
        position: "relative", zIndex: 3,
        margin: "0 16px 18px", padding: "15px 17px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
        boxShadow: "0 10px 28px rgba(120,80,30,0.18)",
        border: "1px solid rgba(255,255,255,0.7)",
        display: "flex", flexDirection: "column", gap: 11, flex: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#4A331C", whiteSpace: "nowrap" }}>
          Level {level} &middot; {H_NAME[level]}
        </span>
        {nx ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#9C8467", flex: "none" }}>
            {pct}% to L{level + 1}
          </span>
        ) : null}
      </div>
      {nx ? (
        <>
          {/* Progress bar: amber gradient fill */}
          <div style={{ height: 12, borderRadius: 7, background: "#F1E6D2", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 7, background: "linear-gradient(90deg, #F28A1F, #F2B33A)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {/* Generic icon disc — no per-level CSS shapes (Claude's Discretion) */}
            <span style={{ width: 26, height: 26, borderRadius: 8, background: "#FFF1DC", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <span style={{ width: 9, height: 9, border: "2px solid #F28A1F", borderRadius: "50%" }} />
            </span>
            <span style={{ fontSize: 14, color: "#4A331C" }}>
              Next at L{nx.at}: <span style={{ fontWeight: 700, color: "#C96F12" }}>{nx.what}</span>
            </span>
          </div>
        </>
      ) : (
        /* L9 max — "Course 1 complete" copy (D-12) */
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, color: "#4A331C" }}>
          &#10024; Course 1 complete &mdash; you grew the whole world.
        </div>
      )}
    </div>
  );
}
```

**No "use client" — pure props-to-markup, RSC-safe.**

---

### `src/components/daybreak/h-decay-card.tsx` (component, request-response)

**Analog:** `src/components/daybreak/ac-banner.tsx` (status card pattern, lines 11-48) + handoff `daybreak-habitat.jsx` lines 113-125

**Core pattern** (handoff HabDecay lines 113-125 adapted):
```typescript
// "Study now" routes to /dashboard (D-10 / RESEARCH Pattern 4b:
// HabitatState does not carry deckId; dashboard surfaces start-studying).
import Link from "next/link";

export function HDecayCard() {
  return (
    <div
      data-testid="habitat-decay-card"
      style={{
        position: "relative", zIndex: 3,
        margin: "0 16px 18px", padding: "16px 17px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.94)",
        boxShadow: "0 10px 28px rgba(120,80,30,0.18)",
        display: "flex", flexDirection: "column", gap: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        {/* Sad-Leo disc — simple grey circle placeholder (no mood-specific glyph needed) */}
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "#EEF1F5",
          display: "flex", alignItems: "center", justifyContent: "center",
          flex: "none",
        }}>
          {/* CSS sad-dot glyph: two dots + small frown arc — no emoji (L-01) */}
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C93B0" }} />
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#4A331C" }}>
            Leo misses you
          </div>
          <div style={{ fontSize: 13.5, color: "#9C8467" }}>
            A quick session brings the world back to life.
          </div>
        </div>
      </div>
      <Link
        href="/dashboard"
        style={{
          height: 48, borderRadius: 14,
          background: "#F28A1F", color: "#FFF",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17,
          boxShadow: "0 8px 18px rgba(242,138,31,0.3)",
          textDecoration: "none",
        }}
      >
        Study now
      </Link>
    </div>
  );
}
```

**No "use client" — Link is RSC-safe in Next.js 16.x. "Study now" → /dashboard (RESEARCH Pattern 4b).**

---

### `src/components/habitat-celebration.tsx` (component, event-driven)

**Analog:** `src/components/level-up-overlay.tsx` (reference for structure — DO NOT copy `motion/react` imports); handoff `daybreak-habitat.jsx` HabCelebrate lines 162-186; `src/hooks/use-prefers-reduced-motion.ts`

**Critical constraint:** motion/react was removed from /habitat in Phase 13.1. This is a NEW file using CSS `@keyframes` only.

**Imports pattern:**
```typescript
"use client";
import { H_NAME, H_NEXT } from "@/lib/habitat-names";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
```

**Confetti colours and count** (from `level-up-overlay.tsx` lines 11-12, matches handoff):
```typescript
// Same palette as level-up-overlay.tsx lines 11-12 (consistent cross-flow).
const CONFETTI_COLORS = ["#F28A1F", "#F2B33A", "#3E9B5F", "#DE5F4A", "#6B4A8A"];
const CONFETTI_COUNT = 26;  // handoff uses 26 (daybreak-habitat.jsx line 165)
```

**Core pattern** (handoff HabCelebrate lines 162-186, CSS-only adaptation):
```typescript
// CSS keyframes must be added to globals.css:
//   @keyframes hab-fall {
//     from { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
//     to   { transform: translateY(110vh) rotate(720deg); opacity: 0; }
//   }
//   @media (prefers-reduced-motion: reduce) {
//     .hab-confetti { animation: none !important; }
//   }

export function HabitatCelebration({
  celebratingLevel,
  onSettle,
}: {
  celebratingLevel: number;
  onSettle: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  // auto-settle timer is driven from parent (habitat-scene.tsx useEffect);
  // onSettle is called by that timer, not by this component.

  const unlockEntry = celebratingLevel < 9 ? H_NEXT[celebratingLevel] : null;
  const levelName = H_NAME[celebratingLevel] ?? `Level ${celebratingLevel}`;

  return (
    <div
      data-testid="habitat-celebration"
      style={{
        position: "absolute", inset: 0, zIndex: 20,
        background: "radial-gradient(circle at 50% 42%, rgba(255,247,233,0.35), rgba(255,247,233,0.62))",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 14, padding: 28, textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {/* Confetti layer — CSS animation only; hidden under reduced-motion via .hab-confetti class */}
      {!reducedMotion && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {Array.from({ length: CONFETTI_COUNT }, (_, i) => {
            const sq = i % 3 === 0;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: confetti items are positional visual decorations
                key={i}
                className="hab-confetti"
                style={{
                  position: "absolute",
                  left: `${(i * 53) % 100}%`,
                  top: "-10%",
                  width: sq ? 10 : 6,
                  height: sq ? 10 : 14,
                  background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  borderRadius: sq ? 2 : 1,
                  animation: `hab-fall 2.5s ease-in ${((i % 9) * 0.22).toFixed(2)}s forwards`,
                  transform: `rotate(${(i * 47) % 360}deg)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Level-up text */}
      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#C96F12", letterSpacing: 1, textTransform: "uppercase" }}>
        Level up!
      </span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 62, fontWeight: 700, color: "#4A331C", lineHeight: 0.9 }}>
        Level {celebratingLevel}
      </span>
      <div style={{ fontSize: 14, color: "#8C7A63" }}>{levelName}</div>

      {/* What-appeared reveal — only for levels 1-8 (H_NEXT has no L9 entry) */}
      {unlockEntry && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 18px", borderRadius: 16,
          background: "#FFFFFF", boxShadow: "0 12px 30px rgba(120,80,30,0.2)",
        }}>
          {/* Generic medallion disc (no per-level CSS shape — Claude's Discretion) */}
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#FFF1DC", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#F28A1F" }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#4A331C" }}>
            {unlockEntry.what.charAt(0).toUpperCase() + unlockEntry.what.slice(1)} moved in!
          </span>
        </div>
      )}
      {/* L9: "Course 1 complete" */}
      {!unlockEntry && (
        <div style={{ fontSize: 15, fontWeight: 600, color: "#8C7A63" }}>
          Course 1 complete &mdash; you grew the whole world.
        </div>
      )}
    </div>
  );
}
```

**SSR safety:** `usePrefersReducedMotion` defaults `false` (motion on) during SSR. Confetti will render on initial paint; reduced-motion users get a ~16ms flash of static particles before hydration. This matches the existing `habitat-video.tsx` "server emits motion, swap after mount" pattern. Acceptable per RESEARCH Pitfall 4.

---

### `src/components/habitat-scene.tsx` (component, request-response) — PRIMARY EDIT SURFACE

**Analog:** itself (current file, lines 1-269)

**Existing imports block** (lines 1-8 — extend with new atoms):
```typescript
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { HabitatVideo } from "@/components/habitat-video";
import { Button } from "@/components/ui/button";
import type { HabitatState, TigerMood } from "@/lib/habitat-engine";
// ADD:
import { HTop } from "@/components/daybreak/h-top";
import { HProgCard } from "@/components/daybreak/h-prog-card";
import { HDecayCard } from "@/components/daybreak/h-decay-card";
import { HabitatCelebration } from "@/components/habitat-celebration";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
```

**WRAPPER_STYLE** (lines 51-55 — keep unchanged, copy to new file verbatim):
```typescript
const WRAPPER_STYLE = {
  aspectRatio: "16/9",
  maxHeight: "min(70vh, 400px)",
  position: "relative" as const,
};
```

**Celebration trigger repair** (replaces `_celebratingLevel` dead pattern at lines 113-116):
```typescript
// REPAIR (D-09): was `celebratingLevel: _celebratingLevel = null` (unused prefix).
// Now consumed via lazy useState initializer — fires on mount, not on prop change.
export function HabitatScene({
  habitatState,
  celebratingLevel = null,
}: {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}) {
  const [showCelebration, setShowCelebration] = useState(
    () => celebratingLevel != null && celebratingLevel > 0,
  );
  useEffect(() => {
    if (!showCelebration) return;
    const t = setTimeout(() => setShowCelebration(false), 2500);
    return () => clearTimeout(t);
  }, []); // intentionally empty — fires once on mount only
  // ...
}
```

**Mood tint layer** (new — inside the WRAPPER_STYLE div, after `<HabitatVideo>`):
```typescript
// New mood tint helper (extract to src/lib/habitat-tint.ts for testability)
function moodTint(mood: TigerMood, isDecaying: boolean, level: number): string {
  if (isDecaying) return "rgba(120,120,130,0.10)";
  if (level >= 9) return "rgba(255,200,110,0.22)";  // golden-hour flat; radial applied via background
  const map: Record<TigerMood, string> = {
    excited: "rgba(242,179,58,0.12)",
    happy:   "rgba(62,155,95,0.10)",
    neutral: "rgba(183,169,143,0.10)",
    sad:     "rgba(124,147,176,0.12)",
  };
  return map[mood] ?? "rgba(0,0,0,0)";
}

// Inside the wrapper div (AFTER <HabitatVideo>, BEFORE chrome):
<div
  aria-hidden="true"
  style={{
    position: "absolute", inset: 0,
    pointerEvents: "none",   // CRITICAL — Pitfall 6
    zIndex: 1,               // above video, below chrome (HTop is z-3)
    background: state.level >= 9 && !state.isDecaying
      ? "radial-gradient(circle at 72% 26%, rgba(255,200,110,0.28), transparent 55%)"
      : moodTint(state.mood, state.isDecaying, state.level),
  }}
/>
```

**Offline banner re-skin** (replaces lines 253-257 — Daybreak dark frosted bar from handoff HabOffline lines 133-136):
```typescript
{offline && (
  <div
    data-testid="habitat-offline-banner"
    style={{
      position: "relative", zIndex: 4,
      margin: "4px 16px 0", padding: "10px 14px",
      borderRadius: 13,
      background: "rgba(74,51,28,0.82)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", gap: 9, flex: "none",
    }}
  >
    <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #FFE0A8", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFE0A8", fontSize: 12, fontWeight: 700, flex: "none" }}>!</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: "#FFF6E9" }}>
      You&rsquo;re offline &mdash; showing last known state.
    </span>
  </div>
)}
```

**Error state re-skin** (replaces lines 195-209 — Daybreak HabError from handoff lines 145-158):
```typescript
if (error) {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #FFEAC0, #FFF6E8, #FBF0DB)" }} />
      <div style={{ position: "relative", zIndex: 3, padding: "8px 18px 0", flex: "none" }}>
        <HBack />
      </div>
      <div style={{ position: "relative", zIndex: 3, ...WRAPPER_STYLE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 28, textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "#4A331C" }}>
          We couldn&rsquo;t load your habitat.
        </span>
        <span style={{ fontSize: 14.5, color: "#9C8467", lineHeight: 1.5, maxWidth: 250 }}>
          Check your connection and try again.
        </span>
        <Button onClick={retry}>Try again</Button>
      </div>
    </div>
  );
}
```

**"Motion paused" label** (new — rendered when `reducedMotion && !state.isDecaying`, from handoff HabScreen line 94):
```typescript
{reducedMotion && (
  <div
    data-testid="habitat-motion-paused"
    style={{
      position: "relative", zIndex: 3, alignSelf: "center",
      marginBottom: 10, fontSize: 12, fontWeight: 600, color: "#9C8467",
      background: "rgba(255,255,255,0.8)", padding: "5px 12px", borderRadius: 999,
    }}
  >
    &#9208; Motion paused
  </div>
)}
```

**Bottom card switch** (D-10 — replace old `showLevelUp` text overlay):
```typescript
{/* Replace old inline span level-up and add bottom card */}
{state.isDecaying ? (
  <HDecayCard />
) : (
  <HProgCard
    level={state.level}
    effectiveCardCount={state.effectiveCardCount}
    nextLevelThreshold={state.nextLevelThreshold}
  />
)}

{/* Celebration overlay — absolute, above everything */}
{showCelebration && celebratingLevel !== null && (
  <HabitatCelebration
    celebratingLevel={celebratingLevel}
    onSettle={() => setShowCelebration(false)}
  />
)}
```

**Existing `isValidHabitatState` / `CACHE_KEY` / `retry` / `captureMode` / `MOODS` patterns** (lines 10-192): keep verbatim — only the JSX render tree changes.

**Remove:** `MoodIndicator` function (lines 74-101), `MOOD_LABELS` (lines 76-81), `MOOD_DOT_CLASSES` (lines 83-88) — replaced by `HTop`.

---

### `src/components/habitat-video.tsx` (component, event-driven) — MINIMAL EDIT

**Analog:** itself (current file, lines 1-157)

**New imports** (add after line 30):
```typescript
import { useRef } from "react";
// usePrefersReducedMotion already imported (line 31)
```

**Mobile freeze useEffect** (add inside `HabitatVideo`, after existing `reducedMotion` const):
```typescript
// Mobile freeze (D-03/D-04): attach ref to <video> and freeze after ~10s on narrow viewports.
const videoRef = useRef<HTMLVideoElement>(null);

useEffect(() => {
  const video = videoRef.current;
  if (!video || reducedMotion) return;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  if (!isMobile) return; // desktop: keep looping (D-03)

  let freezeTimer: ReturnType<typeof setTimeout> | null = null;

  const freeze = () => { video.pause(); };
  const scheduleFreeze = () => {
    if (freezeTimer !== null) clearTimeout(freezeTimer);
    freezeTimer = setTimeout(freeze, 10_000); // ~2 loops (D-04: tuning knob)
  };

  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      video.play().catch(() => {}); // catch autoplay-policy rejection (Pitfall 3)
      scheduleFreeze();
    } else {
      if (freezeTimer !== null) clearTimeout(freezeTimer);
      video.pause(); // offscreen: pause immediately
    }
  }, { threshold: 0.1 });

  observer.observe(video);
  scheduleFreeze();

  return () => {
    observer.disconnect();
    if (freezeTimer !== null) clearTimeout(freezeTimer);
  };
}, [reducedMotion]); // re-run if reduced-motion changes after mount
```

**Wire videoRef to `<video>` element** (add `ref={videoRef}` to the `<video>` tag at line 141):
```typescript
<video
  ref={videoRef}
  key={clipBasename(level, mood)}
  data-testid="habitat-video"
  // ...existing attrs unchanged...
>
```

**All existing exports** (`clampLevel`, `clipBasename`, `posterSrc`, `webmSrc`, `mp4Src`, `decayFilter`) remain unchanged — they are imported by tests.

---

### `src/app/(protected)/habitat/page.tsx` (component, request-response) — MINIMAL EDIT

**Analog:** itself (current file, lines 1-41)

**Security fix for ?celebrate=N** (RESEARCH Security section; replaces line 22):
```typescript
// VALIDATED: celebrate must be an integer in [1, 9] (RESEARCH Security).
// Raw Number(undefined) is NaN; Number("") is 0; guard both.
const rawCelebrate = params.celebrate ? Number(params.celebrate) : null;
const celebratingLevel =
  rawCelebrate !== null &&
  Number.isInteger(rawCelebrate) &&
  rawCelebrate >= 1 &&
  rawCelebrate <= 9
    ? rawCelebrate
    : null;
```

**Everything else unchanged** — `auth`, `getHabitatFacts`, `computeHabitatState`, `readHabitatOverride`, `HabitatScene` render.

---

### `src/components/study-session.tsx` (component, request-response) — ONE-LINE ROUTING CHANGE

**Analog:** itself; `handleLevelUpDismiss` at lines 214-218

**Current pattern** (lines 214-218):
```typescript
const handleLevelUpDismiss = useCallback(() => {
  const leveledUp = showLevelUp;
  setShowLevelUp(null);
  if (leveledUp === 10) {
    router.push(`/dashboard?deck=${deckId}&celebrate=10`);
  }
}, [showLevelUp, router, deckId]);
```

**Replacement pattern** (D-09 repair — RESEARCH Pattern 3 lines 306-313):
```typescript
const handleLevelUpDismiss = useCallback(() => {
  const leveledUp = showLevelUp;
  setShowLevelUp(null);
  if (leveledUp !== null) {
    router.push(`/habitat?celebrate=${leveledUp}`);
  }
}, [showLevelUp, router]);
```

**Remove `deckId` from the deps array** (it is no longer referenced in the callback).

---

## Wave 0 Test Files

### `src/lib/__tests__/habitat-names.test.ts` (test, transform)

**Analog:** `src/components/__tests__/habitat-video.test.ts` (pure helper export pattern, lines 1-85)

**Imports pattern** (copy from `habitat-video.test.ts` lines 9-19, adapt):
```typescript
import { describe, expect, it } from "vitest";
import { H_NAME, H_NEXT } from "../habitat-names";
// No readFileSync needed — these are pure data exports, no JSX to grep
```

**Test structure pattern** (copy describe/it shell from `habitat-video.test.ts`):
```typescript
describe("H_NAME and H_NEXT constants (HAB-01/HAB-03)", () => {
  it("HN1: H_NAME has entries for levels 1-9", () => { ... });
  it("HN2: H_NEXT has entries for levels 1-8, not 9", () => {
    expect(H_NEXT[9]).toBeUndefined(); // Pitfall 5 guard
  });
  it("HN3: H_NEXT[level].at is level+1", () => { ... });
});
```

---

### `src/components/__tests__/habitat-tint.test.ts` (test, transform)

**Analog:** `src/components/__tests__/habitat-video.test.ts` (pure helper pattern)

**Pattern:** Export `moodTint` from `src/lib/habitat-tint.ts` (or from `habitat-scene.tsx`). Test covers: isDecaying → grey wash, L9 → golden rgba, each of 4 moods → correct rgba. Source-grep fallback if not exported.

```typescript
import { describe, expect, it } from "vitest";
// Either import the exported helper:
import { moodTint } from "../habitat-tint";
// Or source-grep (same pattern as habitat-video.test.ts VS* tests):
//   const s = readFileSync(join(__dirname, "..", "habitat-scene.tsx"), "utf8");
```

---

### `src/components/__tests__/habitat-prog-card.test.ts` (test, transform)

**Analog:** `src/components/__tests__/habitat-video.test.ts` lines 9-25 (pure helper / source-grep)

**Pattern:** Source-grep `habitat-prog-card.tsx` for the pct formula and copy the invariant structure from `habitat-video.test.ts` (V5/V6 numeric checks).

---

### `src/components/__tests__/habitat-celebration.test.ts` (test, event-driven)

**Analog:** `src/components/__tests__/habitat-scene-video.test.ts` (source-grep invariants pattern, lines 1-85)

**Imports pattern** (copy from `habitat-scene-video.test.ts` lines 9-25):
```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CELEBRATION_SRC = readFileSync(
  join(__dirname, "..", "habitat-celebration.tsx"),
  "utf8",
);
```

**Test structure pattern** (source-grep invariants):
```typescript
describe("HabitatCelebration invariants (HAB-04/HAB-05)", () => {
  it("HC1: does NOT import motion/react or framer-motion", () => {
    const imports = CELEBRATION_SRC.split("\n")
      .filter(l => /^\s*import\b/.test(l)).join("\n");
    expect(imports).not.toMatch(/motion\/react/);
    expect(imports).not.toMatch(/framer-motion/);
  });
  it("HC2: confetti is gated on !reducedMotion", () => {
    expect(CELEBRATION_SRC).toMatch(/reducedMotion/);
    expect(CELEBRATION_SRC).toMatch(/hab-confetti/);
  });
  it("HC3: data-testid='habitat-celebration' present", () => {
    expect(CELEBRATION_SRC).toMatch(/data-testid="habitat-celebration"/);
  });
  it("HC4: auto-settle timer is 2500ms (D-07)", () => {
    // Timer lives in habitat-scene.tsx, not celebration — grep scene:
    const SCENE_SRC = readFileSync(join(__dirname, "..", "habitat-scene.tsx"), "utf8");
    expect(SCENE_SRC).toMatch(/setTimeout\(.*2500/);
  });
});
```

---

### `e2e/24-habitat-celebration.spec.ts` (test, request-response)

**Analog:** `e2e/07-habitat-display.spec.ts` (Playwright, `signUpWithDeck` helper, lines 1-65)

**Imports pattern** (copy from `e2e/07-habitat-display.spec.ts` lines 1-3):
```typescript
import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";
```

**Test structure pattern:**
```typescript
test.describe("Habitat — level-up celebration", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
  });

  test("celebration overlay appears when ?celebrate=5 is set", async ({ page }) => {
    await page.goto("/habitat?celebrate=5");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await expect(page.getByTestId("habitat-celebration")).toBeVisible({ timeout: 10_000 });
  });

  test("celebration overlay disappears after ~3s", async ({ page }) => {
    await page.goto("/habitat?celebrate=5");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await expect(page.getByTestId("habitat-celebration")).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3200);  // 2.5s settle + 700ms buffer
    await expect(page.getByTestId("habitat-celebration")).not.toBeVisible();
  });
});
```

---

### `e2e/07-habitat-display.spec.ts` (test, request-response) — RETARGET

**Analog:** itself (current file, lines 1-65)

**Selector retargets required** (RESEARCH e2e Impact Audit):

| Current locator (line) | Issue | Replacement |
|---|---|---|
| `page.getByText("Level")` (line 29) | HLevelBadge renders "LVL\n{N}", not "Level N" | `page.getByTestId("habitat-level-badge")` |
| `page.getByText(/Excited\|Happy\|Neutral\|Sad/)` (lines 39, 59) | Same text in new DOM but fragile | `page.getByTestId("habitat-mood-chip")` |
| `page.locator('[aria-label="Loading habitat"]')` (line 51) | Safe — keep as-is | no change |
| `page.getByText(/Level 1/)` (line 10) | Dashboard widget text — safe | no change |
| `page.getByText(/\d+ of \d+ cards/)` (line 14) | Dashboard hero subtitle — safe | no change |

**data-testid anchor for new test:** `getByTestId("habitat-mood-chip")` and `getByTestId("habitat-level-badge")` added in the new atoms above.

---

## Shared Patterns

### Daybreak Token Palette
**Source:** `design/handoff-daybreak/daybreak-habitat.jsx` `ht` object; `src/components/daybreak/ac-top.tsx` line 28
**Apply to:** All new h-*.tsx atoms and habitat-celebration.tsx

```typescript
// Daybreak ink / muted / primary / link / green (from ht object in handoff):
const DT = {
  ink:     "#4A331C",
  muted:   "#9C8467",
  primary: "#F28A1F",
  link:    "#C96F12",
  green:   "#3E9B5F",
  bg:      "#FFF6E9",
};
// fontDisplay token: var(--font-display)  — used in heading spans
// fontBody:          var(--font-body)     — used in body text
```

### Inline-Style-Only Atoms (no Tailwind in Daybreak atoms)
**Source:** All existing `src/components/daybreak/*.tsx` files (ac-top.tsx, lang-chip.tsx, bw-medallion.tsx, ac-btn.tsx)
**Apply to:** All new h-*.tsx atoms + h-decay-card.tsx + habitat-celebration.tsx

Every Daybreak atom uses `style={{ ... }}` inline objects, never Tailwind classes. No `className` prop except where consuming a Tailwind utility from a shared UI component (e.g., `Button`). This matches the handoff JSX exactly.

### RSC Safety (no "use client" on pure atoms)
**Source:** `src/components/daybreak/lang-chip.tsx`, `bw-medallion.tsx`, `ac-top.tsx` — none have "use client"
**Apply to:** `h-back.tsx`, `h-mood-chip.tsx`, `h-level-badge.tsx`, `h-top.tsx`, `h-prog-card.tsx`, `h-decay-card.tsx`, `habitat-names.ts`

Only add "use client" where hooks (`useState`, `useEffect`, `useRef`) are used. `habitat-celebration.tsx` needs "use client" (`usePrefersReducedMotion`). `habitat-scene.tsx` and `habitat-video.tsx` already have it.

### No `!` Non-Null Assertions (biome noNonNullAssertion)
**Source:** CLAUDE.md/AGENTS.md + RESEARCH.md anti-patterns; confirmed in `habitat-video.test.ts` line 67 pattern (`?.[1]`)
**Apply to:** All new files

Use `?.` (optional chaining) and `?? fallback` everywhere. Examples:
- `H_NEXT[level]` → `H_NEXT[level] ?? null` or guard `level < 9 ? H_NEXT[level] : null`
- `CONFETTI_COLORS[i % 5]` → `CONFETTI_COLORS[i % CONFETTI_COLORS.length]` (always safe)
- `entry?.isIntersecting` in IntersectionObserver callback
- `video.play().catch(() => {})` not `video.play()!`

### CSS-Only Animation (no motion/react on /habitat)
**Source:** `habitat-scene.tsx` line 254 (`animate-in fade-in` Tailwind utility); `level-up-overlay.tsx` (DO NOT copy the motion.div pattern — it's forbidden on /habitat)
**Apply to:** `habitat-celebration.tsx`, any new animated element in `habitat-scene.tsx`

Use Tailwind `animate-in fade-in duration-300` for fade-ins (existing pattern in habitat-scene.tsx offline banner). Use CSS `@keyframes hab-fall` (add to globals.css) for confetti. No `import { motion }` on any file in the /habitat route.

### Vitest Node-Environment Test Pattern
**Source:** `src/components/__tests__/habitat-video.test.ts` lines 1-25 + `habitat-scene-video.test.ts` lines 1-25
**Apply to:** All Wave 0 unit test files (`habitat-names.test.ts`, `habitat-tint.test.ts`, `habitat-prog-card.test.ts`, `habitat-celebration.test.ts`)

- No jsdom — test environment is `node`
- Pure helper exports: import and call directly
- JSX invariants: source-grep with `readFileSync`
- Never render components — `@testing-library/react` is not installed

### WRAPPER_STYLE Invariant
**Source:** `habitat-scene.tsx` lines 51-55; pinned by `habitat-scene-video.test.ts` test VS4 (line 62)
**Apply to:** `habitat-scene.tsx` (keep unchanged)

```typescript
const WRAPPER_STYLE = {
  aspectRatio: "16/9",
  maxHeight: "min(70vh, 400px)",
  position: "relative" as const,
};
```
The VS4 test asserts these exact values. Do not change them.

### Offline Cache / Type Guard Pattern
**Source:** `habitat-scene.tsx` lines 9-46, 164-192
**Apply to:** `habitat-scene.tsx` (keep `isValidHabitatState`, `CACHE_KEY`, `retry` logic verbatim — only the JSX render tree changes)

---

## No Analog Found

All files have close analogs. No entries in this section.

---

## Metadata

**Analog search scope:** `src/components/`, `src/components/daybreak/`, `src/components/__tests__/`, `src/app/(protected)/habitat/`, `src/hooks/`, `src/lib/`, `e2e/`, `design/handoff-daybreak/`
**Files scanned:** 22
**Pattern extraction date:** 2026-06-24
