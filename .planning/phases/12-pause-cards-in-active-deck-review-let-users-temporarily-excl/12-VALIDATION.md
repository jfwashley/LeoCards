---
phase: 12
slug: pause-cards-in-active-deck-review
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed from artifacts on 2026-05-20 (State B — VALIDATION.md absent, 5 SUMMARYs present). All 8 phase requirements have automated coverage; no gap-filling required.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit framework** | Vitest 4.1.1 |
| **Unit env** | `environment: "node"`, setup `./src/test-setup.ts` |
| **Unit config** | `vitest.config.ts` |
| **E2E framework** | Playwright 1.58.2 |
| **E2E config** | `playwright.config.ts` (baseURL `http://localhost:3000`, chromium-only, 60s timeout, 1 retry) |
| **Quick run command** | `npm test` (vitest run) |
| **Full e2e command** | `npx playwright test` |
| **Phase gate** | `npm test && npx playwright test` |
| **Estimated runtime** | ~30s unit, ~2m e2e (4 tests Phase 12) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/lib/study-engine.test.ts` (the file the cadence math lives in) for Wave-2-touching tasks; `npm test` for any production-code task.
- **After every plan wave:** Run `npm test` (full vitest suite).
- **Before `/gsd:verify-work`:** Full `npm test && npx playwright test` must be green.
- **Max feedback latency:** ~30s for unit, ~2m end-to-end.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | P12-01 | T-12-01 | DDL is a single ALTER TABLE ADD COLUMN, reviewed before apply | Migration applied + verified via live `information_schema` query | manual SQL check (`SELECT pausedAt FROM cards LIMIT 1`) + grep `'ADD COLUMN "pausedAt" timestamp'` in `drizzle/0002_first_slipstream.sql` | ✅ | ✅ green |
| 12-02-01 | 02 | 2 | P12-03 | T-12-03 | `computeUnpauseUpdate` is pure; NULL stays NULL; future/past cooldown shifts by exact pause duration; zero-duration is a no-op | unit | `npx vitest run src/lib/study-engine.test.ts -t computeUnpauseUpdate` | ✅ (4 cases) | ✅ green |
| 12-02-02 | 02 | 2 | P12-04, P12-05 | T-12-04 | `getStudyCards` filters `isNull(cards.pausedAt)` at the SQL layer; dashboard inherits the filter for free | E2E proves the downstream effect; unit-mocking the query is not worthwhile per RESEARCH.md | covered by `e2e/12-pause-cards.spec.ts` Test 1 + Test 3 | ✅ | ✅ green |
| 12-03-01 | 03 | 3 | P12-02 | T-12-05, T-12-06, T-12-07, T-12-08, T-12-11 | 401/403/429/200, idempotent, single UPDATE, async params + awaited headers | unit (vitest) | `npx vitest run src/app/api/cards/[id]/pause/route.test.ts` | ✅ (5 cases) | ✅ green |
| 12-03-02 | 03 | 3 | P12-02, P12-03 | T-12-05..T-12-10 | Auth + ownership + rate-limit + idempotency + single-UPDATE + no-`lastStudiedAt` + NULL-cooldown branch | unit (vitest) | `npx vitest run src/app/api/cards/[id]/unpause/route.test.ts` | ✅ (6 cases) | ✅ green |
| 12-04-01 | 04 | 4 | P12-06, P12-07 | T-12-11 | `pausedAt: Date \| null` threaded through dashboard → `<DeckView>` → `<CardList>` without `any` casts; "All cards are paused" empty-state appears when applicable | tsc + grep gates + e2e Test 3 | `npx tsc --noEmit` + `npx playwright test e2e/12-pause-cards.spec.ts:120` | ✅ | ✅ green |
| 12-04-02 | 04 | 4 | P12-06, P12-07 | T-12-13, T-12-14 | Inline Pause/Play icon (desktop + mobile); paused rows opacity-50 + "Paused" badge; `pendingCardIds` per-card disabled; `router.refresh()` on success | e2e (Playwright) | `npx playwright test e2e/12-pause-cards.spec.ts` | ✅ (Tests 1, 2, 3) | ✅ green |
| 12-05-01 | 05 | 5 | P12-08 | T-12-15 | 4-test Playwright spec covering pause-excludes-session / unpause-restores / all-paused-empty-state / NULL-cooldown studyability | e2e (Playwright) | `npx playwright test e2e/12-pause-cards.spec.ts` | ✅ (4/4 pass) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework installs needed for Phase 12:

- Vitest is the unit framework (shipped in v1.0).
- Playwright is the E2E framework (shipped in v1.0).
- `src/lib/study-engine.test.ts` was extended with the `computeUnpauseUpdate` describe block (Plan 12-02 Task 1).
- `src/app/api/cards/[id]/pause/route.test.ts` and `unpause/route.test.ts` were created from the existing `src/app/api/study/complete/...` pattern (Plan 12-03).
- `e2e/12-pause-cards.spec.ts` was created from the existing `e2e/06-study-session.spec.ts` template (Plan 12-05).

**Wave 0 complete.**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual polish — exact icon placement, hover/focus states, dim contrast acceptable | P12-06 | Subjective design judgement; cannot be automated meaningfully | Open `/dashboard`, observe each card row in both desktop and mobile layouts. Pause and unpause a card. Confirm icon does not feel cramped, badge does not collide with source pill, paused row dim is not so light that text is unreadable. |
| Tap-target size on mobile (touch ergonomics) | P12-06 | Requires real device — Playwright can verify selector reachability but not human ergonomics | On an actual phone-sized device (≤ 414px wide), tap the Pause icon. Confirm it's hittable with thumb without accidentally tapping the adjacent Pencil edit button. |
| "Tiger feels alive" emotional reading after pause/unpause | Project core value | The habitat doesn't change with pause, but: does the user *understand* their study cadence still continues for unpaused cards? Subjective signal. | After 3 cards paused, return to dashboard — does the UI feel like the deck is "still alive" or "abandoned"? Note any copy improvements. |

These are tracked as candidates for `/gsd-verify-work 12` and out of scope for Nyquist automated validation.

---

## Sign-Off

- [x] Every phase requirement (P12-01..P12-08) maps to at least one automated test path
- [x] Every threat from `12-SECURITY.md` with a `mitigate` disposition has a verifying test (route tests + e2e)
- [x] No `❌ W0` markers in Per-Task Verification Map
- [x] No `⬜ pending` markers in Per-Task Verification Map
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-05-20

---

## Validation Audit 2026-05-20

| Metric | Count |
|--------|-------|
| Requirements total | 8 |
| Automated coverage | 8 |
| Manual-only | 3 (subjective polish — out of scope) |
| Gaps found | 0 |
| Resolved | n/a |
| Escalated | 0 |

**Phase 12 ships with `nyquist_compliant: true` from day one** — unlike the v2.0 phases (9, 10, 11) which carried `nyquist_compliant: false` as bookkeeping debt. The discipline of writing tests alongside production code in Plans 12-02, 12-03, and 12-05 (each `tdd="true"` in PLAN frontmatter where applicable) is what produced this outcome.
