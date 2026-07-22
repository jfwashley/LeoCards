---
phase: 26-performance-batch
plan: 05
subsystem: infra
tags: [next-config, cache-control, headers, static-assets, habitat-clips]

requires:
  - phase: 26-01
    provides: Sequencing precedent only (independent subsystem) — PERF-11 has no functional dependency on PERF-07/08/09/10

provides:
  - "Immutable long-lived Cache-Control (public, max-age=31536000, immutable) for /habitat/clips/* via a next.config.ts headers() block"
  - "D-08 companion naming rule documented in scripts/render-habitat-clips.mjs's header comment: any future clip re-render MUST ship under a new filename"

affects: [phase-18-performance-optimization]

tech-stack:
  added: []
  patterns:
    - "next.config.ts headers() block scoped narrowly to a single source pattern (/habitat/clips/:path*) — first headers() usage in this codebase"

key-files:
  created: []
  modified:
    - next.config.ts
    - scripts/render-habitat-clips.mjs

key-decisions:
  - "Header applied to EXISTING clip filenames with no versioning churn, per D-08 — the companion naming-rule doc comment is the mitigation for future re-renders, not a filename scheme change now"
  - "Dev-server response-header curl check deferred to the orchestrator's e2e session — no dev server was running locally and the plan/gotchas explicitly say not to start a long-lived one just for this check"

patterns-established: []

requirements-completed: [PERF-11]

duration: 10min
completed: 2026-07-22
---

# Phase 26 Plan 05: Immutable Cache-Control for habitat clips Summary

**Added a `next.config.ts` `headers()` block that sets `Cache-Control: public, max-age=31536000, immutable` on `/habitat/clips/:path*`, plus the D-08 forever-cache naming-rule doc comment in the render pipeline script.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-22 (session start)
- **Completed:** 2026-07-22T00:07:15Z
- **Tasks:** 2/2 completed
- **Files modified:** 2

## Accomplishments
- `next.config.ts` gained its first `async headers()` block (previously a 7-line stub), scoped narrowly to `source: "/habitat/clips/:path*"` with `Cache-Control: public, max-age=31536000, immutable` — verified against the installed Next 16.2.1 docs (`node_modules/next/dist/docs/.../headers.md`), confirming `headers()` runs before the `public/` filesystem lookup and that `public/` otherwise defaults to `Cache-Control: public, max-age=0`
- The D-08 companion naming rule — any future re-render of an existing `l{N}-{mood}` clip MUST ship under a new filename — is now documented directly in `scripts/render-habitat-clips.mjs`'s top-of-file header comment block, the discoverable render-pipeline doc location
- No other config options were added to `next.config.ts`; the stub's minimal scope is otherwise preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: headers() block for /habitat/clips/:path\*** - `1fd8310` (feat)
2. **Task 2: D-08 naming-rule doc in the render pipeline** - `fed61f8` (docs)

## Files Created/Modified
- `next.config.ts` - Added `async headers()` returning one rule for `/habitat/clips/:path*` with the immutable `Cache-Control` value and an inline D-08 comment
- `scripts/render-habitat-clips.mjs` - Added a `// ── Cache-Control (Phase 26 PERF-11) ──` comment paragraph to the existing header-comment block stating the new-filename-on-re-render rule; no rendering/encoding logic changed (diff is comment-only)

## Decisions Made
- Kept the header rule to exactly one `source` pattern (`/habitat/clips/:path*`) and one header key/value pair — no broader `/:path*` catch-all, no other headers (CORS, security headers, etc.) added, per the plan's explicit "do not add any other config option" instruction
- Left the response-header live-verification (`curl -sI .../habitat/clips/<file> | grep -i cache-control`) for the orchestrator's e2e session — no dev server was running locally at execution time (`curl` exit 7, connection refused) and the project gotchas explicitly instruct not to start a long-lived server just for this one check

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Biome formatting on first pass:** the initial `headers: [{ key: ..., value: ... }]` one-line array object failed `npx biome ci next.config.ts` (line-length/multi-line formatting rule). Fixed by running `npx biome check --write next.config.ts`, which reformatted the object across multiple lines with no content change; `npx biome ci` and `npx tsc --noEmit` both then passed clean. This is standard formatter conformance, not a deviation rule trigger.

**No running dev server for the live header-response check:** `curl -sI http://localhost:3000/habitat/clips/l1-happy.mp4` returned exit code 7 (connection refused) — no server was running. Per this plan's own acceptance criteria ("dev acceptable for the initial check... Final prod verification is the orchestrator's ROADMAP-criterion-5 check") and the project gotchas note (do not start a long-lived server just for this check), this empirical response-header proof is deferred to the orchestrator's e2e/verification session, which is expected to run against a freshly-restarted dev or prod-build server per this project's established convention.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PERF-11 code-complete: `next.config.ts` `headers()` block in place, `tsc --noEmit` clean, scoped biome clean on both touched files, `node --check` clean on the `.mjs` script.
- **Outstanding verification (not blocking this plan, explicitly deferred by design):** the empirical response-header check (`curl -sI <route>/habitat/clips/<file> | grep -i cache-control` showing `max-age=31536000, immutable`) has not yet been run against a live server this session. This is ROADMAP success criterion 5's empirical proof and should be run by the orchestrator during its e2e/verification pass (dev server sufficient for the initial check; prod verification happens post-deploy).
- This is the last plan in Phase 26 (Performance batch) — all five PERF-07..11 items are now code-complete (26-01 through 26-05). Phase 26's wave-gate checks (full `npx tsc --noEmit`, full `npx vitest run`, no `qa:run` required since no study/SRS path was touched this plan) and the phase-level e2e/review gates are the orchestrator's next steps before Phase 18 begins.

---
*Phase: 26-performance-batch*
*Completed: 2026-07-22*

## Self-Check: PASSED

Both modified files confirmed present on disk (`next.config.ts`, `scripts/render-habitat-clips.mjs`); both task commits (`1fd8310`, `fed61f8`) confirmed present in git log.
