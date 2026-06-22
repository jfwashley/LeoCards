# Phase 22: Add a Card — Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 11 (5 restyle targets + 6 new atoms)
**Analogs found:** 11 / 11

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/components/daybreak/ac-seg.tsx` | atom | request-response | `src/components/daybreak/t-btn.tsx` | role-match |
| `src/components/daybreak/ac-progress.tsx` | atom | request-response | `src/components/daybreak/lion-face.tsx` + `src/components/daybreak/auth-card.tsx` (scene) | role-match |
| `src/components/daybreak/ac-review-row.tsx` | atom | event-driven | `src/components/daybreak/card.tsx` + `src/components/daybreak/pill.tsx` | role-match |
| `src/components/daybreak/ac-pair-row.tsx` | atom | event-driven | `src/components/daybreak/t-field.tsx` | role-match |
| `src/components/daybreak/ac-banner.tsx` | atom | request-response | `src/components/daybreak/card.tsx` | role-match |
| `src/components/daybreak/ac-btn.tsx` | atom | request-response | `src/components/daybreak/t-btn.tsx` | exact |
| `src/components/new-card-mode-toggle.tsx` | component | request-response | `src/components/deck-switcher.tsx` (Phase 21 Daybreak client component) | role-match |
| `src/components/translation-form.tsx` | component | request-response | `src/components/translation-form.tsx` (self — behavior preserved) | exact |
| `src/components/image-upload-flow.tsx` | component | CRUD + event-driven | `src/components/image-upload-flow.tsx` (self — behavior preserved) | exact |
| `src/components/review-list.tsx` | component | CRUD + streaming | `src/components/review-list.tsx` (self — behavior preserved) | exact |
| `src/app/(protected)/deck/new-card/page.tsx` | page (RSC) | request-response | `src/app/(protected)/dashboard/page.tsx` | role-match |

---

## Pattern Assignments

### `src/components/daybreak/ac-seg.tsx` (new atom — segmented toggle)

**Analog:** `src/components/daybreak/t-btn.tsx`

The house-style atom pattern: a pure function, no `"use client"`, inline Daybreak tokens, renders as a real `<button>` element. `ACSeg` departs from `TBtn`'s single-variant/full-width shape but follows the same file structure and token conventions.

**Imports pattern** (copy from `t-btn.tsx` lines 1-3):
```tsx
import * as React from "react";
```

**Prop shape to implement** (derived from design contract `daybreak-addcard.jsx` lines 59-71):
```tsx
interface ACSegProps {
  mode: "type" | "image";
  onChange: (m: "type" | "image") => void;
}
```

**Core pattern** (design contract `daybreak-addcard.jsx` lines 59-71 — production version uses `<button>` per Pitfall 1):
```tsx
export function ACSeg({ mode, onChange }: ACSegProps) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: 5, background: '#F4E7D2', borderRadius: 14, flex: 'none' }}>
      {(['type', 'image'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          style={{
            flex: 1, height: 44, borderRadius: 11,
            background: mode === m ? '#FFFFFF' : 'transparent',
            boxShadow: mode === m ? '0 2px 8px rgba(160,110,40,0.14)' : 'none',
            color: mode === m ? '#4A331C' : '#9C8467',
            fontWeight: 700, fontSize: 14.5,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          {/* icon + label — PencilGlyph for type, ACMiniImg for image */}
          {m === 'type' ? 'Type a word' : 'From an image'}
        </button>
      ))}
    </div>
  );
}
```

**CRITICAL (Pitfall 1):** Each segment MUST be a `<button type="button">` so `getByRole("button", { name: "Type a word" })` works in Playwright. The design prototype uses `<div>` — do NOT copy that.

---

### `src/components/daybreak/ac-progress.tsx` (new atom — calm long-wait)

**Analog:** `src/components/daybreak/lion-face.tsx` (for the `LionFace` usage pattern) + `src/components/daybreak/auth-card.tsx` (for the sunrise scene disc gradient)

The sunrise disc gradient and amber dot top-right both appear in `auth-card.tsx`'s `DaybreakAuthScene`. The `LionFace` prop shape is established in `lion-face.tsx` lines 6-15.

**Imports pattern**:
```tsx
import { LionFace } from "@/components/daybreak/lion-face";
import { motion } from "motion/react";
```

**Prop shape** (from design contract `daybreak-addcard.jsx` line 210):
```tsx
interface ACProgressProps {
  title: string;
  sub: string;
  searching?: boolean; // adds magnifier overlay — used on Extracting screen only
}
```

**Core pattern** (design contract `daybreak-addcard.jsx` lines 210-224 — production uses `motion/react` for the indeterminate bar):
```tsx
export function ACProgress({ title, sub, searching }: ACProgressProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 28, textAlign: 'center' }}>
      {/* Sunrise disc — gradient from auth-card.tsx DaybreakAuthScene pattern */}
      <div style={{ width: 116, height: 116, borderRadius: '50%', background: 'linear-gradient(180deg, #FFE7BC, #FFFDF8)', border: '1px solid #F0E3CF', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LionFace size={62} mane="#E8973B" face="#FFD9A6" muzzle="#FFF1DC" ink="#4A331C" />
        {/* amber dot top-right (always present) */}
        <div style={{ position: 'absolute', right: 16, top: 14, width: 14, height: 14, borderRadius: '50%', background: '#FFC95C' }} />
        {/* magnifier overlay (Extracting only — searching prop) */}
        {searching && (/* magnifier glyph */null)}
      </div>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 700, color: '#4A331C' }}>{title}</span>
      {/* indeterminate amber bar — use motion/react, NOT CSS class from prototype */}
      <div style={{ width: '74%', height: 12, borderRadius: 7, background: '#F1E6D2', overflow: 'hidden', position: 'relative' }}>
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: 0, bottom: 0, width: '42%', borderRadius: 7, background: '#F28A1F' }}
        />
      </div>
      <span style={{ fontSize: 14.5, color: '#9C8467', lineHeight: 1.5, maxWidth: 280 }}>{sub}</span>
    </div>
  );
}
```

**Copy strings:**
- Extracting: `title="Reading your image…"` / `sub="This can take up to 30 seconds. Hang tight — your lion is sniffing out the words."` / `searching={true}`
- Translating: `title={\`Translating ${n} words…\`}` / `sub="Almost there. You'll be able to check and fix each one."` / `searching={false}`

---

### `src/components/daybreak/ac-review-row.tsx` (new atom — keep/exclude word row)

**Analog:** `src/components/daybreak/card.tsx` + `src/components/daybreak/pill.tsx` (for inline-style structure and token conventions)

**Prop shape** (from design contract `daybreak-addcard.jsx` line 228):
```tsx
interface ACReviewRowProps {
  word: string;
  excluded: boolean;
  last?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}
```

**Core pattern** (design contract `daybreak-addcard.jsx` lines 228-237):
```tsx
// ACCheckBox sub-component (inline or separate file):
// width: 26, height: 26, borderRadius: 8
// on: background '#F28A1F', color '#FFF', shows '✓'
// off: border '2px solid #D8C7AC', transparent background

<div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 2px', borderBottom: last ? 'none' : '1px solid #F4ECDD' }}>
  <ACCheckBox on={!excluded} />
  <span style={{ flex: 1, fontSize: 17.5, fontWeight: 600, color: excluded ? '#9C8467' : '#4A331C', textDecoration: excluded ? 'line-through' : 'none' }}>{word}</span>
  {/* Edit button: 34x34, borderRadius 10, border '1.5px solid #EDDFC9', bg '#FFFBF4' */}
  <button type="button" onClick={onEdit} style={{ width: 34, height: 34, borderRadius: 10, border: '1.5px solid #EDDFC9', background: '#FFFBF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
    {/* PencilGlyph */}
  </button>
  {/* Remove button: 34x34, no border */}
  <button type="button" onClick={onRemove} style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer', background: 'none', border: 'none' }}>
    {/* ACClose c='#9C8467' */}
  </button>
</div>
```

**Review-list.tsx behavior preserved:** The row's `onToggle`, `onEdit`, `onRemove` callbacks map 1-to-1 to `TOGGLE_WORD`, `EDIT_WORD`, `REMOVE_WORD` dispatch actions in `review-list.tsx`. Do not restructure the action types.

---

### `src/components/daybreak/ac-pair-row.tsx` (new atom — translation pair)

**Analog:** `src/components/daybreak/t-field.tsx`

`TField` establishes the field shape: `label → input → error` vertical stack, `border-[#EDDFC9]` on idle, `border-destructive` on error, `bg-[var(--db-field-bg)]` fill, `borderRadius: 12`. `ACPairRow` composes two such fields vertically.

**CRITICAL (D-01):** ES (target language) is the TOP field; EN (native) is the BOTTOM field. This is intentional and must not be "corrected". The current `ReviewTranslationRow` in `review-list.tsx` has native on top — the flip is required.

**Prop shape** (from design contract `daybreak-addcard.jsx` line 240):
```tsx
interface ACPairRowProps {
  targetLabel: string;    // e.g. "ES"
  nativeLabel: string;    // e.g. "EN"
  target: string;
  native: string;
  failed?: boolean;       // red EN border + "Translation unavailable — enter manually."
  last?: boolean;
  onEditTarget: (v: string) => void;
  onEditNative: (v: string) => void;
}
```

**Core pattern** (design contract `daybreak-addcard.jsx` lines 240-254):
```tsx
// TField token values to replicate:
// fieldBg: '#FFFBF4', fieldBorder: '1.5px solid #EDDFC9', fieldRadius: 12
// failed EN border: '1.5px solid #DE5F4A'

<div style={{ padding: '14px 0', borderBottom: last ? 'none' : '1px solid #F4ECDD', display: 'flex', flexDirection: 'column', gap: 9 }}>
  {/* TOP: ES target field (bold) */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: '#9C8467', width: 24, flex: 'none' }}>{targetLabel}</span>
    <input value={target} onChange={(e) => onEditTarget(e.target.value)}
      style={{ flex: 1, minHeight: 46, borderRadius: 11, padding: '0 13px', background: '#FFFBF4', border: '1.5px solid #EDDFC9', fontSize: 16.5, fontWeight: 700, color: '#4A331C', boxSizing: 'border-box' }} />
  </div>
  {/* BOTTOM: EN native field */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: '#9C8467', width: 24, flex: 'none' }}>{nativeLabel}</span>
    <input value={native} onChange={(e) => onEditNative(e.target.value)}
      style={{ flex: 1, minHeight: 46, borderRadius: 11, padding: '0 13px', background: failed ? '#FFFBF4' : '#FFFBF4', border: failed ? '1.5px solid #DE5F4A' : '1.5px solid #EDDFC9', fontSize: 16.5, color: failed ? '#DE5F4A' : '#4A331C', boxSizing: 'border-box' }} />
  </div>
  {failed && <span style={{ fontSize: 12.5, fontWeight: 600, color: '#DE5F4A', marginLeft: 35 }}>Translation unavailable — enter manually.</span>}
</div>
```

---

### `src/components/daybreak/ac-banner.tsx` (new atom — ok/error banner)

**Analog:** `src/components/daybreak/card.tsx`

`Card` establishes the inline-style div-with-border pattern (`borderRadius: 22`, `border: '1px solid #F0E3CF'`, `boxShadow`). `ACBanner` is a narrower variant with semantic green/red colouring.

**Prop shape** (from design contract `daybreak-addcard.jsx` line 133):
```tsx
interface ACBannerProps {
  kind: "ok" | "error";
  children: React.ReactNode;
}
```

**Core pattern** (design contract `daybreak-addcard.jsx` lines 133-141):
```tsx
export function ACBanner({ kind, children }: ACBannerProps) {
  const ok = kind === "ok";
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, flex: 'none',
      background: ok ? '#EAF5EC' : '#FCEBE6',
      border: `1.5px solid ${ok ? '#C5E4CD' : '#F2C9BF'}` }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', flex: 'none',
        background: ok ? '#3E9B5F' : '#DE5F4A',
        color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
        {ok ? '✓' : '!'}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#4A331C' }}>{children}</span>
    </div>
  );
}
```

**Usage in translation-form.tsx:** `<ACBanner kind="ok">Card saved — add another.</ACBanner>` replaces the current `<p className="text-sm text-green-600 mt-2">Card saved.</p>` at line 277. The banner appears ABOVE the fields (layout change from current), per the `ACTypeScreen` board in `daybreak-addcard-boards.jsx`.

---

### `src/components/daybreak/ac-btn.tsx` (new atom — multi-variant button)

**Analog:** `src/components/daybreak/t-btn.tsx` (lines 1-33)

`TBtn` is always full-width, always primary, always `h-[50px]`. `ACBtn` needs four variants (primary, disabled, ghost, ghost-danger) and variable heights. The structure (prop interface extending `ButtonHTMLAttributes`, `<button>` element, token colours) is identical.

**Imports pattern** (copy from `t-btn.tsx` lines 1-3):
```tsx
import * as React from "react";
```

**Prop shape** (from design contract `daybreak-addcard.jsx` lines 173-179):
```tsx
interface ACBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: "primary" | "disabled" | "ghost" | "ghost-danger";
  icon?: React.ReactNode;
  // height controlled by className or explicit style — primary=54px, cancel=46px, secondary=42px
}
```

**Core pattern** (design contract `daybreak-addcard.jsx` lines 173-179 — production uses `<button>` per Pitfall 2):
```tsx
// Token map:
// primary:      bg '#F28A1F', color '#FFF', boxShadow '0 10px 22px rgba(242,138,31,0.30)', borderRadius 14
// disabled:     bg '#F4E7D2', color '#B49B78' (or use disabled attr + opacity)
// ghost:        bg '#FFFFFF', border '1.5px solid #EDDFC9', color '#4A331C'
// ghost-danger: bg '#FFFFFF', border '1.5px solid #DE5F4A', color '#DE5F4A'
// Height default: 54px; cancel button: 46px

export function ACBtn({ kind = "primary", icon, children, ...props }: ACBtnProps) {
  // Always <button type="button"> — never <div> (Pitfall 2)
  // kind="disabled" should use disabled attribute, not purely visual
}
```

**TBtn token inheritance** (`t-btn.tsx` lines 16-28):
```tsx
// TBtn uses Tailwind: "h-[50px] w-full rounded-[14px] bg-primary text-primary-foreground shadow-[var(--db-btn-shadow)]"
// ACBtn uses inline styles (same values) for exact token fidelity matching other new atoms
// --db-btn-shadow = '0 10px 22px rgba(242,138,31,0.30)' (verify in globals.css)
```

---

### `src/components/new-card-mode-toggle.tsx` (RESTYLE — shadcn Button → ACSeg + ACTop + ACContext)

**Analog:** `src/components/deck-switcher.tsx` (the canonical Phase 21 Daybreak client component pattern)

`DeckSwitcher` is the gold analog for a `"use client"` component that:
- Defines local glyph sub-components with inline Daybreak token styles
- Uses `useState` for UI state
- Renders a completely custom Daybreak-styled surface with no shadcn imports

**Before (current `new-card-mode-toggle.tsx` lines 1-8):**
```tsx
"use client";
import { useState } from "react";
import type { DeckOption } from "@/components/deck-switcher";
import { ImageUploadFlow } from "@/components/image-upload-flow";
import { TranslationForm } from "@/components/translation-form";
import { Button } from "@/components/ui/button";   // ← DELETE
```

**After (Daybreak imports):**
```tsx
"use client";
import { useState } from "react";
import type { DeckOption } from "@/components/deck-switcher";
import { ImageUploadFlow } from "@/components/image-upload-flow";
import { TranslationForm } from "@/components/translation-form";
import { ACSeg } from "@/components/daybreak/ac-seg";
import { ACTop } from "@/components/daybreak/ac-top";      // OR inline if small
import { ACContext } from "@/components/daybreak/ac-context"; // OR inline if small
// (ACTop and ACContext may be inlined here instead of separate files — planner's discretion)
```

**Before (current `new-card-mode-toggle.tsx` lines 28-43):**
```tsx
return (
  <div>
    <div className="flex gap-2 mb-6">
      <Button variant={mode === "type" ? "default" : "outline"} onClick={() => setMode("type")}>
        Type a word
      </Button>
      <Button variant={mode === "image" ? "default" : "outline"} onClick={() => setMode("image")}>
        From image    {/* ← D-07: change to "From an image" */}
      </Button>
    </div>
    {mode === "type" ? <TranslationForm ... /> : <ImageUploadFlow ... />}
  </div>
);
```

**After (Daybreak surface — design contract `daybreak-addcard.jsx` lines 82-93):**
```tsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    {/* ACTop: "‹ My deck" left link + "Add a Card" Baloo 2 title + right spacer */}
    <ACTop />
    {/* ACContext: LangChip EN → LangChip ES · "saves to your Spanish deck" */}
    <ACContext nativeLang={nativeLangLabel} targetLang={targetLangLabel} targetDeckName="Spanish deck" />
    {/* ACSeg: segmented toggle — "Type a word" | "From an image" */}
    <ACSeg mode={mode} onChange={setMode} />
    {/* Child mount */}
    {mode === "type" ? <TranslationForm ... /> : <ImageUploadFlow ... />}
  </div>
);
```

**ACTop prop shape** (design contract `daybreak-addcard.jsx` lines 82-93):
```tsx
// "‹ My deck" is a link to "/dashboard" (href="/dashboard")
// "Add a Card" title: fontFamily "var(--font-display)", fontSize 20, fontWeight 700
// data-testid="add-card-title" on the title span (L-06: e2e/09 + e2e/04 use getByText("Add a Card"))
```

**ACContext prop shape** (design contract `daybreak-addcard.jsx` lines 47-56):
```tsx
// LangChip (from deck-switcher.tsx local LangChip) for "EN" and "ES"
// Arrow: → (muted color #9C8467)
// "saves to your Spanish deck" — targetDeckName drives the bold part
// LangChip local definition in deck-switcher.tsx lines 14-37: copy or import (not currently a named export)
```

**LangChip reuse decision** (`deck-switcher.tsx` lines 14-37): The `LangChip` local function is NOT exported from `deck-switcher.tsx`. Options:
1. Extract to `src/components/daybreak/lang-chip.tsx` and import from both `deck-switcher.tsx` and new toggle
2. Re-implement inline in `new-card-mode-toggle.tsx` (same 23-line shape)

**Recommendation:** Option 1 — create `daybreak/lang-chip.tsx` so both Phase 22 components share the same chip without duplication.

---

### `src/components/translation-form.tsx` (RESTYLE — shadcn Input/Label/Button → ACField/ACBtn/ACBanner)

**Analog:** `src/components/translation-form.tsx` (self — behavior preserved; only JSX surface changes)

The reducer, debounce logic, `activeField.current` guard, and all state transitions are **unchanged**. The pattern is identical to how Phase 20/21 re-skins preserved reducers.

**Before → After transformation map:**

| Current element | Daybreak replacement | Location in file |
|-----------------|---------------------|-----------------|
| `<Link href="/dashboard">…<ArrowLeft />Back to my deck</Link>` | Remove — `ACTop` in `new-card-mode-toggle.tsx` wrapper | lines 202-207 |
| `<h1 className="text-xl font-semibold mb-6">Add a Card</h1>` | Remove — title is in `ACTop` | line 211 |
| `<Label htmlFor="native-input">{nativeLangLabel}</Label>` | `ACField label={nativeLangLabel}` | lines 217-229 |
| `<div className="bg-muted animate-pulse …">` (shimmer) | `ACField pending={true}` — amber bg + shimmer div + "Translating…" indicator | lines 218-221 |
| `<Input id="native-input" …>` | `ACField` internal `<input>` | lines 222-228 |
| `<p className="text-sm text-destructive">{state.translationError}</p>` | `ACField error={state.translationError}` prop on the field that received the error | lines 251-254 |
| `<Button className="w-full h-11" disabled={…} onClick={handleSave}>` | `<ACBtn kind={canSave ? "primary" : "disabled"}>Save card</ACBtn>` — `<button>` element | lines 258-274 |
| `<p className="text-sm text-green-600 mt-2">Card saved.</p>` | `<ACBanner kind="ok">Card saved — add another.</ACBanner>` — moved ABOVE fields | line 278 |
| `<p className="text-sm text-destructive mt-2">{state.saveError}</p>` | `<ACBanner kind="error">{state.saveError}</ACBanner>` | line 283 |

**ACField pending shimmer pattern** (design contract `daybreak-addcard.jsx` lines 144-159):
```tsx
// When pending (isNativeReceiving or isTargetReceiving):
// - background: '#FFF8EC' (amber wash)
// - header row shows spinning ACSpinner (13px) + "Translating…" in amber
// - field body: shimmer div (height:13, width:'62%', borderRadius:7) — use motion/react animate-pulse
// When value present: border '1.5px solid #F28A1F' (primary)
// When error: border '1.5px solid #DE5F4A'
// When idle/empty: border '1.5px solid #EDDFC9'
```

**ACLinkBadge** between fields (design contract `daybreak-addcard.jsx` lines 162-170):
```tsx
// Horizontal rule + swap circle between the two ACFields
// Swap circle: 34px disc, bg '#FFF1DC', border '1.5px solid #F0E3CF'
// ACSwap glyph inside (bidirectional arrows in amber)
// Clicking swap dispatches both SET_NATIVE and SET_TARGET to exchange values + re-triggers translate
```

**Copy changes** (RESEARCH.md verified):
- `"Card saved."` → `"Card saved — add another."` (banner, above fields)
- `"Translation unavailable. Enter manually."` → `"Translation unavailable — enter manually."` (em dash)

---

### `src/components/image-upload-flow.tsx` (RESTYLE + D-03 one-line guard)

**Analog:** `src/components/image-upload-flow.tsx` (self — behavior preserved; reducer untouched)

The reducer at lines 50-111 is **not restructured**. The step dispatch actions are **not changed**. The `handleExtract()` function at lines 194-271 is **not restructured** — only the D-03 guard is inserted.

**D-03 cancelled guard — exact pattern to add** (modeled on `review-list.tsx` lines 451, 490-492, 513):

Step 1 — Declare ref alongside `dropZoneRef` (after line 160):
```tsx
const cancelled = useRef(false);
```

Step 2 — Reset before each extraction attempt (inside `handleExtract()`, before line 196 `dispatch({ type: "EXTRACT_START" })`):
```tsx
cancelled.current = false;  // ← reset before each attempt (Pitfall 3)
```

Step 3 — Guard after `if (res.ok)` dispatch (after line 249):
```tsx
if (data.words.length === 0) {
  if (cancelled.current) return;  // ← D-03 late-result guard
  dispatch({ type: "EXTRACT_NO_WORDS" });
} else {
  if (cancelled.current) return;  // ← D-03 late-result guard
  dispatch({ type: "EXTRACT_SUCCESS", words: data.words });
}
```

Step 4 — Guard after error dispatch (after line 256):
```tsx
if (cancelled.current) return;  // ← also guard error path
dispatch({ type: "EXTRACT_ERROR", status: res.status, message: data.error ?? "Unknown error" });
```

Step 5 — Cancel handler (new function, called from `ACProgress`'s Cancel button):
```tsx
function handleCancelExtraction() {
  cancelled.current = true;
  dispatch({ type: "BACK_TO_PICK" });  // returns to Confirm with file+deck preserved (D-16)
}
```

**Surface transformation map:**

| Current state render | Daybreak replacement | Current lines |
|---------------------|---------------------|--------------|
| Step "pick" — `<ImageDropZone>` wrapper | Restyle `image-drop-zone.tsx` to `ACDrop` (separate component restyle) | 320-350 approx |
| Step "deck" idle — `<img preview> + <Label>Add words to:</Label> + <DeckSwitcher>` | `<ACThumb>` + `<ACDeckSelect>` (full-width field wrapping DeckSwitcher popover) — D-02 | lines 288-350 |
| Step "deck" extracting — `<Loader2> + disabled <DeckSwitcher> + disabled <Button>` | `<ACProgress title="Reading your image…" sub="…" searching={true}>` + Cancel → `handleCancelExtraction()` | lines 292-325 |
| No-words — `<ImageOff> + "No words found…"` | `LionFace` in sunrise disc + "No words found." copy | approx lines 326-345 |
| Extract error — error copy + Try again | `ACBanner kind="error"` + Try Again ghost `ACBtn` | approx lines 346-370 |

**D-02 ACDeckSelect wrapper pattern** (design contract `daybreak-addcard.jsx` lines 257-268):
```tsx
// ACDeckSelect is a TRIGGER wrapper around the existing DeckSwitcher popover.
// The cleanest approach: pass a custom trigger to DeckSwitcher via a prop, OR
// wrap DeckSwitcher in a Popover with ACDeckSelect as the PopoverTrigger.
// DeckSwitcher's existing props are unchanged:
interface DeckSwitcherProps {
  decks: DeckOption[];
  activeDeckId: string | null;
  onDeckChange: (id: string) => void;
  nativeLang: string;
}
// The full-width trigger renders:
// "Add words to" label (13px, fontWeight 700, color '#4A331C')
// 52px field row: LangChip + deck name + Chevron down
// Helper: "Defaults to your active deck · change it or create a new one" (12.5px muted)
// data-testid="confirm-deck-select" (NOT "deck-picker-trigger" which belongs to header DeckSwitcher)
```

---

### `src/components/review-list.tsx` (RESTYLE — multi-step shadcn → Daybreak)

**Analog:** `src/components/review-list.tsx` (self — behavior preserved; reducer at lines 100-438 untouched)

All `dispatch` calls, `handleCancel`, `handleNext`, `handleCommit`, `commitReviewRows`, `runTranslationFanOut`, `getSameLanguageDeckBackWords` — completely untouched.

**cancelled.current pattern** (already present at lines 451, 490-492, 513) — this is the source model for the D-03 guard in `image-upload-flow.tsx`. Do not modify it.

**Step-by-step surface transformation:**

| State/step | Current render | Daybreak replacement | Current lines |
|------------|---------------|---------------------|--------------|
| `loading-dedupe` | `<Loader2 animate-spin>` | `ACProgress title="Loading…" sub="" searching={false}` (or minimal spinner) | 575-583 |
| `step-a` — Review list | shadcn `<Button variant="ghost">` for Select all/none; `<Input>` for edit; plain `<div>` rows | `ACReviewRow` per kept word; muted struck-through chip rows for duplicates (`AlreadyLearnedRow`); "Translate N words" `ACBtn` primary | 585-650 approx |
| `translating` | `<Loader2> + "Translating N words…" + <Button variant="ghost">Cancel</Button>` | `<ACProgress title={\`Translating ${n} words…\`} sub="Almost there…" searching={false}>` + Cancel `ACBtn` ghost | 588-603 |
| `step-b` — Check translations | `<ReviewTranslationRow>` (native on top, target below) | `<ACPairRow>` (target ES on top, native EN below — D-01) | 608-670 |
| `step-b` — "Add N cards" button | `<Button variant="default">Add {n} cards</Button>` | `<ACBtn kind="primary">Add {n} cards</ACBtn>` | approx line 660 |
| `committing` | Disabled state with loader | `<ACProgress>` inline or disabled `ACBtn` with spinner | approx line 650-670 |
| `success` (addedCount > 0, failedCount = 0) | `<CheckCircle2> + plain text counts` | `LionFace` (size 72) in sunrise disc + "N cards added!" Baloo 2 heading + "Go to my deck" `ACBtn` | 680-730 approx |
| `success` (partial — failedCount > 0) | Same | `<Card>` with rows: Added (green ✓) / Already learned (muted –) / Couldn't add (red !) + two buttons | 680-730 approx |
| `success` (all failed) | Same | `<ACBanner kind="error">Couldn't add cards — please try again.</ACBanner>` + Try again / Back to deck buttons | 680-730 approx |

**AlreadyLearnedRow** (line 366) renders `line-through` muted text — maps to the "Already in your deck · skipped" struck-through chips in `ACReview`. Keep the same `duplicates` array source.

**"Next: translate" copy change** — current text for the `TRANSLATE_START` button is "Next: translate". Daybreak target is "Translate N words" with a right chevron icon and the count of `keptCount` words. This is a copy + presentation change to the button at the bottom of the `step-a` render.

**Field orientation flip in ACPairRow** (`review-list.tsx` lines ~620-640 current `ReviewTranslationRow`):
```tsx
// CURRENT (native on top):
// Row 1: nativeLangLabel field (nativeText)
// Row 2: targetLangLabel field (word)

// AFTER (target on top — D-01):
// Row 1: "ES" + target field (row.word)   ← was row 2
// Row 2: "EN" + native field (row.nativeText)  ← was row 1
// The onEditNative / onEditTarget callbacks dispatch EDIT_NATIVE / EDIT_TARGET — unchanged
```

---

### `src/app/(protected)/deck/new-card/page.tsx` (shell wrap — RSC)

**Analog:** `src/app/(protected)/dashboard/page.tsx` (Phase 21 RSC shell pattern)

Both are server components that:
- Call `auth.api.getSession({ headers: await headers() })`
- Use `Promise.all` for parallel data fetching
- Redirect on missing auth / 0 decks
- Wrap the client component root in a Daybreak background div

**Before (current `page.tsx` lines 46-57):**
```tsx
return (
  <div className="min-h-screen bg-background">
    <main className="px-8 py-8 max-w-4xl mx-auto w-full">
      <NewCardModeToggle ... />
    </main>
  </div>
);
```

**After (Daybreak full-bleed shell — pattern from `dashboard/page.tsx`):**
```tsx
return (
  <div className="min-h-screen bg-background flex flex-col items-center">
    <main className="w-full max-w-lg px-5 py-6 flex flex-col gap-0">
      <NewCardModeToggle ... />
    </main>
  </div>
);
```

The exact max-width and padding are the planner's discretion — match the phone-width feel of the Daybreak mock (the mock uses a phone shell; production uses a centered column). No behavior change. No prop change to `NewCardModeToggle`.

---

### `src/components/image-drop-zone.tsx` (RESTYLE — ACDrop Daybreak visual)

**Analog:** `src/components/deck-switcher.tsx` (for the inline-style component pattern)

This component is not in the CONTEXT.md file list but is a direct restyle target identified in RESEARCH.md. It receives the `ACDrop` Daybreak visual.

**Copy changes** (RESEARCH.md verified):
- `"Drop an image here"` → `"Upload a Photo"` (when not over) / `"Drop to upload"` (when dragOver)
- `"or click to browse, or paste a screenshot (Ctrl+V)"` → `"or browse your files · paste a screenshot (⌘V)"` (or cross-platform `Ctrl+V`)

**ACDrop visual** (design contract `daybreak-addcard.jsx` lines 182-197):
```tsx
// Dashed border: '2.5px dashed #E4D2B2' idle / '#F28A1F' dragOver / '#DE5F4A' error
// Background: '#FFFDF9' idle / '#FFF1D9' dragOver
// ACUpload glyph (amber upload arrow + tray)
// "Upload a Photo" — fontFamily "var(--font-display)", fontSize 20, fontWeight 700
// "or browse your files" link in '#C96F12' fontWeight 700
// "JPG · PNG · WebP" pill: bg '#FFF1DC', muted text, border-radius 999
```

---

## Shared Patterns

### Daybreak Token Inline Style
**Source:** `src/components/daybreak/card.tsx`, `src/components/daybreak/t-btn.tsx`, `src/components/deck-switcher.tsx`
**Apply to:** All 6 new atoms (`ac-seg`, `ac-progress`, `ac-review-row`, `ac-pair-row`, `ac-banner`, `ac-btn`)

All Phase 19-21 atoms use inline `style={{ … }}` with literal hex values matching the `d1` token object (RESEARCH.md "Daybreak Tokens" table). No Tailwind utility classes inside atoms — only the outer page shells use Tailwind semantic classes.

```tsx
// Token reference (verified from hifi-daybreak.jsx):
// bg: '#FFF6E9'         ink: '#4A331C'        muted: '#9C8467'
// primary: '#F28A1F'   link: '#C96F12'        green: '#3E9B5F'
// red: '#DE5F4A'        pillBg: '#FFF1DC'      pillText: '#B4762A'
// fieldBg: '#FFFBF4'   fieldBorder: '1.5px solid #EDDFC9'
// fieldRadius: 12       btnRadius: 14          cardRadius: 22
// font-display: 'var(--font-display)'  (Baloo 2, weight 700)
```

**Example from `card.tsx` lines 15-21:**
```tsx
style={{
  borderRadius: 22,
  background: "#FFFFFF",
  border: "1px solid #F0E3CF",
  boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
  boxSizing: "border-box",
}}
```

### Reducer-Preserved Restyle Pattern
**Source:** `src/components/review-list.tsx` (complete), `src/components/image-upload-flow.tsx` (complete)
**Apply to:** Both restyle targets (`translation-form.tsx`, `image-upload-flow.tsx`, `review-list.tsx`)

The pattern established in Phase 20/21: reducer, action types, dispatch calls, and server action calls are **not touched**. Only the JSX returned per state is replaced. The conditional render structure (`if (state.step === "deck") { ... }`) is preserved; only the JSX inside each branch changes.

```tsx
// Pattern (image-upload-flow.tsx lines 289-291):
if (state.step === "deck") {
  if (state.extracting) { return <ACExtracting ... >; }  // ← NEW JSX
  if (state.extractWords !== null && state.extractWords.length === 0) { return <ACNoWords ... >; }
  // etc.
}
```

### Motion/React Animation
**Source:** `src/components/study-session.tsx` lines 1-8 (`import { AnimatePresence, motion } from "motion/react"`)
**Apply to:** `ac-progress.tsx` (indeterminate bar), `translation-form.tsx` (shimmer field)

```tsx
// From study-session.tsx line 2:
import { AnimatePresence, motion } from "motion/react";

// ACProgress bar:
<motion.div
  animate={{ x: ['-100%', '100%'] }}
  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
  style={{ position: 'absolute', top: 0, bottom: 0, width: '42%', borderRadius: 7, background: '#F28A1F' }}
/>
// ACField shimmer: use motion.div with animate={{ opacity: [0.4, 1, 0.4] }} repeat(Infinity)
// or Tailwind animate-pulse on the shimmer div — either is acceptable (planner's discretion)
```

### cancelled.current Guard
**Source:** `src/components/review-list.tsx` lines 451, 490-492, 513
**Apply to:** `src/components/image-upload-flow.tsx` (D-03 addition)

```tsx
// Declare (review-list.tsx line 451):
const cancelled = useRef(false);

// Set on cancel (review-list.tsx lines 490-492):
function handleCancel() {
  cancelled.current = true;
  onCancel();
}

// Guard before dispatch (review-list.tsx line 513):
if (cancelled.current) return;
dispatch({ type: "TRANSLATE_ALL_DONE", rows: completedRows });

// ALSO reset before retry (not in review-list — needed in image-upload-flow because
// the same component instance handles multiple extraction attempts):
cancelled.current = false;  // before EXTRACT_START
```

### LangChip Sub-Component
**Source:** `src/components/deck-switcher.tsx` lines 14-37
**Apply to:** `src/components/daybreak/lang-chip.tsx` (extract), then import in `new-card-mode-toggle.tsx` and `deck-switcher.tsx`

```tsx
// Current deck-switcher.tsx lines 14-37 (local, not exported):
function LangChip({ code, size = 24 }: { code: string; size?: number }) {
  return (
    <span style={{
      width: size + 7, height: size, borderRadius: 6,
      background: "#FFF1DC", border: "1px solid #F0E3CF",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.46, fontWeight: 700, color: "#B4762A",
      letterSpacing: 0.3, flex: "none", boxSizing: "border-box",
    }}>{code}</span>
  );
}
// Extract to src/components/daybreak/lang-chip.tsx and export as named export.
// Update deck-switcher.tsx to import from there.
```

### e2e Selector Retargeting (L-06)
**Source:** RESEARCH.md "e2e Selector Audit" table
**Apply to:** `e2e/04-manual-card-entry.spec.ts`, `e2e/11-phase9-image-upload.spec.ts`

Critical retargets per RESEARCH.md:

| Spec | Line | Current | After |
|------|------|---------|-------|
| `04` | 51 | `getByText("Card saved")` | `getByText(/Card saved/)` |
| `11` | 22 | `getByRole("button", { name: "From image" })` | `getByRole("button", { name: "From an image" })` |
| `11` | 27,31,73 | `getByText("Drop an image here")` | `getByText("Upload a Photo")` |
| `11` | 64 | `toHaveClass(/max-h-64/)` | `toBeVisible()` only (remove class assertion) |
| `11` | 66 | `getByRole("button", { name: "Choose different image" })` | `getByRole("button", { name: "Change image" })` |
| `11` | 68,87,100 | `getByRole("button", { name: "Next: choose deck" })` | `getByRole("button", { name: "Extract words" })` |
| `11` | 72 | `getByRole("button", { name: "Remove selected image" })` | `getByRole("button", { name: "Remove" })` |
| `11` | 88 | `getByText("Add words to:")` | `getByText("Add words to")` |
| `11` | 97 | `getByRole("button", { name: "Back" })` | `getByRole("button", { name: "Re-pick" })` |

**data-testid additions needed:**
- `data-testid="add-card-title"` on the Baloo 2 "Add a Card" heading in `ACTop`
- `data-testid="confirm-deck-select"` on the `ACDeckSelect` full-width trigger (NOT "deck-picker-trigger")
- `data-testid="image-preview"` on the `ACThumb` image element
- `data-testid="file-error"` on the file-type error display in `ACDrop`

---

## No Analog Found

All files have analogs. No entries in this section.

---

## Metadata

**Analog search scope:** `src/components/daybreak/`, `src/components/`, `src/app/(protected)/`, `design/handoff-daybreak/daybreak-addcard.jsx`
**Files scanned:** 18
**Pattern extraction date:** 2026-06-22
