---
phase: 15
slug: core-journey-qa-harness
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-25
---

# Phase 15 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time across all 5 plans; verified against the implemented code by gsd-security-auditor (verify-mitigations mode).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| harness/browser → `POST /api/debug/time-shift` | untrusted client supplies `offsetMs` + `secret` | request body (offset int, shared secret) |
| `leo-qa-time-offset` cookie → server read-points | attacker-influenceable storage read by study/complete, habitat, debug/state | HMAC-signed time offset |
| QA affordance → production | endpoint must NOT exist when `DEBUG_CHEAT_SECRET` unset | feature-flag state |
| `qa-lib.mjs` → `DATABASE_URL` | direct Drizzle write access for test-data provisioning | test user/deck/card rows |
| `qa-lib.mjs` / journeys → app HTTP API | holds a real better-auth session cookie; acts as an authed user | session token |
| journey / qa-lib logs → operator console | risk of leaking session token / password / secret | log output |
| manifest file → disk | ephemeral `*test.local` credentials stored in cleartext | email + password |
| `qa-run.mjs` → child processes | spawns journeys + cleanup inheriting env (DATABASE_URL, DEBUG_CHEAT_SECRET) | env vars |
| `qa-run.mjs` → cleanup | deletes users by pattern — must be `*test.local` only | delete predicate |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-15-01 | Spoofing | `leo-qa-time-offset` cookie | mitigate | HMAC-SHA256 over `DEBUG_CHEAT_SECRET`; `verifyTimeOffset` constant-time compare (`timingSafeEqual`), null on mismatch — `debug-cheat.ts:261-265` | closed |
| T-15-02 | Elevation of Privilege | time-shift reachable in prod | mitigate | `cheatEnabled()` → 404 BEFORE auth (`time-shift/route.ts:48-50`); `readQaTimeOffset()` → 0 when disabled (`debug-cheat.ts:297-299`); prod-parity e2e (`e2e/14-qa-parity.spec.ts:92-96`) | closed |
| T-15-03 | Tampering | oversized `offsetMs` | mitigate | **Both paths bounded + fail-closed:** write `z.number().int().min(0).max(30d)` (`time-shift/route.ts:32-38`); read path identical inline schema, returns null→0 (`debug-cheat.ts:274-283`, CR-01 fix `ed1c4f4`) | closed |
| T-15-04 | Information Disclosure | secret echoed/logged | mitigate | Route returns only `{ok:true}`/`{ok:true,cleared:true}`; secret never logged (`time-shift/route.ts:94,111`) | closed |
| T-15-05 | Repudiation | unauthenticated shift | mitigate | Gate order cheatEnabled→`getSession` 401→rate-limit→parse→`checkSecret` 403 before any cookie write (`time-shift/route.ts:48→53→59→79→85`) | closed |
| T-15-06 | Information Disclosure | token/password/secret in qa-lib logs | mitigate | qa-lib never logs token/password/secret; only emails/ids/rounds/pass-fail (`qa-lib.mjs:19-21`; grep clean) | closed |
| T-15-07 | Tampering | provisioning writes to real prod DB | mitigate | `mintTestEmail()` hardcodes `@test.local`; no non-test domain path (`qa-lib.mjs:187`) | closed |
| T-15-08 | Spoofing | accidental real-user mutation | mitigate | Provisioning only `db.insert(decks/cards)`; no UPDATE/DELETE of arbitrary users (`qa-lib.mjs:226,238`) | closed |
| T-15-09 | Information Disclosure | token/password in qa-01/02/04 logs | mitigate | Journeys log only emails/ids/rounds/PASS-FAIL | closed |
| T-15-10 | Tampering | residue in prod data | mitigate | All journeys provision `@test.local`; qa-run `finally` always runs cleanup | closed |
| T-15-11 | Spoofing | journey bypasses real pipeline | accept→mitigate | Advancement only via `gradeSession` → `POST /api/study/complete` (`qa-lib.mjs:270`); direct DB writes are provisioning-only | closed |
| T-15-12 | Tampering | oversized time-shift offset (qa-05) | mitigate | `FOUR_DAYS_MS` ≪ 30-day server bound (`qa-05-decay.mjs:72`); server enforces (T-15-03) | closed |
| T-15-13 | Information Disclosure | manifest stores password cleartext | accept | Ephemeral `*test.local` creds (no real value); manifest gitignored (`.gitignore:73-74`) + reaped by cleanup; documented (`qa-03-resume.mjs:49-50`) | closed |
| T-15-14 | Information Disclosure | token/password in qa-03/05 logs | mitigate | Journeys log only ids/rounds/quality/PASS-FAIL | closed |
| T-15-15 | Elevation of Privilege | time-shift mutates real customer time | mitigate | Per-session `httpOnly`/`sameSite:lax` cookie + `cheatEnabled()` gate; qa-05 clears in `finally` (`time-shift/route.ts:103-109`, `qa-05-decay.mjs:411-414`) | closed |
| T-15-16 | Tampering | cleanup deletes wrong users | mitigate | qa-run passes literal `%@test.local` (`qa-run.mjs:249`); cleanup re-guards `/@(leocards-)?test\.local$/`, exits 1 on mismatch (`cleanup-test-users.mjs:22-25`) | closed |
| T-15-17 | Denial of Service | a hung journey blocks the run | mitigate | Sequential bounded `spawnSync`; `finally` guarantees cleanup; non-zero exit recorded + continues (`qa-run.mjs:169,228-232`) | closed |
| T-15-18 | Information Disclosure | child stdout leaks secrets | mitigate | `stdio:"inherit"` only; qa-run adds no secret logging; secret vars used only in guards (`qa-run.mjs:170`) | closed |
| T-15-SC-01 | Tampering (supply chain) | 15-01 deps | mitigate | No new deps — `git diff cd3f2cf..HEAD -- package.json` shows only `scripts` (qa:run/qa:cleanup) added | closed |
| T-15-SC-02 | Tampering (supply chain) | 15-02 deps | mitigate | No new deps (same diff) | closed |
| T-15-SC-03 | Tampering (supply chain) | 15-03 deps | mitigate | No new deps (same diff) | closed |
| T-15-SC-04 | Tampering (supply chain) | 15-04 deps | mitigate | No new deps (same diff) | closed |
| T-15-SC-05 | Tampering (supply chain) | 15-05 deps | mitigate | No new deps; only package.json `scripts` entries (same diff) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-15-01 | T-15-13 | Manifest stores cleartext `*test.local` password — ephemeral throwaway credential of no real value; file is gitignored (`.gitignore:73-74`) and the user is reaped by cleanup (QAJ-06). | Josh (PM) | 2026-06-25 |
| AR-15-02 | T-15-11 | Journeys provision deck/card state via direct DB INSERT (setup only); all grade/mastery advancement still goes through the real `POST /api/study/complete` pipeline (D-02). Accepted as faithful setup-vs-journey split, then mitigated. | Josh (PM) | 2026-06-25 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-25 | 23 | 23 | 0 | gsd-security-auditor (verify-mitigations mode) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-25
