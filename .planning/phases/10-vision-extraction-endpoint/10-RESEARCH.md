# Phase 10: Vision Extraction Endpoint — Research

**Researched:** 2026-05-19
**Domain:** Next.js 16 Route Handler integration — AI SDK v6, image constants refactor, client state wiring, eval harness
**Confidence:** HIGH (codebase verified) / MEDIUM (Next.js 16 body-limit behaviour — see ASSUMED notes)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for the vision call. Not the official Anthropic SDK.
- **D-02:** Claude Sonnet-tier model. Exact ID pinned to `claude-sonnet-4-6` by the AI-SPEC.
- **D-03:** `ANTHROPIC_API_KEY` in typed `@/env` module; 503 if absent; client instantiated inside handler only.
- **D-04:** First AI SDK dependency in this codebase — `ai@6.0.185` + `@ai-sdk/anthropic@3.0.78`.
- **D-05:** Extraction biased to the chosen deck's `targetLanguage` (BCP-47).
- **D-06:** Words returned verbatim (no lemmatization/translation/normalization). Cleanup is Phase 11.
- **D-07:** `generateText({ output: Output.object({ schema }) })` (v6 API — `generateObject` is deprecated in v6). Output shape: `{ words: string[]; detectedLanguage?: string }`.
- **D-08:** No words found = HTTP 200 with `{ words: [] }`. Cap at 50 words.
- **D-09:** Image transported as base64 data-URL in JSON body (`{ image, mimeType, deckId, targetLanguage }`).
- **D-10:** Server-side magic-byte signature sniffing + MIME allow-list. 415 for bad type.
- **D-11:** Payload size cap ~7MB enforced BEFORE base64 decode or vision call → 413.
- **D-12:** Extract `ALLOWED_IMAGE_TYPES` + `MAX_BYTES` into one shared constants module consumed by Phase 9 client validator AND Phase 10 server route.
- **D-13:** AbortController 30s timeout on vision call → 504. `export const maxDuration = 60` on the route segment.
- **D-14:** HTTP status codes drive client UI. `{ error: string }` body + status. No separate typed error-code field.
- **D-15:** Client in-flight guard: disable Extract button + show loading state while in-flight.
- **D-16:** On any error: preserve `file` + `previewUrl` + `selectedDeckId`; show inline error with "Try again".
- **D-17:** `createRateLimiter({ windowMs: 60_000, maxRequests: 10 })` — stricter than translate's 30/min.

### Claude's Discretion

- Exact prompt wording (within D-05/D-06 constraints).
- Exact route path/filename (follow `src/app/api/.../route.ts` convention).
- Whether shared image constants live in the existing `image-validation` module or a new `image-constants` module.
- Component decomposition for client extraction states within `ImageUploadFlow`.

### Deferred Ideas (OUT OF SCOPE)

- Lemmatization / dedupe of extracted words (Phase 11).
- Server-side idempotency/dedupe.
- Observability / cost-tracking telemetry.
- Adding words to deck, DeepL translation, editable review (Phase 11).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXT-01 | User can trigger extraction; Claude vision returns vocabulary words | AI-SPEC Section 3 pattern; `generateText` + `Output.object`; fetch call from `handleExtract` |
| EXT-02 | User sees loading state; request cannot be double-submitted | `EXTRACT_START` action sets `extracting: true`; button `disabled={state.extracting}`; AbortController on client |
| EXT-03 | User sees clear message when no words found, with "try another image" option | HTTP 200 `{ words: [] }` → `EXTRACT_NO_WORDS` action; UI-SPEC State 3 copy |
| EXT-04 | Graceful recoverable error with no lost deck selection | `EXTRACT_ERROR` preserves `file`/`previewUrl`/`selectedDeckId`; inline error + "Try again" |
| EXT-05 | Endpoint protected by rate limiter; rejects oversized/invalid payloads server-side | `createRateLimiter` at 10/min; D-11 payload cap → 413; D-10 magic-byte check → 415 |
</phase_requirements>

---

## Summary

Phase 10 extends the existing Next.js 16 route handler pattern (mirroring `/api/translate/route.ts`) with three net-new integration concerns: (1) AI SDK v6 vision call using `generateText` + `Output.object`, (2) a server-side magic-byte sniffing step using hand-rolled signature checks (no new dependency), and (3) a client-side `useReducer` extension in `image-upload-flow.tsx` that handles five new states.

The most structurally important task is the **D-12 shared constants refactor**: extracting `ALLOWED_TYPES`/`MAX_BYTES` from `src/lib/image-validation.ts` into a new `src/lib/image-constants.ts` module. This must be done as a pure re-export refactor — no logic changes — so that the eight existing `image-validation.test.ts` tests pass unchanged. The `validateImageFile` function continues to live in `image-validation.ts`; it just imports its constants from the new shared module.

The **D-11 body size cap** cannot rely on a built-in Next.js 16 Route Handler limit (none exists per bundled docs — the `bodySizeLimit` config applies only to Server Actions). The early 413 must be enforced in application code: read `Content-Length` header first (unreliable, may be absent), then fall back to estimating from the base64 string length after `request.json()`. The AI-SPEC's approach (`Math.ceil((image.length * 3) / 4)` after JSON parse) is the pragmatic implementation — it fires before the vision call, which satisfies D-11's intent even if it occurs after JSON parsing.

**Primary recommendation:** Implement in wave order: (1) shared image constants refactor → (2) route handler scaffold mirroring translate → (3) magic-byte checks + payload cap → (4) AI SDK vision call → (5) client reducer extension + fetch wiring.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth check | API / Backend | — | Session validation via `auth.api.getSession` — server-only |
| Rate limiting | API / Backend | — | In-memory `createRateLimiter` — server-only; D-17 |
| Payload size cap (D-11) | API / Backend | — | DoS prevention; must fire before expensive vision call |
| MIME allow-list + magic-byte check (D-10) | API / Backend | — | Client `mimeType` is spoofable; server enforces truth |
| Vision call (AI SDK) | API / Backend | — | API key, cost, latency — server-only |
| `env.ANTHROPIC_API_KEY` | API / Backend | — | Server env var; never exposed to client |
| Image constants (ALLOWED_TYPES, MAX_BYTES) | Shared (lib) | Client (D-12) + Server (D-10/D-11) | Single source of truth for both client validation and server enforcement |
| Client loading state / double-submit guard | Browser / Client | — | `useReducer` in `image-upload-flow.tsx`; D-15 |
| Error preservation (file/previewUrl/deckId) | Browser / Client | — | Reducer state held client-side; D-16 |
| HTTP status → friendly copy mapping | Browser / Client | — | `friendlyErrorCopy(status)` helper; D-14 |

---

## Standard Stack

### Core (already installed — no new install for these)

| Library | Version | Purpose | Verification |
|---------|---------|---------|--------------|
| `zod` | `^4.3.6` | Request body schema + output schema validation | [VERIFIED: package.json] |
| `next` | `16.2.1` | Route Handler host (`export async function POST`) | [VERIFIED: node_modules/next/package.json] |
| `react` | `19.2.4` | `useReducer` client state machine | [VERIFIED: package.json] |

### New Dependencies (Phase 4 — first AI SDK in codebase)

| Library | Version | Purpose | Verification |
|---------|---------|---------|--------------|
| `ai` | `6.0.185` | `generateText`, `Output`, `NoObjectGeneratedError` | [VERIFIED: AI-SPEC Section 3 — npm registry checked 2026-05-19] |
| `@ai-sdk/anthropic` | `3.0.78` | `anthropic(modelId, { apiKey })` provider factory | [VERIFIED: AI-SPEC Section 3 — npm registry checked 2026-05-19] |

**Installation:**
```bash
npm install ai@6.0.185 @ai-sdk/anthropic@3.0.78
```

### Not Needed

| Problem | Rejected Dependency | Reason |
|---------|---------------------|--------|
| Magic-byte file type detection | `file-type` | Not installed; hand-rolled 4-byte check is sufficient for 3 MIME types; no-new-dep bias confirmed |

---

## Architecture Patterns

### System Architecture Diagram

```
Client (image-upload-flow.tsx)
  [Extract words button clicked]
        │
        ▼
  handleExtract()
  ├── EXTRACT_START dispatch → extracting: true, button disabled (EXT-02)
  ├── AbortController(30s) created
  └── POST /api/extract   { image: "data:image/jpeg;base64,...", mimeType, deckId, targetLanguage }
                                │
                    ┌─────────────────────────────┐
                    │  Route: /api/extract/route.ts │
                    │                               │
                    │  1. auth.api.getSession → 401 │
                    │  2. visionLimiter.check → 429 │
                    │  3. request.json() → 400      │
                    │  4. RequestSchema.safeParse   │
                    │     → 400                     │
                    │  5. estimatedBytes > 7MB → 413│
                    │  6. MIME allow-list check → 415│
                    │  7. magic-byte check → 415    │
                    │  8. env.ANTHROPIC_API_KEY → 503│
                    │  9. AbortController(30s)      │
                    │  10. generateText(            │
                    │       model: anthropic(),     │
                    │       output: Output.object(),│
                    │       messages: [{image}]     │
                    │      )                        │
                    │  11. 200 { words[], detected? }│
                    └─────────────────────────────┘
                                │
        ┌───────────────────────┼──────────────────────────┐
        │                       │                          │
   200 words.length>0     200 words.length===0     4xx/5xx
        │                       │                          │
EXTRACT_SUCCESS          EXTRACT_NO_WORDS         EXTRACT_ERROR
"Found N words"          "No words found"         friendlyErrorCopy(status)
"Review words →"         "Choose another image"   "Try again"
(Phase 11 stub)          (BACK_TO_PICK)           (preserves file/deck)
```

### Recommended Project Structure

```
src/
  app/
    api/
      extract/
        route.ts               # Phase 10 endpoint
        __tests__/
          extract-eval.test.ts # Vitest eval (gated by RUN_EXTRACTION_EVALS)
          fixtures/            # 20 reference images (base64 .txt or small JPEGs)
          reference-labels.json
      translate/
        route.ts               # Existing reference — do NOT modify
  lib/
    image-constants.ts         # NEW: ALLOWED_IMAGE_TYPES + MAX_BYTES (D-12)
    image-validation.ts        # MODIFIED: imports from image-constants; no behavior change
    rate-limit.ts              # Unchanged — reused
  components/
    image-upload-flow.tsx      # MODIFIED: reducer + fetch wiring
  env.ts                       # MODIFIED: add ANTHROPIC_API_KEY (D-03)
```

---

## Research Focus Areas

### 1. Shared Image Constants Refactor (D-12)

**Finding:** `src/lib/image-validation.ts` defines `ALLOWED_TYPES` (a `Set<string>`) and `MAX_BYTES` (a `number`) as module-scope constants. They are not exported. The eight tests in `image-validation.test.ts` import only `validateImageFile` — they have no direct dependency on the constant names or values, only on the behaviour they enforce.

**Safe refactor approach — pure re-export, no logic touch:**

Step 1: Create `src/lib/image-constants.ts`:
```typescript
// src/lib/image-constants.ts
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes
```

Step 2: Modify `src/lib/image-validation.ts` — replace the two local `const` lines with imports:
```typescript
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image-constants";
// then use ALLOWED_IMAGE_TYPES and MAX_IMAGE_BYTES in validateImageFile
```

Step 3: `src/app/api/extract/route.ts` imports from `@/lib/image-constants` directly.

**Why this is safe for existing tests:** The tests create `File` objects and call `validateImageFile` — they assert on `{ ok: true/false }` and error message substrings. None of the tests import the constants directly. Renaming `ALLOWED_TYPES` → `ALLOWED_IMAGE_TYPES` and `MAX_BYTES` → `MAX_IMAGE_BYTES` is internal to `image-validation.ts` and transparent to the test suite. [VERIFIED: src/lib/image-validation.test.ts — all 8 tests import only `validateImageFile`]

**Name collision note:** The existing local `const ALLOWED_TYPES` and `const MAX_BYTES` are private to the module; renaming in the refactor is safe. Choosing more descriptive exported names (`ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_BYTES`) prevents accidental collision with other modules that might export a generic `MAX_BYTES`.

**Discretion call (per CONTEXT):** Create a new `image-constants.ts` module rather than exporting from within `image-validation.ts`. Rationale: the server route should not import from a module named `image-validation` (which implies client-side `File` logic) — the shared constants file is more accurately named by its purpose. This also avoids a circular import risk if `image-validation.ts` ever imports server-only utilities.

[VERIFIED: codebase — no existing `src/lib/image-constants.ts`; safe to create]

---

### 2. Server-Side Magic-Byte Sniffing (D-10)

**Finding:** `file-type` npm package is NOT installed in this project. [VERIFIED: node_modules check — file-type absent]

**Recommendation: Hand-rolled 4-byte signature check — no new dependency.**

JPEG, PNG, and WebP have well-known, stable magic byte sequences. A 4-byte buffer read from the decoded base64 header is sufficient:

```typescript
// src/app/api/extract/route.ts
// Called after the base64 data-URL is extracted from the request body.
// Returns true if the magic bytes match the declared mimeType.

const MAGIC_BYTES: Record<string, (buf: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png":  (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46,
  // Note: WebP magic is RIFF at bytes 0-3; bytes 8-11 would be WEBP but 4 bytes is sufficient
  // to distinguish from JPEG/PNG. Full WEBP check: also verify bytes 8-11 = [0x57,0x45,0x42,0x50]
  // — the 4-byte RIFF check is adequate here since JPEG/PNG have distinct headers.
};

function checkMagicBytes(base64Data: string, declaredMimeType: string): boolean {
  const validator = MAGIC_BYTES[declaredMimeType];
  if (!validator) return false;

  // Extract just the first ~8 bytes: base64 header is "data:mime;base64,<data>"
  const commaIndex = base64Data.indexOf(",");
  if (commaIndex === -1) return false;
  const b64Payload = base64Data.slice(commaIndex + 1, commaIndex + 17); // ~12 bytes decoded
  const bytes = Uint8Array.from(atob(b64Payload), (c) => c.charCodeAt(0));
  return validator(bytes);
}
```

**Why no `file-type`:** The package is an ESM-only library (v20+) which introduces import complexity in a Next.js 16 `"use server"` context. For three well-known MIME types with fixed magic byte sequences, 10 lines of hand-rolled TypeScript is more maintainable and carries zero dependency risk. [ASSUMED: `file-type` v20+ is ESM-only — based on training knowledge; not verified against npm in this session]

**Pitfall:** WebP files begin with `RIFF....WEBP` — bytes 0-3 are `52 49 46 46` ("RIFF"), bytes 8-11 are `57 45 42 50` ("WEBP"). A 4-byte check on bytes 0-3 only distinguishes WebP from JPEG/PNG (which never start with RIFF). For this use case (three-MIME allow-list), the 4-byte check is sufficient.

[VERIFIED: JPEG/PNG/WebP magic byte sequences — standard format specifications; HIGH confidence]

---

### 3. Base64 Body Handling in Next.js 16 Route Handler (D-09/D-11)

**Key finding: Next.js 16 Route Handlers have NO built-in body size limit.**

The `bodySizeLimit` config option (`experimental.serverActions.bodySizeLimit`) applies **only to Server Actions**, not to Route Handlers. Route Handlers use the Web Request API — `request.json()` reads the full body stream with no platform-imposed size cap. [VERIFIED: node_modules/next/dist/docs/ — serverActions.md confirms limit is Server Actions only; no Route Handler body limit documented anywhere in bundled Next 16 docs]

**Consequence for D-11:** The early 413 CANNOT rely on Next.js automatically rejecting the request before the handler runs. Application code must enforce it.

**Two-stage approach for D-11 (enforced in application code):**

Stage A — `Content-Length` header check (fast path, fires before `request.json()`):
```typescript
const contentLength = request.headers.get("content-length");
if (contentLength && Number(contentLength) > 7 * 1024 * 1024) {
  return Response.json({ error: "Image too large" }, { status: 413 });
}
```

Stage B — post-parse string length estimate (reliable path, fires after `request.json()` but BEFORE the vision call):
```typescript
// base64 string length × 3/4 ≈ decoded byte count
const estimatedBytes = Math.ceil((image.length * 3) / 4);
if (estimatedBytes > 7 * 1024 * 1024) {
  return Response.json({ error: "Image too large" }, { status: 413 });
}
```

**Why Stage A is unreliable alone:** `Content-Length` is a hint from the client. It may be absent (chunked transfer encoding), incorrect (client bug), or spoofed. It is still worth checking as a fast-path reject before the JSON parse overhead, but Stage B is the authoritative check. [ASSUMED: Content-Length absence/spoofing behaviour — based on HTTP spec and training knowledge; not verified against Next.js 16 specifics in this session]

**The Stage B estimate is authoritative:** Once `request.json()` resolves, `image` is a JavaScript string. A base64 string of length N decodes to approximately `N × 3/4` bytes. For a 5MB image (5,242,880 bytes), the base64 string is ~6,990,506 characters. The 7MB threshold (`7 * 1024 * 1024 = 7,340,032` bytes) corresponds to a base64 string of ~9,786,709 characters — ample headroom. [VERIFIED: base64 math — standard encoding; ASSUMED: no Next.js 16-specific streaming behaviour that would partially buffer before json() resolves]

**D-09 data-URL → AI SDK image content part:**

The client sends `image: "data:image/jpeg;base64,<payload>"` (a data-URL). The AI SDK v6 image content block accepts this directly:
```typescript
{
  type: "image",
  image: "data:image/jpeg;base64,...",  // full data-URL — SDK accepts this
  mediaType: "image/jpeg",              // field is `mediaType`, NOT `mimeType` (v6 rename — AI-SPEC Pitfall 2)
}
```

The `mediaType` field must use the AI SDK's type union: `"image/jpeg" | "image/png" | "image/gif" | "image/webp"`. Cast the validated `mimeType` value after the magic-byte check confirms it is one of the three allowed types.

[VERIFIED: AI-SPEC Section 3 code examples; CITED: ai-sdk.dev docs — verified 2026-05-19 per AI-SPEC Section 3 sources]

**`request.json()` memory concern:** A ~7MB JSON body parsed by `request.json()` is held entirely in memory before any size check can happen at Stage B. This is the design accepted by D-09 (base64 in JSON). The alternative (streaming/FormData) was not chosen. The 7MB ceiling is appropriate — it is well below any typical serverless function memory limit (typically 512MB–1GB). [ASSUMED: serverless memory limits — Vercel default; not verified in this session]

---

### 4. Client State Wiring — useReducer Extension

**Current reducer state (Phase 9, verified):**
```typescript
interface ImageFlowState {
  step: "pick" | "deck";
  file: File | null;
  previewUrl: string | null;
  pickError: string | null;
  selectedDeckId: string;
}
```

**Extension for Phase 10 (per UI-SPEC):**

New state fields to add to `ImageFlowState`:
```typescript
extracting: boolean;                                              // in-flight guard (EXT-02, D-15)
extractError: { status: number; message: string } | null;         // recoverable error (EXT-04, D-16)
extractWords: string[] | null;                                    // null=not tried; []=no-words; [...]= success
```

New action types (per UI-SPEC — copy verbatim):
```typescript
| { type: "EXTRACT_START" }
| { type: "EXTRACT_SUCCESS"; words: string[] }
| { type: "EXTRACT_NO_WORDS" }
| { type: "EXTRACT_ERROR"; status: number; message: string }
| { type: "EXTRACT_RETRY" }
```

**Reducer logic for new actions:**
```typescript
case "EXTRACT_START":
  return { ...state, extracting: true, extractError: null, extractWords: null };

case "EXTRACT_SUCCESS":
  return { ...state, extracting: false, extractWords: action.words };

case "EXTRACT_NO_WORDS":
  return { ...state, extracting: false, extractWords: [] };

case "EXTRACT_ERROR":
  return { ...state, extracting: false, extractError: { status: action.status, message: action.message } };
  // file / previewUrl / selectedDeckId are NOT touched — D-16 preservation

case "EXTRACT_RETRY":
  return { ...state, extracting: true, extractError: null, extractWords: null };
  // Same as EXTRACT_START; kept as a named action for clarity
```

**`handleExtract` implementation:**

```typescript
async function handleExtract() {
  if (!state.file || !state.selectedDeckId || state.extracting) return; // double-submit guard
  dispatch({ type: "EXTRACT_START" });

  // Read file as data-URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(state.file!);
  });

  // Find the selected deck's targetLanguage from the decks prop
  const deck = decks.find((d) => d.id === state.selectedDeckId);
  const targetLanguage = deck?.targetLanguage ?? "fr"; // fallback — should never be needed

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35_000); // 35s client-side (>30s server)

  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: dataUrl,
        mimeType: state.file!.type,
        deckId: state.selectedDeckId,
        targetLanguage,
      }),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json() as { words: string[]; detectedLanguage?: string };
      if (data.words.length === 0) {
        dispatch({ type: "EXTRACT_NO_WORDS" });
      } else {
        dispatch({ type: "EXTRACT_SUCCESS", words: data.words });
        // Phase 11 will consume extractWords here
      }
    } else {
      const data = await res.json().catch(() => ({ error: "Unknown error" })) as { error: string };
      dispatch({ type: "EXTRACT_ERROR", status: res.status, message: data.error ?? "Unknown error" });
    }
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    dispatch({
      type: "EXTRACT_ERROR",
      status: isAbort ? 504 : 0,
      message: isAbort ? "The extraction timed out." : "Network error.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Double-submit guard (D-15):** The guard is `disabled={state.extracting}` on the button (UI-SPEC) AND the early return `if (state.extracting) return` at the top of `handleExtract`. The `disabled` prop on Base UI Button also adds `pointer-events-none` via `buttonVariants`, preventing any click event from reaching the handler at all. Belt-and-suspenders.

**AbortController note:** The client-side timeout is set to 35s (5s longer than the server's 30s AbortController). This ensures the server-side abort fires first and returns a clean 504, rather than the client cutting the connection and seeing a generic network error. [ASSUMED: this timing relationship — based on latency reasoning; not verified]

**`DeckOption` must expose `targetLanguage`:** The component receives `decks: DeckOption[]`. The `DeckOption` type currently used is from `src/components/deck-switcher.tsx`. Phase 10 needs access to the deck's `targetLanguage` field for D-05. The planner must verify whether `DeckOption` already exposes `targetLanguage` and, if not, extend it. [VERIFIED: image-upload-flow.tsx imports `DeckOption` from `@/components/deck-switcher`; the actual DeckOption type definition needs planner verification]

**`friendlyErrorCopy` helper (UI-SPEC Copywriting Contract):**
```typescript
function friendlyErrorCopy(status: number): string {
  switch (status) {
    case 429: return "You've made too many requests — please wait a moment and try again.";
    case 413: return "That image is too large for the server to process. Please choose a smaller image (under 5MB).";
    case 415: return "That file type isn't supported. Please choose a JPG, PNG, or WebP image.";
    case 504: return "The extraction took too long and timed out. Please try again — it usually works on the second attempt.";
    case 503: return "The word extraction feature isn't available right now. Please try again later.";
    case 502:
    case 500: return "Something went wrong with the word extraction. Please try again.";
    case 400: return "There was a problem with the request. Please go back and choose a new image.";
    case 401: return "Your session has expired. Please refresh the page and try again.";
    default:  return "Something went wrong. Please try again.";
  }
}
```

[VERIFIED: UI-SPEC Copywriting Contract — all strings copied verbatim]

---

### 5. Eval Test Harness (AI-SPEC Section 5)

**Structure per AI-SPEC:**

```
src/app/api/extract/__tests__/
  extract-eval.test.ts      # Vitest; gated by RUN_EXTRACTION_EVALS=true
  fixtures/                 # 20 reference images (see AI-SPEC Section 5 composition table)
  reference-labels.json     # Ground-truth word lists keyed by fixture filename
```

**Automatable vs. manual-only:**

| Eval Dimension | Automatable in Vitest | Manual / LLM-Judge |
|---------------|----------------------|--------------------|
| D3: Orthographic faithfulness | Yes — exact string match vs. reference-labels.json | No (code-based) |
| D4: Verbatim surface form | Yes — exact string match vs. reference-labels.json | Partial — handwriting images need tutor confirmation |
| D5a: No-words correctness | Yes — `assert words.length === 0` for fixture images 18-19 | No |
| D1: Target-language purity | No — requires LLM judge calibrated by FR/ES tutor | LLM judge + tutor calibration |
| D2: Word identity / noise | Partial — regex for `€`, digits, allergen patterns | FR/ES tutor review |
| D5b: Useful density | No — requires human count of visible words per image | Tutor + product owner |

**Gating pattern (copy from AI-SPEC):**
```typescript
// extract-eval.test.ts
const RUN_EVALS = process.env.RUN_EXTRACTION_EVALS === "true";

describe.skipIf(!RUN_EVALS)("Extraction eval — reference dataset", () => {
  // Tests hit the real Anthropic API — slow, cost-incurring
  // Each test: load fixture → POST to endpoint → assert against reference-labels.json
});
```

**CI integration:** Run on-demand with `RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts`. NOT run on every push — gates before merging prompt changes and on weekly schedule.

**What is NOT automatable (Wave 0 note):** The fixture images and `reference-labels.json` ground-truth entries cannot be generated programmatically. They must be authored manually by Joshua (product owner) before the eval suite can run. This is a Wave 0 gap — the test file and fixture directory structure must exist, but the actual 20 images require manual curation.

**Fixture format:** Small images stored as base64 `.txt` files (preferred for git) or as actual small JPEG/PNG/WebP files. `reference-labels.json` maps filename → expected word array for code-based dimensions (D3, D4, D5a).

[VERIFIED: AI-SPEC Section 5 — composition table, tooling decision, CI integration pattern]

---

### 6. ANTHROPIC_API_KEY Env Wiring (D-03)

**Exact pattern to mirror (from `src/env.ts`):**

Current `DEEPL_API_KEY` pattern:
```typescript
// server block:
DEEPL_API_KEY: z.string().min(1).optional(),
// runtimeEnv block:
DEEPL_API_KEY: process.env.DEEPL_API_KEY,
```

**New lines for `ANTHROPIC_API_KEY` — identical structure:**
```typescript
// server block:
ANTHROPIC_API_KEY: z.string().min(1).optional(),
// runtimeEnv block:
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
```

**Why `.optional()`:** The key is optional at schema level so the app starts without it in dev (the 503 guard in the handler is the runtime gate). This mirrors `DEEPL_API_KEY` exactly — the translate route returns 503 if the key is absent; the extract route does the same. [VERIFIED: src/env.ts — DEEPL_API_KEY uses `.optional()`]

**Important:** `env.ts` is side-effect-imported in `layout.tsx` (not a named import — `import "@/env"` triggers Zod validation at startup). The addition of `ANTHROPIC_API_KEY` must not introduce a required field that would break local dev startup when the key is absent.

[VERIFIED: STATE.md — "env.ts wired via side-effect import in layout.tsx (not named import) — triggers Zod validation at app startup"]

---

### 7. Next.js 16 Route Handler Specifics (AGENTS.md verification)

Reading from bundled `node_modules/next/dist/docs/`:

**`export const maxDuration = 60`** — This is the route segment config for execution timeout. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md — exists in Next.js 16; syntax `export const maxDuration = 5` is the documented pattern; `60` is a valid integer value]

**`export async function POST(request: Request)`** — The correct Next.js 16 App Router route handler signature. Note that `request` is technically a `NextRequest` (extension of `Request`) but the plain `Request` type annotation is compatible and is what the existing `/api/translate/route.ts` uses. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md — `export async function POST(request: Request) {}` is the documented pattern]

**`Response.json(body, { status })`** — Standard Web API, confirmed in use in the existing translate route. [VERIFIED: src/app/api/translate/route.ts]

**`await headers()`** — `headers()` from `next/headers` returns a Promise in Next.js 15+. The existing translate route uses `await headers()` correctly. [VERIFIED: src/app/api/translate/route.ts line 26 — `headers: await headers()`]

**No built-in Route Handler body size limit** — Confirmed by exhaustive search of bundled Next.js 16 docs. `bodySizeLimit` is Server Actions only. Route Handlers read the Web Request body stream without platform-imposed limits. D-11 enforcement is 100% application code. [VERIFIED: bundled docs — serverActions.md (Server Actions only); proxyClientMaxBodySize.md (proxy path only); no Route Handler body limit documented]

**`proxy.ts` vs `middleware.ts`** — This project uses `src/proxy.ts` (not `middleware.ts`) per Phase 1 decision (Next.js 16 breaking change). The new `/api/extract` route does NOT need any changes to `proxy.ts` — auth in the route handler itself via `auth.api.getSession`. [VERIFIED: src/proxy.ts — only handles `/dashboard` redirect; API routes fall through to `NextResponse.next()`]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured AI output validation | Manual JSON parsing + regex | `Output.object({ schema })` in AI SDK v6 | Retry logic, schema enforcement, and typed result are all handled; NoObjectGeneratedError surface is clean |
| Session authentication | Custom cookie parsing | `auth.api.getSession({ headers: await headers() })` | Already the pattern in translate route; Better Auth handles token verification |
| Rate limiting | New rate limiter | `createRateLimiter` from `src/lib/rate-limit.ts` | Existing, tested, production-proven sliding window; just instantiate with `{ windowMs: 60_000, maxRequests: 10 }` |
| File type detection | String MIME parsing only | 4-byte magic-byte check (hand-rolled) | Client-supplied MIME is spoofable; magic bytes are ground truth |
| Client loading state | Multiple `useState` hooks | `useReducer` (extending existing pattern) | Already a `useReducer` in the component; study engine (Phase 3) and Phase 9 both confirm this pattern for multi-state flows |

---

## Common Pitfalls

### Pitfall 1: `generateObject` import — deprecated in AI SDK v6

**What goes wrong:** Importing and calling `generateObject` still works today but will break on the next major version. More importantly, the return value shape differs: `generateObject` returns `{ object }` while `generateText` + `Output.object` returns `{ output }`.
**Why it happens:** Training data and cached docs reference v4/v5 patterns.
**How to avoid:** Import `generateText, Output, NoObjectGeneratedError` from `"ai"`. Use `output` not `object` from the destructured result.
**Warning signs:** If you see `import { generateObject } from "ai"` in any code review — flag it.
[VERIFIED: AI-SPEC Section 3 — explicitly documented as Critical API Change]

### Pitfall 2: `mimeType` vs `mediaType` field on image content block

**What goes wrong:** The AI SDK v5+ renamed the image content block field from `mimeType` to `mediaType`. Using `mimeType` silently does nothing — the provider may reject the content or mis-identify the format.
**How to avoid:** Always use `mediaType` on the image content block object.
[VERIFIED: AI-SPEC Section 3 Common Pitfalls item 2]

### Pitfall 3: Instantiating Anthropic client at module scope

**What goes wrong:** `env.ANTHROPIC_API_KEY` may be undefined during module evaluation in some deployment environments. A module-scope client creation crashes the entire route file on import.
**How to avoid:** Instantiate `anthropic("claude-sonnet-4-6", { apiKey: env.ANTHROPIC_API_KEY })` INSIDE the handler function, AFTER the `if (!env.ANTHROPIC_API_KEY)` guard.
[VERIFIED: src/app/api/translate/route.ts — DeepL follows exact same pattern]

### Pitfall 4: Missing `clearTimeout` in `finally` block

**What goes wrong:** If the vision call resolves before the 30s AbortController fires, the timer continues running. In local dev (long-lived server process), this causes a dangling timer that fires during a later request and aborts it.
**How to avoid:** Always `clearTimeout(timeout)` in a `finally` block.
[VERIFIED: AI-SPEC Section 4b.2 — AbortController pattern explicitly shows `finally { clearTimeout(timeout) }`]

### Pitfall 5: Assuming `Content-Length` is always present for the 7MB cap

**What goes wrong:** Checking only `Content-Length` for D-11 will miss requests sent with chunked transfer encoding (e.g., from some HTTP clients or proxies). The cap silently fails to fire.
**How to avoid:** Use `Content-Length` as a fast-path hint but ALWAYS apply the post-parse base64 estimate (`Math.ceil((image.length * 3) / 4)`) as the authoritative check.
[ASSUMED: Content-Length absence in chunked transfer; standard HTTP knowledge]

### Pitfall 6: `DeckOption` not exposing `targetLanguage`

**What goes wrong:** `handleExtract` needs the deck's `targetLanguage` to pass in the request body (D-05). If `DeckOption` only exposes `id` and `name`, the client cannot send the language.
**How to avoid:** Planner must inspect `src/components/deck-switcher.tsx` and verify `DeckOption` includes a `targetLanguage` field. If absent, extend `DeckOption` and the parent server component that fetches decks.
**Action required:** Planner verification task.

### Pitfall 7: `extractWords: []` vs `extractWords: null` display logic

**What goes wrong:** Treating `[]` and `null` the same in the render branch means the no-words state (EXT-03) is never shown separately — the component shows nothing or falls back to the idle state.
**How to avoid:** The render logic must distinguish `null` (never attempted), `[]` (attempted, no words — EXT-03 state), and `string[]` with length > 0 (success). The UI-SPEC State 2 note explicitly says: "If `extractWords.length === 0` this state is NOT shown — fall through to State 3 (no-words)."
[VERIFIED: UI-SPEC State 2 note]

---

## Code Examples

### image-constants.ts (new shared module, D-12)

```typescript
// src/lib/image-constants.ts
// [VERIFIED: extracted from src/lib/image-validation.ts — VERIFIED: codebase]
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes
```

### image-validation.ts refactor (D-12 — behavior unchanged)

```typescript
// src/lib/image-validation.ts — after refactor
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image-constants";

export type ValidationResult = | { ok: true } | { ok: false; message: string };

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "unknown format";
    return { ok: false, message: `JPG, PNG, or WebP only — that file is a ${ext}. Please choose a supported format.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, message: `That image is ${mb}MB — please pick one under 5MB.` };
  }
  return { ok: true };
}
```

### env.ts additions (D-03)

```typescript
// Two additions to src/env.ts — server block and runtimeEnv block
// server block addition:
ANTHROPIC_API_KEY: z.string().min(1).optional(),
// runtimeEnv block addition:
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
// [VERIFIED: mirrors DEEPL_API_KEY pattern exactly — VERIFIED: src/env.ts]
```

### Magic-byte check helper

```typescript
// src/app/api/extract/route.ts — inline helper
// [VERIFIED: JPEG/PNG/WebP signatures — standard format specifications]
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png":  (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46,
};

function verifyMagicBytes(dataUrl: string, declaredMime: string): boolean {
  const validator = MAGIC[declaredMime];
  if (!validator) return false;
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return false;
  try {
    const bytes = Uint8Array.from(atob(dataUrl.slice(comma + 1, comma + 17)), (c) => c.charCodeAt(0));
    return validator(bytes);
  } catch {
    return false; // atob throws on invalid base64
  }
}
```

### Guard ordering in route handler (AI-SPEC Section 4 — verbatim)

```typescript
// Guard sequence — MUST mirror this order per CONTEXT D-14 / AI-SPEC Section 4
// 1. auth        → 401
// 2. rate limit  → 429
// 3. json parse  → 400
// 4. zod schema  → 400
// 5. content-length hint → 413 (fast path, unreliable — apply before json parse if present)
// 6. base64 size estimate → 413 (authoritative — after json parse, before magic-byte decode)
// 7. mime allow-list → 415
// 8. magic-byte  → 415
// 9. api key     → 503
// 10. abort controller setup
// 11. generateText() vision call
// 12. 200 { words, detectedLanguage? }
// [VERIFIED: AI-SPEC Section 4 guard ordering; NOTE: content-length (5) added before json parse
//  as fast-path enhancement on top of AI-SPEC; base64 size estimate (6) is AI-SPEC step 5]
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `file-type` v20+ is ESM-only — hand-rolled magic bytes are preferable | Section 2 | If `file-type` is actually CJS-compatible, no risk — hand-rolled is still correct; the assumption only affects the "why not use file-type" rationale |
| A2 | Client `Content-Length` header may be absent in chunked transfer encoding | Section 3 | If always present in this deployment context, Stage A check alone would suffice; Stage B is still correct either way |
| A3 | `request.json()` buffers the full body before resolving; no streaming parse | Section 3 | If Next.js 16 internally streams and truncates large bodies before `json()` resolves, the Stage B check could behave unexpectedly. No bundled docs contradict this assumption. |
| A4 | Client-side AbortController at 35s (5s buffer over server's 30s) prevents client abort before server 504 | Section 4 | If network latency is very high, client abort could fire before server responds with 504; client would see a generic network error instead. Low risk in practice. |
| A5 | `DeckOption` type from `deck-switcher.tsx` does not currently include `targetLanguage` | Section 4 | If it already includes `targetLanguage`, no change is needed to `DeckOption` — the planner should verify |

---

## Open Questions

1. **Does `DeckOption` include `targetLanguage`?**
   - What we know: `image-upload-flow.tsx` imports `DeckOption` from `@/components/deck-switcher`. The component needs `targetLanguage` for D-05.
   - What's unclear: Whether `DeckOption` currently exposes `targetLanguage` or only `id`/`name`.
   - Recommendation: Planner reads `src/components/deck-switcher.tsx` before writing plan tasks. If `targetLanguage` is absent, add it to `DeckOption` and to the server component that assembles the `decks` prop.

2. **`maxDuration = 60` vs Vercel plan limits**
   - What we know: The bundled docs confirm `maxDuration` is a valid route segment config.
   - What's unclear: The Vercel Hobby plan may cap function execution at 60s or less; a value of 60 may hit the plan limit exactly.
   - Recommendation: Keep `maxDuration = 60`; if deploy fails with a quota error, reduce to 30 (matching the AbortController timeout).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v25.8.1 | — |
| `ai` package | EXT-01 vision call | No (not installed) | — | Install: `npm install ai@6.0.185` |
| `@ai-sdk/anthropic` | EXT-01 vision call | No (not installed) | — | Install: `npm install @ai-sdk/anthropic@3.0.78` |
| `ANTHROPIC_API_KEY` | EXT-01 vision call | Unknown (not in env.ts yet) | — | Route returns 503 if absent; dev can run without it |
| `file-type` | Magic-byte sniffing | Not installed | — | Hand-rolled check (no install needed) |
| Vitest | Test harness | Yes | `^4.1.1` | — |

**Missing dependencies with fallback:**
- `ai` + `@ai-sdk/anthropic` — install step is Wave 0 task; route will not compile without them
- `ANTHROPIC_API_KEY` — env var; app starts without it but extraction returns 503

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.1` |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/image-constants.test.ts src/lib/image-validation.test.ts src/app/api/extract/__tests__/extract.unit.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |
| Eval suite command | `RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXT-01 | Route returns `{ words }` for valid image + auth | Unit (mocked AI SDK) | `npx vitest run src/app/api/extract/__tests__/extract.unit.test.ts` | No — Wave 0 |
| EXT-01 | AI SDK vision call returns correct word list (eval) | Live eval (hits Anthropic) | `RUN_EXTRACTION_EVALS=true npx vitest run ...extract-eval.test.ts` | No — Wave 0 + manual fixtures |
| EXT-02 | Client button disabled while `extracting: true` | Unit (reducer) | `npx vitest run src/app/api/extract/__tests__/extract-reducer.test.ts` | No — Wave 0 |
| EXT-03 | `{ words: [] }` response → `EXTRACT_NO_WORDS` action | Unit (reducer) | same as EXT-02 file | No — Wave 0 |
| EXT-03 | Code-based: no-text fixture images return `words: []` (eval) | Live eval | `RUN_EXTRACTION_EVALS=true npx vitest run ...extract-eval.test.ts` | No — Wave 0 + manual fixtures |
| EXT-04 | Non-2xx response preserves `file`/`previewUrl`/`selectedDeckId` | Unit (reducer) | same as EXT-02 file | No — Wave 0 |
| EXT-05 | Route returns 401 for unauthenticated request | Unit (mocked auth) | `npx vitest run src/app/api/extract/__tests__/extract.unit.test.ts` | No — Wave 0 |
| EXT-05 | Route returns 413 for oversized payload | Unit | same | No — Wave 0 |
| EXT-05 | Route returns 415 for wrong MIME / bad magic bytes | Unit | same | No — Wave 0 |
| EXT-05 | Route returns 429 for rate-limited user | Unit (mocked rate limiter) | same | No — Wave 0 |
| D-12 | `validateImageFile` behavior unchanged after constants refactor | Unit (existing) | `npx vitest run src/lib/image-validation.test.ts` | YES — existing 8 tests |
| D-12 | `ALLOWED_IMAGE_TYPES` and `MAX_IMAGE_BYTES` exported from `image-constants.ts` | Unit | `npx vitest run src/lib/image-constants.test.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/image-validation.test.ts` (confirm refactor didn't break Phase 9)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green + `npm run typecheck` + `npm run lint` before `/gsd-verify-work`
- **Eval gate (optional, before production):** `RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts` — requires ANTHROPIC_API_KEY and manually-authored fixtures

### Wave 0 Gaps

- [ ] `src/lib/image-constants.test.ts` — verifies exports exist and have correct values
- [ ] `src/app/api/extract/__tests__/extract.unit.test.ts` — covers EXT-01/EXT-05 guard sequence with mocked AI SDK + auth
- [ ] `src/app/api/extract/__tests__/extract-reducer.test.ts` — covers EXT-02/EXT-03/EXT-04 reducer actions
- [ ] `src/app/api/extract/__tests__/extract-eval.test.ts` — eval harness skeleton (gated by `RUN_EXTRACTION_EVALS`); test file must exist even if fixtures are empty
- [ ] `src/app/api/extract/__tests__/fixtures/` directory — 20 reference images (MANUAL: Joshua curates)
- [ ] `src/app/api/extract/__tests__/reference-labels.json` — ground-truth word lists (MANUAL: Joshua + FR/ES tutor)

**Existing test that acts as a Wave 0 regression gate (DO NOT BREAK):**
- `src/lib/image-validation.test.ts` — 8 tests; must remain green after D-12 refactor

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **CRITICAL:** This is NOT the Next.js from training data. Always read relevant guides in `node_modules/next/dist/docs/` before writing code. This research has done so — all Next.js specifics above are verified against bundled docs or marked ASSUMED.
- Vitest is the test framework (not Jest). Environment: `node` (from `vitest.config.ts`).
- Biome is the linter/formatter — no ESLint, no Prettier.
- No new UI dependencies (only `ai` + `@ai-sdk/anthropic` are added — server-side only).
- `proxy.ts` (not `middleware.ts`) for Next.js 16 middleware.
- `auth.api.getSession({ headers: await headers() })` is the auth pattern — note the `await headers()` (Next.js 15+ async headers).

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler API; POST signature; body parsing
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md` — `maxDuration` route segment config
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` — confirms `bodySizeLimit` is Server Actions only (NOT Route Handlers)
- `src/app/api/translate/route.ts` — authoritative pattern for the new route; verified in codebase
- `src/lib/rate-limit.ts` — `createRateLimiter` interface; verified
- `src/lib/image-validation.ts` — constants to extract; verified
- `src/lib/image-validation.test.ts` — 8 tests importing only `validateImageFile`; safe refactor confirmed
- `src/env.ts` — `DEEPL_API_KEY` pattern to mirror; verified
- `src/components/image-upload-flow.tsx` — reducer state, action types, `handleExtract` no-op; verified
- `10-AI-SPEC.md` — framework decision, API patterns, eval strategy; treated as authoritative
- `10-UI-SPEC.md` — reducer actions, state fields, copy strings; treated as authoritative

### Secondary (MEDIUM confidence)
- AI-SPEC Section 3 sources (verified by AI-SPEC researcher 2026-05-19): ai-sdk.dev v6 docs, Anthropic provider docs, npm registry

### Tertiary (LOW confidence — marked ASSUMED in text)
- `file-type` v20+ ESM-only claim — training knowledge, not verified in this session
- Content-Length absence in chunked transfer — standard HTTP spec knowledge, not verified against Next.js 16

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against codebase and AI-SPEC
- Architecture: HIGH — verified against bundled Next.js 16 docs and existing route pattern
- Shared constants refactor: HIGH — test file verified; refactor approach is pure re-export
- Magic-byte approach: HIGH — standard format specs; "no new dep" rationale is MEDIUM (file-type ESM claim ASSUMED)
- Body size handling: MEDIUM — no bundled docs for Route Handler limits (confirmed absent); Stage B estimate is HIGH confidence
- Client wiring: HIGH — verified against UI-SPEC and existing reducer pattern

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (stable stack; AI-SPEC model ID `claude-sonnet-4-6` should be re-verified if > 30 days pass)

---

## RESEARCH COMPLETE
