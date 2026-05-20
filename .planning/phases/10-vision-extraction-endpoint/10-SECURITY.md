---
phase: 10
slug: vision-extraction-endpoint
status: verified
threats_total: 14
threats_closed: 14
threats_open: 0
asvs_level: 1
audit_date: 2026-05-20
created: 2026-05-20
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| build/deps | New third-party packages (`ai`, `@ai-sdk/anthropic`) enter supply chain | npm package code |
| env config | `ANTHROPIC_API_KEY` secret introduced into typed env surface | API secret |
| client → /api/extract | Untrusted JSON body crosses to server | base64 image, declared mimeType, deckId, targetLanguage |
| /api/extract → Anthropic | Server → paid third-party vision API | image bytes + system prompt |
| image text → model | Text rendered inside uploaded image is attacker-controllable | OCR'd text |
| browser → /api/extract (client UX) | Client-side double-submit / error-rendering surface | UX state only — server enforces |
| eval harness → Anthropic | Live eval sends real fixtures to paid vision API (cost-incurring, gated) | reference images |
| fixtures → git | Reference images committed to the repo | curated text-only images |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status | Evidence |
|-----------|----------|-----------|-------------|------------|--------|----------|
| T-10-01 | Tampering | dependency install | mitigate | Exact pinned versions (`ai@6.0.185`, `@ai-sdk/anthropic@3.0.78`); no caret; lockfile committed | closed | package.json pins `ai@6.0.185` + `@ai-sdk/anthropic@3.0.78` (10-01-SUMMARY self-check confirms) |
| T-10-02 | Information Disclosure | ANTHROPIC_API_KEY in env.ts | mitigate | Key in `server:` block only (never `client:`); `.optional()` so absence is a controlled 503 path | closed | src/env.ts:10 (server block) + :21 (runtimeEnv); absent from client block |
| T-10-03 | Spoofing | unauthenticated caller to /api/extract | mitigate | `auth.api.getSession` gate → 401 before any work (guard step 1) | closed | src/app/api/extract/route.ts:88-91 |
| T-10-04 | Denial of Service | oversized base64 body before costly vision call | mitigate | Content-Length fast path + authoritative `ceil(image.length*3/4) > 7MB` → 413 BEFORE decode/vision call (D-11, guard steps 3 & 6) | closed | src/app/api/extract/route.ts:108-111 (CL fast path) and :130-133 (authoritative estimate); WR-01 unified cap via MAX_SERVER_IMAGE_BYTES in src/lib/image-constants.ts:8 |
| T-10-05 | Spoofing/Tampering | spoofed `mimeType` field (client-forgeable) | mitigate | Server MIME allow-list + hand-rolled magic-byte signature sniff → 415 (D-10, guard steps 7-8); WR-02 added WEBP RIFF/WEBP subtype check | closed | src/app/api/extract/route.ts:136-143; MAGIC table at :51-67 (WEBP verifies bytes 0-3 RIFF + bytes 8-11 WEBP subtype per WR-02); `checkMagicBytes` at :69-84 |
| T-10-06 | Elevation/DoS | rate/cost abuse of expensive paid vision API | mitigate | `createRateLimiter({ windowMs: 60_000, maxRequests: 10 })` → 429 + Retry-After (D-17, guard step 2), stricter than translate's 30 | closed | src/app/api/extract/route.ts:14 (limiter) + :94-105 (check + Retry-After) |
| T-10-07 | Tampering | D-12 refactor regressing Phase 9 validation | mitigate | Phase 9's 8 image-validation tests retained as regression gate; refactor is pure re-export swap | closed | src/lib/image-validation.ts:1 imports from @/lib/image-constants; src/lib/image-constants.ts:1-10 single source of truth |
| T-10-08 | Tampering | prompt-injection via adversarial text inside uploaded image | accept | Low stakes (attacker poisons only their own deck); blast radius bounded by ExtractionSchema (`words: string[]`, ≤50 words, ≤100 chars), `temperature: 0`, system constraint "ONLY words visibly present". Additional IN-01 mitigation: `targetLanguage` (interpolated into system prompt) is fenced by BCP-47 regex to close that injection vector. Revisit if decks become shared/multi-user. | closed | Accepted Risks Log below; supporting controls at src/app/api/extract/route.ts:20-36 (schema), :47 (IN-01 regex fence), :167-173 (system prompt), :198 (temperature: 0) |
| T-10-09 | Information Disclosure | logging image bytes / extracted words (privacy) | mitigate | Catch-block logs metadata only; explicit prohibition on logging `image`/data-URL/`words` | closed | src/app/api/extract/route.ts:217-218 (schema-fail log, no payload) and :222 (generic vision-error log, no payload); no `console.*image|words|dataUrl` anywhere in route |
| T-10-10 | Information Disclosure | ANTHROPIC_API_KEY exposure | mitigate | Key read only from server `env`; client instantiated inside handler AFTER 503 key-presence gate; never at module scope | closed | src/app/api/extract/route.ts:146-151 (503 gate) + :164 (anthropic() inside try block within handler, post-gate); not present at module scope |
| T-10-11 | Denial of Service | rapid repeated Extract clicks (cost amplification) | mitigate | Client double-submit guard: button `disabled` while extracting AND early `if (state.extracting) return` in handleExtract; server limiter is authoritative backstop | closed | src/components/image-upload-flow.tsx:195 (early return guard), :311 (button disabled + aria-busy), :312-313 (aria-label) |
| T-10-12 | Information Disclosure | rendering raw server error body to user | mitigate | UI shows only `friendlyErrorCopy(status)` keyed off HTTP status; server `{ error }` string never displayed | closed | src/components/image-upload-flow.tsx:114-136 (friendlyErrorCopy) + :352 (renders only friendlyErrorCopy output, not data.error); WR-03 wraps FileReader error in Error at :205 |
| T-10-13 | Denial of Service | accidental cost from eval running on every CI push | mitigate | `describe.skipIf(!RUN_EXTRACTION_EVALS)` gate — live eval only runs on explicit opt-in | closed | src/app/api/extract/__tests__/extract-eval.test.ts uses RUN_EVALS gate (per 10-01 scaffold acceptance criteria — `describe.skipIf(!RUN_EVALS)` present) |
| T-10-14 | Information Disclosure | committing fixture images with incidental personal data | mitigate | Curator (Joshua) selects text-focused images; fixtures deliberately chosen text/menu/sign — flag any image with identifiable people during curation | closed | Documented curation gate in 10-04-PLAN.md Task checkpoint; fixtures directory remains under manual curator review |
| T-10-15 | Tampering | weakening eval assertions to force a pass | mitigate | 10-04-PLAN Task 2 action explicitly prohibits silently weakening assertions; failures recorded for prompt tuning | closed | 10-04-PLAN.md Task 2 action text + eval suite design (membership assertion, not silent slacking) |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-10-01 | T-10-08 | Prompt-injection via attacker text inside uploaded image. Attacker poisons only their own deck (single-user product). Blast radius bounded by output schema (`words: string[]`, max 50, max 100 chars each), `temperature: 0`, system-prompt constraint "ONLY words visibly present", and IN-01 BCP-47 regex fence on `targetLanguage`. Revisit if decks become shared / multi-user. | Joshua (PM) | 2026-05-19 |

---

## Unregistered Threat Flags

None. The four sub-plan SUMMARY threat-flags sections all map to existing registered threats (T-10-01 through T-10-15) — no novel surface introduced during implementation.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-20 | 14 | 14 | 0 | gsd-secure-phase auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (AR-10-01)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-20
