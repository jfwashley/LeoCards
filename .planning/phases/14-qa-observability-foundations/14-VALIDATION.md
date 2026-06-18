---
phase: 14
slug: qa-observability-foundations
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-12
validated: 2026-06-18
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (unit) + Playwright 1.58 (e2e) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npx vitest run src/lib/debug-cheat.test.ts src/env.test.ts src/app/api/study/__tests__/cooldown-config.test.ts src/components/__tests__/qa-state-badge.test.ts src/app/api/debug/__tests__/state.test.ts` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit && npm run lint` |
| **E2e command** | `DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts` (against running dev server) |
| **Estimated runtime** | ~60s unit+typecheck+lint; e2e on demand |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (5 unit files).
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit && npm run lint`
- **Before `/gsd:verify-work`:** Full suite green + `DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts`
- **Max feedback latency:** 90 seconds (unit); e2e on demand

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-T1 | 14-01 | 1 | QAOB-02 (env), QAOB-03 (gate foundation) | T-14-01, T-14-02, T-14-04 | QA cookie HMAC round-trips + tamper-rejects; STUDY_COOLDOWN_MINUTES coerces/validates (min 1) | unit | `npx vitest run src/lib/debug-cheat.test.ts src/env.test.ts` | ✅ | ✅ green |
| 01-T2 | 14-01 | 1 | QAOB-02 | T-14-04, T-14-05 | buildCooldownConfig precedence (minutes wins over NO_COOLDOWN/dev-zero; never < 1) | unit | `npx vitest run src/app/api/study/__tests__/cooldown-config.test.ts && npx tsc --noEmit` | ✅ | ✅ green |
| 01-T3 | 14-01 | 1 | QAOB-03 | T-14-06 | cards[] scoped to session.user.id + deck ownership, 200-row cap, ISO/null fields | unit (added 2026-06-18) | `npx vitest run src/app/api/debug/__tests__/state.test.ts && npx tsc --noEmit` | ✅ state.test.ts | ✅ green |
| 02-T1 | 14-02 | 2 | QAOB-01 | T-14-09, T-14-10 | formatCd + token assembly; data-qa-badge present; hydration-safe lazy init | unit | `npx vitest run src/components/__tests__/qa-state-badge.test.ts && npx tsc --noEmit` | ✅ | ✅ green |
| 02-T2 | 14-02 | 2 | QAOB-01 | T-14-07, T-14-08 | Badge omitted (not CSS-hidden) when qaMode false; RSC gate only | typecheck + e2e (03-T1 covers DOM-absence) | `npx tsc --noEmit && npx vitest run` | ✅ (DOM absence in 03-T1) | ✅ green |
| 02-T3 | 14-02 | 2 | QAOB-01 | T-14-07 | Dashboard row badge omitted for customers; cooldownUntil gated on qaMode | typecheck + e2e (03-T1) | `npx tsc --noEmit && npx vitest run && npm run lint` | ✅ (DOM absence in 03-T1) | ✅ green |
| 03-T1 | 14-03 | 3 | QAOB-04 | T-14-11, T-14-12, T-14-13 | No [data-qa-badge] in customer DOM (dashboard+study); /api/debug/* 404 when secret unset; *test.local self-clean | e2e | `DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test scaffolds authored alongside their production code (TDD), all present and green:

- [x] `src/app/api/study/__tests__/cooldown-config.test.ts` — buildCooldownConfig precedence branches; owned by 01-T2; covers QAOB-02
- [x] `src/components/__tests__/qa-state-badge.test.ts` — formatCd + token assembly; owned by 02-T1; covers QAOB-01
- [x] `e2e/14-qa-parity.spec.ts` — prod-parity DOM + endpoint gating; owned by 03-T1; covers QAOB-04
- [x] `src/lib/debug-cheat.test.ts` — signQaMode/verifyQaMode round-trip + tamper + secret-unset throw (IN-05); owned by 01-T1; covers QAOB-01 gating
- [x] `src/env.test.ts` — STUDY_COOLDOWN_MINUTES coercion + min-1 validation; owned by 01-T1; covers QAOB-02
- [x] `src/app/api/debug/__tests__/state.test.ts` (NEW 2026-06-18) — /api/debug/state cheat-guard 404 + session 401 + deck-ownership scoping + user-scoping + 200-row cap; covers QAOB-03 / T-14-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/api/debug/state` cards[] populates from real card data (end-to-end) | QAOB-03 | The scoping/cap LOGIC is now automated (state.test.ts); only the live end-to-end data render against a seeded DB + secret + session remains manual | With DEBUG_CHEAT_SECRET set locally, sign in, add 2+ cards, open /debug, enter secret, click Refresh → "Card SRS state" table lists each card matching the live REAL-state readout |
| QA badge visible + cooldown ticks when QA-authed | QAOB-01 | Requires a valid httpOnly QA cookie (set only via the secret-gated endpoint); e2e covers the customer-ABSENCE case (03-T1), not the authed-PRESENCE case | With DEBUG_CHEAT_SECRET set, enter secret on /debug, start a study session + open /dashboard → top-right `R…·…·cd:…m` badge shows on study card and each card-list row; with STUDY_COOLDOWN_MINUTES=15 and an active cooldown, watch cd: decrement live |
| Real 12h/24h defaults apply when STUDY_COOLDOWN_MINUTES unset in production | QAOB-02 / QAOB-04 | Cannot observe a 12h cooldown in a dev/e2e run without waiting; covered structurally by the buildCooldownConfig production-branch unit test (01-T2) | Unit test asserts production + no-override branch returns DEFAULT_COOLDOWN_MS; prod behavior confirmed by 01-T2, not a live wait |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-06-18

---

## Validation Audit 2026-06-18

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Gap: QAOB-03 / T-14-06 (`/api/debug/state` user+deck scoping + 200-row cap) had no automated test — typecheck + manual UAT only. Resolved by adding `src/app/api/debug/__tests__/state.test.ts` (8 cases: cheat-guard 404, session 401, foreign-deck scoping → empty cards[], ownership query invoked, owned-deck card mapping incl. round→direction/learned, `.limit(200)` cap, full happy-path shape). Route behavior matched the claimed mitigation (`and(eq(decks.id,…), eq(decks.userId, session.user.id))`). All 7 task-rows now ✅ green; phase is Nyquist-compliant.
