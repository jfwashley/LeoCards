# Phase 10: Vision Extraction Endpoint — Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 9 (new/modified files)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/api/extract/route.ts` | route handler | request-response | `src/app/api/translate/route.ts` | exact |
| `src/lib/image-constants.ts` | utility / constants | — | `src/lib/image-validation.ts` (source of constants) | role-match |
| `src/lib/image-constants.test.ts` | test | — | `src/lib/image-validation.test.ts` | exact |
| `src/lib/image-validation.ts` (edit) | utility | — | self (refactor: swap local consts for imports) | self |
| `src/env.ts` (edit) | config | — | self (`DEEPL_API_KEY` lines to mirror) | self |
| `src/components/image-upload-flow.tsx` (edit) | component | event-driven | self (Phase 9 `useReducer` + `handleExtract` no-op to wire) | self |
| `src/app/api/extract/__tests__/extract.unit.test.ts` | test | — | `src/lib/deck-actions.test.ts` | exact |
| `src/app/api/extract/__tests__/extract-reducer.test.ts` | test | — | `src/lib/image-validation.test.ts` | role-match |
| `src/app/api/extract/__tests__/extract-eval.test.ts` | eval test | — | `src/lib/image-validation.test.ts` + `describe.skipIf` pattern | role-match |

---

## Pattern Assignments

### `src/app/api/extract/route.ts` (route handler, request-response)

**Analog:** `src/app/api/translate/route.ts`

**THE pattern to mirror.** The diff is: DeepL call → AI SDK `generateText` + `Output.object` vision call, plus the extra 413/415/504 status codes and the stricter rate limiter.

**Imports pattern** (`src/app/api/translate/route.ts` lines 1–6):
```typescript
import * as deepl from "deepl-node";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
```
For the extract route, replace the deepl import with:
```typescript
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image-constants";
```

**Module-scope rate limiter instantiation** (lines 9–9):
```typescript
const translateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });
```
For extract, use `maxRequests: 10` (D-17 — vision is more expensive than translate):
```typescript
const visionLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
```

**Route segment config** — add above the `POST` export (not present in translate route; required for D-13):
```typescript
export const maxDuration = 60;
```

**Auth guard + rate-limit guard** (lines 24–37 — copy verbatim, change limiter name):
```typescript
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = visionLimiter.check(session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }
```

**JSON parse guard** (lines 40–45 — copy verbatim):
```typescript
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
```

**503 guard pattern** (lines 63–65 — copy verbatim, change key name):
```typescript
  if (!env.DEEPL_API_KEY) {
    return Response.json({ error: "Translation service not configured" }, { status: 503 });
  }
  const client = new deepl.DeepLClient(env.DEEPL_API_KEY);
```
For extract (instantiate inside handler AFTER key check, per D-03):
```typescript
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Vision service not configured" }, { status: 503 });
  }
  const model = anthropic("claude-sonnet-4-6", { apiKey: env.ANTHROPIC_API_KEY });
```

**try/catch/502 error handling** (lines 72–81 — copy structure, extend catch for 504/NoObjectGeneratedError):
```typescript
  try {
    const result = await client.translateText(text, sourceLang, targetLangCode);
    return Response.json({ translation: result.text });
  } catch {
    return Response.json(
      { error: "Translation service unavailable" },
      { status: 502 },
    );
  }
```
For extract, the catch block must additionally distinguish `AbortError` (504) and `NoObjectGeneratedError` (200 `{words:[]}`) before the generic 502 fallthrough. Add `AbortController` + `clearTimeout` in `finally`.

**Full guard ordering for extract route** (per AI-SPEC Section 4):
```
1. auth.api.getSession()         → 401
2. visionLimiter.check()         → 429
3. request.json()                → 400
4. RequestSchema.safeParse()     → 400
5. Content-Length header hint    → 413 (fast path, before json parse ideally; apply here if header present)
6. base64 size estimate          → 413 (Math.ceil((image.length * 3) / 4) > 7MB)
7. MIME allow-list check         → 415
8. magic-byte check              → 415
9. env.ANTHROPIC_API_KEY absent  → 503
10. AbortController setup (30s)
11. anthropic() + generateText() call
12. Return 200 { words, detectedLanguage? }
```

---

### `src/lib/image-constants.ts` (utility / constants)

**Analog:** `src/lib/image-validation.ts` (lines 1–2 — the private constants being promoted to exports)

**Source constants** (`src/lib/image-validation.ts` lines 1–2):
```typescript
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes
```

**New module shape** (rename to descriptive exported names per RESEARCH.md Section 1):
```typescript
// src/lib/image-constants.ts
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes
```

No imports, no logic — pure constant exports. This module is a standalone constants file; there is no existing analog with this exact shape, but the values are extracted verbatim from `image-validation.ts`.

---

### `src/lib/image-constants.test.ts` (test)

**Analog:** `src/lib/image-validation.test.ts`

**Test file structure** (`src/lib/image-validation.test.ts` lines 1–3):
```typescript
import { describe, expect, it } from "vitest";
import { validateImageFile } from "@/lib/image-validation";
```
For image-constants test, import the exports:
```typescript
import { describe, expect, it } from "vitest";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image-constants";
```

**Test pattern** (no `vi.mock` needed — pure module, no side effects):
```typescript
describe("image-constants", () => {
  it("ALLOWED_IMAGE_TYPES includes jpeg, png, webp", () => {
    expect(ALLOWED_IMAGE_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has("image/png")).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has("image/webp")).toBe(true);
  });

  it("ALLOWED_IMAGE_TYPES does not include gif or heic", () => {
    expect(ALLOWED_IMAGE_TYPES.has("image/gif")).toBe(false);
    expect(ALLOWED_IMAGE_TYPES.has("image/heic")).toBe(false);
  });

  it("MAX_IMAGE_BYTES is exactly 5MB", () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});
```

**No vi.hoisted / vi.mock needed** — constants module has no external dependencies.

---

### `src/lib/image-validation.ts` (edit — D-12 refactor)

**Analog:** self. This is a pure refactor: replace two `const` declarations with `import` and rename the identifiers used within the function body. No behavior change; all 8 existing tests must remain green.

**Before** (lines 1–2 become an import):
```typescript
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes
```

**After** (lines 1–2 replaced):
```typescript
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/image-constants";
```

Update usages inside `validateImageFile` (lines 9 and 16):
- `ALLOWED_TYPES.has(file.type)` → `ALLOWED_IMAGE_TYPES.has(file.type)`
- `file.size > MAX_BYTES` → `file.size > MAX_IMAGE_BYTES`

**Verification gate:** `npx vitest run src/lib/image-validation.test.ts` must remain fully green (8/8 pass) — no test imports the constant names, only `validateImageFile`.

---

### `src/env.ts` (edit — D-03)

**Analog:** self. Mirror the `DEEPL_API_KEY` pattern exactly.

**Existing `DEEPL_API_KEY` pattern** (`src/env.ts` lines 9 and 19):
```typescript
// server block (line 9):
DEEPL_API_KEY: z.string().min(1).optional(),
// runtimeEnv block (line 19):
DEEPL_API_KEY: process.env.DEEPL_API_KEY,
```

**New lines to add** — identical structure, new key name:
```typescript
// server block (after DEEPL_API_KEY line):
ANTHROPIC_API_KEY: z.string().min(1).optional(),
// runtimeEnv block (after DEEPL_API_KEY line):
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
```

**Critical:** `.optional()` is required so the app starts without the key in dev. The 503 guard in the route handler is the runtime gate, not the schema. Do not make this field required — it would break `npm run dev` with no key set.

---

### `src/components/image-upload-flow.tsx` (edit — Phase 10 wiring)

**Analog:** self. The Phase 9 `useReducer` state machine is already in place; this edit extends it.

**Current `ImageFlowState`** (lines 20–26):
```typescript
interface ImageFlowState {
  step: "pick" | "deck";
  file: File | null;
  previewUrl: string | null;
  pickError: string | null;
  selectedDeckId: string;
}
```
**Add three new fields:**
```typescript
  extracting: boolean;
  extractError: { status: number; message: string } | null;
  extractWords: string[] | null; // null=not tried; []=no-words; [...]= success
```

**Current `ImageFlowAction` union** (lines 29–35):
```typescript
type ImageFlowAction =
  | { type: "FILE_PICKED"; file: File; previewUrl: string }
  | { type: "FILE_ERROR"; message: string }
  | { type: "CLEAR_FILE" }
  | { type: "ADVANCE_STEP" }
  | { type: "BACK_TO_PICK" }
  | { type: "SET_DECK"; deckId: string };
```
**Add five new action variants:**
```typescript
  | { type: "EXTRACT_START" }
  | { type: "EXTRACT_SUCCESS"; words: string[] }
  | { type: "EXTRACT_NO_WORDS" }
  | { type: "EXTRACT_ERROR"; status: number; message: string }
  | { type: "EXTRACT_RETRY" }
```

**Current reducer pattern** (lines 37–72 — copy the `switch` case structure):
```typescript
function imageFlowReducer(state: ImageFlowState, action: ImageFlowAction): ImageFlowState {
  switch (action.type) {
    case "FILE_PICKED":
      return { ...state, file: action.file, previewUrl: action.previewUrl, pickError: null };
    // ... other cases
    default:
      return state;
  }
}
```
**New cases to add before `default:`:**
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
```

**Current `handleExtract` no-op** (line 127):
```typescript
function handleExtract() {}
```
**Replace with full async implementation** (per RESEARCH.md Section 4 — `handleExtract` pattern):
- Dispatch `EXTRACT_START`
- Read file as data-URL via `FileReader`
- Find `deck.language` from `decks` prop — it is already BCP-47 (`"en"`/`"fr"`/`"es"`); use directly as the `targetLanguage` value. NO `DeckOption` schema change (see DeckOption resolution below)
- `AbortController` with 35s client timeout (5s buffer over server's 30s)
- `fetch("/api/extract", { method: "POST", body: JSON.stringify({ image, mimeType, deckId, targetLanguage }) })`
- On `res.ok`: check `data.words.length` → `EXTRACT_SUCCESS` or `EXTRACT_NO_WORDS`
- On non-2xx: dispatch `EXTRACT_ERROR` with `res.status` + `data.error`
- On catch: `AbortError` → `EXTRACT_ERROR` status 504; else status 0 network error
- `finally`: `clearTimeout(timeoutId)`

**New lucide import** (line 3 — extend existing import):
```typescript
import { ArrowLeft, Loader2, ImageOff, AlertCircle, X } from "lucide-react";
```

**`useReducer` initial state** (lines 79–85 — add new fields with initial values):
```typescript
const [state, dispatch] = useReducer(imageFlowReducer, {
  step: "pick",
  file: null,
  previewUrl: null,
  pickError: null,
  selectedDeckId: defaultDeckId,
  extracting: false,       // ADD
  extractError: null,      // ADD
  extractWords: null,      // ADD
});
```

**Step 2 render branch** (lines 140–174) — extend the existing `if (state.step === "deck")` block to render the 5 client states (idle, in-flight, success, no-words, error) per UI-SPEC interaction states.

---

### `src/components/deck-switcher.tsx` — `DeckOption` type (open question resolved)

**Finding** (`src/components/deck-switcher.tsx` lines 28–32):
```typescript
export interface DeckOption {
  id: string;
  name: string;
  language: string;
}
```

**`targetLanguage` is ABSENT.** The field is called `language` (not `targetLanguage`). `handleExtract` needs `targetLanguage` for the D-05 BCP-47 value to send in the request body.

**Resolution options (planner decides):**
1. Add `targetLanguage: string` to `DeckOption` — requires updating the server component that assembles the `decks` prop to include it, and verifying `deck.language` is already a BCP-47 value (it is: `"en"`, `"fr"`, `"es"` per the `ALL_LANGUAGES` array in `deck-switcher.tsx` lines 22–26).
2. Use `deck.language` directly as the BCP-47 value in `handleExtract` — since `language` is already BCP-47, this is a simpler fix: `const targetLanguage = deck?.language ?? "fr"`.

**Recommendation:** Option 2 (use `deck.language`) requires no schema change and no server component update. The field is already BCP-47. The only required change is in `handleExtract`: `deck?.language` instead of `deck?.targetLanguage`. The variable can still be named `targetLanguage` locally for clarity.

---

### `src/app/api/extract/__tests__/extract.unit.test.ts` (test — route handler unit tests)

**Analog:** `src/lib/deck-actions.test.ts`

**This is the primary unit test for EXT-01/EXT-05 guard sequence.** It tests the route handler with mocked auth, rate limiter, and AI SDK.

**`vi.hoisted` pattern** (`src/lib/deck-actions.test.ts` lines 4–34 — copy structure):
```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession, mockLimiterCheck, mockGenerateText } = vi.hoisted(() => {
  return {
    mockGetSession: vi.fn(),
    mockLimiterCheck: vi.fn(),
    mockGenerateText: vi.fn(),
  };
});
```

**`vi.mock` calls** (after `vi.hoisted`, before subject import — lines 37–61 pattern):
```typescript
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn().mockReturnValue({ check: mockLimiterCheck }),
}));

vi.mock("ai", () => ({
  generateText: mockGenerateText,
  Output: { object: vi.fn().mockReturnValue({}) },
  NoObjectGeneratedError: { isInstance: vi.fn().mockReturnValue(false) },
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue({}),
}));

vi.mock("@/env", () => ({
  env: { ANTHROPIC_API_KEY: "test-key" },
}));
```

**Subject import** (after all `vi.mock` calls — pattern from deck-actions.test.ts line 63):
```typescript
import { POST } from "@/app/api/extract/route";
```

**Test helpers** (pattern from deck-actions.test.ts lines 77–79):
```typescript
function mockSession(userId = "user-123") {
  mockGetSession.mockResolvedValue({ user: { id: userId } });
}
function mockNoSession() { mockGetSession.mockResolvedValue(null); }
function mockAllowed() { mockLimiterCheck.mockReturnValue({ allowed: true }); }
function mockRateLimited() {
  mockLimiterCheck.mockReturnValue({ allowed: false, retryAfterMs: 30_000 });
}
```

**`beforeEach`** (pattern from deck-actions.test.ts line 85):
```typescript
beforeEach(() => { vi.clearAllMocks(); });
```

**Core test structure** — EXT-05 guard sequence tests, one per status code:
```typescript
describe("POST /api/extract", () => {
  it("returns 401 for unauthenticated request", ...)
  it("returns 429 with Retry-After for rate-limited user", ...)
  it("returns 400 for invalid JSON body", ...)
  it("returns 400 for missing required fields", ...)
  it("returns 413 for oversized payload", ...)
  it("returns 415 for disallowed MIME type", ...)
  it("returns 415 for bad magic bytes", ...)
  it("returns 503 when ANTHROPIC_API_KEY is absent", ...)
  it("returns 200 { words } for valid request", ...)
  it("returns 200 { words: [] } for no-words result (EXT-03)", ...)
  it("returns 504 on AbortError", ...)
  it("returns 502 on generic vision error", ...)
});
```

**Request factory helper** (to create a `Request` with a body — needed since `POST` takes `Request`):
```typescript
function makeRequest(body: unknown) {
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
```

---

### `src/app/api/extract/__tests__/extract-reducer.test.ts` (test — reducer unit tests)

**Analog:** `src/lib/image-validation.test.ts` (pure function, no mocks needed)

**No `vi.mock` needed** — the reducer is a pure function imported directly.

**Import pattern** (like image-validation.test.ts lines 1–2):
```typescript
import { describe, expect, it } from "vitest";
// Import the reducer directly — it must be exported or tested via an extraction helper
```

**Note for planner:** The reducer `imageFlowReducer` is not currently exported from `image-upload-flow.tsx`. For testability, it should be exported (or extracted to a separate `image-flow-reducer.ts` file). The planner should decide whether to export it from the component file (`export function imageFlowReducer`) or split it out. Exporting from the component file is simpler.

**Test structure:**
```typescript
describe("imageFlowReducer — extraction actions", () => {
  const baseState = { step: "deck", file: mockFile, previewUrl: "blob:...",
    pickError: null, selectedDeckId: "deck-1",
    extracting: false, extractError: null, extractWords: null };

  it("EXTRACT_START sets extracting: true, clears error and words", ...)
  it("EXTRACT_SUCCESS sets extractWords and clears extracting", ...)
  it("EXTRACT_NO_WORDS sets extractWords to [] (not null)", ...)
  it("EXTRACT_ERROR sets extractError, preserves file/previewUrl/selectedDeckId", ...)
  it("EXTRACT_RETRY behaves identically to EXTRACT_START", ...)
  // EXT-04 preservation check:
  it("EXTRACT_ERROR does not touch file, previewUrl, or selectedDeckId", ...)
});
```

---

### `src/app/api/extract/__tests__/extract-eval.test.ts` (eval test — gated)

**Analog:** `src/lib/image-validation.test.ts` structure + `describe.skipIf` gating pattern from RESEARCH.md Section 5.

**Gating pattern** (per RESEARCH.md Section 5 / AI-SPEC Section 5):
```typescript
import { describe, it, expect } from "vitest";

const RUN_EVALS = process.env.RUN_EXTRACTION_EVALS === "true";

describe.skipIf(!RUN_EVALS)("Extraction eval — reference dataset", () => {
  // Tests hit the real Anthropic API — slow, cost-incurring
  // Run with: RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts
});
```

**No `vi.mock` in this file** — eval tests hit the real Anthropic API. They need `ANTHROPIC_API_KEY` in the environment to run.

**Structure** (once fixtures are manually authored — Wave 0 gap):
- Load each fixture from `fixtures/` directory
- POST to the live route (or call the extraction logic directly if the route is importable)
- Assert against `reference-labels.json` ground truth for code-based dimensions (D3, D4, D5a)

---

## Shared Patterns

### Authentication
**Source:** `src/app/api/translate/route.ts` lines 24–29
**Apply to:** `src/app/api/extract/route.ts`
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```
**Note:** `await headers()` is required (Next.js 15+ async headers API). Do not omit the `await`.

### Rate Limiting (429 + Retry-After)
**Source:** `src/app/api/translate/route.ts` lines 31–37
**Apply to:** `src/app/api/extract/route.ts`
```typescript
const limit = visionLimiter.check(session.user.id);
if (!limit.allowed) {
  return Response.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
  );
}
```
**Rate limiter interface** (`src/lib/rate-limit.ts` lines 34–65):
- `createRateLimiter({ windowMs, maxRequests })` — call at module scope
- `.check(userId: string)` → `{ allowed: true } | { allowed: false, retryAfterMs: number }`

### Zod safeParse 400 Pattern
**Source:** `src/app/api/translate/route.ts` lines 40–52
**Apply to:** `src/app/api/extract/route.ts`
```typescript
let body: unknown;
try {
  body = await request.json();
} catch {
  return Response.json({ error: "Invalid input" }, { status: 400 });
}
const parsed = RequestSchema.safeParse(body);
if (!parsed.success) {
  return Response.json({ error: "Invalid input" }, { status: 400 });
}
```

### 503 — Service Not Configured
**Source:** `src/app/api/translate/route.ts` lines 63–65
**Apply to:** `src/app/api/extract/route.ts`
```typescript
if (!env.DEEPL_API_KEY) {
  return Response.json({ error: "Translation service not configured" }, { status: 503 });
}
```

### Optional Env Var in `@t3-oss/env-nextjs`
**Source:** `src/env.ts` lines 9 and 19
**Apply to:** `src/env.ts` (new `ANTHROPIC_API_KEY` addition)
```typescript
// server block — .optional() means the app starts without the key in dev:
DEEPL_API_KEY: z.string().min(1).optional(),
// runtimeEnv block — direct process.env pass-through:
DEEPL_API_KEY: process.env.DEEPL_API_KEY,
```

### vi.hoisted + vi.mock Test Pattern
**Source:** `src/lib/deck-actions.test.ts` lines 4–61
**Apply to:** `src/app/api/extract/__tests__/extract.unit.test.ts`

Key rules extracted from the analog:
1. `vi.hoisted(() => { ... })` must be called BEFORE `vi.mock` factories — its return value is used inside mock factory functions.
2. All `vi.mock(...)` calls go before the subject import.
3. `beforeEach(() => { vi.clearAllMocks(); })` resets state between tests.
4. Re-wire mock return values after `clearAllMocks` if the mock returns chainable objects.

### useReducer State Extension Pattern
**Source:** `src/components/image-upload-flow.tsx` lines 20–72 (Phase 9 reducer)
**Apply to:** same file (Phase 10 extension)

The existing reducer:
- Uses spread-and-override (`{ ...state, field: newValue }`) for all cases
- Returns `state` unchanged from `default`
- Never mutates state directly
- The `BACK_TO_PICK` case (line 66) is the model for cases that reset to an earlier step without clearing unrelated state

---

## No Analog Found

All files have an analog or are self-edits. No files require falling back to RESEARCH.md patterns alone.

| File | Note |
|------|------|
| `src/app/api/extract/__tests__/fixtures/` | Manual curation only — 20 reference images authored by Joshua (Wave 0 gap per RESEARCH.md) |
| `src/app/api/extract/__tests__/reference-labels.json` | Manual ground-truth labels — Joshua + FR/ES tutor (Wave 0 gap) |

---

## DeckOption Open Question — Resolution

**Question** (RESEARCH.md Section 4 / Pitfall 6): Does `DeckOption` expose `targetLanguage`?

**Answer** (verified `src/components/deck-switcher.tsx` lines 28–32): No. `DeckOption` has `id`, `name`, `language`.

**Resolution:** Use `deck.language` directly in `handleExtract` as the BCP-47 value. No `DeckOption` schema change is required. The `language` field is already BCP-47 (`"en"`, `"fr"`, `"es"`). The local variable can be named `targetLanguage` for clarity when constructing the request body:
```typescript
const targetLanguage = deck?.language ?? "fr";
```
This is the simplest correct implementation and requires no changes to `deck-switcher.tsx` or any server component.

---

## Metadata

**Analog search scope:** `src/app/api/`, `src/lib/`, `src/components/`, `src/env.ts`
**Files read:** 11 source files + 4 spec files
**Pattern extraction date:** 2026-05-19
