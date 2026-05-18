# Phase 9: Image Upload & Deck Selection - Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 7 (3 new components, 1 new lib module, 1 new test file, 1 server page modified, 1 server page structure reference)
**Analogs found:** 7 / 7

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/components/new-card-mode-toggle.tsx` | component (client wrapper) | request-response | `src/components/translation-form.tsx` | role-match (same client boundary pattern; different internal state) |
| `src/components/image-upload-flow.tsx` | component (client, state machine) | event-driven | `src/components/translation-form.tsx` | exact (same `useReducer` + interface + action-union + inline-error pattern) |
| `src/components/image-drop-zone.tsx` | component (client, sub-component) | event-driven | `src/components/translation-form.tsx` (Input/Label/Button usage) | role-match (no existing drop-zone; adopts primitives and lucide-react icon usage from TranslationForm) |
| `src/lib/image-validation.ts` | utility (pure function) | transform | `src/lib/wordlist.ts` (`filterWords`, `getCategories`) | role-match (same pure-export, no side effects, typed-result pattern) |
| `src/lib/image-validation.test.ts` | test | transform | `src/lib/wordlist.test.ts` | exact (same `describe`/`it`/`expect` structure, same import style, same Vitest setup) |
| `src/app/(protected)/deck/new-card/page.tsx` (modified) | route (server component) | request-response | itself (existing file, minimal change) | exact (surgery: swap `<TranslationForm …>` render for `<NewCardModeToggle …>`; all data-fetching logic unchanged) |
| `src/components/deck-switcher.tsx` | component (client, reused as-is) | CRUD | itself | exact (no change; used verbatim in Step 2 per D-10) |

---

## Pattern Assignments

### `src/components/new-card-mode-toggle.tsx` (client wrapper, request-response)

**Analog:** `src/components/translation-form.tsx`

**Role:** Thin `"use client"` wrapper that holds a single `useState` for the active mode (`"type" | "image"`), renders a two-button toggle, and conditionally renders `<TranslationForm>` or `<ImageUploadFlow>`. Receives all server-fetched props (decks, activeDeckId, nativeLang, nativeLangLabel, targetLangLabel, deckId, targetLang) and passes subsets to each child.

**Imports pattern** — copy from `src/components/translation-form.tsx` lines 1–11:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TranslationForm } from "@/components/translation-form";
import { ImageUploadFlow } from "@/components/image-upload-flow";
import type { DeckOption } from "@/components/deck-switcher";
```

**Props interface** — modelled on `TranslationFormProps` (lines 17–23 of translation-form.tsx):
```tsx
interface NewCardModeToggleProps {
  decks: DeckOption[];
  activeDeckId: string;
  nativeLang: string;
  nativeLangLabel: string;
  targetLangLabel: string;
  deckId: string;
  targetLang: string;
}
```

**Mode toggle UI pattern** (from UI-SPEC.md Interaction States > Mode Toggle):
```tsx
// Two-button pair: active = variant="default", inactive = variant="outline"
// This reuses the existing Button primitive — no Tab component needed
<div className="flex gap-2 mb-6">
  <Button
    variant={mode === "type" ? "default" : "outline"}
    onClick={() => setMode("type")}
  >
    Type a word
  </Button>
  <Button
    variant={mode === "image" ? "default" : "outline"}
    onClick={() => setMode("image")}
  >
    From image
  </Button>
</div>
```

**Conditional render pattern** — mirrors the page's existing single-component render:
```tsx
{mode === "type" ? (
  <TranslationForm
    deckId={deckId}
    nativeLang={nativeLang}
    targetLang={targetLang}
    nativeLangLabel={nativeLangLabel}
    targetLangLabel={targetLangLabel}
  />
) : (
  <ImageUploadFlow
    decks={decks}
    defaultDeckId={activeDeckId}
    nativeLang={nativeLang}
  />
)}
```

---

### `src/components/image-upload-flow.tsx` (client component, event-driven, 2-step state machine)

**Analog:** `src/components/translation-form.tsx`

**Role:** Owns all image-flow state (file, previewUrl, step, pickError, selectedDeckId) via `useReducer`. Composes `<ImageDropZone>` for Step 1 and a recap + `<DeckSwitcher>` for Step 2. Handles object URL lifecycle (create on pick, revoke on replace/clear/unmount).

**"use client" + imports pattern** — copy from `src/components/translation-form.tsx` lines 1–11:
```tsx
"use client";

import { ArrowLeft, X } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DeckSwitcher, type DeckOption } from "@/components/deck-switcher";
import { ImageDropZone } from "@/components/image-drop-zone";
import { validateImageFile } from "@/lib/image-validation";
```

**State interface + action union pattern** — copy structure directly from `src/components/translation-form.tsx` lines 26–50 (FormState interface + FormAction union):
```tsx
// State interface — same pattern as FormState in translation-form.tsx lines 26–33
interface ImageFlowState {
  step: "pick" | "deck";
  file: File | null;
  previewUrl: string | null;
  pickError: string | null;
  selectedDeckId: string;
}

// Action union — same discriminated union pattern as FormAction lines 36–50
type ImageFlowAction =
  | { type: "FILE_PICKED"; file: File; previewUrl: string }
  | { type: "FILE_ERROR"; message: string }
  | { type: "CLEAR_FILE" }
  | { type: "ADVANCE_STEP" }
  | { type: "BACK_TO_PICK" }
  | { type: "SET_DECK"; deckId: string };
```

**Reducer pattern** — copy skeleton from `src/components/translation-form.tsx` lines 62–99 (`formReducer`):
```tsx
function imageFlowReducer(
  state: ImageFlowState,
  action: ImageFlowAction,
): ImageFlowState {
  switch (action.type) {
    case "FILE_PICKED":
      return { ...state, file: action.file, previewUrl: action.previewUrl, pickError: null };
    case "FILE_ERROR":
      return { ...state, file: null, previewUrl: null, pickError: action.message };
    case "CLEAR_FILE":
      return { ...state, file: null, previewUrl: null, pickError: null, step: "pick" };
    case "ADVANCE_STEP":
      return state.file ? { ...state, step: "deck" } : state;
    case "BACK_TO_PICK":
      return { ...state, step: "pick" };
    case "SET_DECK":
      return { ...state, selectedDeckId: action.deckId };
    default:
      return state;
  }
}
```

**useReducer initialisation pattern** — copy from `src/components/translation-form.tsx` line 108:
```tsx
const [state, dispatch] = useReducer(imageFlowReducer, {
  step: "pick",
  file: null,
  previewUrl: null,
  pickError: null,
  selectedDeckId: defaultDeckId,
});
```

**Object URL lifecycle pattern** (RESEARCH.md Pattern 4 — no existing analog; browser API):
```tsx
// Track latest previewUrl in a ref so cleanup always revokes the current URL
// (avoids stale closure on unmount — RESEARCH.md A6)
const previewUrlRef = useRef<string | null>(null);
previewUrlRef.current = state.previewUrl;

useEffect(() => {
  return () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  };
}, []); // safety net: runs only on unmount

// On file pick — revoke old before creating new
const handleValidFile = useCallback((file: File) => {
  if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  const url = URL.createObjectURL(file);
  dispatch({ type: "FILE_PICKED", file, previewUrl: url });
}, []);

// On clear — revoke before dispatch
function handleClearFile() {
  if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  dispatch({ type: "CLEAR_FILE" });
}
```

**Inline error pattern** — copy exactly from `src/components/translation-form.tsx` lines 251–255:
```tsx
{state.pickError && (
  <p className="text-sm text-destructive mt-2">{state.pickError}</p>
)}
```

**Disabled-until-valid CTA pattern** — copy from `src/components/translation-form.tsx` lines 258–266 (Save button):
```tsx
<Button
  className="w-full h-11"
  variant="default"
  disabled={!state.file || !state.selectedDeckId}
  onClick={handleExtract}
>
  Extract words
</Button>
```

**Back navigation pattern** — copy from `src/components/translation-form.tsx` lines 202–208 (back link):
```tsx
// Step 2 back — dispatches instead of navigating, but uses same visual pattern
<Button
  variant="ghost"
  onClick={() => dispatch({ type: "BACK_TO_PICK" })}
  className="inline-flex items-center gap-1 text-sm text-muted-foreground"
>
  <ArrowLeft className="size-4" />
  Back
</Button>
```

**DeckSwitcher integration** — copy from `src/components/deck-switcher.tsx` lines 41–46 (props interface):
```tsx
<DeckSwitcher
  decks={decks}
  activeDeckId={state.selectedDeckId}
  onDeckChange={(id) => dispatch({ type: "SET_DECK", deckId: id })}
  nativeLang={nativeLang}
/>
```

**Step 2 recap thumbnail:**
```tsx
// Plain <img> — NOT next/image (blob URLs unsupported by next/image; RESEARCH.md Pitfall 5)
<img
  src={state.previewUrl ?? ""}
  alt="Selected image preview"
  className="max-h-32 w-auto object-contain rounded-md"
/>
```

---

### `src/components/image-drop-zone.tsx` (client sub-component, event-driven)

**Analog:** `src/components/translation-form.tsx` (Button/Label/Input/lucide-react usage); no drop-zone precedent exists in the codebase — this is net-new UI.

**"use client" + imports pattern:**
```tsx
"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
```

**Props interface:**
```tsx
interface ImageDropZoneProps {
  onFileSelect: (file: File) => void;   // called for click, drag, paste
  onPaste: (file: File) => void;         // document-level paste; may be same handler
  error: string | null;                  // displayed below zone
}
```

**Hidden file input + ref pattern** (no codebase analog; standard browser pattern — see RESEARCH.md Pattern 3a):
```tsx
const inputRef = useRef<HTMLInputElement>(null);

// Trigger picker from zone click or "Choose different image" button
function openPicker() {
  inputRef.current?.click();
}

// Reset value after clear so same-file re-select fires onChange (RESEARCH.md Pitfall 2)
function resetInput() {
  if (inputRef.current) inputRef.current.value = "";
}

<input
  ref={inputRef}
  type="file"
  accept="image/jpeg,image/png,image/webp"
  className="sr-only"
  aria-label="Upload image"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }}
/>
```

**Drop zone ARIA + keyboard pattern** (UI-SPEC.md Accessibility Contract):
```tsx
<div
  role="button"
  tabIndex={0}
  aria-label="Select image file — click, drag and drop, or paste from clipboard"
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") openPicker();
  }}
  onClick={openPicker}
  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
  onDragLeave={() => setIsDragOver(false)}
  onDrop={(e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }}
  className={`
    border-2 border-dashed rounded-xl min-h-32
    flex flex-col items-center justify-center gap-2 p-4
    cursor-pointer transition-colors
    ${isDragOver
      ? "border-primary bg-muted"
      : "border-border bg-background"}
  `}
>
  <Upload className="size-8 text-muted-foreground" />
  <p className="text-sm font-medium">Drop an image here</p>
  <p className="text-sm text-muted-foreground">
    or click to browse, or paste a screenshot (Ctrl+V)
  </p>
</div>
```

**isDragOver local state** — same pattern as `DeckSwitcher`'s `showPicker` / `creatingLang` local states (`src/components/deck-switcher.tsx` lines 47–49):
```tsx
const [isDragOver, setIsDragOver] = useState(false);
```

**Inline error pattern** — copy from `src/components/translation-form.tsx` lines 251–255:
```tsx
{error && (
  <p className="text-sm text-destructive mt-2">{error}</p>
)}
```

---

### `src/lib/image-validation.ts` (utility, pure function, transform)

**Analog:** `src/lib/wordlist.ts` (pure named exports, no side effects, typed results)

**Module structure pattern** — copy from `src/lib/wordlist.ts` lines 36–50 (`filterWords`, `getCategories`): named exports, no default export, no framework imports, pure computation.

```typescript
// No "use client" or "use server" — plain TypeScript module
// No framework imports — browser-agnostic pure function (works in Node for tests)

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 242 880 bytes

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_TYPES.has(file.type)) {
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "unknown format";
    return {
      ok: false,
      message: `JPG, PNG, or WebP only — that file is a ${ext}. Please choose a supported format.`,
    };
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      message: `That image is ${mb}MB — please pick one under 5MB.`,
    };
  }
  return { ok: true };
}
```

**Why pure / no imports:** `wordlist.ts` `filterWords` and `getCategories` are synchronous pure functions with no imports beyond types — the identical pattern here. Validated File objects are available in Node 20+ (WHATWG File API) so the node Vitest environment can construct them without a browser.

---

### `src/lib/image-validation.test.ts` (test, transform)

**Analog:** `src/lib/wordlist.test.ts` (exact match — same Vitest setup, same `describe`/`it`/`expect` structure, same relative import style)

**Import block pattern** — copy from `src/lib/wordlist.test.ts` lines 1–3:
```typescript
import { describe, expect, it } from "vitest";
import { validateImageFile } from "@/lib/image-validation";
```

**describe/it/expect structure** — copy from `src/lib/wordlist.test.ts` lines 14–30 (`describe("getWordList", ...)`):
```typescript
describe("validateImageFile — type validation", () => {
  it("accepts image/jpeg", () => {
    const file = new File([], "photo.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("accepts image/png", () => {
    const file = new File([], "photo.png", { type: "image/png" });
    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("accepts image/webp", () => {
    const file = new File([], "photo.webp", { type: "image/webp" });
    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("rejects image/heic and names the extension in the message", () => {
    const file = new File([], "photo.heic", { type: "image/heic" });
    const result = validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("HEIC");
  });

  it("rejects image/gif", () => {
    const file = new File([], "anim.gif", { type: "image/gif" });
    expect(validateImageFile(file)).toMatchObject({ ok: false });
  });
});

describe("validateImageFile — size validation", () => {
  const FIVE_MB = 5 * 1024 * 1024;

  it("accepts a file at exactly 5MB", () => {
    const file = new File([new Uint8Array(FIVE_MB)], "ok.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("rejects a file over 5MB and names the size in the message", () => {
    const file = new File([new Uint8Array(FIVE_MB + 1)], "big.jpg", { type: "image/jpeg" });
    const result = validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/MB/);
  });

  it("rejects a 7.3MB file and shows correct rounded size", () => {
    const file = new File(
      [new Uint8Array(Math.round(7.3 * 1024 * 1024))],
      "big.jpg",
      { type: "image/jpeg" },
    );
    const result = validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("7.3MB");
  });
});
```

**Vitest run command** (from `vitest.config.ts` and RESEARCH.md Validation Architecture):
```
npx vitest run src/lib/image-validation.test.ts
```

---

### `src/app/(protected)/deck/new-card/page.tsx` (modified, server component)

**Analog:** itself — surgical change only.

**What changes** (lines 3 and 49–55 of the current file):

Remove:
```tsx
import { TranslationForm } from "@/components/translation-form";
// ...
<TranslationForm
  deckId={activeDeck.id}
  nativeLang={nativeLang}
  targetLang={activeDeck.language}
  nativeLangLabel={nativeLangLabel}
  targetLangLabel={targetLangLabel}
/>
```

Add:
```tsx
import { NewCardModeToggle } from "@/components/new-card-mode-toggle";
// ...
<NewCardModeToggle
  decks={decks}
  activeDeckId={activeDeck.id}
  nativeLang={nativeLang}
  nativeLangLabel={nativeLangLabel}
  targetLangLabel={targetLangLabel}
  deckId={activeDeck.id}
  targetLang={activeDeck.language}
/>
```

**All server-side logic (lines 1–46) is untouched:** session fetch, `Promise.all`, `activeDeck` computation, `redirect` guards, `LANGUAGE_LABELS` map — copied verbatim. The page layout wrapper (`min-h-screen bg-background` / `px-8 py-8 max-w-4xl mx-auto w-full`) at lines 47–58 is also untouched.

---

## Shared Patterns

### "use client" declaration
**Source:** `src/components/translation-form.tsx` line 1; `src/components/deck-switcher.tsx` line 1
**Apply to:** `new-card-mode-toggle.tsx`, `image-upload-flow.tsx`, `image-drop-zone.tsx`
```tsx
"use client";
```
Note: `src/lib/image-validation.ts` gets NO directive — it is a plain TypeScript module usable in both environments.

### Lucide-react icon import pattern
**Source:** `src/components/translation-form.tsx` line 3; `src/components/deck-switcher.tsx` line 3
**Apply to:** `image-upload-flow.tsx` (ArrowLeft, X), `image-drop-zone.tsx` (Upload)
```tsx
import { ArrowLeft, X } from "lucide-react";      // image-upload-flow.tsx
import { Upload } from "lucide-react";              // image-drop-zone.tsx
```
Icon sizing convention: `className="size-4"` (16px) for inline-text icons, `className="size-8"` (32px) for standalone display icons. Source: `translation-form.tsx` line 3 (`ArrowLeft className="size-4"`) and `deck-switcher.tsx` line 3 (`Loader2`, `Plus`).

### @/ path alias imports
**Source:** All existing files — `@/components/ui/button`, `@/lib/deck-actions`, etc.
**Apply to:** All new files.
```tsx
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
```
No relative `../` imports. Alias `@` maps to `src/` per `vitest.config.ts` line 9 and tsconfig.

### Inline destructive error display
**Source:** `src/components/translation-form.tsx` lines 251–255 (`translationError`), lines 282–284 (`saveError`)
**Apply to:** `image-upload-flow.tsx` (pickError below drop zone), `image-drop-zone.tsx` (error prop)
```tsx
{errorMessage && (
  <p className="text-sm text-destructive mt-2">{errorMessage}</p>
)}
```

### Disabled-until-valid primary CTA
**Source:** `src/components/translation-form.tsx` lines 258–274 (Save button, `disabled={!nativeText.trim() || !targetText.trim() || isSaving}`)
**Apply to:** `image-upload-flow.tsx` Extract button (Step 2)
```tsx
<Button
  className="w-full h-11"
  variant="default"
  disabled={!state.file || !state.selectedDeckId}
  onClick={handleExtract}
>
  Extract words
</Button>
```
Note `h-11` — copy from `translation-form.tsx` line 259; `w-full` — same line. This matches the UI-SPEC.md Step 2 Extract CTA spec.

### Local state for UI-only flags
**Source:** `src/components/deck-switcher.tsx` lines 47–49 (`useState<string | null>`, `useState(false)`, `useState<string | null>`)
**Apply to:** `image-drop-zone.tsx` (`isDragOver` boolean), `new-card-mode-toggle.tsx` (`mode` string union)
```tsx
const [isDragOver, setIsDragOver] = useState(false);          // image-drop-zone
const [mode, setMode] = useState<"type" | "image">("type");   // new-card-mode-toggle
```

### Inline error for DeckSwitcher
**Source:** `src/components/deck-switcher.tsx` line 153 (`{error && <span className="text-xs text-destructive">`)
**Apply to:** `image-upload-flow.tsx` — if DeckSwitcher propagates its own error, leave it to DeckSwitcher's internal rendering (no wrapper needed).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Drop zone drag-and-drop event handling | (within `image-drop-zone.tsx`) | event-driven | No drag-and-drop UI exists anywhere in the codebase. Pattern sourced from RESEARCH.md Pattern 3b (standard browser DragEvent API). |
| `URL.createObjectURL` preview lifecycle | (within `image-upload-flow.tsx`) | event-driven | No file-preview pattern exists. Pattern sourced from RESEARCH.md Pattern 4 (browser File API standard). |
| Document-level paste listener (`useEffect` + `addEventListener`) | (within `image-drop-zone.tsx` or `image-upload-flow.tsx`) | event-driven | No clipboard-paste pattern in codebase. Pattern sourced from RESEARCH.md Pattern 3c. |

All three gaps are browser-native API patterns documented in RESEARCH.md — no library needed.

---

## Metadata

**Analog search scope:** `src/components/`, `src/lib/`, `src/app/(protected)/deck/new-card/`
**Files read:** 7 source files (`translation-form.tsx`, `deck-switcher.tsx`, `new-card/page.tsx`, `wordlist.ts`, `wordlist.test.ts`, `study-engine.test.ts` header, `utils.ts`, `vitest.config.ts`)
**Pattern extraction date:** 2026-05-18
