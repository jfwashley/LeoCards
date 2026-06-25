---
phase: 15-core-journey-qa-harness
verified: 2026-06-25T11:30:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run `STUDY_COOLDOWN_MINUTES=1 npm run dev` then `DATABASE_URL=... DEBUG_CHEAT_SECRET=... npm run qa:run`"
    expected: "All six journey steps (QAJ-01 through QAJ-05 + CLEANUP) print PASS; exit code 0; cleanup reports N deleted @test.local user(s); zero residue"
    why_human: "Requires live Neon DB, a running dev server with STUDY_COOLDOWN_MINUTES=1 set at boot, and a valid DEBUG_CHEAT_SECRET — cannot be driven headlessly"
  - test: "With DEBUG_CHEAT_SECRET unset, run: `DEBUG_CHEAT_SECRET='' npx playwright test e2e/14-qa-parity.spec.ts`"
    expected: "Test passes; the three 404 assertions for /api/debug/state, /api/debug/cheat, and /api/debug/time-shift all succeed when the feature flag is absent"
    why_human: "Requires a live dev server booted without DEBUG_CHEAT_SECRET; Playwright end-to-end run cannot be auto-executed in headless static analysis"
  - test: "Post-run residual check: after `npm run qa:run` completes, run `DATABASE_URL=... npm run qa:cleanup`"
    expected: "Script reports 0 user(s) deleted — confirming QAJ-06 self-clean left zero residue"
    why_human: "Requires a live Neon DB connection to query the users table"
---

# Phase 15: Core-Journey QA Harness — Verification Report

**Phase Goal:** The core learning journey — learn, master, cool down, decay, level up — is provably correct via scripted, repeatable, time-resumable QA that drives the app's REAL pipeline (own API routes), never the /debug virtual override.
**Verified:** 2026-06-25T11:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | A scripted "learn a card" run creates user/deck/card, completes a real study session via the app's own API path, and asserts round 0→1 with the correct next direction and cooldown | VERIFIED (code) / HUMAN (live run) | `scripts/qa-01-learn-card.mjs` exists, parses, imports qa-lib, calls `gradeSession` (real POST /api/study/complete), asserts `masteryRound===1`, `direction==="t2n"`, non-null `cooldownUntil`. Documents `STUDY_COOLDOWN_MINUTES=1` precondition. |
| 2 | A scripted full mastery progression covers rounds 0→1→2→3→learned, including wrong-answer reset/hold paths and direction rules | VERIFIED (code) / HUMAN (live run) | `scripts/qa-02-mastery.mjs` exists, parses, drives 4 separate `gradeSession` calls, grads t2n with `correct: false` for the wrong-answer hold test, asserts `direction==="either"` at round 2 and `learned===true` at round 3. |
| 3 | A time-resumable session persists a manifest, exits, and on resume asserts every card landed in its expected state | VERIFIED (code) / HUMAN (live run) | `scripts/qa-03-resume.mjs` exists, parses, calls `writeManifest` (Phase A) and `readManifest` + `signIn` + `setTimeShift` (Phase B). The `nowForComparison` dead-code (WR-01) was confirmed fixed: `minShiftMs` is hoisted and the comparison uses `new Date(Date.now() + minShiftMs)`. |
| 4 | A habitat progression script crosses level 1→2 threshold (plus one higher transition) and asserts computeHabitatState, dashboard widget, and /habitat all agree | VERIFIED (code) / HUMAN (live run) | `scripts/qa-04-habitat.mjs` exists, parses, calls both `readHabitat` and `readState`, asserts `real.effectiveCardCount >= 5`, `real.level >= 2`, and level agreement at the L2→3 crossing (15 cards). |
| 5 | Decay/grace behavior is verified via QA-gated time-shift, and every QA run self-cleans — all test users use `*test.local` so `cleanup-test-users.mjs` leaves zero residue | VERIFIED (code) / HUMAN (live run) | `scripts/qa-05-decay.mjs` calls `setTimeShift(+4 days)`, asserts `isDecaying===true` and `quality≈0.90`, calls `clearTimeShift` in a `finally`. `qa-run.mjs` invokes cleanup with `%@test.local` in a `finally` block. All `@test.local` users confirmed via `mintTestEmail()` in qa-lib. |

**Score: 5/5 truths statically verified.** Live end-to-end confirmation deferred to human verification.

---

### Deferred Items

None. All success criteria are addressed by artifacts in this phase. Live-run proof is in the human verification section.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/debug-cheat.ts` | `signTimeOffset`, `verifyTimeOffset`, `readQaTimeOffset`, `TIME_SHIFT_COOKIE` | VERIFIED | All four exports present at lines 41, 234, 250, 296. CR-01 fix confirmed: `verifyTimeOffset` schema includes `.int().min(0).max(30*24*60*60*1000)` (line 274-280). |
| `src/app/api/debug/time-shift/route.ts` | QA-gated POST with gate order cheatEnabled→auth→rate-limit→body→secret | VERIFIED | Gate order confirmed in source. `cheatEnabled()` returns 404 before auth at line 48. `offsetMs` capped at 30 days via Zod. Cookie attrs: `httpOnly`, `secure`, `sameSite:lax`. |
| `src/app/api/debug/__tests__/time-shift.test.ts` | Vitest gate-order suite | VERIFIED | 11 tests across 5 describe blocks; all pass (`npx vitest run ... time-shift.test.ts` — 11/11 green). Includes proof that `mockGetSession` is NOT called when `cheatEnabled()` is false. |
| `scripts/qa-lib.mjs` | Shared library: auth, provisioning, gradeSession, readState, readHabitat, setTimeShift, clearTimeShift, manifest I/O, asserts | VERIFIED | 479 lines. All required exports confirmed: `provision`, `gradeSession`, `readState`, `setTimeShift`, `clearTimeShift`, `writeManifest`, `readManifest`, `assertEq`, `assertOk`, `directionForRound`, `resetTimeShiftState` (WR-02 fix). `@test.local` domain used in `mintTestEmail()`. No session token/password logged. `node --check` exits 0. |
| `scripts/qa-01-learn-card.mjs` | QAJ-01 learn journey | VERIFIED | Contains `QAJ-01`, imports from `./qa-lib.mjs`, asserts `masteryRound`, `cooldownUntil`. Documents `STUDY_COOLDOWN_MINUTES=1` precondition. `node --check` exits 0. |
| `scripts/qa-02-mastery.mjs` | QAJ-02 mastery + wrong-answer + direction rules | VERIFIED | Contains `QAJ-02`, `correct: false` wrong-answer grade, `"either"` direction assertion, `learned===true` terminal state. `node --check` exits 0. |
| `scripts/qa-03-resume.mjs` | QAJ-03 resumable manifest + time-shift fast path | VERIFIED | Contains `QAJ-03`, calls `writeManifest`/`readManifest`, `signIn` on resume, `setTimeShift`. WR-01 fix confirmed: `minShiftMs` hoisted, `nowForComparison = new Date(Date.now() + minShiftMs)`. `node --check` exits 0. |
| `scripts/qa-04-habitat.mjs` | QAJ-04 habitat level progression | VERIFIED | Contains `QAJ-04`, calls `readHabitat` and `readState`, asserts `effectiveCardCount >= 5` and level agreement. `node --check` exits 0. |
| `scripts/qa-05-decay.mjs` | QAJ-05 decay/grace + pause interaction | VERIFIED | Contains `QAJ-05`, calls `setTimeShift`/`clearTimeShift` (in finally), asserts `isDecaying`, `quality`. WR-03 fix confirmed: `decayShiftResult` and `pauseShiftResult` both checked for `ok===true`. `node --check` exits 0. |
| `scripts/qa-run.mjs` | Sequential orchestrator + self-clean + non-zero exit on failure | VERIFIED | References all five journey scripts (qa-01..qa-05). Cleanup invoked with `%@test.local` in `finally` block (line 232). Exit code aggregated; `process.exit(1)` on any failure. `node --check` exits 0. |
| `package.json` | npm scripts `qa:run` and `qa:cleanup` | VERIFIED | `qa:run = "node scripts/qa-run.mjs"`, `qa:cleanup = "node scripts/cleanup-test-users.mjs %@test.local"`. Both confirmed via `node -e` JSON parse check. |
| `.gitignore` | Rule ignoring `scripts/qa-manifest-*.json` | VERIFIED | Lines 73-74: `scripts/qa-manifest-*.json` and `scripts/qa-manifest.json`. `git check-ignore scripts/qa-manifest-test.json` returns the path; `git check-ignore scripts/qa-lib.mjs` returns nothing (scripts tracked). |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/app/api/study/complete/route.ts` | `readQaTimeOffset` | `const offset = await readQaTimeOffset(); const now = new Date(Date.now() + offset);` | WIRED | Confirmed at line 173 |
| `src/app/api/habitat/route.ts` | `readQaTimeOffset` | `const offset = await readQaTimeOffset()` passed into `computeHabitatState` | WIRED | Confirmed at line 39 |
| `src/app/api/debug/state/route.ts` | `readQaTimeOffset` | `const offset = await readQaTimeOffset()` passed into `computeHabitatState` | WIRED | Confirmed at line 65 |
| `e2e/14-qa-parity.spec.ts` | `/api/debug/time-shift` | `page.request.post` asserts 404 inside `if (featureDisabled)` block | WIRED | Confirmed at lines 91-95 |
| `scripts/qa-01-learn-card.mjs` | `scripts/qa-lib.mjs` | `import { provision, gradeSession, readState, assertEq, directionForRound } from "./qa-lib.mjs"` | WIRED | Import confirmed |
| `scripts/qa-02-mastery.mjs` | `/api/study/complete` | `gradeSession` (real HTTP) with `directionForRound` | WIRED | `gradeSession` call confirmed with direction per round |
| `scripts/qa-04-habitat.mjs` | `/api/habitat` + `/api/debug/state` | `readHabitat` + `readState` level agreement assertion | WIRED | Both calls confirmed |
| `scripts/qa-03-resume.mjs` | `writeManifest` / `readManifest` | Atomic manifest persist on grade; re-read on resume | WIRED | Both calls confirmed with `MANIFEST_PATH` |
| `scripts/qa-05-decay.mjs` | `/api/cards/[id]/pause` + `/api/debug/time-shift` + `/api/debug/state` | Pause card, shift +4 days, assert decay + frozen paused card | WIRED | `setTimeShift`, pause endpoint call, `pausedAt` assertion all confirmed |
| `scripts/qa-run.mjs` | `scripts/qa-01..qa-05` | `spawnSync node <script>` sequentially; exit codes collected | WIRED | All five scripts in JOURNEYS array; exit code aggregated |
| `scripts/qa-run.mjs` | `scripts/cleanup-test-users.mjs` | `spawnSync` with `%@test.local` pattern in `finally` | WIRED | Confirmed at line 247-250; CLEANUP_DB_URL aliased from DATABASE_URL |
| `package.json` | `scripts/qa-run.mjs` | `scripts.qa:run = "node scripts/qa-run.mjs"` | WIRED | Confirmed |

---

## Data-Flow Trace (Level 4)

This phase delivers Node scripts and a server-side time-shift endpoint — not React components rendering dynamic DB data. Level 4 data-flow trace is not applicable in the standard sense, but the critical data-path (time-shift cookie → readQaTimeOffset → shifted now → SRS/habitat computation) was traced:

| Data Path | Source | Consumer | Produces Real Data | Status |
|-----------|--------|----------|--------------------|--------|
| `leo-qa-time-offset` cookie → `readQaTimeOffset()` → `now` | `POST /api/debug/time-shift` sets signed cookie | `study/complete`, `habitat`, `debug/state` all read via `readQaTimeOffset()` | Yes — offset applied to `new Date(Date.now() + offset)` at all three callsites | FLOWING |
| `readState` → per-card `masteryRound`/`cooldownUntil` assertions | Real Neon DB via `/api/debug/state` (Drizzle query) | Journey scripts assert against live DB values | Yes — not mocked or stubbed | FLOWING (human-run dependent) |

---

## Behavioral Spot-Checks

Static (parse-level) checks passed. Live behavioral checks require a running server and are deferred to human verification.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 7 scripts parse as valid ESM | `node --check scripts/qa-*.mjs` | All exit 0 | PASS |
| Vitest gate-order suite (11 tests) | `npx vitest run .../time-shift.test.ts` | 11/11 green | PASS |
| npm scripts present | `node -e "require('./package.json').scripts['qa:run']"` | `node scripts/qa-run.mjs` | PASS |
| gitignore pattern matches manifests | `git check-ignore scripts/qa-manifest-test.json` | Path returned | PASS |
| qa-lib script tracked (not ignored) | `git check-ignore scripts/qa-lib.mjs` | No output | PASS |
| Full `npm run qa:run` green | Requires live server + Neon DB | Not run (headless) | SKIP (human) |
| `npx playwright test e2e/14-qa-parity.spec.ts` with secret unset | Requires live server | Not run (headless) | SKIP (human) |

---

## Probe Execution

No `scripts/*/tests/probe-*.sh` files declared for Phase 15. Behavioral verification is through Vitest (server affordances) and the journey scripts themselves (integration, live-server). No probes to execute.

---

## Requirements Coverage (QAJ-01..QAJ-06)

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| QAJ-01 | 15-03, 15-05 | Scripted "learn a card" — round 0→1 with direction + cooldown | VERIFIED (code) | `scripts/qa-01-learn-card.mjs`: asserts `masteryRound===1`, `direction==="t2n"`, non-null `cooldownUntil`. Wired into `qa-run.mjs` step 1. |
| QAJ-02 | 15-03, 15-05 | Full mastery 0→1→2→3 + wrong-answer holds + direction rules | VERIFIED (code) | `scripts/qa-02-mastery.mjs`: 4 `gradeSession` calls; `correct: false` at round 1; `direction==="either"` at round 2; `learned===true` at round 3. |
| QAJ-03 | 15-01, 15-04, 15-05 | Time-resumable session with manifest + time-shift fast path | VERIFIED (code) | `scripts/qa-03-resume.mjs`: Phase A writes manifest via `writeManifest`; Phase B re-auths via `signIn`, shifts time via `setTimeShift`, asserts cooldown state. WR-01 dead-code fix confirmed. `qa-run.mjs` drives Phase A then Phase B (--resume flag). |
| QAJ-04 | 15-03, 15-05 | Habitat level progression L1→2 + a higher transition via real pipeline | VERIFIED (code) | `scripts/qa-04-habitat.mjs`: provisions 15 cards, learns all to masteryRound=3, asserts `effectiveCardCount >= 5` at 5 learned cards, `level >= 2`, level agreement between `readHabitat()` and `readState().real.level`; repeats at 15 cards for L2→3. |
| QAJ-05 | 15-01, 15-04, 15-05 | Decay/grace + pause interaction via QA-gated time-shift | VERIFIED (code) | `scripts/qa-05-decay.mjs`: `setTimeShift(+4 days)` → asserts `isDecaying===true`, `quality≈0.90`; `clearTimeShift` in finally. Pause segment: POST /api/cards/[id]/pause → shift → asserts `masteryRound`/`cooldownUntil` unchanged and `pausedAt` non-null. WR-03 return-value check fix confirmed. |
| QAJ-06 | 15-02, 15-05 | Self-cleaning — all test users `@test.local`, cleanup reaps them | VERIFIED (code) | `mintTestEmail()` in qa-lib always generates `qa+...@test.local`. `qa-run.mjs` invokes `cleanup-test-users.mjs "%@test.local"` in a `finally` block. `.gitignore` rule prevents manifests entering git. |

All 6 requirements (QAJ-01..QAJ-06) are addressed by implemented, parseable, substantively-wired code. Live-run proof is a human verification item.

---

## Anti-Patterns Found

Scan ran on all 14 Phase 15 modified/created files.

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| All 14 files | TBD / FIXME / XXX | None found | — |

Zero debt markers. No blocker anti-patterns.

---

## Code Review Resolution

The 15-REVIEW.md recorded 1 Critical + 3 Warnings. All four were fixed in-phase:

| Finding | Fix | Commit | Status |
|---------|-----|--------|--------|
| CR-01: `verifyTimeOffset` schema allowed negative `offsetMs` | Added `.int().min(0).max(30*24*60*60*1000)` to verifyTimeOffset schema | ed1c4f4 | FIXED — confirmed in `src/lib/debug-cheat.ts` lines 274-280 |
| WR-01: `nowForComparison` ternary dead code in qa-03 Phase B | Hoisted `minShiftMs`; `nowForComparison = new Date(Date.now() + minShiftMs)` | c999892 | FIXED — confirmed in `scripts/qa-03-resume.mjs` lines 254, 288-289 |
| WR-02: Module-level `_timeShiftCookie` not reset between in-process runs | Added exported `resetTimeShiftState()` to qa-lib | 646db3a | FIXED — confirmed at `scripts/qa-lib.mjs` lines 74-76 |
| WR-03: `setTimeShift` return value silently discarded in qa-05 pause segment | Both `decayShiftResult` and `pauseShiftResult` now checked for `ok===true`; warning added to qa-lib when cookie not captured | e204193 | FIXED — confirmed in `scripts/qa-05-decay.mjs` lines 190-198, 296-304 |
| IN-01, IN-02 | Deferred (info-level, no correctness impact) | — | DEFERRED (acceptable) |

---

## Human Verification Required

### 1. Full harness green run (QAJ-01..05 + cleanup)

**Test:** Start `STUDY_COOLDOWN_MINUTES=1 npm run dev`, then in a separate terminal:
```
DATABASE_URL="<neon-connection-string>" DEBUG_CHEAT_SECRET="<secret>" npm run qa:run
```
**Expected:** Output shows PASS for each of QAJ-01, QAJ-02, QAJ-03-A, QAJ-03-B, QAJ-04, QAJ-05, and CLEANUP. Final line: `ALL JOURNEYS PASSED — harness complete, zero residue.` Process exits 0.
**Why human:** Requires live Neon DB, a running Next.js dev server with `STUDY_COOLDOWN_MINUTES=1` set at boot time (module-scope env, cannot be patched at runtime), and a valid `DEBUG_CHEAT_SECRET`.

### 2. Prod-parity e2e: time-shift returns 404 when secret unset

**Test:** Boot the dev server WITHOUT `DEBUG_CHEAT_SECRET`, then:
```
DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts
```
**Expected:** Test passes. All three 404 assertions fire: `/api/debug/state`, `/api/debug/cheat`, and `/api/debug/time-shift` all return 404 when the feature flag is absent (D-05 prod-parity proof).
**Why human:** Playwright e2e requires a running browser and dev server; cannot be auto-executed headlessly in static codebase analysis.

### 3. Post-run residual check (QAJ-06 zero-residue proof)

**Test:** Immediately after `npm run qa:run` completes (whether PASS or FAIL), run:
```
DATABASE_URL="<neon-connection-string>" npm run qa:cleanup
```
**Expected:** Output shows `[cleanup] deleted 0 user(s)` — confirming the `finally`-block cleanup in `qa-run.mjs` removed all `@test.local` test users, leaving zero residue.
**Why human:** Requires a live Neon DB query to verify the users table is clean.

---

## Gaps Summary

No gaps. All statically-verifiable must-haves are VERIFIED:

- The time-shift endpoint exists, is gated correctly (404-before-auth when secret unset), uses HMAC-SHA256 signing, and range-validates `offsetMs`.
- `readQaTimeOffset` is threaded into all three pipeline callsites (study/complete, habitat, debug/state).
- The QAOB-04 prod-parity e2e has been extended with a `/api/debug/time-shift` 404 assertion.
- All five journey scripts exist, parse as valid ESM, import qa-lib, drive the real pipeline, and assert on the real-data surface.
- `qa-run.mjs` sequences all five journeys, invokes cleanup with `%@test.local` in a `finally` block, and exits non-zero on any failure.
- npm scripts `qa:run` and `qa:cleanup` are wired.
- All four code-review findings (CR-01, WR-01, WR-02, WR-03) were fixed in-phase.

The `human_needed` status reflects that the phase goal ("provably correct via scripted QA") requires the scripts to actually run green against the live pipeline — which cannot be proven from static analysis alone. The code infrastructure is complete and correct; the live-run proof is the remaining gate.

---

_Verified: 2026-06-25T11:30:00Z_
_Verifier: Claude (gsd-verifier)_
