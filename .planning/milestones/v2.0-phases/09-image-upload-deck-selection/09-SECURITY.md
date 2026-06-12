---
phase: 09
slug: image-upload-deck-selection
status: verified
threats_total: 5
threats_closed: 5
threats_open: 0
asvs_level: 1
audit_date: 2026-05-20
created: 2026-05-20
---

# Phase 09 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Phase 9 is client-only: image picker, validation, preview, deck pre-selection. No network I/O. Authoritative server-side guards are explicitly Phase 10 scope (EXT-05).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| user filesystem → browser memory | A user-chosen File enters client memory via click/drag. NOT a security boundary: file never leaves the browser in Phase 9. | User-chosen binary image data |
| user clipboard → browser memory | Pasted file (Ctrl+V) enters client memory via document paste listener. NOT a security boundary: same disposition as above. | User-chosen binary image data |

Phase 9 performs zero network I/O. The "Extract words" button was a placeholder no-op at end-of-Plan-2; subsequent phases (10+) added the `/api/extract` call now visible in `image-upload-flow.tsx` — but the Phase 9 threat surface as planned remained client-only and the authoritative magic-byte check lives in Phase 10's server route.

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-01 | Tampering | `validateImageFile` (client MIME check) | accept | UX pre-screening only; documented as advisory with inline NOTE deferring magic-byte validation to Phase 10 server route. Evidence: `src/lib/image-validation.ts:8-11` (IN-01 fix). | closed |
| T-09-02 | DoS | `validateImageFile` size cap | accept | Client 5MB cap is robustness/UX only — no network in Phase 9 means no DoS surface. Evidence: `src/lib/image-validation.ts:26` (`file.size > MAX_IMAGE_BYTES` check). | closed |
| T-09-03 | Tampering | `ImageDropZone` / `ImageUploadFlow` client validation across click+drag+paste vectors | accept | `validateAndSetFile` calls `validateImageFile` for every file vector; client checks acknowledged as bypassable, server guard is Phase 10. Evidence: `src/components/image-upload-flow.tsx:175-185` (single useCallback funnel used by both drop-zone `onFileSelect` at line 525 and paste handler at line 281). | closed |
| T-09-04 | Information Disclosure / robustness | Object URL lifecycle (memory leak / dangling blob URL) | mitigate | Object URLs revoked on replace, clear, and unmount via `previewUrlRef` + `useEffect` cleanup. Evidence: revoke-then-create on new pick `src/components/image-upload-flow.tsx:170-172`; revoke on clear `:188-190`; unmount cleanup via ref `:163-167`. | closed |
| T-09-05 | Tampering | Clipboard paste vector | accept | Pasted files run the same `validateAndSetFile` path; `e.preventDefault()` added (WR-02) to prevent double-paste leakage into sibling inputs. Evidence: `src/components/image-upload-flow.tsx:274-286` (paste listener with file-check, `e.preventDefault()`, and `validateAndSetFile` call). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-09-01 | T-09-01 | Client `file.type` MIME check is browser-supplied and spoofable by renaming. By design this is UX pre-screening, NOT a security control. Authoritative magic-byte + content-length validation is Phase 10's `/api/extract` server route (EXT-05). Inline NOTE in code makes this explicit so it is not later mistaken for a security boundary. | Plan author (PLAN.md threat_model) | 2026-05-18 |
| AR-09-02 | T-09-02 | Client 5MB cap is bypassable by any non-browser HTTP client. Phase 9 has zero network surface so no DoS exists here. Server-side payload limit is Phase 10 scope. | Plan author (PLAN.md threat_model) | 2026-05-18 |
| AR-09-03 | T-09-03 | Same rationale as AR-09-01 applied to the unified client validation funnel covering all three vectors (click/drag/paste). | Plan author (PLAN.md threat_model) | 2026-05-18 |
| AR-09-05 | T-09-05 | Pasted-file path runs the same client validator and is equally bypassable. Documented to prevent later reviewers treating clipboard-source as more trusted than filesystem-source. | Plan author (PLAN.md threat_model) | 2026-05-18 |

T-09-04 is a `mitigate` disposition (not accepted) — implementation verified at file:line cited above.

---

## Unregistered Flags

SUMMARY.md `## Threat Flags` sections (both plans) explicitly note "no new trust boundaries / network endpoints / auth paths / schema changes introduced." No unregistered threat flags to record.

---

## Recent Fix References

The following code-review fixes (per `09-REVIEW-FIX.md` 2026-05-20) reinforce the threat mitigations above:

| Fix ID | Threat Ref | File | Effect on Threat Posture |
|--------|------------|------|--------------------------|
| WR-01 | n/a (interface fragility) | `image-upload-flow.tsx` | Removed duplicate deck-id props — reduces deck-confusion risk class. |
| WR-02 | T-09-05 | `image-upload-flow.tsx:280` | Added `e.preventDefault()` in paste handler — prevents double-paste leakage into sibling text inputs. |
| IN-01 | T-09-01 | `image-validation.ts:8-11` | Inline NOTE makes the client-only nature of the MIME check explicit and points to the Phase 10 server-side check at `src/app/api/extract/route.ts`. |
| IN-02 | n/a (UX copy) | `image-validation.ts:13-20` | Grammatical fix for extensionless filenames. No security impact. |
| IN-03 | n/a (UX / network hygiene) | `image-upload-flow.tsx` (5 occurrences) | `src={previewUrl ?? undefined}` — omits `src` attr on null instead of triggering a self-referential empty-`src` network request. Marginal info-disclosure hygiene improvement. |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-20 | 5 | 5 | 0 | gsd-secure-phase (Claude Opus 4.7) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-20
