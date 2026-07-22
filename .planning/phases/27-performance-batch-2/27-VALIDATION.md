---
phase: 27
slug: performance-batch-2
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-22
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit/component) + Playwright (e2e) + scripts/qa-run.mjs (SRS correctness) |
| **Config file** | vitest.config.ts / playwright.config.ts |
| **Quick run command** | `npx vitest run <touched test files>` |
| **Full suite command** | `npm test` (full vitest), e2e batches per project, `npm run qa:run` after study/SRS waves |
| **Estimated runtime** | ~90 seconds (full vitest) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` scoped to touched test files
- **After every plan wave:** Run full vitest; `qa:run` after any wave touching study/SRS paths (items 8, 12, 17 — 17 D-10)
- **Before `/gsd:verify-work`:** Full suite must be green; full `tsc --noEmit` AFTER the e2e wave (Phase 23 lesson)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

(Per D-09 all proofs are count/round-trip/source assertions, never timing gates; perf wall-time observations are prod-build-only informal notes per D-10.)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | PERF-12..23 mint | — | N/A | source | `grep -c 'PERF-1[2-9]\|PERF-2[0-3]' .planning/REQUIREMENTS.md` | ✅ | ⬜ pending |
| 27-01-02 | 01 | 1 | PERF-12 | session-cache stale window | /account + actions bypass via getSessionFresh (D-04) | unit (tdd) | `npx vitest run src/lib/__tests__/auth-session.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-03 | 01 | 1 | PERF-12 | session-cache stale window | cookieCache 5-min TTL, revocation delay accepted (D-03) | source+types | `npx tsc --noEmit` + call-site grep | ✅ | ⬜ pending |
| 27-02-01 | 02 | 1 | PERF-18 | — | additive indexes only | source+types | `npx tsc --noEmit && grep -c '_idx")' src/db/schema.ts` | ✅ | ⬜ pending |
| 27-02-02 | 02 | 1 | PERF-18 | hosted Neon write | D-08: Josh-authorized `npm run db:push` (checkpoint, autonomous: false) | manual gate | — (checkpoint:human-verify, blocking) | — | ⬜ pending |
| 27-03-01 | 03 | 2 | PERF-15 | — | N/A | unit (W0) | `npx vitest run src/app/(protected)/deck/browse/__tests__/browse-page.test.ts` | ❌ W0 | ⬜ pending |
| 27-03-02 | 03 | 2 | PERF-15 | ?topic= validation preserved | WR-01 CATEGORIES guard byte-unchanged | unit+types | browse-page.test.ts + `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-04-01 | 04 | 2 | PERF-16 | — | N/A | unit (W0) | `npx vitest run src/lib/__tests__/dashboard-data.test.ts` | ❌ W0 | ⬜ pending |
| 27-04-02 | 04 | 2 | PERF-16 | — | N/A | unit+types | dashboard-data.test.ts + `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-05-01 | 05 | 1 | PERF-13 | — | rollback-on-error optimistic toggle | unit (tdd) | `npx vitest run src/components/card-list.test.tsx` | ✅ | ⬜ pending |
| 27-05-02 | 05 | 1 | PERF-20 | — | N/A (render memoization) | unit (tdd)+types | card-list.test.tsx + `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-06-01 | 06 | 1 | PERF-19 | stale-response overwrite (correctness) | AbortController cancels superseded requests | unit (tdd, W0) | `npx vitest run src/components/translation-form.test.tsx` | ❌ W0 | ⬜ pending |
| 27-06-02 | 06 | 1 | PERF-23 | LRU cache poisoning/keying | key excludes user data leakage across users | unit (tdd)+types | translate route.test.ts + `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-07-01 | 07 | 2 | PERF-14 | — | schema behavior identical post-migration | unit+types | `npx vitest run src/app/(auth) src/components/welcome && npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-07-02 | 07 | 2 | PERF-14 | — | schema behavior identical post-migration | unit+types | remaining importer tests + `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-08-01 | 08 | 1 | PERF-22 | — | N/A | source | blur-property grep count across the 4 files (account-back untouched, D-02) | ✅ | ⬜ pending |
| 27-08-02 | 08 | 1 | PERF-22 | — | N/A | unit | `npx vitest run src/components/daybreak` | ✅ | ⬜ pending |
| 27-09-01 | 09 | 1 | PERF-21 | — | factsAfter derived in JS = one fewer read, same values (round-trip assertion) | unit (tdd)+types | study/complete route.test.ts + `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-10-01 | 10 | 1 | PERF-17 | image-byte logging | no image bytes logged on model swap | unit+source | extract-eval.test.ts + `grep -c "claude-haiku-4-5" route.ts` | ✅ | ⬜ pending |
| 27-10-02 | 10 | 1 | PERF-17 | extraction quality regression | D-05 eval + manual real-photo side-by-side (checkpoint, autonomous: false) | manual gate | — (checkpoint:human-verify, blocking) | — | ⬜ pending |
| 27-10-03 | 10 | 1 | PERF-17 | — | D-06 threshold-gated streaming (>~4s median) | unit+types | `npx vitest run src/app/api/extract && npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Research identified four coverage gaps; each new test file is created as Task 1 inside its owning plan (before/alongside implementation):

- [ ] `src/lib/__tests__/auth-session.test.ts` — item 8 / PERF-12 (plan 27-01)
- [ ] `src/components/translation-form.test.tsx` — item 15 / PERF-19 (plan 27-06)
- [ ] `src/lib/__tests__/dashboard-data.test.ts` — item 12 / PERF-16 (plan 27-04)
- [ ] `src/app/(protected)/deck/browse/__tests__/browse-page.test.ts` — item 11 / PERF-15 (plan 27-03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Haiku extraction quality parity | PERF-17 (item 13) | Phase 10 eval reference-set is incomplete carried debt (D-05) | Manual side-by-side on a few real photos vs claude-sonnet-4-6 output (27-10 Task 2 checkpoint) |
| Streaming threshold decision | PERF-17 (item 13) | D-06: median end-to-end extraction wall-time on real photos, prod-like build | Stopwatch median; if > ~4s on Haiku, streaming lands same phase (27-10 Task 3) |
| Blur-removal visual check | PERF-22 (item 18) | Pixel-level judgment over video | Eyeball habitat overlays at prod build; trivially revertible |
| Neon index db:push | PERF-18 (item 14) | Hosted-DB write gated on Josh's explicit authorization (D-08) | `npm run db:push` with DATABASE_URL exported (NOT auto-loaded from .env.local; do not `source .env.local` — it contains a runnable curl block) (27-02 Task 2 checkpoint) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (2 checkpoint tasks are deliberate manual gates: D-05/D-08)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (4 new test files, each Task 1 of its owning plan)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-22 (plan-checker pass: 0 blockers, 4 warnings — all addressed or acknowledged)
