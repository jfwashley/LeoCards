---
phase: 26
slug: 26-performance-batch
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-22
---

# Phase 26 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (`register_authored_at_plan_time: true`) across five plan files (26-01..26-05 `<threat_model>` blocks). Verified against implemented code, not documentation/intent. Implementation files were read-only for this audit.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| review-list.tsx (browser) → /api/translate | Untrusted client-supplied `texts[]` array crosses into the server route | User-entered/extracted vocabulary words |
| /api/translate → DeepL API | Server forwards the array to the external translation service | Vocabulary words (cost/quota surface) |
| Study UI (browser) → /api/study/complete | Untrusted `grades[]` payload crosses into the authenticated write path | Study grades, cardIds |
| /api/study/complete → Neon (db.batch) | Server issues one atomic multi-statement transaction | Mastery/recall state |
| review-list.tsx (browser) → saveImageCards ("use server") | Untrusted card rows cross the client → server-action boundary | Front/back card text |
| saveImageCards → Neon | Server issues one multi-row insert into the caller's deck | Card rows |
| image-upload-flow.tsx (browser) → /api/extract | Untrusted (possibly unresized) image body crosses to the server | Image bytes (base64) |
| Browser → /habitat/clips/* static assets | Public static video files served with a caching directive | Non-user-keyed video bytes |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-26-01 | Denial of Service | `/api/translate` `texts[]` field | mitigate | `.max(50)` Zod bound — `src/app/api/translate/route.ts:25` | closed |
| T-26-02 | Spoofing / Elevation | `/api/translate` POST | accept-existing | `auth.api.getSession()` 401 gate untouched — `route.ts:42-45`; 30/min limiter untouched — `route.ts:47-58` | closed |
| T-26-03 | Tampering | `.refine()` text/texts mutual exclusivity | mitigate | Schema-level XOR guard — `route.ts:29-31` | closed |
| T-26-04 | Information Disclosure | DeepL failure path | accept | Generic 502 "Translation service unavailable" — `route.ts:106-111`, `121-126` (both array and singular branches) | closed |
| T-26-05 | Tampering / Repudiation | Replayed study commit | mitigate | WR-04 commitId WHERE guard kept byte-identical — `src/app/api/study/complete/route.ts:252-257`; replay-safety describe block still green — `route.test.ts:207-253` | closed |
| T-26-06 | Denial of Service | `db.batch` array size | mitigate | `CommitSchema.grades.min(1).max(500)` unchanged — `route.ts:62`; transitively bounds the batch tuple | closed |
| T-26-07 | Spoofing | `/api/study/complete` | accept-existing | `auth.api.getSession()` 401 gate untouched — `route.ts:101-104`; rate limiter untouched — `route.ts:106-117` | closed |
| T-26-08 | Tampering (positive) | Atomicity gain | accept | `db.batch([...])` single-round-trip Neon transaction — `route.ts:287-291`; stale "no transactions" comment corrected — `route.ts:90-98`, `210-227` | closed |
| T-26-09 | Elevation of Privilege / Access Control | `saveImageCards` ownership check | mitigate | Combined-WHERE `and(eq(decks.id,...), eq(decks.userId,...))` kept, runs once before insert — `src/lib/deck-actions.ts:270-276` (not weakened to check-then-trust) | closed |
| T-26-10 | Spoofing | `saveImageCards` session gate | accept-existing | `auth.api.getSession()` throw retained, evaluated once per commit — `deck-actions.ts:266-267` | closed |
| T-26-11 | Tampering (business logic) | All-or-nothing outcome semantics | accept | Documented consequence in 26-03-SUMMARY.md; interaction bug (one empty translation row aborting the whole batch) caught by code review as WR-01 and fixed — `hasEmptyTranslation` commit-guard, `src/components/review-list.tsx:478-486, 580-587` (test: `review-list-commit-guard.test.tsx`) | closed |
| T-26-12 | Tampering | Client ~20MB cap bypass via direct API call | mitigate | Authoritative server cap tightened 7MB→4MB — `src/lib/image-constants.ts:10`; double-enforced (Content-Length fast path + post-parse byte estimate) — `src/app/api/extract/route.ts:108-111, 129-133` | closed |
| T-26-13 | Denial of Service | Oversized original accepted at loosened ~20MB client cap | accept | Server's 4MB authoritative cap still rejects any oversized body reaching it — same evidence as T-26-12 | closed |
| T-26-14 | Information Disclosure | EXIF metadata in re-encoded upload | accept | `canvas.toBlob` JPEG re-encode draws only pixel data — `src/lib/image-resize.ts:17-32`; original EXIF is structurally discarded | closed |
| T-26-SC | Tampering (supply chain) | npm installs, all 5 plans | mitigate/accept | Zero new packages introduced this phase — `git log --diff-filter=M -- package.json` shows last modification predates Phase 26 (commit a05d42d, Phase 17); `image-resize.ts` confirmed native-API-only (`createImageBitmap`/canvas/`toBlob`, no new imports) | closed |
| T-26-15 | Information Disclosure | Publicly-cacheable-forever clip URLs | accept | Clip URLs level/mood-keyed (`l{N}-{mood}.{mp4,webm}`), not user-keyed, no session/PII — `next.config.ts` source pattern scoped to `/habitat/clips/:path*` only | closed |
| T-26-16 | Tampering (stale content) | Same-name clip re-render served from forever-cache | mitigate | D-08 naming rule documented in render pipeline — `scripts/render-habitat-clips.mjs:34-40` | closed |
| T-26-17 | Denial of Service | `headers()` misconfiguration breaking other routes | mitigate | Source pattern scoped narrowly to `/habitat/clips/:path*` only, no catch-all — `next.config.ts:12`; `tsc --noEmit` clean (per 26-05-SUMMARY.md) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Total register entries:** 21 (17 unique IDs T-26-01..17, plus T-26-SC recorded identically in all 5 plans — collapsed to one row above since disposition and evidence are the same instance verified once against a shared `package.json` history check).

---

## Code-Review Cross-Check (26-REVIEW.md)

The phase code review (deep, 2026-07-22) found two issues that directly bear on threats in this register and were verified FIXED in code (not just claimed):

- **CR-01** (unhandled rejection on image decode failure, `image-upload-flow.tsx`) — not itself a registered STRIDE threat, but adjacent to the T-26-12/13 boundary (client-side image handling). Fix confirmed present: `try { resizeImageForUpload... } catch { dispatch EXTRACT_ERROR }` at `image-upload-flow.tsx:266-284`.
- **WR-01** (empty translation row aborts whole batch under T-26-11's all-or-nothing semantics) — fix confirmed present: `hasEmptyTranslation` guard at `review-list.tsx:478-486, 580-587`.
- **WR-02** (resized blob could exceed server's 4MB cap with no client pre-check) — bears on T-26-12/13 evidence quality. Fix confirmed present: `estimatedBytes > MAX_SERVER_IMAGE_BYTES` client-side gate at `image-upload-flow.tsx:290-299`, mirroring the server's own formula.

All three fixes were re-verified directly in the current file contents during this audit (grep-confirmed line ranges above), not accepted on the review report's word alone.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-26-01 | T-26-02, T-26-07, T-26-10 | Existing auth/rate-limit gates deliberately left untouched (`accept-existing` disposition) — no new unauthenticated surface introduced by any Phase 26 plan; batching reduces call frequency but not the gate's per-call guarantee | Phase 26 planner | 2026-07-21 |
| AR-26-02 | T-26-04 | Generic 502 on DeepL failure leaks no internal detail | Phase 26 planner | 2026-07-21 |
| AR-26-03 | T-26-08 | `db.batch()` atomicity is a net positive-risk change (closes a gap, does not open one) | Phase 26 planner | 2026-07-21 |
| AR-26-04 | T-26-11 | All-or-nothing insert semantics is an accepted behavioral narrowing (isPartial UI branch becomes dead code) — the interaction bug this created (WR-01) was fixed in-phase, not merely accepted | Phase 26 planner + code review fix | 2026-07-22 |
| AR-26-05 | T-26-13 | Loosened client accept-cap (~20MB) relies on the server's tightened 4MB authoritative cap as the real control — net server-exposed surface shrinks | Phase 26 planner | 2026-07-21 |
| AR-26-06 | T-26-14 | EXIF stripping via re-encode is a privacy improvement, not a regression | Phase 26 planner | 2026-07-21 |
| AR-26-07 | T-26-15 | Clip URLs are non-user-keyed static content; safe to cache publicly/immutably | Phase 26 planner | 2026-07-21 |
| AR-26-08 | T-26-SC | Zero new packages across all 5 plans; verified via `package.json` git history | Phase 26 planner | 2026-07-21 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-22 | 21 (17 unique + T-26-SC ×5) | 21 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-22
