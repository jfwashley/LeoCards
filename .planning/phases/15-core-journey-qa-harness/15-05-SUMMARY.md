---
phase: 15-core-journey-qa-harness
plan: "05"
subsystem: qa-harness
tags: [qa, orchestrator, self-clean, spawnSync, npm-scripts, QAJ-06]
dependency_graph:
  requires: [15-03, 15-04]
  provides:
    - scripts/qa-run.mjs
    - package.json (qa:run + qa:cleanup scripts)
  affects: [operator, UAT pipeline]
tech_stack:
  added: []
  patterns:
    - spawnSync orchestrator with finally-block cleanup (T-15-16/17)
    - Journey skip-if-dependency-failed guard (QAJ-03-B skipped if QAJ-03-A fails)
    - CLEANUP_DB_URL alias forwarded in cleanup env so cleanup always runs even if DATABASE_URL differs
    - Cooldown-regime: one server boot (STUDY_COOLDOWN_MINUTES=1) covers both qa-01 and qa-03-A; qa-03-B uses time-shift fast path
key_files:
  created:
    - scripts/qa-run.mjs
  modified:
    - package.json
decisions:
  - "Cooldown-regime contract (option a): qa-run defaults to time-shift fast path for qa-03-B so no second server restart is needed. qa-01 and qa-03-A both require STUDY_COOLDOWN_MINUTES=1 on the dev server. A single boot with STUDY_COOLDOWN_MINUTES=1 covers all five journeys."
  - "qa-03 driven as two separate journey entries (QAJ-03-A: no flag; QAJ-03-B: --resume) in the JOURNEYS array with a skipIfFailed guard — cleaner than shell logic inside a single entry"
  - "No new packages: qa-run.mjs uses only node:child_process, node:path, node:url (built-ins)"
  - "CLEANUP_DB_URL aliased from DATABASE_URL in cleanupEnv so the cleanup step always has a DB URL whether or not the operator sets CLEANUP_DB_URL separately"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-25"
  tasks_completed: 2
  files_changed: 2
---

# Phase 15 Plan 05: QA Harness Orchestrator Summary

Single-entry-point harness (`scripts/qa-run.mjs`) that sequences all five core-journey QA scripts via spawnSync, self-cleans test users via `cleanup-test-users.mjs "%@test.local"` in a `finally` block, and exits non-zero on any journey or cleanup failure — closing Phase 15.

## What Was Built

### `scripts/qa-run.mjs` — QA orchestrator (D-01 / D-04)

**Command:** `npm run qa:run` (or `node scripts/qa-run.mjs` directly)

**Required env:**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string (provisioning + cleanup fallback) |
| `DEBUG_CHEAT_SECRET` | Secret for `/api/debug/*` endpoints |

**Optional env:**

| Variable | Purpose |
|----------|---------|
| `QA_BASE_URL` | App origin (default: `http://localhost:3000`) |
| `CLEANUP_DB_URL` | DB URL for cleanup step (falls back to `DATABASE_URL` if unset) |

**Journey sequence:**

| Step | ID | Script | Args | Notes |
|------|----|--------|------|-------|
| 1 | QAJ-01 | `qa-01-learn-card.mjs` | — | Requires `STUDY_COOLDOWN_MINUTES=1` on dev server |
| 2 | QAJ-02 | `qa-02-mastery.mjs` | — | Zero-cooldown |
| 3 | QAJ-03-A | `qa-03-resume.mjs` | — | Phase A: provision + grade + write manifest; requires `STUDY_COOLDOWN_MINUTES=1` |
| 4 | QAJ-03-B | `qa-03-resume.mjs` | `--resume` | Phase B: re-auth + time-shift fast path + assert; skipped if QAJ-03-A failed |
| 5 | QAJ-04 | `qa-04-habitat.mjs` | — | Zero-cooldown |
| 6 | QAJ-05 | `qa-05-decay.mjs` | — | Time-shift; zero-cooldown fine |
| — | CLEANUP | `cleanup-test-users.mjs` | `%@test.local` | Always runs in `finally`; QAJ-06 self-clean |

**Key behaviours:**

- Each journey is spawned with `spawnSync(process.execPath, [scriptPath, ...args], { stdio: "inherit", env: process.env })` — stdout/stderr inherited; secrets not logged by the orchestrator.
- Journeys run sequentially; if one fails the rest continue (collect all results), except QAJ-03-B is skipped if QAJ-03-A failed (no manifest to read).
- Cleanup always runs via `finally` — guarantees zero residue even if journeys throw/fail (T-15-16, T-15-17).
- Exit code: 0 only if every journey PASSED and cleanup PASSED; otherwise 1.

### `package.json` — npm scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `qa:run` | `node scripts/qa-run.mjs` | Full harness: all 5 journeys + cleanup |
| `qa:cleanup` | `node scripts/cleanup-test-users.mjs %@test.local` | Standalone cleanup (run-on-demand) |

No changes to `dependencies` or `devDependencies`.

---

## Cooldown-Regime Contract

**Chosen: Option A (time-shift fast path, single server boot)**

| Journey | Cooldown requirement | Explanation |
|---------|---------------------|-------------|
| qa-01 | `STUDY_COOLDOWN_MINUTES=1` on dev server | Asserts `cooldownUntil` non-null and ~1 min in future |
| qa-02 | None (zero-cooldown) | All 4 mastery rounds advance back-to-back |
| qa-03 Phase A | `STUDY_COOLDOWN_MINUTES=1` on dev server | Grades card[0] to round 1; manifest captures `cooldownUntil` |
| qa-03 Phase B | None (time-shift fast path) | `--resume` computes `minShiftMs = max(resumeAfter − now + 1s, 90_000)` to jump past cooldown |
| qa-04 | None (zero-cooldown) | Learns 15 cards back-to-back |
| qa-05 | None (zero-cooldown + time-shift) | Decay uses `setTimeShift(+4 days)` |

**Single boot covers all journeys:** Start the dev server once with `STUDY_COOLDOWN_MINUTES=1 npm run dev`, then `npm run qa:run` in a separate terminal. No server restart needed.

---

## How to Run the Full Harness

```bash
# 1. Start the dev server with the 1-minute cooldown:
STUDY_COOLDOWN_MINUTES=1 npm run dev

# 2. In a separate terminal, run the harness:
DATABASE_URL="postgres://..." DEBUG_CHEAT_SECRET="your-secret" npm run qa:run

# 3. To run only cleanup (post-run residual check):
DATABASE_URL="postgres://..." npm run qa:cleanup
```

**Expected output on a clean pass:**
```
[qa-run] ============================================================
[qa-run] LeoCards core-journey QA harness — Phase 15 Plan 05
[qa-run] ============================================================

[qa-run] --- QAJ-01: learn-card ---
[QAJ-01] PASS

[qa-run] --- QAJ-02: mastery ---
[QAJ-02] PASS

...

[qa-run] --- Cleanup (QAJ-06): remove *@test.local users ---
[cleanup] deleted N user(s) ...

[qa-run] ============================================================
[qa-run] RESULTS SUMMARY
[qa-run] ============================================================
[qa-run]  [ ] QAJ-01       PASS  learn-card
[qa-run]  [ ] QAJ-02       PASS  mastery
[qa-run]  [ ] QAJ-03-A     PASS  resume (Phase A: provision + grade + manifest)
[qa-run]  [ ] QAJ-03-B     PASS  resume (Phase B: re-auth + time-shift + assert)
[qa-run]  [ ] QAJ-04       PASS  habitat
[qa-run]  [ ] QAJ-05       PASS  decay
[qa-run]  [ ] CLEANUP      PASS  cleanup *@test.local users (QAJ-06)
[qa-run] ============================================================
[qa-run] ALL JOURNEYS PASSED — harness complete, zero residue.
```

Exit 0 = all passed + zero residue. Exit 1 = one or more failed (see FAIL lines in output).

---

## Verification Results

| Check | Result |
|-------|--------|
| `node --check scripts/qa-run.mjs` | PASS (exit 0) |
| `npx biome ci scripts/qa-run.mjs` | PASS — auto-fixed formatting (long console.log lines wrapped) before final check |
| `node -e` JSON parse + scripts presence check | PASS — both `qa:run` and `qa:cleanup` present |
| `npx tsc --noEmit` | PASS (exit 0) — plan adds no `.ts` files |
| `npx vitest run` | 1 pre-existing timeout failure in `cooldown-config.test.ts` (Phase 14 plan 14-01, pre-existing); not caused by this plan |
| Live DB harness | NOT executed per guardrail (operator/orchestrator concern; requires live Neon DB + dev server) |
| e2e | Orchestrator-owned — not run (this plan touches no specs) |

---

## Deviations from Plan

### Auto-fixed Issues

**[Rule 3 - Blocking] Biome formatting violations on long console.log lines**
- **Found during:** Scoped biome CI check after initial write
- **Issue:** Three `console.log` separator lines exceeded biome's print-width limit; one ternary expression in the results loop also needed reformatting.
- **Fix:** `npx biome check --write scripts/qa-run.mjs` applied safe formatting fixes (no logic change).
- **Files modified:** `scripts/qa-run.mjs`
- **Commit:** Auto-applied before Task 1 commit `9ff9a37`

No other deviations. Plan executed exactly as specified.

---

## Known Stubs

None. `scripts/qa-run.mjs` is fully wired:
- All five journeys referenced by their actual script names
- Cleanup invoked with the literal `%@test.local` pattern
- Exit codes aggregated; exit 1 on any failure
- No hardcoded expected values, no TODO markers

---

## Threat Flags

No new untrusted network surfaces introduced. All four threats mitigated:

| Threat | Status |
|--------|--------|
| T-15-16: cleanup deletes wrong users | DONE — literal `%@test.local` passed; cleanup re-guards with `/@(leocards-)?test\.local$/` |
| T-15-17: hung journey blocks run | DONE — `spawnSync` is sequential; non-zero exit records failure + cleanup runs in `finally` |
| T-15-18: child stdout leaks secrets | DONE — `stdio: "inherit"` forwards journey output; orchestrator adds no secret logging of its own |
| T-15-SC: npm/pip package installs | N/A — no new packages; only npm script entries added |

---

## Self-Check: PASSED

**Files confirmed on disk:**
- `scripts/qa-run.mjs` — FOUND
- `package.json` (qa:run + qa:cleanup present) — FOUND

**Commits confirmed in git log:**
- `9ff9a37` (feat(15-05): add qa-run.mjs sequential QA harness orchestrator) — FOUND
- `bd106ee` (feat(15-05): add qa:run and qa:cleanup npm scripts to package.json) — FOUND
