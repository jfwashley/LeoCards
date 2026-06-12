---
phase: 14
slug: qa-observability-foundations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-12
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (unit) + Playwright 1.58 (e2e) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npx vitest run src/lib/debug-cheat.test.ts src/env.test.ts src/app/api/study/__tests__/cooldown-config.test.ts src/components/__tests__/qa-state-badge.test.ts` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit && npx run lint` |
| **E2e command** | `DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts` (against running dev server) |
| **Estimated runtime** | ~60s unit+typecheck+lint; e2e on demand |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/debug-cheat.test.ts src/env.test.ts src/app/api/study/__tests__/cooldown-config.test.ts src/components/__tests__/qa-state-badge.test.ts`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit && npx run lint`
- **Before `/gsd:verify-work`:** Full suite green + `DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts`
- **Max feedback latency:** 90 seconds (unit); e2e on demand

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-T1 | 14-01 | 1 | QAOB-02 (env), QAOB-03 (gate foundation) | T-14-01, T-14-02, T-14-04 | QA cookie HMAC round-trips + tamper-rejects; STUDY_COOLDOWN_MINUTES coerces/validates (min 1) | unit | `npx vitest run src/lib/debug-cheat.test.ts src/env.test.ts` | ❌ Wave 0 (extend existing) | ⬜ pending |
| 01-T2 | 14-01 | 1 | QAOB-02 | T-14-04, T-14-05 | buildCooldownConfig precedence (minutes wins over NO_COOLDOWN/dev-zero; never < 1) | unit | `npx vitest run src/app/api/study/__tests__/cooldown-config.test.ts && npx tsc --noEmit` | ❌ Wave 0 | ⬜ pending |
| 01-T3 | 14-01 | 1 | QAOB-03 | T-14-06 | cards[] scoped to session.user.id, 200-row cap, ISO/null fields | unit + manual | `npx tsc --noEmit && npx vitest run` | ⚠️ manual (see below) | ⬜ pending |
| 02-T1 | 14-02 | 2 | QAOB-01 | T-14-09, T-14-10 | formatCd + token assembly; data-qa-badge present; hydration-safe lazy init | unit | `npx vitest run src/components/__tests__/qa-state-badge.test.ts && npx tsc --noEmit` | ❌ Wave 0 | ⬜ pending |
| 02-T2 | 14-02 | 2 | QAOB-01 | T-14-07, T-14-08 | Badge omitted (not CSS-hidden) when qaMode false; RSC gate only | typecheck + e2e (03-T1 covers DOM-absence) | `npx tsc --noEmit && npx vitest run` | ✅ (DOM absence in 03-T1) | ⬜ pending |
| 02-T3 | 14-02 | 2 | QAOB-01 | T-14-07 | Dashboard row badge omitted for customers; cooldownUntil gated on qaMode | typecheck + e2e (03-T1) | `npx tsc --noEmit && npx vitest run && npx run lint` | ✅ (DOM absence in 03-T1) | ⬜ pending |
| 03-T1 | 14-03 | 3 | QAOB-04 | T-14-11, T-14-12, T-14-13 | No [data-qa-badge] in customer DOM (dashboard+study); /api/debug/* 404 when secret unset; *test.local self-clean | e2e | `DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test scaffolds that must exist before / as part of the task that owns them (all created within their plan's TDD task; no separate pre-wave needed because every new test file is authored alongside its production code in the same task):

- [ ] `src/app/api/study/__tests__/cooldown-config.test.ts` (NEW) — buildCooldownConfig precedence branches; owned by 01-T2; covers QAOB-02
- [ ] `src/components/__tests__/qa-state-badge.test.ts` (NEW) — formatCd + token assembly; owned by 02-T1; covers QAOB-01
- [ ] `e2e/14-qa-parity.spec.ts` (NEW) — prod-parity DOM + endpoint gating; owned by 03-T1; covers QAOB-04
- [ ] Extend `src/lib/debug-cheat.test.ts` — signQaMode/verifyQaMode round-trip + tamper; owned by 01-T1; covers QAOB-01 gating
- [ ] Extend `src/env.test.ts` — STUDY_COOLDOWN_MINUTES coercion + min-1 validation; owned by 01-T1; covers QAOB-02

Note: `buildCooldownConfig` must be EXPORTED from `complete/route.ts` (01-T2) and the badge's `formatCd`/`buildTokens` EXPORTED from `qa-state-badge.tsx` (02-T1) so they are unit-testable without booting a route/DOM.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/api/debug/state` cards[] populates from real card data | QAOB-03 | Integration requires a live secret + session + seeded cards; the e2e suite has no QA-authed flow and a unit test would mock away the DB query | With DEBUG_CHEAT_SECRET set locally, sign in, add 2+ cards, open /debug, enter secret, click Refresh → "Card SRS state" table lists each card (word/round/direction/cooldown/paused/learned) matching the live REAL-state readout |
| QA badge visible + cooldown ticks when QA-authed | QAOB-01 | Requires a valid httpOnly QA cookie (set only via the secret-gated endpoint); e2e covers the customer-ABSENCE case (03-T1), not the authed-PRESENCE case | With DEBUG_CHEAT_SECRET set, enter secret on /debug, start a study session + open /dashboard → top-right `R…·…·cd:…m` badge shows on study card and each card-list row; with STUDY_COOLDOWN_MINUTES=15 and an active cooldown, watch cd: decrement live |
| Real 12h/24h defaults apply when STUDY_COOLDOWN_MINUTES unset in production | QAOB-02 / QAOB-04 | Cannot observe a 12h cooldown in a dev/e2e run without waiting; covered structurally by the buildCooldownConfig production-branch unit test (01-T2) | Unit test asserts production + no-override branch returns DEFAULT_COOLDOWN_MS; prod behavior confirmed by 01-T2, not a live wait |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
