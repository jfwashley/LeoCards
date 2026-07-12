---
phase: 16
slug: performance-baseline-measure
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-12
---

# Phase 16 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| test runner → local fs (fixture read) | Reads a committed static fixture only | Static JSON, no external data |
| npm install surface | Supply chain — this phase adds ZERO packages | None (no install step) |
| harness → prod /api/auth/sign-up/email | Script crosses into prod auth; better-auth validates Origin (CSRF) | *test.local credentials |
| harness → Neon prod-shared DB (provision) | INSERT-only writes of a *test.local user/deck/cards | Test-user rows |
| harness → Vercel prod (Lighthouse navigation) | Reads pages using an injected session cookie | Session token (secret in transit) |
| harness → local .next/ (bundle stats) | Reads a build artifact | No untrusted input |
| harness → cleanup-test-users.mjs (destructive) | DELETE gated to *test.local domain by the cleanup script's own guard | Test-user rows only |
| committed artifacts → git history | Baseline JSON/markdown becomes a permanent human-readable record | Metric numbers only — must contain no secrets |

---

## Threat Register

All evidence verified against the CURRENT on-disk implementation (post 16-03 Rule-1 fixes), not plan intent or SUMMARY prose.

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-16-01 | Tampering | `scripts/measure-cwv-lib.mjs` computation logic | mitigate | `scripts/__tests__/measure-cwv-lib.test.ts` — 29/29 tests pass (verified live via `npx vitest run`), covering `median` (L22-34), `computeMedians` (L36-93), `getBundleKb` incl. throw (L172-204), `classifyBottleneck` all 3 classes (L206-224) | closed |
| T-16-02 | Information disclosure | pure lib | accept | `scripts/measure-cwv-lib.mjs` L1-27 purity contract verified: zero live `process.env`/network/`process.exit`/top-level-`await` (sole string match "puppeteer-core 24.43.1" at L202 is markdown report text, not executable code) | closed |
| T-16-03 | Spoofing/Repudiation | sign-up POST to prod | mitigate | `scripts/measure-cwv.mjs:176` — `Origin: baseUrl` header on every `/api/auth/sign-up/email` POST (`signUp`, L169-189) | closed |
| T-16-04 | Information disclosure | session token / password in logs | mitigate | `scripts/measure-cwv.mjs` — zero `console.log/error/warn` references to `sessionToken`/`token`/`password` (grep 0 matches); only *test.local email and deckId logged | closed |
| T-16-05 | Tampering | residual *test.local user in prod DB | mitigate | `scripts/measure-cwv.mjs:833-853` `finally` unconditionally calls `runCleanup()` (L727-745) spawning `cleanup-test-users.mjs %@test.local` with `CLEANUP_DB_URL`; hardened beyond plan with SIGINT/SIGTERM handlers (L747-773, WR-05) | closed |
| T-16-06 | Elevation of privilege | direct-DB provisioning | mitigate | `provision()` (`scripts/measure-cwv.mjs:221-285`): only `db.insert(decks)` (L258) and `db.insert(cards)` (L271) plus one read-only `db.select` (L242, WR-06 same-DB guard); zero `.update(`/`.delete(` in the file | closed |
| T-16-07 | Tampering (silent) | auth silently fails → baseline measures /login shell | mitigate | `scripts/measure-cwv.mjs:468-484` redirect guard THROWS if `finalDisplayedUrl`/`finalUrl` contains `/login` OR lacks the requested route — stricter than plan minimum; this guard caught the live /study→/dashboard Rule-1 bug | closed |
| T-16-08 | Information disclosure | committed baseline artifacts | mitigate | Direct grep of all 13 `baseline/` artifacts for `session_token`/`password`/`postgres://`/`DATABASE_URL`/`secret`/`bearer`/`authorization` — zero real-value matches; `-runs.json` files contain only numeric metric fields | closed |
| T-16-09 | Tampering | residual *test.local user after the real run | mitigate | `scripts/cleanup-test-users.mjs:22-25` domain-guard regex `/@(leocards-)?test\.local$/`; 16-03-SUMMARY confirms `npm run measure:cleanup` reported 0 residual matches post-run | closed |
| T-16-10 | Repudiation/integrity | hand-edited or cold-contaminated baseline | mitigate | 16-03-PLAN Task-2 blocking human-verify checkpoint answered "approved" per 16-03-SUMMARY; committed medians computed over `warmRuns` (runs 2-6, `Array.slice(1)` at `scripts/measure-cwv.mjs:501`), never run 0 | closed |
| T-16-SC (01) | Tampering | npm supply chain (plan 01) | mitigate | 16-01-SUMMARY `tech-stack.added: []`; lib imports only `node:path` (built-in) | closed |
| T-16-SC (02) | Tampering | npm supply chain (plan 02) | mitigate | `git show c91bf84` — `puppeteer-core` explicit devDependency (WR-01) re-links an already-resolved transitive dep of `lighthouse@13.3.0` (one-line lockfile re-link, no version changes); `217c327` added npm scripts only, no new dependency entries | closed |
| T-16-SC (03) | Tampering | npm supply chain (plan 03) | mitigate | 16-03-SUMMARY confirms no dependency changes; `npm run build` + `npm run measure:cwv` use only already-installed tooling | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-16-01 | T-16-02 | Pure lib has no secrets, no env reads, no network — nothing to disclose. Verified current: zero live `process.env`/network/`process.exit` usage; sole string match is markdown report boilerplate, not executable code. Accepted at plan time (16-01-PLAN threat model). | Plan-time disposition (16-01-PLAN), verified by gsd-security-auditor | 2026-07-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

None. No `## Threat Flags` section exists in any of 16-01/02/03-SUMMARY.md. The Rule-1 bug fixes in 16-03-SUMMARY's Deviations (prod-auth `userId` extraction, `lighthouse` named import, `/study` deck param) are repairs to already-declared mitigation code paths (T-16-03/T-16-07), each re-verified in the post-fix code — not new attack surface.

Additional hardening beyond the declared register (WR-01 explicit `puppeteer-core` devDependency, WR-04 `extractMetrics` errored-audit validation, WR-05 SIGINT/SIGTERM cleanup handlers, WR-06 same-DB provisioning guard, WR-07 bundle-stats freshness gate) strengthens T-16-SC/T-16-01/T-16-05/T-16-06/T-16-08 respectively — not gaps.

## Notes

- `scripts/measure-cwv.mjs` and `scripts/measure-cwv-lib.mjs` have since been extended for Phase 17 (D-09: `ROUTE_FILTER`/`PHASE_OUT_DIR`, `resolveRoutes`/`resolveOutDir`). Phase 16's committed `baseline/` artifacts are untouched — the Phase-17 additions default `OUT_DIR` away from the Phase-16 path (vitest-covered against ever containing `16-performance-baseline-measure/baseline`), preserving the T-16-10 immutability guarantee.
- No new npm packages were introduced by this phase; the `puppeteer-core` pin formalizes an already-resolved transitive dependency.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-12 | 13 | 13 | 0 | gsd-security-auditor (sonnet) via /gsd:secure-phase |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-12
