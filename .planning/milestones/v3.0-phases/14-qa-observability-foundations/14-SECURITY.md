---
phase: 14
slug: 14-qa-observability-foundations
status: verified
threats_total: 14
threats_closed: 14
threats_open: 0
asvs_level: 1
created: 2026-06-17
---

# Phase 14 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Server / Client | RSC pages compute QA state and thread boolean prop to client components | `qaMode: boolean` — no secret material, no SRS data for customers |
| Cookie / Server | `leo-qa-mode` and `leo-habitat-cheat` HMAC-signed cookies cross request boundary | Signed opaque tokens; verified server-side only |
| API / Caller | `/api/debug/state` and `/api/debug/cheat` gated behind `DEBUG_CHEAT_SECRET` | SRS data and habitat override; 404 when secret absent |
| Env / Runtime | `DEBUG_CHEAT_SECRET` and `STUDY_COOLDOWN_MINUTES` loaded server-side via t3-env | Never in `client:` block; not exported to browser bundle |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-14-01 | Spoofing / Tampering | `leo-qa-mode` cookie forgery | mitigate | `signQaMode()` uses HMAC-SHA256 (node:crypto `createHmac`); `verifyQaMode()` uses constant-time `timingSafeEqual`; fixed `QA_SENTINEL = { qaMode: true }` payload eliminates injection surface — `debug-cheat.ts:172-202` | CLOSED |
| T-14-02 | Info Disclosure | `DEBUG_CHEAT_SECRET` leaking to client | mitigate | `debug-cheat.ts` has no `"use client"` directive (confirmed absent); imports `node:crypto` and `@/env` — server-only by construction. `QA_MODE_COOKIE` set with `httpOnly: true` in `cheat/route.ts:84,111,122` | CLOSED |
| T-14-03 | Elevation of Privilege | QA endpoints reachable without secret | mitigate | Both `/api/debug/state` (line 46) and `/api/debug/cheat` (line 34) call `cheatEnabled()` first and return 404 when `DEBUG_CHEAT_SECRET` is absent. `checkSecret()` constant-time compare in `state/route.ts:57` and `cheat/route.ts:71`. Auth session required before secret gate on both routes | CLOSED |
| T-14-04 | Tampering | Negative/zero/NaN `STUDY_COOLDOWN_MINUTES` | mitigate | `env.ts:28-32`: `z.string().optional().transform(v => v !== undefined ? parseInt(v, 10) : undefined).pipe(z.number().int().min(1).optional())` — rejects 0, negatives, and NaN (parseInt NaN fails `z.number()`) | CLOSED |
| T-14-05 | Tampering | `STUDY_COOLDOWN_MINUTES` in prod shortens real SRS | ACCEPT | No code-level production block by design (D-10). Control is Vercel env scoping — set on Preview only, never Production. Documented as accepted risk below | CLOSED |
| T-14-06 | Info Disclosure | `/api/debug/state` leaks another user's SRS data | mitigate | Session auth 401 guard at `state/route.ts:50-53`; secret check at line 57-59; cards query scoped to `session.user.id` via deck ownership check (`WHERE decks.id=? AND decks.userId=?`) at `state/route.ts:89-98`; 200-row `LIMIT 200` at line 111 | CLOSED |
| T-14-07 | Info Disclosure | QA state codes in customer DOM | mitigate | `study-card.tsx:111`: `{qaCardData && <QaStateBadge data={qaCardData} />}` — prop physically omitted (not CSS-hidden) for customers. `card-list.tsx:161,253`: `{qaMode && <QaStateBadge .../>}`. RSC pages (`study/page.tsx:62`, `dashboard/page.tsx:45`) call `readQaAuth()` — returns false without valid HMAC cookie. QAOB-04 e2e confirms `[data-qa-badge]` count is 0 | CLOSED |
| T-14-08 | Info Disclosure | Client-side gate via `document.cookie` | mitigate | No `document.cookie` reference found anywhere in `src/`. `readQaAuth()` is server-only (uses `next/headers`); passes boolean prop to client components — cookie bytes never exposed to client JS | CLOSED |
| T-14-09 | DoS (self) | `setInterval` for all users | mitigate | `qa-state-badge.tsx:72`: `useEffect` sets interval only when `data.cooldownUntil` is truthy; `study-card.tsx:111` and `card-list.tsx:161,253` guard badge render on `qaCardData`/`qaMode` — component never mounts for customers, so no interval ever starts | CLOSED |
| T-14-10 | Tampering | Hydration mismatch from `Date.now()` in render | mitigate | `qa-state-badge.tsx:66-69`: lazy `useState(() => formatCd(data.cooldownUntil.getTime() - Date.now()))` — initializer runs client-only (not during SSR). Interval driven by `useEffect` at line 72 | CLOSED |
| T-14-11 | Info Disclosure | QA badge/endpoint reachable by customers | mitigate | `e2e/14-qa-parity.spec.ts:69,77`: asserts `[data-qa-badge]` count === 0 on `/dashboard` and `/study` for a fresh customer account. Lines 80-89: asserts `/api/debug/state` and `/api/debug/cheat` return 404 when `DEBUG_CHEAT_SECRET` is unset | CLOSED |
| T-14-12 | Tampering | False-pass when local env has secret set | mitigate | `e2e/14-qa-parity.spec.ts:41-52`: feature-state probe via `page.request.get('/api/debug/state?secret=___parity_probe___')`; 404 = disabled; any other status triggers `console.warn` and skips endpoint-404 assertions. DOM badge-absence assertions run unconditionally in both branches (lines 62-77) | CLOSED |
| T-14-13 | Info Disclosure | Test residue in prod data | mitigate | `e2e/helpers.ts:7`: `testEmail()` returns `qa+...@test.local` addresses. `scripts/cleanup-test-users.mjs` exists and targets `%@test.local` pattern. Guard at `cleanup-test-users.mjs:22` refuses any pattern not ending in `*test.local` domain | CLOSED |
| T-14-SC | Tampering (supply chain) | npm dependency changes | mitigate | `git diff --name-only 585e4fe^..HEAD -- package.json package-lock.json` returned empty output — no dependency files modified this phase. Zero new runtime packages confirmed | CLOSED |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-14-01 | T-14-05 | `STUDY_COOLDOWN_MINUTES` has no code-level production block by design (D-10). Mitigation is operational: Vercel env var scoping restricts the setting to Preview deployments only. A misconfigured Production env var would shorten SRS cooldowns for real users. Risk accepted because: (1) the env var is explicitly documented as Preview-only in `env.ts:19-23`; (2) Vercel's env scoping UI provides the control surface; (3) the worst case is shortened cooldowns (reversible), not data loss or security breach. | Design decision D-10 (Plan 01) | 2026-06-17 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-17 | 14 | 14 | 0 | gsd-security-auditor (claude-sonnet-4-6) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-17
