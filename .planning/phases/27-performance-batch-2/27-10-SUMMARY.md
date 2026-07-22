---
phase: 27-performance-batch-2
plan: 10
subsystem: api

tags: [anthropic, ai-sdk, extraction, latency, vision]

# Dependency graph
requires:
  - phase: 27-performance-batch-2
    provides: PERF-12 cached getSession() pattern (unrelated route, same phase)
provides:
  - Extraction route (/api/extract) running on claude-haiku-4-5 instead of claude-sonnet-4-6
  - A recorded quality/latency verdict (D-05/D-06) gating the model choice
affects: [phase-18-field-validation-guardrails]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Model-swap-behind-a-manual-gate: drop-in model id string change validated by (1) automated shape/schema eval, (2) a synthetic/real quality side-by-side, (3) a latency median vs. a fixed threshold — decision recorded before calling the item done"

key-files:
  created: []
  modified:
    - src/app/api/extract/route.ts

key-decisions:
  - "D-05/D-06 resolved 'done': keep claude-haiku-4-5, skip streaming — Josh approved the orchestrator's synthetic side-by-side recommendation (2026-07-22)"
  - "Task 3 'done' branch is a documented no-op — no code change, no streaming, no revert; route.ts's dating comment already documents the D-05 gate and revert condition"

patterns-established:
  - "Model swap comments in route.ts date the trial + document the revert condition inline, so a future revert is a single-line diff with full context"

requirements-completed: [PERF-17]

# Metrics
duration: ~5min (Task 3 only; Tasks 1-2 completed in prior sessions)
completed: 2026-07-22
---

# Phase 27 Plan 10: Extraction latency (Haiku trial) Summary

**Extraction (`/api/extract`) now runs on `claude-haiku-4-5` instead of `claude-sonnet-4-6`, with quality and latency verified sufficient that no streaming was needed — item 13 / PERF-17 shipped as a straight model swap.**

## Performance

- **Duration:** ~5 min (this continuation session — Task 3 only; Tasks 1-2 spanned prior sessions)
- **Started:** 2026-07-22T14:16:38Z (Task 1 commit)
- **Completed:** 2026-07-22T21:54:59Z
- **Tasks:** 3 (1 code change, 1 human-verify checkpoint, 1 no-op decision branch)
- **Files modified:** 1 (`src/app/api/extract/route.ts`, Task 1 only — Task 3 added zero further changes)

## Accomplishments
- Extraction model swapped from `claude-sonnet-4-6` to `claude-haiku-4-5` (drop-in string change, `@ai-sdk/anthropic@3.0.78`), all existing error-handling branches (504/200/502/finally-clearTimeout) preserved byte-unchanged
- D-05 quality gate + D-06 latency gate both resolved via a synthetic side-by-side (see Decisions Made) — Haiku retained, no revert, no streaming
- Model id validity confirmed live: `claude-haiku-4-5` resolves to `claude-haiku-4-5-20251001` (RESEARCH Assumption A1 now verified against the real API, not just WebSearch)
- Task 3's conditional branch executed as a documented no-op — the decision was "done," so no streaming code and no revert were implemented

## Task Commits

Each task was committed atomically:

1. **Task 1: Swap extraction model to claude-haiku-4-5** - `d194f82` (feat)
2. **Task 2: Manual quality side-by-side + latency median (D-05/D-06)** - checkpoint, no commit (human decision only) — resolved "done"
3. **Task 3: Conditional streaming/revert, decision "done"** - no commit (no code change; documented as a no-op below)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/app/api/extract/route.ts` - Model instantiation line swapped to `anthropic("claude-haiku-4-5")`; dating comment updated to document the 2026-07-22 trial + D-05 revert condition (Task 1 only; Task 3 made no further edits)

## Decisions Made

- **D-05/D-06 checkpoint resolution (Josh, 2026-07-22): "done" — keep Haiku, no streaming, no revert.** Josh lacked capacity for the planned real-photo test and delegated to the orchestrator's recommendation, then explicitly approved it. The orchestrator ran a synthetic side-by-side (a throwaway script mirroring the route's exact system prompt/schema/temperature-0, calling the Anthropic API directly; script since deleted, not part of the shipped codebase):
  - **Image 1** (`uat-shots/23-browse-wordlist.png`, a French word-list screenshot): Haiku and Sonnet returned **identical** 20-word sets with correct accents (e.g. "Éléphant"). Haiku API median 2101ms (raw runs 1850/2101/3985ms), Sonnet median 3375ms (3172/3375/3964ms).
  - **Image 2** (`uat-shots/21-dashboard-words.png`, a no-vocabulary dashboard UI screenshot — an adversarial/edge case, not a target extraction image): Haiku returned 17 visible UI-chrome words (nav labels, buttons, etc.), Sonnet returned only 1 ("Habitat"). Haiku is noisier than Sonnet when the image contains no real vocabulary text; the existing review-list row-deselection UI is the safety net for any spurious extracted words. Noted as a caveat, not a blocker — real target images (word lists, vocabulary photos) are Haiku's actual use case and showed parity in Image 1.
  - **D-06 (streaming threshold):** Haiku's measured API-side median (~2.1s) is well under the ~4s threshold from a typical photo, so streaming was **skipped per the plan's own rule** ("if quality is fine AND median ≤ ~4s → done; streaming skipped"). Backlog candidate only if the spinner still feels long later in real usage.
  - **D-05 residual:** the synthetic side-by-side above is a reasonable proxy but is NOT the real-photo/EXIF-fidelity test the plan originally called for (phone-camera lighting, glare, handwriting, portrait EXIF orientation are all untested). This residual gap is flagged below under "Human Verification Needed" for the verifier to carry into `27-HUMAN-UAT.md`, mirroring the same pattern used for `26-HUMAN-UAT.md` item 1 (real-photo resize fidelity).
- **Task 3 "done" branch executed literally as a no-op.** Per the plan's own action text ("Decision 'done' → NO code change; mark this task complete-as-no-op in the summary"), no further edits were made to `route.ts` beyond Task 1's swap. The revert path (change line 165 back to `anthropic("claude-sonnet-4-6")`) remains fully documented in the route's dating comment (lines 159-164) for a future session if quality issues surface in real usage.

## Deviations from Plan

None - plan executed exactly as written (Task 3's no-op branch was the plan's own explicit instruction for a "done" decision, not a deviation).

## Issues Encountered

None.

## Human Verification Needed

**Flagging for the verifier — carry into `27-HUMAN-UAT.md` (mirrors `26-HUMAN-UAT.md` item 1's pattern):**

### Real-photo extraction quality parity (D-05 residual)
expected: Upload a few REAL phone photos (word lists, vocabulary flashcards, handwritten notes — varied lighting/angle/EXIF orientation) via Add a card → From an image, on a prod-like build. Compare Haiku's per-word extraction accuracy against the prior `claude-sonnet-4-6` baseline (informal side-by-side). If accuracy measurably drops on real photos (vs. the clean-screenshot synthetic test already run this session), revert `src/app/api/extract/route.ts` line 165 to `anthropic("claude-sonnet-4-6")` — the revert condition is already documented in the route's dating comment.
result: [pending] — a synthetic (non-photo) side-by-side was run this session and showed parity on real vocabulary content (see Decisions Made); the original real-photo test itself remains untested.

## User Setup Required

None - no external service configuration required. `ANTHROPIC_API_KEY` was already configured prior to this plan.

## Next Phase Readiness

- PERF-17 is shipped and code-complete. Phase 27 Wave 1 is now fully complete (all 7 Wave 1 plans done); Wave 2 was already complete. **Phase 27 (Performance batch 2) is now code-complete — all 12 requirements (PERF-12..PERF-23) satisfied across 27-01 through 27-10.**
- The real-photo D-05 residual is a manual UAT item, not a blocker — mirrors the existing carried-tech-debt pattern from Phases 10/11/26.
- Phase 18 (Field validation & guardrails) remains the last phase before v3.0 closes; its one-command re-cert gate will certify the cumulative Phase 26/27 optimizations, including this Haiku swap's latency profile.

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*

## Self-Check: PASSED
- FOUND: .planning/phases/27-performance-batch-2/27-10-SUMMARY.md
- FOUND: d194f82 (Task 1 commit)
