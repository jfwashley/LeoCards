# Phase 10: Vision Extraction Endpoint - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

A protected server endpoint that accepts the user's chosen image (held client-side from Phase 9), calls Claude vision, and returns the vocabulary words found — with loading/double-submit handling, a "no words found" path, graceful recoverable errors, and server-side guarding (auth, rate limit, payload validation). Also wires Phase 9's `handleExtract` no-op to this endpoint and renders the resulting states.

**In scope:** the vision endpoint + client trigger/loading/error/no-words UX. Requirements EXT-01..EXT-05.
**Out of scope:** adding words to the deck, the editable review screen, DeepL translation of extracted words — all Phase 11. The image picker/preview/deck selection — Phase 9 (done). No art pass.

</domain>

<decisions>
## Implementation Decisions

### Vision SDK & model
- **D-01:** Use the **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`), called from the route handler. (User chose this over the official `@anthropic-ai/sdk`; it diverges from the codebase's direct-vendor-SDK convention — `deepl-node` is used directly in `/api/translate` — but is justified by native `generateObject`/zod structured output, which the extraction contract relies on, and provider abstraction.)
- **D-02:** Claude vision model = **Sonnet-tier** (balanced cost/accuracy). The exact current model ID is NOT decided here — the researcher MUST pin it against current Anthropic docs (use the `claude-api` skill).
- **D-03:** Add **`ANTHROPIC_API_KEY` to the typed `@/env` module**; endpoint returns **503 "service not configured"** if absent — mirroring `DEEPL_API_KEY` handling in `/api/translate`. Client instantiated inside the handler, never at module scope (same rule as translate route).
- **D-04:** New dependency: this phase introduces the first AI SDK dependency (`ai`, `@ai-sdk/anthropic`) — none exists today.

### Extraction contract
- **D-05:** Bias extraction to the **chosen deck's target language** — pass the deck's language into the prompt and ask Claude for vocabulary in that language. (Decks are per-language; user is learning that language.)
- **D-06:** Return words **exactly as seen** (verbatim surface forms) — NOT lemmatized. Tradeoff explicitly accepted: duplicates/inflections/articles are the user's to clean in the Phase 11 review screen; DeepL handles translation there.
- **D-07:** Output via **`generateObject` + a zod schema**, shape `{ words: string[]; detectedLanguage?: string }`. No free-text parsing. This typed object is the contract Phase 11 consumes.
- **D-08:** "No words found" (EXT-03) = **HTTP 200 with `{ words: [] }`**. Cap the returned list at **~50 words**.

### Image transport & server validation
- **D-09:** Client sends the image as **base64 / data-URL in a JSON body** (e.g. `{ image, mimeType, deckId }`), mirroring the JSON pattern of `/api/translate`; AI SDK vision content blocks take base64 directly. ~33% base64 size inflation is acknowledged (a 5MB image → ~6.7MB body).
- **D-10:** Server-side validation (EXT-05): **reuse Phase 9's MIME allow-list + 5MB cap as shared constants** AND add **magic-byte signature sniffing** server-side (client `mimeType` is spoofable). Reject disallowed type → 415; over-size → 413.
- **D-11:** **Hard payload cap enforced early → 413 BEFORE base64 decode or any vision call** (check content-length / declared size; ~7MB ceiling to allow base64 overhead on the 5MB image). DoS prevention.
- **D-12:** Extract `ALLOWED_IMAGE_TYPES` + `MAX_BYTES` into **one shared constants module** consumed by Phase 9 client validation AND Phase 10 server validation. This also closes the Phase 9 code-review finding (duplicated MIME source of truth, `09-REVIEW.md`). Phase 9's `validateImageFile` should be refactored to import from the shared module (no behavior change).

### Failure & resilience
- **D-13:** Vision call wrapped in an **AbortController ~30s timeout**; Next route **`maxDuration` ~60s** (explicit — Vercel default is too short); timeout → **504**.
- **D-14:** **HTTP status drives the client UI** (mirrors `/api/translate`): body `{ error: string }` + status codes — `200 {words:[]}`=no-words (EXT-03), `400`=bad input, `413`=too large, `415`=bad type, `429`=rate-limited (+`Retry-After`), `502/500`=vision failure, `503`=unconfigured, `504`=timeout. Client maps status → friendly copy. No separate typed error-code field.
- **D-15:** Double-submit prevention (EXT-02) = **client in-flight guard**: disable "Extract" + show loading state while a request is in flight; ignore further clicks until it resolves. Server rate-limiter is the backstop. No server-side idempotency/dedupe.
- **D-16:** On ANY error (EXT-04): **preserve `file` + `previewUrl` + `selectedDeckId` client-side** (never reset/navigate); show an inline error with a **"Try again"** affordance (re-calls the endpoint) and, for the no-words case, a "choose another image" affordance.
- **D-17:** Rate limit the endpoint via the **existing `createRateLimiter`** (`src/lib/rate-limit.ts`) at **~10 requests/min/user** — stricter than translate's 30/min because a vision call is costly (EXT-05). Same 429 + `Retry-After` shape as `/api/translate`.

### Claude's Discretion
- Exact prompt wording for the vision call (subject to D-05/D-06 constraints).
- Exact route path/filename for the endpoint (follow `src/app/api/.../route.ts` convention).
- Whether shared image constants live in the existing `image-validation` module or a new `image-constants` module — researcher/planner decide based on import cleanliness.
- Component decomposition for the client extraction state (loading/error/no-words) within the existing `ImageUploadFlow` reducer.

### Folded Todos
None — no pending todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Endpoint pattern (the analog to mirror)
- `src/app/api/translate/route.ts` — THE pattern: auth→401, `createRateLimiter` check→429+Retry-After, zod `safeParse`→400, typed `@/env`, client-in-handler, try/catch→502, 503 if key unset, `Response.json`.
- `src/lib/rate-limit.ts` — `createRateLimiter({ windowMs, maxRequests })` → `.check(userId)` → `{ allowed, retryAfterMs }`. Reuse for EXT-05 (D-17).
- `src/env` (typed env module) — pattern for adding `ANTHROPIC_API_KEY` (D-03), as `DEEPL_API_KEY` is wired.

### Phase 9 hand-off + reuse
- `.planning/phases/09-image-upload-deck-selection/09-CONTEXT.md` — D-03 (Extract button is the trigger, disabled until image+deck) and the documented Phase-9→10 hand-off (`handleExtract` no-op to wire).
- `src/components/image-upload-flow.tsx` — `handleExtract()` empty no-op + reducer state (`file`, `previewUrl`, `selectedDeckId`, step) this phase wires/extends.
- `src/lib/image-validation.ts` — Phase 9 pure validation + the `ALLOWED_TYPES`/`MAX_BYTES` constants to extract into a shared module (D-10/D-12).
- `.planning/phases/09-image-upload-deck-selection/09-REVIEW.md` — IN-01 (server magic-byte TODO), the duplicated-MIME finding (closed by D-12), WR-02 (paste `preventDefault` becomes relevant once this phase's flow gains state).

### AI integration
- Anthropic API / Vercel AI SDK official docs — researcher to pin the exact current Sonnet-tier vision model ID, `generateObject` image-input usage, and AbortSignal/timeout wiring. Use the `claude-api` skill.

**Note:** This is an AI-integration phase. `/gsd-plan-phase 10`'s AI-SPEC gate will likely trigger `/gsd-ai-integration-phase 10` (framework selection is effectively pre-decided as Vercel AI SDK per D-01, but eval strategy/guardrails are still valuable).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `/api/translate/route.ts`: copy its handler skeleton verbatim (auth/ratelimit/zod/env/try-catch/status codes) — swap DeepL for the AI SDK vision call.
- `src/lib/rate-limit.ts`: `createRateLimiter` — instantiate a vision limiter at `{ windowMs: 60_000, maxRequests: 10 }` (D-17).
- `src/lib/image-validation.ts`: existing allow-list/size constants to share (D-12); validation logic reusable server-side.
- `src/components/image-upload-flow.tsx`: existing `useReducer` flow with `handleExtract` placeholder + held `file`/`previewUrl`/`selectedDeckId` — extend with loading/error/no-words states (D-15/D-16).

### Established Patterns
- API routes: `src/app/api/**/route.ts`, `POST(request: Request)`, `Response.json(body, { status })`, auth via `auth.api.getSession({ headers: await headers() })`.
- Typed env via `@/env`; external client instantiated inside the handler, 503 if key missing.
- zod `safeParse` for request bodies → generic 400 "Invalid input".

### Integration Points
- Client: `handleExtract()` in `image-upload-flow.tsx` → POST base64 JSON to the new endpoint; consume `{ words, detectedLanguage? }`; render loading/error/no-words; hand the word list to Phase 11.
- New: `@/env` gains `ANTHROPIC_API_KEY`; new shared image-constants module; new `package.json` deps (`ai`, `@ai-sdk/anthropic`).

</code_context>

<specifics>
## Specific Ideas

- Mirror `/api/translate` so closely that the diff is "DeepL call → AI SDK `generateObject` vision call" plus the stricter rate limit and the 413/415/504 additions.
- The zod output schema (`{ words: string[]; detectedLanguage?: string }`) is the explicit contract Phase 11 will consume — keep it stable.
- Cost discipline is a recurring theme: explicit Extract trigger (Phase 9 D-03), ~10/min rate limit (D-17), ~50-word cap (D-08), Sonnet-tier not Opus (D-02).

</specifics>

<deferred>
## Deferred Ideas

- Lemmatization / dedupe of extracted words — explicitly rejected for Phase 10 (words returned as-seen, D-06); cleanup happens in Phase 11 review.
- Server-side idempotency/dedupe of identical image submissions — considered, rejected for EXT-02 (client guard + rate limiter sufficient).
- Observability/cost-tracking/telemetry for vision spend — not raised as in-scope; candidate for a future hardening phase or the 999.1 perf/ops backlog if desired.
- Adding extracted words to the deck + DeepL translation + editable review — Phase 11.

</deferred>

---

*Phase: 10-vision-extraction-endpoint*
*Context gathered: 2026-05-19*
