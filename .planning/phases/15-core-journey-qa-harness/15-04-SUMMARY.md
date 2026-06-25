---
phase: 15-core-journey-qa-harness
plan: "04"
subsystem: qa-harness
tags: [qa, time-shift, manifest, srs, decay, pause, cooldown]
dependency_graph:
  requires: [15-01, 15-02]
  provides:
    - scripts/qa-03-resume.mjs
    - scripts/qa-05-decay.mjs
  affects: [qa-run orchestrator, cleanup-test-users.mjs (QAJ-06)]
tech_stack:
  added: []
  patterns:
    - Two-phase manifest pattern (Phase A: provision+grade+write; Phase B: readManifest+re-auth+assert)
    - QA time-shift fast-path (setTimeShift before readState, per RESEARCH pitfall 5)
    - try/finally clearTimeShift to prevent offset cookie leaking between journeys
    - directionForRound(2) returns "either" — scripts submit "n2t" directly for round-2 grades
    - assertApprox helper for floating-point quality assertions (±0.01 epsilon)
key_files:
  created:
    - scripts/qa-03-resume.mjs
    - scripts/qa-05-decay.mjs
  modified: []
decisions:
  - "Manifest path: scripts/qa-manifest-qa03.json (fixed default, overridable via RESUME_MANIFEST env or positional arg after --resume) — simpler than UUID-named files since qa-03 only has one active session at a time"
  - "Phase B time-shift: compute minShiftMs = max(resumeAfter - now + 1s, 90_000) so the shift always clears the cooldown regardless of how quickly Phase B is invoked after Phase A"
  - "pause/unpause called inline (raw fetch with session cookie) — qa-lib has no pause helper; plan explicitly noted to call the endpoint inline if helpers were absent"
  - "Decay epsilon: ±0.01 — habitat-engine uses floating-point arithmetic; the epsilon covers rounding accumulated through quality = 1 - daysPastGrace * DECAY_RATE_PER_DAY"
  - "qa-05 provisions 3 cards (2 learned + 1 pause-card) — 2 learned cards needed so learnedCardCount is non-zero and habitat_metadata.lastActivityAt is properly set for decay assertions"
  - "qa-05 asserts quality against readState (real.quality) NOT readHabitat — readState includes the per-card table and the real HabitatState; readHabitat used for learnedCardCount pre-flight check only"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-25"
  tasks_completed: 2
  files_changed: 2
---

# Phase 15 Plan 04: QAJ-03/05 Time-Shift Journey Scripts Summary

QAJ-03 time-resumable session via atomic manifest + re-auth + time-shift fast-path, and QAJ-05 decay/grace + pause invariant via time-shift, both without real multi-hour/multi-day waits.

## What Was Built

### `scripts/qa-03-resume.mjs` — QAJ-03: Time-Resumable Session

**Two-phase script controlled by `--resume` flag:**

| Phase | Trigger | What it does |
|-------|---------|-------------|
| A (provision) | `node scripts/qa-03-resume.mjs` (no flag) | Provisions 2 cards; grades card[0] to round 1 (n2t correct, gets ~1-min cooldown); captures `cooldownUntil`; writes atomic manifest via `writeManifest`; exits 0 |
| B (resume) | `node scripts/qa-03-resume.mjs --resume` | `readManifest`; re-auth via `signIn(email, password)` (fresh token — pitfall 4); `setTimeShift(+minShiftMs)` fast-path to jump past cooldown; `readState`; asserts masteryRound + cooling-vs-due + due-count; `clearTimeShift` in finally |

**Manifest path:** `scripts/qa-manifest-qa03.json` (gitignored per 15-02). Overridable via `RESUME_MANIFEST` env or positional arg: `--resume <path>`.

**Fast-path shift logic:** `minShiftMs = max(resumeAfter − Date.now() + 1000, 90_000)` — always clears the cooldown regardless of elapsed wall time between phases.

**Real-wait mode:** Pass `--no-fast`; Phase B checks `Date.now() >= resumeAfter` and errors if too early.

**qa-lib exports used:**

| Export | Purpose |
|--------|---------|
| `provision` | Sign up @test.local user + Drizzle deck+cards insert |
| `gradeSession` | POST /api/study/complete to advance card to round 1 |
| `readState` | GET /api/debug/state for SRS assertion (D-06) |
| `signIn` | Re-authenticate on resume (pitfall 4: stored token may be stale) |
| `setTimeShift` | +minShiftMs fast-path to expire cooldown (D-03) |
| `clearTimeShift` | Restore real wall-clock time in finally block |
| `writeManifest` | Atomic .tmp→rename JSON persist |
| `readManifest` | Read + parse manifest on resume |
| `directionForRound` | Maps round 0 → "n2t" for grade submission |
| `assertEq` | Strict equality assertions |

**Assertions in Phase B:**
- Each card: `masteryRound === expectedMasteryRound`
- Graded card: `cooldownUntil` null or past (due after shift)
- Ungraded card: `cooldownUntil` null (always due)
- Due-count: number of cards with null or expired cooldown matches expected

---

### `scripts/qa-05-decay.mjs` — QAJ-05: Decay/Grace + Pause via Time-Shift

**Single-run script (no phases). Two segments: DECAY and PAUSE.**

**DECAY SEGMENT:**

| Step | Action | Assertion |
|------|--------|-----------|
| Pre-shift | `readState` | `real.isDecaying === false`, `real.quality === 1` |
| Shift | `setTimeShift(+4 days = 345_600_000 ms)` | — |
| Post-shift | `readState` | `real.isDecaying === true`, `real.quality ≈ 0.90 ± 0.01` |
| Clear | `clearTimeShift` | — |
| Post-clear | `readState` | `real.quality === 1`, `real.isDecaying === false` |

**Decay math:** `quality = 1 - daysPastGrace * 0.05 = 1 - 2 * 0.05 = 0.90` (4 days past study − 2-day grace = 2 days at 5%/day). Epsilon ±0.01.

**PAUSE SEGMENT:**

| Step | Action | Assertion |
|------|--------|-----------|
| Pre-pause | `readState` | Capture `masteryRound`, `cooldownUntil` |
| Pause | `POST /api/cards/<id>/pause` (inline fetch) | `pauseBody.pausedAt` non-null |
| Shift | `setTimeShift(+4 days)` | — |
| Post-shift | `readState` | `masteryRound` unchanged, `cooldownUntil` unchanged, `pausedAt` non-null, `real.isDecaying === true` |
| Unpause | `POST /api/cards/<id>/unpause` (inline fetch) | `cooldownUntil` shifted by pause duration |
| Post-unpause | `readState` | `pausedAt === null` |

**`clearTimeShift` is called in a `finally` block** — the time-shift cookie cannot leak into subsequent journey scripts even if assertions throw.

**Provisioning:** 3 cards (chat, chien, maison). Cards [0]+[1] are graded to `masteryRound=3` (learned) via 3 `gradeSession` calls each, establishing `lastActivityAt` in `habitat_metadata`. Card [2] is the pause card (stays at round 0).

**qa-lib exports used:**

| Export | Purpose |
|--------|---------|
| `provision` | Sign up @test.local user + Drizzle deck+cards insert |
| `gradeSession` | Advance 2 cards to masteryRound=3 (learned) to set lastActivityAt |
| `readState` | GET /api/debug/state for real.isDecaying + real.quality + per-card assertions |
| `readHabitat` | GET /api/habitat for pre-flight learnedCardCount check |
| `setTimeShift` | +4 days to simulate decay / pause-with-decay scenario |
| `clearTimeShift` | Restore real wall-clock time (called in finally) |
| `directionForRound` | Maps rounds 0/1 → "n2t"/"t2n" for grade submissions |
| `assertEq` | Strict equality assertions |

**Inline (not via qa-lib):**
- `POST /api/cards/<id>/pause` — pause helper absent from qa-lib; called via raw `fetch` with `Cookie: better-auth.session_token=<token>`
- `POST /api/cards/<id>/unpause` — same pattern

---

## Key Implementation Notes

### Direction label caveat (from 15-03 executor)
`directionForRound(2)` returns the rule label `"either"`, which is NOT a valid HTTP `direction` value. Round-2 grade submissions use `"n2t"` directly. This is documented in qa-05's comment on lines 118-120.

### offsetMs values
| Script | Context | offsetMs |
|--------|---------|---------|
| qa-03 Phase B (fast-path) | Expire ~1-min cooldown | `max(resumeAfter - Date.now() + 1000, 90_000)` (~90–70+ seconds depending on elapsed time) |
| qa-05 DECAY segment | Trigger 2-day-past-grace decay | `345_600_000` (4 days exactly) |
| qa-05 PAUSE segment | Verify habitat decay during pause | `345_600_000` (4 days exactly) |

### Decay epsilon tolerance
`QUALITY_EPSILON = 0.01`. The habitat engine computes `quality = 1 - daysPastGrace * 0.05` where `daysPastGrace = (shiftedNow - lastActivityAt - GRACE_PERIOD_MS) / (24*60*60*1000)`. Minor floating-point differences in timestamp arithmetic justify ±0.01.

### Manifest schema (qa-03)
```jsonc
{
  "schemaVersion": 1,
  "runId": "<8-char UUID prefix>",
  "createdAt": "<ISO 8601>",
  "phase": "cooldown-resume",
  "baseUrl": "http://localhost:3000",
  "user": { "email": "qa+...@test.local", "password": "<random>" },
  // sessionToken NOT stored — always re-auth on resume (pitfall 4)
  "deck": { "id": "<deckId>", "language": "fr" },
  "cards": [
    { "id": "...", "front": "chat", "back": "cat",
      "expectedMasteryRound": 1, "expectedDirection": "t2n",
      "cooldownUntilExpected": "<ISO 8601>",
      "expectedState": "cooling" },
    { "id": "...", "front": "chien", "back": "dog",
      "expectedMasteryRound": 0, "expectedDirection": "n2t",
      "cooldownUntilExpected": null,
      "expectedState": "due" }
  ],
  "resumeAfter": "<ISO 8601 — cooldownUntil + 10s buffer>",
  "completedPhases": ["provision", "grade", "cooldown-set"]
}
```

## Deviations from Plan

None. Plan executed exactly as specified.

The inline pause/unpause pattern (raw `fetch` instead of a qa-lib helper) was already anticipated by the plan's `<read_first>` note: "if not, qa-05 calls POST /api/cards/[id]/pause directly with the session cookie."

## Wave Gate Results

- **`node --check scripts/qa-03-resume.mjs`**: PASSED (exit 0)
- **`node --check scripts/qa-05-decay.mjs`**: PASSED (exit 0)
- **Scoped biome** (`npx biome ci scripts/qa-03-resume.mjs scripts/qa-05-decay.mjs`): PASSED (biome import-order + formatting auto-fixed before final check)
- **Full `tsc --noEmit`**: PASSED (exit 0 — this plan adds no `.ts` files)
- **Full `npx vitest run`**: 4 test failures found — all pre-existing in `src/app/api/study/__tests__/cooldown-config.test.ts` (last modified Phase 14 plan 14-01, commit d7d385c); unrelated to this plan's `.mjs` scripts which add no Vitest tests
- **Live DB harness**: Not executed per guardrail (operator/orchestrator concern)
- **e2e**: Orchestrator-owned — not run (this plan touches no specs)

## Known Stubs

None. Both scripts are fully wired against the qa-lib contract. No placeholder data or TODO stubs.

## Threat Flags

No new untrusted network surfaces. All four threats (T-15-12 through T-15-15) mitigated as designed:
- T-15-12: offsetMs values stay well under 30 days (max 4 days used)
- T-15-13: manifest stores ephemeral @test.local credentials; file gitignored per 15-02
- T-15-14: session tokens and passwords never logged — only email, deckId, quality values
- T-15-15: time-shift is per-session cookie + cheatEnabled()-gated; clearTimeShift in finally

## Self-Check: PASSED

**Files confirmed on disk:**
- `scripts/qa-03-resume.mjs` — FOUND
- `scripts/qa-05-decay.mjs` — FOUND

**Commits confirmed in git log:**
- `64c0b92` (feat(15-04): add qa-03-resume.mjs) — FOUND
- `6be8804` (feat(15-04): add qa-05-decay.mjs) — FOUND
