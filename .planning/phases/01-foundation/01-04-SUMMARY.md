---
phase: 01-foundation
plan: "04"
subsystem: infra
tags: [zod, env-validation, t3-env, ci, github-actions]

requires:
  - phase: 01-foundation
    provides: src/env.ts with Zod schema for all required env vars

provides:
  - env.ts is imported at app startup via side-effect import in layout.tsx
  - CI Build step has all 4 required secrets including RESEND_API_KEY

affects:
  - All future phases — env validation now runs at startup, missing vars fail loudly

tech-stack:
  added: []
  patterns:
    - Side-effect import pattern for module-graph wiring of validation logic

key-files:
  created: []
  modified:
    - src/app/layout.tsx
    - .github/workflows/ci.yml

key-decisions:
  - "env.ts wired via side-effect import (not named import) to avoid unused-variable lint errors while still triggering Zod validation"

patterns-established:
  - "Side-effect import as first line of layout.tsx ensures validation runs before any route renders"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

duration: 5min
completed: 2026-03-23
---

# Phase 01 Plan 04: Gap Closure — env.ts Wiring and CI Env Fix Summary

**Side-effect import `import "@/env"` wired into layout.tsx so Zod validation runs at app startup; RESEND_API_KEY added to CI Build env block completing the 4-var set**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-23T18:56:49Z
- **Completed:** 2026-03-23T18:57:30Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- env.ts is now imported at module-graph load time via a bare side-effect import on line 1 of layout.tsx — Zod will validate all required env vars before any request is served
- CI Build step now carries all four required secrets: DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, RESEND_API_KEY — CI will no longer fail due to missing RESEND_API_KEY during `npm run build`
- TypeScript (tsc --noEmit) passes with no regressions; layout.tsx passes Biome CI clean; vitest run still passes 2/2 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire env.ts into app module graph and add RESEND_API_KEY to CI** - `1f9f852` (feat)

**Plan metadata:** (to be committed with this summary)

## Files Created/Modified

- `src/app/layout.tsx` - Added `import "@/env"` as first import line (side-effect only)
- `.github/workflows/ci.yml` - Added `RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}` to Build step env block

## Decisions Made

Used a bare string import (`import "@/env"`) rather than a named import (`import { env } from "@/env"`) to avoid introducing an unused variable while still ensuring createEnv() executes at module load. This is the standard t3-env side-effect wiring pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Biome `ci .` (full repo) exits 1 due to pre-existing `noNonNullAssertion` violations in `drizzle.config.ts` and `src/db/index.ts`. These are pre-existing issues, out of scope for this gap-closure plan. Biome run scoped to the modified file (`biome ci src/app/layout.tsx`) exits 0 cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- env.ts is now fully wired; environment validation gap closed
- Phase 01-foundation is complete; ready for Phase 02 planning
- Pre-existing Biome violations (drizzle.config.ts, db/index.ts) are tracked as deferred items

---
*Phase: 01-foundation*
*Completed: 2026-03-23*
