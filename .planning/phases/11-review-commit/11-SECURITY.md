---
phase: 11-review-commit
slug: review-commit
status: verified
threats_open: 0
threats_total: 12
threats_closed: 12
asvs_level: 1
audit_date: 2026-05-20
created: 2026-05-20
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail for the v2.0 image-to-flashcards review/commit pipeline.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → server action (`saveCard`) | TS union widening only; existing auth path unchanged | `source` literal `"image"` |
| client (ReviewList) → `getSameLanguageDeckBackWords` | Untrusted `deckId` crosses from browser to server | deckId (string) |
| client (ReviewList) → `saveImageCards` | Untrusted `deckId` + `cardInputs[]` cross from browser to server | deckId, front/back card text |
| ReviewList (client) → `/api/translate` | Reuses existing rate-limited DeepL route | word text, language codes |
| image-upload-flow.tsx → ReviewList | Pure client prop hand-off, no new server boundary | words, deckId, lang labels |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-11-01 | Tampering | `saveCard` source union widening (Plan 01) | accept | `cards.source` is free `text`; widening adds no privilege, no auth path change. See Accepted Risks. | closed |
| T-11-02 | n/a | Wave 0 test scaffolds (Plan 01) | accept | Pure mocked-unit scaffolds; no secrets, no image bytes, no logging. See Accepted Risks. | closed |
| T-11-03 | Information Disclosure | `getSameLanguageDeckBackWords` reading another user's vocabulary (Plan 02) | mitigate | Combined ownership+language gate: `and(eq(decks.id, deckId), eq(decks.userId, userId))` at `src/lib/deck-actions.ts:208`; foreign deckId → no row → `throw "Forbidden"` at line 210 before any `cards.back` is read. Second query also scoped `eq(decks.userId, userId)` at line 218. | closed |
| T-11-04 | Tampering / Elevation | `saveImageCards` writing cards into a deck the caller doesn't own (Plan 02) | mitigate | Ownership check via combined-WHERE (post-IN-01 hardening): `and(eq(decks.id, deckId), eq(decks.userId, userId))` at `src/lib/deck-actions.ts:273`; rejects foreign deckId with `throw "Forbidden"` at line 274 before any insert. Auth check at line 264–265. | closed |
| T-11-05 | Denial of Service | Large `cardInputs` array driving many sequential inserts (Plan 02) | mitigate | Hardened beyond original `accept` disposition via WR-01 fix: explicit `cardInputs.length > 100` cap at `src/lib/deck-actions.ts:244-246` throws `"Too many cards in a single request"`; per-field length cap (≤500 chars) and non-empty trim validation at lines 248–262; validation runs BEFORE auth/DB. Upstream Phase 10 word cap (~50) still applies. | closed |
| T-11-06 | Information Disclosure | Logging extracted words / image bytes in server actions (Plan 02) | mitigate | No `console.*` or remote logging of `cardInputs`, `back`, or image data in `getSameLanguageDeckBackWords` / `saveImageCards` (`src/lib/deck-actions.ts:197-299`). Errors return only `err.message` (line 292). | closed |
| T-11-07 | Denial of Service | Fan-out of up to ~50 `/api/translate` calls (Plan 03) | mitigate | Reuses existing per-user 30/min rate limiter on unchanged `/api/translate` endpoint (`src/components/review-list.tsx:257`); 429 → per-row `translationError` (never retried, never blocks batch). Word cap from Phase 10 D-08 (~50) applies upstream. | closed |
| T-11-08 | Information Disclosure | Logging extracted words / translations in ReviewList (Plan 03) | mitigate | Grep verified: ZERO `console.*` / `log(` calls in `src/components/review-list.tsx`. Errors are rendered inline only via reducer state (`translationError` field). | closed |
| T-11-09 | Tampering | Client forging deckId in saveImageCards/getSameLanguageDeckBackWords (Plan 03) | mitigate | Client holds no authority — authz enforced server-side at T-11-03 / T-11-04 (see `src/lib/deck-actions.ts:208`, `:273`). | closed |
| T-11-10 | n/a | Client review-list state machine (Plan 03) | accept | Pure UI state; no trust boundary beyond two server actions above. See Accepted Risks. | closed |
| T-11-11 | Tampering | Client passing `selectedDeckId` into ReviewList → server actions (Plan 04) | accept | Forwarding-only; all authz remains server-side (T-11-03 / T-11-04). IN-03 fix removes silent `"fr"` language fallback at `src/components/image-upload-flow.tsx:219` (dispatch `EXTRACT_ERROR` "Deck not found.") and `:415` (inline `role="alert"` "Deck not found.") — surfaces stale-prop inconsistencies instead of silently mis-routing language. See Accepted Risks. | closed |
| T-11-12 | n/a | EXTRACT_SUCCESS render branch (Plan 04) | accept | Render-branch swap only; no new logging, no new server boundary. See Accepted Risks. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-11-01 | T-11-01 | `cards.source` column is free `text` with no DB constraint; widening the TypeScript union to include `"image"` adds no new privilege, changes no auth path. Verified one-line edit at `src/lib/deck-actions.ts` saveCard signature; no migration. | Phase 11 Plan 01 author | 2026-05-19 |
| AR-11-02 | T-11-02 | Test scaffolds are pure mocked-unit constructs. No secrets, no image bytes, no extracted-word logging. Reviewed `src/components/review-list.test.ts` and `src/lib/deck-actions.test.ts`. | Phase 11 Plan 01 author | 2026-05-19 |
| AR-11-10 | T-11-10 | ReviewList is a pure client state machine; the only trust boundaries are the two server actions (T-11-03/04) and `/api/translate` (T-11-07), all addressed elsewhere. No additional client-side threats per security_context scope. | Phase 11 Plan 03 author | 2026-05-19 |
| AR-11-11 | T-11-11 | Wave 4 is a pure prop hand-off. The deckId forwarded was already used by the existing extract flow. IN-03 fix removes the only added risk (silent language fallback) by surfacing "Deck not found." instead of routing to `"fr"`. | Phase 11 Plan 04 author + WR/IN fix iteration | 2026-05-20 |
| AR-11-12 | T-11-12 | EXTRACT_SUCCESS branch swap introduces no logging, no new server endpoint, no new trust boundary. | Phase 11 Plan 04 author | 2026-05-19 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-20 | 12 | 12 | 0 | gsd-security-auditor (Claude) |

### Audit Notes (2026-05-20)

- All 12 STRIDE threats from PLAN files (T-11-01 through T-11-12) verified.
- **Mitigation evidence** cited inline with file:line references.
- **Post-review hardening (WR-01 / IN-01 / IN-03):** T-11-05 was originally disposition `accept` but is now actively `mitigate` (length cap + field validation in `saveImageCards`); T-11-04 ownership check upgraded from two-step to combined-WHERE pattern; T-11-11 hardened by removing silent `"fr"` language fallback in image-upload-flow.tsx.
- **WR-04** added 8 unit tests for `saveImageCards` (`src/lib/deck-actions.test.ts:413`), including Unauthorized, Forbidden, empty input, over-100 cap, empty/whitespace validation, >500-char validation, happy path, and continue-on-failure — directly exercising the T-11-04 / T-11-05 / T-11-06 mitigations.
- **WR-02** wrapped `handleNext` / `handleCommit` in try/catch (`src/components/review-list.tsx:498`, `:537`) — defensive robustness, not a security mitigation, but eliminates a stuck-UI denial-of-service against the user.
- No new threat surfaces identified beyond the registered set. No `console.*` logging present in `src/components/review-list.tsx` (grep confirmed). No `?? "fr"` silent fallback remains in `src/components/image-upload-flow.tsx` (grep confirmed).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-20
