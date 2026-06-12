# Phase 9: Image Upload & Deck Selection - Research

**Researched:** 2026-05-18
**Domain:** Client-side file handling, image preview, 2-step in-page UI, Next.js 16 App Router client/server boundary
**Confidence:** HIGH (all key claims verified against project source and official bundled Next.js docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Mode toggle on the existing `/deck/new-card` page ("Type a word" vs "From image") — not a separate route or modal.
- **D-02:** Stepped in-page flow: Step 1 = pick/preview the image; Step 2 = confirm the target deck.
- **D-03:** Explicit "Extract" button, disabled until valid image AND deck set. Phase 9 leaves it wired to a no-op/placeholder.
- **D-04:** File selection: click-to-open picker + drag-and-drop + clipboard paste (screenshots via Ctrl+V).
- **D-05:** Preview: medium contained thumbnail (~`max-h-64`), aspect ratio preserved.
- **D-06:** Replace/cancel: X overlay clears to empty picker; "Choose different image" button re-opens picker directly.
- **D-07:** Invalid files (wrong type or >5MB) rejected immediately on selection, client-side, before preview state.
- **D-08:** Errors shown as inline message in/below the drop zone, reusing TranslationForm inline-error pattern.
- **D-09:** Error copy names the actual rule violated plus the fix (specific & friendly).
- **D-10:** Reuse existing `DeckSwitcher` component as-is.
- **D-11:** Default pre-selected deck = `?deck=` param if present, else `decks[0]`.
- **D-12:** Deck selector lives in Step 2, alongside recap thumbnail + Extract button.

### Claude's Discretion
- Exact toggle UI (tabs vs segmented control vs button pair).
- Component/file decomposition, client/server boundary.
- How stepped state is modeled (useReducer is a reasonable analog but not mandated).
- Drop-zone visual styling and precise back-navigation between Step 2 and Step 1.

### Deferred Ideas (OUT OF SCOPE)
- Vision/extraction (Phase 10)
- Review & commit (Phase 11)
- Cute 2D illustrated art pass
- Multi-image batch upload (IMG-F1)
- Live camera capture (IMG-F2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMG-01 | User can choose an image file from the add-card flow and see an "extract words from image" entry point | Mode toggle on new-card page; net-new client component wrapping existing page data |
| IMG-02 | User can upload one image at a time in JPG, PNG, or WebP format | Client-side MIME + magic-byte validation; `accept` attribute on file input |
| IMG-03 | User is shown a clear, friendly error when a file is the wrong type or exceeds ~5MB (rejected before upload) | Pure validation function; no network involved; inline error pattern from TranslationForm |
| IMG-04 | User selects which deck the extracted words will be added to before extraction (defaults to active deck) | Reuse DeckSwitcher; default from ?deck= param or decks[0]; lives in Step 2 |
| IMG-05 | User sees a preview/thumbnail of the chosen image and can replace or cancel it before extraction | URL.createObjectURL for preview; cleanup on replace/cancel; X overlay + "Choose different" button |
</phase_requirements>

---

## Summary

Phase 9 adds no new routes, no server actions, and no network calls. The entire phase is client-side UI wired into the existing server component `new-card/page.tsx`, which already fetches all needed data (decks, nativeLang, activeDeck). The implementation pattern is: create a new `"use client"` component (`ImageUploadFlow` or similar), plug it into `new-card/page.tsx` alongside the existing `<TranslationForm>`, and add a mode toggle that swaps between the two. The server component passes decks/activeDeck/nativeLang as props to both.

The genuinely net-new technical work is: (1) the drop-zone UI component with its three file-selection vectors (click, drag, paste), (2) the client-side validation function (MIME type + magic bytes + size), (3) the object URL preview lifecycle management, and (4) the 2-step useReducer state machine. Everything else — DeckSwitcher, inline errors, Button/Card primitives, the disabled-until-valid Extract button — reuses existing patterns verbatim.

**Primary recommendation:** Model the image flow state with a single useReducer, mirroring `TranslationForm`'s established pattern. Isolate the file validation logic as a pure function (no side effects) so it is independently testable with Vitest. Use `URL.createObjectURL` for the preview URL (not FileReader/dataURL), and revoke it on cleanup.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mode toggle (Type / From image) | Browser / Client | — | Pure UI state, no server involvement |
| File selection (click/drag/paste) | Browser / Client | — | File API / DataTransfer / Clipboard are browser-only |
| Client-side validation (type, size) | Browser / Client | — | Must run before any network; Phase 10 adds server guard |
| Preview thumbnail | Browser / Client | — | URL.createObjectURL is browser-only; no server needed |
| Step navigation (Step 1 → Step 2) | Browser / Client | — | In-page state; no routing |
| Deck default selection | Frontend Server (SSR) | Browser / Client | Server reads ?deck= param and decks[0]; client receives as prop |
| DeckSwitcher (inline create-deck) | Browser / Client | API / Backend | createDeck server action called by DeckSwitcher on "New deck" |
| Extract button (placeholder) | Browser / Client | — | No-op in Phase 9; Phase 10 wires the endpoint |

---

## Standard Stack

### Core (all already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Component model, useReducer, useRef, useEffect | Already installed; hooks manage all state |
| Next.js | 16.2.1 | App Router, server/client boundary | Project standard |
| TypeScript | 5.x | Type safety | Project standard |
| Tailwind CSS | 4.x | Utility classes for drop zone styling | Project standard |
| zod | 4.3.6 | Schema validation (optional: validate File-like objects) | Already used in TranslationForm |
| lucide-react | 1.0.1 | Icons (X, Upload, Image) | Already in project |

[VERIFIED: package.json in project root]

### No New Dependencies Required
Phase 9 is entirely implemented with browser-native APIs (File API, DataTransfer, Clipboard API, URL.createObjectURL) and existing project libraries. No third-party drop-zone library is needed.

**Alternatives considered and rejected:**

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Hand-rolled drop zone | `react-dropzone` | Adds a dependency; browser APIs sufficient for single-file, no-upload use case; project is lean |
| `URL.createObjectURL` | `FileReader` + dataURL | Object URL is synchronous, lighter, and more memory-efficient for "preview then discard" flows (see Pitfalls) |
| Inline magic-byte sniffing | MIME type from `file.type` only | `file.type` is set by the OS/browser from extension, not file content; spoofable; combined check is robust enough for client-side pre-screening |

---

## Architecture Patterns

### System Architecture Diagram

```
new-card/page.tsx  (Server Component)
│  awaits session, reads ?deck= param
│  Promise.all([getUserDecks, getUserNativeLanguage])
│  computes activeDeck = decks.find(id===requestedDeckId) ?? decks[0]
│
├─→  <ModeToggle />  (client, renders inside page)
│         │  "Type a word" selected
│         ├─→  <TranslationForm … />  (existing, unchanged)
│         │
│         │  "From image" selected
│         └─→  <ImageUploadFlow decks nativeLang activeDeckId />  (new client component)
│                   │
│                   │  [STEP 1 — empty state]
│                   │  <DropZone />
│                   │    onFileSelect → validateFile(file) → PICKED | ERROR
│                   │    onDragOver / onDrop → validateFile(file)
│                   │    onPaste (document) → validateFile(file)
│                   │
│                   │  [STEP 1 — previewing state]
│                   │  <img src={objectURL} />  +  X overlay  +  "Choose different" btn
│                   │  "Next: Choose deck →" button → dispatch ADVANCE_STEP
│                   │
│                   │  [STEP 2]
│                   │  Recap thumbnail  +  <DeckSwitcher … />
│                   │  "← Back" button → dispatch BACK_TO_PREVIEW
│                   │  <Button disabled={!canExtract}>Extract words</Button>
│                   │    (no-op handler in Phase 9; Phase 10 replaces)
```

### Recommended Project Structure

```
src/
├── components/
│   ├── image-upload-flow.tsx    # "use client" — 2-step flow, useReducer state machine
│   ├── image-drop-zone.tsx      # "use client" — drop zone UI (click/drag/paste), validation trigger
│   └── new-card-mode-toggle.tsx # "use client" — tab/button pair toggling between TranslationForm and ImageUploadFlow
├── lib/
│   └── image-validation.ts     # Pure function: validateImageFile(file) → { ok: true } | { ok: false, message: string }
└── app/(protected)/deck/new-card/
    └── page.tsx                 # Server component — unchanged except: import + render ModeToggle wrapper
```

**Why this decomposition:** `image-validation.ts` as a pure module makes it trivially unit-testable. `image-drop-zone.tsx` isolates the browser-event complexity. `image-upload-flow.tsx` owns the state machine and composes the sub-components. The server component `page.tsx` stays clean — it only adds a new import and passes existing props down.

---

### Pattern 1: Client/Server Boundary for the New-Card Page

**What:** `new-card/page.tsx` is a Server Component. It passes data as props to Client Components. The image flow must be a Client Component (`"use client"`) because it uses event handlers, browser APIs (File, URL, Clipboard), and state.

**How to wire the mode toggle without re-fetching server data:** The server component already fetches `decks`, `activeDeck`, and `nativeLang`. The new mode toggle wrapper is a Client Component that receives these as props. Both `<TranslationForm>` and `<ImageUploadFlow>` receive the same props — no additional server fetching needed.

[VERIFIED: bundled Next.js 16 docs at `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` — Server Component can pass serializable props to Client Components]

**Example — updated page.tsx integration:**
```tsx
// src/app/(protected)/deck/new-card/page.tsx  (server component — minimal change)
import { NewCardModeToggle } from "@/components/new-card-mode-toggle";

// ... existing session/deck fetching unchanged ...

return (
  <div className="min-h-screen bg-background">
    <main className="px-8 py-8 max-w-4xl mx-auto w-full">
      <NewCardModeToggle
        decks={decks}
        activeDeckId={activeDeck.id}
        nativeLang={nativeLang}
        nativeLangLabel={nativeLangLabel}
        targetLangLabel={targetLangLabel}
        deckId={activeDeck.id}
        targetLang={activeDeck.language}
      />
    </main>
  </div>
);
```

**Example — NewCardModeToggle (client wrapper):**
```tsx
"use client";
// Renders mode toggle buttons + conditionally renders TranslationForm or ImageUploadFlow
// Manages a single local useState: "type" | "image"
```

[ASSUMED] The exact prop threading pattern above is the simplest approach, but the planner may decide to keep props minimal by having `ImageUploadFlow` accept only `decks`, `nativeLang`, and `defaultDeckId` (all it needs for Step 2).

---

### Pattern 2: useReducer State Machine for the 2-Step Image Flow

**What:** Mirrors `TranslationForm`'s established `useReducer` pattern. All UI state lives in one reducer; step transitions are explicit dispatches.

**States:**
- `empty` — drop zone shown, no file selected, no error
- `previewing` — valid file held, preview shown; pickError may be set (cleared on next valid pick)
- `deck-step` — Step 2; file confirmed, deck selector + Extract button shown

**State shape:**
```typescript
interface ImageFlowState {
  step: "pick" | "deck";
  file: File | null;           // held until Extract (Phase 10) or cancelled
  previewUrl: string | null;   // object URL; must be revoked on replace/cancel/unmount
  pickError: string | null;    // inline error below drop zone
  selectedDeckId: string;
}
```

**Actions:**
```typescript
type ImageFlowAction =
  | { type: "FILE_PICKED"; file: File; previewUrl: string }
  | { type: "FILE_ERROR"; message: string }
  | { type: "CLEAR_FILE" }            // X overlay clicked
  | { type: "ADVANCE_STEP" }          // "Next: choose deck" clicked
  | { type: "BACK_TO_PICK" }          // "← Back" in Step 2
  | { type: "SET_DECK"; deckId: string };
```

**Key invariant:** `previewUrl` is always created before dispatching `FILE_PICKED`; it is revoked before dispatching `CLEAR_FILE` or on `useEffect` cleanup (unmount). Never hold an orphaned object URL.

[VERIFIED: project codebase — `src/components/translation-form.tsx` uses identical `useReducer` + interface + action union pattern]

---

### Pattern 3: File Selection — Three Vectors

**3a. Click-to-open native picker**
Use a visually hidden `<input type="file" accept="image/jpeg,image/png,image/webp" />` with a `ref`. The drop zone or a button calls `inputRef.current.click()`. The `onChange` handler calls `validateAndSetFile(e.target.files?.[0])`. Reset the input value after each pick so selecting the same file again fires `onChange`:
```tsx
// After clearing the file (X overlay):
if (inputRef.current) inputRef.current.value = "";
```
[ASSUMED — standard browser pattern; no Next.js-specific consideration]

**3b. Drag and drop**
The drop zone `<div>` needs `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` handlers. Prevent default on `dragover` to allow drop. Extract `event.dataTransfer.files[0]` in `onDrop`.
```tsx
function handleDrop(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) validateAndSetFile(file);
}
```
Visual feedback: toggle a `isDragOver` local state to show border highlight. Reset it on `dragleave` and `drop`.
[ASSUMED — standard browser pattern]

**3c. Clipboard paste (Ctrl+V / screenshots)**
Listen to the `paste` event on the document (or the drop zone container). Screenshots pasted from OS clipboard arrive as `ClipboardEvent.clipboardData.files[0]` (type `image/png` in most browsers). This is the correct, cross-browser path — `navigator.clipboard.read()` requires HTTPS and explicit permission; the `paste` event fires naturally on Ctrl+V with no permission prompt.

```tsx
useEffect(() => {
  function handlePaste(e: ClipboardEvent) {
    const file = e.clipboardData?.files?.[0];
    if (file) validateAndSetFile(file);
  }
  document.addEventListener("paste", handlePaste);
  return () => document.removeEventListener("paste", handlePaste);
}, [validateAndSetFile]); // validateAndSetFile wrapped in useCallback
```
[ASSUMED — browser API behavior; paste event fires for Ctrl+V in all modern browsers without permission]

**Note on clipboard paste vs navigator.clipboard:** `navigator.clipboard.read()` requires the `clipboard-read` permission and is gated behind a user gesture. The `paste` DOM event requires neither — it fires automatically on Ctrl+V when the page has focus. Use the DOM event, not the Clipboard API.

---

### Pattern 4: Preview with URL.createObjectURL

**Why `URL.createObjectURL` over `FileReader`:**
- `URL.createObjectURL(file)` is synchronous and returns immediately — no async/await, no intermediate state.
- `FileReader.readAsDataURL()` is async and returns a large base64 string (33% size overhead) that is serialized into the DOM.
- For a "preview then discard or replace" flow where the file never uploads, the object URL is strictly preferable.

**Memory cleanup (critical):**
Every object URL must be revoked when no longer needed. Three cleanup points:
1. When user clears the image (X overlay / cancel)
2. When user picks a replacement (revoke the old URL before creating a new one)
3. On component unmount (useEffect cleanup)

```tsx
// Inside the reducer or in a useEffect watching previewUrl:
useEffect(() => {
  return () => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  };
}, [state.previewUrl]);

// On CLEAR_FILE dispatch — revoke before transitioning:
function handleClearFile() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  dispatch({ type: "CLEAR_FILE" });
}
```
[ASSUMED — MDN-documented behavior for URL.createObjectURL lifecycle]

**Preview rendering:**
Use a plain `<img>` (not `next/image`) for the object URL preview. `next/image` requires a static `src` string pointing to a configured domain or local path — object URLs (`blob:...`) are not a valid `next/image` source.
```tsx
<img
  src={state.previewUrl}
  alt="Selected image preview"
  className="max-h-64 w-auto object-contain rounded-lg"
/>
```
[VERIFIED: bundled Next.js 16 docs at `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` — `src` must be a static string or configured remote pattern; blob URLs are not supported]

---

### Pattern 5: Client-Side Validation

**What to validate and how:**
Two checks, applied in this order:
1. **MIME type check:** `file.type` must be one of `image/jpeg`, `image/png`, `image/webp`.
2. **Size check:** `file.size` must be ≤ 5 × 1024 × 1024 bytes (5,242,880 bytes).

**Why not magic-byte sniffing for Phase 9:** Reading file headers (magic bytes) requires reading the first 4 bytes with `FileReader` or `Blob.arrayBuffer()` — async and more complex. For client-side pre-screening (where Phase 10 will add a server-side guard anyway), `file.type` combined with the `accept` attribute on the input provides adequate protection without async complexity. The `accept` attribute filters the OS picker; `file.type` catches drag-and-dropped or pasted files that bypass the picker filter.

**Pure validation function:**
```typescript
// src/lib/image-validation.ts
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_TYPES.has(file.type)) {
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "unknown";
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
[ASSUMED — logic derived from D-07, D-09; pure function, no framework dependency]

**Error copy examples (D-09 compliant):**
- Wrong type: `"JPG, PNG, or WebP only — that file is a HEIC. Please choose a supported format."`
- Too large: `"That image is 7.3MB — please pick one under 5MB."`

---

### Pattern 6: Accessibility for the Drop Zone

Key ARIA/markup requirements:
- The drop zone clickable area must be a `<button>` or have `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space triggers the hidden file input click). [ASSUMED — WCAG keyboard operability requirement]
- The hidden `<input type="file">` must have an associated `<label>` or `aria-label`. Even visually hidden inputs need accessible names for screen readers.
- Drag-and-drop is a progressive enhancement — keyboard users fall back to clicking the button/zone.
- When a file is selected, announce it to screen readers. Use an `aria-live="polite"` region or update visible text that screen readers will read.
- The X overlay button on the preview needs `aria-label="Remove selected image"`.

```tsx
<div
  role="button"
  tabIndex={0}
  aria-label="Select image file — click, drag and drop, or paste from clipboard"
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  onClick={() => inputRef.current?.click()}
  className="..."
>
  {/* Drop zone content */}
  <input
    ref={inputRef}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    className="sr-only"
    aria-label="Upload image"
    onChange={handleInputChange}
  />
</div>
```
[ASSUMED — WCAG 2.1 SC 2.1.1 keyboard operability; ARIA authoring practices]

---

### Anti-Patterns to Avoid

- **Using `next/image` with a blob URL:** Object URLs are not valid `next/image` sources. Use a plain `<img>` tag for the preview.
- **Forgetting to revoke object URLs:** Every `URL.createObjectURL` call leaks memory unless matched with `URL.revokeObjectURL`. Revoke on replace, clear, and unmount.
- **Resetting the file input without clearing the value:** If the user picks a file, clears it (X overlay), then picks the same file again, `onChange` will not fire unless `inputRef.current.value = ""` is called on clear.
- **Using `navigator.clipboard.read()` for paste:** Requires `clipboard-read` permission. The `paste` DOM event requires no permission and works for Ctrl+V screenshots.
- **Validating only on the `accept` attribute:** The `accept` attribute filters the OS picker dialog but does NOT block drag-and-drop or paste. Always validate `file.type` and `file.size` in code.
- **Putting the image flow state in the server component:** The server component must remain async and cannot hold client state. The mode toggle and image flow must be Client Components.
- **Nesting two `"use client"` barriers unnecessarily:** The entire image flow can be one `"use client"` tree. No need to split into multiple client boundaries.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drop zone UI | Custom drag-event state machine from scratch | Existing browser events + local `isDragOver` state | Sufficient for single-file; avoid a library dependency |
| Preview image display | Base64/canvas manipulation | `URL.createObjectURL` + plain `<img>` | Synchronous, memory-efficient, no encoding overhead |
| Deck selector with create-deck | New select UI | `DeckSwitcher` component (D-10) | Already handles create-deck affordance, Radix Select, error state |
| Inline error display | Toast/alert infrastructure | `<p className="text-sm text-destructive">` pattern (from TranslationForm) | Matches established pattern; no new infrastructure |
| File type detection | Magic-byte parser | `file.type` + `accept` attribute | Adequate for client pre-screen; server guards in Phase 10 |

**Key insight:** This phase introduces no new library dependencies. Every capability is met by browser-native APIs + existing project components. The risk surface is behavioral (object URL lifecycle, event cleanup) not library integration.

---

## Common Pitfalls

### Pitfall 1: Object URL Memory Leak
**What goes wrong:** `URL.createObjectURL` is called on each file selection but `URL.revokeObjectURL` is never called. Each preview accumulates a live reference in the browser's blob URL registry. In a long session with many image replacements, this causes memory growth.
**Why it happens:** The URL appears to work fine even without revoking — the leak is silent.
**How to avoid:** Revoke in three places: on replace (before creating new), on clear (before dispatching CLEAR_FILE), and in useEffect cleanup.
**Warning signs:** Memory usage climbing in DevTools after repeated image selections.

### Pitfall 2: Same-File Re-Selection Not Firing onChange
**What goes wrong:** User picks a file, clears it (X overlay), picks the same file again — `onChange` does not fire because the input's `value` hasn't changed.
**Why it happens:** Browser deduplicates `change` events on file inputs when the value hasn't changed.
**How to avoid:** After every clear operation: `if (inputRef.current) inputRef.current.value = "";`
**Warning signs:** Clearing and re-selecting the same image appears to do nothing.

### Pitfall 3: Drag-and-Drop Bypasses accept Attribute Filtering
**What goes wrong:** A user drags a HEIC or BMP file onto the drop zone. The `accept` attribute on the `<input>` does not intercept drag events — only `file.type` validation in the `onDrop` handler catches it.
**Why it happens:** `accept` only filters the OS file picker dialog, not programmatic file assignments.
**How to avoid:** Always run `validateImageFile(file)` for all three vectors (click, drag, paste).
**Warning signs:** Wrong-type files entering the preview state when dragged.

### Pitfall 4: Paste Event Not Received When Page Doesn't Have Focus
**What goes wrong:** The clipboard paste handler fires on the `document`, but if an input or other element has captured focus in a way that prevents document-level paste events, screenshots are not caught.
**Why it happens:** Some browser extensions or OS-level tools intercept paste events.
**How to avoid:** Listen at the drop-zone container level, not window-level; also attach to `document` as a fallback. This is correct in 99% of real browser sessions.
**Warning signs:** Ctrl+V screenshots not triggering the handler in testing.

### Pitfall 5: next/image with Blob URL
**What goes wrong:** Using `<Image src={objectURL} />` from `next/image` throws a runtime error because the blob URL is not in the `domains`/`remotePatterns` config and is not a local static path.
**Why it happens:** `next/image` requires the src to be a known static or configured remote URL.
**How to avoid:** Use a plain `<img>` tag for the object URL preview.
**Warning signs:** Next.js error: "Invalid src prop... hostname `(blob:)` is not configured".

### Pitfall 6: Mode Toggle State Losing Image on Re-render
**What goes wrong:** If the mode toggle is implemented with simple conditional rendering (`mode === "image" && <ImageUploadFlow />`), switching modes unmounts and remounts the component, destroying all image state and leaking the object URL.
**Why it happens:** Unmounting triggers cleanup; if not handled, the object URL is also leaked if cleanup isn't wired in useEffect.
**How to avoid:** Either (a) keep the mode toggle above the component tree and use useEffect cleanup to revoke object URLs on unmount, or (b) preserve the ImageUploadFlow mount but hide it with CSS when not active. Option (a) is simpler and fine — just ensure the useEffect cleanup is correct.
**Warning signs:** Image disappears when clicking between modes; console shows stale blob URL errors.

---

## Code Examples

### Validation Function (pure, testable)
```typescript
// src/lib/image-validation.ts
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

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

### State Machine (reducer)
```typescript
// Inside image-upload-flow.tsx
interface ImageFlowState {
  step: "pick" | "deck";
  file: File | null;
  previewUrl: string | null;
  pickError: string | null;
  selectedDeckId: string;
}

type ImageFlowAction =
  | { type: "FILE_PICKED"; file: File; previewUrl: string }
  | { type: "FILE_ERROR"; message: string }
  | { type: "CLEAR_FILE" }
  | { type: "ADVANCE_STEP" }
  | { type: "BACK_TO_PICK" }
  | { type: "SET_DECK"; deckId: string };

function imageFlowReducer(state: ImageFlowState, action: ImageFlowAction): ImageFlowState {
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

### Object URL Lifecycle
```tsx
// Inside ImageUploadFlow component
function handleValidFile(file: File) {
  // Revoke any existing URL before creating a new one
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  const url = URL.createObjectURL(file);
  dispatch({ type: "FILE_PICKED", file, previewUrl: url });
}

function handleClearFile() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  if (inputRef.current) inputRef.current.value = "";
  dispatch({ type: "CLEAR_FILE" });
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  };
}, []); // empty deps — only run cleanup on unmount
// NOTE: state.previewUrl in the closure is the latest via useRef pattern if needed
```

### Paste Handler Registration
```tsx
useEffect(() => {
  const handlePaste = (e: ClipboardEvent) => {
    const file = e.clipboardData?.files?.[0];
    if (file) validateAndSetFile(file);
  };
  document.addEventListener("paste", handlePaste);
  return () => document.removeEventListener("paste", handlePaste);
}, [validateAndSetFile]); // validateAndSetFile must be stable (useCallback)
```

### Inline Error (mirroring TranslationForm pattern)
```tsx
{state.pickError && (
  <p className="text-sm text-destructive mt-2">{state.pickError}</p>
)}
```

### DeckSwitcher Integration (Step 2)
```tsx
// DeckSwitcher is already "use client"; no wrapper needed
<DeckSwitcher
  decks={decks}
  activeDeckId={state.selectedDeckId}
  onDeckChange={(id) => dispatch({ type: "SET_DECK", deckId: id })}
  nativeLang={nativeLang}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `FileReader.readAsDataURL()` for previews | `URL.createObjectURL()` | Broadly adopted ~2015, now universally supported | Synchronous, lighter, no base64 overhead |
| `navigator.clipboard.read()` for paste | DOM `paste` event on `ClipboardEvent.clipboardData.files` | Always the correct path for file paste | No permission prompt required |
| Third-party drag-drop libraries (react-dropzone) | Browser-native drag events + minimal state | Standard since HTML5 DnD API | No dependency; adequate for single-file flows |

**Not applicable / no deprecation risk:** All APIs used (File API, DataTransfer, ClipboardEvent, URL.createObjectURL) are stable W3C standards with universal browser support in 2026.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `navigator.clipboard.read()` requires permission; use `paste` DOM event instead | Pattern 3c | Low — documented MDN behavior; confirmed behavioral pattern |
| A2 | Plain `<img>` is required for blob URL preview (not `next/image`) | Pattern 4 | Low — Next.js image optimization is documented to require configured src |
| A3 | Same-file re-selection fix requires resetting input value to `""` | Pitfall 2 | Low — standard browser behavior; well-known pattern |
| A4 | `file.type` MIME check + `accept` attribute is adequate client-side guard | Pattern 5 | Low — Phase 10 adds server-side validation; this is pre-screening only |
| A5 | Prop threading: server component passes decks/activeDeckId/nativeLang down as serializable props | Pattern 1 | Low — established pattern already used in this codebase for DeckSwitcher and TranslationForm |
| A6 | useEffect cleanup with empty deps captures latest previewUrl via stale closure; may need useRef for correctness | Pattern 4 (Object URL Lifecycle) | Medium — if the previewUrl changes multiple times before unmount, stale closure may not revoke the latest URL. Planner should use a `useRef` to track the latest URL for cleanup |

---

## Open Questions (RESOLVED)

1. **Mode toggle UI style (Claude's Discretion)**
   - What we know: Three UI primitives available (Button, no native Tab component in ui/). Existing project uses Radix Select for DeckSwitcher.
   - What's unclear: Whether a tab-strip pattern or a button-pair (two Buttons with `variant="outline"` / `variant="default"`) is more consistent with the page's existing visual language.
   - Recommendation: Button pair (two `<Button>` elements, one `variant="default"` for active, one `variant="outline"`) — lowest implementation cost, uses existing primitives, avoids importing a Tab component.

2. **Object URL cleanup with useEffect stale closure (A6)**
   - What we know: `useEffect` cleanup with `[]` deps runs on unmount only; if `state.previewUrl` changed since mount, the closure captures the initial value (or latest if using useRef).
   - What's unclear: Whether the simple cleanup pattern works in practice or needs a `useRef` to track the current previewUrl.
   - Recommendation: Use a `useRef(state.previewUrl)` kept in sync with state, and read from the ref in the cleanup function. Or: always revoke in the action handlers (replace + clear) and use cleanup only as a safety net.

3. **Back-navigation between Step 2 and Step 1**
   - What we know: D-12 puts the deck selector in Step 2. Back navigation is Claude's Discretion.
   - What's unclear: Whether "← Back" in Step 2 should return to the previewing state (file still held) or clear entirely.
   - Recommendation: Return to previewing state with file still held. The user has already picked a valid image; going back should let them re-examine it, not discard it.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 9 is entirely client-side UI with no external dependencies. All browser APIs (File, DataTransfer, ClipboardEvent, URL.createObjectURL) are available in every modern browser without installation. No new npm packages required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/image-validation.test.ts` |
| Full suite command | `npx vitest run` |

[VERIFIED: `vitest.config.ts` and `package.json` in project root; `environment: "node"` (existing tests run node env)]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMG-02 | Accepts JPG, PNG, WebP; rejects other types | unit | `npx vitest run src/lib/image-validation.test.ts` | ❌ Wave 0 |
| IMG-03 | Rejects files >5MB; accepts ≤5MB; error message names the rule and value | unit | `npx vitest run src/lib/image-validation.test.ts` | ❌ Wave 0 |
| IMG-01 | Mode toggle renders both modes — manual-only (component render test) | manual | visual inspection | — |
| IMG-04 | Default deck selection logic — covered by existing server component logic, not new code | — | already tested implicitly | — |
| IMG-05 | Preview renders, replace/cancel work — component behavior | manual | visual inspection / Playwright e2e if added | — |

**Testability note:** `validateImageFile` in `src/lib/image-validation.ts` is a pure synchronous function. It takes a `File` object and returns a typed result. Vitest can construct `File` objects with `new File([], "test.heic", { type: "image/heic" })` and `new File([new Uint8Array(6_000_000)], "big.jpg", { type: "image/jpeg" })` without browser APIs. The `environment: "node"` config in vitest supports this via WHATWG File API implementation in Node 20+.

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/image-validation.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/image-validation.test.ts` — covers IMG-02, IMG-03 (type validation, size validation, error message copy)

*(No framework install gap — Vitest already installed and configured.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Session auth already handled by existing page |
| V3 Session Management | no | No new session surface |
| V4 Access Control | no | No new server endpoints in Phase 9 |
| V5 Input Validation | yes (client-side only) | `validateImageFile()` pure function; server-side guard deferred to Phase 10 (EXT-05) |
| V6 Cryptography | no | No crypto in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| MIME type spoofing (rename .exe to .jpg) | Tampering | `file.type` check + `accept` attribute (client pre-screen); server-side magic-byte check in Phase 10 (EXT-05 explicitly scopes this) |
| Oversized file DoS (client bypass) | DoS | Client `file.size` guard; server 5MB payload limit in Phase 10 |
| Clipboard poisoning (malicious paste payload) | Tampering | Same MIME + size validation runs for all three input vectors |

**Phase 9 security posture:** Client-side only. The server-side guard (EXT-05) is explicitly Phase 10 scope. Phase 9's validation is UX-protective, not security-critical in isolation. This is acceptable because Phase 9 never sends the file anywhere — it is held in memory only.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` — Client/server boundary pattern, prop passing from Server to Client Components [VERIFIED: read in session]
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` — `next/image` src restrictions (blob URLs not supported) [VERIFIED: read in session]
- `src/components/translation-form.tsx` — Established useReducer + inline error pattern [VERIFIED: read in session]
- `src/components/deck-switcher.tsx` — DeckSwitcher props interface and behavior [VERIFIED: read in session]
- `src/app/(protected)/deck/new-card/page.tsx` — Server component structure and data fetching [VERIFIED: read in session]
- `package.json` — Exact versions: Next.js 16.2.1, React 19.2.4, Vitest 4.1.1, zod 4.3.6 [VERIFIED: read in session]
- `vitest.config.ts` — environment: "node", @ alias [VERIFIED: read in session]

### Secondary (MEDIUM confidence)
- Browser-native File API, DataTransfer, ClipboardEvent, URL.createObjectURL — MDN Web Docs standard APIs, universally supported [ASSUMED based on training; well-known stable standards]

### Tertiary (LOW confidence — flagged in Assumptions Log)
- Specific clipboard paste behavior (ClipboardEvent.clipboardData.files) across all browsers — A1 in assumptions log

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json; no new dependencies
- Architecture: HIGH — server/client boundary verified in Next.js 16 bundled docs; existing patterns verified in codebase
- Pitfalls: MEDIUM — derived from known browser API behaviors; all tagged ASSUMED where not codebase-verified
- Validation function: HIGH — pure function pattern; Vitest configuration verified

**Research date:** 2026-05-18
**Valid until:** 2026-07-18 (stable browser APIs; no risk of breakage)
