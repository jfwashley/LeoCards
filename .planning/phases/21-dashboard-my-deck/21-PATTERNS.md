# Phase 21: Dashboard — "My Deck" - Pattern Map

**Mapped:** 2026-06-21
**Files analyzed:** 10 (new/modified files)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/ui/popover.tsx` (NEW) | ui-wrapper | request-response | `src/components/ui/select.tsx` | exact (same @base-ui/react wrapper pattern) |
| `src/components/habitat-medallion.tsx` (NEW) | component | request-response | `src/components/habitat-widget.tsx` (replace) | role-match |
| `src/components/habitat-hero.tsx` (NEW) | component | request-response | `src/components/habitat-widget.tsx` (replace) | role-match |
| `src/components/app-header.tsx` (RESTYLED) | component | request-response | `src/components/app-header.tsx` | exact (self) |
| `src/components/deck-switcher.tsx` (CONVERTED) | component | request-response | `src/components/deck-switcher.tsx` + `src/components/ui/select.tsx` | exact (self + new primitive) |
| `src/components/deck-view.tsx` (RESTYLED) | component / orchestrator | request-response | `src/components/deck-view.tsx` | exact (self) |
| `src/components/card-list.tsx` (RESTYLED) | component | CRUD + event-driven | `src/components/card-list.tsx` | exact (self) |
| `src/components/card-edit-dialog.tsx` (RESTYLED) | component | CRUD | `src/components/card-edit-dialog.tsx` | exact (self) |
| `src/app/(protected)/dashboard/page.tsx` (MODIFIED) | server-component | request-response | `src/app/(protected)/dashboard/page.tsx` | exact (self) |
| `e2e/*.spec.ts` (RETARGET) | test | — | `src/components/study-session.tsx` test patterns | role-match |

---

## Pattern Assignments

### `src/components/ui/popover.tsx` (NEW — ui-wrapper, request-response)

**Analog:** `src/components/ui/select.tsx`

The existing Select wrapper is the exact template: import from `@base-ui/react/<primitive>`, alias each sub-component with a named function wrapping the primitive, export them named. The Popover primitive has a different sub-component set but follows the same structural convention.

**Imports pattern** (`src/components/ui/select.tsx` lines 1–6):
```tsx
"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";
```
For Popover, swap the import path:
```tsx
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
```

**Sub-component alias pattern** (`src/components/ui/select.tsx` lines 8–17):
```tsx
const Select = SelectPrimitive.Root;

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}
```
Apply to Popover sub-components: `Root`, `Trigger`, `Portal`, `Positioner`, `Popup`, `Close`. Use `data-slot="popover-*"` naming.

**Portal + Positioner pattern** (`src/components/ui/select.tsx` lines 73–96):
```tsx
<SelectPrimitive.Portal>
  <SelectPrimitive.Positioner
    side={side}
    sideOffset={sideOffset}
    align={align}
    alignOffset={alignOffset}
    alignItemWithTrigger={alignItemWithTrigger}
    className="isolate z-50"
  >
    <SelectPrimitive.Popup
      data-slot="select-content"
      className={cn(
        "relative isolate z-50 max-h-(--available-height) ... rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 ...",
        className,
      )}
      {...props}
    >
```
For PopoverPopup, replace the Select-specific classes with Daybreak card surface tokens: `bg-[#FFFFFF] border border-[#F0E3CF] rounded-[22px] shadow-[0_12px_30px_rgba(160,110,40,0.16)]` (matching `src/components/daybreak/card.tsx` tokens). Keep `z-50` on Positioner.

**Export pattern** (`src/components/ui/select.tsx` lines 190–201):
```tsx
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
```
Export: `Popover`, `PopoverTrigger`, `PopoverPortal`, `PopoverPositioner`, `PopoverPopup`, `PopoverClose`.

---

### `src/components/habitat-medallion.tsx` (NEW — component, request-response)

**Analog:** `src/components/habitat-widget.tsx` (replaced) + `design/handoff-daybreak/daybreak-dashboard.jsx` lines 63–79

**Imports pattern:**
```tsx
import { LionFace } from "@/components/daybreak/lion-face";
import type { HabitatState } from "@/lib/habitat-engine";
import { LEVEL_THRESHOLDS } from "@/lib/habitat-engine";
```

**Props shape** (from `src/components/habitat-widget.tsx` lines 15–18 + RESEARCH.md):
```tsx
interface HabitatMedallionProps {
  level: number;              // 1–9 (engine caps at 9)
  learnedCardCount: number;
  nextLevelThreshold: number | null;  // null at L9 (confirmed: engine line 262)
  sleeping?: boolean;         // true during cooldown state only (D-06)
  size?: number;              // default 132 for hero, 84 for compact
}
```

**Progress computation pattern** (from `src/components/habitat-widget.tsx` lines 27–41, adapted):
```tsx
// Source: habitat-widget.tsx lines 27-41 (same math, different output form)
function progressRatio(
  level: number,
  learnedCardCount: number,
  nextLevelThreshold: number | null,
): number {
  if (nextLevelThreshold === null) return 1; // L9 max — full ring (gold)
  const prevThreshold = level >= 2 ? (LEVEL_THRESHOLDS[level - 2] ?? 0) : 0;
  const range = nextLevelThreshold - prevThreshold;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (learnedCardCount - prevThreshold) / range));
}
```

**Conic-ring render pattern** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 63–79):
```tsx
// D-05: retarget level >= 10 → level >= 9 (real cap)
// D-06: sleeping ring keeps REAL progress (not 0 as in mock)
const isMaxLevel = level >= 9;  // nextLevelThreshold === null is canonical
const deg = progressRatio(level, learnedCardCount, nextLevelThreshold) * 360;

const ringBg = isMaxLevel
  ? "#F2B33A"                                                         // gold solid
  : `conic-gradient(#F28A1F ${deg}deg, #F3E3C6 ${deg}deg)`;         // amber progress

// D-06: sleeping variant — ring stays ACCURATE, only face interior dims
const innerOpacity = sleeping ? 0.45 : 1;

// Outer ring div
<div style={{ position: "absolute", inset: 0, borderRadius: "50%",
  background: sleeping ? "#F3E3C6" : ringBg }} />
// Inner sunrise disc (inset 6px)
<div style={{ position: "absolute", inset: 6, borderRadius: "50%",
  background: "linear-gradient(180deg, #FFE7BC 0%, #FFFDF8 78%)",
  overflow: "hidden", display: "flex", alignItems: "flex-end",
  justifyContent: "center" }}>
  {/* sun dot */}
  <div style={{ position: "absolute", right: "22%", top: "15%",
    width: size * 0.15, height: size * 0.15,
    borderRadius: "50%", background: "#FFC95C", opacity: innerOpacity }} />
  {/* LionFace */}
  <div style={{ marginBottom: size * 0.05, position: "relative" }}>
    <LionFace size={size * 0.56} mane="#E8973B" face="#FFD9A6" muzzle="#FFF1DC" ink="#4A331C" />
    {/* z-mark: cooldown ONLY */}
    {sleeping && (
      <span style={{ position: "absolute", right: -size * 0.05, top: -size * 0.05,
        fontFamily: "var(--font-display)", fontWeight: 700,
        fontSize: size * 0.17, color: "#B4762A" }}>z</span>
    )}
  </div>
</div>
// Level badge (bottom-right)
<div style={{ position: "absolute", right: -2, bottom: -2,
  minWidth: size * 0.3, height: size * 0.3, padding: "0 5px",
  borderRadius: 999,
  background: sleeping ? "#C9B79A" : (isMaxLevel ? "#F2B33A" : "#F28A1F"),
  color: "#FFF", border: "3px solid #FFF6E9",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--font-display)", fontWeight: 700,
  fontSize: size * 0.19, boxSizing: "border-box" as const }}>
  {sleeping ? "•" : level}
</div>
```

**Reduced-motion note:** Ring is static CSS, no transition needed. No `usePrefersReducedMotion` required for the ring itself.

---

### `src/components/habitat-hero.tsx` (NEW — component, request-response)

**Analog:** `src/components/habitat-widget.tsx` lines 43–71 (replaced) + `design/handoff-daybreak/daybreak-dashboard.jsx` lines 146–161

**Imports pattern:**
```tsx
import Link from "next/link";
import { HabitatMedallion } from "@/components/habitat-medallion";
import type { HabitatState } from "@/lib/habitat-engine";
```

**Link + card wrapper pattern** (`src/components/habitat-widget.tsx` lines 43–51):
```tsx
// Current analog: Link wrapping a Card (preserved in new HabitatHero)
<Link
  href={celebratingLevel ? `/habitat?celebrate=${celebratingLevel}` : "/habitat"}
  className="block"
>
```
Daybreak card surface: inline styles from `src/components/daybreak/card.tsx` + gradient top:
```tsx
// design/handoff-daybreak/daybreak-dashboard.jsx line 148:
background: "linear-gradient(180deg, #FFF3DC 0%, #FFFFFF 70%)"
border: "1px solid #F0E3CF"   // dt.cardBorder
borderRadius: 22               // dt.cardRadius
boxShadow: "0 10px 26px rgba(160,110,40,0.12)"
padding: "26px 22px 22px"
```

**Subtitle copy pattern** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 150–158):
```tsx
// "Habitat · Level N" heading
<div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "#4A331C", lineHeight: 1 }}>
  Habitat · Level {level}
</div>
// Sub-line (D-05: hidden at L9 / nextLevelThreshold === null)
{nextLevelThreshold !== null && (
  <div style={{ fontSize: 14.5, color: "#8C7A63" }}>
    {sleeping
      ? <span>Your lion is napping · cards recharging</span>
      : <span><span style={{ color: "#4A331C", fontWeight: 700 }}>{learnedCardCount} of {nextLevelThreshold}</span> cards to Level {level + 1}</span>
    }
  </div>
)}
// D-05: "Course 1 complete" when nextLevelThreshold === null (not hidden entirely)
{nextLevelThreshold === null && (
  <div style={{ fontSize: 14.5, color: "#8C7A63" }}>Course 1 complete</div>
)}
```

---

### `src/components/app-header.tsx` (RESTYLED — component, request-response)

**Analog:** `src/components/app-header.tsx` (self, lines 1–39) + `design/handoff-daybreak/daybreak-dashboard.jsx` lines 127–143

**Current structure to preserve** (`src/components/app-header.tsx` lines 13–39):
```tsx
// Preserve: "use client", AppHeaderProps interface, DeckSwitcher + LogoutButton composition
export function AppHeader({ decks, activeDeckId, onDeckChange, nativeLang }: AppHeaderProps) {
  return (
    <header className="h-14 bg-background border-b border-border flex items-center px-4 sm:px-6 md:px-8 justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {/* RESTYLE: 🐯 → LionFace + wordmark */}
        <span className="text-lg">🐯</span>
        <span className="text-sm font-semibold text-foreground">LeoCards</span>
      </div>
      <div className="flex items-center gap-4">
        {decks.length > 0 && <DeckSwitcher ... />}
        <LogoutButton />   {/* RESTYLE: text "Sign out" → icon + aria-label="Sign out" */}
      </div>
    </header>
  );
}
```

**Brand restyle target** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 130–133):
```tsx
// TopBar left side — LionFace 27px + "LeoCards" in fontDisplay
<LionFace size={27} mane="#E8973B" face="#FFD9A6" muzzle="#FFF1DC" ink="#4A331C" />
<span style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "#4A331C" }}>LeoCards</span>
```

**Logout glyph target** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 139):
```tsx
// Width/height 36, borderRadius 10, border "1.5px solid #EDDFC9", bg "#FFFFFF"
// Render LogoutGlyph SVG (inline SVG — see daybreak-dashboard.jsx ~line 30 for LogoutGlyph def)
// Must add aria-label="Sign out" for e2e retarget (RESEARCH.md Pitfall 7)
```

**LogoutButton logic to preserve** (`src/components/logout-button.tsx` lines 4–7):
```tsx
import { authClient } from "@/lib/auth-client";
// handleSignOut: authClient.signOut() → router.push("/login")
```

---

### `src/components/deck-switcher.tsx` (CONVERTED — component, request-response)

**Analog:** `src/components/deck-switcher.tsx` (self) — all state logic preserved; only render changes.

**State to keep verbatim** (`src/components/deck-switcher.tsx` lines 47–81):
```tsx
const [creatingLang, setCreatingLang] = useState<string | null>(null);
const [showPicker, setShowPicker] = useState(false);
const [error, setError] = useState<string | null>(null);

const learningLanguages = useMemo(
  () => ALL_LANGUAGES.filter((l) => l.code !== nativeLang),
  [nativeLang],
);

const handleCreateDeck = useCallback(async (langCode: string) => {
  setCreatingLang(langCode);
  setError(null);
  try {
    const result = await createDeck(langCode);
    onDeckChange(result.id);
    setShowPicker(false);
  } catch {
    setError("Failed to create deck. Try again.");
  } finally {
    setCreatingLang(null);
  }
}, [onDeckChange]);

function handleValueChange(value: string | null) {
  if (!value) return;
  if (value === "__new__") { setShowPicker(true); return; }
  setShowPicker(false);
  onDeckChange(value);
}
```

**New render — replace Select with Popover** (see `src/components/ui/popover.tsx` pattern above):
```tsx
// Trigger: compact pill — LangChip code + chevron
// data-testid="deck-picker-trigger" required (RESEARCH.md Pitfall 2 / e2e 08-deck-switching retarget)
<PopoverTrigger data-testid="deck-picker-trigger" style={{
  height: 36, display: "flex", alignItems: "center", gap: 6,
  padding: "0 9px", borderRadius: 10, border: "1.5px solid #EDDFC9",
  background: "#FFFFFF", boxSizing: "border-box",
}}>
  <LangChip code={activeDeck?.language.toUpperCase() ?? "??"} size={20} />
  <Chevron dir="down" />
</PopoverTrigger>

// Popup content: deck list + separator + "+ New deck" row
// Deck items: data-testid="deck-option-{lang.code}" (RESEARCH.md Pitfall 2)
// LangChip replace: FLAG_MAP → LangChip text chip (L-01, no emoji)
```

**LangChip inline component** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 56–60):
```tsx
// LangChip: width (size+7)px, height size, borderRadius 6
// bg "#FFF1DC", border "1px solid #F0E3CF"
// text: size * 0.46, fontWeight 700, color "#B4762A"
function LangChip({ code, size = 24 }) {
  return (
    <span style={{ width: size + 7, height: size, borderRadius: 6,
      background: "#FFF1DC", border: "1px solid #F0E3CF",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.46, fontWeight: 700, color: "#B4762A",
      letterSpacing: 0.3, flex: "none", boxSizing: "border-box" }}>
      {code}
    </span>
  );
}
```

**Inline create picker pattern** (preserved from `src/components/deck-switcher.tsx` lines 119–151, restyled):
```tsx
// showPicker expands inline inside PopoverPopup (not a separate div outside)
// Each lang button: LangChip + label + per-lang spinner (creatingLang === lang.code)
// Cancel button: keeps accessible "Cancel" text
```

---

### `src/components/deck-view.tsx` (RESTYLED — orchestrator, request-response)

**Analog:** `src/components/deck-view.tsx` (self)

**Props to remove** (`src/components/deck-view.tsx` lines 103, 116, 178–186):
```tsx
// REMOVE from DeckViewProps interface:
languageBreakdown: Array<{ language: string; count: number }>;
// REMOVE from destructured params line 116
// REMOVE render block lines 178-186 (the breakdown <p> and <h1>My Deck</h1>)
```

**CountdownTimer to keep verbatim** (`src/components/deck-view.tsx` lines 44–92):
```tsx
// Keep ALL of CountdownTimer (formatCountdown, useEffect, router.refresh on expiry)
// Only restyle the returned JSX: "Next cards in {countdown}" → feeds StatusText as countdown string
// CountdownTimer no longer renders its own button — it returns just the countdown string
// OR it renders the full StatusText; either is fine (planner's call)
```

**Study button / action line replacement target** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 164–215):
```tsx
// StudyButton: height 58, borderRadius dt.btnRadius (14px), fontDisplay 21px bold
// active: bg "#F28A1F", color "#FFFFFF", boxShadow "0 10px 22px rgba(242,138,31,0.32)"
// inactive: bg "#F4E7D2", color "#B49B78", no shadow
// StatusText: 4-state machine (due / none / cooldown / paused)
// "Add a card" pill: height 40, padding "0 15px", borderRadius 12, border "1.5px solid #EDDFC9"
```

**Lines to remove from render** (`src/components/deck-view.tsx` lines 177–194):
- Line 177: `<h1 className="text-xl font-semibold">My Deck</h1>` — remove (D-02)
- Lines 178–186: breakdown `<p>` — remove (D-02)
- Lines 191–196: "Browse words" `<Link>` — remove (L-05)
- Lines 205–209: "All cards are paused — unpause one to study." `<p>` — remove (absorbed into StatusText "All paused")

**WordsAccordion wrapper** — new component wrapping `<CardList>` (see card-list.tsx below).

---

### `src/components/card-list.tsx` (RESTYLED — component, CRUD + event-driven)

**Analog:** `src/components/card-list.tsx` (self) + `design/handoff-daybreak/daybreak-dashboard.jsx` lines 82–124

**Preserve verbatim** (behavior only):
- `togglePause` function (lines 34–59): `useTransition` + `fetch POST /api/cards/[id]/pause|unpause` + `router.refresh()`
- `filtered` useMemo (lines 61–70)
- Empty-deck state (lines 72–118): already Daybreak (ONB-06) — keep as-is
- No-results state (lines 145–180): already Daybreak — keep; fix assertion text `"No words match"` (already correct)
- `QaStateBadge` integration (lines 221–229, 316–323)
- `CardEditDialog` at bottom (lines 384–391)
- `pendingCardIds` optimistic set

**Accordion wrapper** — new state + motion.div wrapping the populated section:
```tsx
// "use client" already present
import { AnimatePresence, motion } from "motion/react";
// Add to existing imports (motion already in package.json v12.38.0)
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
// (usePrefersReducedMotion = existing hook at src/hooks/use-prefers-reduced-motion.ts)

// New state at top of CardList:
const [open, setOpen] = useState(false);
const reduced = usePrefersReducedMotion();

// Accordion header (before the populated content):
const learnedCount = cards.filter(c => (c.masteryRound ?? 0) >= 3).length;

<button
  type="button"
  aria-expanded={open}
  aria-controls="words-panel"
  onClick={() => setOpen(o => !o)}
  style={{ /* Daybreak card header styles from mock lines 222-228 */
    background: "#FFFFFF", border: "1px solid #F0E3CF", borderRadius: 16,
    padding: "15px 18px", display: "flex", alignItems: "center",
    justifyContent: "space-between", width: "100%" }}
>
  <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#4A331C" }}>
    Your words
  </span>
  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: "#8C7A63" }}>{learnedCount} learned</span>
    {/* Chevron glyph — up when open, down when closed */}
  </div>
</button>

<AnimatePresence initial={false}>
  {open && (
    <motion.div
      id="words-panel"
      role="region"
      aria-label="Your words"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.22, ease: "easeInOut" }}
      style={{ overflow: "hidden" }}  // CRITICAL: pitfall 1 — must be set
    >
      {/* Search bar (moves inside here from top level) */}
      {/* Add data-testid="words-search-input" to the input */}
      {/* Placeholder changes to "Search your words" */}
      {/* Card rows below */}
    </motion.div>
  )}
</AnimatePresence>
```

**AnimatePresence pattern analog** (`src/components/study-session.tsx` lines 3, 342–349, 503–516):
```tsx
// Established pattern: AnimatePresence wrapping motion.div with initial/animate/exit
import { AnimatePresence, motion } from "motion/react";
// <AnimatePresence> ... <motion.div initial=... animate=... exit=... /> </AnimatePresence>
```

**CardRow restyle** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 105–124):
```tsx
// Row container: opacity 0.55 when paused (not 0.50 as current "opacity-50")
// D-04 OVERRIDE: native (card.front) BOLD ON TOP / target (card.back) muted below
// (OPPOSITE of mock's CardRow which puts `t` bold on top — do NOT follow mock)
<div style={{ display: "flex", alignItems: "center", gap: 12,
  padding: "12px 2px", borderBottom: "1px solid #F4ECDD",
  opacity: paused ? 0.55 : 1 }}>
  <div style={{ flex: 1, minWidth: 0 }}>
    {/* D-04: native FIRST, bold */}
    <div style={{ fontSize: 16.5, fontWeight: 700, color: "#4A331C", ... }}>{card.front}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
      {/* target second, muted */}
      <span style={{ fontSize: 13.5, color: "#8C7A63", ... }}>{card.back}</span>
      <SourceTag src={card.source} paused={!!card.pausedAt} />
    </div>
  </div>
  <Mastery step={card.pausedAt ? 0 : (card.masteryRound ?? 0)} />
  <IconBtn>{/* pause/resume glyph */}</IconBtn>
  <IconBtn>{/* pencil glyph → setEditCard */}</IconBtn>
</div>
```

**SourceTag copy mapping** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 95–99):
```tsx
// paused → "Paused"        { bg: "#F1E9DD", tx: "#8C7A63" }
// manual → "Added by you"  { bg: "#EAF3EC", tx: "#3E8B5C" }
// wordlist → "Curated"     { bg: "#FFF1DC", tx: "#B4762A" }
const label = card.pausedAt ? "Paused" : card.source === "manual" ? "Added by you" : "Curated";
```
Current source (`src/components/card-list.tsx` lines 236–239 and 328–332):
```tsx
// OLD (replace both occurrences — desktop table AND mobile card):
card.pausedAt ? "Paused" : card.source === "wordlist" ? "word list" : "manual"
// NEW:
card.pausedAt ? "Paused" : card.source === "manual" ? "Added by you" : "Curated"
```

**Mastery meter restyle** (`design/handoff-daybreak/daybreak-dashboard.jsx` lines 82–93):
```tsx
// 3 vertical bars (8px wide × 16px tall, borderRadius 4) — not circles
// filled: amber "#F28A1F"; at 3/3: green "#3E9B5F"
// green check badge at done (17px circle, "#3E9B5F", "✓")
const done = (card.masteryRound ?? 0) >= 3;
const fill = done ? "#3E9B5F" : "#F28A1F";
{[0, 1, 2].map((i) => (
  <span key={i} style={{ width: 8, height: 16, borderRadius: 4,
    background: i < (card.masteryRound ?? 0) ? fill : "#F0E3CF" }} />
))}
{done && <span style={{ width: 17, height: 17, borderRadius: "50%",
  background: "#3E9B5F", display: "flex", alignItems: "center",
  justifyContent: "center", color: "#FFF", fontSize: 11, fontWeight: 700 }}>✓</span>}
```

**Search input** — add `data-testid="words-search-input"` to the `<Input>` and change placeholder to `"Search your words"` (from `design/handoff-daybreak/daybreak-dashboard.jsx` line 233).

---

### `src/components/card-edit-dialog.tsx` (RESTYLED — component, CRUD)

**Analog:** `src/components/card-edit-dialog.tsx` (self) — behavior preserved; surface restyled.

**Preserve verbatim** (all logic):
- `EditForm` component (lines 32–163): `front`/`back` state, `saving`, `saveError`, `showDeleteConfirm`, `deleting`, `deleteError`, `handleSave`, `handleDelete`
- `useEffect` to reset state on card change (lines 41–47)
- Delete confirmation flow (lines 75–105): "Delete this card? This can't be undone." → Delete / Keep card
- Error states: `saveError` and `deleteError`
- `CardEditDialog` wrapper (lines 165–180): `Dialog open={open} onOpenChange={onOpenChange}`

**Input → TField restyle** (`src/components/daybreak/t-field.tsx` lines 1–42):
```tsx
// Replace: <Input id="card-front" value={front} onChange=... disabled={saving} />
// With:
import { TField } from "@/components/daybreak/t-field";

<TField
  label="Native word"          // maps to existing label text (line 111)
  value={front}
  onChange={(e) => setFront(e.target.value)}
  disabled={saving}
/>
<TField
  label="Target word"
  value={back}
  onChange={(e) => setBack(e.target.value)}
  disabled={saving}
/>
```
TField internally renders: `h-12 rounded-xl border-[1.5px] bg-[var(--db-field-bg)] px-3.5 text-[15px]` — no manual field styling needed.

**Button → TBtn restyle** (`src/components/daybreak/t-btn.tsx` lines 1–33):
```tsx
// Replace: <Button variant="default" className="w-full h-11" disabled={saving}>Save changes</Button>
// With:
import { TBtn } from "@/components/daybreak/t-btn";

<TBtn isPending={saving} onClick={handleSave}>Save changes</TBtn>

// Discard / Keep card: ghost variant — TBtn with overridden bg
// Pattern: use inline style override on TBtn (background: "var(--background)", border: "1.5px solid #EDDFC9", color: "#4A331C")
// OR keep shadcn Button variant="outline" for secondary actions (planner's call per Claude's discretion)
```

**Dialog surface** (`src/components/ui/dialog.tsx` lines 41–79 — keep):
```tsx
// Keep DialogContent wrapper unchanged — it already uses @base-ui/react/dialog
// Keep showCloseButton={false} (line 172)
// Add Daybreak token overrides to DialogContent className if needed:
// "bg-[var(--background)] rounded-[22px] border border-[#F0E3CF]"
```

---

### `src/app/(protected)/dashboard/page.tsx` (MODIFIED — server-component, request-response)

**Analog:** `src/app/(protected)/dashboard/page.tsx` (self)

**Remove** (D-02, exact lines from live file):

Line 15 — remove import:
```tsx
import { getLanguageBreakdown } from "@/lib/milestone-queries";
```

Lines 36–42 — remove from Promise.all (drop the 4th element):
```tsx
// BEFORE:
const [decks, nativeLang, habitatFacts, languageBreakdown] =
  await Promise.all([
    getUserDecks(session.user.id),
    getUserNativeLanguage(session.user.id),
    getHabitatFacts(session.user.id as UserId),
    getLanguageBreakdown(session.user.id as UserId),   // ← REMOVE
  ]);

// AFTER:
const [decks, nativeLang, habitatFacts] =
  await Promise.all([
    getUserDecks(session.user.id),
    getUserNativeLanguage(session.user.id),
    getHabitatFacts(session.user.id as UserId),
  ]);
```

Lines 5–6 — remove unused import:
```tsx
import { HabitatWidget } from "@/components/habitat-widget";  // already unused after deck-view.tsx change
```

Line 129 — remove prop from `<DeckView>`:
```tsx
// REMOVE: languageBreakdown={languageBreakdown}
```

**Keep verbatim:** all other Promise.all fetches, the `decks.length === 0 → redirect("/welcome")` guard, `buildCardRows`, `habitatOverride`, `readQaAuth`, `computeHabitatState`, `assembleSession`, `earliestCooldownEnd`.

---

### `e2e/*.spec.ts` (RETARGET — test files)

**Analog:** existing spec patterns in `e2e/` directory

The complete retarget map from RESEARCH.md:

| Spec | Old Selector | New Selector | Type |
|---|---|---|---|
| `08-deck-switching.spec.ts` (lines 12, 36, 60) | `[data-slot="select-trigger"]` | `[data-testid="deck-picker-trigger"]` | attribute |
| `08-deck-switching.spec.ts` (lines 16, 38, 47, 62) | `[role="option"]` | `[data-testid="deck-option-{lang}"]` | attribute |
| `12-pause-cards.spec.ts` (lines 150, 159) | `"All cards are paused — unpause one to study."` | `"All paused"` | text |
| `05-card-management.spec.ts` (line 24) | `getByPlaceholder("Search your cards...")` | `[data-testid="words-search-input"]` (expand accordion first) | testid |
| `05-card-management.spec.ts` (lines 29, 32) | `getByText("No cards match")` | `getByText(/No words match/)` (PRE-EXISTING) | text regex |
| `02-first-visit-deck-creation.spec.ts` (line 99) | `getByPlaceholder("Search your cards...")` | `[data-testid="words-search-input"]` (expand accordion first) | testid |
| `10-mobile-responsive.spec.ts` (line 40) | `getByText("Sign out")` | `getByRole("button", { name: "Sign out" })` | aria-role |
| `01-auth-signup-login.spec.ts` (lines 38, 60, 89) | `getByText("Sign out").click()` | `getByRole("button", { name: "Sign out" }).click()` | aria-role |
| `07-habitat-display.spec.ts` (line 12) | `/\/.*cards/` | `/\d+ of \d+ cards/` | regex |
| `09-language-breakdown.spec.ts` (line 8, 35) | `getByText("My Deck")` | Test 1: rewrite to `getByText(/\d+ learned/)`; Test 3: remove `"My Deck"` assert | rewrite |
| `e2e/helpers.ts` (line 164) | `getByRole("link", { name: "Browse words" }).first()` | Add `data-testid="browse-words-empty"` to empty-deck link; retarget helper | testid |
| `14-qa-parity.spec.ts` | grep for `"word list"` and `"manual"` | `"Curated"` / `"Added by you"` | text (if found) |

---

## Shared Patterns

### Daybreak Surface Tokens
**Source:** `src/components/daybreak/card.tsx` lines 14–19
**Apply to:** `HabitatHero`, `HabitatMedallion` disc, `PopoverPopup`, accordion header, `CardEditDialog` overrides
```tsx
borderRadius: 22,
background: "#FFFFFF",
border: "1px solid #F0E3CF",
boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
```

### Motion / AnimatePresence Pattern
**Source:** `src/components/level-up-overlay.tsx` lines 38–46; `src/components/study-session.tsx` lines 342–349
**Apply to:** `WordsAccordion` expand/collapse in `card-list.tsx`
```tsx
import { AnimatePresence, motion } from "motion/react";
// motion/react v12.38.0 — confirmed in package.json
// AnimatePresence initial={false} — suppresses entry animation on first mount
// motion.div with height/opacity + style={{ overflow: "hidden" }}
```

### Reduced-Motion Hook
**Source:** `src/hooks/use-prefers-reduced-motion.ts` lines 9–25
**Apply to:** `card-list.tsx` accordion transition
```tsx
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
const reduced = usePrefersReducedMotion();
// Gate: transition={{ duration: reduced ? 0 : 0.22, ease: "easeInOut" }}
```
Note: the hook is named `usePrefersReducedMotion` (not `useReducedMotion`) — use the project hook, not motion/react's built-in.

### @base-ui/react Wrapper Convention
**Source:** `src/components/ui/select.tsx` lines 1–201; `src/components/ui/dialog.tsx` lines 1–159
**Apply to:** `src/components/ui/popover.tsx` (NEW)
- `"use client"` directive at top
- Import from `@base-ui/react/<primitive>` (not the root package)
- Alias as `Primitive` (e.g. `Popover as PopoverPrimitive`)
- Each export is a named function (not const arrow), typed with `Primitive.SubComponent.Props`
- Add `data-slot="<component>-<part>"` to each wrapper
- Use `cn()` from `@/lib/utils` for className merging
- Portal/Positioner/Popup get `className="isolate z-50"` on Positioner

### Optimistic Pause Toggle
**Source:** `src/components/card-list.tsx` lines 29–58
**Apply to:** `card-list.tsx` (preserve exactly — only restyle the button render)
```tsx
const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(() => new Set());
const [, startTransition] = useTransition();
// fetch POST /api/cards/[id]/pause|unpause → router.refresh() on success
```

### LionFace Usage
**Source:** `src/components/daybreak/lion-face.tsx` lines 17–25
**Apply to:** `HabitatMedallion`, `AppHeader` (brand), `DeckSwitcher` StatusText cooldown glyph
```tsx
import { LionFace } from "@/components/daybreak/lion-face";
// Default colors: mane="#E8973B", face="#FFD9A6", muzzle="#FFF1DC", ink="#4A331C"
// aria-hidden="true" already set inside LionFace — no additional aria needed
```

### Daybreak Button (TBtn) + Field (TField)
**Source:** `src/components/daybreak/t-btn.tsx` lines 8–33; `src/components/daybreak/t-field.tsx` lines 10–42
**Apply to:** `CardEditDialog` (primary Save button → TBtn; fields → TField), `DeckSwitcher` popover action buttons
```tsx
// TBtn: h-[50px] w-full rounded-[14px] — primary only; for ghost variants override bg/border/color inline
// TField: label prop required; error prop optional; height h-12 rounded-xl border-[#EDDFC9]
```

---

## No Analog Found

All files have close analogs in the codebase. No files require RESEARCH.md-only patterns.

---

## Metadata

**Analog search scope:** `src/components/`, `src/components/daybreak/`, `src/components/ui/`, `src/app/(protected)/dashboard/`, `src/lib/`, `src/hooks/`, `design/handoff-daybreak/`, `e2e/`
**Files read:** 18 source files
**Pattern extraction date:** 2026-06-21
