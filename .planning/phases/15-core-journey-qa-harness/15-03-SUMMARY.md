---
phase: 15-core-journey-qa-harness
plan: "03"
subsystem: qa-harness
tags: [qa, journey, srs, mastery, habitat, cooldown, direction-rules]
dependency_graph:
  requires: [15-02]
  provides:
    - scripts/qa-01-learn-card.mjs (QAJ-01)
    - scripts/qa-02-mastery.mjs (QAJ-02)
    - scripts/qa-04-habitat.mjs (QAJ-04)
  affects: [15-05-orchestrator, qa-run.mjs]
tech_stack:
  added: []
  patterns:
    - ESM Node journey script: shebang + env guard + provision/grade/assert + exit 0/1
    - Zero-cooldown default for qa-02/qa-04; STUDY_COOLDOWN_MINUTES=1 server for qa-01
    - Dual-surface level agreement: readHabitat + readState.real for qa-04
    - learnCard helper (qa-04): 3-round gradeSession loop per card
key_files:
  created:
    - scripts/qa-01-learn-card.mjs
    - scripts/qa-02-mastery.mjs
    - scripts/qa-04-habitat.mjs
  modified: []
decisions:
  - "qa-01 cooldown window: assert cooldownUntil is non-null, after now, and within 2 minutes (not exactly 1 minute) to tolerate small timing jitter between grade and readState calls"
  - "qa-04 level-3 detection: logged via console when leveledUp===3 fires inside the loop, but final assertion targets readState.real.level>=3 (not the stored gradeSession result) — avoids unused-variable lint"
  - "qa-02 round-2 direction submission: directionForRound(2) returns 'either' (not a valid HTTP grade direction); script submits 'n2t' (SRS engine accepts either at round 2) while still logging the 'either' rule"
  - "biome auto-fix (style commit e2f7dcd): organizeImports sorted named imports alphabetically + formatted long console.log lines — zero logic change"
metrics:
  duration: "~11 minutes"
  completed: "2026-06-25"
  tasks_completed: 3
  files_changed: 3
---

# Phase 15 Plan 03: Journey Scripts QAJ-01/02/04 Summary

Three real-pipeline journey scripts proving the core SRS advancement (round 0→1 + cooldown), full mastery ladder (0→1→2→3 with wrong-answer hold and direction rules), and habitat level progression (L1→2 + L2→3 with dual-surface agreement).

## What Was Built

### `scripts/qa-01-learn-card.mjs` — QAJ-01

| Step | What it does |
|------|--------------|
| Provision | 1 card `{chat/cat}` via `provision(BASE_URL, { cards: [...] })` |
| Baseline | `readState` → asserts `masteryRound=0, direction=n2t, learned=false` |
| Grade | `gradeSession` with `{ direction: "n2t", correct: true }` |
| Post-grade | `readState` → asserts `masteryRound=1, direction=t2n, learned=false` |
| Cooldown | Asserts `cooldownUntil` is non-null, after `now`, and within 2 minutes |

**Key requirement:** Dev server must be started with `STUDY_COOLDOWN_MINUTES=1` (module-scope env, evaluated at import time). Failure to do so causes `cooldownUntil: null` — the script detects this and exits 1 with a clear message citing RESEARCH pitfall 2.

**qa-lib exports used:** `provision`, `gradeSession`, `readState`, `directionForRound`, `assertEq`, `DEFAULT_BASE_URL`

---

### `scripts/qa-02-mastery.mjs` — QAJ-02

| Phase | Round | Direction | correct | Expected masteryRound |
|-------|-------|-----------|---------|----------------------|
| Round 0 advance | 0 | n2t | true | 1 |
| Wrong-answer hold | 1 | t2n | false | 1 (unchanged) |
| Round 1 advance | 1 | t2n | true | 2 |
| Round 2 advance | 2 | n2t¹ | true | 3 (learned=true, cooldownUntil=null) |

¹ `directionForRound(2)` returns `"either"`; the script submits `"n2t"` (both accepted by the engine at round 2) while logging the `"either"` direction rule.

**Zero-cooldown assumption:** runs without `STUDY_COOLDOWN_MINUTES` set — default local dev returns `{ 0: 0, 1: 0, 2: null }` so all four rounds advance in a single script run.

**qa-lib exports used:** `provision`, `gradeSession`, `readState`, `directionForRound`, `assertEq`, `DEFAULT_BASE_URL`

---

### `scripts/qa-04-habitat.mjs` — QAJ-04

Provisions **15 cards** (French word pairs). Learns each via a `learnCard(baseUrl, token, deckId, cardId)` helper that fires three `gradeSession` calls (n2t/t2n/n2t — one per round 0→1→2→3).

| Milestone | Cards learned | Assertion |
|-----------|--------------|-----------|
| Pre-threshold | 4 | `level=1, effectiveCardCount<5` |
| L1→L2 crossing | 5 | `gradeSession.leveledUp===2`, `effectiveCardCount>=5`, `level>=2`, `/api/habitat.level === real.level` |
| L2→L3 crossing | 15 | `effectiveCardCount>=15`, `level>=3`, `/api/habitat.level === real.level` |

**Dual-surface agreement:** both `/api/habitat` (`readHabitat`) and `/api/debug/state.real` (`readState`) are called after each threshold crossing and their `level` + `effectiveCardCount` are compared via `assertEq`.

**Cards provisioned:** 15 (CARD_PAIRS: chat/dog/maison/voiture/livre/table/chaise/eau/pain/lune/soleil/arbre/fleur/oiseau/poisson).

**qa-lib exports used:** `provision`, `gradeSession`, `readState`, `readHabitat`, `directionForRound`, `assertEq`, `DEFAULT_BASE_URL`

---

## Verification Results

| Check | Result |
|-------|--------|
| `node --check scripts/qa-01-learn-card.mjs` | PASS (exit 0) |
| `node --check scripts/qa-02-mastery.mjs` | PASS (exit 0) |
| `node --check scripts/qa-04-habitat.mjs` | PASS (exit 0) |
| `npx biome ci` (scoped to 3 files) | PASS (exit 0, no errors) |
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx vitest run` (full suite) | 2081 pass / 9 fail / 6 skip — failures are pre-existing timeouts unrelated to this plan (see Deferred Issues) |
| Live DB run (operator step) | NOT executed — per plan guardrails; requires live dev server |

---

## Deviations from Plan

### Auto-fixed Issues

**[Rule 3 - Blocking] Biome import-order + formatting violations on all three scripts**
- **Found during:** Scoped biome CI check after all three scripts were committed
- **Issue (1):** `organizeImports` flagged named imports in the wrong alphabetical order (`DEFAULT_BASE_URL` before `assertEq`); affects all three scripts.
- **Issue (2):** Long `console.log` lines exceeded biome's print-width limit in `qa-01` and `qa-04`.
- **Issue (3):** `qa-04-habitat.mjs` had `levelUpToL3Result` variable declared but never read after assignment (unused variable lint).
- **Fix:** `npx biome check --write` applied safe organizeImports + formatting fixes. Unused variable removed — final L3 assertion uses `postL3State.real.level>=3` directly (the stored result was redundant).
- **Files modified:** `scripts/qa-01-learn-card.mjs`, `scripts/qa-02-mastery.mjs`, `scripts/qa-04-habitat.mjs`
- **Commit:** `e2f7dcd` (style(15-03): apply biome import-order + formatting to qa-01/02/04 scripts)

### qa-lib Signature Observations for 15-05 Orchestrator

No signature mismatches found. All exports matched the 15-02-SUMMARY exactly:
- `provision(baseUrl, opts)` → `{ email, sessionToken, userId, deckId, cardIds }` ✓
- `gradeSession(baseUrl, token, { deckId, grades })` → `{ success, leveledUp }` ✓
- `readState(baseUrl, token, secret, deckId)` → `{ real, forced, cards }` ✓
- `readHabitat(baseUrl, token)` → `HabitatState` ✓
- `directionForRound(round)` → `"n2t" | "t2n" | "either"` ✓
- `DEFAULT_BASE_URL` constant exported ✓

One behavioral note for 15-05: `directionForRound(2)` returns `"either"` — this is a rule label, not a valid HTTP grade direction. Journey scripts that grade at round 2 must submit `"n2t"` or `"t2n"` (not `"either"`) to `gradeSession`. The orchestrator should document this when wiring qa-run.mjs.

---

## Deferred Issues

Pre-existing vitest failures (NOT caused by this plan — zero `.ts` files modified):
- `src/components/__tests__/deck-switcher.test.tsx` — Test timed out (5000ms)
- `src/app/(auth)/__tests__/signup-payload.test.tsx` — Test timed out (5000ms)
- `src/app/api/study/__tests__/cooldown-config.test.ts` — Test timed out (5000ms)
- 6 additional timeout-based failures

These were present before this plan's commits (`git diff HEAD~4 --name-only` shows only the 3 new `.mjs` scripts). Logged to `deferred-items.md` is not needed (they're in the existing vitest noise, not new regressions).

---

## Known Stubs

None. All three scripts are fully wired:
- `qa-01`: asserts real `cooldownUntil` from live server response
- `qa-02`: asserts real `masteryRound` state changes across 5 grade sessions
- `qa-04`: asserts real `effectiveCardCount` and `level` from live habitat + debug state endpoints

No hardcoded expected values, no TODO markers, no placeholder data.

---

## Threat Flags

No new untrusted network surfaces introduced. All three threats mitigated:

| Threat | Status |
|--------|--------|
| T-15-09: token/password in logs | DONE — scripts log only email/cardId/round/PASS-FAIL |
| T-15-10: residue in prod data | DONE — all users `@test.local` (QAJ-06 reachable) |
| T-15-11: journey bypasses real pipeline | DONE — all grade advancement via `gradeSession` → POST /api/study/complete |

---

## Self-Check: PASSED

**Files confirmed on disk:**
- `scripts/qa-01-learn-card.mjs` — FOUND
- `scripts/qa-02-mastery.mjs` — FOUND
- `scripts/qa-04-habitat.mjs` — FOUND

**Commits confirmed in git log:**
- `c401eba` (feat(15-03): add qa-01-learn-card.mjs) — verified
- `05835ce` (feat(15-03): add qa-02-mastery.mjs) — verified
- `095358b` (feat(15-03): add qa-04-habitat.mjs) — verified
- `e2f7dcd` (style(15-03): apply biome import-order + formatting) — verified
